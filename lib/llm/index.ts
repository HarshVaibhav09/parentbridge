import { geminiProvider } from "./gemini";
import { groqProvider } from "./groq";
import { LLMError, type ChatMessage, type LLMProvider, type LLMResult, type ProviderName, type RunOptions, type ToolDef } from "./types";

export * from "./types";

export type Attempt = { provider: ProviderName; model: string; ok: boolean; error?: string; status?: number; ms: number };

/** Per-run router state: once we fall back, stay on the fallback for the rest of the run. */
export type RouterState = { sticky?: ProviderName; attempts: Attempt[] };

export function newRouterState(): RouterState {
  return { attempts: [] };
}

function make(name: ProviderName): LLMProvider {
  return name === "groq" ? groqProvider() : geminiProvider();
}

function hasKey(name: ProviderName) {
  return name === "groq" ? !!process.env.GROQ_API_KEY : !!process.env.GEMINI_API_KEY;
}

export function providerChain(state?: RouterState): ProviderName[] {
  const primary = (process.env.LLM_PROVIDER === "groq" ? "groq" : "gemini") as ProviderName;
  const secondary: ProviderName = primary === "gemini" ? "groq" : "gemini";
  let chain = [primary, secondary].filter(hasKey);
  if (state?.sticky && chain.includes(state.sticky)) chain = [state.sticky, ...chain.filter((p) => p !== state.sticky)];
  return chain;
}

export function llmConfigured(): boolean {
  return providerChain().length > 0;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class AllProvidersFailedError extends Error {
  attempts: Attempt[];
  rateLimited: boolean;
  constructor(attempts: Attempt[]) {
    const rateLimited = attempts.length > 0 && attempts.every((a) => a.status === 429);
    super(
      attempts.length
        ? `All AI providers failed: ${attempts.map((a) => `${a.provider} (${a.status ?? "error"}: ${a.error})`).join(" · ")}`
        : "No AI provider is configured (set GEMINI_API_KEY and/or GROQ_API_KEY)."
    );
    this.name = "AllProvidersFailedError";
    this.attempts = attempts;
    this.rateLimited = rateLimited;
  }
}

/**
 * The single LLM entry point: one model turn with tools.
 * Gemini by default; on a retryable error (429/5xx) retry once, then fall back to Groq if GROQ_API_KEY is set.
 */
export async function runWithTools(
  messages: ChatMessage[],
  tools: ToolDef[],
  opts: RunOptions,
  state: RouterState = newRouterState()
): Promise<LLMResult> {
  const chain = providerChain(state);
  const failures: Attempt[] = [];
  for (const name of chain) {
    let provider: LLMProvider;
    try {
      provider = make(name);
    } catch (e) {
      failures.push({ provider: name, model: "", ok: false, error: (e as Error).message, ms: 0 });
      continue;
    }
    for (let attempt = 1; attempt <= 2; attempt++) {
      const t0 = Date.now();
      try {
        const r = await provider.runWithTools(messages, tools, opts);
        state.attempts.push({ provider: name, model: provider.model, ok: true, ms: Date.now() - t0 });
        if (name !== chain[0] || state.sticky) state.sticky = name;
        return r;
      } catch (e) {
        const err = e instanceof LLMError ? e : new LLMError(name, (e as Error).message);
        const a: Attempt = { provider: name, model: provider.model, ok: false, error: err.message, status: err.status, ms: Date.now() - t0 };
        state.attempts.push(a);
        failures.push(a);
        if (opts.signal?.aborted) throw err;
        // Retry once on retryable errors; long server-requested waits go straight to the fallback instead.
        const wait = Math.min(err.retryAfterMs ?? 1500, 4000);
        if (attempt === 1 && err.retryable && (err.retryAfterMs ?? 0) <= 8000) {
          await sleep(wait);
          continue;
        }
        break;
      }
    }
  }
  throw new AllProvidersFailedError(failures);
}

/** Human label for the trace, e.g. "gemini · gemini-2.5-flash". */
export function describeProviders(state: RouterState): { provider: string; model: string } {
  const ok = state.attempts.filter((a) => a.ok);
  const providers = [...new Set(ok.map((a) => a.provider))];
  const models = [...new Set(ok.map((a) => a.model))];
  return { provider: providers.join("→"), model: models.join(", ") };
}
