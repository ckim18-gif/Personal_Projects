
const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
ctx.imageSmoothingEnabled=false;
function resize(){canvas.width=innerWidth;canvas.height=innerHeight;}
addEventListener('resize',resize);resize();

const keys={};
addEventListener('keydown',e=>keys[e.key.toLowerCase()]=true);
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);

const p={x:200,y:200,s:220};
let last=performance.now(),fps=0;

function loop(t){
 const dt=(t-last)/1000; last=t; fps=1/dt;
 if(keys['w'])p.y-=p.s*dt;
 if(keys['s'])p.y+=p.s*dt;
 if(keys['a'])p.x-=p.s*dt;
 if(keys['d'])p.x+=p.s*dt;
 ctx.fillStyle='#2f6b2f'; ctx.fillRect(0,0,canvas.width,canvas.height);
 for(let x=0;x<canvas.width;x+=32){for(let y=0;y<canvas.height;y+=32){
  ctx.strokeStyle='rgba(0,0,0,.08)';ctx.strokeRect(x,y,32,32);
 }}
 ctx.fillStyle='#3af'; ctx.fillRect(p.x,p.y,24,24);
 ctx.fillStyle='white'; ctx.font='16px monospace';
 ctx.fillText('Project Ronin v0.1',10,22);
 ctx.fillText('WASD Move',10,42);
 ctx.fillText('FPS '+fps.toFixed(0),10,62);
 requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
