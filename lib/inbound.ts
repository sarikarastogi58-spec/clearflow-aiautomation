import { and, eq, or } from "drizzle-orm";
import { getDb } from "../db";
import { events, followupJobs, leads, messages, suppressions } from "../db/schema";
import { id, isOptOut, normalizePhone } from "./automation";

export async function recordInbound(channel: string, from: string, body: string, providerMessageId: string) {
  const db = getDb();
  const phone = channel === "email" ? "" : normalizePhone(from);
  const matched = await db.select().from(leads).where(channel === "email" ? eq(leads.email, from.toLowerCase()) : eq(leads.phone, phone)).limit(1);
  const lead = matched[0];
  if (!lead) return { received: true, unmatched: true };
  const existing = providerMessageId ? await db.select().from(messages).where(eq(messages.providerMessageId, providerMessageId)).limit(1) : [];
  if (existing.length) return { received: true, duplicate: true };
  const optedOut = isOptOut(body);
  await db.batch([
    db.insert(messages).values({ id: id("msg"), leadId: lead.id, direction: "inbound", channel, body, providerMessageId: providerMessageId || null, status: "delivered", deliveredAt: new Date().toISOString() }),
    db.update(leads).set({ stage: optedOut ? "not_interested" : "warm", lastContactAt: new Date().toISOString(), nextActionAt: null, updatedAt: new Date().toISOString() }).where(eq(leads.id, lead.id)),
    db.update(followupJobs).set({ status: "cancelled", lastError: optedOut ? "opt_out" : "reply_received" }).where(and(eq(followupJobs.leadId, lead.id), or(eq(followupJobs.status, "scheduled"), eq(followupJobs.status, "retry")))),
    db.insert(events).values({ id: id("evt"), eventType: optedOut ? "contact_opted_out" : "reply_received", entityType: "lead", entityId: lead.id, payload: JSON.stringify({ channel }) }),
  ]);
  if (optedOut) await db.insert(suppressions).values({ id: id("sup"), leadId: lead.id, channel, reason: "recipient_opt_out" }).onConflictDoNothing();
  return { received: true, leadId: lead.id, optedOut };
}
