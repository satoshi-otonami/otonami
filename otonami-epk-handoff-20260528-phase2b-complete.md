# OTONAMI EPK — Handoff (Phase 2B Complete)

**日付**: 2026-05-28
**状態**: Phase 1 / 1.5d / 2A / 2B (Sunset CITYPOP) / 密度hotfix まで完了・本番反映済み
**次**: Phase 2C = v3 Brutalist テーマ実装
**本番**: https://otonami.io/epk/route14band （現在 `sunset_citypop` テーマで表示中）

> このMDは次セッションの最初に読み込む前提。EPK の全体像・確定仕様・運用知見・Phase 2C の着手手順をここに集約。

---

## 1. 完了済みタスク (a)

| Phase | 内容 | 主要コミット |
|---|---|---|
| **Phase 1** | EPK基盤 + `editorial_dark` テーマ（Hero/Featured/Bio/Badge/Connect）、公開ページ `/epk/[slug]`、編集UI `/dashboard/epk`、`artist_epks`/`epk_press`/`epk_tour` テーブル | `548c1e7` |
| **Phase 1.5d** | editorial hero の hotfix群（名前改行・vinyl のタブレット表示・写真 object-fit contain・**Apple Music風の背景ぼかし** = editorial_dark専用演出・JPドロップキャップ無効化） | `95d9477` `16830b3` `fb5539f` `09505da` |
| **Phase 2A** | **Featured Playlist**（ピン+リスト、単曲Featuredを置換）、Sound&Mood / For Fans Of / Tour&Live / Press セクション、API群、編集UIを9タブ化、`playlist_track_ids` カラム追加 | `f5f08ea` |
| **i18n** | EN/JP トグルを全セクション・ヘッダー・Hero meta・OTONAMIバッジに展開（"曲" 単位・badge caption含む） | `0a33342` `d7f8917` |
| **Phase 2B** | **`sunset_citypop`** テーマ（CITYPOP、proto忠実移植）、テーマ切替の仕組み、編集UI設定タブでテーマ選択可能化 | `1664be6` `2cbc246` |
| **密度hotfix** | 共有 `--epk-*` 密度変数、Hero/section/pickup/bio の圧縮、Featured統合（"More from this playlist" サブ見出し）、sunset bio のモバイル2カラムバグ修正 | `dda9878` |

---

## 2. アーキテクチャ概要

- **公開ページ**: `app/epk/[slug]/page.js` (`force-dynamic`) → `epk.theme` をキーに `THEMES` レジストリでテーマ振り分け → 各テーマコンポーネントが**同じ `data` を別スキンで描画**。
- **テーマ = 自己完結**: 各テーマは独自のセクションマークアップ + CSS文字列（`<style dangerouslySetInnerHTML>` でインライン注入）を持つ。セクションコンポーネントはテーマ間で共有しない（editorial と sunset は別ファイル）。
- **データ層**: `lib/epk.js` の `getPublicEpk(slug)` が全データを集約して返す（後述）。
- **編集UI**: `app/dashboard/epk/page.js`（`artist_token` 認証、9タブ）。
- **CSSスコープ**: editorial = `.epk-root` 配下 / sunset = `.theme-sunset-citypop` 配下。keyframes は名前空間化（editorial=`epk-*` / sunset=`sc-*`）。**1ページに注入されるCSSは1テーマ分のみ**なので衝突しない。

---

## 3. 実装ファイル一覧 (c)

### 公開ページ / API / データ
```
app/epk/[slug]/page.js              テーマ振り分け (THEMES レジストリ)
app/api/epk/[slug]/route.js         公開EPK取得 (GET)
app/api/epk/save/route.js           本体フォーム保存 (GET/POST, ALLOWED ホワイトリスト)
app/api/epk/publish/route.js        公開/非公開トグル
app/api/epk/playlist/route.js       Featured Playlist 編成 (PATCH)
app/api/epk/tour/route.js           Tour CRUD (GET/POST)
app/api/epk/tour/[id]/route.js      Tour CRUD (PATCH/DELETE)
app/api/epk/press/route.js          Press CRUD (GET/POST)
app/api/epk/press/[id]/route.js     Press CRUD (PATCH/DELETE)
lib/epk.js                          データ層 + CRUD（getServiceSupabase + maybeSingle）
```

### editorial_dark テーマ
```
components/epk/themes/EditorialDark.jsx        テーマシェル（Topbar/Footer/構成/lang/reveal/動的番号01,02..）
components/epk/themes/editorialDarkCss.js      スコープCSS文字列（.epk-root, keyframes epk-*）
components/epk/sections/HeroSection.jsx        Hero（portrait + vinyl + 背景ぼかし）
components/epk/sections/FeaturedPlaylistSection.jsx  ピン + .playlist-list リスト
components/epk/sections/BioSection.jsx
components/epk/sections/SoundMoodSection.jsx
components/epk/sections/FansOfSection.jsx
components/epk/sections/TourSection.jsx
components/epk/sections/PressSection.jsx
components/epk/sections/OtonamiBadgeSection.jsx
components/epk/sections/ConnectSection.jsx
components/epk/sections/FeaturedTrackSection.jsx  ※Phase1の旧単曲版。未使用だが残置（削除可）
```

### sunset_citypop テーマ
```
components/epk/themes/SunsetCitypop.jsx        テーマシェル（Topbar/Hero(sun/grid/ticker)/Footer/構成/lang/reveal/ローマ数字 i,ii..）
components/epk/themes/sunsetCitypopCss.js      スコープCSS文字列（.theme-sunset-citypop, keyframes sc-*）
components/epk/themes/sunsetSections.jsx       全8セクションを1ファイルにexport（SunsetFeaturedPlaylist/Bio/SoundMood/FansOf/Tour/Press/Badge/Connect + DiscoRow）
```

### 編集UI
```
app/dashboard/epk/page.js                  9タブ（Hero/Playlist/Bio/Sound&Mood/For Fans Of/Tour/Press/Contact/設定）
components/epk/editor/editorStyles.js      共有スタイル + Field
components/epk/editor/PlaylistTab.jsx       楽曲選定 + ↑↓並べ替え + ★ピン留め → PATCH /api/epk/playlist
components/epk/editor/SoundMoodTab.jsx      form.sound_scenes 編集（本体保存）
components/epk/editor/FansOfTab.jsx         form.for_fans_of 編集（本体保存）
components/epk/editor/CrudTab.jsx           汎用CRUD（Tour と Press の両方を駆動）
```

### マイグレーション / プロトHTML
```
supabase/migrations/20260527_create_epk_tables.sql      Phase1（artist_epks/epk_press/epk_tour 等）
supabase/migrations/20260527_epk_phase2a_playlist.sql   playlist_track_ids + index
route14band-epk-v2-citypop.html      sunset_citypop の正本プロト（実装済み）
route14band-epk-v3-brutalist.html    ★Phase 2C の正本プロト（未着手・読み込んで忠実移植する）
```

---

## 4. 確定 CSS 変数（密度トークン） (b)

各テーマの root スコープ（`.epk-root` と `.theme-sunset-citypop`）に**同値で定義**し、hero/section/pickup/bio が参照。**Phase 2C brutalist も同じ変数を自スコープに定義すること**（密度思想の継承）。

```css
--epk-hero-min-height : 75vh;     /* hero の min-height */
--epk-section-pad-y   : 80px;     /* 一般 section の上下padding（横はテーマ固有: editorial 60px / sunset 40px） */
--epk-pickup-pad-top  : 60px;     /* Featured Playlist の padding-top */
--epk-bio-grid        : 1fr 2fr;  /* bio-grid のカラム比（本文を主役化） */
--epk-bio-gap         : 60px;     /* bio-grid の gap */
```
- モバイル（`@media (max-width:600px)`）: 各テーマで `section { padding:56px ... }` と `.hero { min-height:60vh }` に上書き。
- `bio-sidebar` は両テーマとも `position:static`（sticky は撤去済み = 本文の右寄り問題を解消）。
- **テーマ固有の余白・タイポ（h1サイズ等）は変数化せず維持**（指示）。

---

## 5. テーマ切替の仕組み (d)

- DBカラム: `artist_epks.theme`（既定 `'editorial_dark'`）。値: `'editorial_dark'` / `'sunset_citypop'`（今後 `'brutalist'` 追加）。
- `app/epk/[slug]/page.js`:
  ```js
  const THEMES = { editorial_dark: EditorialDarkTheme, sunset_citypop: SunsetCitypopTheme };
  const Theme = THEMES[data.epk?.theme] || EditorialDarkTheme;  // 不明値は editorial にフォールバック
  ```
- 編集UI「設定」タブにテーマ `<select>`（editorial_dark / sunset_citypop、brutalist は近日対応で無効）。`form.theme` を本体保存（`/api/epk/save` の ALLOWED に `theme` 含む）。
- 検証用に直接切替: PostgREST で `PATCH artist_epks?id=eq.<epk_id>` body `{"theme":"..."}`（service key）。

---

## 6. データ層 `lib/epk.js`

`getPublicEpk(slug)` の戻り値（= 各テーマの `data` prop）:
```
{ epk, artist, featured_track, playlist_tracks, tracks, press, tour, pitch_stats }
```
- `playlist_tracks`: `epk.playlist_track_ids` の順で解決（先頭=ピン、最大5）。空なら `featured_track`（単曲フォールバック）。
- `getServiceSupabase()` + `.maybeSingle()` 使用（anon不可）。`ARTIST_FIELDS`/`TRACK_FIELDS` 定義あり。
- **`soundcloud_url`/`bandcamp_url` は `artists` でなく `artist_tracks` にある**（artist選択に入れない）。
- CRUD: `updatePlaylist` / `listTourByEpk`/`createTour`/`updateTour(id,epkId,..)`/`deleteTour(id,epkId)` / 同 Press。mutation は `epkId` でスコープ（自分のEPKのみ）。
- API認証パターン: `verifyToken(request)` → `payload.role==='artist'` → `payload.artistId` → `getEpkByArtistId`。

---

## 7. i18n パターン (f)

- 各テーマシェルが `const [lang,setLang]=useState('en')` を持ち、全セクションに `lang` を渡す。トグルは **クライアント状態**。
- 文言: `{lang==='en' ? EN : JP}`。**JP文字列はSSR HTMLに出ない（クライアントチャンクに入る）** → 検証は `.next/static` か本番の `…/epk/%5Bslug%5D/page-*.js` チャンクを grep（ページHTMLではなく）。
- **セクション眉ラベル（BIOGRAPHY / FEATURED PLAYLIST / SOUND & MOOD / FOR FANS OF / TOUR & LIVE / PRESS & RECOGNITION / CONNECT）と `Issue №001` は英語維持**（editorial typography の一部・指示）。**Phase 2C も眉ラベルは英語維持**。
- 確定済みJP訳（両テーマ共通で再利用すること）:
  - Header: Live EPK→公開中のEPK / Contact→お問い合わせ
  - Hero meta（editorialのみ存在）: Genre→ジャンル / Origin→拠点 / Catalog→カタログ / Scroll→スクロール / "N tracks"→"N曲"
  - Featured: Featured→注目 / Latest Release→最新リリース / "More from this playlist"→「このプレイリストの他の楽曲」/ Listen now→試聴する
  - For Fans Of 見出し: "If you love…"→「こんな音楽が好きなら…」
  - OTONAMIバッジ: Pitched via OTONAMI→OTONAMI 経由でピッチ配信 / "Curated to reach the right ears."→「届くべき耳へ、キュレーションを。」/ Curators Reached→リーチしたキュレーター / Countries→国数 / **Response Rate→返信率（"Open Rate" は使わない＝開封データ無し）** / caption→「OTONAMI のマッチングエンジンを通じて、世界中のキュレーターへ届けています。」
  - Connect: "Get in touch."→お問い合わせ / desc / Management→マネジメント / Sync/Licensing→シンク / ライセンス / Press Inquiries→プレスお問い合わせ / Official Site→公式サイト（ブランド名 Spotify/YouTube/Instagram/X/Facebook は英語維持）
  - sunset固有: CTA Hear our latest→最新曲を聴く / Browse catalog→カタログを見る / Sound見出し "Made for the moments in between."→「あいだの時間に寄り添う。」/ Press見出し "Quiet recognition."→「静かな評価。」/ Bio出典 "Band statement"→バンドステートメント

---

## 8. 重要な運用知見 (f)

- **DBアクセス**: Supabase MCP は **read-only**（`execute_sql` でのSELECT/集計はOK、ALTER/INSERT/UPDATEは不可）。
  - **DDL（ALTER/CREATE INDEX等）は山下さんが Supabase SQL Editor で実行**（ローカルに psql/DATABASE_URL 無し、supabase CLI 未リンク）。MDにSQLを書いて依頼する運用。
  - **データ書き込み（DML）は PostgREST + `SUPABASE_SERVICE_ROLE_KEY`**（`.env.local` から source、絶対にechoしない）。`{URL}/rest/v1/<table>` に curl。**一括INSERTは全行のキーを揃える**（PGRST102回避）。
- **デプロイ**: `git push` だけでは本番反映されない。**`vercel --prod --yes` を必ず実行**（otonami.io に自動alias）。
- **i18n検証**: JP文字列はSSRに出ない → クライアントチャンクを grep（§7参照）。
- **`<em>` で分割される文字列**: 例 `最近の<em>楽曲</em>` は `最近の` と `楽曲` に分かれてバンドルされる → 結合文字列での grep は失敗する（個別に確認）。
- **Recent Tracks は独立セクションではない**: Featured Playlist 内に統合済み（ピン + サブ見出し「More from this playlist」+ 残り曲リスト）。番号は 01 Featured → 02 Bio と直結。**復活させない**。
- **Hero の高さ（実測・意図的）**: editorial PC = 0.75vp（狙い通り、hero-right を 78→58vh に縮小）。**sunset PC = 0.86vp は citypop の大型h1+ticker由来で許容（タイポ維持）**。editorial モバイル = 1.05vp はポートレート縦積み由来で許容（「モバイルは詰めすぎない」方針）。← 山下さん判断で現状維持確定。
- **セクション番号**: editorial=アラビア数字（01,02..）/ sunset=ローマ数字（i,ii..）。**両方とも「表示中のセクションのみ連番」**（空セクションは非表示で番号を詰める＝Pressが空でも歯抜けにならない）。Bio/Connect は `num` prop を受け取る。
- **セクション自己非表示**: 各セクションは空データ時に `return null`。テーマシェルの `has{}` ガードと二重化（番号整合のため）。テーマシェル側の `has` 判定が番号の正。
- **CSSルールの記述順**: メディアクエリより後ろに base ルールを置くと上書きされる（sunset bio で実際にバグった）。base → media の順を厳守。
- **Puppeteer**: `node_modules/puppeteer` 利用可。`NODE_PATH="$PWD/node_modules" node script.js` で実行。computed style 実測に使える（hero高さ・gridTemplateColumns 等）。
- **pitches に `opened_at` は無い**: バッジは `responded_at` 由来の Response Rate。バッジ統計は `curators_reached >= 5` で表示（`MIN_CURATORS_FOR_STATS`）。ROUTE14band は閾値未満で統計行は非表示。

---

## 9. ROUTE14band 現在の状態（検証対象）

```
epk_id    : f7216bf3-4da5-49ba-aba3-985a56fe9c53
artist_id : b453d67a-87a7-4b15-bfc9-41acee1c0650
slug      : route14band         is_published: true       theme: sunset_citypop
playlist  : [Sepia(pin), Missed the bus, Japan, Feeling good, Ready for the party]
            4acc5fe0 / 133a6932 / 4338e587 / 8f9ae849 / 93a4d383
sound_scenes: 3件   for_fans_of: 3件(Snarky Puppy/Khruangbin/Casiopea)
epk_tour  : 6件（ハイライト2: SXSW×10 / Bay of Islands×8 ＋ タイムライン4）
epk_press : 0件（＝Pressセクション非表示。実引用が出たら投入）
```
トラック（全5・全public・全カバー有・全Spotify有・release_date は全null）:
Sepia `4acc5fe0-8eb8-4795-af33-dae0728b9694` / Missed the bus `133a6932-caa9-403d-9920-d36605ffc89c` / Japan `4338e587-6689-4c78-8ec3-f4c964f17677` / Feeling good `8f9ae849-4ffe-4af3-b350-cecbd5142fed` / Ready for the party `93a4d383-438d-4d74-b6e4-361ce397d890`

---

## 10. 残課題 (e)

- **【次セッション最優先・未対応】PC で FEATURED PLAYLIST セクションがまだ大きい**（山下さん指摘 2026-05-28）。密度hotfix（hero/section/pickup-top圧縮）後も、PC でこの**セクション自体**が大きく感じるとのこと。次セッションの新指示書で詳細が来る見込み。調整候補: `pickup-card` の padding（editorial `64px 56px` / sunset `56px`）、`pickup-title` のサイズ（editorial `clamp(44px,6vw,80px)` / sunset `clamp(56px,8vw,112px)`）、`pickup-visual` のアスペクト/最大幅、card 内 `gap`。**両テーマに適用**する想定。
- **Phase 2C**: v3 Brutalist テーマ（本MDの主目的）。
- **Phase 3**: AI翻訳（現状EN/JP手動入力）、OG画像生成（Placid）、公開/限定URL切替、閲覧分析。
- 任意: editorial の旧 `FeaturedTrackSection.jsx`（未使用）の削除。`members` データ（proto Bio のメンバー一覧）は現状スキーマに無く省略 — 必要なら `artist_epks.members`(JSONB) + 編集UI追加を検討。
- 任意（保留確定）: sunset PC hero を厳密75%にするなら h1 縮小 / editorial モバイル hero を縮めるならポートレート縮小 — **どちらも山下さん判断で現状維持**。

---

## 11. Phase 2C 着手タスク (g, h)

**正本プロト**: `~/otonami/route14band-epk-v3-brutalist.html`（このセッションでは未読・未着手）。**色/タイポ/装飾はAI推測せず、必ずプロトを読み込んで忠実移植**。

着手手順（Phase 2B を踏襲）:
1. `route14band-epk-v3-brutalist.html` を読み込み、構造（セクション・装飾・keyframes・lang切替）を把握。
2. テーマ識別子 `'brutalist'`。CSSスコープ `.theme-brutalist`、keyframes 名前空間（例 `br-*`）。
3. ファイル作成（2B構成を踏襲）:
   - `components/epk/themes/Brutalist.jsx`（シェル: Topbar/Hero/Footer/構成/lang/reveal/番号方式はプロト準拠）
   - `components/epk/themes/brutalistCss.js`（`.theme-brutalist` スコープCSS文字列、`@import` フォント、`.theme-brutalist` root に **§4の `--epk-*` 密度変数を同値で定義**）
   - `components/epk/themes/brutalistSections.jsx`（全セクションを2B同様にexport）
4. **セクション構造は Phase 2A/2B と同一**（Hero / Featured Playlist[ピン+「More from this playlist」+残り曲] / Bio / Sound&Mood / For Fans Of / Tour&Live / Press / Connect）。proto に discography 等が別であれば Featured に統合。
5. **i18n は §7 の確定訳を再利用**（眉ラベル英語維持・Issue №001英語維持・badge は Response Rate）。OTONAMIバッジと Connect の文言は既存実装そのまま流用。
6. `app/epk/[slug]/page.js` の `THEMES` に `brutalist: BrutalistTheme` を追加。
7. 編集UI「設定」タブのテーマ `<select>` の brutalist を有効化（`disabled` 撤去）。
8. データ依存要素（members 等スキーマに無いもの）は省略 or フォールバック。カバー画像は cover-first（無ければプロトの装飾）。
9. `npm run build`（clean確認）。
10. ROUTE14band を `theme='brutalist'` に PATCH（検証用）→ dev/prod で両言語＋Puppeteer実測（hero高さ・bio-grid・section padding）。
11. `git commit` + `git push` + **`vercel --prod --yes`** → 本番確認 → 最終的に山下さんの希望テーマに戻す（既定 sunset_citypop か brutalist か要確認）。

**Phase 2C 着手前に確認すべき点**:
- brutalist hero の高さは §4 の 75vh 方針に合わせるか、プロト固有の世界観を優先するか（sunset同様 content-driven 許容か）。
- 検証後 ROUTE14band を brutalist のままにするか sunset に戻すか。

---

## 12. 検証チェックリスト（次セッション用）
- [ ] `npm run build` が clean（exit 0）
- [ ] dev/prod で brutalist が描画（`.theme-brutalist` 等のマーカー）
- [ ] EN/JP トグルで全文言が切替（JPはチャンクgrepで確認）
- [ ] 空セクション（Press等）が非表示・番号が歯抜けにならない
- [ ] PC/iPad/iPhone でレイアウト破綻なし・横スクロール無し
- [ ] editorial_dark / sunset_citypop が**無変更で**従来通り動作（リグレッション無し）
- [ ] `vercel --prod --yes` 後に otonami.io/epk/route14band 実機確認 / `/api/health` 200
```
