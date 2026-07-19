import { and, desc, eq, gte } from "drizzle-orm";
import { getDb } from "../../../db";
import { consents, events, followupJobs, leads, messages, suppressions } from "../../../db/schema";
import { addDays, id, normalizePhone } from "../../../lib/automation";
import { sendGmailEmail } from "../../../lib/gmail";
import { placeTwilioCall, sendTwilioSms } from "../../../lib/twilio";

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
    const origin = new URL(request.url).origin;
    const statusCallback = `${origin}/api/webhooks/twilio/status`;
    if (body.channel === "sms") {
      if (!body.body?.trim()) return Response.json({ error: "SMS_BODY_REQUIRED" }, { status: 400 });
      providerMessageId = await sendTwilioSms(body.to, body.body, statusCallback);
    } else if (body.channel === "email") {
      if (!body.body?.trim() || !body.subject?.trim()) return Response.json({ error: "EMAIL_SUBJECT_AND_BODY_REQUIRED" }, { status: 400 });
      providerMessageId = await sendGmailEmail(body.to, body.subject, body.body, body.idempotencyKey ?? `${body.leadId}.email.${Date.now()}`);
    } else if (body.channel === "voice") {
      providerMessageId = await placeTwilioCall(body.to, `${origin}/api/webhooks/voice`, statusCallback);
    } else {
      return Response.json({ error: `Unsupported outreach channel: ${body.channel}` }, { status: 400 });
    }
    const messageId = id("msg");
    const now = new Date().toISOString();
    const contactDetails = body.channel === "email"
      ? { email: body.to.trim().toLowerCase() }
      : { phone: normalizePhone(body.to) };
    if (body.channel === "voice") {
      await db.batch([
        db.insert(messages).values({ id: messageId, leadId: body.leadId, direction: "outbound", channel: body.channel, body: body.body ?? "AI consultation call", providerMessageId, status: "queued", campaign: "initial_outreach", sentAt: now }),
        db.update(leads).set({ ...contactDetails, stage: "contacted", lastContactAt: now, nextActionAt: null, updatedAt: now }).where(eq(leads.id, body.leadId)),
        db.insert(events).values({ id: id("evt"), eventType: "call_queued", entityType: "lead", entityId: body.leadId, payload: JSON.stringify({ channel: body.channel, providerMessageId }) }),
      ]);
      return Response.json({ messageId, providerMessageId, status: "queued", followupsScheduled: [] });
    }
    await db.batch([
      db.insert(messages).values({ id: messageId, leadId: body.leadId, direction: "outbound", channel: body.channel, body: body.body ?? "", providerMessageId, status: "sent", campaign: "initial_outreach", sentAt: now }),
      db.update(leads).set({ ...contactDetails, stage: "contacted", lastContactAt: now, nextActionAt: addDays(3), updatedAt: now }).where(eq(leads.id, body.leadId)),
      db.insert(followupJobs).values({ id: id("job"), leadId: body.leadId, channel: body.channel, step: 1, runAt: addDays(3), idempotencyKey: `${body.leadId}:${body.channel}:followup:3d` }),
      db.insert(followupJobs).values({ id: id("job"), leadId: body.leadId, channel: body.channel, step: 2, runAt: addDays(7), idempotencyKey: `${body.leadId}:${body.channel}:followup:7d` }),
      db.insert(events).values({ id: id("evt"), eventType: "message_sent", entityType: "lead", entityId: body.leadId, payload: JSON.stringify({ channel: body.channel, providerMessageId }) }),
    ]);
    return Response.json({ messageId, providerMessageId, status: "sent", followupsScheduled: [3, 7] });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Send failed", retryable: true }, { status: 502 });
  }
}
