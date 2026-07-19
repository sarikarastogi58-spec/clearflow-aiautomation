import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { businesses, events, leads } from "../../../db/schema";
import { id, normalizePhone, scoreLead } from "../../../lib/automation";

export async function GET() {
  try {
    const db = getDb();
    const rows = await db.select({
      id: leads.id, businessId: businesses.id, name: businesses.name,
      category: businesses.category, city: businesses.city, rating: businesses.rating,
      reviewCount: businesses.reviewCount, websiteUrl: businesses.websiteUrl,
      phone: leads.phone, email: leads.email, stage: leads.stage, score: leads.score,
      priority: leads.priority, pitchAngle: leads.pitchAngle, gaps: leads.digitalGaps,
      lastContactAt: leads.lastContactAt, createdAt: leads.createdAt,
    }).from(leads).innerJoin(businesses, eq(leads.businessId, businesses.id)).orderBy(desc(leads.createdAt)).limit(200);
    return Response.json({ leads: rows.map((row) => ({ ...row, gaps: JSON.parse(row.gaps) })) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Database unavailable" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const input = await request.json() as Record<string, unknown>;
    const name = String(input.name ?? "").trim();
    const city = String(input.city ?? "").trim();
    if (!name || !city) return Response.json({ error: "Business name and city are required" }, { status: 400 });
    const businessId = id("biz");
    const leadId = id("lead");
    const result = scoreLead({
      rating: Number(input.rating) || null, reviewCount: Number(input.reviewCount) || null,
      websiteUrl: input.websiteUrl ? String(input.websiteUrl) : null,
      websiteStatus: (input.websiteStatus as "none" | "broken" | "weak" | "good") ?? (input.websiteUrl ? "weak" : "none"),
      phone: String(input.phone ?? ""), email: String(input.email ?? ""),
      hasBooking: Boolean(input.hasBooking), hasEnquiryCta: Boolean(input.hasEnquiryCta), hasHttps: Boolean(input.hasHttps),
    });
    const db = getDb();
    await db.batch([
      db.insert(businesses).values({ id: businessId, name, category: String(input.category ?? "Local Business"), city,
        address: String(input.address ?? ""), phone: normalizePhone(String(input.phone ?? "")), email: String(input.email ?? "").toLowerCase(),
        websiteUrl: input.websiteUrl ? String(input.websiteUrl) : null, placeId: input.placeId ? String(input.placeId) : null,
        mapsUrl: input.mapsUrl ? String(input.mapsUrl) : null, rating: Number(input.rating) || null,
        reviewCount: Number(input.reviewCount) || null, source: String(input.source ?? "manual"), sourceRefreshedAt: new Date().toISOString() }),
      db.insert(leads).values({ id: leadId, businessId, contactName: String(input.contactName ?? ""), phone: normalizePhone(String(input.phone ?? "")),
        email: String(input.email ?? "").toLowerCase(), score: result.score, priority: result.priority,
        websiteNeedScore: result.websiteNeed, businessPotentialScore: result.potential, digitalGaps: JSON.stringify(result.gaps), pitchAngle: result.pitchAngle }),
      db.insert(events).values({ id: id("evt"), eventType: "lead_discovered", entityType: "lead", entityId: leadId, payload: JSON.stringify({ source: input.source ?? "manual" }) }),
    ]);
    return Response.json({ lead: { id: leadId, name, city, ...result } }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create lead" }, { status: 500 });
  }
}
