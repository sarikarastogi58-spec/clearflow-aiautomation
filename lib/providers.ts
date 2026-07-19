export type ProviderId = "openai" | "apify" | "msg91" | "resend" | "twilio";

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
  msg91: {
    id: "msg91", name: "MSG91 SMS",
    required: ["MSG91_AUTH_KEY", "MSG91_TEMPLATE_ID"], optional: ["MSG91_MESSAGE_VARIABLE", "MSG91_WEBHOOK_TOKEN"],
  },
  resend: {
    id: "resend", name: "Resend Email",
    required: ["RESEND_API_KEY", "EMAIL_FROM"], optional: ["EMAIL_WEBHOOK_SECRET"],
  },
  twilio: {
    id: "twilio", name: "Twilio Voice",
    required: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"], optional: ["TWILIO_VOICE_FROM"],
  },
};

export function isProviderId(value: string): value is ProviderId {
  return value in providerDefinitions;
}
