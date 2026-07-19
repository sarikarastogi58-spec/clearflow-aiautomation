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
  const [outreach, webhook, automation, inbound] = await Promise.all([
    readFile(new URL("../app/api/outreach/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/webhooks/whatsapp/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/automation.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/inbound.ts", import.meta.url), "utf8"),
  ]);
  assert.match(outreach, /CONSENT_REQUIRED/);
  assert.match(outreach, /CONTACT_SUPPRESSED/);
  assert.match(outreach, /APPROVED_TEMPLATE_REQUIRED/);
  assert.match(outreach, /sendSms/);
  assert.match(outreach, /sendEmail/);
  assert.match(webhook, /recordInbound/);
  assert.match(inbound, /followupJobs/);
  assert.match(inbound, /isOptOut/);
  assert.match(automation, /band\\s\*karo/);
  assert.match(automation, /message\\s\*mat\\s\*karo/);
});
