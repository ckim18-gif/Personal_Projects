
"use strict";
const C={W:640,H:360,WW:2304,WH:1536,PS:155,AR:48,SPAWN:2.15,MAXE:36};
const V={x:702,y:420,w:900,h:650,gateX:1152,gateW:120};
const canvas=document.querySelector("#game"),ctx=canvas.getContext("2d",{alpha:false}),loading=document.querySelector("#loading"),loadingText=document.querySelector("#loadingText");
ctx.imageSmoothingEnabled=false;

class Loader{
 constructor(m){this.m=m;this.i={}}
 async load(){let n=0,e=Object.entries(this.m);await Promise.all(e.map(([k,s])=>new Promise(ok=>{let im=new Image;let end=()=>{loadingText.textContent=`에셋 ${++n}/${e.length}`;ok()};im.onload=()=>{this.i[k]=im;end()};im.onerror=()=>{console.error("asset",s);let c=document.createElement("canvas");c.width=c.height=1;this.i[k]=c;end()};im.src=s})));return this.i}
}
class AudioSys{
 constructor(){this.b={};this.l={};this.ready=false}
 add(k,s,v=.5,loop=false){let a=new Audio(s);a.volume=v;a.loop=loop;this.b[k]=a}
 unlock(){if(this.ready)return;this.ready=true;this.playLoop("bgm")}
 play(k){this.unlock();let a=this.b[k];if(!a)return;let c=a.cloneNode();c.volume=a.volume;c.play().catch(()=>{})}
 playLoop(k){let src=this.b[k];if(!src||this.l[k])return;let c=src.cloneNode();c.loop=true;c.volume=src.volume;this.l[k]=c;c.play().catch(()=>{})}
 stopLoop(k){let a=this.l[k];if(a){a.pause();a.currentTime=0;delete this.l[k]}}
}
class Input{
 constructor(audio){this.d=new Set;this.p=new Set;this.vx=0;this.vy=0;
  addEventListener("keydown",e=>{audio.unlock();let k=e.key.toLowerCase();if(!this.d.has(k))this.p.add(k);this.d.add(k);if(["arrowup","arrowdown","arrowleft","arrowright","a","q","w","e","r","f","1","2","3"].includes(k))e.preventDefault()});
  addEventListener("keyup",e=>this.d.delete(e.key.toLowerCase()));addEventListener("pointerdown",()=>audio.unlock());
  this.setupMobile();
 }
 tap(k){return this.p.has(k)} held(k){return this.d.has(k)}
 press(k){this.p.add(k)}
 setupMobile(){
  const joy=document.querySelector("#joystick"),stick=document.querySelector("#stick");if(!joy)return;
  let active=false,id=null;
  const move=e=>{if(!active)return;let r=joy.getBoundingClientRect(),x=e.clientX-(r.left+r.width/2),y=e.clientY-(r.top+r.height/2),len=Math.hypot(x,y)||1,max=36,cl=Math.min(max,len);this.vx=x/len*(cl/max);this.vy=y/len*(cl/max);stick.style.transform=`translate(${this.vx*34}px,${this.vy*34}px)`};
  joy.addEventListener("pointerdown",e=>{active=true;id=e.pointerId;joy.setPointerCapture(id);move(e)});
  joy.addEventListener("pointermove",move);let stop=()=>{active=false;this.vx=this.vy=0;stick.style.transform="translate(0,0)"};joy.addEventListener("pointerup",stop);joy.addEventListener("pointercancel",stop);
  document.querySelectorAll("#mobileButtons button").forEach(b=>b.addEventListener("pointerdown",e=>{e.preventDefault();let m={attack:"a",q:"q",w:"w",e:"e",r:"r",interact:"f",item1:"1",item2:"2",item3:"3"};this.press(m[b.dataset.action])}));
 }
 vector(){let x=this.vx,y=this.vy;if(this.held("arrowleft"))x=-1;if(this.held("arrowright"))x=1;if(this.held("arrowup"))y=-1;if(this.held("arrowdown"))y=1;let l=Math.hypot(x,y);return l>1?{x:x/l,y:y/l}:{x,y}}
 end(){this.p.clear()}
}
class Cam{constructor(){this.x=0;this.y=0}follow(p,dt){let s=1-Math.exp(-9*dt);this.x+=(p.x-C.W/2-this.x)*s;this.y+=(p.y-C.H/2-this.y)*s;this.x=Math.max(0,Math.min(C.WW-C.W,this.x));this.y=Math.max(0,Math.min(C.WH-C.H,this.y))}s(x,y){return{x:Math.round(x-this.x),y:Math.round(y-this.y)}}}
class Anim{constructor(img,fw,fh,n,f,loop=true){Object.assign(this,{img,fw,fh,n,f,loop});this.reset()}reset(){this.fr=0;this.t=0;this.done=false}u(dt,sp=1){if(this.done)return;this.t+=dt*sp;while(this.t>=1/this.f){this.t-=1/this.f;if(++this.fr>=this.n){if(this.loop)this.fr=0;else{this.fr=this.n-1;this.done=true}}}}d(c,x,y,sc=1,flip=false,a=1){c.save();c.globalAlpha=a;c.translate(Math.round(x),Math.round(y));if(flip)c.scale(-1,1);let w=this.fw*sc,h=this.fh*sc;c.drawImage(this.img,this.fr*this.fw,0,this.fw,this.fh,-w/2,-h*.78,w,h);c.restore()}}
class FX{
 constructor(img,fw,fh,n,x,y,sc=1,d=.35,flip=false){Object.assign(this,{img,fw,fh,n,x,y,sc,d,flip});this.life=d}
 u(dt){this.life-=dt}
 d0(c,cam){let p=cam.s(this.x,this.y),f=Math.min(this.n-1,Math.max(0,Math.floor((1-this.life/this.d)*this.n)));c.save();c.translate(p.x,p.y);if(this.flip)c.scale(-1,1);c.globalAlpha=Math.max(0,Math.min(1,this.life/.06));c.drawImage(this.img,f*this.fw,0,this.fw,this.fh,-this.fw*this.sc/2,-this.fh*this.sc/2,this.fw*this.sc,this.fh*this.sc);c.restore()}
}
class ArrayFX{
 constructor(arr,x,y,sc=1,d=.5){Object.assign(this,{arr,x,y,sc,d});this.life=d}
 u(dt){this.life-=dt}
 d0(c,cam){let p=cam.s(this.x,this.y),i=Math.min(this.arr.length-1,Math.floor((1-this.life/this.d)*this.arr.length)),im=this.arr[Math.max(0,i)];c.save();c.globalAlpha=Math.max(0,this.life/.08);c.drawImage(im,p.x-im.width*this.sc/2,p.y-im.height*this.sc/2,im.width*this.sc,im.height*this.sc);c.restore()}
}
function inVillage(x,y){return x>V.x&&x<V.x+V.w&&y>V.y&&y<V.y+V.h}
function inGate(x,y){return y>V.y+V.h-35&&x>V.gateX-V.gateW/2&&x<V.gateX+V.gateW/2}

class Projectile{
 constructor(img,x,y,vx,vy,damage,cc=false){Object.assign(this,{img,x,y,vx,vy,damage,cc});this.dead=false;this.life=3;this.a=Math.atan2(vy,vx)}
 u(dt,p){this.x+=this.vx*dt;this.y+=this.vy*dt;this.life-=dt;if(this.life<=0||inVillage(this.x,this.y)){this.dead=true;return}if(Math.hypot(this.x-p.x,this.y-p.y)<14){p.hurt(this.damage);if(this.cc)p.stun=Math.max(p.stun,1.15);this.dead=true}}
 d(c,cam){let p=cam.s(this.x,this.y);c.save();c.translate(p.x,p.y);c.rotate(this.a);if(this.cc){c.fillStyle="#b46cff";c.beginPath();c.arc(0,0,7,0,Math.PI*2);c.fill()}else c.drawImage(this.img,-16,-16,32,32);c.restore()}
}
class NPC{constructor(img,x,y,name){this.x=x;this.y=y;this.name=name;this.a=new Anim(img,16,16,4,6)}u(dt){this.a.u(dt)}d(c,cam){let p=cam.s(this.x,this.y);this.a.d(c,p.x,p.y,2,false);c.fillStyle="#f1eed1";c.font="8px sans-serif";c.textAlign="center";c.fillText(this.name,p.x,p.y-28);c.textAlign="left"}}

class Enemy{
 constructor(type,i,x,y,l=1){this.type=type;this.x=x;this.y=y;this.dead=false;this.rewarded=false;this.state="move";this.attackTime=0;this.hitDone=false;this.left=false;this.frozen=0;
  let q={
   slime:{hp:5,sp:43,r:22,wind:.32,rec:.42,power:8,sc:1.25,m:[i.slime,32,32,4,6],a:[i.slime,32,32,4,8]},
   archer:{hp:8,sp:37,r:145,wind:.52,rec:.65,power:9,sc:.28,m:[i.archer,192,192,4,7],a:[i.archerAttack,192,192,8,11]},
   lancer:{hp:12,sp:50,r:34,wind:.4,rec:.5,power:12,sc:.24,m:[i.lancer,320,320,6,8],a:[i.lancerAttack,320,320,3,8]},
   binder:{hp:15,sp:40,r:130,wind:.65,rec:1.0,power:7,sc:.24,m:[i.lancer,320,320,6,8],a:[i.lancerAttack,320,320,3,8]},
   boss:{hp:48,sp:34,r:42,wind:.55,rec:.7,power:18,sc:1.05,m:[i.boss,120,80,10,8],a:[i.bossAttack,120,80,4,7]}
  }[type];Object.assign(this,q);this.max=this.hp+l;this.hp=this.max;this.move=new Anim(...q.m,true);this.attack=new Anim(...q.a,false);this.flash=0
 }
 takeDamage(n,player){
  if(this.dead)return false;
  if(this.frozen>0){if(this.hp<=this.max*.5){this.hp=0;this.dead=true;return true}else{n*=2;this.frozen=0}}
  this.hp-=n;this.flash=.12;if(this.hp<=0)this.dead=true;return true
 }
 freeze(){if(!this.dead)this.frozen=3}
 startAttack(){this.state="attack";this.attackTime=0;this.hitDone=false;this.attack.reset()}
 u(dt,p,projectiles,i){
  if(this.dead)return;if(this.frozen>0){this.frozen=Math.max(0,this.frozen-dt);return}
  this.flash=Math.max(0,this.flash-dt);let dx=p.x-this.x,dy=p.y-this.y,d=Math.hypot(dx,dy)||1;this.left=dx<0;
  if(this.state==="attack"){this.attackTime+=dt;this.attack.u(dt);if(!this.hitDone&&this.attackTime>=this.wind){this.hitDone=true;if(this.type==="archer"||this.type==="binder"){projectiles.push(new Projectile(i.arrow,this.x,this.y-10,dx/d*190,dy/d*190,this.power,this.type==="binder"))}else if(Math.hypot(p.x-this.x,p.y-this.y)<=this.r+8)p.hurt(this.power)}if(this.attackTime>=this.wind+this.rec){this.state="move";this.attack.reset()}return}
  if(d<=this.r){this.startAttack();return}this.move.u(dt);let nx=this.x+dx/d*this.sp*dt,ny=this.y+dy/d*this.sp*dt;if(!inVillage(nx,ny)){this.x=nx;this.y=ny}
 }
 d(c,cam){if(this.dead)return;let p=cam.s(this.x,this.y),an=this.state==="attack"?this.attack:this.move;c.save();c.globalAlpha=this.flash>0?.45:1;an.d(c,p.x,p.y,this.sc,this.left);if(this.frozen>0){c.globalCompositeOperation="screen";c.fillStyle="rgba(100,210,255,.48)";c.fillRect(p.x-18,p.y-32,36,36)}c.restore();let w=this.type==="boss"?70:28,y=p.y-(this.type==="boss"?47:24);c.fillStyle="#291719";c.fillRect(p.x-w/2,y,w,4);c.fillStyle=this.type==="boss"?"#b44af2":this.type==="binder"?"#a66cf2":"#df5f49";c.fillRect(p.x-w/2,y,w*this.hp/this.max,4)}
}

const ITEM_DATA={
 changongi:{name:"Changongi",price:10,desc:"적중 시 최대 12스택. 스택당 공속 +5%. 풀스택 방어력 +30%."},
 cheep:{name:"Cheepandsimilar",price:10,desc:"체력 20% 소모. 최대 5초간 자신을 제외한 시간 8배 감속. 재사용으로 해제."},
 ice:{name:"Ice Age",price:10,desc:"광범위 참격과 3초 빙결. 빙결 중 피격 시 조건부 처형 또는 2배 피해."}
};

class Player{
 constructor(i,a){this.i=i;this.audio=a;this.x=V.gateX;this.y=V.y+V.h-120;this.hp=100;this.maxHp=100;this.gold=30;this.xp=0;this.need=35;this.level=1;this.atk=1;this.left=false;this.state="idle";this.inv=0;this.hit=false;this.med=false;this.medT=0;this.stun=0;
  this.q={open:false,cd:0,on:false,t:0,count:0};this.w={open:false,cd:0};this.e={open:false,cd:0,on:false,t:0};this.r={open:false,cd:0,on:false,t:0};this.choices=[];
  this.items=[];this.itemCd={cheep:0,ice:0};this.cheepOn=false;this.cheepT=0;this.cheepAfter=0;this.chStacks=0;this.chHitTimer=0;this.chDecay=0;this.afterimages=[];
  this.an={idle:new Anim(i.idle,96,96,10,8),run:new Anim(i.run,96,96,16,15),attack:new Anim(i.attack,96,96,7,12,false)}
 }
 has(id){return this.items.includes(id)}
 hurt(n){
  if(this.inv>0||this.q.on)return;
  let mult=1;if(this.med)mult*=.2;if(this.has("changongi")&&this.chStacks>=12)mult*=.7;if(this.cheepAfter>0)mult*=2;
  this.hp=Math.max(0,this.hp-n*mult);this.inv=.3
 }
 onHit(){
  if(this.has("changongi")){this.chStacks=Math.min(12,this.chStacks+1);this.chHitTimer=2;this.chDecay=0}
 }
 attackSpeed(){return (this.r.on?1.45:1)*(1+this.chStacks*.05)*(this.cheepOn?1.12:1)}
 moveSpeed(){return 155*(this.r.on?1.45:1)*(this.cheepOn?1.12:1)*(this.cheepAfter>0?.7:1)}
 gainXP(n){this.xp+=n;while(this.xp>=this.need){this.xp-=this.need;this.level++;this.need=Math.floor(this.need*1.3+8);this.makeChoices();this.audio.play("level")}}
 reward(g,x){this.gold+=g;this.gainXP(x)}
 makeChoices(){let p=[];for(let [k,n] of [["q","알파"],["w","명상"],["e","우주류"],["r","최후의 전사"]])p.push({id:k,n:(this[k].open?"강화 ":"해금 ")+n});p.push({id:"hp",n:"체력 +20"},{id:"atk",n:"평타 +1"});p.sort(()=>Math.random()-.5);this.choices=p.slice(0,3)}
 choose(n){let c=this.choices[n];if(!c)return;if("qwer".includes(c.id))this[c.id].open=true;else if(c.id==="hp"){this.maxHp+=20;this.hp+=20}else this.atk++;this.choices=[]}
 stopMed(){this.med=false;this.medT=0;this.audio.stopLoop("meditate");this.state="idle"}
 buy(id){if(this.gold<10||this.items.length>=3||this.has(id))return false;this.gold-=10;this.items.push(id);return true}
 useItem(slot,es,fx){
  let id=this.items[slot];if(!id)return;
  if(id==="cheep"){
   if(this.cheepOn){this.cheepOn=false;this.cheepAfter=3;return}
   if(this.itemCd.cheep>0||this.hp<=this.maxHp*.2)return;this.hp-=this.maxHp*.2;this.cheepOn=true;this.cheepT=5;this.itemCd.cheep=4
  }
  if(id==="ice"&&this.itemCd.ice<=0){this.itemCd.ice=20;fx.push(new FX(this.i.iceMain,32,32,10,this.x,this.y,4.7,.65));fx.push(new FX(this.i.iceB,32,32,9,this.x,this.y,4.4,.6));for(let e of es)if(!e.dead&&Math.hypot(e.x-this.x,e.y-this.y)<170){e.freeze();this.onHit()}}
 }
 u(dt,input,es,fx){
  this.inv=Math.max(0,this.inv-dt);this.stun=Math.max(0,this.stun-dt);this.itemCd.cheep=Math.max(0,this.itemCd.cheep-dt);this.itemCd.ice=Math.max(0,this.itemCd.ice-dt);this.cheepAfter=Math.max(0,this.cheepAfter-dt);
  if(this.cheepOn){this.cheepT-=dt;this.afterimages.push({x:this.x,y:this.y,t:.5,h:(performance.now()/12)%360});if(this.cheepT<=0){this.cheepOn=false;this.cheepAfter=3}}
  this.afterimages.forEach(a=>a.t-=dt);this.afterimages=this.afterimages.filter(a=>a.t>0);
  if(this.has("changongi")&&this.chStacks>0){if(this.chHitTimer>0)this.chHitTimer-=dt;else{this.chDecay+=dt;if(this.chDecay>=1){this.chDecay-=1;this.chStacks--}}}
  for(let k of "qwer")this[k].cd=Math.max(0,this[k].cd-dt);if(this.e.on&&(this.e.t-=dt)<=0)this.e.on=false;if(this.r.on&&(this.r.t-=dt)<=0){this.r.on=false;this.audio.stopLoop("ultimate")}
  if(input.tap("1"))this.useItem(0,es,fx);if(input.tap("2"))this.useItem(1,es,fx);if(input.tap("3"))this.useItem(2,es,fx);
  if(this.stun>0)return;
  if(input.tap("w")&&this.w.open&&this.w.cd<=0){if(this.med)this.stopMed();else{this.med=true;this.medT=0;this.w.cd=9;this.state="meditate";this.audio.playLoop("meditate")}}
  if(input.tap("e")&&this.e.open&&this.e.cd<=0&&!this.med){this.e.cd=13;this.e.on=true;this.e.t=5;fx.push(new FX(this.i.wuju1,27,35,10,this.x,this.y,2.4,.55));fx.push(new ArrayFX(this.i.wuju2,this.x,this.y,1.6,.55));fx.push(new ArrayFX(this.i.wuju3,this.x,this.y,1.8,.6))}
  if(input.tap("r")&&this.r.open&&this.r.cd<=0&&!this.med){this.r.cd=35;this.r.on=true;this.r.t=9;this.audio.playLoop("ultimate");fx.push(new FX(this.i.high1,25,24,5,this.x,this.y,3,.65));fx.push(new FX(this.i.high2,53,35,8,this.x,this.y,2.3,.75));fx.push(new FX(this.i.highWhite,32,32,4,this.x,this.y,2.7,.65));fx.push(new FX(this.i.highOrange,32,32,4,this.x,this.y,2.7,.65))}
  if(input.tap("q")&&this.q.open&&this.q.cd<=0&&!this.med){let t=es.filter(e=>!e.dead&&Math.hypot(e.x-this.x,e.y-this.y)<290);if(t.length){this.q.cd=16;this.q.on=true;this.q.t=0;this.q.count=0;this.audio.play("alpha")}}
  if(this.q.on){this.q.t+=dt;while(this.q.count<4&&this.q.t>=this.q.count*.2){let ts=es.filter(e=>!e.dead&&Math.hypot(e.x-this.x,e.y-this.y)<290);if(ts.length){let t=ts[this.q.count%ts.length],a=Math.atan2(t.y-this.y,t.x-this.x);this.x=t.x-Math.cos(a)*18;this.y=t.y-Math.sin(a)*18;if(t.takeDamage(2,this))this.onHit();fx.push(new FX([this.i.a1,this.i.a2,this.i.a3,this.i.a4][this.q.count%4],32,32,4,t.x,t.y,1.7,.28,this.q.count%2))}this.q.count++}if(this.q.t>=.8){this.q.on=false;this.state="idle"}return}
  if(this.med){this.medT+=dt;this.hp=Math.min(this.maxHp,this.hp+14*dt);if(this.medT>=3||input.tap("a")||input.vector().x||input.vector().y)this.stopMed();return}
  if(input.tap("a")&&this.state!=="attack"){this.state="attack";this.hit=false;this.an.attack.reset()}
  if(this.state==="attack"){this.an.attack.u(dt,this.attackSpeed());if(!this.hit&&this.an.attack.fr>=3){this.hit=true;this.audio.play("attack"+(1+Math.floor(Math.random()*3)));let range=C.AR+(this.r.on?22:0);for(let e of es)if(!e.dead&&Math.hypot(e.x-this.x,e.y-this.y)<=range){if(e.takeDamage(this.atk+(this.e.on?3:0),this)){this.onHit();this.q.cd=Math.max(0,this.q.cd-2)}}}if(this.an.attack.done){this.state="idle";this.an.attack.reset()}return}
  let v=input.vector();if(v.x||v.y){let nx=this.x+v.x*this.moveSpeed()*dt,ny=this.y+v.y*this.moveSpeed()*dt,inside=inVillage(this.x,this.y);if(inside&&!inVillage(nx,ny)&&!inGate(nx,ny)){nx=this.x;ny=this.y}this.x=Math.max(30,Math.min(C.WW-30,nx));this.y=Math.max(30,Math.min(C.WH-30,ny));if(v.x<0)this.left=true;if(v.x>0)this.left=false;this.state="run";this.an.run.u(dt)}else{this.state="idle";this.an.idle.u(dt)}
 }
 drawMed(c,cam){let p=cam.s(this.x,this.y),t=performance.now()/1000;c.save();c.globalCompositeOperation="screen";let f=Math.floor(t*10)%8;c.drawImage(this.i.med1,f*72,0,72,72,p.x-54,p.y-66,108,108);for(let j=0;j<5;j++){let a=t*1.5+j*1.256;c.drawImage(this.i.med2,(Math.floor(t*13)%9)*8,0,8,13,p.x+Math.cos(a)*28-8,p.y-18+Math.sin(a)*15-13,16,26)}for(let j=0;j<7;j++){let a=-t*1.9+j*.897;c.drawImage(this.i.med3,(Math.floor(t*15)%9)*8,0,8,7,p.x+Math.cos(a)*25-8,p.y+4+Math.sin(a)*18-7,16,14)}c.restore()}
 d(c,cam){
  if(this.q.on)return;let p=cam.s(this.x,this.y);
  for(let a of this.afterimages){let q=cam.s(a.x,a.y);c.save();c.globalAlpha=a.t*.35;c.filter=`hue-rotate(${a.h}deg)`;this.an.idle.d(c,q.x,q.y,1.35,this.left);c.restore()}
  if(this.med)this.drawMed(c,cam);let an=this.an[this.state==="run"?"run":this.state==="attack"?"attack":"idle"];an.d(c,p.x,p.y,1.35,this.left,this.inv>0?.55:1);
  if(this.cheepOn){c.save();c.globalCompositeOperation="screen";c.fillStyle="rgba(50,255,120,.12)";c.fillRect(0,0,C.W,C.H);c.restore()}
  if(this.stun>0){c.fillStyle="#c687ff";c.font="bold 10px sans-serif";c.fillText("STUN",p.x-15,p.y-45)}
 }
}

class Game{
 constructor(i){
  this.i=i;this.audio=new AudioSys();for(let [k,s,v,l] of [["bgm","assets/audio/bgm.ogg",.3,true],["attack1","assets/audio/attack1.wav",.55],["attack2","assets/audio/attack2.wav",.55],["attack3","assets/audio/attack3.wav",.55],["alpha","assets/audio/alpha.wav",.65],["meditate","assets/audio/meditate.wav",.5,true],["ultimate","assets/audio/ultimate.wav",.65,true],["level","assets/audio/levelup.wav",.6]])this.audio.add(k,s,v,l);
  this.input=new Input(this.audio);this.cam=new Cam;this.p=new Player(i,this.audio);this.es=[];this.fx=[];this.proj=[];this.spawnT=0;this.kills=0;this.last=performance.now();this.shop=false;this.bed={x:V.x+160,y:V.y+470};this.aura={x:V.gateX,y:V.y+V.h/2,r:42};
  this.npcs=[new NPC(i.villager,V.x+250,V.y+250,"주민"),new NPC(i.oldman,V.x+520,V.y+300,"장로"),new NPC(i.monk,V.x+650,V.y+470,"수행승"),new NPC(i.hunter,V.x+340,V.y+500,"사냥꾼"),new NPC(i.princess,V.x+740,V.y+210,"영주")];
  this.buildings=[{img:i.castle,x:V.x+450,y:V.y+190,w:160,h:128},{img:i.house1,x:V.x+180,y:V.y+320,w:64,h:96},{img:i.house2,x:V.x+720,y:V.y+330,w:64,h:96},{img:i.monastery,x:V.x+680,y:V.y+570,w:96,h:150},{img:i.barracks,x:V.x+220,y:V.y+570,w:96,h:128},{img:i.nb1,x:V.x+95,y:V.y+185,w:90,h:86},{img:i.nb2,x:V.x+805,y:V.y+535,w:105,h:91}];
  for(let n=0;n<10;n++)this.spawn()
 }
 spawn(){if(this.es.filter(e=>!e.dead).length>=C.MAXE)return;let r=Math.random(),type=r<.36?"slime":r<.62?"archer":r<.82?"lancer":"binder";if(this.kills&&this.kills%15===0&&!this.es.some(e=>!e.dead&&e.type==="boss"))type="boss";let x,y;do{x=50+Math.random()*(C.WW-100);y=50+Math.random()*(C.WH-100)}while(inVillage(x,y)||Math.hypot(x-this.p.x,y-this.p.y)<220);this.es.push(new Enemy(type,this.i,x,y,this.p.level))}
 worldScale(){return this.p.cheepOn?.125:1}
 update(dt){
  if(this.p.choices.length){if(this.input.tap("1"))this.p.choose(0);if(this.input.tap("2"))this.p.choose(1);if(this.input.tap("3"))this.p.choose(2);return}
  if(this.shop){if(this.input.tap("f"))this.shop=false;if(this.input.tap("1"))this.p.buy("changongi");if(this.input.tap("2"))this.p.buy("cheep");if(this.input.tap("3"))this.p.buy("ice");return}
  if(this.input.tap("f")&&Math.hypot(this.p.x-this.bed.x,this.p.y-this.bed.y)<55){this.shop=true;return}
  let wdt=dt*this.worldScale();this.spawnT+=wdt;if(this.spawnT>C.SPAWN){this.spawnT=0;this.spawn()}this.p.u(dt,this.input,this.es,this.fx);for(let e of this.es)e.u(wdt,this.p,this.proj,this.i);for(let p of this.proj)p.u(wdt,this.p);for(let f of this.fx)f.u(wdt);for(let n of this.npcs)n.u(wdt);this.proj=this.proj.filter(p=>!p.dead);this.fx=this.fx.filter(f=>f.life>0);
  if(Math.hypot(this.p.x-this.aura.x,this.p.y-this.aura.y)<this.aura.r)this.p.gainXP(18*dt);
  for(let e of this.es)if(e.dead&&!e.rewarded){e.rewarded=true;this.kills++;this.p.reward(e.type==="boss"?30:5,e.type==="boss"?35:10)}
  this.cam.follow(this.p,dt);if(this.p.hp<=0)location.reload()
 }
 ground(){
  let sx=Math.floor(this.cam.x/16)*16,sy=Math.floor(this.cam.y/16)*16,tiles=this.i.roadTiles;
  for(let y=sy;y<this.cam.y+C.H+16;y+=16)for(let x=sx;x<this.cam.x+C.W+16;x+=16){let p=this.cam.s(x,y),h=Math.abs(((x*31+y*17)>>4));ctx.drawImage(this.i.grass,p.x,p.y,16,16);if(h%9===0&&tiles.length)ctx.drawImage(tiles[h%tiles.length],p.x,p.y,16,16);if(inVillage(x,y)){ctx.fillStyle="rgba(183,148,89,.10)";ctx.fillRect(p.x,p.y,16,16)}}
  for(let y=V.y+70;y<V.y+V.h+140;y+=16)for(let x=V.gateX-40;x<V.gateX+40;x+=16){let p=this.cam.s(x,y);ctx.drawImage(tiles[10%tiles.length]||this.i.grass,p.x,p.y,16,16)}
  let tl=this.cam.s(V.x,V.y),br=this.cam.s(V.x+V.w,V.y+V.h);ctx.strokeStyle="#5d4a2b";ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(tl.x,tl.y);ctx.lineTo(br.x,tl.y);ctx.lineTo(br.x,br.y);ctx.lineTo(this.cam.s(V.gateX+V.gateW/2,V.y+V.h).x,br.y);ctx.moveTo(this.cam.s(V.gateX-V.gateW/2,V.y+V.h).x,br.y);ctx.lineTo(tl.x,br.y);ctx.closePath();ctx.stroke();
  let gp=this.cam.s(V.gateX,V.y+V.h+5);ctx.drawImage(this.i.gate,0,0,96,64,gp.x-48,gp.y-55,96,64)
 }
 draw(){
  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation="source-over";ctx.filter="none";ctx.clearRect(0,0,C.W,C.H);ctx.restore();this.ground();
  let ap=this.cam.s(this.aura.x,this.aura.y);ctx.fillStyle="rgba(85,190,255,.18)";ctx.beginPath();ctx.arc(ap.x,ap.y,this.aura.r+Math.sin(performance.now()/180)*4,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#79d9ff";ctx.stroke();
  let list=[];for(let b of this.buildings)list.push({y:b.y,d:()=>{let p=this.cam.s(b.x,b.y);ctx.drawImage(b.img,p.x-b.w/2,p.y-b.h,b.w,b.h)}});let bedp=this.cam.s(this.bed.x,this.bed.y);list.push({y:this.bed.y,d:()=>ctx.drawImage(this.i.bed,0,0,64,52,bedp.x-32,bedp.y-42,64,52)});for(let n of this.npcs)list.push({y:n.y,d:()=>n.d(ctx,this.cam)});for(let e of this.es)if(!e.dead)list.push({y:e.y,d:()=>e.d(ctx,this.cam)});list.push({y:this.p.y,d:()=>this.p.d(ctx,this.cam)});list.sort((a,b)=>a.y-b.y);for(let o of list)o.d();for(let p of this.proj)p.d(ctx,this.cam);for(let f of this.fx)f.d0(ctx,this.cam);
  if(Math.hypot(this.p.x-this.bed.x,this.p.y-this.bed.y)<55){ctx.fillStyle="#fff";ctx.font="9px sans-serif";ctx.fillText("F 상점",bedp.x-18,bedp.y-50)}
  this.hud();if(this.shop)this.shopUI();if(this.p.choices.length)this.levelUI()
 }
 hud(){
  ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation="source-over";ctx.filter="none";ctx.textAlign="left";ctx.fillStyle="rgba(7,12,9,.94)";ctx.fillRect(78,276,484,80);ctx.strokeStyle="#647a55";ctx.strokeRect(78.5,276.5,483,79);
  let hp=this.p.hp/this.p.maxHp,xp=this.p.xp/this.p.need;ctx.fillStyle="#261315";ctx.fillRect(90,286,170,13);ctx.fillStyle="#d94f50";ctx.fillRect(92,288,166*Math.max(0,hp),9);ctx.fillStyle="#142334";ctx.fillRect(90,303,170,8);ctx.fillStyle="#59a9e8";ctx.fillRect(92,305,166*Math.max(0,xp),4);ctx.fillStyle="#fff";ctx.font="bold 8px sans-serif";ctx.fillText(`HP ${Math.ceil(this.p.hp)}/${this.p.maxHp}`,97,296);ctx.fillText(`LV ${this.p.level} XP ${Math.floor(this.p.xp)}/${this.p.need} G ${this.p.gold}`,90,326);
  let xs=[274,316,358,400],ks=["q","w","e","r"],cd=[16,9,13,35],icons=[this.i.sq,this.i.sw,this.i.se,this.i.sr];for(let j=0;j<4;j++){let s=this.p[ks[j]],x=xs[j];ctx.fillStyle="#101712";ctx.fillRect(x,284,38,38);ctx.drawImage(icons[j],x+3,287,32,32);if(!s.open){ctx.fillStyle="rgba(0,0,0,.82)";ctx.fillRect(x,284,38,38)}else if(s.cd>0){ctx.fillStyle="rgba(0,0,0,.67)";ctx.fillRect(x,284,38,38*Math.min(1,s.cd/cd[j]));ctx.fillStyle="#fff";ctx.fillText(s.cd.toFixed(1),x+8,307)}ctx.strokeStyle="#aaba98";ctx.strokeRect(x+.5,284.5,37,37);ctx.fillStyle="#fff";ctx.fillText(ks[j].toUpperCase(),x+2,293)}
  for(let j=0;j<3;j++){let id=this.p.items[j],x=452+j*34;ctx.fillStyle="#101712";ctx.fillRect(x,286,30,30);if(id){ctx.drawImage(this.i["item_"+id],x+2,288,26,26);let cdv=id==="cheep"?this.p.itemCd.cheep:id==="ice"?this.p.itemCd.ice:0;if(cdv>0){ctx.fillStyle="rgba(0,0,0,.68)";ctx.fillRect(x,286,30,30);ctx.fillStyle="#fff";ctx.fillText(cdv.toFixed(0),x+10,305)}}ctx.strokeStyle="#aaba98";ctx.strokeRect(x+.5,286.5,29,29);ctx.fillStyle="#fff";ctx.fillText(String(j+1),x+2,295)}
  if(this.p.has("changongi")){ctx.fillStyle="#f0d06b";ctx.fillText(`STACK ${this.p.chStacks}/12`,452,330)}
  ctx.restore()
 }
 shopUI(){
  ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation="source-over";ctx.fillStyle="rgba(2,5,4,.94)";ctx.fillRect(0,0,C.W,C.H);ctx.fillStyle="#f3f0da";ctx.textAlign="center";ctx.font="bold 20px sans-serif";ctx.fillText("침대 상점",320,55);ctx.font="10px sans-serif";ctx.fillText(`골드 ${this.p.gold} · 장착 ${this.p.items.length}/3 · F 닫기`,320,76);
  let ids=["changongi","cheep","ice"];ids.forEach((id,j)=>{let x=55+j*190,y=98,w=170,h=195,d=ITEM_DATA[id];ctx.fillStyle="#111b14";ctx.fillRect(x,y,w,h);ctx.strokeStyle="#a8c67e";ctx.strokeRect(x+.5,y+.5,w-1,h-1);ctx.drawImage(this.i["item_"+id],x+50,y+12,70,70);ctx.fillStyle="#fff";ctx.font="bold 13px sans-serif";ctx.fillText(`${j+1}. ${d.name}`,x+w/2,y+100);ctx.fillStyle="#dfc55f";ctx.fillText("10 GOLD",x+w/2,y+120);ctx.fillStyle="#b9caa9";ctx.font="9px sans-serif";let words=d.desc.split(" "),line="",yy=y+140;for(let word of words){let test=line+word+" ";if(ctx.measureText(test).width>w-18){ctx.fillText(line,x+w/2,yy);line=word+" ";yy+=12}else line=test}ctx.fillText(line,x+w/2,yy);if(this.p.has(id)){ctx.fillStyle="#77e68a";ctx.fillText("보유 중",x+w/2,y+185)}});ctx.restore()
 }
 levelUI(){
  ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation="source-over";ctx.fillStyle="rgba(2,5,4,.94)";ctx.fillRect(0,0,C.W,C.H);ctx.fillStyle="#fff";ctx.textAlign="center";ctx.font="bold 20px sans-serif";ctx.fillText(`LEVEL ${this.p.level}`,320,65);ctx.font="11px sans-serif";ctx.fillText("1 / 2 / 3 중 선택",320,88);this.p.choices.forEach((o,j)=>{let x=65+j*175,y=115;ctx.fillStyle="#132017";ctx.fillRect(x,y,160,115);ctx.strokeStyle="#afca8b";ctx.strokeRect(x+.5,y+.5,159,114);ctx.fillStyle="#fff";ctx.font="bold 22px sans-serif";ctx.fillText(j+1,x+80,y+32);ctx.font="bold 13px sans-serif";ctx.fillText(o.n,x+80,y+72)});ctx.restore()
 }
 loop=(t)=>{let dt=Math.min((t-this.last)/1000,.05);this.last=t;this.update(dt);this.draw();this.input.end();requestAnimationFrame(this.loop)}
 start(){loading.classList.add("hidden");requestAnimationFrame(this.loop)}
}

const M={
 idle:"assets/player/idle.png",run:"assets/player/run.png",attack:"assets/player/attack.png",
 slime:"assets/enemies/slime.png",archer:"assets/enemies/archer.png",archerAttack:"assets/enemies/archer_attack.png",lancer:"assets/enemies/lancer.png",lancerAttack:"assets/enemies/lancer_attack.png",boss:"assets/enemies/middle_boss.png",bossAttack:"assets/enemies/boss_attack.png",arrow:"assets/projectiles/arrow.png",
 villager:"assets/npc/villager.png",oldman:"assets/npc/oldman.png",monk:"assets/npc/monk.png",hunter:"assets/npc/hunter.png",princess:"assets/npc/princess.png",
 grass:"assets/tiles/grass.png",plains:"assets/tiles/plains.png",bed:"assets/objects/bed.png",gate:"assets/objects/gate/double.png",
 castle:"assets/buildings/castle.png",house1:"assets/buildings/house1.png",house2:"assets/buildings/house2.png",monastery:"assets/buildings/monastery.png",barracks:"assets/buildings/barracks.png",nb1:"assets/buildings/new/b1.png",nb2:"assets/buildings/new/b2.png",
 circle:"assets/fx/circle.png",a1:"assets/fx/alpha_1.png",a2:"assets/fx/alpha_2.png",a3:"assets/fx/alpha_3.png",a4:"assets/fx/alpha_4.png",
 med1:"assets/fx/meditate/meditate1.png",med2:"assets/fx/meditate/meditate2.png",med3:"assets/fx/meditate/meditate3.png",
 high1:"assets/fx/highlander/h1.png",high2:"assets/fx/highlander/h2.png",highWhite:"assets/fx/highlander/h3white.png",highOrange:"assets/fx/highlander/h3orange.png",
 wuju1:"assets/fx/wuju1/sheet.png",
 iceMain:"assets/fx/ice/main.png",iceB:"assets/fx/ice/b.png",
 item_changongi:"assets/items/changongi.png",item_cheep:"assets/items/cheep.png",item_ice:"assets/items/iceage.png",
 sq:"assets/skills/q.png",sw:"assets/skills/w.png",se:"assets/skills/e.png",sr:"assets/skills/r.png"
};
M.wuju2=[];for(let n=1;n<=10;n++)M["wuju2_"+n]=`assets/fx/wuju2/e${n}.png`;
M.wuju3=[];for(let n=1;n<=6;n++)M["wuju3_"+n]=`assets/fx/wuju3/smoke${n}.png`;
const roadNames=[1,2,3,4,5,6,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64];roadNames.forEach(n=>M["road"+n]=`assets/tiles/road/tile${String(n).padStart(2,"0")}.png`);

(async()=>{try{let i=await new Loader(M).load();i.wuju2=[];for(let n=1;n<=10;n++)i.wuju2.push(i["wuju2_"+n]);i.wuju3=[];for(let n=1;n<=6;n++)i.wuju3.push(i["wuju3_"+n]);i.roadTiles=roadNames.map(n=>i["road"+n]);new Game(i).start()}catch(e){console.error(e);loadingText.textContent="시작 오류: "+e.message}})();
