import { describe, expect, it } from 'vitest';
import { reciprocalRankFusion, relevantSemantic } from './search';

describe('reciprocalRankFusion', () => {
  it('rewards items that rank well in both lists', () => {
    const fused = reciprocalRankFusion([
      {
        items: [
          { id: 'a', score: 9 },
          { id: 'b', score: 5 },
        ],
      },
      {
        items: [
          { id: 'b', score: 0.9 },
          { id: 'c', score: 0.8 },
        ],
      },
    ]);
    expect(fused.map((r) => r.id)).toEqual(['b', 'a', 'c']);
  });

  it('lets a lighter-weighted list break ties without overruling the main one', () => {
    const fused = reciprocalRankFusion([
      { items: [{ id: 'chana', score: 1 }] },
      { items: [{ id: 'cookies', score: 0.4 }], weight: 0.6 },
    ]);
    expect(fused[0]!.id).toBe('chana');
  });
});

describe('relevantSemantic', () => {
  it('drops matches far below the best one even when they clear the absolute floor', () => {
    const kept = relevantSemantic([
      { id: 'crocin', score: 0.3 },
      { id: 'vicks', score: 0.28 },
      { id: 'noodles', score: 0.23 },
    ]);
    expect(kept.map((r) => r.id)).toEqual(['crocin', 'vicks']);
  });

  it('applies the absolute floor when everything is weak', () => {
    expect(relevantSemantic([{ id: 'x', score: 0.2 }])).toEqual([]);
  });
});
