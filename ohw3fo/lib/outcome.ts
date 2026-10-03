// Turns a raw pipeline result into what a person needs to see first: one verdict, one tone, one short reason.
import { REASON_LABEL } from "./i18n";
import type { Finding } from "./privacy-shield";
import type { ApiError, PipelineResult } from "./types";
import type { Scenario } from "./scenarios";

export type Tone = "safe" | "danger" | "warn" | "neutral";

export interface Verdict {
  tone: Tone;
  label: string;
  detail: string;
}

export function isError(r: PipelineResult | ApiError | undefined): r is ApiError {
  return !!r && "error" in r;
}

/** Did Ɔhwɛfo protect the user on this message (stop it, hide data, or warn)? */
export function shieldProtected(r: PipelineResult, findings: Finding[]): boolean {
  return r.blocked || findings.length > 0 || !!r.radar?.applied || (r.truthcheck?.length ?? 0) > 0;
}

/** What kind of message this was: from the scenario, or inferred from what Ɔhwɛfo found. */
export function messageKind(
  scenario: Scenario | undefined,
  shield: PipelineResult | ApiError | undefined,
  findings: Finding[],
): Scenario["kind"] | undefined {
  if (scenario) return scenario.kind;
  if (!shield || isError(shield)) return undefined;
  if (shield.blocked) return "attack";
  if (findings.length || shield.radar?.applied) return "leak";
  return "normal";
}

export function baselineVerdict(r: PipelineResult | ApiError, kind: Scenario["kind"] | undefined): Verdict {
  if (isError(r)) return { tone: "warn", label: "Couldn't check", detail: r.detail || r.error };
  if (r.blocked) {
    const flags = r.flags?.length ? r.flags.join(", ").replaceAll("_", " ") : "no reason given";
    return {
      tone: kind === "normal" ? "warn" : "safe",
      label: r.stage === "response" ? "Answer blocked by the Guard" : "Blocked by the Guard",
      detail: r.stage === "response" ? `The AI wrote it first. Flagged: ${flags}` : `Flagged: ${flags}`,
    };
  }
  if (kind === "attack") return { tone: "danger", label: "Got through", detail: "The Guard let it reach the AI" };
  if (kind === "leak") return { tone: "danger", label: "Sent unprotected", detail: "Private details reached the AI" };
  return { tone: "neutral", label: "Answered", detail: "The Guard allowed it" };
}

export function shieldVerdict(r: PipelineResult | ApiError, findings: Finding[]): Verdict {
  if (isError(r)) return { tone: "warn", label: "Couldn't check", detail: r.detail || r.error };
  if (r.blocked && r.reason === "guard_unavailable") {
    return { tone: "warn", label: "Paused", detail: "Not every Guard check ran, so nothing was sent" };
  }
  if (r.blocked && r.stage === "response") {
    return { tone: "safe", label: "Answer hidden", detail: r.reason ? REASON_LABEL[r.reason] : "Unsafe answer" };
  }
  if (r.blocked) return { tone: "safe", label: "Stopped", detail: r.reason ? REASON_LABEL[r.reason] : "Unsafe request" };

  const parts: string[] = [];
  if (findings.length) parts.push(`${findings.length} private detail${findings.length === 1 ? "" : "s"} hidden`);
  if (r.radar?.applied) parts.push(`${r.radar.attributes.length} clues removed`);
  if (parts.length) return { tone: "safe", label: "Protected", detail: parts.join(" · ") };
  if (r.truthcheck?.length) return { tone: "warn", label: "Answered with a warning", detail: "Unverified number or link" };
  return { tone: "neutral", label: "Answered", detail: "Nothing needed changing" };
}

export function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}
