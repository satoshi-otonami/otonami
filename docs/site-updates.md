# What's New feed — site_updates 運用手順

LP の「最新の紹介・アップデート / What's New」セクション（`最近参加したキュレーター`
マーキーの直下）は `site_updates` テーブルから最新3件を表示します。

- 取得: サーバー側 `lib/site-updates.js`（anon キー、ISR `revalidate=3600`）
- 表示: `components/landing/WhatsNew.jsx`（EN/JP 両対応、0件時はセクション非表示）
- 反映タイミング: INSERT 後、最大1時間（ISR revalidate）で自動反映

## テーブルの作成（初回のみ）

`supabase/migrations/20260713_site_updates.sql` を Supabase SQL Editor に貼って実行。
末尾の `NOTIFY pgrst, 'reload schema'` まで含めて実行すること。

RLS は「公開読み取りのみ」。書き込みポリシーは無いので、INSERT は service role
（SQL Editor もしくは service key）でのみ可能です。

## 週次運用：新しいアップデートを追加する

毎週、SQL Editor で以下のテンプレを1行実行するだけ。`published_at` は当日日付、
`link_url` は該当SNS投稿やキュレーターページ（任意・不要なら `null`）。

```sql
insert into site_updates (published_at, title_ja, title_en, link_url)
values (
  '2026-07-13',
  '今週のキュレーター紹介: （名前）（国・種別）',
  'Curator spotlight: (name) — (country / type)',
  'https://（該当SNS投稿URL・任意）'
);
```

- `title_ja` / `title_en` は両方必須（NOT NULL）。片方でも空だと表示が崩れます。
- 対外文言なので絵文字は使わないこと。
- 最新3件だけ表示されるため、古い行を消す必要はありません（残しておいて可）。

## 公式SNS（確定値・2026-07-13）

- X: https://x.com/otonami_io
- Instagram: https://www.instagram.com/otonami.io/

（注意: `@otonami_jp` は別会社。混同しないこと）
