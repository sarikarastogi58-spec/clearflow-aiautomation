import { recordInbound } from "../../../../lib/inbound";
import { resolveSecret } from "../../../../lib/secrets";

export async function POST(request: Request) {
  if (request.headers.get("x-clearflow-webhook-secret") !== await resolveSecret("EMAIL_WEBHOOK_SECRET")) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await request.json() as { from?: string; text?: string; subject?: string; id?: string; data?: { from?: string; text?: string; subject?: string; id?: string } };
  const data = payload.data ?? payload;
  const body = [data.subject, data.text].filter(Boolean).join("\n\n");
  return Response.json(await recordInbound("email", String(data.from ?? ""), body, String(data.id ?? "")));
}
