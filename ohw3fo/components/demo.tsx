"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TriangleAlert, X } from "lucide-react";
import { SCENARIOS } from "@/lib/scenarios";
import { messageKind } from "@/lib/outcome";
import { Header } from "./header";
import { ScenarioList } from "./scenario-list";
import { Intro } from "./intro";
import { OutcomeCard } from "./outcome-card";
import { Inspector } from "./inspector";
import { Composer } from "./composer";
import { Eyebrow } from "./ui";
import { useDemo, type Turn } from "./use-demo";

export function Demo() {
  const demo = useDemo();
  const { turns, activeId, busy, play, playNext } = demo;
  const [inspecting, setInspecting] = useState<{ turnId: string; side: "baseline" | "shield" } | null>(null);
  const [demosOpen, setDemosOpen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  const active = SCENARIOS.find((s) => s.id === activeId);
  const inspectedTurn = inspecting ? turns.find((t) => t.id === inspecting.turnId) : undefined;
  const closeInspector = useCallback(() => setInspecting(null), []);

  // Keep the newest message in view.
  const lastTurn = turns.at(-1);
  const lastDone = !!(lastTurn?.baseline && lastTurn?.shield);
  useEffect(() => {
    const el = scroller.current;
    if (el && turns.length) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [turns.length, lastDone]);

  // Presenter shortcut: N plays the next demo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, [role=dialog]") || document.querySelector("[aria-modal=true]") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        playNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playNext]);

  // Deep link for the presentation: /?demo=radar&autoplay=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("demo");
    const side = params.get("inspect");
    if (id && params.get("autoplay") === "1" && SCENARIOS.some((s) => s.id === id)) {
      play(id).then((turnId) => {
        if (turnId && (side === "shield" || side === "baseline")) setInspecting({ turnId, side });
      });
    }
    // run once on load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const list = (
    <ScenarioList
      activeId={activeId}
      scores={demo.scores}
      busy={busy}
      onPlay={(id) => {
        setDemosOpen(false);
        play(id);
      }}
      onPlayNext={() => {
        setDemosOpen(false);
        playNext();
      }}
      onStartOver={demo.startOver}
    />
  );

  return (
    <div className="flex h-full flex-col">
      <Header
        scores={demo.scores}
        settings={demo.settings}
        onSettings={demo.setSettings}
        usage={demo.usage}
        busy={busy}
        onStartOver={demo.startOver}
        onOpenDemos={() => setDemosOpen(true)}
      />

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[300px] shrink-0 border-r border-line bg-surface lg:block">{list}</aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div ref={scroller} className="flex-1 overflow-y-auto" aria-live="polite">
            <div className="mx-auto max-w-[1100px] px-4 py-5 sm:px-6">
              {turns.length === 0 ? (
                <Intro onStart={() => play(SCENARIOS[0].id)} busy={busy} />
              ) : (
                <>
                  <StageHeader activeId={activeId} />
                  <div className="space-y-8">
                    {turns.map((turn) => (
                      <TurnRow
                        key={turn.id}
                        turn={turn}
                        sender={turn.scenarioId ? active?.sender : "You"}
                        demo={demo}
                        onInspect={(side) => setInspecting({ turnId: turn.id, side })}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          <Composer busy={busy} vault={demo.vault} onSend={demo.send} />
        </main>
      </div>

      {inspectedTurn && inspecting && (
        <Inspector
          turn={inspectedTurn}
          side={inspecting.side}
          onSide={(side) => setInspecting({ ...inspecting, side })}
          onClose={closeInspector}
        />
      )}

      {demosOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Close demos" onClick={() => setDemosOpen(false)} className="absolute inset-0 bg-[var(--overlay)]" />
          <div className="drawer-in relative h-full w-[min(340px,88vw)] border-r border-line bg-surface">
            <button
              type="button"
              onClick={() => setDemosOpen(false)}
              className="absolute right-3 top-4 inline-flex size-8 items-center justify-center rounded-lg text-ink-soft hover:bg-sunken"
            >
              <X className="size-4" aria-hidden />
              <span className="sr-only">Close</span>
            </button>
            {list}
          </div>
        </div>
      )}
    </div>
  );
}

function StageHeader({ activeId }: { activeId: string | null }) {
  const s = SCENARIOS.find((x) => x.id === activeId);
  return (
    <div className="mb-6">
      {s ? (
        <>
          <Eyebrow>
            {s.chapter} · Demo {SCENARIOS.indexOf(s) + 1} of {SCENARIOS.length}
          </Eyebrow>
          <h1 className="mt-1.5 font-display text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]">{s.title}</h1>
          <p className="mt-2 max-w-[72ch] text-[15px] leading-relaxed text-ink-soft">{s.note}</p>
          {s.sensitive && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-warn-soft px-2 py-1 text-[13px] text-warn">
              <TriangleAlert className="size-3.5" aria-hidden />
              Sensitive content in the request. No harmful instructions are shown.
            </p>
          )}
        </>
      ) : (
        <>
          <Eyebrow>Your conversation</Eyebrow>
          <h1 className="mt-1.5 font-display text-[28px] font-semibold tracking-tight">Try anything</h1>
          <p className="mt-2 max-w-[72ch] text-[15px] text-ink-soft">Each message goes through both sides. Open &ldquo;See every check&rdquo; to see how each side decided.</p>
        </>
      )}
    </div>
  );
}

function TurnRow({
  turn,
  sender,
  demo,
  onInspect,
}: {
  turn: Turn;
  sender?: string;
  demo: ReturnType<typeof useDemo>;
  onInspect: (side: "baseline" | "shield") => void;
}) {
  const scenario = SCENARIOS.find((s) => s.id === turn.scenarioId);
  const kind = messageKind(scenario, turn.shield, turn.findings);
  return (
    <section className="rise">
      <div className="mb-3 max-w-[760px]">
        <p className="mb-1 text-[12.5px] font-medium text-ink-faint">{sender && sender !== "You" ? `From ${sender}` : "You wrote"}</p>
        <p className="rounded-xl rounded-tl-sm bg-surface px-4 py-3 font-read text-[16px] leading-relaxed shadow-card transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">{turn.text}</p>
      </div>
      <div className="grid items-stretch gap-3 md:grid-cols-2">
        <OutcomeCard side="baseline" turn={turn} kind={kind} lang={demo.settings.lang} vault={demo.vault} onInspect={() => onInspect("baseline")} />
        <OutcomeCard side="shield" turn={turn} kind={kind} lang={demo.settings.lang} vault={demo.vault} onInspect={() => onInspect("shield")} />
      </div>
    </section>
  );
}
