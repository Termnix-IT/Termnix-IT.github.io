// ============================================================
//  components/TeamComposition.js  —  チーム編成管理
//  一覧: 編成ごとに ST / SP のスロットを顔で並べたカード
//  編成画面 (モーダル): 上のスロットで枠を選び、下の生徒一覧から入れる
// ============================================================

const TeamCompositionComponent = {
  inject: ['store'],
  template: `
    <div>
      <page-head ja="編成" en="FORMATION">
        <div class="page-head-meta"><b>{{ filteredTeams.length }}</b> 件 · {{ currentMode.label }}</div>
      </page-head>

      <!-- 編成カード -->
      <div class="team-grid" :class="{ 'team-grid--wide': currentMode.striker > 4 }">
        <button class="team-card team-card--new" @click="openEditor(null)">
          <b>＋</b>新しい編成
          <small>ST {{ currentMode.striker }} / SP {{ currentMode.special }} の{{ currentMode.label }}を作成</small>
        </button>

        <div v-for="team in filteredTeams" :key="team.id" class="team-card" @click="openEditor(team)">
          <span v-if="unownedCount(team) > 0" class="team-card-warn">⚠ 未所持 {{ unownedCount(team) }}名</span>
          <div class="team-card-head">
            <span class="team-card-name">{{ team.name }}</span>
            <span class="purpose-tag" :style="purposeTagStyle(team.purpose)">{{ purposeLabel(team.purpose) }}</span>
          </div>
          <div class="team-slots">
            <div class="team-slot-group">
              <span class="team-slot-label team-slot-label--st">STRIKER</span>
              <div class="team-slot-row">
                <template v-for="i in currentMode.striker" :key="'st' + i">
                  <div v-if="memberAt(team.strikers, i - 1)" class="team-slot"
                    :class="{ 'team-slot--unowned': !memberAt(team.strikers, i - 1).owned }"
                    :style="{ background: schoolGradient(memberAt(team.strikers, i - 1)) }">
                    <img v-if="imageOf(memberAt(team.strikers, i - 1))" :src="imageOf(memberAt(team.strikers, i - 1))" loading="lazy" alt="">
                    <span v-else class="team-slot-initial">{{ memberAt(team.strikers, i - 1).name.charAt(0) }}</span>
                    <i class="team-slot-atk" :style="{ background: attackColor(memberAt(team.strikers, i - 1).attackType) }"></i>
                    <span class="team-slot-name">{{ memberAt(team.strikers, i - 1).name }}</span>
                  </div>
                  <div v-else class="team-slot team-slot--empty" @click.stop="openEditor(team, 'strikers', i - 1)">＋</div>
                </template>
              </div>
            </div>
            <div class="team-slot-div"></div>
            <div class="team-slot-group">
              <span class="team-slot-label team-slot-label--sp">SPECIAL</span>
              <div class="team-slot-row">
                <template v-for="i in currentMode.special" :key="'sp' + i">
                  <div v-if="memberAt(team.specials, i - 1)" class="team-slot"
                    :class="{ 'team-slot--unowned': !memberAt(team.specials, i - 1).owned }"
                    :style="{ background: schoolGradient(memberAt(team.specials, i - 1)) }">
                    <img v-if="imageOf(memberAt(team.specials, i - 1))" :src="imageOf(memberAt(team.specials, i - 1))" loading="lazy" alt="">
                    <span v-else class="team-slot-initial">{{ memberAt(team.specials, i - 1).name.charAt(0) }}</span>
                    <i class="team-slot-atk" :style="{ background: attackColor(memberAt(team.specials, i - 1).attackType) }"></i>
                    <span class="team-slot-name">{{ memberAt(team.specials, i - 1).name }}</span>
                  </div>
                  <div v-else class="team-slot team-slot--empty" @click.stop="openEditor(team, 'specials', i - 1)">＋</div>
                </template>
              </div>
            </div>
          </div>
          <div class="team-card-foot">
            <span class="atk-summary">
              <span v-for="a in attackSummary(team.strikers)" :key="a.value"><i :style="{ background: a.color }"></i>{{ a.label }} {{ a.count }}</span>
            </span>
            <span class="team-card-memo">{{ firstLine(team.notes) || 'メモなし' }}</span>
          </div>
        </div>
      </div>

      <div v-if="filteredTeams.length === 0 && store.teams.length > 0" class="empty-state">
        <div class="empty-state-mark">該当なし</div>
        <div class="empty-state-msg">条件に一致する編成がありません</div>
      </div>

      <!-- ── 編成画面 (モーダル) ── -->
      <div v-if="editorOpen" class="modal-overlay" @click.self="closeEditor">
        <div class="modal-box team-editor">
          <span class="sd-corner sd-corner--tl"></span><span class="sd-corner sd-corner--tr"></span>
          <span class="sd-corner sd-corner--bl"></span><span class="sd-corner sd-corner--br"></span>
          <div class="modal-band">
            <span class="modal-band-title">{{ editingTeam ? '編成を編集' : '新しい編成' }}</span>
            <span class="sd-school-tag">{{ formMode.label }} · ST {{ maxStriker }} / SP {{ maxSpecial }}</span>
            <button class="modal-band-close" @click="closeEditor" title="閉じる">✕</button>
          </div>

          <!-- 大きなスロット: 枠を選んでから下の一覧で生徒を選ぶ -->
          <div class="te-top" :class="{ 'te-top--compact': maxStriker > 4 }">
            <div v-for="grp in slotGroups" :key="grp.type" class="te-group">
              <div class="te-group-label" :class="'te-group-label--' + grp.type">
                {{ grp.label }} <span>{{ form[grp.type].length }} / {{ grp.max }}<template v-if="grp.type === 'strikers'"> · 枠を選んで下から生徒を選ぶ</template></span>
              </div>
              <div class="te-slots">
                <div v-for="i in grp.max" :key="grp.type + i" class="te-slot-wrap"
                  :class="{ 'te-slot-wrap--picked': sel.type === grp.type && sel.index === i - 1 }"
                  @click="selectSlot(grp.type, i - 1)">
                  <div v-if="studentById(form[grp.type][i - 1])" class="te-slot"
                    :style="{ background: schoolGradient(studentById(form[grp.type][i - 1])) }">
                    <img v-if="imageOf(studentById(form[grp.type][i - 1]))" :src="imageOf(studentById(form[grp.type][i - 1]))" alt="">
                    <template v-else>
                      <div class="te-slot-halo"></div>
                      <div class="te-slot-initial">{{ studentById(form[grp.type][i - 1]).name.charAt(0) }}</div>
                    </template>
                    <span class="te-slot-no">{{ i }}</span>
                    <button class="te-slot-x" @click.stop="removeAt(grp.type, i - 1)" title="外す">✕</button>
                    <div class="te-slot-name">
                      {{ studentById(form[grp.type][i - 1]).name }}
                      <small>{{ attackLabel(studentById(form[grp.type][i - 1]).attackType) }} · {{ studentById(form[grp.type][i - 1]).school }}</small>
                    </div>
                  </div>
                  <div v-else class="te-slot te-slot--empty">
                    <b>＋</b><small>{{ grp.short }} {{ i }}</small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="te-body">
            <!-- 生徒一覧 (選んでいる枠の種類で絞り込む) -->
            <div class="te-picker">
              <div class="te-picker-bar">
                <span class="active-filter te-picker-role">{{ sel.type === 'strikers' ? 'STRIKER' : 'SPECIAL' }} から選択</span>
                <input type="text" v-model="search" placeholder="名前で検索" class="pick-search te-search">
                <div class="seg-toggle te-owned-seg">
                  <button :class="{ active: ownedOnly }" @click="ownedOnly = true">所持のみ</button>
                  <button :class="{ active: !ownedOnly }" @click="ownedOnly = false">すべて</button>
                </div>
              </div>
              <div class="chip-row te-picker-chips">
                <button v-for="t in ATTACK_TYPES" :key="t.value" class="filter-chip"
                  :class="{ active: atkFilter.includes(t.value) }" @click="toggleList(atkFilter, t.value)">
                  <i class="filter-chip-dot" :style="{ background: attackColor(t.value) }"></i>{{ t.label }}
                </button>
                <span style="width:10px"></span>
                <button v-for="c in CLASSES" :key="c" class="filter-chip"
                  :class="{ active: classFilter.includes(c) }" @click="toggleList(classFilter, c)">{{ c }}</button>
              </div>
              <div class="te-picker-grid">
                <button v-for="s in pickerStudents" :key="s.id" class="pick-tile te-pick"
                  :class="{ 'te-pick--in': inTeam(s.id), 'te-pick--unowned': !s.owned }" @click="pick(s)">
                  <span class="pick-face" :style="{ background: schoolGradient(s) }">
                    <img v-if="imageOf(s)" :src="imageOf(s)" loading="lazy" :alt="s.name">
                    <template v-else>{{ s.name.charAt(0) }}</template>
                    <i class="team-slot-atk" :style="{ background: attackColor(s.attackType) }"></i>
                  </span>
                  <span class="pick-name">{{ s.name }}</span>
                </button>
                <div v-if="pickerStudents.length === 0" class="empty-state" style="grid-column:1/-1;padding:30px 20px">
                  <div class="empty-state-msg">
                    {{ ownedOnly ? '所持している生徒がいません。「すべて」に切り替えると未所持の生徒も選べます' : '条件に一致する生徒がいません' }}
                  </div>
                </div>
              </div>
            </div>

            <!-- 編成名・用途・メモ -->
            <div class="te-side">
              <div class="sidebar-section-id">NAME</div>
              <input type="text" v-model="form.name" class="pick-search" placeholder="例: ゴズ Insane 用">
              <div class="sidebar-section-id">PURPOSE</div>
              <div class="chip-row">
                <button v-for="p in TEAM_PURPOSES" :key="p.value" class="filter-chip"
                  :class="{ active: form.purpose === p.value }" :style="form.purpose === p.value ? purposeChipStyle(p.value) : null"
                  @click="form.purpose = p.value">{{ p.label }}</button>
              </div>
              <div class="sidebar-section-id">MEMO</div>
              <textarea v-model="form.notes" class="sd-notes te-notes" placeholder="立ち回りや注意点など…"></textarea>
              <div class="sidebar-section-id">SUMMARY</div>
              <div class="atk-summary atk-summary--all">
                <span v-for="a in attackSummary(form.strikers, true)" :key="a.value"><i :style="{ background: a.color }"></i>{{ a.label }} {{ a.count }}</span>
              </div>
            </div>
          </div>

          <div class="sd-foot">
            <button v-if="editingTeam" class="sd-reset" @click="removeTeam">この編成を削除</button>
            <span style="margin-right:auto"></span>
            <button class="skew-btn skew-btn--ghost" @click="closeEditor">キャンセル</button>
            <button class="skew-btn skew-btn--primary" @click="saveTeamForm">保存</button>
          </div>
        </div>
      </div>
    </div>
  `,

  data() {
    return {
      editorOpen: false,
      editingTeam: null,
      form: this.initForm(),
      sel: { type: 'strikers', index: 0 },   // 選んでいる枠
      search: '',
      ownedOnly: true,
      atkFilter: [],
      classFilter: [],
    };
  },

  computed: {
    currentMode() {
      return TEAM_MODES.find(m => m.value === this.store.teamMode) || TEAM_MODES[0];
    },
    formMode() {
      return TEAM_MODES.find(m => m.value === this.form.mode) || TEAM_MODES[0];
    },
    maxStriker() { return this.formMode.striker; },
    maxSpecial() { return this.formMode.special; },
    slotGroups() {
      return [
        { type: 'strikers', label: 'STRIKER', short: 'ST', max: this.maxStriker },
        { type: 'specials', label: 'SPECIAL', short: 'SP', max: this.maxSpecial },
      ];
    },

    filteredTeams() {
      const f = this.store.teamFilter;
      const mode = this.store.teamMode;
      const q = (f.name || '').trim();
      return this.store.teams.filter(t => {
        const tMode = t.mode || 'normal';
        if (tMode !== mode) return false;
        if (f.purpose && t.purpose !== f.purpose) return false;
        if (q && !t.name.includes(q) && !this.members(t).some(s => s.name.includes(q))) return false;
        if (f.unownedOnly && this.unownedCount(t) === 0) return false;
        return true;
      });
    },

    // 選んでいる枠の種類 (ST / SP) の生徒だけを出す
    pickerStudents() {
      const role = this.sel.type === 'strikers' ? 'striker' : 'special';
      const q = this.search.trim();
      return this.store.students
        .filter(s => s.role === role)
        .filter(s => !this.ownedOnly || s.owned || this.inTeam(s.id))
        .filter(s => !q || s.name.includes(q))
        .filter(s => !this.atkFilter.length || this.atkFilter.includes(s.attackType))
        .filter(s => !this.classFilter.length || this.classFilter.includes(s.class))
        .sort((a, b) => {
          if (a.owned !== b.owned) return a.owned ? -1 : 1;
          return (a.name || '').localeCompare(b.name || '');
        });
    },
  },

  methods: {
    initForm() {
      return { name: '', purpose: 'total_assault', strikers: [], specials: [], notes: '', mode: 'normal' };
    },

    // ── 表示の補助 ─────────────────────────────────────────
    studentById(id) {
      return id ? this.store.students.find(s => s.id === id) || null : null;
    },
    memberAt(ids, i) {
      return this.studentById((ids || [])[i]);
    },
    members(team) {
      return [...(team.strikers || []), ...(team.specials || [])].map(id => this.studentById(id)).filter(Boolean);
    },
    unownedCount(team) {
      return this.members(team).filter(s => !s.owned).length;
    },
    imageOf(s) {
      return s ? (s.imageData || s.imageUrl || '') : '';
    },
    schoolGradient(s) {
      return SCHOOL_COLORS[s && s.school] || SCHOOL_COLOR_FALLBACK;
    },
    attackColor(v) {
      return ATTACK_TYPE_COLORS[v] || '#8aa0b8';
    },
    attackLabel(v) {
      const t = ATTACK_TYPES.find(t => t.value === v);
      return t ? t.label : (v || '—');
    },
    // ST の攻撃タイプの内訳。includeZero は編成画面のサマリ用 (0 件の主要タイプも出す)
    attackSummary(ids, includeZero = false) {
      const counts = {};
      for (const id of ids || []) {
        const s = this.studentById(id);
        if (s) counts[s.attackType] = (counts[s.attackType] || 0) + 1;
      }
      return ATTACK_TYPES
        .filter(t => counts[t.value] || (includeZero && t.value !== 'decomposition'))
        .map(t => ({ value: t.value, label: t.label, color: this.attackColor(t.value), count: counts[t.value] || 0 }));
    },
    purposeLabel(value) {
      const p = TEAM_PURPOSES.find(p => p.value === value);
      return p ? p.label : value;
    },
    purposeTagStyle(value) {
      const c = PURPOSE_COLORS[value] || PURPOSE_COLORS.other;
      return { background: c.bg, color: c.text };
    },
    purposeChipStyle(value) {
      const c = PURPOSE_COLORS[value] || PURPOSE_COLORS.other;
      return { background: c.bg, color: c.text, borderColor: c.main };
    },
    firstLine(text) {
      return (text || '').split('\n').find(l => l.trim()) || '';
    },
    toggleList(list, v) {
      const i = list.indexOf(v);
      if (i < 0) list.push(v);
      else list.splice(i, 1);
    },

    // ── 編成画面 ───────────────────────────────────────────
    openEditor(team, slotType, slotIndex) {
      this.editingTeam = team;
      this.form = team
        ? {
            name: team.name,
            purpose: team.purpose,
            strikers: [...(team.strikers || [])],
            specials: [...(team.specials || [])],
            notes: team.notes || '',
            mode: team.mode || 'normal',
          }
        : { ...this.initForm(), mode: this.store.teamMode };
      this.search = '';
      this.atkFilter = [];
      this.classFilter = [];
      if (slotType) {
        this.sel = { type: slotType, index: Math.min(slotIndex, this.form[slotType].length) };
      } else {
        this.selectNextEmpty('strikers');
      }
      this.editorOpen = true;
    },

    closeEditor() {
      this.editorOpen = false;
      this.editingTeam = null;
      this.form = this.initForm();
    },

    // 枠は詰めて保存するので、空き枠を選んだら「次に入る位置」を選んだことにする
    selectSlot(type, index) {
      this.sel = { type, index: Math.min(index, this.form[type].length) };
    },

    // 次の空き枠へ移る (同じ種類 → もう一方の種類の順。満員なら今の枠のまま)
    selectNextEmpty(preferType) {
      const order = preferType === 'specials' ? ['specials', 'strikers'] : ['strikers', 'specials'];
      for (const type of order) {
        const max = type === 'strikers' ? this.maxStriker : this.maxSpecial;
        if (this.form[type].length < max) {
          this.sel = { type, index: this.form[type].length };
          return;
        }
      }
      if (!this.sel) this.sel = { type: preferType, index: 0 };
    },

    inTeam(id) {
      return this.form.strikers.includes(id) || this.form.specials.includes(id);
    },

    // 生徒をクリック: 編成中なら外す、そうでなければ選んでいる枠に入れて次の空き枠へ
    pick(s) {
      if (this.inTeam(s.id)) {
        for (const type of ['strikers', 'specials']) {
          const i = this.form[type].indexOf(s.id);
          if (i >= 0) this.removeAt(type, i);
        }
        return;
      }
      const { type, index } = this.sel;
      const list = this.form[type];
      const max = type === 'strikers' ? this.maxStriker : this.maxSpecial;
      if (index < list.length) {
        list.splice(index, 1, s.id);
      } else if (list.length < max) {
        list.push(s.id);
      } else {
        this.store.showToast(`${type === 'strikers' ? 'ストライカー' : 'スペシャル'}は最大${max}名です`, 'error');
        return;
      }
      this.selectNextEmpty(type);
    },

    removeAt(type, index) {
      this.form[type].splice(index, 1);
      this.sel = { type, index: Math.min(this.sel.index, this.form[type].length) };
      if (this.sel.type !== type) this.sel = { type, index: this.form[type].length };
    },

    async saveTeamForm() {
      if (!this.form.name.trim()) {
        this.store.showToast('編成名を入力してください', 'error');
        return;
      }
      const data = { ...this.form, strikers: [...this.form.strikers], specials: [...this.form.specials] };
      if (this.editingTeam) data.id = this.editingTeam.id;
      await saveTeam(data);
      await this.store.loadTeams();
      this.store.showToast('保存しました', 'success');
      this.closeEditor();
    },

    async removeTeam() {
      const team = this.editingTeam;
      if (!team || !confirm(`「${team.name}」を削除しますか？`)) return;
      await deleteTeam(team.id);
      await this.store.loadTeams();
      this.store.showToast('削除しました', 'info');
      this.closeEditor();
    },
  },
};
