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
  // owned は '' (すべて) / 'true' / 'false'。それ以外の配列は複数選択のチップ (空 = 絞り込みなし)
  studentFilters: { name: '', owned: '', school: [], class: [], rarity: [], attackType: [], obtainability: [] },
  studentSortKey: 'school',
  studentSortReverse: false,
  studentView: 'grid',  // 'grid' (カードグリッド) / 'checker' (所持チェッカー)
  checkerCollapsed: {},  // 所持チェッカーの学校別折りたたみ状態 { [school]: true }
  // Object.assign で既存の reactive オブジェクトを mutate する
  // (this.foo = {...} の再代入だと v-model 側の双方向バインドが残ることがある)
  resetStudentFilters() {
    Object.assign(this.studentFilters, {
      name: '', owned: '', school: [], class: [], rarity: [], attackType: [], obtainability: [],
    });
  },
  toggleStudentFilter(key, value) {
    const list = this.studentFilters[key];
    const i = list.indexOf(value);
    if (i < 0) list.push(value);
    else list.splice(i, 1);
  },
  // 生徒一覧と所持チェッカーで共通の絞り込み条件
  matchStudentFilter(s) {
    const f = this.studentFilters;
    if (f.name && !s.name.includes(f.name)) return false;
    if (f.owned !== '' && s.owned !== (f.owned === 'true')) return false;
    if (f.school.length && !f.school.includes(s.school)) return false;
    if (f.class.length && !f.class.includes(s.class)) return false;
    if (f.rarity.length && !f.rarity.includes(s.rarity)) return false;
    if (f.attackType.length && !f.attackType.includes(s.attackType)) return false;
    if (f.obtainability.length && !f.obtainability.includes(s.obtainability || 'permanent')) return false;
    return true;
  },

  memoSelectedId: null,
  memoIsCreating: false,
  memoSearch: '',

  teamMode: 'normal',
  // name は編成名・メンバー名の検索、unownedOnly は未所持の生徒を含む編成だけを表示
  teamFilter: { purpose: '', name: '', unownedOnly: false },
  resetTeamFilter() {
    Object.assign(this.teamFilter, { purpose: '', name: '', unownedOnly: false });
  },

  // 素材: 'input' = 所持数の入力 / 'overview' = 一括確認
  materialView: 'input',
  // category = サイドパネルで最後に選んだカテゴリ (強調表示用。絞り込みではなくその表へ移動する)
  // show = 一括確認の表示 ('all' すべて / 'owned' 所持のみ / 'short' 不足のみ)
  materialFilter: { category: '', name: '', show: 'all' },
  resetMaterialFilter() {
    Object.assign(this.materialFilter, { category: '', name: '', show: 'all' });
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
          <h1 class="app-logo">
            <span class="app-logo-mark">SCHALE</span><span class="app-logo-text">Blue Archive DB</span>
          </h1>
          <div style="flex:1"></div>
          <!-- 資源カウンター風: 所持生徒数 / 選択中の募集のチャージ -->
          <div class="res-pill" title="所持している生徒 / 全生徒">
            <span class="res-pill-ico">生</span><b>{{ ownedCount }}</b><span class="res-pill-max">/ {{ store.students.length }}</span>
          </div>
          <div class="res-pill" :title="chargePill.title">
            <span class="res-pill-ico yellow">{{ chargePill.icon }}</span><b>{{ chargePill.value }}</b><span class="res-pill-max">/ 200</span>
          </div>
          <div class="data-menu" ref="dataMenu">
            <button class="data-menu-btn" :class="{ open: dataMenuOpen }" @click="dataMenuOpen = !dataMenuOpen">⚙ データ ▾</button>
            <div v-if="dataMenuOpen" class="data-menu-pop">
              <button @click="handleExport">エクスポート<small>全データを JSON ファイルに書き出す</small></button>
              <button @click="triggerImport">インポート<small>JSON ファイルから読み込む</small></button>
            </div>
          </div>
          <input type="file" ref="importFile" accept=".json" style="display:none" @change="handleImport">
        </div>
        <!-- 下段: タブナビゲーション -->
        <nav class="tab-nav">
          <button v-for="t in tabs" :key="t.id" class="tab-btn" :class="{ active: store.activeTab === t.id }"
            @click="store.activeTab = t.id">{{ t.ja }}<span class="tab-en">{{ t.en }}</span></button>
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
      tabs: [
        { id: 'students',  ja: '生徒',       en: 'STUDENTS' },
        { id: 'gacha',     ja: 'ガチャ',     en: 'RECRUIT' },
        { id: 'memos',     ja: '攻略メモ',   en: 'MEMO' },
        { id: 'teams',     ja: '編成',       en: 'FORMATION' },
        { id: 'materials', ja: '素材',       en: 'ITEMS' },
        { id: 'minigame',  ja: 'ミニゲーム', en: 'GAME' },
        { id: 'help',      ja: '使い方',     en: 'HELP' },
      ],
      dataMenuOpen: false,
      sidebarCollapsed: JSON.parse(localStorage.getItem('schaleSidebarCollapsed') || 'false'),
      sidebarMobileOpen: false,
    };
  },

  computed: {
    ownedCount() {
      return store.students.filter(s => s.owned).length;
    },
    // ヘッダーのチャージ表示: ガチャタブで選んでいる募集のチャージ (アーカイブはポイント)
    chargePill() {
      const mode = GACHA_MODES.find(m => m.value === store.gachaMode) || GACHA_MODES[0];
      const value = store.gachaCharge[mode.chargeType] || 0;
      if (mode.chargeType === 'archive') {
        return { icon: 'P', value, title: 'アーカイブポイント (200pt で PU と交換)' };
      }
      const label = mode.chargeType === 'limited' ? '限定・呼び出しチャージ' : '呼び出しチャージ';
      return { icon: 'C', value, title: `${label} (100 で ★3 確定 / 200 で PU 確定)` };
    },
  },

  watch: {
    sidebarCollapsed(v) {
      localStorage.setItem('schaleSidebarCollapsed', JSON.stringify(v));
    },
  },

  async mounted() {
    await seedStudentsIfEmpty();
    await store.loadAll();
    this._onDocClick = (e) => {
      if (this.dataMenuOpen && this.$refs.dataMenu && !this.$refs.dataMenu.contains(e.target)) {
        this.dataMenuOpen = false;
      }
    };
    document.addEventListener('click', this._onDocClick);
  },

  beforeUnmount() {
    document.removeEventListener('click', this._onDocClick);
  },

  methods: {
    toggleSidebar() {
      if (window.innerWidth <= 768) {
        this.sidebarMobileOpen = !this.sidebarMobileOpen;
      } else {
        this.sidebarCollapsed = !this.sidebarCollapsed;
      }
    },

    async handleExport() {
      this.dataMenuOpen = false;
      const result = await exportAllData();
      store.showToast(result.message, result.ok ? 'success' : 'error');
    },

    triggerImport() {
      this.dataMenuOpen = false;
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

// 各ページ共通の大見出し (和文 + 英字)。右側の件数・並び替えなどはスロットで渡す
app.component('page-head', {
  props: { ja: String, en: String },
  template: `
    <div class="page-head">
      <div>
        <div class="page-head-ja">{{ ja }}</div>
        <div class="page-head-en">{{ en }}</div>
      </div>
      <slot></slot>
    </div>
  `,
});

// −/＋ ボタン付きの数値入力 (v-model 対応)。中央の数字は直接入力もできる
app.component('num-stepper', {
  props: {
    modelValue: { type: Number, default: 0 },
    min: { type: Number, default: 0 },
    max: { type: Number, default: 999 },
    accent: { type: String, default: '' },  // 'pink' など。枠とボタンの色を変える
  },
  emits: ['update:modelValue'],
  template: `
    <div class="num-stepper" :class="accent ? 'num-stepper--' + accent : ''">
      <button type="button" :disabled="modelValue <= min" @click="set(modelValue - 1)">−</button>
      <input type="number" :min="min" :max="max" :value="modelValue"
        @focus="$event.target.select()"
        @change="set($event.target.value); $event.target.value = modelValue"
        @keydown.enter="$event.target.blur()">
      <button type="button" :disabled="modelValue >= max" @click="set(modelValue + 1)">＋</button>
    </div>
  `,
  methods: {
    set(v) {
      const n = Math.round(Number(v));
      const clamped = Number.isFinite(n) ? Math.min(this.max, Math.max(this.min, n)) : this.min;
      this.$emit('update:modelValue', clamped);
    },
  },
});

// コンポーネント登録
app.component('student-list',        StudentListComponent);
app.component('student-active-filters', StudentActiveFiltersComponent);
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
