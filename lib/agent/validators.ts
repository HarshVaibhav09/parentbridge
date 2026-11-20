import { BOOKING_PLACEHOLDER, OPT_OUT_LINE, type LangCode } from "@/lib/constants";

const SCRIPT: Record<LangCode, RegExp> = {
  te: /[ఀ-౿]/u,
  hi: /[ऀ-ॿ]/u,
  ta: /[஀-௿]/u,
  kn: /[ಀ-೿]/u,
  ml: /[ഀ-ൿ]/u,
  en: /[A-Za-z]/u,
};

function stripBoilerplate(text: string) {
  return text
    .replaceAll(BOOKING_PLACEHOLDER, " ")
    .replace(/reply\s+stop\s+to\s+opt\s*out\.?/gi, " ")
    .replace(/https?:\/\/\S+/g, " ");
}

/** Share of letters written in the expected script (0–1). */
export function scriptShare(text: string, lang: LangCode): number {
  const letters = [...stripBoilerplate(text)].filter((ch) => /\p{L}|\p{M}/u.test(ch));
  if (!letters.length) return 0;
  const re = SCRIPT[lang];
  return letters.filter((ch) => re.test(ch)).length / letters.length;
}

export function isInLanguage(text: string, lang: LangCode, threshold = 0.5) {
  return scriptShare(text, lang) >= threshold;
}

/** Words excluding the booking placeholder and the opt-out line. */
export function wordCount(text: string): number {
  return stripBoilerplate(text)
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/** Guarantee the message ends with the opt-out line (DPDP: easy opt-out on every message). */
export function ensureOptOut(body: string): string {
  const trimmed = body.trim();
  if (/reply\s+stop\s+to\s+opt\s*out\.?\s*$/i.test(trimmed)) return trimmed;
  // Model wrote a translated opt-out that still contains STOP on the last line → keep it, append the canonical line.
  return `${trimmed}\n\n${OPT_OUT_LINE}`;
}

function normalise(s: string) {
  return s
    .normalize("NFC")
    .toLowerCase()
    .replace(/[‘’“”"'`]/g, "")
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Is the "evidence quote" really in the counselling notes? (exact or ≥80% token overlap) */
export function quoteInNotes(quote: string, notes: string): boolean {
  const q = normalise(quote);
  const n = normalise(notes);
  if (!q) return false;
  if (n.includes(q)) return true;
  const noteTokens = new Set(n.split(" "));
  const qt = q.split(" ").filter(Boolean);
  const hit = qt.filter((t) => noteTokens.has(t)).length;
  return qt.length >= 3 && hit / qt.length >= 0.8;
}

export type RedFlag = { rule: string; excerpt: string };

const RED_FLAG_RULES: Array<{ rule: string; re: RegExp }> = [
  { rule: "Job/placement guarantee", re: /(guarant(ee|eed|ees)|assured|100\s*%|pakka|confirm(ed)?\s+(ga\s+)?)\W{0,3}(\w+\W+){0,4}(job|placement|package|salary|offer)/i },
  { rule: "Job/placement guarantee", re: /(job|placement|package|salary)\W+(\w+\W+){0,4}(guarant(ee|eed)|assured|pakka|100\s*%|for sure|definitely)/i },
  { rule: "Job/placement guarantee", re: /గ్యారంటీ|గ్యారెంటీ|गारंटी|पक्की नौकरी|உத்தரவாத|ಖಾತರಿ|ഉറപ്പ്/u },
  { rule: "Salary claim", re: /\b\d+(\.\d+)?\s*(lpa|lakhs?\s+(per\s+annum|package|salary))\b/i },
  { rule: "Fee promise", re: /(fee|fees)\W+(\w+\W+){0,4}(refund|discount|waive|waiver|reduce|reduced|concession)/i },
  { rule: "Criticised other colleges", re: /(other|local|those|that)\s+(engineering\s+)?colleges?\s+(are\s+)?(waste|useless|bad|fraud|fake|worst)/i },
];

/** Deterministic scan for overpromising — backs up the LLM's own red-flag judgement. */
export function scanRedFlags(text: string): RedFlag[] {
  const flags: RedFlag[] = [];
  for (const { rule, re } of RED_FLAG_RULES) {
    const m = re.exec(text);
    if (m && !flags.some((f) => f.rule === rule)) {
      const start = Math.max(0, m.index - 30);
      flags.push({ rule, excerpt: text.slice(start, m.index + m[0].length + 30).replace(/\s+/g, " ").trim() });
    }
  }
  return flags;
}
