import { getDb } from "../../../db";
import { consents, events } from "../../../db/schema";
import { id } from "../../../lib/automation";

export async function POST(request: Request) {
  const body = await request.json() as { leadId?: string; channel?: string; source?: string; proof?: string };
  if (!body.leadId || !body.channel || !body.source || !body.proof) {
    return Response.json({ error: "leadId, channel, source, and verifiable proof are required" }, { status: 400 });
  }
  const db = getDb();
  const consentId = id("con");
  await db.batch([
    db.insert(consents).values({ id: consentId, leadId: body.leadId, channel: body.channel, status: "granted", source: body.source, proof: body.proof }),
    db.insert(events).values({ id: id("evt"), eventType: "consent_granted", entityType: "lead", entityId: body.leadId, payload: JSON.stringify({ channel: body.channel, source: body.source }) }),
  ]);
  return Response.json({ consentId, status: "granted" }, { status: 201 });
}
