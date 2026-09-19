// ============================================================
//  data/materials.js  —  素材マスタ
//
//  bluearchive.wikiru.jp「素材一覧」「装備一覧」(2026/09 時点) を元に、
//  ゲーム内に実装されている育成素材を定義する。ユーザーの所持数は
//  localStorage['BlueArchive.materialInventory'] に { [materialId]: 個数 }
//  の形で保存する (db.js の getMaterialInventory / saveMaterialInventory)。
//
//  構造:
//    MATERIAL_CATEGORIES : 画面の大分類。columns が表 (行=グループ / 列=段階) の列見出し
//    MATERIAL_GROUPS     : 表の 1 行分。items[i] が columns[i] の列に対応 (欠けは null)
//    MATERIAL_MASTER     : 全素材のフラットな配列 / MATERIAL_BY_ID : id → 素材
//
//  id は所持数の保存キーなので、一度公開したら変更しないこと。
//  素材を追加するときは該当グループの items に足すか、グループを追加する。
// ============================================================

const MATERIAL_TIER_4 = ['初級', '中級', '上級', '最上級'];

const MATERIAL_CATEGORIES = [
  { value: 'report',    label: 'レポート',     note: '生徒レベル',       columns: MATERIAL_TIER_4 },
  { value: 'enhance',   label: '強化珠',       note: '装備レベル',       columns: MATERIAL_TIER_4 },
  { value: 'bd',        label: '戦術教育BD',   note: 'EXスキル',         columns: MATERIAL_TIER_4 },
  { value: 'note',      label: '技術ノート',   note: '通常・パッシブ・サブスキル', columns: MATERIAL_TIER_4 },
  { value: 'ooparts',   label: 'オーパーツ',   note: 'スキル・装備・製造', columns: ['T1', 'T2', 'T3', 'T4'] },
  { value: 'blueprint', label: '装備設計図',   note: '装備 Tier アップ',
    columns: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', '万能'] },
  { value: 'other',     label: 'その他',       note: '秘伝ノート・選択ボックス', columns: null },
];

// ── BD / 技術ノートの学校 (SRT はヴァルキューレの BD / ノートを使う) ──
const MATERIAL_SCHOOLS = [
  { id: 'abydos',      label: 'アビドス' },
  { id: 'trinity',     label: 'トリニティ' },
  { id: 'gehenna',     label: 'ゲヘナ' },
  { id: 'millennium',  label: 'ミレニアム' },
  { id: 'arius',       label: 'アリウス' },
  { id: 'valkyrie',    label: 'ヴァルキューレ', hint: 'SRT の生徒も使用' },
  { id: 'redwinter',   label: 'レッドウィンター' },
  { id: 'hyakkiyako',  label: '百鬼夜行' },
  { id: 'shanhaijing', label: '山海経' },
  { id: 'wildhunt',    label: 'ワイルドハント' },
  { id: 'highlander',  label: 'ハイランダー' },
];

// ── オーパーツ 20 系統 × 4 段階 (名前は wiki の表記どおり) ──
const MATERIAL_OOPARTS = [
  ['nebra',        'ネブラディスク',       ['ネブラディスクの欠片', '壊れたネブラディスク', '摩耗したネブラディスク', '完全なネブラディスク']],
  ['phaistos',     'ファイストス円盤',     ['ファイストス円盤の欠片', '壊れたファイストス円盤', '摩耗したファイストス円盤', '完全なファイストス円盤']],
  ['wolfsegg',     'ヴォルフスエック鋼鉄', ['ヴォルフスエックの鉄鉱石', 'ヴォルフスエック鋼鉄の欠片', '低純度のヴォルフスエック鋼鉄', '高純度のヴォルフスエック鋼鉄']],
  ['nimrud',       'ニムルドレンズ',       ['ニムルドレンズの欠片', '壊れたニムルドレンズ', '摩耗したニムルドレンズ', '完全なニムルドレンズ']],
  ['mandrake',     'マンドレイク',         ['マンドレイクの種', 'マンドレイクの芽', 'マンドレイクジュース', 'マンドレイク濃縮液']],
  ['rohonc',       'レヒニッツ写本',       ['レヒニッツ写本のページ', '傷んだレヒニッツ写本', '編集済みのレヒニッツ写本', '完全なレヒニッツ写本']],
  ['aether',       'エーテル',             ['エーテルの粉', 'エーテルの欠片', 'エーテルの結晶', 'エーテルのエッセンス']],
  ['antikythera',  'アンティキティラ装置', ['アンティキティラ装置の欠片', '壊れたアンティキティラ装置', '摩耗したアンティキティラ装置', '完全なアンティキティラ装置']],
  ['voynich',      'ヴォイニッチ手稿',     ['断片的なヴォイニッチ手稿のコピー', '傷んだヴォイニッチ手稿のコピー', '編集済みのヴォイニッチ手稿のコピー', '完全なヴォイニッチ手稿のコピー']],
  ['haniwa',       '水晶埴輪',             ['水晶埴輪の破片', '壊れた水晶埴輪', '修復済みの水晶埴輪', '完全な水晶埴輪']],
  ['battery',      '古代の電池',           ['古代の電池の破片', '破損した古代の電池', '摩耗した古代の電池', '完全なる古代の電池']],
  ['totem',        'トーテムポール',       ['トーテムポールの破片', '破損したトーテムポール', '修復済みのトーテムポール', '完全なトーテムポール']],
  ['pendant',      '円盤型ペンダント',     ['円盤型ペンダントの欠片', '壊れた円盤型ペンダント', '修復途中の円盤型ペンダント', '完全な円盤型ペンダント']],
  ['mysterystone', 'ミステリーストーン',   ['ミステリーストーンの欠片', '壊れたミステリーストーン', '不完全なミステリーストーン', '完全なミステリーストーン']],
  ['hairdoll',     '髪伸び人形',           ['髪伸び人形の破片', '破損した髪伸び人形', '修理済みの髪伸び人形', '完全な髪伸び人形']],
  ['medal',        '古代文明のメダル',     ['古代文明のメダルの欠片', '破損した古代文明のメダル', '修復途中の古代文明のメダル', '完全な古代文明のメダル']],
  ['fleece',       '黄金の羊毛',           ['黄金の糸', '黄金の巻糸', '大きな黄金の巻糸', '黄金の布']],
  ['dodecahedron', '中空十二面体',         ['中空十二面体の欠片', '壊れた中空十二面体', '修復途中の中空十二面体', '完全な中空十二面体']],
  ['shuttle',      '黄金シャトル',         ['黄金シャトルの欠片', '壊れた黄金シャトル', '修復途中の黄金シャトル', '完全な黄金シャトル']],
  ['rocket',       '古代ロケット',         ['古代ロケットの欠片', '壊れた古代ロケット', '修復途中の古代ロケット', '完全な古代ロケット']],
];

// ── 装備 9 部位 × T2〜T10 (設計図名は「<装備名>の設計図」) ──
const MATERIAL_EQUIPMENT = [
  ['hat',      '帽子',       ['ニット帽', 'ビッグブラザーの中折れ帽', 'リボン付きベレー帽', '防弾ヘルメット', 'フリルのミニハット', 'バケットハット', 'リーフリボン付き中折れ帽', 'セーラーハット', 'ゲーミングヘルメット']],
  ['gloves',   'グローブ',   ['ニットのミトン', 'ペロロの鍋掴み', 'レザーグローブ', 'タクティカルグローブ', 'レースのグローブ', 'アームカバー', 'パールヤーングローブ', 'セーリンググローブ', 'スーパーグローブ']],
  ['shoes',    'シューズ',   ['ムートンブーツ', 'ピンキーパカのスリッパ', 'アンティークなエナメルローファー', '戦闘用ブーツ', 'ヒールパンプス', 'カジュアルスニーカー', '防水登山ブーツ', 'アクアサンダル', 'ゲーミングスリッパ']],
  ['bag',      'バッグ',     ['寒冷地用バッグ', 'ペロロのバッグ', '紺色のスクールバッグ', '戦闘用ランドセル', 'デビルウイングのトートバッグ', 'ストリートバッグ', '蝶柄のショルダーバッグ', 'スリングドライバッグ', 'メタルケース']],
  ['badge',    'バッジ',     ['マナスルのフェルトバッジ', 'アングリーアデリーのバッジ', 'ベロニカの刺繍バッジ', 'カゼヤマのワッペン', 'ココデビルのバッジ', 'ストリートバッジ', 'ローレライバッジ', 'ハルピュイア・フレキシブルバッジ', 'コインバッジ']],
  ['hairpin',  'ヘアピン',   ['シュシュ', 'モモのヘアピン', '翼のヘアピン', '多目的ヘアピン', 'コウモリのヘアピン', 'カリグラフィーヘアピン', 'リーフヘアピン', 'アンカーヘアピン', '電磁波カットヘアピン']],
  ['charm',    'お守り',     ['発熱カイロ', 'ペロロのお守り', 'クルス', 'カモフラダルマ', '呪いの人形', 'ポケット消臭剤', 'ドリームキャッチャー', 'サメの歯のお守り', 'キーキャップトイ']],
  ['watch',    '腕時計',     ['レザーの腕時計', 'ウェーブキャットの時計', 'アンティークな懐中時計', '防塵型の腕時計', 'ゴシック風の腕時計', 'ストリートファッションウォッチ', 'ローレライの腕時計', 'ダイバーウォッチ', 'スクリーンウォッチ']],
  ['necklace', 'ネックレス', ['雪花のペンダント', 'ニコライのロケットペンダント', '十字架のチョーカー', 'ドッグタグ', 'パンクチョーカー', 'チェーンネックレス', 'グリーンリーフネックレス', 'オクトパスホルダー', 'メモリネックレス']],
];

// ── グループ定義 (表の 1 行 = 1 グループ) ──
const MATERIAL_GROUPS = (() => {
  const groups = [];
  const g = (category, id, label, items, hint) => groups.push({ id, category, label, items, hint: hint || '' });

  g('report', 'report', 'レポート', [
    { id: 'report-1', name: '初級レポート',   exp: 50 },
    { id: 'report-2', name: '中級レポート',   exp: 500 },
    { id: 'report-3', name: '上級レポート',   exp: 2000 },
    { id: 'report-4', name: '最上級レポート', exp: 10000 },
  ]);
  g('enhance', 'enhance', '強化珠', [
    { id: 'enhance-1', name: '初級強化珠',   exp: 90 },
    { id: 'enhance-2', name: '中級強化珠',   exp: 360 },
    { id: 'enhance-3', name: '上級強化珠',   exp: 1440 },
    { id: 'enhance-4', name: '最上級強化珠', exp: 5760 },
  ]);
  for (const s of MATERIAL_SCHOOLS) {
    g('bd', `bd-${s.id}`, s.label,
      MATERIAL_TIER_4.map((t, i) => ({ id: `bd-${s.id}-${i + 1}`, name: `${t}戦術教育BD（${s.label}）` })), s.hint);
  }
  for (const s of MATERIAL_SCHOOLS) {
    g('note', `note-${s.id}`, s.label,
      MATERIAL_TIER_4.map((t, i) => ({ id: `note-${s.id}-${i + 1}`, name: `${t}技術ノート（${s.label}）` })), s.hint);
  }
  for (const [id, label, names] of MATERIAL_OOPARTS) {
    g('ooparts', `ooparts-${id}`, label,
      names.map((name, i) => ({ id: `ooparts-${id}-${i + 1}`, name })));
  }
  for (const [id, label, names] of MATERIAL_EQUIPMENT) {
    g('blueprint', `bp-${id}`, label, [
      ...names.map((equip, i) => ({ id: `bp-${id}-t${i + 2}`, name: `${equip}の設計図` })),
      { id: `bp-${id}-universal`, name: `万能設計図（${label}）` },
    ]);
  }
  g('other', 'secret-note', '秘伝ノート', [
    { id: 'note-secret',          name: '秘伝ノート' },
    { id: 'note-secret-fragment', name: '秘伝ノートの断片', hint: '15 枚で秘伝ノート 1 個に復元' },
  ]);
  g('other', 'box-bd', '戦術教育BD選択ボックス',
    MATERIAL_TIER_4.map((t, i) => ({ id: `box-bd-${i + 1}`, name: `${t}戦術教育BD選択ボックス` })));
  g('other', 'box-note', '技術ノート選択ボックス',
    MATERIAL_TIER_4.map((t, i) => ({ id: `box-note-${i + 1}`, name: `${t}技術ノート選択ボックス` })));
  return groups;
})();

// ── フラットな一覧と id 引き ──
const MATERIAL_MASTER = MATERIAL_GROUPS.flatMap(grp =>
  grp.items.map((it, col) => ({ ...it, category: grp.category, group: grp.id, groupLabel: grp.label, col })));
const MATERIAL_BY_ID = Object.fromEntries(MATERIAL_MASTER.map(m => [m.id, m]));

// 名前の表記ゆれ (全角/半角括弧・空白) を吸収して比較する
function normalizeMaterialName(name) {
  return String(name || '').replace(/[()（）\s　]/g, '').replace(/ウイン/g, 'ウィン');
}
const MATERIAL_BY_NAME = Object.fromEntries(MATERIAL_MASTER.map(m => [normalizeMaterialName(m.name), m]));
