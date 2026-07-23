// ===================== utils.js =====================
// 공용 수학/충돌/헬퍼 함수 모음

const Utils = {
  dist(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  },
  dist2(ax, ay, bx, by) {
    const dx = ax - bx, dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
  },
  angle(a, b) {
    return Math.atan2(b.y - a.y, b.x - a.x);
  },
  clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  },
  lerp(a, b, t) {
    return a + (b - a) * t;
  },
  circleHit(a, ar, b, br) {
    return Utils.dist(a, b) <= ar + br;
  },
  // 점 p가 선분 (a-b)를 중심으로 한 두께 width의 캡슐(직사각형) 안에 있는지 검사 (다리우스 E 판정용)
  pointInCapsule(p, a, dirAngle, length, width) {
    const dx = Math.cos(dirAngle), dy = Math.sin(dirAngle);
    const px = p.x - a.x, py = p.y - a.y;
    const proj = px * dx + py * dy; // 진행축 투영
    if (proj < -width / 2 || proj > length + width / 2) return false;
    const perp = Math.abs(-px * dy + py * dx); // 수직 거리
    return perp <= width / 2;
  },
  randRange(min, max) {
    return min + Math.random() * (max - min);
  },
  randInt(min, max) {
    return Math.floor(Utils.randRange(min, max + 1));
  },
  pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },
  formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }
};

// 화면에 떠다니는 데미지/텍스트 파티클
class FloatText {
  constructor(x, y, text, color = "#fff", size = 12) {
    this.x = x; this.y = y; this.text = text; this.color = color;
    this.life = 0.8; this.maxLife = 0.8; this.size = size;
    this.vy = -30;
  }
  update(dt) {
    this.life -= dt;
    this.y += this.vy * dt;
    this.vy *= 0.9;
  }
  get dead() { return this.life <= 0; }
  draw(ctx, cam) {
    ctx.save();
    ctx.globalAlpha = Utils.clamp(this.life / this.maxLife, 0, 1);
    ctx.font = `bold ${this.size}px "Press Start 2P", monospace`;
    ctx.fillStyle = this.color;
    ctx.textAlign = "center";
    ctx.fillText(this.text, this.x - cam.x, this.y - cam.y);
    ctx.restore();
  }
}

// 참격 이펙트 (평타/알파 스트라이크 등에서 사용) - 곡선형 흰색 슬래시가 짧게 번쩍임
class SlashEffect {
  constructor(x, y, angle, opts = {}) {
    this.x = x; this.y = y; this.angle = angle;
    this.life = 0.22; this.maxLife = 0.22;
    this.color = opts.color || "#ffffff";
    this.length = opts.length || 34;
  }
  update(dt) { this.life -= dt; }
  get dead() { return this.life <= 0; }
  draw(ctx, cam) {
    const t = Utils.clamp(this.life / this.maxLife, 0, 1);
    ctx.save();
    ctx.translate(this.x - cam.x, this.y - cam.y);
    ctx.rotate(this.angle);
    ctx.globalAlpha = t;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-this.length / 2, 4);
    ctx.quadraticCurveTo(0, -this.length * 0.55, this.length / 2, 4);
    ctx.stroke();
    ctx.restore();
  }
}

// 간단한 파티클(타격 이펙트 등)
class Particle {
  constructor(x, y, color, opts = {}) {
    this.x = x; this.y = y; this.color = color;
    this.vx = opts.vx ?? Utils.randRange(-60, 60);
    this.vy = opts.vy ?? Utils.randRange(-60, 60);
    this.life = opts.life ?? 0.4;
    this.maxLife = this.life;
    this.size = opts.size ?? 3;
  }
  update(dt) {
    this.life -= dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 0.9; this.vy *= 0.9;
  }
  get dead() { return this.life <= 0; }
  draw(ctx, cam) {
    ctx.save();
    ctx.globalAlpha = Utils.clamp(this.life / this.maxLife, 0, 1);
    ctx.fillStyle = this.color;
    const s = this.size;
    ctx.fillRect(Math.round(this.x - cam.x - s / 2), Math.round(this.y - cam.y - s / 2), s, s);
    ctx.restore();
  }
}
