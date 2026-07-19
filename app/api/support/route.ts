import { generateSupportReply } from "../../../lib/ai";

export async function POST(request: Request) {
  const body = await request.json() as { message?: string; context?: string; language?: string };
  if (!body.message?.trim()) return Response.json({ error: "message is required" }, { status: 400 });
  try {
    const reply = await generateSupportReply(body.message, body.context);
    return Response.json({ reply, assistant: "Clear Web AI", needsHuman: /human|team member|specialist/i.test(reply) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI provider unavailable";
    return Response.json({ error: message, setupRequired: message.includes("not configured") }, { status: message.includes("not configured") ? 503 : 502 });
  }
}
