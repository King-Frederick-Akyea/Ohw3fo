// TruthCheck: scans the assistant's answer BEFORE the user sees it, for the scam-shaped failures the Guard misses:
//  - asking the user for their PIN / OTP / password
//  - phone numbers, USSD codes and links that are not on the verified list (invented "support lines")
//  - raw-IP links, .apk downloads, and look-alike domains that borrow a brand name ("mtn-momo-gh-support.com")
import contacts from "../data/verified-contacts.json";
import type { TruthFinding } from "../types";

export { contacts };

const verifiedPhones = new Set(contacts.phones.map((p) => p.number.replace(/\s/g, "")));
const verifiedDomains = contacts.domains.map((d) => d.toLowerCase());

const CREDENTIAL_ASK = [
  // English: "reply with your PIN", "send me the OTP", "share your password with our agent".
  // ("Enter your PIN" on the user's own phone menu is normal MoMo usage, so it is not matched.)
  /\b(send|share|give|tell|reply(?:\s+with)?|provide|text|forward|disclose)\b[^.?!\n]{0,40}\b(pin|otp|password|passcode|verification code|secret code|cvv)\b/gi,
  /\b(pin|otp|password|passcode|code)\b[^.?!\n]{0,20}\b(to|with)\s+(me|us|our (?:agent|team|officer)|this number|the agent)\b/gi,
  // Twi: "fa wo PIN brɛ me" (but not "mfa" = do not)
  /\b(fa|de)\s+wo\s+(pin|otp|password|code)\b/gi,
];
const NEGATION = /\b(never|not|don't|do not|no one|nobody|mfa|nnyi|mma)\b[^.?!\n]{0,25}$/i;

const URL_RE =
  /\b((?:https?:\/\/)?(?:www\.)?(?:[a-z0-9-]+\.)+(?:com|gh|org|net|io|app|xyz|info|online|site|top|link)(?:\.[a-z]{2})?(?:\/[^\s)]*)?|https?:\/\/\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?(?:\/[^\s)]*)?)/gi;
const PHONE_RE = /(?:\+233|00233|\b0)[\s-]?[235]\d(?:[\s-]?\d){7}\b/g;
const LANDLINE_RE = /\b0[23]0\d[\s-]?\d{3}[\s-]?\d{3,4}\b/g;
const USSD_RE = /\*\d{2,4}(?:\*\d+)*#/g;

function hostOf(url: string): string {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `http://${url}`).hostname.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

export function scanAnswer(reply: string): { findings: TruthFinding[]; blocked: boolean } {
  const findings: TruthFinding[] = [];
  const add = (f: TruthFinding) => {
    if (!findings.some((x) => x.text === f.text)) findings.push(f);
  };

  for (const re of CREDENTIAL_ASK) {
    for (const m of reply.matchAll(re)) {
      const before = reply.slice(Math.max(0, (m.index ?? 0) - 40), m.index);
      if (!NEGATION.test(before + m[0].split(/\s+/)[0])) add({ kind: "credential_request", text: m[0], severity: "block" });
    }
  }

  for (const m of reply.matchAll(URL_RE)) {
    const url = m[0].replace(/[.,;:]+$/, "");
    const host = hostOf(url);
    const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
    const verified = verifiedDomains.some((d) => host === d || host.endsWith("." + d));
    const borrowsBrand = contacts.brand_words.some((w) => host.includes(w));
    if (isIp || /\.apk(\?|$)/i.test(url)) add({ kind: "dangerous_link", text: url, severity: "block" });
    else if (!verified && borrowsBrand) add({ kind: "lookalike_link", text: url, severity: "block" });
    else if (!verified) add({ kind: "unverified_link", text: url, severity: "warn" });
  }

  for (const re of [PHONE_RE, LANDLINE_RE, USSD_RE]) {
    for (const m of reply.matchAll(re)) {
      if (!verifiedPhones.has(m[0].replace(/[\s-]/g, ""))) add({ kind: "unverified_phone", text: m[0], severity: "warn" });
    }
  }

  return { findings, blocked: findings.some((f) => f.severity === "block") };
}
