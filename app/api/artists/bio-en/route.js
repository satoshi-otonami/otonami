import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';
import { translateRatelimit, checkRatelimit } from '@/lib/ratelimit';
import { translateBioToEnglish } from '@/lib/translate-en';

// POST /api/artists/bio-en — 「日本語から作り直す」 on the profile editor.
// Translates the Japanese bio in the request (the editor's current text, which
// may not be saved yet) the same way a profile save does, and returns the
// English. Nothing is written: the artist reviews it and saves the form.
export async function POST(request) {
  try {
    const payload = await verifyToken(request);
    if (!payload || payload.role !== 'artist') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const rl = await checkRatelimit(translateRatelimit, `artist:${payload.artistId}`);
    if (!rl.success) {
      return NextResponse.json({ error: rl.error }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
    }
    const { bio } = await request.json();
    const text = typeof bio === 'string' ? bio.trim() : '';
    if (!text) return NextResponse.json({ error: '日本語の自己紹介が空です' }, { status: 400 });
    if (text.length > 1000) return NextResponse.json({ error: '自己紹介は1000文字以内です' }, { status: 413 });

    const { data: artist } = await getServiceSupabase()
      .from('artists')
      .select('name, name_en, label_name')
      .eq('id', payload.artistId)
      .maybeSingle();
    const bioEn = await translateBioToEnglish(text, {
      name: artist?.name,
      nameEn: artist?.name_en,
      labelName: artist?.label_name,
    });
    // null: no Japanese in the text (it is used as is), or the translation failed.
    return NextResponse.json({ bio_en: bioEn ?? (/[぀-ゟ゠-ヿ一-龯]/.test(text) ? null : text) });
  } catch (e) {
    console.error('bio-en translate error:', e?.message);
    return NextResponse.json({ error: '翻訳に失敗しました' }, { status: 500 });
  }
}
