import { listRecentGmailReplies } from "../../../../lib/gmail";
import { recordInbound } from "../../../../lib/inbound";
import { resolveSecret } from "../../../../lib/secrets";

export async function POST(request: Request) {
  const cronSecret = await resolveSecret("CRON_SECRET");
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const replies = await listRecentGmailReplies();
  let matched = 0; let unmatched = 0;
  for (const reply of replies) {
    const result = await recordInbound("email", reply.from, reply.subject, reply.id);
    if (result.unmatched) unmatched += 1; else if (!result.duplicate) matched += 1;
  }
  return Response.json({ scanned: replies.length, matched, unmatched });
}
