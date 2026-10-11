// ============================================================
//  components/StrategyMemo.js  —  攻略メモ
//  未選択時: メモボード (カテゴリ件数 + メモのカード)
//  選択時:   Markdown エディタ (編集 / 分割 / プレビュー、入力補助ボタン、未保存の表示)
// ============================================================

// 更新日の表示 (例: 2026.10.11)。日時が無い旧データは空文字 (MemoSidebar からも使う)
function formatMemoDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

// 引用の先頭が [!NOTE] / [!WARNING] のものを注意書きの囲みにする (Marked は標準で変換しないため)
function renderMemoMarkdown(content) {
  return marked.parse(content).replace(
    /<blockquote>\s*<p>\[!(NOTE|WARNING)\]\s*(?:<br>)?/g,
    (_, kind) => `<blockquote class="md-callout md-callout--${kind.toLowerCase()}"><p><span class="md-callout-label">${kind}</span>`
  );
}

const StrategyMemoComponent = {
  inject: ['store'],
  template: `
    <div class="memo-layout">
      <!-- ── メモボード (未選択時) ── -->
      <template v-if="!store.memoSelectedId && !store.memoIsCreating">
        <page-head ja="攻略メモ" en="TACTICAL NOTES">
          <div class="page-head-meta"><b>{{ boardMemos.length }}</b> 件</div>
          <div class="page-head-right">
            <span class="page-head-label">並び替え</span>
            <select v-model="store.memoSort">
              <option value="updated">更新が新しい順</option>
              <option value="title">タイトル順</option>
              <option value="category">カテゴリ順</option>
            </select>
          </div>
        </page-head>

        <div class="memo-catsum">
          <button v-for="c in categoryCounts" :key="c.value" class="memo-cs"
            :class="{ active: store.memoCategory === c.value }"
            @click="store.memoCategory = store.memoCategory === c.value ? '' : c.value">
            <i :style="{ background: c.color.main }"></i>{{ c.label }}<b>{{ c.count }}</b>
          </button>
        </div>

        <div class="sidebar-section-id memo-board-id">{{ store.memoCategory ? categoryLabel(store.memoCategory) : 'RECENT' }}</div>
        <div class="memo-board">
          <button class="memo-card memo-card--new" @click="newMemo"><b>＋</b>新しいメモ</button>
          <button v-for="m in boardMemos" :key="m.id" class="memo-card" @click="openMemo(m.id)">
            <span class="memo-card-bar" :style="{ background: colorOf(m.category).main }"></span>
            <span class="memo-card-head">
              <span class="purpose-tag" :style="{ background: colorOf(m.category).bg, color: colorOf(m.category).text }">{{ categoryLabel(m.category) }}</span>
              <span class="memo-card-date">{{ formatDate(m.updatedAt) }}</span>
            </span>
            <span class="memo-card-title">{{ m.title || '(無題)' }}</span>
            <span class="memo-card-excerpt">{{ excerpt(m.content) || '本文なし' }}</span>
          </button>
        </div>
      </template>

      <!-- ── エディタ ── -->
      <div v-else class="memo-editor">
        <span class="sd-corner sd-corner--tl"></span><span class="sd-corner sd-corner--tr"></span>
        <div class="memo-ed-head">
          <button class="memo-back" @click="backToBoard">← メモボードに戻る</button>
          <input type="text" class="memo-title-input" v-model="editTitle" placeholder="タイトルを入力">
          <div class="memo-ed-meta">
            <span class="sidebar-label">カテゴリ</span>
            <button v-for="c in MEMO_CATEGORIES" :key="c.value" class="filter-chip"
              :class="{ active: editCategory === c.value }"
              :style="editCategory === c.value ? { background: colorOf(c.value).bg, color: colorOf(c.value).text, borderColor: colorOf(c.value).main } : null"
              @click="editCategory = c.value">
              <template v-if="editCategory === c.value">◆ </template>{{ c.label }}
            </button>
            <span class="memo-ed-dates" v-if="currentMemo">
              <template v-if="currentMemo.createdAt">作成 {{ formatDate(currentMemo.createdAt) }} · </template>更新 {{ formatDate(currentMemo.updatedAt) }}
            </span>
          </div>
        </div>

        <div class="memo-toolbar">
          <div class="seg-toggle memo-mode-seg">
            <button :class="{ active: viewMode === 'edit' }" @click="viewMode = 'edit'">編集</button>
            <button :class="{ active: viewMode === 'split' }" @click="viewMode = 'split'">分割</button>
            <button :class="{ active: viewMode === 'preview' }" @click="viewMode = 'preview'">プレビュー</button>
          </div>
          <template v-if="viewMode !== 'preview'">
            <button v-for="t in insertTools" :key="t.id" class="memo-tool" :title="t.title" @click="insert(t.id)">{{ t.label }}</button>
            <span class="memo-tool-note">選んだ文字列に Markdown の記号を付けます</span>
          </template>
        </div>

        <div class="memo-content-area" :class="{ 'split-view': viewMode === 'split' }">
          <textarea v-if="viewMode !== 'preview'" ref="textarea"
            class="memo-textarea"
            v-model="editContent"
            placeholder="Markdown で記述できます&#10;&#10;## 見出し&#10;**太字**&#10;- リスト&#10;- [ ] チェック&#10;> [!NOTE] 注意書き"
            @keydown.ctrl.s.prevent="save"></textarea>
          <div v-if="viewMode !== 'edit'" class="memo-preview" v-html="renderedContent"></div>
        </div>

        <div class="memo-ed-foot">
          <button v-if="store.memoSelectedId" class="sd-reset" @click="confirmDelete">削除</button>
          <span style="flex:1"></span>
          <span v-if="store.memoDirty" class="memo-dirty">● 未保存の変更あり</span>
          <span v-if="lastSaved" class="sd-hint">最終保存 {{ lastSaved }}</span>
          <button class="skew-btn skew-btn--primary" @click="save">保存 <small class="memo-save-key">Ctrl+S</small></button>
        </div>
      </div>
    </div>
  `,

  data() {
    return {
      editTitle: '',
      editContent: '',
      editCategory: 'misc',
      snapshot: '',      // 最後に読み込んだ / 保存した内容 (未保存の判定に使う)
      viewMode: 'split',
      lastSaved: '',
      insertTools: [
        { id: 'h2',    label: 'H2',   title: '見出し' },
        { id: 'h3',    label: 'H3',   title: '小見出し' },
        { id: 'bold',  label: 'B',    title: '太字' },
        { id: 'list',  label: '•',    title: 'リスト' },
        { id: 'check', label: '☑',    title: 'チェックボックス' },
        { id: 'table', label: '表',   title: '表' },
        { id: 'note',  label: '注意', title: '注意書き' },
      ],
    };
  },

  computed: {
    currentMemo() {
      return this.store.memos.find(m => m.id === this.store.memoSelectedId) || null;
    },
    renderedContent() {
      if (!this.editContent) return '<p style="color:#8aa0b8">プレビューがここに表示されます</p>';
      return renderMemoMarkdown(this.editContent);
    },
    currentState() {
      return JSON.stringify([this.editTitle, this.editContent, this.editCategory]);
    },
    categoryCounts() {
      return MEMO_CATEGORIES.map(c => ({
        value: c.value,
        label: c.label,
        color: this.colorOf(c.value),
        count: this.store.memos.filter(m => (m.category || 'misc') === c.value).length,
      }));
    },
    // ボードに出すメモ (サイドパネルの検索 + カテゴリ絞り込み + 並び順)
    boardMemos() {
      const q = (this.store.memoSearch || '').toLowerCase();
      const cat = this.store.memoCategory;
      const order = MEMO_CATEGORIES.map(c => c.value);
      return this.store.memos
        .filter(m => !cat || (m.category || 'misc') === cat)
        .filter(m => !q || (m.title || '').toLowerCase().includes(q) || (m.content || '').toLowerCase().includes(q))
        .sort((a, b) => {
          if (this.store.memoSort === 'title') return (a.title || '').localeCompare(b.title || '');
          if (this.store.memoSort === 'category') {
            const d = order.indexOf(a.category || 'misc') - order.indexOf(b.category || 'misc');
            if (d) return d;
          }
          return (b.updatedAt || '').localeCompare(a.updatedAt || '');
        });
    },
  },

  watch: {
    'store.memoSelectedId': {
      immediate: true,
      handler(id) {
        // 新規メモを保存した直後の選択切替では、入力中の内容をそのまま使う
        if (this._justSaved) {
          this._justSaved = false;
          return;
        }
        if (id) {
          const m = this.store.memos.find(x => x.id === id);
          if (m) this.load(m.title || '', m.content || '', m.category || 'misc');
        }
      },
    },
    'store.memoIsCreating': {
      immediate: true,
      handler(creating) {
        if (creating) this.load('', '', this.store.memoCategory || 'misc');
      },
    },
    currentState(v) {
      this.store.memoDirty = (this.store.memoSelectedId || this.store.memoIsCreating) ? v !== this.snapshot : false;
    },
  },

  mounted() {
    // 未保存のままページを閉じようとしたらブラウザの確認を出す
    this._onBeforeUnload = (e) => {
      if (this.store.memoDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', this._onBeforeUnload);
  },

  beforeUnmount() {
    window.removeEventListener('beforeunload', this._onBeforeUnload);
    this.store.memoDirty = false;
  },

  methods: {
    load(title, content, category) {
      this.editTitle = title;
      this.editContent = content;
      this.editCategory = category;
      this.snapshot = this.currentState;
      this.lastSaved = '';
      this.store.memoDirty = false;
    },

    colorOf(category) {
      return PURPOSE_COLORS[category] || PURPOSE_COLORS.misc;
    },
    categoryLabel(value) {
      const c = MEMO_CATEGORIES.find(c => c.value === (value || 'misc'));
      return c ? c.label : 'その他';
    },
    formatDate(iso) {
      return formatMemoDate(iso);
    },
    // カードに出す本文の冒頭 (Markdown の記号を外して 3 行ぶん)
    excerpt(content) {
      return (content || '')
        .split('\n')
        .map(l => l.replace(/^(\s*(#{1,6}\s+|>\s*|\[!\w+\]\s*|[-*+]\s+|\[[ xX]\]\s+|\d+\.\s+|\|))+/, '').replace(/[*_`|]/g, '').trim())
        .filter(l => l && !/^-+$/.test(l))
        .slice(0, 3)
        .join(' ');
    },

    newMemo() {
      this.store.memoSelectedId = null;
      this.store.memoIsCreating = true;
    },
    openMemo(id) {
      this.store.memoSelectedId = id;
      this.store.memoIsCreating = false;
    },
    backToBoard() {
      if (!this.store.confirmLeaveMemo()) return;
      this.store.memoSelectedId = null;
      this.store.memoIsCreating = false;
    },

    // ── 入力補助: 選んだ文字列 (無ければカーソル位置) に Markdown の記号を付ける ──
    insert(kind) {
      const ta = this.$refs.textarea;
      if (!ta) return;
      const text = this.editContent;
      let start = ta.selectionStart;
      let end = ta.selectionEnd;
      const sel = text.slice(start, end);
      let replacement;
      const prefixLines = (prefix, placeholder) => {
        // 行単位の記号は、選択範囲を含む行の先頭から付ける
        start = text.lastIndexOf('\n', start - 1) + 1;
        const body = text.slice(start, end) || placeholder;
        return body.split('\n').map(l => prefix + l).join('\n');
      };
      switch (kind) {
        case 'h2':    replacement = prefixLines('## ', '見出し'); break;
        case 'h3':    replacement = prefixLines('### ', '小見出し'); break;
        case 'list':  replacement = prefixLines('- ', '項目'); break;
        case 'check': replacement = prefixLines('- [ ] ', 'やること'); break;
        case 'note':  replacement = '> [!NOTE]\n' + prefixLines('> ', '注意書き'); break;
        case 'bold':  replacement = `**${sel || '太字'}**`; break;
        case 'table': replacement = `${start > 0 && text[start - 1] !== '\n' ? '\n' : ''}| 見出し | 見出し |\n|---|---|\n| ${sel || ''} |  |\n`; break;
        default: return;
      }
      this.editContent = text.slice(0, start) + replacement + text.slice(end);
      this.$nextTick(() => {
        ta.focus();
        ta.setSelectionRange(start + replacement.length, start + replacement.length);
      });
    },

    async save() {
      if (!this.editTitle.trim()) {
        this.store.showToast('タイトルを入力してください', 'error'); return;
      }
      const memo = {
        title: this.editTitle,
        content: this.editContent,
        category: this.editCategory,
        tags: [],
      };
      const current = this.currentMemo;
      if (this.store.memoSelectedId) {
        memo.id = this.store.memoSelectedId;
        if (current && current.createdAt) memo.createdAt = current.createdAt;
      }

      await saveMemo(memo);
      await this.store.loadMemos();

      // 新規の場合は作成されたメモを選択
      if (!this.store.memoSelectedId) {
        const saved = this.store.memos.find(m => m.title === memo.title && m.category === memo.category);
        if (saved) {
          this._justSaved = true;
          this.store.memoSelectedId = saved.id;
          this.store.memoIsCreating = false;
        }
      }

      this.snapshot = this.currentState;
      this.store.memoDirty = false;
      const now = new Date();
      this.lastSaved = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
      this.store.showToast('保存しました', 'success');
    },

    async confirmDelete() {
      if (!confirm(`「${this.editTitle}」を削除しますか？`)) return;
      await deleteMemo(this.store.memoSelectedId);
      await this.store.loadMemos();
      this.store.memoDirty = false;
      this.store.memoSelectedId = null;
      this.store.memoIsCreating = false;
      this.store.showToast('削除しました', 'info');
    },
  },
};
