// Minimal OpenAI Chat Completions client using the built-in fetch.
import { config } from "./config";

export interface JsonSchema {
  name: string;
  schema: Record<string, unknown>;
}

interface ChatOptions {
  model: string;
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  temperature?: number;
  maxTokens?: number;
  schema?: JsonSchema;
}

export async function chat<T = string>({ model, messages, temperature = 0.3, maxTokens = 700, schema }: ChatOptions) {
  const body: Record<string, unknown> = { model, messages, temperature, max_tokens: maxTokens };
  if (schema) {
    body.response_format = { type: "json_schema", json_schema: { name: schema.name, strict: true, schema: schema.schema } };
  }
  const t0 = Date.now();
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.openaiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`LLM error: ${data?.error?.message || `HTTP ${res.status}`}`);

  const message = data.choices[0].message as { content: string | null; refusal?: string | null };
  const content = message.content || "";
  return {
    content: (schema ? (content ? JSON.parse(content) : null) : content) as T | null,
    refusal: message.refusal || null,
    ms: Date.now() - t0,
  };
}
