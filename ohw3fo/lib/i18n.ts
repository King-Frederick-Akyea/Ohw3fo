// Plain-language explanations shown to the user, in English and Twi.
// Twi: reviewed by a native speaker on the team.
import type { Reason } from "./types";

export type Lang = "en" | "tw";

type ExplanationKey = Reason | "pin_hidden" | "pii_hidden" | "rewritten" | "unverified";

export const EXPLAIN: Record<Lang, Record<ExplanationKey, string>> = {
  en: {
    scam: "This looks like a scam message. Ɔhwɛfo won't help write messages that trick people.",
    harm: "This request could hurt people, so Ɔhwɛfo stopped it.",
    injection: "This message tries to change the assistant's safety rules, so Ɔhwɛfo stopped it.",
    jailbreak: "This message uses a game or role-play to get around the safety rules, so Ɔhwɛfo stopped it.",
    credential: "This message is trying to get someone's PIN or secret code. Nobody should ever ask for that.",
    guard_unavailable: "The safety check couldn't finish just now, so we paused this message to keep you safe. Please try again.",
    guard_flag: "The Guard flagged this message.",
    guard_error: "The Guard couldn't be reached.",
    guard_flag_response: "The Guard flagged the answer.",
    response_credential: "The answer asked for a PIN or secret code, so we hid it. MoMo staff will never ask for your PIN.",
    response_link: "The answer had a dangerous or fake-looking link, so we hid it.",
    response_unsafe: "The answer wasn't safe to show, so we hid it.",
    pin_hidden: "Your PIN was hidden before it left your phone. Never share your PIN, not even with MoMo staff.",
    pii_hidden: "Your personal details were hidden before they left your phone. The assistant only saw placeholders.",
    rewritten: "Your message said a lot about you, so we sent a shorter version. Strangers can't work out who you are.",
    unverified: "We couldn't verify a number or link in this answer. Don't call or open it. Dial *170# or visit an official MoMo agent.",
  },
  tw: {
    scam: "Saa nkra yi te sɛ nnaadaa. Ɔhwɛfo remmoa wo ma woankyerɛw nkra a ɛdaadaa nnipa.",
    harm: "Saa abisadeɛ yi betumi apira nnipa, enti Ɔhwɛfo asiw ano.",
    injection: "Saa nkra yi rebɔ mmɔden sɛ ɛbɛsesa yɛn ahobammɔ mmara, enti Ɔhwɛfo asiw ano.",
    jailbreak: "Saa nkra yi de agorɔ redi yɛn ahobammɔ mmara so, enti Ɔhwɛfo asiw ano.",
    credential: "Saa nkra yi rehwehwɛ obi PIN anaa ne kood a ɛyɛ kokoam. Obiara nni hɔ a ɔsɛ sɛ ɔbisa saa.",
    guard_unavailable: "Yɛn ahobammɔ nhwehwɛmu no antumi anwie seesei, enti yɛagyina nkra yi so ama wo ahobammɔ. Mesrɛ wo, san bɔ mmɔden.",
    guard_flag: "Guard no asiw saa nkra yi ano.",
    guard_error: "Yɛantumi anfrɛ Guard no.",
    guard_flag_response: "Guard no asiw mmuaeɛ no ano.",
    response_credential: "Mmuaeɛ no bisaa PIN anaa kood a ɛyɛ kokoam, enti yɛde asie. MoMo adwumayɛfo mmisa wo PIN da.",
    response_link: "Mmuaeɛ no kaa link bi a ɛyɛ hu anaa ɛyɛ atoro, enti yɛde asie.",
    response_unsafe: "Mmuaeɛ no nni ahobammɔ, enti yɛde asie.",
    pin_hidden: "Yɛde wo PIN asie ansa na ɛfiri wo fon so. Mfa wo PIN nkyerɛ obiara, mpo MoMo adwumayɛfo.",
    pii_hidden: "Yɛde wo ho nsɛm asie ansa na ɛfiri wo fon so. Ɔboafo no hunuu nsɛnkyerɛnne nko ara.",
    rewritten: "Wo nkra no kaa wo ho nsɛm bebree, enti yɛde ne tiawa na ɛkɔeɛ. Ahɔho rentumi nhunu wo.",
    unverified: "Yɛantumi anhunu sɛ nɔma anaa link a ɛwɔ mmuaeɛ yi mu yɛ nokware. Mfrɛ na mmue. Frɛ *170# anaa kɔ MoMo agent a ɔyɛ nokwafo hɔ.",
  },
};

/** Short labels for why something was stopped, shown next to the verdict. */
export const REASON_LABEL: Record<Reason, string> = {
  scam: "Scam request",
  harm: "Harmful request",
  injection: "Attempt to change the rules",
  jailbreak: "Role-play jailbreak",
  credential: "Trying to get a PIN",
  guard_unavailable: "Safety check incomplete",
  guard_flag: "Flagged by the Guard",
  guard_error: "Guard unreachable",
  guard_flag_response: "Answer flagged by the Guard",
  response_credential: "Answer asked for a PIN",
  response_link: "Answer had a fake link",
  response_unsafe: "Unsafe answer",
};

export function explain(key: ExplanationKey, lang: Lang): { primary: string; secondary?: string } {
  return lang === "tw" ? { primary: EXPLAIN.tw[key], secondary: EXPLAIN.en[key] } : { primary: EXPLAIN.en[key] };
}
