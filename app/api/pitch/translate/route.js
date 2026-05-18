import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { translateRatelimit, checkRatelimit } from '@/lib/ratelimit';
import { INPUT_LIMITS, validateLength } from '@/lib/validate-input';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });

export async function POST(request) {
  try {
    const payload = await verifyToken(request);
    if (!payload || payload.role !== 'artist') {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'ログインが必要です' },
        { status: 401 }
      );
    }

    const rl = await checkRatelimit(translateRatelimit, `artist:${payload.artistId}`);
    if (!rl.success) {
      return NextResponse.json(
        { error: 'RateLimitExceeded', message: rl.error, retryAfter: rl.retryAfter },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      );
    }

    const { text, reverse } = await request.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: 'text required' }, { status: 400 });
    }

    const lengthError = validateLength(text, INPUT_LIMITS.TRANSLATE_TEXT, '翻訳テキスト');
    if (lengthError) {
      return NextResponse.json({ error: 'InputTooLong', message: lengthError }, { status: 413 });
    }

    // IMPORTANT: `[Curator Name]` is a substitution placeholder. Translating it
    // (e.g. to `[キュレーター名]`) breaks the frontend's per-recipient name
    // substitution at send time. Keep it verbatim in both directions.
    const placeholderRule = '\n\n重要: 文中に登場する `[Curator Name]` というプレースホルダー（角括弧含む）は絶対に翻訳・変更せず、英語のまま `[Curator Name]` として出力してください。日本語版で既に `[キュレーター名]` などに翻訳されている場合も、必ず `[Curator Name]` に統一してください。';

    // EN→JA voice preservation: prevent the model from formalizing bold/casual
    // artist voice into polite-corporate Japanese ("狙う"→"評価を目指す",
    // "お元気ですか?"→消失). The aim is to mirror the English's actual tone in
    // Japanese, not to PR-polish it.
    const jaVoiceRule = `

VOICE PRESERVATION（重要・トーンを婉曲化しないこと）:
英語のピッチを日本語に訳す際、アーティスト本人の声と意図を保ってください。「プロフェッショナル」を理由に婉曲化・敬体への過剰寄せをしないこと。

1. 直球の野心は直球のまま訳す:
   • "aiming for a Grammy" / "going after a Grammy" / "have our sights set on a Grammy" → 「グラミー賞を狙っています」（✗ NOT「グラミー賞での評価を目指しています」「グラミー賞での認知を求めています」）
   • "we're after X" → 「Xを狙っています」「Xを獲りに行きます」（✗ NOT「Xを目指しています」だけ）

2. カジュアルな挨拶はカジュアルなまま訳す:
   • "Hope you're doing well" / "Hope this finds you well" → 「お元気ですか？」「お元気でいらっしゃいますか？」（✗ NOT 省略、✗ NOT「いつもお世話になっております」）
   • "How are you?" → 「お元気ですか？」（✗ NOT 省略）

3. 直接的な誘いは直接的なまま訳す:
   • "would love for you to give it a listen" / "please give it a listen" / "I'd love for you to hear it" → 「ぜひ聞いてみてください」「ぜひ一度聴いてみてください」（✗ NOT「お聴きいただければ幸いです」「ご検討いただけますと幸いです」）

4. アーティストの声 ≠ PR担当者の声: 訳文はアーティスト本人が語っているように読めること。形式的・他人事のトーンに寄せないこと。プロフェッショナルさは堅苦しさではなく、具体性と誠実さで作るものです。`;

    // JA→EN voice preservation: same principle in reverse. Bold Japanese stays
    // bold in English; casual greetings/invitations stay casual.
    const enVoiceRule = `

VOICE PRESERVATION (CRITICAL — do not soften):
When translating the Japanese pitch to English, preserve the artist's actual voice and ambition. Do NOT formalize or PR-polish away bold claims, casual greetings, or direct invitations.

1. Bold ambition stays bold:
   • 「狙っています」 / 「狙う」 → "aiming for" / "going after" / "have our sights set on" / "we're after"
     ✗ NOT "seeking recognition" / "hoping for" / "setting our sights on … recognition" / "pursuing acknowledgement"

2. Casual greetings stay casual:
   • 「お元気ですか？」 / 「お元気でいらっしゃいますか？」 → "Hope you're doing well" / "How are you?" / "Hope this finds you well"
     ✗ NOT omit, ✗ NOT replace with "I hope this email finds you well" (banned phrase)

3. Direct invitations stay direct:
   • 「ぜひ聞いてみてください」 / 「ぜひ一度聴いてください」 → "would love for you to give it a listen" / "please give it a listen" / "I'd really love for you to hear it"
     ✗ NOT "please consider for your playlist" / "we hope you'll find time to listen"

4. The pitch is the artist's voice through a translator, not a PR rewrite. The artist's first-person ambition and warmth must survive into English. "Professional" means specific and authentic, not formal-corporate.`;

    const prompt = reverse
      ? `以下の日本語の音楽ピッチメールを、プロフェッショナルで自然な英語に翻訳してください。音楽業界の慣例に沿った表現を使い、カジュアルすぎず堅すぎないトーンにしてください。ただし、アーティスト本人の声・野心・カジュアルな挨拶は保ってください（詳細は下記 VOICE PRESERVATION 参照）。Subject行がある場合はそのまま英語で出力してください。翻訳のみ出力し、説明は不要です。${placeholderRule}${enVoiceRule}\n\n${text}`
      : `以下の英語の音楽ピッチメールを自然な日本語に翻訳してください。音楽業界の用語は適切に訳し、メールとしての丁寧さを保ってください。ただし、アーティスト本人の直球の野心・カジュアルな挨拶・直接的な誘いは婉曲化せず、そのままのトーンで訳してください（詳細は下記 VOICE PRESERVATION 参照）。Subject行がある場合は「件名:」として日本語で出力してください。翻訳のみ出力し、説明は不要です。${placeholderRule}${jaVoiceRule}\n\n${text}`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    const translated = message.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n');

    return NextResponse.json({ translated });
  } catch (error) {
    console.error('Translate error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
