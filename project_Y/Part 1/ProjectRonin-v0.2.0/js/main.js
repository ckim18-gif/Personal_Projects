
"use strict";

const CONFIG = Object.freeze({
  viewW: 640,
  viewH: 360,
  worldW: 2304,
  worldH: 1536,
  tile: 16,
  playerSpeed: 155,
  playerScale: 1.35,
  enemySpeed: 42,
  alphaRange: 330,
  alphaDuration: 0.8,
  alphaStrikes: 4,
  alphaCooldown: 4.0
});

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d", { alpha: false });
ctx.imageSmoothingEnabled = false;
const loading = document.querySelector("#loading");
const loadingText = document.querySelector("#loadingText");

class Assets {
  constructor(manifest) { this.manifest = manifest; this.images = {}; }
  async load() {
    const entries = Object.entries(this.manifest);
    let count = 0;
    await Promise.all(entries.map(([key, src]) => new Promise((ok, fail) => {
      const img = new Image();
      img.onload = () => {
        this.images[key] = img;
        loadingText.textContent = `에셋 불러오는 중… ${++count}/${entries.length}`;
        ok();
      };
      img.onerror = () => fail(new Error(`로드 실패: ${src}`));
      img.src = src;
    })));
    return this.images;
  }
}

class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();
    addEventListener("keydown", e => {
      const k = e.key.toLowerCase();
      if (!this.down.has(k)) this.pressed.add(k);
      this.down.add(k);
      if (["arrowup","arrowdown","arrowleft","arrowright","a","q"].includes(k)) e.preventDefault();
    });
    addEventListener("keyup", e => this.down.delete(e.key.toLowerCase()));
  }
  held(...keys) { return keys.some(k => this.down.has(k)); }
  tap(k) { return this.pressed.has(k); }
  end() { this.pressed.clear(); }
}

class Camera {
  constructor() { this.x = 0; this.y = 0; }
  follow(target, dt) {
    const tx = target.x - CONFIG.viewW / 2;
    const ty = target.y - CONFIG.viewH / 2;
    const s = 1 - Math.exp(-9 * dt);
    this.x += (tx - this.x) * s;
    this.y += (ty - this.y) * s;
    this.x = Math.max(0, Math.min(CONFIG.worldW - CONFIG.viewW, this.x));
    this.y = Math.max(0, Math.min(CONFIG.worldH - CONFIG.viewH, this.y));
  }
  screen(x,y) { return { x: Math.round(x-this.x), y: Math.round(y-this.y) }; }
}

class Animation {
  constructor(img, fw, fh, frames, fps, row=0, loop=true) {
    Object.assign(this,{img,fw,fh,frames,fps,row,loop});
    this.frame=0; this.time=0; this.finished=false;
  }
  reset(){this.frame=0;this.time=0;this.finished=false;}
  update(dt){
    if(this.finished)return;
    this.time += dt;
    while(this.time >= 1/this.fps){
      this.time -= 1/this.fps;
      this.frame++;
      if(this.frame >= this.frames){
        if(this.loop)this.frame=0;
        else {this.frame=this.frames-1;this.finished=true;}
      }
    }
  }
  draw(c,x,y,scale=1,flip=false,alpha=1){
    c.save(); c.globalAlpha=alpha; c.translate(Math.round(x),Math.round(y));
    if(flip)c.scale(-1,1);
    const w=Math.round(this.fw*scale), h=Math.round(this.fh*scale);
    c.drawImage(this.img,this.frame*this.fw,this.row*this.fh,this.fw,this.fh,-w/2,-h*.78,w,h);
    c.restore();
  }
}

class Enemy {
  constructor(img,x,y,id){
    this.id=id; this.x=x; this.y=y; this.hp=4; this.maxHp=4;
    this.radius=11; this.dead=false; this.hitFlash=0; this.knockX=0; this.knockY=0;
    this.anim=new Animation(img,32,32,4,6,0,true);
  }
  damage(amount,fromX,fromY){
    if(this.dead)return;
    this.hp-=amount; this.hitFlash=.12;
    const dx=this.x-fromX, dy=this.y-fromY, len=Math.hypot(dx,dy)||1;
    this.knockX += dx/len*85; this.knockY += dy/len*85;
    if(this.hp<=0)this.dead=true;
  }
  update(dt,player){
    if(this.dead)return;
    this.hitFlash=Math.max(0,this.hitFlash-dt);
    this.anim.update(dt);
    const dx=player.x-this.x, dy=player.y-this.y, d=Math.hypot(dx,dy)||1;
    if(d<440 && !player.alpha.active){
      this.x += dx/d*CONFIG.enemySpeed*dt;
      this.y += dy/d*CONFIG.enemySpeed*dt;
    }
    this.x += this.knockX*dt; this.y += this.knockY*dt;
    this.knockX *= Math.exp(-8*dt); this.knockY *= Math.exp(-8*dt);
  }
  draw(c,camera){
    if(this.dead)return;
    const p=camera.screen(this.x,this.y);
    c.fillStyle="rgba(0,0,0,.25)";
    c.beginPath(); c.ellipse(p.x,p.y+3,10,4,0,0,Math.PI*2); c.fill();
    this.anim.draw(c,p.x,p.y,1.25,false,this.hitFlash>0?.45:1);
    c.fillStyle="#25120f"; c.fillRect(p.x-13,p.y-22,26,3);
    c.fillStyle="#d95b45"; c.fillRect(p.x-13,p.y-22,26*(this.hp/this.maxHp),3);
  }
}

class SlashEffect {
  constructor(x,y,angle,strong=false){
    this.x=x;this.y=y;this.angle=angle;this.life=strong?.22:.14;this.max=this.life;this.strong=strong;
  }
  update(dt){this.life-=dt;}
  draw(c,camera){
    const p=camera.screen(this.x,this.y), t=this.life/this.max;
    c.save();c.translate(p.x,p.y);c.rotate(this.angle);c.globalAlpha=Math.max(0,t);
    c.strokeStyle=this.strong?"#f4f0c7":"#d8e5bf";
    c.lineWidth=this.strong?4:3;
    c.beginPath();c.arc(0,0,this.strong?28:22,-1.05,1.05);c.stroke();
    c.restore();
  }
}

class Player {
  constructor(imgs){
    this.spawnX=CONFIG.worldW/2;this.spawnY=CONFIG.worldH/2;
    this.x=this.spawnX;this.y=this.spawnY;this.facingLeft=false;
    this.state="idle";this.attackCooldown=0;this.attackHitDone=false;
    this.anim={
      idle:new Animation(imgs.idle,96,96,10,8),
      run:new Animation(imgs.run,96,96,16,15),
      attack:new Animation(imgs.attack,96,96,7,15,0,false)
    };
    this.alpha={active:false,time:0,strikeIndex:0,nextStrike:0,cooldown:0,targets:[]};
  }
  reset(){this.x=this.spawnX;this.y=this.spawnY;this.alpha.active=false;}
  nearestTargets(enemies){
    return enemies.filter(e=>!e.dead && Math.hypot(e.x-this.x,e.y-this.y)<=CONFIG.alphaRange)
      .sort((a,b)=>Math.hypot(a.x-this.x,a.y-this.y)-Math.hypot(b.x-this.x,b.y-this.y));
  }
  startAlpha(enemies){
    if(this.alpha.active||this.alpha.cooldown>0)return false;
    const candidates=this.nearestTargets(enemies);
    if(!candidates.length)return false;
    this.alpha.active=true;this.alpha.time=0;this.alpha.strikeIndex=0;this.alpha.nextStrike=0;
    this.alpha.targets=candidates;this.alpha.cooldown=CONFIG.alphaCooldown;
    this.state="alpha";
    return true;
  }
  alphaStrike(enemies,effects){
    let live=this.alpha.targets.filter(e=>!e.dead);
    if(!live.length) live=this.nearestTargets(enemies);
    if(!live.length)return;
    const target=live[this.alpha.strikeIndex%live.length];
    const angle=Math.atan2(target.y-this.y,target.x-this.x);
    this.x=target.x-Math.cos(angle)*18;
    this.y=target.y-Math.sin(angle)*18;
    target.damage(2,this.x,this.y);
    effects.push(new SlashEffect(target.x,target.y,angle,true));
    this.alpha.strikeIndex++;
  }
  update(dt,input,enemies,effects){
    this.attackCooldown=Math.max(0,this.attackCooldown-dt);
    this.alpha.cooldown=Math.max(0,this.alpha.cooldown-dt);

    if(input.tap("q"))this.startAlpha(enemies);

    if(this.alpha.active){
      this.alpha.time+=dt;
      while(this.alpha.strikeIndex<CONFIG.alphaStrikes && this.alpha.time>=this.alpha.nextStrike){
        this.alphaStrike(enemies,effects);
        this.alpha.nextStrike += CONFIG.alphaDuration/CONFIG.alphaStrikes;
      }
      if(this.alpha.time>=CONFIG.alphaDuration){
        this.alpha.active=false;this.state="idle";
      }
      return;
    }

    if(input.tap("a") && this.attackCooldown<=0){
      this.state="attack";this.anim.attack.reset();this.attackCooldown=.42;this.attackHitDone=false;
    }

    if(this.state==="attack" && !this.anim.attack.finished){
      this.anim.attack.update(dt);
      if(!this.attackHitDone && this.anim.attack.frame>=3){
        this.attackHitDone=true;
        const dir=this.facingLeft?-1:1;
        const hitX=this.x+dir*28;
        for(const e of enemies){
          if(e.dead)continue;
          const dx=e.x-hitX,dy=e.y-this.y;
          if(Math.hypot(dx,dy)<43)e.damage(1,this.x,this.y);
        }
        effects.push(new SlashEffect(hitX,this.y-5,this.facingLeft?Math.PI:0,false));
      }
      if(this.anim.attack.finished)this.state="idle";
      return;
    }

    let dx=0,dy=0;
    if(input.held("arrowleft"))dx--;
    if(input.held("arrowright"))dx++;
    if(input.held("arrowup"))dy--;
    if(input.held("arrowdown"))dy++;
    if(dx||dy){
      const l=Math.hypot(dx,dy);dx/=l;dy/=l;
      this.x+=dx*CONFIG.playerSpeed*dt;this.y+=dy*CONFIG.playerSpeed*dt;
      if(dx<0)this.facingLeft=true;if(dx>0)this.facingLeft=false;
      this.state="run";
    }else this.state="idle";
    this.x=Math.max(35,Math.min(CONFIG.worldW-35,this.x));
    this.y=Math.max(35,Math.min(CONFIG.worldH-35,this.y));
    this.anim[this.state].update(dt);
  }
  draw(c,camera){
    if(this.alpha.active)return;
    const p=camera.screen(this.x,this.y);
    c.fillStyle="rgba(0,0,0,.28)";c.beginPath();c.ellipse(p.x,p.y+4,18,7,0,0,Math.PI*2);c.fill();
    this.anim[this.state].draw(c,p.x,p.y,1.35,this.facingLeft);
  }
}

class World {
  constructor(imgs){
    this.imgs=imgs;this.props=[];this.makeProps();
  }
  rand(seed){let s=seed>>>0;return()=>((s=Math.imul(1664525,s)+1013904223>>>0)/4294967296);}
  makeProps(){
    const r=this.rand(98231),cx=CONFIG.worldW/2,cy=CONFIG.worldH/2;
    for(let i=0;i<115;i++){
      const x=50+r()*(CONFIG.worldW-100),y=50+r()*(CONFIG.worldH-100);
      if(Math.hypot(x-cx,y-cy)<170)continue;
      this.props.push({type:r()<.42?"chest":"rock",x,y,frame:Math.floor(r()*4)});
    }
    this.props.sort((a,b)=>a.y-b.y);
  }
  ground(c,camera){
    const startX=Math.floor(camera.x/16)*16,startY=Math.floor(camera.y/16)*16;
    for(let y=startY;y<camera.y+CONFIG.viewH+16;y+=16){
      for(let x=startX;x<camera.x+CONFIG.viewW+16;x+=16){
        const p=camera.screen(x,y);
        c.drawImage(this.imgs.grass,p.x,p.y,16,16);
        const hash=((x*31+y*17)>>4)&31;
        if(hash===0)c.drawImage(this.imgs.plains,0,64,16,16,p.x,p.y,16,16);
        if(hash===7)c.drawImage(this.imgs.decor,16,0,16,16,p.x,p.y,16,16);
      }
    }
  }
  prop(c,camera,o){
    const p=camera.screen(o.x,o.y);
    if(p.x<-40||p.y<-40||p.x>680||p.y>400)return;
    if(o.type==="chest"){
      c.drawImage(this.imgs.chest,o.frame*16,0,16,16,p.x-8,p.y-14,16,16);
    } else {
      c.drawImage(this.imgs.rock,0,0,16,16,p.x-8,p.y-13,16,16);
    }
  }
}

class Game {
  constructor(imgs){
    this.imgs=imgs;this.input=new Input();this.camera=new Camera();this.world=new World(imgs);
    this.player=new Player(imgs);this.effects=[];this.enemies=[];this.last=performance.now();this.fps=60;
    this.spawnEnemies();
  }
  spawnEnemies(){
    const cx=CONFIG.worldW/2,cy=CONFIG.worldH/2;
    const points=[[170,0],[-180,20],[30,155],[-80,-175],[245,90],[-260,-100],[110,-245],[300,-40]];
    this.enemies=points.map((p,i)=>new Enemy(this.imgs.slime,cx+p[0],cy+p[1],i));
  }
  reset(){
    this.player.reset();this.spawnEnemies();this.effects=[];
  }
  update(dt){
    if(this.input.tap("r"))this.reset();
    this.player.update(dt,this.input,this.enemies,this.effects);
    for(const e of this.enemies)e.update(dt,this.player);
    for(const fx of this.effects)fx.update(dt);
    this.effects=this.effects.filter(f=>f.life>0);
    this.camera.follow(this.player,dt);
  }
  draw(){
    this.world.ground(ctx,this.camera);
    const drawables=[];
    for(const o of this.world.props)drawables.push({y:o.y,draw:()=>this.world.prop(ctx,this.camera,o)});
    for(const e of this.enemies)if(!e.dead)drawables.push({y:e.y,draw:()=>e.draw(ctx,this.camera)});
    if(!this.player.alpha.active)drawables.push({y:this.player.y,draw:()=>this.player.draw(ctx,this.camera)});
    drawables.sort((a,b)=>a.y-b.y);
    for(const d of drawables)d.draw();
    for(const f of this.effects)f.draw(ctx,this.camera);
    this.hud();
  }
  hud(){
    const alive=this.enemies.filter(e=>!e.dead).length;
    ctx.fillStyle="rgba(8,14,9,.84)";ctx.fillRect(8,8,202,67);
    ctx.strokeStyle="rgba(210,235,182,.45)";ctx.strokeRect(8.5,8.5,201,66);
    ctx.fillStyle="#eef5d8";ctx.font="bold 10px monospace";ctx.fillText("PROJECT RONIN  v0.2.0",16,23);
    ctx.font="9px monospace";ctx.fillStyle="#b8d5a1";
    ctx.fillText(`ENEMIES  ${alive}`,16,39);
    ctx.fillText(`A ATTACK  ${this.player.attackCooldown>0?this.player.attackCooldown.toFixed(1):"READY"}`,16,52);
    const q=this.player.alpha.cooldown>0?this.player.alpha.cooldown.toFixed(1):"READY";
    ctx.fillText(`Q ALPHA   ${q}`,16,65);
    if(this.player.alpha.active){
      ctx.fillStyle="rgba(235,240,202,.16)";ctx.fillRect(0,0,CONFIG.viewW,CONFIG.viewH);
      ctx.fillStyle="#f4f0c7";ctx.font="bold 13px monospace";ctx.fillText("ALPHA STRIKE",CONFIG.viewW/2-48,28);
    }
  }
  loop=(t)=>{
    const dt=Math.min((t-this.last)/1000,.05);this.last=t;
    this.fps+=(1/Math.max(dt,.001)-this.fps)*.08;
    this.update(dt);this.draw();this.input.end();
    requestAnimationFrame(this.loop);
  }
  start(){loading.classList.add("hidden");requestAnimationFrame(this.loop);}
}

const manifest={
  idle:"assets/player/idle.png",
  run:"assets/player/run.png",
  attack:"assets/player/attack.png",
  slime:"assets/enemies/slime.png",
  grass:"assets/tiles/grass.png",
  plains:"assets/tiles/plains.png",
  decor:"assets/tiles/decor.png",
  chest:"assets/objects/chest.png",
  rock:"assets/objects/rock.png"
};

(async()=>{
  try{
    const imgs=await new Assets(manifest).load();
    new Game(imgs).start();
  }catch(e){
    console.error(e);loadingText.textContent=e.message;
  }
})();
