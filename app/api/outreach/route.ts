import { and, desc, eq, gte } from "drizzle-orm";
import { getDb } from "../../../db";
import { consents, events, followupJobs, leads, messages, suppressions } from "../../../db/schema";
import { addDays, id } from "../../../lib/automation";
import { resolveSecret } from "../../../lib/secrets";

async function fetchWithRetry(url: string, init: RequestInit) {
  let response: Response | undefined;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    response = await fetch(url, init);
    if (response.status !== 429 && response.status < 500) return response;
    if (attempt < 2) {
      const retryAfter = Number(response.headers.get("retry-after"));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 5000) : (250 * (2 ** attempt)) + Math.floor(Math.random() * 250);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return response as Response;
}

async function sendSms(to: string, body: string) {
  const authKey = await resolveSecret("MSG91_AUTH_KEY");
  const templateId = await resolveSecret("MSG91_TEMPLATE_ID");
  const messageVariable = (await resolveSecret("MSG91_MESSAGE_VARIABLE"))?.trim() || "MESSAGE";
  if (!authKey || !templateId) throw new Error("MSG91 SMS credentials are not configured");
  const rawDigits = to.replace(/\D/g, "");
  const mobile = rawDigits.length === 10 ? `91${rawDigits}` : rawDigits;
  if (mobile.length < 11 || mobile.length > 15) throw new Error("SMS destination must include a valid country code");
  const response = await fetchWithRetry("https://control.msg91.com/api/v5/flow", {
    method: "POST",
    headers: { accept: "application/json", authkey: authKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      template_id: templateId,
      short_url: "0",
      realTimeResponse: "1",
      recipients: [{ mobiles: mobile, [messageVariable]: body }],
    }),
  });
  const data = await response.json() as { type?: string; message?: string; request_id?: string };
  if (!response.ok || data.type === "error") throw new Error(data.message ?? `MSG91 returned ${response.status}`);
  return data.request_id ?? id("sms");
}

async function sendEmail(to: string, subject: string, body: string, idempotencyKey: string) {
  const apiKey = await resolveSecret("RESEND_API_KEY");
  const from = await resolveSecret("EMAIL_FROM");
  if (!apiKey || !from) throw new Error("Email credentials are not configured");
  const response = await fetchWithRetry("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ from, to: [to], subject, text: body }),
  });
  const data = await response.json() as { id?: string; message?: string };
  if (!response.ok) throw new Error(data.message ?? `Email provider returned ${response.status}`);
  return data.id ?? id("email");
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { leadId?: string; channel?: string; to?: string; subject?: string; body?: string; idempotencyKey?: string };
    if (!body.leadId || !body.channel || !body.to) return Response.json({ error: "leadId, channel, and destination are required" }, { status: 400 });
    const db = getDb();
    const suppression = await db.select().from(suppressions).where(and(eq(suppressions.leadId, body.leadId), eq(suppressions.channel, body.channel))).limit(1);
    if (suppression.length) return Response.json({ error: "CONTACT_SUPPRESSED", retryable: false }, { status: 409 });
    const consent = await db.select().from(consents).where(and(eq(consents.leadId, body.leadId), eq(consents.channel, body.channel), eq(consents.status, "granted"))).orderBy(desc(consents.capturedAt)).limit(1);
    if (!consent.length) return Response.json({ error: "CONSENT_REQUIRED", message: `Recorded ${body.channel} marketing consent is required`, retryable: false }, { status: 403 });
    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
    const recentChannelMessages = await db.select({ id: messages.id }).from(messages).where(and(eq(messages.direction, "outbound"), eq(messages.channel, body.channel), gte(messages.sentAt, oneMinuteAgo))).limit(20);
    if (recentChannelMessages.length >= 20) return Response.json({ error: "CHANNEL_RATE_LIMITED", retryable: true }, { status: 429, headers: { "Retry-After": "60" } });
    const recentContact = await db.select({ sentAt: messages.sentAt }).from(messages).where(and(eq(messages.leadId, body.leadId), eq(messages.direction, "outbound"), eq(messages.channel, body.channel))).orderBy(desc(messages.sentAt)).limit(1);
    if (recentContact[0]?.sentAt && Date.now() - Date.parse(recentContact[0].sentAt) < 6 * 60 * 60 * 1000) {
      return Response.json({ error: "CONTACT_RATE_LIMITED", message: "Wait at least six hours before contacting this lead again", retryable: true }, { status: 429, headers: { "Retry-After": "21600" } });
    }

    let providerMessageId: string;
    if (body.channel === "sms") {
      if (!body.body?.trim()) return Response.json({ error: "SMS_BODY_REQUIRED" }, { status: 400 });
      providerMessageId = await sendSms(body.to, body.body);
    } else if (body.channel === "email") {
      if (!body.body?.trim() || !body.subject?.trim()) return Response.json({ error: "EMAIL_SUBJECT_AND_BODY_REQUIRED" }, { status: 400 });
      providerMessageId = await sendEmail(body.to, body.subject, body.body, body.idempotencyKey ?? `${body.leadId}:email:${Date.now()}`);
    } else {
      return Response.json({ error: `${body.channel} is inbound-support only; automated promotional calls are disabled` }, { status: 501 });
    }
    const messageId = id("msg");
    await db.batch([
      db.insert(messages).values({ id: messageId, leadId: body.leadId, direction: "outbound", channel: body.channel, body: body.body ?? "", providerMessageId, status: "sent", campaign: "initial_outreach", sentAt: new Date().toISOString() }),
      db.update(leads).set({ stage: "contacted", lastContactAt: new Date().toISOString(), nextActionAt: addDays(3), updatedAt: new Date().toISOString() }).where(eq(leads.id, body.leadId)),
      db.insert(followupJobs).values({ id: id("job"), leadId: body.leadId, channel: body.channel, step: 1, runAt: addDays(3), idempotencyKey: `${body.leadId}:${body.channel}:followup:3d` }),
      db.insert(followupJobs).values({ id: id("job"), leadId: body.leadId, channel: body.channel, step: 2, runAt: addDays(7), idempotencyKey: `${body.leadId}:${body.channel}:followup:7d` }),
      db.insert(events).values({ id: id("evt"), eventType: "message_sent", entityType: "lead", entityId: body.leadId, payload: JSON.stringify({ channel: body.channel, providerMessageId }) }),
    ]);
    return Response.json({ messageId, providerMessageId, status: "sent", followupsScheduled: [3, 7] });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Send failed", retryable: true }, { status: 502 });
  }
}
