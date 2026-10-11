// ============================================================
//  components/StudentChecker.js  —  所持チェッカー
//  全生徒(マスタ)を学校ごとにグルーピングして
//  チェックボックスで一括所持登録するビュー
// ============================================================

const StudentCheckerComponent = {
  inject: ['store'],
  template: `
    <div class="checker-container">
      <!-- 見出し: 表示中の所持率 + 一括操作 -->
      <page-head ja="所持チェッカー" en="OWNERSHIP CHECK">
        <div class="roster-progress">
          <div class="roster-progress-text">
            <span>表示中の所持率</span>
            <span><b>{{ ownedCount }}</b> / {{ filtered.length }} 名 · {{ ownedPercent }}%</span>
          </div>
          <div class="skew-bar"><div :style="{ width: ownedPercent + '%' }"></div></div>
        </div>
        <div class="page-head-right checker-bulk-actions">
          <button class="btn-edit" @click="bulkSet(true)" :disabled="filtered.length === 0">
            表示中を全て所持
          </button>
          <button class="btn-edit" @click="bulkSet(false)" :disabled="filtered.length === 0">
            表示中を全て未所持
          </button>
        </div>
      </page-head>
      <student-active-filters :count="filtered.length"></student-active-filters>

      <!-- グルーピング表示 -->
      <div v-if="grouped.length === 0" class="empty-state">
        <div class="empty-state-mark">該当なし</div>
        <div class="empty-state-msg">条件に一致する生徒が見つかりません</div>
      </div>

      <div v-else class="checker-list">
        <div v-for="g in grouped" :key="g.school" class="checker-group">
          <div class="checker-school-header checker-school-header--clickable"
            :style="{ borderLeftColor: schoolColor(g.school) }"
            @click="toggleCollapse(g.school)"
            :title="isCollapsed(g.school) ? 'クリックで展開' : 'クリックで折りたたみ'">
            <span class="checker-school-toggle">{{ isCollapsed(g.school) ? '▶' : '▼' }}</span>
            <span class="checker-school-name">{{ g.school }}</span>
            <span class="checker-school-en">{{ schoolEn(g.school) }}</span>
            <div class="skew-bar checker-school-bar">
              <div :style="{ width: (g.owned / g.students.length * 100) + '%', background: schoolColor(g.school) }"></div>
            </div>
            <span class="checker-school-count">{{ g.owned }} / {{ g.students.length }}</span>
          </div>
          <label v-for="s in g.students" :key="s.id"
            v-show="!isCollapsed(g.school)"
            class="checker-row"
            :class="{ 'checker-row-owned': s.owned }">
            <input type="checkbox" :checked="s.owned" @change="toggle(s)" class="checker-checkbox">
            <span class="checker-avatar" :style="avatarStyle(s)">
              <img v-if="s.imageData || s.imageUrl" :src="s.imageData || s.imageUrl" loading="lazy" :alt="s.name">
            </span>
            <span class="checker-name">{{ s.name }}</span>
            <span class="checker-stars">{{ '★'.repeat(s.rarity) }}</span>
            <span class="badge" :class="'badge-' + s.attackType">{{ attackLabel(s.attackType) }}</span>
            <span class="badge" :class="s.role === 'striker' ? 'badge-striker' : 'badge-special-pos'">
              {{ s.role === 'striker' ? 'ST' : 'SP' }}
            </span>
            <span class="badge" :class="'badge-obt-' + (s.obtainability || 'permanent')">
              {{ obtainabilityLabel(s.obtainability) }}
            </span>
          </label>
        </div>
      </div>
    </div>
  `,

  computed: {
    filtered() {
      return this.store.students.filter(s => this.store.matchStudentFilter(s));
    },

    grouped() {
      const map = {};
      for (const s of this.filtered) {
        const k = s.school || '(未設定)';
        if (!map[k]) map[k] = [];
        map[k].push(s);
      }
      // 学校順序: SCHOOLS の正規順を優先、未掲載は末尾アルファベット順
      const known = SCHOOLS.filter(s => map[s]);
      const extras = Object.keys(map).filter(s => !SCHOOLS.includes(s)).sort();
      const orderedKeys = [...known, ...extras];

      return orderedKeys.map(school => {
        const list = map[school].sort((a, b) => {
          if (a.rarity !== b.rarity) return b.rarity - a.rarity;
          return (a.name || '').localeCompare(b.name || '');
        });
        return {
          school,
          students: list,
          owned: list.filter(s => s.owned).length,
        };
      });
    },

    ownedCount() {
      return this.filtered.filter(s => s.owned).length;
    },

    ownedPercent() {
      if (this.filtered.length === 0) return 0;
      return Math.round(this.ownedCount / this.filtered.length * 100);
    },
  },

  methods: {
    schoolColor(school) {
      return schoolAccentColor(school);
    },

    schoolEn(school) {
      return SCHOOL_EN[school] || '';
    },

    avatarStyle(s) {
      return { background: SCHOOL_COLORS[s.school] || SCHOOL_COLOR_FALLBACK };
    },

    async toggle(s) {
      await toggleOwned(s.id, s.owned);
      await this.store.loadStudents();
    },

    async bulkSet(owned) {
      const targets = this.filtered.filter(s => s.owned !== owned);
      if (targets.length === 0) return;
      const verb = owned ? '所持' : '未所持';
      if (!confirm(`表示中の ${targets.length} 名を「${verb}」に変更しますか？`)) return;
      for (const s of targets) {
        saveUserStudent(s.id, { owned });
      }
      await this.store.loadStudents();
      this.store.showToast(`${targets.length} 名を更新しました`, 'success');
    },

    attackLabel(val) {
      const t = ATTACK_TYPES.find(t => t.value === val);
      return t ? t.label : val;
    },

    obtainabilityLabel(val) {
      const t = OBTAINABILITIES.find(t => t.value === val);
      return t ? t.label : (val || '恒常');
    },

    isCollapsed(school) {
      return !!this.store.checkerCollapsed[school];
    },

    toggleCollapse(school) {
      this.store.checkerCollapsed[school] = !this.store.checkerCollapsed[school];
    },
  },
};
