// ===================== entities/darius.js =====================
// 적 챔피언: 다리우스 (Darius) - 라인 모드 보스급 유닛
// 패시브 출혈(헤모라지), Q 결의의 일격, W 무력화의 일격, E 참수(붙잡기), R 참수의 일격(처형)

class Darius extends Entity {
  constructor(x, y) {
    super(x, y, 15);
    this.team = "enemy";
    this.isChampion = true;
    this.name = "다리우스";
    this.maxHp = 2600;
    this.hp = this.maxHp;
    this.ad = 40;
    this.speed = 118;
    this.range = 44;
    this.attackInterval = 1.0;
    this.attackCd = 0;
    this.facing = -1;

    this.cd = { q: 0, w: 0, e: 0, r: 0 };
    this.state = "chase"; // chase | windup | recover
    this.windupTimer = 0;
    this.windupSkill = null;
    this.recoverTimer = 0;
    this.qEmpowered = false;
    this.wSlowNext = false;
    this.bleed = 0; // 플레이어에게 걸린 출혈 스택 수 (0~5)
    this.bleedTimer = 0;
    this.enraged = false; // 5스택 시 강화
    this.alive = true;
    this.rTelegraph = null;
    this.eTelegraph = null;
    this.xpValue = 260;
    this.goldValue = 200;
  }

  update(dt, game) {
    super.update(dt);
    if (this.hp <= 0) { this.die(game); return; }
    for (const k of ["q", "w", "e", "r"]) if (this.cd[k] > 0) this.cd[k] -= dt;
    if (this.bleedTimer > 0) {
      this.bleedTimer -= dt;
      if (this.bleedTimer <= 0 && this.bleed > 0) {
        game.dealDamage(this, game.player, this.bleed * 9, true);
        this.bleedTimer = 1;
        this.bleed = Math.max(0, this.bleed - 1);
      }
    }

    const player = game.player;
    const d = Utils.dist(this, player);

    if (this.state === "windup") {
      this.windupTimer -= dt;
      // 조준 유지
      if (this.windupSkill === "e" && this.eTelegraph) {
        this.eTelegraph.angle = Utils.angle(this, player);
        this.eTelegraph.x = this.x; this.eTelegraph.y = this.y;
      }
      if (this.windupTimer <= 0) this.executeWindup(game);
      return;
    }
    if (this.state === "recover") {
      this.recoverTimer -= dt;
      if (this.recoverTimer <= 0) this.state = "chase";
      return;
    }

    // chase 상태: AI 스킬 우선순위 판단
    this.facing = player.x >= this.x ? 1 : -1;

    if (this.cd.r <= 0 && d < 90 && this.hp > 0 &&
        (player.hp / player.maxHp < 0.5 || this.bleed >= 3)) {
      this.startWindup(game, "r", 0.6);
      return;
    }
    if (this.cd.e <= 0 && d > 90 && d < 260) {
      this.startWindup(game, "e", 0.45);
      return;
    }
    if (d > this.range) {
      const ang = Utils.angle(this, player);
      this.x += Math.cos(ang) * this.speed * dt;
      this.y += Math.sin(ang) * this.speed * dt;
      return;
    }
    // 사거리 안 - 평타/Q/W
    if (this.attackCd > 0) this.attackCd -= dt;
    if (this.cd.q <= 0) {
      this.startWindup(game, "q", 0.3);
      return;
    }
    if (this.cd.w <= 0 && !this.wSlowNext) {
      this.startWindup(game, "w", 0.3);
      return;
    }
    if (this.attackCd <= 0) {
      this.attackCd = this.attackInterval;
      this.basicAttack(game, player);
    }
  }

  startWindup(game, skill, time) {
    this.state = "windup";
    this.windupSkill = skill;
    this.windupTimer = time;
    if (skill === "r") {
      this.rTelegraph = new GroundTelegraph({
        type: "circle", x: game.player.x, y: game.player.y, radius: 55, duration: time,
        color: "rgba(180,20,20,0.4)"
      });
      game.telegraphs.push(this.rTelegraph);
      game.floatTexts.push(new FloatText(this.x, this.y - 40, "참수의 일격 준비!", "#ff3b3b", 13));
    } else if (skill === "e") {
      const ang = Utils.angle(this, game.player);
      this.eTelegraph = new GroundTelegraph({
        type: "capsule", x: this.x, y: this.y, angle: ang, length: 240, width: 46, duration: time,
        color: "rgba(200,140,20,0.35)"
      });
      game.telegraphs.push(this.eTelegraph);
    } else if (skill === "q") {
      game.floatTexts.push(new FloatText(this.x, this.y - 30, "결의의 일격", "#ffcf5c", 11));
    } else if (skill === "w") {
      game.floatTexts.push(new FloatText(this.x, this.y - 30, "무력화의 일격", "#8fd0ff", 11));
    }
  }

  executeWindup(game) {
    const skill = this.windupSkill;
    const player = game.player;
    if (skill === "r") {
      this.cd.r = 40;
      const d = Utils.dist(this, player);
      if (d <= 60 + 10) {
        const missingPct = 1 - player.hp / player.maxHp;
        const dmg = 130 + missingPct * 260;
        const killed = game.dealDamage(this, player, dmg, true);
        game.spawnParticleBurst(player.x, player.y, "#ff3b3b", 16);
        if (killed) this.cd.r = 0; // 처치 시 재사용 대기시간 초기화
      } else {
        game.floatTexts.push(new FloatText(this.x, this.y - 30, "빗나감!", "#999", 11));
      }
      this.rTelegraph = null;
    } else if (skill === "e") {
      this.cd.e = 13;
      const ang = this.eTelegraph ? this.eTelegraph.angle : Utils.angle(this, player);
      if (Utils.pointInCapsule(player, this, ang, 240, 46)) {
        game.dealDamage(this, player, 55, true);
        this.addBleed(game, 1);
        // 플레이어를 다리우스 쪽으로 강하게 끌어당김
        player.dashUntil = performance.now() + 260;
        const pullAng = Utils.angle(player, this);
        player.dashVX = Math.cos(pullAng) * 480;
        player.dashVY = Math.sin(pullAng) * 480;
        game.floatTexts.push(new FloatText(player.x, player.y - 30, "붙잡힘!", "#ffcf5c", 13));
      }
      this.eTelegraph = null;
    } else if (skill === "q") {
      this.cd.q = 8;
      const d = Utils.dist(this, player);
      if (d < this.range + 20) {
        const dmg = this.ad * 1.9 + 40;
        game.dealDamage(this, player, dmg, true);
        this.hp = Math.min(this.maxHp, this.hp + dmg * 0.22);
        this.addBleed(game, 1);
      }
    } else if (skill === "w") {
      this.cd.w = 10;
      const d = Utils.dist(this, player);
      if (d < this.range + 20) {
        game.dealDamage(this, player, this.ad * 1.2, true);
        this.addBleed(game, 1);
        game.applySlow(player, 0.45, 2.2);
        game.floatTexts.push(new FloatText(player.x, player.y - 20, "둔화!", "#8fd0ff", 11));
      }
    }
    this.state = "recover";
    this.recoverTimer = 0.35;
  }

  basicAttack(game, target) {
    game.dealDamage(this, target, this.ad, true);
    this.addBleed(game, 1);
    game.spawnParticleBurst(target.x, target.y, "#ff8a7f", 4);
  }

  addBleed(game, n) {
    this.bleed = Math.min(5, this.bleed + n);
    this.bleedTimer = this.bleedTimer > 0 ? this.bleedTimer : 1;
    if (this.bleed >= 5 && !this.enraged) {
      this.enraged = true;
      game.floatTexts.push(new FloatText(game.player.x, game.player.y - 40, "출혈 5중첩!", "#ff0000", 14));
    } else if (this.bleed < 5) {
      this.enraged = false;
    }
  }

  die(game) {
    if (!this.alive) return;
    this.alive = false;
    this.dead = true;
    game.player.gainXp(this.xpValue);
    game.gold += this.goldValue;
    game.player.onTakedown(game);
    game.spawnParticleBurst(this.x, this.y, "#ff3b3b", 30);
    game.onDariusDefeated();
  }

  draw(ctx, cam) {
    if (!this.alive) return;
    const spec = {
      skin: "#c99a6b", body: "#7a1f1f", accent: "#2b0b0b",
      hair: "#0f0f0f", weapon: "axe", weaponColor: "#c9a95e",
      cape: true, glow: this.state === "windup" ? "#ff3b3b" : (this.bleed >= 3 ? "#ff5a3b" : null)
    };
    drawHumanoid(ctx, this.x - cam.x, this.y - cam.y, this.facing, spec, this.animT,
      this.state === "windup" ? 1 - this.windupTimer : undefined);
    drawHealthBar(ctx, this.x - cam.x, this.y - cam.y - 44, 60, this.hp, this.maxHp, "#ff5a5a", true);
    ctx.save();
    ctx.font = "10px monospace";
    ctx.fillStyle = "#ffb0b0";
    ctx.textAlign = "center";
    ctx.fillText(this.name + (this.bleed > 0 ? `  출혈x${this.bleed}` : ""), this.x - cam.x, this.y - cam.y - 56);
    ctx.restore();
  }
}
