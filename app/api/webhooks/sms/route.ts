import { recordInbound } from "../../../../lib/inbound";
import { resolveSecret } from "../../../../lib/secrets";

export async function POST(request: Request) {
  const expected = await resolveSecret("MSG91_WEBHOOK_TOKEN");
  if (expected) {
    const supplied = new URL(request.url).searchParams.get("token") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (supplied !== expected) return Response.json({ error: "Unauthorized webhook" }, { status: 401 });
  }

  let phone = ""; let body = ""; let providerMessageId = "";
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const payload = await request.json() as Record<string, unknown>;
    phone = String(payload.from ?? payload.mobile ?? payload.sender ?? payload.phone ?? "");
    body = String(payload.message ?? payload.body ?? payload.text ?? "");
    providerMessageId = String(payload.requestId ?? payload.request_id ?? payload.messageId ?? "");
  } else {
    const form = await request.formData();
    phone = String(form.get("From") ?? form.get("from") ?? form.get("mobile") ?? "");
    body = String(form.get("Body") ?? form.get("body") ?? form.get("message") ?? "");
    providerMessageId = String(form.get("MessageSid") ?? form.get("request_id") ?? form.get("messageId") ?? "");
  }
  if (!phone || !body) return Response.json({ error: "SMS sender and message are required" }, { status: 400 });
  const result = await recordInbound("sms", phone, body, providerMessageId);
  return Response.json(result);
}
