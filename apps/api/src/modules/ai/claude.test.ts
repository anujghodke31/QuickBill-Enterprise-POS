import Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it } from 'vitest';
import { notFound } from '../../lib/errors';
import { describeClaudeError, readsPdf } from './claude';

describe('readsPdf', () => {
  it('reads PDFs when talking to Anthropic directly', () => {
    expect(readsPdf(undefined)).toBe(true);
    expect(readsPdf('')).toBe(true);
    expect(readsPdf('https://api.anthropic.com')).toBe(true);
  });

  it('takes images only through an Anthropic-compatible gateway', () => {
    expect(readsPdf('https://api.callmissed.com')).toBe(false);
    expect(readsPdf('https://anthropic.com.example.net')).toBe(false);
    expect(readsPdf('not a url')).toBe(false);
  });
});

describe('describeClaudeError', () => {
  const refusal = (status: 400 | 403, message?: string) =>
    Anthropic.APIError.generate(
      status,
      { type: 'error', error: { type: 'invalid_request_error', message } },
      undefined,
      new Headers(),
    );

  it("passes on the provider's reason for a refused request", () => {
    expect(describeClaudeError(refusal(403, "Model 'x' requires the Pro plan"))).toBe(
      "The AI service rejected the request: Model 'x' requires the Pro plan",
    );
  });

  it('falls back to a generic message when the provider gives no reason', () => {
    expect(describeClaudeError(refusal(400))).toBe('The AI request was rejected.');
  });

  it("shows the app's own errors as they are", () => {
    expect(describeClaudeError(notFound('Conversation'))).toBe('Conversation not found');
  });
});
