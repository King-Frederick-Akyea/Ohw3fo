import { guardUsage } from "@/lib/server/guard";

export async function GET() {
  try {
    return Response.json(await guardUsage(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "usage_unavailable" }, { status: 502 });
  }
}
