import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { consents, events, followupJobs, leads, messages, suppressions } from "../../../db/schema";
import { addDays, id } from "../../../lib/automation";
import { resolveSecret } from "../../../lib/secrets";

async function sendWhatsApp(to: string, template: string, businessName: string) {
  const token = await resolveSecret("WHATSAPP_ACCESS_TOKEN");
  const phoneId = await resolveSecret("WHATSAPP_PHONE_NUMBER_ID");
  if (!token || !phoneId) throw new Error("WhatsApp credentials are not configured");
  const response = await fetch(`https://graph.facebook.com/v23.0/${phoneId}/messages`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "template", template: {
      name: template, language: { code: "en" }, components: [{ type: "body", parameters: [{ type: "text", text: businessName }] }],
    } }),
  });
  const data = await response.json() as { messages?: Array<{ id: string }>; error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message ?? `WhatsApp returned ${response.status}`);
  return data.messages?.[0]?.id ?? id("wamid");
}

async function sendSms(to: string, body: string) {
  const sid = await resolveSecret("TWILIO_ACCOUNT_SID");
  const token = await resolveSecret("TWILIO_AUTH_TOKEN");
  const from = await resolveSecret("TWILIO_SMS_FROM");
  if (!sid || !token || !from) throw new Error("Twilio SMS credentials are not configured");
  const form = new URLSearchParams({ To: to, From: from, Body: body });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST", headers: { Authorization: `Basic ${btoa(`${sid}:${token}`)}`, "Content-Type": "application/x-www-form-urlencoded" }, body: form,
  });
  const data = await response.json() as { sid?: string; message?: string };
  if (!response.ok) throw new Error(data.message ?? `SMS provider returned ${response.status}`);
  return data.sid ?? id("sms");
}

async function sendEmail(to: string, subject: string, body: string, idempotencyKey: string) {
  const apiKey = await resolveSecret("RESEND_API_KEY");
  const from = await resolveSecret("EMAIL_FROM");
  if (!apiKey || !from) throw new Error("Email credentials are not configured");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ from, to: [to], subject, text: body }),
  });
  const data = await response.json() as { id?: string; message?: string };
  if (!response.ok) throw new Error(data.message ?? `Email provider returned ${response.status}`);
  return data.id ?? id("email");
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { leadId?: string; channel?: string; to?: string; businessName?: string; template?: string; subject?: string; body?: string; idempotencyKey?: string };
    if (!body.leadId || !body.channel || !body.to) return Response.json({ error: "leadId, channel, and destination are required" }, { status: 400 });
    const db = getDb();
    const suppression = await db.select().from(suppressions).where(and(eq(suppressions.leadId, body.leadId), eq(suppressions.channel, body.channel))).limit(1);
    if (suppression.length) return Response.json({ error: "CONTACT_SUPPRESSED", retryable: false }, { status: 409 });
    const consent = await db.select().from(consents).where(and(eq(consents.leadId, body.leadId), eq(consents.channel, body.channel), eq(consents.status, "granted"))).orderBy(desc(consents.capturedAt)).limit(1);
    if (!consent.length) return Response.json({ error: "CONSENT_REQUIRED", message: `Recorded ${body.channel} marketing consent is required`, retryable: false }, { status: 403 });

    let providerMessageId: string;
    if (body.channel === "whatsapp") {
      if (!body.template) return Response.json({ error: "APPROVED_TEMPLATE_REQUIRED" }, { status: 400 });
      providerMessageId = await sendWhatsApp(body.to, body.template, body.businessName ?? "your business");
    } else if (body.channel === "sms") {
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
      db.insert(messages).values({ id: messageId, leadId: body.leadId, direction: "outbound", channel: body.channel, body: body.body ?? `[template:${body.template}]`, providerMessageId, status: "sent", campaign: "initial_outreach", sentAt: new Date().toISOString() }),
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
