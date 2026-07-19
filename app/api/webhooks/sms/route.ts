import { recordInbound } from "../../../../lib/inbound";
import { validateTwilioWebhook } from "../../../../lib/twilio";

export async function POST(request: Request) {
  const form = await request.formData();
  if (!(await validateTwilioWebhook(request, form))) return Response.json({ error: "Invalid Twilio signature" }, { status: 401 });
  const phone = String(form.get("From") ?? "");
  const body = String(form.get("Body") ?? "");
  const providerMessageId = String(form.get("MessageSid") ?? "");
  if (!phone || !body) return Response.json({ error: "SMS sender and message are required" }, { status: 400 });
  await recordInbound("sms", phone, body, providerMessageId);
  return new Response("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>", { headers: { "Content-Type": "text/xml; charset=utf-8" } });
}
