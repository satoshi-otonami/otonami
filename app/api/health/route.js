import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

// GET /api/health — Supabase接続 + テーブル状態を確認
export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    supabase: false,
    tables: {},
    env: {
      SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      RESEND_API_KEY: !!process.env.RESEND_API_KEY,
      JWT_SECRET: !!process.env.JWT_SECRET,
    },
  };

  try {
    const db = getServiceSupabase();

    // 1. curators テーブル
    const { data: curators, error: curErr } = await db
      .from('curators')
      .select('id, name, email, type, playlist, url, is_seed')
      .order('name', { ascending: true });

    if (curErr) {
      checks.tables.curators = { ok: false, error: curErr.message };
    } else {
      checks.tables.curators = {
        ok: true,
        count: curators.length,
        seed: curators.filter((c) => c.is_seed).length,
        list: curators.map((c) => `${c.name} (${c.type})`),
      };
    }

    // 2. sessions テーブル
    const { count: sessCount, error: sessErr } = await db
      .from('sessions')
      .select('*', { count: 'exact', head: true });
    checks.tables.sessions = sessErr
      ? { ok: false, error: sessErr.message }
      : { ok: true, count: sessCount };

    // 3. pitches テーブル
    const { count: pitchCount, error: pitchErr } = await db
      .from('pitches')
      .select('*', { count: 'exact', head: true });
    checks.tables.pitches = pitchErr
      ? { ok: false, error: pitchErr.message }
      : { ok: true, count: pitchCount };

    // 4. email_log テーブル
    const { count: emailCount, error: emailErr } = await db
      .from('email_log')
      .select('*', { count: 'exact', head: true });
    checks.tables.email_log = emailErr
      ? { ok: false, error: emailErr.message }
      : { ok: true, count: emailCount };

    checks.supabase = Object.values(checks.tables).every((t) => t.ok);
    return NextResponse.json(checks, { status: checks.supabase ? 200 : 500 });
  } catch (error) {
    checks.supabase = false;
    checks.error = error.message;
    return NextResponse.json(checks, { status: 500 });
  }
}
