# What's New feed — site_updates 運用手順

LP の「OTONAMIの最新情報 / What's New」セクション（`最近参加したキュレーター`
マーキーの直下）は、次の2つを日付順に混ぜて最新4件を表示します（`lib/whats-new.js`）。

- 新規キュレーター: `curators` テーブルから自動生成（公開中＝非seed・非テスト・非pause・メール確認済み、登録日＝JST）。
  **site_updates に手で入れないこと。** 文言は `lib/whats-new.js curatorUpdateTitle()`、
  種別・地域の表記は `lib/curator-labels.js` が唯一の出所。
- 手書きの項目: `site_updates`。`kind` は `announcement`（お知らせ）/ `result`（掲載実績）/ `media`（メディア）。
  `kind = 'curator'` の行（2026-09 以前に手で入れていた分）は表示されません。

- 取得: サーバー側 `lib/site-updates.js`（anon キー、ISR `revalidate=3600`）
- 表示: `components/landing/WhatsNew.jsx`（EN/JP 両対応、0件時はセクション非表示）
- 反映タイミング: INSERT 後、最大1時間（ISR revalidate）で自動反映

## テーブルの作成（初回のみ）

`supabase/migrations/20260713_site_updates.sql` を Supabase SQL Editor に貼って実行。
末尾の `NOTIFY pgrst, 'reload schema'` まで含めて実行すること。

RLS は「公開読み取りのみ」。書き込みポリシーは無いので、INSERT は service role
（SQL Editor もしくは service key）でのみ可能です。

## 手書きのお知らせを追加する

お知らせ・掲載実績・メディア掲載があったときに、SQL Editor で以下のテンプレを1行実行する。`published_at` は当日日付、
`link_url` は該当SNS投稿やキュレーターページ（任意・不要なら `null`）。

```sql
insert into site_updates (published_at, kind, title_ja, title_en, link_url)
values (
  '2026-09-24',            -- JST の日付
  'announcement',          -- announcement / result / media
  '（日本語タイトル）',
  '(English title)',
  '/#results'              -- 自サイト内は相対パス（同じタブで開く）。外部URLは新しいタブ
);
```

- `title_ja` / `title_en` は両方必須（NOT NULL）。片方でも空だと表示が崩れます。
- 対外文言なので絵文字は使わないこと。
- 最新4件だけ表示されるため、古い行を消す必要はありません（残しておいて可）。

## 公式SNS（確定値・2026-07-13）

- X: https://x.com/otonami_io
- Instagram: https://www.instagram.com/otonami.io/

（注意: `@otonami_jp` は別会社。混同しないこと）
