"use client";

import { Check, Play, RotateCcw } from "lucide-react";
import { CHAPTERS, SCENARIOS } from "@/lib/scenarios";
import { Eyebrow } from "./ui";
import type { Score } from "./use-demo";

interface Props {
  activeId: string | null;
  scores: Record<string, Score>;
  busy: boolean;
  onPlay: (id: string) => void;
  onPlayNext: () => void;
  onStartOver: () => void;
}

export function ScenarioList({ activeId, scores, busy, onPlay, onPlayNext, onStartOver }: Props) {
  const played = Object.keys(scores).length;

  return (
    <nav aria-label="Demos" className="flex h-full flex-col">
      <div className="flex items-baseline justify-between px-5 pb-2 pt-5">
        <h2 className="text-[15px] font-semibold">Demos</h2>
        <span className="tabular text-xs text-ink-faint">
          {played} of {SCENARIOS.length} played
        </span>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-3 pb-4 pt-2">
        {CHAPTERS.map((chapter) => (
          <section key={chapter}>
            <Eyebrow className="mb-1.5 px-2">{chapter}</Eyebrow>
            <ul className="space-y-0.5">
              {SCENARIOS.filter((s) => s.chapter === chapter).map((s) => {
                const order = SCENARIOS.indexOf(s) + 1;
                const active = s.id === activeId;
                const done = !!scores[s.id];
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onPlay(s.id)}
                      aria-current={active ? "true" : undefined}
                      className={`group grid w-full grid-cols-[24px_1fr] items-start gap-2.5 rounded-lg px-2 py-2 text-left transition-colors disabled:cursor-progress ${
                        active ? "bg-forest-soft" : "hover:bg-sunken"
                      }`}
                    >
                      <span
                        className={`tabular mt-px inline-flex size-6 items-center justify-center rounded-full text-[12px] font-semibold ${
                          done ? "bg-forest text-forest-ink" : active ? "bg-surface text-forest" : "bg-sunken text-ink-soft"
                        }`}
                        aria-hidden
                      >
                        {done ? <Check className="size-3.5" strokeWidth={3} /> : order}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[14px] font-medium leading-snug">{s.title}</span>
                        <span className="block text-[12.5px] leading-snug text-ink-faint">{s.subtitle}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <div className="space-y-2 border-t border-line p-3">
        <button
          type="button"
          disabled={busy}
          onClick={onPlayNext}
          className="inline-flex w-full items-center justify-between gap-2 rounded-lg bg-forest px-3.5 py-2.5 text-sm font-semibold text-forest-ink hover:opacity-90 disabled:cursor-progress disabled:opacity-60"
        >
          <span className="inline-flex items-center gap-2">
            <Play className="size-4" aria-hidden />
            {activeId ? "Play next demo" : "Play the first demo"}
          </span>
          <span className="hidden text-xs font-normal opacity-80 lg:inline">
            press <span className="font-mono">N</span>
          </span>
        </button>
        {played > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={onStartOver}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-[13px] text-ink-soft hover:bg-sunken disabled:opacity-50"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Start over
          </button>
        )}
      </div>
    </nav>
  );
}

