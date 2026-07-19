import { recordInbound } from "../../../../lib/inbound";
import { secret } from "../../../../lib/secrets";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && token === secret("WHATSAPP_VERIFY_TOKEN")) return new Response(challenge ?? "", { status: 200 });
  return new Response("Verification failed", { status: 403 });
}

export async function POST(request: Request) {
  type WhatsAppPayload = {
    entry?: Array<{ changes?: Array<{ value?: {
      messages?: Array<{ id?: string; from?: string; text?: { body?: string }; button?: { text?: string } }>;
    } }> }>;
  };
  const payload = await request.json() as WhatsAppPayload;
  const value = payload.entry?.[0]?.changes?.[0]?.value;
  const inbound = value?.messages?.[0];
  if (!inbound) return Response.json({ received: true });
  const providerMessageId = String(inbound.id ?? "");
  const phone = String(inbound.from ?? "");
  const body = String(inbound.text?.body ?? inbound.button?.text ?? "");
  return Response.json(await recordInbound("whatsapp", phone, body, providerMessageId));
}
