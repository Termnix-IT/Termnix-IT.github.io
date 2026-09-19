// ============================================================
//  app.js  —  Vueアプリ ルート & グローバルストア
// ============================================================

// リアクティブストア（グローバル状態管理）
const store = Vue.reactive({
  // データ
  students:  [],
  gacha:     [],
  memos:     [],
  teams:     [],
  materials: [],

  // UI状態
  activeTab:         'students',
  selectedStudentId: null,
  showStudentDetail: false,
  toast: null,
  _toastTimer: null,

  // ── ページ別サイドパネル状態 ─────────────────────────
  studentFilters: { name: '', school: '', class: '', rarity: '', attackType: '', owned: '' },
  studentSortKey: 'school',
  studentView: 'grid',  // 'grid' (カードグリッド) / 'checker' (所持チェッカー)
  checkerCollapsed: {},  // 所持チェッカーの学校別折りたたみ状態 { [school]: true }
  // Object.assign で既存の reactive オブジェクトを mutate する
  // (this.foo = {...} の再代入だと v-model 側の双方向バインドが残ることがある)
  resetStudentFilters() {
    Object.assign(this.studentFilters, {
      name: '', school: '', class: '', rarity: '', attackType: '', owned: '',
    });
    this.studentSortKey = 'school';
  },

  memoSelectedId: null,
  memoIsCreating: false,
  memoSearch: '',

  teamMode: 'normal',
  teamFilter: { purpose: '', name: '' },
  resetTeamFilter() {
    Object.assign(this.teamFilter, { purpose: '', name: '' });
  },

  // 素材: 'input' = 所持数の入力 / 'overview' = 一括確認
  materialView: 'input',
  materialFilter: { category: '', name: '', hideZero: false },
  resetMaterialFilter() {
    Object.assign(this.materialFilter, { category: '', name: '', hideZero: false });
  },
  // 素材の所持数 { [materialId]: 個数 } (localStorage 永続化、data/materials.js のマスタ id がキー)
  materialInventory: {},
  setMaterialQty(id, value) {
    const n = Math.max(0, Math.floor(Number(value) || 0));
    if (n > 0) this.materialInventory[id] = n;
    else delete this.materialInventory[id];
    saveMaterialInventory(this.materialInventory);
  },

  // ミニゲーム: 選択中のゲーム ID (null = ハブ画面)
  minigameSelected: null,

  gachaMode: 'pickup',
  // ガチャ枠の対象生徒ID。プール識別子別に保持
  gachaPickupIds: [],              // 全モード共通: PU★3 対象
  gachaLimitedFallthroughIds: [],  // anniversary モード: PU 以外の周年限定生徒 (0.9% 枠)
  // 呼び出しチャージ / アーカイブポイント (募集期間をまたいで持ち越すので localStorage に永続化)
  gachaCharge: { pickup: 0, limited: 0, archive: 0 },
  loadGachaCharge() {
    try {
      const raw = localStorage.getItem('BlueArchive.gacha.charge');
      if (raw) Object.assign(this.gachaCharge, JSON.parse(raw));
    } catch (e) { console.warn('gachaCharge 読込失敗', e); }
  },
  saveGachaCharge() {
    try { localStorage.setItem('BlueArchive.gacha.charge', JSON.stringify(this.gachaCharge)); }
    catch (e) { console.warn('gachaCharge 保存失敗', e); }
  },

  // ── データロード ─────────────────────────────────────────
  async loadStudents() {
    this.students = await getAllStudents();
  },
  async loadGacha() {
    this.gacha = await getAllGacha();
  },
  async loadMemos() {
    this.memos = await getAllMemos();
  },
  async loadTeams() {
    this.teams = await getAllTeams();
  },
  // materials = 旧 db.materials (移行元・旧データ表示用)、materialInventory = 現行の所持数
  async loadMaterials() {
    await migrateLegacyMaterials();
    this.materials = await getAllMaterials();
    this.materialInventory = getMaterialInventory();
  },
  async loadAll() {
    this.loadGachaCharge();
    await Promise.all([
      this.loadStudents(),
      this.loadGacha(),
      this.loadMemos(),
      this.loadTeams(),
      this.loadMaterials(),
    ]);
  },

  // ── 生徒詳細パネル ───────────────────────────────────────
  openStudentDetail(id) {
    this.selectedStudentId = id;
    this.showStudentDetail = true;
  },
  closeStudentDetail() {
    this.showStudentDetail = false;
    this.selectedStudentId = null;
  },

  // ── トースト通知 ─────────────────────────────────────────
  showToast(message, type = 'info') {
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this.toast = { message, type };
    this._toastTimer = setTimeout(() => { this.toast = null; }, 3000);
  },
});

// ============================================================
//  ルートコンポーネント
// ============================================================
const App = {
  provide() {
    return { store };
  },

  template: `
    <div class="app-shell" :class="{ 'sidebar-collapsed': sidebarCollapsed, 'sidebar-mobile-open': sidebarMobileOpen }">
      <!-- ヘッダー & ナビ -->
      <header id="app-header">
        <!-- 上段: タイトル + アクション -->
        <div class="header-top">
          <button class="sidebar-toggle-btn" @click="toggleSidebar" title="サイドパネル">
            <span>≡</span>
          </button>
          <h1>
            <span class="os-bracket">SCHALE</span>Blue Archive DB<span class="os-version">v0.2</span>
          </h1>
          <div style="flex:1"></div>
          <div class="header-status">
            <span class="os-status-dot"></span>
            <span>接続中 · {{ clockText }}</span>
          </div>
          <div class="header-actions">
            <button @click="handleExport" title="データをJSONファイルに書き出す">エクスポート</button>
            <button @click="triggerImport" title="JSONファイルからデータを読み込む">インポート</button>
            <input type="file" ref="importFile" accept=".json" style="display:none" @change="handleImport">
          </div>
        </div>
        <!-- 下段: タブナビゲーション -->
        <nav class="tab-nav">
          <button class="tab-btn" :class="{ active: store.activeTab === 'students' }"
            @click="store.activeTab = 'students'"><span class="tab-glyph">◆</span>生徒</button>
          <button class="tab-btn" :class="{ active: store.activeTab === 'gacha' }"
            @click="store.activeTab = 'gacha'"><span class="tab-glyph">◇</span>ガチャ</button>
          <button class="tab-btn" :class="{ active: store.activeTab === 'memos' }"
            @click="store.activeTab = 'memos'"><span class="tab-glyph">◈</span>攻略メモ</button>
          <button class="tab-btn" :class="{ active: store.activeTab === 'teams' }"
            @click="store.activeTab = 'teams'"><span class="tab-glyph">▤</span>編成</button>
          <button class="tab-btn" :class="{ active: store.activeTab === 'materials' }"
            @click="store.activeTab = 'materials'"><span class="tab-glyph">▦</span>素材</button>
          <button class="tab-btn" :class="{ active: store.activeTab === 'minigame' }"
            @click="store.activeTab = 'minigame'"><span class="tab-glyph">▷</span>ミニゲーム</button>
          <button class="tab-btn" :class="{ active: store.activeTab === 'help' }"
            @click="store.activeTab = 'help'"><span class="tab-glyph">?</span>使い方</button>
        </nav>
      </header>

      <div class="app-body">
        <!-- ── サイドパネル ── -->
        <aside id="app-sidebar" :aria-expanded="!sidebarCollapsed">
          <div v-if="!sidebarCollapsed" class="sidebar-body">
            <student-sidebar v-if="store.activeTab === 'students'"></student-sidebar>
            <memo-sidebar v-if="store.activeTab === 'memos'"></memo-sidebar>
            <team-sidebar v-if="store.activeTab === 'teams'"></team-sidebar>
            <material-sidebar v-if="store.activeTab === 'materials'"></material-sidebar>
            <gacha-sidebar v-if="store.activeTab === 'gacha'"></gacha-sidebar>
            <help-sidebar v-if="store.activeTab === 'help'"></help-sidebar>
            <minigame-sidebar v-if="store.activeTab === 'minigame'"></minigame-sidebar>
          </div>
        </aside>

        <!-- モバイルドラワー背景 -->
        <div v-if="sidebarMobileOpen" class="sidebar-backdrop" @click="sidebarMobileOpen = false"></div>

        <!-- ── メインエリア ── -->
        <main id="main-content">
          <div v-if="store.activeTab === 'students'">
            <student-checker v-if="store.studentView === 'checker'"></student-checker>
            <student-list v-else></student-list>
          </div>
          <div v-if="store.activeTab === 'gacha'">
            <gacha-simulator></gacha-simulator>
          </div>
          <div v-if="store.activeTab === 'memos'">
            <strategy-memo></strategy-memo>
          </div>
          <div v-if="store.activeTab === 'teams'">
            <team-composition></team-composition>
          </div>
          <div v-if="store.activeTab === 'materials'">
            <material-management></material-management>
          </div>
          <div v-if="store.activeTab === 'help'">
            <help-guide></help-guide>
          </div>
          <div v-if="store.activeTab === 'minigame'">
            <minigame-halo v-if="store.minigameSelected === 'halo'"></minigame-halo>
            <minigame-hub v-else></minigame-hub>
          </div>
        </main>
      </div>

      <!-- 生徒詳細モーダル -->
      <student-detail v-if="store.showStudentDetail"></student-detail>

      <!-- トースト通知 -->
      <div v-if="store.toast" class="toast" :class="store.toast.type">
        {{ store.toast.message }}
      </div>
    </div>
  `,

  data() {
    return {
      store,
      clockText: '',
      sidebarCollapsed: JSON.parse(localStorage.getItem('schaleSidebarCollapsed') || 'false'),
      sidebarMobileOpen: false,
    };
  },

  watch: {
    sidebarCollapsed(v) {
      localStorage.setItem('schaleSidebarCollapsed', JSON.stringify(v));
    },
  },

  async mounted() {
    await seedStudentsIfEmpty();
    await store.loadAll();
    this.updateClock();
    this._clockTimer = setInterval(() => this.updateClock(), 1000);
  },

  beforeUnmount() {
    if (this._clockTimer) clearInterval(this._clockTimer);
  },

  methods: {
    toggleSidebar() {
      if (window.innerWidth <= 768) {
        this.sidebarMobileOpen = !this.sidebarMobileOpen;
      } else {
        this.sidebarCollapsed = !this.sidebarCollapsed;
      }
    },

    updateClock() {
      const d = new Date();
      const pad = n => String(n).padStart(2, '0');
      this.clockText = `${d.getFullYear()}.${pad(d.getMonth()+1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    },

    async handleExport() {
      const result = await exportAllData();
      store.showToast(result.message, result.ok ? 'success' : 'error');
    },

    triggerImport() {
      this.$refs.importFile.value = '';
      this.$refs.importFile.click();
    },

    async handleImport(e) {
      const file = e.target.files[0];
      if (!file) return;

      const mode = confirm(
        'インポート方法を選択してください\n\n' +
        '【OK】 置き換え: 現在のデータをすべて削除してインポート\n' +
        '【キャンセル】 マージ: 既存データに追記'
      ) ? 'replace' : 'merge';

      const text = await file.text();
      const result = await importAllData(text, mode);
      store.showToast(result.message, result.ok ? 'success' : 'error');
      if (result.ok) await store.loadAll();
    },
  },
};

// ============================================================
//  Vue アプリ起動
// ============================================================
const app = Vue.createApp(App);

// テンプレートから参照する定数 (db.js の const はテンプレートスコープに無いので明示的に公開)
app.config.globalProperties.SCHOOLS         = SCHOOLS;
app.config.globalProperties.CLASSES         = CLASSES;
app.config.globalProperties.ROLES           = ROLES;
app.config.globalProperties.POSITIONS       = POSITIONS;
app.config.globalProperties.WEAPONS         = WEAPONS;
app.config.globalProperties.ATTACK_TYPES    = ATTACK_TYPES;
app.config.globalProperties.ARMOR_TYPES     = ARMOR_TYPES;
app.config.globalProperties.OBTAINABILITIES = OBTAINABILITIES;
app.config.globalProperties.MEMO_CATEGORIES = MEMO_CATEGORIES;
app.config.globalProperties.TEAM_MODES      = TEAM_MODES;
app.config.globalProperties.TEAM_PURPOSES   = TEAM_PURPOSES;
app.config.globalProperties.MATERIAL_CATEGORIES = MATERIAL_CATEGORIES;
app.config.globalProperties.GACHA_MODES     = GACHA_MODES;

// コンポーネント登録
app.component('student-list',        StudentListComponent);
app.component('student-sidebar',     StudentSidebarComponent);
app.component('student-checker',     StudentCheckerComponent);
app.component('student-detail',      StudentDetailComponent);
app.component('gacha-simulator',     GachaSimulatorComponent);
app.component('gacha-sidebar',       GachaSidebarComponent);
app.component('strategy-memo',       StrategyMemoComponent);
app.component('memo-sidebar',        MemoSidebarComponent);
app.component('team-composition',    TeamCompositionComponent);
app.component('team-sidebar',        TeamSidebarComponent);
app.component('material-management', MaterialManagementComponent);
app.component('material-sidebar',    MaterialSidebarComponent);
app.component('help-guide',          HelpGuideComponent);
app.component('help-sidebar',        HelpSidebarComponent);
app.component('minigame-hub',        MiniGameHubComponent);
app.component('minigame-halo',       MiniGameHaloSuikaComponent);
app.component('minigame-sidebar',    MiniGameSidebarComponent);

app.mount('#app');
