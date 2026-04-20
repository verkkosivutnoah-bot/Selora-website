// Supabase Edge Function: cal-webhook
// Receives booking webhooks from Cal.com and creates appointments in Supabase.
// Set this URL in Cal.com: Dashboard → Settings → Developer → Webhooks
// Events: BOOKING_CREATED, BOOKING_RESCHEDULED, BOOKING_CANCELLED

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CAL_WEBHOOK_SECRET = Deno.env.get("CAL_WEBHOOK_SECRET") ?? "";

serve(async (req) => {
  // Cal.com sends a signature header for verification
  const body      = await req.text();
  const sigHeader = req.headers.get("x-cal-signature-256") ?? "";

  if (CAL_WEBHOOK_SECRET && sigHeader) {
    const valid = await verifySignature(body, sigHeader, CAL_WEBHOOK_SECRET);
    if (!valid) {
      console.error("Cal.com webhook signature invalid");
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const payload = JSON.parse(body);
  const { triggerEvent, payload: data } = payload;

  console.log("Cal.com event:", triggerEvent, "booking uid:", data?.uid);

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE);

  // ── Find user by their Cal.com username / booking metadata ────────────────
  // Cal.com sends attendee + organizer info. We match by organizer email.
  const organizerEmail = data?.organizer?.email ?? data?.organizer?.username ?? "";
  if (!organizerEmail) {
    console.error("No organizer email in Cal.com payload");
    return new Response("No organizer email", { status: 400 });
  }

  // Find Supabase user by email
  const { data: authUsers } = await sb.auth.admin.listUsers();
  const matchedUser = authUsers?.users?.find(u => u.email === organizerEmail);
  if (!matchedUser) {
    console.error("No Supabase user found for email:", organizerEmail);
    return new Response("User not found", { status: 404 });
  }
  const userId = matchedUser.id;

  // ── Handle events ─────────────────────────────────────────────────────────
  if (triggerEvent === "BOOKING_CREATED" || triggerEvent === "BOOKING_RESCHEDULED") {
    const attendee     = data?.attendees?.[0] ?? {};
    const startTime    = data?.startTime ?? data?.start_time;
    const endTime      = data?.endTime   ?? data?.end_time;
    const durationMins = startTime && endTime
      ? Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000)
      : 60;

    const appointmentData = {
      user_id:        userId,
      title:          data?.title ?? data?.eventTitle ?? "Cal.com varaus",
      description:    data?.description ?? data?.additionalNotes ?? null,
      customer_name:  attendee.name ?? null,
      customer_email: attendee.email ?? null,
      caller_number:  attendee.phoneNumber ?? null,
      service:        data?.eventType?.title ?? data?.title ?? null,
      start_time:     startTime,
      end_time:       endTime,
      duration_mins:  durationMins,
      status:         "confirmed",
      source:         "calcom",
      external_id:    data?.uid ?? null,
      color:          "#7c3aed",
    };

    if (triggerEvent === "BOOKING_RESCHEDULED") {
      // Update existing
      await sb.from("appointments")
        .update(appointmentData)
        .eq("user_id", userId)
        .eq("external_id", data?.uid ?? "");
    } else {
      // Insert new (upsert on external_id to avoid duplicates)
      await sb.from("appointments").upsert(appointmentData, { onConflict: "external_id" });
    }

  } else if (triggerEvent === "BOOKING_CANCELLED") {
    await sb.from("appointments")
      .update({ status: "cancelled" })
      .eq("user_id", userId)
      .eq("external_id", data?.uid ?? "");
  }

  return new Response("ok", { status: 200 });
});

async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
    const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2,"0")).join("");
    return computed === signature;
  } catch { return false; }
}
