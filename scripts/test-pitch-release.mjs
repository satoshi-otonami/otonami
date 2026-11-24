// Unit tests for lib/pitch-release.js (no network, no DB).
// Run: node --test scripts/test-pitch-release.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RECENT_DAYS,
  todayJst,
  releaseStatus,
  releasePromptBlock,
  openerRule,
  OPENER_EXAMPLES,
  findReleaseClaims,
  firstBodySentence,
  neutralizeReleaseClaims,
} from '../lib/pitch-release.js';

const TODAY = '2026-11-23';

test('todayJst rolls over at 15:00 UTC', () => {
  assert.equal(todayJst(new Date('2026-11-23T14:59:00Z')), '2026-11-23');
  assert.equal(todayJst(new Date('2026-11-23T15:00:00Z')), '2026-11-24');
});

test('releaseStatus: four classes and the 90-day boundary', () => {
  assert.equal(RECENT_DAYS, 90);
  assert.equal(releaseStatus(null, TODAY).cls, 'UNKNOWN');
  assert.equal(releaseStatus('', TODAY).cls, 'UNKNOWN');
  assert.equal(releaseStatus('not-a-date', TODAY).cls, 'UNKNOWN');
  assert.equal(releaseStatus('2026-12-01', TODAY).cls, 'UPCOMING');
  assert.equal(releaseStatus('2026-11-23', TODAY).cls, 'RECENT');
  assert.equal(releaseStatus('2026-08-25', TODAY).cls, 'RECENT'); // 90 days
  assert.equal(releaseStatus('2026-08-24', TODAY).cls, 'OLDER'); // 91 days
  assert.equal(releaseStatus('2012-07-27', TODAY).cls, 'OLDER');
  // the real cases: Happy Days 93 days on 10/4, lofi Delly 144 days on 10/27
  assert.equal(releaseStatus('2026-07-03', '2026-10-04').cls, 'OLDER');
  assert.equal(releaseStatus('2026-06-05', '2026-10-27').cls, 'OLDER');
});

test('prompt block: older/unknown ban new+latest and any age wording; recent bans only latest', () => {
  const older = releasePromptBlock('風の中を…', releaseStatus('2012-07-27', TODAY), TODAY);
  assert.match(older, /not a new release/);
  assert.match(older, /"latest"/);
  assert.match(older, /no release year/);
  assert.match(older, /"from my catalog"/);
  assert.doesNotMatch(older, /2012/); // the year itself is never handed to the model
  const unknown = releasePromptBlock('x', releaseStatus(null, TODAY), TODAY);
  assert.match(unknown, /unknown/);
  assert.match(unknown, /"new"/);
  const recent = releasePromptBlock('Hello, World', releaseStatus('2026-11-06', TODAY), TODAY);
  assert.match(recent, /may call it "new"/);
  assert.match(recent, /Do NOT call it "latest"/);
  const upcoming = releasePromptBlock('y', releaseStatus('2026-12-05', TODAY), TODAY);
  assert.match(upcoming, /scheduled for release on 2026-12-05/);
});

test('opener rule: three examples and a do-not-copy instruction, no "new track"', () => {
  const r = openerRule();
  assert.equal(OPENER_EXAMPLES.length, 3);
  for (const ex of OPENER_EXAMPLES) assert.ok(r.includes(ex));
  assert.match(r, /do NOT copy any of them word for word/);
  assert.doesNotMatch(r, /new track/i);
});

const OLDER = { cls: 'OLDER' };
const RECENT = { cls: 'RECENT' };

test('findReleaseClaims catches the four real wrong sentences', () => {
  const cases = [
    'My new track, "風の中を…", carries that same gentle, nostalgic warmth that runs through everything I create.',
    "I'm reaching out from Japan to share my latest lo-fi release, \"悲しみがとまらない - lofi.\"",
    "I'm reaching out from Japan to share my new instrumental track, which I built around a vivid image.",
    'I wanted to share my new single, a track that blends mid-tempo synthwave with J-Pop to capture the ache of summer\'s end.',
  ];
  for (const c of cases) assert.equal(findReleaseClaims(`Hi [Curator Name],\n\n${c}`, OLDER).length, 1, c);
});

test('findReleaseClaims catches age wording for older tracks', () => {
  for (const c of [
    'I\'m reaching out from Japan to share a piece from my catalog, "風の中を…", released back in 2012.',
    'I\'d love to share one of my songs with you, "Yurikago no Uta," originally released back in 2009.',
    'I\'m reaching out from Japan to share a track of mine, "Kanashimi ga Tomaranai - lofi," from 2026.',
  ]) assert.equal(findReleaseClaims(c, OLDER).length, 1, c);
});

test('findReleaseClaims ignores "new" that is not about the track', () => {
  for (const c of [
    'My Relaxing Piano series reimagines J-Pop and anime themes with gentle new arrangements.',
    'It lets the original melody breathe in a new light.',
    'Breathing new life into beloved themes.',
    "I'm reaching out from Japan to share a track of mine, \"風の中を…\".",
    'Subject: Dreamy Healing Music from Japan',
    'Hi [Curator Name],',
  ]) assert.deepEqual(findReleaseClaims(c, OLDER), [], c);
});

test('RECENT: "new" is fine, "latest" is not', () => {
  assert.deepEqual(findReleaseClaims('I\'d love to share my new single, "Hello, World".', RECENT), []);
  assert.equal(findReleaseClaims('I\'d love to share my latest single, "Hello, World".', RECENT).length, 1);
  assert.equal(findReleaseClaims('We\'d love to share our latest work with you.', RECENT).length, 1);
});

test('neutralize: replaces the opening with the fixed opener and drops other offending sentences whole', () => {
  const pitch = [
    'Subject: Healing Piano from Japan',
    '',
    'Hi [Curator Name],',
    '',
    'I\'m reaching out from Japan to share my new track, "風の中を…". It carries a gentle, nostalgic warmth.',
    '',
    'My new track was written for quiet evenings. I hope you enjoy it.',
    '',
    'Makiko Hirohashi',
    'via OTONAMI',
  ].join('\n');
  const claims = findReleaseClaims(pitch, OLDER);
  assert.equal(claims.length, 2);
  assert.equal(firstBodySentence(pitch), claims[0]);
  const out = neutralizeReleaseClaims(pitch, claims, '風の中を…');
  assert.match(out, /^Subject: Healing Piano from Japan/);
  assert.match(out, /Hi \[Curator Name\],/);
  assert.ok(out.includes('I\'d like to share a track of mine, "風の中を…".'));
  assert.ok(!/from Japan/.test(out.split('\n').slice(2).join('\n')));
  assert.ok(out.includes('It carries a gentle, nostalgic warmth.'));
  assert.ok(out.includes('I hope you enjoy it.'));
  assert.ok(!/new track/i.test(out));
  assert.deepEqual(findReleaseClaims(out, OLDER), []);
  assert.match(out, /Makiko Hirohashi\nvia OTONAMI$/);
});

test('neutralize: an offending sentence later in the body still yields the fixed opener', () => {
  const pitch = 'Hi [Curator Name],\n\nI write healing piano music.\n\nMy latest release is "X". Thanks for listening.';
  const out = neutralizeReleaseClaims(pitch, findReleaseClaims(pitch, OLDER), 'X');
  assert.match(out, /^Hi \[Curator Name\],\n\nI'd like to share a track of mine, "X"\./);
  assert.ok(!/latest/i.test(out));
  assert.ok(out.includes('Thanks for listening.'));
});
