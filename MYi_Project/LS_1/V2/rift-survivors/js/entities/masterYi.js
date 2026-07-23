// ===================== entities/masterYi.js =====================
// 플레이어 챔피언: 마스터 이 (Master Yi)
// 패시브 더블스트라이크, Q 알파 스트라이크, W 메디테이트, E 우쥬 스타일, R 하이랜더

class MasterYi extends Entity {
  constructor(x, y) {
    super(x, y, 13);
    this.team = "ally";
    this.level = 1;
    this.xp = 0;
    this.xpToNext = 40;

    this.maxHp = 620;
    this.hp = this.maxHp;
    this.baseAd = 58;
    this.speed = 145;
    this.range = 36; // 근접 사거리
    this.attackInterval = 0.85;
    this.attackCd = 0;
    this.facing = 1;

    // 스킬 랭크
    this.rank = { q: 0, w: 0, e: 0, r: 0 };
    this.cd = { q: 0, w: 0, e: 0, r: 0 };
    this.skillPoints = 0;

    // 상태 버프
    this.invulnerable = false;
    this.invulnTimer = 0;
    this.meditating = false;
    this.wujuActive = false; this.wujuTimer = 0;
    this.highlanderActive = false; this.highlanderTimer = 0;
    this.stealthed = false;

    this.doubleStrikeCounter = 0; // 패시브: 4타마다 2연타
    this.swingT = 1;
    this.moveTarget = null;
    this.autoTarget = null;

    // 알파 스트라이크(Q) 상태 - 시전 시 0.8초간 사라져 피격불가, 그 사이 최대 4회 타격
    this.alphaActive = false;
    this.alphaTimer = 0;
    this.alphaDuration = 0.8;
    this.alphaHits = [];

    this.jungleBuffs = { red: 0, blue: 0 };
    this.gold = 0;
    this.keys = {};
    this.dashUntil = 0;
    this.dashVX = 0; this.dashVY = 0;
    this.slowPct = 0; this.slowUntil = 0;
  }

  get ad() {
    let v = this.baseAd + (this.level - 1) * 6;
    if (this.wujuActive) v *= 1.45;
    if (this.jungleBuffs.red > 0) v += 15;
    return v;
  }
  get moveSpeed() {
    let v = this.speed + (this.level - 1) * 2;
    if (this.highlanderActive) v *= 1.35;
    if (this.jungleBuffs.blue > 0) v *= 1.1;
    if (this.slowUntil && performance.now() < this.slowUntil) v *= (1 - this.slowPct);
    return v;
  }
  get attackSpeedMul() {
    let v = 1 + (this.level - 1) * 0.03;
    if (this.highlanderActive) v *= 1.4;
    if (this.jungleBuffs.blue > 0) v *= 1.15;
    return v;
  }

  gainXp(amount) {
    if (this.level >= 18) return;
    this.xp += amount;
    while (this.xp >= this.xpToNext && this.level < 18) {
      this.xp -= this.xpToNext;
      this.level++;
      this.skillPoints++;
      this.maxHp += 65;
      this.hp += 65;
      this.xpToNext = Math.round(40 + this.level * 22);
      this.autoLevelUp();
    }
  }

  // 초안 단계에서는 자동 스킬 트리 성장(Q > E > W, R은 6/11/16)
  autoLevelUp() {
    if (this.skillPoints <= 0) return;
    if (this.level === 6 || this.level === 11 || this.level === 16) {
      if (this.rank.r < 3) { this.rank.r++; this.skillPoints--; return; }
    }
    const order = ["q", "e", "w"];
    for (const k of order) {
      if (this.rank[k] < 5) { this.rank[k]++; this.skillPoints--; return; }
    }
  }

  applyJungleBuff(kind) {
    this.jungleBuffs[kind] = 90; // 90초 지속
    Game.instance.floatTexts.push(new FloatText(this.x, this.y - 40,
      kind === "red" ? "적화 버프 획득!" : "청화 버프 획득!", kind === "red" ? "#ff6b4a" : "#6bb7ff", 13));
  }

  takeDamage() {} // dealDamage 헬퍼에서 처리

  update(dt, game) {
    super.update(dt);
    if (this.hp <= 0) { game.onPlayerDeath(); return; }

    // 타이머류 감소
    for (const k of ["q", "w", "e", "r"]) if (this.cd[k] > 0) this.cd[k] -= dt;
    if (this.jungleBuffs.red > 0) this.jungleBuffs.red -= dt;
    if (this.jungleBuffs.blue > 0) this.jungleBuffs.blue -= dt;
    if (this.invulnTimer > 0) { this.invulnTimer -= dt; if (this.invulnTimer <= 0) this.invulnerable = false; }
    if (this.wujuTimer > 0) { this.wujuTimer -= dt; if (this.wujuTimer <= 0) this.wujuActive = false; }
    if (this.highlanderTimer > 0) { this.highlanderTimer -= dt; if (this.highlanderTimer <= 0) this.highlanderActive = false; }
    if (this.swingT < 1) this.swingT += dt * 4;

    // 대시 중(다리우스 E 붙잡기 등 외부 효과)
    if (performance.now() < this.dashUntil) {
      this.x += this.dashVX * dt;
      this.y += this.dashVY * dt;
      this.animT += dt;
      return;
    }

    // 알파 스트라이크(Q) 발동 중: 챔피언은 사라지고 예약된 타격을 순차 집행
    if (this.alphaActive) {
      this.alphaTimer += dt;
      for (const hit of this.alphaHits) {
        if (!hit.done && this.alphaTimer >= hit.time) {
          hit.done = true;
          if (hit.target && !hit.target.dead) {
            game.dealDamage(this, hit.target, hit.damage);
            const slashAngle = Utils.randRange(0, Math.PI * 2);
            game.slashes.push(new SlashEffect(hit.target.x, hit.target.y, slashAngle, { color: "#eaffff", length: 42 }));
            game.spawnParticleBurst(hit.target.x, hit.target.y, "#eaffff", 6);
          }
        }
      }
      if (this.alphaTimer >= this.alphaDuration) {
        this.alphaActive = false;
        // 마지막 타격 지점 근처로 재등장
        const lastHit = [...this.alphaHits].reverse().find(h => h.target && !h.target.dead);
        if (lastHit) {
          const ang = Utils.angle(lastHit.target, this.alphaOrigin || this);
          this.x = lastHit.target.x + Math.cos(ang) * 40;
          this.y = lastHit.target.y + Math.sin(ang) * 40;
        }
      }
      return;
    }

    // 메디테이트 중엔 이동 불가, 자힐 + 피해감소
    if (this.meditating) {
      const rank = this.rank.w;
      const healPct = 0.02 + rank * 0.014;
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * healPct * dt);
      return;
    }

    // 이동 (WASD)
    let mx = 0, my = 0;
    if (this.keys["w"]) my -= 1;
    if (this.keys["s"]) my += 1;
    if (this.keys["a"]) mx -= 1;
    if (this.keys["d"]) mx += 1;
    if (mx || my) {
      const len = Math.hypot(mx, my);
      mx /= len; my /= len;
      this.x += mx * this.moveSpeed * dt;
      this.y += my * this.moveSpeed * dt;
      this.facing = mx !== 0 ? (mx > 0 ? 1 : -1) : this.facing;
    }

    // 맵 경계
    const b = game.currentMode.bounds;
    if (b) {
      this.x = Utils.clamp(this.x, b.minX, b.maxX);
      this.y = Utils.clamp(this.y, b.minY, b.maxY);
    }

    // 평타는 자동발동하지 않음(Z키 수동입력) - 여기서는 대상 추적/방향전환만 수행
    if (this.attackCd > 0) this.attackCd -= dt;
    const enemies = game.getEnemiesNear(this, this.range + 20);
    this.autoTarget = enemies[0] || null;
    if (this.autoTarget) this.facing = this.autoTarget.x >= this.x ? 1 : -1;
  }

  // Z키로 수동 발동되는 평타. 사거리 내 타겟이 없으면 아무 효과 없음.
  performBasicAttack(game) {
    if (this.meditating || this.alphaActive) return;
    if (this.attackCd > 0) return;
    const target = game.getEnemiesNear(this, this.range + 20)[0];
    if (!target) return;
    this.facing = target.x >= this.x ? 1 : -1;
    this.attackCd = this.attackInterval / this.attackSpeedMul;
    this.swingT = 0;
    this.doubleStrikeCounter++;
    let hits = 1;
    if (this.doubleStrikeCounter >= 4) { hits = 2; this.doubleStrikeCounter = 0; } // 패시브: 4타마다 2연타
    for (let i = 0; i < hits; i++) {
      game.dealDamage(this, target, this.ad * (i === 1 ? 0.55 : 1));
    }
    game.spawnParticleBurst(target.x, target.y, "#fff6c9", 5);
    game.slashes.push(new SlashEffect(target.x, target.y, Utils.angle(this, target), { color: "#ffffff", length: 30 }));
  }

  // ---------------- 스킬 ----------------
  tryCast(key, game) {
    if (this.meditating && key !== "w") return; // 메디테이트 중엔 W(취소)만 가능
    if (key === "q") return this.castQ(game);
    if (key === "w") return this.castW(game);
    if (key === "e") return this.castE(game);
    if (key === "r") return this.castR(game);
  }

  castQ(game) {
    if (this.rank.q <= 0 || this.cd.q > 0 || this.alphaActive) return;
    this.cd.q = Math.max(2.5, 6.5 - this.rank.q * 0.7);

    const totalHits = 4;
    const nearby = game.getEnemiesNear(this, 340); // 이미 거리순 정렬됨
    const dmgPerHit = 22 + this.rank.q * 16 + this.ad * 0.4;
    this.alphaHits = [];
    if (nearby.length > 0) {
      for (let i = 0; i < totalHits; i++) {
        // 적이 4명보다 적으면 가까운 대상을 중복으로 타격
        this.alphaHits.push({
          time: (i * this.alphaDuration) / totalHits,
          target: nearby[i % nearby.length],
          damage: dmgPerHit,
          done: false
        });
      }
    }
    this.alphaActive = true;
    this.alphaTimer = 0;
    this.alphaOrigin = { x: this.x, y: this.y };
    this.invulnerable = true;
    this.invulnTimer = this.alphaDuration + 0.05;
    game.spawnParticleBurst(this.x, this.y, "#ffffff", 12);
    game.floatTexts.push(new FloatText(this.x, this.y - 30, "알파 스트라이크!", "#9be8ff", 11));
  }

  castW(game) {
    if (this.meditating) { this.meditating = false; return; } // 토글 취소
    if (this.rank.w <= 0 || this.cd.w > 0) return;
    this.meditating = true;
    this.cd.w = Math.max(6, 14 - this.rank.w * 1.2);
    game.floatTexts.push(new FloatText(this.x, this.y - 30, "메디테이트", "#8fffb0", 11));
    // 3초 후 자동 종료(수동 W로도 취소 가능)
    this._meditateEnd = performance.now() + 3000;
    clearTimeout(this._medTimer);
    this._medTimer = setTimeout(() => { this.meditating = false; }, 3000);
  }

  castE(game) {
    if (this.rank.e <= 0 || this.cd.e > 0) return;
    this.cd.e = Math.max(8, 16 - this.rank.e * 1.4);
    this.wujuActive = true;
    this.wujuTimer = 5 + this.rank.e * 0.6;
    game.floatTexts.push(new FloatText(this.x, this.y - 30, "우쥬 스타일!", "#ffb84a", 11));
  }

  castR(game) {
    if (this.rank.r <= 0 || this.cd.r > 0) return;
    this.cd.r = Math.max(60, 100 - this.rank.r * 15);
    this.highlanderActive = true;
    this.highlanderTimer = 8 + this.rank.r * 2;
    game.floatTexts.push(new FloatText(this.x, this.y - 34, "하이랜더!!", "#ffe14a", 15));
  }

  // 처치 시 R 재사용 대기시간 감소(패시브)
  onTakedown(game) {
    if (this.highlanderActive) {
      this.cd.q = 0; this.cd.w = 0; this.cd.e = 0;
      this.cd.r = Math.max(0, this.cd.r - 4);
    }
  }

  draw(ctx, cam) {
    if (!this.alphaActive) {
      const spec = {
        skin: "#e8c39e", body: "#e9e9f2", accent: "#3aa0d8",
        hair: "#141414", weapon: "sword", weaponColor: "#dfe6ee",
        glow: this.wujuActive ? "#ffb84a" : (this.highlanderActive ? "#ffe14a" : null)
      };
      if (this.invulnerable) ctx.globalAlpha = 0.6;
      drawHumanoid(ctx, this.x - cam.x, this.y - cam.y, this.facing, spec, this.animT, this.swingT);
      ctx.globalAlpha = 1;
    } else {
      // 알파 스트라이크로 사라진 동안: 원래 위치에 희미한 잔상만 표시
      ctx.save();
      ctx.globalAlpha = 0.35 + Math.sin(this.animT * 24) * 0.15;
      ctx.strokeStyle = "#9be8ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x - cam.x, this.y - cam.y - 8, 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (this.meditating) {
      ctx.save();
      ctx.strokeStyle = "#8fffb0";
      ctx.globalAlpha = 0.5 + Math.sin(this.animT * 8) * 0.3;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x - cam.x, this.y - cam.y - 10, 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    drawHealthBar(ctx, this.x - cam.x, this.y - cam.y - 40, 40, this.hp, this.maxHp, "#3ddc61", true);
  }
}
