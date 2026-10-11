#!/usr/bin/env node
// 既存データの和訳バックフィル（読み取り→翻訳→該当行のみ更新）
//
//   実行: cd ~/otonami && node scripts/backfill-ja.mjs
//   前提: supabaseに feedback_ja / bio_ja 列が追加済みであること
//        （scripts/ddl-20261011-ja-columns.sql をSQL Editorで実行）
//
// 対象:
//   1. pitches.feedback_message があり feedback_ja が未生成の行
//   2. curators.bio があり bio_ja が未生成の行
// 原文がすでに日本語の行はスキップ（翻訳不要・フォールバック表示で足りる）。
// 依存なし（fetchのみ）。何度実行しても安全（生成済み行は対象外）。

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const envPath = join(process.cwd(), '.env.local');
const env = {};
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#') || !t.includes('=')) continue;
  const i = t.indexOf('=');
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
}

const SUPA = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '');
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_KEY = env.ANTHROPIC_API_KEY;
const MODEL =
  env.ANTHROPIC_MODEL_TRANSLATE_JA || env.ANTHROPIC_MODEL || 'claude-sonnet-5';

const JA_RE = /[぀-ゟ゠-ヿ一-龯]/;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function supa(method, path, body) {
  const res = await fetch(`${SUPA}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      Prefer: method === 'PATCH' ? 'return=minimal' : 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} -> HTTP ${res.status}: ${await res.text()}`);
  return method === 'PATCH' ? null : res.json();
}

async function translate(text) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      thinking: { type: 'disabled' },
      messages: [{
        role: 'user',
        content: `You are a professional translator for the music industry. Translate the following message into natural, polite Japanese for a Japanese independent artist.

STRICT RULES:
1. Preserve artist names, track titles, playlist names, and URLs exactly as-is.
2. Keep the meaning complete — do not omit practical details (file formats, dates, deadlines, requests).
3. Natural Japanese, neither stiff nor overly casual (です・ます調).
4. Return ONLY the Japanese translation. No explanations, no markdown, no quotes.

Message:
${text}`,
      }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
}

async function backfill({ label, listPath, textKey, jaKey, patchPath }) {
  const rows = await supa('GET', listPath);
  console.log(`\n=== ${label}: 対象候補 ${rows.length}件 ===`);
  let done = 0, skipped = 0, failed = 0;
  for (const row of rows) {
    const text = row[textKey];
    if (!text || JA_RE.test(text)) { skipped++; continue; }
    try {
      const ja = await translate(text);
      if (!ja) { failed++; continue; }
      await supa('PATCH', `${patchPath}?id=eq.${encodeURIComponent(row.id)}`, { [jaKey]: ja });
      done++;
      console.log(`  ok: ${row.id} (${String(row.name || row.curator_name || '').slice(0, 30)})`);
    } catch (e) {
      failed++;
      console.warn(`  NG: ${row.id} — ${e.message.slice(0, 160)}`);
    }
    await sleep(700);
  }
  console.log(`  完了 ${done} / 日本語スキップ ${skipped} / 失敗 ${failed}`);
}

console.log(`model=${MODEL}`);

await backfill({
  label: 'pitches.feedback_ja',
  listPath:
    'pitches?feedback_message=not.is.null&feedback_ja=is.null&select=id,curator_name,feedback_message&order=created_at.desc',
  textKey: 'feedback_message',
  jaKey: 'feedback_ja',
  patchPath: 'pitches',
});

await backfill({
  label: 'curators.bio_ja',
  listPath: 'curators?bio=not.is.null&bio_ja=is.null&select=id,name,bio',
  textKey: 'bio',
  jaKey: 'bio_ja',
  patchPath: 'curators',
});

console.log('\nすべて完了。');
