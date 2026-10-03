"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { mask, type Finding, type Vault } from "@/lib/privacy-shield";
import { SCENARIOS, type Scenario } from "@/lib/scenarios";
import { isError, shieldProtected } from "@/lib/outcome";
import type { ApiError, ChatMessage, ChatRequest, PipelineResult } from "@/lib/types";

export type Result = PipelineResult | ApiError;

export interface Turn {
  id: string;
  text: string;
  /** What actually left the device on the Ɔhwɛfo side */
  masked: string;
  findings: Finding[];
  scenarioId?: string;
  startedAt: number;
  baseline?: Result;
  shield?: Result;
}

export interface Settings {
  lang: "auto" | "en" | "tw";
  outage: boolean;
}

export interface Score {
  kind: Scenario["kind"];
  guardAlone: boolean;
  withShield: boolean;
}

export interface Usage {
  used_today: number;
  daily_limit: number;
}

async function post(body: ChatRequest): Promise<Result> {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await res.json()) as Result;
  } catch (err) {
    return { error: "network", detail: err instanceof Error ? err.message : "Network error" };
  }
}

let nextId = 0;

export function useDemo() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, Score>>({});
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState<Settings>({ lang: "auto", outage: false });
  const [usage, setUsage] = useState<Usage | null>(null);
  // A copy of the vault for rendering (the ref is the source of truth while sending).
  const [vaultView, setVaultView] = useState<Vault>({});

  // Conversation memory. Kept in refs so a multi-message demo always reads the latest values.
  const vault = useRef<Vault>({});
  const history = useRef<{ baseline: ChatMessage[]; shield: ChatMessage[] }>({ baseline: [], shield: [] });
  const busyRef = useRef(false);
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const refreshUsage = useCallback(async () => {
    try {
      const res = await fetch("/api/usage");
      if (res.ok) setUsage(await res.json());
    } catch {
      // usage is optional
    }
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/usage")
      .then((res) => (res.ok ? res.json() : null))
      .then((u: Usage | null) => {
        if (alive && u) setUsage(u);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const resetConversation = useCallback(() => {
    setTurns([]);
    vault.current = {};
    setVaultView({});
    history.current = { baseline: [], shield: [] };
  }, []);

  const updateTurn = (id: string, patch: Partial<Turn>) =>
    setTurns((all) => all.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  /** Send one message to both sides at the same time. */
  const sendOne = useCallback(
    async (text: string, scenario?: Scenario) => {
      const { masked, findings } = mask(text, vault.current);
      setVaultView({ ...vault.current });
      const id = `t${++nextId}`;
      setTurns((all) => [...all, { id, text, masked, findings, scenarioId: scenario?.id, startedAt: Date.now() }]);

      const simulate = { guardOutage: scenario?.simulateOutage ?? settingsRef.current.outage };
      const forceReply = scenario?.forceReply ?? null;

      const [a, b] = await Promise.all([
        post({ mode: "baseline", message: text, history: history.current.baseline, simulate, forceReply }).then((r) => {
          updateTurn(id, { baseline: r });
          return r;
        }),
        post({
          mode: "shield",
          message: masked,
          history: history.current.shield,
          simulate,
          forceReply,
          deviceFindings: findings.map((f) => ({ type: f.type, secret: f.secret })),
        }).then((r) => {
          updateTurn(id, { shield: r });
          return r;
        }),
      ]);

      history.current.baseline.push({ role: "user", content: text });
      if (!isError(a) && a.reply) history.current.baseline.push({ role: "assistant", content: a.reply });
      history.current.shield.push({ role: "user", content: (!isError(b) && b.sent_to_cloud) || masked });
      if (!isError(b) && b.reply) history.current.shield.push({ role: "assistant", content: b.reply });

      return { id, a, b, findings };
    },
    [],
  );

  const send = useCallback(
    async (text: string) => {
      if (busyRef.current || !text.trim()) return;
      busyRef.current = true;
      setBusy(true);
      try {
        await sendOne(text.trim());
      } finally {
        busyRef.current = false;
        setBusy(false);
        refreshUsage();
      }
    },
    [sendOne, refreshUsage],
  );

  const play = useCallback(
    async (scenarioId: string): Promise<string | undefined> => {
      const scenario = SCENARIOS.find((s) => s.id === scenarioId);
      if (!scenario || busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      resetConversation();
      setActiveId(scenario.id);
      try {
        let last: Awaited<ReturnType<typeof sendOne>> | null = null;
        for (const message of scenario.messages) last = await sendOne(message, scenario);
        if (last && !isError(last.a) && !isError(last.b)) {
          const { a, b, findings } = last;
          setScores((s) => ({
            ...s,
            [scenario.id]: { kind: scenario.kind, guardAlone: a.blocked, withShield: shieldProtected(b, findings) },
          }));
        }
        return last?.id;
      } finally {
        busyRef.current = false;
        setBusy(false);
        refreshUsage();
      }
    },
    [resetConversation, sendOne, refreshUsage],
  );

  const playNext = useCallback(() => {
    const index = SCENARIOS.findIndex((s) => s.id === activeId);
    const next = SCENARIOS.slice(index + 1).find((s) => !scores[s.id]) ?? SCENARIOS[index + 1] ?? SCENARIOS.find((s) => !scores[s.id]);
    if (next) play(next.id);
  }, [activeId, scores, play]);

  const startOver = useCallback(() => {
    if (busyRef.current) return;
    resetConversation();
    setActiveId(null);
    setScores({});
  }, [resetConversation]);

  return {
    turns, activeId, scores, busy, settings, setSettings, usage, vault: vaultView,
    send, play, playNext, startOver,
  };
}
