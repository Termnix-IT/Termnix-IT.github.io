// ============================================================
//  components/MaterialSidebar.js  —  素材ページのサイドパネル
//  表示モード (入力 / 一括確認) + 名前検索 + カテゴリへの移動 + 所持数の一括クリア
// ============================================================

const MaterialSidebarComponent = {
  inject: ['store'],
  template: `
    <div class="sidebar-content">
      <div class="sidebar-section-id">VIEW</div>
      <div class="seg-toggle">
        <button :class="{ active: store.materialView === 'input' }" @click="store.materialView = 'input'">所持数の入力</button>
        <button :class="{ active: store.materialView === 'overview' }" @click="store.materialView = 'overview'">一括確認</button>
      </div>

      <div class="sidebar-section-id">SEARCH</div>
      <div class="sidebar-field">
        <input type="text" v-model="store.materialFilter.name" placeholder="素材名・学校・系統">
      </div>

      <template v-if="store.materialView === 'overview'">
        <div class="sidebar-section-id">FILTER</div>
        <div class="seg-toggle">
          <button :class="{ active: store.materialFilter.show === 'all' }" @click="store.materialFilter.show = 'all'">すべて</button>
          <button :class="{ active: store.materialFilter.show === 'owned' }" @click="store.materialFilter.show = 'owned'">所持のみ</button>
          <button :class="{ active: store.materialFilter.show === 'short' }" @click="store.materialFilter.show = 'short'">不足のみ</button>
        </div>
      </template>

      <div class="sidebar-section-id">CATEGORY</div>
      <div class="mat-catlist">
        <button class="mat-cat" :class="{ active: store.materialFilter.category === '' }" @click="jump('')">
          すべて<small>{{ masterCount }}</small>
        </button>
        <button v-for="c in categoryStats" :key="c.value" class="mat-cat"
          :class="{ active: store.materialFilter.category === c.value }" @click="jump(c.value)">
          {{ c.label }}<small>{{ c.kinds }} / {{ c.size }}</small>
        </button>
      </div>
      <div class="sidebar-note">右の数字は「所持している種類 / 全種類」です。クリックするとその表まで移動します。</div>

      <div class="sidebar-section-id" style="margin-top:28px">DATA</div>
      <div class="sidebar-note" style="margin:0 0 8px">入力した所持数はこのブラウザに保存され、エクスポートにも含まれます。</div>
      <button class="sidebar-danger-btn" @click="clearAll">所持数をすべて 0 にする</button>
    </div>
  `,

  computed: {
    masterCount() {
      return MATERIAL_MASTER.length;
    },
    categoryStats() {
      const inv = this.store.materialInventory;
      return MATERIAL_CATEGORIES.map(c => {
        const items = MATERIAL_MASTER.filter(m => m.category === c.value);
        return { value: c.value, label: c.label, size: items.length, kinds: items.filter(m => inv[m.id] > 0).length };
      });
    },
  },

  methods: {
    // 絞り込みはせず、メイン側のその表までスクロールする (「すべて」は先頭へ)
    jump(value) {
      this.store.materialFilter.category = value;
      if (!value) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const el = document.getElementById('mat-' + value);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else this.store.showToast('検索・表示の条件でこのカテゴリは非表示になっています', 'info');
    },

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
