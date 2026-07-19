import { id } from "./automation";
import { resolveSecret } from "./secrets";

async function credentials() {
  const [sid, token] = await Promise.all([resolveSecret("TWILIO_ACCOUNT_SID"), resolveSecret("TWILIO_AUTH_TOKEN")]);
  if (!sid || !token) throw new Error("Twilio credentials are not configured");
  return { sid, token, authorization: `Basic ${btoa(`${sid}:${token}`)}` };
}

async function twilioRequest(path: string, form: URLSearchParams) {
  const { sid, authorization } = await credentials();
  let response: Response | undefined;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/${path}`, {
      method: "POST", headers: { Authorization: authorization, "Content-Type": "application/x-www-form-urlencoded" }, body: form,
    });
    if (response.status !== 429 && response.status < 500) break;
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250 * (2 ** attempt) + Math.floor(Math.random() * 250)));
  }
  const data = await response?.json() as { sid?: string; message?: string } | undefined;
  if (!response?.ok) throw new Error(data?.message ?? `Twilio returned ${response?.status ?? 502}`);
  return data?.sid;
}

export async function sendTwilioSms(to: string, body: string, statusCallback: string) {
  const [from, messagingServiceSid] = await Promise.all([resolveSecret("TWILIO_SMS_FROM"), resolveSecret("TWILIO_MESSAGING_SERVICE_SID")]);
  if (!from && !messagingServiceSid) throw new Error("Twilio SMS sender is not configured");
  const form = new URLSearchParams({ To: to, Body: body, StatusCallback: statusCallback });
  if (messagingServiceSid) form.set("MessagingServiceSid", messagingServiceSid); else form.set("From", String(from));
  return await twilioRequest("Messages.json", form) ?? id("sms");
}

export async function placeTwilioCall(to: string, answerUrl: string, statusCallback: string) {
  const from = await resolveSecret("TWILIO_VOICE_FROM");
  if (!from) throw new Error("Twilio voice number is not configured");
  const form = new URLSearchParams({
    To: to, From: from, Url: answerUrl, Method: "POST", StatusCallback: statusCallback,
    StatusCallbackMethod: "POST",
  });
  for (const event of ["initiated", "ringing", "answered", "completed"]) form.append("StatusCallbackEvent", event);
  return await twilioRequest("Calls.json", form) ?? id("call");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export async function validateTwilioWebhook(request: Request, form: FormData) {
  const token = await resolveSecret("TWILIO_AUTH_TOKEN");
  const supplied = request.headers.get("x-twilio-signature") ?? "";
  if (!token || !supplied) return false;
  const fields = Array.from(form.entries()).map(([key, value]) => [key, String(value)] as const).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
  const source = fields.reduce((value, [key, field]) => `${value}${key}${field}`, request.url);
  const cryptoKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(token), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const signed = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(source)));
  let binary = "";
  for (const byte of signed) binary += String.fromCharCode(byte);
  return constantTimeEqual(btoa(binary), supplied);
}
