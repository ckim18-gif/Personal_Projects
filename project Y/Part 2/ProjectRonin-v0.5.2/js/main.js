
"use strict";
const C={W:640,H:360,WW:2304,WH:1536,PS:155,AR:48,QCD:16,WCD:9,ECD:13,RCD:35,SPAWN:2.1,MAXE:34};
const canvas=document.querySelector("#game"),ctx=canvas.getContext("2d",{alpha:false});
ctx.imageSmoothingEnabled=false;
const loading=document.querySelector("#loading"),loadingText=document.querySelector("#loadingText");

class AssetLoader{
  constructor(manifest){this.manifest=manifest;this.images={}}
  async load(){
    const entries=Object.entries(this.manifest);let done=0;
    await Promise.all(entries.map(([key,src])=>new Promise(resolve=>{
      const img=new Image();
      const finish=()=>{done++;loadingText.textContent=`에셋 ${done}/${entries.length}`;resolve()};
      img.onload=()=>{this.images[key]=img;finish()};
      img.onerror=()=>{console.error("Asset failed:",src);const fallback=document.createElement("canvas");fallback.width=1;fallback.height=1;this.images[key]=fallback;finish()};
      img.src=src;
    })));
    return this.images;
  }
}

class AudioSystem{
  constructor(){this.base={};this.loops={};this.unlocked=false}
  add(key,src,volume=.5,loop=false){const a=new Audio(src);a.volume=volume;a.loop=loop;this.base[key]=a}
  unlock(){if(this.unlocked)return;this.unlocked=true;this.playLoop("bgm")}
  play(key){this.unlock();const a=this.base[key];if(!a)return;const b=a.cloneNode();b.volume=a.volume;b.play().catch(()=>{})}
  playLoop(key){this.unlock();if(this.loops[key])return;const src=this.base[key];if(!src)return;const a=src.cloneNode();a.loop=true;a.volume=src.volume;this.loops[key]=a;a.play().catch(()=>{})}
  stopLoop(key){const a=this.loops[key];if(!a)return;a.pause();a.currentTime=0;delete this.loops[key]}
  stopAllSkills(){this.stopLoop("meditate");this.stopLoop("ultimate")}
}

class Input{
  constructor(audio){this.down=new Set();this.pressed=new Set();
    addEventListener("keydown",e=>{audio.unlock();const k=e.key.toLowerCase();if(!this.down.has(k))this.pressed.add(k);this.down.add(k);if(["arrowup","arrowdown","arrowleft","arrowright","a","q","w","e","r","f","1","2","3"].includes(k))e.preventDefault()});
    addEventListener("keyup",e=>this.down.delete(e.key.toLowerCase()));
    addEventListener("pointerdown",()=>audio.unlock());
  }
  held(k){return this.down.has(k)} tap(k){return this.pressed.has(k)} end(){this.pressed.clear()}
}

class Camera{
  constructor(){this.x=0;this.y=0}
  follow(p,dt){const s=1-Math.exp(-9*dt);this.x+=(p.x-C.W/2-this.x)*s;this.y+=(p.y-C.H/2-this.y)*s;this.x=Math.max(0,Math.min(C.WW-C.W,this.x));this.y=Math.max(0,Math.min(C.WH-C.H,this.y))}
  screen(x,y){return{x:Math.round(x-this.x),y:Math.round(y-this.y)}}
}

class Anim{
  constructor(img,fw,fh,count,fps,loop=true){Object.assign(this,{img,fw,fh,count,fps,loop});this.reset()}
  reset(){this.frame=0;this.time=0;this.finished=false}
  update(dt,speed=1){if(this.finished)return;this.time+=dt*speed;while(this.time>=1/this.fps){this.time-=1/this.fps;this.frame++;if(this.frame>=this.count){if(this.loop)this.frame=0;else{this.frame=this.count-1;this.finished=true}}}}
  draw(c,x,y,scale=1,flip=false,alpha=1){c.save();c.globalAlpha=alpha;c.translate(Math.round(x),Math.round(y));if(flip)c.scale(-1,1);const w=this.fw*scale,h=this.fh*scale;c.drawImage(this.img,this.frame*this.fw,0,this.fw,this.fh,-w/2,-h*.78,w,h);c.restore()}
}

class SheetFX{
  constructor(img,fw,fh,count,x,y,scale=1,duration=.4,flip=false){Object.assign(this,{img,fw,fh,count,x,y,scale,duration,flip});this.life=duration}
  update(dt){this.life-=dt}
  draw(c,cam){const p=cam.screen(this.x,this.y),progress=Math.max(0,Math.min(1,1-this.life/this.duration)),fr=Math.min(this.count-1,Math.floor(progress*this.count));c.save();c.translate(p.x,p.y);if(this.flip)c.scale(-1,1);c.globalAlpha=Math.max(0,Math.min(1,this.life/.06));c.drawImage(this.img,fr*this.fw,0,this.fw,this.fh,-this.fw*this.scale/2,-this.fh*this.scale/2,this.fw*this.scale,this.fh*this.scale);c.restore()}
}

class Coin{
  constructor(x,y){this.x=x;this.y=y;this.phase=Math.random()*6.28;this.dead=false}
  update(dt,p,a){this.phase+=dt*4;if(Math.hypot(p.x-this.x,p.y-this.y)<20){this.dead=true;p.gold++;a.play("coin")}}
  draw(c,cam){const p=cam.screen(this.x,this.y),bob=Math.sin(this.phase)*2;c.fillStyle="#f7cf4a";c.beginPath();c.arc(p.x,p.y-5+bob,3.5,0,Math.PI*2);c.fill();c.strokeStyle="#9e6d18";c.stroke()}
}

class Enemy{
  constructor(type,imgs,x,y,level=1){
    this.type=type;this.x=x;this.y=y;this.dead=false;this.rewarded=false;this.flash=0;this.state="move";this.attackTimer=0;this.hitApplied=false;
    const cfg={
      slime:{hp:5,speed:43,range:22,windup:.32,recovery:.42,damage:8,scale:1.25,move:[imgs.slime,32,32,4,6],idle:[imgs.slime,32,32,4,6],attack:[imgs.slime,32,32,4,8]},
      archer:{hp:8,speed:37,range:125,windup:.55,recovery:.55,damage:9,scale:.28,move:[imgs.archer,192,192,4,7],idle:[imgs.archerIdle,192,192,6,7],attack:[imgs.archerAttack,192,192,8,11]},
      lancer:{hp:12,speed:50,range:33,windup:.38,recovery:.48,damage:12,scale:.24,move:[imgs.lancer,320,320,6,8],idle:[imgs.lancerIdle,320,320,12,8],attack:[imgs.lancerAttack,320,320,3,8]},
      boss:{hp:48,speed:34,range:42,windup:.55,recovery:.7,damage:18,scale:1.05,move:[imgs.boss,120,80,10,8],idle:[imgs.bossIdle,120,80,10,7],attack:[imgs.bossAttack,120,80,4,7]}
    }[type];
    Object.assign(this,cfg);this.maxHp=this.hp+level;this.hp=this.maxHp;
    this.anims={move:new Anim(...cfg.move,true),idle:new Anim(...cfg.idle,true),attack:new Anim(...cfg.attack,false)};
  }
  damage(n){if(this.dead)return false;this.hp-=n;this.flash=.12;if(this.hp<=0)this.dead=true;return true}
  startAttack(){this.state="attack";this.attackTimer=0;this.hitApplied=false;this.anims.attack.reset()}
  update(dt,p){
    if(this.dead)return;this.flash=Math.max(0,this.flash-dt);
    const dx=p.x-this.x,dy=p.y-this.y,d=Math.hypot(dx,dy)||1;
    if(this.state==="attack"){
      this.attackTimer+=dt;this.anims.attack.update(dt);
      if(!this.hitApplied&&this.attackTimer>=this.windup){
        this.hitApplied=true;
        if(Math.hypot(p.x-this.x,p.y-this.y)<=this.range+8)p.hurt(this.damage);
      }
      if(this.attackTimer>=this.windup+this.recovery){this.state="move";this.anims.attack.reset()}
      return;
    }
    if(d<=this.range){this.startAttack();return}
    this.state="move";this.anims.move.update(dt);
    if(this.type==="archer"&&d<85){this.x-=dx/d*this.speed*.45*dt;this.y-=dy/d*this.speed*.45*dt}
    else{this.x+=dx/d*this.speed*dt;this.y+=dy/d*this.speed*dt}
  }
  draw(c,cam){
    if(this.dead)return;const p=cam.screen(this.x,this.y);c.save();c.globalAlpha=this.flash>0?.48:1;
    this.anims[this.state==="attack"?"attack":"move"].draw(c,p.x,p.y,this.scale,false);c.restore();
    const w=this.type==="boss"?70:28,y=p.y-(this.type==="boss"?47:24);c.fillStyle="#25120f";c.fillRect(p.x-w/2,y,w,4);c.fillStyle=this.type==="boss"?"#b24cf0":"#dc5d48";c.fillRect(p.x-w/2,y,w*this.hp/this.maxHp,4);
  }
}

class Player{
  constructor(i,a){
    this.i=i;this.audio=a;this.x=C.WW/2;this.y=C.WH/2;this.hp=100;this.maxHp=100;this.gold=0;this.xp=0;this.need=35;this.level=1;this.atk=1;this.left=false;this.state="idle";this.inv=0;this.attackHit=false;this.med=false;this.medTime=0;this.medFxTime=0;
    this.q={open:false,cd:0,on:false,t:0,count:0};this.w={open:false,cd:0};this.e={open:false,cd:0,on:false,t:0};this.r={open:false,cd:0,on:false,t:0};this.choices=[];
    this.anims={idle:new Anim(i.idle,96,96,10,8,true),run:new Anim(i.run,96,96,16,15,true),attack:new Anim(i.attack,96,96,7,15,false)};
  }
  hurt(n){if(this.inv>0||this.q.on)return;this.hp=Math.max(0,this.hp-n);this.inv=.35;if(this.med)this.stopMeditation()}
  reward(g,x){this.gold+=g;this.xp+=x;if(this.xp>=this.need){this.xp-=this.need;this.level++;this.need=Math.floor(this.need*1.3+8);this.makeChoices();this.audio.play("level")}}
  makeChoices(){let p=[];for(const [k,n] of [["q","알파 스트라이크"],["w","명상"],["e","우주류 검술"],["r","최후의 전사"]])p.push({id:k,n:(this[k].open?"강화: ":"해금: ")+n});p.push({id:"hp",n:"체력 +20"},{id:"atk",n:"평타 피해 +1"});p.sort(()=>Math.random()-.5);this.choices=p.slice(0,3)}
  choose(n){const c=this.choices[n];if(!c)return;if("qwer".includes(c.id))this[c.id].open=true;else if(c.id==="hp"){this.maxHp+=20;this.hp+=20}else this.atk++;this.choices=[]}
  startAttack(){if(this.state==="attack"||this.med||this.q.on)return;this.state="attack";this.attackHit=false;this.anims.attack.reset();this.audio.play("attack")}
  stopMeditation(){this.med=false;this.medTime=0;this.medFxTime=0;this.audio.stopLoop("meditate");if(this.state==="meditate")this.state="idle"}
  startMeditation(){if(!this.w.open||this.w.cd>0||this.q.on)return;this.state="meditate";this.anims.attack.reset();this.med=true;this.medTime=0;this.medFxTime=0;this.w.cd=C.WCD;this.audio.playLoop("meditate")}
  basicHit(es){const range=C.AR+(this.r.on?22:0);for(const e of es)if(!e.dead&&Math.hypot(e.x-this.x,e.y-this.y)<=range){e.damage(this.atk+(this.e.on?3:0));this.q.cd=Math.max(0,this.q.cd-2)}}
  startQ(es){if(!this.q.open||this.q.cd>0||this.med)return;const targets=es.filter(e=>!e.dead&&Math.hypot(e.x-this.x,e.y-this.y)<290);if(!targets.length)return;this.state="alpha";this.q.cd=C.QCD;this.q.on=true;this.q.t=0;this.q.count=0;this.audio.play("alpha")}
  update(dt,input,es,fx){
    this.inv=Math.max(0,this.inv-dt);for(const k of "qwer")this[k].cd=Math.max(0,this[k].cd-dt);
    if(this.e.on&&(this.e.t-=dt)<=0)this.e.on=false;
    if(this.r.on&&(this.r.t-=dt)<=0){this.r.on=false;this.audio.stopLoop("ultimate")}
    if(input.tap("q"))this.startQ(es);
    if(input.tap("w"))this.med?this.stopMeditation():this.startMeditation();
    if(input.tap("e")&&this.e.open&&this.e.cd<=0&&!this.med){this.e.cd=C.ECD;this.e.on=true;this.e.t=5;fx.push(new SheetFX(this.i.circle,16,32,8,this.x,this.y,2.5,.55))}
    if(input.tap("r")&&this.r.open&&this.r.cd<=0&&!this.med){this.r.cd=C.RCD;this.r.on=true;this.r.t=9;this.audio.playLoop("ultimate");fx.push(new SheetFX(this.i.aura,64,64,8,this.x,this.y,1.4,.7))}
    if(this.q.on){
      this.q.t+=dt;
      while(this.q.count<4&&this.q.t>=this.q.count*.2){
        const ts=es.filter(e=>!e.dead&&Math.hypot(e.x-this.x,e.y-this.y)<290);
        if(ts.length){const t=ts[this.q.count%ts.length],ang=Math.atan2(t.y-this.y,t.x-this.x);this.x=t.x-Math.cos(ang)*18;this.y=t.y-Math.sin(ang)*18;t.damage(2);const imgs=[this.i.a1,this.i.a2,this.i.a3,this.i.a4];fx.push(new SheetFX(imgs[this.q.count%4],32,32,4,t.x,t.y,1.7,.28,this.q.count%2===1))}
        this.q.count++;
      }
      if(this.q.t>=.8){this.q.on=false;this.state="idle"}return;
    }
    if(this.med){
      this.medTime+=dt;this.medFxTime+=dt;this.hp=Math.min(this.maxHp,this.hp+14*dt);
      if(this.medTime>=3||input.held("arrowup")||input.held("arrowdown")||input.held("arrowleft")||input.held("arrowright")||input.tap("a")||input.tap("e")||input.tap("r"))this.stopMeditation();
      return;
    }
    if(input.tap("a"))this.startAttack();
    if(this.state==="attack"){
      const speed=this.r.on?1.6:1;this.anims.attack.update(dt,speed);
      if(!this.attackHit&&this.anims.attack.frame>=3){this.attackHit=true;this.basicHit(es)}
      if(this.anims.attack.finished){this.state="idle";this.anims.attack.reset()}
      return;
    }
    let dx=0,dy=0;if(input.held("arrowleft"))dx--;if(input.held("arrowright"))dx++;if(input.held("arrowup"))dy--;if(input.held("arrowdown"))dy++;
    if(dx||dy){const l=Math.hypot(dx,dy),sp=C.PS*(this.r.on?1.45:1);dx/=l;dy/=l;this.x+=dx*sp*dt;this.y+=dy*sp*dt;if(dx<0)this.left=true;if(dx>0)this.left=false;this.state="run";this.anims.run.update(dt)}
    else{this.state="idle";this.anims.idle.update(dt)}
    this.x=Math.max(35,Math.min(C.WW-35,this.x));this.y=Math.max(35,Math.min(C.WH-35,this.y));
  }
  drawMeditation(c,cam){
    const p=cam.screen(this.x,this.y),t=this.medFxTime;
    const drawStrip=(img,fw,fh,count,scale,offsetY,speed)=>{
      const frame=Math.floor(t*speed)%count;c.drawImage(img,frame*fw,0,fw,fh,p.x-fw*scale/2,p.y+offsetY-fh*scale/2,fw*scale,fh*scale);
    };
    drawStrip(this.i.med1,72,72,8,1.15,-8,10);
    drawStrip(this.i.med2,8,13,9,1.8,-13,12);
    drawStrip(this.i.med3,8,7,9,1.8,12,14);
  }
  draw(c,cam){
    if(this.q.on)return;const p=cam.screen(this.x,this.y);
    if(this.r.on)c.drawImage(this.i.spirit,0,0,64,64,p.x-48,p.y-58,96,96);
    if(this.med)this.drawMeditation(c,cam);
    let anim=this.anims.idle;if(this.state==="run")anim=this.anims.run;if(this.state==="attack")anim=this.anims.attack;
    anim.draw(c,p.x,p.y,1.35,this.left,this.inv>0?.55:1);
    if(this.e.on){c.save();c.strokeStyle="#68c6ff";c.lineWidth=4;c.shadowColor="#3d8cff";c.shadowBlur=8;c.beginPath();c.moveTo(p.x+(this.left?-14:14),p.y-31);c.lineTo(p.x+(this.left?-34:34),p.y+1);c.stroke();c.restore()}
  }
}

class Game{
  constructor(i){
    this.i=i;this.audio=new AudioSystem();
    this.audio.add("bgm","assets/audio/bgm.ogg",.32,true);this.audio.add("attack","assets/audio/attack.wav",.55);this.audio.add("alpha","assets/audio/alpha.wav",.65);this.audio.add("meditate","assets/audio/meditate.wav",.5,true);this.audio.add("ultimate","assets/audio/ultimate.wav",.65,true);this.audio.add("level","assets/audio/levelup.wav",.6);this.audio.add("coin","assets/audio/coin.wav",.35);
    this.input=new Input(this.audio);this.cam=new Camera();this.p=new Player(i,this.audio);this.es=[];this.fx=[];this.coins=[];this.spawnT=0;this.kills=0;this.last=performance.now();
    this.bed={x:C.WW/2+120,y:C.WH/2+60};this.shop=false;
    this.buildings=[
      {img:i.castle,x:380,y:330,w:160,h:128},{img:i.monastery,x:1890,y:330,w:96,h:160},{img:i.barracks,x:430,y:1220,w:96,h:128},
      {img:i.archery,x:1830,y:1190,w:96,h:128},{img:i.tower,x:1120,y:260,w:64,h:128},{img:i.house1,x:840,y:430,w:64,h:96},
      {img:i.house2,x:1450,y:470,w:64,h:96},{img:i.house3,x:930,y:1190,w:64,h:96}
    ];
    for(let n=0;n<8;n++)this.spawn();for(let n=0;n<24;n++)this.coins.push(new Coin(100+Math.random()*(C.WW-200),100+Math.random()*(C.WH-200)));
  }
  spawn(){if(this.es.filter(e=>!e.dead).length>=C.MAXE)return;let type=Math.random()<.45?"slime":Math.random()<.55?"archer":"lancer";if(this.kills>0&&this.kills%15===0&&!this.es.some(e=>!e.dead&&e.type==="boss"))type="boss";const a=Math.random()*6.28,d=230+Math.random()*170,x=Math.max(40,Math.min(C.WW-40,this.p.x+Math.cos(a)*d)),y=Math.max(40,Math.min(C.WH-40,this.p.y+Math.sin(a)*d));this.es.push(new Enemy(type,this.i,x,y,this.p.level))}
  update(dt){
    if(this.p.choices.length){if(this.input.tap("1"))this.p.choose(0);if(this.input.tap("2"))this.p.choose(1);if(this.input.tap("3"))this.p.choose(2);return}
    if(this.shop){if(this.input.tap("f"))this.shop=false;return}
    if(this.input.tap("f")&&Math.hypot(this.p.x-this.bed.x,this.p.y-this.bed.y)<55){this.shop=true;this.p.stopMeditation();return}
    this.spawnT+=dt;if(this.spawnT>C.SPAWN){this.spawnT=0;this.spawn()}
    this.p.update(dt,this.input,this.es,this.fx);for(const e of this.es)e.update(dt,this.p);for(const f of this.fx)f.update(dt);for(const c of this.coins)c.update(dt,this.p,this.audio);
    this.fx=this.fx.filter(f=>f.life>0);this.coins=this.coins.filter(c=>!c.dead);
    for(const e of this.es)if(e.dead&&!e.rewarded){e.rewarded=true;this.kills++;this.p.reward(e.type==="boss"?30:e.type==="lancer"?7:5,e.type==="boss"?35:10);if(Math.random()<.7)this.coins.push(new Coin(e.x,e.y))}
    this.cam.follow(this.p,dt);if(this.p.hp<=0){this.audio.stopAllSkills();location.reload()}
  }
  drawGround(){
    const sx=Math.floor(this.cam.x/16)*16,sy=Math.floor(this.cam.y/16)*16;
    for(let y=sy;y<this.cam.y+C.H+16;y+=16)for(let x=sx;x<this.cam.x+C.W+16;x+=16){
      const p=this.cam.screen(x,y);ctx.drawImage(this.i.grass,p.x,p.y,16,16);
      const h=((x*31+y*17)>>4)&31;
      if(h===0)ctx.drawImage(this.i.plains,0,64,16,16,p.x,p.y,16,16);
      if(h===5||h===19)ctx.drawImage(this.i.decor,16,0,16,16,p.x,p.y,16,16);
    }
  }
  draw(){
    this.drawGround();
    for(const c of this.coins)c.draw(ctx,this.cam);
    const entities=[];
    for(const b of this.buildings)entities.push({y:b.y,draw:()=>{const p=this.cam.screen(b.x,b.y);ctx.drawImage(b.img,p.x-b.w/2,p.y-b.h,b.w,b.h)}});
    const bp=this.cam.screen(this.bed.x,this.bed.y);entities.push({y:this.bed.y,draw:()=>ctx.drawImage(this.i.bed,0,0,64,52,bp.x-32,bp.y-42,64,52)});
    for(const e of this.es)if(!e.dead)entities.push({y:e.y,draw:()=>e.draw(ctx,this.cam)});
    entities.push({y:this.p.y,draw:()=>this.p.draw(ctx,this.cam)});entities.sort((a,b)=>a.y-b.y);for(const e of entities)e.draw();
    if(Math.hypot(this.p.x-this.bed.x,this.p.y-this.bed.y)<55){ctx.fillStyle="#fff";ctx.font="9px monospace";ctx.fillText("F 상점",bp.x-18,bp.y-50)}
    for(const f of this.fx)f.draw(ctx,this.cam);this.hud();if(this.shop)this.shopUI();if(this.p.choices.length)this.levelUI();
  }
  skill(x,key,s,img,cd){ctx.fillStyle="#111913";ctx.fillRect(x,309,42,42);ctx.drawImage(img,x+3,312,36,36);if(!s.open){ctx.fillStyle="rgba(0,0,0,.78)";ctx.fillRect(x,309,42,42)}else if(s.cd>0){ctx.fillStyle="rgba(0,0,0,.62)";ctx.fillRect(x,309,42,42*Math.min(1,s.cd/cd));ctx.fillStyle="#fff";ctx.font="9px monospace";ctx.fillText(s.cd.toFixed(1),x+8,334)}ctx.strokeStyle="#b7c99e";ctx.strokeRect(x+.5,309.5,41,41);ctx.fillStyle="#fff";ctx.font="bold 9px monospace";ctx.fillText(key,x+3,319)}
  hud(){ctx.fillStyle="rgba(8,14,9,.9)";ctx.fillRect(112,286,416,70);ctx.drawImage(this.i.barBase,122,290,174,35);ctx.drawImage(this.i.barFill,128,298,Math.floor(156*this.p.hp/this.p.maxHp),12);ctx.fillStyle="#fff";ctx.font="8px monospace";ctx.fillText(`HP ${Math.ceil(this.p.hp)}/${this.p.maxHp}`,134,307);ctx.fillText(`LV ${this.p.level}  XP ${this.p.xp}/${this.p.need}  G ${this.p.gold}`,128,330);this.skill(310,"Q",this.p.q,this.i.sq,16);this.skill(354,"W",this.p.w,this.i.sw,9);this.skill(398,"E",this.p.e,this.i.se,13);this.skill(442,"R",this.p.r,this.i.sr,35)}
  shopUI(){ctx.fillStyle="rgba(3,6,5,.86)";ctx.fillRect(0,0,C.W,C.H);ctx.fillStyle="#e8efd0";ctx.font="bold 18px monospace";ctx.textAlign="center";ctx.fillText("침대 상점",C.W/2,92);ctx.font="10px monospace";ctx.fillText("아이템 입고 준비 중",C.W/2,120);ctx.fillText(`보유 골드: ${this.p.gold}`,C.W/2,145);ctx.fillText("F 키로 닫기",C.W/2,210);ctx.textAlign="left"}
  levelUI(){ctx.fillStyle="rgba(3,6,5,.86)";ctx.fillRect(0,0,C.W,C.H);ctx.fillStyle="#fff";ctx.font="bold 18px monospace";ctx.textAlign="center";ctx.fillText(`LEVEL ${this.p.level}`,320,80);this.p.choices.forEach((o,i)=>{const x=95+i*155;ctx.fillStyle="#132017";ctx.fillRect(x,125,140,100);ctx.strokeStyle="#afca8b";ctx.strokeRect(x+.5,125.5,139,99);ctx.fillText(`${i+1}`,x+70,150);ctx.font="10px monospace";ctx.fillText(o.n,x+70,185);ctx.font="bold 18px monospace"});ctx.textAlign="left"}
  loop=(t)=>{const dt=Math.min((t-this.last)/1000,.05);this.last=t;this.update(dt);this.draw();this.input.end();requestAnimationFrame(this.loop)}
  start(){loading.classList.add("hidden");requestAnimationFrame(this.loop)}
}

const M={
 idle:"assets/player/idle.png",run:"assets/player/run.png",attack:"assets/player/attack.png",
 slime:"assets/enemies/slime.png",archer:"assets/enemies/archer.png",archerIdle:"assets/enemies/archer_idle.png",archerAttack:"assets/enemies/archer_attack.png",
 lancer:"assets/enemies/lancer.png",lancerIdle:"assets/enemies/lancer_idle.png",lancerAttack:"assets/enemies/lancer_attack.png",
 boss:"assets/enemies/middle_boss.png",bossIdle:"assets/enemies/boss_idle.png",bossAttack:"assets/enemies/boss_attack.png",
 grass:"assets/tiles/grass.png",plains:"assets/tiles/plains.png",decor:"assets/tiles/decor.png",bed:"assets/objects/bed.png",
 a1:"assets/fx/alpha_1.png",a2:"assets/fx/alpha_2.png",a3:"assets/fx/alpha_3.png",a4:"assets/fx/alpha_4.png",circle:"assets/fx/circle.png",spirit:"assets/fx/spirit.png",aura:"assets/fx/aura.png",
 med1:"assets/fx/meditate/meditate1.png",med2:"assets/fx/meditate/meditate2.png",med3:"assets/fx/meditate/meditate3.png",
 castle:"assets/buildings/castle.png",house1:"assets/buildings/house1.png",house2:"assets/buildings/house2.png",house3:"assets/buildings/house3.png",monastery:"assets/buildings/monastery.png",tower:"assets/buildings/tower.png",archery:"assets/buildings/archery.png",barracks:"assets/buildings/barracks.png",
 barBase:"assets/ui/bar_base.png",barFill:"assets/ui/bar_fill.png",sq:"assets/skills/q.png",sw:"assets/skills/w.png",se:"assets/skills/e.png",sr:"assets/skills/r.png"
};
(async()=>{try{new Game(await new AssetLoader(M).load()).start()}catch(e){console.error(e);loadingText.textContent=e.message}})();
