// ===================== modes/laneMode.js =====================
// 라인 모드: 미니언 웨이브와 다리우스로부터 포탑/넥서스를 지켜내는 디펜스형 모드
// 진행 방향: 세로(위→아래) - 적은 위쪽에서 등장해 아래쪽 아군 넥서스로 진군한다.

class LaneMode {
  constructor(game) {
    this.game = game;
    this.name = "라인 모드";
    this.laneCenterX = 360;
    this.laneHalfWidth = 120;
    this.bounds = {
      minX: this.laneCenterX - this.laneHalfWidth,
      maxX: this.laneCenterX + this.laneHalfWidth,
      minY: 0, maxY: 2000
    };
    this.spawnPoint = { x: this.laneCenterX, y: 80 };
    this.waveTimer = 6;
    this.waveInterval = 22;
    this.waveNum = 0;
    this.dariusSpawned = false;
    this.dariusTimer = 55; // 첫 등장까지의 시간
    this.cleared = false;
    this.failed = false;
    this._grassSpots = null;
    this._crateSpots = null;
  }

  setup() {
    const g = this.game;
    g.player.x = this.laneCenterX; g.player.y = 1900;
    g.structures.push(new Nexus(this.laneCenterX, 1950, "ally"));
    g.structures.push(new Turret(this.laneCenterX, 1600, "ally"));
    g.structures.push(new Turret(this.laneCenterX, 1250, "ally"));
    g.floatTexts.push(new FloatText(g.player.x, g.player.y - 60, "라인을 사수하라!", "#8fd6ff", 15));
    this._buildDecorations();
  }

  _buildDecorations() {
    this._grassSpots = [];
    for (let i = 0; i < 260; i++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const x = this.laneCenterX + side * (this.laneHalfWidth + 20 + Math.random() * 380);
      const y = Utils.randRange(-100, 2100);
      this._grassSpots.push({ x, y, seed: Math.floor(Math.random() * 997) });
    }
    this._crateSpots = [
      { x: this.laneCenterX - 70, y: 1560, size: 26 },
      { x: this.laneCenterX + 65, y: 1590, size: 22 },
      { x: this.laneCenterX - 65, y: 1210, size: 24 },
      { x: this.laneCenterX + 70, y: 1240, size: 20 },
      { x: this.laneCenterX - 60, y: 1880, size: 22 }
    ];
  }

  findNearestEnemyFor(unit, range) {
    const g = this.game;
    let cands;
    if (unit.team === "ally") {
      // 아군(포탑)이 노릴 대상: 적 미니언 + 다리우스
      cands = g.minions.filter(m => m.team === "enemy" && !m.dead);
      if (g.darius && g.darius.alive) cands.push(g.darius);
    } else {
      // 적 미니언이 노릴 대상: 플레이어 + 아군 구조물
      cands = [g.player, ...g.structures.filter(s => s.team === "ally" && !s.destroyed)];
    }
    let best = null, bestD = range;
    for (const c of cands) {
      const d = Utils.dist(unit, c);
      if (d < bestD) { best = c; bestD = d; }
    }
    return best;
  }

  spawnWave() {
    const g = this.game;
    this.waveNum++;
    const meleeCount = Math.min(5, 2 + Math.floor(this.waveNum / 2));
    const casterCount = Math.min(3, Math.floor(this.waveNum / 3));
    for (let i = 0; i < meleeCount; i++) {
      const m = new Minion(this.spawnPoint.x + Utils.randRange(-30, 30), this.spawnPoint.y - i * 26, "enemy", "melee");
      g.minions.push(m);
    }
    for (let i = 0; i < casterCount; i++) {
      const m = new Minion(this.spawnPoint.x + Utils.randRange(-30, 30), this.spawnPoint.y - i * 26 - 40, "enemy", "caster");
      g.minions.push(m);
    }
    g.floatTexts.push(new FloatText(g.player.x, g.player.y - 70, `웨이브 ${this.waveNum} 접근!`, "#ffcf5c", 13));
  }

  update(dt) {
    const g = this.game;
    if (this.cleared || this.failed) return;

    this.waveTimer -= dt;
    if (this.waveTimer <= 0) {
      this.spawnWave();
      this.waveTimer = Math.max(11, this.waveInterval - this.waveNum * 0.5);
    }

    if (!this.dariusSpawned) {
      this.dariusTimer -= dt;
      if (this.dariusTimer <= 0) {
        this.dariusSpawned = true;
        g.darius = new Darius(this.spawnPoint.x, this.spawnPoint.y);
        g.floatTexts.push(new FloatText(g.player.x, g.player.y - 80, "다리우스 등장!!", "#ff3b3b", 17));
      }
    }
  }

  onNexusDestroyed() {
    this.failed = true;
    this.game.gameOver("패배... 넥서스가 파괴되었습니다.");
  }

  onDariusDefeated() {
    this.cleared = true;
    this.game.victory("라인 방어 성공! 다리우스를 처치했습니다.");
  }

  drawBackground(ctx, cam) {
    const tile = 32;
    const startX = Math.floor(cam.x / tile) * tile;
    const endX = cam.x + ctx.canvas.width + tile;
    const startY = Math.floor(cam.y / tile) * tile;
    const endY = cam.y + ctx.canvas.height + tile;
    const pathMin = this.laneCenterX - this.laneHalfWidth;
    const pathMax = this.laneCenterX + this.laneHalfWidth;

    for (let x = startX; x < endX; x += tile) {
      for (let y = startY; y < endY; y += tile) {
        const inPath = x + tile > pathMin && x < pathMax;
        const checker = ((x / tile) + (y / tile)) % 2 === 0;
        if (inPath) {
          ctx.fillStyle = checker ? "#5a4a36" : "#513f2c"; // 흙길
        } else {
          ctx.fillStyle = checker ? "#33421f" : "#2c3a1a"; // 풀밭
        }
        ctx.fillRect(Math.round(x - cam.x), Math.round(y - cam.y), tile, tile);
      }
    }

    // 길 가장자리 테두리
    ctx.save();
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pathMin - cam.x, startY - cam.y); ctx.lineTo(pathMin - cam.x, endY - cam.y);
    ctx.moveTo(pathMax - cam.x, startY - cam.y); ctx.lineTo(pathMax - cam.x, endY - cam.y);
    ctx.stroke();
    ctx.restore();

    // 잔디/상자 장식 (화면 안에 있는 것만 그리기)
    if (this._grassSpots) {
      for (const gr of this._grassSpots) {
        if (gr.x < cam.x - 20 || gr.x > cam.x + ctx.canvas.width + 20) continue;
        if (gr.y < cam.y - 20 || gr.y > cam.y + ctx.canvas.height + 20) continue;
        drawGrassTuft(ctx, gr.x - cam.x, gr.y - cam.y, gr.seed);
      }
    }
    if (this._crateSpots) {
      for (const c of this._crateSpots) {
        drawCrate(ctx, c.x - cam.x, c.y - cam.y, c.size);
      }
    }
  }

  hudExtra() {
    if (this.dariusSpawned) return "";
    return `다리우스 등장까지: ${Math.max(0, Math.ceil(this.dariusTimer))}초`;
  }
}
