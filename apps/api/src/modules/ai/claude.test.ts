import { describe, expect, it } from 'vitest';
import { readsPdf } from './claude';

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
