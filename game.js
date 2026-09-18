'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const ui={level:document.getElementById('level'),score:document.getElementById('score'),lives:document.getElementById('lives'),traps:document.getElementById('traps'),objective:document.getElementById('objective'),alert:document.getElementById('alert'),inventory:document.getElementById('inventory'),lastFound:document.getElementById('lastFound')};
const modal=document.getElementById('modal'),startBtn=document.getElementById('startBtn'),helpBtn=document.getElementById('helpBtn');
const W=960,H=540,T=40,COLS=24,ROWS=13;
const keys=new Set();
let running=false,paused=false,last=0,level=0,score=0,lives=3,trapCount=3,hasDossier=false,searchCooldown=0,alerted=false,found={dossier:0,trap:0,medkit:0,intel:0},reveal=null;
let player,guards=[],crates=[],traps=[],exitDoor,walls=[];
const LEVELS=[
 {name:"Alpenposten",guards:1,crates:3,traps:3,speed:70,theme:"BERGPOSTEN"},
 {name:"Gotthard-Depot",guards:1,crates:4,traps:3,speed:78,theme:"TUNNEL"},
 {name:"Rhone-Lager",guards:2,crates:4,traps:3,speed:74,theme:"DEPOT"},
 {name:"Jura-Station",guards:2,crates:5,traps:3,speed:82,theme:"STATION"},
 {name:"Aare-Werk",guards:2,crates:5,traps:2,speed:90,theme:"WERK"},
 {name:"Alpenbunker",guards:3,crates:5,traps:3,speed:84,theme:"BUNKER"},
 {name:"Rätikon-Pass",guards:3,crates:6,traps:3,speed:92,theme:"PASS"},
 {name:"Bernina-Archiv",guards:3,crates:6,traps:2,speed:100,theme:"ARCHIV"},
 {name:"Helvetic Vault",guards:4,crates:6,traps:3,speed:98,theme:"VAULT"},
 {name:"Gipfelstation",guards:4,crates:7,traps:2,speed:108,theme:"GIPFEL"}
];
function rect(x,y,w,h){return{x,y,w,h}}
function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function blocked(r){return walls.some(w=>overlap(r,w))}
function seeded(n){let x=Math.sin(n*999)*43758.5453;return x-Math.floor(x)}
function makeLevel(){
 const cfg=LEVELS[level]; hasDossier=false; trapCount=cfg.traps; traps=[]; guards=[]; crates=[]; walls=[];
 player={x:55,y:65,w:24,h:24,speed:165,inv:0};
 exitDoor=rect(W-70,H-75,34,46);
 // Outer Swiss-fortress geometry + level-dependent inner walls.
 walls.push(rect(0,0,W,30),rect(0,H-30,W,30),rect(0,0,30,H),rect(W-30,0,30,H));
 const patterns=[
  [[5,2,1,6],[11,5,5,1],[18,2,1,6]],
  [[6,1,1,7],[12,5,1,7],[18,1,1,7]],
  [[4,4,6,1],[14,4,6,1],[9,8,6,1]],
  [[6,2,1,4],[6,8,1,3],[12,4,1,6],[18,2,1,7]],
  [[4,3,7,1],[13,3,7,1],[7,8,10,1]]
 ];
 const p=patterns[level%patterns.length];
 p.forEach(a=>walls.push(rect(a[0]*T,a[1]*T,a[2]*T,a[3]*T)));
 let spots=[];
 for(let y=1;y<12;y++)for(let x=1;x<23;x++){let r=rect(x*T+8,y*T+8,24,24);if(!blocked(r)&&Math.hypot(r.x-player.x,r.y-player.y)>120&&Math.hypot(r.x-exitDoor.x,r.y-exitDoor.y)>80)spots.push(r)}
 for(let i=spots.length-1;i>0;i--){let j=Math.floor(seeded(level*100+i)* (i+1));[spots[i],spots[j]]=[spots[j],spots[i]]}
 for(let i=0;i<cfg.crates;i++){let s=spots.pop(),roll=seeded(level*71+i*19),loot=roll>.78?'medkit':roll>.48?'intel':roll>.25?'trap':'empty';crates.push({...s,w:28,h:28,searched:false,loot})}
 crates[Math.floor(seeded(level+33)*crates.length)].loot='dossier';
 for(let i=0;i<cfg.guards;i++){let s=spots.pop();guards.push({x:s.x,y:s.y,w:24,h:24,speed:cfg.speed,stun:0,target:null,repath:0,phase:i})}
 reveal=null;alerted=false;
 updateUI();
}
function updateUI(){
 ui.level.textContent=`LEVEL ${level+1} · ${LEVELS[level].name.toUpperCase()}`;
 ui.score.textContent=`PUNKTE ${String(score).padStart(5,'0')}`;
 ui.lives.textContent=`LEBEN ${lives}`; ui.traps.textContent=`FALLEN ${trapCount}`;
 ui.objective.textContent=hasDossier?"AUFTRAG: ZUM AUSGANG":"AUFTRAG: DOSSIER FINDEN";
 ui.inventory.textContent=`FUNDE: DOSSIER ${found.dossier} · FALLEN ${found.trap} · MEDKIT ${found.medkit} · HINWEISE ${found.intel}`;
 ui.alert.textContent=alerted?'STATUS: ALARM — PATROUILLEN VERFOLGEN DICH':'STATUS: UNENTDECKT';ui.alert.classList.toggle('danger',alerted);
}
function moveEntity(e,dx,dy){
 let nx={...e,x:e.x+dx}; if(!blocked(nx))e.x=nx.x;
 let ny={...e,y:e.y+dy}; if(!blocked(ny))e.y=ny.y;
 e.x=Math.max(31,Math.min(W-31-e.w,e.x));e.y=Math.max(31,Math.min(H-31-e.h,e.y));
}
function placeTrap(){
 if(!running||paused||trapCount<=0)return;
 if(traps.some(t=>Math.hypot(t.x-player.x,t.y-player.y)<35))return;
 traps.push({x:player.x+4,y:player.y+4,w:16,h:16,life:18});trapCount--;updateUI();
}
function search(){
 if(!running||paused||searchCooldown>0)return; searchCooldown=.35;
 let c=crates.find(c=>!c.searched&&Math.hypot(c.x-player.x,c.y-player.y)<58);
 if(!c)return;
 c.searched=true;let label='DEPOT LEER',color='#8a8a8a';
 if(c.loot==='dossier'){hasDossier=true;found.dossier++;score+=500;label='GEHEIMDOSSIER';color='#f3d34a';toast("DOSSIER GEFUNDEN — AUSGANG ERREICHEN");}
 else if(c.loot==='trap'){trapCount++;found.trap++;score+=150;label='ERSATZFALLE';color='#63d6ff';toast("ERSATZFALLE GEFUNDEN");}
 else if(c.loot==='medkit'){if(lives<5)lives++;found.medkit++;score+=200;label='SANITÄTSPAKET +1 LEBEN';color='#7fe38d';toast("SANITÄTSPAKET GEFUNDEN");}
 else if(c.loot==='intel'){found.intel++;score+=250;guards.forEach(g=>g.stun=Math.max(g.stun,1.4));label='PATROUILLENPLAN +250';color='#d6a8ff';toast("PATROUILLENPLAN — GEGNER KURZ GESTOPPT");}
 else {score+=50;toast("DEPOT LEER — WEITERSUCHEN");}
 ui.lastFound.textContent=`LETZTER FUND: ${label}`;reveal={text:label,color,time:2.2};
 updateUI();
}
function toast(msg){ui.objective.textContent=msg;setTimeout(()=>{if(running)updateUI()},1200)}
function loseLife(){
 if(player.inv>0)return;lives--;player.inv=1.8;
 if(lives<=0){endGame(false);return}
 player.x=55;player.y=65;updateUI();toast("ERWISCHT — ZURÜCK ZUM START");
}
function nextLevel(){
 score+=1000+trapCount*100;
 if(level>=LEVELS.length-1){endGame(true);return}
 level++;makeLevel();toast("NÄCHSTER EINSATZ");
}
function endGame(win){
 running=false;
 modal.innerHTML=`<div class="panel"><h1>${win?"AUFTRAG ERFÜLLT":"EINSATZ BEENDET"}</h1><p class="result">Punkte: <b>${score}</b></p><p>${win?"Alle 10 Phase-1-Einsätze abgeschlossen.":"Die Patrouillen haben dich gestoppt."}</p><p class="note">HELVETICTRAP '84 · Phase 1</p><button id="again">NEU STARTEN</button></div>`;
 modal.classList.add('show');document.getElementById('again').onclick=startGame;
}
function startGame(){level=0;score=0;lives=3;found={dossier:0,trap:0,medkit:0,intel:0};ui.lastFound.textContent='LETZTER FUND: —';paused=false;running=true;makeLevel();modal.classList.remove('show');last=performance.now();requestAnimationFrame(loop)}
function choosePatrolTarget(g){
 const candidates=[];for(let y=1;y<12;y++)for(let x=1;x<23;x++){let r=rect(x*T+8,y*T+8,g.w,g.h);if(!blocked(r)&&Math.hypot(r.x-g.x,r.y-g.y)>90)candidates.push(r)}
 if(!candidates.length)return{x:g.x,y:g.y};let idx=Math.floor(seeded(level*401+g.phase*97+Math.floor(performance.now()/1200))*candidates.length);return candidates[idx];
}
function update(dt){
 if(!running||paused)return;
 searchCooldown=Math.max(0,searchCooldown-dt);player.inv=Math.max(0,player.inv-dt);
 if(reveal){reveal.time-=dt;if(reveal.time<=0)reveal=null}
 let dx=0,dy=0;if(keys.has('ArrowLeft')||keys.has('KeyA'))dx--;if(keys.has('ArrowRight')||keys.has('KeyD'))dx++;if(keys.has('ArrowUp')||keys.has('KeyW'))dy--;if(keys.has('ArrowDown')||keys.has('KeyS'))dy++;
 if(dx||dy){let n=Math.hypot(dx,dy);moveEntity(player,dx/n*player.speed*dt,dy/n*player.speed*dt)}
 traps.forEach(t=>t.life-=dt);traps=traps.filter(t=>t.life>0);
 alerted=guards.some(g=>g.stun<=0&&Math.hypot(g.x-player.x,g.y-player.y)<210);
 guards.forEach(g=>{
  if(g.stun>0){g.stun-=dt;return}
  g.repath-=dt;let sees=Math.hypot(g.x-player.x,g.y-player.y)<210;
  if(sees)g.target={x:player.x,y:player.y};else if(!g.target||g.repath<=0||Math.hypot(g.target.x-g.x,g.target.y-g.y)<18){g.target=choosePatrolTarget(g);g.repath=1.2}
  let ax=g.target.x-g.x,ay=g.target.y-g.y,n=Math.hypot(ax,ay)||1,before={x:g.x,y:g.y};moveEntity(g,ax/n*g.speed*(sees?1.28:1)*dt,ay/n*g.speed*(sees?1.28:1)*dt);
  if(Math.hypot(g.x-before.x,g.y-before.y)<.2){g.target=choosePatrolTarget(g);g.repath=.1}
  traps.forEach(t=>{if(overlap(g,t)){g.stun=3.2;t.life=0;score+=250;updateUI()}});
  if(overlap(player,g))loseLife();
 });
 ui.alert.textContent=alerted?'STATUS: ALARM — PATROUILLEN VERFOLGEN DICH':'STATUS: UNENTDECKT';ui.alert.classList.toggle('danger',alerted);
 if(hasDossier&&overlap(player,exitDoor))nextLevel();
}
function draw(){
 ctx.fillStyle='#11161a';ctx.fillRect(0,0,W,H);
 // alpine skyline
 ctx.fillStyle='#26323a';ctx.beginPath();ctx.moveTo(0,120);for(let x=0;x<=W;x+=80){ctx.lineTo(x+40,45+(x%160?35:0));ctx.lineTo(x+80,120)}ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
 // floor grid
 ctx.strokeStyle='#1f292e';ctx.lineWidth=1;for(let x=0;x<W;x+=T){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=0;y<H;y+=T){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
 // walls
 walls.forEach(w=>{ctx.fillStyle='#667078';ctx.fillRect(w.x,w.y,w.w,w.h);ctx.fillStyle='#30383d';for(let x=w.x;x<w.x+w.w;x+=20)ctx.fillRect(x,w.y,2,w.h)});
 // Swiss marker
 ctx.fillStyle='#b82028';ctx.fillRect(44,38,44,32);ctx.fillStyle='#fff';ctx.fillRect(61,43,10,22);ctx.fillRect(55,49,22,10);
 // exit
 ctx.fillStyle=hasDossier?'#e9e1b2':'#555';ctx.fillRect(exitDoor.x,exitDoor.y,exitDoor.w,exitDoor.h);ctx.fillStyle='#111';ctx.fillRect(exitDoor.x+8,exitDoor.y+8,18,30);ctx.fillStyle='#ddd';ctx.font='12px monospace';ctx.fillText('EXIT',exitDoor.x-1,exitDoor.y-6);
 crates.forEach(c=>{ctx.fillStyle=c.searched?'#454545':'#b28a4b';ctx.fillRect(c.x,c.y,c.w,c.h);ctx.strokeStyle='#e0c18b';ctx.strokeRect(c.x+3,c.y+3,c.w-6,c.h-6);if(c.searched){ctx.strokeStyle='#222';ctx.beginPath();ctx.moveTo(c.x,c.y);ctx.lineTo(c.x+c.w,c.y+c.h);ctx.stroke()}});
 traps.forEach(t=>{ctx.strokeStyle='#f3d34a';ctx.lineWidth=2;ctx.beginPath();ctx.arc(t.x+8,t.y+8,8,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(t.x+3,t.y+3);ctx.lineTo(t.x+13,t.y+13);ctx.moveTo(t.x+13,t.y+3);ctx.lineTo(t.x+3,t.y+13);ctx.stroke()});
 guards.forEach(g=>{ctx.fillStyle=g.stun>0?'#858585':'#c74646';ctx.fillRect(g.x,g.y,g.w,g.h);ctx.fillStyle='#111';ctx.fillRect(g.x+5,g.y+6,4,4);ctx.fillRect(g.x+15,g.y+6,4,4)});
 if(player.inv<=0||Math.floor(player.inv*10)%2===0){ctx.fillStyle='#e8e8dc';ctx.fillRect(player.x,player.y,player.w,player.h);ctx.fillStyle='#b82028';ctx.fillRect(player.x+7,player.y+7,10,10);ctx.fillStyle='#fff';ctx.fillRect(player.x+11,player.y+8,2,8);ctx.fillRect(player.x+8,player.y+11,8,2)}
 ctx.fillStyle='#eee';ctx.font='14px monospace';ctx.fillText(LEVELS[level].theme,40,H-42);
 if(reveal){ctx.fillStyle='#000d';ctx.fillRect(W/2-190,36,380,58);ctx.strokeStyle=reveal.color;ctx.lineWidth=3;ctx.strokeRect(W/2-190,36,380,58);ctx.fillStyle=reveal.color;ctx.font='bold 20px monospace';ctx.textAlign='center';ctx.fillText(reveal.text,W/2,72);ctx.textAlign='left'}
 if(paused){ctx.fillStyle='#000b';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.font='36px monospace';ctx.textAlign='center';ctx.fillText('PAUSE',W/2,H/2);ctx.textAlign='left'}
}
function loop(t){let dt=Math.min(.033,(t-last)/1000||0);last=t;update(dt);draw();if(running)requestAnimationFrame(loop)}
addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='Space')placeTrap();if(e.code==='KeyE')search();if(e.code==='KeyP')paused=!paused});
addEventListener('keyup',e=>keys.delete(e.code));
document.querySelectorAll('[data-key]').forEach(b=>{let k=b.dataset.key;const down=e=>{e.preventDefault();keys.add(k);if(k==='Space')placeTrap();if(k==='KeyE')search()};const up=e=>{e.preventDefault();keys.delete(k)};b.addEventListener('pointerdown',down);b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('pointerleave',up)});
startBtn.onclick=startGame;
helpBtn.onclick=()=>{paused=true;modal.innerHTML=`<div class="panel"><h1>ANLEITUNG</h1><p>Finde das Dossier in einem der Depots. Stelle dich nahe an eine Kiste und drücke E/SUCHEN. Nach dem Fund wird der Ausgang aktiv.</p><p>Patrouillen kosten bei Berührung ein Leben. Lege mit Leertaste/FALLE eine Bodenfalle. Eine Patrouille bleibt danach kurz ausgeschaltet.</p><p>WASD/Pfeile bewegen · E suchen · Leertaste Falle · P Pause</p><button id="resume">WEITER</button></div>`;modal.classList.add('show');document.getElementById('resume').onclick=()=>{modal.classList.remove('show');paused=false;last=performance.now();if(running)requestAnimationFrame(loop)}};
