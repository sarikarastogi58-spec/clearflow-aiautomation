# ClearFlow

ClearFlow is the AI operations system for **Clear Web Solutions**. It combines Apify local-business discovery, an evidence-based lead CRM, multilingual support, Gmail outreach, Twilio SMS and AI calls, automatic reply handling, follow-up cancellation, and conversion analytics.

## What works

- Private responsive dashboard with Overview, Lead CRM, AI Inbox, Campaigns, and encrypted Connections.
- Apify discovery with city, category, rating, review-count, website, closure, and independent-business filters.
- Bulk CRM import with deterministic 0–100 scoring, website need, potential, digital gaps, pitch angle, and priority.
- OpenAI support agent for English, Hindi, and natural Hinglish.
- Gmail API OAuth flow with encrypted offline refresh token, personalized sending, and scheduled inbox reply synchronization.
- Twilio SMS sending, inbound reply/opt-out handling, delivery status callbacks, and outbound AI consultation calls.
- Cryptographic validation of Twilio webhook signatures.
- Consent, suppression, six-hour contact caps, channel rate limiting, retries with jitter, and provider tracking.
- Three-day and seven-day email/SMS follow-up jobs that are cancelled automatically after replies or opt-outs.
- Analytics for leads, high-quality leads, sends, replies, interested leads, wins, and conversion.

## Configure from the dashboard

Open **Connections** and complete:

1. OpenAI API key.
2. Apify API token.
3. Google OAuth Web application client ID and client secret, followed by **Authorize Gmail**.
4. Twilio Account SID, Auth Token, SMS sender, and Voice caller ID.

For the Google OAuth client, enable Gmail API and add this authorized redirect URI:

```text
https://clearflow-cws-india.sarikarastogi58.chatgpt.site/api/oauth/gmail/callback
```

For Twilio, configure:

```text
Inbound SMS webhook:  POST /api/webhooks/sms
Voice webhook:        POST /api/webhooks/voice
Status callbacks:     managed automatically by ClearFlow
```

Twilio domestic Indian SMS requires the applicable DLT registration and approved sender/use case. Twilio international routing may replace the visible sender with a random short code. Outbound commercial SMS and calls still require verifiable recipient consent.

## Scheduled jobs

Call both routes with `Authorization: Bearer <CRON_SECRET>`:

```text
POST /api/jobs/followups
POST /api/jobs/gmail-sync
```

The Gmail job checks recent inbox messages, records matched replies, marks leads warm, and cancels pending follow-ups.

## Local development

Requires Node.js 22.13 or newer.

```bash
pnpm install
pnpm dev
```

Copy `.env.example` to `.env.local`. The hosting platform applies the checked-in D1 migrations.

## Validation

```bash
pnpm build
pnpm test
```

## API surface

| Endpoint | Purpose |
|---|---|
| `GET/POST /api/leads` | List, add, score, and store CRM leads |
| `POST /api/discovery` | Run filtered Apify discovery |
| `POST /api/support` | Generate a multilingual support reply |
| `POST /api/consents` | Record verifiable channel consent |
| `POST /api/outreach` | Send consent-checked Gmail email, Twilio SMS, or Twilio call |
| `GET /api/oauth/gmail/start` | Begin secure Gmail OAuth authorization |
| `GET /api/oauth/gmail/callback` | Exchange authorization and encrypt Gmail credentials |
| `POST /api/webhooks/sms` | Receive signed Twilio SMS replies and opt-outs |
| `POST /api/webhooks/voice` | Run the signed Twilio speech assistant |
| `POST /api/webhooks/twilio/status` | Track signed SMS and call status callbacks |
| `POST /api/jobs/gmail-sync` | Synchronize Gmail replies into the CRM |
| `POST /api/jobs/followups` | Recheck and release due follow-ups |
| `GET /api/analytics` | Funnel and conversion metrics |
| `GET/POST/DELETE /api/connections` | Test, encrypt, authorize, update, or remove credentials |

The full architecture is documented in [`docs/architecture.md`](docs/architecture.md).
