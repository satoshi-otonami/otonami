import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

// AI生成系（重い処理、Claude API課金大）
export const pitchRatelimit = {
  perMinute: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 m'), prefix: 'rl:pitch:m' }),
  perHour: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '1 h'), prefix: 'rl:pitch:h' }),
  perDay: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(100, '1 d'), prefix: 'rl:pitch:d' }),
};

// ピッチ翻訳（生成と同じ重さ）
export const translateRatelimit = {
  perMinute: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 m'), prefix: 'rl:translate:m' }),
  perHour: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '1 h'), prefix: 'rl:translate:h' }),
  perDay: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(100, '1 d'), prefix: 'rl:translate:d' }),
};

// ピッチ送信（メール送信＋Claude Haiku翻訳）
export const pitchSubmitRatelimit = {
  perMinute: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '1 m'), prefix: 'rl:pitches:m' }),
  perHour: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 h'), prefix: 'rl:pitches:h' }),
  perDay: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '1 d'), prefix: 'rl:pitches:d' }),
};

// 楽曲分析（RapidAPI課金）
export const trackAnalyzeRatelimit = {
  perMinute: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 m'), prefix: 'rl:track:m' }),
  perHour: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '1 h'), prefix: 'rl:track:h' }),
  perDay: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(100, '1 d'), prefix: 'rl:track:d' }),
};

// プロモ生成（Claude + Placid）
export const promoRatelimit = {
  perMinute: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '1 m'), prefix: 'rl:promo:m' }),
  perHour: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '1 h'), prefix: 'rl:promo:h' }),
  perDay: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(50, '1 d'), prefix: 'rl:promo:d' }),
};

/**
 * レート制限を3層で連続チェック。1つでも超過したら success: false を返す。
 */
export async function checkRatelimit(ratelimit, identifier) {
  const checks = [
    { limit: ratelimit.perMinute, label: '1分あたり' },
    { limit: ratelimit.perHour, label: '1時間あたり' },
    { limit: ratelimit.perDay, label: '1日あたり' },
  ];

  for (const { limit, label } of checks) {
    const result = await limit.limit(identifier);
    if (!result.success) {
      const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
      return {
        success: false,
        error: `レート制限を超過しました（${label}）`,
        retryAfter,
      };
    }
  }

  return { success: true };
}

export function getClientIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
