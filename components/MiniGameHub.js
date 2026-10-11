// ============================================================
//  components/MiniGameHub.js  —  ミニゲーム一覧 (ハブ画面)
// ============================================================

const MINIGAME_REGISTRY = [
  {
    id: 'halo',
    title: 'ヘイローゲーム',
    subtitle: '同色のヘイローを合体させて進化させる物理パズル',
    glyph: '◯',
    status: 'available',
  },
  {
    id: 'character',
    title: '<キャラ名>ゲーム',
    subtitle: '所持生徒のアイコンで遊ぶスイカ系パズル (準備中)',
    glyph: '◆',
    status: 'coming',
  },
];

const MiniGameHubComponent = {
  inject: ['store'],
  data() {
    return { games: MINIGAME_REGISTRY };
  },
  computed: {
    highScores() {
      const map = {};
      try {
        const raw = localStorage.getItem('BlueArchive.minigame.halo.highScore');
        if (raw) map.halo = parseInt(raw, 10) || 0;
      } catch (_) {}
      return map;
    },
  },
  methods: {
    open(game) {
      if (game.status !== 'available') return;
      this.store.minigameSelected = game.id;
    },
  },
  template: `
    <div class="minigame-hub">
      <page-head ja="ミニゲーム" en="MINIGAME">
        <div class="page-head-meta">休憩用の小ゲーム。スコアはあなたのブラウザに保存されます。</div>
      </page-head>

      <div class="minigame-hub-grid">
        <div v-for="g in games" :key="g.id"
             class="minigame-card os-panel"
             :class="{ disabled: g.status !== 'available' }"
             @click="open(g)">
          <div class="minigame-card-glyph">{{ g.glyph }}</div>
          <div class="minigame-card-body">
            <div class="minigame-card-title">{{ g.title }}</div>
            <div class="minigame-card-sub">{{ g.subtitle }}</div>
            <div class="minigame-card-meta">
              <span v-if="g.status === 'available'" class="os-tag">PLAYABLE</span>
              <span v-else class="os-tag minigame-coming">COMING</span>
              <span v-if="g.status === 'available' && highScores[g.id] != null"
                    class="minigame-card-hi">HI {{ highScores[g.id] }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
};
