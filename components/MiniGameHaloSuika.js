// ============================================================
//  components/MiniGameHaloSuika.js  —  ヘイローゲーム本体
//  スイカゲーム風: 同Lv同士のヘイローを合体させて進化させる
//  物理: Matter.js (CDN) / 描画: Canvas 2D
// ============================================================

const HALO_CANVAS_W = 360;
const HALO_CANVAS_H = 520;
const HALO_DANGER_Y = 70;          // この線より上に居続けるとアウト
const HALO_DROP_Y   = 36;          // ガイドの高さ
const HALO_DROP_COOLDOWN_MS = 700; // 連投防止
const HALO_DANGER_TIME_MS   = 1500;// 静止判定時間
const HALO_HIGHSCORE_KEY    = 'BlueArchive.minigame.halo.highScore';
const HALO_WALL_THICKNESS   = 30;

// Lv 1..11 (index 0 はダミー)
// slug を持つレベルは assets/halos/<slug>.webp → .png の順で画像を試行する
// (両方とも無ければ color のリング描画にフォールバック)。
// 画像を追加するだけで自動的に差し替わるので、メタデータは触らなくて良い。
const HALO_LEVELS = [
  null,
  { r: 16, color: '#e8d49a', label: 'I',    slug: 'abydos'        }, // アビドス
  { r: 22, color: '#f0a8c8', label: 'II',   slug: 'trinity'       }, // トリニティ
  { r: 28, color: '#e8624a', label: 'III',  slug: 'gehenna'       }, // ゲヘナ
  { r: 35, color: '#6ea4e6', label: 'IV',   slug: 'millennium'    }, // ミレニアム
  { r: 42, color: '#9070c0', label: 'V',    slug: 'arius'         }, // アリウス
  { r: 50, color: '#c84050', label: 'VI',   slug: 'red-winter'    }, // レッドウィンター
  { r: 58, color: '#6e50a0', label: 'VII',  slug: 'hyakkiyako'    }, // 百鬼夜行
  { r: 68, color: '#5868a8', label: 'VIII', slug: 'valkyrie'      }, // ヴァルキューレ
  { r: 78, color: '#5a7a98', label: 'IX',   slug: 'srt'           }, // SRT
  { r: 88, color: '#3ea8ff', label: 'X',    slug: 'schale'        }, // シャーレ
  { r: 98, color: '#ff4f8b', label: 'XI',   slug: 'final'         }, // 最終進化
];
const HALO_IMAGE_DIR = 'assets/halos/';
const HALO_IMAGE_EXTS = ['webp', 'png']; // 優先順
const HALO_SCORE_TABLE = [0, 1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66];
const HALO_MAX_LV = HALO_LEVELS.length - 1;

// 次に落とせる Lv は 1..4 をランダム
function pickNextLv() {
  const pool = [1, 1, 1, 2, 2, 3, 4];
  return pool[Math.floor(Math.random() * pool.length)];
}

const MiniGameHaloSuikaComponent = {
  inject: ['store'],
  data() {
    let hi = 0;
    try {
      const raw = localStorage.getItem(HALO_HIGHSCORE_KEY);
      hi = raw ? (parseInt(raw, 10) || 0) : 0;
    } catch (_) {}
    return {
      score: 0,
      highScore: hi,
      state: 'running', // running | gameover
      nextLv: pickNextLv(),
      cursorX: HALO_CANVAS_W / 2,
      lastDropAt: 0,
      showTable: false,
    };
  },
  computed: {
    nextHalo() { return HALO_LEVELS[this.nextLv]; },
    chartCells() {
      // index 0 (ダミー) を除外して { lv, meta } で返す
      return HALO_LEVELS.slice(1).map((meta, i) => ({ lv: i + 1, meta }));
    },
  },
  mounted() {
    if (typeof Matter === 'undefined') {
      console.error('[MiniGameHaloSuika] Matter.js が読み込まれていません');
      this.state = 'gameover';
      return;
    }
    // コールバック用に this を確実に固定したラッパーを別名で保持
    // (Matter.Events.off に同じ参照を渡せるよう保存)
    this._tickFn = () => this._tick();
    this._collisionFn = (ev) => this._onCollision(ev);
    this._haloImages = {};   // { [lv]: HTMLImageElement }  (ロード完了分のみ)
    this._setupCanvas();
    this._setupPhysics();
    this._preloadHaloImages();
    this._loopId = requestAnimationFrame(this._tickFn);
    this._bindInput();
  },
  beforeUnmount() {
    this._teardown();
  },
  methods: {
    // ── 初期化 ────────────────────────────────────────────
    _setupCanvas() {
      const cvs = this.$refs.canvas;
      const dpr = window.devicePixelRatio || 1;
      cvs.width = HALO_CANVAS_W * dpr;
      cvs.height = HALO_CANVAS_H * dpr;
      cvs.style.width = HALO_CANVAS_W + 'px';
      cvs.style.height = HALO_CANVAS_H + 'px';
      this._ctx = cvs.getContext('2d');
      this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    },
    _setupPhysics() {
      const { Engine, Runner, World, Bodies, Events } = Matter;
      this._engine = Engine.create({ gravity: { x: 0, y: 1 } });
      this._engine.world.gravity.scale = 0.0018;

      const t = HALO_WALL_THICKNESS;
      const W = HALO_CANVAS_W, H = HALO_CANVAS_H;
      const walls = [
        Bodies.rectangle(W / 2, H + t / 2, W, t, { isStatic: true, label: 'floor' }),
        Bodies.rectangle(-t / 2, H / 2, t, H * 2, { isStatic: true, label: 'wall-l' }),
        Bodies.rectangle(W + t / 2, H / 2, t, H * 2, { isStatic: true, label: 'wall-r' }),
      ];
      World.add(this._engine.world, walls);

      this._runner = Runner.create();
      Runner.run(this._runner, this._engine);
      Events.on(this._engine, 'collisionStart', this._collisionFn);

      this._bodies = new Set(); // ヘイロー body 管理
    },
    _bindInput() {
      const cvs = this.$refs.canvas;
      this._onMove = (ev) => {
        const rect = cvs.getBoundingClientRect();
        const x = ('touches' in ev ? ev.touches[0].clientX : ev.clientX) - rect.left;
        this.cursorX = Math.max(0, Math.min(HALO_CANVAS_W, x));
      };
      this._onDrop = (ev) => {
        ev.preventDefault();
        this.drop();
      };
      cvs.addEventListener('mousemove', this._onMove);
      cvs.addEventListener('touchmove', this._onMove, { passive: true });
      cvs.addEventListener('click', this._onDrop);
      cvs.addEventListener('touchstart', (ev) => { this._onMove(ev); }, { passive: true });
      cvs.addEventListener('touchend', this._onDrop);
    },
    _teardown() {
      if (this._loopId) cancelAnimationFrame(this._loopId);
      if (this._runner) Matter.Runner.stop(this._runner);
      if (this._engine) {
        Matter.Events.off(this._engine, 'collisionStart', this._collisionFn);
        Matter.World.clear(this._engine.world, false);
        Matter.Engine.clear(this._engine);
      }
      this._haloImages = null; // 遅延ロード中の onload を弾く目印
      const cvs = this.$refs.canvas;
      if (cvs && this._onMove) {
        cvs.removeEventListener('mousemove', this._onMove);
        cvs.removeEventListener('touchmove', this._onMove);
        cvs.removeEventListener('click', this._onDrop);
        cvs.removeEventListener('touchend', this._onDrop);
      }
    },

    // ── 画像の遅延ロード ──────────────────────────────────
    // 各 Lv について webp → png の順で 1 枚だけロードを試みる。
    // 存在しなければ静かに諦め、リング描画にフォールバック。
    _preloadHaloImages() {
      for (let lv = 1; lv < HALO_LEVELS.length; lv++) {
        const meta = HALO_LEVELS[lv];
        if (!meta || !meta.slug) continue;
        this._tryLoadImage(lv, meta.slug, 0);
      }
    },
    _tryLoadImage(lv, slug, extIdx) {
      if (extIdx >= HALO_IMAGE_EXTS.length) return; // 全拡張子ダメ→諦め
      const ext = HALO_IMAGE_EXTS[extIdx];
      const img = new Image();
      img.onload = () => {
        // unmount 後に解決された場合は破棄
        if (!this._haloImages) return;
        this._haloImages[lv] = img;
      };
      img.onerror = () => {
        this._tryLoadImage(lv, slug, extIdx + 1);
      };
      img.src = HALO_IMAGE_DIR + slug + '.' + ext;
    },

    // ── ヘイロー生成 ──────────────────────────────────────
    _makeHalo(x, y, lv) {
      const meta = HALO_LEVELS[lv];
      const body = Matter.Bodies.circle(x, y, meta.r, {
        restitution: 0.18,
        friction: 0.08,
        frictionAir: 0.005,
        density: 0.0012,
        label: 'halo',
        plugin: { haloLv: lv, spawnAt: performance.now(), dangerSince: null },
      });
      this._bodies.add(body);
      Matter.World.add(this._engine.world, body);
      return body;
    },

    // ── 操作 ───────────────────────────────────────────────
    drop() {
      if (this.state !== 'running') return;
      const now = performance.now();
      if (now - this.lastDropAt < HALO_DROP_COOLDOWN_MS) return;
      this.lastDropAt = now;
      const lv = this.nextLv;
      const r = HALO_LEVELS[lv].r;
      const x = Math.max(r + 2, Math.min(HALO_CANVAS_W - r - 2, this.cursorX));
      this._makeHalo(x, HALO_DROP_Y + r, lv);
      this.nextLv = pickNextLv();
    },
    reset() {
      // 全 halo 削除して状態リセット
      for (const b of this._bodies) {
        Matter.World.remove(this._engine.world, b);
      }
      this._bodies.clear();
      this.score = 0;
      this.state = 'running';
      this.nextLv = pickNextLv();
      this.lastDropAt = 0;
    },
    goHome() {
      this.store.minigameSelected = null;
    },

    // ── 合体判定 ──────────────────────────────────────────
    _onCollision(ev) {
      if (this.state !== 'running') return;
      const merged = new Set();
      const { World } = Matter;
      for (const pair of ev.pairs) {
        const a = pair.bodyA, b = pair.bodyB;
        if (merged.has(a.id) || merged.has(b.id)) continue;
        const la = a.plugin && a.plugin.haloLv;
        const lb = b.plugin && b.plugin.haloLv;
        if (!la || !lb || la !== lb) continue;

        if (la >= HALO_MAX_LV) {
          // Lv最大同士: 消滅 + 高得点
          World.remove(this._engine.world, [a, b]);
          this._bodies.delete(a); this._bodies.delete(b);
          this.score += HALO_SCORE_TABLE[HALO_MAX_LV] * 2;
        } else {
          const nextLv = la + 1;
          const mid = {
            x: (a.position.x + b.position.x) / 2,
            y: (a.position.y + b.position.y) / 2,
          };
          World.remove(this._engine.world, [a, b]);
          this._bodies.delete(a); this._bodies.delete(b);
          this._makeHalo(mid.x, mid.y, nextLv);
          this.score += HALO_SCORE_TABLE[nextLv];
        }
        merged.add(a.id); merged.add(b.id);
      }
    },

    // ── 毎フレーム描画 + ゲームオーバー検査 ──────────────
    _tick() {
      this._loopId = requestAnimationFrame(this._tickFn);
      this._draw();
      this._checkGameOver();
    },
    _checkGameOver() {
      if (this.state !== 'running') return;
      const now = performance.now();
      for (const body of this._bodies) {
        const top = body.position.y - body.circleRadius;
        const stable = body.speed < 0.6;
        const aboveDanger = top < HALO_DANGER_Y;
        // 落下直後の猶予 (1.2 秒) を設けて誤判定を防ぐ
        const settled = now - body.plugin.spawnAt > 1200;
        if (aboveDanger && stable && settled) {
          if (!body.plugin.dangerSince) body.plugin.dangerSince = now;
          if (now - body.plugin.dangerSince > HALO_DANGER_TIME_MS) {
            this._onGameOver();
            return;
          }
        } else {
          body.plugin.dangerSince = null;
        }
      }
    },
    _onGameOver() {
      this.state = 'gameover';
      if (this.score > this.highScore) {
        this.highScore = this.score;
        try { localStorage.setItem(HALO_HIGHSCORE_KEY, String(this.score)); } catch (_) {}
      }
    },
    // ── 描画 ──────────────────────────────────────────────
    _draw() {
      const ctx = this._ctx;
      ctx.clearRect(0, 0, HALO_CANVAS_W, HALO_CANVAS_H);

      // 背景 (薄いブループリント)
      ctx.fillStyle = '#f6faff';
      ctx.fillRect(0, 0, HALO_CANVAS_W, HALO_CANVAS_H);
      ctx.strokeStyle = 'rgba(62,168,255,0.10)';
      ctx.lineWidth = 1;
      for (let x = 0; x < HALO_CANVAS_W; x += 30) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HALO_CANVAS_H); ctx.stroke();
      }
      for (let y = 0; y < HALO_CANVAS_H; y += 30) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(HALO_CANVAS_W, y); ctx.stroke();
      }

      // ダンジャーライン
      ctx.strokeStyle = 'rgba(255,79,139,0.55)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(0, HALO_DANGER_Y);
      ctx.lineTo(HALO_CANVAS_W, HALO_DANGER_Y);
      ctx.stroke();
      ctx.setLineDash([]);

      // ガイドカーソル (落下予想線)
      if (this.state === 'running') {
        const nx = this.cursorX;
        const r = this.nextHalo.r;
        const cx = Math.max(r + 2, Math.min(HALO_CANVAS_W - r - 2, nx));
        ctx.strokeStyle = 'rgba(18,138,250,0.40)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cx, HALO_DROP_Y);
        ctx.lineTo(cx, HALO_CANVAS_H);
        ctx.stroke();
        ctx.setLineDash([]);
        this._drawHalo(ctx, cx, HALO_DROP_Y + r, this.nextLv, 0.6);
      }

      // ヘイロー本体
      for (const body of this._bodies) {
        this._drawHalo(ctx, body.position.x, body.position.y, body.plugin.haloLv, 1, body.angle);
      }

      // ゲームオーバーオーバーレイ
      if (this.state === 'gameover') {
        ctx.fillStyle = 'rgba(13,27,42,0.55)';
        ctx.fillRect(0, 0, HALO_CANVAS_W, HALO_CANVAS_H);
        ctx.fillStyle = '#ff4f8b';
        ctx.font = 'bold 28px "SFMono-Regular", Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', HALO_CANVAS_W / 2, HALO_CANVAS_H / 2 - 12);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px "SFMono-Regular", Consolas, monospace';
        ctx.fillText('SCORE  ' + this.score, HALO_CANVAS_W / 2, HALO_CANVAS_H / 2 + 16);
        ctx.fillText('HI     ' + this.highScore, HALO_CANVAS_W / 2, HALO_CANVAS_H / 2 + 36);
      }
    },
    _drawHalo(ctx, x, y, lv, alpha, angle) {
      const meta = HALO_LEVELS[lv];
      const r = meta.r;
      ctx.save();
      ctx.translate(x, y);
      if (angle) ctx.rotate(angle);
      ctx.globalAlpha = alpha;

      const img = this._haloImages && this._haloImages[lv];
      if (img && img.complete && img.naturalWidth > 0) {
        // 画像があれば 2r 四方に中央合わせで描画 (透過 PNG/WebP 前提)
        const d = r * 2;
        ctx.drawImage(img, -r, -r, d, d);
      } else {
        // フォールバック: 学校カラーのリング + Lv ラベル
        const ringW = Math.max(4, r * 0.28);
        ctx.lineWidth = ringW;
        ctx.strokeStyle = meta.color;
        ctx.beginPath();
        ctx.arc(0, 0, r - ringW / 2, 0, Math.PI * 2);
        ctx.stroke();

        ctx.lineWidth = Math.max(1, ringW * 0.18);
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.beginPath();
        ctx.arc(0, 0, r - ringW * 0.85, Math.PI * 1.1, Math.PI * 1.5);
        ctx.stroke();

        ctx.fillStyle = meta.color;
        ctx.font = 'bold ' + Math.max(9, Math.round(r * 0.32)) + 'px "SFMono-Regular", Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(meta.label, 0, 1);
      }

      ctx.restore();
    },
  },
  template: `
    <div class="minigame-halo os-panel">
      <div class="os-section-id">// MINIGAME / HALO</div>

      <div class="minigame-hud">
        <div class="minigame-hud-block">
          <div class="minigame-hud-label">SCORE</div>
          <div class="minigame-hud-value">{{ score }}</div>
        </div>
        <div class="minigame-hud-block">
          <div class="minigame-hud-label">HI</div>
          <div class="minigame-hud-value">{{ highScore }}</div>
        </div>
        <div class="minigame-hud-block">
          <div class="minigame-hud-label">NEXT</div>
          <div class="minigame-hud-next"
               :style="{ background: nextHalo.color }">{{ nextHalo.label }}</div>
        </div>
        <div style="flex:1"></div>
        <button class="minigame-btn" @click="reset" title="リセット">RESET</button>
        <button class="minigame-btn minigame-btn-ghost" @click="goHome" title="ハブに戻る">← HUB</button>
      </div>

      <div class="minigame-canvas-wrap">
        <canvas ref="canvas"></canvas>
      </div>

      <div class="minigame-foot">
        <button class="minigame-foot-toggle" @click="showTable = !showTable">
          {{ showTable ? '▼' : '▶' }} 進化チャート / 操作
        </button>
        <div v-if="showTable" class="minigame-table">
          <div class="minigame-table-row">
            <div v-for="c in chartCells" :key="c.lv" class="minigame-table-cell">
              <div class="minigame-table-circle"
                   :style="{ background: c.meta.color, width: (12 + c.lv * 2) + 'px', height: (12 + c.lv * 2) + 'px' }"></div>
              <div class="minigame-table-label">{{ c.meta.label }}</div>
            </div>
          </div>
          <div class="minigame-help">
            マウス左右 (またはタップ移動) で位置を合わせ、クリック/タップで落下。同じレベルのヘイローが触れると次のレベルへ進化します。
            上のピンク点線より上で 1.5 秒以上滞留するとゲームオーバー。
          </div>
        </div>
      </div>
    </div>
  `,
};

