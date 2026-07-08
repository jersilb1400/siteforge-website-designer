import { UpstreamError } from './errors';

// Minimal Anthropic Messages API client for Workers (fetch-based, no SDK).
// We keep it tiny and dependency-free; the Worker only needs text + JSON
// completions. Model IDs are passed in by callers via src/lib/config.ts.

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface CompleteOptions {
  model: string;
  system?: string;
  messages: Message[];
  maxTokens?: number;
  temperature?: number;
}

export class Anthropic {
  constructor(private readonly apiKey: string) {}

  /** Single-shot text completion. Returns the assistant's concatenated text. */
  async complete(opts: CompleteOptions): Promise<string> {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': API_VERSION,
      },
      body: JSON.stringify({
        model: opts.model,
        system: opts.system,
        messages: opts.messages,
        max_tokens: opts.maxTokens ?? 1024,
        temperature: opts.temperature ?? 0.7,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new UpstreamError(`Anthropic API error (${res.status}).`, body.slice(0, 500));
    }

    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    return (data.content ?? [])
      .filter((b) => b.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text)
      .join('')
      .trim();
  }

  /**
   * Completion constrained to JSON. We instruct the model to return only JSON
   * and prefill the assistant turn with "{" so the response is parseable even
   * without a formal JSON mode. Throws UpstreamError if parsing fails.
   */
  async completeJSON<T = unknown>(opts: CompleteOptions): Promise<T> {
    const messages: Message[] = [
      ...opts.messages,
      { role: 'assistant', content: '{' },
    ];
    const system = [
      opts.system,
      'Respond with a single valid JSON object and nothing else. No markdown, no code fences, no prose.',
    ]
      .filter(Boolean)
      .join('\n\n');

    const text = await this.complete({ ...opts, system, messages });
    const raw = text.startsWith('{') ? text : `{${text}`;
    try {
      return JSON.parse(raw) as T;
    } catch {
      // Best-effort recovery: extract the first {...} span.
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start !== -1 && end > start) {
        try {
          return JSON.parse(raw.slice(start, end + 1)) as T;
        } catch {
          /* fall through */
        }
      }
      throw new UpstreamError('Model did not return valid JSON.', raw.slice(0, 500));
    }
  }
}

/** Construct a client from Env, or throw a clear error if the key is missing. */
export function anthropicFrom(apiKey: string | undefined): Anthropic {
  if (!apiKey) {
    throw new UpstreamError(
      'ANTHROPIC_API_KEY is not configured. Set it in .dev.vars (local) or `wrangler secret put ANTHROPIC_API_KEY` (deployed).',
    );
  }
  return new Anthropic(apiKey);
}
