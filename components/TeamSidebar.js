// ============================================================
//  components/TeamSidebar.js  —  チーム編成のサイドパネル
//  モード切替 (通常 / 制約解除決戦) + 検索 + 用途・未所持のフィルタ
// ============================================================

const TeamSidebarComponent = {
  inject: ['store'],
  template: `
    <div class="sidebar-content">
      <div class="sidebar-section-id">MODE</div>
      <div class="mode-toggle">
        <button v-for="m in TEAM_MODES" :key="m.value"
          class="mode-toggle-btn"
          :class="{ active: store.teamMode === m.value }"
          @click="store.teamMode = m.value">
          {{ m.label }}
          <span class="mode-toggle-tag">ST {{ m.striker }} / SP {{ m.special }}</span>
        </button>
      </div>

      <div class="sidebar-section-id">SEARCH</div>
      <div class="sidebar-field">
        <input type="text" v-model="store.teamFilter.name" placeholder="編成名・生徒名で検索">
      </div>

      <div class="sidebar-section-id">FILTER</div>
      <div class="sidebar-field">
        <span class="sidebar-label">用途</span>
        <div class="chip-row">
          <button v-for="p in TEAM_PURPOSES" :key="p.value" class="filter-chip"
            :class="{ active: store.teamFilter.purpose === p.value }"
            @click="store.teamFilter.purpose = store.teamFilter.purpose === p.value ? '' : p.value">
            <i class="filter-chip-dot" :style="{ background: purposeColor(p.value) }"></i>{{ p.label }}
          </button>
        </div>
      </div>

      <div class="sidebar-field">
        <span class="sidebar-label">表示</span>
        <div class="seg-toggle">
          <button :class="{ active: !store.teamFilter.unownedOnly }" @click="store.teamFilter.unownedOnly = false">すべて</button>
          <button :class="{ active: store.teamFilter.unownedOnly }" @click="store.teamFilter.unownedOnly = true">未所持を含む</button>
        </div>
      </div>

      <button class="sidebar-reset-btn" @click="store.resetTeamFilter()">
        フィルタをリセット
      </button>
    </div>
  `,

  methods: {
    purposeColor(value) {
      return (PURPOSE_COLORS[value] || PURPOSE_COLORS.other).main;
    },
  },
};
