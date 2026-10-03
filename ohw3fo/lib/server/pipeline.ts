// The two pipelines compared side by side.
//
//  baseline: user -> Guard(prompt) -> LLM -> Guard(response) -> user        (what the organisers gave us)
//  shield:   user -> PrivacyShield (on device) -> Guard ×4 views + Ɔhwɛfo analysis -> LLM -> Guard + TruthCheck -> user
import { checkWithGuard, type GuardResult } from "./guard";
import { chat } from "./llm";
import { config } from "./config";
import { analyze, type Analysis } from "./analyze";
import { contacts, scanAnswer } from "./truthcheck";
import { mask } from "../privacy-shield";
import type { ChatMessage, ChatRequest, Phase, PipelineResult, Reason, RiskCategory, Step } from "../types";

const BASELINE_SYSTEM = "You are a helpful assistant inside a mobile money (MoMo) app in Ghana. Answer the user's questions.";

const SHIELD_SYSTEM = `You are Ɔhwɛfo, a patient, friendly assistant for people in Ghana, including elderly users, inside a
mobile money (MoMo) app. Use short sentences and simple words. Keep answers under 120 words.
- Reply in the same language the user wrote in (English, Twi, or Pidgin).
- The user's private details were replaced with placeholders like [PHONE_1], [NAME_1], [PIN_1] before reaching you.
  Use the placeholders exactly as written when you need to refer to them. Never guess the real values.
- Never ask anyone for a PIN, OTP, password or secret code. Remind users that MoMo staff never ask for a PIN.
- Never invent phone numbers, websites or links. Only use these official contacts when relevant: ${contacts.phones
  .map((p) => `${p.number} (${p.name})`)
  .join(", ")}; websites: ${contacts.domains.slice(0, 4).join(", ")}.
  If you do not know an official contact, tell the user to visit an official MoMo agent or office.`;

const since = (t0: number) => Date.now() - t0;

function guardStep(id: string, phase: Phase, title: string, g: GuardResult): Step {
  let verdict: Step["verdict"];
  let detail: string;
  if (!g.ok) {
    verdict = "error";
    detail = `The Guard returned an error (${g.error}).`;
  } else if (!g.trustworthy) {
    verdict = "warn";
    detail = `Status "${g.status}". Checks that did not run: ${g.checks_not_run.join(", ") || "unknown"}.`;
  } else if (g.allowed) {
    verdict = "pass";
    detail = "Allowed.";
  } else {
    verdict = "block";
    detail = `Flagged: ${g.flags.join(", ")}.`;
  }
  return { id, phase, layer: "guard", title, verdict, detail, ms: g.rtt_ms, request_id: g.request_id, cached: g.cached, simulated: !!g.simulated };
}

function cleanHistory(history: unknown): ChatMessage[] {
  return (Array.isArray(history) ? history : [])
    .filter((m): m is ChatMessage => !!m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
}

async function answer(system: string, history: ChatMessage[], text: string, forceReply?: string | null) {
  if (forceReply) return { content: forceReply, ms: 0, simulated: true };
  const r = await chat({
    model: config.chatModel,
    temperature: 0.4,
    maxTokens: 400,
    messages: [{ role: "system", content: system }, ...history, { role: "user", content: text }],
  });
  return { content: r.content || r.refusal || "", ms: r.ms, simulated: false };
}

function llmStep(llm: { ms: number; simulated: boolean }): Step {
  return {
    id: "llm", phase: "ai", layer: "llm",
    title: llm.simulated ? "Simulated answer from a compromised AI" : "The AI wrote an answer",
    verdict: "info",
    detail: llm.simulated ? "This answer was injected by the demo to test the answer checks." : `Model: ${config.chatModel}.`,
    ms: llm.ms, simulated: llm.simulated,
  };
}

// ---------------------------------------------------------------- baseline: the Guard on its own

export async function runBaseline(req: ChatRequest): Promise<PipelineResult> {
  const t0 = Date.now();
  const steps: Step[] = [];
  const history = cleanHistory(req.history);
  const simulateOutage = !!req.simulate?.guardOutage;

  const gIn = await checkWithGuard("prompt", req.message, { simulateOutage });
  steps.push(guardStep("guard_prompt", "input", "Guard checked the message", gIn));
  // A typical integration only reads `allowed`, so a "partial" result slips through.
  if (gIn.allowed === false || !gIn.ok) {
    return { mode: "baseline", blocked: true, stage: "input", reason: gIn.ok ? "guard_flag" : "guard_error", flags: gIn.flags, steps, total_ms: since(t0), sent_to_cloud: req.message };
  }

  const llm = await answer(BASELINE_SYSTEM, history, req.message, req.forceReply);
  steps.push(llmStep(llm));

  const gOut = await checkWithGuard("response", llm.content);
  steps.push(guardStep("guard_response", "output", "Guard checked the answer", gOut));
  if (gOut.allowed === false) {
    return { mode: "baseline", blocked: true, stage: "response", reason: "guard_flag_response", flags: gOut.flags, steps, total_ms: since(t0), sent_to_cloud: req.message };
  }
  return { mode: "baseline", blocked: false, reply: llm.content, steps, total_ms: since(t0), sent_to_cloud: req.message };
}

// ---------------------------------------------------------------- shield: Guard + Ɔhwɛfo

function findBase64(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/[A-Za-z0-9+/]{16,}={0,2}/g)) {
    const decoded = Buffer.from(m[0], "base64").toString("utf8");
    if (/^[\x20-\x7E\s]{8,}$/.test(decoded)) out.push(decoded);
  }
  return out;
}

const RISK_REASON: Record<Exclude<RiskCategory, "none">, Reason> = {
  prompt_injection: "injection",
  jailbreak_roleplay: "jailbreak",
  scam_or_phishing: "scam",
  credential_solicitation: "credential",
  harmful_violence: "harm",
  other_harmful: "harm",
};

const LANGUAGE_NAME: Record<string, string> = { tw: "Twi", pcm: "Pidgin", ga: "Ga", ee: "Ewe", mixed: "mixed languages", other: "another language" };

export async function runShield(req: ChatRequest): Promise<PipelineResult> {
  const t0 = Date.now();
  const steps: Step[] = [];
  const history = cleanHistory(req.history);
  const simulateOutage = !!req.simulate?.guardOutage;
  const deviceFindings = req.deviceFindings ?? [];

  // 0. The device should already have masked personal data. The server runs the same masking as a backstop.
  const backstop = mask(req.message);
  const text = backstop.masked;
  steps.push({
    id: "privacy", phase: "device", layer: "shield", title: "PrivacyShield checked the message on the phone",
    verdict: deviceFindings.length ? "warn" : "pass",
    detail: deviceFindings.length
      ? `Hid ${deviceFindings.length} private detail${deviceFindings.length === 1 ? "" : "s"} before sending: ${[...new Set(deviceFindings.map((f) => f.type))].join(", ")}.`
      : "No private details found.",
    ms: 0,
  });
  if (backstop.findings.length) {
    steps.push({
      id: "privacy_backstop", phase: "input", layer: "shield", title: "Server backstop hid details the phone missed",
      verdict: "warn", detail: `Hid ${backstop.findings.length} more item(s).`, ms: 0,
    });
  }

  // 1. In parallel: Guard on the message, on the whole conversation, on decoded payloads; and the analysis.
  const priorUserTurns = history.filter((m) => m.role === "user").map((m) => m.content);
  const windowText = priorUserTurns.length ? [...priorUserTurns.slice(-5), text].join("\n") : null;
  const decoded = findBase64(text);
  const tA = Date.now();

  const [gIn, gWindow, gDecoded, analysis] = await Promise.all([
    checkWithGuard("prompt", text, { simulateOutage }),
    windowText ? checkWithGuard("prompt", windowText, { simulateOutage }) : Promise.resolve(null),
    Promise.all(decoded.map((d) => checkWithGuard("prompt", d, { simulateOutage }))),
    analyze(text, history).catch((err: Error) => ({ error: err.message })),
  ]);

  steps.push(guardStep("guard_prompt", "input", "Guard checked the message", gIn));
  if (gWindow) steps.push(guardStep("guard_window", "input", `Guard checked the whole conversation (${priorUserTurns.length + 1} messages)`, gWindow));
  decoded.forEach((d, i) => steps.push({ ...guardStep(`guard_b64_${i}`, "input", "Guard checked the hidden text, decoded", gDecoded[i]), decoded: d }));

  // 2. If the message is not English, show the Guard the English translation.
  let gTranslated: GuardResult | null = null;
  const a = "error" in analysis ? null : (analysis as Analysis);
  if (a) {
    const flagged = a.risk.severity === "medium" || a.risk.severity === "high";
    steps.push({
      id: "analysis", phase: "input", layer: "shield", title: "Ɔhwɛfo read the message (language, intent, clues)",
      verdict: flagged ? "block" : "pass",
      detail:
        `Language: ${LANGUAGE_NAME[a.language] ?? "English"}. Intent: ${a.risk.category.replaceAll("_", " ")} (${a.risk.severity}).` +
        `${a.risk.multi_turn_escalation ? " The earlier messages set this up as part of an attack." : ""} ${a.risk.reason}`,
      ms: a.ms,
    });
    if (a.language !== "en" && a.english_translation.trim() && a.english_translation.trim() !== text.trim()) {
      gTranslated = await checkWithGuard("prompt", a.english_translation, { simulateOutage });
      steps.push({ ...guardStep("guard_translated", "input", "Guard checked the English translation", gTranslated), translation: a.english_translation });
    }
  } else {
    steps.push({
      id: "analysis", phase: "input", layer: "shield", title: "Ɔhwɛfo analysis unavailable",
      verdict: "error", detail: `${(analysis as { error: string }).error}. Relying on the Guard alone for this message.`, ms: since(tA),
    });
  }

  // 3. Decide. Fail closed: a Guard result we cannot trust is never treated as safe.
  const guardViews = [gIn, gWindow, ...gDecoded, gTranslated].filter((g): g is GuardResult => !!g);
  const guardFlags = [...new Set(guardViews.flatMap((g) => (g.allowed === false ? g.flags : [])))];
  const untrusted = guardViews.some((g) => !g.trustworthy);
  const risky = !!a && a.risk.category !== "none" && (a.risk.severity === "medium" || a.risk.severity === "high" || a.risk.multi_turn_escalation);

  const meta = {
    language: a?.language ?? "en",
    translation: a && a.language !== "en" ? a.english_translation : null,
    risk: a?.risk ?? null,
    decoded,
  };

  let reason: Reason | undefined;
  if (untrusted && config.failMode === "closed") reason = "guard_unavailable";
  else if (risky && a) reason = RISK_REASON[a.risk.category as Exclude<RiskCategory, "none">] ?? "harm";
  else if (guardFlags.length) reason = guardFlags.includes("injection") ? "injection" : guardFlags.includes("sensitive_data") ? "credential" : "harm";

  if (reason) {
    return { mode: "shield", blocked: true, stage: "input", reason, flags: guardFlags, steps, ...meta, sent_to_cloud: text, total_ms: since(t0) };
  }

  // 4. Inference Radar: remove details that reveal who the person is.
  let radar: PipelineResult["radar"] = null;
  let toSend = text;
  // Drop "clues" that are only placeholders (already hidden) or that every user of the app shares.
  const attrs = (a?.inference.attributes ?? []).filter(
    (x) => !/\[[A-Z_]+_\d+\]/.test(x.guess) && !/mobile money|momo|this app/i.test(x.guess),
  );
  if (a && attrs.length) {
    const shouldRewrite = attrs.length >= 2 || attrs.some((x) => x.sensitivity === "high");
    const rewrite = a.inference.safer_rewrite.trim();
    radar = { attributes: attrs, safer_rewrite: rewrite, applied: false };
    if (shouldRewrite && req.autoRewrite !== false && rewrite && rewrite !== text) {
      toSend = rewrite;
      radar.applied = true;
    }
    steps.push({
      id: "radar", phase: "input", layer: "shield", title: "Inference Radar looked for clues about the writer",
      verdict: radar.applied ? "warn" : "info",
      detail: `${attrs.length} clue${attrs.length === 1 ? "" : "s"} found: ${attrs.map((x) => x.attribute.toLowerCase()).join(", ")}.` +
        (radar.applied ? " Sent a shorter version instead." : ""),
      ms: 0,
    });
  }

  // 5. The AI answers.
  const llm = await answer(SHIELD_SYSTEM, history, toSend, req.forceReply);
  steps.push(llmStep(llm));

  // 6. Answer checks in parallel: Guard + TruthCheck.
  const [gOut, tc] = await Promise.all([checkWithGuard("response", llm.content), Promise.resolve(scanAnswer(llm.content))]);
  steps.push(guardStep("guard_response", "output", "Guard checked the answer", gOut));
  steps.push({
    id: "truthcheck", phase: "output", layer: "shield", title: "TruthCheck checked the answer for PIN requests, numbers and links",
    verdict: tc.blocked ? "block" : tc.findings.length ? "warn" : "pass",
    detail: tc.findings.length
      ? tc.findings.map((f) => `${f.kind.replaceAll("_", " ")}: ${f.text}`).join("; ") + "."
      : "No PIN requests, unverified contacts or bad links.",
    ms: 0,
  });

  if (gOut.allowed === false || tc.blocked || (!gOut.trustworthy && config.failMode === "closed")) {
    const r: Reason = tc.findings.some((f) => f.kind === "credential_request")
      ? "response_credential"
      : tc.blocked
        ? "response_link"
        : gOut.allowed === false
          ? "response_unsafe"
          : "guard_unavailable";
    return { mode: "shield", blocked: true, reason: r, stage: "response", flags: gOut.flags, steps, ...meta, radar, truthcheck: tc.findings, sent_to_cloud: toSend, total_ms: since(t0) };
  }

  return { mode: "shield", blocked: false, reply: llm.content, truthcheck: tc.findings, steps, ...meta, radar, sent_to_cloud: toSend, total_ms: since(t0) };
}
