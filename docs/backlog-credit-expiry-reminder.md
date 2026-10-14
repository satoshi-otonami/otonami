# Backlog: 付与クレジットの失効前リマインド

状態: バックログ（2026-10-14 決定。今回は実装しない）

## 背景
有効期限付き付与（`credit_transactions.metadata.expires_at` を持つ行。例: `label_onboarding_202610`）は
`lib/credit-expiry.js` が期限後に未使用分を失効させ、失効時に通知メールを送る。
失効**前**の予告は送っていない。

## やるとしたら
- 期限の7日前に「未使用 N クレジットが <日時> に失効します」を日英併記で1通。
- 未使用額は `lotRemainders()` で計算できる（期限前でも同じ式）。
- 二重送信防止は `email_log` の type + artist_id で claim-before-send（payout-threshold と同じ方式）。
- 実行は check-expired-pitches の cron に相乗り（Hobby プランは cron 1本まで）。
