// ============================================================
//  components/StudentList.js  —  生徒一覧（カードグリッド）
//  学校カラーは data/constants.js の SCHOOL_COLORS / SCHOOL_COLOR_FALLBACK を参照。
// ============================================================

const StudentListComponent = {
  inject: ['store'],
  template: `
    <div>
      <!-- 件数表示 -->
      <div class="student-count">
        <span class="count-num">{{ sortedStudents.length }}</span>
        <span class="count-divider">/</span>
        <span class="count-total">{{ store.students.length }} 件</span>
        <span class="count-divider">・</span>
        <span class="count-owned">所持 {{ ownedCount }} 名</span>
      </div>

      <!-- カードグリッド -->
      <div class="student-grid" v-if="sortedStudents.length > 0">
        <div
          v-for="s in sortedStudents"
          :key="s.id"
          class="student-card"
          :class="{ 'student-card--owned': s.owned }"
          @click="store.openStudentDetail(s.id)"
        >
          <!-- 画像エリア -->
          <div class="student-card-img" :style="cardImgStyle(s)">
            <img v-if="imageSrc(s)" :src="imageSrc(s)" class="student-card-photo" loading="lazy" :alt="s.name">

            <!-- 所持ピン (左上) -->
            <button
              class="student-card-pin"
              :class="s.owned ? 'student-card-pin--owned' : 'student-card-pin--unowned'"
              :title="s.owned ? 'クリックで未所持に' : 'クリックで所持に'"
              @click.stop="toggleOwned(s)"
            >{{ s.owned ? '●' : '○' }}</button>

            <!-- 絆Lv + レアリティ オーバーレイ (下部) -->
            <div class="student-card-level">
              <span>Lv.{{ s.bondLevel || 1 }}</span>
              <span class="student-card-stars">{{ '★'.repeat(s.rarity) }}</span>
            </div>
          </div>

          <!-- カード下部: バッジ → 名前 (衣装名まで省略せず全表示) -->
          <div class="student-card-footer">
            <div class="student-card-badges">
              <span
                class="student-card-atk badge"
                :class="'badge-' + s.attackType"
              >{{ attackLabel(s.attackType) }}</span>
              <span
                class="student-card-obt badge"
                :class="'badge-obt-' + (s.obtainability || 'permanent')"
              >{{ obtainabilityLabel(s.obtainability) }}</span>
            </div>
            <div class="student-card-name" :title="s.name">{{ s.name }}</div>
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
      const f = this.store.studentFilters;
      return this.store.students.filter(s => {
        if (f.name && !s.name.includes(f.name)) return false;
        if (f.school && s.school !== f.school) return false;
        if (f.class  && s.class  !== f.class)  return false;
        if (f.rarity && String(s.rarity) !== f.rarity) return false;
        if (f.attackType && s.attackType !== f.attackType) return false;
        if (f.owned !== '') {
          const owned = f.owned === 'true';
          if (s.owned !== owned) return false;
        }
        return true;
      });
    },

    sortedStudents() {
      const sortKey = this.store.studentSortKey;
      return [...this.filteredStudents].sort((a, b) => {
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
      });
    },

    ownedCount() {
      return this.store.students.filter(s => s.owned).length;
    },
  },

  methods: {
    async toggleOwned(s) {
      await toggleOwned(s.id, s.owned);
      await this.store.loadStudents();
    },

    attackLabel(val) {
      const t = ATTACK_TYPES.find(t => t.value === val);
      return t ? t.label : val;
    },

    obtainabilityLabel(val) {
      const t = OBTAINABILITIES.find(t => t.value === val);
      return t ? t.label : (val || '恒常');
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
