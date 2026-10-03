"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { isError, seconds } from "@/lib/outcome";
import type { Phase, PipelineResult, Step } from "@/lib/types";
import { Eyebrow, STEP_TONE, TokenText, TONE } from "./ui";
import type { Turn } from "./use-demo";

interface Props {
  turn: Turn;
  side: "baseline" | "shield";
  onSide: (s: "baseline" | "shield") => void;
  onClose: () => void;
}

const PHASES: { id: Phase; label: string }[] = [
  { id: "device", label: "On the phone" },
  { id: "input", label: "Before the AI" },
  { id: "ai", label: "The AI" },
  { id: "output", label: "After the AI" },
];

export function Inspector({ turn, side, onSide, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const result = turn[side];

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-[var(--overlay)]" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="inspector-title"
        className="drawer-in relative flex h-full w-full max-w-[540px] flex-col border-l border-line bg-surface shadow-card"
      >
        <header className="border-b border-line px-5 pb-3 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="inspector-title" className="font-display text-xl font-semibold">
                How it was decided
              </h2>
              <p className="mt-0.5 line-clamp-2 font-read text-sm text-ink-soft">&ldquo;{turn.text}&rdquo;</p>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-sunken"
            >
              <X className="size-4" aria-hidden />
              <span className="sr-only">Close</span>
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-sunken p-1" role="tablist">
            {(["shield", "baseline"] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={side === s}
                onClick={() => onSide(s)}
                className={`rounded-md px-3 py-1.5 text-sm ${side === s ? "bg-surface font-semibold shadow-card" : "text-ink-soft hover:text-ink"}`}
              >
                {s === "shield" ? "With Ɔhwɛfo" : "Guard alone"}
              </button>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!result ? (
            <p className="text-sm text-ink-soft">Still checking…</p>
          ) : isError(result) ? (
            <p className="text-sm text-ink-soft">{result.detail || result.error}</p>
          ) : (
            <Details result={result} turn={turn} side={side} />
          )}
        </div>
      </aside>
    </div>
  );
}

function Details({ result, turn, side }: { result: PipelineResult; turn: Turn; side: "baseline" | "shield" }) {
  const guardCalls = result.steps.filter((s) => s.layer === "guard" && !s.cached && !s.simulated).length;
  const aiCalls = result.steps.filter((s) => (s.layer === "llm" && !s.simulated) || s.id === "analysis").length;

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-3 gap-2">
        {[
          ["Total time", seconds(result.total_ms)],
          ["Guard checks", String(guardCalls)],
          ["AI calls", String(aiCalls)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-paper px-3 py-2">
            <dt className="text-xs text-ink-faint">{k}</dt>
            <dd className="tabular text-lg font-semibold">{v}</dd>
          </div>
        ))}
      </dl>

      <section>
        <Eyebrow className="mb-2">What left the phone</Eyebrow>
        <p className="rounded-lg border border-line bg-paper px-3 py-2.5 font-read text-[14.5px] leading-relaxed">
          {side === "shield" ? <TokenText text={turn.masked} /> : turn.text}
        </p>
        <p className="mt-1.5 text-xs text-ink-faint">
          {side === "shield"
            ? turn.findings.length
              ? "Gold placeholders replaced private details. The real values never left the phone."
              : "Nothing private needed hiding."
            : "Sent exactly as typed, to the Guard and the AI."}
        </p>
        {side === "shield" && result.radar?.applied && (
          <>
            <p className="mb-1 mt-3 text-xs font-semibold text-ink-soft">Then Inference Radar sent this to the AI instead</p>
            <p className="rounded-lg bg-forest-soft px-3 py-2.5 font-read text-[14.5px]">
              <TokenText text={result.radar.safer_rewrite} />
            </p>
          </>
        )}
      </section>

      {side === "shield" && result.radar && result.radar.attributes.length > 0 && (
        <section>
          <Eyebrow className="mb-2">Clues a stranger could pick up</Eyebrow>
          <ul className="divide-y divide-line rounded-lg border border-line">
            {result.radar.attributes.map((a) => (
              <li key={a.attribute + a.guess} className="grid grid-cols-[110px_1fr] gap-3 px-3 py-2 text-sm">
                <span className="font-semibold text-ink-soft">{a.attribute}</span>
                <span>
                  <span className="block font-medium">{a.guess}</span>
                  <span className="block font-read text-[13px] italic text-ink-faint">&ldquo;{a.evidence}&rdquo;</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <Eyebrow className="mb-3">Every check, in order</Eyebrow>
        <ol className="space-y-5">
          {PHASES.map((phase) => {
            const steps = result.steps.filter((s) => s.phase === phase.id);
            if (!steps.length) return null;
            return (
              <li key={phase.id}>
                <p className="mb-2 text-sm font-semibold">{phase.label}</p>
                <ol className="relative space-y-2 border-l border-line pl-4">
                  {steps.map((s) => (
                    <StepRow key={s.id} step={s} />
                  ))}
                </ol>
              </li>
            );
          })}
        </ol>
      </section>

      <p className="text-xs leading-relaxed text-ink-faint">
        Guard request IDs are the organisers&rsquo; own receipts for each check. Steps marked &ldquo;simulated&rdquo; use a demo input, but
        the Guard&rsquo;s verdict on it is real.
      </p>
    </div>
  );
}

function StepRow({ step }: { step: Step }) {
  const tone = TONE[STEP_TONE[step.verdict]];
  const Icon = tone.icon;
  return (
    <li className="relative">
      <span className="absolute -left-[25px] top-0.5 rounded-full bg-surface" aria-hidden>
        <Icon className={`size-[17px] ${tone.text}`} />
      </span>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <p className="text-sm font-medium">
          {step.title}
          {step.layer === "guard" && <span className="ml-1.5 text-xs font-normal text-ink-faint">SecureAI Guard</span>}
        </p>
        <span className="tabular text-xs text-ink-faint">{step.ms ? `${step.ms} ms` : ""}</span>
      </div>
      <p className="text-[13px] text-ink-soft">{step.detail}</p>
      {step.translation && <p className="mt-1 font-read text-[13px] italic text-ink-soft">&ldquo;{step.translation}&rdquo;</p>}
      {step.decoded && <p className="mt-1 wrap-break-word font-mono text-xs text-ink-soft">{step.decoded}</p>}
      {(step.request_id || step.cached || step.simulated) && (
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {step.request_id && step.request_id !== "simulated" && <RequestId id={step.request_id} />}
          {step.cached && <span className="rounded bg-sunken px-1.5 text-[11px] text-ink-soft">cached result</span>}
          {step.simulated && <span className="rounded bg-warn-soft px-1.5 text-[11px] text-warn">simulated</span>}
        </div>
      )}
    </li>
  );
}

function RequestId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(id);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // clipboard not available; the id stays visible and selectable
        }
      }}
      className="inline-flex items-center gap-1 rounded bg-sunken px-1.5 font-mono text-[11px] text-ink-soft hover:text-ink"
      title="Copy request ID"
    >
      {id}
      {copied ? <Check className="size-3" aria-hidden /> : <Copy className="size-3" aria-hidden />}
    </button>
  );
}
