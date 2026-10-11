// ============================================================
//  components/MaterialManagement.js  —  素材 (所持数の入力 / 一括確認)
//
//  素材の種類は data/materials.js のマスタで固定。ユーザーは所持数だけを入力する。
//  store.materialView:
//    'input'    — カテゴリごとの表 (行 = 学校・系統・部位、列 = 段階) に数値を直接入力
//                 Enter / ↓ で下のセル、↑ で上のセル、Tab で右のセルへ移動する
//    'overview' — サマリ・段階色のタイル・生徒別の必要素材を読み取り専用で一覧
//  所持数は store.materialInventory ({ [materialId]: 個数 }) → localStorage に保存。
// ============================================================

const MATERIAL_TIER_LABELS = ['初級', '中級', '上級', '最上級'];
const MATERIAL_TILE_ABBR = { report: 'RP', enhance: 'EQ', bd: 'BD', note: 'NT' };

const MaterialManagementComponent = {
  inject: ['store'],
  template: `
    <div class="mat-page">
      <page-head ja="素材" :en="isOverview ? 'INVENTORY' : 'ITEMS'">
        <div class="tier-legend">
          <span v-for="(c, i) in MATERIAL_TIER_COLORS" :key="i"><i :style="{ background: c }"></i>{{ MATERIAL_TIER_LABELS[i] }}</span>
        </div>
      </page-head>

      <!-- 入力: 操作の案内 / 一括確認: サマリ -->
      <div v-if="!isOverview" class="mat-hintbar">
        <span><kbd class="mat-kbd">Enter</kbd> 下のセルへ</span>
        <span><kbd class="mat-kbd">Tab</kbd> 右のセルへ</span>
        <span><kbd class="mat-kbd">↑</kbd><kbd class="mat-kbd">↓</kbd> 上下に移動</span>
        <span class="mat-hintbar-note">
          入力は自動で保存されます (0 または空欄で未所持) ·
          <span class="mat-short-mark">◤</span> は生徒の育成に必要で足りない素材
        </span>
      </div>
      <div v-else class="mat-kpis">
        <div class="mat-kpi"><small>所持している種類</small><b>{{ summary.kinds }}</b><span> / {{ masterCount }}</span></div>
        <div class="mat-kpi"><small>合計個数</small><b>{{ summary.total.toLocaleString() }}</b></div>
        <div class="mat-kpi"><small>レポート換算 EXP</small><b>{{ summary.reportExp.toLocaleString() }}</b></div>
        <div class="mat-kpi"><small>強化珠換算 EXP</small><b>{{ summary.enhanceExp.toLocaleString() }}</b></div>
        <div class="mat-kpi"><small>秘伝ノート（断片込み）</small><b>{{ summary.secretNotes }}</b></div>
        <div class="mat-kpi" :class="{ 'mat-kpi--bad': shortageList.length > 0 }"><small>必要素材の不足</small><b>{{ shortageList.length }} 件</b></div>
      </div>

      <!-- ── カテゴリごとの表 / タイル ── -->
      <div v-for="(sec, si) in sections" :key="sec.cat.value" :id="'mat-' + sec.cat.value" class="mat-panel">
        <div class="mat-panel-head">
          <span class="mat-panel-title">{{ sec.cat.label }}</span>
          <span class="mat-panel-note">{{ sec.cat.note }}</span>
          <span class="mat-panel-total">合計 <b>{{ sec.total.toLocaleString() }}</b> · {{ sec.kinds }} / {{ sec.size }} 種</span>
        </div>

        <!-- 入力: 段階つき (行 = グループ / 列 = 段階) -->
        <div v-if="!isOverview && sec.cat.columns" class="mat-matrix-wrap">
          <table class="mat-table">
            <thead>
              <tr>
                <th class="mat-rh"></th>
                <th v-for="(col, ci) in sec.cat.columns" :key="col" :style="{ background: columnColor(sec.cat, ci) }">{{ col }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(grp, ri) in sec.groups" :key="grp.id">
                <th class="mat-rh" :title="grp.hint">
                  <i v-if="groupDot(grp)" class="filter-chip-dot" :style="{ background: groupDot(grp) }"></i>{{ grp.label }}<span v-if="grp.hint" class="mat-row-hint">*</span>
                </th>
                <td v-for="(it, ci) in grp.items" :key="it ? it.id : ci" :style="{ background: columnTint(sec.cat, ci) }">
                  <div v-if="it" class="mat-cell"
                    :class="{ 'mat-cell--zero': !qty(it.id), 'mat-cell--short': shortIds.has(it.id), 'mat-cell--saved': savedId === it.id, 'mat-cell--hit': isHit(it) }">
                    <input type="number" min="0" inputmode="numeric"
                      :value="qty(it.id) || ''" placeholder="0" :title="it.name + (it.exp ? ' (EXP+' + it.exp + ')' : '')"
                      :data-t="si" :data-r="ri" :data-c="ci"
                      @focus="$event.target.select()"
                      @change="onChange(it.id, $event)"
                      @keydown="onKey($event)">
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 入力: 段階なし (その他) -->
        <table v-else-if="!isOverview" class="mat-table mat-table--list">
          <tbody>
            <template v-for="grp in sec.groups" :key="grp.id">
              <tr v-for="(it, ii) in grp.items" :key="it.id">
                <th class="mat-rh">{{ it.name }}<span v-if="it.hint" class="mat-row-hint-text">{{ it.hint }}</span></th>
                <td>
                  <div class="mat-cell"
                    :class="{ 'mat-cell--zero': !qty(it.id), 'mat-cell--short': shortIds.has(it.id), 'mat-cell--saved': savedId === it.id, 'mat-cell--hit': isHit(it) }">
                    <input type="number" min="0" inputmode="numeric"
                      :value="qty(it.id) || ''" placeholder="0" :title="it.name"
                      :data-t="si" :data-r="listRowIndex(sec, grp, ii)" data-c="0"
                      @focus="$event.target.select()"
                      @change="onChange(it.id, $event)"
                      @keydown="onKey($event)">
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>

        <!-- 一括確認: 段階色のタイル -->
        <div v-else class="mat-inv">
          <div v-for="grp in sec.groups" :key="grp.id" class="mat-inv-group"
            :class="{ 'mat-inv-group--wide': grp.items.length > 4 }">
            <div class="mat-inv-label">
              <i v-if="groupDot(grp)" class="filter-chip-dot" :style="{ background: groupDot(grp) }"></i>{{ grp.label }}
              <span>計 {{ groupTotal(grp).toLocaleString() }}</span>
            </div>
            <div class="mat-tiles">
              <template v-for="(it, ci) in grp.items" :key="it ? it.id : ci">
                <div v-if="it" class="mat-tile"
                  :class="{ 'mat-tile--zero': !qty(it.id), 'mat-tile--short': shortIds.has(it.id) }"
                  :style="{ background: tileColor(it) }" :title="it.name + ' × ' + qty(it.id)">
                  <span class="mat-tile-tier">{{ tileTier(sec.cat, ci) }}</span>
                  {{ tileAbbr(sec.cat, grp, it) }}
                  <span class="mat-tile-q">×{{ qty(it.id).toLocaleString() }}</span>
                </div>
              </template>
            </div>
          </div>
        </div>

        <div v-if="sec.hasHint" class="mat-footnote">* {{ sec.hintText }}</div>
      </div>

      <div v-if="sections.length === 0" class="empty-state">
        <div class="empty-state-mark">該当なし</div>
        <div class="empty-state-msg">{{ emptyMessage }}</div>
      </div>

      <!-- ── 一括確認: 生徒別の必要素材 ── -->
      <div v-if="isOverview" class="mat-panel">
        <div class="mat-panel-head">
          <span class="mat-panel-title">生徒別の必要素材</span>
          <span class="mat-panel-note">生徒詳細の「必要素材」タブで登録したもの</span>
          <span v-if="shortageList.length > 0" class="mat-panel-total mat-panel-total--bad">⚠ {{ shortageList.length }} 件不足</span>
        </div>
        <div v-if="needsByStudent.length === 0" class="need-empty mat-needs-empty">
          生徒の詳細画面の「必要素材」で登録すると、ここで所持数との過不足を確認できます。
        </div>
        <div v-else class="mat-needs">
          <div v-for="row in needsByStudent" :key="row.student.id" class="mat-need-row">
            <span class="mat-need-face" :style="{ background: schoolGradient(row.student.school) }">
              <img v-if="row.student.imageData || row.student.imageUrl" :src="row.student.imageData || row.student.imageUrl" alt="">
              <template v-else>{{ row.student.name.charAt(0) }}</template>
            </span>
            <span class="mat-need-name">{{ row.student.name }}<small>{{ row.student.school }}</small></span>
            <span class="mat-need-items">
              <span v-for="n in row.needs" :key="n.key" class="mat-need-pill" :class="n.diff < 0 ? 'mat-need-pill--ng' : 'mat-need-pill--ok'">
                <i :style="{ background: n.color }"></i>{{ n.materialName }}
                <b>{{ n.stock }} / {{ n.needed }}<template v-if="n.diff >= 0"> ✓</template></b>
              </span>
            </span>
            <span v-if="row.shortCount > 0" class="mat-need-status mat-need-status--ng">{{ row.shortCount }} 件不足</span>
            <span v-else class="mat-need-status mat-need-status--ok">そろった</span>
          </div>
        </div>
      </div>

      <!-- ── 旧データ: 以前のバージョンで手入力し、マスタに一致しなかった素材 ── -->
      <div v-if="legacyUnmatched.length > 0" class="mat-panel mat-legacy">
        <div class="mat-panel-head">
          <span class="mat-panel-title">以前に手入力した素材</span>
          <span class="mat-panel-note">素材マスタに一致しなかったもの</span>
        </div>
        <p class="mat-legacy-desc">
          以前のバージョンで名前を入力して登録した素材のうち、上の一覧と名前が一致しなかったものです。
          所持数を上の一覧に入力し直したら、ここから削除してください。
        </p>
        <table class="mat-table mat-table--list">
          <tbody>
            <tr v-for="m in legacyUnmatched" :key="m.id">
              <th class="mat-rh">{{ m.name }}<span v-if="m.notes" class="mat-row-hint-text">{{ m.notes }}</span></th>
              <td class="mat-legacy-qty">{{ (m.quantity || 0).toLocaleString() }}</td>
              <td style="text-align:right;width:1%">
                <button class="btn-edit btn-danger" @click="removeLegacy(m)">削除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,

  data() {
    return {
      MATERIAL_TIER_COLORS,
      MATERIAL_TIER_LABELS,
      savedId: '',   // 直前に保存したセル (「✓ 保存」を一瞬出す)
    };
  },

  computed: {
    masterCount() {
      return MATERIAL_MASTER.length;
    },
    isOverview() {
      return this.store.materialView === 'overview';
    },
    inv() {
      return this.store.materialInventory;
    },
    query() {
      return (this.store.materialFilter.name || '').trim().toLowerCase();
    },
    show() {
      return this.isOverview ? this.store.materialFilter.show : 'all';
    },

    // 表示するカテゴリと、その中の行 (検索・一括確認の表示条件を適用後)
    sections() {
      const out = [];
      for (const cat of MATERIAL_CATEGORIES) {
        const all = MATERIAL_GROUPS.filter(g => g.category === cat.value);
        let groups = all.filter(g => this.groupMatches(g));
        if (this.show === 'owned') groups = groups.filter(g => this.groupTotal(g) > 0);
        if (this.show === 'short') groups = groups.filter(g => g.items.some(it => it && this.shortIds.has(it.id)));
        if (groups.length === 0) continue;
        const items = all.flatMap(g => g.items).filter(Boolean);
        const hints = [...new Set(groups.filter(g => g.hint).map(g => `${g.label}: ${g.hint}`))];
        out.push({
          cat,
          groups,
          size: items.length,
          kinds: items.filter(it => this.qty(it.id) > 0).length,
          total: items.reduce((s, it) => s + this.qty(it.id), 0),
          hasHint: hints.length > 0,
          hintText: hints.join(' / '),
        });
      }
      return out;
    },

    emptyMessage() {
      if (this.show === 'short') return '足りない必要素材はありません';
      if (this.show === 'owned') return '条件に一致する所持素材がありません';
      return '条件に一致する素材がありません';
    },

    summary() {
      let kinds = 0, total = 0, reportExp = 0, enhanceExp = 0;
      for (const m of MATERIAL_MASTER) {
        const n = this.qty(m.id);
        if (!n) continue;
        kinds++;
        total += n;
        if (m.category === 'report')  reportExp  += n * (m.exp || 0);
        if (m.category === 'enhance') enhanceExp += n * (m.exp || 0);
      }
      const secretNotes = this.qty('note-secret') + Math.floor(this.qty('note-secret-fragment') / 15);
      return { kinds, total, reportExp, enhanceExp, secretNotes };
    },

    // 旧 db.materials のうち、マスタに一致しなかったもの
    legacyUnmatched() {
      return (this.store.materials || []).filter(m => !MATERIAL_BY_NAME[normalizeMaterialName(m.name)]);
    },

    studentNeedsList() {
      const rows = [];
      for (const student of this.store.students) {
        for (const need of (student.neededMaterials || [])) {
          const { name, stock, material } = resolveMaterialNeed(need, this.inv, this.store.materials);
          const needed = need.quantity || 0;
          rows.push({
            key: `${student.id}-${need.materialId}`,
            student,
            materialId: material ? material.id : '',
            materialName: name,
            color: materialTierColor(material),
            needed,
            stock,
            diff: stock - needed,
          });
        }
      }
      return rows;
    },

    shortageList() {
      return this.studentNeedsList.filter(r => r.diff < 0);
    },

    // 生徒の育成に必要で足りない素材の id (セル・タイルの印に使う)
    shortIds() {
      return new Set(this.shortageList.map(r => r.materialId).filter(Boolean));
    },

    // 生徒ごとにまとめた必要素材 (不足の多い生徒を先に)
    needsByStudent() {
      const map = new Map();
      for (const r of this.studentNeedsList) {
        if (!map.has(r.student.id)) map.set(r.student.id, { student: r.student, needs: [], shortCount: 0 });
        const row = map.get(r.student.id);
        row.needs.push(r);
        if (r.diff < 0) row.shortCount++;
      }
      let rows = [...map.values()];
      if (this.show === 'short') rows = rows.filter(r => r.shortCount > 0);
      return rows.sort((a, b) => b.shortCount - a.shortCount);
    },
  },

  beforeUnmount() {
    clearTimeout(this._savedTimer);
  },

  methods: {
    qty(id) {
      return this.inv[id] || 0;
    },
    groupTotal(grp) {
      return grp.items.reduce((s, it) => s + (it ? this.qty(it.id) : 0), 0);
    },
    // 検索語がグループ名 (学校・系統・部位) か、その行の素材名に含まれるか
    groupMatches(grp) {
      const q = this.query;
      if (!q) return true;
      if (grp.label.toLowerCase().includes(q)) return true;
      return grp.items.some(it => it && it.name.toLowerCase().includes(q));
    },
    // 検索語に直接一致したセルを強調する (グループ名での一致は行全体なので強調しない)
    isHit(it) {
      const q = this.query;
      return !!q && it.name.toLowerCase().includes(q);
    },

    // ── 段階の色 ───────────────────────────────────────────
    columnTierIndex(cat, ci) {
      if (cat.value === 'blueprint') return Math.min(3, Math.floor(ci / 2));
      return Math.min(3, ci);
    },
    columnColor(cat, ci) {
      return MATERIAL_TIER_COLORS[this.columnTierIndex(cat, ci)];
    },
    // 列全体にうっすら敷く色
    columnTint(cat, ci) {
      return ['#f2f5f8', '#ebf6ff', '#fff8e1', '#f6eeff'][this.columnTierIndex(cat, ci)];
    },
    // BD / 技術ノートの行は学校カラーの丸印を付ける
    groupDot(grp) {
      if (grp.category !== 'bd' && grp.category !== 'note') return '';
      return schoolAccentColor(grp.label);
    },
    tileColor(it) {
      return materialTierColor(MATERIAL_BY_ID[it.id]);
    },
    tileTier(cat, ci) {
      if (!cat.columns) return '';
      if (cat.value === 'blueprint' || cat.value === 'ooparts') return cat.columns[ci];
      return MATERIAL_TIER_LABELS[ci] ? MATERIAL_TIER_LABELS[ci].charAt(0) : '';
    },
    // タイルの略号: レポート等はカテゴリの略号、オーパーツ・設計図は系統・部位名の先頭、その他は素材名の先頭
    tileAbbr(cat, grp, it) {
      if (MATERIAL_TILE_ABBR[cat.value]) return MATERIAL_TILE_ABBR[cat.value];
      if (cat.value === 'ooparts' || cat.value === 'blueprint') return grp.label.slice(0, 2);
      return it.name.slice(0, 2);
    },
    schoolGradient(school) {
      return SCHOOL_COLORS[school] || SCHOOL_COLOR_FALLBACK;
    },
    // 段階なしの表で、カテゴリ内の通し行番号 (キーボード移動用)
    listRowIndex(sec, grp, ii) {
      let n = 0;
      for (const g of sec.groups) {
        if (g === grp) return n + ii;
        n += g.items.length;
      }
      return n + ii;
    },

    // ── 入力 ───────────────────────────────────────────────
    onChange(id, e) {
      const before = this.qty(id);
      this.store.setMaterialQty(id, e.target.value);
      e.target.value = this.qty(id) || '';
      if (this.qty(id) !== before) {
        this.savedId = id;
        clearTimeout(this._savedTimer);
        this._savedTimer = setTimeout(() => { this.savedId = ''; }, 1200);
      }
    },

    // Enter / ↓ で下、↑ で上のセルへ (数値入力の矢印キーで値が増減しないよう既定動作を止める)
    onKey(e) {
      const step = e.key === 'Enter' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
      if (!step) return;
      e.preventDefault();
      const { t, r, c } = e.target.dataset;
      const next = this.$el.querySelector(`input[data-t="${t}"][data-r="${Number(r) + step}"][data-c="${c}"]`);
      if (next) next.focus();
      else e.target.blur();
    },

    async removeLegacy(m) {
      if (!confirm(`「${m.name}」を旧データから削除しますか？`)) return;
      await deleteMaterial(m.id);
      await this.store.loadMaterials();
      this.store.showToast('削除しました', 'info');
    },
  },
};
