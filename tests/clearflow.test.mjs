import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ClearFlow product shell exposes the required operating surfaces", async () => {
  const [page, layout, dashboard] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/dashboard.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(page, /<Dashboard \/>/);
  assert.match(layout, /ClearFlow — AI Automation/);
  assert.match(dashboard, /AI AUTOMATION CONTROL CENTRE/);
  assert.match(dashboard, /Lead CRM/);
  assert.match(dashboard, /AI Inbox/);
  assert.match(dashboard, /Campaigns/);
  assert.match(dashboard, /Connections/);
  assert.doesNotMatch(page + layout, /codex-preview|Your site is taking shape/i);
});

test("outreach and inbound routes enforce consent and opt-out controls", async () => {
  const [outreach, webhook, automation, inbound, twilio, gmail] = await Promise.all([
    readFile(new URL("../app/api/outreach/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/webhooks/sms/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/automation.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/inbound.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/twilio.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/gmail.ts", import.meta.url), "utf8"),
  ]);
  assert.match(outreach, /CONSENT_REQUIRED/);
  assert.match(outreach, /CONTACT_SUPPRESSED/);
  assert.match(outreach, /CONTACT_RATE_LIMITED/);
  assert.match(outreach, /sendTwilioSms/);
  assert.match(outreach, /sendGmailEmail/);
  assert.match(outreach, /placeTwilioCall/);
  assert.match(webhook, /recordInbound/);
  assert.match(webhook, /validateTwilioWebhook/);
  assert.match(twilio, /Messages\.json/);
  assert.match(twilio, /Calls\.json/);
  assert.match(twilio, /HMAC/);
  assert.match(gmail, /gmail\/v1\/users\/me\/messages\/send/);
  assert.match(gmail, /GMAIL_REFRESH_TOKEN/);
  assert.match(inbound, /followupJobs/);
  assert.match(inbound, /isOptOut/);
  assert.match(automation, /band\\s\*karo/);
  assert.match(automation, /message\\s\*mat\\s\*karo/);
});

test("Gmail uses a signed offline OAuth flow and encrypted refresh token", async () => {
  const [start, callback, state] = await Promise.all([
    readFile(new URL("../app/api/oauth/gmail/start/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/oauth/gmail/callback/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/google-oauth.ts", import.meta.url), "utf8"),
  ]);
  assert.match(start, /access_type: "offline"/);
  assert.match(start, /gmail\.send/);
  assert.match(start, /gmail\.readonly/);
  assert.match(callback, /verifyGoogleOAuthState/);
  assert.match(callback, /encryptSecret/);
  assert.match(callback, /GMAIL_REFRESH_TOKEN/);
  assert.match(state, /HMAC/);
  assert.match(state, /expiresAt/);
});

test("Apify discovery applies quality, website, closure, and chain filters", async () => {
  const discovery = await readFile(new URL("../app/api/discovery/route.ts", import.meta.url), "utf8");
  assert.match(discovery, /APIFY_API_TOKEN/);
  assert.match(discovery, /compass~crawler-google-places/);
  assert.match(discovery, /run-sync-get-dataset-items/);
  assert.match(discovery, /minRating/);
  assert.match(discovery, /minReviews/);
  assert.match(discovery, /websiteFilter/);
  assert.match(discovery, /permanentlyClosed/);
  assert.match(discovery, /bigChains/);
});

test("provider configuration uses encrypted storage and never returns credentials", async () => {
  const [route, secrets, dashboard] = await Promise.all([
    readFile(new URL("../app/api/connections/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/secrets.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/dashboard.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(route, /testProvider/);
  assert.match(route, /Cross-origin configuration is blocked/);
  assert.match(route, /encryptSecret/);
  assert.match(secrets, /AES-GCM/);
  assert.match(secrets, /VAULT_MASTER_KEY/);
  assert.match(dashboard, /Test & connect/);
  assert.match(dashboard, /Saved credentials are hidden/);
  assert.match(dashboard, /Discover with Apify/);
  assert.match(dashboard, /Gmail/);
  assert.match(dashboard, /Twilio Calls \+ SMS/);
  assert.doesNotMatch(dashboard, /MSG91|Resend|Google Places API key|WhatsApp Business/);
  assert.doesNotMatch(route, /return Response\.json\(\{[^}]*values/);
});
