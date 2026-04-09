import { createClient } from '@supabase/supabase-js';

// Next.js 14 の Data Cache が Supabase 内部の fetch をキャッシュしないようにする
const noCache = {
  global: {
    fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }),
  },
};

// フォールバック値でビルド時のクラッシュを防ぐ（実行時は環境変数が必ず存在する）
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key',
  noCache
);

export function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-service-key',
    noCache
  );
}
