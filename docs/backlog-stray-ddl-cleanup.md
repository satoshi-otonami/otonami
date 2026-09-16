# バックログ: 迷子になった Phase 1 DDL の実行先特定と掃除

起票日: 2026-09-17 ／ 優先度: 中（放置しても本番は壊れないが、どこかに未使用オブジェクトが残る）

---

## 何が起きたか

レーベルアカウント対応の Phase 1 を SQL Editor で適用した際、**適用したはずの DDL が
本番 DB（`jroudvjksouqnmlhzhzr` / otonami）に反映されていない**事象が 2 回発生した。

| 回 | 実行内容 | エディタ側の検証結果 | REST 側の実測 |
|---|---|---|---|
| 1 回目 | Phase 1 段0〜段3 一括 | 「全て期待値どおり」 | `accounts` 404 / `artists.account_id` 無し |
| 2 回目 | 段1（accounts 作成） | `accounts_rows=0 / rls_enabled=true / policy_count=0 / unique_index=1` | `accounts` 404 |
| 2 回目 | 段2（account_id 追加） | `total=52 / with_account=0 / nullable=YES / idx=1 / fk_on_delete=r` | `artists.account_id` 無し（42703） |

その後、同じエディタでの指紋クエリは `accounts_table=0 / account_id_col=0`、
`SELECT count(*) FROM accounts` → `42P01 relation does not exist` を返し、
**REST 側の実測と一致した**。

### REST 側の測定が正しいことの根拠

`account_id` をフィルタに使うと PostgREST はそれをそのまま SQL に埋めるため、
スキーマキャッシュを経由せず Postgres が直接応答する。

```
?account_id=is.null  → 400  42703  column artists.account_id does not exist   ← Postgres の SQLSTATE
?label_name=is.null  → 200  [{"id":"d007cf1c-..."}]                            ← 同形・実在列なら通る
```

`42703` は PostgREST のキャッシュ系エラー（`PGRST204` / `PGRST205`）ではない。
また接続先が正しいことは別途確認済み:
`.env.local` / `.env.production.local` / Vercel 本番 env がすべて
`https://jroudvjksouqnmlhzhzr.supabase.co`、かつ稼働中の `https://otonami.io/api/health`
が同じ DB を見て curators 54 件を返す。

### 同時期に RLS 変更は確実に届いていた

同じ SQL Editor から流した RLS 遮断（`artists` の `all_access` DROP、第1波8テーブル）は、
本番 DB に即時反映されたことを REST で実測済み（`login_otps` への anon INSERT が
201 → 401 `42501` に変化）。**ポリシー変更は届き、DDL は届かない**という非対称が起きている。

---

## 調査で分かっていること

- **Supabase ブランチは 0 件**（`supabase branches list --project-ref jroudvjksouqnmlhzhzr`）。
  ブランチ DB へ流れた説は否定された。
- **アクセス可能な組織内に otonami は 1 プロジェクトのみ**
  （`supabase projects list`: otonami / ai-keiri-san / nick-speak / ptnac-command-centre /
  studio-journey-aimix の 5 件。STARBASE はこのアカウントからは見えない）。
- 段2 の検証が `total=52` を返した以上、**実行先には 52 行の `artists` テーブルが存在する**。
  上記 5 プロジェクトのうちそれを持つのは otonami だけ。

### 残る仮説

1. **SQL が実際には実行されていなかった** — Supabase SQL Editor は選択範囲のみを実行するため、
   検証 SELECT を含む長いブロックを貼ると意図しない範囲だけが走る。結果ペインに前回の
   実行結果が残っていた可能性を含む。指紋クエリが REST と一致した事実はこの仮説と整合する。
   **現時点で最有力。** この場合、**どの DB も汚れていない**。
2. **見えていない別プロジェクト**（別 Supabase アカウント配下の otonami 複製や STARBASE 等）
   に流れた。この場合そこに未使用の `accounts` テーブルと `artists.account_id` 列が残る。

---

## やること

### 1. 実行先の特定

CC 側の CLI トークンでは他 4 プロジェクトの API キーを取得できない（`projects api-keys` が
空を返す）ため、以下は山下さんの作業。

- Supabase ダッシュボードで**全アカウント・全組織**のプロジェクトを列挙し、
  STARBASE を含め otonami 以外に `artists` テーブルを持つものがないか確認する
- 各プロジェクトの SQL Editor で以下を実行（読み取りのみ）:

```sql
SELECT current_database() AS db,
       (SELECT count(*) FROM information_schema.tables
         WHERE table_schema='public' AND table_name='accounts')             AS has_accounts,
       (SELECT count(*) FROM information_schema.columns
         WHERE table_schema='public' AND table_name='artists'
           AND column_name='account_id')                                    AS has_account_id,
       (SELECT count(*) FROM information_schema.tables
         WHERE table_schema='public' AND table_name='artists')              AS has_artists;
```

`has_accounts=1` または `has_account_id=1` を返すプロジェクトが「流れた先」。
どこにも無ければ仮説1が確定し、**掃除は不要**（この起票はクローズしてよい）。

### 2. 掃除（流れた先が見つかった場合のみ）

> ⚠⚠ **本番 otonami（`jroudvjksouqnmlhzhzr`）では絶対に実行しないこと。**
> Phase 1 を正規に適用したあとにこれを流すと、`accounts` 52 行と全アーティストの
> 紐付けが消え、全ユーザーがログイン不能になる。
> 実行前にブラウザ URL の project ref を必ず目視すること。

安全弁つきで流す。前提（`accounts` が空・`account_id` が全 NULL）を満たさない DB では
例外を投げて中断する。

```sql
DO $$
DECLARE
  n_accounts   bigint := 0;
  n_linked     bigint := 0;
  has_accounts bool;
  has_col      bool;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.tables
                  WHERE table_schema='public' AND table_name='accounts') INTO has_accounts;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name='artists'
                    AND column_name='account_id') INTO has_col;

  IF has_accounts THEN
    EXECUTE 'SELECT count(*) FROM accounts' INTO n_accounts;
  END IF;
  IF has_col THEN
    EXECUTE 'SELECT count(account_id) FROM artists' INTO n_linked;
  END IF;

  -- 使われている形跡があれば中断。誤って本番を掃除しないための安全弁。
  IF n_accounts > 0 OR n_linked > 0 THEN
    RAISE EXCEPTION
      'ABORT: accounts=% rows, artists with account_id=% rows. 使用中の DB のため掃除しません。',
      n_accounts, n_linked;
  END IF;

  IF has_col THEN
    EXECUTE 'ALTER TABLE artists DROP COLUMN account_id';
    RAISE NOTICE 'dropped artists.account_id';
  END IF;
  IF has_accounts THEN
    EXECUTE 'DROP TABLE accounts';
    RAISE NOTICE 'dropped table accounts';
  END IF;
END $$;
```

`idx_artists_account_id` は列の DROP で自動的に消える。FK 制約も同様。

検証:

```sql
SELECT (SELECT count(*) FROM information_schema.tables
         WHERE table_schema='public' AND table_name='accounts')   AS accounts_left,
       (SELECT count(*) FROM information_schema.columns
         WHERE table_schema='public' AND table_name='artists'
           AND column_name='account_id')                          AS account_id_left;
-- 期待: 両方 0
```

---

## 再発防止（すでに運用に入れた）

Phase 1 の各段のあと、**CC が REST 経由で到達確認してから次の段を出す**手順に変更した。
この手順なら段1 の時点で食い違いを検出できる（今回は段2 まで進んでしまった）。

あわせて、SQL Editor へは **DDL のみ / 検証 SELECT のみ**を別スニペットとして貼る。
長いブロックを一度に貼らない。

---

## 関連

- `supabase/migrations/20260916_accounts_phase1.sql`（本体）
- `docs/task-anon-rls-curators-pitches.md`
- `docs/label-accounts-crimson-merge.md`
