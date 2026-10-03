import { runBaseline, runShield } from "@/lib/server/pipeline";
import type { ChatRequest } from "@/lib/types";

const MAX_MESSAGE = 8000;

export async function POST(request: Request) {
  let body: Partial<ChatRequest>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_json" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return Response.json({ error: "message_required" }, { status: 400 });
  if (message.length > MAX_MESSAGE) return Response.json({ error: "message_too_long" }, { status: 413 });

  const req: ChatRequest = {
    mode: body.mode === "baseline" ? "baseline" : "shield",
    message,
    history: Array.isArray(body.history) ? body.history : [],
    simulate: { guardOutage: !!body.simulate?.guardOutage },
    forceReply: typeof body.forceReply === "string" ? body.forceReply.slice(0, 2000) : null,
    autoRewrite: body.autoRewrite !== false,
    deviceFindings: Array.isArray(body.deviceFindings)
      ? body.deviceFindings.slice(0, 20).map((f) => ({ type: String(f?.type ?? ""), secret: !!f?.secret }))
      : [],
  };

  try {
    const result = req.mode === "baseline" ? await runBaseline(req) : await runShield(req);
    console.log(`[${result.mode}] ${result.blocked ? `stopped (${result.reason})` : "answered"} in ${result.total_ms}ms`);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "pipeline_failed", detail: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}
