# データ管理ガイド

このプロジェクトで管理しているデータと、その追加・変更手順をまとめたドキュメント。

---

## 全体像

データは **3 つの層** に分かれている。

```
┌──────────────────────────────────────────────────────┐
│ 1. マスタデータ (read-only / 配布物)                  │
│   data/students.master.json   生徒マスタ              │
│   data/constants.js            UI 選択肢・分類定数     │
├──────────────────────────────────────────────────────┤
│ 2. ユーザーデータ (永続 / ブラウザ内)                 │
│   localStorage                 育成データ・設定        │
│   IndexedDB (Dexie)            ガチャ履歴・メモ・編成等 │
│   IndexedDB.studentImages      アップロード画像        │
├──────────────────────────────────────────────────────┤
│ 3. 揮発状態 (画面操作中のみ)                          │
│   store (Vue.reactive)         フィルタ・選択・タブ等  │
└──────────────────────────────────────────────────────┘
```

| 性質 | マスタ | ユーザーデータ | 揮発状態 |
|---|---|---|---|
| 編集者 | 開発者 | 利用者 | 利用者(操作中) |
| 配布 | リポジトリ同梱 | ブラウザに保存 | しない |
| 寿命 | リリース毎 | 永続(消去するまで) | リロードで消える |

---

## 1. マスタデータ

### 1-1. 生徒マスタ — `data/students.master.json`

**編集ソースは CSV**。JSON は CSV からビルドして生成する。

```
data/students.master.csv  →  python scripts/build-students.py  →  data/students.master.json
```

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | string | スラグ ID(例: `aru`)。DB上の永続キー |
| `name` | string | 表示名 |
| `school` | string | 学校(`SCHOOLS` の値と一致させると並びが安定) |
| `role` | string | 役割(`ROLES` の値) |
| `rarity` | number | レアリティ(1〜3) |
| `attackType` | string | 攻撃タイプ(`ATTACK_TYPES[i].value`) |
| `armorType` | string | 装甲タイプ(`ARMOR_TYPES[i].value`) |
| `class` | string | クラス(`CLASSES` の値) |
| `position` | string | ポジション(`POSITIONS[i].value`、空可) |
| `weapon` | string | 使用武器種(`WEAPONS[i].value`、空可) |
| `obtainability` | string | 入手区分(`OBTAINABILITIES[i].value`: `permanent` / `limited` / `event`) |
| `imageUrl` | string | 既定画像のURL(空でも可。ユーザーアップロードがあればそちら優先) |

**新生徒を追加するとき**

wiki(bluearchive.wikiru.jp「キャラクター一覧」)から一括で取り込むのが基本。

1. `python scripts/import-wiki-students.py --build` を実行(CSV 更新 → JSON 再生成まで自動)
   - 既存行の `id` / `imageUrl` は名前をキーに引き継がれる(育成データが孤立しない)
   - 新しい生徒名・衣装名が出た場合はエラーで止まるので、スクリプト内の `BASE_ROMAJI` / `VARIANT_ROMAJI` に追記
   - 新しい学校が出た場合は `data/constants.js` の `SCHOOLS` / `SCHOOL_COLORS` に追記(未追記でも末尾に並ぶ)
   - `--dry-run` で差分だけ確認できる。wiki は国外 IP を拒否するため国内ネットワークから実行
2. `data/students.master.csv` / `data/students.master.json` の差分を git に含めてコミット

手で 1 行だけ足す場合は CSV に行を追加 → `python scripts/build-students.py` でもよい。

**カスタム生徒(マスタ外)は非対応**。CSV を編集する手順のみ。

### 1-2. UI 定数 — `data/constants.js`

ドロップダウン/分類/排出率テーブルなど、コードから参照する「マスタ的な定数」を集約。
ES モジュール非使用のため、各定数はグローバル変数として公開され、`app.js` で
`app.config.globalProperties.XXX` に登録されてテンプレートからも参照できる。

| 定数 | 形式 | 用途 |
|---|---|---|
| `SCHOOLS` | `string[]` | 学校の表示順 |
| `SCHOOL_COLORS` / `SCHOOL_COLOR_FALLBACK` | `Record<string,string>` / `string` | 生徒カードの背景グラデ |
| `ROLES` | `string[]` | 役割(value === label) |
| `ATTACK_TYPES` | `{value,label}[]` | 攻撃タイプ |
| `ARMOR_TYPES` | `{value,label}[]` | 装甲タイプ |
| `OBTAINABILITIES` | `{value,label}[]` | 入手区分(恒常/限定/配布) |
| `MEMO_CATEGORIES` | `{value,label}[]` | 攻略メモのカテゴリ |
| `GACHA_MODES` | 後述 | ガチャ排出率テーブル |
| `TEAM_MODES` | `{value,label,striker,special}[]` | 編成モード(枠数) |
| `TEAM_PURPOSES` | `{value,label}[]` | 編成の用途タグ |
| `MATERIAL_TYPES` | `{value,label}[]` | 素材分類 |

#### 共通の追加ルール

- `value` は **既存データと整合する不変キー**(localStorage / IndexedDB に保存済みのため、リネームすると過去データが孤立する)
- `label` は表示専用。気軽に変えてよい
- 並び順がそのまま UI 表示順になる
- 新しい定数を追加してテンプレートから `v-for="x in FOO"` 参照したい場合は **`app.js` の `app.config.globalProperties.FOO = FOO` に登録する** こと

#### 拡張レシピ

**新しい学校を追加したい**
1. CSV に行追加 → ビルド(これだけでフィルタ/グルーピングは自動対応、末尾に並ぶ)
2. 表示順を制御したい場合は `SCHOOLS` に追記
3. 専用カラーを当てたい場合は `SCHOOL_COLORS` に追記(無ければ `SCHOOL_COLOR_FALLBACK` のグレー)

**新しい攻撃/装甲タイプを追加したい**
1. `data/constants.js` の `ATTACK_TYPES` / `ARMOR_TYPES` に `{value, label}` を追加
2. CSV の該当列に新 `value` を入れて再ビルド
3. バッジ用 CSS(`.badge-<value>`)が必要なら `assets/style.css` に追加

**新しい入手区分を追加したい** (`OBTAINABILITIES`)
1. `data/constants.js` の `OBTAINABILITIES` に `{value, label}` を追加
2. `scripts/build-students.py` の `OBTAINS` set にも同じ value を追加
3. CSV の `obtainability` 列に新 value を入れて再ビルド
4. バッジ用 CSS(`.badge-obt-<value>`)を `assets/style.css` に追加

**新しいガチャモードを追加したい** (`GACHA_MODES`)
1. `{value, label, description, pity, chargeType, rates, charge100, tenthGuarantee}` のオブジェクトを追加
   - `pity`: `'charge'`(呼び出しチャージ)/ `'points'`(200pt 交換)
   - `chargeType`: カウンタを共有するキー(`pickup` / `limited` / `archive`)。新キーなら `app.js` の `gachaCharge` 初期値にも追加
   - `charge100`: チャージ 100 到達時(★3 確定)の内訳。`pity: 'charge'` のとき必須
2. `rates[].pct` と `charge100[].pct` の合計がそれぞれ **1.0 になる** ことを必ず確認
3. 既存以外の `pool` 識別子を使う場合は `components/GachaSimulator.js` の
   `poolCandidates` の `switch` 文に `case` を追加

**新しい素材タイプ/メモカテゴリ/編成用途を追加したい**
- 該当の `{value, label}` を追加するだけ。`value` は ASCII の不変キー推奨

---

## 2. ユーザーデータ

### 2-1. 育成データ — `localStorage['BlueArchive.userStudents']`

生徒ごとの所持/絆Lv/星ランク/スキル/装備/メモ等。`db.js` の `defaultUserStudent()` がスキーマ。

```js
{
  [studentId]: {
    owned: false,
    starRank: 1,
    bondLevel: 1,
    uniqueWeaponLevel: 0,
    skillLevels: { ex: 1, normal: 1, passive: 1, sub: 1 },
    equipmentLevels: [1, 1, 1],
    releaseBonus: { hp: 0, attack: 0, heal: 0 },
    notes: '',
    neededMaterials: [],
  }
}
```

新フィールドを追加する場合は `defaultUserStudent()` にデフォルト値を入れ、
`saveUserStudent()` のマージロジックで欠損を補完する(既存ユーザーのデータが壊れないように)。

### 2-2. IndexedDB(Dexie) — DB 名 `BlueArchiveDB`

`db.js` で定義。**最新は `version(3)`**。

| テーブル | キー / インデックス | 用途 |
|---|---|---|
| `students` | `++id` ほか | 旧構造(後方互換のため残置) |
| `gacha` | `++id, date, banner, studentName, rarity, cost` | ガチャ履歴 |
| `memos` | `++id, category, title, updatedAt` | 攻略メモ |
| `events` | `++id, eventName, type, startDate, cleared` | UI 削除済み(残置のみ) |
| `teams` | `++id, name, purpose, updatedAt` | 編成 |
| `materials` | `++id, name, type, updatedAt` | 素材在庫 |
| `studentImages` | `studentId` | アップロード画像(Base64 JPEG) |

**スキーマ変更時の注意**

- 既存の `db.version(N)` の中身を **書き換えてはいけない**(Dexie がエラー)
- 必ず `db.version(N+1).stores({...})` を **追記** する
- 非インデックスのフィールド追加(例: `teams.mode`, `gacha.mode`)は **バージョンアップ不要**、そのまま保存できる

### 2-3. アップロード画像 — `IndexedDB.studentImages`

- `Base64 JPEG` を `imageData` フィールドに保存
- アップロード時に Canvas で最大 300×400 / JPEG 85% に圧縮
- マスタ画像は `students.master.json` の `imageUrl` から、ユーザー画像はこのテーブルから取得し、`getAllStudentsMerged()` でマージされて `store.students` に入る
- 表示は `imageData`(アップロード)→ `imageUrl`(マスタ: `assets/students/<id>.webp` をビルド時に自動検出)→ 学校カラー の優先順。マスタ画像は `ToolProject/imageconversion` で自作イラストから 1:1 webp を作成して配置する(`assets/students/README.md` 参照)

---

## 3. 揮発状態(store)

`app.js` の `store = Vue.reactive({...})` がアプリ全体の状態。フィルタ/選択ID/タブ等の
**ページ操作状態** はサイドパネルとメインの両方から参照されるためここに置く(コンポーネントの
`data()` ではなく)。永続化はしない。

| store の状態 | 用途 |
|---|---|
| `studentFilters` / `studentSortKey` | 生徒一覧の検索・並び替え |
| `memoSelectedId` / `memoIsCreating` / `memoSearch` | 攻略メモのエディタ状態 |
| `teamMode` / `teamFilter` | 編成のモード/フィルタ |
| `materialFilter` | 素材のフィルタ |
| `gachaMode` / `gachaPickupIds` / `gachaLimitedFallthroughIds` | ガチャ募集モードと PU・周年限定の対象 |
| `gachaCharge` | 呼び出しチャージ / アーカイブポイント。**例外的に `localStorage['BlueArchive.gacha.charge']` へ永続化**(募集期間をまたいで持ち越す仕様のため) |
| `activeTab` | メイン+サイドパネルのタブ切替 |
| `studentView` | 生徒タブのビュー(`'grid'` / `'checker'`) |
| `checkerCollapsed` | 所持チェッカーの学校別折りたたみ状態(`{ [school]: true }`) |
| `students` | マスタ+育成+画像のマージ済み配列(`getAllStudentsMerged()` の結果) |

---

## バックアップ / インポート

`utils/io.js` の `exportAllData()` / `importAllData()` で全ユーザーデータを JSON に
エクスポート/インポートできる。マスタデータと UI 定数は配布物なので含めない。

### スキーマ (schemaVersion 2)

```json
{
  "schemaVersion": 2,
  "exportedAt":    "2026-05-07T...",
  "userStudents":  { "<id>": { ...育成データ } },
  "studentImages": { "<id>": "data:image/jpeg;base64,..." },
  "gacha":         [ ... ガチャ履歴 ],
  "memos":         [ ... メモ ],
  "teams":         [ ... 編成 ],
  "materials":     [ ... 素材在庫 ],
  "gachaCharge":   { "pickup": 0, "limited": 0, "archive": 0 }
}
```

### バージョン互換

- **v2 取り込み**: 上記スキーマ通り。`replace` モードは既存を全クリアして書き直し、
  `merge` は localStorage の同 ID を上書き / IndexedDB は単純追記
- **v1 取り込み (旧形式)**: 旧 `db.students` テーブルへ書き戻したあと
  `migrateStudentsV1ToV2()` を再実行して v2 形式へ自動昇格。マッチしなかった生徒は
  `localStorage['BlueArchive.unmatchedStudents']` に保存される

### 拡張時の注意

新しい IndexedDB テーブル / localStorage キーを追加した場合は
`exportAllData()` と `importV2()` の両方に追記すること。エクスポート漏れがあると
ユーザーのバックアップから一部データが復元できなくなる。
