// ===================== sprites.js =====================
// 이미지 리소스 없이 캔버스 사각형(픽셀 블록)만으로 그리는 픽셀아트 스프라이트 엔진.
// PX = 픽셀아트의 "1픽셀" 크기(스케일). 모든 그림은 이 격자에 맞춰 정수 좌표로 그림.
// 메탈슬러그/스타듀류의 디테일에 최대한 가깝게: 외곽선 + 2톤 음영 + 장식 디테일을 추가했다.

const PX = 4; // 기본 픽셀 크기(배율)

function shade(hex, amt) {
  // hex 색상을 amt(-255~255)만큼 밝게/어둡게
  const num = parseInt(hex.slice(1), 16);
  let r = (num >> 16) + amt, g = ((num >> 8) & 0xff) + amt, b = (num & 0xff) + amt;
  r = Utils.clamp(r, 0, 255); g = Utils.clamp(g, 0, 255); b = Utils.clamp(b, 0, 255);
  return `rgb(${r},${g},${b})`;
}

function px(ctx, gx, gy, w, h, color, outline = true) {
  const x = Math.round(gx) * PX, y = Math.round(gy) * PX, ww = w * PX, hh = h * PX;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, ww, hh);
  if (outline) {
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, ww - 1, hh - 1);
  }
}

// 사람형 유닛(챔피언/미니언 공용) - facing: 1=오른쪽, -1=왼쪽
// spec: {skin, body, accent, hair, weapon:'sword'|'axe'|'spear'|'none', weaponColor, cape, glow}
function drawHumanoid(ctx, cx, cy, facing, spec, animT, swingT) {
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));
  if (facing < 0) ctx.scale(-1, 1);

  const bob = Math.sin(animT * 8) * 0.6; // 걷기 바운스
  const gx0 = -6, gy0 = -20 + bob; // 기준 좌상단 (그리드 단위)

  // 그림자
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(0, 2 * PX, 7 * PX, 2.2 * PX, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 망토(다리우스 등) - 살짝 펄럭이는 애니메이션
  if (spec.cape) {
    const flutter = Math.sin(animT * 5) * 0.6;
    px(ctx, gx0 - 2 + flutter * 0.3, gy0 + 5, 2, 9, shade(spec.accent, -10));
    px(ctx, gx0 - 1, gy0 + 5, 1, 9, spec.accent);
  }

  // 다리 (걷기 스윙 + 무릎/발목 음영)
  const legSwing = Math.sin(animT * 8) * 1.2;
  px(ctx, gx0 + 2, gy0 + 14, 2, 4 + Math.max(0, legSwing), "#26262f");
  px(ctx, gx0 + 6, gy0 + 14, 2, 4 + Math.max(0, -legSwing), "#26262f");
  px(ctx, gx0 + 2, gy0 + 17, 2, 2, "#141418"); // 부츠
  px(ctx, gx0 + 6, gy0 + 17, 2, 2, "#141418");

  // 몸통 (2톤 음영으로 입체감)
  px(ctx, gx0 + 1, gy0 + 7, 4, 8, shade(spec.body, -22));
  px(ctx, gx0 + 5, gy0 + 7, 4, 8, spec.body);
  px(ctx, gx0 + 1, gy0 + 7, 8, 2, spec.accent); // 어깨 라인
  px(ctx, gx0 + 1, gy0 + 13, 8, 1, shade(spec.body, -45)); // 벨트

  // 팔(무기 안든쪽)
  px(ctx, gx0, gy0 + 8, 2, 5, shade(spec.body, -18));

  // 머리 (이목구비 살짝 표현)
  px(ctx, gx0 + 2, gy0, 6, 6, spec.skin);
  px(ctx, gx0 + 2, gy0 - 1, 6, 2, spec.hair); // 머리카락
  px(ctx, gx0 + 6, gy0 + 3, 1, 1, "#1a1a1a", false); // 눈

  // 무기 (스윙 애니메이션 각도 적용)
  const swing = swingT !== undefined ? Math.sin(swingT * Math.PI) * 55 : 0;
  ctx.save();
  ctx.translate((gx0 + 9) * PX, (gy0 + 10) * PX);
  ctx.rotate((swing - 25) * Math.PI / 180);
  if (spec.weapon === "sword") {
    ctx.fillStyle = "#3a3a44";
    ctx.fillRect(0, -1.1 * PX, 10 * PX, 2.2 * PX);
    ctx.fillStyle = spec.weaponColor || "#dfe6ee";
    ctx.fillRect(0, -1 * PX, 9 * PX, 1 * PX); // 칼날 하이라이트
    ctx.fillStyle = "#8a5a2b";
    ctx.fillRect(-2.5 * PX, -1.2 * PX, 3 * PX, 2.4 * PX); // 손잡이
    ctx.fillStyle = "#d4af37";
    ctx.fillRect(-0.5 * PX, -1.6 * PX, 1 * PX, 3.2 * PX); // 코등이
  } else if (spec.weapon === "axe") {
    ctx.fillStyle = "#4a3a2a";
    ctx.fillRect(0, -1 * PX, 11 * PX, 1.4 * PX);
    ctx.fillStyle = spec.weaponColor || "#9aa0a6";
    ctx.beginPath();
    ctx.moveTo(9 * PX, -6 * PX);
    ctx.lineTo(15 * PX, -1 * PX);
    ctx.lineTo(9 * PX, 4.5 * PX);
    ctx.lineTo(6.5 * PX, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillRect(9.5 * PX, -4 * PX, 3 * PX, 0.8 * PX); // 날 하이라이트
  } else if (spec.weapon === "spear") {
    ctx.fillStyle = "#6b4a2b";
    ctx.fillRect(0, -0.7 * PX, 14 * PX, 1 * PX);
    ctx.fillStyle = "#c6c6c6";
    ctx.fillRect(13 * PX, -1.2 * PX, 3 * PX, 2 * PX);
  }
  ctx.restore();

  // 발광(스킬 강화 상태) 표시 링
  if (spec.glow) {
    ctx.save();
    ctx.globalAlpha = 0.5 + Math.sin(animT * 10) * 0.2;
    ctx.strokeStyle = spec.glow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 2 * PX, 8 * PX, 3 * PX, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

// 몬스터/짐승형 (정글 몹) 스프라이트 - 4족보행 느낌의 단순 블록 + 음영
function drawBeast(ctx, cx, cy, facing, spec, animT) {
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));
  if (facing < 0) ctx.scale(-1, 1);
  const bob = Math.sin(animT * 6) * 0.8;

  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(0, 3 * PX, 9 * PX, 2.6 * PX, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const gy0 = -12 + bob;
  px(ctx, -8, gy0 + 8, 3, 5, shade(spec.body, -20));
  px(ctx, 5, gy0 + 8, 3, 5, shade(spec.body, -20));
  px(ctx, -9, gy0, 16, 9, spec.body);
  px(ctx, -9, gy0 + 5, 16, 4, shade(spec.body, -18)); // 배쪽 음영
  px(ctx, -9, gy0, 16, 2, spec.accent);
  px(ctx, 6, gy0 - 4, 6, 6, spec.body);
  px(ctx, 9, gy0 - 5, 3, 3, spec.eye || "#ff4444");
  if (spec.horn) {
    ctx.fillStyle = spec.horn;
    ctx.beginPath();
    ctx.moveTo(10 * PX, (gy0 - 5) * PX);
    ctx.lineTo(13 * PX, (gy0 - 9) * PX);
    ctx.lineTo(11 * PX, (gy0 - 3) * PX);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// 체력바 (모든 유닛 공용)
function drawHealthBar(ctx, cx, topY, w, hp, maxHp, color = "#3ddc61", showText = false) {
  const h = 5;
  const x = Math.round(cx - w / 2), y = Math.round(topY);
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = "#3a1414";
  ctx.fillRect(x, y, w, h);
  const ratio = Utils.clamp(hp / maxHp, 0, 1);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * ratio, h);
  if (showText) {
    ctx.font = "8px monospace";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText(`${Math.ceil(hp)}/${maxHp}`, cx, y - 3);
  }
}

// 구조물(포탑/넥서스) 픽셀 아트
function drawTurret(ctx, cx, cy, team, destroyed) {
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));
  const base = team === "ally" ? "#3a6ea8" : "#a83a3a";
  const dark = team === "ally" ? "#1f3f61" : "#611f1f";
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(0, 4 * PX, 14 * PX, 4 * PX, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (destroyed) {
    px(ctx, -8, -6, 16, 10, "#3a3a3a");
    px(ctx, -8, -6, 16, 2, "#222");
    ctx.restore();
    return;
  }
  px(ctx, -6, -30, 12, 26, dark);
  px(ctx, -6, -30, 5, 26, shade(dark, -12));
  px(ctx, -8, -34, 16, 6, base);
  px(ctx, -9, -8, 18, 6, base);
  px(ctx, -3, -40, 6, 8, "#e0c060");
  ctx.restore();
}

function drawNexus(ctx, cx, cy, team, animT, destroyed) {
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));
  const base = team === "ally" ? "#3a6ea8" : "#a83a3a";
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(0, 6 * PX, 20 * PX, 5 * PX, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (destroyed) {
    px(ctx, -14, -14, 28, 22, "#333");
    ctx.restore();
    return;
  }
  px(ctx, -16, -6, 32, 14, "#2b2b3a");
  const pulse = 0.7 + Math.sin(animT * 3) * 0.3;
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.moveTo(0, -30 * PX);
  ctx.lineTo(14 * PX, -6 * PX);
  ctx.lineTo(0, 10 * PX);
  ctx.lineTo(-14 * PX, -6 * PX);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

// ---------------- 배경 장식(잔디/상자) ----------------
// 결정론적 시드 기반 풀숲 텍스처 - 메탈슬러그/스타듀식 키큰 잔디 느낌
function drawGrassTuft(ctx, x, y, seed) {
  const blades = 4;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  for (let i = 0; i < blades; i++) {
    const bx = (i - 1.5) * 3 + ((seed * (i + 1)) % 5) - 2;
    const h = 9 + ((seed * 7 + i * 13) % 9);
    const lean = Math.sin(seed * 0.7 + i) * 3;
    ctx.strokeStyle = i % 2 === 0 ? "#5a7a3a" : "#4a6a30";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx, 0);
    ctx.lineTo(bx + lean, -h);
    ctx.stroke();
  }
  ctx.restore();
}

// 나무 상자 (엄폐물/장식용)
function drawCrate(ctx, x, y, size = 26) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(0, size * 0.42, size * 0.55, size * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#6b4a2b";
  ctx.fillRect(-size / 2, -size / 2, size, size);
  ctx.fillStyle = "#5a3d22";
  ctx.fillRect(-size / 2, size / 2 - 5, size, 5);
  ctx.strokeStyle = "#2e1f10";
  ctx.lineWidth = 2;
  ctx.strokeRect(-size / 2, -size / 2, size, size);
  ctx.beginPath();
  ctx.moveTo(-size / 2, -size / 2); ctx.lineTo(size / 2, size / 2);
  ctx.moveTo(size / 2, -size / 2); ctx.lineTo(-size / 2, size / 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(-size / 2 + 2, -size / 2 + 2, size - 4, 3);
  ctx.restore();
}
