// ============================================================
//  components/StudentDetail.js  —  生徒詳細編集モーダル
// ============================================================

const StudentDetailComponent = {
  inject: ['store'],
  template: `
    <div class="modal-overlay" @click.self="store.closeStudentDetail()">
      <div class="modal-box">
        <div class="scan-line"></div>
        <div class="modal-header">
          <h2>{{ form.name || '生徒情報' }}</h2>
          <button class="modal-close" @click="store.closeStudentDetail()">×</button>
        </div>

        <div class="form-grid">

          <!-- 画像アップロード -->
          <div class="form-group full-width">
            <label>生徒画像</label>
            <div class="img-upload-area" @click="$refs.imgInput.click()">
              <img v-if="form.imageData" :src="form.imageData" class="img-preview">
              <template v-else-if="form.imageUrl">
                <img :src="form.imageUrl" class="img-preview">
                <span class="img-upload-hint">マスタ画像 (クリックでアップロード画像に差し替え)</span>
              </template>
              <div v-else class="img-upload-placeholder">
                <span class="img-upload-icon">＋</span>
                <span class="img-upload-text">クリックして画像を選択</span>
                <span class="img-upload-hint">JPG / PNG / WebP</span>
              </div>
            </div>
            <input type="file" ref="imgInput" accept="image/*" style="display:none" @change="handleImageUpload">
            <button v-if="form.imageData" class="btn-secondary-modal img-remove-btn"
              @click="form.imageData = ''">画像を削除</button>
          </div>

          <!-- 基本情報 (マスタデータ・読み取り専用) -->
          <div class="form-group">
            <label>学校</label>
            <div class="form-readonly">{{ form.school || '—' }}</div>
          </div>
          <div class="form-group">
            <label>クラス</label>
            <div class="form-readonly">{{ form.class || '—' }}</div>
          </div>
          <div class="form-group">
            <label>レアリティ</label>
            <div class="form-readonly">{{ '★'.repeat(form.rarity || 1) }}</div>
          </div>
          <div class="form-group">
            <label>攻撃タイプ</label>
            <div class="form-readonly">{{ attackTypeLabel(form.attackType) }}</div>
          </div>
          <div class="form-group">
            <label>装甲タイプ</label>
            <div class="form-readonly">{{ armorTypeLabel(form.armorType) }}</div>
          </div>
          <div class="form-group">
            <label>役割</label>
            <div class="form-readonly">{{ roleLabel(form.role) }}</div>
          </div>
          <div class="form-group">
            <label>位置</label>
            <div class="form-readonly">{{ positionLabel(form.position) }}</div>
          </div>
          <div class="form-group">
            <label>使用武器種</label>
            <div class="form-readonly">{{ weaponLabel(form.weapon) }}</div>
          </div>
          <div class="form-group">
            <label>入手区分</label>
            <div class="form-readonly">{{ obtainabilityLabel(form.obtainability) }}</div>
          </div>

          <!-- 所持 (育成データ・編集可) -->
          <div class="form-group">
            <label>所持</label>
            <select v-model="form.owned">
              <option :value="true">所持</option>
              <option :value="false">未所持</option>
            </select>
          </div>

          <!-- 育成情報 -->
          <div class="form-group">
            <label>神秘開放レベル</label>
            <input type="number" v-model.number="form.starRank" min="1" max="5">
          </div>
          <div class="form-group">
            <label>絆レベル</label>
            <input type="number" v-model.number="form.bondLevel" min="1" max="100">
          </div>
          <div class="form-group">
            <label>固有武器レベル</label>
            <input type="number" v-model.number="form.uniqueWeaponLevel" min="0" max="60">
          </div>

          <!-- スキルレベル -->
          <div class="form-group full-width">
            <label>スキルレベル</label>
            <div class="skill-grid">
              <div class="form-group">
                <label>EX</label>
                <input type="number" v-model.number="form.skillLevels.ex" min="1" max="5">
              </div>
              <div class="form-group">
                <label>通常</label>
                <input type="number" v-model.number="form.skillLevels.normal" min="1" max="10">
              </div>
              <div class="form-group">
                <label>パッシブ</label>
                <input type="number" v-model.number="form.skillLevels.passive" min="1" max="10">
              </div>
              <div class="form-group">
                <label>サブ</label>
                <input type="number" v-model.number="form.skillLevels.sub" min="1" max="10">
              </div>
            </div>
          </div>

          <!-- 装備レベル -->
          <div class="form-group full-width">
            <label>装備レベル</label>
            <div class="equip-grid">
              <div class="form-group">
                <label>装備①</label>
                <input type="number" v-model.number="form.equipmentLevels[0]" min="1" max="65">
              </div>
              <div class="form-group">
                <label>装備②</label>
                <input type="number" v-model.number="form.equipmentLevels[1]" min="1" max="65">
              </div>
              <div class="form-group">
                <label>装備③</label>
                <input type="number" v-model.number="form.equipmentLevels[2]" min="1" max="65">
              </div>
            </div>
          </div>

          <!-- 能力開放レベル -->
          <div class="form-group full-width">
            <label>能力開放レベル</label>
            <div class="equip-grid">
              <div class="form-group">
                <label>最大HPボーナス</label>
                <input type="number" v-model.number="form.releaseBonus.hp" min="0" max="25">
              </div>
              <div class="form-group">
                <label>攻撃力ボーナス</label>
                <input type="number" v-model.number="form.releaseBonus.attack" min="0" max="25">
              </div>
              <div class="form-group">
                <label>治癒力ボーナス</label>
                <input type="number" v-model.number="form.releaseBonus.heal" min="0" max="25">
              </div>
            </div>
          </div>

          <!-- メモ -->
          <div class="form-group full-width">
            <label>個人メモ</label>
            <textarea v-model="form.notes" rows="3" placeholder="育成優先度・感想など..."></textarea>
          </div>

          <!-- 必要素材 -->
          <div class="form-group full-width">
            <label>必要素材</label>
            <div class="need-add-row">
              <select v-model="newNeedMaterialId" style="flex:1;min-width:140px">
                <option value="">素材を選択</option>
                <optgroup v-for="c in MATERIAL_CATEGORIES" :key="c.value" :label="c.label">
                  <option v-for="m in materialsIn(c.value)" :key="m.id" :value="m.id">{{ m.name }}</option>
                </optgroup>
              </select>
              <input type="number" v-model.number="newNeedQuantity" min="1" style="width:80px" placeholder="数量">
              <button class="btn-edit" @click="addNeededMaterial">＋ 追加</button>
            </div>
            <div v-if="form.neededMaterials && form.neededMaterials.length > 0" class="need-list">
              <div v-for="(need, idx) in form.neededMaterials" :key="idx" class="need-list-row">
                <span class="need-list-name">{{ need.materialName }}</span>
                <span class="need-list-qty">× {{ need.quantity }}</span>
                <button class="need-list-remove" @click="removeNeededMaterial(idx)">×</button>
              </div>
            </div>
            <div v-else class="need-empty">必要素材なし</div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-edit btn-danger" @click="confirmReset" title="育成データを初期値に戻します(マスタ生徒は残ります)">育成リセット</button>
          <span style="flex:1"></span>
          <button class="btn-secondary-modal" @click="store.closeStudentDetail()">キャンセル</button>
          <button class="btn-primary" @click="save">保存</button>
        </div>
      </div>
    </div>
  `,

  data() {
    return {
      form: this.initForm(),
      newNeedMaterialId: '',
      newNeedQuantity: 1,
    };
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
        uniqueWeaponLevel: 0,
        skillLevels: { ex: 1, normal: 1, passive: 1, sub: 1 },
        equipmentLevels: [1, 1, 1],
        releaseBonus: { hp: 0, attack: 0, heal: 0 },
        notes: '',
        neededMaterials: [],
        imageData: '',
      };
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

    attackTypeLabel(value) {
      const t = ATTACK_TYPES.find(t => t.value === value);
      return t ? t.label : (value || '—');
    },

    armorTypeLabel(value) {
      const t = ARMOR_TYPES.find(t => t.value === value);
      return t ? t.label : (value || '—');
    },

    roleLabel(value) {
      const t = ROLES.find(t => t.value === value);
      return t ? t.label : (value || '—');
    },

    positionLabel(value) {
      const t = POSITIONS.find(t => t.value === value);
      return t ? t.label : (value || '—');
    },

    weaponLabel(value) {
      const t = WEAPONS.find(t => t.value === value);
      return t ? t.label : (value || '—');
    },

    obtainabilityLabel(value) {
      const t = OBTAINABILITIES.find(t => t.value === value);
      return t ? t.label : (value || '—');
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
