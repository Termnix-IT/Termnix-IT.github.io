// ============================================================
//  components/GachaSidebar.js  —  ガチャページのサイドパネル
//  募集モード切替 + 排出枠表 + PU 生徒選択 + チャージ操作
// ============================================================

const GachaSidebarComponent = {
  inject: ['store'],

  data() {
    return {
      showModal: false,
      modalTarget: 'gachaPickupIds',   // 編集対象の store キー
      modalTitle: '',
      modalSearch: '',
      chargeInput: '',
    };
  },

  template: `
    <div class="sidebar-content">
      <div class="sidebar-section-id">// MODE</div>
      <div class="mode-toggle">
        <button v-for="m in GACHA_MODES" :key="m.value"
          class="mode-toggle-btn"
          :class="{ active: store.gachaMode === m.value }"
          @click="store.gachaMode = m.value">
          {{ m.label }}
        </button>
      </div>

      <div class="sidebar-section-id">// RATES</div>
      <div class="gacha-rates-table">
        <div v-for="(r, i) in currentMode.rates" :key="i" class="gacha-rate-row"
          :class="'gacha-rate-stars-' + r.stars">
          <span class="gacha-rate-label">{{ r.label }}</span>
          <span class="gacha-rate-pct">{{ (r.pct * 100).toFixed(1) }}%</span>
        </div>
      </div>

      <div class="sidebar-section-id">// INFO</div>
      <div class="gacha-mode-info">{{ currentMode.description }}</div>
      <div class="gacha-mode-info" v-if="currentMode.pity === 'charge'">
        <strong>{{ chargeLabel }}</strong><br>
        100 到達で ★3 確定・50% で PU<br>
        200 到達で PU 確定<br>
        PU 入手でリセット / 期間をまたいで持ち越し
      </div>
      <div class="gacha-mode-info" v-else>
        <strong>アーカイブポイント</strong><br>
        200pt で PU 生徒と交換 (リセットは交換時のみ)
      </div>
      <div class="gacha-mode-info">
        <strong>排出対象</strong><br>
        すり抜け・★2・★1 は恒常生徒のみ<br>
        限定生徒は PU に選んだときだけ排出<br>
        配布生徒はガチャから出ません
      </div>

      <!-- チャージ / ポイントの手動設定 (ゲーム内の現在値を再現する用) -->
      <div class="sidebar-section-id">// CHARGE</div>
      <div class="sidebar-field">
        <label>現在値 ({{ chargeLabel }})</label>
        <div class="gacha-charge-row">
          <input type="number" min="0" max="199" v-model="chargeInput"
            :placeholder="String(store.gachaCharge[currentMode.chargeType] || 0)">
          <button class="sidebar-add-btn" @click="applyCharge">設定</button>
          <button class="sidebar-add-btn" @click="applyCharge(0)">0</button>
        </div>
      </div>

      <!-- PU 生徒 -->
      <div class="sidebar-section-id">// PICKUP</div>
      <div class="gacha-pickup-list">
        <span v-if="pickupStudents.length === 0" class="gacha-pickup-empty">未指定 (★3 を選んでください)</span>
        <span v-else v-for="s in pickupStudents" :key="s.id" class="gacha-pickup-chip">
          {{ s.name }}
          <span class="gacha-pickup-chip-x" @click="removeFrom('gachaPickupIds', s.id)">×</span>
        </span>
      </div>
      <button class="sidebar-add-btn" style="margin-top:6px" @click="openModal('gachaPickupIds', 'PU 生徒を選択')">
        ＋ PU生徒を選択
      </button>

      <!-- 周年限定: PU 以外の周年限定生徒 (0.9% 枠) -->
      <template v-if="store.gachaMode === 'anniversary'">
        <div class="sidebar-section-id">// FES (非PU)</div>
        <div class="gacha-pickup-list">
          <span v-if="fesStudents.length === 0" class="gacha-pickup-empty">未指定 (枠は恒常★3で埋まります)</span>
          <span v-else v-for="s in fesStudents" :key="s.id" class="gacha-pickup-chip gacha-pickup-chip-fes">
            {{ s.name }}
            <span class="gacha-pickup-chip-x" @click="removeFrom('gachaLimitedFallthroughIds', s.id)">×</span>
          </span>
        </div>
        <button class="sidebar-add-btn" style="margin-top:6px"
          @click="openModal('gachaLimitedFallthroughIds', '周年限定生徒 (非PU) を選択')">
          ＋ 周年限定生徒を選択
        </button>
      </template>

      <!-- 生徒選択モーダル (body直下にテレポート) -->
      <teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
        <div class="modal-box" style="max-width:500px">
          <div class="scan-line"></div>
          <div class="modal-header">
            <h2>{{ modalTitle }}</h2>
            <button class="modal-close" @click="showModal = false">×</button>
          </div>
          <div style="margin-bottom:8px">
            <input type="text" v-model="modalSearch" placeholder="名前で検索" class="member-modal-search">
          </div>
          <div style="max-height:400px;overflow-y:auto;border:1px solid #c9dcef;border-radius:2px">
            <div v-for="s in filteredModalStudents" :key="s.id"
              class="member-select-row"
              :class="{ selected: targetIds.includes(s.id) }"
              @click="toggleIn(modalTarget, s.id)">
              <span style="flex:1;font-weight:700">{{ s.name }}</span>
              <span class="member-row-school">{{ s.school }}</span>
              <span class="badge" :class="'badge-obt-' + (s.obtainability || 'permanent')" style="margin-left:6px">
                {{ obtainabilityLabel(s.obtainability) }}
              </span>
              <span v-if="targetIds.includes(s.id)" class="member-row-check">✓</span>
            </div>
            <div v-if="filteredModalStudents.length === 0" class="empty-state" style="padding:30px 20px">
              <div class="empty-state-mark">該当なし</div>
            </div>
          </div>
          <div class="modal-footer">
            <span class="member-modal-count">{{ targetIds.length }} 名選択中</span>
            <span style="flex:1"></span>
            <button class="btn-secondary-modal" @click="store[modalTarget].splice(0)">クリア</button>
            <button class="btn-primary" @click="showModal = false">完了</button>
          </div>
        </div>
      </div>
      </teleport>
    </div>
  `,

  computed: {
    currentMode() {
      return GACHA_MODES.find(m => m.value === this.store.gachaMode) || GACHA_MODES[0];
    },
    chargeLabel() {
      const t = this.currentMode.chargeType;
      if (t === 'archive') return 'アーカイブポイント';
      return t === 'limited' ? '限定・呼び出しチャージ' : '呼び出しチャージ';
    },
    targetIds() {
      return this.store[this.modalTarget] || [];
    },
    pickupStudents() {
      return this.idsToStudents(this.store.gachaPickupIds);
    },
    fesStudents() {
      return this.idsToStudents(this.store.gachaLimitedFallthroughIds);
    },
    // 選択モーダルは ★3 のみ (PU / 周年限定はいずれも ★3)
    //   PU:      恒常 + 限定 (配布はガチャから出ないので除外)
    //   周年枠:  限定のみ (恒常は「その他★3」枠で自動的に排出される)
    filteredModalStudents() {
      const q = this.modalSearch.toLowerCase();
      const allow = this.modalTarget === 'gachaLimitedFallthroughIds'
        ? (s) => s.obtainability === 'limited'
        : (s) => s.obtainability !== 'event';
      const all = this.store.students
        .filter(s => s.rarity === 3 && allow(s))
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      return q ? all.filter(s => (s.name || '').toLowerCase().includes(q)) : all;
    },
  },

  methods: {
    idsToStudents(ids) {
      return (ids || []).map(id => this.store.students.find(s => s.id === id)).filter(Boolean);
    },
    obtainabilityLabel(v) {
      const t = OBTAINABILITIES.find(o => o.value === v);
      return t ? t.label : (v || '恒常');
    },
    openModal(target, title) {
      this.modalTarget = target;
      this.modalTitle = title;
      this.modalSearch = '';
      this.showModal = true;
    },
    toggleIn(key, id) {
      const arr = this.store[key];
      const idx = arr.indexOf(id);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(id);
    },
    removeFrom(key, id) {
      const arr = this.store[key];
      const idx = arr.indexOf(id);
      if (idx >= 0) arr.splice(idx, 1);
    },
    applyCharge(v) {
      const n = (typeof v === 'number') ? v : parseInt(this.chargeInput, 10);
      if (Number.isNaN(n) || n < 0) return;
      this.store.gachaCharge[this.currentMode.chargeType] = Math.min(n, 199);
      this.store.saveGachaCharge();
      this.chargeInput = '';
      this.store.showToast(`${this.chargeLabel} を ${Math.min(n, 199)} に設定しました`, 'info');
    },
  },
};
