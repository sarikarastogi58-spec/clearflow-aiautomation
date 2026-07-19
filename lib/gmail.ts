import { resolveSecret } from "./secrets";

function bytesToBase64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function safeHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function encodedHeader(value: string) {
  const bytes = new TextEncoder().encode(safeHeader(value));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `=?UTF-8?B?${btoa(binary)}?=`;
}

export async function getGmailAccessToken() {
  const [clientId, clientSecret, refreshToken] = await Promise.all([
    resolveSecret("GOOGLE_CLIENT_ID"), resolveSecret("GOOGLE_CLIENT_SECRET"), resolveSecret("GMAIL_REFRESH_TOKEN"),
  ]);
  if (!clientId || !clientSecret || !refreshToken) throw new Error("Gmail OAuth is not connected");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
  });
  const data = await response.json() as { access_token?: string; error_description?: string };
  if (!response.ok || !data.access_token) throw new Error(data.error_description ?? "Google could not refresh Gmail access");
  return data.access_token;
}

export async function sendGmailEmail(to: string, subject: string, body: string, idempotencyKey: string) {
  const [accessToken, from] = await Promise.all([getGmailAccessToken(), resolveSecret("GMAIL_SENDER_EMAIL")]);
  if (!from) throw new Error("Gmail sender address is not configured");
  const messageKey = safeHeader(idempotencyKey).replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 120) || crypto.randomUUID();
  const mime = [
    `From: ${safeHeader(from)}`,
    `To: ${safeHeader(to)}`,
    `Subject: ${encodedHeader(subject)}`,
    `Message-ID: <${messageKey}@clearflow.local>`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    body,
  ].join("\r\n");
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: bytesToBase64Url(mime) }),
  });
  const data = await response.json() as { id?: string; error?: { message?: string } };
  if (!response.ok || !data.id) throw new Error(data.error?.message ?? `Gmail returned ${response.status}`);
  return data.id;
}

export async function listRecentGmailReplies(maxResults = 25) {
  const accessToken = await getGmailAccessToken();
  const listResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${Math.min(50, maxResults)}&q=${encodeURIComponent("in:inbox newer_than:14d")}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const list = await listResponse.json() as { messages?: Array<{ id: string }>; error?: { message?: string } };
  if (!listResponse.ok) throw new Error(list.error?.message ?? "Gmail inbox sync failed");
  return Promise.all((list.messages ?? []).map(async ({ id }) => {
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const message = await response.json() as { id?: string; payload?: { headers?: Array<{ name: string; value: string }> } };
    const headers = message.payload?.headers ?? [];
    const from = headers.find((header) => header.name.toLowerCase() === "from")?.value ?? "";
    const subject = headers.find((header) => header.name.toLowerCase() === "subject")?.value ?? "Email reply";
    return { id: message.id ?? id, from: from.match(/<([^>]+)>/)?.[1] ?? from, subject };
  }));
}
