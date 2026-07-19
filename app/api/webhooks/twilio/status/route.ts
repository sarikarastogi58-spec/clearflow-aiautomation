import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { events, messages } from "../../../../../db/schema";
import { id } from "../../../../../lib/automation";
import { validateTwilioWebhook } from "../../../../../lib/twilio";

export async function POST(request: Request) {
  const form = await request.formData();
  if (!(await validateTwilioWebhook(request, form))) return Response.json({ error: "Invalid Twilio signature" }, { status: 401 });
  const providerMessageId = String(form.get("MessageSid") ?? form.get("CallSid") ?? "");
  const providerStatus = String(form.get("MessageStatus") ?? form.get("CallStatus") ?? "unknown");
  if (!providerMessageId) return Response.json({ error: "Provider message ID is required" }, { status: 400 });
  const mappedStatus = ["delivered", "completed", "answered"].includes(providerStatus) ? "delivered" : ["failed", "undelivered", "busy", "no-answer", "canceled"].includes(providerStatus) ? "failed" : providerStatus;
  const db = getDb();
  await db.batch([
    db.update(messages).set(mappedStatus === "delivered" ? { status: mappedStatus, deliveredAt: new Date().toISOString() } : { status: mappedStatus }).where(eq(messages.providerMessageId, providerMessageId)),
    db.insert(events).values({ id: id("evt"), eventType: "provider_status", entityType: "message", entityId: providerMessageId, payload: JSON.stringify({ provider: "twilio", status: providerStatus }) }),
  ]);
  return Response.json({ received: true });
}
