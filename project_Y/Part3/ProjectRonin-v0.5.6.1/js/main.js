
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
  addEventListener("keydown",e=>{audio.unlock();let k=e.key.toLowerCase();if(!this.d.has(k))this.p.add(k);this.d.add(k);if(["arrowup","arrowdown","arrowleft","arrowright","a","q","w","e","r","f","i","d","1","2","3"].includes(k))e.preventDefault()});
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
function inGate(x,y){return y>V.y+V.h-55&&y<V.y+V.h+45&&x>V.gateX-V.gateW/2&&x<V.gateX+V.gateW/2}
function nearGate(x,y){return Math.hypot(x-V.gateX,y-(V.y+V.h))<105}


class IceLineFX{
 constructor(imgA,imgB,x,y,dir){this.imgA=imgA;this.imgB=imgB;this.x=x;this.y=y;this.dir=dir;this.life=.95;this.duration=.95;this.segments=7}
 u(dt){this.life-=dt}
 d0(c,cam){
  let elapsed=this.duration-this.life;
  for(let n=0;n<this.segments;n++){
   let start=n*.075;if(elapsed<start)continue;
   let local=elapsed-start;if(local>.48)continue;
   let progress=Math.min(1,local/.48),frA=Math.min(9,Math.floor(progress*10)),frB=Math.min(8,Math.floor(progress*9));
   let dist=48+n*43,wx=this.x+this.dir*dist,wy=this.y,p=cam.s(wx,wy),scale=2.3+n*.07;
   c.save();c.globalCompositeOperation="screen";c.globalAlpha=Math.sin(Math.min(1,local/.12)*Math.PI/2)*Math.max(0,1-local/.48);
   c.translate(p.x,p.y);if(this.dir<0)c.scale(-1,1);
   c.drawImage(this.imgA,frA*32,0,32,32,-36*scale/2,-32*scale/2,36*scale,32*scale);
   c.globalAlpha*=.72;c.drawImage(this.imgB,frB*32,0,32,32,-32*scale/2,-36*scale/2,32*scale,36*scale);
   c.restore()
  }
 }
}
class DamageText{constructor(x,y,n,execute=false){this.x=x;this.y=y;this.n=n;this.execute=execute;this.life=.85}u(dt){this.life-=dt;this.y-=28*dt}d(c,cam){let p=cam.s(this.x,this.y);c.save();c.globalAlpha=Math.max(0,this.life/.3);c.textAlign="center";c.font=this.execute?"bold 17px sans-serif":"bold 13px sans-serif";c.fillStyle=this.execute?"#fff1a0":"#ffdf65";c.strokeStyle="#341212";c.lineWidth=3;c.strokeText(String(this.n),p.x,p.y);c.fillText(String(this.n),p.x,p.y);c.restore()}}
class Projectile{
 constructor(img,x,y,vx,vy,damage,cc=false){Object.assign(this,{img,x,y,vx,vy,damage,cc});this.dead=false;this.life=3;this.a=Math.atan2(vy,vx)}
 u(dt,p){this.x+=this.vx*dt;this.y+=this.vy*dt;this.life-=dt;if(this.life<=0||inVillage(this.x,this.y)){this.dead=true;return}
  let d=Math.hypot(this.x-p.x,this.y-p.y),front=(this.x-p.x)*(p.left?-1:1);
  if(p.state==="attack"&&p.an.attack.fr>=2&&p.an.attack.fr<=4&&d<43&&front>-10){this.dead=true;p.parryFlash=.18;return}
  if(d<14){p.hurt(this.damage);if(this.cc)p.stun=Math.max(p.stun,1.15);this.dead=true}}
 d(c,cam){let p=cam.s(this.x,this.y);c.save();c.translate(p.x,p.y);c.rotate(this.a);if(this.cc){c.fillStyle="#b46cff";c.beginPath();c.arc(0,0,7,0,Math.PI*2);c.fill()}else c.drawImage(this.img,-16,-16,32,32);c.restore()}}
class NPC{constructor(img,x,y,name){this.x=x;this.y=y;this.name=name;this.a=new Anim(img,16,16,4,6)}u(dt){this.a.u(dt)}d(c,cam){let p=cam.s(this.x,this.y);this.a.d(c,p.x,p.y,2,false);c.fillStyle="#f1eed1";c.font="8px sans-serif";c.textAlign="center";c.fillText(this.name,p.x,p.y-28);c.textAlign="left"}}

class Enemy{
 constructor(type,i,x,y){this.type=type;this.i=i;this.x=x;this.y=y;this.dead=false;this.rewarded=false;this.state="move";this.attackTime=0;this.hitDone=false;this.left=false;this.frozen=0;this.hits=0;this.slowCd=0;this.escape=false;this.shields=type==="boss"?2:0;this.shieldT=0;
  let q={slime:{hp:30,sp:103,r:22,wind:.38,rec:.72,power:2,gold:4,sc:1.1},lancer:{hp:60,sp:108,r:38,wind:.48,rec:.82,power:1,gold:4,sc:.22},archer:{hp:1,sp:106,r:155,wind:.62,rec:.95,power:3,gold:4,sc:.25},monk:{hp:20,sp:101,r:145,wind:.7,rec:1.15,power:0,gold:4,sc:.25},pawn:{hp:1,sp:136,r:30,wind:1.0,rec:.3,power:0,gold:4,sc:.25},boss:{hp:50,sp:104,r:44,wind:.55,rec:.75,power:5,gold:12,sc:.28}}[type];Object.assign(this,q);this.max=this.hp;
  const A=(im,fw,n,f,loop=true)=>new Anim(im,fw,fw,n,f,loop);
  if(type==="slime"){this.move=new Anim(i.slime,32,32,4,6);this.attack=new Anim(i.slime,32,32,4,8,false)}
  else if(type==="archer"){this.move=A(i.archerRun,192,4,8);this.attack=A(i.archerShoot,192,8,11,false)}
  else if(type==="lancer"){this.move=A(i.lancerRun,320,6,9);this.attack=A(i.lancerRightAttack,320,3,7,false)}
  else if(type==="monk"){this.move=A(i.monkRun,192,4,8);this.attack=A(i.monkHeal,192,11,10,false)}
  else if(type==="pawn"){this.move=A(i.pawnRun,192,6,10);this.attack=A(i.pawnPickaxe,192,6,6,false)}
  else {this.move=A(i.bossRun,192,6,8);this.attack=A(i.bossAttack,192,4,7,false);this.guard=A(i.bossGuard,192,6,10,false)}this.flash=0}
 takeDamage(n,player){if(this.dead)return false;if(this.shields>0){this.shields--;this.shieldT=0;if(this.guard)this.guard.reset();return false}let execute=false;if(this.frozen>0){if(this.hp<=this.max*.5){n=99999;execute=true}else{n*=2;this.frozen=0}}this.hits++;if(!execute&&this.hits>=4)n=99999,execute=true;this.hp-=n;this.flash=.12;if(player&&player.showDamage)player.showDamage(this.x,this.y,execute?-99999:Math.round(n),execute);if(this.hp<=0)this.dead=true;return true}
 freeze(){if(!this.dead)this.frozen=3}startAttack(){this.state="attack";this.attackTime=0;this.hitDone=false;this.attack.reset()}
 u(dt,p,projectiles,i,all){if(this.dead)return;if(this.frozen>0){this.frozen=Math.max(0,this.frozen-dt);return}this.flash=Math.max(0,this.flash-dt);this.slowCd=Math.max(0,this.slowCd-dt);if(this.type==="boss"&&this.shields<2){this.shieldT+=dt;if(this.shieldT>=3){this.shieldT=0;this.shields++}}
  let dx=p.x-this.x,dy=p.y-this.y,d=Math.hypot(dx,dy)||1;this.left=dx<0;
  if(this.type==="pawn"&&this.escape){this.move.u(dt);this.x-=dx/d*175*dt;this.y-=dy/d*175*dt;if(d>430)this.dead=true;return}
  if(this.type==="monk"){let target=all.filter(e=>e!==this&&!e.dead&&e.hp<e.max).sort((a,b)=>Math.hypot(a.x-this.x,a.y-this.y)-Math.hypot(b.x-this.x,b.y-this.y))[0];if(target){let tx=target.x-this.x,ty=target.y-this.y,td=Math.hypot(tx,ty)||1;if(td<=this.r){this.attackTime+=dt;this.attack.u(dt);if(!this.hitDone&&this.attackTime>=this.wind){this.hitDone=true;target.hp=Math.min(target.max,target.hp+10)}if(this.attackTime>=this.wind+this.rec){this.attackTime=0;this.hitDone=false;this.attack.reset()}return}this.move.u(dt);this.x+=tx/td*this.sp*dt;this.y+=ty/td*this.sp*dt;return}}
  if(this.state==="attack"){this.attackTime+=dt;this.attack.u(dt);if(!this.hitDone&&this.attackTime>=this.wind){this.hitDone=true;if(this.type==="archer")projectiles.push(new Projectile(i.archerArrow,this.x,this.y-10,dx/d*210,dy/d*210,this.power));else if(Math.hypot(p.x-this.x,p.y-this.y)<=this.r+10){if(this.type==="pawn"){if(p.gold>=2){p.gold-=2;this.escape=true;p.x+=dx/d*34;p.y+=dy/d*34}}else{p.hurt(this.power);if(this.type==="lancer"&&Math.random()<.5)p.slow=Math.max(p.slow,.5)}}}if(this.attackTime>=this.wind+this.rec){this.state="move";this.attack.reset()}return}
  if(this.type==="archer"&&d<105){this.move.u(dt);this.x-=dx/d*this.sp*dt;this.y-=dy/d*this.sp*dt;return}if(d<=this.r){this.startAttack();return}this.move.u(dt);let nx=this.x+dx/d*this.sp*dt,ny=this.y+dy/d*this.sp*dt;if(!inVillage(nx,ny)){this.x=nx;this.y=ny}}
 d(c,cam){if(this.dead)return;let p=cam.s(this.x,this.y),an=this.state==="attack"?this.attack:this.move;if(this.type==="boss"&&this.shields>0&&this.guard&&!this.guard.done)an=this.guard;c.save();c.globalAlpha=this.flash>0?.45:1;an.d(c,p.x,p.y,this.sc,this.left);if(this.frozen>0){c.fillStyle="rgba(100,210,255,.48)";c.fillRect(p.x-18,p.y-32,36,36)}c.restore();let w=this.type==="boss"?70:32,y=p.y-(this.type==="boss"?47:28);c.fillStyle="#291719";c.fillRect(p.x-w/2,y,w,5);c.fillStyle="#df5f49";c.fillRect(p.x-w/2,y,w*Math.max(0,this.hp/this.max),5);if(this.type==="boss")for(let n=0;n<this.shields;n++){c.fillStyle="#fff";c.fillRect(p.x-w/2+n*10,y-4,8,3)}}
}

const ITEM_DATA={
 changongi:{name:"Changongi",price:10,desc:"적중 시 최대 12스택. 스택당 공속 +5%. 풀스택 방어력 +30%."},
 cheep:{name:"Cheepandsimilar",price:10,desc:"체력 20% 소모. 최대 5초간 자신을 제외한 시간 8배 감속. 재사용으로 해제."},
 ice:{name:"Ice Age",price:10,desc:"광범위 참격과 3초 빙결. 빙결 중 피격 시 조건부 처형 또는 2배 피해."}
};

class Player{
 constructor(i,a){this.i=i;this.audio=a;this.x=V.gateX;this.y=V.y+V.h-120;this.hp=100;this.maxHp=100;this.energy=100;this.maxEnergy=100;this.gold=30;this.xp=0;this.need=35;this.level=1;this.atk=10;this.left=false;this.state="idle";this.inv=0;this.hit=false;this.med=false;this.medT=0;this.stun=0;
  this.q={open:false,cd:0,on:false,t:0,count:0};this.w={open:false,cd:0};this.e={open:false,cd:0,on:false,t:0};this.r={open:false,cd:0,on:false,t:0};this.choices=[];
  this.inventory=[];this.items=[null,null,null];this.itemCd={cheep:0,ice:0};this.purchasedOnce=false;this.warning="";this.warningT=0;this.slow=0;this.parryFlash=0;this.cheepOn=false;this.cheepT=0;this.cheepAfter=0;this.chStacks=0;this.chHitTimer=0;this.chDecay=0;this.afterimages=[];this.energyBuff=0;this.flameAura=0;this.onFire=0;this.onFireTick=0;this.kpvsUnlocked=false;this.doubleStrike=false;this.kpvsCd=0;this.kpvsEmpower=0;this.kpvsInv=0;this.attackCount=0;
  this.an={idle:new Anim(i.idle,96,96,10,8),run:new Anim(i.run,96,96,16,15),attack:new Anim(i.attack,96,96,7,12,false)}
 }
 has(id){return this.items.includes(id)}
 showDamage(x,y,n,execute=false){if(this.damageNumbers)this.damageNumbers.push(new DamageText(x,y,n,execute))}
 hurt(n){if(this.q.on||this.kpvsInv>0)return;let mult=1;if(this.med)mult*=.2;if(this.has("changongi")&&this.chStacks>=12)mult*=.7;if(this.cheepAfter>0)mult*=2;this.hp=Math.max(0,this.hp-n*mult);this.inv=.08}
 onHit(){
  if(this.has("changongi")){this.chStacks=Math.min(12,this.chStacks+1);this.chHitTimer=2;this.chDecay=0}
 }
 attackSpeed(){return (this.r.on?1.45:1)*(1+this.chStacks*.05)*(this.cheepOn?1.12:1)}
 moveSpeed(){return 138*(this.r.on?1.45:1)*(this.cheepOn?1.12:1)*(this.cheepAfter>0?.7:1)*(this.slow>0?.65:1)}
 gainXP(n){this.xp+=n;while(this.xp>=this.need){this.xp-=this.need;this.level++;this.need=Math.floor(this.need*1.3+8);this.makeChoices();this.audio.play("level")}}
 reward(g,x){this.gold+=g;this.gainXP(x)}
 makeChoices(){let p=[];for(let [k,n] of [["q","알파"],["w","명상"],["e","우주류"],["r","최후의 전사"]])p.push({id:k,n:(this[k].open?"강화 ":"해금 ")+n});p.push({id:"hp",n:"체력 +20"},{id:"atk",n:"평타 +1"});p.sort(()=>Math.random()-.5);this.choices=p.slice(0,3)}
 choose(n){let c=this.choices[n];if(!c)return;if("qwer".includes(c.id))this[c.id].open=true;else if(c.id==="hp"){this.maxHp+=20;this.hp+=20}else this.atk++;this.choices=[]}
 stopMed(){this.med=false;this.medT=0;this.audio.stopLoop("meditate");this.state="idle"}
 buy(id){if(this.gold<10||this.inventory.length>=8)return false;this.gold-=10;this.inventory.push(id);this.purchasedOnce=true;for(let n=0;n<3;n++)if(!this.items[n]){this.items[n]=id;break}return true}
 equip(invIndex,slot){let id=this.inventory[invIndex];if(id&&slot>=0&&slot<3)this.items[slot]=id}
 useItem(slot,es,fx){
  let id=this.items[slot];if(!id)return;
  if(id==="cheep"){if(this.cheepOn){this.cheepOn=false;this.cheepAfter=3;this.itemCd.cheep=4;return}if(this.itemCd.cheep>0)return;if(this.hp<=this.maxHp*.2){this.warning="체력이 부족하여 산데비스탄을 사용할 수 없습니다";this.warningT=2;return}this.hp-=this.maxHp*.2;this.cheepOn=true;this.cheepT=5}
  if(id==="ice"&&this.itemCd.ice<=0){
   this.itemCd.ice=20;let dir=this.left?-1:1;fx.push(new IceLineFX(this.i.iceMain,this.i.iceB,this.x,this.y-4,dir));
   for(let e of es)if(!e.dead){
    let forward=(e.x-this.x)*dir,lateral=Math.abs(e.y-this.y);
    if(forward>=20&&forward<=355&&lateral<=65){e.freeze();this.onHit()}
   }
  }
 }
 u(dt,input,es,fx){
  this.inv=Math.max(0,this.inv-dt);this.kpvsInv=Math.max(0,this.kpvsInv-dt);this.kpvsCd=Math.max(0,this.kpvsCd-dt);this.energy=Math.min(this.maxEnergy,this.energy+(8+(this.energyBuff>0?5:0))*dt);this.energyBuff=Math.max(0,this.energyBuff-dt);this.flameAura=Math.max(0,this.flameAura-dt);this.onFire=Math.max(0,this.onFire-dt);if(this.onFire>0){this.onFireTick+=dt;if(this.onFireTick>=.5){this.onFireTick-=.5;this.hurt(1)}}this.stun=Math.max(0,this.stun-dt);this.slow=Math.max(0,this.slow-dt);this.warningT=Math.max(0,this.warningT-dt);this.parryFlash=Math.max(0,this.parryFlash-dt);if(!this.cheepOn)this.itemCd.cheep=Math.max(0,this.itemCd.cheep-dt);this.itemCd.ice=Math.max(0,this.itemCd.ice-dt);this.cheepAfter=Math.max(0,this.cheepAfter-dt);
  if(this.cheepOn){this.cheepT-=dt;this.afterimages.push({x:this.x,y:this.y,t:.5,h:(performance.now()/12)%360});if(this.cheepT<=0){this.cheepOn=false;this.cheepAfter=3;this.itemCd.cheep=4}}
  this.afterimages.forEach(a=>a.t-=dt);this.afterimages=this.afterimages.filter(a=>a.t>0);
  if(this.has("changongi")&&this.chStacks>0){if(this.chHitTimer>0)this.chHitTimer-=dt;else{this.chDecay+=dt;if(this.chDecay>=1){this.chDecay-=1;this.chStacks--}}}
  for(let k of "qwer")this[k].cd=Math.max(0,this[k].cd-dt);if(this.e.on&&(this.e.t-=dt)<=0)this.e.on=false;if(this.r.on&&(this.r.t-=dt)<=0){this.r.on=false}
  if(input.tap("d")&&this.kpvsUnlocked&&this.kpvsCd<=0){this.kpvsCd=2;this.kpvsInv=.2;this.kpvsEmpower=2;this.x+=this.left?-96:96;this.x=Math.max(30,Math.min(C.WW-30,this.x));fx.push(new FX(this.i.kpvsIcon,145,145,1,this.x,this.y,0.55,.22,this.left))}
  if(input.tap("1"))this.useItem(0,es,fx);if(input.tap("2"))this.useItem(1,es,fx);if(input.tap("3"))this.useItem(2,es,fx);
  if(this.stun>0)return;
  if(input.tap("w")&&this.w.open&&this.w.cd<=0&&this.energy>=15){if(this.med)this.stopMed();else{this.energy-=15;this.med=true;this.medT=0;this.w.cd=9;this.state="meditate";this.audio.play("meditate")}}
  if(input.tap("e")&&this.e.open&&this.e.cd<=0&&this.energy>=25&&!this.med){this.energy-=25;this.e.cd=13;this.e.on=true;this.e.t=5;fx.push(new ArrayFX(this.i.wuju2,this.x,this.y,1.35,.4))}
  if(input.tap("r")&&this.r.open&&this.r.cd<=0&&this.energy>=40&&!this.med){this.energy-=40;this.r.cd=35;this.r.on=true;this.r.t=9;this.audio.play("ultimate");fx.push(new FX(this.i.high2,53,35,8,this.x,this.y,2,.45))}
  if(input.tap("q")&&this.q.open&&this.q.cd<=0&&this.energy>=20&&!this.med){let t=es.filter(e=>!e.dead&&Math.hypot(e.x-this.x,e.y-this.y)<290);if(t.length){this.energy-=20;this.q.cd=16;this.q.on=true;this.q.t=0;this.q.count=0;this.audio.play("alpha")}}
  if(this.q.on){this.q.t+=dt;while(this.q.count<4&&this.q.t>=this.q.count*.2){let ts=es.filter(e=>!e.dead&&Math.hypot(e.x-this.x,e.y-this.y)<290);if(ts.length){let t=ts[this.q.count%ts.length],a=Math.atan2(t.y-this.y,t.x-this.x);this.x=t.x-Math.cos(a)*18;this.y=t.y-Math.sin(a)*18;if(t.takeDamage(2,this))this.onHit();fx.push(new FX([this.i.a1,this.i.a2,this.i.a3,this.i.a4][this.q.count%4],32,32,4,t.x,t.y,1.7,.28,this.q.count%2))}this.q.count++}if(this.q.t>=.8){this.q.on=false;this.state="idle"}return}
  if(this.med){this.medT+=dt;this.hp=Math.min(this.maxHp,this.hp+14*dt);if(this.medT>=3||input.tap("a")||input.vector().x||input.vector().y)this.stopMed();return}
  if(input.tap("a")&&this.state!=="attack"){this.state="attack";this.hit=false;this.an.attack.reset()}
  if(this.state==="attack"){this.an.attack.u(dt,this.attackSpeed());if(!this.hit&&this.an.attack.fr>=3){this.hit=true;this.audio.play("attack"+(1+Math.floor(Math.random()*3)));let range=C.AR+(this.r.on?22:0);for(let e of es)if(!e.dead&&Math.hypot(e.x-this.x,e.y-this.y)<=range){let dmg=this.atk+(this.e.on?3:0)+(this.kpvsEmpower>0?8:0);let before=e.hp;if(e.takeDamage(dmg,this)){this.onHit();this.q.cd=Math.max(0,this.q.cd-2);if(this.flameAura>0)e.onFire=5;if(this.kpvsEmpower>0){let dealt=Math.max(0,before-e.hp);this.hp=Math.min(this.maxHp,this.hp+dealt*.5);this.energy=Math.min(this.maxEnergy,this.energy+Math.min(20,dealt));if(e.dead){this.maxHp++;this.hp++;this.maxEnergy++;this.energy++}}}}}if(this.hit){this.attackCount++;if(this.doubleStrike&&this.attackCount%4===0){for(let e of es)if(!e.dead&&Math.hypot(e.x-this.x,e.y-this.y)<=C.AR)e.takeDamage(this.atk,this)}}this.kpvsEmpower=0;if(this.an.attack.done){this.state="idle";this.an.attack.reset()}return}
  let v=input.vector();if(v.x||v.y){let nx=this.x+v.x*this.moveSpeed()*dt,ny=this.y+v.y*this.moveSpeed()*dt,inside=(this.currentMap===1&&inVillage(this.x,this.y));if(inside&&!inVillage(nx,ny)&&!inGate(nx,ny)){nx=this.x;ny=this.y}this.x=Math.max(30,Math.min(C.WW-30,nx));this.y=Math.max(30,Math.min(C.WH-30,ny));if(v.x<0)this.left=true;if(v.x>0)this.left=false;this.state="run";this.an.run.u(dt)}else{this.state="idle";this.an.idle.u(dt)}
 }
 drawPersistentSkills(c,cam){
  let p=cam.s(this.x,this.y),t=performance.now()/1000;c.save();c.globalCompositeOperation="screen";
  if(this.e.on){let f=Math.floor(t*12)%10;c.globalAlpha=.78;c.drawImage(this.i.wuju1,f*27,0,27,35,p.x-40,p.y-57,80,104);let smoke=this.i.wuju3[Math.floor(t*8)%this.i.wuju3.length];c.globalAlpha=.30;c.drawImage(smoke,p.x-smoke.width*.7,p.y-smoke.height*.85,smoke.width*1.4,smoke.height*1.4);c.strokeStyle="#78d8ff";c.lineWidth=3;c.shadowColor="#3290ff";c.shadowBlur=12;c.beginPath();c.arc(p.x,p.y-10,29+Math.sin(t*8)*3,0,Math.PI*2);c.stroke()}
  if(this.r.on){let f1=Math.floor(t*10)%5,f2=Math.floor(t*12)%8,f3=Math.floor(t*14)%4;c.globalAlpha=.65;c.drawImage(this.i.high1,f1*25,0,25,24,p.x-43,p.y-58,86,83);c.globalAlpha=.50;c.drawImage(this.i.high2,f2*53,0,53,35,p.x-65,p.y-57,130,90);c.globalAlpha=.40;c.drawImage(this.i.highWhite,f3*32,0,32,32,p.x-49,p.y-56,98,98);c.globalAlpha=.34;c.drawImage(this.i.highOrange,f3*32,0,32,32,p.x-49,p.y-56,98,98);c.strokeStyle="#ffd96f";c.lineWidth=3;c.shadowColor="#ff8b32";c.shadowBlur=14;c.beginPath();c.arc(p.x,p.y-9,36+Math.sin(t*10)*4,0,Math.PI*2);c.stroke()}
  c.restore()
 }
 drawMed(c,cam){let p=cam.s(this.x,this.y),t=performance.now()/1000;c.save();c.globalCompositeOperation="screen";let f=Math.floor(t*10)%8;c.drawImage(this.i.med1,f*72,0,72,72,p.x-54,p.y-66,108,108);for(let j=0;j<5;j++){let a=t*1.5+j*1.256;c.drawImage(this.i.med2,(Math.floor(t*13)%9)*8,0,8,13,p.x+Math.cos(a)*28-8,p.y-18+Math.sin(a)*15-13,16,26)}for(let j=0;j<7;j++){let a=-t*1.9+j*.897;c.drawImage(this.i.med3,(Math.floor(t*15)%9)*8,0,8,7,p.x+Math.cos(a)*25-8,p.y+4+Math.sin(a)*18-7,16,14)}c.restore()}
 d(c,cam){
  if(this.q.on)return;let p=cam.s(this.x,this.y);
  for(let a of this.afterimages){let q=cam.s(a.x,a.y);c.save();c.globalAlpha=a.t*.35;c.filter=`hue-rotate(${a.h}deg)`;this.an.idle.d(c,q.x,q.y,1.35,this.left);c.restore()}
  this.drawPersistentSkills(c,cam);if(this.med)this.drawMed(c,cam);let an=this.an[this.state==="run"?"run":this.state==="attack"?"attack":"idle"];an.d(c,p.x,p.y,1.35,this.left,this.inv>0?.55:1);
  if(this.cheepOn){c.save();c.globalCompositeOperation="screen";c.fillStyle="rgba(50,255,120,.12)";c.fillRect(0,0,C.W,C.H);c.restore()}
  if(this.parryFlash>0){c.strokeStyle="#d9f6ff";c.lineWidth=4;c.beginPath();c.arc(p.x+(this.left?-24:24),p.y-12,20,0,Math.PI*2);c.stroke()}
  if(this.stun>0){c.fillStyle="#c687ff";c.font="bold 10px sans-serif";c.fillText("STUN",p.x-15,p.y-45)}
 }
}


class NeutralMob{
 constructor(kind,i,x,y){this.kind=kind;this.type=kind;this.i=i;this.x=this.homeX=x;this.y=this.homeY=y;this.dead=false;this.rewarded=false;this.respawn=0;this.state="idle";this.attackT=0;this.skillT=2;this.left=false;this.onFire=0;this.fireTick=0;let q=kind==="blue"?{hp:200,power:5,gold:12,sp:72,range:42}:{hp:100,power:15,gold:15,sp:74,range:42};if(kind==="kage")q={hp:800,power:10,gold:50,sp:112,range:48};Object.assign(this,q);this.max=this.hp;this.img=kind==="blue"?i.blueWalk:kind==="orange"?i.orangeWalk:i.kageSword;this.anim=kind==="kage"?new Anim(this.img,256,512,7,10):new Anim(this.img,90,64,10,8);this.attack=kind==="blue"?new Anim(i.blueAttack,90,64,11,9,false):kind==="orange"?new Anim(i.orangeAttack,90,64,11,9,false):new Anim(this.img,256,512,7,14,false)}
 takeDamage(n,p){if(this.dead)return false;if(this.kind==="kage"&&Math.random()<.2)return false;if(this.kind==="kage"&&Math.random()<.02){p.hurt(n);return false}this.hp-=n;p.showDamage(this.x,this.y,Math.round(n));if(p.flameAura>0&&this.kind!=="orange")this.onFire=5;if(this.hp<=0)this.dead=true;return true}
 u(dt,p,fx){if(this.dead)return;this.anim.u(dt);if(this.onFire>0){this.onFire-=dt;this.fireTick+=dt;if(this.fireTick>=.5){this.fireTick-=.5;this.hp-=1;if(this.hp<=0)this.dead=true}}let dx=p.x-this.x,dy=p.y-this.y,d=Math.hypot(dx,dy)||1,home=Math.hypot(this.x-this.homeX,this.y-this.homeY);this.left=dx<0;if(home>260){this.x+=(this.homeX-this.x)/home*this.sp*dt;this.y+=(this.homeY-this.y)/home*this.sp*dt;return}if(d<260){this.skillT-=dt;if(this.kind==="kage"&&this.skillT<=0){this.skillT=2+Math.random()*2;let r=Math.random();if(r<.3){this.x+=dx/d*100;this.y+=dy/d*100;p.hurt(10);this.hp=Math.min(this.max,this.hp+this.max*.1)}else if(r<.55){fx.push(new WarningFX(this.x,this.y,58,1));this.attackT=-1}else if(r<.75&&p.hp<=p.maxHp*.5){if(d<90)p.hurt(p.hp<=30?99999:5)}else{if(d<170)p.hurt(8)}}if(this.attackT<0){this.attackT+=dt;if(this.attackT>=0&&d<82){p.hurt(25);p.stun=.5}}else if(d<=this.range){this.attackT+=dt;if(this.attackT>=.75){this.attackT=0;p.hurt(this.kind==="orange"?10+Math.random()*10:this.power)}}else{this.x+=dx/d*this.sp*dt;this.y+=dy/d*this.sp*dt}}}
 d(c,cam){let p=cam.s(this.x,this.y);this.anim.d(c,p.x,p.y,this.kind==="kage"?.22:.75,this.left);c.fillStyle="#211";c.fillRect(p.x-45,p.y-50,90,7);c.fillStyle=this.kind==="blue"?"#4aa8ff":this.kind==="orange"?"#ff8738":"#c65cff";c.fillRect(p.x-45,p.y-50,90*Math.max(0,this.hp/this.max),7)}
}
class WarningFX{constructor(x,y,r,d){Object.assign(this,{x,y,r,d,life:d})}u(dt){this.life-=dt}d0(c,cam){let p=cam.s(this.x,this.y);c.save();c.strokeStyle="#ff3b3b";c.lineWidth=4;c.globalAlpha=.5+.5*Math.sin(performance.now()/60);c.beginPath();c.arc(p.x,p.y,this.r,0,Math.PI*2);c.stroke();c.restore()}}
class Game{
 constructor(i){
  this.i=i;this.audio=new AudioSys();for(let [k,s,v,l] of [["bgm","assets/audio/bgm.ogg",.3,true],["attack1","assets/audio/attack1.wav",.55],["attack2","assets/audio/attack2.wav",.55],["attack3","assets/audio/attack3.wav",.55],["alpha","assets/audio/alpha.wav",.65],["meditate","assets/audio/meditate.wav",.5,false],["ultimate","assets/audio/ultimate.wav",.65,false],["level","assets/audio/levelup.wav",.6]])this.audio.add(k,s,v,l);
  this.mouseX=0;this.mouseY=0;canvas.addEventListener("mousemove",e=>{let r=canvas.getBoundingClientRect();this.mouseX=(e.clientX-r.left)*C.W/r.width;this.mouseY=(e.clientY-r.top)*C.H/r.height});this.input=new Input(this.audio);this.cam=new Cam;this.p=new Player(i,this.audio);this.damageNumbers=[];this.p.damageNumbers=this.damageNumbers;this.es=[];this.fx=[];this.proj=[];this.spawnT=0;this.kills=0;this.last=performance.now();this.shop=false;this.inventoryOpen=false;this.invSelected=0;this.mapIndex=1;this.playTime=0;this.gameOver=false;this.neutrals=[];this.neutralRespawn={blue:0,orange:0,kage:0};this.gateOpen=0;this.gateFrame=0;this.bed={x:V.x+160,y:V.y+470};this.aura={x:V.gateX,y:V.y+V.h/2,r:42};
  this.npcs=[new NPC(i.villager,V.x+250,V.y+250,"주민"),new NPC(i.oldman,V.x+520,V.y+300,"장로"),new NPC(i.monk,V.x+650,V.y+470,"수행승"),new NPC(i.hunter,V.x+340,V.y+500,"사냥꾼"),new NPC(i.princess,V.x+740,V.y+210,"영주")];
  this.buildings=[{img:i.castle,x:V.x+450,y:V.y+190,w:160,h:128},{img:i.house1,x:V.x+180,y:V.y+320,w:64,h:96},{img:i.house2,x:V.x+720,y:V.y+330,w:64,h:96},{img:i.monastery,x:V.x+680,y:V.y+570,w:96,h:150},{img:i.barracks,x:V.x+220,y:V.y+570,w:96,h:128},{img:i.nb1,x:V.x+95,y:V.y+185,w:90,h:86},{img:i.nb2,x:V.x+805,y:V.y+535,w:105,h:91}];
  for(let n=0;n<10;n++)this.spawn();this.setupNeutrals()
 }
 setupNeutrals(){this.neutrals=[];if(this.mapIndex===2)this.neutrals.push(new NeutralMob("blue",this.i,1700,760));if(this.mapIndex===3)this.neutrals.push(new NeutralMob("orange",this.i,650,800));if(this.mapIndex===4&&!this.p.kageDefeated)this.neutrals.push(new NeutralMob("kage",this.i,1450,700))}
 spawn(){if(this.es.filter(e=>!e.dead).length>=C.MAXE)return;let types=["slime"];if(this.p.level>=2){types.push("lancer","archer");if(this.es.filter(e=>!e.dead&&e.type==="monk").length<3)types.push("monk");}if(this.p.purchasedOnce&&!this.es.some(e=>!e.dead&&e.type==="pawn")&&Math.random()<.18)types=["pawn"];let allOpen=[this.p.q,this.p.w,this.p.e,this.p.r].every(s=>s.open);if(allOpen&&!this.es.some(e=>!e.dead&&e.type==="boss")&&Math.random()<.15)types=["boss"];let type=types[Math.floor(Math.random()*types.length)],x,y;do{x=50+Math.random()*(C.WW-100);y=50+Math.random()*(C.WH-100)}while((this.mapIndex===1&&inVillage(x,y))||Math.hypot(x-this.p.x,y-this.p.y)<220);this.es.push(new Enemy(type,this.i,x,y))}
  worldScale(){return this.p.cheepOn?.125:1}
 update(dt){this.p.currentMap=this.mapIndex;if(this.gameOver){if(this.input.tap("1"))location.reload();if(this.input.tap("2")){this.gameOver=false;this.p.hp=this.p.maxHp;this.p.energy=this.p.maxEnergy;this.mapIndex=1;this.p.x=V.gateX;this.p.y=V.y+V.h-120;this.es=[];this.setupNeutrals()}return}this.playTime+=dt;
  if(this.input.tap("i")&&!this.shop&&!this.p.choices.length)this.inventoryOpen=!this.inventoryOpen;if(this.inventoryOpen){for(let n=1;n<=8;n++)if(this.input.tap(String(n)))this.invSelected=n-1;if(this.input.tap("q"))this.p.equip(this.invSelected,0);if(this.input.tap("w"))this.p.equip(this.invSelected,1);if(this.input.tap("e"))this.p.equip(this.invSelected,2);return}
  if(this.p.choices.length){if(this.input.tap("1"))this.p.choose(0);if(this.input.tap("2"))this.p.choose(1);if(this.input.tap("3"))this.p.choose(2);return}
  if(this.shop){if(this.input.tap("f"))this.shop=false;if(this.input.tap("1"))this.p.buy("changongi");if(this.input.tap("2"))this.p.buy("cheep");if(this.input.tap("3"))this.p.buy("ice");return}
  if(this.input.tap("f")&&Math.hypot(this.p.x-this.bed.x,this.p.y-this.bed.y)<55){this.shop=true;return}
  let gateTarget=nearGate(this.p.x,this.p.y)?1:0;this.gateOpen+=(gateTarget-this.gateOpen)*(1-Math.exp(-8*dt));this.gateFrame=Math.max(0,Math.min(5,Math.round(this.gateOpen*5)));let wdt=dt*this.worldScale();this.spawnT+=wdt;if(this.spawnT>C.SPAWN){this.spawnT=0;this.spawn()}this.p.u(dt,this.input,this.es,this.fx);for(let e of this.es)e.u(wdt,this.p,this.proj,this.i,this.es);for(let n of this.neutrals)n.u(wdt,this.p,this.fx);for(let p of this.proj)p.u(wdt,this.p);for(let f of this.fx)f.u(wdt);for(let d of this.damageNumbers)d.u(dt);for(let n of this.npcs)n.u(wdt);this.proj=this.proj.filter(p=>!p.dead);this.fx=this.fx.filter(f=>f.life>0);this.damageNumbers=this.damageNumbers.filter(d=>d.life>0);this.p.damageNumbers=this.damageNumbers;
  if(Math.hypot(this.p.x-this.aura.x,this.p.y-this.aura.y)<this.aura.r)this.p.gainXP(18*dt);
  for(let e of this.es)if(e.dead&&!e.rewarded){e.rewarded=true;this.kills++;this.p.reward(e.gold||4,e.type==="boss"?35:10)}for(let n of this.neutrals)if(n.dead&&!n.rewarded){n.rewarded=true;this.p.reward(n.gold,40);if(n.kind==="blue")this.p.energyBuff=10;if(n.kind==="orange")this.p.flameAura=30;if(n.kind==="kage"){this.p.kpvsUnlocked=true;this.p.doubleStrike=true;this.p.kageDefeated=true}}
  if(this.p.x<=31){this.mapIndex=this.mapIndex===1?4:this.mapIndex-1;this.p.x=C.WW-35;this.es=[];this.setupNeutrals()}else if(this.p.x>=C.WW-31){this.mapIndex=this.mapIndex===4?1:this.mapIndex+1;this.p.x=35;this.es=[];this.setupNeutrals()}this.cam.follow(this.p,dt);if(this.p.hp<=0)this.gameOver=true
 }
 ground(){
  let sx=Math.floor(this.cam.x/32)*32,sy=Math.floor(this.cam.y/32)*32;
  if(this.mapIndex!==1){let im=this.mapIndex===2?this.i.map2:this.mapIndex===3?this.i.map3:this.i.map2,tw=32;for(let y=sy;y<this.cam.y+C.H+tw;y+=tw)for(let x=sx;x<this.cam.x+C.W+tw;x+=tw){let p=this.cam.s(x,y),cols=Math.max(1,Math.floor(im.width/tw)),rows=Math.max(1,Math.floor(im.height/tw)),h=Math.abs((Math.floor(x/96)*31)^(Math.floor(y/96)*17)),sx0=(h%cols)*tw,sy0=((Math.floor(h/cols))%rows)*tw;ctx.drawImage(im,sx0,sy0,tw,tw,p.x,p.y,tw,tw)}return}
  // add_4 field tiles: coherent 48x48 patches, not random 16px noise
  for(let y=sy;y<this.cam.y+C.H+48;y+=32)for(let x=sx;x<this.cam.x+C.W+48;x+=32){
   let p=this.cam.s(x,y),gx=Math.floor(x/96),gy=Math.floor(y/96),hash=Math.abs((gx*73856093)^(gy*19349663));
   let sourceY=inVillage(x,y)?48:(hash%5===0?96:48);
   ctx.drawImage(this.i.field,0,sourceY,48,48,p.x,p.y,48,48);
  }
  // village roads use a continuous textured crop from the supplied full tilemap
  for(let y=V.y+64;y<V.y+V.h+64;y+=32)for(let x=V.gateX-48;x<V.gateX+48;x+=32){
   let p=this.cam.s(x,y);ctx.drawImage(this.i.tilemap,192,0,64,64,p.x,p.y,36,36)
  }
  for(let y=V.y+145;y<V.y+215;y+=32)for(let x=V.x+64;x<V.x+V.w-64;x+=32){
   let p=this.cam.s(x,y);ctx.drawImage(this.i.tilemap,192,0,64,64,p.x,p.y,36,36)
  }

  // supplied 32x32 fence sprites
  const drawFence=(img,x,y)=>{let p=this.cam.s(x,y);ctx.drawImage(img,p.x-16,p.y-25,32,32)};
  for(let x=V.x+16;x<V.x+V.w-16;x+=32){
   drawFence(this.i.fenceH,x,V.y);
   if(x<V.gateX-V.gateW/2||x>V.gateX+V.gateW/2)drawFence(this.i.fenceH,x,V.y+V.h)
  }
  for(let y=V.y+16;y<V.y+V.h-16;y+=32){
   drawFence((Math.floor(y/32)%2)?this.i.fenceV:this.i.fenceV2,V.x,y);
   drawFence((Math.floor(y/32)%2)?this.i.fenceV:this.i.fenceV2,V.x+V.w,y)
  }
  drawFence(this.i.fenceL,V.x,V.y);drawFence(this.i.fenceR,V.x+V.w,V.y);

  let gp=this.cam.s(V.gateX,V.y+V.h+5),frameW=Math.max(1,Math.floor(this.i.gate.width/6)),frameH=this.i.gate.height;
  ctx.drawImage(this.i.gate,this.gateFrame*frameW,0,frameW,frameH,gp.x-48,gp.y-58,96,64)
 }
 draw(){
  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation="source-over";ctx.filter="none";ctx.clearRect(0,0,C.W,C.H);ctx.restore();this.ground();
  let ap=this.cam.s(this.aura.x,this.aura.y);ctx.fillStyle="rgba(85,190,255,.18)";ctx.beginPath();ctx.arc(ap.x,ap.y,this.aura.r+Math.sin(performance.now()/180)*4,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#79d9ff";ctx.stroke();
  let list=[];if(this.mapIndex===1)for(let b of this.buildings)list.push({y:b.y,d:()=>{let p=this.cam.s(b.x,b.y);ctx.drawImage(b.img,p.x-b.w/2,p.y-b.h,b.w,b.h)}});let bedp=this.cam.s(this.bed.x,this.bed.y);if(this.mapIndex===1)list.push({y:this.bed.y,d:()=>ctx.drawImage(this.i.bedNew,32,48,64,48,bedp.x-40,bedp.y-44,80,60)});if(this.mapIndex===1)for(let n of this.npcs)list.push({y:n.y,d:()=>n.d(ctx,this.cam)});for(let n of this.neutrals)if(!n.dead)list.push({y:n.y,d:()=>n.d(ctx,this.cam)});for(let e of this.es)if(!e.dead)list.push({y:e.y,d:()=>e.d(ctx,this.cam)});list.push({y:this.p.y,d:()=>this.p.d(ctx,this.cam)});list.sort((a,b)=>a.y-b.y);for(let o of list)o.d();for(let p of this.proj)p.d(ctx,this.cam);for(let f of this.fx)f.d0(ctx,this.cam);for(let d of this.damageNumbers)d.d(ctx,this.cam);
  if(this.mapIndex===1){let sd=Math.hypot(this.p.x-this.bed.x,this.p.y-this.bed.y);ctx.save();ctx.textAlign="center";ctx.fillStyle="rgba(255,221,91,.22)";ctx.beginPath();ctx.arc(bedp.x,bedp.y-22,24+Math.sin(performance.now()/170)*3,0,Math.PI*2);ctx.fill();ctx.fillStyle="#ffe587";ctx.font="bold 10px sans-serif";ctx.fillText(sd<55?"F 상점 열기":"상점",bedp.x,bedp.y-54);ctx.restore()}
  this.hud();if(this.gameOver)this.deathUI();if(this.shop)this.shopUI();if(this.inventoryOpen)this.inventoryUI();if(this.p.choices.length)this.levelUI()
 }
 hud(){
  ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation="source-over";ctx.filter="none";ctx.textAlign="left";ctx.fillStyle="rgba(7,12,9,.94)";ctx.fillRect(78,276,484,80);ctx.strokeStyle="#647a55";ctx.strokeRect(78.5,276.5,483,79);
  let hp=this.p.hp/this.p.maxHp,xp=this.p.xp/this.p.need,en=this.p.energy/this.p.maxEnergy;ctx.fillStyle="#261315";ctx.fillRect(90,283,170,11);ctx.fillStyle="#d94f50";ctx.fillRect(92,285,166*Math.max(0,hp),7);ctx.fillStyle="#10243c";ctx.fillRect(90,296,170,9);ctx.fillStyle="#42a8ff";ctx.fillRect(92,298,166*Math.max(0,en),5);ctx.fillStyle="#15301c";ctx.fillRect(90,307,170,8);ctx.fillStyle="#57d66b";ctx.fillRect(92,309,166*Math.max(0,xp),4);ctx.fillStyle="#fff";ctx.font="bold 8px sans-serif";ctx.fillText(`HP ${Math.ceil(this.p.hp)}/${this.p.maxHp}  EN ${Math.floor(this.p.energy)}/${this.p.maxEnergy}`,95,291);ctx.fillText(`LV ${this.p.level} XP ${Math.floor(this.p.xp)}/${this.p.need} G ${this.p.gold}`,90,326);
  let xs=[274,316,358,400],ks=["q","w","e","r"],cd=[16,9,13,35],icons=[this.i.sq,this.i.sw,this.i.se,this.i.sr];for(let j=0;j<4;j++){let s=this.p[ks[j]],x=xs[j];ctx.fillStyle="#101712";ctx.fillRect(x,284,38,38);ctx.drawImage(icons[j],x+3,287,32,32);if(!s.open){ctx.fillStyle="rgba(0,0,0,.82)";ctx.fillRect(x,284,38,38)}else if(s.cd>0){ctx.fillStyle="rgba(0,0,0,.67)";ctx.fillRect(x,284,38,38*Math.min(1,s.cd/cd[j]));ctx.fillStyle="#fff";ctx.fillText(s.cd.toFixed(1),x+8,307)}ctx.strokeStyle="#aaba98";ctx.strokeRect(x+.5,284.5,37,37);ctx.fillStyle="#fff";ctx.fillText(ks[j].toUpperCase(),x+2,293)}
  for(let j=0;j<3;j++){let id=this.p.items[j],x=452+j*34;ctx.fillStyle="#101712";ctx.fillRect(x,286,30,30);if(id){ctx.drawImage(this.i["item_"+id],x+2,288,26,26);let cdv=id==="cheep"?this.p.itemCd.cheep:id==="ice"?this.p.itemCd.ice:0;if(cdv>0){ctx.fillStyle="rgba(0,0,0,.68)";ctx.fillRect(x,286,30,30);ctx.fillStyle="#fff";ctx.fillText(cdv.toFixed(0),x+10,305)}}ctx.strokeStyle="#aaba98";ctx.strokeRect(x+.5,286.5,29,29);ctx.fillStyle="#fff";ctx.fillText(String(j+1),x+2,295)}
  if(this.p.has("changongi")){ctx.fillStyle="#f0d06b";ctx.fillText(`STACK ${this.p.chStacks}/12`,452,330)}
  if(this.p.warningT>0){ctx.textAlign="center";ctx.fillStyle="#ff7676";ctx.font="bold 12px sans-serif";ctx.fillText(this.p.warning,320,260)}ctx.textAlign="right";ctx.fillStyle="#fff";ctx.fillText(`MAP ${this.mapIndex}`,625,20);let buffs=[];if(this.p.energyBuff>0)buffs.push([this.i.energybuff,"Energy Buff: 10초 동안 총 50 에너지 회복",this.p.energyBuff]);if(this.p.flameAura>0)buffs.push([this.i.flameaura,"Flame Aura: 공격 대상에게 5초 화상",this.p.flameAura]);if(this.p.onFire>0)buffs.push([this.i.flameaura,"On Fire: 0.5초마다 1 피해",this.p.onFire]);if(this.p.kpvsUnlocked)buffs.push([this.i.kpvsIcon,"KPVS (D): 대시 후 강화 평타",this.p.kpvsCd]);if(this.p.doubleStrike)buffs.push([this.i.doubleStrike,"Double Strike: 4번째 평타 추가 타격",0]);buffs.forEach((b,n)=>{let x=592-n*37,y=35;ctx.drawImage(b[0],x,y,30,30);ctx.strokeStyle="#fff";ctx.strokeRect(x,y,30,30);ctx.textAlign="center";ctx.font="7px sans-serif";if(b[2]>0)ctx.fillText(b[2].toFixed(1),x+15,y+38);let mx=this.mouseX||-1,my=this.mouseY||-1;if(mx>=x&&mx<=x+30&&my>=y&&my<=y+30){ctx.fillStyle="rgba(0,0,0,.9)";ctx.fillRect(360,70,250,28);ctx.fillStyle="#fff";ctx.fillText(b[1],485,88)}});ctx.restore()
 }
 deathUI(){ctx.save();ctx.fillStyle="rgba(0,0,0,.86)";ctx.fillRect(0,0,C.W,C.H);ctx.textAlign="center";ctx.fillStyle="#ffdddd";ctx.font="bold 30px sans-serif";ctx.fillText("사망",320,90);ctx.fillStyle="#fff";ctx.font="14px sans-serif";ctx.fillText(`플레이 시간 ${Math.floor(this.playTime/60)}분 ${Math.floor(this.playTime%60)}초`,320,135);ctx.fillText(`골드 ${this.p.gold}   레벨 ${this.p.level}`,320,160);ctx.fillStyle="#b74242";ctx.fillRect(170,205,130,48);ctx.fillStyle="#347c45";ctx.fillRect(340,205,130,48);ctx.fillStyle="#fff";ctx.fillText("1. 리셋",235,235);ctx.fillText("2. 부활",405,235);ctx.restore()}
 inventoryUI(){ctx.save();ctx.fillStyle="rgba(2,5,4,.94)";ctx.fillRect(0,0,C.W,C.H);ctx.textAlign="center";ctx.fillStyle="#fff";ctx.font="bold 20px sans-serif";ctx.fillText("INVENTORY 8",320,48);ctx.font="10px sans-serif";ctx.fillText("1~8 선택 · Q/W/E 장착 슬롯 · I 닫기",320,68);for(let n=0;n<8;n++){let x=105+(n%4)*110,y=95+Math.floor(n/4)*105,id=this.p.inventory[n];ctx.fillStyle=n===this.invSelected?"#31472e":"#111b14";ctx.fillRect(x,y,90,88);ctx.strokeStyle="#a8c67e";ctx.strokeRect(x+.5,y+.5,89,87);if(id){ctx.drawImage(this.i["item_"+id],x+25,y+8,40,40);ctx.fillStyle="#fff";ctx.font="9px sans-serif";ctx.fillText(ITEM_DATA[id].name,x+45,y+64)}ctx.fillStyle="#d6e5c2";ctx.fillText(String(n+1),x+10,y+14)}ctx.fillStyle="#ffe28a";ctx.fillText(`장착: ${this.p.items.map(x=>x?ITEM_DATA[x].name:"빈칸").join(" / ")}`,320,324);ctx.restore()}
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
 grass:"assets/tiles/grass.png",plains:"assets/tiles/plains.png",bed:"assets/objects/bed.png",bedNew:"assets/objects/add4/bed_tileset.png",gate:"assets/objects/gate/double.png",field:"assets/tiles/add4/field.png",tilemap:"assets/tiles/add4/tilemap.png",fenceL:"assets/fence/add4/corner_left.png",fenceH:"assets/fence/add4/horizontal.png",fenceR:"assets/fence/add4/corner_right.png",fenceV:"assets/fence/add4/vertical.png",fenceV2:"assets/fence/add4/vertical_alt.png",
 castle:"assets/buildings/castle.png",house1:"assets/buildings/house1.png",house2:"assets/buildings/house2.png",monastery:"assets/buildings/monastery.png",barracks:"assets/buildings/barracks.png",nb1:"assets/buildings/new/b1.png",nb2:"assets/buildings/new/b2.png",
 circle:"assets/fx/circle.png",a1:"assets/fx/alpha_1.png",a2:"assets/fx/alpha_2.png",a3:"assets/fx/alpha_3.png",a4:"assets/fx/alpha_4.png",
 med1:"assets/fx/meditate/meditate1.png",med2:"assets/fx/meditate/meditate2.png",med3:"assets/fx/meditate/meditate3.png",
 high1:"assets/fx/highlander/h1.png",high2:"assets/fx/highlander/h2.png",highWhite:"assets/fx/highlander/h3white.png",highOrange:"assets/fx/highlander/h3orange.png",
 wuju1:"assets/fx/wuju1/sheet.png",
 iceMain:"assets/fx/ice/main.png",iceB:"assets/fx/ice/b.png",
 item_changongi:"assets/items/changongi.png",item_cheep:"assets/items/cheep.png",item_ice:"assets/items/iceage.png",
 sq:"assets/skills/q.png",sw:"assets/skills/w.png",se:"assets/skills/e.png",sr:"assets/skills/r.png",map2:"assets/maps/map2.png",map3:"assets/maps/map3.png",map4:"assets/maps/map4.png",slimeNew:"assets/enemies/v056/slime/slime.png",archerIdle:"assets/enemies/v056/archer/idle.png",archerRun:"assets/enemies/v056/archer/run.png",archerShoot:"assets/enemies/v056/archer/shoot.png",archerArrow:"assets/enemies/v056/archer/arrow.png",lancerRun:"assets/enemies/v056/lancer/run.png",lancerIdle:"assets/enemies/v056/lancer/idle.png",lancerRightAttack:"assets/enemies/v056/lancer/right_attack.png",lancerUpAttack:"assets/enemies/v056/lancer/up_attack.png",lancerDownAttack:"assets/enemies/v056/lancer/down_attack.png",lancerUpRightAttack:"assets/enemies/v056/lancer/upright_attack.png",lancerDownRightAttack:"assets/enemies/v056/lancer/downright_attack.png",monkIdle:"assets/enemies/v056/monk/idle.png",monkRun:"assets/enemies/v056/monk/run.png",monkHeal:"assets/enemies/v056/monk/heal.png",monkHealEffect:"assets/enemies/v056/monk/heal_effect.png",pawnPickaxe:"assets/enemies/v056/pawn/pickaxe.png",pawnRunGold:"assets/enemies/v056/pawn/run_gold.png",pawnRun:"assets/enemies/v056/pawn/run.png",bossAttack:"assets/enemies/v056/boss/attack.png",bossRun:"assets/enemies/v056/boss/run.png",bossIdle:"assets/enemies/v056/boss/idle.png",bossGuard:"assets/enemies/v056/boss/guard.png",blueWalk:"assets/enemies/neutral/blue/walk.png",blueAttack:"assets/enemies/neutral/blue/attack.png",orangeWalk:"assets/enemies/neutral/orange/walk.png",orangeAttack:"assets/enemies/neutral/orange/attack.png",kageSword:"assets/enemies/neutral/kage/sword.png",energybuff:"assets/icons/energybuff.png",flameaura:"assets/icons/flameaura.png",kpvsIcon:"assets/icons/kpvs.png",kpvsReinforced:"assets/icons/kpvs_reinforced.png",doubleStrike:"assets/icons/doublestrike.png"
};
M.wuju2=[];for(let n=1;n<=10;n++)M["wuju2_"+n]=`assets/fx/wuju2/e${n}.png`;
M.wuju3=[];for(let n=1;n<=6;n++)M["wuju3_"+n]=`assets/fx/wuju3/smoke${n}.png`;
const roadNames=[1,2,3,4,5,6,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64];roadNames.forEach(n=>M["road"+n]=`assets/tiles/road/tile${String(n).padStart(2,"0")}.png`);

(async()=>{try{let i=await new Loader(M).load();i.wuju2=[];for(let n=1;n<=10;n++)i.wuju2.push(i["wuju2_"+n]);i.wuju3=[];for(let n=1;n<=6;n++)i.wuju3.push(i["wuju3_"+n]);i.roadTiles=roadNames.map(n=>i["road"+n]);new Game(i).start()}catch(e){console.error(e);loadingText.textContent="시작 오류: "+e.message}})();
