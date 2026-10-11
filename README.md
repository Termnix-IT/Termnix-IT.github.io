# Blue Archive DB (SCHALE.OS)

Blue Archive の個人用データベース。生徒・ガチャ・攻略メモ・編成・素材を一元管理する Vue 3 SPA。
ビルドツール不要・パッケージインストール不要、ブラウザだけで動く軽量構成。

## 特徴

- **生徒管理** — マスタ CSV から生成された生徒データ + 育成記録(所持 / 絆Lv / 星ランク / 装備 / スキル / 固有武器 / 能力開放 / 必要素材)。学校カラーグラデ + 画像サムネイル付きカードグリッド + 1:1 固定の正方形画像表示
- **ガチャシミュレーター** — 通常募集 / ピックアップ募集 / 期間限定募集(アニバ・ハーフアニバ ★3=6%)の3モード切替。排出枠の内訳表示 + 10連目★2以上保障 + ピティ参考(200連天井表示)
- **チーム編成** — 通常編成(ストライカー4/スペシャル2)・制約解除決戦(6/4)の2モード切替。用途タグ・メモ・所持/未所持を判別したメンバー選択モーダル
- **攻略メモ** — Markdown 対応、カテゴリ別、全文検索、編集/分割/プレビュー切替
- **素材管理** — カテゴリ別フィルタ・在庫±ボタン・生徒別必要素材の過不足アラート
- **使い方ガイド** — 非エンジニア向けに各タブの説明 + エクスポート/インポートの手順を解説した「使い方」タブを内蔵。サイドパネルにもくじ付き
- **データI/O** — JSON エクスポート / インポート(置換 or マージ)。サーバー送信なしのブラウザ完結型

## デザイン

**SCHALE.OS テーマ** — Blue Archive のゲーム内 UI(タクティカル端末)を彷彿させる Light 基調の独自テーマ。
シアン (`#3ea8ff`) + ピンクアクセント (`#ff4f8b`) + 角ばったブラケットモチーフ + 青のブループリントグリッド背景。

## 起動方法

ビルド不要。Python 標準サーバーで起動:

```bash
python -m http.server 8080
```

ブラウザで `http://localhost:8080` を開く。

## 技術スタック

- **Vue 3** (CDN / ランタイムコンパイラ付きフルビルド)
- **Dexie.js v3** (IndexedDB ラッパー)
- **Marked.js** (Markdown → HTML)
- パッケージマネージャ・ビルドツール・トランスパイラ不要

## レイアウト

```
┌──────────────────────────────────────────────┐
│ Header (タイトル / 時計 / Export / Import)   │
├──────────────────────────────────────────────┤
│ Tab Nav (生徒/ガチャ/メモ/編成/素材/使い方)  │
├──────────┬───────────────────────────────────┤
│          │                                   │
│ Side     │  Main Content                     │
│ Panel    │  (タブのメインビュー)              │
│ (タブ別) │                                   │
│          │                                   │
└──────────┴───────────────────────────────────┘
```

サイドパネルはタブごとに別コンポーネント。検索・フィルタ・モード切替・新規追加など、ページ操作系をすべて受け持つ。
ヘッダー左の `≡` ボタンでサイドパネルを開閉(モバイルではドラワー化)。

## プロジェクト構造

```
BlueArchiveWiki/
├── index.html              # 単一HTMLエントリ
├── db.js                   # Dexie スキーマ + CRUD
├── data/
│   ├── constants.js            # UI 選択肢・分類・ガチャ排出率テーブル等
│   ├── students.master.csv     # 生徒マスタ編集ソース
│   └── students.master.json    # ビルド成果物 (CSV から生成)
├── scripts/
│   ├── build-students.py       # CSV → JSON ビルド (画像の補完・検査、--push で公開)
│   └── import-wiki-students.py # wiki のキャラクター一覧 → CSV 取り込み
├── utils/io.js             # JSON エクスポート/インポート
├── components/
│   ├── StudentList.js          # 生徒カードグリッド
│   ├── StudentSidebar.js       # 生徒: 検索 + フィルタ + 新規
│   ├── StudentChecker.js       # 生徒: 学校別所持チェッカー
│   ├── StudentDetail.js        # 生徒: 詳細編集モーダル
│   ├── GachaSimulator.js       # ガチャ: シミュレータ本体
│   ├── GachaSidebar.js         # ガチャ: モード切替 + 排出枠表
│   ├── StrategyMemo.js         # メモ: Markdown エディタ
│   ├── MemoSidebar.js          # メモ: 一覧 + 検索 + 新規
│   ├── TeamComposition.js      # 編成: カードグリッド + 編集
│   ├── TeamSidebar.js          # 編成: モード切替 + フィルタ
│   ├── MaterialManagement.js   # 素材: 在庫 + 必要素材
│   ├── MaterialSidebar.js      # 素材: フィルタ
│   ├── MiniGameHub.js          # ミニゲーム: ハブ + ゲーム登録
│   ├── MiniGameSidebar.js      # ミニゲーム: ゲーム一覧
│   ├── MiniGameHaloSuika.js    # ミニゲーム: ヘイローゲーム
│   ├── HelpGuide.js            # 使い方: ガイド本体
│   └── HelpSidebar.js          # 使い方: もくじ
├── app.js                  # Vue ルート + ストア + 起動
├── assets/
│   ├── style.css               # SCHALE.OS テーマ全体
│   └── students/               # 生徒のマスタ画像 (<id>.webp。仕様は同フォルダの README)
└── docs/
    ├── data-management.md      # データ層・定数・拡張手順のまとめ
    └── minigame-halo-assets.md # ヘイローゲームの画像差し替え手順
```

## データ管理 / 拡張

ドロップダウンの選択肢、ガチャ排出率テーブル、生徒マスタなどデータ層の構成と
**新しい学校・攻撃タイプ・ガチャモード等を追加する手順** は
[`docs/data-management.md`](docs/data-management.md) を参照。

主な要点:

- 生徒マスタは `data/students.master.csv` を編集 → `python scripts/build-students.py` でJSON再生成
- 生徒のマスタ画像は `assets/students/<id>.webp` に置いて `python scripts/build-students.py --push` で公開(手順は [`assets/students/README.md`](assets/students/README.md))
- UI 選択肢系の定数は `data/constants.js` に集約
- 育成データは `localStorage`、ガチャ履歴・メモ・編成・素材は IndexedDB(Dexie)、画像は IndexedDB の専用テーブルに分けて保存
- データはブラウザ内のみ。**サーバーには送信されない**(エクスポートでバックアップ可能)

## ライセンス

個人利用前提のローカルツール。Blue Archive の知的財産権は Nexon Games / Yostar Games に帰属。
