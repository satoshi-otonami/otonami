const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'https://otonami.io';
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'screenshots');

// キュレーターログイン情報（Satoshi Yamashitaアカウント）
const CURATOR_EMAIL = 'satoshiy339@gmail.com';
const CURATOR_PASSWORD = process.env.CURATOR_PASSWORD || 'YOUR_PASSWORD_HERE';
// ↑ セキュリティのため、実行時に環境変数で渡す:
//   CURATOR_PASSWORD=xxxxx node scripts/take-screenshots.js

async function run() {
  // 出力ディレクトリ作成
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: false,  // ブラウザを表示（デバッグ用、完了後にtrueに変更可）
    defaultViewport: { width: 1280, height: 900 },
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();

  // ── 1. ランディングページ（トップ） ──
  console.log('📸 1/9: Landing Page (Hero)');
  await page.goto(`${BASE_URL}`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(2000);  // アニメーション完了待ち
  await page.screenshot({ path: p('01_lp_hero.png'), fullPage: false });

  // LPをスクロールしてHow It Works等も撮影
  console.log('📸 2/9: Landing Page (Full)');
  await page.screenshot({ path: p('02_lp_full.png'), fullPage: true });

  // ── 2. キュレーターログイン画面 ──
  console.log('📸 3/9: Curator Login');
  await page.goto(`${BASE_URL}/curator`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(2000);
  await page.screenshot({ path: p('03_curator_login.png'), fullPage: false });

  // ── 3. キュレーター登録フォーム（Step 1） ──
  console.log('📸 4/9: Curator Registration Form');
  // 「Join as Curator / 新規登録」タブをクリック
  const registerTab = await page.$x("//button[contains(text(), 'Join') or contains(text(), '新規登録')]");
  if (registerTab.length > 0) {
    await registerTab[0].click();
    await sleep(1000);
  }
  await page.screenshot({ path: p('04_curator_register.png'), fullPage: false });

  // ── 4. キュレーターダッシュボード（ログイン） ──
  console.log('📸 5/9: Curator Dashboard');
  // ログインタブに戻る
  const loginTab = await page.$x("//button[contains(text(), 'Login') or contains(text(), 'ログイン')]");
  if (loginTab.length > 0) {
    await loginTab[0].click();
    await sleep(500);
  }

  // メールアドレス入力
  const emailInputs = await page.$$('input[type="email"], input[placeholder*="email"]');
  if (emailInputs.length > 0) {
    await emailInputs[0].click({ clickCount: 3 });
    await emailInputs[0].type(CURATOR_EMAIL);
  }

  // パスワード入力
  const passwordInputs = await page.$$('input[type="password"]');
  if (passwordInputs.length > 0) {
    await passwordInputs[0].click({ clickCount: 3 });
    await passwordInputs[0].type(CURATOR_PASSWORD);
  }

  // ログインボタンクリック（formのsubmitボタンを優先）
  const submitBtns = await page.$$('button[type="submit"]');
  if (submitBtns.length > 0) {
    await submitBtns[0].click();
  } else {
    const loginBtn = await page.$x("//button[contains(text(), 'Login') or contains(text(), 'ログイン')]");
    if (loginBtn.length > 1) {
      await loginBtn[1].click();  // 2番目のLoginボタン（フォーム内）
    }
  }

  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
  await sleep(3000);
  await page.screenshot({ path: p('05_curator_dashboard.png'), fullPage: false });

  // ダッシュボード全体
  console.log('📸 6/9: Curator Dashboard (Full)');
  await page.screenshot({ path: p('06_curator_dashboard_full.png'), fullPage: true });

  // ── 5. ピッチ詳細画面 ──
  console.log('📸 7/9: Pitch Detail');
  // 「Read / 読む」ボタンを探してクリック
  const readBtn = await page.$x("//button[contains(text(), 'Read') or contains(text(), '読む')]");
  if (readBtn.length > 0) {
    await readBtn[0].click();
    await sleep(2000);
    await page.screenshot({ path: p('07_pitch_detail.png'), fullPage: false });
  } else {
    console.log('  ⚠️  No pitch found — skipping 07_pitch_detail.png');
  }

  // ── 6. アーティスト側（OtonamiApp.jsx）──
  console.log('📸 8/9: Artist Studio');
  await page.goto(`${BASE_URL}/studio`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(3000);
  await page.screenshot({ path: p('08_artist_studio.png'), fullPage: false });

  // アーティスト側の全体
  console.log('📸 9/9: Artist Studio (Full)');
  await page.screenshot({ path: p('09_artist_studio_full.png'), fullPage: true });

  console.log(`\n✅ All screenshots saved to: ${OUTPUT_DIR}`);
  console.log('Files:');
  fs.readdirSync(OUTPUT_DIR)
    .filter(f => f.endsWith('.png'))
    .forEach(f => console.log(`  📷 ${f}`));

  await browser.close();
}

function p(filename) {
  return path.join(OUTPUT_DIR, filename);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
