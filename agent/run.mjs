// Agent runner.
//
// Executed by .github/workflows/agent-runner.yml with AGENT_RUN_ID set to the
// `agent_runs` row that dispatch-agent-job created. It resolves that row to a
// job, reads the job's workflow file, hands it to Claude Code in headless
// mode, and writes the result back.
//
// Anything Claude changed in the working tree is committed to its own branch
// rather than to main. A scheduled agent pushing straight to the deploy branch
// is one bad run away from shipping itself to production, so the run reports a
// branch name and a human merges it.
//
// Env:
//   AGENT_RUN_ID              the run to execute
//   SUPABASE_URL              project URL
//   SUPABASE_SERVICE_ROLE_KEY service role, bypasses RLS
//   ANTHROPIC_API_KEY         consumed by the claude CLI
//   GITHUB_RUN_URL            deep link back to this Actions run

import { readFile, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');

const RUN_ID      = required('AGENT_RUN_ID');
const SUPA_URL    = required('SUPABASE_URL');
const SUPA_KEY    = required('SUPABASE_SERVICE_ROLE_KEY');
const RUN_URL     = process.env.GITHUB_RUN_URL ?? null;

// Claude gets one hour. The Actions job itself is capped a little higher so a
// timeout here still leaves room to report the failure.
const TIMEOUT_MS = 60 * 60 * 1000;

function required(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return v;
}

// ── Supabase over PostgREST ───────────────────────────────────────────────
// Direct fetch rather than the JS client: the runner has no package.json and
// two REST calls do not justify creating one.

async function supa(path, init = {}) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey:          SUPA_KEY,
      Authorization:   `Bearer ${SUPA_KEY}`,
      'Content-Type':  'application/json',
      Prefer:          'return=representation',
      ...init.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`Supabase ${res.status} on ${path}: ${await res.text()}`);
  }
  return res.status === 204 ? null : res.json();
}

const patchRun = (patch) =>
  supa(`agent_runs?id=eq.${RUN_ID}`, { method: 'PATCH', body: JSON.stringify(patch) });

// ── Push notification ─────────────────────────────────────────────────────
// Best effort. A run that succeeded but could not be announced is still a run
// that succeeded, so this never throws into the main path.

async function notify(userId, title, body) {
  try {
    await fetch(`${SUPA_URL}/functions/v1/send-push-notification`, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${SUPA_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: userId, type: 'daily_summary', title, body }),
    });
  } catch (err) {
    console.warn('Push notification failed:', err.message);
  }
}

// ── Shell helper ──────────────────────────────────────────────────────────

function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd: REPO, ...opts });
    let stdout = '';
    let stderr = '';
    let timer = null;

    if (opts.timeoutMs) {
      timer = setTimeout(() => child.kill('SIGKILL'), opts.timeoutMs);
    }

    child.stdout?.on('data', (d) => { stdout += d; process.stdout.write(d); });
    child.stderr?.on('data', (d) => { stderr += d; process.stderr.write(d); });

    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

// ── Main ──────────────────────────────────────────────────────────────────

const startedAt = Date.now();
let userId = null;

try {
  const [runRow] = await supa(
    `agent_runs?id=eq.${RUN_ID}&select=id,status,job_id,user_id,trigger`,
  );
  if (!runRow) throw new Error(`Run ${RUN_ID} not found`);
  userId = runRow.user_id;

  // dispatch-agent-job already refuses to double-queue, but a manually
  // re-run Actions job would arrive here a second time.
  if (runRow.status !== 'queued') {
    console.log(`Run ${RUN_ID} is already "${runRow.status}", nothing to do.`);
    process.exit(0);
  }

  const [job] = await supa(
    `agent_jobs?id=eq.${runRow.job_id}&select=id,name,workflow,notes`,
  );
  if (!job) throw new Error(`Job ${runRow.job_id} not found`);

  await patchRun({ status: 'running', started_at: new Date().toISOString() });

  // Workflow slugs come from the database, so keep them from escaping the
  // workflows directory.
  if (!/^[a-z0-9][a-z0-9-]*$/.test(job.workflow)) {
    throw new Error(`Invalid workflow slug: ${job.workflow}`);
  }

  const workflowPath = join(HERE, 'workflows', `${job.workflow}.md`);
  try {
    await access(workflowPath);
  } catch {
    throw new Error(`No workflow file at agent/workflows/${job.workflow}.md`);
  }

  let prompt = await readFile(workflowPath, 'utf8');
  if (job.notes?.trim()) {
    prompt += `\n\n## Additional instructions for this job\n\n${job.notes.trim()}\n`;
  }

  console.log(`Running workflow "${job.workflow}" for job "${job.name}"`);

  const claude = await run(
    'claude',
    [
      '-p', prompt,
      '--output-format', 'json',
      '--permission-mode', 'acceptEdits',
    ],
    { timeoutMs: TIMEOUT_MS, env: { ...process.env } },
  );

  if (claude.code !== 0) {
    throw new Error(
      `claude exited ${claude.code}. ${(claude.stderr || claude.stdout).slice(-2000)}`,
    );
  }

  // --output-format json wraps the answer; fall back to raw stdout if the
  // shape ever changes so a parse failure does not lose the work.
  let summary = claude.stdout.trim();
  try {
    const parsed = JSON.parse(claude.stdout);
    if (typeof parsed.result === 'string') summary = parsed.result;
  } catch {
    // keep raw stdout
  }

  // Commit whatever changed, on a branch of its own.
  let branch = null;
  const dirty = await run('git', ['status', '--porcelain']);
  if (dirty.stdout.trim()) {
    branch = `agent/${job.workflow}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '')}`;
    await run('git', ['checkout', '-b', branch]);
    await run('git', ['add', '-A']);
    await run('git', [
      'commit',
      '-m', `Agent run: ${job.name}`,
      '-m', `Workflow: ${job.workflow}\nRun: ${RUN_ID}`,
    ]);
    const pushed = await run('git', ['push', '-u', 'origin', branch]);
    if (pushed.code !== 0) {
      console.warn(`Could not push ${branch}; the work is committed locally only.`);
      branch = `${branch} (push failed)`;
    }
    summary += `\n\n---\nChanges committed to branch \`${branch}\`.`;
  } else {
    summary += '\n\n---\nNo file changes.';
  }

  await patchRun({
    status:         'success',
    output:         summary,
    github_run_url: RUN_URL,
    duration_secs:  Math.round((Date.now() - startedAt) / 1000),
    finished_at:    new Date().toISOString(),
  });

  await notify(
    userId,
    `${job.name} valmis`,
    branch ? `Muutokset haarassa ${branch}` : 'Ei muutoksia tiedostoihin.',
  );

  console.log('Done.');
} catch (err) {
  console.error('Run failed:', err);

  try {
    await patchRun({
      status:         'failed',
      error:          String(err.message ?? err).slice(0, 4000),
      github_run_url: RUN_URL,
      duration_secs:  Math.round((Date.now() - startedAt) / 1000),
      finished_at:    new Date().toISOString(),
    });
    if (userId) await notify(userId, 'Agentin ajo epäonnistui', String(err.message ?? err).slice(0, 120));
  } catch (reportErr) {
    console.error('Could not record the failure:', reportErr);
  }

  process.exit(1);
}
