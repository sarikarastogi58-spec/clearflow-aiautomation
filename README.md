# ClearFlow

ClearFlow is the production-oriented AI operations system for **Clear Web Solutions**. It combines Apify-powered local business discovery, an evidence-based lead CRM, multilingual customer support, consent-gated email and SMS outreach, automatic follow-up cancellation, and conversion analytics.

## What works

- Responsive dashboard with Overview, Lead CRM, AI Inbox, Campaigns, and secure Connections.
- Apify discovery from the CRM with city, category, rating, review-count, website, closure, and independent-business filters.
- Bulk import into Cloudflare D1 with deterministic website-need, business-potential, digital-gap, pitch-angle, priority, and 0–100 lead scoring.
- OpenAI Responses API support agent for English, Hindi, and natural Hinglish.
- MSG91 Flow API SMS and Resend email adapters; Twilio voice remains optional.
- Consent and suppression gates before every send. Public listing data is never treated as consent.
- Authenticated inbound SMS/email handling, multilingual opt-out recognition, warm-lead marking, and follow-up cancellation on reply.
- Three-day and seven-day follow-up jobs plus funnel analytics.
- AES-GCM encrypted provider credentials managed from the private dashboard; secrets are never returned to the browser.

## Configure from the dashboard

Open **Connections** and add:

```text
OPENAI_API_KEY
APIFY_API_TOKEN
MSG91_AUTH_KEY
MSG91_TEMPLATE_ID
RESEND_API_KEY
EMAIL_FROM
```

Optional fields are shown in each provider dialog. Apify defaults to the `compass~crawler-google-places` actor, and MSG91 defaults to a Flow variable named `MESSAGE`.

## Provider-side setup

1. Create an Apify API token and accept any terms/costs for the configured actor.
2. Verify a sending domain in Resend.
3. Complete Indian DLT registration and approve the exact MSG91 Flow template and sender.
4. Obtain and retain verifiable marketing consent. A phone number or email on a public listing is not consent.
5. Configure a scheduler to call `POST /api/jobs/followups` with `Authorization: Bearer <CRON_SECRET>`.

Keep campaigns paused until sender approvals and consent proof are complete. Review the outreach, privacy, DLT, retention, and call-recording flow with India-qualified counsel.

## Local development

Requires Node.js 22.13 or newer.

```bash
pnpm install
pnpm dev
```

Copy `.env.example` to `.env.local`. The hosting platform applies the checked-in D1 migrations to its managed database.

## Validation

```bash
pnpm build
pnpm test
```

## API surface

| Endpoint | Purpose |
|---|---|
| `GET/POST /api/leads` | List, add, score, and store CRM leads |
| `POST /api/discovery` | Run filtered Apify local-business discovery |
| `POST /api/support` | Generate a multilingual support reply |
| `POST /api/consents` | Record verifiable channel consent |
| `POST /api/outreach` | Consent-check and send MSG91 SMS or Resend email |
| `POST /api/webhooks/sms` | Authenticated inbound SMS, reply, and opt-out events |
| `POST /api/webhooks/email` | Authenticated normalized inbound email events |
| `POST /api/webhooks/voice` | Optional multilingual Twilio speech support |
| `POST /api/jobs/followups` | Recheck and ready due follow-ups |
| `GET /api/analytics` | Funnel and conversion metrics |
| `GET/POST/DELETE /api/connections` | Verify, encrypt, update, or remove provider credentials |

The detailed architecture and operating model are in [`docs/architecture.md`](docs/architecture.md).
