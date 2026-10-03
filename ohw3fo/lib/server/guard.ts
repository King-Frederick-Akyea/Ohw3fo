// Client for the SecureAI Guard API, with what a production app needs around it:
// caching, a local rate limiter, retries on temporary errors, chunking for long text,
// and an explicit "did every check really run?" verdict.
import { createHash } from "node:crypto";
import { config } from "./config";

const MAX_CHARS = 3900; // the Guard rejects text of 4,000+ characters
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // same text -> same verdict; saves quota during rehearsals

export interface GuardResult {
  ok: boolean;
  /** false when the status was not "complete" or any check did not run */
  trustworthy: boolean;
  allowed: boolean | null;
  flags: string[];
  status: string;
  checks_not_run: string[];
  request_id: string | null;
  rtt_ms: number;
  cached: boolean;
  simulated?: boolean;
  error?: string;
}

// Module state survives hot reloads in development.
interface GuardState {
  cache: Map<string, { at: number; value: GuardResult }>;
  sentAt: number[];
}
const holder = globalThis as unknown as { __guardState?: GuardState };
const state: GuardState = (holder.__guardState ??= { cache: new Map(), sentAt: [] });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Sliding-window limiter so we never trip the Guard's per-minute limit.
async function waitForSlot() {
  for (;;) {
    const now = Date.now();
    while (state.sentAt.length && now - state.sentAt[0] > 60_000) state.sentAt.shift();
    if (state.sentAt.length < config.guardPerMinute) {
      state.sentAt.push(now);
      return;
    }
    await sleep(60_000 - (now - state.sentAt[0]) + 50);
  }
}

interface RawResponse {
  http: number;
  body: Record<string, unknown> | null;
  rtt: number;
  retryAfter: number;
}

async function callOnce(endpoint: "prompt" | "response", text: string): Promise<RawResponse> {
  await waitForSlot();
  const t0 = Date.now();
  const res = await fetch(`${config.guardUrl}/v1/check/${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.guardToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const rtt = Date.now() - t0;
  let body: Record<string, unknown> | null = null;
  try {
    body = await res.json();
  } catch {
    // non-JSON error page
  }
  return { http: res.status, body, rtt, retryAfter: Number(res.headers.get("retry-after")) || 0 };
}

async function callWithRetry(endpoint: "prompt" | "response", text: string): Promise<RawResponse> {
  let r: RawResponse = { http: 0, body: null, rtt: 0, retryAfter: 0 };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      r = await callOnce(endpoint, text);
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      r = { http: 0, body: { error: name === "TimeoutError" ? "timeout" : "network_error" }, rtt: 0, retryAfter: 0 };
    }
    if (r.http === 200) return r;
    const code = r.body?.error;
    const retryable = [0, 502, 503].includes(r.http) || (r.http === 429 && code !== "daily_quota_exceeded");
    if (!retryable || attempt === 2) return r;
    await sleep(r.http === 429 ? Math.min((r.retryAfter || 2) * 1000, 6000) : 600 * (attempt + 1));
  }
  return r;
}

function normalise(r: RawResponse): GuardResult {
  const b = r.body as {
    allowed?: boolean; flags?: string[]; status?: string; request_id?: string;
    checks?: Record<string, { ran?: boolean }>; error?: string;
  } | null;
  if (r.http !== 200 || !b) {
    return {
      ok: false, trustworthy: false, allowed: null, flags: [], status: "error", checks_not_run: [],
      error: b?.error || `http_${r.http}`, request_id: null, rtt_ms: r.rtt, cached: false,
    };
  }
  const notRun = Object.entries(b.checks || {}).filter(([, c]) => c && c.ran === false).map(([k]) => k);
  return {
    ok: true,
    trustworthy: b.status === "complete" && notRun.length === 0,
    allowed: b.allowed ?? null,
    flags: b.flags || [],
    status: b.status || "unknown",
    checks_not_run: notRun,
    request_id: b.request_id || null,
    rtt_ms: r.rtt,
    cached: false,
  };
}

// Used only when the demo's "Simulate a Guard outage" setting is on.
function simulatedPartial(): GuardResult {
  return {
    ok: true, trustworthy: false, allowed: true, flags: [], status: "partial",
    checks_not_run: ["injection", "harmful_content"], request_id: "simulated", rtt_ms: 0, cached: false, simulated: true,
  };
}

/** Check text with the Guard. Long text is split; the result is blocked if any chunk is. */
export async function checkWithGuard(
  endpoint: "prompt" | "response",
  text: string,
  opts: { simulateOutage?: boolean } = {},
): Promise<GuardResult> {
  if (opts.simulateOutage) return simulatedPartial();
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += MAX_CHARS) chunks.push(text.slice(i, i + MAX_CHARS));

  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const key = createHash("sha256").update(endpoint + "\n" + chunk).digest("hex");
      const hit = state.cache.get(key);
      if (hit && Date.now() - hit.at < CACHE_TTL_MS) return { ...hit.value, cached: true, rtt_ms: 0 };
      const value = normalise(await callWithRetry(endpoint, chunk));
      if (value.ok && value.trustworthy) state.cache.set(key, { at: Date.now(), value });
      return value;
    }),
  );
  if (results.length === 1) return results[0];
  return {
    ok: results.every((r) => r.ok),
    trustworthy: results.every((r) => r.trustworthy),
    allowed: results.every((r) => r.allowed === true),
    flags: [...new Set(results.flatMap((r) => r.flags))],
    status: results.every((r) => r.status === "complete") ? "complete" : "partial",
    checks_not_run: [...new Set(results.flatMap((r) => r.checks_not_run))],
    request_id: results.map((r) => r.request_id).join(","),
    rtt_ms: Math.max(...results.map((r) => r.rtt_ms)),
    cached: results.every((r) => r.cached),
  };
}

export async function guardUsage(): Promise<{ used_today: number; daily_limit: number; per_minute_limit: number; team: string }> {
  const res = await fetch(`${config.guardUrl}/v1/usage`, {
    headers: { Authorization: `Bearer ${config.guardToken}` },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`usage http ${res.status}`);
  return res.json();
}
