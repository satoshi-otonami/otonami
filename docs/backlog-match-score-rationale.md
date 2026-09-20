# バックログ: 「スコア + 根拠行」の製品判断

起票日: 2026-09-20 ／ 優先度: 中（本番は壊れていない。表示の納得感と定数の妥当性の話）

スコア単体では「なぜこの数字か」が伝わらないため、スコアの隣に根拠行を出す方向で
検討中。ここはその製品判断メモ（実装指示書ではない）。

---

## 項目

### open_to_all は根拠行で明示（例: All genres welcome）＋ 定数 1.0 の再検討

`lib/match-score.js` の `evaluateMatch()` は `openToAllGenres` が true のとき
ジャンル軸を満点で通す:

```js
const genreScore = curator?.openToAllGenres
  ? Math.max(1, genreMatch(curatorGenres, artistGenres))
  : genreMatch(curatorGenres, artistGenres);
```

- **表示**: この 1.0 は現状 UI からは見えない。「なぜジャンルが満点なのか」を根拠行で
  明示する（例: `All genres welcome` / 「全ジャンル受付」）。ジャンル一致率が実際は
  低いキュレーターでも高スコアになるため、根拠行が無いと数字が不審に見える。
- **定数**: `1.0` が妥当かは未検証。実質「全員に 0.65 × 1.0 が入る」ため、
  open_to_all のキュレーターが常に上位に来る。0.7〜0.85 程度への引き下げ、または
  「ジャンル一致があればその値、無ければ下限 X」という床値方式も候補。
  **ただし 2026-09-20 時点の判断として 1.0 は現状維持で確定。変更しない。**
  再検討はスコア表示（根拠行）を入れて実データの分布を見てから。

#### 併せて見るべき実データ（2026-09-20 実測 / `/api/curators/list` 本番, is_seed 除外 51 組）

- `open_to_all_genres = true`: 18 組
- そのうち `rejected_genres` も非空: 4 組（Wake & Listen / Richard Pearson /
  Silas Gregory / City Pulse）。「全ジャンル歓迎、ただしこれは除く」という
  組み合わせが実在するので、根拠行は open_to_all と除外を両方出せる形にする
  （除外ヒット時は `EXCLUDE_CAP_*` が効いてスコアが 10/35 に落ちる）。
