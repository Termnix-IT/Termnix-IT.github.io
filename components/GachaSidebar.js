// ============================================================
//  components/GachaSidebar.js  —  ガチャページのサイドパネル
//  募集モード切替 + チャージの手入力 + 排出枠表 + ルールの説明
//  (PU 生徒の選択はメインの募集バナーにある)
// ============================================================

// モード切替ボタン右端の種別タグ
const GACHA_MODE_TAGS = {
  pickup:      { text: 'PU',      bg: '#dbe8f5', color: '#4a5d75' },
  limited:     { text: 'LIMITED', bg: '#ffe0ec', color: '#c41856' },
  anniversary: { text: 'FES',     bg: '#f3e8ff', color: '#7e22ce' },
  archive:     { text: 'ARCHIVE', bg: '#e6f7ef', color: '#047857' },
};

const GachaSidebarComponent = {
  inject: ['store'],

  data() {
    return {
      chargeInput: 0,
      GACHA_MODE_TAGS,
    };
  },

  template: `
    <div class="sidebar-content">
      <div class="sidebar-section-id">MODE</div>
      <div class="mode-toggle">
        <button v-for="m in GACHA_MODES" :key="m.value"
          class="mode-toggle-btn"
          :class="{ active: store.gachaMode === m.value }"
          @click="store.gachaMode = m.value">
          {{ m.label }}
          <span class="mode-toggle-tag" :style="{ background: GACHA_MODE_TAGS[m.value].bg, color: GACHA_MODE_TAGS[m.value].color }">
            {{ GACHA_MODE_TAGS[m.value].text }}
          </span>
        </button>
      </div>

      <!-- チャージ / ポイントの手動設定 (ゲーム内の現在値を再現する用) -->
      <div class="sidebar-section-id">CHARGE</div>
      <div class="sidebar-field">
        <span class="sidebar-label">{{ chargeLabel }}（ゲーム内の現在値）</span>
        <div class="gacha-charge-row">
          <num-stepper v-model="chargeInput" :min="0" :max="199"></num-stepper>
          <button class="sidebar-sub-btn" @click="applyCharge(chargeInput)">反映</button>
          <button class="sidebar-sub-btn gacha-charge-zero" @click="applyCharge(0)">0 に戻す</button>
        </div>
        <div class="sidebar-note">
          <template v-if="currentMode.chargeType === 'archive'">アーカイブ募集のポイントです。</template>
          <template v-else-if="currentMode.chargeType === 'limited'">期間限定・周年限定で共通のチャージです。通常のピックアップとは別に数えます。</template>
          <template v-else>ピックアップ募集のチャージです。期間限定・周年は別のチャージを使います。</template>
        </div>
      </div>

      <div class="sidebar-section-id">RATES</div>
      <div class="gacha-rates-table">
        <div v-for="(r, i) in currentMode.rates" :key="i" class="gacha-rate-row">
          <i class="gacha-rate-dot" :style="{ background: rateColor(r, i) }"></i>
          <span class="gacha-rate-label">{{ r.label }}</span>
          <span class="gacha-rate-pct">{{ (r.pct * 100).toFixed(1) }}%</span>
        </div>
      </div>

      <div class="sidebar-section-id">INFO</div>
      <details class="sidebar-accordion">
        <summary>{{ currentMode.pity === 'charge' ? '呼び出しチャージのルール' : 'アーカイブポイントのルール' }}</summary>
        <div v-if="currentMode.pity === 'charge'">
          1 回引くごとに +1。100 に達する募集で ★3 確定・50% で PU、200 に達する募集で PU 確定。<br>
          PU を引くと 0 に戻り、すり抜け ★3 では戻りません。募集期間をまたいで持ち越します。
        </div>
        <div v-else>
          1 回引くごとに +1。200pt で PU 生徒と交換できます (ポイントは交換したときだけ減ります)。
        </div>
      </details>
      <details class="sidebar-accordion">
        <summary>排出対象（恒常・限定・配布）</summary>
        <div>
          すり抜け・★2・★1 は恒常生徒のみ。<br>
          限定生徒は PU に選んだときだけ排出します。<br>
          配布生徒はガチャから出ません。
        </div>
      </details>
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
    currentCharge() {
      return this.store.gachaCharge[this.currentMode.chargeType] || 0;
    },
  },

  watch: {
    // モード切替・ガチャを引いたときに、入力欄を現在値に合わせる
    currentCharge: {
      immediate: true,
      handler(v) { this.chargeInput = Math.min(v, 199); },
    },
  },

  methods: {
    // 排出枠の色: ★3 は PU を濃いピンク・それ以外を淡いピンク、★2 は黄、★1 は水色
    rateColor(r, i) {
      if (r.stars === 3) return r.pool === 'pickup' ? '#ff4f8b' : '#ff9cc0';
      return r.stars === 2 ? '#fbbf24' : '#a9cdf0';
    },
    applyCharge(v) {
      const n = Math.min(Math.max(0, Number(v) || 0), 199);
      this.store.gachaCharge[this.currentMode.chargeType] = n;
      this.store.saveGachaCharge();
      this.chargeInput = n;
      this.store.showToast(`${this.chargeLabel} を ${n} に設定しました`, 'info');
    },
  },
};
