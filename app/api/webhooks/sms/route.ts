import { recordInbound } from "../../../../lib/inbound";

export async function POST(request: Request) {
  const form = await request.formData();
  const result = await recordInbound("sms", String(form.get("From") ?? ""), String(form.get("Body") ?? ""), String(form.get("MessageSid") ?? ""));
  return Response.json(result);
}
