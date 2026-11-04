/* NÉBULA — Observatório de Órion */
(function(){
'use strict';
const TTL=80000,SECOES={
 expression:{nome:'Expressões e estado emocional',ini:'function set(m, ms = 2200, t)',fim:'function wig()',foco:'body.dataset.m = m;'},
 food:{nome:'Alimentação',ini:'function morder()',fim:'function eat(f)',foco:"set('nham', 0);"},
 dance:{nome:'Animação de dança',ini:'function startDance(sec = 10)',fim:'function joyTick()',foco:"set('dance', sec * 1000, st[3]);"},
 'game-frutas':{nome:'Minigame — Cesta de Frutas',ini:'function startGame()',fim:'function startButterflies()',foco:'gOn = 1;'},
 'game-borboletas':{nome:'Minigame — Borboletas',ini:'function startButterflies()',fim:'function startBath()',foco:'gOn = 1;'},
 'game-dino':{nome:'Minigame — Desviar dos bolos',ini:'function startDino()',fim:'/* --- Dança --- */',foco:'c.onpointerdown = pular;'},
 bath:{nome:'Atividade de banho',ini:'function comecarBanho(sabKey)',fim:'/* ============ JOGO DA NÉBULA',foco:'function comecarBanho(sabKey)'},
 idle:{nome:'Comportamento espontâneo',ini:'function joyTick()',fim:'/* ============ 12. UI ============ */',foco:'const pensamentos = ['}
};

let root=null,db=null,lista=[],selecionada=null,unsub=null;
let raf=0,ro=null,cleanup=null,faceFrame=null,fonte='',fonteP=null,z=20;

const $=id=>root&&root.querySelector('#'+id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));

function markup(){
return '<header class="or-top"><div class="or-brand"><span>✦</span><div><small>NÉBULA / OBSERVATÓRIO DE ÓRION</small><h1>Constelação viva</h1></div></div><div class="or-status"><i></i><span id="or-network">Conectando...</span><b></b><span id="or-listeners">0 instâncias observadas</span></div><button id="or-exit">↩ Modos</button></header>'+

'<section class="or-window or-stars" data-or-window><div class="or-head" data-or-drag><div><b>✧</b><span>CONSTELAÇÃO<small>NEBOS REGISTRADAS</small></span></div><em>ARRASTE ⠿</em></div><div class="or-space"><canvas id="or-canvas"></canvas><div class="or-title"><b>M42</b> NEBULOSA DE ÓRION</div><div class="or-help">Arraste para girar · selecione uma estrela</div><div class="or-loading" id="or-loading">Localizando Nebos...</div></div><footer id="or-count">Carregando nomes registrados</footer></section>'+

'<section class="or-window or-mirror" data-or-window><div class="or-head" data-or-drag><div><b>◉</b><span>ESPELHAMENTO<small>INSTÂNCIA SELECIONADA</small></span></div><em>ARRASTE ⠿</em></div><div class="or-mirror-body"><div id="or-face"><div class="or-empty">✧<b>Escolha uma estrela</b><small>A Nebo aparecerá aqui quando selecionada.</small></div></div><div class="or-meta"><small id="or-live">AGUARDANDO SELEÇÃO</small><h2 id="or-name">Nenhuma Nebo</h2><div class="or-state"><span id="or-online">SEM SINAL</span><span id="or-expression">—</span></div><p id="or-action">Selecione uma estrela para acompanhar seu estado.</p><div id="or-stats">Humor — · Fome — · Energia —</div></div></div></section>'+

'<section class="or-window or-code" data-or-window><div class="or-head" data-or-drag><div><b>{ }</b><span>CÓDIGO RELACIONADO<small>game.js · TRECHO REAL</small></span></div><em>ARRASTE ⠿</em></div><div class="or-codebar"><b id="or-code-title">Aguardando uma Nebo</b><small id="or-code-lines">—</small></div><div class="or-desc" id="or-desc">Selecione uma estrela para ver o trecho associado ao comportamento atual.</div><div class="or-code-scroll"><pre id="or-code">O código aparecerá aqui quando uma Nebo for selecionada.</pre></div><footer id="or-event">NENHUM EVENTO SELECIONADO</footer></section>'+

'<div class="or-credit">Nebulosa de Órion · M42 · NASA / ESA / Hubble · <a href="https://science.nasa.gov/image-detail/orion-nebula-xlarge_web/" target="_blank" rel="noopener">créditos</a></div>';
}

function open(){
 if(root)return;

 root=document.createElement('main');
 root.id='observatorio-orion';
 root.innerHTML=markup();
 document.body.appendChild(root);

 db=typeof iniciarFirebase==='function'?iniciarFirebase():null;

 $('#or-exit').onclick=close;

 root.querySelectorAll('[data-or-window]').forEach(dragWindow);

 root.addEventListener('pointerdown',e=>{
  const w=e.target.closest('[data-or-window]');
  if(w)w.style.zIndex=String(++z);
 });

 mirror();
 scene();
 loadList();
 loadSource();
}

function close(){
 if(unsub){unsub();unsub=null;}
 if(raf)cancelAnimationFrame(raf);
 raf=0;

 if(ro)ro.disconnect();
 ro=null;

 if(cleanup)cleanup();
 cleanup=null;

 if(root)root.remove();

 root=null;
 lista=[];
 selecionada=null;
 faceFrame=null;

 if(window.voltarParaEscolhaDeModo)
  window.voltarParaEscolhaDeModo();
}

function dragWindow(w){
 const h=w.querySelector('[data-or-drag]');
 let id=null,x0=0,y0=0,l0=0,t0=0;

 h.addEventListener('pointerdown',e=>{
  if(e.button!==undefined&&e.button!==0)return;

  const r=w.getBoundingClientRect();

  id=e.pointerId;
  x0=e.clientX;
  y0=e.clientY;
  l0=r.left;
  t0=r.top;

  w.style.left=l0+'px';
  w.style.top=t0+'px';
  w.style.right='auto';
  w.classList.add('dragging');

  try{h.setPointerCapture(id);}catch(_){}
  e.preventDefault();
 });

 h.addEventListener('pointermove',e=>{
  if(id!==e.pointerId)return;

  w.style.left=Math.max(4,Math.min(
   innerWidth-w.offsetWidth-4,
   l0+e.clientX-x0
  ))+'px';

  w.style.top=Math.max(68,Math.min(
   innerHeight-w.offsetHeight-4,
   t0+e.clientY-y0
  ))+'px';
 });

 function end(e){
  if(id!==e.pointerId)return;
  id=null;
  w.classList.remove('dragging');
 }

 h.addEventListener('pointerup',end);
 h.addEventListener('pointercancel',end);
}

function mirror(){
 const face=document.getElementById('face');
 const source=face?face.outerHTML:
  '<div id="face"><div id="eyes"></div></div>';

 const css=new URL('style.css',location.href).href;
 const f=document.createElement('iframe');

 f.className='or-face-frame';
 f.title='Espelhamento da Nebo selecionada';

 f.srcdoc='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="'+css+'"><style>:root{--ew:min(28vw,48vh)}html,body{margin:0!important;width:100%;height:100%;background:transparent!important;overflow:hidden!important}#screen{position:absolute!important;inset:0!important;display:flex!important;align-items:center!important;justify-content:center!important}#face{top:0!important;animation:flt 4s ease-in-out infinite!important}</style></head><body data-m="neutral"><div id="screen">'+source+'</div></body></html>';

 $('#or-face').innerHTML='';
 $('#or-face').appendChild(f);
 faceFrame=f;
}

function setFace(m){
 if(!faceFrame)return;
 try{
  faceFrame.contentDocument.body.dataset.m=m||'neutral';
 }catch(_){}
}

function hash(s){
 let h=2166136261;
 for(let i=0;i<s.length;i++){
  h^=s.charCodeAt(i);
  h=Math.imul(h,16777619);
 }
 return h>>>0;
}

function rng(seed){
 let a=seed>>>0;
 return()=>{
  a+=0x6D2B79F5;
  let t=a;
  t=Math.imul(t^(t>>>15),t|1);
  t^=t+Math.imul(t^(t>>>7),t|61);
  return((t^(t>>>14))>>>0)/4294967296;
 };
}

async function loadList(){
 if(!db){
  $('#or-loading').textContent='Firebase indisponível.';
  $('#or-network').textContent='Sem conexão';
  return;
 }

 try{
  // Leitura pontual do catálogo. Nenhum listener é aberto nesta etapa.
  const snap=await db.collection('nebulas')
   .where('tipoRegistro','==','casa').get();

  lista=[];

  snap.forEach(doc=>{
   const d=doc.data()||{};
   const id=String(d.id||doc.id||'');
   const nome=String(d.nome||'').trim();

   if(!id||!nome)return;

   const ts=Number(d.observatorioAtualizadoEm||0);

   lista.push({
    id:id,
    nome:nome,
    online:d.observatorioOnline===true&&Date.now()-ts<TTL
   });
  });

  lista.sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));

  $('#or-loading').remove();

  $('#or-count').textContent=
   lista.length+' Nebos registradas · '+
   lista.filter(n=>n.online).length+
   ' com sinal recente';

  $('#or-network').textContent=
   'Índice carregado · sem escuta global';

 }catch(e){
  console.error(e);
  $('#or-loading').textContent=
   'Não foi possível carregar a constelação.';
  $('#or-network').textContent='Falha ao consultar o índice';
 }
}

function scene(){
 const c=$('or-canvas');
 const ctx=c.getContext('2d');

 let W=1,H=1,D=1;
 let rx=-.16,ry=.12;
 let pointer=null,moved=false;
 let px=0,py=0,last=0,proj=[];

 const dust=[];

 function resize(){
  const r=c.getBoundingClientRect();

  W=Math.max(1,r.width);
  H=Math.max(1,r.height);
  D=Math.min(2,devicePixelRatio||1);

  c.width=Math.round(W*D);
  c.height=Math.round(H*D);

  ctx.setTransform(D,0,0,D,0,0);

  dust.length=0;
  const q=rng(77441);

  for(let i=0;i<180;i++){
   dust.push({
    x:q(),
    y:q(),
    r:.25+q(),
    p:q()*6.28
   });
  }
 }

 function project(p){
  const cy=Math.cos(ry),sy=Math.sin(ry);
  const cx=Math.cos(rx),sx=Math.sin(rx);

  const x=p.x*cy-p.z*sy;
  const z=p.x*sy+p.z*cy;
  const y=p.y*cx-z*sx;
  const z2=p.y*sx+z*cx;

  const f=Math.min(W,H)*2.8;
  const k=f/(f+z2);

  return{
   x:W/2+x*k,
   y:H/2+y*k,
   k:k
  };
 }

 function draw(now){
  if(!root||!c.isConnected)return;

  const dt=last?Math.min(40,now-last):16;
  last=now;
  ry+=dt*.000035;

  ctx.clearRect(0,0,W,H);

  const bg=ctx.createRadialGradient(
   W*.5,H*.5,5,W*.5,H*.5,Math.max(W,H)*.8
  );

  bg.addColorStop(0,'rgba(226,199,255,.18)');
  bg.addColorStop(.4,'rgba(92,75,155,.1)');
  bg.addColorStop(1,'rgba(3,5,18,0)');

  ctx.fillStyle=bg;
  ctx.fillRect(0,0,W,H);

  dust.forEach(d=>{
   ctx.globalAlpha=.2+.35*(
    .5+.5*Math.sin(now*.001+d.p)
   );
   ctx.fillStyle='#f5edff';
   ctx.beginPath();
   ctx.arc(d.x*W,d.y*H,d.r,0,6.28);
   ctx.fill();
  });

  ctx.globalAlpha=1;

  const side=Math.min(W,H);

  proj=lista.map(n=>{
   const q=rng(hash(n.id));
   const a=q()*6.28;
   const r=Math.sqrt(q());
   const z=(q()-.5)*.9;

   return{
    item:n,
    pos:project({
     x:Math.cos(a)*r*side*.56,
     y:Math.sin(a)*r*side*.5,
     z:z*side*.42
    }),
    phase:hash(n.id)%900/100
   };
  });

  // Ligações entre estrelas próximas.
  for(let i=0;i<proj.length;i++){
   const near=proj.slice(i+1)
    .map(p=>({
     p:p,
     d:Math.hypot(
      p.pos.x-proj[i].pos.x,
      p.pos.y-proj[i].pos.y
     )
    }))
    .filter(v=>v.d<side*.27)
    .sort((a,b)=>a.d-b.d)
    .slice(0,2);

   near.forEach(v=>{
    ctx.strokeStyle='rgba(197,169,255,'+
     (.04+.07*(1-v.d/(side*.27)))+')';

    ctx.lineWidth=.8;
    ctx.beginPath();
    ctx.moveTo(proj[i].pos.x,proj[i].pos.y);
    ctx.lineTo(v.p.pos.x,v.p.pos.y);
    ctx.stroke();
   });
  }

  // Estrelas em profundidade.
  proj.forEach(p=>{
   const active=selecionada&&selecionada.id===p.item.id;
   const tw=.76+.24*Math.sin(now*.002+p.phase);
   const r=(active?5.5:(p.item.online?3.4:2.5))*p.pos.k;

   ctx.globalAlpha=p.item.online?tw:.55;
   ctx.fillStyle=active?'#fff2ff':
    (p.item.online?'#ddc8ff':'#a194bd');

   ctx.shadowColor=active?'#f0caff':'#ad8aff';
   ctx.shadowBlur=active?23:(p.item.online?13:5);

   ctx.beginPath();
   ctx.arc(p.pos.x,p.pos.y,Math.max(1.8,r),0,6.28);
   ctx.fill();

   ctx.shadowBlur=0;
   ctx.globalAlpha=1;

   if(active){
    ctx.strokeStyle='#f7ddff';
    ctx.beginPath();
    ctx.arc(
     p.pos.x,p.pos.y,
     r+8+Math.sin(now*.004)*2,
     0,6.28
    );
    ctx.stroke();

    ctx.font='600 12px system-ui';
    ctx.fillStyle='#fff';
    ctx.shadowColor='#b78cff';
    ctx.shadowBlur=12;
    ctx.fillText(p.item.nome,p.pos.x+12,p.pos.y-10);
    ctx.shadowBlur=0;
   }
  });

  raf=requestAnimationFrame(draw);
 }

 // Arrastar o fundo gira a constelação.
 c.addEventListener('pointerdown',e=>{
  pointer={
   id:e.pointerId,
   x:e.clientX,
   y:e.clientY
  };

  moved=false;
  px=e.clientX;
  py=e.clientY;

  try{c.setPointerCapture(e.pointerId);}catch(_){}
  e.preventDefault();
 });

 c.addEventListener('pointermove',e=>{
  if(!pointer||pointer.id!==e.pointerId)return;

  const dx=e.clientX-px;
  const dy=e.clientY-py;

  if(
   Math.abs(e.clientX-pointer.x)+
   Math.abs(e.clientY-pointer.y)>5
  )moved=true;

  if(moved){
   ry+=dx*.006;
   rx=Math.max(-1.1,Math.min(1.1,rx+dy*.005));
  }

  px=e.clientX;
  py=e.clientY;
 });

 function up(e){
  if(!pointer||pointer.id!==e.pointerId)return;

  if(!moved){
   const r=c.getBoundingClientRect();
   const x=e.clientX-r.left;
   const y=e.clientY-r.top;

   let found=null,best=25;

   proj.forEach(p=>{
    const d=Math.hypot(x-p.pos.x,y-p.pos.y);
    if(d<best){
     best=d;
     found=p.item;
    }
   });

   if(found)select(found);
  }

  pointer=null;
  try{c.releasePointerCapture(e.pointerId);}catch(_){}
 }

 c.addEventListener('pointerup',up);
 c.addEventListener('pointercancel',()=>pointer=null);

 resize();

 if(typeof ResizeObserver!=='undefined'){
  ro=new ResizeObserver(resize);
  ro.observe(c);
 }else{
  addEventListener('resize',resize);
 }

 raf=requestAnimationFrame(draw);

 cleanup=()=>{
  if(raf)cancelAnimationFrame(raf);
  if(ro)ro.disconnect();
  ro=null;
  removeEventListener('resize',resize);
 };
}

function select(item){
 if(!db||!root)return;

 // Encerra a observação anterior.
 if(unsub){
  unsub();
  unsub=null;
 }

 selecionada=item;

 $('#or-name').textContent=item.nome;
 $('#or-live').textContent='CONECTANDO À INSTÂNCIA';
 $('#or-online').textContent='CONECTANDO';
 $('#or-action').textContent=
  'Buscando o estado atual de '+item.nome+'...';

 $('#or-listeners').textContent='1 instância observada';

 // Somente a estrela escolhida mantém um onSnapshot.
 unsub=db.collection('nebulas').doc(item.id).onSnapshot(snap=>{
  if(!root||!selecionada||selecionada.id!==item.id)return;

  if(!snap.exists){
   $('#or-action').textContent=
    'Esta Nebo não está mais registrada.';
   return;
  }

  const d=snap.data()||{};
  const o=d.observatorio||{};
  const ts=Number(d.observatorioAtualizadoEm||0);

  const online=
   d.observatorioOnline===true&&Date.now()-ts<TTL;

  mirrorUpdate(d.nome||item.nome,d,o,online);

 },err=>{
  console.error(err);

  if(root){
   $('#or-action').textContent=
    'Não foi possível acompanhar esta Nebo agora.';
   $('#or-online').textContent='ERRO DE CONEXÃO';
   $('#or-listeners').textContent='0 instâncias observadas';
  }
 });
}

function mirrorUpdate(nome,d,o,online){
 $('#or-live').textContent=online?
  'INSTÂNCIA AO VIVO':'ÚLTIMO ESTADO REGISTRADO';

 $('#or-name').textContent=nome;
 $('#or-online').textContent=online?'ONLINE':'OFFLINE';
 $('#or-online').className=online?'is-online':'is-offline';

 const m=String(o.expressao||'neutral');
 setFace(m);

 const labels={
  nham:'comendo',
  chew:'comendo',
  sip:'bebendo',
  happy:'sorrindo',
  curious:'curiosa',
  bored:'entediada',
  sleepy:'sonolenta',
  dance:'dançando',
  neutral:'neutra'
 };

 $('#or-expression').textContent=
  'Expressão: '+(labels[m]||m);

 const action=String(o.acao||'sem atividade recente');

 $('#or-action').textContent=
  action+(o.detalhe?' · '+o.detalhe:'');

 const stat=k=>
  Number.isFinite(Number(d[k]))?
  Math.round(Number(d[k]))+'%':'—';

 $('#or-stats').textContent=
  'Humor '+stat('humor')+
  ' · Fome '+stat('fome')+
  ' · Energia '+stat('energia');

 updateCode(o,nome,action,online);
}

function loadSource(){
 if(fonteP)return fonteP;

 fonteP=fetch('./game.js',{cache:'no-cache'})
  .then(r=>{
   if(!r.ok)throw Error('game.js '+r.status);
   return r.text();
  })
  .then(t=>fonte=t)
  .catch(e=>{
   console.error(e);
   return fonte='';
  });

 return fonteP;
}

function extract(key){
 const s=SECOES[key]||SECOES.expression;
 const a=fonte.indexOf(s.ini);

 if(a<0)return null;

 let b=fonte.indexOf(s.fim,a+s.ini.length);

 if(b<0)b=Math.min(fonte.length,a+4200);

 const txt=fonte.slice(a,b).trim();
 const line=fonte.slice(0,a).split('\n').length;
 const lines=txt.split(/\r?\n/);

 return{
  lines:lines,
  start:line,
  focus:lines.findIndex(x=>x.includes(s.foco)),
  title:s.nome
 };
}

function color(line){
 return esc(line).replace(
  /(\/\/.*|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b(?:function|const|let|var|if|else|return|new|await|async|true|false|null)\b)/g,
  v=>v.startsWith('//')?
   '<i class="or-comment">'+v+'</i>':
   (v[0]==='"'||v[0]==="'")?
   '<i class="or-string">'+v+'</i>':
   '<i class="or-keyword">'+v+'</i>'
 );
}

async function updateCode(o,nome,action,online){
 const key=String(o.codigo||'expression');
 const s=SECOES[key]||SECOES.expression;

 $('#or-code-title').textContent=s.nome;

 $('#or-desc').textContent=
  (online?'Agora: ':'Último registro: ')+
  action+
  '. O trecho abaixo vem do game.js publicado e está associado a esse comportamento.';

 $('#or-event').textContent=
  (online?'EVENTO AO VIVO · ':'ÚLTIMO EVENTO · ')+
  nome.toUpperCase();

 await loadSource();

 if(!root)return;

 const t=extract(key);
 const pre=$('or-code');

 if(!t){
  pre.textContent=
   'Não foi possível localizar esse trecho no game.js.';
  $('#or-code-lines').textContent='fonte indisponível';
  return;
 }

 pre.innerHTML=t.lines.map((line,i)=>
  '<span class="or-line'+
  (i===t.focus?' active':'')+
  '"><i>'+
  String(t.start+i).padStart(4,'0')+
  '</i><span>'+
  color(line||' ')+
  '</span></span>'
 ).join('');

 $('#or-code-lines').textContent=
  'game.js · linhas '+
  t.start+'–'+(t.start+t.lines.length-1);

 const active=pre.querySelector('.active');

 if(active){
  active.scrollIntoView({
   block:'center',
   behavior:'smooth'
  });
 }
}

window.abrirObservatorioNebo=open;
window.fecharObservatorioNebo=close;

})();
