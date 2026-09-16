# 起票: `curators` / `pitches` の anon依存剥がし

**優先度: 高** ／ 起票日: 2026-09-16 ／ 着手条件: レーベルアカウント対応（Phase 1〜3）のデプロイ完了後

---

## 運用ルール（厳守）

**遮断SQLの実行は「CCが提示 → 山下さんが SQL Editor で実行」の分離を維持すること。**
CC が DDL / ポリシー変更を直接実行してはならない。本ドキュメント内の SQL はすべて提示用であり、
実行主体は山下さん。検証 SELECT と anon プローブによる実測報告は CC 側で行う。

---

## 背景

2026-09-16 の RLS 監査で、`all_access {public} ALL true true` 型の素通しポリシーが
8 テーブルに残存していることが判明。`login_otps` では anon キーからの INSERT が
実際に成功し（`POST /rest/v1/login_otps` → **HTTP 201**）、以下の認証バイパスが
成立することを実証した:

1. anon キーで `login_otps` に `email=<被害者>, otp_code=bcrypt('123456'), used=false, expires_at=未来` を INSERT
2. `POST /api/verify-otp` に `{email:<被害者>, otp_code:'123456'}`
3. `verify-otp` は最新の未使用 OTP を bcrypt 照合するだけで**パスワードを再確認しない** → JWT 発行

第1波として 8 テーブル（`login_otps` `payouts` `promo_assets` `curator_earnings`
`artist_tracks` `artist_epks` `epk_press` `epk_tour`）を遮断済み。`artists` も同日に
`all_access` を DROP 済み（公開 anon キーで全 52 行の email + bcrypt ハッシュが読めていた）。

残る `curators` / `pitches` は素通しではなく `SELECT true` の**読み取り専用**ポリシーだが、
アプリが anon クライアントで**読んでいる**ため、ポリシーを外すと UI が壊れる。
先にコード側の依存を剥がす必要がある。これが本タスク。

**危険度**: `curators` には `pw_hash` / `payment_info` / `verification_token` /
`intro_mark_token` と全 54 名分の email が含まれ、公開 anon キーで全行読める。

---

## 対象関数

anon クライアント（`lib/supabase.js` の `supabase` エクスポート）を import しているのは
`app/artist/page.js` / `app/curator/page.js` / `app/curator/dashboard/page.js` の 3 ファイルのみで、
いずれも `supabase.storage`（avatars バケット）しか呼んでいない。
**テーブルへの anon アクセスは `lib/db.js` の内部にしか存在しない。**

| 関数 | テーブル | 呼び出し元 | 対応 |
|---|---|---|---|
| `loadCurators()` | `curators`, `pitches` | `components/OtonamiApp.jsx:588` | **サーバー API へ移設**（主対象） |
| `loadPitches(artistId)` | `pitches` | `OtonamiApp.jsx:594, 611` | **サーバー API へ移設**（主対象） |
| `saveCuratorToDB()` | `curators` | `OtonamiApp.jsx:628` | **削除**。SELECT 専用ポリシーのため既に機能していない |
| `savePitchesToDB()` | `pitches` | `OtonamiApp.jsx:606, 638` | **削除**。同上 |
| `registerCurator()` | `curators` | 呼び出し元なし | **削除** |
| `loadCredits()` | `artists` | 呼び出し元なし | **削除**（`artists` は遮断済みのため既に死んでいる） |
| `initSession()` | `sessions` | `OtonamiApp.jsx:590` | 要調査。`sessions` はポリシー 0 件のため既に失敗している可能性が高い |
| `logEmail()` | `email_log` | `OtonamiApp.jsx` | 同上。`email_log` もポリシー 0 件 |

> 書き込み系は**すでに全て RLS に拒否されており**（エラーを握り潰す実装のため無症状）、
> 削除しても挙動は変わらない。この点が本タスクを見た目より軽くしている。

---

## 移行先 API 案

### 1. `GET /api/curators/studio`（新設 または既存 `/api/curators/list` の拡張）

`loadCurators()` のロジック（seed 除外・`is_paused` 除外・応答率フィルタ・`pitches` からの
ライブ集計）をそのままサーバーへ移す。既存の `app/api/curators/list/route.js` が近い処理を
しているので、まず差分を確認して統合できるか判断する。

- 認証: アーティストトークン必須（現状は未認証でも全件見えている）
- **レスポンスから `pw_hash` / `payment_info` / `verification_token` / `intro_mark_token` /
  `email` を明示的に除外する。** 現在 `select('*')` のため、移設時に列を明示列挙すること。
  これが本タスクの主目的。

### 2. ピッチ一覧は `GET /api/artists` に寄せる

`loadPitches()` は `GET /api/artists` の `recentPitches`（レーベルアカウント対応で
`artist_id` 基準へ修正済み、上限 20 件）とほぼ同じ情報を返す。トラッキングタブが 20 件で
足りるなら**新設不要**で、`OtonamiApp.jsx` 側を `recentPitches` に寄せるだけで済む。
足りない場合のみ `GET /api/pitches?limit=300` を新設する。

> **前提**: レーベルアカウント対応（Phase 1〜3）のデプロイ後に着手すること。
> `loadPitches` は `7c45807` で `artist_email` 基準から `artist_id` 基準へ変更済みで、
> 先に本タスクを進めると同一関数で衝突する。またメール基準のまま移植すると、同一アカウント
> 配下の複数アーティストで他人のピッチが混ざるエンドポイントを作り込むことになる。

### 3. 仕上げ

`lib/supabase.js` の anon クライアント `supabase` エクスポートは Storage 専用になるので、
`supabaseStorage` などに改名するか `lib/db.js` からの import を撤去して誤用を防ぐ。

---

## 遮断 SQL（コード改修・デプロイ完了後に**山下さんが**実行）

実行前に現行ポリシー定義を控えること（切り戻し用）。

```sql
SELECT tablename, policyname, roles, cmd, qual::text, with_check::text
FROM pg_policies WHERE tablename IN ('curators','pitches');
```

```sql
DROP POLICY IF EXISTS "Allow public read access to curators" ON curators;
DROP POLICY IF EXISTS "Allow public read access to pitches"  ON pitches;
ALTER TABLE curators ENABLE ROW LEVEL SECURITY;
ALTER TABLE pitches  ENABLE ROW LEVEL SECURITY;
```

検証:

```sql
SELECT tablename, count(*) AS policy_count FROM pg_policies
WHERE tablename IN ('curators','pitches') GROUP BY 1;   -- 期待: 0 件（行が返らない）

SELECT relname, relrowsecurity FROM pg_class
WHERE relname IN ('curators','pitches');                -- 期待: 両方 true
```

切り戻し:

```sql
CREATE POLICY "Allow public read access to curators" ON curators
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read access to pitches" ON pitches
  FOR SELECT TO anon, authenticated USING (true);
```

---

## 検証手順

1. **改修後・遮断前**: `/studio` のキュレーター一覧とトラッキングが従来どおり表示されること
   （= サーバー API 経由に切り替わった状態で動作する）
2. **遮断後（anon プローブ・CC が実測）**: `curators` / `pitches` が `anon=54/180` → **`0`** になること
3. **遮断後（実機・山下さん）**:
   - `/studio` キュレーター一覧が表示される
   - `/studio` トラッキングにピッチ履歴が出る
   - `/artist/dashboard` の最近のピッチが出る
   - ランディングページのキュレーター表示（`lib/landing-curators.js` は service_role なので
     影響しないはずだが要確認）
   - キュレーター側ダッシュボード（`/curator/dashboard`）
4. **レスポンス内容**: 新 API の JSON に `pw_hash` / `payment_info` / `verification_token` /
   `intro_mark_token` / キュレーターの `email` が含まれないことをブラウザの Network タブで確認

---

## 関連

- `supabase/migrations/20260916_artists_enable_rls_OPTIONAL.sql`（`artists` 分・適用済み）
- `docs/label-accounts-crimson-merge.md`（レーベルアカウント対応の Phase 4）
- 実測記録: 全 27 テーブルの anon 露出状況は 2026-09-16 のセッションで取得
