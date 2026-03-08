import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });

export async function POST(request) {
  try {
    const { text, reverse } = await request.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: 'text required' }, { status: 400 });
    }

    const prompt = reverse
      ? `以下の日本語の音楽ピッチメールを、プロフェッショナルで自然な英語に翻訳してください。音楽業界の慣例に沿った表現を使い、カジュアルすぎず堅すぎないトーンにしてください。Subject行がある場合はそのまま英語で出力してください。翻訳のみ出力し、説明は不要です。\n\n${text}`
      : `以下の英語の音楽ピッチメールを自然な日本語に翻訳してください。音楽業界の用語は適切に訳し、メールとしての丁寧さを保ってください。Subject行がある場合は「件名:」として日本語で出力してください。翻訳のみ出力し、説明は不要です。\n\n${text}`;

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
