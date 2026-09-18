// ============================================================
//  components/StudentChecker.js  —  所持チェッカー
//  全生徒(マスタ)を学校ごとにグルーピングして
//  チェックボックスで一括所持登録するビュー
// ============================================================

const StudentCheckerComponent = {
  inject: ['store'],
  template: `
    <div class="checker-container">
      <!-- ヘッダー: 件数 + 一括操作 -->
      <div class="checker-header">
        <div class="student-count">
          <span class="count-num">{{ ownedCount }}</span>
          <span class="count-divider">/</span>
          <span class="count-total">{{ filtered.length }} 名</span>
          <span class="count-divider">・</span>
          <span class="count-owned">所持率 {{ ownedPercent }}%</span>
        </div>
        <div class="checker-bulk-actions">
          <button class="btn-edit" @click="bulkSet(true)" :disabled="filtered.length === 0">
            表示中を全て所持
          </button>
          <button class="btn-edit" @click="bulkSet(false)" :disabled="filtered.length === 0">
            表示中を全て未所持
          </button>
        </div>
      </div>

      <!-- グルーピング表示 -->
      <div v-if="grouped.length === 0" class="empty-state">
        <div class="empty-state-mark">該当なし</div>
        <div class="empty-state-msg">条件に一致する生徒が見つかりません</div>
      </div>

      <div v-else class="checker-list">
        <div v-for="g in grouped" :key="g.school" class="checker-group">
          <div class="checker-school-header checker-school-header--clickable"
            @click="toggleCollapse(g.school)"
            :title="isCollapsed(g.school) ? 'クリックで展開' : 'クリックで折りたたみ'">
            <span class="checker-school-toggle">{{ isCollapsed(g.school) ? '▶' : '▼' }}</span>
            <span class="checker-school-name">{{ g.school }}</span>
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
      const f = this.store.studentFilters;
      return this.store.students.filter(s => {
        if (f.name && !s.name.includes(f.name)) return false;
        if (f.school && s.school !== f.school) return false;
        if (f.class  && s.class  !== f.class)  return false;
        if (f.rarity && String(s.rarity) !== f.rarity) return false;
        if (f.attackType && s.attackType !== f.attackType) return false;
        if (f.owned !== '') {
          const owned = f.owned === 'true';
          if (s.owned !== owned) return false;
        }
        return true;
      });
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
