export type ProviderId = "openai" | "google" | "whatsapp" | "twilio" | "resend";

export type ProviderDefinition = {
  id: ProviderId;
  name: string;
  required: string[];
  optional: string[];
};

export const providerDefinitions: Record<ProviderId, ProviderDefinition> = {
  openai: { id: "openai", name: "OpenAI", required: ["OPENAI_API_KEY"], optional: ["OPENAI_MODEL"] },
  google: { id: "google", name: "Google Places", required: ["GOOGLE_PLACES_API_KEY"], optional: [] },
  whatsapp: {
    id: "whatsapp", name: "WhatsApp Business",
    required: ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"],
    optional: ["WHATSAPP_VERIFY_TOKEN", "WHATSAPP_APP_SECRET"],
  },
  twilio: {
    id: "twilio", name: "Twilio SMS + Voice",
    required: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_SMS_FROM"], optional: [],
  },
  resend: {
    id: "resend", name: "Resend Email",
    required: ["RESEND_API_KEY", "EMAIL_FROM"], optional: ["EMAIL_WEBHOOK_SECRET"],
  },
};

export function isProviderId(value: string): value is ProviderId {
  return value in providerDefinitions;
}
