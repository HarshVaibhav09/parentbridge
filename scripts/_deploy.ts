// One-off deploy helper (not committed): link project, push env vars from .env.local, deploy.
import "./env";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";

const T = process.env.VERCEL_TOKEN!;
const run = (args: string[], input?: string) => {
  try {
    const out = execFileSync("npx", ["--yes", "vercel@latest", ...args, "--token", T], {
      encoding: "utf8",
      shell: true,
      input,
      stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
      maxBuffer: 20 * 1024 * 1024,
    });
    return { ok: true, out };
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string };
    return { ok: false, out: `${err.stdout ?? ""}\n${err.stderr ?? ""}` };
  }
};

const step = process.argv[2];

if (step === "link") {
  const r = run(["link", "--yes", "--project", "parentbridge"]);
  console.log(r.ok ? "linked" : "link failed", r.out.split("\n").filter((l) => /Linked|Error|project/i.test(l)).join("\n").slice(0, 600));
}

if (step === "env") {
  const names = [
    "LLM_PROVIDER", "LLM_MODEL", "GEMINI_FALLBACK_MODEL", "GEMINI_API_KEY", "GROQ_API_KEY", "GROQ_MODEL",
    "MONGODB_URI", "MONGODB_DB", "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_WHATSAPP_FROM", "DEMO_WHATSAPP_TO",
    "AGENT_RUNS_PER_IP_PER_DAY", "AGENT_RUNS_GLOBAL_PER_DAY", "LIVE_WHATSAPP_PER_DAY", "LLM_TIMEOUT_MS",
  ];
  const extra: Record<string, string> = { IP_HASH_SALT: randomBytes(16).toString("hex") };
  if (process.argv[3]) extra.APP_BASE_URL = process.argv[3];
  const entries = [...names.map((n) => [n, process.env[n] ?? ""] as const), ...Object.entries(extra)].filter(([, v]) => v);
  for (const [name, value] of entries) {
    run(["env", "rm", name, "production", "--yes"]);
    const r = run(["env", "add", name, "production"], value);
    console.log(`${r.ok ? "✓" : "✗"} ${name}${r.ok ? "" : ` — ${r.out.trim().split("\n").slice(-2).join(" ").slice(0, 200)}`}`);
  }
}

if (step === "deploy") {
  const r = run(["deploy", "--prod", "--yes"]);
  const lines = r.out.split("\n");
  console.log(r.ok ? "deploy ok" : "deploy FAILED");
  console.log(lines.filter((l) => /https:\/\/|Error|error|Production|Aliased|Ready/i.test(l)).slice(-15).join("\n"));
  if (!r.ok) console.log(r.out.slice(-3000));
}
