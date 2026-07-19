import { getDb } from "../../../../../db";
import { providerConnections, vaultSecrets } from "../../../../../db/schema";
import { verifyGoogleOAuthState } from "../../../../../lib/google-oauth";
import { encryptSecret, resolveSecret, secret } from "../../../../../lib/secrets";

function returnToDashboard(origin: string, status: "connected" | "error", message?: string) {
  const parameters = new URLSearchParams({ gmail: status });
  if (message) parameters.set("message", message.slice(0, 160));
  return Response.redirect(`${origin}/?${parameters.toString()}`, 302);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code") ?? "";
  if (!code || !(await verifyGoogleOAuthState(state))) return returnToDashboard(url.origin, "error", "Google authorization was cancelled or expired");
  if (!secret("VAULT_MASTER_KEY")) return returnToDashboard(url.origin, "error", "Credential vault is not initialized");

  try {
    const [clientId, clientSecret] = await Promise.all([resolveSecret("GOOGLE_CLIENT_ID"), resolveSecret("GOOGLE_CLIENT_SECRET")]);
    if (!clientId || !clientSecret) throw new Error("Google OAuth client credentials are missing");
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code, grant_type: "authorization_code", redirect_uri: `${url.origin}/api/oauth/gmail/callback` }),
    });
    const token = await tokenResponse.json() as { access_token?: string; refresh_token?: string; error_description?: string };
    if (!tokenResponse.ok || !token.access_token) throw new Error(token.error_description ?? "Google token exchange failed");
    const refreshToken = token.refresh_token ?? await resolveSecret("GMAIL_REFRESH_TOKEN");
    if (!refreshToken) throw new Error("Google did not return offline access. Remove ClearFlow from Google permissions and authorize again.");
    const profileResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", { headers: { Authorization: `Bearer ${token.access_token}` } });
    const profile = await profileResponse.json() as { emailAddress?: string; error?: { message?: string } };
    if (!profileResponse.ok || !profile.emailAddress) throw new Error(profile.error?.message ?? "Could not read the Gmail profile");

    const now = new Date().toISOString();
    const encrypted = await Promise.all([
      { name: "GMAIL_REFRESH_TOKEN", ...(await encryptSecret(refreshToken)), updatedAt: now },
      { name: "GMAIL_SENDER_EMAIL", ...(await encryptSecret(profile.emailAddress)), updatedAt: now },
    ]);
    const db = getDb();
    await Promise.all(encrypted.map((item) => db.insert(vaultSecrets).values(item).onConflictDoUpdate({
      target: vaultSecrets.name, set: { encryptedValue: item.encryptedValue, iv: item.iv, updatedAt: now },
    })));
    await db.insert(providerConnections).values({ provider: "gmail", status: "connected", lastTestedAt: now, lastError: null, updatedAt: now }).onConflictDoUpdate({
      target: providerConnections.provider, set: { status: "connected", lastTestedAt: now, lastError: null, updatedAt: now },
    });
    return returnToDashboard(url.origin, "connected");
  } catch (error) {
    return returnToDashboard(url.origin, "error", error instanceof Error ? error.message : "Gmail authorization failed");
  }
}
