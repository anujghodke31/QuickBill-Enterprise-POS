import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env';
import { serviceUnavailable } from '../../lib/errors';

export const MODEL = env.ANTHROPIC_MODEL;

let client: Anthropic | undefined;

export function getClaude(): Anthropic {
  if (!env.llmEnabled) {
    throw serviceUnavailable(
      'AI features need a Claude API key. Set ANTHROPIC_API_KEY in apps/api/.env and restart the API.',
    );
  }
  client ??= new Anthropic({ maxRetries: 2 });
  return client;
}

/**
 * Server-side refusal fallback: if the model declines, the API re-runs the
 * request on Anthropic's recommended fallback model within the same call.
 * Supported on the Opus, Sonnet and Fable tiers.
 */
export function fallbackParams(): { betas: Anthropic.Beta.AnthropicBeta[]; fallbacks?: 'default' } {
  return /opus|sonnet|fable/.test(MODEL)
    ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }
    : { betas: [] };
}

/** Maps SDK errors to a short message that is safe to show in the UI. */
export function describeClaudeError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return 'The Claude API key is invalid.';
  if (err instanceof Anthropic.RateLimitError)
    return 'The AI service is busy. Please try again shortly.';
  if (err instanceof Anthropic.BadRequestError) return 'The AI request was rejected.';
  if (err instanceof Anthropic.APIConnectionError) return 'Could not reach the AI service.';
  if (err instanceof Anthropic.APIError) return 'The AI service returned an error.';
  if (err instanceof Error && 'status' in err && err.status === 503) return err.message;
  return 'Something went wrong while talking to the AI service.';
}
