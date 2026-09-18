# ヘイローゲーム アセット仕様

ヘイローゲーム (`components/MiniGameHaloSuika.js`) で使う各 Lv のヘイロー画像を、後から差し込めるようにする手順を記載する。

画像が無くてもゲームは動作する (学校カラーのリング描画にフォールバック)。Lv ごとに個別に差し替えてよい (混在 OK)。

## 配置ディレクトリ

```
assets/halos/
```

## ファイル名規約

`<slug>.<ext>` 形式。`slug` は `HALO_LEVELS[Lv].slug`、`ext` は `webp` → `png` の順で探索 (webp を優先)。

| Lv | slug          | 想定学校        | 既定半径 (px) | 既定カラー (フォールバック) |
|----|---------------|----------------|---------------|----------------------------|
| 1  | `abydos`      | アビドス        | 16            | `#e8d49a`                  |
| 2  | `trinity`     | トリニティ      | 22            | `#f0a8c8`                  |
| 3  | `gehenna`     | ゲヘナ          | 28            | `#e8624a`                  |
| 4  | `millennium`  | ミレニアム      | 35            | `#6ea4e6`                  |
| 5  | `arius`       | アリウス        | 42            | `#9070c0`                  |
| 6  | `red-winter`  | レッドウィンター | 50            | `#c84050`                  |
| 7  | `hyakkiyako`  | 百鬼夜行        | 58            | `#6e50a0`                  |
| 8  | `valkyrie`    | ヴァルキューレ  | 68            | `#5868a8`                  |
| 9  | `srt`         | SRT             | 78            | `#5a7a98`                  |
| 10 | `schale`      | シャーレ        | 88            | `#3ea8ff`                  |
| 11 | `final`       | 最終進化 (任意) | 98            | `#ff4f8b`                  |

例: `assets/halos/abydos.webp` を置けば Lv1 が画像描画に切替わる。
両拡張子とも無ければ自動的にフォールバック (リング + Lv ラベル)。

## 画像仕様

- **形式**: 透過 PNG または WebP (背景がブループリントグリッドに重なるため透過必須)
- **形状**: 正方形・中央にヘイロー本体を配置
- **解像度**: Lv11 (直径約 200px) でも綺麗に出るよう **256 × 256 以上推奨**
  - 全 Lv 共通解像度で OK (描画時に `r * 2` にスケール)
- **重さ**: ゲーム起動時に最大 11 枚を並列ロードするため、各 30 KB 以下に抑えると安心
- **回転**: ヘイローは物理エンジン上で回転するため、上下対称にすると違和感が出にくい

## 追加・変更時にコードを触る場面

通常は画像を置くだけで完結する。以下の変更をしたい場合のみコードを修正する。

| 変更したい内容                | 触るファイル                              | 触る場所 |
|------------------------------|------------------------------------------|---------|
| Lv の追加 / 削除              | `components/MiniGameHaloSuika.js`        | `HALO_LEVELS` 配列 + `HALO_SCORE_TABLE` |
| 画像ディレクトリの変更         | `components/MiniGameHaloSuika.js`        | `HALO_IMAGE_DIR` 定数 |
| 対応拡張子の追加 (例: jpg)     | `components/MiniGameHaloSuika.js`        | `HALO_IMAGE_EXTS` 配列 |
| slug 名のリネーム              | `components/MiniGameHaloSuika.js`        | `HALO_LEVELS[i].slug` |
| フォールバックカラーの変更     | `components/MiniGameHaloSuika.js`        | `HALO_LEVELS[i].color` |

Lv を増減した場合は **物理半径バランスとスコアテーブル** も併せて見直す
(半径の差が小さすぎると合体感が薄く、大きすぎるとフィールドが圧迫される)。

## 動作確認手順

1. `assets/halos/` に画像を 1 枚配置 (例: `abydos.webp`)
2. `python -m http.server 8080` でサーバ起動
3. ブラウザで「▷ミニゲーム」→「ヘイローゲーム」を開く
4. Lv1 のヘイローを落として画像で描画されることを確認
5. 未配置 Lv は従来のリング描画になっていることを確認 (フォールバック動作)
6. DevTools の Network タブで 404 が出ても無視されること (静かにフォールバック) を確認

## 関連ファイル

- `components/MiniGameHaloSuika.js` — ゲーム本体と画像ロード
- `components/MiniGameHub.js` — ミニゲーム一覧 (ハブ画面)
- `components/MiniGameSidebar.js` — ミニゲーム選択サイドパネル
