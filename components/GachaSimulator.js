// ============================================================
//  components/GachaSimulator.js  —  ガチャシミュレーター
// ============================================================
//
//  募集モード (data/constants.js の GACHA_MODES):
//    pickup      : ピックアップ募集       ★3 3.0%  呼び出しチャージ
//    limited     : 期間限定ピックアップ   ★3 3.0%  限定・呼び出しチャージ
//    anniversary : 周年限定募集           ★3 6.0%  限定・呼び出しチャージ
//    archive     : アーカイブ募集         ★3 3.0%  アーカイブポイント (200pt 交換制)
//
//  呼び出しチャージ (2026/07/29 の募集リニューアル):
//    ・対象の募集を 1 回引くごとにチャージ +1 (募集前の値が「合計◯◯回」)
//    ・チャージが 100 に達する募集   → ★3 確定。50% で PU、外れは mode.charge100 の配分
//    ・チャージが 200 に達する募集   → PU 確定
//    ・PU 生徒を引いた時点でチャージは 0 にリセット (10連の途中でも同様)
//    ・すり抜け ★3 ではリセットしない。募集期間をまたいでも持ち越し
//    ・チャージは mode.chargeType ('pickup' / 'limited') ごとに別管理し localStorage に保存
//
//  アーカイブポイント:
//    ・1 回引くごとに +1。200pt で PU 生徒と交換 (リセットは交換時のみ)
// ============================================================

const PULL_COST = 120;          // 1連あたりの青輝石
const CHARGE_MID = 100;         // ★3 確定 + PU 50% ライン
const CHARGE_MAX = 200;         // PU 確定ライン / アーカイブ交換ライン

// 入手区分による排出可否 (obtainability 未設定は恒常扱い)
const isPermanent = (s) => (s.obtainability || 'permanent') === 'permanent';
const isGachaable = (s) => s.obtainability !== 'event';

const GachaSimulatorComponent = {
  inject: ['store'],

  template: `
    <div class="sim-container">

      <!-- ── ヘッダー ── -->
      <div class="sim-header">
        <div>
          <h2 class="sim-title">{{ currentMode.label }} シミュレーター</h2>
          <div class="sim-subtitle">{{ currentMode.description }}</div>
        </div>
        <div class="sim-prob-display">
          <span class="sim-prob sim-prob-3">★★★ {{ ratePct.three }}%</span>
          <span class="sim-prob sim-prob-2">★★ {{ ratePct.two }}%</span>
          <span class="sim-prob sim-prob-1">★ {{ ratePct.one }}%</span>
        </div>
      </div>

      <!-- ── 統計カード ── -->
      <div class="sim-stat-grid">
        <div class="sim-stat">
          <div class="sim-stat-label">総ガチャ数</div>
          <div class="sim-stat-value">{{ stats.total.toLocaleString() }} 回</div>
        </div>
        <div class="sim-stat">
          <div class="sim-stat-label">PU 排出</div>
          <div class="sim-stat-value">{{ stats.pickups }} 体</div>
        </div>
        <div class="sim-stat">
          <div class="sim-stat-label">★3 排出</div>
          <div class="sim-stat-value">{{ stats.threeStars }} 体</div>
        </div>
        <div class="sim-stat">
          <div class="sim-stat-label">★3 排出率</div>
          <div class="sim-stat-value">{{ threeStarRate }}%</div>
        </div>
        <div class="sim-stat">
          <div class="sim-stat-label">★3 から</div>
          <div class="sim-stat-value">{{ stats.pity }} 回</div>
        </div>
        <div class="sim-stat">
          <div class="sim-stat-label">消費青輝石</div>
          <div class="sim-stat-value">{{ pyroxeneUsed.toLocaleString() }}</div>
        </div>
      </div>

      <!-- ── チャージ / ポイントバー ── -->
      <div class="sim-pity">
        <div class="sim-pity-label">
          <span>{{ counterLabel }}<span class="sim-pity-note">{{ counterNote }}</span></span>
          <span>{{ counter }} / {{ chargeMax }}</span>
        </div>
        <div class="pity-bar">
          <div class="pity-fill"
            :class="{ warning: counter >= chargeMid, danger: counter >= 170 }"
            :style="{ width: Math.min(100, counter / chargeMax * 100) + '%' }">
          </div>
          <div v-if="isCharge" class="pity-marker" :style="{ left: (chargeMid / chargeMax * 100) + '%' }"></div>
        </div>
        <div class="sim-pity-ticks">
          <span>0</span><span>50</span>
          <span :class="{ 'sim-pity-tick-hot': isCharge }">{{ isCharge ? '100 ★3確定 / PU50%' : '100' }}</span>
          <span>150</span>
          <span class="sim-pity-tick-hot">{{ isCharge ? '200 PU確定' : '200 交換' }}</span>
        </div>
      </div>

      <!-- ── ボタン ── -->
      <div class="sim-actions">
        <button class="sim-pull-btn sim-pull-btn-single" :disabled="isRolling || noPickup" @click="pull1">
          <div class="sim-pull-btn-main">1連</div>
          <div class="sim-pull-btn-sub">青輝石 {{ PULL_COST }}</div>
        </button>
        <button class="sim-pull-btn sim-pull-btn-ten" :disabled="isRolling || noPickup" @click="pull10">
          <div class="sim-pull-btn-main">10連</div>
          <div class="sim-pull-btn-sub">青輝石 {{ (PULL_COST * 10).toLocaleString() }}</div>
        </button>
        <button v-if="!isCharge" class="sim-pull-btn sim-pull-btn-exchange"
          :disabled="isRolling || counter < chargeMax" @click="exchange">
          <div class="sim-pull-btn-main">呼び出し</div>
          <div class="sim-pull-btn-sub">200pt で PU と交換</div>
        </button>
        <button class="sim-pull-btn sim-pull-btn-reset" :disabled="isRolling" @click="reset">
          <div class="sim-pull-btn-main">リセット</div>
          <div class="sim-pull-btn-sub">統計を初期化</div>
        </button>
      </div>
      <div v-if="noPickup" class="sim-warning">
        PU 生徒が未指定です。サイドパネルの「PU生徒を選択」から設定してください。
      </div>

      <!-- ── 結果表示 ── -->
      <div v-if="latestPulls.length > 0" class="sim-results">
        <div class="sim-results-header">
          <h3 class="sim-results-title">最新の結果</h3>
          <div class="sim-results-summary">
            <span v-if="latestPickupCount > 0" class="sim-pop-pu">PU × {{ latestPickupCount }}</span>
            <span v-if="latestThreeStarCount > 0" class="sim-pop-3">★3 × {{ latestThreeStarCount }}</span>
            <span v-if="latestTwoStarCount > 0" class="sim-pop-2">★2 × {{ latestTwoStarCount }}</span>
          </div>
        </div>
        <div class="sim-result-grid">
          <div v-for="(p, i) in latestPulls" :key="i"
            class="sim-result-card"
            :class="['sim-result-card-' + p.rarity, { 'sim-result-card-pu': p.isPickup }]">
            <div v-if="p.trigger" class="sim-result-trigger">{{ p.trigger }}</div>
            <div class="sim-result-stars">{{ '★'.repeat(p.rarity) }}</div>
            <div class="sim-result-name">{{ p.name }}</div>
            <div v-if="p.school" class="sim-result-school">{{ p.school }}</div>
            <div v-if="p.isPickup" class="sim-result-pu">PICKUP</div>
          </div>
        </div>
      </div>

      <!-- ── 排出履歴 (セッション内ログ) ── -->
      <div v-if="threeStarLog.length > 0" class="sim-log">
        <h3 class="sim-log-title">★3 排出履歴 (セッション)</h3>
        <div class="sim-log-list">
          <div v-for="(item, i) in threeStarLog" :key="i" class="sim-log-item"
            :class="{ 'sim-log-item-pu': item.isPickup }">
            <span class="sim-log-pull">#{{ item.pullNo }}</span>
            <span class="sim-log-name">{{ item.name }}</span>
            <span v-if="item.school" class="sim-log-school">{{ item.school }}</span>
            <span class="sim-log-frame">{{ item.frame }}</span>
            <span v-if="item.trigger" class="sim-log-trigger">{{ item.trigger }}</span>
          </div>
        </div>
      </div>

    </div>
  `,

  data() {
    return {
      PULL_COST,
      chargeMid: CHARGE_MID,
      chargeMax: CHARGE_MAX,
      latestPulls: [],
      threeStarLog: [],   // セッション中の★3 排出履歴
      stats: {
        total: 0,
        pickups: 0,
        threeStars: 0,
        twoStars: 0,
        oneStars: 0,
        pity: 0,          // 連続非★3 回数
      },
      isRolling: false,
    };
  },

  computed: {
    currentMode() {
      return GACHA_MODES.find(m => m.value === this.store.gachaMode) || GACHA_MODES[0];
    },
    // チャージ制 (pickup / limited / anniversary) か、ポイント制 (archive) か
    isCharge() {
      return this.currentMode.pity === 'charge';
    },
    // このモードのカウンタ種別キー (store.gachaCharge のキー)
    counterKey() {
      return this.currentMode.chargeType;
    },
    counter() {
      return this.store.gachaCharge[this.counterKey] || 0;
    },
    counterLabel() {
      if (!this.isCharge) return 'アーカイブポイント';
      return this.counterKey === 'limited' ? '限定・呼び出しチャージ' : '呼び出しチャージ';
    },
    counterNote() {
      return this.isCharge ? ' (PU入手でリセット・期間をまたいで持ち越し)' : ' (200pt で交換)';
    },
    noPickup() {
      return this.pickupCandidates().length === 0;
    },
    rates() {
      const sumStars = (s) =>
        this.currentMode.rates.filter(r => r.stars === s).reduce((acc, r) => acc + r.pct, 0);
      return { three: sumStars(3), two: sumStars(2), one: sumStars(1) };
    },
    ratePct() {
      return {
        three: (this.rates.three * 100).toFixed(1),
        two:   (this.rates.two   * 100).toFixed(1),
        one:   (this.rates.one   * 100).toFixed(1),
      };
    },
    threeStarRate() {
      if (this.stats.total === 0) return '0.00';
      return (this.stats.threeStars / this.stats.total * 100).toFixed(2);
    },
    pyroxeneUsed() {
      return this.stats.total * PULL_COST;
    },
    latestPickupCount() {
      return this.latestPulls.filter(p => p.isPickup).length;
    },
    latestThreeStarCount() {
      return this.latestPulls.filter(p => p.rarity === 3).length;
    },
    latestTwoStarCount() {
      return this.latestPulls.filter(p => p.rarity === 2).length;
    },
  },

  methods: {
    // ── チャージ / ポイント操作 ─────────────────────────────
    setCounter(v) {
      this.store.gachaCharge[this.counterKey] = Math.max(0, v);
      this.store.saveGachaCharge();
    },

    // ── 抽選 ────────────────────────────────────────────────
    // 重み付きでエントリを 1 つ選ぶ
    weightedPick(entries) {
      const total = entries.reduce((s, e) => s + e.pct, 0);
      const r = Math.random() * total;
      let cumulative = 0;
      for (const e of entries) {
        cumulative += e.pct;
        if (r < cumulative) return e;
      }
      return entries[entries.length - 1];
    },

    // 1回分の抽選
    //   forceMinTwoStar: ★1 を候補から外す (10連目保障)
    rollOne(forceMinTwoStar = false) {
      const mode = this.currentMode;
      const count = this.counter + 1;   // この募集でチャージ/ポイントが到達する値
      let entry;
      let trigger = '';

      if (this.isCharge && count >= CHARGE_MAX) {
        // 200 到達: PU 確定
        entry = mode.rates.find(e => e.pool === 'pickup');
        trigger = 'CHARGE 200';
      } else if (this.isCharge && count === CHARGE_MID) {
        // 100 到達: ★3 確定。50% PU、外れは charge100 の配分で非PU★3
        entry = this.weightedPick(mode.charge100);
        trigger = 'CHARGE 100';
      } else {
        const entries = mode.rates.filter(e => !forceMinTwoStar || e.stars !== 1);
        entry = this.weightedPick(entries);
      }

      const rarity = entry.stars;
      const isPickup = entry.pool === 'pickup';

      // 候補を取得 (空なら同レアリティの恒常生徒にフォールバック。限定・配布は混ぜない)
      let candidates = this.poolCandidates(entry);
      if (candidates.length === 0) {
        candidates = this.store.students.filter(s => s.rarity === rarity && isPermanent(s));
      }
      let name = '???';
      let school = '';
      if (candidates.length > 0) {
        const picked = candidates[Math.floor(Math.random() * candidates.length)];
        name = picked.name;
        school = picked.school;
      } else if (rarity === 1) {
        name = '★1 生徒';
      }

      // カウンタ更新: チャージ制は PU 入手でリセット、それ以外は +1。ポイント制は常に +1
      if (this.isCharge && isPickup) this.setCounter(0);
      else this.setCounter(count);

      // 統計
      this.stats.total++;
      if (rarity === 3) {
        this.stats.pity = 0;
        this.stats.threeStars++;
        if (isPickup) this.stats.pickups++;
        this.threeStarLog.unshift({ pullNo: this.stats.total, name, school, frame: entry.label, isPickup, trigger });
      } else {
        this.stats.pity++;
        if (rarity === 2) this.stats.twoStars++;
        else this.stats.oneStars++;
      }

      return { rarity, name, school, frame: entry.label, isPickup, trigger };
    },

    // PU 対象生徒 (★3 のみ。配布生徒はガチャから出ないので除外)
    pickupCandidates() {
      const ids = this.store.gachaPickupIds || [];
      return this.store.students.filter(s => s.rarity === 3 && ids.includes(s.id) && isGachaable(s));
    },

    // プール識別子から抽選候補を返す
    //   排出ルール:
    //   ・恒常 (permanent) — すり抜け / ★2 / ★1 を含む通常枠から排出
    //   ・限定 (limited)   — PU (周年モードは非PU周年枠も) に選択したときだけ排出
    //   ・配布 (event)     — ガチャからは排出しない
    poolCandidates(entry) {
      const students = this.store.students;
      const isStar = (s) => s.rarity === entry.stars;
      const pu  = this.store.gachaPickupIds || [];
      const fes = this.store.gachaLimitedFallthroughIds || [];
      switch (entry.pool) {
        case 'pickup':
          return students.filter(s => isStar(s) && pu.includes(s.id) && isGachaable(s));
        case 'pickup_fallthrough':
          return students.filter(s => isStar(s) && isPermanent(s) && !pu.includes(s.id));
        case 'limited_fallthrough':
          return students.filter(s => isStar(s) && fes.includes(s.id) && !pu.includes(s.id) && isGachaable(s));
        case 'other_three':
          return students.filter(s => isStar(s) && isPermanent(s) && !pu.includes(s.id) && !fes.includes(s.id));
        case 'all':
        default:
          return students.filter(s => isStar(s) && isPermanent(s));
      }
    },

    pull1() {
      if (this.isRolling || this.noPickup) return;
      this.isRolling = true;
      this.latestPulls = [this.rollOne()];
      this.$nextTick(() => { this.isRolling = false; });
    },

    pull10() {
      if (this.isRolling || this.noPickup) return;
      this.isRolling = true;
      const results = [];
      const guaranteeOnLast = !!this.currentMode.tenthGuarantee;
      for (let i = 0; i < 10; i++) {
        // 10連目は常に ★2+ 保障 (前9連の結果に関係なく ★1 を排除)
        results.push(this.rollOne(guaranteeOnLast && i === 9));
      }
      this.latestPulls = results;
      this.$nextTick(() => { this.isRolling = false; });
    },

    // アーカイブ募集: 200pt で PU 生徒と交換
    exchange() {
      if (this.isCharge || this.counter < CHARGE_MAX) return;
      const cands = this.pickupCandidates();
      if (cands.length === 0) return;
      const picked = cands[Math.floor(Math.random() * cands.length)];
      this.setCounter(this.counter - CHARGE_MAX);
      this.stats.pickups++;
      const item = { rarity: 3, name: picked.name, school: picked.school, frame: '呼び出し', isPickup: true, trigger: 'EXCHANGE' };
      this.latestPulls = [item];
      this.threeStarLog.unshift({ pullNo: this.stats.total, ...item });
      this.store.showToast(`${picked.name} を呼び出しました (−200pt)`, 'success');
    },

    reset() {
      if (this.stats.total > 0 && !confirm('セッション統計をリセットしますか？\n(呼び出しチャージ / ポイントは保持されます)')) return;
      this.stats = { total: 0, pickups: 0, threeStars: 0, twoStars: 0, oneStars: 0, pity: 0 };
      this.latestPulls = [];
      this.threeStarLog = [];
      this.store.showToast('リセットしました', 'info');
    },
  },
};
