#!/usr/bin/env node
// Ink Blue Beret Ticket: a manual, dependency-free generator for the
// GitHub Activity snapshot in README.md. It is NOT refreshed automatically.
//
// Refresh the committed snapshot (Node 18+):
//   node scripts/beret-ticket.mjs
// Options:
//   --user <login>   GitHub login (default: Buchi-dev-dzn)
//   --input <file>   read stats JSON from a file instead of the network
//   --out <file>     output path (default: assets/github-activity-ticket.svg)
//   --date <Y-M-D>   snapshot date printed on the ticket (default: today, UTC)
//
// Source: https://streak-stats.demolab.com/?user=<login>&type=json
// Only totalContributions, currentStreak.length and longestStreak.length
// are used. Unusable data aborts without touching the existing snapshot.

import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const COLORS = {
  paper: '#E7EEF7',
  ink: '#24364E',
  accent: '#365C87',
  divider: '#7A92AA',
};

const FONT = "ui-sans-serif, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";

function count(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Unusable stats: ${name} must be a non-negative integer, got ${JSON.stringify(value)}`);
  }
  return value;
}

/** Extract and validate the three numbers the ticket shows. */
export function parseStats(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Unusable stats: expected a JSON object');
  }
  if (typeof data.error === 'string') {
    throw new Error(`Unusable stats: source reported an error: ${data.error}`);
  }
  return {
    total: count(data.totalContributions, 'totalContributions'),
    current: count(data.currentStreak?.length, 'currentStreak.length'),
    longest: count(data.longestStreak?.length, 'longestStreak.length'),
  };
}

export const plural = (n, word) => `${n.toLocaleString('en-US')} ${word}${n === 1 ? '' : 's'}`;

const escapeXml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);

export function renderTicket({ total, current, longest }, { date } = {}) {
  if (date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Invalid --date: ${date}`);
  const totalText = total.toLocaleString('en-US');
  const totalLabel = total === 1 ? 'contribution' : 'contributions';
  const currentText = plural(current, 'day');
  const longestText = plural(longest, 'day');
  const desc = `${plural(total, 'contribution')} in total. Current streak: ${currentText}. Longest streak: ${longestText}.` +
    (date ? ` Snapshot taken ${date}.` : '');
  const W = 560, H = 180, cut = 360; // cut = x of the dashed divider
  // Ticket outline inset by 1px so the 2px stroke is not clipped; notches sit on the divider.
  const a = 1, b = W - 1, c = H - 1, r = 15, n = 12;
  const ticket = `M${a + r} ${a}H${cut - n}A${n} ${n} 0 0 0 ${cut + n} ${a}H${b - r}A${r} ${r} 0 0 1 ${b} ${a + r}V${c - r}A${r} ${r} 0 0 1 ${b - r} ${c}H${cut + n}A${n} ${n} 0 0 0 ${cut - n} ${c}H${a + r}A${r} ${r} 0 0 1 ${a} ${c - r}V${a + r}A${r} ${r} 0 0 1 ${a + r} ${a}Z`;
  const t = (x, y, size, weight, fill, text, extra = '') =>
    `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}"${extra}>${escapeXml(text)}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title desc">
<title id="title">Ink Blue Beret Ticket: GitHub activity</title>
<desc id="desc">${escapeXml(desc)}</desc>
<path d="${ticket}" fill="${COLORS.paper}" stroke="${COLORS.ink}" stroke-width="2"/>
<line x1="${cut}" y1="20" x2="${cut}" y2="${H - 20}" stroke="${COLORS.divider}" stroke-width="2" stroke-dasharray="6 6"/>
<g transform="translate(32 30)">
  <path d="M4 26C4 12 18 4 32 4S60 12 60 24C60 30 52 33 32 33S4 32 4 26Z" fill="${COLORS.accent}" stroke="${COLORS.ink}" stroke-width="2" stroke-linejoin="round"/>
  <path d="M8 30C18 35 46 35 56 29" fill="none" stroke="${COLORS.ink}" stroke-width="2" stroke-linecap="round"/>
  <path d="M32 4V0" stroke="${COLORS.ink}" stroke-width="3" stroke-linecap="round"/>
  <path d="M18 14C22 10 27 9 31 9" fill="none" stroke="${COLORS.paper}" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
</g>
${t(104, 50, 13, 700, COLORS.accent, 'GITHUB ACTIVITY', ' letter-spacing="1.5"')}
${t(104, 68, 12, 400, COLORS.ink, date ? `Snapshot · ${date}` : 'Snapshot')}
${t(32, 136, 52, 800, COLORS.ink, totalText)}
${t(32, 158, 14, 600, COLORS.accent, `total ${totalLabel}`)}
${t(cut + 32, 52, 12, 700, COLORS.accent, 'CURRENT STREAK', ' letter-spacing="1.2"')}
${t(cut + 32, 80, 24, 800, COLORS.ink, currentText)}
<line x1="${cut + 32}" y1="96" x2="${W - 32}" y2="96" stroke="${COLORS.divider}" stroke-width="1" stroke-dasharray="3 4"/>
${t(cut + 32, 122, 12, 700, COLORS.accent, 'LONGEST STREAK', ' letter-spacing="1.2"')}
${t(cut + 32, 150, 24, 800, COLORS.ink, longestText)}
</svg>
`;
}

function parseArgs(argv) {
  const opts = { user: 'Buchi-dev-dzn', out: 'assets/github-activity-ticket.svg', date: new Date().toISOString().slice(0, 10) };
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, '');
    if (!['user', 'input', 'out', 'date'].includes(key) || argv[i + 1] === undefined) {
      throw new Error(`Unknown or incomplete option: ${argv[i]}`);
    }
    opts[key] = argv[i + 1];
  }
  if (!/^[A-Za-z0-9-]{1,39}$/.test(opts.user)) throw new Error(`Invalid --user: ${opts.user}`);
  return opts;
}

async function loadJson(opts) {
  if (opts.input) return JSON.parse(await readFile(opts.input, 'utf8'));
  const url = `https://streak-stats.demolab.com/?user=${encodeURIComponent(opts.user)}&type=json`;
  const res = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`Fetch failed: HTTP ${res.status} from ${url}`);
  return res.json();
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const stats = parseStats(await loadJson(opts));
  await writeFile(opts.out, renderTicket(stats, { date: opts.date }));
  console.log(`Wrote ${opts.out}: total=${stats.total} current=${stats.current} longest=${stats.longest}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
