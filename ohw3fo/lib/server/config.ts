// Server-only settings. Next.js loads them from ohw3fo/.env automatically.

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}. Copy .env.example to .env in the ohw3fo folder and fill it in.`);
  return v;
}

export const config = {
  get guardUrl() {
    return required("GUARD_URL").replace(/\/+$/, "");
  },
  get guardToken() {
    return required("GUARD_TOKEN");
  },
  get openaiKey() {
    return required("OPENAI_API_KEY");
  },
  // Fast, low-cost model for both the assistant and the analysis step.
  chatModel: process.env.CHAT_MODEL || "gpt-4.1-mini",
  analysisModel: process.env.ANALYSIS_MODEL || "gpt-4.1-mini",
  // "closed": if a Guard check could not fully run, stop the message (safe default).
  failMode: (process.env.FAIL_MODE || "closed").toLowerCase() as "closed" | "open",
  // Stay just under the Guard's 30 requests/minute team limit.
  guardPerMinute: Number(process.env.GUARD_PER_MINUTE || 28),
};
