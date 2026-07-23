// ===================== entities/base.js =====================

class Entity {
  constructor(x, y, radius) {
    this.x = x; this.y = y; this.radius = radius;
    this.dead = false;
    this.animT = Math.random() * 10;
  }
  update(dt) { this.animT += dt; }
  draw(ctx, cam) {}
}

// 투사체(다리우스 E 도끼, 마스터이 알파스트라이크 잔상 등에 사용)
class Projectile extends Entity {
  constructor(x, y, targetAngle, speed, opts = {}) {
    super(x, y, opts.radius || 5);
    this.vx = Math.cos(targetAngle) * speed;
    this.vy = Math.sin(targetAngle) * speed;
    this.owner = opts.owner;
    this.damage = opts.damage || 0;
    this.color = opts.color || "#fff";
    this.pierce = opts.pierce || false;
    this.life = opts.life || 2;
    this.onHit = opts.onHit || null;
    this.hitTeam = opts.hitTeam; // 어떤 팀을 때릴지
    this._hit = new Set();
  }
  update(dt) {
    super.update(dt);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }
  draw(ctx, cam) {
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x - cam.x, this.y - cam.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// 지상 경고 표시(스킬 사전동작/텔레그래프) - 원형 or 캡슐형
class GroundTelegraph {
  constructor(opts) {
    this.type = opts.type; // 'circle' | 'capsule' | 'line'
    this.x = opts.x; this.y = opts.y;
    this.angle = opts.angle || 0;
    this.radius = opts.radius || 0;
    this.length = opts.length || 0;
    this.width = opts.width || 0;
    this.duration = opts.duration;
    this.timer = 0;
    this.color = opts.color || "rgba(255,60,60,0.35)";
    this.dead = false;
    this.onComplete = opts.onComplete || null;
  }
  update(dt) {
    this.timer += dt;
    if (this.timer >= this.duration) {
      this.dead = true;
      if (this.onComplete) this.onComplete();
    }
  }
  draw(ctx, cam) {
    const t = Utils.clamp(this.timer / this.duration, 0, 1);
    const pulse = 0.25 + 0.25 * Math.sin(t * Math.PI * 6);
    ctx.save();
    ctx.globalAlpha = 0.35 + pulse;
    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.color.replace(/[\d.]+\)$/, "0.9)");
    ctx.lineWidth = 2;
    const sx = this.x - cam.x, sy = this.y - cam.y;
    if (this.type === "circle") {
      ctx.beginPath();
      ctx.arc(sx, sy, this.radius, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    } else if (this.type === "capsule" || this.type === "line") {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(this.angle);
      const w = this.width;
      ctx.fillRect(0, -w / 2, this.length, w);
      ctx.strokeRect(0, -w / 2, this.length, w);
      ctx.restore();
    }
    ctx.restore();
  }
}

// ---------------- 미니언 ----------------
class Minion extends Entity {
  constructor(x, y, team, kind = "melee") {
    super(x, y, kind === "caster" ? 9 : 11);
    this.team = team; // 'ally' | 'enemy'
    this.kind = kind;
    this.maxHp = kind === "caster" ? 210 : 320;
    this.hp = this.maxHp;
    this.ad = kind === "caster" ? 14 : 22;
    this.speed = 55;
    this.range = kind === "caster" ? 120 : 26;
    this.attackCd = 0;
    this.attackInterval = kind === "caster" ? 1.4 : 1.0;
    this.target = null;
    this.xpValue = kind === "caster" ? 18 : 14;
    this.goldValue = kind === "caster" ? 12 : 8;
    this.facing = team === "ally" ? 1 : -1;
  }
  update(dt, game) {
    super.update(dt);
    if (this.attackCd > 0) this.attackCd -= dt;
    const mode = game.currentMode;
    // 타겟 우선순위: 사거리 내 적 유닛 > 없으면 라인 진행
    if (!this.target || this.target.dead || Utils.dist(this, this.target) > this.range + 40) {
      this.target = mode.findNearestEnemyFor(this, 160);
    }
    if (this.target) {
      const d = Utils.dist(this, this.target);
      this.facing = this.target.x >= this.x ? 1 : -1;
      if (d > this.range) {
        const ang = Utils.angle(this, this.target);
        this.x += Math.cos(ang) * this.speed * dt;
        this.y += Math.sin(ang) * this.speed * dt;
      } else if (this.attackCd <= 0) {
        this.attackCd = this.attackInterval;
        game.dealDamage(this, this.target, this.ad);
        game.spawnParticleBurst(this.target.x, this.target.y, this.team === "ally" ? "#7fd3ff" : "#ff8a7f", 3);
      }
    } else {
      // 라인을 따라 전진 (세로 방향: 적 미니언은 아래로, 아군은 위로)
      const dir = this.team === "ally" ? -1 : 1;
      this.y += dir * this.speed * dt;
      this.x += Math.sin(this.animT * 2) * 3 * dt;
      this.facing = 1; // 스프라이트는 좌우 반전만 지원 (세로 이동시 기본값 유지)
    }
    if (this.hp <= 0) this.die(game);
  }
  die(game) {
    this.dead = true;
    if (this.team === "enemy") {
      game.player.gainXp(this.xpValue);
      game.gold += this.goldValue;
    }
    game.spawnParticleBurst(this.x, this.y, "#ffd76b", 8);
  }
  draw(ctx, cam) {
    const spec = this.team === "ally"
      ? { skin: "#e8c39e", body: "#3a6ea8", accent: "#274a70", hair: "#26160e", weapon: "sword" }
      : { skin: "#d8b48a", body: "#a83a3a", accent: "#611f1f", hair: "#1a1a1a", weapon: this.kind === "caster" ? "spear" : "sword" };
    drawHumanoid(ctx, this.x - cam.x, this.y - cam.y, this.facing, spec, this.animT);
    drawHealthBar(ctx, this.x - cam.x, this.y - cam.y - 34, 22, this.hp, this.maxHp,
      this.team === "ally" ? "#3ddc61" : "#e05a5a");
  }
}

// ---------------- 구조물 ----------------
class Turret extends Entity {
  constructor(x, y, team) {
    super(x, y, 20);
    this.team = team;
    this.maxHp = 1400;
    this.hp = this.maxHp;
    this.range = 165;
    this.ad = 45;
    this.attackCd = 0;
    this.attackInterval = 0.75;
    this.destroyed = false;
    this.target = null;
  }
  update(dt, game) {
    super.update(dt);
    if (this.destroyed) return;
    if (this.attackCd > 0) this.attackCd -= dt;
    if (!this.target || this.target.dead || Utils.dist(this, this.target) > this.range) {
      this.target = game.currentMode.findNearestEnemyFor(this, this.range);
    }
    if (this.target && this.attackCd <= 0) {
      this.attackCd = this.attackInterval;
      game.dealDamage(this, this.target, this.ad);
      game.spawnParticleBurst(this.target.x, this.target.y, "#fff2a8", 4);
    }
    if (this.hp <= 0 && !this.destroyed) {
      this.destroyed = true;
      game.floatTexts.push(new FloatText(this.x, this.y - 40, "포탑 파괴!", "#ff6b6b", 14));
    }
  }
  draw(ctx, cam) {
    drawTurret(ctx, this.x - cam.x, this.y - cam.y, this.team, this.destroyed);
    if (!this.destroyed) drawHealthBar(ctx, this.x - cam.x, this.y - cam.y - 46, 40, this.hp, this.maxHp);
  }
}

class Nexus extends Entity {
  constructor(x, y, team) {
    super(x, y, 26);
    this.team = team;
    this.maxHp = 3000;
    this.hp = this.maxHp;
    this.destroyed = false;
  }
  update(dt, game) {
    super.update(dt);
    if (this.hp <= 0 && !this.destroyed) {
      this.destroyed = true;
      game.onNexusDestroyed(this.team);
    }
  }
  draw(ctx, cam) {
    drawNexus(ctx, this.x - cam.x, this.y - cam.y, this.team, this.animT, this.destroyed);
    if (!this.destroyed) drawHealthBar(ctx, this.x - cam.x, this.y - cam.y - 46, 50, this.hp, this.maxHp, "#8fd6ff");
  }
}

// ---------------- 정글 몬스터 ----------------
class JungleMonster extends Entity {
  constructor(x, y, def) {
    super(x, y, def.radius);
    this.def = def;
    this.name = def.name;
    this.maxHp = def.hp;
    this.hp = this.maxHp;
    this.ad = def.ad;
    this.range = def.range || 28;
    this.speed = def.speed || 40;
    this.xpValue = def.xp;
    this.goldValue = def.gold;
    this.attackCd = 0;
    this.attackInterval = def.attackInterval || 1.1;
    this.aggro = false;
    this.facing = 1;
    this.homeX = x; this.homeY = y;
    this.buff = def.buff || null; // 'red' | 'blue' 등 처치시 버프
    this.isBoss = !!def.isBoss;
  }
  update(dt, game) {
    super.update(dt);
    if (this.attackCd > 0) this.attackCd -= dt;
    const player = game.player;
    const d = Utils.dist(this, player);
    if (!this.aggro && d < this.def.aggroRange && !player.stealthed) this.aggro = true;
    if (this.aggro) {
      this.facing = player.x >= this.x ? 1 : -1;
      if (d > this.range) {
        const ang = Utils.angle(this, player);
        this.x += Math.cos(ang) * this.speed * dt;
        this.y += Math.sin(ang) * this.speed * dt;
      } else if (this.attackCd <= 0 && !player.invulnerable) {
        this.attackCd = this.attackInterval;
        game.dealDamage(this, player, this.ad);
      }
      if (d > this.def.leashRange) { this.aggro = false; }
    } else {
      // 홈 포지션 배회
      const hd = Utils.dist2(this.x, this.y, this.homeX, this.homeY);
      if (hd > 4) {
        const ang = Utils.angle(this, { x: this.homeX, y: this.homeY });
        this.x += Math.cos(ang) * (this.speed * 0.4) * dt;
        this.y += Math.sin(ang) * (this.speed * 0.4) * dt;
      }
    }
    if (this.hp <= 0) this.die(game);
  }
  die(game) {
    this.dead = true;
    game.player.gainXp(this.xpValue);
    game.gold += this.goldValue;
    game.floatTexts.push(new FloatText(this.x, this.y - this.radius - 10, `+${this.xpValue} XP`, "#8fd6ff", 12));
    if (this.buff) game.player.applyJungleBuff(this.buff);
    game.spawnParticleBurst(this.x, this.y, "#ffd76b", this.isBoss ? 30 : 10);
    game.jungle.onMonsterDied(this);
  }
  draw(ctx, cam) {
    drawBeast(ctx, this.x - cam.x, this.y - cam.y, this.facing, this.def.spec, this.animT);
    drawHealthBar(ctx, this.x - cam.x, this.y - cam.y - this.radius - 16,
      this.isBoss ? 70 : 30, this.hp, this.maxHp, this.isBoss ? "#c86bff" : "#e0a83a");
    if (this.isBoss) {
      ctx.save();
      ctx.font = "10px monospace";
      ctx.fillStyle = "#c86bff";
      ctx.textAlign = "center";
      ctx.fillText(this.name, this.x - cam.x, this.y - cam.y - this.radius - 24);
      ctx.restore();
    }
  }
}
