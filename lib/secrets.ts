import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { vaultSecrets } from "../db/schema";

export function secret(name: string): string | undefined {
  const value = (env as unknown as Record<string, unknown>)[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function bytesToBase64(value: Uint8Array) {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function vaultKey() {
  const master = secret("VAULT_MASTER_KEY");
  if (!master) throw new Error("Credential vault is not initialized");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(master));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptSecret(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await vaultKey(), new TextEncoder().encode(value));
  return { encryptedValue: bytesToBase64(new Uint8Array(encrypted)), iv: bytesToBase64(iv) };
}

export async function decryptSecret(encryptedValue: string, iv: string) {
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(iv) },
    await vaultKey(),
    base64ToBytes(encryptedValue),
  );
  return new TextDecoder().decode(decrypted);
}

export async function resolveSecret(name: string): Promise<string | undefined> {
  const runtimeValue = secret(name);
  if (runtimeValue) return runtimeValue;
  try {
    const row = await getDb().select().from(vaultSecrets).where(eq(vaultSecrets.name, name)).limit(1);
    if (!row[0]) return undefined;
    return await decryptSecret(row[0].encryptedValue, row[0].iv);
  } catch {
    return undefined;
  }
}
