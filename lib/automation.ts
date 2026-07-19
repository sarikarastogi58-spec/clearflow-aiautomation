export type LeadInput = {
  rating?: number | null;
  reviewCount?: number | null;
  websiteUrl?: string | null;
  websiteStatus?: "none" | "broken" | "weak" | "good";
  hasBooking?: boolean;
  hasWhatsApp?: boolean;
  hasHttps?: boolean;
  phone?: string;
  email?: string;
  consent?: boolean;
};

export function scoreLead(input: LeadInput) {
  const gaps: string[] = [];
  let websiteNeed = 0;
  if (!input.websiteUrl || input.websiteStatus === "none") {
    websiteNeed = 30;
    gaps.push("No business website linked");
  } else if (input.websiteStatus === "broken") {
    websiteNeed = 25;
    gaps.push("Website is unavailable or broken");
  } else if (input.websiteStatus === "weak") {
    websiteNeed = 18;
    gaps.push("Website needs a clearer conversion path");
  } else websiteNeed = 5;
  if (input.websiteUrl && input.hasHttps === false) { websiteNeed = Math.min(35, websiteNeed + 5); gaps.push("HTTPS is missing"); }

  let potential = 5;
  if ((input.reviewCount ?? 0) >= 100) potential += 10;
  else if ((input.reviewCount ?? 0) >= 40) potential += 6;
  if ((input.rating ?? 0) >= 4.3) potential += 6;
  else if ((input.rating ?? 0) >= 4) potential += 3;
  potential = Math.min(25, potential + 4);

  let contactability = input.phone ? 4 : 0;
  contactability += input.email ? 6 : 0;
  contactability += input.consent ? 5 : 0;

  let digitalGapScore = 0;
  if (!input.hasBooking) { digitalGapScore += 7; gaps.push("No online booking flow found"); }
  if (!input.hasWhatsApp) { digitalGapScore += 6; gaps.push("No WhatsApp enquiry CTA found"); }
  if (websiteNeed >= 18) digitalGapScore += 2;
  digitalGapScore = Math.min(15, digitalGapScore);

  const score = Math.min(100, websiteNeed + potential + contactability + digitalGapScore);
  const priority = score >= 75 ? "high" : score >= 50 ? "medium" : "low";
  const pitchAngle = gaps[0]
    ? `Help the business close more local enquiries by fixing: ${gaps[0].toLowerCase()}.`
    : "Improve the path from local discovery to enquiry and booking.";
  return { score, priority, websiteNeed, potential, gaps, pitchAngle };
}

const optOutPatterns = [
  /^stop$/i, /^unsubscribe$/i, /^cancel$/i, /^end$/i, /^quit$/i,
  /band\s*karo/i, /message\s*mat\s*karo/i, /dobara\s*(contact|message)\s*mat/i,
  /संदेश\s*मत\s*भेज/i, /बंद\s*करो/i,
];

export function isOptOut(text: string) {
  const value = text.trim();
  return optOutPatterns.some((pattern) => pattern.test(value));
}

export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  return digits ? `+${digits}` : "";
}

export function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function addDays(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(5, 30, 0, 0); // 11:00 IST
  return date.toISOString();
}
