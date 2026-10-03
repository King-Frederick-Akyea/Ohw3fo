// PrivacyShield: finds Ghana-specific personal data and swaps it for placeholders BEFORE the message
// leaves the user's device. The real values stay in a local vault and are put back into the reply on
// the device. The same code runs on the server as a backstop.
//
// This file has no imports so it can be used by the browser, the API routes and the test script.

export type FindingType =
  | "PIN" | "PASSWORD" | "CVV" | "GHANA_CARD" | "CARD" | "PHONE" | "ACCOUNT" | "EMAIL" | "DATE_OF_BIRTH" | "NAME";

export interface Finding {
  type: FindingType;
  token: string;
  secret: boolean;
  label: { en: string; tw: string };
}

export type Vault = Record<string, string>;

interface Detector {
  type: FindingType;
  secret?: boolean;
  label: { en: string; tw: string };
  re: RegExp;
  /** Capture group holding the value; the words around it ("PIN is ") are kept. */
  group?: number;
  validate?: (value: string) => boolean;
}

function luhn(digits: string): boolean {
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

// Order matters: more specific patterns run first.
const DETECTORS: Detector[] = [
  {
    type: "PIN", secret: true, label: { en: "PIN", tw: "PIN" },
    // "PIN is 4821", "PIN: 4821", "PIN ne 4821" (Twi), "OTP 482193"
    re: /\b(?:momo\s+)?(pin(?:\s*code)?|otp|passcode|secret\s+code)(\s*(?:no\.?|number)?\s*(?:is|ne|yɛ|y[eɛ]|:|=|-)?\s*)(\d{4,6})\b/gi,
    group: 3,
  },
  {
    type: "PASSWORD", secret: true, label: { en: "Password", tw: "Password" },
    re: /\b(password|passwd|pwd)(\s*(?:is|ne|:|=)\s*)(\S{4,})/gi,
    group: 3,
  },
  {
    type: "CVV", secret: true, label: { en: "Card security code", tw: "Card CVV" },
    re: /\b(cvv|cvc|security\s+code)(\s*(?:is|:|=)?\s*)(\d{3,4})\b/gi,
    group: 3,
  },
  { type: "GHANA_CARD", label: { en: "Ghana Card number", tw: "Ghana Card nɔma" }, re: /\bGHA[-\s]?\d{9}[-\s]?\d\b/gi },
  {
    type: "CARD", label: { en: "Bank card number", tw: "Bank card nɔma" },
    re: /\b(?:\d[ -]?){13,19}\b/g,
    validate: (v) => luhn(v.replace(/\D/g, "")),
  },
  {
    type: "PHONE", label: { en: "Phone number", tw: "Fon nɔma" },
    // 024 412 3456, 0244123456, +233 24 412 3456, 00233244123456
    re: /(?:\+233|00233|\b0)[\s-]?[235]\d(?:[\s-]?\d){7}\b/g,
  },
  { type: "ACCOUNT", label: { en: "Bank account number", tw: "Bank account nɔma" }, re: /\b\d{10,16}\b/g },
  { type: "EMAIL", label: { en: "Email address", tw: "Email" }, re: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g },
  {
    type: "DATE_OF_BIRTH", label: { en: "Date of birth", tw: "Awoda" },
    re: /\b(born(?:\s+on)?|dob|date of birth|wɔwoo me)(\s*:?\s*)(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/gi,
    group: 3,
  },
  {
    type: "NAME", label: { en: "Full name", tw: "Din" },
    // "I am Kwame Mensah", "my name is Ama Owusu", "name Ama Owusu", "me din de Kofi Boateng"
    re: /\b([Ii] am|[Ii]'m|[Mm]y name is|[Nn]ame|[Mm]e din de|[Mm]e din ne)(\s*:?\s+)([A-Z][a-zɛɔ]+(?:\s+[A-Z][a-zɛɔ]+){1,2})\b/g,
    group: 3,
  },
];

const TOKEN_RE = /^\[([A-Z_]+)_(\d+)\]$/;

/**
 * mask("My PIN is 4821") -> { masked: "My PIN is [PIN_1]", vault: {"[PIN_1]": "4821"}, findings: [...] }
 * Pass the conversation's vault to keep placeholder numbering stable. The vault passed in is updated.
 */
export function mask(text: string, vault: Vault = {}): { masked: string; vault: Vault; findings: Finding[] } {
  const reverse: Record<string, string> = {};
  const counters: Record<string, number> = {};
  for (const [tok, val] of Object.entries(vault)) {
    reverse[val] = tok;
    const m = tok.match(TOKEN_RE);
    if (m) counters[m[1]] = Math.max(counters[m[1]] || 0, Number(m[2]));
  }
  const findings: Finding[] = [];
  let out = text;

  for (const det of DETECTORS) {
    det.re.lastIndex = 0;
    out = out.replace(det.re, (...args: string[]) => {
      const whole = args[0];
      const value = det.group ? args[det.group] : whole;
      if (TOKEN_RE.test(value)) return whole; // already a placeholder
      if (det.validate && !det.validate(value)) return whole;
      const clean = value.trim();
      let token = reverse[clean];
      if (!token) {
        counters[det.type] = (counters[det.type] || 0) + 1;
        token = `[${det.type}_${counters[det.type]}]`;
        vault[token] = clean;
        reverse[clean] = token;
      }
      if (!findings.some((f) => f.token === token)) {
        findings.push({ type: det.type, token, secret: !!det.secret, label: det.label });
      }
      if (!det.group) return token;
      const at = whole.lastIndexOf(value);
      return whole.slice(0, at) + token + whole.slice(at + value.length);
    });
  }
  return { masked: out, vault, findings };
}

/** Put the real values back. Only ever runs on the user's device. */
export function unmask(text: string, vault: Vault): string {
  return text.replace(/\[[A-Z_]+_\d+\]/g, (tok) => (vault[tok] !== undefined ? vault[tok] : tok));
}

/** Split text into plain parts and placeholder tokens, for highlighting. */
export function splitTokens(text: string): { text: string; token: boolean }[] {
  return text
    .split(/(\[[A-Z_]+_\d+\])/g)
    .filter(Boolean)
    .map((part) => ({ text: part, token: TOKEN_RE.test(part) }));
}
