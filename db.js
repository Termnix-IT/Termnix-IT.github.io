// ============================================================
//  db.js  —  Dexie (IndexedDB) スキーマ定義 & CRUD 操作
// ============================================================

const db = new Dexie('BlueArchiveDB');

db.version(1).stores({
  students: '++id, name, school, role, rarity, attackType, armorType, position, owned',
  gacha:    '++id, date, banner, studentName, rarity, cost',
  memos:    '++id, category, title, updatedAt',
  events:   '++id, eventName, type, startDate, cleared',
});

db.version(2).stores({
  students: '++id, name, school, role, rarity, attackType, armorType, position, owned',
  gacha:    '++id, date, banner, studentName, rarity, cost',
  memos:    '++id, category, title, updatedAt',
  events:   '++id, eventName, type, startDate, cleared',
  teams:    '++id, name, purpose, updatedAt',
  materials:'++id, name, type, updatedAt',
});

// v3: 生徒画像専用テーブルを追加 (Base64 dataURL を localStorage 容量制限から逃すため)
//     旧 students テーブルは当面残す (マイグレーション完了確認後に次メジャーで削除)
db.version(3).stores({
  students: '++id, name, school, role, rarity, attackType, armorType, position, owned',
  gacha:    '++id, date, banner, studentName, rarity, cost',
  memos:    '++id, category, title, updatedAt',
  events:   '++id, eventName, type, startDate, cleared',
  teams:    '++id, name, purpose, updatedAt',
  materials:'++id, name, type, updatedAt',
  studentImages: 'studentId',
});

// ============================================================
//  生徒マスターデータ
//  → data/students.master.csv (編集ソース) → scripts/build-students.py → data/students.master.json (本番)
//  loadStudentMaster() で fetch する。コード内ハードコードは廃止。
// ============================================================

// ============================================================
//  生徒データ管理 (3層分離)
//  1. マスタ:    data/students.master.json (HTTP fetch, read-only)
//  2. 育成データ: localStorage['BlueArchive.userStudents']
//  3. 画像:      IndexedDB.studentImages
// ============================================================

const STUDENT_MASTER_URL  = 'data/students.master.json';
const LS_USER_STUDENTS    = 'BlueArchive.userStudents';
const LS_UNMATCHED        = 'BlueArchive.unmatchedStudents';
const LS_MIGRATION_FLAG   = 'BlueArchive.studentMigratedV2';

let _studentMasterCache = null;

// ── マスタ ─────────────────────────────────────────────
async function loadStudentMaster(force = false) {
  if (_studentMasterCache && !force) return _studentMasterCache;
  const res = await fetch(STUDENT_MASTER_URL);
  if (!res.ok) throw new Error(`生徒マスタ取得失敗: ${res.status}`);
  _studentMasterCache = await res.json();
  return _studentMasterCache;
}

// ── 育成データ (localStorage) ──────────────────────────
function defaultUserStudent() {
  return {
    owned: false,
    starRank: 1,                                              // 神秘開放レベル (1〜5)
    bondLevel: 1,
    uniqueWeaponLevel: 0,                                     // 固有武器レベル (0〜60、0は未解放)
    skillLevels: { ex: 1, normal: 1, passive: 1, sub: 1 },
    equipmentLevels: [1, 1, 1],
    releaseBonus: { hp: 0, attack: 0, heal: 0 },              // 能力開放レベル (各 0〜25)
    notes: '',
    neededMaterials: [],
  };
}

function getUserStudents() {
  try {
    const raw = localStorage.getItem(LS_USER_STUDENTS);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('育成データ読込失敗', e);
    return {};
  }
}

function getUserStudent(id) {
  return getUserStudents()[id] || null;
}

function saveUserStudent(id, partial) {
  const map = getUserStudents();
  const current = map[id] || defaultUserStudent();
  map[id] = {
    ...current,
    ...partial,
    skillLevels:     { ...current.skillLevels,     ...(partial.skillLevels     || {}) },
    equipmentLevels: partial.equipmentLevels ? [...partial.equipmentLevels] : [...current.equipmentLevels],
    releaseBonus:    { ...defaultUserStudent().releaseBonus, ...current.releaseBonus, ...(partial.releaseBonus || {}) },
    neededMaterials: partial.neededMaterials ? partial.neededMaterials.map(n => ({ ...n })) : [...current.neededMaterials],
  };
  localStorage.setItem(LS_USER_STUDENTS, JSON.stringify(map));
}

function deleteUserStudent(id) {
  const map = getUserStudents();
  delete map[id];
  localStorage.setItem(LS_USER_STUDENTS, JSON.stringify(map));
}

// ── 画像 (IndexedDB.studentImages) ─────────────────────
async function getStudentImage(id) {
  const rec = await db.studentImages.get(id);
  return rec ? rec.imageData : null;
}

async function saveStudentImage(id, dataUrl) {
  await db.studentImages.put({
    studentId: id,
    imageData: dataUrl,
    updatedAt: new Date().toISOString(),
  });
}

async function deleteStudentImage(id) {
  await db.studentImages.delete(id);
}

async function loadAllStudentImages() {
  const arr = await db.studentImages.toArray();
  const map = {};
  for (const r of arr) map[r.studentId] = r.imageData;
  return map;
}

// ── 結合ビュー ─────────────────────────────────────────
async function getAllStudentsMerged() {
  const master  = await loadStudentMaster();
  const userMap = getUserStudents();
  const images  = await loadAllStudentImages();

  return master.map(m => {
    const user = userMap[m.id] || defaultUserStudent();
    return {
      // マスタ項目
      id:         m.id,
      name:       m.name,
      school:     m.school,
      class:      m.class,
      rarity:     m.rarity,
      attackType: m.attackType,
      armorType:  m.armorType,
      role:       m.role,
      position:   m.position || '',
      weapon:     m.weapon || '',
      obtainability: m.obtainability || 'permanent',
      // 育成データ (defaults を上書き)
      owned:             user.owned,
      starRank:          user.starRank,
      bondLevel:         user.bondLevel,
      uniqueWeaponLevel: user.uniqueWeaponLevel,
      skillLevels:       { ...defaultUserStudent().skillLevels, ...(user.skillLevels || {}) },
      equipmentLevels:   user.equipmentLevels && user.equipmentLevels.length ? user.equipmentLevels : [1, 1, 1],
      releaseBonus:      { ...defaultUserStudent().releaseBonus, ...(user.releaseBonus || {}) },
      notes:             user.notes || '',
      neededMaterials:   user.neededMaterials || [],
      // 画像 (アップロード分のみ。未指定はマスタの imageUrl にフォールバック)
      imageData:         images[m.id] || null,
      imageUrl:          m.imageUrl || '',
    };
  });
}

// ── マイグレーション (旧 IndexedDB → 新構造) ─────────────
async function migrateStudentsV1ToV2() {
  if (localStorage.getItem(LS_MIGRATION_FLAG)) return { migrated: 0, unmatched: 0 };

  const old = await db.students.toArray();
  if (old.length === 0) {
    localStorage.setItem(LS_MIGRATION_FLAG, '1');
    return { migrated: 0, unmatched: 0 };
  }

  const master = await loadStudentMaster();
  const userMap = {};
  const unmatched = [];
  const idMap = {};  // 旧数値ID → 新スラグID (チーム参照の置換用)

  for (const s of old) {
    // 第一: 名前+学校 / 第二: 名前のみ
    let matched = master.find(m => m.name === s.name && m.school === s.school);
    if (!matched) matched = master.find(m => m.name === s.name);

    if (matched) {
      idMap[s.id] = matched.id;
      userMap[matched.id] = {
        owned:             !!s.owned,
        starRank:          s.starRank          || 1,
        bondLevel:         s.bondLevel         || 1,
        uniqueWeaponLevel: s.uniqueWeaponLevel || 0,
        skillLevels:       s.skillLevels       || defaultUserStudent().skillLevels,
        equipmentLevels:   s.equipmentLevels   || [1, 1, 1],
        notes:             s.notes             || '',
        neededMaterials:   s.neededMaterials   || [],
      };
      if (s.imageData) {
        try { await saveStudentImage(matched.id, s.imageData); } catch (e) { console.warn('画像移行失敗', s.name, e); }
      }
    } else {
      unmatched.push({
        name: s.name, school: s.school, role: s.role, rarity: s.rarity,
        attackType: s.attackType, armorType: s.armorType, position: s.position,
        owned: s.owned, bondLevel: s.bondLevel, starRank: s.starRank,
      });
    }
  }

  // チーム参照の数値ID→スラグID 置換
  await migrateTeamReferences(idMap);

  localStorage.setItem(LS_USER_STUDENTS, JSON.stringify(userMap));
  if (unmatched.length > 0) {
    localStorage.setItem(LS_UNMATCHED, JSON.stringify(unmatched));
  }
  localStorage.setItem(LS_MIGRATION_FLAG, '1');

  return { migrated: Object.keys(userMap).length, unmatched: unmatched.length };
}

// チームの strikers/specials が参照する旧数値ID を新スラグID に置換
async function migrateTeamReferences(idMap) {
  const teams = await db.teams.toArray();
  for (const team of teams) {
    const remap = (arr) => (arr || []).map(id => idMap[id]).filter(Boolean);
    const newSt = remap(team.strikers);
    const newSp = remap(team.specials);
    const changed = JSON.stringify(newSt) !== JSON.stringify(team.strikers || []) ||
                    JSON.stringify(newSp) !== JSON.stringify(team.specials || []);
    if (changed) {
      team.strikers = newSt;
      team.specials = newSp;
      await db.teams.put(team);
    }
  }
}

// ── アプリ起動時の初期化 ───────────────────────────────
//   マスタを取得しつつ旧データのマイグレーションを実施
async function initStudentData() {
  await loadStudentMaster();
  const result = await migrateStudentsV1ToV2();
  if (result.unmatched > 0) {
    console.warn(`${result.unmatched} 件の生徒がマスタにマッチせず未移行です (localStorage の ${LS_UNMATCHED} に保存)`);
  }
  return result;
}

// 後方互換: 既存呼び出しを置き換える
async function seedStudentsIfEmpty() {
  return initStudentData();
}

// ============================================================
//  生徒 CRUD (新 API へのファサード)
//   - 旧コードからの呼び出しを壊さないよう、関数名を維持
// ============================================================
async function getAllStudents() {
  return getAllStudentsMerged();
}

async function saveStudent(student) {
  if (!student.id) {
    // 新規追加は今後サポートしない (生徒追加はマスタCSV経由のみ)
    console.warn('saveStudent: id 無しでの追加は非サポートです');
    return;
  }
  // 育成データのみを抽出して保存 (マスタ項目は無視)
  const userPart = {
    owned:             student.owned,
    starRank:          student.starRank,
    bondLevel:         student.bondLevel,
    uniqueWeaponLevel: student.uniqueWeaponLevel,
    skillLevels:       student.skillLevels,
    equipmentLevels:   student.equipmentLevels,
    notes:             student.notes,
    neededMaterials:   student.neededMaterials,
  };
  saveUserStudent(student.id, userPart);

  // 画像が来ていれば別保存
  if (student.imageData !== undefined) {
    if (student.imageData) {
      await saveStudentImage(student.id, student.imageData);
    } else {
      await deleteStudentImage(student.id);
    }
  }
}

async function deleteStudent(id) {
  // マスタ生徒は削除しない。育成データと画像をクリアする
  deleteUserStudent(id);
  await deleteStudentImage(id);
}

async function toggleOwned(id, current) {
  saveUserStudent(id, { owned: !current });
}

// ============================================================
//  ガチャ CRUD
// ============================================================
async function getAllGacha() {
  const pulls = await db.gacha.toArray();
  return pulls.sort((a, b) => b.id - a.id);
}

async function addGachaPull(pull) {
  await db.gacha.add(pull);
}

async function deleteGachaPull(id) {
  await db.gacha.delete(id);
}

// ============================================================
//  攻略メモ CRUD
// ============================================================
async function getAllMemos() {
  return db.memos.orderBy('updatedAt').reverse().toArray();
}

async function saveMemo(memo) {
  const now = new Date().toISOString();
  if (memo.id) {
    await db.memos.put({ ...memo, updatedAt: now });
  } else {
    await db.memos.add({ ...memo, updatedAt: now, createdAt: now });
  }
}

async function deleteMemo(id) {
  await db.memos.delete(id);
}

// ============================================================
//  チーム編成 CRUD
// ============================================================
async function getAllTeams() {
  const teams = await db.teams.toArray();
  return teams.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

async function saveTeam(team) {
  const now = new Date().toISOString();
  if (team.id) {
    await db.teams.put({ ...team, updatedAt: now });
  } else {
    await db.teams.add({ ...team, updatedAt: now, createdAt: now });
  }
}

async function deleteTeam(id) {
  await db.teams.delete(id);
}

// ============================================================
//  素材管理 CRUD
// ============================================================
async function getAllMaterials() {
  const mats = await db.materials.toArray();
  return mats.sort((a, b) => (a.type || '').localeCompare(b.type || '') || (a.name || '').localeCompare(b.name || ''));
}

async function saveMaterial(material) {
  const now = new Date().toISOString();
  if (material.id) {
    await db.materials.put({ ...material, updatedAt: now });
  } else {
    await db.materials.add({ ...material, updatedAt: now });
  }
}

async function deleteMaterial(id) {
  await db.materials.delete(id);
}

// ── 素材の所持数 (localStorage) ─────────────────────────
//  素材の種類は data/materials.js のマスタで固定。ユーザーが入力するのは所持数だけなので、
//  育成データと同じく { [materialId]: 個数 } の形で localStorage に置く。
//  旧 db.materials (名前を手入力して登録した素材) はこの形式への移行元としてのみ使う。
const LS_MATERIAL_INVENTORY = 'BlueArchive.materialInventory';
const LS_MATERIAL_MIGRATED  = 'BlueArchive.materialInventoryMigrated';

function getMaterialInventory() {
  try {
    const raw = localStorage.getItem(LS_MATERIAL_INVENTORY);
    const map = raw ? JSON.parse(raw) : {};
    return (map && typeof map === 'object') ? map : {};
  } catch (e) {
    console.warn('素材の所持数の読込に失敗', e);
    return {};
  }
}

function saveMaterialInventory(map) {
  // 0 個の項目は保存しない (マスタにある全素材を持ち歩かないため)
  const compact = {};
  for (const [id, n] of Object.entries(map || {})) {
    const v = Math.max(0, Math.floor(Number(n) || 0));
    if (v > 0) compact[id] = v;
  }
  localStorage.setItem(LS_MATERIAL_INVENTORY, JSON.stringify(compact));
}

// 旧 db.materials のうち、名前がマスタと一致するものの個数を所持数へ引き継ぐ (一度きり)。
// 旧レコードは削除しない。一致しなかったものは素材ページの「旧データ」欄に残して表示する。
async function migrateLegacyMaterials() {
  if (localStorage.getItem(LS_MATERIAL_MIGRATED)) return { migrated: 0 };
  const legacy = await db.materials.toArray();
  const inv = getMaterialInventory();
  let migrated = 0;
  for (const rec of legacy) {
    const m = MATERIAL_BY_NAME[normalizeMaterialName(rec.name)];
    if (!m) continue;
    if (!inv[m.id]) {
      inv[m.id] = Math.max(0, Number(rec.quantity) || 0);
      migrated++;
    }
  }
  saveMaterialInventory(inv);
  localStorage.setItem(LS_MATERIAL_MIGRATED, '1');
  return { migrated };
}

// ============================================================
//  UI 定数 (SCHOOLS / ROLES / ATTACK_TYPES / GACHA_MODES など) は
//  data/constants.js に分離している。db.js より先に読み込まれる。
//  追加・拡張手順は docs/data-management.md を参照。
// ============================================================
