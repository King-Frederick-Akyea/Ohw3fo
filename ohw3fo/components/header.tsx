"use client";

import { ListVideo } from "lucide-react";
import { Shield } from "./ui";
import { SettingsMenu } from "./settings-menu";
import type { Score, Settings, Usage } from "./use-demo";

interface Props {
  scores: Record<string, Score>;
  settings: Settings;
  onSettings: (s: Settings) => void;
  usage: Usage | null;
  busy: boolean;
  onStartOver: () => void;
  onOpenDemos: () => void;
}

export function Header({ scores, settings, onSettings, usage, busy, onStartOver, onOpenDemos }: Props) {
  const threats = Object.values(scores).filter((s) => s.kind !== "normal");
  const total = threats.length;
  const alone = threats.filter((s) => s.guardAlone).length;
  const shield = threats.filter((s) => s.withShield).length;

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-4 sm:px-5">
      <button
        type="button"
        onClick={onOpenDemos}
        className="-ml-1 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-ink-soft hover:bg-sunken lg:hidden"
      >
        <ListVideo className="size-4" aria-hidden />
        Demos
      </button>

      <div className="flex min-w-0 items-center gap-2.5">
        <Shield className="size-7 shrink-0" />
        <div className="flex min-w-0 items-baseline gap-3">
          <span className="font-display text-[22px] font-semibold leading-none tracking-tight">Ɔhwɛfo</span>
          <span className="hidden truncate text-sm text-ink-faint md:inline">A Ghana-aware safety layer for the SecureAI Guard</span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-4">
        {total > 0 && (
          <div className="hidden items-center gap-4 sm:flex" aria-label="Threats handled so far">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Threats handled</span>
            <ScoreMeter label="Guard alone" value={alone} total={total} tone="danger" />
            <ScoreMeter label="With Ɔhwɛfo" value={shield} total={total} tone="safe" />
          </div>
        )}
        <SettingsMenu settings={settings} onChange={onSettings} usage={usage} busy={busy} onStartOver={onStartOver} />
      </div>
    </header>
  );
}

function ScoreMeter({ label, value, total, tone }: { label: string; value: number; total: number; tone: "safe" | "danger" }) {
  const pct = total ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-ink-soft">{label}</span>
      <span className="relative h-1.5 w-14 overflow-hidden rounded-full bg-sunken" aria-hidden>
        <span
          className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ${tone === "safe" ? "bg-safe" : "bg-danger"}`}
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="tabular text-sm font-semibold">
        {value}
        <span className="font-normal text-ink-faint">/{total}</span>
      </span>
    </div>
  );
}
