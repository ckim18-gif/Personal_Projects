// ===================== modes/jungleMode.js =====================
// 정글 모드: 고정된 맵에서 중립 몬스터(정글 캠프)를 사냥하며 성장하여 보스를 처치

const CAMP_DEFS = [
  { key: "wolves", name: "늑대 무리", x: 400, y: 300, hp: 260, ad: 16, xp: 30, gold: 20,
    radius: 16, aggroRange: 140, leashRange: 260, spec: { body: "#6b6b78", accent: "#3a3a44", eye: "#ffe14a" } },
  { key: "raptors", name: "협곡 도마뱀", x: 1100, y: 260, hp: 240, ad: 15, xp: 30, gold: 20,
    radius: 15, aggroRange: 140, leashRange: 260, spec: { body: "#4a8f5a", accent: "#245030", eye: "#ff5a3b" } },
  { key: "krugs", name: "바위 골렘 무리", x: 300, y: 780, hp: 420, ad: 20, xp: 38, gold: 26,
    radius: 19, aggroRange: 130, leashRange: 240, spec: { body: "#8a7a63", accent: "#4a3f30", eye: "#8fd6ff" } },
  { key: "gromp", name: "늪지 두꺼비", x: 1250, y: 820, hp: 380, ad: 22, xp: 34, gold: 24,
    radius: 20, aggroRange: 130, leashRange: 240, spec: { body: "#5a7a3a", accent: "#33471f", eye: "#ffe14a" } },
  { key: "red", name: "고대의 붉은뿔", x: 620, y: 620, hp: 520, ad: 26, xp: 55, gold: 40,
    radius: 22, aggroRange: 150, leashRange: 260, buff: "red",
    spec: { body: "#8a3a2a", accent: "#4a1a10", eye: "#ff3b3b", horn: "#3a1a10" } },
  { key: "blue", name: "고대의 푸른뿔", x: 900, y: 420, hp: 480, ad: 18, xp: 55, gold: 40,
    radius: 22, aggroRange: 150, leashRange: 260, buff: "blue",
    spec: { body: "#2a5a8a", accent: "#102a4a", eye: "#8fe0ff", horn: "#102a4a" } },
];

const BOSS_DEF = {
  key: "boss", name: "협곡의 고룡", x: 780, y: 100, hp: 5200, ad: 42, xp: 400, gold: 300,
  radius: 34, aggroRange: 220, leashRange: 500, isBoss: true, attackInterval: 1.3,
  spec: { body: "#5a2a8a", accent: "#2a1050", eye: "#ffe14a", horn: "#1a0a30" }
};

class JungleMode {
  constructor(game) {
    this.game = game;
    this.name = "정글 모드";
    this.bounds = { minX: 0, maxX: 1600, minY: 0, maxY: 1000 };
    this.campTimers = {};
    this.campKills = 0;
    this.bossSpawned = false;
    this.bossUnlockKills = 6;
    this.cleared = false;
    this.failed = false;
  }

  setup() {
    const g = this.game;
    g.player.x = 780; g.player.y = 900;
    for (const def of CAMP_DEFS) this.spawnCamp(def);
    g.floatTexts.push(new FloatText(g.player.x, g.player.y - 60, "정글을 정복하라!", "#8fd6ff", 15));
  }

  spawnCamp(def) {
    const g = this.game;
    const m = new JungleMonster(def.x, def.y, def);
    g.jungleMonsters.push(m);
  }

  findNearestEnemyFor(unit, range) {
    // 정글 모드에서는 구조물이 없으므로 플레이어만 타겟
    return null;
  }

  onMonsterDied(monster) {
    if (monster.isBoss) {
      this.cleared = true;
      this.game.victory("정글 정복 완료! 협곡의 고룡을 처치했습니다.");
      return;
    }
    this.campKills++;
    this.campTimers[monster.def.key] = 30; // 30초 후 리스폰
    if (!this.bossSpawned && this.campKills >= this.bossUnlockKills) {
      this.bossSpawned = true;
      const g = this.game;
      g.jungleMonsters.push(new JungleMonster(BOSS_DEF.x, BOSS_DEF.y, BOSS_DEF));
      g.floatTexts.push(new FloatText(g.player.x, g.player.y - 80, "협곡의 고룡이 깨어났다!!", "#c86bff", 17));
    }
  }

  update(dt) {
    const g = this.game;
    for (const key of Object.keys(this.campTimers)) {
      if (this.campTimers[key] > 0) {
        this.campTimers[key] -= dt;
        if (this.campTimers[key] <= 0) {
          const def = CAMP_DEFS.find(c => c.key === key);
          if (def) this.spawnCamp(def);
          delete this.campTimers[key];
        }
      }
    }
  }

  drawBackground(ctx, cam) {
    const tile = 32;
    const startX = Math.floor(cam.x / tile) * tile;
    const endX = cam.x + ctx.canvas.width + tile;
    const startY = Math.floor(cam.y / tile) * tile;
    const endY = cam.y + ctx.canvas.height + tile;
    for (let x = startX; x < endX; x += tile) {
      for (let y = startY; y < endY; y += tile) {
        const checker = ((x / tile) + (y / tile)) % 2 === 0;
        ctx.fillStyle = checker ? "#1c2b1f" : "#182417";
        ctx.fillRect(Math.round(x - cam.x), Math.round(y - cam.y), tile, tile);
      }
    }
    // 캠프 위치 표시(덤불 느낌)
    ctx.save();
    ctx.globalAlpha = 0.25;
    for (const def of CAMP_DEFS) {
      ctx.fillStyle = "#2f4a2f";
      ctx.beginPath();
      ctx.arc(def.x - cam.x, def.y - cam.y, 60, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 잔디 텍스처 장식(결정론적 배치, 화면 안만 그림)
    if (!this._grassSpots) {
      this._grassSpots = [];
      for (let i = 0; i < 400; i++) {
        this._grassSpots.push({
          x: Utils.randRange(this.bounds.minX, this.bounds.maxX),
          y: Utils.randRange(this.bounds.minY, this.bounds.maxY),
          seed: Math.floor(Math.random() * 997)
        });
      }
    }
    for (const gr of this._grassSpots) {
      if (gr.x < cam.x - 20 || gr.x > cam.x + ctx.canvas.width + 20) continue;
      if (gr.y < cam.y - 20 || gr.y > cam.y + ctx.canvas.height + 20) continue;
      drawGrassTuft(ctx, gr.x - cam.x, gr.y - cam.y, gr.seed);
    }
  }

  hudExtra() {
    return this.bossSpawned ? "고룡 등장!" : `보스 각성까지 처치: ${this.campKills}/${this.bossUnlockKills}`;
  }
}
