import { generateSupportReply } from "../../../../lib/ai";
import { recordInbound } from "../../../../lib/inbound";
import { validateTwilioWebhook } from "../../../../lib/twilio";

function xml(value: string) {
  return value.replace(/[<>&'\"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[char] ?? char);
}

export async function POST(request: Request) {
  const form = await request.formData();
  if (!(await validateTwilioWebhook(request, form))) return new Response("Invalid Twilio signature", { status: 401 });
  const speech = String(form.get("SpeechResult") ?? "").trim();
  const direction = String(form.get("Direction") ?? "");
  const contactPhone = direction.startsWith("outbound") ? String(form.get("To") ?? "") : String(form.get("From") ?? "");
  const callSid = String(form.get("CallSid") ?? "");
  let reply = "Namaste. Clear Web Solutions mein aapka swagat hai. Website, online growth, ya booking system ke baare mein bataiye.";
  if (speech) {
    await recordInbound("voice", contactPhone, speech, `${callSid}:${String(form.get("SequenceNumber") ?? Date.now())}`).catch(() => undefined);
    try { reply = await generateSupportReply(speech, `Voice contact: ${contactPhone}. Keep the spoken reply under 40 words.`); }
    catch { reply = "Maaf kijiye, abhi assistant available nahi hai. Hamari team aapko jaldi call back karegi."; }
  }
  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Gather input="speech" action="/api/webhooks/voice" method="POST" language="hi-IN" speechTimeout="auto" actionOnEmptyResult="true"><Say language="hi-IN">${xml(reply)}</Say></Gather><Say language="hi-IN">Dhanyavaad. Hamari team aapse jaldi sampark karegi.</Say></Response>`;
  return new Response(twiml, { headers: { "Content-Type": "text/xml; charset=utf-8" } });
}
