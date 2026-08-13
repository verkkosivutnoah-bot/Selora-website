// Supabase Edge Function: dispatch-agent-job
//
// The single entry point for starting a run. Called two ways:
//
//   - by agentti.html when the user presses "Aja nyt", with their own JWT
//   - by enqueue_due_agent_runs() on the pg_cron tick, with the service key
//
// Either way it creates the `agent_runs` row first and then asks GitHub to
// start the workflow that will execute it. Creating the row here rather than
// in the client is what lets `agent_runs` stay read-only under RLS: the
// dashboard cannot queue work that nothing will ever pick up.
//
// Body:
//   { job_id: string, trigger?: "manual" | "schedule" }
//
// Secrets:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (set by the platform)
//   GITHUB_TOKEN     — fine-grained PAT, Actions: read+write on the repo
//   GITHUB_REPO      — "owner/repo", e.g. "verkkosivutnoah-bot/selora-website"
//   GITHUB_REF       — branch holding agent-runner.yml, defaults to "main"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GITHUB_TOKEN     = Deno.env.get("GITHUB_TOKEN")!;
const GITHUB_REPO      = Deno.env.get("GITHUB_REPO")!;
const GITHUB_REF       = Deno.env.get("GITHUB_REF") ?? "main";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);

interface Body {
  job_id:   string;
  trigger?: "manual" | "schedule";
  input?:   Record<string, unknown>;
}

// Per-run input reaches the model's prompt, so it is bounded here rather than
// trusted. Depth is not the concern — size and shape are: a huge or deeply
// nested object would crowd out the workflow's own instructions.
const MAX_INPUT_KEYS  = 12;
const MAX_INPUT_BYTES = 4000;

function checkInput(input: unknown): string | null {
  if (input === undefined || input === null) return null;
  if (typeof input !== "object" || Array.isArray(input)) return "input must be an object";

  const keys = Object.keys(input as Record<string, unknown>);
  if (keys.length > MAX_INPUT_KEYS) return `input has ${keys.length} keys, max ${MAX_INPUT_KEYS}`;

  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    const t = typeof v;
    if (t !== "string" && t !== "number" && t !== "boolean" && v !== null) {
      return `input.${k} must be a string, number, boolean or null`;
    }
  }
  if (JSON.stringify(input).length > MAX_INPUT_BYTES) {
    return `input exceeds ${MAX_INPUT_BYTES} bytes`;
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST")    return json({ error: "Method not allowed" }, 405);

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!body.job_id) return json({ error: "job_id required" }, 400);

  const inputError = checkInput(body.input);
  if (inputError) return json({ error: inputError }, 400);

  const trigger = body.trigger === "schedule" ? "schedule" : "manual";

  // Load the job with the service role so we can compare its owner against
  // whoever is calling, rather than trusting a user_id from the request body.
  const { data: job, error: jobErr } = await admin
    .from("agent_jobs")
    .select("id, user_id, name, workflow, enabled")
    .eq("id", body.job_id)
    .maybeSingle();

  if (jobErr) return json({ error: jobErr.message }, 500);
  if (!job)   return json({ error: "Job not found" }, 404);

  // A scheduled call arrives with the service key and is trusted as-is. A
  // manual call carries a user JWT, which has to resolve to the job's owner.
  const authHeader = req.headers.get("Authorization") ?? "";
  const bearer     = authHeader.replace(/^Bearer\s+/i, "");

  if (trigger === "manual" || bearer !== SUPABASE_SERVICE) {
    const { data: { user }, error: authErr } = await admin.auth.getUser(bearer);
    if (authErr || !user)      return json({ error: "Unauthorized" }, 401);
    if (user.id !== job.user_id) return json({ error: "Forbidden" }, 403);
  }

  if (!job.enabled) return json({ error: "Job is disabled" }, 409);

  // Refuse to pile up. One in-flight run per job keeps two executions from
  // editing the same repository at once.
  const { data: inFlight } = await admin
    .from("agent_runs")
    .select("id")
    .eq("job_id", job.id)
    .in("status", ["queued", "running"])
    .limit(1)
    .maybeSingle();

  if (inFlight) {
    return json({ error: "Job already running", run_id: inFlight.id }, 409);
  }

  const { data: run, error: runErr } = await admin
    .from("agent_runs")
    .insert({ job_id: job.id, user_id: job.user_id, status: "queued", trigger, input: body.input ?? null })
    .select("id")
    .single();

  if (runErr) return json({ error: runErr.message }, 500);

  // Hand off to Actions. workflow_dispatch answers 204 with no body on success.
  const dispatch = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/agent-runner.yml/dispatches`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GITHUB_TOKEN}`,
        "Accept":        "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({ ref: GITHUB_REF, inputs: { run_id: run.id } }),
    },
  );

  if (!dispatch.ok) {
    const detail = await dispatch.text();
    // Fail the run rather than leaving it queued forever with nothing coming.
    await admin
      .from("agent_runs")
      .update({
        status:      "failed",
        error:       `GitHub dispatch failed (${dispatch.status}): ${detail.slice(0, 500)}`,
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);

    return json({ error: "Could not start the workflow", detail }, 502);
  }

  return json({ ok: true, run_id: run.id });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
