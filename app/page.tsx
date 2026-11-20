import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  Bot,
  CalendarCheck,
  ClipboardList,
  MessageCircle,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

const FLOW = [
  { icon: UserRound, title: "Stalled lead", sub: "Counselled, unpaid 7+ days" },
  { icon: Bot, title: "AI agent", sub: "8 tools · Gemini → Groq" },
  { icon: MessageCircle, title: "WhatsApp offer", sub: "Family's language" },
  { icon: CalendarCheck, title: "Booking", sub: "6 slots in 48 h" },
  { icon: PhoneCall, title: "20-min call", sub: "NIAT parent, same district" },
  { icon: ClipboardList, title: "AI summary", sub: "Doubts · red flags" },
  { icon: BarChart3, title: "Dashboard", sub: "Treatment vs control" },
];

const TOOLS = [
  ["get_lead", "Reads the family's record and counselling notes from MongoDB."],
  ["extract_doubts", "Saves the family's real doubts; every quote is checked against the notes."],
  ["resolve_district", "Live India Post PIN-code API → district & state (3 s timeout, cache fallback)."],
  ["search_ambassadors", "MongoDB aggregation: same district → same state + university → same language; consented, active, under weekly cap."],
  ["score_candidates", "Agent scores each NIAT parent; server attaches verified facts."],
  ["create_match", "Saves the single best match with reasons."],
  ["write_ambassador_brief", "Brief in the NIAT parent's language + English, with a do-not-say list."],
  ["draft_family_message", "≤ 60-word WhatsApp offer in the family's language; validated for script, length, link and opt-out."],
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4">
      <section className="pt-10 pb-8 sm:pt-16">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="size-3.5" aria-hidden /> Track B · bottom of the funnel
        </p>
        <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
          “We’ll think about it.” <span className="text-primary">Let a parent from their own district answer.</span>
        </h1>
        <p className="mt-5 max-w-3xl text-base text-muted-foreground sm:text-lg leading-relaxed">
          Many NIAT families stall after counselling — not over the course, but over trust: NIAT is “not a college”, fees go to two
          parties, and no batch has graduated yet. ParentBridge offers each stalled family a free 20-minute call with the parent of a
          current NIATian from their own district, in their own language, booked on WhatsApp within 48 hours. An AI agent picks the
          match, briefs that parent on this family’s exact doubts, drafts the multilingual offer, summarises the call — and a
          randomised 200 / 200 experiment tells us if it works.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <Link
            href="/go/agent"
            prefetch={false}
            className="group flex items-center justify-between gap-3 rounded-xl bg-primary px-5 py-4 text-primary-foreground shadow-sm transition hover:opacity-95"
          >
            <span>
              <span className="block text-base font-semibold">Run the agent on a stalled family</span>
              <span className="block text-sm opacity-80">Watch the live tool-call trace</span>
            </span>
            <Bot className="size-6 shrink-0 transition group-hover:translate-x-0.5" aria-hidden />
          </Link>
          <Link href="/dashboard" className="group flex items-center justify-between gap-3 rounded-xl border bg-card px-5 py-4 shadow-sm transition hover:bg-muted">
            <span>
              <span className="block text-base font-semibold">See the experiment dashboard</span>
              <span className="block text-sm text-muted-foreground">Funnel, lift, win / kill verdict</span>
            </span>
            <BarChart3 className="size-6 shrink-0 text-primary" aria-hidden />
          </Link>
          <Link
            href="/go/parent"
            prefetch={false}
            className="group flex items-center justify-between gap-3 rounded-xl border bg-card px-5 py-4 shadow-sm transition hover:bg-muted"
          >
            <span>
              <span className="block text-base font-semibold">View as a parent</span>
              <span className="block text-sm text-muted-foreground">WhatsApp message + booking page</span>
            </span>
            <MessageCircle className="size-6 shrink-0 text-[#128c7e]" aria-hidden />
          </Link>
        </div>
      </section>

      <section aria-labelledby="flow" className="py-8">
        <h2 id="flow" className="text-lg font-semibold">How it flows</h2>
        <ol className="mt-4 grid gap-2 md:grid-cols-7 md:gap-0">
          {FLOW.map((s, i) => (
            <li key={s.title} className="flex flex-col items-center md:flex-row">
              <div className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 md:flex-col md:text-center md:min-h-34 md:justify-center">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <s.icon className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{s.title}</span>
                  <span className="block text-xs text-muted-foreground">{s.sub}</span>
                </span>
              </div>
              {i < FLOW.length - 1 && (
                <>
                  <ArrowDown className="my-0.5 size-4 text-muted-foreground md:hidden" aria-hidden />
                  <ArrowRight className="mx-0.5 hidden size-4 shrink-0 text-muted-foreground md:block" aria-hidden />
                </>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-6 py-8 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="text-lg font-semibold">The agent’s 8 tools</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A function-calling loop (max 8 turns). Independent tools run in the same turn; every call is logged and replayable.
          </p>
          <ul className="mt-4 space-y-2.5">
            {TOOLS.map(([name, desc]) => (
              <li key={name} className="text-sm">
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13px]">{name}</code>
                <span className="text-muted-foreground"> — {desc}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-6">
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="text-lg font-semibold">The experiment</h2>
            <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              <li>400 stalled Telugu-state leads (AP + Telangana), randomly split 200 treatment / 200 control.</li>
              <li>
                <strong className="text-foreground">Win</strong>: treatment converts ≥ 15% and ≥ 1.5× control within 14 days, ≥ 30% of offered
                families take the call, no rise in 30-day withdrawals.
              </li>
              <li>
                <strong className="text-foreground">Kill</strong>: lift below 1.2×.
              </li>
              <li>NIAT parents earn a ₹1,500 fee credit per completed call — never per sale.</li>
            </ul>
          </div>
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <ShieldCheck className="size-5 text-[#0ca30c]" aria-hidden /> Consent &amp; DPDP
            </h2>
            <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              <li>Data handled under India’s DPDP Act principles: consent, purpose limitation, opt-out.</li>
              <li>No WhatsApp without consent; every message ends with “Reply STOP to opt out”, and STOP flips consent off.</li>
              <li>Families never see the NIAT parent’s number; the AI never sees phone numbers; IPs are stored only as hashes.</li>
              <li>The agent never promises jobs or placements; overpromising on calls is flagged in red.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
