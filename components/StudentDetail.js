// ============================================================
//  components/StudentDetail.js  —  生徒詳細編集モーダル
//  左: 画像とマスタ情報 (読み取り専用) と所持スイッチ
//  右: 育成 / 装備・能力開放 / 必要素材 / メモ のタブ
// ============================================================

// 固有武器の★ごとの固有武器レベル上限 (★0 = 未解放)
const UNIQUE_WEAPON_LEVEL_CAP = [0, 30, 40, 50, 60];

const SKILL_DEFS = [
  { key: 'ex',      label: 'EX',      max: 5 },
  { key: 'normal',  label: 'NORMAL',  max: 10 },
  { key: 'passive', label: 'PASSIVE', max: 10 },
  { key: 'sub',     label: 'SUB',     max: 10 },
];

const RELEASE_DEFS = [
  { key: 'hp',     label: '最大HP' },
  { key: 'attack', label: '攻撃力' },
  { key: 'heal',   label: '治癒力' },
];

const StudentDetailComponent = {
  inject: ['store'],
  template: `
    <div class="modal-overlay" @click.self="store.closeStudentDetail()">
      <div class="modal-box sd-modal">
        <span class="sd-corner sd-corner--tl"></span><span class="sd-corner sd-corner--tr"></span>
        <span class="sd-corner sd-corner--bl"></span><span class="sd-corner sd-corner--br"></span>
        <div class="scan-line"></div>

        <!-- 名前の帯 -->
        <div class="sd-head">
          <span class="sd-name">{{ form.name || '生徒情報' }}</span>
          <span v-if="form.school" class="sd-school-tag">{{ schoolEn || form.school }}</span>
          <span class="sd-id">STUDENT_ID: {{ store.selectedStudentId }}</span>
          <button class="sd-close" @click="store.closeStudentDetail()" title="閉じる">✕</button>
        </div>

        <div class="sd-body">
          <!-- ── 左: 生徒の顔 ── -->
          <div class="sd-left">
            <div class="sd-portrait" :style="{ background: schoolGradient }" @click="$refs.imgInput.click()"
              title="クリックして画像を変更">
              <img v-if="imageSrc" :src="imageSrc" :alt="form.name">
              <template v-else>
                <div class="sd-portrait-halo"></div>
                <div class="sd-portrait-initial">{{ (form.name || '?').charAt(0) }}</div>
              </template>
              <div class="sd-portrait-stars">{{ '★'.repeat(form.rarity || 1) }}</div>
              <div class="sd-portrait-change">画像を変更</div>
            </div>
            <input type="file" ref="imgInput" accept="image/*" style="display:none" @change="handleImageUpload">
            <button v-if="form.imageData" class="sd-link-btn" @click="form.imageData = ''">アップロード画像を削除</button>

            <div class="sd-tags">
              <div class="sd-tag"><small>ATTACK</small><b :style="{ color: attackColor }">● {{ label(ATTACK_TYPES, form.attackType) }}</b></div>
              <div class="sd-tag"><small>ARMOR</small><b>{{ label(ARMOR_TYPES, form.armorType) }}</b></div>
              <div class="sd-tag"><small>ROLE</small><b>{{ label(ROLES, form.role) }}</b></div>
              <div class="sd-tag"><small>POSITION</small><b>{{ label(POSITIONS, form.position) }}</b></div>
              <div class="sd-tag"><small>CLASS</small><b>{{ form.class || '—' }}</b></div>
              <div class="sd-tag"><small>WEAPON</small><b>{{ label(WEAPONS, form.weapon) }}</b></div>
              <div class="sd-tag sd-tag--wide"><small>OBTAIN</small><b>{{ label(OBTAINABILITIES, form.obtainability) }}</b></div>
            </div>

            <div class="sd-own" :class="{ 'sd-own--on': form.owned }">
              <button class="sd-switch" role="switch" :aria-checked="form.owned" @click="form.owned = !form.owned"></button>
              <div>
                <b>{{ form.owned ? '所持している' : '未所持' }}</b>
                <small>切り替えても育成データは残ります</small>
              </div>
            </div>
          </div>

          <!-- ── 右: 編集タブ ── -->
          <div class="sd-right">
            <div class="sd-tabs">
              <button v-for="t in tabs" :key="t.id" class="sd-tab" :class="{ active: tab === t.id }"
                @click="tab = t.id">{{ t.label }}</button>
            </div>

            <div class="sd-content">
              <!-- 育成 -->
              <template v-if="tab === 'growth'">
                <section class="sd-block">
                  <div class="sd-block-h">RANK <span>神秘開放・固有武器</span></div>
                  <div class="sd-starrow">
                    <button v-for="i in 5" :key="'r' + i" class="sd-star" :class="{ on: form.starRank >= i }"
                      :title="'神秘開放 ★' + i" @click="setStarRank(i)">★</button>
                    <span class="sd-star-div"></span>
                    <button v-for="j in 4" :key="'u' + j" class="sd-star sd-star--uw"
                      :class="{ on: form.uniqueWeaponStar >= j }" :disabled="form.starRank < 5"
                      :title="form.starRank < 5 ? '神秘開放 ★5 で解放' : '固有武器 ★' + j" @click="setUniqueWeaponStar(j)">★</button>
                    <span class="sd-hint">
                      神秘開放 ★{{ form.starRank }}<br>
                      <template v-if="form.starRank < 5">固有武器は神秘開放 ★5 で解放</template>
                      <template v-else>固有武器 ★{{ form.uniqueWeaponStar }}</template>
                    </span>
                  </div>
                  <div class="sd-row">
                    <span class="sd-row-label">固有武器 Lv</span>
                    <num-stepper v-model="form.uniqueWeaponLevel" :min="0" :max="uniqueWeaponLevelMax"></num-stepper>
                    <span class="sd-hint">/ {{ uniqueWeaponLevelMax }}<template v-if="form.uniqueWeaponStar">（固有武器 ★{{ form.uniqueWeaponStar }} の上限）</template></span>
                  </div>
                </section>

                <section class="sd-block">
                  <div class="sd-block-h">BOND <span>絆レベル</span></div>
                  <div class="sd-bond">
                    <div class="sd-heart">{{ form.bondLevel }}</div>
                    <div class="sd-bond-bar">
                      <div class="skew-bar" style="height:10px"><div :style="{ width: form.bondLevel + '%', background: '#ff4f8b' }"></div></div>
                      <div class="sd-hint">Lv.{{ form.bondLevel }} / 100</div>
                    </div>
                    <num-stepper v-model="form.bondLevel" :min="1" :max="100" accent="pink"></num-stepper>
                  </div>
                </section>

                <section class="sd-block">
                  <div class="sd-block-h">SKILL <span>スキルレベル</span></div>
                  <div class="sd-skills">
                    <div v-for="k in SKILL_DEFS" :key="k.key" class="sd-skill"
                      :class="{ 'sd-skill--max': form.skillLevels[k.key] >= k.max }">
                      <span v-if="form.skillLevels[k.key] >= k.max" class="sd-skill-max">MAX</span>
                      <div class="sd-skill-k">{{ k.label }}</div>
                      <div class="sd-skill-v">{{ form.skillLevels[k.key] }}<small> / {{ k.max }}</small></div>
                      <div class="sd-pips"><i v-for="p in k.max" :key="p" :class="{ on: p <= form.skillLevels[k.key] }"></i></div>
                      <num-stepper v-model="form.skillLevels[k.key]" :min="1" :max="k.max"></num-stepper>
                    </div>
                  </div>
                  <button class="sd-link-btn" @click="maxAllSkills">» すべて MAX にする</button>
                </section>
              </template>

              <!-- 装備・能力開放 -->
              <template v-else-if="tab === 'equip'">
                <section class="sd-block">
                  <div class="sd-block-h">EQUIPMENT <span>装備レベル</span></div>
                  <div class="sd-equips">
                    <div v-for="(lv, i) in form.equipmentLevels" :key="i" class="sd-equip">
                      <div class="sd-equip-slot">装備{{ ['①', '②', '③'][i] }}</div>
                      <div class="sd-equip-lv">Lv.{{ lv }}</div>
                      <num-stepper v-model="form.equipmentLevels[i]" :min="1" :max="65"></num-stepper>
                    </div>
                  </div>
                </section>
                <section class="sd-block">
                  <div class="sd-block-h">RELEASE <span>能力開放</span></div>
                  <div v-for="r in RELEASE_DEFS" :key="r.key" class="sd-release">
                    <span class="sd-row-label">{{ r.label }}</span>
                    <div class="skew-bar sd-release-bar">
                      <div :style="{ width: (form.releaseBonus[r.key] / 25 * 100) + '%', background: form.releaseBonus[r.key] >= 25 ? '#fbbf24' : '#128afa' }"></div>
                    </div>
                    <span class="sd-hint mono">{{ form.releaseBonus[r.key] }} / 25</span>
                    <num-stepper v-model="form.releaseBonus[r.key]" :min="0" :max="25"></num-stepper>
                  </div>
                </section>
              </template>

              <!-- 必要素材 -->
              <template v-else-if="tab === 'needs'">
                <section class="sd-block">
                  <div class="sd-block-h">NEEDS <span>必要素材（所持 / 必要）</span></div>
                  <div v-if="needRows.length === 0" class="sd-empty">必要素材は登録されていません</div>
                  <div v-for="(row, idx) in needRows" :key="idx" class="sd-need">
                    <span class="sd-need-ic" :style="{ background: row.color }"></span>
                    <span class="sd-need-name">{{ row.name }}</span>
                    <span class="sd-need-qty" :class="row.stock >= row.quantity ? 'ok' : 'ng'">
                      {{ row.stock }} / {{ row.quantity }}<template v-if="row.stock >= row.quantity"> ✓</template>
                    </span>
                    <button class="sd-need-remove" @click="removeNeededMaterial(idx)" title="削除">✕</button>
                  </div>
                  <div class="sd-need-add">
                    <select v-model="newNeedMaterialId">
                      <option value="">素材を選ぶ…</option>
                      <optgroup v-for="c in MATERIAL_CATEGORIES" :key="c.value" :label="c.label">
                        <option v-for="m in materialsIn(c.value)" :key="m.id" :value="m.id">{{ m.name }}</option>
                      </optgroup>
                    </select>
                    <num-stepper v-model="newNeedQuantity" :min="1" :max="9999"></num-stepper>
                    <button class="sidebar-sub-btn" @click="addNeededMaterial">追加</button>
                  </div>
                  <div class="sd-hint" style="margin-top:8px">所持数は素材ページで入力した値です。足りないものは赤で表示します。</div>
                </section>
              </template>

              <!-- メモ -->
              <template v-else>
                <section class="sd-block">
                  <div class="sd-block-h">MEMO <span>個人メモ</span></div>
                  <textarea v-model="form.notes" class="sd-notes" placeholder="育成優先度・感想など…"></textarea>
                </section>
              </template>
            </div>
          </div>
        </div>

        <div class="sd-foot">
          <button class="sd-reset" @click="confirmReset" title="育成データを初期値に戻します(マスタ生徒は残ります)">育成リセット</button>
          <span class="sd-hint" style="margin-right:auto">変更は「保存」を押すまで反映されません</span>
          <button class="skew-btn skew-btn--ghost" @click="store.closeStudentDetail()">キャンセル</button>
          <button class="skew-btn skew-btn--primary" @click="save">保存</button>
        </div>
      </div>
    </div>
  `,

  data() {
    return {
      SKILL_DEFS,
      RELEASE_DEFS,
      tabs: [
        { id: 'growth', label: '育成' },
        { id: 'equip',  label: '装備・能力開放' },
        { id: 'needs',  label: '必要素材' },
        { id: 'memo',   label: 'メモ' },
      ],
      tab: 'growth',
      form: this.initForm(),
      newNeedMaterialId: '',
      newNeedQuantity: 1,
    };
  },

  computed: {
    schoolEn() {
      return SCHOOL_EN[this.form.school] || '';
    },
    schoolGradient() {
      return SCHOOL_COLORS[this.form.school] || SCHOOL_COLOR_FALLBACK;
    },
    imageSrc() {
      return this.form.imageData || this.form.imageUrl || '';
    },
    attackColor() {
      return ATTACK_TYPE_COLORS[this.form.attackType] || '#4a5d75';
    },
    uniqueWeaponLevelMax() {
      return UNIQUE_WEAPON_LEVEL_CAP[this.form.uniqueWeaponStar] || 0;
    },
    needRows() {
      return (this.form.neededMaterials || []).map(need => {
        const r = resolveMaterialNeed(need, this.store.materialInventory, this.store.materials);
        return { name: r.name, stock: r.stock, quantity: need.quantity || 0, color: materialTierColor(r.material) };
      });
    },
  },

  watch: {
    'store.selectedStudentId': {
      immediate: true,
      handler(id) {
        if (id) {
          const s = this.store.students.find(s => s.id === id);
          if (s) {
            this.form = {
              ...s,
              uniqueWeaponStar: s.uniqueWeaponStar || 0,
              skillLevels: { ...{ ex:1, normal:1, passive:1, sub:1 }, ...(s.skillLevels || {}) },
              equipmentLevels: [...(s.equipmentLevels || [1,1,1])],
              releaseBonus: { hp: 0, attack: 0, heal: 0, ...(s.releaseBonus || {}) },
              neededMaterials: s.neededMaterials ? s.neededMaterials.map(n => ({ ...n })) : [],
              imageData: s.imageData || '',
            };
          }
        } else {
          this.form = this.initForm();
        }
      },
    },
  },

  methods: {
    initForm() {
      return {
        name: '',
        school: '',
        class: 'アタッカー',
        rarity: 3,
        attackType: 'explosive',
        armorType: 'light',
        role: 'striker',
        position: '',
        weapon: '',
        owned: false,
        starRank: 1,
        bondLevel: 1,
        uniqueWeaponStar: 0,
        uniqueWeaponLevel: 0,
        skillLevels: { ex: 1, normal: 1, passive: 1, sub: 1 },
        equipmentLevels: [1, 1, 1],
        releaseBonus: { hp: 0, attack: 0, heal: 0 },
        notes: '',
        neededMaterials: [],
        imageData: '',
      };
    },

    label(list, value) {
      const t = list.find(t => t.value === value);
      return t ? t.label : (value || '—');
    },

    // 神秘開放: ★5 にすると固有武器 ★1 が自動で付き、★4 以下に戻すと固有武器の★は 0 に戻る
    setStarRank(i) {
      this.form.starRank = i;
      if (i === 5) {
        if (!this.form.uniqueWeaponStar) this.form.uniqueWeaponStar = 1;
      } else {
        this.form.uniqueWeaponStar = 0;
      }
      this.clampUniqueWeaponLevel();
    },

    setUniqueWeaponStar(j) {
      if (this.form.starRank < 5) return;
      this.form.uniqueWeaponStar = j;
      this.clampUniqueWeaponLevel();
    },

    clampUniqueWeaponLevel() {
      this.form.uniqueWeaponLevel = Math.min(this.form.uniqueWeaponLevel || 0, this.uniqueWeaponLevelMax);
    },

    maxAllSkills() {
      for (const k of SKILL_DEFS) this.form.skillLevels[k.key] = k.max;
    },

    handleImageUpload(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        this.resizeImage(ev.target.result, 300, 400, (resized) => {
          this.form.imageData = resized;
        });
      };
      reader.readAsDataURL(file);
      // 同じファイルを再選択できるようリセット
      e.target.value = '';
    },

    resizeImage(dataUrl, maxW, maxH, callback) {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        // アスペクト比を保ったまま maxW × maxH に収める
        const scale = Math.min(maxW / w, maxH / h, 1);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
        const canvas = document.createElement('canvas');
        canvas.width  = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        callback(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = dataUrl;
    },

    addNeededMaterial() {
      if (!this.newNeedMaterialId) {
        this.store.showToast('素材を選択してください', 'error');
        return;
      }
      // 素材は data/materials.js のマスタから選ぶ (materialId はマスタの文字列 id)
      const mat = MATERIAL_BY_ID[this.newNeedMaterialId];
      if (!mat) return;
      const already = (this.form.neededMaterials || []).findIndex(n => n.materialId === mat.id);
      if (already >= 0) {
        this.store.showToast('すでに追加済みです', 'error');
        return;
      }
      if (!this.form.neededMaterials) this.form.neededMaterials = [];
      this.form.neededMaterials.push({
        materialId:   mat.id,
        materialName: mat.name,
        quantity:     this.newNeedQuantity || 1,
      });
      this.newNeedMaterialId = '';
      this.newNeedQuantity = 1;
    },

    removeNeededMaterial(idx) {
      this.form.neededMaterials.splice(idx, 1);
    },

    materialsIn(category) {
      return MATERIAL_MASTER.filter(m => m.category === category);
    },

    async save() {
      if (!this.store.selectedStudentId) {
        this.store.showToast('対象生徒が選択されていません', 'error');
        return;
      }
      const data = {
        id: this.store.selectedStudentId,
        owned:             this.form.owned,
        starRank:          this.form.starRank,
        bondLevel:         this.form.bondLevel,
        uniqueWeaponStar:  this.form.uniqueWeaponStar,
        uniqueWeaponLevel: this.form.uniqueWeaponLevel,
        skillLevels:       { ...this.form.skillLevels },
        equipmentLevels:   [...this.form.equipmentLevels],
        releaseBonus:      { ...this.form.releaseBonus },
        notes:             this.form.notes,
        neededMaterials:   (this.form.neededMaterials || []).map(n => ({ ...n })),
        imageData:         this.form.imageData || '',
      };
      await saveStudent(data);
      await this.store.loadStudents();
      this.store.closeStudentDetail();
      this.store.showToast('保存しました', 'success');
    },

    async confirmReset() {
      if (!confirm(`「${this.form.name}」の育成データを初期値にリセットしますか？\n(マスタ生徒は残ります)`)) return;
      await deleteStudent(this.store.selectedStudentId);
      await this.store.loadStudents();
      this.store.closeStudentDetail();
      this.store.showToast('育成データをリセットしました', 'info');
    },
  },
};
