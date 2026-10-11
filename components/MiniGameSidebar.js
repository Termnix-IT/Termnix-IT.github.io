// ============================================================
//  components/MiniGameSidebar.js  —  ミニゲームタブのサイドパネル
//  常にミニゲーム一覧 (ホーム) を表示。ゲーム中もここから切替可能。
// ============================================================

const MiniGameSidebarComponent = {
  inject: ['store'],
  data() {
    return { games: (typeof MINIGAME_REGISTRY !== 'undefined' ? MINIGAME_REGISTRY : []) };
  },
  methods: {
    goHome() {
      this.store.minigameSelected = null;
    },
    select(g) {
      if (g.status !== 'available') return;
      this.store.minigameSelected = g.id;
    },
    isActive(g) {
      return this.store.minigameSelected === g.id;
    },
  },
  template: `
    <div class="sidebar-content">
      <div class="sidebar-section-id">MINIGAMES</div>

      <ul class="help-sidebar-toc minigame-sidebar-list">
        <li>
          <a href="#" @click.prevent="goHome"
             :class="{ 'minigame-sidebar-active': store.minigameSelected === null }">
            <span class="help-sidebar-glyph">←</span> ホーム (一覧)
          </a>
        </li>
        <li class="help-sidebar-group">ゲーム</li>
        <li v-for="g in games" :key="g.id">
          <a href="#" @click.prevent="select(g)"
             :class="{
               'minigame-sidebar-active': isActive(g),
               'minigame-sidebar-disabled': g.status !== 'available'
             }">
            <span class="help-sidebar-glyph">{{ g.glyph }}</span> {{ g.title }}
            <span v-if="g.status !== 'available'" class="minigame-sidebar-tag">準備中</span>
          </a>
        </li>
      </ul>
    </div>
  `,
};
