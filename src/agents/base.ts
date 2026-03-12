/**
 * BaseAgent — shared foundation for every agent in the pipeline.
 *
 * Provides:
 *   • Real Azure OpenAI (or OpenAI fallback) LLM calls
 *   • JSON-mode + Zod schema validation on every response
 *   • Exponential back-off retry logic
 *   • Vision (image) support
 *   • Consistent tracing / logging
 */
import OpenAI, { AzureOpenAI } from 'openai';
import { z } from 'zod';
import { logger } from '../utils/logger';

export interface AgentConfig {
  name: string;
  role: string;
}

export type ProgressCallback = (step: string, pct: number, detail?: string) => void;

export interface AgentCallResult<T> {
  data: T;
  rawResponse: string;
  modelUsed: string;
  promptTokens: number;
  completionTokens: number;
  durationMs: number;
  retries: number;
}

export abstract class BaseAgent {
  protected readonly config: AgentConfig;
  private readonly client: AzureOpenAI | OpenAI;
  private readonly model: string;
  protected readonly maxTokens: number;
  private readonly maxRetries: number;
  private readonly retryBaseDelay: number;

  constructor(config: AgentConfig) {
    this.config = config;
    this.maxTokens  = parseInt(process.env.AGENT_MAX_TOKENS          || '4000');
    this.maxRetries = parseInt(process.env.AGENT_MAX_RETRIES         || '3');
    this.retryBaseDelay = parseInt(process.env.AGENT_RETRY_BASE_DELAY_MS || '1000');

    if (process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY) {
      this.client = new AzureOpenAI({
        endpoint:   process.env.AZURE_OPENAI_ENDPOINT,
        apiKey:     process.env.AZURE_OPENAI_API_KEY,
        apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-01',
        deployment: process.env.AZURE_OPENAI_DEPLOYMENT  || 'gpt-4o',
      });
      this.model = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o';
    } else {
      this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      this.model = process.env.OPENAI_MODEL || 'gpt-4o';
    }
  }

  /**
   * Call the LLM with a system prompt + user content, validate response
   * against a Zod schema, retry on transient errors.
   */
  protected async callLLM<T>(
    systemPrompt: string,
    userContent:  string | OpenAI.ChatCompletionContentPart[],
    schema:       z.ZodType<T>,
    traceId:      string,
    onProgress?:  ProgressCallback,
  ): Promise<AgentCallResult<T>> {
    const start   = Date.now();
    let attempt   = 0;
    let lastError: Error | null = null;

    while (attempt <= this.maxRetries) {
      try {
        if (attempt > 0) {
          const delay = this.retryBaseDelay * Math.pow(2, attempt - 1);
          logger.warn(`${this.config.name}: retry ${attempt}/${this.maxRetries} in ${delay}ms`, { traceId });
          await new Promise(r => setTimeout(r, delay));
        }

        onProgress?.('calling-llm', 15 + attempt * 5, `${this.config.name} is thinking...`);

        const messages: OpenAI.ChatCompletionMessageParam[] = [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: typeof userContent === 'string'
              ? userContent
              : userContent as OpenAI.ChatCompletionContentPart[],
          },
        ];

        const response = await (this.client as OpenAI).chat.completions.create({
          model:           this.model,
          messages,
          max_tokens:      this.maxTokens,
          temperature:     0.1,
          response_format: { type: 'json_object' },
        });

        const raw   = response.choices[0]?.message?.content ?? '{}';
        const usage = response.usage;

        onProgress?.('validating', 80, `${this.config.name} validating output...`);

        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          throw new Error(`${this.config.name}: LLM returned non-JSON:\n${raw.substring(0, 300)}`);
        }

        const validated = schema.safeParse(parsed);
        if (!validated.success) {
          const issues = validated.error.issues
            .map(i => `${i.path.join('.')}: ${i.message}`)
            .join('; ');
          throw new Error(`${this.config.name}: schema validation failed — ${issues}`);
        }

        logger.info(`${this.config.name}: LLM call succeeded`, {
          traceId, attempt,
          durationMs:       Date.now() - start,
          promptTokens:     usage?.prompt_tokens     ?? 0,
          completionTokens: usage?.completion_tokens ?? 0,
        });

        return {
          data:             validated.data,
          rawResponse:      raw,
          modelUsed:        response.model,
          promptTokens:     usage?.prompt_tokens     ?? 0,
          completionTokens: usage?.completion_tokens ?? 0,
          durationMs:       Date.now() - start,
          retries:          attempt,
        };

      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        logger.warn(`${this.config.name}: attempt ${attempt} failed — ${lastError.message}`, { traceId });
        attempt++;
      }
    }

    throw new Error(
      `${this.config.name}: all ${this.maxRetries + 1} attempts exhausted. ` +
      `Last error: ${lastError?.message}`,
    );
  }

  /** Build a vision-enabled user message (image + text) */
  protected buildVisionContent(
    base64Png:  string,
    textPrompt: string,
  ): OpenAI.ChatCompletionContentPart[] {
    return [
      {
        type:      'image_url',
        image_url: { url: `data:image/png;base64,${base64Png}`, detail: 'high' },
      },
      { type: 'text', text: textPrompt },
    ];
  }
}
