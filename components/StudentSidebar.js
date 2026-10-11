// ============================================================
//  components/StudentSidebar.js  —  生徒ページのサイドパネル
//  ビュー切替・名前検索・チップ型フィルタ (並び替えはメイン側の見出しにある)
// ============================================================

const StudentSidebarComponent = {
  inject: ['store'],
  template: `
    <div class="sidebar-content">
      <div class="sidebar-section-id">VIEW</div>
      <div class="seg-toggle">
        <button :class="{ active: store.studentView === 'grid' }" @click="store.studentView = 'grid'">一覧</button>
        <button :class="{ active: store.studentView === 'checker' }" @click="store.studentView = 'checker'">所持チェッカー</button>
      </div>

      <div class="sidebar-section-id">SEARCH</div>
      <div class="sidebar-field">
        <input type="text" v-model="store.studentFilters.name" placeholder="名前で検索">
      </div>

      <div class="sidebar-section-id">FILTER</div>

      <div class="sidebar-field">
        <span class="sidebar-label">所持状況</span>
        <div class="seg-toggle">
          <button :class="{ active: f.owned === '' }" @click="f.owned = ''">すべて</button>
          <button :class="{ active: f.owned === 'true' }" @click="f.owned = 'true'">所持</button>
          <button :class="{ active: f.owned === 'false' }" @click="f.owned = 'false'">未所持</button>
        </div>
      </div>

      <div class="sidebar-field">
        <span class="sidebar-label">レアリティ</span>
        <div class="chip-row">
          <button v-for="r in [1, 2, 3]" :key="r" class="filter-chip mono"
            :class="{ active: f.rarity.includes(r) }"
            @click="store.toggleStudentFilter('rarity', r)">★{{ r }}</button>
        </div>
      </div>

      <div class="sidebar-field">
        <span class="sidebar-label">攻撃タイプ</span>
        <div class="chip-row">
          <button v-for="t in ATTACK_TYPES" :key="t.value" class="filter-chip"
            :class="{ active: f.attackType.includes(t.value) }"
            @click="store.toggleStudentFilter('attackType', t.value)">
            <i class="filter-chip-dot" :style="{ background: attackColor(t.value) }"></i>{{ t.label }}
          </button>
        </div>
      </div>

      <div class="sidebar-field">
        <span class="sidebar-label">学校</span>
        <div class="chip-row">
          <button v-for="s in availableSchools" :key="s" class="filter-chip"
            :class="{ active: f.school.includes(s) }"
            @click="store.toggleStudentFilter('school', s)">
            <i class="filter-chip-dot" :style="{ background: schoolColor(s) }"></i>{{ s }}
          </button>
        </div>
      </div>

      <div class="sidebar-field">
        <span class="sidebar-label">クラス</span>
        <div class="chip-row">
          <button v-for="c in CLASSES" :key="c" class="filter-chip"
            :class="{ active: f.class.includes(c) }"
            @click="store.toggleStudentFilter('class', c)">{{ c }}</button>
        </div>
      </div>

      <div class="sidebar-field">
        <span class="sidebar-label">入手区分</span>
        <div class="chip-row">
          <button v-for="o in OBTAINABILITIES" :key="o.value" class="filter-chip"
            :class="{ active: f.obtainability.includes(o.value) }"
            @click="store.toggleStudentFilter('obtainability', o.value)">{{ o.label }}</button>
        </div>
      </div>

      <button class="sidebar-reset-btn" @click="store.resetStudentFilters()">
        フィルタをリセット
      </button>
    </div>
  `,

  computed: {
    f() {
      return this.store.studentFilters;
    },
    // 学校選択肢: マスタに実在する学校のみ。SCHOOLS 順を優先、未掲載は末尾アルファベット順
    availableSchools() {
      const fromData = new Set();
      for (const s of this.store.students) {
        if (s.school) fromData.add(s.school);
      }
      const ordered = SCHOOLS.filter(s => fromData.has(s));
      const extras  = [...fromData].filter(s => !SCHOOLS.includes(s)).sort();
      return [...ordered, ...extras];
    },
  },

  methods: {
    attackColor(value) {
      return ATTACK_TYPE_COLORS[value] || '#8aa0b8';
    },
    schoolColor(school) {
      return schoolAccentColor(school);
    },
  },
};
