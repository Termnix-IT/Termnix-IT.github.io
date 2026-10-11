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
//
//  画面: 上部の募集バナー (モード名・PU 生徒・チャージのゲージ) → 募集ボタンと統計 → 結果カード → ★3 履歴
//  結果カードは裏向きで並べて順にめくる演出をする (スキップ可・prefers-reduced-motion では省略)
// ============================================================

const PULL_COST = 120;          // 1連あたりの青輝石
const CHARGE_MID = 100;         // ★3 確定 + PU 50% ライン
const CHARGE_MAX = 200;         // PU 確定ライン / アーカイブ交換ライン
const REVEAL_STEP_MS = 100;     // 結果カードを 1 枚めくる間隔
const REVEAL_THREE_STAR_PAUSE_MS = 300;  // ★3 をめくる前の溜め

// 入手区分による排出可否 (obtainability 未設定は恒常扱い)
const isPermanent = (s) => (s.obtainability || 'permanent') === 'permanent';
const isGachaable = (s) => s.obtainability !== 'event';

const GACHA_BANNER_KIND = {
  pickup:      'PICK UP',
  limited:     'LIMITED',
  anniversary: 'FES',
  archive:     'ARCHIVE',
};

const GachaSimulatorComponent = {
  inject: ['store'],

  template: `
    <div class="sim-container">

      <!-- ── 募集バナー ── -->
      <div class="gacha-banner">
        <div class="gacha-banner-info">
          <span class="gacha-banner-kind">{{ bannerKind }}</span>
          <div class="gacha-banner-title">{{ currentMode.label }}</div>
          <div class="gacha-banner-en">RECRUITMENT</div>
          <div class="gacha-banner-desc">
            PU ★3 {{ puPct }}% / ★3 合計 {{ ratePct.three }}%<br>
            <template v-if="isCharge">チャージ 100 で ★3 確定・PU 50%<br>200 で PU 確定</template>
            <template v-else>アーカイブポイント 200pt で PU と交換</template>
          </div>
          <div class="gacha-banner-rates">
            <div class="gacha-stack">
              <div v-for="(seg, i) in rateSegments" :key="i" :style="{ width: seg.width + '%', background: seg.color }"></div>
            </div>
            <div class="gacha-stack-legend">
              <span><i style="background:#ff4f8b"></i>★3 {{ ratePct.three }}%</span>
              <span><i style="background:#fbbf24"></i>★2 {{ ratePct.two }}%</span>
              <span><i style="background:#a9cdf0"></i>★1 {{ ratePct.one }}%</span>
            </div>
            <div class="gacha-stack-note">※帯の幅は見やすさのため実際の比率と変えています</div>
          </div>
        </div>

        <div class="gacha-banner-pu">
          <button class="gacha-pu-edit" :class="{ 'gacha-pu-edit--alert': puAlert }"
            @click="openModal('gachaPickupIds', 'PU 生徒を選択')">✎ PU生徒を変更</button>
          <div class="gacha-pu-panels">
            <div v-if="pickupStudents.length === 0" class="gacha-pu-panel gacha-pu-panel--empty"
              @click="openModal('gachaPickupIds', 'PU 生徒を選択')">
              <b>＋</b><span>PU 生徒を選択</span>
            </div>
            <div v-for="s in pickupStudents.slice(0, 3)" :key="s.id" class="gacha-pu-panel"
              :style="{ background: schoolGradient(s.school) }">
              <img v-if="s.imageData || s.imageUrl" :src="s.imageData || s.imageUrl" :alt="s.name">
              <template v-else>
                <div class="gacha-pu-halo"></div>
                <div class="gacha-pu-initial">{{ s.name.charAt(0) }}</div>
              </template>
              <span class="gacha-pu-tag">PICK UP</span>
              <div class="gacha-pu-name">{{ s.name }}<small>{{ schoolEn(s.school) }}</small></div>
            </div>
            <div v-if="pickupStudents.length > 3" class="gacha-pu-more">＋{{ pickupStudents.length - 3 }}</div>
          </div>
          <!-- 周年限定: PU 以外の周年限定生徒 (0.9% 枠) -->
          <div v-if="store.gachaMode === 'anniversary'" class="gacha-fes-row">
            <span class="gacha-fes-label">周年限定（非PU）</span>
            <span v-if="fesStudents.length === 0" class="gacha-fes-empty">未指定（枠は恒常 ★3 で埋まります）</span>
            <span v-for="s in fesStudents" :key="s.id" class="gacha-fes-chip">{{ s.name }}</span>
            <button class="gacha-fes-edit" @click="openModal('gachaLimitedFallthroughIds', '周年限定生徒 (非PU) を選択')">変更</button>
          </div>
        </div>

        <div class="gacha-banner-gauge">
          <div class="gacha-gauge-title">{{ isCharge ? 'CALL CHARGE' : 'ARCHIVE POINT' }}</div>
          <svg class="gacha-gauge" viewBox="0 0 200 178" width="190" height="168" aria-hidden="true">
            <path d="M 43.4 156.6 A 80 80 0 1 1 156.6 156.6" fill="none" stroke="#dbe8f5" stroke-width="14"/>
            <path v-if="resetGhost" d="M 43.4 156.6 A 80 80 0 1 1 156.6 156.6" fill="none" stroke="#ffc2d8" stroke-width="14"
              pathLength="200" :stroke-dasharray="resetGhost + ' 200'" class="gacha-gauge-ghost"/>
            <path d="M 43.4 156.6 A 80 80 0 1 1 156.6 156.6" fill="none" :stroke="gaugeColor" stroke-width="14"
              pathLength="200" :stroke-dasharray="Math.min(gaugeValue, 200) + ' 200'" class="gacha-gauge-fill"/>
            <template v-if="isCharge">
              <line x1="100" y1="12" x2="100" y2="34" stroke="#ff4f8b" stroke-width="3"/>
              <text x="100" y="9" text-anchor="middle" class="gacha-gauge-mark">100 ★3確定</text>
            </template>
            <line x1="150" y1="162" x2="166" y2="172" stroke="#ff4f8b" stroke-width="3"/>
            <text x="146" y="177" text-anchor="end" class="gacha-gauge-mark">{{ isCharge ? '200 PU確定' : '200 交換' }}</text>
          </svg>
          <div class="gacha-gauge-num">
            <b>{{ gaugeValue }}</b><span>/ {{ chargeMax }}</span>
            <div v-if="resetGhost"><span class="gacha-gauge-reset">RESET {{ resetGhost }} → 0</span></div>
          </div>
          <div class="gacha-gauge-left">
            <template v-if="isCharge">
              <template v-if="resetGhost">PU を引いたのでチャージが 0 に戻りました<br></template>
              <template v-if="gaugeValue < chargeMid">★3 確定まで あと <b>{{ chargeMid - gaugeValue }}</b> 回<br></template>
              PU 確定まで あと <b>{{ chargeMax - gaugeValue }}</b> 回
            </template>
            <template v-else>
              <template v-if="gaugeValue >= chargeMax">PU と交換できます</template>
              <template v-else>交換まで あと <b>{{ chargeMax - gaugeValue }}</b> pt</template>
            </template>
          </div>
          <button v-if="!isCharge" class="skew-btn skew-btn--primary gacha-exchange-btn"
            :disabled="counter < chargeMax" @click="exchange">呼び出し</button>
        </div>
      </div>

      <!-- ── 募集ボタン + 統計 ── -->
      <div class="gacha-pullrow">
        <button class="gacha-pull gacha-pull--one" @click="pull1">
          <b>1回募集</b>
          <small><span class="gacha-gem"></span>{{ PULL_COST }}</small>
        </button>
        <button class="gacha-pull gacha-pull--ten" @click="pull10">
          <b>10回募集</b>
          <small><span class="gacha-gem"></span>{{ (PULL_COST * 10).toLocaleString() }}<template v-if="currentMode.tenthGuarantee"> · 10回目は ★2 以上確定</template></small>
        </button>
        <div class="gacha-stats">
          <div class="gacha-stat"><small>TOTAL</small><b>{{ stats.total.toLocaleString() }} 回</b></div>
          <div class="gacha-stat"><small>PICK UP</small><b>{{ stats.pickups }} 体</b></div>
          <div class="gacha-stat"><small>★3</small><b>{{ stats.threeStars }} 体 · {{ threeStarRate }}%</b></div>
          <div class="gacha-stat"><small>LAST ★3</small><b>{{ lastThreeStarText }}</b></div>
          <div class="gacha-stat"><small>PYROXENE</small><b>{{ pyroxeneUsed.toLocaleString() }}</b></div>
          <button class="gacha-stat gacha-stat-reset" @click="reset">↺ 統計リセット</button>
        </div>
      </div>

      <!-- ── 結果 ── -->
      <div v-if="latestPulls.length > 0" class="gacha-result">
        <div class="gacha-result-head">
          <span class="gacha-result-title">募集結果</span>
          <template v-if="revealDone">
            <span v-if="latestPickupCount > 0" class="gacha-pop gacha-pop--pu">PU × {{ latestPickupCount }}</span>
            <span v-if="latestThreeStarCount > 0" class="gacha-pop gacha-pop--3">★3 × {{ latestThreeStarCount }}</span>
            <span v-if="latestTwoStarCount > 0" class="gacha-pop gacha-pop--2">★2 × {{ latestTwoStarCount }}</span>
          </template>
          <button v-if="!revealDone" class="gacha-skip" @click="skipReveal">▶▶ 演出をスキップ</button>
        </div>
        <div class="gacha-result-grid">
          <div v-for="(p, i) in latestPulls" :key="pullBatch + '-' + i" class="gacha-card-wrap">
            <div v-if="i >= revealed" class="gacha-card gacha-card--back" :class="'gacha-card--back-' + backTone">
              <span>S</span>
            </div>
            <div v-else class="gacha-card gacha-card--front"
              :class="['gacha-card--r' + p.rarity, { 'gacha-card--pu': p.isPickup }]">
              <div class="gacha-card-img" :style="{ background: schoolGradient(p.school) }">
                <img v-if="p.image" :src="p.image" :alt="p.name">
                <div v-else class="gacha-card-initial">{{ p.name.charAt(0) }}</div>
                <div class="gacha-card-stars">{{ '★'.repeat(p.rarity) }}</div>
              </div>
              <div class="gacha-card-name">{{ p.name }}</div>
              <div class="gacha-card-school">{{ p.school }}</div>
              <div v-if="p.isPickup" class="gacha-card-ribbon">PICK UP</div>
              <div v-if="isNew(p)" class="gacha-card-new">NEW</div>
              <div v-if="p.trigger" class="gacha-card-trigger">{{ p.trigger }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── ★3 排出履歴 (セッション内ログ) ── -->
      <template v-if="threeStarLog.length > 0">
        <div class="sidebar-section-id gacha-log-id">LOG</div>
        <div class="gacha-log">
          <div v-for="(item, i) in threeStarLog" :key="i" class="gacha-log-row">
            <span class="gacha-log-no">#{{ item.pullNo }}</span>
            <span class="gacha-log-dot" :class="{ 'gacha-log-dot--pu': item.isPickup }"></span>
            <b>{{ item.name }}</b>
            <span v-if="item.school" class="gacha-log-school">{{ item.school }}</span>
            <span class="gacha-log-frame" :class="{ 'gacha-log-frame--pu': item.isPickup }">{{ item.isPickup ? 'PU' : item.frame }}</span>
            <span v-if="item.trigger" class="gacha-log-trigger">{{ item.trigger }}</span>
            <span v-if="item.resetFrom" class="gacha-log-reset">チャージ {{ item.resetFrom }} → 0</span>
          </div>
        </div>
      </template>

      <!-- ── PU / 周年限定の生徒選択モーダル (body直下にテレポート) ── -->
      <teleport to="body">
        <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
          <div class="modal-box pick-modal">
            <div class="modal-band">
              <span class="modal-band-title">{{ modalTitle }}</span>
              <button class="modal-band-close" @click="showModal = false" title="閉じる">✕</button>
            </div>
            <div class="pick-modal-body">
              <input type="text" v-model="modalSearch" placeholder="名前で検索" class="pick-search">
              <div class="pick-grid">
                <button v-for="s in filteredModalStudents" :key="s.id" class="pick-tile"
                  :class="{ 'pick-tile--on': targetIds.includes(s.id) }" @click="toggleIn(modalTarget, s.id)">
                  <span class="pick-face" :style="{ background: schoolGradient(s.school) }">
                    <img v-if="s.imageData || s.imageUrl" :src="s.imageData || s.imageUrl" loading="lazy" :alt="s.name">
                    <template v-else>{{ s.name.charAt(0) }}</template>
                    <span v-if="s.obtainability === 'limited'" class="pick-limited">限定</span>
                  </span>
                  <span class="pick-name">{{ s.name }}</span>
                </button>
                <div v-if="filteredModalStudents.length === 0" class="empty-state" style="grid-column:1/-1;padding:30px 20px">
                  <div class="empty-state-mark">該当なし</div>
                </div>
              </div>
            </div>
            <div class="pick-modal-foot">
              <span class="sd-hint">{{ targetIds.length }} 名選択中</span>
              <span style="flex:1"></span>
              <button class="skew-btn skew-btn--ghost" @click="store[modalTarget].splice(0)">クリア</button>
              <button class="skew-btn skew-btn--primary" @click="showModal = false">完了</button>
            </div>
          </div>
        </div>
      </teleport>
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
      // めくり演出
      pullBatch: 0,       // 引くたびに増やして結果カードを作り直す
      revealed: 0,        // めくり終えた枚数
      frozenCounter: null,  // 演出中はゲージを引く前の値で止めておく
      lastResetFrom: 0,   // 直近の募集で PU を引いてチャージが戻ったときの、戻る前の値
      puAlert: false,     // PU 未指定で引こうとしたときに「PU生徒を変更」を光らせる
      // 生徒選択モーダル
      showModal: false,
      modalTarget: 'gachaPickupIds',   // 編集対象の store キー
      modalTitle: '',
      modalSearch: '',
    };
  },

  computed: {
    currentMode() {
      return GACHA_MODES.find(m => m.value === this.store.gachaMode) || GACHA_MODES[0];
    },
    bannerKind() {
      return GACHA_BANNER_KIND[this.currentMode.value] || 'PICK UP';
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
    gaugeValue() {
      return this.frozenCounter != null ? this.frozenCounter : this.counter;
    },
    gaugeColor() {
      if (this.gaugeValue >= 170) return '#ff4f8b';
      if (this.gaugeValue >= CHARGE_MID) return '#fbbf24';
      return '#3ea8ff';
    },
    // PU で 0 に戻った直後だけ、戻る前の値を点線の残像として出す
    resetGhost() {
      return this.revealDone && this.isCharge && this.counter === 0 ? this.lastResetFrom : 0;
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
    puPct() {
      const pu = this.currentMode.rates.find(r => r.pool === 'pickup');
      return pu ? (pu.pct * 100).toFixed(1) : '0.0';
    },
    // 排出率の帯: ★3 は実際には細すぎるので、各枠に最低 6% の幅を確保してから正規化する
    rateSegments() {
      const segs = this.currentMode.rates.map(r => ({
        w: Math.max(r.pct, 0.06),
        color: r.stars === 3 ? (r.pool === 'pickup' ? '#ff4f8b' : '#ff9cc0') : r.stars === 2 ? '#fbbf24' : '#a9cdf0',
      }));
      const total = segs.reduce((a, s) => a + s.w, 0);
      return segs.map(s => ({ width: s.w / total * 100, color: s.color }));
    },
    threeStarRate() {
      if (this.stats.total === 0) return '0.00';
      return (this.stats.threeStars / this.stats.total * 100).toFixed(2);
    },
    lastThreeStarText() {
      if (this.stats.threeStars === 0) return '—';
      return this.stats.pity === 0 ? '今回' : `${this.stats.pity} 回前`;
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
    revealDone() {
      return this.revealed >= this.latestPulls.length;
    },
    // 裏面の色で最高レアリティを予告する (★3 = ピンク / ★2 = 黄 / ★1 のみ = 青)
    backTone() {
      const max = Math.max(1, ...this.latestPulls.map(p => p.rarity));
      return max === 3 ? 'pink' : max === 2 ? 'gold' : 'blue';
    },
    pickupStudents() {
      return this.idsToStudents(this.store.gachaPickupIds);
    },
    fesStudents() {
      return this.idsToStudents(this.store.gachaLimitedFallthroughIds);
    },
    targetIds() {
      return this.store[this.modalTarget] || [];
    },
    // 選択モーダルは ★3 のみ (PU / 周年限定はいずれも ★3)
    //   PU:      恒常 + 限定 (配布はガチャから出ないので除外)
    //   周年枠:  限定のみ (恒常は「その他★3」枠で自動的に排出される)
    filteredModalStudents() {
      const q = this.modalSearch.toLowerCase();
      const allow = this.modalTarget === 'gachaLimitedFallthroughIds'
        ? (s) => s.obtainability === 'limited'
        : (s) => s.obtainability !== 'event';
      const all = this.store.students
        .filter(s => s.rarity === 3 && allow(s))
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      return q ? all.filter(s => (s.name || '').toLowerCase().includes(q)) : all;
    },
  },

  beforeUnmount() {
    this.stopReveal();
  },

  methods: {
    // ── 表示の補助 ─────────────────────────────────────────
    schoolGradient(school) {
      return SCHOOL_COLORS[school] || SCHOOL_COLOR_FALLBACK;
    },
    schoolEn(school) {
      return SCHOOL_EN[school] || '';
    },
    // 未所持の生徒が出たら NEW を付ける (所持データは書き換えない)
    isNew(p) {
      if (!p.id) return false;
      const s = this.store.students.find(x => x.id === p.id);
      return !!s && !s.owned;
    },
    idsToStudents(ids) {
      return (ids || []).map(id => this.store.students.find(s => s.id === id)).filter(Boolean);
    },

    // ── 生徒選択モーダル ───────────────────────────────────
    openModal(target, title) {
      this.modalTarget = target;
      this.modalTitle = title;
      this.modalSearch = '';
      this.showModal = true;
    },
    toggleIn(key, id) {
      const arr = this.store[key];
      const idx = arr.indexOf(id);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(id);
    },

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
      let picked = null;
      if (candidates.length > 0) {
        picked = candidates[Math.floor(Math.random() * candidates.length)];
      }
      const name = picked ? picked.name : (rarity === 1 ? '★1 生徒' : '???');
      const school = picked ? picked.school : '';

      // カウンタ更新: チャージ制は PU 入手でリセット、それ以外は +1。ポイント制は常に +1
      let resetFrom = 0;
      if (this.isCharge && isPickup) {
        resetFrom = count;
        this.lastResetFrom = count;
        this.setCounter(0);
      } else {
        this.setCounter(count);
      }

      // 統計
      this.stats.total++;
      if (rarity === 3) {
        this.stats.pity = 0;
        this.stats.threeStars++;
        if (isPickup) this.stats.pickups++;
        this.threeStarLog.unshift({ pullNo: this.stats.total, name, school, frame: entry.label, isPickup, trigger, resetFrom });
      } else {
        this.stats.pity++;
        if (rarity === 2) this.stats.twoStars++;
        else this.stats.oneStars++;
      }

      return {
        id: picked ? picked.id : '',
        image: picked ? (picked.imageData || picked.imageUrl || '') : '',
        rarity, name, school, frame: entry.label, isPickup, trigger,
      };
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

    // PU が未指定のときは引かずに「PU生徒を変更」を光らせる (PU 判定・チャージリセットが成立しないため)
    guardPickup() {
      if (!this.noPickup) return true;
      this.puAlert = false;
      this.$nextTick(() => { this.puAlert = true; });
      clearTimeout(this._puAlertTimer);
      this._puAlertTimer = setTimeout(() => { this.puAlert = false; }, 1600);
      this.store.showToast('先に PU 生徒を選んでください', 'error');
      return false;
    },

    pull1() {
      if (!this.guardPickup()) return;
      this.startBatch();
      this.latestPulls = [this.rollOne()];
      this.startReveal();
    },

    pull10() {
      if (!this.guardPickup()) return;
      this.startBatch();
      const results = [];
      const guaranteeOnLast = !!this.currentMode.tenthGuarantee;
      for (let i = 0; i < 10; i++) {
        // 10連目は常に ★2+ 保障 (前9連の結果に関係なく ★1 を排除)
        results.push(this.rollOne(guaranteeOnLast && i === 9));
      }
      this.latestPulls = results;
      this.startReveal();
    },

    // ── めくり演出 ─────────────────────────────────────────
    startBatch() {
      this.stopReveal();
      this.frozenCounter = this.counter;
      this.lastResetFrom = 0;
      this.pullBatch++;
      this.revealed = 0;
    },

    startReveal() {
      const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) {
        this.skipReveal();
        return;
      }
      const step = () => {
        if (this.revealed >= this.latestPulls.length) {
          this.finishReveal();
          return;
        }
        const next = this.latestPulls[this.revealed];
        const wait = next && next.rarity === 3 ? REVEAL_STEP_MS + REVEAL_THREE_STAR_PAUSE_MS : REVEAL_STEP_MS;
        this._revealTimer = setTimeout(() => {
          this.revealed++;
          step();
        }, wait);
      };
      step();
    },

    skipReveal() {
      this.stopReveal();
      this.revealed = this.latestPulls.length;
      this.finishReveal();
    },

    finishReveal() {
      this.frozenCounter = null;
    },

    stopReveal() {
      clearTimeout(this._revealTimer);
      this._revealTimer = null;
    },

    // アーカイブ募集: 200pt で PU 生徒と交換
    exchange() {
      if (this.isCharge || this.counter < CHARGE_MAX) return;
      const cands = this.pickupCandidates();
      if (cands.length === 0) {
        this.guardPickup();
        return;
      }
      const picked = cands[Math.floor(Math.random() * cands.length)];
      this.startBatch();
      this.setCounter(this.counter - CHARGE_MAX);
      this.stats.pickups++;
      const item = {
        id: picked.id, image: picked.imageData || picked.imageUrl || '',
        rarity: 3, name: picked.name, school: picked.school, frame: '呼び出し', isPickup: true, trigger: 'EXCHANGE',
      };
      this.latestPulls = [item];
      this.threeStarLog.unshift({ pullNo: this.stats.total, ...item });
      this.skipReveal();
      this.store.showToast(`${picked.name} を呼び出しました (−200pt)`, 'success');
    },

    reset() {
      if (this.stats.total > 0 && !confirm('セッション統計をリセットしますか？\n(呼び出しチャージ / ポイントは保持されます)')) return;
      this.stopReveal();
      this.stats = { total: 0, pickups: 0, threeStars: 0, twoStars: 0, oneStars: 0, pity: 0 };
      this.latestPulls = [];
      this.threeStarLog = [];
      this.revealed = 0;
      this.frozenCounter = null;
      this.lastResetFrom = 0;
      this.store.showToast('リセットしました', 'info');
    },
  },
};
