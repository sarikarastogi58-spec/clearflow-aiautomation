import { createGoogleOAuthState } from "../../../../../lib/google-oauth";
import { resolveSecret } from "../../../../../lib/secrets";

export async function GET(request: Request) {
  const clientId = await resolveSecret("GOOGLE_CLIENT_ID");
  if (!clientId) return Response.json({ error: "Save the Google OAuth client credentials in Connections first" }, { status: 503 });
  const redirectUri = `${new URL(request.url).origin}/api/oauth/gmail/callback`;
  const parameters = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly",
    state: await createGoogleOAuthState(),
  });
  return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${parameters.toString()}`, 302);
}
