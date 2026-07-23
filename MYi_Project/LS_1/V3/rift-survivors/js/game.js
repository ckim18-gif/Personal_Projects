// ===================== game.js =====================
// 게임 메인 루프 / 상태 관리 / 입력 / HUD

class Game {
  constructor() {
    Game.instance = this;
    this.canvas = document.getElementById("game-canvas");
    this.ctx = this.canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;

    this.state = "menu"; // menu | playing | gameover | victory
    this.mode = null;
    this.currentMode = null;

    this.player = null;
    this.darius = null;
    this.minions = [];
    this.structures = [];
    this.jungleMonsters = [];
    this.telegraphs = [];
    this.particles = [];
    this.floatTexts = [];
    this.slashes = [];
    this.imageSlashes = [];

    this.gold = 0;
    this.elapsed = 0;
    this.cam = { x: 0, y: 0 };
    this.mouse = { x: 0, y: 0, wx: 0, wy: 0 };
    this.shakeMag = 0;
    this.shakeTime = 0;

    this.lastTime = 0;
    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.bindInput();
    this.bindMenu();
    requestAnimationFrame((t) => this.loop(t));
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  bindMenu() {
    document.getElementById("btn-lane").onclick = () => this.startGame("lane");
    document.getElementById("btn-jungle").onclick = () => this.startGame("jungle");
    document.getElementById("btn-restart").onclick = () => this.showMenu();
    document.getElementById("btn-restart2").onclick = () => this.showMenu();
  }

  bindInput() {
    window.addEventListener("keydown", (e) => {
      if (!this.player) return;
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) e.preventDefault();
      this.player.keys[k] = true;
      if (["q", "w", "e", "r"].includes(k)) this.player.tryCast(k, this);
      if (k === "a") this.player.performBasicAttack(this);
    });
    window.addEventListener("keyup", (e) => {
      if (!this.player) return;
      this.player.keys[e.key.toLowerCase()] = false;
    });
    this.canvas.addEventListener("mousemove", (e) => {
      this.mouse.x = e.clientX; this.mouse.y = e.clientY;
      this.mouse.wx = e.clientX + this.cam.x; this.mouse.wy = e.clientY + this.cam.y;
    });
  }

  showMenu() {
    this.state = "menu";
    document.getElementById("screen-menu").classList.remove("hidden");
    document.getElementById("screen-gameover").classList.add("hidden");
    document.getElementById("screen-victory").classList.add("hidden");
    document.getElementById("hud").classList.add("hidden");
  }

  startGame(mode) {
    this.mode = mode;
    this.player = new MasterYi(0, 0);
    this.darius = null;
    this.minions = [];
    this.structures = [];
    this.jungleMonsters = [];
    this.telegraphs = [];
    this.particles = [];
    this.floatTexts = [];
    this.slashes = [];
    this.imageSlashes = [];
    this.gold = 0;
    this.elapsed = 0;
    this.shakeMag = 0;
    this.shakeTime = 0;

    this.currentMode = mode === "lane" ? new LaneMode(this) : new JungleMode(this);
    this.currentMode.setup();

    this.state = "playing";
    document.getElementById("screen-menu").classList.add("hidden");
    document.getElementById("screen-gameover").classList.add("hidden");
    document.getElementById("screen-victory").classList.add("hidden");
    document.getElementById("hud").classList.remove("hidden");
    document.getElementById("hud-mode-name").textContent = this.currentMode.name;
  }

  gameOver(msg) {
    this.state = "gameover";
    document.getElementById("gameover-msg").textContent = msg;
    document.getElementById("screen-gameover").classList.remove("hidden");
  }

  victory(msg) {
    this.state = "victory";
    document.getElementById("victory-msg").textContent = msg;
    document.getElementById("screen-victory").classList.remove("hidden");
  }

  onPlayerDeath() {
    if (this.state !== "playing") return;
    this.gameOver("사망했습니다... 마스터 이는 쓰러졌다.");
  }

  onNexusDestroyed(team) {
    if (team === "ally") this.currentMode.onNexusDestroyed();
  }

  onDariusDefeated() {
    if (this.currentMode.onDariusDefeated) this.currentMode.onDariusDefeated();
  }

  // ---------------- 헬퍼: 전투 관련 ----------------
  dealDamage(source, target, amount, isDot) {
    if (!target || target.dead) return false;
    if (target.invulnerable) return false;
    amount = Math.max(1, Math.round(amount));
    target.hp -= amount;
    const isPlayer = target === this.player;
    this.floatTexts.push(new FloatText(
      target.x + Utils.randRange(-6, 6), target.y - (target.radius || 20) - 6,
      `${isDot ? "" : ""}${amount}`, isPlayer ? "#ff6b6b" : "#ffe680", isPlayer ? 13 : 11
    ));
    if (amount >= 45) this.addShake(isPlayer ? 5 : 3, isPlayer ? 0.2 : 0.12);
    return target.hp <= 0;
  }

  addShake(mag, duration) {
    this.shakeMag = Math.max(this.shakeMag, mag);
    this.shakeTime = Math.max(this.shakeTime, duration);
  }

  applySlow(target, pct, duration) {
    target.slowPct = pct;
    target.slowUntil = performance.now() + duration * 1000;
  }

  spawnParticleBurst(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, color, { life: Utils.randRange(0.25, 0.5), size: Utils.randRange(2, 4) }));
    }
  }

  getEnemiesNear(unit, range) {
    const list = [];
    if (this.mode === "lane") {
      for (const m of this.minions) if (m.team === "enemy" && !m.dead) list.push(m);
      if (this.darius && this.darius.alive) list.push(this.darius);
    } else {
      for (const m of this.jungleMonsters) if (!m.dead) list.push(m);
    }
    return list
      .filter(e => Utils.dist(unit, e) <= range)
      .sort((a, b) => Utils.dist(unit, a) - Utils.dist(unit, b));
  }

  getAllEnemies() {
    if (this.mode === "lane") {
      const list = this.minions.filter(m => m.team === "enemy" && !m.dead);
      if (this.darius && this.darius.alive) list.push(this.darius);
      return list;
    }
    return this.jungleMonsters.filter(m => !m.dead);
  }

  // ---------------- 메인 루프 ----------------
  loop(t) {
    const dt = Math.min(0.05, (t - this.lastTime) / 1000 || 0);
    this.lastTime = t;
    if (this.state === "playing") this.update(dt);
    this.render();
    requestAnimationFrame((tt) => this.loop(tt));
  }

  update(dt) {
    this.elapsed += dt;
    this.currentMode.update(dt);
    this.player.update(dt, this);

    for (const s of this.structures) s.update(dt, this);
    for (const m of this.minions) m.update(dt, this);
    this.minions = this.minions.filter(m => !m.dead);

    for (const jm of this.jungleMonsters) jm.update(dt, this);
    this.jungleMonsters = this.jungleMonsters.filter(m => !m.dead);

    if (this.darius && this.darius.alive) this.darius.update(dt, this);

    for (const tg of this.telegraphs) tg.update(dt);
    this.telegraphs = this.telegraphs.filter(t => !t.dead);

    for (const p of this.particles) p.update(dt);
    this.particles = this.particles.filter(p => !p.dead);

    for (const s of this.slashes) s.update(dt);
    this.slashes = this.slashes.filter(s => !s.dead);

    for (const s of this.imageSlashes) s.update(dt);
    this.imageSlashes = this.imageSlashes.filter(s => !s.dead);

    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      if (this.shakeTime <= 0) this.shakeMag = 0;
    }

    for (const f of this.floatTexts) f.update(dt);
    this.floatTexts = this.floatTexts.filter(f => !f.dead);

    // 카메라: 플레이어 중심. 맵이 화면보다 좁으면 굳이 클램프하지 않고 항상 플레이어를 중앙에 둔다
    // (라인 모드처럼 좁은 통로일 때 화면 왼쪽으로 쏠려 보이던 문제 수정)
    this.cam.x = this.player.x - this.canvas.width / 2;
    this.cam.y = this.player.y - this.canvas.height / 2;
    if (this.currentMode.bounds) {
      const b = this.currentMode.bounds;
      const boundW = b.maxX - b.minX, boundH = b.maxY - b.minY;
      if (boundW > this.canvas.width) {
        this.cam.x = Utils.clamp(this.cam.x, b.minX - 200, b.maxX - this.canvas.width + 200);
      }
      if (boundH > this.canvas.height) {
        this.cam.y = Utils.clamp(this.cam.y, b.minY - 200, b.maxY - this.canvas.height + 200);
      }
    }

    this.updateHud();
  }

  updateHud() {
    const p = this.player;
    document.getElementById("hp-fill").style.width = `${Utils.clamp(p.hp / p.maxHp, 0, 1) * 100}%`;
    document.getElementById("hp-text").textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
    document.getElementById("xp-fill").style.width = `${Utils.clamp(p.xp / p.xpToNext, 0, 1) * 100}%`;
    document.getElementById("level-text").textContent = `Lv.${p.level}`;
    document.getElementById("gold-text").textContent = `${this.gold} G`;
    document.getElementById("timer-text").textContent = Utils.formatTime(this.elapsed);
    document.getElementById("mode-extra").textContent = this.currentMode.hudExtra ? this.currentMode.hudExtra() : "";

    for (const k of ["q", "w", "e", "r"]) {
      const el = document.getElementById(`cd-${k}`);
      const rank = p.rank[k];
      const cd = p.cd[k];
      el.parentElement.classList.toggle("locked", rank <= 0);
      el.textContent = rank <= 0 ? "" : (cd > 0 ? Math.ceil(cd) : "");
      el.parentElement.querySelector(".rank").textContent = rank > 0 ? rank : "";
    }
    document.getElementById("buff-red").classList.toggle("active", p.jungleBuffs.red > 0);
    document.getElementById("buff-blue").classList.toggle("active", p.jungleBuffs.blue > 0);
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.state === "menu") return;

    ctx.fillStyle = "#111318";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (!this.currentMode) return;

    // 화면 흔들림(스크린 셰이크) - 렌더링에만 적용, 실제 좌표/판정에는 영향 없음
    const shakeCam = this.cam;
    let drawCam = shakeCam;
    if (this.shakeTime > 0) {
      drawCam = {
        x: shakeCam.x + Utils.randRange(-this.shakeMag, this.shakeMag),
        y: shakeCam.y + Utils.randRange(-this.shakeMag, this.shakeMag)
      };
    }

    this.currentMode.drawBackground(ctx, drawCam);

    for (const s of this.structures) s.draw(ctx, drawCam);
    for (const m of this.minions) m.draw(ctx, drawCam);
    for (const jm of this.jungleMonsters) jm.draw(ctx, drawCam);
    if (this.darius && this.darius.alive) this.darius.draw(ctx, drawCam);
    if (this.player) this.player.draw(ctx, drawCam);

    for (const tg of this.telegraphs) tg.draw(ctx, drawCam);
    for (const p of this.particles) p.draw(ctx, drawCam);
    for (const s of this.slashes) s.draw(ctx, drawCam);
    for (const s of this.imageSlashes) s.draw(ctx, drawCam);
    for (const f of this.floatTexts) f.draw(ctx, drawCam);

    this.drawVignette(ctx);
  }

  // 화면 가장자리를 어둡게 눌러주는 비네트 - 분위기(메탈슬러그 느낌) 보정용
  drawVignette(ctx) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    const grad = ctx.createRadialGradient(w / 2, h / 2, h * 0.32, w / 2, h / 2, h * 0.78);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.save();
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

window.addEventListener("load", () => {
  new Game();
});
