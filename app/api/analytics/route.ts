import { env } from "cloudflare:workers";

export async function GET() {
  try {
    const db = env.DB;
    const query = async (sql: string) => Number((await db.prepare(sql).first<Record<string, number>>())?.value ?? 0);
    const [total, high, sent, replies, interested, won] = await Promise.all([
      query("SELECT COUNT(*) AS value FROM leads"), query("SELECT COUNT(*) AS value FROM leads WHERE score >= 75"),
      query("SELECT COUNT(*) AS value FROM messages WHERE direction = 'outbound' AND status IN ('sent','delivered')"),
      query("SELECT COUNT(*) AS value FROM messages WHERE direction = 'inbound'"),
      query("SELECT COUNT(*) AS value FROM leads WHERE stage IN ('warm','booked','won')"), query("SELECT COUNT(*) AS value FROM leads WHERE stage = 'won'"),
    ]);
    return Response.json({ total, high, sent, replies, interested, won, conversionRate: sent ? Math.round((won / sent) * 1000) / 10 : 0 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Analytics unavailable" }, { status: 500 });
  }
}
