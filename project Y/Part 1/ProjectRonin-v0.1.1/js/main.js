
"use strict";

const CONFIG = Object.freeze({
  internalWidth: 640,
  internalHeight: 360,
  worldWidth: 2304,
  worldHeight: 1536,
  tileSize: 16,
  playerSpeed: 155,
  playerScale: 1.35,
  cameraSmoothing: 9,
});

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d", { alpha: false });
const loading = document.querySelector("#loading");
const loadingText = document.querySelector("#loadingText");

canvas.width = CONFIG.internalWidth;
canvas.height = CONFIG.internalHeight;
ctx.imageSmoothingEnabled = false;

class AssetLoader {
  constructor(manifest) {
    this.manifest = manifest;
    this.images = {};
  }

  async load() {
    const entries = Object.entries(this.manifest);
    let loaded = 0;

    await Promise.all(entries.map(([key, src]) => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        this.images[key] = image;
        loaded += 1;
        loadingText.textContent = `에셋 불러오는 중… ${loaded}/${entries.length}`;
        resolve();
      };
      image.onerror = () => reject(new Error(`이미지를 불러오지 못했습니다: ${src}`));
      image.src = src;
    })));

    return this.images;
  }
}

class Input {
  constructor(target = window) {
    this.keys = new Set();
    this.pressed = new Set();
    this.mouse = { x: 0, y: 0, down: false, clicked: false };

    target.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      if (!this.keys.has(key)) this.pressed.add(key);
      this.keys.add(key);
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) {
        event.preventDefault();
      }
    });

    target.addEventListener("keyup", (event) => {
      this.keys.delete(event.key.toLowerCase());
    });

    canvas.addEventListener("mousemove", (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = (event.clientX - rect.left) * (canvas.width / rect.width);
      this.mouse.y = (event.clientY - rect.top) * (canvas.height / rect.height);
    });

    canvas.addEventListener("mousedown", () => {
      this.mouse.down = true;
      this.mouse.clicked = true;
    });

    target.addEventListener("mouseup", () => {
      this.mouse.down = false;
    });
  }

  isDown(...keys) {
    return keys.some((key) => this.keys.has(key));
  }

  wasPressed(key) {
    return this.pressed.has(key);
  }

  endFrame() {
    this.pressed.clear();
    this.mouse.clicked = false;
  }
}

class Camera {
  constructor(viewWidth, viewHeight, worldWidth, worldHeight) {
    this.x = 0;
    this.y = 0;
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
  }

  follow(target, dt) {
    const targetX = target.x - this.viewWidth / 2;
    const targetY = target.y - this.viewHeight / 2;
    const blend = 1 - Math.exp(-CONFIG.cameraSmoothing * dt);

    this.x += (targetX - this.x) * blend;
    this.y += (targetY - this.y) * blend;

    this.x = Math.max(0, Math.min(this.worldWidth - this.viewWidth, this.x));
    this.y = Math.max(0, Math.min(this.worldHeight - this.viewHeight, this.y));
  }

  worldToScreen(x, y) {
    return { x: Math.round(x - this.x), y: Math.round(y - this.y) };
  }
}

class SpriteAnimation {
  constructor(image, frameWidth, frameHeight, frameCount, fps, loop = true) {
    this.image = image;
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
    this.frameCount = frameCount;
    this.frameDuration = 1 / fps;
    this.loop = loop;
    this.frame = 0;
    this.elapsed = 0;
    this.finished = false;
  }

  reset() {
    this.frame = 0;
    this.elapsed = 0;
    this.finished = false;
  }

  update(dt) {
    if (this.finished) return;
    this.elapsed += dt;

    while (this.elapsed >= this.frameDuration) {
      this.elapsed -= this.frameDuration;
      this.frame += 1;

      if (this.frame >= this.frameCount) {
        if (this.loop) this.frame = 0;
        else {
          this.frame = this.frameCount - 1;
          this.finished = true;
        }
      }
    }
  }

  draw(context, x, y, scale, flipX = false) {
    const sourceX = this.frame * this.frameWidth;
    const width = Math.round(this.frameWidth * scale);
    const height = Math.round(this.frameHeight * scale);

    context.save();
    context.translate(Math.round(x), Math.round(y));
    if (flipX) context.scale(-1, 1);

    context.drawImage(
      this.image,
      sourceX, 0, this.frameWidth, this.frameHeight,
      flipX ? -Math.round(width / 2) : -Math.round(width / 2),
      -Math.round(height * 0.78),
      width, height
    );
    context.restore();
  }
}

class Player {
  constructor(images) {
    this.spawnX = CONFIG.worldWidth / 2;
    this.spawnY = CONFIG.worldHeight / 2;
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.radius = 13;
    this.facingLeft = false;
    this.state = "idle";
    this.attackQueued = false;

    this.animations = {
      idle: new SpriteAnimation(images.idle, 96, 96, 10, 8, true),
      run: new SpriteAnimation(images.run, 96, 96, 16, 15, true),
      attack: new SpriteAnimation(images.attack, 96, 96, 7, 15, false),
    };
  }

  reset() {
    this.x = this.spawnX;
    this.y = this.spawnY;
  }

  update(dt, input) {
    if (input.mouse.clicked && this.state !== "attack") {
      this.state = "attack";
      this.animations.attack.reset();
    }

    const attacking = this.state === "attack" && !this.animations.attack.finished;
    let dx = 0;
    let dy = 0;

    if (!attacking) {
      if (input.isDown("a", "arrowleft")) dx -= 1;
      if (input.isDown("d", "arrowright")) dx += 1;
      if (input.isDown("w", "arrowup")) dy -= 1;
      if (input.isDown("s", "arrowdown")) dy += 1;

      if (dx !== 0 || dy !== 0) {
        const length = Math.hypot(dx, dy);
        dx /= length;
        dy /= length;
        this.x += dx * CONFIG.playerSpeed * dt;
        this.y += dy * CONFIG.playerSpeed * dt;
        this.state = "run";
        if (dx < 0) this.facingLeft = true;
        if (dx > 0) this.facingLeft = false;
      } else {
        this.state = "idle";
      }
    }

    if (this.state === "attack" && this.animations.attack.finished) {
      this.state = "idle";
    }

    this.x = Math.max(42, Math.min(CONFIG.worldWidth - 42, this.x));
    this.y = Math.max(42, Math.min(CONFIG.worldHeight - 42, this.y));
    this.animations[this.state].update(dt);
  }

  draw(context, camera) {
    const p = camera.worldToScreen(this.x, this.y);

    context.fillStyle = "rgba(0,0,0,.28)";
    context.beginPath();
    context.ellipse(p.x, p.y + 4, 18, 7, 0, 0, Math.PI * 2);
    context.fill();

    this.animations[this.state].draw(
      context,
      p.x,
      p.y,
      CONFIG.playerScale,
      this.facingLeft
    );
  }
}

class World {
  constructor(images) {
    this.images = images;
    this.decorations = [];
    this.generateDecorations();
  }

  seededRandom(seed) {
    let value = seed >>> 0;
    return () => {
      value += 0x6D2B79F5;
      let t = value;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  generateDecorations() {
    const rand = this.seededRandom(20260722);
    const centerX = CONFIG.worldWidth / 2;
    const centerY = CONFIG.worldHeight / 2;

    for (let i = 0; i < 130; i += 1) {
      const x = 70 + rand() * (CONFIG.worldWidth - 140);
      const y = 70 + rand() * (CONFIG.worldHeight - 140);
      if (Math.hypot(x - centerX, y - centerY) < 180) continue;

      const roll = rand();
      if (roll < 0.52) {
        this.decorations.push({ type: "treeLarge", x, y, layer: y });
      } else if (roll < 0.82) {
        this.decorations.push({ type: "treeSmall", x, y, layer: y });
      } else {
        const cropIndex = Math.floor(rand() * 5);
        this.decorations.push({ type: "fantasyProp", x, y, cropIndex, layer: y });
      }
    }

    this.decorations.sort((a, b) => a.layer - b.layer);
  }

  drawGround(context, camera) {
    const tile = this.images.grass;
    const tileSize = CONFIG.tileSize;

    const startX = Math.floor(camera.x / tileSize) * tileSize;
    const startY = Math.floor(camera.y / tileSize) * tileSize;
    const endX = camera.x + camera.viewWidth + tileSize;
    const endY = camera.y + camera.viewHeight + tileSize;

    for (let worldY = startY; worldY < endY; worldY += tileSize) {
      for (let worldX = startX; worldX < endX; worldX += tileSize) {
        const p = camera.worldToScreen(worldX, worldY);
        context.drawImage(tile, p.x, p.y, tileSize, tileSize);
      }
    }

    this.drawPath(context, camera);
  }

  drawPath(context, camera) {
    const path = this.images.plains;
    const centerX = CONFIG.worldWidth / 2;
    const centerY = CONFIG.worldHeight / 2;

    for (let x = 0; x < CONFIG.worldWidth; x += 16) {
      const p = camera.worldToScreen(x, centerY - 32);
      context.drawImage(path, 16, 0, 16, 16, p.x, p.y, 16, 16);
      context.drawImage(path, 16, 16, 16, 16, p.x, p.y + 16, 16, 16);
      context.drawImage(path, 16, 32, 16, 16, p.x, p.y + 32, 16, 16);
      context.drawImage(path, 16, 48, 16, 16, p.x, p.y + 48, 16, 16);
    }

    for (let y = 0; y < CONFIG.worldHeight; y += 16) {
      const p = camera.worldToScreen(centerX - 32, y);
      context.drawImage(path, 32, 0, 16, 16, p.x, p.y, 16, 16);
      context.drawImage(path, 48, 0, 16, 16, p.x + 16, p.y, 16, 16);
      context.drawImage(path, 64, 0, 16, 16, p.x + 32, p.y, 16, 16);
      context.drawImage(path, 80, 0, 16, 16, p.x + 48, p.y, 16, 16);
    }
  }

  drawDecoration(context, camera, item) {
    const p = camera.worldToScreen(item.x, item.y);
    if (p.x < -90 || p.y < -100 || p.x > camera.viewWidth + 90 || p.y > camera.viewHeight + 80) return;

    if (item.type === "treeLarge") {
      context.drawImage(
        this.images.mysticObjects,
        0, 96, 48, 64,
        Math.round(p.x - 24), Math.round(p.y - 58), 48, 64
      );
    } else if (item.type === "treeSmall") {
      context.drawImage(
        this.images.mysticObjects,
        96, 112, 32, 48,
        Math.round(p.x - 16), Math.round(p.y - 43), 32, 48
      );
    } else {
      const crops = [
        [0, 0, 16, 16],
        [16, 0, 16, 32],
        [32, 0, 16, 32],
        [64, 48, 32, 16],
        [112, 32, 16, 16],
      ];
      const [sx, sy, sw, sh] = crops[item.cropIndex];
      context.drawImage(
        this.images.fantasyResources,
        sx, sy, sw, sh,
        Math.round(p.x - sw / 2), Math.round(p.y - sh), sw, sh
      );
    }
  }

  drawBorder(context, camera) {
    context.save();
    context.strokeStyle = "#1d301d";
    context.lineWidth = 8;
    context.strokeRect(
      Math.round(-camera.x),
      Math.round(-camera.y),
      CONFIG.worldWidth,
      CONFIG.worldHeight
    );
    context.restore();
  }
}

class Game {
  constructor(images) {
    this.input = new Input();
    this.camera = new Camera(
      CONFIG.internalWidth,
      CONFIG.internalHeight,
      CONFIG.worldWidth,
      CONFIG.worldHeight
    );
    this.world = new World(images);
    this.player = new Player(images);
    this.lastTime = performance.now();
    this.fps = 60;
    this.elapsed = 0;
  }

  start() {
    loading.classList.add("hidden");
    requestAnimationFrame((time) => this.loop(time));
  }

  loop(time) {
    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;
    this.elapsed += dt;
    this.fps += ((1 / Math.max(dt, 0.001)) - this.fps) * 0.08;

    this.update(dt);
    this.draw();
    this.input.endFrame();

    requestAnimationFrame((nextTime) => this.loop(nextTime));
  }

  update(dt) {
    if (this.input.wasPressed("r")) this.player.reset();
    this.player.update(dt, this.input);
    this.camera.follow(this.player, dt);
  }

  draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.world.drawGround(ctx, this.camera);

    const behind = [];
    const front = [];
    for (const item of this.world.decorations) {
      if (item.y <= this.player.y) behind.push(item);
      else front.push(item);
    }

    for (const item of behind) this.world.drawDecoration(ctx, this.camera, item);
    this.player.draw(ctx, this.camera);
    for (const item of front) this.world.drawDecoration(ctx, this.camera, item);

    this.world.drawBorder(ctx, this.camera);
    this.drawHud();
  }

  drawHud() {
    ctx.save();
    ctx.fillStyle = "rgba(8, 14, 9, .82)";
    ctx.fillRect(8, 8, 172, 58);
    ctx.strokeStyle = "rgba(210, 235, 182, .45)";
    ctx.strokeRect(8.5, 8.5, 171, 57);

    ctx.fillStyle = "#eef5d8";
    ctx.font = "bold 10px monospace";
    ctx.fillText("PROJECT RONIN  v0.1.1", 16, 23);

    ctx.font = "9px monospace";
    ctx.fillStyle = "#b8d5a1";
    ctx.fillText(`STATE  ${this.player.state.toUpperCase()}`, 16, 38);
    ctx.fillText(`POS    ${Math.round(this.player.x)}, ${Math.round(this.player.y)}`, 16, 50);
    ctx.fillText(`FPS    ${Math.round(this.fps)}`, 16, 62);

    ctx.fillStyle = "rgba(8,14,9,.76)";
    ctx.fillRect(canvas.width - 116, 8, 108, 28);
    ctx.strokeStyle = "rgba(210,235,182,.4)";
    ctx.strokeRect(canvas.width - 115.5, 8.5, 107, 27);
    ctx.fillStyle = "#dce8c5";
    ctx.fillText("FOREST OUTPOST", canvas.width - 108, 25);
    ctx.restore();
  }
}

const manifest = {
  idle: "assets/player/idle.png",
  run: "assets/player/run.png",
  attack: "assets/player/attack.png",
  grass: "assets/tiles/grass.png",
  plains: "assets/tiles/plains.png",
  mysticObjects: "assets/objects/mystic_objects.png",
  fantasyResources: "assets/objects/fantasy_resources.png",
};

(async () => {
  try {
    const images = await new AssetLoader(manifest).load();
    const game = new Game(images);
    game.start();
  } catch (error) {
    console.error(error);
    loadingText.textContent = `${error.message} — 압축을 푼 뒤 index.html을 다시 실행하세요.`;
  }
})();
