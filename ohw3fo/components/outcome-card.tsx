"use client";

import { useEffect, useState } from "react";
import { Binary, ChevronRight, Languages, Lock, MessagesSquare, PhoneOff, ScanSearch } from "lucide-react";
import { unmask, type Finding, type Vault } from "@/lib/privacy-shield";
import { baselineVerdict, isError, seconds, shieldVerdict, type Verdict } from "@/lib/outcome";
import { explain, type Lang } from "@/lib/i18n";
import type { PipelineResult } from "@/lib/types";
import type { Scenario } from "@/lib/scenarios";
import { Highlighted, PausedIcon, TokenText, TONE } from "./ui";
import type { Result, Turn } from "./use-demo";

interface Props {
  side: "baseline" | "shield";
  turn: Turn;
  kind: Scenario["kind"] | undefined;
  lang: "auto" | Lang;
  vault: Vault;
  onInspect: () => void;
}

const SIDE_LABEL = { baseline: "Guard alone", shield: "With Ɔhwɛfo" };

export function OutcomeCard({ side, turn, kind, lang, vault, onInspect }: Props) {
  const result = turn[side];
  const isShield = side === "shield";

  return (
    <article
      className={`flex min-w-0 flex-col overflow-hidden rounded-xl border bg-surface shadow-card ${
        isShield ? "border-forest/40" : "border-line"
      }`}
      aria-label={SIDE_LABEL[side]}
      aria-busy={!result}
    >
      <div className="flex items-center justify-between px-4 pb-1 pt-3">
        <span className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${isShield ? "text-forest" : "text-ink-faint"}`}>
          {SIDE_LABEL[side]}
        </span>
        {result && !isError(result) && <span className="tabular text-xs text-ink-faint">{seconds(result.total_ms)}</span>}
      </div>

      {!result ? (
        <Loading startedAt={turn.startedAt} />
      ) : (
        <div className="rise flex flex-1 flex-col">
          <VerdictBanner
            verdict={isShield ? shieldVerdict(result, turn.findings) : baselineVerdict(result, kind)}
            paused={isShield && !isError(result) && result.reason === "guard_unavailable"}
          />
          {isShield && !isError(result) && <Insights result={result} turn={turn} lang={pickLang(lang, result)} />}
          <Body side={side} result={result} lang={isError(result) ? "en" : pickLang(lang, result)} vault={vault} />
          {!isError(result) && (
            <div className="mt-auto border-t border-line px-2 py-1.5">
              <button
                type="button"
                onClick={onInspect}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[13px] font-medium text-ink-soft hover:bg-sunken hover:text-ink"
              >
                See every check
                <span className="tabular text-ink-faint">({result.steps.length})</span>
                <ChevronRight className="size-3.5" aria-hidden />
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function pickLang(lang: "auto" | Lang, r: PipelineResult): Lang {
  if (lang !== "auto") return lang;
  return r.language === "tw" ? "tw" : "en";
}

function Loading({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(startedAt);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="space-y-3 px-4 pb-4 pt-2" role="status">
      <div className="flex items-center gap-2 text-sm text-ink-soft">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-forest opacity-60 motion-reduce:animate-none" />
          <span className="relative inline-flex size-2 rounded-full bg-forest" />
        </span>
        Checking… <span className="tabular text-ink-faint">{seconds(Math.max(0, now - startedAt))}</span>
      </div>
      <div className="skeleton h-12 rounded-lg" />
      <div className="skeleton h-3 w-4/5 rounded" />
      <div className="skeleton h-3 w-3/5 rounded" />
    </div>
  );
}

function VerdictBanner({ verdict, paused }: { verdict: Verdict; paused: boolean }) {
  const tone = TONE[verdict.tone];
  const Icon = tone.icon;
  return (
    <div className={`mx-3 mt-1 flex items-start gap-2.5 rounded-lg px-3 py-2.5 ${tone.soft}`}>
      {paused ? <PausedIcon className={`mt-0.5 size-5 shrink-0 ${tone.text}`} /> : <Icon className={`mt-0.5 size-5 shrink-0 ${tone.text}`} aria-hidden />}
      <div className="min-w-0">
        <p className={`text-[16px] font-semibold leading-snug ${tone.text}`}>{verdict.label}</p>
        <p className="text-[13px] leading-snug text-ink-soft">{verdict.detail}</p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ what Ɔhwɛfo did, shown inline

function Insight({ icon: Icon, title, children }: { icon: typeof Lock; title: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[28px_1fr] gap-2.5 px-4 py-2.5">
      <span className="inline-flex size-7 items-center justify-center rounded-md bg-sunken text-ink-soft" aria-hidden>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 text-sm">
        <p className="font-semibold leading-7">{title}</p>
        <div className="space-y-1.5 text-ink-soft">{children}</div>
      </div>
    </div>
  );
}

function Insights({ result, turn, lang }: { result: PipelineResult; turn: Turn; lang: Lang }) {
  const items: React.ReactNode[] = [];
  const step = (id: string) => result.steps.find((s) => s.id === id);

  if (turn.findings.length) {
    const hasSecret = turn.findings.some((f) => f.secret);
    items.push(
      <Insight key="privacy" icon={Lock} title="Hidden on the phone before sending">
        <FindingChips findings={turn.findings} />
        <p className="text-[13px]">{explain(hasSecret ? "pin_hidden" : "pii_hidden", lang).primary}</p>
      </Insight>,
    );
  }

  if (result.translation) {
    const flagged = step("guard_translated")?.verdict === "block";
    const name = { tw: "Twi", pcm: "Pidgin", ga: "Ga", ee: "Ewe" }[result.language ?? ""] ?? "another language";
    items.push(
      <Insight key="translate" icon={Languages} title={`Read in ${name}, translated for the Guard`}>
        <p className="font-read italic text-ink">&ldquo;{result.translation}&rdquo;</p>
        {flagged && <p className="text-[13px] font-medium text-safe">The Guard blocked the English translation on its own.</p>}
      </Insight>,
    );
  }

  if (result.decoded?.length) {
    const flagged = result.steps.some((s) => s.id.startsWith("guard_b64") && s.verdict === "block");
    items.push(
      <Insight key="decoded" icon={Binary} title="Found hidden text and decoded it">
        <p className="wrap-break-word font-mono text-[12.5px] text-ink">{result.decoded[0]}</p>
        {flagged && <p className="text-[13px] font-medium text-safe">The Guard blocked the decoded text on its own.</p>}
      </Insight>,
    );
  }

  if (result.blocked && result.risk?.multi_turn_escalation) {
    items.push(
      <Insight key="multi" icon={MessagesSquare} title="Read the whole conversation">
        <p className="text-[13px]">The earlier messages set this one up as part of an attack.</p>
      </Insight>,
    );
  }

  if (result.radar?.applied) {
    items.push(
      <Insight key="radar" icon={ScanSearch} title={`Inference Radar: ${result.radar.attributes.length} clues about the writer`}>
        <ul className="grid grid-cols-1 gap-1.5 pt-0.5 sm:grid-cols-2">
          {result.radar.attributes.map((a) => (
            <li key={a.attribute + a.guess} className="rounded-md border border-line bg-paper px-2.5 py-1.5">
              <span className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-ink-faint">
                {a.sensitivity === "high" && <span className="size-1.5 rounded-full bg-danger" title="Highly sensitive" />}
                {a.attribute}
              </span>
              <span className="block text-[13.5px] font-medium leading-snug text-ink">{a.guess}</span>
            </li>
          ))}
        </ul>
        <div className="rounded-md bg-forest-soft px-2.5 py-2 text-ink">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-forest">Sent instead</span>
          <p className="font-read">
            <TokenText text={result.radar.safer_rewrite} />
          </p>
        </div>
      </Insight>,
    );
  }

  const unverified = (result.truthcheck ?? []).filter((f) => !result.blocked && f.severity === "warn");
  if (unverified.length) {
    items.push(
      <Insight key="truth" icon={PhoneOff} title="TruthCheck: not on the verified list">
        <p className="break-all font-mono text-[12.5px] text-warn">{unverified.map((f) => f.text).join(" · ")}</p>
      </Insight>,
    );
  }

  if (!items.length) return null;
  return <div className="mt-2 divide-y divide-line border-y border-line">{items}</div>;
}

function FindingChips({ findings }: { findings: Finding[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {findings.map((f) => (
        <li key={f.token} className="inline-flex items-center gap-1.5 rounded-md bg-gold-soft px-2 py-0.5 text-[12.5px] text-ink">
          <span className="font-medium">{f.label.en}</span>
          <span className="font-mono text-[11.5px] text-ink-soft">{f.token}</span>
        </li>
      ))}
    </ul>
  );
}

// ------------------------------------------------------------------ the answer or the explanation

function Body({ side, result, lang, vault }: { side: "baseline" | "shield"; result: Result; lang: Lang; vault: Vault }) {
  if (isError(result)) {
    return (
      <p className="px-4 py-3 text-sm text-ink-soft">
        {result.error === "network" ? "Couldn't reach the server. Check that it is running, then try again." : result.detail || result.error}
      </p>
    );
  }

  if (side === "baseline") {
    if (result.blocked) {
      return (
        <div className="px-4 py-3">
          <p className="text-[13px] text-ink-faint">What the Guard returned</p>
          <code className="mt-1 block rounded-md bg-sunken px-2.5 py-1.5 font-mono text-[12.5px] text-ink-soft">
            allowed: false · flags: [{(result.flags ?? []).join(", ")}]
          </code>
          <p className="mt-2 text-[13px] text-ink-faint">The user sees no explanation, in any language.</p>
        </div>
      );
    }
    return <Answer text={result.reply ?? ""} />;
  }

  if (result.blocked && result.reason) {
    const e = explain(result.reason, lang);
    const hidden = (result.truthcheck ?? []).filter((f) => f.severity === "block");
    return (
      <div className="space-y-2 px-4 py-3">
        <p className="font-read text-[15.5px] leading-relaxed text-ink">{e.primary}</p>
        {e.secondary && <p className="text-[13px] text-ink-faint">{e.secondary}</p>}
        {result.stage === "response" && hidden.length > 0 && (
          <p className="text-[13px] text-ink-soft">
            Hidden from the user: <span className="break-all font-mono text-[12.5px] text-danger line-through decoration-danger/50">{hidden.map((f) => f.text).join(" · ")}</span>
          </p>
        )}
      </div>
    );
  }

  const unverified = (result.truthcheck ?? []).filter((f) => f.severity === "warn").map((f) => f.text);
  const text = unmask(result.reply ?? "", vault);
  return (
    <>
      <Answer text={text} needles={unverified} />
      {unverified.length > 0 && <p className="px-4 pb-3 text-[13px] text-warn">{explain("unverified", lang).primary}</p>}
    </>
  );
}

function Answer({ text, needles = [] }: { text: string; needles?: string[] }) {
  const long = text.length > 480;
  const [open, setOpen] = useState(false);
  return (
    <div className="px-4 py-3">
      <p
        className={`whitespace-pre-wrap wrap-break-word font-read text-[15.5px] leading-relaxed ${long && !open ? "line-clamp-7" : ""}`}
      >
        <Highlighted text={text} needles={needles} />
      </p>
      {long && (
        <button type="button" onClick={() => setOpen((o) => !o)} className="mt-1 text-[13px] font-medium text-forest hover:underline">
          {open ? "Show less" : "Show the full answer"}
        </button>
      )}
    </div>
  );
}
