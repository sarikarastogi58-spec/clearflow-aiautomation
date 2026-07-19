# ClearFlow

ClearFlow is the production-oriented AI operations system for **Clear Web Solutions**. It combines a lead CRM, evidence-based lead scoring, Google Places discovery, multilingual customer support, consent-gated WhatsApp outreach, automatic follow-up cancellation, and conversion analytics.

## What already works

- Responsive operations dashboard with Overview, Lead CRM, AI Inbox, Campaigns, and Connections.
- Persistent Cloudflare D1 schema for businesses, leads, consent, suppressions, messages, follow-up jobs, and analytics events.
- Deterministic lead scoring from rating, review volume, website condition, contactability, and digital gaps.
- Google Places Text Search adapter with rating/closure filtering and a minimal field mask.
- OpenAI Responses API support agent for English, Hindi, and natural Hinglish.
- WhatsApp Business Platform template sender, Twilio SMS adapter, Resend email adapter, and Twilio speech-call assistant.
- Consent, suppression, approved-template, and channel eligibility gates before sends.
- WhatsApp verification/inbound webhook, duplicate protection, multilingual opt-out recognition, warm-lead marking, and atomic follow-up cancellation.
- Three-day and seven-day follow-up jobs.
- Analytics API for total/high-quality leads, sends, replies, interested leads, wins, and conversion.
- Demo data in the interface until the database contains live records.

## Keys you provide

Copy `.env.example` to `.env.local` for local use, or add the same names to the hosting environment.

Required for the first live version:

```text
OPENAI_API_KEY
GOOGLE_PLACES_API_KEY
CRON_SECRET
```

For WhatsApp:

```text
WHATSAPP_ACCESS_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_VERIFY_TOKEN
WHATSAPP_APP_SECRET
```

For SMS/voice and email:

```text
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_SMS_FROM
RESEND_API_KEY
EMAIL_FROM
EMAIL_WEBHOOK_SECRET
```

The application never sends these values to the browser, model context, CRM, or analytics.

## Provider-side steps that an API key cannot replace

1. Verify a Meta Business account and WhatsApp number.
2. Create and approve initial and follow-up WhatsApp templates.
3. Register sender identity/templates on an Indian DLT platform before domestic commercial SMS.
4. Obtain and retain verifiable marketing consent. A public listing is not treated as consent.
5. Configure a scheduler to call `POST /api/jobs/followups` with `Authorization: Bearer <CRON_SECRET>`.

## Local development

Requires Node.js 22.13 or newer.

```bash
pnpm install
pnpm dev
```

Create the local D1 tables by applying `drizzle/0000_clearflow.sql` through Wrangler. The hosting platform applies the checked-in migration to its managed D1 binding.

## Validation

```bash
pnpm build
pnpm test
```

## API surface

| Endpoint | Purpose |
|---|---|
| `GET/POST /api/leads` | List, add, and score CRM leads |
| `POST /api/discovery` | Find local businesses through Places API |
| `POST /api/support` | Generate a multilingual support reply |
| `POST /api/consents` | Record verifiable channel consent |
| `POST /api/outreach` | Eligibility-check and send approved WhatsApp template |
| `GET/POST /api/webhooks/whatsapp` | Meta verification and inbound events |
| `POST /api/webhooks/sms` | Twilio inbound SMS, reply and opt-out events |
| `POST /api/webhooks/voice` | Multilingual speech support through TwiML Gather |
| `POST /api/webhooks/email` | Authenticated normalized inbound email events |
| `POST /api/jobs/followups` | Recheck and ready due follow-ups |
| `GET /api/analytics` | Funnel metrics |

## Production controls

- Restrict the deployed dashboard to the Clear Web Solutions workspace/team.
- Put secrets only in managed hosting settings.
- Set provider spending limits, alert thresholds, quiet hours, and approved templates before enabling campaigns.
- Keep campaigns paused until consent proof is imported and manually sample the first audience.
- Review the exact outreach, privacy, DLT, retention, and recording flow with India-qualified counsel.

The full architecture and operational rationale remain available in `outputs/clear-web-solutions-ai-automation-blueprint.md`.
