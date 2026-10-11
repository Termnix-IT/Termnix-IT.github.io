// ============================================================
//  components/MemoSidebar.js  —  攻略メモのサイドパネル
//  新規作成・検索・カテゴリ別メモ一覧 (更新日つき)
// ============================================================

const MemoSidebarComponent = {
  inject: ['store'],
  template: `
    <div class="sidebar-content memo-sidebar-panel">
      <button class="sidebar-add-btn" @click="newMemo">＋ 新規メモ</button>

      <div class="sidebar-section-id">SEARCH</div>
      <div class="sidebar-field">
        <input type="text" v-model="store.memoSearch" placeholder="タイトル・本文を検索">
      </div>

      <div class="sidebar-section-id">NOTES ({{ store.memos.length }})</div>
      <div class="memo-list">
        <div v-if="filteredMemos.length === 0" class="memo-sidebar-empty">
          {{ store.memoSearch ? '該当なし' : 'メモがありません' }}
        </div>
        <template v-for="g in groupedMemos" :key="g.value">
          <div class="memo-category-header">
            <i :style="{ background: g.color }"></i>{{ g.label }}<span>{{ g.memos.length }}</span>
          </div>
          <button v-for="m in g.memos" :key="m.id" class="memo-item"
            :class="{ active: store.memoSelectedId === m.id }"
            @click="selectMemo(m.id)">
            {{ m.title || '(無題)' }}
            <small>{{ formatDate(m.updatedAt) }}<span v-if="store.memoSelectedId === m.id && store.memoDirty" class="memo-item-dirty">● 未保存</span></small>
          </button>
        </template>
      </div>
    </div>
  `,

  computed: {
    filteredMemos() {
      const q = (this.store.memoSearch || '').toLowerCase();
      const memos = this.store.memos;
      if (!q) return memos;
      return memos.filter(m =>
        (m.title || '').toLowerCase().includes(q) ||
        (m.content || '').toLowerCase().includes(q)
      );
    },
    // カテゴリごとにまとめる (カテゴリの順は MEMO_CATEGORIES、メモは更新が新しい順)
    groupedMemos() {
      return MEMO_CATEGORIES
        .map(cat => ({
          value: cat.value,
          label: cat.label,
          color: (PURPOSE_COLORS[cat.value] || PURPOSE_COLORS.misc).main,
          memos: this.filteredMemos.filter(m => (m.category || 'misc') === cat.value),
        }))
        .filter(g => g.memos.length > 0);
    },
  },

  methods: {
    newMemo() {
      if (!this.store.confirmLeaveMemo()) return;
      this.store.memoSelectedId = null;
      this.store.memoIsCreating = true;
    },
    selectMemo(id) {
      if (id === this.store.memoSelectedId) return;
      if (!this.store.confirmLeaveMemo()) return;
      this.store.memoSelectedId = id;
      this.store.memoIsCreating = false;
    },
    formatDate(iso) {
      return formatMemoDate(iso);
    },
  },
};

