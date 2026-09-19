// ============================================================
//  components/MaterialManagement.js  —  素材 (所持数の入力 / 一括確認)
//
//  素材の種類は data/materials.js のマスタで固定。ユーザーは所持数だけを入力する。
//  store.materialView:
//    'input'    — カテゴリごとの表 (行 = 学校・系統・部位、列 = 段階) に数値を直接入力
//    'overview' — 合計・換算値・全カテゴリの所持状況・生徒別の必要素材を読み取り専用で一覧
//  所持数は store.materialInventory ({ [materialId]: 個数 }) → localStorage に保存。
// ============================================================

const MaterialManagementComponent = {
  inject: ['store'],
  template: `
    <div class="mat-page">

      <!-- ── 一括確認: サマリ ── -->
      <div v-if="isOverview" class="sim-stat-grid mat-summary">
        <div class="sim-stat">
          <div class="sim-stat-label">所持している種類</div>
          <div class="sim-stat-value">{{ summary.kinds }} / {{ masterCount }}</div>
        </div>
        <div class="sim-stat">
          <div class="sim-stat-label">合計個数</div>
          <div class="sim-stat-value">{{ summary.total.toLocaleString() }}</div>
        </div>
        <div class="sim-stat">
          <div class="sim-stat-label">レポート換算 EXP</div>
          <div class="sim-stat-value">{{ summary.reportExp.toLocaleString() }}</div>
        </div>
        <div class="sim-stat">
          <div class="sim-stat-label">強化珠換算 EXP</div>
          <div class="sim-stat-value">{{ summary.enhanceExp.toLocaleString() }}</div>
        </div>
        <div class="sim-stat">
          <div class="sim-stat-label">秘伝ノート (断片換算込み)</div>
          <div class="sim-stat-value">{{ summary.secretNotes }}</div>
        </div>
        <div class="sim-stat">
          <div class="sim-stat-label">必要素材の不足</div>
          <div class="sim-stat-value" :class="{ 'diff-neg': shortageList.length > 0 }">{{ shortageList.length }} 件</div>
        </div>
      </div>

      <div v-else class="mat-input-hint">
        ゲーム内の所持数を入力してください。入力欄から離れるか Enter で自動保存されます(0 または空欄で未所持)。
      </div>

      <!-- ── カテゴリごとの表 ── -->
      <div v-for="sec in sections" :key="sec.cat.value" class="os-panel mat-section">
        <div class="mat-section-head">
          <div>
            <div class="os-section-id">// MATERIAL_{{ sec.cat.value.toUpperCase() }}</div>
            <h3 class="mat-section-title">{{ sec.cat.label }} <span class="mat-section-note">{{ sec.cat.note }}</span></h3>
          </div>
          <div class="mat-section-total">
            合計 <strong>{{ sec.total.toLocaleString() }}</strong>
            <span class="mat-section-kinds">({{ sec.kinds }} / {{ sec.size }} 種)</span>
          </div>
        </div>

        <!-- 段階つき (行 = グループ / 列 = 段階) -->
        <div v-if="sec.cat.columns" class="mat-matrix-wrap">
          <table class="data-table mat-matrix">
            <thead>
              <tr>
                <th class="mat-row-head"></th>
                <th v-for="col in sec.cat.columns" :key="col">{{ col }}</th>
                <th v-if="isOverview" class="mat-sum-col">計</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="grp in sec.groups" :key="grp.id">
                <th class="mat-row-head" :title="grp.hint">
                  {{ grp.label }}<span v-if="grp.hint" class="mat-row-hint">*</span>
                </th>
                <td v-for="(it, ci) in grp.items" :key="it.id" :title="it.name + (it.exp ? ' (EXP+' + it.exp + ')' : '')"
                  :class="{ 'mat-cell-zero': isOverview && !qty(it.id), 'mat-cell-hit': isHit(it) }">
                  <input v-if="!isOverview" type="number" min="0" inputmode="numeric" class="mat-qty-input"
                    :value="qty(it.id) || ''" placeholder="0"
                    @focus="$event.target.select()"
                    @change="setQty(it.id, $event.target.value)"
                    @keydown.enter="$event.target.blur()">
                  <span v-else class="mat-qty-view">{{ qty(it.id) ? qty(it.id).toLocaleString() : '·' }}</span>
                </td>
                <td v-if="isOverview" class="mat-sum-col">{{ groupTotal(grp).toLocaleString() }}</td>
              </tr>
            </tbody>
            <tfoot v-if="isOverview && sec.groups.length > 1">
              <tr>
                <th class="mat-row-head">計</th>
                <td v-for="(col, ci) in sec.cat.columns" :key="col" class="mat-sum-col">
                  {{ columnTotal(sec.groups, ci).toLocaleString() }}
                </td>
                <td class="mat-sum-col">{{ sec.total.toLocaleString() }}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- 段階なし (その他) -->
        <table v-else class="data-table mat-list">
          <tbody>
            <template v-for="grp in sec.groups" :key="grp.id">
              <tr v-for="it in grp.items" :key="it.id" :class="{ 'mat-cell-zero': isOverview && !qty(it.id) }">
                <th class="mat-row-head">
                  {{ it.name }}
                  <span v-if="it.hint" class="mat-row-hint-text">{{ it.hint }}</span>
                </th>
                <td class="mat-list-qty">
                  <input v-if="!isOverview" type="number" min="0" inputmode="numeric" class="mat-qty-input"
                    :value="qty(it.id) || ''" placeholder="0"
                    @focus="$event.target.select()"
                    @change="setQty(it.id, $event.target.value)"
                    @keydown.enter="$event.target.blur()">
                  <span v-else class="mat-qty-view">{{ qty(it.id) ? qty(it.id).toLocaleString() : '·' }}</span>
                </td>
              </tr>
            </template>
          </tbody>
        </table>

        <div v-if="sec.hasHint" class="mat-footnote">* {{ sec.hintText }}</div>
      </div>

      <div v-if="sections.length === 0" class="empty-state">
        <div class="empty-state-mark">該当なし</div>
        <div class="empty-state-msg">
          {{ store.materialFilter.hideZero ? '条件に一致する所持素材がありません' : '条件に一致する素材がありません' }}
        </div>
      </div>

      <!-- ── 一括確認: 生徒別の必要素材 ── -->
      <div v-if="isOverview" class="os-panel mat-section">
        <div class="mat-section-head">
          <div>
            <div class="os-section-id">// STUDENT_NEEDS</div>
            <h3 class="mat-section-title">生徒別の必要素材</h3>
          </div>
          <div class="mat-section-total">
            <span v-if="shortageList.length > 0" class="shortage-warn">⚠ {{ shortageList.length }} 件不足</span>
          </div>
        </div>
        <div v-if="studentNeedsList.length === 0" class="need-empty">
          生徒の詳細画面の「必要素材」で登録すると、ここで所持数との過不足を確認できます。
        </div>
        <table v-else class="data-table" style="width:100%">
          <thead>
            <tr>
              <th style="text-align:left">生徒</th>
              <th style="text-align:left">素材</th>
              <th style="text-align:center">必要</th>
              <th style="text-align:center">所持</th>
              <th style="text-align:center">過不足</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in studentNeedsList" :key="row.key" :class="{ 'shortage-row': row.diff < 0 }">
              <td style="font-weight:700">{{ row.studentName }}</td>
              <td>{{ row.materialName }}</td>
              <td style="text-align:center">{{ row.needed }}</td>
              <td style="text-align:center">{{ row.stock }}</td>
              <td style="text-align:center" :class="row.diff < 0 ? 'diff-neg' : 'diff-pos'">
                {{ row.diff >= 0 ? '+' + row.diff : row.diff }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ── 旧データ: 以前のバージョンで手入力し、マスタに一致しなかった素材 ── -->
      <div v-if="legacyUnmatched.length > 0" class="os-panel mat-section mat-legacy">
        <div class="mat-section-head">
          <div>
            <div class="os-section-id">// LEGACY</div>
            <h3 class="mat-section-title">以前に手入力した素材 <span class="mat-section-note">素材マスタに一致しなかったもの</span></h3>
          </div>
        </div>
        <p class="mat-legacy-desc">
          以前のバージョンで名前を入力して登録した素材のうち、上の一覧と名前が一致しなかったものです。
          所持数を上の一覧に入力し直したら、ここから削除してください。
        </p>
        <table class="data-table mat-list">
          <tbody>
            <tr v-for="m in legacyUnmatched" :key="m.id">
              <th class="mat-row-head">{{ m.name }}<span v-if="m.notes" class="mat-row-hint-text">{{ m.notes }}</span></th>
              <td class="mat-list-qty"><span class="mat-qty-view">{{ (m.quantity || 0).toLocaleString() }}</span></td>
              <td style="text-align:right;width:1%">
                <button class="btn-edit btn-danger" @click="removeLegacy(m)">削除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,

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

    // 表示するカテゴリと、その中の行 (フィルタ適用後)
    sections() {
      const f = this.store.materialFilter;
      const hideZero = this.isOverview && f.hideZero;
      const out = [];
      for (const cat of MATERIAL_CATEGORIES) {
        if (f.category && f.category !== cat.value) continue;
        const all = MATERIAL_GROUPS.filter(g => g.category === cat.value);
        let groups = all.filter(g => this.groupMatches(g));
        if (hideZero) groups = groups.filter(g => this.groupTotal(g) > 0);
        if (groups.length === 0) continue;
        const items = all.flatMap(g => g.items);
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
          const { name, stock } = this.resolveNeed(need);
          const needed = need.quantity || 0;
          rows.push({
            key: `${student.id}-${need.materialId}`,
            studentName: student.name,
            materialName: name,
            needed,
            stock,
            diff: stock - needed,
          });
        }
      }
      return rows.sort((a, b) => a.diff - b.diff);
    },

    shortageList() {
      return this.studentNeedsList.filter(r => r.diff < 0);
    },
  },

  methods: {
    qty(id) {
      return this.inv[id] || 0;
    },
    setQty(id, value) {
      this.store.setMaterialQty(id, value);
    },
    groupTotal(grp) {
      return grp.items.reduce((s, it) => s + this.qty(it.id), 0);
    },
    columnTotal(groups, ci) {
      return groups.reduce((s, g) => s + (g.items[ci] ? this.qty(g.items[ci].id) : 0), 0);
    },
    // 検索語がグループ名 (学校・系統・部位) か、その行の素材名に含まれるか
    groupMatches(grp) {
      const q = this.query;
      if (!q) return true;
      if (grp.label.toLowerCase().includes(q)) return true;
      return grp.items.some(it => it.name.toLowerCase().includes(q));
    },
    // 検索語に直接一致したセルを強調する (グループ名での一致は行全体なので強調しない)
    isHit(it) {
      const q = this.query;
      return !!q && it.name.toLowerCase().includes(q);
    },

    // 必要素材 1 件の表示名と所持数。新形式はマスタ id (文字列)、旧形式は db.materials の数値 id
    resolveNeed(need) {
      const m = MATERIAL_BY_ID[need.materialId];
      if (m) return { name: m.name, stock: this.qty(m.id) };
      const legacy = (this.store.materials || []).find(x => x.id === need.materialId);
      const name = need.materialName || (legacy ? legacy.name : '不明な素材');
      const byName = MATERIAL_BY_NAME[normalizeMaterialName(name)];
      if (byName) return { name: byName.name, stock: this.qty(byName.id) };
      return { name, stock: legacy ? (legacy.quantity || 0) : 0 };
    },

    async removeLegacy(m) {
      if (!confirm(`「${m.name}」を旧データから削除しますか？`)) return;
      await deleteMaterial(m.id);
      await this.store.loadMaterials();
      this.store.showToast('削除しました', 'info');
    },
  },
};
