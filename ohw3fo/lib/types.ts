// Shapes shared by the API routes and the interface.

export type Verdict = "pass" | "block" | "warn" | "info" | "error";
export type Layer = "guard" | "shield" | "llm";
/** Where in the journey a check happens, used to group checks in the inspector. */
export type Phase = "device" | "input" | "ai" | "output";

export interface Step {
  id: string;
  phase: Phase;
  layer: Layer;
  title: string;
  verdict: Verdict;
  detail: string;
  ms: number;
  request_id?: string | null;
  cached?: boolean;
  simulated?: boolean;
  translation?: string;
  decoded?: string;
}

export type RiskCategory =
  | "none"
  | "prompt_injection"
  | "jailbreak_roleplay"
  | "scam_or_phishing"
  | "credential_solicitation"
  | "harmful_violence"
  | "other_harmful";

export interface Risk {
  category: RiskCategory;
  severity: "none" | "low" | "medium" | "high";
  multi_turn_escalation: boolean;
  reason: string;
}

export interface InferredAttribute {
  attribute: string;
  guess: string;
  evidence: string;
  sensitivity: "low" | "medium" | "high";
}

export interface Radar {
  attributes: InferredAttribute[];
  safer_rewrite: string;
  applied: boolean;
}

export interface TruthFinding {
  kind: "credential_request" | "dangerous_link" | "lookalike_link" | "unverified_link" | "unverified_phone";
  text: string;
  severity: "block" | "warn";
}

/** Why a message or answer was stopped. Each has a plain-language explanation in lib/i18n.ts. */
export type Reason =
  | "scam"
  | "harm"
  | "injection"
  | "jailbreak"
  | "credential"
  | "guard_unavailable"
  | "guard_flag"
  | "guard_error"
  | "guard_flag_response"
  | "response_credential"
  | "response_link"
  | "response_unsafe";

export interface PipelineResult {
  mode: "baseline" | "shield";
  blocked: boolean;
  reason?: Reason;
  stage?: "input" | "response";
  flags?: string[];
  reply?: string;
  steps: Step[];
  total_ms: number;
  language?: string;
  translation?: string | null;
  risk?: Risk | null;
  radar?: Radar | null;
  truthcheck?: TruthFinding[];
  decoded?: string[];
  sent_to_cloud?: string;
}

export interface ApiError {
  error: string;
  detail?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  mode: "baseline" | "shield";
  message: string;
  history?: ChatMessage[];
  simulate?: { guardOutage?: boolean };
  forceReply?: string | null;
  autoRewrite?: boolean;
  deviceFindings?: { type: string; secret?: boolean }[];
}
