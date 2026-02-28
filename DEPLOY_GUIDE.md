# OTONAMI デプロイメントガイド v2

## 概要
OTONAMIを実サーバーにデプロイし、以下を実現します：
- ✅ AIピッチ生成（Anthropic API — サーバーサイド）
- ✅ キュレーターへの実メール送信（Resend）
- ✅ YouTube/Spotify フォロワー数自動取得
- ✅ クレジットカード決済（Stripe）
- ✅ ユーザー認証・データ永続化（Supabase）

## 月額コスト見積もり（初期）
| サービス | 無料枠 | 超過時 |
|----------|--------|--------|
| Vercel (ホスティング) | 月100GBまで無料 | $20/月〜 |
| Supabase (DB) | 500MB・50K行まで無料 | $25/月〜 |
| Resend (メール) | 月100通まで無料 | $20/月〜 |
| Anthropic API | 従量制 | ~$3/1000ピッチ |
| Stripe | 手数料3.6% | 決済時のみ |
| YouTube API | 10,000リクエスト/日無料 | 無料枠で十分 |
| Spotify API | 無料 | 無料 |

**初期段階の月額: ¥0〜¥3,000程度**（利用量次第）

---

## STEP 1: アカウント作成（5つ + 任意2つ）

### 1-1. Vercel（ホスティング）
1. https://vercel.com にアクセス
2. GitHubアカウントで登録（推奨）
3. Hobbyプラン（無料）を選択

### 1-2. Supabase（データベース）
1. https://supabase.com にアクセス
2. GitHubで登録
3. 「New Project」→ リージョン: **Northeast Asia (Tokyo)** を選択
4. パスワードを設定（メモしておく）
5. 作成後、**Settings → API** から以下をメモ：
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public キー → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role キー → `SUPABASE_SERVICE_ROLE_KEY`

### 1-3. Resend（メール送信）
1. https://resend.com にアクセス
2. 登録 → APIキーを作成
3. 開発段階: `onboarding@resend.dev` から送信可能
4. 本番: 独自ドメイン認証後に `noreply@otonami.jp` 等に変更

### 1-4. Anthropic（AI）
1. https://console.anthropic.com にアクセス
2. APIキーを作成
3. $5のクレジットを購入（1000ピッチ以上生成可能）

### 1-5. Stripe（決済）
1. https://dashboard.stripe.com に登録
2. テストモードで開始（本番切り替えは後で）
3. Developers → API Keys から：
   - `pk_test_xxx` → STRIPE_PUBLISHABLE_KEY
   - `sk_test_xxx` → STRIPE_SECRET_KEY

### 1-6. Google Cloud（YouTube API）— 任意
1. https://console.cloud.google.com
2. 新プロジェクト作成 → 「YouTube Data API v3」を有効化
3. 認証情報 → APIキー作成

### 1-7. Spotify Developer — 任意
1. https://developer.spotify.com/dashboard
2. アプリ作成 → Client ID と Client Secret をメモ

---

## STEP 2: データベースセットアップ
1. Supabase ダッシュボード → **SQL Editor**
2. `supabase/schema.sql` の内容を全てコピー＆ペースト
3. 「▶ Run」をクリック
4. テーブルが作成され、6人のキュレーターがシードされます

---

## STEP 3: コードをGitHubにアップロード
```bash
cd otonami-deploy
git init
git add .
git commit -m "Initial OTONAMI deploy"

# GitHubで新リポジトリ「otonami」を作成後
git remote add origin https://github.com/YOUR_USERNAME/otonami.git
git push -u origin main
```

---

## STEP 4: Vercelにデプロイ
1. https://vercel.com/new にアクセス
2. GitHubリポジトリ「otonami」を選択
3. Framework: **Next.js** (自動検出)
4. **Environment Variables** に以下を全て設定：

```
ANTHROPIC_API_KEY=sk-ant-xxxxx
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=onboarding@resend.dev
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
YOUTUBE_API_KEY=AIzaxxxxx
SPOTIFY_CLIENT_ID=xxxxx
SPOTIFY_CLIENT_SECRET=xxxxx
NEXT_PUBLIC_APP_URL=https://otonami.vercel.app
JWT_SECRET=（ランダムな文字列を生成）
```

5. 「**Deploy**」をクリック
6. 数分で https://otonami.vercel.app でアクセス可能に

---

## STEP 5: ドメイン設定（後でOK）
1. ドメイン取得: `otonami.jp` 等
2. Vercel → Settings → Domains → ドメインを追加
3. DNSレコードを設定（Vercelが指示を表示）

---

## ILCJ展開時のおすすめ手順
1. **テスト環境**: Vercelにデプロイ → 自分でROUTE14bandでテスト送信
2. **β版**: 5-10のレーベルに限定招待 → フィードバック収集
3. **正式リリース**: ドメイン設定 → ILCJ総会で発表 → 全70+レーベルに展開
4. **キュレーター拡大**: 6名 → 50名目標（海外フェスブッカー等も）
