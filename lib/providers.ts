export type ProviderId = "openai" | "apify" | "gmail" | "twilio";

export type ProviderDefinition = {
  id: ProviderId;
  name: string;
  required: string[];
  optional: string[];
};

export const providerDefinitions: Record<ProviderId, ProviderDefinition> = {
  openai: { id: "openai", name: "OpenAI", required: ["OPENAI_API_KEY"], optional: ["OPENAI_MODEL"] },
  apify: {
    id: "apify", name: "Apify",
    required: ["APIFY_API_TOKEN"], optional: ["APIFY_ACTOR_ID"],
  },
  gmail: {
    id: "gmail", name: "Gmail",
    required: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN", "GMAIL_SENDER_EMAIL"], optional: [],
  },
  twilio: {
    id: "twilio", name: "Twilio Calls + SMS",
    required: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_SMS_FROM", "TWILIO_VOICE_FROM"],
    optional: ["TWILIO_MESSAGING_SERVICE_SID"],
  },
};

export function isProviderId(value: string): value is ProviderId {
  return value in providerDefinitions;
}
