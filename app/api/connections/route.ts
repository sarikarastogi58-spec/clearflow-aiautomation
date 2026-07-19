import { eq, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { providerConnections, vaultSecrets } from "../../../db/schema";
import { isProviderId, providerDefinitions, type ProviderId } from "../../../lib/providers";
import { encryptSecret, resolveSecret, secret } from "../../../lib/secrets";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

async function valuesFor(provider: ProviderId, submitted: Record<string, string> = {}) {
  const definition = providerDefinitions[provider];
  const keys = [...definition.required, ...definition.optional];
  const entries = await Promise.all(keys.map(async (key) => [key, submitted[key]?.trim() || await resolveSecret(key)] as const));
  return Object.fromEntries(entries) as Record<string, string | undefined>;
}

function providerMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") return fallback;
  const record = data as Record<string, unknown>;
  const nested = record.error && typeof record.error === "object" ? record.error as Record<string, unknown> : undefined;
  const message = nested?.message ?? record.message ?? record.error_description;
  return typeof message === "string" ? message.slice(0, 240) : fallback;
}

async function testProvider(provider: ProviderId, values: Record<string, string | undefined>) {
  let response: Response;
  if (provider === "openai") {
    response = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${values.OPENAI_API_KEY}` } });
  } else if (provider === "apify") {
    response = await fetch("https://api.apify.com/v2/users/me", {
      headers: { Authorization: `Bearer ${values.APIFY_API_TOKEN}` },
    });
  } else if (provider === "twilio") {
    const credentials = btoa(`${values.TWILIO_ACCOUNT_SID}:${values.TWILIO_AUTH_TOKEN}`);
    response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(String(values.TWILIO_ACCOUNT_SID))}.json`, {
      headers: { Authorization: `Basic ${credentials}` },
    });
  } else if (provider === "gmail") {
    throw new Error("Gmail must be authorized through Google OAuth");
  } else {
    throw new Error("Unsupported provider");
  }

  if (!response.ok) {
    let data: unknown;
    try { data = await response.json(); } catch { data = undefined; }
    throw new Error(providerMessage(data, `${providerDefinitions[provider].name} rejected the credentials (${response.status})`));
  }
}

export async function GET() {
  const db = getDb();
  const savedStatuses = await db.select().from(providerConnections);
  const statuses = new Map(savedStatuses.map((item) => [item.provider, item]));
  const connections = await Promise.all(Object.values(providerDefinitions).map(async (definition) => {
    const configured = await Promise.all(definition.required.map((key) => resolveSecret(key)));
    const fullyConfigured = configured.every(Boolean);
    const setupConfigured = definition.id === "gmail" ? configured.slice(0, 2).every(Boolean) : fullyConfigured;
    const status = statuses.get(definition.id);
    const connected = fullyConfigured && (status?.status === "connected" || definition.required.every((key) => Boolean(secret(key))));
    return {
      id: definition.id,
      connected,
      configured: setupConfigured,
      lastTestedAt: status?.lastTestedAt ?? null,
      lastError: status?.lastError ?? null,
    };
  }));
  return Response.json({ connections, vaultReady: Boolean(secret("VAULT_MASTER_KEY")) });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Cross-origin configuration is blocked" }, { status: 403 });
  if (!secret("VAULT_MASTER_KEY")) return Response.json({ error: "The secure credential vault is not initialized" }, { status: 503 });
  const body = await request.json() as { provider?: string; values?: Record<string, string> };
  if (!body.provider || !isProviderId(body.provider)) return Response.json({ error: "Unknown provider" }, { status: 400 });
  const definition = providerDefinitions[body.provider];
  const allowed = new Set([...definition.required, ...definition.optional]);
  const submitted = Object.fromEntries(Object.entries(body.values ?? {}).filter(([key, value]) => allowed.has(key) && typeof value === "string" && value.trim()));
  const values = await valuesFor(body.provider, submitted);
  const requiredForSave = body.provider === "gmail" ? ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"] : definition.required;
  const missing = requiredForSave.filter((key) => !values[key]);
  if (missing.length) return Response.json({ error: `Complete the required fields: ${missing.join(", ")}` }, { status: 400 });

  const db = getDb();
  const now = new Date().toISOString();
  try {
    if (body.provider === "gmail") {
      const encrypted = await Promise.all(Object.entries(submitted).map(async ([name, value]) => ({ name, ...(await encryptSecret(value)), updatedAt: now })));
      await Promise.all(encrypted.map((item) => db.insert(vaultSecrets).values(item).onConflictDoUpdate({
        target: vaultSecrets.name, set: { encryptedValue: item.encryptedValue, iv: item.iv, updatedAt: now },
      })));
      await db.insert(providerConnections).values({ provider: "gmail", status: "authorization_required", lastTestedAt: now, lastError: null, updatedAt: now }).onConflictDoUpdate({
        target: providerConnections.provider, set: { status: "authorization_required", lastTestedAt: now, lastError: null, updatedAt: now },
      });
      return Response.json({ connected: false, provider: "gmail", authorizationRequired: true, authorizationUrl: "/api/oauth/gmail/start" });
    }
    await testProvider(body.provider, values);
    const encrypted = await Promise.all(Object.entries(submitted).map(async ([name, value]) => ({ name, ...(await encryptSecret(value)), updatedAt: now })));
    await Promise.all(encrypted.map((item) => db.insert(vaultSecrets).values(item).onConflictDoUpdate({
      target: vaultSecrets.name,
      set: { encryptedValue: item.encryptedValue, iv: item.iv, updatedAt: now },
    })));
    await db.insert(providerConnections).values({ provider: body.provider, status: "connected", lastTestedAt: now, lastError: null, updatedAt: now }).onConflictDoUpdate({
      target: providerConnections.provider,
      set: { status: "connected", lastTestedAt: now, lastError: null, updatedAt: now },
    });
    return Response.json({ connected: true, provider: body.provider, lastTestedAt: now });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection test failed";
    await db.insert(providerConnections).values({ provider: body.provider, status: "error", lastTestedAt: now, lastError: message, updatedAt: now }).onConflictDoUpdate({
      target: providerConnections.provider,
      set: { status: "error", lastTestedAt: now, lastError: message, updatedAt: now },
    });
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Cross-origin configuration is blocked" }, { status: 403 });
  const provider = new URL(request.url).searchParams.get("provider") ?? "";
  if (!isProviderId(provider)) return Response.json({ error: "Unknown provider" }, { status: 400 });
  const definition = providerDefinitions[provider];
  const db = getDb();
  if (provider === "gmail") {
    const refreshToken = await resolveSecret("GMAIL_REFRESH_TOKEN");
    if (refreshToken) await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" } }).catch(() => undefined);
  }
  await db.batch([
    db.delete(vaultSecrets).where(inArray(vaultSecrets.name, [...definition.required, ...definition.optional])),
    db.delete(providerConnections).where(eq(providerConnections.provider, provider)),
  ]);
  return Response.json({ disconnected: true, provider });
}
