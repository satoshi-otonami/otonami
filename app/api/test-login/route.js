import { NextResponse } from 'next/server';

// GET /api/test-login — ブラウザでアクセスするだけでログインAPIをテスト
export async function GET(request) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action') || 'info';
  const baseUrl = url.origin;

  // /api/test-login だけでアクセスした場合 → 使い方を表示
  if (action === 'info') {
    return NextResponse.json({
      message: 'Curator Login API Test Page',
      usage: {
        'テスト1: シードキュレーターにパスワード設定': `${baseUrl}/api/test-login?action=set_password&email=patrickstmichel@gmail.com&password=test123`,
        'テスト2: ログインテスト': `${baseUrl}/api/test-login?action=login&email=patrickstmichel@gmail.com&password=test123`,
        'テスト3: 新規キュレーター登録': `${baseUrl}/api/test-login?action=register&name=Test+Curator&email=test@example.com&password=test123&type=playlist`,
      },
      note: '上のURLをブラウザのアドレスバーにコピペしてアクセスしてください',
    });
  }

  // パラメータ取得
  const email = url.searchParams.get('email');
  const password = url.searchParams.get('password');
  const name = url.searchParams.get('name');
  const type = url.searchParams.get('type');

  if (!email || !password) {
    return NextResponse.json({ error: 'email and password are required as URL parameters' }, { status: 400 });
  }

  try {
    // 内部でcurators/login APIを呼ぶ
    const body = { action, email, password };
    if (name) body.name = name;
    if (type) body.type = type;

    const res = await fetch(`${baseUrl}/api/curators/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    return NextResponse.json({
      test: `${action} test`,
      status: res.status,
      success: res.ok,
      result: data,
    });
  } catch (error) {
    return NextResponse.json({
      test: `${action} test`,
      error: error.message,
    }, { status: 500 });
  }
}
