// ============================================================
//  components/StudentList.js  —  生徒一覧（カードグリッド）
//  学校カラーは data/constants.js の SCHOOL_COLORS / SCHOOL_COLOR_FALLBACK を参照。
//  絞り込みは store.matchStudentFilter (所持チェッカーと共通)。
// ============================================================

// 適用中のフィルタをチップで並べ、✕ で個別に外せるようにする (一覧・所持チェッカー共通)
const StudentActiveFiltersComponent = {
  inject: ['store'],
  props: { count: Number },
  template: `
    <div class="active-filters">
      <span class="mono" style="font-size:11px;color:#8aa0b8">表示 {{ count }} 名</span>
      <template v-if="chips.length">
        <span style="color:#c9dcef">·</span>
        <button v-for="c in chips" :key="c.key" class="active-filter" @click="c.remove()">
          {{ c.label }} <span>✕</span>
        </button>
        <button class="active-filters-clear" @click="store.resetStudentFilters()">すべて解除</button>
      </template>
    </div>
  `,
  computed: {
    chips() {
      const f = this.store.studentFilters;
      const list = [];
      const multi = (key, labelOf) => {
        for (const v of f[key]) {
          list.push({ key: key + ':' + v, label: labelOf(v), remove: () => this.store.toggleStudentFilter(key, v) });
        }
      };
      if (f.name) list.push({ key: 'name', label: '名前: ' + f.name, remove: () => { f.name = ''; } });
      if (f.owned !== '') list.push({ key: 'owned', label: f.owned === 'true' ? '所持' : '未所持', remove: () => { f.owned = ''; } });
      multi('rarity', v => '★' + v);
      multi('attackType', v => (ATTACK_TYPES.find(t => t.value === v) || {}).label || v);
      multi('school', v => v);
      multi('class', v => v);
      multi('obtainability', v => (OBTAINABILITIES.find(t => t.value === v) || {}).label || v);
      return list;
    },
  },
};

const StudentListComponent = {
  inject: ['store'],
  template: `
    <div>
      <page-head ja="生徒名簿" en="STUDENT ROSTER">
        <div class="roster-progress">
          <div class="roster-progress-text">
            <span>所持率</span>
            <span><b>{{ ownedCount }}</b> / {{ store.students.length }} 名 · {{ ownedPercent }}%</span>
          </div>
          <div class="skew-bar"><div :style="{ width: ownedPercent + '%' }"></div></div>
        </div>
        <div class="page-head-right">
          <span class="page-head-label">並び替え</span>
          <select v-model="store.studentSortKey">
            <option value="school">学校順</option>
            <option value="name">名前順</option>
            <option value="rarity">レア順</option>
            <option value="bondLevel">絆Lv順</option>
            <option value="starRank">神秘開放順</option>
            <option value="owned">所持順</option>
          </select>
          <button class="sort-dir-btn" @click="store.studentSortReverse = !store.studentSortReverse"
            :title="store.studentSortReverse ? '逆順で表示中' : '通常の順で表示中'">{{ store.studentSortReverse ? '↑' : '↓' }}</button>
        </div>
      </page-head>

      <student-active-filters :count="sortedStudents.length"></student-active-filters>

      <!-- カードグリッド -->
      <div class="student-grid" v-if="sortedStudents.length > 0">
        <div
          v-for="s in sortedStudents"
          :key="s.id"
          class="student-card"
          :class="s.owned ? 'student-card--owned' : 'student-card--unowned'"
          @click="store.openStudentDetail(s.id)"
        >
          <!-- 画像エリア: 画像がなければ学校カラー + ハロー + 頭文字 + 学校名の透かし -->
          <div class="student-card-img">
            <!-- 未所持のときはこの背景部分だけグレーにする (★やリボンは色を残す) -->
            <div class="student-card-art" :style="cardImgStyle(s)">
              <img v-if="imageSrc(s)" :src="imageSrc(s)" class="student-card-photo" loading="lazy" :alt="s.name">
              <template v-else>
                <div class="student-card-halo"></div>
                <div class="student-card-initial">{{ s.name.charAt(0) }}</div>
                <div class="student-card-wm">{{ schoolEn(s.school) }}</div>
              </template>
            </div>
            <div class="student-card-atk" :style="{ background: attackColor(s.attackType) }" :title="attackLabel(s.attackType)"></div>
            <div class="student-card-stars">{{ '★'.repeat(s.rarity) }}</div>
            <div v-if="s.obtainability === 'limited'" class="student-card-ribbon student-card-ribbon--limited">LIMITED</div>
            <div v-else-if="s.obtainability === 'event'" class="student-card-ribbon student-card-ribbon--event">EVENT</div>
            <div class="student-card-band">
              <span><template v-if="s.owned"><span class="student-card-bond">♥</span> {{ s.bondLevel || 1 }}</template><template v-else>—</template></span>
              <span>{{ s.role === 'special' ? 'SP' : 'ST' }}</span>
            </div>
          </div>

          <!-- 所持ピン (左上): クリックで所持トグル -->
          <button
            class="student-card-pin"
            :class="{ 'student-card-pin--owned': s.owned }"
            :title="s.owned ? 'クリックで未所持に' : 'クリックで所持に'"
            @click.stop="toggleOwned(s)"
          >{{ s.owned ? '✓' : '' }}</button>
          <div v-if="!s.owned" class="student-card-unowned-tag">未所持</div>

          <!-- カード下部: 名前 (衣装名まで省略せず全表示) + 学校・クラス -->
          <div class="student-card-footer">
            <div class="student-card-name" :title="s.name">{{ s.name }}</div>
            <div class="student-card-meta"><b>{{ s.school }}</b>{{ s.class }}</div>
          </div>
        </div>
      </div>

      <!-- 0件 -->
      <div v-else class="empty-state">
        <div class="empty-state-mark">該当なし</div>
        <div class="empty-state-msg">条件に一致する生徒が見つかりません</div>
      </div>
    </div>
  `,

  computed: {
    filteredStudents() {
      return this.store.students.filter(s => this.store.matchStudentFilter(s));
    },

    sortedStudents() {
      const sortKey = this.store.studentSortKey;
      const dir = this.store.studentSortReverse ? -1 : 1;
      return [...this.filteredStudents].sort((a, b) => dir * this.compare(a, b, sortKey));
    },

    ownedCount() {
      return this.store.students.filter(s => s.owned).length;
    },

    ownedPercent() {
      const total = this.store.students.length;
      return total ? Math.round(this.ownedCount / total * 100) : 0;
    },
  },

  methods: {
    compare(a, b, sortKey) {
      // 所持を先に
      if (sortKey === 'owned') {
        return (b.owned ? 1 : 0) - (a.owned ? 1 : 0);
      }
      let va = a[sortKey];
      let vb = b[sortKey];
      if (va == null) va = '';
      if (vb == null) vb = '';
      if (typeof va === 'boolean') { va = va ? 1 : 0; vb = vb ? 1 : 0; }
      // rarity は降順（高い方が先）
      if (sortKey === 'rarity' || sortKey === 'bondLevel' || sortKey === 'starRank') {
        if (va < vb) return 1;
        if (va > vb) return -1;
        return 0;
      }
      // 学校は SCHOOLS の並び順 (未掲載校は末尾)。同校内はマスタ (CSV) 順を維持
      if (sortKey === 'school') {
        const ia = SCHOOLS.indexOf(va);
        const ib = SCHOOLS.indexOf(vb);
        const ra = ia < 0 ? SCHOOLS.length : ia;
        const rb = ib < 0 ? SCHOOLS.length : ib;
        if (ra !== rb) return ra - rb;
        if (ia < 0 && ib < 0) return va < vb ? -1 : va > vb ? 1 : 0;
        return 0;
      }
      if (va < vb) return -1;
      if (va > vb) return 1;
      return 0;
    },

    async toggleOwned(s) {
      await toggleOwned(s.id, s.owned);
      await this.store.loadStudents();
    },

    attackLabel(val) {
      const t = ATTACK_TYPES.find(t => t.value === val);
      return t ? t.label : val;
    },

    attackColor(val) {
      return ATTACK_TYPE_COLORS[val] || '#8aa0b8';
    },

    schoolEn(school) {
      return SCHOOL_EN[school] || '';
    },

    cardImgStyle(s) {
      const color = SCHOOL_COLORS[s.school] || SCHOOL_COLOR_FALLBACK;
      return { background: color };
    },

    // 表示画像: アップロード画像 (IndexedDB) → マスタ画像 (assets/students/<id>.webp) → 無し (学校カラー)
    imageSrc(s) {
      return s.imageData || s.imageUrl || '';
    },
  },
};
