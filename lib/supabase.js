import { createClient } from '@supabase/supabase-js';

// Next.js 14 の Data Cache が Supabase 内部の fetch をキャッシュしないようにする
const noCache = {
  global: {
    fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }),
  },
};

// Storage 専用の anon クライアント。
//
// 2026-09-20 以前はこのクライアントがテーブルも読んでいた（lib/db.js の
// loadCurators / loadPitches ほか）。公開 anon キーは誰でも取得できるため、
// `curators` / `pitches` の RLS が `SELECT USING (true)` である限り、それは
// 全行を世界に公開しているのと同じだった。テーブルアクセスはすべて
// Route Handler（service role + JWT）へ移設済みで、ここに残るのは
// avatars バケットへの画像アップロード／公開URL生成だけ。
//
// `supabase` ではなく `supabaseStorage` という名前にしてあるのは、
// 「.from('table') を生やせばまた動いてしまう」誘惑を断つため。
// テーブルを読み書きしたくなったら getServiceSupabase() をサーバー側で使うこと。
export const supabaseStorage = createClient(
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
