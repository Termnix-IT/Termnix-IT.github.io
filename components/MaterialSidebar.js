// ============================================================
//  components/MaterialSidebar.js  —  素材ページのサイドパネル
//  表示モード (入力 / 一括確認) + カテゴリ・名前フィルタ + 所持数の一括クリア
// ============================================================

const MaterialSidebarComponent = {
  inject: ['store'],
  template: `
    <div class="sidebar-content">
      <div class="sidebar-section-id">// VIEW</div>
      <div class="mode-toggle">
        <button class="mode-toggle-btn" :class="{ active: store.materialView === 'input' }"
          @click="store.materialView = 'input'">所持数の入力</button>
        <button class="mode-toggle-btn" :class="{ active: store.materialView === 'overview' }"
          @click="store.materialView = 'overview'">一括確認</button>
      </div>

      <div class="sidebar-section-id">// FILTER</div>

      <div class="sidebar-field">
        <label>カテゴリ</label>
        <select v-model="store.materialFilter.category">
          <option value="">すべてのカテゴリ</option>
          <option v-for="c in MATERIAL_CATEGORIES" :key="c.value" :value="c.value">{{ c.label }}</option>
        </select>
      </div>

      <div class="sidebar-field">
        <label>素材名・学校・系統</label>
        <input type="text" v-model="store.materialFilter.name" placeholder="例: ゲヘナ / ネブラ / 設計図">
      </div>

      <label v-if="store.materialView === 'overview'" class="sidebar-check">
        <input type="checkbox" v-model="store.materialFilter.hideZero">
        所持している素材だけ表示
      </label>

      <button class="sidebar-reset-btn" @click="store.resetMaterialFilter()">
        フィルタをリセット
      </button>

      <div class="sidebar-section-id">// DATA</div>
      <div class="gacha-mode-info">
        入力した所持数はこのブラウザに保存され、エクスポートにも含まれます。
      </div>
      <button class="sidebar-reset-btn" @click="clearAll">所持数をすべて 0 にする</button>
    </div>
  `,

  methods: {
    clearAll() {
      const n = Object.keys(this.store.materialInventory).length;
      if (n === 0) {
        this.store.showToast('所持数はすでに 0 です', 'info');
        return;
      }
      if (!confirm(`入力済みの ${n} 種類の所持数をすべて 0 に戻しますか？\n(元に戻せません。必要なら先にエクスポートしてください)`)) return;
      for (const id of Object.keys(this.store.materialInventory)) delete this.store.materialInventory[id];
      saveMaterialInventory(this.store.materialInventory);
      this.store.showToast('所持数をすべて 0 にしました', 'info');
    },
  },
};
