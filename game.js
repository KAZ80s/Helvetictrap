'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const ui={level:document.getElementById('level'),score:document.getElementById('score'),lives:document.getElementById('lives'),traps:document.getElementById('traps'),objective:document.getElementById('objective'),alert:document.getElementById('alert'),inventory:document.getElementById('inventory'),lastFound:document.getElementById('lastFound')};
const modal=document.getElementById('modal'),startBtn=document.getElementById('startBtn'),startPhase2Btn=document.getElementById('startPhase2Btn'),startPhase3Btn=document.getElementById('startPhase3Btn'),helpBtn=document.getElementById('helpBtn');
const W=960,H=540,T=40,COLS=24,ROWS=13;
const keys=new Set();
const TRAP_TYPES=[{id:'stun',label:'SCHOCK'},{id:'decoy',label:'KÖDER'},{id:'smoke',label:'RAUCH'},{id:'net',label:'NETZ'}];
let running=false,paused=false,last=0,level=0,score=0,lives=3,trapStock={stun:3,decoy:0,smoke:0,net:0},selectedTrap=0,hasDossier=false,searchCooldown=0,alerted=false,found={dossier:0,trap:0,medkit:0,intel:0},reveal=null,levelIntro=0,campaignStart=0;
let elapsed=0,combo=0,comboTime=0,effects=[],soundEnabled=true,audioContext=null,levelClear=0,pendingLevel=false;
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
 {name:"Gipfelstation",guards:4,crates:7,traps:2,speed:108,theme:"GIPFEL"},
 {name:"Luzern-Kasematte",guards:3,crates:6,traps:3,speed:94,theme:"KASEMATTE"},
 {name:"Susten-Stollen",guards:3,crates:7,traps:3,speed:98,theme:"STOLLEN"},
 {name:"Zürich-Werkhof",guards:4,crates:7,traps:3,speed:96,theme:"WERKHOF"},
 {name:"Wallis-Kraftwerk",guards:4,crates:7,traps:2,speed:102,theme:"KRAFTWERK"},
 {name:"Engadin-Depot",guards:4,crates:8,traps:3,speed:106,theme:"ENGADIN"},
 {name:"Basel-Rheinhafen",guards:5,crates:8,traps:3,speed:103,theme:"HAFEN"},
 {name:"Gruyère-Festung",guards:5,crates:8,traps:2,speed:108,theme:"FESTUNG"},
 {name:"Jungfrau-Labor",guards:5,crates:9,traps:3,speed:111,theme:"LABOR"},
 {name:"Simplon-Vault",guards:6,crates:9,traps:2,speed:114,theme:"SIMPLON"},
 {name:"Bundesarchiv",guards:6,crates:10,traps:2,speed:118,theme:"ARCHIV FINALE"},
 {name:"Emmental-Dorf",guards:5,crates:8,traps:3,speed:108,theme:"BERGHÜTTE",scene:"hut",ground:"#172219",sky:"#35513c",wall:"#766b52"},
 {name:"Brienzersee-Werft",guards:5,crates:9,traps:3,speed:111,theme:"SEEUFER",scene:"lake",ground:"#10242b",sky:"#245366",wall:"#607985"},
 {name:"Thun-Altstadt",guards:6,crates:9,traps:2,speed:110,theme:"ALTSTADT",scene:"tower",ground:"#251f18",sky:"#594932",wall:"#887359"},
 {name:"Bern-Hauptbahnhof",guards:6,crates:9,traps:3,speed:114,theme:"BAHNHOF",scene:"station",ground:"#20242a",sky:"#3a424c",wall:"#737b84"},
 {name:"Furka-Festung",guards:6,crates:10,traps:2,speed:116,theme:"FESTUNG",scene:"fortress",ground:"#24282a",sky:"#475156",wall:"#7c8588"},
 {name:"Aletsch-Forschungsstation",guards:6,crates:10,traps:3,speed:117,theme:"GLETSCHER",scene:"glacier",ground:"#17252c",sky:"#315b6b",wall:"#8ca8b4"},
 {name:"Chur-Güterdepot",guards:7,crates:10,traps:2,speed:119,theme:"GÜTERDEPOT",scene:"depot",ground:"#242018",sky:"#504532",wall:"#80765f"},
 {name:"Tessiner-Kasematte",guards:7,crates:10,traps:3,speed:120,theme:"ARKADEN",scene:"arches",ground:"#2a2118",sky:"#604d32",wall:"#9a8162"},
 {name:"Rigi-Bergstation",guards:7,crates:11,traps:2,speed:122,theme:"BERGSTATION",scene:"cable",ground:"#1b2620",sky:"#405e4d",wall:"#74897a"},
 {name:"Matterhorn-Gipfelbasis",guards:7,crates:11,traps:3,speed:124,theme:"GIPFELBASIS",scene:"summit",ground:"#19212a",sky:"#344a61",wall:"#788a9d"}
];
function sound(freq=440,duration=.09){
 if(!soundEnabled)return;
 try{const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return;
 audioContext=audioContext||new Audio();if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
 const o=audioContext.createOscillator(),g=audioContext.createGain();o.type='square';o.frequency.value=freq;
 g.gain.setValueAtTime(.035,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+duration);
 o.connect(g);g.connect(audioContext.destination);o.start();o.stop(audioContext.currentTime+duration);
 }catch{} }
function burst(x,y,color='#f3d34a'){for(let i=0;i<12;i++){let a=i*Math.PI/6;effects.push({x,y,vx:Math.cos(a)*65,vy:Math.sin(a)*65,life:.5,color})}}
function awardCombo(){combo=comboTime>0?Math.min(5,combo+1):1;comboTime=5;let bonus=(combo-1)*100;score+=bonus;sound(360+combo*110);burst(player.x+12,player.y+12);updateArcade()}
function updateArcade(){document.getElementById('arcade').textContent=`ZEIT ${Math.floor(elapsed)}s · ZEITBONUS ${Math.max(0,1200-Math.floor(elapsed)*10)} · COMBO ×${Math.max(1,combo)}`}
function rect(x,y,w,h){return{x,y,w,h}}
function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function blocked(r){return walls.some(w=>overlap(r,w))}
function seeded(n){let x=Math.sin(n*999)*43758.5453;return x-Math.floor(x)}
function trapInfo(){return TRAP_TYPES[selectedTrap]}
function totalTraps(){return Object.values(trapStock).reduce((a,b)=>a+b,0)}
function cycleTrap(){
 if(!running||paused||pendingLevel||levelIntro>0)return;
 for(let i=1;i<=TRAP_TYPES.length;i++){let next=(selectedTrap+i)%TRAP_TYPES.length;if(trapStock[TRAP_TYPES[next].id]>0){selectedTrap=next;break}}
 updateUI();
}
function makeLevel(){
 elapsed=0;combo=0;comboTime=0;effects=[];levelClear=0;pendingLevel=false;updateArcade();
 const cfg=LEVELS[level]; hasDossier=false; traps=[]; guards=[]; crates=[]; walls=[];
 trapStock={stun:cfg.traps,decoy:level>=3?1:0,smoke:level>=6?1:0,net:level>=9?1:0};selectedTrap=0;
 player={x:55,y:65,w:24,h:24,speed:175,inv:0};
 exitDoor=rect(W-70,H-75,34,46);
 // Outer Swiss-fortress geometry + level-dependent inner walls.
 walls.push(rect(0,0,W,30),rect(0,H-30,W,30),rect(0,0,30,H),rect(W-30,0,30,H));
 const patterns=[
  [[5,2,1,6],[11,5,5,1],[18,2,1,6]],
  [[6,1,1,7],[12,5,1,7],[18,1,1,7]],
  [[4,4,6,1],[14,4,6,1],[9,8,6,1]],
  [[6,2,1,4],[6,8,1,3],[12,4,1,6],[18,2,1,7]],
  [[4,3,7,1],[13,3,7,1],[7,8,10,1]],
  [[3,2,1,7],[8,6,8,1],[20,2,1,7]],
  [[5,2,5,1],[14,2,5,1],[5,8,5,1],[14,8,5,1]],
  [[7,1,1,5],[7,8,1,4],[16,1,1,5],[16,8,1,4]],
  [[3,4,7,1],[14,4,7,1],[8,9,8,1]],
  [[5,2,1,8],[10,2,1,4],[14,6,1,6],[19,2,1,8]],
  [[4,2,5,1],[15,2,5,1],[9,6,6,1],[4,9,5,1],[15,9,5,1]],
  [[3,3,1,7],[8,1,1,6],[13,6,1,6],[19,2,1,7]],
  [[5,1,1,5],[5,8,1,4],[11,4,6,1],[19,1,1,5],[19,8,1,4]],
  [[3,2,7,1],[14,2,7,1],[7,6,10,1],[3,10,7,1],[14,10,7,1]],
  [[4,1,1,8],[9,4,1,8],[14,1,1,8],[19,4,1,8]]
 ];
 const p=patterns[level%patterns.length];
 p.forEach(a=>walls.push(rect(a[0]*T,a[1]*T,a[2]*T,a[3]*T)));
 let spots=[];
 for(let y=1;y<12;y++)for(let x=1;x<23;x++){let r=rect(x*T+8,y*T+8,24,24);if(!blocked(r)&&Math.hypot(r.x-player.x,r.y-player.y)>120&&Math.hypot(r.x-exitDoor.x,r.y-exitDoor.y)>80)spots.push(r)}
 for(let i=spots.length-1;i>0;i--){let j=Math.floor(seeded(level*100+i)* (i+1));[spots[i],spots[j]]=[spots[j],spots[i]]}
 for(let i=0;i<cfg.crates;i++){let s=spots.pop(),roll=seeded(level*71+i*19),loot=roll>.78?'medkit':roll>.48?'intel':roll>.25?'trap':'empty';crates.push({...s,w:28,h:28,searched:false,loot})}
 crates[Math.floor(seeded(level+33)*crates.length)].loot='dossier';
 for(let i=0;i<cfg.guards;i++){let best=0;for(let j=1;j<spots.length;j++)if(Math.hypot(spots[j].x-player.x,spots[j].y-player.y)>Math.hypot(spots[best].x-player.x,spots[best].y-player.y))best=j;let s=spots.splice(best,1)[0],type=level<10?'normal':['armor','detector','sprint','normal'][i%4];guards.push({x:s.x,y:s.y,w:24,h:24,speed:cfg.speed*1.04*(type==='sprint'?1.14:1),stun:0,slow:0,target:null,repath:0,phase:i,type})}
 reveal=null;alerted=false;levelIntro=3;keys.clear();
 updateUI();
}
function updateUI(){
 ui.level.textContent=`LEVEL ${level+1} · ${LEVELS[level].name.toUpperCase()}`;
 ui.score.textContent=`PUNKTE ${String(score).padStart(5,'0')}`;
 ui.lives.textContent=`LEBEN ${lives}`; ui.traps.textContent=`FALLE ${trapInfo().label} ${trapStock[trapInfo().id]} · TOTAL ${totalTraps()}`;
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
 if(!running||paused||pendingLevel||levelIntro>0||trapStock[trapInfo().id]<=0)return;
 if(traps.some(t=>Math.hypot(t.x-player.x,t.y-player.y)<35))return;
 let type=trapInfo().id;traps.push({x:player.x+4,y:player.y+4,w:16,h:16,type,life:type==='stun'||type==='net'?18:type==='decoy'?6:7});trapStock[type]--;
 if(trapStock[type]<=0)cycleTrap();else updateUI();
}
function search(){
 if(!running||paused||pendingLevel||levelIntro>0||searchCooldown>0)return; searchCooldown=.35;
 let c=crates.find(c=>!c.searched&&Math.hypot(c.x-player.x,c.y-player.y)<58);
 if(!c)return;
 c.searched=true;awardCombo();let label='DEPOT LEER',color='#8a8a8a';
 if(c.loot==='dossier'){hasDossier=true;found.dossier++;score+=500;label='GEHEIMDOSSIER';color='#f3d34a';toast("DOSSIER GEFUNDEN — AUSGANG ERREICHEN");}
 else if(c.loot==='trap'){let id=trapInfo().id;trapStock[id]++;found.trap++;score+=150;label=`ERSATZFALLE ${trapInfo().label}`;color='#63d6ff';toast("ERSATZFALLE GEFUNDEN");}
 else if(c.loot==='medkit'){if(lives<5)lives++;found.medkit++;score+=200;label='SANITÄTSPAKET +1 LEBEN';color='#7fe38d';toast("SANITÄTSPAKET GEFUNDEN");}
 else if(c.loot==='intel'){found.intel++;score+=250;guards.forEach(g=>g.stun=Math.max(g.stun,1.4));label='PATROUILLENPLAN +250';color='#d6a8ff';toast("PATROUILLENPLAN — GEGNER KURZ GESTOPPT");}
 else {score+=50;toast("DEPOT LEER — WEITERSUCHEN");}
 ui.lastFound.textContent=`LETZTER FUND: ${label}`;reveal={text:label,color,time:2.2};
 updateUI();
}
function toast(msg){ui.objective.textContent=msg;setTimeout(()=>{if(running)updateUI()},1200)}
function loseLife(){
 if(player.inv>0)return;combo=0;comboTime=0;sound(110,.22);burst(player.x,player.y,'#ff6b6b');lives--;player.inv=1.8;
 if(lives<=0){endGame(false);return}
 player.x=55;player.y=65;updateUI();toast("ERWISCHT — ZURÜCK ZUM START");
}
function nextLevel(){
 if(pendingLevel)return;
 const timeBonus=Math.max(0,1200-Math.floor(elapsed)*10);
 score+=1000+totalTraps()*100+timeBonus;pendingLevel=true;levelClear=1.8;
 reveal={text:`EINSATZ GESCHAFFT · +${timeBonus} ZEITBONUS`,color:'#7fe38d',time:1.8};
 sound(880,.3);burst(player.x,player.y,'#7fe38d');updateUI();
}
function endGame(win){
 running=false;
 modal.innerHTML=`<div class="panel"><h1>${win?"AUFTRAG ERFÜLLT":"EINSATZ BEENDET"}</h1><p class="result">Punkte: <b>${score}</b></p><p>${win?"Alle 30 Einsätze abgeschlossen.":"Die Patrouillen haben dich gestoppt."}</p><p class="note">HELVETICTRAP '84 · Phase 4</p><button id="again">ERNEUT STARTEN</button></div>`;
 modal.classList.add('show');document.getElementById('again').onclick=()=>startGame(campaignStart);
}
function startGame(startAt=0){campaignStart=startAt;level=startAt;score=0;lives=3;found={dossier:0,trap:0,medkit:0,intel:0};ui.lastFound.textContent='LETZTER FUND: —';paused=false;running=true;makeLevel();modal.classList.remove('show');last=performance.now();requestAnimationFrame(loop)}
function choosePatrolTarget(g){
 const candidates=[];for(let y=1;y<12;y++)for(let x=1;x<23;x++){let r=rect(x*T+8,y*T+8,g.w,g.h);if(!blocked(r)&&Math.hypot(r.x-g.x,r.y-g.y)>90)candidates.push(r)}
 if(!candidates.length)return{x:g.x,y:g.y};let idx=Math.floor(seeded(level*401+g.phase*97+Math.floor(performance.now()/1200))*candidates.length);return candidates[idx];
}
function update(dt){
 if(!running||paused)return;
 effects.forEach(e=>{e.x+=e.vx*dt;e.y+=e.vy*dt;e.life-=dt});effects=effects.filter(e=>e.life>0);
 if(levelClear>0){levelClear=Math.max(0,levelClear-dt);if(levelClear===0){if(level>=LEVELS.length-1)endGame(true);else{level++;makeLevel()}}return}
 if(levelIntro>0){levelIntro=Math.max(0,levelIntro-dt);return}
 elapsed+=dt;comboTime=Math.max(0,comboTime-dt);if(comboTime===0)combo=0;updateArcade();
 searchCooldown=Math.max(0,searchCooldown-dt);player.inv=Math.max(0,player.inv-dt);
 if(reveal){reveal.time-=dt;if(reveal.time<=0)reveal=null}
 let dx=0,dy=0;if(keys.has('ArrowLeft')||keys.has('KeyA'))dx--;if(keys.has('ArrowRight')||keys.has('KeyD'))dx++;if(keys.has('ArrowUp')||keys.has('KeyW'))dy--;if(keys.has('ArrowDown')||keys.has('KeyS'))dy++;
 if(dx||dy){let n=Math.hypot(dx,dy);moveEntity(player,dx/n*player.speed*dt,dy/n*player.speed*dt)}
 traps.forEach(t=>t.life-=dt);traps=traps.filter(t=>t.life>0);
 alerted=guards.some(g=>g.stun<=0&&Math.hypot(g.x-player.x,g.y-player.y)<210);
 guards.forEach(g=>{
  if(g.stun>0){g.stun-=dt;return}
  g.slow=Math.max(0,g.slow-dt);g.repath-=dt;let sees=Math.hypot(g.x-player.x,g.y-player.y)<210;
  let decoy=g.type==='detector'?null:traps.find(t=>t.type==='decoy'&&Math.hypot(t.x-g.x,t.y-g.y)<380);
  if(decoy){g.target={x:decoy.x,y:decoy.y};sees=false}else if(sees)g.target={x:player.x,y:player.y};else if(!g.target||g.repath<=0||Math.hypot(g.target.x-g.x,g.target.y-g.y)<18){g.target=choosePatrolTarget(g);g.repath=1.2}
  let inSmoke=traps.some(t=>t.type==='smoke'&&Math.hypot(t.x-g.x,t.y-g.y)<82),speedFactor=(g.slow>0?.48:1)*(inSmoke?(g.type==='detector'?.78:.48):1);
  let ax=g.target.x-g.x,ay=g.target.y-g.y,n=Math.hypot(ax,ay)||1,before={x:g.x,y:g.y};moveEntity(g,ax/n*g.speed*speedFactor*(sees?1.28:1)*dt,ay/n*g.speed*speedFactor*(sees?1.28:1)*dt);
  if(Math.hypot(g.x-before.x,g.y-before.y)<.2){g.target=choosePatrolTarget(g);g.repath=.1}
  traps.forEach(t=>{if(!overlap(g,t))return;if(t.type==='stun'){g.stun=g.type==='armor'?1.4:3.2;t.life=0;score+=250;awardCombo();updateUI()}else if(t.type==='net'){g.slow=g.type==='armor'?2.2:5;t.life=0;score+=200;awardCombo();updateUI()}});
  let playerHidden=traps.some(t=>t.type==='smoke'&&Math.hypot(t.x-player.x,t.y-player.y)<82)&&g.type!=='detector';
  if(overlap(player,g)&&!playerHidden)loseLife();
 });
 ui.alert.textContent=alerted?'STATUS: ALARM — PATROUILLEN VERFOLGEN DICH':'STATUS: UNENTDECKT';ui.alert.classList.toggle('danger',alerted);
 if(hasDossier&&overlap(player,exitDoor))nextLevel();
}
function drawSwissScene(cfg){
 if(!cfg.scene)return;
 ctx.save();ctx.globalAlpha=.62;ctx.fillStyle='#0b1014';ctx.strokeStyle='#e9e1b2';ctx.lineWidth=3;
 if(cfg.scene==='hut'){ctx.fillRect(110,92,190,92);ctx.beginPath();ctx.moveTo(85,96);ctx.lineTo(205,34);ctx.lineTo(325,96);ctx.fill();ctx.fillStyle='#d3b074';ctx.fillRect(175,118,58,66)}
 else if(cfg.scene==='lake'){ctx.fillStyle='#7ac4db';ctx.fillRect(0,150,W,34);for(let x=95;x<880;x+=190){ctx.fillStyle='#18232a';ctx.fillRect(x,95,118,58);ctx.fillStyle='#d3b074';ctx.fillRect(x+50,68,8,85)}}
 else if(cfg.scene==='tower'){ctx.fillRect(120,55,90,130);ctx.fillRect(730,70,105,115);ctx.fillStyle='#b88a52';ctx.fillRect(140,98,20,32);ctx.fillRect(755,108,22,30)}
 else if(cfg.scene==='station'){ctx.fillRect(110,82,740,102);ctx.strokeStyle='#d7e0e6';for(let x=155;x<840;x+=110)ctx.strokeRect(x,105,70,48);ctx.fillStyle='#b82028';ctx.fillRect(444,94,72,32)}
 else if(cfg.scene==='fortress'){ctx.fillRect(80,92,800,92);for(let x=115;x<850;x+=130){ctx.fillStyle='#657178';ctx.fillRect(x,55,75,40)}ctx.fillStyle='#101518';ctx.fillRect(435,124,90,60)}
 else if(cfg.scene==='glacier'){ctx.fillStyle='#bfe6ef';ctx.beginPath();ctx.moveTo(45,184);ctx.lineTo(220,42);ctx.lineTo(360,184);ctx.lineTo(560,65);ctx.lineTo(760,184);ctx.fill();ctx.fillStyle='#202c32';ctx.fillRect(690,104,180,80)}
 else if(cfg.scene==='depot'){for(let x=90;x<850;x+=190){ctx.fillStyle='#3b3a32';ctx.fillRect(x,94,145,90);ctx.fillStyle='#ba8c45';ctx.fillRect(x+24,118,42,42);ctx.fillRect(x+76,118,42,42)}}
 else if(cfg.scene==='arches'){for(let x=80;x<900;x+=135){ctx.strokeStyle='#d0a779';ctx.lineWidth=16;ctx.beginPath();ctx.arc(x+55,150,44,Math.PI,0);ctx.lineTo(x+99,184);ctx.stroke()}}
 else if(cfg.scene==='cable'){ctx.strokeStyle='#d9e3dd';ctx.beginPath();ctx.moveTo(40,52);ctx.lineTo(920,145);ctx.stroke();for(let x=190;x<860;x+=220){ctx.fillStyle='#b82028';ctx.fillRect(x,82+x/10,72,48);ctx.strokeRect(x+32,58+x/10,8,25)}}
 else if(cfg.scene==='summit'){ctx.fillStyle='#c4d7e4';ctx.beginPath();ctx.moveTo(80,184);ctx.lineTo(480,24);ctx.lineTo(880,184);ctx.fill();ctx.fillStyle='#29343e';ctx.fillRect(388,104,184,80);ctx.fillStyle='#b82028';ctx.fillRect(466,68,28,38)}
 ctx.restore();
}
function draw(){
 const cfg=LEVELS[level];
 ctx.fillStyle=cfg.ground||'#11161a';ctx.fillRect(0,0,W,H);
 // alpine skyline
 ctx.fillStyle=cfg.sky||'#26323a';ctx.beginPath();ctx.moveTo(0,120);for(let x=0;x<=W;x+=80){ctx.lineTo(x+40,45+(x%160?35:0));ctx.lineTo(x+80,120)}ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();drawSwissScene(cfg);
 // floor grid
 ctx.strokeStyle='#1f292e';ctx.lineWidth=1;for(let x=0;x<W;x+=T){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=0;y<H;y+=T){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
 // walls
 walls.forEach(w=>{ctx.fillStyle=cfg.wall||'#667078';ctx.fillRect(w.x,w.y,w.w,w.h);ctx.fillStyle='#30383d';for(let x=w.x;x<w.x+w.w;x+=20)ctx.fillRect(x,w.y,2,w.h)});
 // Swiss marker
 ctx.fillStyle='#b82028';ctx.fillRect(44,38,44,32);ctx.fillStyle='#fff';ctx.fillRect(61,43,10,22);ctx.fillRect(55,49,22,10);
 // exit
 ctx.fillStyle=hasDossier?'#e9e1b2':'#555';ctx.fillRect(exitDoor.x,exitDoor.y,exitDoor.w,exitDoor.h);ctx.fillStyle='#111';ctx.fillRect(exitDoor.x+8,exitDoor.y+8,18,30);ctx.fillStyle='#ddd';ctx.font='12px monospace';ctx.fillText('EXIT',exitDoor.x-1,exitDoor.y-6);
 crates.forEach(c=>{ctx.fillStyle=c.searched?'#454545':'#b28a4b';ctx.fillRect(c.x,c.y,c.w,c.h);ctx.strokeStyle='#e0c18b';ctx.strokeRect(c.x+3,c.y+3,c.w-6,c.h-6);if(c.searched){ctx.strokeStyle='#222';ctx.beginPath();ctx.moveTo(c.x,c.y);ctx.lineTo(c.x+c.w,c.y+c.h);ctx.stroke()}});
 traps.forEach(t=>{ctx.lineWidth=2;if(t.type==='smoke'){ctx.fillStyle='#a9b6c455';ctx.beginPath();ctx.arc(t.x+8,t.y+8,78,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#c9d3dc';ctx.stroke()}else if(t.type==='decoy'){ctx.strokeStyle='#63d6ff';ctx.beginPath();ctx.arc(t.x+8,t.y+8,10+Math.sin(t.life*8)*3,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#63d6ff';ctx.fillRect(t.x+6,t.y+6,4,4)}else if(t.type==='net'){ctx.strokeStyle='#7fe38d';ctx.strokeRect(t.x,t.y,16,16);ctx.beginPath();ctx.moveTo(t.x,t.y);ctx.lineTo(t.x+16,t.y+16);ctx.moveTo(t.x+16,t.y);ctx.lineTo(t.x,t.y+16);ctx.stroke()}else{ctx.strokeStyle='#f3d34a';ctx.beginPath();ctx.arc(t.x+8,t.y+8,8,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(t.x+3,t.y+3);ctx.lineTo(t.x+13,t.y+13);ctx.moveTo(t.x+13,t.y+3);ctx.lineTo(t.x+3,t.y+13);ctx.stroke()}});
 guards.forEach(g=>{ctx.fillStyle=g.stun>0?'#858585':'#c74646';ctx.fillRect(g.x,g.y,g.w,g.h);ctx.strokeStyle=g.type==='armor'?'#f3d34a':g.type==='detector'?'#63d6ff':g.type==='sprint'?'#d6a8ff':'#c74646';ctx.lineWidth=3;ctx.strokeRect(g.x-1,g.y-1,g.w+2,g.h+2);ctx.fillStyle='#111';ctx.fillRect(g.x+5,g.y+6,4,4);ctx.fillRect(g.x+15,g.y+6,4,4)});
 if(player.inv<=0||Math.floor(player.inv*10)%2===0){ctx.fillStyle='#e8e8dc';ctx.fillRect(player.x,player.y,player.w,player.h);ctx.fillStyle='#b82028';ctx.fillRect(player.x+7,player.y+7,10,10);ctx.fillStyle='#fff';ctx.fillRect(player.x+11,player.y+8,2,8);ctx.fillRect(player.x+8,player.y+11,8,2)}
 effects.forEach(e=>{ctx.globalAlpha=Math.max(0,e.life*2);ctx.fillStyle=e.color;ctx.fillRect(e.x,e.y,5,5)});ctx.globalAlpha=1;
 ctx.fillStyle='#eee';ctx.font='14px monospace';ctx.fillText(level>=20?`SWISS WORLD · ${cfg.theme}`:cfg.theme,40,H-42);
 if(reveal){ctx.fillStyle='#000d';ctx.fillRect(W/2-320,36,640,58);ctx.strokeStyle=reveal.color;ctx.lineWidth=3;ctx.strokeRect(W/2-320,36,640,58);ctx.fillStyle=reveal.color;ctx.font='bold 18px monospace';ctx.textAlign='center';ctx.fillText(reveal.text,W/2,72);ctx.textAlign='left'}
 if(levelIntro>0){let seconds=Math.max(1,Math.ceil(levelIntro));ctx.fillStyle='#000d';ctx.fillRect(0,0,W,H);ctx.strokeStyle='#f3d34a';ctx.lineWidth=4;ctx.strokeRect(W/2-270,H/2-105,540,210);ctx.fillStyle='#f3d34a';ctx.textAlign='center';ctx.font='bold 24px monospace';ctx.fillText(`EINSATZ ${level+1} · ${LEVELS[level].name.toUpperCase()}`,W/2,H/2-52);ctx.fillStyle='#fff';ctx.font='bold 29px monospace';ctx.fillText('AUFTRAG: DOSSIER FINDEN',W/2,H/2-4);ctx.font='bold 48px monospace';ctx.fillText(String(seconds),W/2,H/2+62);ctx.textAlign='left'}
 if(paused){ctx.fillStyle='#000b';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.font='36px monospace';ctx.textAlign='center';ctx.fillText('PAUSE',W/2,H/2);ctx.textAlign='left'}
}
function loop(t){let dt=Math.min(.033,(t-last)/1000||0);last=t;update(dt);draw();if(running)requestAnimationFrame(loop)}
addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='Space')placeTrap();if(e.code==='KeyE')search();if(e.code==='KeyQ')cycleTrap();if(e.code==='KeyP')paused=!paused});
addEventListener('keyup',e=>keys.delete(e.code));
document.querySelectorAll('[data-key]').forEach(b=>{let k=b.dataset.key;const down=e=>{e.preventDefault();keys.add(k);if(k==='Space')placeTrap();if(k==='KeyE')search();if(k==='KeyQ')cycleTrap()};const up=e=>{e.preventDefault();keys.delete(k)};b.addEventListener('pointerdown',down);b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('pointerleave',up)});
startBtn.onclick=()=>startGame(0);startPhase2Btn.onclick=()=>startGame(10);startPhase3Btn.onclick=()=>startGame(20);
helpBtn.onclick=()=>{paused=true;modal.innerHTML=`<div class="panel"><h1>ANLEITUNG PHASE 4</h1><p>Finde das Dossier, erreiche den Ausgang und nutze vier Fallentypen: Schock stoppt, Köder lockt, Rauch verbirgt und Netz verlangsamt.</p><p>Gelb umrandete Gegner sind gepanzert, blaue Detektoren ignorieren Köder und sehen durch Rauch, violette Sprinter sind schneller.</p><p>Q/WECHSEL wählt die Falle · Leertaste/FALLE setzt sie · E/SUCHEN durchsucht Depots.</p><p>Arcade: Funde und Fallentreffer innerhalb von 5 Sekunden bilden Combos bis ×5. Schnelle Abschlüsse bringen bis zu 1200 Zeitbonuspunkte. Sound lässt sich oben umschalten.</p><p>Level 21–30 führen durch zehn Swiss-World-Schauplätze. Vor jedem Einsatz hält ein Countdown das Spielfeld vollständig an.</p><button id="resume">WEITER</button></div>`;modal.classList.add('show');document.getElementById('resume').onclick=()=>{modal.classList.remove('show');paused=false;last=performance.now()}};

document.getElementById('soundBtn').onclick=()=>{soundEnabled=!soundEnabled;document.getElementById('soundBtn').textContent=soundEnabled?'SOUND AN':'SOUND AUS';if(soundEnabled)sound(660)};
