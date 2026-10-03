"use client";

import { CircleAlert, CircleCheck, CircleDot, CirclePause, CircleX, type LucideIcon } from "lucide-react";
import { splitTokens } from "@/lib/privacy-shield";
import type { Tone } from "@/lib/outcome";
import type { Verdict as StepVerdict } from "@/lib/types";

export const TONE: Record<Tone, { soft: string; text: string; icon: LucideIcon }> = {
  safe: { soft: "bg-safe-soft", text: "text-safe", icon: CircleCheck },
  danger: { soft: "bg-danger-soft", text: "text-danger", icon: CircleX },
  warn: { soft: "bg-warn-soft", text: "text-warn", icon: CircleAlert },
  neutral: { soft: "bg-neutral-soft", text: "text-ink-soft", icon: CircleDot },
};

export const STEP_TONE: Record<StepVerdict, Tone> = {
  pass: "safe",
  block: "danger",
  warn: "warn",
  info: "neutral",
  error: "warn",
};

export function PausedIcon(props: { className?: string }) {
  return <CirclePause {...props} aria-hidden />;
}

/** Text with [PLACEHOLDER_1] tokens shown as gold chips. */
export function TokenText({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={className}>
      {splitTokens(text).map((part, i) =>
        part.token ? (
          <mark key={i} className="rounded bg-gold-soft px-1 py-px font-mono text-[0.85em] text-ink">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </span>
  );
}

/** Highlight exact substrings (for unverified numbers and links inside an answer). */
export function Highlighted({ text, needles }: { text: string; needles: string[] }) {
  if (!needles.length) return <>{text}</>;
  const escaped = needles.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = text.split(new RegExp(`(${escaped.join("|")})`, "g"));
  return (
    <>
      {parts.map((p, i) =>
        needles.includes(p) ? (
          <mark key={i} className="rounded bg-warn-soft px-1 text-warn underline decoration-dotted underline-offset-2" title="Not on the verified list">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-5 items-center justify-center rounded border border-line-strong bg-surface px-1 font-mono text-[11px] leading-5 text-ink-soft">
      {children}
    </kbd>
  );
}

export function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint ${className}`}>{children}</p>;
}

export function Shield({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path d="M16 2 4 7v8c0 7.5 5.1 13.4 12 15 6.9-1.6 12-7.5 12-15V7z" fill="var(--forest)" />
      <path d="M16 7.5 8.5 10.6V15c0 4.9 3.1 8.8 7.5 10.2z" fill="var(--gold)" />
    </svg>
  );
}
