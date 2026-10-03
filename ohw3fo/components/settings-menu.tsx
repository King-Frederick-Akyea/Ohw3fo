"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import type { Settings, Usage } from "./use-demo";

interface Props {
  settings: Settings;
  onChange: (s: Settings) => void;
  usage: Usage | null;
  busy: boolean;
  onStartOver: () => void;
}

const LANGS: { value: Settings["lang"]; label: string }[] = [
  { value: "auto", label: "Match message" },
  { value: "en", label: "English" },
  { value: "tw", label: "Twi" },
];

export function SettingsMenu({ settings, onChange, usage, busy, onStartOver }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pct = usage ? Math.min(100, (usage.used_today / usage.daily_limit) * 100) : 0;

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`relative inline-flex size-9 items-center justify-center rounded-lg text-ink-soft hover:bg-sunken ${open ? "bg-sunken" : ""}`}
        title="Settings"
      >
        <SlidersHorizontal className="size-[18px]" aria-hidden />
        <span className="sr-only">Settings</span>
        {settings.outage && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-warn" aria-hidden />}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Settings"
          className="rise absolute right-0 top-11 z-40 w-[min(320px,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-4 shadow-card"
        >
          <div className="space-y-5">
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Explanations</legend>
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-sunken p-1">
                {LANGS.map((l) => (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => onChange({ ...settings, lang: l.value })}
                    aria-pressed={settings.lang === l.value}
                    className={`rounded-md px-2 py-1.5 text-[13px] ${settings.lang === l.value ? "bg-surface font-semibold shadow-card" : "text-ink-soft hover:text-ink"}`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-ink-faint">&ldquo;Match message&rdquo; explains in Twi when the message is in Twi.</p>
            </fieldset>

            <label htmlFor="outage" className="flex cursor-pointer items-start justify-between gap-4">
              <span>
                <span className="block text-sm font-semibold">Simulate a Guard outage</span>
                <span className="block text-xs text-ink-faint">Your typed messages get a &ldquo;partial&rdquo; Guard result, as if some checks didn&rsquo;t run.</span>
              </span>
              <input
                id="outage"
                type="checkbox"
                checked={settings.outage}
                onChange={(e) => onChange({ ...settings, outage: e.target.checked })}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className="relative mt-0.5 h-6 w-10 shrink-0 rounded-full bg-line-strong transition-colors peer-checked:bg-warn peer-focus-visible:outline-2 peer-focus-visible:outline-forest after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-surface after:shadow after:transition-transform peer-checked:after:translate-x-4"
              />
            </label>

            <div>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-semibold">Guard checks today</span>
                <span className="tabular text-ink-soft">
                  {usage ? `${usage.used_today.toLocaleString()} of ${usage.daily_limit.toLocaleString()}` : "Unavailable"}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sunken" aria-hidden>
                <div className="h-full rounded-full bg-forest" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-ink-faint">The team limit resets at 00:00 UTC.</p>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => {
                onStartOver();
                setOpen(false);
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-line-strong px-3 py-2 text-sm font-medium hover:bg-sunken disabled:opacity-50"
            >
              <RotateCcw className="size-4" aria-hidden />
              Start over
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
