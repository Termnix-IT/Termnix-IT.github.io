// ============================================================
//  data/constants.js
//  UI 選択肢・分類・ガチャ排出率など、ドロップダウンや表示で
//  使う「マスタ的な定数」をここに集約する。
//
//  - DB スキーマや CRUD は db.js
//  - 生徒マスタは data/students.master.json (CSV → JSON)
//  - このファイルはコードから直接 import せず、グローバル変数として参照する
//    (file:// 互換のため ES module 不使用)
//
//  追加・変更の手順は docs/data-management.md を参照。
// ============================================================

// ─────────────────────────────────────────────────────────────
//  学校 (SCHOOLS)
//   ・並びがフィルタ ドロップダウン / 一覧グルーピングの順序になる
//   ・マスタ JSON にあるが SCHOOLS にない学校はアプリで末尾に並ぶ
//   ・新学校追加: (1) CSV に行追加 + ビルド
//                 (2) 表示順を制御したい場合は SCHOOLS に追記
//                 (3) 専用カラーを当てたい場合は SCHOOL_COLORS に追記
// ─────────────────────────────────────────────────────────────
const SCHOOLS = [
  "アビドス",
  "トリニティ",
  "ゲヘナ",
  "ミレニアム",
  "アリウス",
  "ヴァルキューレ",
  "レッドウィンター",
  "百鬼夜行",
  "山海経",
  "ワイルドハント",
  "ハイランダー",
  "SRT",
  "オデュッセイア",
  "シャーレ",
  "常盤台中学",
  "柵川中学",
  "その他",
];

// 学校カラー (生徒カードの背景グラデーション)
//   未登録の学校はフォールバックのグレーグラデーションで表示される
const SCHOOL_COLORS = {
  アビドス: "linear-gradient(160deg, #e8d49a 0%, #c4a868 100%)",
  トリニティ: "linear-gradient(160deg, #f8d4e4 0%, #d8a8c0 100%)",
  ゲヘナ: "linear-gradient(160deg, #e8624a 0%, #b03828 100%)",
  ミレニアム: "linear-gradient(160deg, #6ea4e6 0%, #3870b8 100%)",
  アリウス: "linear-gradient(160deg, #9070c0 0%, #604098 100%)",
  レッドウィンター: "linear-gradient(160deg, #c84050 0%, #902028 100%)",
  百鬼夜行: "linear-gradient(160deg, #6e50a0 0%, #443070 100%)",
  ヴァルキューレ: "linear-gradient(160deg, #5868a8 0%, #2c3878 100%)",
  山海経: "linear-gradient(160deg, #78c8b0 0%, #3a9478 100%)",
  ワイルドハント: "linear-gradient(160deg, #8aa06a 0%, #4e6638 100%)",
  ハイランダー: "linear-gradient(160deg, #b8a070 0%, #7a6440 100%)",
  SRT: "linear-gradient(160deg, #5a7a98 0%, #3c5468 100%)",
  オデュッセイア: "linear-gradient(160deg, #78d0e8 0%, #2e8fb8 100%)",
  シャーレ: "linear-gradient(160deg, #98c8ec 0%, #5a90c8 100%)",
  常盤台中学: "linear-gradient(160deg, #f2b878 0%, #c47a38 100%)",
  柵川中学: "linear-gradient(160deg, #a0cc80 0%, #5e8c44 100%)",
};
const SCHOOL_COLOR_FALLBACK =
  "linear-gradient(160deg, #c8d0e0 0%, #a0aab8 100%)";

// ─────────────────────────────────────────────────────────────
//  クラス (CLASSES)
//   生徒のクラス分類。文字列配列 (value === label)。
// ─────────────────────────────────────────────────────────────
const CLASSES = ["アタッカー", "タンク", "ヒーラー", "サポーター", "T.S"];

// ─────────────────────────────────────────────────────────────
//  役割 (ROLES)
//   ストライカー / スペシャル枠の区分。{ value, label } 形式。
// ─────────────────────────────────────────────────────────────
const ROLES = [
  { value: "striker", label: "ストライカー" },
  { value: "special", label: "スペシャル" },
];

// ─────────────────────────────────────────────────────────────
//  位置 (POSITIONS)
//   隊列内の前後位置。CSV / JSON では大文字、UI ラベルは日本語。
// ─────────────────────────────────────────────────────────────
const POSITIONS = [
  { value: "FRONT",  label: "前衛" },
  { value: "MIDDLE", label: "中衛" },
  { value: "BACK",   label: "後衛" },
];

// ─────────────────────────────────────────────────────────────
//  使用武器種 (WEAPONS)
//   ゲーム内武器カテゴリ。
// ─────────────────────────────────────────────────────────────
const WEAPONS = [
  { value: "HG",  label: "ハンドガン" },
  { value: "AR",  label: "アサルトライフル" },
  { value: "SG",  label: "ショットガン" },
  { value: "SMG", label: "サブマシンガン" },
  { value: "SL",  label: "スナイパーライフル" },
  { value: "MG",  label: "マシンガン" },
  { value: "GL",  label: "グレネードランチャー" },
  { value: "RL",  label: "ロケットランチャー" },
  { value: "FT",  label: "火炎放射器" },
  { value: "MT",  label: "迫撃砲" },
  { value: "RG",  label: "レールガン" },
];

// ─────────────────────────────────────────────────────────────
//  攻撃タイプ / 装甲タイプ
//   { value, label } 形式。value は内部キー、label は UI 表示。
// ─────────────────────────────────────────────────────────────
const ATTACK_TYPES = [
  { value: "explosive", label: "爆発" },
  { value: "piercing", label: "貫通" },
  { value: "mystic", label: "神秘" },
  { value: "sonic", label: "振動" },
  { value: "decomposition", label: "分解" },
];

// ─────────────────────────────────────────────────────────────
//  入手区分 (OBTAINABILITIES)
//   生徒の入手経路。ガチャ恒常 / ガチャ限定 / イベント等配布。
//   { value, label } 形式。value は CSV / JSON の internal key。
// ─────────────────────────────────────────────────────────────
const OBTAINABILITIES = [
  { value: "permanent", label: "恒常" },
  { value: "limited",   label: "限定" },
  { value: "event",     label: "配布" },
];

const ARMOR_TYPES = [
  { value: "light", label: "軽装備" },
  { value: "heavy", label: "重装備" },
  { value: "special", label: "特殊装備" },
  { value: "elastic", label: "弾力装備" },
  { value: "compositearmor", label: "複合装甲" },
];

// ─────────────────────────────────────────────────────────────
//  攻略メモのカテゴリ
// ─────────────────────────────────────────────────────────────
const MEMO_CATEGORIES = [
  { value: "total_assault", label: "総力戦" },
  { value: "joint_assault", label: "大決戦" },
  { value: "joint_firing", label: "合同火力演習" },
  { value: "pvp", label: "戦術対抗戦" },
  { value: "event", label: "イベント" },
  { value: "misc", label: "その他" },
];

// ─────────────────────────────────────────────────────────────
//  ガチャモード (GACHA_MODES)  — 2026/07/29 募集リニューアル準拠
//   pity       : 'charge' = 呼び出しチャージ制 / 'points' = 200pt 交換制 (アーカイブ)
//   chargeType : カウンタの共有キー。'pickup' (呼び出しチャージ) /
//                'limited' (限定・呼び出しチャージ: 期間限定PU・周年で共有) / 'archive'
//   rates[].pool : 抽選プール識別子。GachaSimulator が候補を絞る
//     'all'                 — 同レアリティ全員
//     'pickup'              — store.gachaPickupIds に含まれる ★3 (= PU)
//     'pickup_fallthrough'  — gachaPickupIds に含まれない ★3
//     'limited_fallthrough' — store.gachaLimitedFallthroughIds に含まれる非PU ★3 (周年限定)
//     'other_three'         — pickup / limited_fallthrough のどちらにも含まれない ★3
//   charge100  : チャージ 100 到達時 (★3 確定) の内訳。pct 合計 1.0、PU が 0.5
//   チャージ 200 到達時は pool 'pickup' のエントリで確定
//   候補が空のときは同レアリティ全員にフォールバック (シミュレータ側)
//   tenthGuarantee : 10連目は ★1 を排除して ★2 に振り替え
//
//  新モード追加時のチェックリスト:
//   ・rates / charge100 の pct 合計が 1.0 になること
//   ・新しい pool 識別子を作る場合は GachaSimulator.poolCandidates の
//     switch 文に case を追加する
// ─────────────────────────────────────────────────────────────
const GACHA_MODES = [
  {
    value: "pickup",
    label: "ピックアップ募集",
    description: "PU★3=0.7% / ★3合計=3%。呼び出しチャージ制",
    pity: "charge",
    chargeType: "pickup",
    rates: [
      { stars: 3, label: "PU★3", pct: 0.007, pool: "pickup" },
      { stars: 3, label: "すり抜け★3", pct: 0.023, pool: "pickup_fallthrough" },
      { stars: 2, label: "★2", pct: 0.185, pool: "all" },
      { stars: 1, label: "★1", pct: 0.785, pool: "all" },
    ],
    // チャージ 100 到達時 (★3 確定) の内訳
    charge100: [
      { stars: 3, label: "PU★3", pct: 0.5, pool: "pickup" },
      { stars: 3, label: "すり抜け★3", pct: 0.5, pool: "pickup_fallthrough" },
    ],
    tenthGuarantee: true,
  },
  {
    value: "limited",
    label: "期間限定ピックアップ",
    description: "限定生徒PU。確率はPUと同じ、限定・呼び出しチャージ制",
    pity: "charge",
    chargeType: "limited",
    rates: [
      { stars: 3, label: "PU★3", pct: 0.007, pool: "pickup" },
      { stars: 3, label: "すり抜け★3", pct: 0.023, pool: "pickup_fallthrough" },
      { stars: 2, label: "★2", pct: 0.185, pool: "all" },
      { stars: 1, label: "★1", pct: 0.785, pool: "all" },
    ],
    charge100: [
      { stars: 3, label: "PU★3", pct: 0.5, pool: "pickup" },
      { stars: 3, label: "すり抜け★3", pct: 0.5, pool: "pickup_fallthrough" },
    ],
    tenthGuarantee: true,
  },
  {
    value: "anniversary",
    label: "周年限定募集",
    description: "アニバ・ハーフアニバ ★3合計=6%。限定・呼び出しチャージ制",
    pity: "charge",
    chargeType: "limited",
    rates: [
      { stars: 3, label: "周年PU★3", pct: 0.007, pool: "pickup" },
      { stars: 3, label: "周年すり抜け", pct: 0.009, pool: "limited_fallthrough" },
      { stars: 3, label: "その他★3", pct: 0.044, pool: "other_three" },
      { stars: 2, label: "★2", pct: 0.185, pool: "all" },
      { stars: 1, label: "★1", pct: 0.755, pool: "all" },
    ],
    // 100 到達時: PU 50% / 周年すり抜け 0.9% (据え置き) / 恒常★3 49.1%
    charge100: [
      { stars: 3, label: "周年PU★3", pct: 0.5, pool: "pickup" },
      { stars: 3, label: "周年すり抜け", pct: 0.009, pool: "limited_fallthrough" },
      { stars: 3, label: "その他★3", pct: 0.491, pool: "other_three" },
    ],
    tenthGuarantee: true,
  },
  {
    value: "archive",
    label: "アーカイブ募集",
    description: "ラインナップから PU を選択。アーカイブポイント 200pt で交換",
    pity: "points",
    chargeType: "archive",
    rates: [
      { stars: 3, label: "PU★3", pct: 0.007, pool: "pickup" },
      { stars: 3, label: "その他★3", pct: 0.023, pool: "pickup_fallthrough" },
      { stars: 2, label: "★2", pct: 0.185, pool: "all" },
      { stars: 1, label: "★1", pct: 0.785, pool: "all" },
    ],
    tenthGuarantee: true,
  },
];

// ─────────────────────────────────────────────────────────────
//  チームモード / 用途
// ─────────────────────────────────────────────────────────────
const TEAM_MODES = [
  { value: "normal", label: "通常編成", striker: 4, special: 2 },
  { value: "unrestricted", label: "制約解除決戦", striker: 6, special: 4 },
];

const TEAM_PURPOSES = [
  { value: "total_assault", label: "総力戦" },
  { value: "joint_assault", label: "大決戦" },
  { value: "joint_firing", label: "合同火力演習" },
  { value: "pvp", label: "戦術対抗戦" },
  { value: "other", label: "その他" },
];

// ─────────────────────────────────────────────────────────────
//  素材タイプ
// ─────────────────────────────────────────────────────────────
const MATERIAL_TYPES = [
  { value: "equip_t1", label: "装備素材T1" },
  { value: "equip_t2", label: "装備素材T2" },
  { value: "equip_t3", label: "装備素材T3" },
  { value: "equip_t4", label: "装備素材T4" },
  { value: "equip_t5", label: "装備素材T5" },
  { value: "equip_t6", label: "装備素材T6" },
  { value: "equip_t7", label: "装備素材T7" },
  { value: "equip_t8", label: "装備素材T8" },
  { value: "equip_t9", label: "装備素材T9" },
  { value: "equip_t10", label: "装備素材T10" },
  { value: "student_level", label: "生徒レベル素材(レポート)" },
  { value: "skill", label: "スキル素材(ノート・BD)" },
  { value: "equip_level", label: "装備レベル素材(強化珠)" },
  { value: "ooparts", label: "オーパーツ" },
  { value: "credit", label: "クレジット" },
  { value: "character", label: "神名文字" },
  { value: "other", label: "その他" },
];
