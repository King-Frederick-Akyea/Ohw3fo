import data from "./data/scenarios.json";

export interface Scenario {
  id: string;
  chapter: string;
  /** normal: everyday use · leak: private data at risk · attack: someone trying to cause harm */
  kind: "normal" | "leak" | "attack";
  /** Who sends the message in the story */
  sender: string;
  title: string;
  subtitle: string;
  note: string;
  messages: string[];
  forceReply?: string;
  simulateOutage?: boolean;
  sensitive?: boolean;
}

export const SCENARIOS = data as Scenario[];

export const CHAPTERS = [...new Set(SCENARIOS.map((s) => s.chapter))];
