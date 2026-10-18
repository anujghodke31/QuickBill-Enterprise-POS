import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env';
import { AppError, serviceUnavailable } from '../../lib/errors';

export const MODEL = env.ANTHROPIC_MODEL;

/**
 * Anthropic-compatible gateways (such as CallMissed) accept images but not PDF
 * documents, so PDF bills are only offered when talking to Anthropic directly.
 */
export function readsPdf(baseUrl: string | undefined): boolean {
  if (!baseUrl) return true;
  try {
    return /(^|\.)anthropic\.com$/.test(new URL(baseUrl).hostname);
  } catch {
    return false;
  }
}

export const PDF_INPUT = readsPdf(env.ANTHROPIC_BASE_URL);

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

/**
 * Maps SDK errors to a short message that is safe to show in the UI. When the
 * provider refuses a request (a plan, model or account setting), its own reason
 * is passed on: the AI screens are staff-only and that is what needs fixing.
 */
export function describeClaudeError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return 'The Claude API key is invalid.';
  if (err instanceof Anthropic.RateLimitError)
    return 'The AI service is busy. Please try again shortly.';
  if (
    err instanceof Anthropic.BadRequestError ||
    err instanceof Anthropic.PermissionDeniedError ||
    err instanceof Anthropic.NotFoundError
  ) {
    const reason = (err.error as { error?: { message?: unknown } } | undefined)?.error?.message;
    return typeof reason === 'string' && reason
      ? `The AI service rejected the request: ${reason.slice(0, 300)}`
      : 'The AI request was rejected.';
  }
  if (err instanceof Anthropic.APIConnectionError) return 'Could not reach the AI service.';
  if (err instanceof Anthropic.APIError) return 'The AI service returned an error.';
  if (err instanceof AppError) return err.message;
  return 'Something went wrong while talking to the AI service.';
}
