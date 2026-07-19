import { secret } from "./secrets";

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0));
}

async function signature(payload: string) {
  const vaultKey = secret("VAULT_MASTER_KEY");
  if (!vaultKey) throw new Error("Credential vault is not initialized");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(vaultKey), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
}

export async function createGoogleOAuthState() {
  const payload = toBase64Url(new TextEncoder().encode(JSON.stringify({ nonce: crypto.randomUUID(), expiresAt: Date.now() + 10 * 60_000 })));
  return `${payload}.${toBase64Url(await signature(payload))}`;
}

export async function verifyGoogleOAuthState(state: string) {
  const [payload, supplied] = state.split(".");
  if (!payload || !supplied) return false;
  const expected = await signature(payload);
  const actual = fromBase64Url(supplied);
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) difference |= actual[index] ^ expected[index];
  if (difference !== 0) return false;
  try {
    const decoded = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as { expiresAt?: number };
    return Number(decoded.expiresAt) > Date.now();
  } catch { return false; }
}
