# クリムゾンテクノロジー 西村さん アカウント統合手順

対象: `nishimura.misako@crimsontech.jp`（クリムゾンテクノロジー 西村さん）
関連: レーベルアカウント対応（1ログインで複数アーティスト管理）2026-09-16

---

## 0. 前提の実測（2026-09-16 時点）

`artists` テーブル 52 行のうち、西村さん宛は **1 行のみ**。

| id | name | email | credits | email_verified | created_at (UTC) |
|---|---|---|---|---|---|
| `171882b5-003a-4fc6-8a26-97fdd55ce185` | 小林太郎 | nishimura.misako@crimsontech.jp | 1 | true | 2026-09-16 04:23:15 |

`+beni` エイリアスの行は**まだ存在しない**。したがって当初想定の「2 行 UPDATE」は成立せず、
蜷川べに行はこれから作られる。作られ方によって手順が 2 通りに分かれる。

**山下さん決定（2026-09-17 更新）**: `+beni` エイリアスによる暫定案は**採用しない**。
先方（クリムゾンテクノロジー）の要件が「1メールアドレスで複数アーティストを管理できること」
そのものであり、別アカウントを2つ作る運用では OTONAMI を使う意味がない、との判断。

したがって**ケース A のみが有効**な手順となる。西村さんには機能デプロイ完了まで待っていただき、
既存の `nishimura.misako@crimsontech.jp` でログインして「アーティストを追加」から
蜷川べにを登録してもらう。**手動 SQL は不要。**

ケース B（`+beni` で先に登録された場合の紐付け替え）は、万一すでに `+beni` で登録が
済んでしまっていた場合の回収手順として残す。実行前に必ず B-1 の現状確認 SELECT で
`+beni` の行が実在することを確かめること（2026-09-17 時点では存在しない）。

## ケース A（**確定方針**）— 手動SQL不要

0. 機能デプロイ完了を西村さんに連絡する（それまで登録を待っていただく）
1. 西村さんが既存のメール `nishimura.misako@crimsontech.jp` でログイン
2. ヘッダーのメニュー → **「+ アーティストを追加」**
3. アーティスト名「蜷川べに」、連絡先メールは任意（未入力ならアカウントのアドレス）
4. 追加直後にセッションが蜷川べにへ切り替わり、以後はヘッダーのセレクタで往復できる

- `account_id` は Phase 1 のバックフィルで小林太郎に自動付与済みなので、手動 SQL は一切不要。
- 追加アーティストは **credits = 0** で作られる（山下さん決定: 初回付与は親アカウント作成時の 1 組目のみ）。
  レーベル向けの付与が必要になったら、下の「クレジットの個別付与」を使う。

検証 SELECT:

```sql
SELECT a.id, a.name, a.email, a.credits, a.account_id, ac.email AS login_email
FROM artists a
JOIN accounts ac ON ac.id = a.account_id
WHERE ac.email = 'nishimura.misako@crimsontech.jp'
ORDER BY a.created_at;
-- 期待: 2 行（小林太郎 / 蜷川べに）が同じ account_id・同じ login_email を持つ
```

---

## ケース B（回収用・通常は不要）— `+beni` で先に登録されてしまった場合の紐付け替え

西村さんが `nishimura.misako+beni@crimsontech.jp` で通常サインアップすると、
**accounts 行も 1 つ余分に作られる**（`+beni` 用のログイン）。統合はその余分な
accounts 行を畳む作業になる。

### B-1. 現状確認（読み取りのみ・実行前に必ず目視）

```sql
SELECT ac.id AS account_id, ac.email AS login_email, ac.created_at,
       a.id  AS artist_id,  a.name, a.email AS contact_email, a.credits, a.is_founding
FROM accounts ac
LEFT JOIN artists a ON a.account_id = ac.id
WHERE ac.email IN (
  'nishimura.misako@crimsontech.jp',
  'nishimura.misako+beni@crimsontech.jp'
)
ORDER BY ac.created_at, a.created_at;
```

出てきた値を控える:
- `KEEP_ACCOUNT_ID` = `login_email = 'nishimura.misako@crimsontech.jp'` の account_id
  （実測では小林太郎が紐づく側。これを残す）
- `DROP_ACCOUNT_ID` = `login_email = 'nishimura.misako+beni@crimsontech.jp'` の account_id
- `BENI_ARTIST_ID`  = 蜷川べにの artist_id

### B-2. 紐付け替え（UPDATE 1 行）

```sql
UPDATE artists
SET account_id = '<KEEP_ACCOUNT_ID>',
    updated_at = now()
WHERE id = '<BENI_ARTIST_ID>'
  AND account_id = '<DROP_ACCOUNT_ID>';   -- 取り違え防止のガード
-- 期待: UPDATE 1
```

**連絡先メール（`artists.email`）について**

- 既定では `+beni` のままで問題ない。同じ受信箱に届き、どちらのアーティスト宛かが
  差出人側で判別できるので、**そのまま残すことを推奨**する。
- 親アドレスに寄せたい場合のみ、下を追加で流す。
  **これは Phase 2（`artists.email` の UNIQUE 解除）を適用済みでないと 23505 で失敗する。**

```sql
UPDATE artists
SET email = 'nishimura.misako@crimsontech.jp',
    updated_at = now()
WHERE id = '<BENI_ARTIST_ID>';
```

### B-3. 不要 accounts 行の削除

`artists.account_id` の FK は `ON DELETE RESTRICT` なので、**まだ参照が残っていれば
この DELETE は失敗する**。失敗したら B-2 が効いていない証拠なので、消さずに戻ること。

```sql
-- 先に参照が 0 であることを確認（0 でなければ DELETE しない）
SELECT count(*) AS still_referencing
FROM artists WHERE account_id = '<DROP_ACCOUNT_ID>';

DELETE FROM accounts WHERE id = '<DROP_ACCOUNT_ID>';
-- 期待: DELETE 1
```

### B-4. 検証

```sql
-- 1) 西村さんのアカウント配下に 2 組が並ぶこと
SELECT a.id, a.name, a.email AS contact_email, a.credits, a.created_at
FROM artists a
JOIN accounts ac ON ac.id = a.account_id
WHERE ac.email = 'nishimura.misako@crimsontech.jp'
ORDER BY a.created_at;
-- 期待: 小林太郎 / 蜷川べに の 2 行

-- 2) +beni のログインが消えていること
SELECT count(*) AS should_be_zero
FROM accounts WHERE email = 'nishimura.misako+beni@crimsontech.jp';

-- 3) 孤児アカウントが増えていないこと
SELECT count(*) AS orphan_accounts
FROM accounts ac
WHERE NOT EXISTS (SELECT 1 FROM artists a WHERE a.account_id = ac.id);

-- 4) ピッチ帰属が壊れていないこと（artist_id 基準なので本来不変）
SELECT p.artist_id, count(*) 
FROM pitches p
WHERE p.artist_id IN (
  SELECT a.id FROM artists a JOIN accounts ac ON ac.id = a.account_id
  WHERE ac.email = 'nishimura.misako@crimsontech.jp'
)
GROUP BY 1;
```

### B-5. 実機確認

1. 西村さんに `nishimura.misako@crimsontech.jp`（**`+beni` ではない方**）でログインしてもらう
2. ヘッダーに小林太郎／蜷川べにのセレクタが出ること
3. 切り替えて、それぞれのトラック・ピッチ履歴が正しく分かれて見えること
4. `+beni` のアドレスではログインできなくなっている（B-3 で消したため）ことを事前に伝えておく

> **⚠ 事前告知が必要**: B-3 で `+beni` のログインは消える。西村さんが `+beni` で
> ログインする運用に慣れる前に統合を済ませること。

---

## クレジットの個別付与（レーベル向け・手動対応）

山下さん決定により、追加アーティストへの初回クレジット自動付与は無い。
ケース B の `+beni` は**通常サインアップ扱いなので 3 クレジットが付与される**点に注意
（ケース A の追加は 0）。揃えたい場合はここで手動調整する。

```sql
-- 残高の加算（台帳も必ず同時に入れること。残高だけ動かすと監査が合わなくなる）
UPDATE artists SET credits = credits + <N>, updated_at = now()
WHERE id = '<ARTIST_ID>';

INSERT INTO credit_transactions (artist_id, amount, type, description, metadata)
VALUES ('<ARTIST_ID>', <N>, 'manual_grant', 'Label account manual grant',
        jsonb_build_object('granted_by', 'admin', 'reason', '<理由>'));

-- 検証: 残高と台帳合計が一致すること
SELECT a.credits AS balance,
       (SELECT COALESCE(sum(amount),0) FROM credit_transactions WHERE artist_id = a.id) AS ledger_sum
FROM artists a WHERE a.id = '<ARTIST_ID>';
```
