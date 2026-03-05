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

    // 1. curators テーブル確認
    const { data: curators, error: curErr } = await db
      .from('curators')
      .select('id, name, email, type, platform')
      .order('created_at', { ascending: true });

    if (curErr) {
      checks.tables.curators = { ok: false, error: curErr.message };
    } else {
      checks.tables.curators = {
        ok: true,
        count: curators.length,
        names: curators.map((c) => c.name),
      };
    }

    // 2. sessions テーブル確認
    const { count: sessCount, error: sessErr } = await db
      .from('sessions')
      .select('*', { count: 'exact', head: true });

    if (sessErr) {
      checks.tables.sessions = { ok: false, error: sessErr.message };
    } else {
      checks.tables.sessions = { ok: true, count: sessCount };
    }

    // 3. pitches テーブル確認
    const { count: pitchCount, error: pitchErr } = await db
      .from('pitches')
      .select('*', { count: 'exact', head: true });

    if (pitchErr) {
      checks.tables.pitches = { ok: false, error: pitchErr.message };
    } else {
      checks.tables.pitches = { ok: true, count: pitchCount };
    }

    // 4. email_log テーブル確認
    const { count: emailCount, error: emailErr } = await db
      .from('email_log')
      .select('*', { count: 'exact', head: true });

    if (emailErr) {
      checks.tables.email_log = { ok: false, error: emailErr.message };
    } else {
      checks.tables.email_log = { ok: true, count: emailCount };
    }

    // 全テーブルOKならsupabase接続OK
    checks.supabase = Object.values(checks.tables).every((t) => t.ok);

    return NextResponse.json(checks, { status: checks.supabase ? 200 : 500 });
  } catch (error) {
    checks.supabase = false;
    checks.error = error.message;
    return NextResponse.json(checks, { status: 500 });
  }
}
