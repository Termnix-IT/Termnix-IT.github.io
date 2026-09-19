// ============================================================
//  utils/io.js  —  JSON エクスポート / インポート
//
//  スキーマ:
//    schemaVersion 2 (現行) — 育成データ + 画像 + ガチャ + メモ + 編成 + 素材
//                            + 呼び出しチャージ (gachaCharge: 任意項目。旧バックアップには無い)
//                            + 素材の所持数 (materialInventory: 任意項目。旧バックアップには無い)
//    schemaVersion 1 (旧)  — 旧 IndexedDB.students / gacha / memos のみ
//                            v1 を取り込むときは旧テーブルへ入れた後
//                            migrateStudentsV1ToV2() で新形式へ自動変換
//
//  マスタデータ (data/students.master.json) はリポジトリ同梱の共通リソース
//  なので、エクスポートに含めない。
// ============================================================

const IO_SCHEMA_VERSION = 2;
const LS_USER_STUDENTS_KEY = 'BlueArchive.userStudents';
const LS_MIGRATION_FLAG_KEY = 'BlueArchive.studentMigratedV2';
const LS_GACHA_CHARGE_KEY  = 'BlueArchive.gacha.charge';

// ── エクスポート ─────────────────────────────────────────
async function exportAllData() {
  try {
    const userStudents = JSON.parse(localStorage.getItem(LS_USER_STUDENTS_KEY) || '{}');

    // 画像は studentId → imageData のマップ形式に変換 (JSON 上の取り回しが楽)
    const imageRecords = await db.studentImages.toArray();
    const studentImages = {};
    for (const r of imageRecords) studentImages[r.studentId] = r.imageData;

    const data = {
      schemaVersion: IO_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      userStudents,
      studentImages,
      gacha:     await db.gacha.toArray(),
      memos:     await db.memos.toArray(),
      teams:     await db.teams.toArray(),
      materials: await db.materials.toArray(),
      gachaCharge: JSON.parse(localStorage.getItem(LS_GACHA_CHARGE_KEY) || 'null'),
      materialInventory: getMaterialInventory(),
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `blueArchive_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { ok: true, message: 'エクスポートが完了しました。' };
  } catch (e) {
    return { ok: false, message: `エクスポートエラー: ${e.message}` };
  }
}

// ── インポート (バージョン振り分け) ───────────────────
async function importAllData(jsonStr, mode = 'merge') {
  try {
    const data = JSON.parse(jsonStr);
    if (!data || typeof data !== 'object') {
      throw new Error('不正なバックアップファイルです。');
    }
    const version = data.schemaVersion || (data.version ? 1 : 1);

    if (version === 2) return await importV2(data, mode);
    if (version === 1) return await importV1(data, mode);
    throw new Error(`未対応のスキーマバージョン: ${version}`);
  } catch (e) {
    console.error('[importAllData] failed:', e);
    return { ok: false, message: `インポートエラー: ${e.message}` };
  }
}

// 取り込み結果のサマリ文字列 (トースト表示用)
function buildImportSummary(counts, mode) {
  const parts = [];
  if (counts.userStudents)  parts.push(`生徒 ${counts.userStudents} 人`);
  if (counts.studentImages) parts.push(`画像 ${counts.studentImages} 枚`);
  if (counts.teams)         parts.push(`編成 ${counts.teams} 件`);
  if (counts.memos)         parts.push(`メモ ${counts.memos} 件`);
  if (counts.gacha)         parts.push(`ガチャ ${counts.gacha} 件`);
  if (counts.materials)     parts.push(`素材 ${counts.materials} 件`);
  if (counts.materialInventory) parts.push(`素材の所持数 ${counts.materialInventory} 種`);
  if (counts.gachaCharge)   parts.push('呼び出しチャージ');
  const label = mode === 'replace' ? '置き換え' : '追記';
  if (parts.length === 0) {
    return `インポート完了 (${label}): 取り込めるデータがありませんでした`;
  }
  return `インポート完了 (${label}): ${parts.join(' / ')}`;
}

// ── v2 取り込み (現行スキーマ) ─────────────────────────
async function importV2(data, mode) {
  const stripIds = arr => (arr || []).map(({ id, ...rest }) => rest);
  const imgsToRecords = (obj) =>
    Object.entries(obj || {}).map(([studentId, imageData]) => ({
      studentId,
      imageData,
      updatedAt: new Date().toISOString(),
    }));

  const imgs = imgsToRecords(data.studentImages);

  if (mode === 'replace') {
    // 既存データを全削除して書き直し
    localStorage.setItem(LS_USER_STUDENTS_KEY, JSON.stringify(data.userStudents || {}));

    await db.studentImages.clear();
    if (imgs.length) await db.studentImages.bulkPut(imgs);

    await db.gacha.clear();
    await db.memos.clear();
    await db.teams.clear();
    await db.materials.clear();
    // 念のため id をストリップ (Dexie auto-increment と衝突する保険)
    await db.gacha.bulkAdd(stripIds(data.gacha));
    await db.memos.bulkAdd(stripIds(data.memos));
    await db.teams.bulkAdd(stripIds(data.teams));
    await db.materials.bulkAdd(stripIds(data.materials));
  } else {
    // merge: 既存に追記 / 上書き
    const existing = JSON.parse(localStorage.getItem(LS_USER_STUDENTS_KEY) || '{}');
    Object.assign(existing, data.userStudents || {}); // 同IDは取り込み側で上書き
    localStorage.setItem(LS_USER_STUDENTS_KEY, JSON.stringify(existing));

    if (imgs.length) await db.studentImages.bulkPut(imgs); // put = 上書き

    // gacha/memos/teams/materials は履歴的データ。id を捨てて単純追記
    await db.gacha.bulkAdd(stripIds(data.gacha));
    await db.memos.bulkAdd(stripIds(data.memos));
    await db.teams.bulkAdd(stripIds(data.teams));
    await db.materials.bulkAdd(stripIds(data.materials));
  }

  // 呼び出しチャージは状態値なので replace / merge とも取り込み側で上書き。無ければ触らない
  const hasCharge = data.gachaCharge && typeof data.gachaCharge === 'object';
  if (hasCharge) localStorage.setItem(LS_GACHA_CHARGE_KEY, JSON.stringify(data.gachaCharge));

  // 素材の所持数: replace は丸ごと置き換え、merge は同じ素材を取り込み側の値で上書き。無ければ触らない
  const inv = (data.materialInventory && typeof data.materialInventory === 'object') ? data.materialInventory : null;
  if (inv) {
    const base = mode === 'replace' ? {} : getMaterialInventory();
    saveMaterialInventory(Object.assign(base, inv));
  } else if ((data.materials || []).length > 0) {
    // 旧形式のバックアップ (手入力の素材だけ) は、次の読込で名前一致分を所持数へ引き継ぎ直す
    localStorage.removeItem(LS_MATERIAL_MIGRATED);
  }

  const counts = {
    userStudents:  Object.keys(data.userStudents  || {}).length,
    studentImages: imgs.length,
    gacha:         (data.gacha     || []).length,
    memos:         (data.memos     || []).length,
    teams:         (data.teams     || []).length,
    materials:     (data.materials || []).length,
    gachaCharge:   hasCharge ? 1 : 0,
    materialInventory: inv ? Object.keys(inv).length : 0,
  };
  return { ok: true, message: buildImportSummary(counts, mode) };
}

// ── v1 取り込み (旧スキーマ → 自動的に v2 へ昇格) ──────
async function importV1(data, mode) {
  if (!data.students) {
    throw new Error('不正なバックアップファイルです (v1 に students が含まれていません)。');
  }
  const stripIds = arr => (arr || []).map(({ id, ...rest }) => rest);

  if (mode === 'replace') {
    // 新形式側もクリア (置き換えセマンティクス)
    localStorage.removeItem(LS_USER_STUDENTS_KEY);
    await db.studentImages.clear();
    await db.teams.clear();
    await db.materials.clear();
    // 旧テーブルへ書き戻し (id ストリップで衝突回避)
    await db.students.clear();
    await db.gacha.clear();
    await db.memos.clear();
    await db.students.bulkAdd(stripIds(data.students));
    await db.gacha.bulkAdd(stripIds(data.gacha));
    await db.memos.bulkAdd(stripIds(data.memos));
  } else {
    await db.students.bulkAdd(stripIds(data.students));
    await db.gacha.bulkAdd(stripIds(data.gacha));
    await db.memos.bulkAdd(stripIds(data.memos));
  }

  // 移行フラグを消して再マイグレーション (旧 students → userStudents + studentImages)
  localStorage.removeItem(LS_MIGRATION_FLAG_KEY);
  const result = await migrateStudentsV1ToV2();

  const counts = {
    userStudents: result.migrated,
    gacha:        (data.gacha || []).length,
    memos:        (data.memos || []).length,
  };
  const summary = buildImportSummary(counts, mode);
  const note = result.unmatched > 0
    ? ` ※ ${result.unmatched} 件の生徒がマスタにマッチせず未移行`
    : '';
  return { ok: true, message: `${summary} (旧形式 → 新形式へ自動変換)${note}` };
}
