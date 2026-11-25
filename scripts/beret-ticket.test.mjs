// Run: node --test scripts/
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStats, plural, renderTicket } from './beret-ticket.mjs';

const ok = { totalContributions: 1472, currentStreak: { length: 2 }, longestStreak: { length: 20 } };

test('parses the three numbers', () => {
  assert.deepEqual(parseStats(ok), { total: 1472, current: 2, longest: 20 });
});

test('zero and plural wording', () => {
  assert.equal(plural(0, 'day'), '0 days');
  assert.equal(plural(1, 'day'), '1 day');
  assert.equal(plural(2, 'day'), '2 days');
  const zero = renderTicket({ total: 0, current: 0, longest: 0 }, { date: '2026-01-01' });
  assert.match(zero, />0</);
  assert.match(zero, /total contributions</);
  assert.match(zero, />0 days</);
  const one = renderTicket({ total: 1, current: 1, longest: 1 });
  assert.match(one, /total contribution</);
  assert.match(one, />1 day</);
  assert.doesNotMatch(one, /1 days/);
});

test('formats large totals with separators', () => {
  assert.match(renderTicket({ total: 12345, current: 3, longest: 40 }), />12,345</);
});

test('rejects unusable source data', () => {
  for (const bad of [
    null, [], 'x', {},
    { error: 'Could not find user' },
    { ...ok, totalContributions: '1472' },
    { ...ok, totalContributions: -1 },
    { ...ok, totalContributions: 1.5 },
    { ...ok, currentStreak: null },
    { ...ok, longestStreak: { length: NaN } },
  ]) {
    assert.throws(() => parseStats(bad), /Unusable stats/, JSON.stringify(bad));
  }
});

test('rejects malformed dates and escapes text', () => {
  assert.throws(() => renderTicket({ total: 1, current: 1, longest: 1 }, { date: '<x>' }));
  const svg = renderTicket({ total: 5, current: 1, longest: 2 }, { date: '2026-11-25' });
  assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
  assert.doesNotMatch(svg, /<script|href=|on\w+=/i);
});
