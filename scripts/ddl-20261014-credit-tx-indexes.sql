-- credit_transactions の二度流し防止インデックス 2本（2026-10-14）
-- Supabase SQL Editor で実行すること（PostgRESTはDDL不可）。
-- 実行前にプロジェクトrefを直URLで確認: jroudvjksouqnmlhzhzr
--
-- credit_tx_expiry_lot_uniq: 付与ロット1つにつき credit_expiry 行は1行だけ。
--   lib/credit-expiry.js はこの行の INSERT を「処理権の確保」に使う
--   （Vercel Cron と GitHub Actions が重なっても失効は1回）。手動回収も同じキー。
-- credit_tx_invoice_uniq: 請求書払いの付与は (invoice_no, artist_id) で1回だけ。
--   1枚の請求書をレーベル配下の複数アーティストに配分できるよう artist_id を含める。

-- 0) 事前確認: どちらも 0 行であること（重複があるとインデックス作成が失敗する）
SELECT metadata->>'lot_tx_id' AS lot, count(*) FROM credit_transactions
 WHERE type = 'credit_expiry' GROUP BY 1 HAVING count(*) > 1;
SELECT metadata->>'invoice_no' AS inv, artist_id, count(*) FROM credit_transactions
 WHERE metadata->>'method' = 'invoice' GROUP BY 1, 2 HAVING count(*) > 1;

-- 1) 作成
CREATE UNIQUE INDEX IF NOT EXISTS credit_tx_expiry_lot_uniq
  ON credit_transactions ((metadata->>'lot_tx_id'))
  WHERE type = 'credit_expiry';

CREATE UNIQUE INDEX IF NOT EXISTS credit_tx_invoice_uniq
  ON credit_transactions ((metadata->>'invoice_no'), artist_id)
  WHERE metadata->>'method' = 'invoice';

-- 2) 確認: 2行返ること
SELECT indexname, indexdef FROM pg_indexes
 WHERE tablename = 'credit_transactions'
   AND indexname IN ('credit_tx_expiry_lot_uniq', 'credit_tx_invoice_uniq');
