// Unit tests for lib/pitch-identity.js (no network, no DB).
// Run: node --test scripts/test-pitch-identity.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanName,
  resolveIdentity,
  identityPromptBlock,
  signOffRule,
  applySignOff,
  applyArtistName,
  SIGN_OFF_TOKEN,
  ARTIST_NAME_TOKEN,
} from '../lib/pitch-identity.js';

test('cleanName trims ASCII and full-width spaces', () => {
  assert.equal(cleanName('Purple Dots '), 'Purple Dots');
  assert.equal(cleanName('　佐田はるか　'), '佐田はるか');
  assert.equal(cleanName('MIKA SHINNO　 神野美伽'), 'MIKA SHINNO 神野美伽');
  assert.equal(cleanName(null), '');
});

test('resolveIdentity: registered forms win over the form', () => {
  const alpha = resolveIdentity({ name: 'α波オルゴール', name_en: 'Relaxing Orgel', label_name: 'Della' }, { nameEn: 'Alpha Wave Music Box' });
  assert.deepEqual(alpha, { englishName: 'Relaxing Orgel', signName: 'Relaxing Orgel', japaneseName: 'α波オルゴール', label: 'Della' });
  const reo = resolveIdentity({ name: '鳳レオ', name_en: ' Reo Ootori ', label_name: null }, { nameEn: 'Otori Leo' });
  assert.equal(reo.englishName, 'Reo Ootori');
  assert.equal(reo.signName, 'Reo Ootori');
  const sada = resolveIdentity({ name: '佐田はるか', name_en: null, label_name: null }, { nameEn: 'Haruka Sada' });
  assert.equal(sada.englishName, null);
  assert.equal(sada.signName, '佐田はるか');
  const latin = resolveIdentity({ name: 'Purple Dots ', name_en: null, label_name: '' });
  assert.deepEqual(latin, { englishName: 'Purple Dots', signName: 'Purple Dots', japaneseName: null, label: null });
  // no row (lookup failed) → the form is used
  assert.equal(resolveIdentity(null, { name: 'X', nameEn: 'Ex' }).signName, 'Ex');
});

test('prompt block: copy exactly, label, and the no-English-name case', () => {
  const b = identityPromptBlock(resolveIdentity({ name: 'α波オルゴール', name_en: 'Relaxing Orgel', label_name: 'Della' }));
  assert.match(b, /write exactly "Relaxing Orgel"/);
  assert.match(b, /write exactly "Della"/);
  assert.match(b, /never romanize/);
  const s = identityPromptBlock(resolveIdentity({ name: '佐田はるか' }));
  assert.match(s, /no English form is registered/);
  assert.ok(s.includes(ARTIST_NAME_TOKEN));
  assert.doesNotMatch(s, /佐田はるか/);
  assert.ok(signOffRule().includes(SIGN_OFF_TOKEN));
});

test('applySignOff: token, model-written sign-offs, and none', () => {
  const body = 'Hi [Curator Name],\n\nI make music.\n\nWould love for you to give it a listen.\n\nBest,\n';
  assert.equal(applySignOff(`${body}${SIGN_OFF_TOKEN}`, 'Reo Ootori'), `${body}Reo Ootori\nvia OTONAMI`);
  assert.equal(applySignOff(`${body}Hou Leo via OTONAMI`, 'Reo Ootori'), `${body}Reo Ootori\nvia OTONAMI`);
  assert.equal(applySignOff(`${body}Reo Ohtori\nvia OTONAMI`, 'Reo Ootori'), `${body}Reo Ootori\nvia OTONAMI`);
  assert.equal(applySignOff(`${body}Haruka Sada\n\nvia OTONAMI`, '佐田はるか'), `${body}佐田はるか\nvia OTONAMI`);
  // a closing word is kept; nothing to replace → appended
  assert.equal(applySignOff('Hi,\n\nThanks for listening.', 'Relaxing Orgel'), 'Hi,\n\nThanks for listening.\n\nRelaxing Orgel\nvia OTONAMI');
  // a sentence before "via OTONAMI" is not mistaken for the name line
  assert.equal(applySignOff('Hope you enjoy it.\nvia OTONAMI', 'X'), 'Hope you enjoy it.\nX\nvia OTONAMI');
});

test('applyArtistName fills the EPK token', () => {
  assert.equal(applyArtistName(`${ARTIST_NAME_TOKEN} is a singer. ${ARTIST_NAME_TOKEN} plays drums.`, '佐田はるか'), '佐田はるか is a singer. 佐田はるか plays drums.');
});
