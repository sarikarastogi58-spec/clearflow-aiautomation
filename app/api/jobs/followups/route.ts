import { and, eq, lte, or } from "drizzle-orm";
import { getDb } from "../../../../db";
import { followupJobs, messages, suppressions } from "../../../../db/schema";
import { secret } from "../../../../lib/secrets";

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!secret("CRON_SECRET") || authorization !== `Bearer ${secret("CRON_SECRET")}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const due = await db.select().from(followupJobs).where(and(or(eq(followupJobs.status, "scheduled"), eq(followupJobs.status, "retry")), lte(followupJobs.runAt, new Date().toISOString()))).limit(50);
  let eligible = 0;
  for (const job of due) {
    const [reply, suppressed] = await Promise.all([
      db.select().from(messages).where(and(eq(messages.leadId, job.leadId), eq(messages.direction, "inbound"))).limit(1),
      db.select().from(suppressions).where(and(eq(suppressions.leadId, job.leadId), eq(suppressions.channel, job.channel))).limit(1),
    ]);
    if (reply.length || suppressed.length) await db.update(followupJobs).set({ status: "cancelled", lastError: reply.length ? "reply_received" : "suppressed" }).where(eq(followupJobs.id, job.id));
    else { eligible += 1; await db.update(followupJobs).set({ status: "ready" }).where(eq(followupJobs.id, job.id)); }
  }
  return Response.json({ scanned: due.length, ready: eligible, note: "Ready jobs require an approved follow-up template and are sent by the campaign dispatcher." });
}
