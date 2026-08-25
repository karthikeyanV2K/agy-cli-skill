import { spawn, spawnSync } from 'node:child_process';
import { computeTaskComplexity, type TaskComplexityTier } from '../state-machine/budget.js';

/**
 * LLM Provider Layer
 * Any Oz-compatible / Gemini-compatible model can be plugged in here.
 */

export interface LLMRequest {
  system: string;
  user: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /**
   * Extended-thinking token budget (long reasoning).
   * Higher = deeper multi-step reasoning before answering.
   */
  thinkingBudget?: number;
}

export interface LLMResponse {
  text: string;
  model: string;
  usage?: { inputTokens?: number; outputTokens?: number };
}

export interface LLMProvider {
  complete(request: LLMRequest): Promise<LLMResponse>;
}

/**
 * Model routing per complexity tier - hard tasks get stronger models.
 * Override any tier with AGY_MODEL_<TIER> env var.
 */
export const TIER_MODELS: Record<TaskComplexityTier, string> = {
  MINIMAL: process.env.AGY_MODEL_MINIMAL ?? 'gemini-2.5-flash-lite',
  STANDARD: process.env.AGY_MODEL_STANDARD ?? 'gemini-3-flash',
  COMPLEX: process.env.AGY_MODEL_COMPLEX ?? 'gemini-3.5-flash',
  EXTREME: process.env.AGY_MODEL_EXTREME ?? 'gemini-3.1-pro',
};

export function modelForTask(taskType: string, gapsCount = 0, affectedFilesCount = 0): string {
  const tier = computeTaskComplexity(taskType, gapsCount, affectedFilesCount);
  return TIER_MODELS[tier];
}

/**
 * Google Gemini provider (REST API).
 * Requires GEMINI_API_KEY (or AGY_GEMINI_API_KEY) env var.
 */
export class GeminiProvider implements LLMProvider {
  private readonly apiKey: string;
  private readonly defaultModel: string;

  constructor(apiKey: string, defaultModel?: string) {
    this.apiKey = apiKey;
    this.defaultModel = defaultModel ?? process.env.AGY_MODEL ?? TIER_MODELS.STANDARD;
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const model = request.model ?? this.defaultModel;

    const body: Record<string, unknown> = {
      systemInstruction: { parts: [{ text: request.system }] },
      contents: [{ role: 'user', parts: [{ text: request.user }] }],
      generationConfig: {
        temperature: request.temperature ?? 0.2,
        maxOutputTokens: request.maxTokens ?? 16384,
        ...(request.thinkingBudget
          ? { thinkingConfig: { thinkingBudget: request.thinkingBudget } }
          : {}),
      },
    };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Gemini API error ${res.status}: ${detail.slice(0, 500)}`);
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };

    const text =
      data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? '')
        .join('') ?? '';

    return {
      text,
      model,
      usage: {
        inputTokens: data.usageMetadata?.promptTokenCount,
        outputTokens: data.usageMetadata?.candidatesTokenCount,
      },
    };
  }
}

/**
 * Gemini CLI provider - shells out to the locally installed `gemini` CLI.
 * No API key required; reuses whatever auth the host Antigravity/Gemini CLI has.
 */
export class GeminiCLIProvider implements LLMProvider {
  private readonly defaultModel: string;
  private readonly cliPath: string;

  constructor(defaultModel?: string, cliPath = 'gemini') {
    this.defaultModel = defaultModel ?? process.env.AGY_MODEL ?? TIER_MODELS.STANDARD;
    this.cliPath = cliPath;
  }

  /** Returns true when the gemini CLI is available on PATH */
  static isAvailable(cliPath = 'gemini'): boolean {
    try {
      const res = spawnSync(cliPath, ['--version'], {
        timeout: 10_000,
        windowsHide: true,
        shell: process.platform === 'win32',
      });
      return !res.error && res.status === 0;
    } catch {
      return false;
    }
  }

  complete(request: LLMRequest): Promise<LLMResponse> {
    const model = request.model ?? this.defaultModel;
    // CLI has no system-prompt flag - fuse system + user into one prompt
    const prompt = `${request.system}\n\n---\n\n${request.user}`;

    return new Promise((resolve, reject) => {
      const args = ['-m', model, '-p', prompt];
      const child = spawn(this.cliPath, args, {
        shell: process.platform === 'win32',
        windowsHide: true,
      });

      let stdout = '';
      let stderr = '';
      const timer = setTimeout(() => child.kill('SIGKILL'), 600_000);

      child.stdout.on('data', (d) => (stdout += d.toString()));
      child.stderr.on('data', (d) => (stderr += d.toString()));
      child.on('error', (err) => {
        clearTimeout(timer);
        reject(new Error(`gemini CLI failed to start: ${err.message}`));
      });
      child.on('close', (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          reject(new Error(`gemini CLI exited ${code}: ${stderr.slice(0, 500)}`));
          return;
        }
        resolve({ text: stdout, model });
      });
    });
  }
}

/**
 * Creates a provider from environment variables.
 * Priority: REST API key > local gemini CLI. Returns null when neither is
 * available (caller falls back to mock mode).
 */
export function createProviderFromEnv(): LLMProvider | null {
  const key = process.env.AGY_GEMINI_API_KEY ?? process.env.GEMINI_API_KEY;
  if (key) return new GeminiProvider(key);

  // No REST key - try the local gemini CLI (reuses host Antigravity auth)
  if (GeminiCLIProvider.isAvailable()) return new GeminiCLIProvider();
  return null;
}
