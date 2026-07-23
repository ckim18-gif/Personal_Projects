// ===================== assets.js =====================
// 사용자가 제공한 레퍼런스 이미지를 실제 게임 이펙트로 재사용한다.
// (초록빛 광검 이펙트 - 알파 스트라이크의 "참격" 연출에 사용)

const GameAssets = {
  slashA: new Image(),
  slashB: new Image(),
};
GameAssets.slashA.src = "assets/slash-a.png";
GameAssets.slashB.src = "assets/slash-b.png";

function randomSlashImage() {
  return Math.random() < 0.5 ? GameAssets.slashA : GameAssets.slashB;
}

// 제공 이미지를 활용한 대형 참격 이펙트 - 가산(lighter) 블렌딩으로 어두운 배경은 죽고
// 밝은 초록 광검 부분만 화면 위에 강하게 도드라지도록 처리
class ImageSlashEffect {
  constructor(x, y, img, opts = {}) {
    this.x = x; this.y = y; this.img = img;
    this.life = opts.life ?? 0.4;
    this.maxLife = this.life;
    this.height = opts.height || 150;
    this.angle = opts.angle || 0;
  }
  update(dt) { this.life -= dt; }
  get dead() { return this.life <= 0; }
  draw(ctx, cam) {
    if (!this.img || !this.img.complete || this.img.naturalWidth === 0) return;
    const t = Utils.clamp(this.life / this.maxLife, 0, 1);
    const scale = this.height / this.img.naturalHeight;
    const w = this.img.naturalWidth * scale;
    ctx.save();
    ctx.translate(Math.round(this.x - cam.x), Math.round(this.y - cam.y));
    ctx.rotate(this.angle);
    ctx.globalAlpha = Utils.clamp(t * 1.5, 0, 1);
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(this.img, -w / 2, -this.height * 0.85, w, this.height);
    ctx.restore();
  }
}
