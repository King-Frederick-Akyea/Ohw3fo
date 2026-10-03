"use client";

import { ArrowRight, Play } from "lucide-react";
import { Eyebrow } from "./ui";

const ALONE = ["You type", "Guard checks it", "The AI answers", "Guard checks the answer"];
const WITH = [
  "Your phone hides private details",
  "Guard sees it 4 ways + Ɔhwɛfo reads it",
  "The AI answers",
  "Guard + TruthCheck check the answer",
  "Explained in English or Twi",
];

export function Intro({ onStart, busy }: { onStart: () => void; busy: boolean }) {
  return (
    <section className="mx-auto max-w-[920px] py-6 sm:py-12">
      <Eyebrow>SecureAI Hackathon 2026 · Team Neuralynx</Eyebrow>
      <h1 className="mt-3 max-w-[18ch] font-display text-[40px] font-semibold leading-[1.05] tracking-tight sm:text-[56px]">
        One message. Two safety systems.
      </h1>
      <p className="mt-4 max-w-[62ch] text-[17px] leading-relaxed text-ink-soft">
        Every message goes through the organisers&rsquo; SecureAI Guard on its own, and through the Guard with Ɔhwɛfo. Watch what each one
        lets through. The Guard is good at English. Ɔhwɛfo teaches it to understand Ghana.
      </p>

      <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={onStart}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl bg-forest px-5 py-3 text-[15px] font-semibold text-forest-ink shadow-card hover:opacity-90 disabled:opacity-60"
        >
          <Play className="size-4" aria-hidden />
          Play the first demo
        </button>
        <span className="text-sm text-ink-faint">or type your own message below, in English, Twi or Pidgin</span>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-2">
        <Flow title="Guard alone" steps={ALONE} tone="plain" />
        <Flow title="With Ɔhwɛfo" steps={WITH} tone="forest" />
      </div>

      <div className="mt-10 border-t border-line pt-6">
        <Eyebrow className="mb-3">What we found when we tested the Guard</Eyebrow>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-3">
          <Fact value="17 of 30" label="risky messages got past it, including a MoMo PIN and scams written in Twi" />
          <Fact value="0 of 5" label="Ghanaian data formats recognised: Ghana Card, MoMo number, PIN, +233 phone, bank account" />
          <Fact value="0.6 s" label="per Guard check (median), so Ɔhwɛfo runs its checks at the same time" />
        </dl>
      </div>
    </section>
  );
}

function Flow({ title, steps, tone }: { title: string; steps: string[]; tone: "plain" | "forest" }) {
  return (
    <div className={`rounded-xl border p-4 ${tone === "forest" ? "border-forest/40 bg-surface" : "border-line bg-surface"}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${tone === "forest" ? "text-forest" : "text-ink-faint"}`}>{title}</p>
      <ol className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-2">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-1.5">
            <span className={`rounded-md px-2.5 py-1 text-[13px] ${tone === "forest" ? "bg-forest-soft text-ink" : "bg-sunken text-ink-soft"}`}>{s}</span>
            {i < steps.length - 1 && <ArrowRight className="size-3.5 text-ink-faint" aria-hidden />}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Fact({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="tabular font-display text-[28px] font-semibold leading-none">{value}</dt>
      <dd className="mt-1.5 text-sm leading-snug text-ink-soft">{label}</dd>
    </div>
  );
}
