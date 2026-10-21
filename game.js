const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBE4z14rQyaGjaV0ULkWPArLOdpQjUjAWo",
  authDomain: "nebula-city.firebaseapp.com",
  projectId: "nebula-city",
  storageBucket: "nebula-city.firebasestorage.app",
  messagingSenderId: "145504626308",
  appId: "1:145504626308:web:ac124c13d59ef3f7be44d1"
};
let dbFirebase = null;
const SALA_TIMEOUT_MS = 90000;   // a Nébula some da sala se ficar 90s sem dar sinal

function iniciarFirebase() {
  if (dbFirebase) return dbFirebase;
  if (typeof firebase === 'undefined') return null;
  try {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    dbFirebase = firebase.firestore();
    return dbFirebase;
  } catch (e) {
    console.error('❌ Erro Firebase:', e);
    return null;
  }
}

// ==================== SALVAR ====================
async function salvarNoFirebase() {
  const db = iniciarFirebase();
  if (!db || !S.id) return;
  try {
    await db.collection('nebulas').doc(S.id).set({
      id: S.id,
      nome: String(S.nome || 'Nebo').slice(0, 12),
      humor: Math.round(S.humor),
      fome: Math.round(S.fome),
      energia: Math.round(S.energia),
      saude: Math.round(S.saude),
      moedas: S.moedas || 0,
      pers: S.pers || null,
      conectado: !!S.conectado,
      atualizadoEm: Date.now()
    });
  } catch (e) {
    console.error('Erro ao salvar:', e);
  }
}

// ==================== LER (só quem está conectada e ativa) ====================
async function lerNebulas() {
  const db = iniciarFirebase();
  if (!db) return [];
  try {
    const corte = Date.now() - SALA_TIMEOUT_MS;
    const snapshot = await db.collection('nebulas').where('atualizadoEm', '>', corte).get();
    const lista = [];
    snapshot.forEach(doc => {
      const d = doc.data();
      if (d.id !== S.id && d.conectado) lista.push(d);
    });
    return lista;
  } catch (e) {
    console.error('Erro ao ler:', e);
    return [];
  }
}

// ==================== APAGAR (sair da sala) ====================
async function sairDoFirebase() {
  const db = iniciarFirebase();
  if (!db || !S.id) return;
  try {
    await db.collection('nebulas').doc(S.id).delete();
  } catch (e) {
    console.error('Erro ao sair:', e);
  }
}

// Batimento: só enquanto estiver conectada na sala
setInterval(() => {
  if (S.id && S.modo === 'nebo' && S.conectado) salvarNoFirebase();
}, 30000);

/* ============ RECORDE GLOBAL DO DINO ============ */
async function lerRecordeDino() {
  const db = iniciarFirebase();
  if (!db) return null;
  try {
    const doc = await db.collection('recordes').doc('dino').get();
    return doc.exists ? doc.data() : null;
  } catch (e) {
    console.error('Erro ao ler recorde:', e);
    return null;
  }
}

/* Salva só se for maior (transação: sem corrida entre dois jogadores) */
async function salvarRecordeDino(pontos, nomeNebo, idNebo) {
  const db = iniciarFirebase();
  if (!db) return false;
  try {
    const ref = db.collection('recordes').doc('dino');
    return await db.runTransaction(async tx => {
      const doc = await tx.get(ref);
      const atual = doc.exists ? (doc.data().pontos || 0) : 0;
      if (atual >= pontos) return false;
      tx.set(ref, {
        pontos,
        nome: String(nomeNebo || 'Nebo').slice(0, 12),
        id: idNebo || 'sem-id',
        atualizadoEm: Date.now()
      });
      return true;
    });
  } catch (e) {
    console.error('Erro ao salvar recorde:', e);
    return false;
  }
}
/* ============ CATÁLOGO DE SABONETES ============ */
const SABONETES = {
  lavanda: {
    nome: 'Lavanda',
    emoji: '💜',
    cor: 'rgba(200, 180, 240, .85)',   // espuma lilás
    fala: 'Aaah, que cheirinho de lavanda... 😌'
  },
  limao: {
    nome: 'Limão',
    emoji: '🍋',
    cor: 'rgba(255, 240, 150, .85)',   // espuma amarelinha
    fala: 'Uia, azedinho! Me acordou! 🍋'
  },
  baunilha: {
    nome: 'Baunilha',
    emoji: '🤍',
    cor: 'rgba(255, 245, 230, .9)',    // espuma creme
    fala: 'Que cheirinho doce... 🥰'
  },
  morango: {
    nome: 'Morango',
    emoji: '🍓',
    cor: 'rgba(255, 200, 220, .85)',   // espuma rosa
    fala: 'Cheirinho de morango! 💗'
  }
};

/* ============ 10. MINIGAMES ============ */
  
/* ============ 1. UTILIDADES ============ */
const $ = id => document.getElementById(id);
const body = document.body;
const eyes = $('eyes');
const eyeEls = [...document.querySelectorAll('.eye')];
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const rnd = arr => arr[Math.floor(Math.random() * arr.length)];
const vib = p => { try { navigator.vibrate?.(p); } catch {} };
const P = $('panel');  
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/* ============ 1.5 SISTEMA DE SOM ============ */
const SOM = (() => {
  let ctx = null;
  let ligado = true;

  function init() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch { ligado = false; }
  }

  function nota(freq, dur = 0.12, tipo = 'sine', vol = 0.12) {
    if (!ligado) return;
    init();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = tipo;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch {}
  }

  function melodia(notas, dur = 0.1, tipo = 'sine', vol = 0.12) {
    if (!ligado) return;
    notas.forEach((f, i) => {
      setTimeout(() => nota(f, dur, tipo, vol), i * dur * 1000);
    });
  }

  function ligar(v) { ligado = v; }
  function estaLigado() { return ligado; }
  function destravar() {
    init();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  return { nota, melodia, ligar, estaLigado, destravar };
})();

/* Notas musicais */
const N = {
  DO: 523.25, RE: 587.33, MI: 659.25, FA: 698.46,
  SOL: 783.99, LA: 880.00, SI: 987.77, DO2: 1046.50,
  RE2: 1174.66,
  DO_BAIXO: 261.63, MI_BAIXO: 329.63, SOL_BAIXO: 392.00
};

/* Destrava áudio no primeiro toque (iOS/Chrome) */
addEventListener('pointerdown', () => SOM.destravar(), { once: true });

/* ============ 2. ESTADO ============ */
const SAVE_KEY = 'nebula-v2';
const DEFAULT = {
  modo: null,
  nome: null,
  id: null,
  moedas: 0,
  conectado: false,
  cidadeId: null,
  energia: 100, fome: 100, saude: 100, humor: 100, limpeza: 100,
  bond: 0, pers: null, sick: 0, greet: '',
  food: {}, pref: null, dis: null,
  places: {}, mem: [], lastDance: null,
  estoque: { '🍎': 3, '🍓': 2, '🥭': 1, '🍕': 0, '🍰': 0 },
  favoritas: [],
  detestadas: [],
  compras: [],
  ingredientes: {},
  docesProntos: [],
  equipado: {
    cabeca: null,
    oculos: null,
    olhos: null,
    fundo: null
  },
  recordeDino: 0,        // ← NOVO: recorde do jogo da Nébula
  last: Date.now()
};
/* ============ GERAR PREFERÊNCIAS ============ */
function gerarPreferencias() {
  // Lista todas as comidas do catálogo
  const todas = Object.keys(CATALOGO);
  
  // Sorteia 3 favoritas
  const favoritas = [];
  while (favoritas.length < 3) {
    const c = todas[Math.floor(Math.random() * todas.length)];
    if (!favoritas.includes(c)) favoritas.push(c);
  }
  
  // Sorteia 3 detestadas (que NÃO estejam nas favoritas)
  const detestadas = [];
  while (detestadas.length < 3) {
    const c = todas[Math.floor(Math.random() * todas.length)];
    if (!favoritas.includes(c) && !detestadas.includes(c)) detestadas.push(c);
  }
  
  return { favoritas, detestadas };
}
/* ============ GERADOR DE ID ÚNICO ============ */
function gerarID(nome) {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const codigo = Array.from({ length: 4 }, () =>
    letras[Math.floor(Math.random() * letras.length)]
  ).join('');
  const nomeLimpo = (nome || 'NEBO')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 6) || 'NEBO';
  return `NB-${nomeLimpo}-${codigo}`;
}

let S = (() => {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    const s = raw ? { ...DEFAULT, ...raw } : { ...DEFAULT };
    // Garante que campos novos existam (pra Nébulas antigas)
    if (!s.ingredientes) s.ingredientes = {};
if (!s.docesProntos) s.docesProntos = [];

// Migração: chaves antigas de ingredientes → chaves novas
const MIGRACAO_ING = {
  '🥛': 'ing_leite',
  '🌾': 'ing_farinha',
  '🥚': 'ing_ovo',
  '🍬': 'ing_acucar',
  '🍫': 'ing_chocolate'
};
Object.entries(MIGRACAO_ING).forEach(([antiga, nova]) => {
  if (s.ingredientes[antiga]) {
    s.ingredientes[nova] = (s.ingredientes[nova] || 0) + s.ingredientes[antiga];
    delete s.ingredientes[antiga];
  }
});
    return s;
  } catch { return { ...DEFAULT }; }
})();
/* Quanto tempo ficou offline (minutos) — calculado UMA vez */
const awayAtBoot = Math.max(0, (Date.now() - S.last) / 60000);

function save() {
  S.last = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch {}
}
/* ============ SISTEMA DE MOEDAS ============ */
function ganharMoedas(qtd) {
  if (!qtd) return;
  S.moedas = (S.moedas || 0) + qtd;
  save();
  mostrarMoedas(qtd);
}

function mostrarMoedas(qtd) {
  const toast = document.createElement('div');
  toast.textContent = `🪙 +${qtd}`;
  toast.style.cssText = `
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: #f7d9e4;
    color: #1b1824;
    padding: 10px 20px;
    border-radius: 22px;
    font-size: 18px;
    font-weight: bold;
    z-index: 9999;
    pointer-events: none;
    box-shadow: 0 4px 20px rgba(247,217,228,.5);
    animation: moedaSobe 1.6s ease-out forwards;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 1600);
}

function decay(min, mul = 1) {
  if (!Number.isFinite(min) || min <= 0) return;
  S.energia = clamp(S.energia - .4 * min * mul);
  S.fome    = clamp(S.fome    - .5 * min * mul);
  S.limpeza = clamp(S.limpeza - .25 * min * mul);

  const extra = (S.fome < 30 || S.energia < 30 || S.limpeza < 30) ? .3 : 0;
  S.humor  = clamp(S.humor - (.3 + extra + (S.sick > Date.now() ? .3 : 0)) * min);
  S.saude  = clamp(S.saude + ((S.fome < 20 || S.energia < 20 || S.limpeza < 15) ? -.5 : .3) * min);
}

function offline(min) {
  min = Math.min(min, 480);
  decay(min * .4);
  if (min > 240) S.energia = Math.max(S.energia, 60);
  ['energia', 'fome', 'saude', 'humor'].forEach(k => S[k] = Math.max(S[k], 20));
}

/* Aplica o tempo que ficou offline (roda uma vez ao abrir) */
offline(awayAtBoot);
S.last = Date.now();

const isNight = () => { const h = new Date().getHours(); return h >= 22 || h < 6; };
const baseMood = () =>
  S.sick > Date.now() ? 'sick' :
  (isNight() || S.energia < 20) ? 'sleepy' :
  (S.humor < 25 || S.fome < 20) ? 'sad' : 'neutral';

/* ============ 3. PERSONALIDADE ============ */
const PM = {
  carinhosa:     { pet: 1.6, thr: .6 },
  curiosa:       { bored: .6 },
  tranquila:     { decay: .7, bored: 1.6 },
  brincalhona:   { play: 1.5, bored: .7 },
  temperamental: { irr: 2 },
  reservada:     { pet: .6 }
};
const pm = (k, d = 1) => (PM[S.pers] || {})[k] ?? d;
const thrPet = () => pm('thr') * (S.pers === 'reservada'
  ? Math.max(1, 2.5 - (S.bond || 0) * .15) : 1);

const PERS = [
  '🥰 carinhosa', '🧐 curiosa', '😴 tranquila',
  '😂 brincalhona', '😤 temperamental', '😶 reservada'
];

/* ============ 4. ROSTO ============ */
const bubble = $('bubble');
const acc = $('acc');
let mood = 'neutral', mt, bt, until = 0;

const VIB = {
  carinho: [40,60,40,60,40], angry: [220], scared: [60,40,60],
  dizzy: [100,50,100,50,100], cry: [80,60,80], happy: [25],
  tickle: [30,30,30,30,30]
};
const PR = {
  neutral: 0, dance: 3, bored: 1, sick: 1, sleepy: 1, sad: 1,
  happy: 1, curious: 2, carinho: 2, tickle: 2, surprised: 2,
  scared: 3, angry: 3, dizzy: 3, cry: 3
};

function say(t, ms = 2600) {
  if (!t) return;
  bubble.textContent = t;
  bubble.classList.add('on');
  clearTimeout(bt);
  bt = setTimeout(() => bubble.classList.remove('on'), ms);
}

function set(m, ms = 2200, t) {
  if (ms && Date.now() < until && PR[m] < PR[mood]) return;
  if (ms) { until = Date.now() + ms; if (VIB[m]) vib(VIB[m]); }
  clearTimeout(mt);
  mood = m;
  body.dataset.m = m;
  eyeEls.forEach(e => e.textContent = m === 'carinho' ? '❤️' : '');
  if (t) say(t);
  if (ms && m !== baseMood()) mt = setTimeout(() => set(baseMood(), 0), ms);
}

function wig() {
  eyes.classList.add('wig');
  setTimeout(() => eyes.classList.remove('wig'), 1200);
}

function heart(x, y) {
  const h = document.createElement('div');
  h.className = 'heart'; h.textContent = '💗';
  h.style.left = (x - 10) + 'px';
  h.style.top = (y - 10) + 'px';
  document.body.appendChild(h);
  setTimeout(() => h.remove(), 1200);
}

function look(x, y) {
  eyes.style.transform =
    `translate(${(x / innerWidth - .5) * 60}px, ${(y / innerHeight - .5) * 34}px)`;
}
/* ============ APLICAR VISUAL DA BOUTIQUE ============ */
function aplicarVisual() {
  // Remove emojis antigos de cabeça e óculos
  document.querySelectorAll('.acessorio-nebo').forEach(e => e.remove());

  // Pega o que tá equipado
  const eq = S.equipado || {};

  // 1. Acessório de cabeça (canto superior direito)
  if (eq.cabeca) {
    const el = document.createElement('div');
    el.className = 'acessorio-nebo';
    el.textContent = eq.cabeca;
    el.style.cssText = `
      position: absolute;
      top: -20px;
      right: -30px;
      font-size: calc(var(--ew) * 0.5);
      z-index: 10;
      pointer-events: none;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,.5));
    `;
    document.getElementById('face').appendChild(el);
  }

  // 2. Óculos (em cima dos olhos)
  if (eq.oculos) {
    const el = document.createElement('div');
    el.className = 'acessorio-nebo';
    el.textContent = eq.oculos;
    el.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: calc(var(--ew) * 1.8);
      z-index: 11;
      pointer-events: none;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,.5));
    `;
    document.getElementById('eyes').appendChild(el);
  }

  // 3. Cor dos olhos + boca
  if (eq.olhos) {
    const cor = BOUTIQUE.olhos[eq.olhos]?.cor;
    if (cor) {
      document.documentElement.style.setProperty('--eye', cor);
    }
  } else {
    // Volta ao padrão
    document.documentElement.style.setProperty('--eye', '#f7d9e4');
  }

  // 4. Fundo da tela
  if (eq.fundo) {
    const cor = BOUTIQUE.fundo[eq.fundo]?.cor;
    if (cor) {
      document.body.style.background = cor;
      // Adiciona estrelinhas se for fundo especial
      if (eq.fundo === '🌌' || eq.fundo === '🌠' || eq.fundo === '🌉') {
        document.body.style.background = `${cor} radial-gradient(circle at 30% 30%, #ffffff22 0 1px, transparent 2px), radial-gradient(circle at 70% 60%, #ffffff22 0 1px, transparent 2px), radial-gradient(circle at 50% 80%, #ffffff22 0 1px, transparent 2px), ${cor}`;
        document.body.style.backgroundSize = '200px 200px, 300px 300px, 150px 150px, auto';
      }
    }
  } else {
    document.body.style.background = '#000';
    document.body.style.backgroundImage = 'none';
  }
}
function resetLook() { eyes.style.transform = ''; }

set(baseMood(), 0);

/* Piscar */
(function blink() {
  const allow = ['neutral', 'happy', 'sad', 'curious'].includes(mood);
  if (allow) {
    eyeEls.forEach(e => e.style.setProperty('--blink', .08));
    setTimeout(() => eyeEls.forEach(e => e.style.setProperty('--blink', 1)), 130);
  }
  setTimeout(blink, 2200 + Math.random() * 3000);
})();

/* ============ 5. SENSORES ============ */
let gotO = 0, gotM = 0, batOK = 0, permAsked = 0;

async function askPerm() {
  if (permAsked) return;
  permAsked = 1;
  try {
    for (const C of [window.DeviceMotionEvent, window.DeviceOrientationEvent])
      if (C?.requestPermission) await C.requestPermission();
  } catch {}
}

function startSensors() {
  addEventListener('deviceorientation', onOri);
  addEventListener('devicemotion', onMot);
  startBattery();
}

let lastG = null, lastD = 0, sw = 0, swT = 0, swCool = 0, cool = 0;

function onOri(e) {
  if (e.beta == null) return;
  gotO = 1;
  const t = Date.now();

  if (t - swT > 5000) { swT = t; sw = 0; }
  if (lastG != null) {
    const d = (e.gamma || 0) - lastG;
    if (Math.abs(d) > 1.5 && d * lastD < 0 && Math.abs(e.gamma) < 25) sw++;
    if (Math.abs(d) > 1.5) lastD = d;
  }
  lastG = e.gamma || 0;
  if (sw >= 6 && t > swCool) {
    swCool = t + 9000; sw = 0;
    set('sleepy', 5000, 'Zzz... 😴');
    S.energia = clamp(S.energia + 6); save();
  }

  const g = clamp(e.gamma || 0, -45, 45) / 45;
  const b = clamp((e.beta || 0) - 55, -40, 40) / 40;
  if (!['scared', 'dizzy'].includes(mood))
    eyes.style.transform = `translate(${g * 30}px, ${b * 18}px)`;

  if (t < cool) return;
  if (e.beta < 15) {
    cool = t + 5000;
    set('sleepy', 3500, 'Aaaah... 🥱');
    S.energia = clamp(S.energia + 3); save();
  } else if (e.beta > 115) {
    cool = t + 4000;
    set('scared', 2500, 'Aaah, vou cair! 😨');
  }
}
/* ---------- DETECÇÃO DE MOVIMENTO ---------- */
let free = 0;                    // contador de queda livre
let shakes = 0, lastShake = 0;   // contador de chacoalhada
let ultimaSacudida = 0;
let walkingPeaks = [], lastPeak = 0;
let walkingCool = 0, dizzyCool = 0;

function onMot(e) {
  const ag = e.accelerationIncludingGravity;
  const t = Date.now();

  // 1. QUEDA LIVRE
  if (ag && ag.x != null) {
    gotM = 1;
    const G = Math.hypot(ag.x, ag.y, ag.z);
    if (G < 2.5) {
      if (++free >= 4) { free = 0; set('scared', 2500, 'Aaah, tô caindo! 😱'); }
    } else free = 0;
  }

  // 2. CHACOALHADA (com reset por tempo, não por decremento)
  if (ag && ag.x != null) {
    const G = Math.hypot(ag.x, ag.y, ag.z);
    const excess = Math.abs(G - 9.8);

    if (excess > 20 && t > dizzyCool) {
      if (t - lastShake > 100) {
        lastShake = t;
        shakes++;

        // Se passou muito tempo desde a última sacudida, zera
       if (t - ultimaSacudida > 300) shakes = 0;
        ultimaSacudida = t;

        if (shakes >= 5) {
          shakes = 0;
          dizzyCool = t + 4000;
          walkingCool = t + 4000;
          walkingPeaks = [];

              SOM.melodia([N.LA, N.FA, N.RE, N.DO_BAIXO], 0.1, 'sine', 0.1);
          set('dizzy', 2500, 'Tô tonta! 😵');
                     setTimeout(() => {
            if (S.humor >= 50) {
              SOM.melodia([N.DO_BAIXO, N.DO_BAIXO], 0.1, 'sawtooth', 0.1);
              set('angry', 2500, 'Para! 😠');
            } else {
              set('cry', 3000, 'Buáá... 😢');
            }
          }, 2600);
        }
      }
    }
  }

  // 3. CAMINHADA
  if (ag && ag.x != null && t > walkingCool) {
    const G = Math.hypot(ag.x, ag.y, ag.z);
    if (G > 13 && G < 22) {
      const interval = t - lastPeak;
      if (interval > 250 && interval < 700) {
        lastPeak = t;
        walkingPeaks.push(t);
        walkingPeaks = walkingPeaks.filter(x => t - x < 3500);
        if (walkingPeaks.length >= 5) {
          walkingPeaks = [];
          walkingCool = t + 8000;
          wig();
          set('curious', 3000, 'Vamos passear? 🚶');
        }
      }
    }
  }
}
function startBattery() {
  if (!navigator.getBattery) return;
  navigator.getBattery().then(b => {
    batOK = 1;
    let warned = false;
    const check = () => {
      if (b.level < .2 && !b.charging && !warned) {
        warned = true; say('Estou ficando sem energia...');
      }
    };
    check();
    b.addEventListener('levelchange', check);
  }).catch(() => {});
}

addEventListener('offline', () => set('sad', 4000, 'Sem internet... 📵'));
addEventListener('online',  () => set('happy', 2500, 'Voltou a internet! 📶'));

/* ============ 6. TOQUE ============ */
const ptrs = new Map();
let sx = null, sy = null, moved = 0, petD = 0, rev = 0, lastDx = 0;
let lastX = 0, lastY = 0, pinch0 = 0, multi = 0, pinched = 0, tMulti = 0;
let hold, taps = [], lastAct = Date.now(), stage = 0, tickleCool = 0;

const dist = () => {
  const p = [...ptrs.values()];
  return Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
};
const act = () => { lastAct = Date.now(); stage = 0; };

function pet(m, t) {
  if (mood !== m) set(m, 1300, t);
  else {
    until = Date.now() + 1300;
    clearTimeout(mt);
    mt = setTimeout(() => set(baseMood(), 0), 1300);
  }
}

addEventListener('pointerdown', e => {
  act();
  if (gOn) return;
  if (!permAsked) { permAsked = 1; askPerm().then(startSensors); }
    if (e.target.closest('button,#estado,#panel,#bar,#doceria,#biblioteca,#cidade,#telaSpa,#tela-foco,#bib-loja-painel,#bib-escolha,#bib-menu')) return;
  
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 1) {
    sx = lastX = e.clientX;
    sy = lastY = e.clientY;
    moved = 0; petD = 0; rev = 0; multi = 0; pinched = 0;
    hold = setTimeout(() => {
      if (!moved) {
        const dx = (sx < innerWidth / 2 ? 1 : -1) * 40;
        eyes.style.transform = `translate(${dx}px, 0)`;
        set('scared', 1800, 'Me solta! 😖');
      }
    }, 700);
  } else {
    clearTimeout(hold);
    multi = 1; tMulti = Date.now(); pinch0 = dist();
  }
});

addEventListener('pointermove', e => {
  if (!ptrs.has(e.pointerId)) return;
  act();
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (ptrs.size === 2) {
    const d = dist();
    if (Math.abs(d - pinch0) > 40) {
      pinched = 1;
      set('scared', 1800, 'Ai! 😨');
      pinch0 = d;
    }
    return;
  }
  if (sx == null || multi) return;

  if (Math.hypot(e.clientX - sx, e.clientY - sy) > 12) {
    moved = 1;
    clearTimeout(hold);
    look(e.clientX, e.clientY);
  }

  if (moved) {
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    petD += Math.hypot(dx, dy);
    if (dx * lastDx < 0 && Math.abs(dx) > 3) rev++;
    if (Math.abs(dx) > 3) lastDx = dx;
    lastX = e.clientX; lastY = e.clientY;

        
         if (rev >= 10 && Date.now() > tickleCool) {
      rev = 0; wig();
      tickleCool = Date.now() + 2500;
      pet('tickle', 'Hahaha, cócegas! 🤣');
      S.humor = clamp(S.humor + 4);
      SOM.melodia([N.DO, N.MI, N.SOL], 0.06, 'sine', 0.08);
    } else if (petD > 700 * pm('thr') && rev < 3 && Date.now() > tickleCool) {
      pet('carinho', 'Ronrom... 😍');
      heart(e.clientX, e.clientY);
    } else if (petD > 120 * thrPet() && rev < 3 && Date.now() > tickleCool) {
      SOM.melodia([N.DO, N.MI, N.SOL], 0.08, 'sine', 0.08);
      pet('happy', '');
      heart(e.clientX, e.clientY);
      S.bond = (S.bond || 0) + 1;
      S.humor = clamp(S.humor + 5 * pm('pet'));
    }
  }
});

function up(e) {
  clearTimeout(hold);
  if (!ptrs.has(e.pointerId)) return;
  ptrs.delete(e.pointerId);

  if (multi) {
    if (ptrs.size === 0) {
      if (!pinched && Date.now() - tMulti < 450) {
        set('sleepy', 4000, 'Zzz... 😴');
        S.energia = clamp(S.energia + 8);
      }
      multi = 0; sx = null; resetLook();
    }
    return;
  }

  if (sx == null) return;
  const was = moved;
  sx = null; resetLook();
  if (was) return;

  const t = Date.now();
  taps = taps.filter(x => t - x < 1100);
  taps.push(t);
  const n = taps.length;

  if (n >= (S.pers === 'temperamental' ? 2 : 3)) {
    set('angry', 2500, 'Para! 😠');
    S.humor = clamp(S.humor - 3 * pm('irr'));
    taps = []; return;
  }
  if (n === 2) { set('curious', 2200, '?'); return; }
  set('happy', 1600, '');
}

addEventListener('pointerup', up);
addEventListener('pointercancel', up);

/* ============ 7. TÉDIO AUTOMÁTICO ============ */
setInterval(() => {
  const s = (Date.now() - lastAct) / 1000;
  if (s > 40 * pm('bored') && stage < 1) { stage = 1; set('curious', 9000, '👀'); }
  if (s > 60 * pm('bored') && stage < 2) {
    stage = 2;
    if (S.pers === 'tranquila') set('sleepy', 6000, 'Zzz... 😴');
    else {
      set(S.pers === 'carinhosa' ? 'sad' : 'bored', 5000,
          S.pers === 'carinhosa' ? 'Me faz carinho? 🥰' : 'Tô entediada... 🥱');
      S.humor = clamp(S.humor - 2);
    }
  }
  if (s > 120 && stage < 3) { stage = 3; wig(); }
}, 1000);

setInterval(() => {
  if (Date.now() - lastAct < 20000 || mood !== baseMood()) return;
  if (S.pers === 'curiosa') set('curious', 4000, '👀');
  else if (S.pers === 'brincalhona') { wig(); set('happy', 2000, 'Hihi 😄'); }
}, 25000);

/* ============ 8. COMIDA ============ */
/* ============ CATÁLOGO DE COMIDAS ============ */
const CATALOGO = {
  // 🥗 SAUDÁVEIS
  '🍎': { nome: 'Maçã',       tipo: 'saudavel', preco: 3,  humor: 2, saude: 2 },
  '🍓': { nome: 'Morango',    tipo: 'saudavel', preco: 5,  humor: 3, saude: 2 },
  '🥭': { nome: 'Manga',      tipo: 'saudavel', preco: 6,  humor: 3, saude: 2 },
  '🍉': { nome: 'Melancia',   tipo: 'saudavel', preco: 7,  humor: 4, saude: 2 },
  '🍒': { nome: 'Cereja',     tipo: 'saudavel', preco: 8,  humor: 4, saude: 2 },
  '🫐': { nome: 'Blueberry',  tipo: 'saudavel', preco: 8,  humor: 4, saude: 3 },
  '🍇': { nome: 'Uva',        tipo: 'saudavel', preco: 6,  humor: 3, saude: 2 },
  '🥒': { nome: 'Pepino',     tipo: 'saudavel', preco: 4,  humor: 1, saude: 3 },
  '🥗': { nome: 'Salada',     tipo: 'saudavel', preco: 6,  humor: 2, saude: 4 },
  '🍣': { nome: 'Sushi',      tipo: 'saudavel', preco: 12, humor: 6, saude: 3 },
  '🍵': { nome: 'Chá',        tipo: 'saudavel', preco: 4,  humor: 2, saude: 3 },

  // 🍔 INDUSTRIAIS
  '🍞': { nome: 'Pão',            tipo: 'industrial', preco: 4,  humor: 2, saude: -1 },
  '🍕': { nome: 'Pizza',          tipo: 'industrial', preco: 18, humor: 7, saude: -2 },
  '🍔': { nome: 'Hambúrguer',     tipo: 'industrial', preco: 18, humor: 8, saude: -2 },
  '🧇': { nome: 'Waffle',         tipo: 'industrial', preco: 15, humor: 6, saude: -2 },
  '🥞': { nome: 'Panqueca',       tipo: 'industrial', preco: 14, humor: 6, saude: -2 },
  '🍟': { nome: 'Batata frita',   tipo: 'industrial', preco: 12, humor: 6, saude: -2 },
  '🌭': { nome: 'Cachorro-quente',tipo: 'industrial', preco: 14, humor: 7, saude: -2 },
  '🌮': { nome: 'Taco',           tipo: 'industrial', preco: 15, humor: 7, saude: -2 },
  '🧋': { nome: 'Bubble tea',     tipo: 'industrial', preco: 16, humor: 8, saude: -1 },
  '🍲': { nome: 'Sopa',           tipo: 'industrial', preco: 10, humor: 4, saude: 1 },

  // 🍰 DOCES
  '🍬': { nome: 'Bala',       tipo: 'doce', preco: 3,  humor: 3, saude: -1 },
  '🍭': { nome: 'Pirulito',   tipo: 'doce', preco: 5,  humor: 4, saude: -1 },
  '🍪': { nome: 'Cookie',     tipo: 'doce', preco: 8,  humor: 5, saude: -2 },
  '🍫': { nome: 'Chocolate',  tipo: 'doce', preco: 10, humor: 6, saude: -2 },
  '🧊': { nome: 'Raspadinha', tipo: 'doce', preco: 10, humor: 6, saude: -1 },
  '🍰': { nome: 'Bolo',       tipo: 'doce', preco: 12, humor: 7, saude: -3 },
  '🍦': { nome: 'Sorvete',    tipo: 'doce', preco: 12, humor: 7, saude: -2 },
  '🍩': { nome: 'Donut',      tipo: 'doce', preco: 15, humor: 8, saude: -3 },
  '🧁': { nome: 'Cupcake',    tipo: 'doce', preco: 15, humor: 8, saude: -3 },
  '🍮': { nome: 'Pudim',      tipo: 'doce', preco: 18, humor: 9, saude: -2 }
};
/* ============ CATÁLOGO DE INGREDIENTES ============ */
const INGREDIENTES = {
  // 🌱 Básicos
  ing_leite:      { emoji: '🥛', nome: 'Leite',              preco: 4,  tipo: 'ingrediente' },
  ing_ovo:        { emoji: '🥚', nome: 'Ovo',                preco: 2,  tipo: 'ingrediente' },
  ing_farinha:    { emoji: '🌾', nome: 'Farinha de trigo',   preco: 3,  tipo: 'ingrediente' },
  ing_acucar:     { emoji: '🍬', nome: 'Açúcar',             preco: 3,  tipo: 'ingrediente' },
  ing_manteiga:   { emoji: '🧈', nome: 'Manteiga',           preco: 5,  tipo: 'ingrediente' },
  ing_creme:      { emoji: '🍶', nome: 'Creme de leite',     preco: 6,  tipo: 'ingrediente' },
  ing_chocolate:  { emoji: '🍫', nome: 'Chocolate',          preco: 6,  tipo: 'ingrediente' },
  ing_cafe:       { emoji: '☕', nome: 'Café',               preco: 4,  tipo: 'ingrediente' },
  ing_limao:      { emoji: '🍋', nome: 'Limão',              preco: 3,  tipo: 'ingrediente' },
  ing_fruta:      { emoji: '🍓', nome: 'Fruta',              preco: 4,  tipo: 'ingrediente' },

  // ✨ Mágicos (do universo do livro)
  ing_mirtilo:    { emoji: '🫐', nome: 'Mirtilos Nebulosos',      preco: 10, tipo: 'ingrediente' },
  ing_maca:       { emoji: '🍎', nome: 'Maçãs-aladas',            preco: 10, tipo: 'ingrediente' },
  ing_amendoim:   { emoji: '🥜', nome: 'Amendoim-unicórnio',      preco: 8,  tipo: 'ingrediente' },
  ing_abobora:    { emoji: '🎃', nome: 'Abóbora Diabrotic',       preco: 12, tipo: 'ingrediente' }
};
/* ============ CATÁLOGO DE RECEITAS ============ */
const RECEITAS = {

  // 🍮 PUDIM
  pudim: {
    nome: 'Pudim',
    emoji: '🍮',
    ingredientes: { ing_leite: 2, ing_ovo: 3, ing_acucar: 4 },
    humor: 8,
    tempo: 4000,
    passos: [
      { texto: 'Quebre os ovos com cuidado',        acao: '🥚' },
      { texto: 'Bata com o açúcar até virar um creme', acao: '🥄' },
      { texto: 'Aqueça o leite devagar',            acao: '🔥' },
      { texto: 'Misture tudo com carinho',          acao: '💗' },
      { texto: 'Coloque na forma',                  acao: '🍮' },
      { texto: 'Leve ao forno!',                    acao: '🔥' }
    ]
  },

  // 🎂 BOLO
  bolo: {
    nome: 'Bolo',
    emoji: '🎂',
    ingredientes: { ing_farinha: 2, ing_ovo: 2, ing_leite: 2, ing_acucar: 2, ing_manteiga: 1 },
    humor: 9,
    tempo: 6000,
    passos: [
      { texto: 'Misture os ovos, açúcar e manteiga', acao: '🥣' },
      { texto: 'Acrescente a farinha',               acao: '🌾' },
      { texto: 'Adicione o leite aos poucos',        acao: '🥛' },
      { texto: 'Bata até formar uma massa lisa',     acao: '🥄' },
      { texto: 'Coloque na forma',                   acao: '🍰' },
      { texto: 'Leve ao forno!',                     acao: '🔥' }
    ]
  },

  // 🍪 BISCOITO
  biscoito: {
    nome: 'Biscoito',
    emoji: '🍪',
    ingredientes: { ing_farinha: 2, ing_acucar: 1, ing_ovo: 1, ing_manteiga: 1 },
    humor: 6,
    tempo: 3000,
    passos: [
      { texto: 'Misture a manteiga e o açúcar',   acao: '🧈' },
      { texto: 'Acrescente o ovo',                acao: '🥚' },
      { texto: 'Adicione a farinha',              acao: '🌾' },
      { texto: 'Faça pequenos biscoitos',         acao: '🍪' },
      { texto: 'Coloque na forma',                acao: '🍪' },
      { texto: 'Leve ao forno!',                  acao: '🔥' }
    ]
  },

  // 🥞 PANQUECA
  panqueca: {
    nome: 'Panqueca',
    emoji: '🥞',
    ingredientes: { ing_farinha: 2, ing_ovo: 1, ing_leite: 2, ing_acucar: 1, ing_manteiga: 1 },
    humor: 7,
    tempo: 4000,
    passos: [
      { texto: 'Misture a farinha, ovo e leite',  acao: '🥣' },
      { texto: 'Bata até formar uma massa lisa',  acao: '🥄' },
      { texto: 'Aqueça a frigideira com manteiga',acao: '🔥' },
      { texto: 'Coloque a massa na frigideira',   acao: '🥞' },
      { texto: 'Vire quando estiver dourada',     acao: '🥞' },
      { texto: 'Retire e sirva',                  acao: '🍽️' }
    ]
  },

  // ☕ CAPPUCCINO
  cappuccino: {
    nome: 'Cappuccino',
    emoji: '☕',
    ingredientes: { ing_leite: 2, ing_cafe: 1, ing_acucar: 1 },
    humor: 6,
    tempo: 3000,
    passos: [
      { texto: 'Prepare o café',                 acao: '☕' },
      { texto: 'Aqueça o leite',                 acao: '🔥' },
      { texto: 'Misture o café, leite e açúcar', acao: '🥄' },
      { texto: 'Bata até formar uma espuma',     acao: '🥛' },
      { texto: 'Coloque na xícara e sirva',      acao: '☕' }
    ]
  },

  // 🍦 SORVETE
  sorvete: {
    nome: 'Sorvete',
    emoji: '🍦',
    ingredientes: { ing_leite: 2, ing_creme: 1, ing_acucar: 2, ing_fruta: 2 },
    humor: 8,
    tempo: 6000,
    passos: [
      { texto: 'Misture o leite e o creme de leite', acao: '🥛' },
      { texto: 'Acrescente o açúcar',                acao: '🍬' },
      { texto: 'Adicione a fruta escolhida',         acao: '🍓' },
      { texto: 'Bata tudo até ficar cremoso',        acao: '🥄' },
      { texto: 'Coloque em um recipiente',           acao: '🥣' },
      { texto: 'Leve ao congelador',                 acao: '❄️' },
      { texto: 'Espere ficar bem gelado',            acao: '🧊' }
    ]
  },

  // 🥤 MILKSHAKE
  milkshake: {
    nome: 'Milkshake',
    emoji: '🥤',
    ingredientes: { ing_leite: 2, ing_creme: 1, ing_fruta: 2, ing_acucar: 1 },
    humor: 7,
    tempo: 3000,
    passos: [
      { texto: 'Coloque o leite no liquidificador',  acao: '🥛' },
      { texto: 'Acrescente o creme de leite',        acao: '🍶' },
      { texto: 'Adicione a fruta escolhida',         acao: '🍓' },
      { texto: 'Junte o açúcar',                     acao: '🍬' },
      { texto: 'Bata até ficar cremoso',             acao: '🥄' },
      { texto: 'Coloque no copo e sirva',            acao: '🥤' }
    ]
  },

  // 🫐 TORTA DE MIRTILOS NEBULOSOS
  torta_mirtilo: {
    nome: 'Torta de Mirtilos Nebulosos',
    emoji: '🫐',
    ingredientes: { ing_farinha: 3, ing_manteiga: 1, ing_acucar: 2, ing_mirtilo: 2, ing_creme: 1, ing_limao: 1 },
    humor: 10,
    tempo: 7000,
    passos: [
      { texto: 'Misture a farinha e o açúcar',          acao: '🌾' },
      { texto: 'Acrescente a manteiga e o creme de leite', acao: '🧈' },
      { texto: 'Amasse até formar uma massa',           acao: '🥣' },
      { texto: 'Prepare os Mirtilos Nebulosos com limão', acao: '🫐' },
      { texto: 'Coloque o recheio sobre a massa',       acao: '🫐' },
      { texto: 'Leve ao forno!',                        acao: '🔥' },
      { texto: 'Espere esfriar antes de servir',        acao: '❄️' }
    ]
  },

  // 🍎 TORTA DE MAÇÃ-ALADA CARAMELIZADA
  torta_maca: {
    nome: 'Torta de Maçã-alada Caramelizada',
    emoji: '🍎',
    ingredientes: { ing_farinha: 3, ing_manteiga: 2, ing_acucar: 3, ing_maca: 2, ing_creme: 1, ing_limao: 1 },
    humor: 10,
    tempo: 7000,
    passos: [
      { texto: 'Misture a farinha e o açúcar',           acao: '🌾' },
      { texto: 'Acrescente a manteiga e o creme de leite', acao: '🧈' },
      { texto: 'Amasse até formar uma massa',            acao: '🥣' },
      { texto: 'Corte as Maçãs-aladas em fatias',        acao: '🍎' },
      { texto: 'Caramelize as maçãs com açúcar e limão', acao: '🍯' },
      { texto: 'Coloque sobre a massa',                  acao: '🍎' },
      { texto: 'Leve ao forno!',                         acao: '🔥' },
      { texto: 'Espere esfriar antes de servir',         acao: '❄️' }
    ]
  },

  // 🎃 TORTA DE ABÓBORA DA FAMÍLIA DIABROTIC
  torta_abobora: {
    nome: 'Torta de Abóbora da Família Diabrotic',
    emoji: '🎃',
    ingredientes: { ing_farinha: 3, ing_manteiga: 2, ing_acucar: 2, ing_abobora: 2, ing_ovo: 1, ing_creme: 1 },
    humor: 10,
    tempo: 8000,
    passos: [
      { texto: 'Misture a farinha, manteiga e açúcar',    acao: '🌾' },
      { texto: 'Amasse até formar uma massa',             acao: '🥣' },
      { texto: 'Coloque a massa na forma',                acao: '🎃' },
      { texto: 'Amasse a Abóbora Diabrotic cozida',       acao: '🎃' },
      { texto: 'Misture com o ovo e o creme de leite',    acao: '🥚' },
      { texto: 'Coloque o recheio sobre a massa',         acao: '🎃' },
      { texto: 'Leve ao forno!',                          acao: '🔥' },
      { texto: 'Espere esfriar antes de servir',          acao: '❄️' }
    ]
  },

  // 🌸 PAÇOCA FLORAL
  pacoca: {
    nome: 'Paçoca Floral',
    emoji: '🌸',
    ingredientes: { ing_amendoim: 2, ing_acucar: 1, ing_manteiga: 1 },
    humor: 8,
    tempo: 3000,
    passos: [
      { texto: 'Bata o Amendoim-unicórnio com o açúcar', acao: '🥜' },
      { texto: 'Coloque a mistura em uma vasilha',       acao: '🥣' },
      { texto: 'Amasse até o óleo do amendoim sair',     acao: '🥜' },
      { texto: 'Coloque em uma forma untada',            acao: '🧈' },
      { texto: 'Aperte bem a massa',                     acao: '🥜' },
      { texto: 'Leve à geladeira',                       acao: '❄️' },
      { texto: 'Corte no formato de flor',               acao: '🌸' }
    ]
  }

};
const FOODS = ['🍎', '🍓', '🥒', '🍌'];
let lastTray = 0;

function prefs() {
  const c = Object.keys(S.food || {}).filter(k => S.food[k] > 2);
  if (!S.pref || Date.now() > S.pref.until)
    S.pref = c.length ? { f: rnd(c), until: Date.now() + 6048e5 } : null;
  if (!S.dis || (S.pref && S.dis === S.pref.f))
    S.dis = rnd(FOODS.filter(x => !S.pref || x !== S.pref.f));
}

/* Descobre os dados de uma comida (do mercado ou feita em casa) */
function infoComida(f) {
  const ehCaseiro = f.startsWith('caseiro_');
  const chave = ehCaseiro ? f.replace('caseiro_', '') : f;

  if (ehCaseiro) {
    const rec = Object.values(RECEITAS).find(r => r.emoji === chave);
    if (rec) return { chave, ehCaseiro, nome: rec.nome, humor: rec.humor, saude: 0 };
  }
  if (CATALOGO[chave]) return { chave, ehCaseiro, ...CATALOGO[chave] };
  return null;
}

function eat(f) {
  if ((S.estoque[f] || 0) <= 0) {
    say('Não tenho ' + f + ' no estoque... 😢');
    return;
  }

  const c = infoComida(f);
  if (!c) { say('Não sei o que é isso... 🤔'); return; }
  const emoji = c.chave;

  S.estoque[f] -= 1;
  if (S.estoque[f] <= 0) delete S.estoque[f];
  P.classList.remove('on');

  S.fome = clamp(S.fome + 15);

  const fav = (S.favoritas || []).includes(emoji);
  const det = (S.detestadas || []).includes(emoji);

  let humorGanho = c.humor;
  let expressao = 'happy';
  let fala;
  let sufixo = '';

  if (fav) {
    humorGanho = c.humor * 2;
    expressao = 'carinho';
    sufixo = ' (meu favorito!)';
  } else if (det) {
    humorGanho = Math.min(-3, -c.humor);
    expressao = 'sad';
    sufixo = ' (eca!)';
  }

  S.humor = clamp(S.humor + humorGanho);
  S.saude = clamp(S.saude + c.saude);

  if (det) fala = 'Eca... ' + emoji;
  else if (c.humor >= 7) { fala = 'Adoro! ' + emoji; expressao = 'carinho'; }
  else if (c.humor >= 5) fala = 'Que delícia! ' + emoji;
  else if (c.saude >= 3) fala = 'Saudável! ' + emoji + ' 🥗';
  else fala = 'Nham! ' + emoji;

  if (!fav && !det && c.saude >= 2) sufixo = ' ✨';

  set(expressao, 2500, fala + sufixo);
  SOM.melodia([N.MI, N.SOL], 0.1, 'triangle', 0.1);

  if (c.humor >= 6 && !det) setTimeout(() => heart(innerWidth / 2, innerHeight / 2), 300);

  // 🎁 Bônus de doce caseiro
  if (c.ehCaseiro) {
    let bonus = 30;
    if (fav) bonus += 15;
    ganharMoedas(bonus);
    setTimeout(() => say(`Que delícia! +${bonus} 🪙 de carinho 💗`, 3500), 800);
  }
  save();
}
function foodTray() {
  const temEstoque = Object.keys(S.estoque || {}).filter(f => (S.estoque[f] || 0) > 0);

  if (temEstoque.length === 0) {
    panel(
      '<h3>🍽️ Comida</h3>' +
      '<p style="opacity:.7;margin:12px 0">Não tem nada no estoque...</p>' +
      '<p style="opacity:.6;font-size:13px">Vá ao mercado comprar comidinhas! 🛒</p>'
    );
    return;
  }

  panel(
    '<h3>🍽️ Comida</h3>' +
    '<p style="font-size:13px;opacity:.7;margin:0 0 12px">O que tenho pra comer:</p>' +
    temEstoque.map(f => {
      const qtd = S.estoque[f] || 0;
      const ehCaseiro = f.startsWith('caseiro_');
      const emoji = ehCaseiro ? f.replace('caseiro_', '') : f;
      const label = ehCaseiro ? ' (feito em casa)' : '';
      const cor = ehCaseiro ? 'background:#f7d9e4;color:#1b1824' : '';
      return `<button data-f="${f}" style="font-size:20px;padding:12px;display:flex;justify-content:space-between;align-items:center;${cor}">
        <span>${emoji}${label}</span>
        <span style="font-size:12px;opacity:.6">x${qtd}</span>
      </button>`;
    }).join('')
  );
}




/* ============ CONFIGURAÇÕES DA BIBLIOTECA ============ */
/* Mude à vontade! Os textos vão aparecer no jogo. */
const BIB_CONFIG = {
  // ---------- LER LIVROS ----------
  cooldownMin: 30,              // minutos pra reler o mesmo livro
  chanceGostar: 50,             // % de chance de gostar (50 = meio a meio)

  // Recompensas
  humorGostou: 8,               // +humor se gostar
  humorNaoGostou: -4,           // humor se não gostar
  moedasGostou: 5,              // moedas ganhas se gostar

  // ---------- TEXTOS ----------
  falaGostou: [
    'Que livro bom! 📖💗',
    'Adorei essa história! ✨',
    'Não conseguia parar de ler! 🥰',
    'Que final maravilhoso! 😍',
    'Vou recomendar pra todo mundo! 💫'
  ],
  falaNaoGostou: [
    'Hmm... não curti muito 😕',
    'Achei meio chato... 😴',
    'Não entendi nada 🤔',
    'Esperava mais... 😑',
    'Que tédio 😒'
  ],
  falaJaLeuGostou: [
    'Esse eu já li e amei! 💗',
    'Ah, esse é meu favorito! 📖✨',
    'Já li de novo, continua incrível! 🥰'
  ],
  falaJaLeuNaoGostou: [
    'Já li esse... não gostei 😕',
    'Ah, esse de novo? Não curto 😑',
    'Já sei que não gosto desse 😒'
  ],
  falaAindaNao: [
    'Já li faz pouco tempo... ⏳',
    'Calma, deixa eu digerir a história 😌',
    'Daqui a pouco eu leio de novo 📚'
  ],

  // ---------- AVISO DE ATUALIZAÇÃO ----------
  moedasAtualizacao: 120,       // recompensa por atualizar

  avisoTexto: '✨ Nébula atualizada! Toque para ganhar {m} 🪙',
  avisoTextoJaPego: '✨ Nébula atualizada! Toque para recarregar'
};

/* ============ CATÁLOGO DE LIVROS (Biblioteca) ============ */
/* Cada livro: id, nome, autor, preco, cor (capa), cor2 (detalhe), raridade */
const LIVROS = {
  divinos_rivais: {
    nome: 'Divinos Rivais',
    autor: 'Rebecca Ross',
    preco: 35,
    cor: '#1a2456',      // azul-marinho
    cor2: '#d4af37',     // dourado
    raridade: 'comum'
  },
  promessas_crueis: {
    nome: 'Promessas Cruéis',
    autor: 'Rebecca Ross',
    preco: 38,
    cor: '#0d0d0d',
    cor2: '#c1272d',
    raridade: 'comum'
  },
  era_uma_vez: {
    nome: 'Era Uma Vez um Coração Partido',
    autor: 'Stephanie Garber',
    preco: 35,
    cor: '#141414',
    cor2: '#d4af37',
    raridade: 'comum'
  },
  principe_cruel: {
    nome: 'O Príncipe Cruel',
    autor: 'Holly Black',
    preco: 38,
    cor: '#f5f0e0',
    cor2: '#c9a227',
    raridade: 'comum'
  },
  assistente_vilao: {
    nome: 'Assistente do Vilão',
    autor: 'Hannah Nicole Maehrer',
    preco: 36,
    cor: '#3d1e5c',
    cor2: '#b8860b',
    raridade: 'comum'
  },
  jogos_heranca: {
    nome: 'Jogos de Herança',
    autor: 'Jennifer Lynn Barnes',
    preco: 38,
    cor: '#1a1a1a',
    cor2: '#d4af37',
    raridade: 'comum'
  },
  nao_e_filmes: {
    nome: 'Não É Como nos Filmes',
    autor: 'Lynn Painter',
    preco: 32,
    cor: '#f5b8c8',
    cor2: '#e895ab',
    raridade: 'comum'
  },
  mil_vezes_amor: {
    nome: 'Mil Vezes Amor',
    autor: 'Taylor Jenkins Reid',
    preco: 30,
    cor: '#a8c8e0',
    cor2: '#f5b8c8',
    raridade: 'comum'
  },
  orgulho_preconceito: {
    nome: 'Orgulho e Preconceito',
    autor: 'Jane Austen',
    preco: 28,
    cor: '#4a2c1a',
    cor2: '#c9a227',
    raridade: 'comum'
  },
  iracema: {
    nome: 'Iracema',
    autor: 'José de Alencar',
    preco: 25,
    cor: '#8b1a1a',
    cor2: '#2d5016',
    raridade: 'comum'
  },
  morro_ventos: {
    nome: 'O Morro dos Ventos Uivantes',
    autor: 'Emily Brontë',
    preco: 30,
    cor: '#2a2a2a',
    cor2: '#8b8b8b',
    raridade: 'comum'
  },
  hp_pedra: {
    nome: 'Harry Potter e a Pedra Filosofal',
    autor: 'J.K. Rowling',
    preco: 30,
    cor: '#6a3d8a',
    cor2: '#d4af37',
    raridade: 'comum'
  },
  hp_azkaban: {
    nome: 'Harry Potter e o Prisioneiro de Azkaban',
    autor: 'J.K. Rowling',
    preco: 35,
    cor: '#1e3a5f',
    cor2: '#d4af37',
    raridade: 'comum'
  },
  hp_calice: {
    nome: 'Harry Potter e o Cálice de Fogo',
    autor: 'J.K. Rowling',
    preco: 40,
    cor: '#1a2456',
    cor2: '#e87a2a',
    raridade: 'comum'
  },
  pj_ladrao: {
    nome: 'Percy Jackson e o Ladrão de Raios',
    autor: 'Rick Riordan',
    preco: 30,
    cor: '#1e5a8a',
    cor2: '#d4af37',
    raridade: 'comum'
  },
  pj_mar: {
    nome: 'Percy Jackson e o Mar de Monstros',
    autor: 'Rick Riordan',
    preco: 35,
    cor: '#2d7a7a',
    cor2: '#d4af37',
    raridade: 'comum'
  },
  pj_tita: {
    nome: 'Percy Jackson e a Maldição do Titã',
    autor: 'Rick Riordan',
    preco: 35,
    cor: '#2d5016',
    cor2: '#d4af37',
    raridade: 'comum'
  },
  odpd_1: {
    nome: 'O Diário de uma Princesa Desastrada',
    autor: 'Maidy Lacerda',
    preco: 35,
    cor: '#f5b8d0',
    cor2: '#d4708a',
    raridade: 'comum'
  },
  odpd_2: {
    nome: 'O Diário de uma Princesa Desastrada 2',
    autor: 'Maidy Lacerda',
    preco: 35,
    cor: '#f0a0c0',
    cor2: '#c85a7a',
    raridade: 'comum'
  },
  odpd_3: {
    nome: 'O Diário de uma Princesa Desastrada 3',
    autor: 'Maidy Lacerda',
    preco: 38,
    cor: '#e888b0',
    cor2: '#b84060',
    raridade: 'comum'
  },
  odpd_4: {
    nome: 'O Diário de uma Princesa Desastrada 4',
    autor: 'Maidy Lacerda',
    preco: 40,
    cor: '#e070a0',
    cor2: '#a83050',
    raridade: 'comum'
  },
  scorpio_1: {
    nome: 'O Caderno de Maldades do Scorpio',
    autor: 'Maidy Lacerda',
    preco: 38,
    cor: '#3d1e5c',
    cor2: '#d4af37',
    raridade: 'comum'
  },
  scorpio_2: {
    nome: 'O Caderno de Maldades do Scorpio 2',
    autor: 'Maidy Lacerda',
    preco: 40,
    cor: '#2a0d3d',
    cor2: '#d4af37',
    raridade: 'comum'
  }
};
/* ============ CATÁLOGO DA BOUTIQUE ============ */
const BOUTIQUE = {
  cabeca: {
    '🌸': { nome: 'Flor',          preco: 10 },
    '🌺': { nome: 'Hibisco',       preco: 12 },
    '❄️': { nome: 'Floco de neve', preco: 10 },
    '🎀': { nome: 'Laço',          preco: 8  },
    '👒': { nome: 'Chapéu',        preco: 20 },
    '🧙': { nome: 'Chapéu de bruxa', preco: 25 },
    '🎃': { nome: 'Abóbora',       preco: 15 },
    '👻': { nome: 'Fantasma',      preco: 15 },
    '🦇': { nome: 'Morcego',       preco: 15 },
    '🎉': { nome: 'Chapéu de festa', preco: 20 },
    '🎈': { nome: 'Balão',         preco: 15 },
    '🎁': { nome: 'Presente',      preco: 18 }
  },
  oculos: {
    '🕶️': { nome: 'Óculos de sol',   preco: 25 },
    '👓': { nome: 'Óculos de grau', preco: 20 },
    '🥽': { nome: 'Óculos de natação', preco: 22 }
  },
  olhos: {
    '🍑': { nome: 'Pêssego rosado', preco: 30, cor: '#F4A99B' },
    '💜': { nome: 'Azul-lavanda',   preco: 30, cor: '#919CCB' },
    '🌊': { nome: 'Turquesa',       preco: 30, cor: '#70BEC6' },
    '🥛': { nome: 'Creme',          preco: 30, cor: '#E8E0C3' },
    '🌿': { nome: 'Verde-menta',    preco: 30, cor: '#93CBB7' }
  },
  fundo: {
    '🌌': { nome: 'Galáxia',           preco: 80, cor: '#1a0d2e' },
    '🌠': { nome: 'Nebulosa de Órion', preco: 80, cor: '#2a0a1a' },
    '🌉': { nome: 'Via Láctea',        preco: 80, cor: '#0a0a2e' }
  }
};
/* ============ 9. DOENÇA / XAROPE ============ */
function sickTick() {
  const n = Date.now();
  if (S.sick && S.sick <= n) {
    S.sick = 0;
    say('Passou! 😊'); set('happy', 2500);
  } else if (!S.sick && !gOn && Math.random() < .0006) {
    S.sick = n + 4 * 60000;
    say('Atchim! 🤧 🌡️ 37,8'); set('sick', 0);
  }
  const bx = $('bXarope');                    
  if (bx) bx.style.display = S.sick > n ? '' : 'none';
}

/* ============ FEDOR (quando limpeza baixa) ============ */
setInterval(() => {
  if (S.limpeza >= 30) return;
  if (gOn) return;
  if (Math.random() > .3) return;   // 30% de chance a cada 5s

  // Cria um "fedinho" 💨 que sobe e some
  const el = document.createElement('div');
  el.textContent = '💨';
  el.style.cssText = `
    position: fixed;
    left: ${innerWidth / 2 + (Math.random() * 200 - 100)}px;
    top: ${innerHeight / 2 + 100}px;
    font-size: 32px;
    z-index: 999;
    pointer-events: none;
    opacity: 0.8;
    transition: all 2.5s ease-out;
  `;
  document.body.appendChild(el);

  requestAnimationFrame(() => {
    el.style.top = (innerHeight / 2 - 50) + 'px';
    el.style.opacity = '0';
    el.style.fontSize = '50px';
  });

  setTimeout(() => el.remove(), 2600);
}, 5000);

/* Aviso de sujinha */
setInterval(() => {
  if (gOn) return;
  if (S.limpeza >= 30) return;
  if (Date.now() - lastAct < 30000) return;   // não fala se tá interagindo
  if (Math.random() > .15) return;

  if (S.limpeza < 15) {
    say('Tô precisando de banho... 🥺');
  } else {
    say('Acho que tô meio sujinha... 💨');
  }
}, 60000);
/* ============ 10. MINIGAMES ============ */
let gOn = 0, gx = .5;

function startGame() {
  P.classList.remove('on');
  const c = document.createElement('canvas');
  c.width = innerWidth; c.height = innerHeight;
  c.style.cssText = 'position:fixed;inset:0;z-index:8;background:#000d';
  document.body.appendChild(c);
  const x = c.getContext('2d');
  let fr = [], score = 0, t0 = Date.now(), last = t0;
  gOn = 1;
  c.onpointermove = e => gx = e.clientX / innerWidth;

  const iv = setInterval(() => {
    const n = Date.now(), dt = (n - last) / 1000; last = n;
    x.clearRect(0, 0, c.width, c.height);
    if (Math.random() < .05)
      fr.push({ x: Math.random(), y: 0, e: Math.random() < .06 ? '🍰' : rnd(['🍎', '🍓', '🍌']) });
    x.font = '34px serif'; x.textAlign = 'center';
    fr.forEach(f => { f.y += dt * (f.e === '🍰' ? 330 : 220); x.fillText(f.e, f.x * c.width, f.y); });
    const by = c.height - 90, bx = gx * c.width;
    x.fillText('🧺', bx, by + 20);
    fr = fr.filter(f => {
      if (f.y > by - 10 && f.y < by + 30 && Math.abs(f.x * c.width - bx) < 45) {
        score += f.e === '🍰' ? 5 : 1;
        if (f.e === '🍰') { say('Docinho! 🍰✨'); vib([40, 30, 80]); }
        return false;
      }
      return f.y < c.height;
    });
       x.font = '20px sans-serif'; x.fillStyle = '#fff';
    x.fillText('🍎 ' + score + '   ⏱ ' + Math.max(0, 40 - Math.round((n - t0) / 1000)), c.width / 2, 50);
    if (n - t0 > 40000)  {
      clearInterval(iv); c.remove(); gOn = 0;
      S.humor = clamp(S.humor + Math.min(25, score * 3 * pm('play')));
      S.energia = clamp(S.energia - 4);
      ganharMoedas(score);
      say('Fez ' + score + ' pontos! 🏆');
      if (score >= 10) startDance(7);
      else { set('happy', 3500); wig(); }
      save();
    }
  }, 33);
}

function startButterflies() {
  P.classList.remove('on');
  gOn = 1;
  const c = document.createElement('canvas');
  c.width = innerWidth; c.height = innerHeight;
  c.style.cssText = 'position:fixed;inset:0;z-index:8;background:#000a';
  document.body.appendChild(c);
  const x = c.getContext('2d');
  let bf = [], fx = [], score = 0, t0 = Date.now(), last = t0, sp = 0;

  c.onpointerdown = e => {
    const i = bf.findIndex(b => Math.hypot(b.x - e.clientX, b.y - e.clientY) < 55);
    if (i >= 0) { fx.push({ x: bf[i].x, y: bf[i].y, t: 0 }); bf.splice(i, 1); score++; vib(20); }
  };

  const iv = setInterval(() => {
    const n = Date.now(), dt = (n - last) / 1000; last = n; sp -= dt;
    if (sp <= 0 && bf.length < 6) {
      sp = .7 + Math.random() * .6;
      const ty = rnd(['lenta', 'rapida', 'zig', 'curva', 'breve']), L = Math.random() < .5;
      bf.push({
        x: L ? -20 : c.width + 20,
        y: 60 + Math.random() * (c.height - 200),
        vx: (L ? 1 : -1) * ({ lenta: 45, rapida: 130 }[ty] || 80),
        vy: 0, ty, t: 0, life: ty === 'breve' ? 2.6 : 99
      });
    }
    x.clearRect(0, 0, c.width, c.height);
    x.textAlign = 'center'; x.font = '42px serif';
    bf = bf.filter(b => {
      b.t += dt;
      if (b.ty === 'zig' && Math.random() < dt * 1.8) b.vy = (Math.random() - .5) * 160;
      if (b.ty === 'curva') b.vy = Math.sin(b.t * 3) * 90;
      b.x += b.vx * dt;
      b.y = Math.max(40, Math.min(c.height - 100, b.y + b.vy * dt));
      x.fillText('🦋', b.x, b.y);
      return b.t < b.life && b.x > -40 && b.x < c.width + 40;
    });
    fx = fx.filter(f => {
      f.t += dt;
      x.globalAlpha = Math.max(0, 1 - f.t * 2.5);
      x.fillText('✨', f.x, f.y - f.t * 40);
      x.globalAlpha = 1;
      return f.t < .4;
    });
    x.font = '20px sans-serif'; x.fillStyle = '#fff';
    x.fillText('🦋 ' + score + '   ⏱ ' + Math.max(0, 25 - Math.round((n - t0) / 1000)), c.width / 2, 50);
    if (n - t0 > 25000) {
      clearInterval(iv); c.remove(); gOn = 0;
      S.humor = clamp(S.humor + Math.min(25, score * 3 * pm('play')));
      S.energia = clamp(S.energia - 4);
            SOM.melodia([N.DO, N.MI, N.SOL, N.DO2], 0.1, 'sine', 0.1);
          ganharMoedas(score * 2);
            say('Capturou ' + score + ' 🦋✨');
      if (score >= 8) startDance(6); else set('happy', 3000);
      save();
    }
  }, 33);
}

function startBath() {
  P.classList.remove('on');
  gOn = 1;

  // 1. PRIMEIRO: escolher o sabonete
  escolherSabonete();
}

/* Tela de escolha do sabonete */
function escolherSabonete() {
  const c = document.createElement('canvas');
  c.width = innerWidth;
  c.height = innerHeight;
  c.style.cssText = 'position:fixed;inset:0;z-index:8;background:#f5e8f0';
  document.body.appendChild(c);
  const x = c.getContext('2d');

  const sabKeys = Object.keys(SABONETES);
  let posicoes = [];

  function desenhar() {
    // Usa o tamanho real da tela
    const L = c.width;
    const A = c.height;

    x.clearRect(0, 0, L, A);

    // Fundo xadrez
    x.fillStyle = '#f5e8f0';
    x.fillRect(0, 0, L, A);
    x.fillStyle = 'rgba(255, 255, 255, .4)';
    for (let i = 0; i < L; i += 40) {
      for (let j = 0; j < A; j += 40) {
        if ((i / 40 + j / 40) % 2 === 0) x.fillRect(i, j, 40, 40);
      }
    }

    // Título
    x.font = 'bold 24px sans-serif';
    x.fillStyle = '#5d4f9e';
    x.textAlign = 'center';
    x.textBaseline = 'top';
    x.fillText('🛁 Escolha o sabonete', L / 2, 50);
    x.font = '14px sans-serif';
    x.globalAlpha = .6;
    x.fillText('Qual vai usar hoje?', L / 2, 82);
    x.globalAlpha = 1;

    // Grade 2x2
    const cols = 2;
    const linhas = Math.ceil(sabKeys.length / cols);
    const raio = Math.min(L / 5, A / 8);       // raio da bolha
    const espacoX = L / cols;
    const espacoY = (A * 0.55) / linhas;        // ocupa 55% da altura
    const inicioY = A * 0.22;                   // começa em 22% da altura

    posicoes = [];

    sabKeys.forEach((k, i) => {
      const sab = SABONETES[k];
      const col = i % cols;
      const lin = Math.floor(i / cols);
      const cx = espacoX * (col + 0.5);
      const cy = inicioY + espacoY * (lin + 0.5);

      // Bolha do sabonete
      x.beginPath();
      x.arc(cx, cy, raio, 0, 7);
      x.fillStyle = sab.cor;
      x.fill();
      x.strokeStyle = '#5d4f9e';
      x.lineWidth = 3;
      x.stroke();

      // Brilho
      x.beginPath();
      x.arc(cx - raio * 0.3, cy - raio * 0.3, raio * 0.15, 0, 7);
      x.fillStyle = 'rgba(255,255,255,.7)';
      x.fill();

      // Emoji dentro
      x.font = `${raio * 1.1}px serif`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(sab.emoji, cx, cy);

      // Nome embaixo
      x.font = 'bold 15px sans-serif';
      x.fillStyle = '#5d4f9e';
      x.textBaseline = 'top';
      x.fillText(sab.nome, cx, cy + raio + 12);

      posicoes.push({ key: k, x: cx, y: cy, raio: raio * 1.2 });
    });

    // Cancelar
    x.font = '14px sans-serif';
    x.fillStyle = '#5d4f9e';
    x.globalAlpha = .5;
    x.textAlign = 'center';
    x.fillText('Toque fora pra cancelar', L / 2, A - 40);
    x.globalAlpha = 1;
  }

  desenhar();

  // Re-desenha se a tela girar
  const redesenhar = () => {
    c.width = innerWidth;
    c.height = innerHeight;
    desenhar();
  };
  addEventListener('resize', redesenhar);
  addEventListener('orientationchange', redesenhar);

  const clicar = e => {
    const cx = e.clientX;
    const cy = e.clientY;

    for (const p of posicoes) {
      const d = Math.hypot(cx - p.x, cy - p.y);
      if (d < p.raio) {
        SOM.melodia([N.DO, N.MI, N.SOL], 0.08, 'sine', 0.1);
        vib(20);
        c.removeEventListener('pointerdown', clicar);
        removeEventListener('resize', redesenhar);
        removeEventListener('orientationchange', redesenhar);
        c.remove();
        comecarBanho(p.key);
        return;
      }
    }

    // Cancelar
    c.removeEventListener('pointerdown', clicar);
    removeEventListener('resize', redesenhar);
    removeEventListener('orientationchange', redesenhar);
    c.remove();
    gOn = 0;
    SOM.melodia([N.DO_BAIXO], 0.1, 'sine', 0.08);
  };

  c.addEventListener('pointerdown', clicar);
}

/* Banho de verdade, com o sabonete escolhido */
function comecarBanho(sabKey) {
  const sab = SABONETES[sabKey];
  if (!sab) return;

  const c = document.createElement('canvas');
  c.width = innerWidth; c.height = innerHeight;
  c.style.cssText = 'position:fixed;inset:0;z-index:8';
  document.body.appendChild(c);
  const x = c.getContext('2d');

  // Barra embaixo com botão
  const bar = document.createElement('div');
  bar.style.cssText = 'position:fixed;z-index:9;left:0;right:0;bottom:24px;text-align:center';
  const b = document.createElement('button');
  b.style.cssText = 'background:#ffffff26;color:#fff;border:0;border-radius:22px;padding:12px 22px;font-size:17px';
  b.textContent = '🧼 Esfregar';
  bar.appendChild(b);
  document.body.append(c, bar);

  // Sabonete no canto (visual)
  const saboneteEl = document.createElement('div');
  saboneteEl.textContent = sab.emoji;
  saboneteEl.style.cssText = `
    position: fixed;
    bottom: 100px;
    left: 20px;
    font-size: 50px;
    z-index: 9;
    pointer-events: none;
    filter: drop-shadow(0 4px 8px rgba(93,79,158,.3));
    animation: flt 2s ease-in-out infinite;
  `;
  document.body.appendChild(saboneteEl);

  let step = 0, foam = [], down = 0;

  say(sab.fala, 3200);

  const draw = () => {
    x.clearRect(0, 0, c.width, c.height);
    foam.forEach(f => {
      x.beginPath();
      x.arc(f.x, f.y, f.r, 0, 7);
      x.fillStyle = sab.cor;
      x.fill();
      // Brilhinho na espuma
      x.beginPath();
      x.arc(f.x - f.r * 0.3, f.y - f.r * 0.3, f.r * 0.2, 0, 7);
      x.fillStyle = 'rgba(255,255,255,.6)';
      x.fill();
    });
  };

  b.onclick = () => {
    if (step === 0) {
      step = 1;
      b.style.display = 'none';
      say('Arraste o dedo para esfregar 🫧');
    } else if (step === 2) {
      step = 3;
      b.style.display = 'none';
      say('Agora enxágue arrastando 🚿');
    }
  };

  c.onpointerdown = () => down = 1;
  c.onpointerup = c.onpointercancel = () => down = 0;
  c.onpointermove = e => {
    if (!down || step < 1 || step === 2) return;
    const px = e.clientX, py = e.clientY;

    if (step === 1) {
      foam.push({
        x: px + Math.random() * 30 - 15,
        y: py + Math.random() * 30 - 15,
        r: 14 + Math.random() * 16
      });
      set('sleepy', 1500, foam.length === 1 ? sab.fala : '');
      if (foam.length >= 70) {
        step = 2;
        b.textContent = '🚿 Enxaguar';
        b.style.display = '';
      }
    } else if (step === 3) {
      foam = foam.filter(f => Math.hypot(f.x - px, f.y - py) > 55);
      if (!foam.length) {
        // Acabou!
        c.remove();
        bar.remove();
        saboneteEl.remove();
        gOn = 0;

          S.humor = clamp(S.humor + 8);
        S.saude = clamp(S.saude + 3);
        S.limpeza = clamp(S.limpeza + 100);   // limpa de vez!
        say('Limpinha com cheirinho de ' + sab.nome.toLowerCase() + '! ✨');
        ganharMoedas(5);
        startDance(6);
        setTimeout(() => set('carinho', 2500, '🥰'), 6200);
        save();
        return;
      }
    }
    draw();
  };
}

/* ============ JOGO DA NÉBULA (desvia dos bolos) ============ */
function startDino() {
  P.classList.remove('on');
  gOn = 1;

  const c = document.createElement('canvas');
  c.width = innerWidth; c.height = innerHeight;
  c.style.cssText = 'position:fixed;inset:0;z-index:8;background:#f5e8d0';
  document.body.appendChild(c);
  const x = c.getContext('2d');

  const chao = c.height - 100;

  // Nébula
  const nebo = {
    x: 80,
    y: chao,
    vy: 0,
    noChao: true
  };

  let bolos = [];
  let proxBolo = 0;

  let pontos = 0;
  let terminou = false;

  // Recorde (local por enquanto, depois vem do Firebase)
  let recordePontos = S.recordeDino || 0;
  let recordeNome = 'Você';

  // Busca o recorde global
  lerRecordeDino().then(rec => {
    if (rec && rec.pontos > recordePontos) {
      recordePontos = rec.pontos;
      recordeNome = rec.nome || 'Nebo';
    } else if (rec) {
      // Mesmo se o local for maior, mostra o global como referência
      recordeNome = rec.nome || 'Nebo';
    }
  });

  const pular = () => {
    if (nebo.noChao && !terminou) {
      nebo.vy = -22;
      nebo.noChao = false;
      SOM.nota(700, 0.08, 'sine', 0.1);
      vib(20);
    }
  };
  c.onpointerdown = pular;

  const iv = setInterval(() => {
    if (terminou) return;
    const n = Date.now();

    // Física
    nebo.vy += 1.5;
    nebo.y += nebo.vy;
    if (nebo.y >= chao) {
      nebo.y = chao;
      nebo.vy = 0;
      nebo.noChao = true;
    }

    // Cria bolo
    if (bolos.length === 0 && n > proxBolo) {
      bolos.push({ x: c.width + 40 });
      proxBolo = n + 1400;
    }

    // Velocidade
    const vel = 10;
    bolos = bolos.filter(k => {
      k.x -= vel;

      // Colisão
      const bateu =
        nebo.x + 30 > k.x &&
        nebo.x - 20 < k.x + 40 &&
        nebo.y + 20 > chao - 20;

      if (bateu) {
        terminou = true;
        clearInterval(iv);
        c.remove();
        gOn = 0;

        S.humor = clamp(S.humor - 3);

        // 🏆 Novo recorde LOCAL?
        let novoRecordeLocal = false;
        if (pontos > (S.recordeDino || 0)) {
          S.recordeDino = pontos;
          novoRecordeLocal = true;
        }

        if (pontos > 0) ganharMoedas(pontos);
        save();

                // 🌐 Recorde global (só grava se for maior que o global)
        const bateuGlobal = pontos > recordePontos;
        if (bateuGlobal) salvarRecordeDino(pontos, S.nome || 'Nebo', S.id || 'sem-id');

        if (bateuGlobal) {
          SOM.melodia([N.DO, N.MI, N.SOL, N.DO2], 0.12, 'sine', 0.14);
          say('🏆 NOVO RECORDE GLOBAL! ' + pontos + ' bolos!');
        } else if (novoRecordeLocal) {
          SOM.melodia([N.DO, N.MI, N.SOL], 0.12, 'sine', 0.12);
          say('🏅 Seu novo recorde: ' + pontos + ' bolos!');
        } else {
          SOM.melodia([N.DO_BAIXO, N.DO_BAIXO], 0.2, 'sawtooth', 0.1);
          say('Ai! Bati no bolo 😢');
        }
        return false;

      // Passou? Conta
      if (k.x < nebo.x - 40 && !k._contado) {
        k._contado = true;
        pontos += 1;
        SOM.nota(900, 0.06, 'sine', 0.08);
      }

      return k.x > -100;
    });

    // ---------- DESENHO ----------
    x.clearRect(0, 0, c.width, c.height);

    // Chão
    x.fillStyle = '#8b6b4a';
    x.fillRect(0, chao + 40, c.width, 20);
    x.fillStyle = '#c9a878';
    x.fillRect(0, chao + 40, c.width, 6);

    // Sol
    x.font = '40px serif';
    x.textAlign = 'right';
    x.fillText('☀️', c.width - 30, 70);

    // Nuvens
    x.textAlign = 'center';
    x.fillText('☁️', (n / 60) % (c.width + 100) - 50, 100);
    x.fillText('☁️', (n / 90) % (c.width + 100) - 50, 150);

    // Bolos
    x.font = '55px serif';
    bolos.forEach(k => {
      x.fillText('🍰', k.x + 25, chao + 30);
    });

    // Nébula (só os olhos)
    const ex = nebo.x;
    const ey = nebo.y - 35;

    x.fillStyle = '#f7d9e4';
    x.beginPath();
    x.ellipse(ex - 14, ey, 14, 16, 0, 0, 7);
    x.fill();
    x.beginPath();
    x.ellipse(ex + 14, ey, 14, 16, 0, 0, 7);
    x.fill();

    x.strokeStyle = '#5d4f9e';
    x.lineWidth = 3;
    x.beginPath();
    x.ellipse(ex - 14, ey, 14, 16, 0, 0, 7);
    x.stroke();
    x.beginPath();
    x.ellipse(ex + 14, ey, 14, 16, 0, 0, 7);
    x.stroke();

    x.fillStyle = '#fff';
    x.beginPath();
    x.arc(ex - 18, ey - 6, 3, 0, 7);
    x.fill();
    x.beginPath();
    x.arc(ex + 10, ey - 6, 3, 0, 7);
    x.fill();

    x.fillStyle = 'rgba(242, 157, 181, .5)';
    x.beginPath();
    x.ellipse(ex - 30, ey + 10, 7, 4, 0, 0, 7);
    x.fill();
    x.beginPath();
    x.ellipse(ex + 30, ey + 10, 7, 4, 0, 0, 7);
    x.fill();

    // ---------- HUD ----------
    x.textAlign = 'left';
    x.font = '22px sans-serif';
    x.fillStyle = '#5d4f9e';
    x.fillText('🍰 ' + pontos, 20, 40);

    // 🏆 Recorde global (com nome)
    x.textAlign = 'right';
    x.font = '14px sans-serif';
    x.fillStyle = '#5d4f9e';
    x.fillText('🏆 ' + recordeNome + ' — ' + recordePontos, c.width - 20, 40);

    // Aviso se tá batendo o recorde global
    if (pontos > recordePontos && recordePontos > 0) {
      x.fillStyle = '#2e6b52';
      x.fillText('🎉 batendo o recorde!', c.width - 20, 62);
    }
  }, 40);
}

/* --- Dança --- */
const STY = {
  festa:      ['🪩', 'hop .35s', 'top:-50%;left:50%;transform:translateX(-50%)', 'Festa! 🪩'],
  fofa:       ['🎀', 'sway 1.3s', 'top:-42%;right:6%', 'Dancinha fofa 🥰'],
  estrela:    ['🕶️', 'posea 1.8s', 'top:-2%;left:50%;transform:translateX(-50%);font-size:calc(var(--ew)*2)', 'Show! 😎'],
  chocalho:   ['🪇', 'shk .25s', 'top:25%;left:104%', 'Chocalho! 🎶'],
  maluquinha: ['🎉', 'crz 1.4s', 'top:-50%;left:50%;transform:translateX(-50%)', 'Maluquinha! 🤪'],
  calminha:   ['🌙', 'flt 3s', 'top:-45%;left:-4%', 'Calminha... 🌙']
};
const DW = {
  carinhosa:     { fofa: 5, calminha: 2 },
  tranquila:     { calminha: 6, fofa: 2 },
  brincalhona:   { maluquinha: 5, chocalho: 5, festa: 2 },
  temperamental: { estrela: 4, festa: 3 },
  reservada:     { calminha: 3, fofa: 2 }
};

function pickStyle() {
  const w = Object.assign({ festa: 1, fofa: 1, estrela: 1, chocalho: 1, maluquinha: 1, calminha: 1 }, DW[S.pers] || {});
  let pool = [];
  for (const k in w) for (let i = 0; i < w[k]; i++) pool.push(k);
  if (S.pers === 'curiosa') pool = pool.filter(k => k !== S.lastDance);
  const k = rnd(pool);
  S.lastDance = k;
  return k;
}

let dancing = 0;
function startDance(sec = 10) {
  if (dancing || gOn) return;
  dancing = 1;
  const k = pickStyle();
  const st = STY[k];
  const first = S.pers === 'reservada' ? STY.calminha : st;

  const apply = x => {
    eyes.style.transform = '';
    eyes.style.animation = x[1] + ' ease-in-out infinite';
    acc.textContent = x[0];
    acc.style.cssText = 'display:block;position:absolute;pointer-events:none;font-size:calc(var(--ew)*.55);font-style:normal;' + x[2];
  };

  set('dance', sec * 1000, st[3]);
  vib(Array(sec).fill(60).flatMap(v => [v, 140]));
  apply(first);
  if (first !== st) setTimeout(() => apply(st), 4000);

  setTimeout(() => {
    eyes.style.animation = '';
    acc.style.display = 'none';
    dancing = 0;
    S.humor = clamp(S.humor + 3);
    if (S.pers === 'temperamental') set('angry', 1500, 'Ta-dá! 😤');
    save();
  }, sec * 1000);
}

function joyTick() {
  // O código antigo de dançar quando está feliz...
  if (S.humor >= 99 && mood === 'neutral' && !gOn && Math.random() < .01) startDance(5);
  
  // 🧠 NOVO: Pensamentos próprios (como o Aibi)
  // Chance de 3% a cada 5 segundos de ter um pensamento (se ela não estiver ocupada)
  if (!gOn && !S.conectado && Math.random() < 0.03) {
    const pensamentos = [
      { texto: 'Será que as estrelas sentem frio? 🌌', exp: 'curious' },
      { texto: 'Eu queria comer um doce agora... 🍰', exp: 'sad' },
      { texto: 'Você tá aí? Tô entediada... 🥱', exp: 'bored' },
      { texto: 'Acho que ouvi um barulho! 👀', exp: 'surprised' },
      { texto: 'Cada vez que você respira, nasce uma estrela. ✨', exp: 'carinho' }
    ];
    
    // Escolhe um pensamento aleatório
    const p = rnd(pensamentos);
    set(p.exp, 5000, p.texto);
  }
}

/* ============ MUNDO (modo Nébula) ============ */
function mundo() {
  if (S.sick > Date.now()) { say('Tô gripada... 🤧'); return; }

  if (S.conectado) {
    panel(
      '<h3>✨ Nébula City</h3>' +
      `<p style="font-size:13px;opacity:.7;margin:0 0 12px">Conectada! Escolha onde ir:</p>` +
      '<button data-x="loja" style="font-size:16px;padding:14px">🛒 Mercado</button>' +
      '<button data-x="boutique" style="font-size:16px;padding:14px">👗 Boutique</button>' +
      '<button data-x="spa" style="font-size:16px;padding:14px">💆 Spa</button>' +
      '<button data-x="clinica" style="font-size:16px;padding:14px">🏥 Clínica</button>' +
      '<button data-x="biblioteca" style="font-size:16px;padding:14px">📚 Biblioteca</button>' +
      '<button data-x="jogos" style="font-size:16px;padding:14px">🎮 Jogos</button>' +
      '<button data-x="doceria" style="font-size:16px;padding:14px">🍰 Doceria</button>' +
      '<hr style="border-color:#ffffff20;margin:12px 0">' +
      '<button data-x="desconectar" style="font-size:14px;opacity:.7">🔌 Desconectar</button>'
    );
    return;
  }

  panel(
    '<h3>✨ Mundo</h3>' +
    '<p style="font-size:14px;opacity:.8;line-height:1.5">' +
      'Conecte-se à Nébula City para visitar lojas, spa e mais!' +
    '</p>' +
    '<button data-x="conectar" style="font-size:17px;padding:16px">🔗 Conectar Cidade</button>' +
    '<hr style="border-color:#ffffff20;margin:12px 0">' +
    '<button data-p="praca">🌳 Praça</button>' +
    '<button data-p="jardim">🌱 Jardim</button>' +
    `<div style="font-size:14px;opacity:.7;margin-top:8px">Descobertas: ${(S.mem || []).join(' ') || 'nada ainda'}</div>`
  );
}

function visit(p) {
  P.classList.remove('on');
  S.places = S.places || {};
  S.mem = (S.mem || []).slice(-11);
  if (!S.places[p]) { S.places[p] = 1; set('curious', 4500, 'Que lugar novo! 👀'); }
  else set('happy', 2000, 'Conheço aqui!');

  const it = Math.random() < (S.pers === 'curiosa' ? .4 : .2) ? '🎁' : rnd(['🌱', '🪨', '✨', '🛸']);

  setTimeout(() => {
    if (it === '🎁') {
      const g = rnd(['💎', '🧸', '🌟']);
      S.mem.push(g);
      S.humor = clamp(S.humor + 6);
      set('surprised', 1300, '!?');
      setTimeout(() => { say('Um presente! ' + g); startDance(6); }, 1400);
    } else {
      S.mem.push(it);
      say('Achei ' + it);
      if (Math.random() < .25) startDance(5);
    }
    save();
  }, 2500);
}

/* ============ 12. UI ============ */

function panel(h) {
  P.innerHTML = h + '<button data-x="close">Fechar</button>';
  P.classList.add('on');
}

/* ============ ESCOLHA DE MODO ============ */
function modoPanel() {
  P.innerHTML = `
    <h3>O que é este dispositivo?</h3>
    <p style="opacity:.7;font-size:14px;margin:8px 0 16px">
      Escolha uma vez. Depois só muda nas configurações.
    </p>
    <button data-modo="nebo" style="font-size:18px;padding:16px">
      💗 É uma Nébula
      <div style="font-size:12px;opacity:.7;margin-top:4px">
        Eu vou cuidar dela
      </div>
    </button>
    <button data-modo="cidade" style="font-size:18px;padding:16px">
      🏙️ É a Cidade
      <div style="font-size:12px;opacity:.7;margin-top:4px">
        Vai mostrar várias Nebos
      </div>
    </button>
  `;
  P.classList.add('on');

  setTimeout(() => {
    P.querySelectorAll('[data-modo]').forEach(b => {
      b.onclick = () => {
        S.modo = b.dataset.modo;
        save();
        P.classList.remove('on');
        iniciarModo();
      };
    });
  }, 100);
}

function iniciarModo() {
  if (S.modo === 'cidade') {
    document.body.classList.add('modo-cidade');
    abrirCidade();
  } else {
    document.body.classList.remove('modo-cidade');
    if (!S.nome) setTimeout(welcomePanel, 400);
    else if (!S.pers) setTimeout(persPanel, 800);
  }
}
/* ============ CIDADE ============ */
const CIDADE_PREDIOS = {
  // Fileira de cima (prédios altos)
  jogos:        { x: 7,  y: 15, w: 20, h: 30, nome: '🎮 Jogos Central', fala: 'Hora de brincar! 🎮' },
  biblioteca:   { x: 29, y: 15, w: 20, h: 30, nome: '📚 Biblioteca',    fala: 'Vou ler um livro! 📚' },
  boutique:     { x: 50, y: 15, w: 20, h: 30, nome: '👗 Boutique',      fala: 'Roupinhas! 👗' },
  mercado:      { x: 72, y: 15, w: 22, h: 30, nome: '🛒 Mercado',       fala: 'Vou comprar frutinhas! 🍎' },

  // Meio (parque, borboletas, área verde)
  borboletas:   { x: 13, y: 55, w: 20, h: 18, nome: '🦋 Espaço Borboletas', fala: 'Borboletas! 🦋' },
  parque:       { x: 36, y: 52, w: 26, h: 20, nome: '🌳 Parque',            fala: 'Vou passear! 🌳' },
  praca:        { x: 66, y: 55, w: 22, h: 18, nome: '🌿 Área Verde',        fala: 'Que calmo aqui...' },

  // Fileira de baixo (prédios pequenos)
  clinica:      { x: 13, y: 88, w: 15, h: 11, nome: '🏥 Clínica',       fala: 'Vou me cuidar! 🏥' },
  spa:          { x: 38, y: 88, w: 15, h: 11, nome: '💆 Spa',           fala: 'Aaah, que delícia! 🥒' },
  observatorio: { x: 59, y: 88, w: 15, h: 11, nome: '🔭 Observatório',  fala: 'Ver estrelas! 🔭' }
};
const NEBO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 340">
  <defs><radialGradient id="g-lavanda" gradientUnits="userSpaceOnUse" cx="200" cy="175" r="190"><stop offset="0" stop-color="#D8D2F2"/><stop offset=".55" stop-color="#D8D2F2"/><stop offset="1" stop-color="#9A8FD0"/></radialGradient></defs>
  <g fill="#5D4F9E" stroke="#5D4F9E" stroke-width="7" stroke-linejoin="round"><circle cx="150" cy="80" r="50"/><circle cx="230" cy="70" r="52"/><circle cx="300" cy="105" r="46"/><circle cx="345" cy="165" r="48"/><circle cx="335" cy="235" r="50"/><circle cx="270" cy="275" r="52"/><circle cx="190" cy="285" r="54"/><circle cx="110" cy="270" r="50"/><circle cx="65" cy="215" r="48"/><circle cx="60" cy="150" r="48"/><circle cx="95" cy="100" r="46"/><ellipse cx="200" cy="178" rx="140" ry="100"/></g>
  <g fill="url(#g-lavanda)"><circle cx="150" cy="80" r="50"/><circle cx="230" cy="70" r="52"/><circle cx="300" cy="105" r="46"/><circle cx="345" cy="165" r="48"/><circle cx="335" cy="235" r="50"/><circle cx="270" cy="275" r="52"/><circle cx="190" cy="285" r="54"/><circle cx="110" cy="270" r="50"/><circle cx="65" cy="215" r="48"/><circle cx="60" cy="150" r="48"/><circle cx="95" cy="100" r="46"/><ellipse cx="200" cy="178" rx="140" ry="100"/></g>
  <clipPath id="e1-lavanda"><ellipse cx="150" cy="190" rx="26" ry="34"/></clipPath>
  <ellipse cx="150" cy="190" rx="26" ry="34" fill="#fff" fill-opacity=".35"/>
  <g clip-path="url(#e1-lavanda)"><path d="M120 198 Q150 188 180 198 V230 H120Z" fill="#5D4F9E" fill-opacity=".38"/><path d="M120 198 Q150 188 180 198" fill="none" stroke="#5D4F9E" stroke-width="3"/><circle cx="142" cy="208" r="3.5" fill="#fff"/></g>
  <ellipse cx="150" cy="190" rx="26" ry="34" fill="none" stroke="#5D4F9E" stroke-width="3.5"/><circle cx="143" cy="173" r="2.5" fill="#fff"/><clipPath id="e2-lavanda"><ellipse cx="248" cy="180" rx="26" ry="34"/></clipPath>
  <ellipse cx="248" cy="180" rx="26" ry="34" fill="#fff" fill-opacity=".35"/>
  <g clip-path="url(#e2-lavanda)"><path d="M218 188 Q248 178 278 188 V220 H218Z" fill="#5D4F9E" fill-opacity=".38"/><path d="M218 188 Q248 178 278 188" fill="none" stroke="#5D4F9E" stroke-width="3"/><circle cx="240" cy="198" r="3.5" fill="#fff"/></g>
  <ellipse cx="248" cy="180" rx="26" ry="34" fill="none" stroke="#5D4F9E" stroke-width="3.5"/><circle cx="241" cy="163" r="2.5" fill="#fff"/>
  <ellipse cx="118" cy="230" rx="14" ry="8" fill="#F29DB5" fill-opacity=".4"/><ellipse cx="282" cy="222" rx="14" ry="8" fill="#F29DB5" fill-opacity=".4"/>
  <path d="M186 228 q7 9 14 0 q7 9 14 0" fill="none" stroke="#5D4F9E" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
/* ============ MOSTRAR NEBULAS NA CIDADE ============ */
async function mostrarNebulasNaCidade() {
  const lista = await lerNebulas();
  const container = document.getElementById('outrasNebos');
  if (!container) return;

  // Limpa tudo
  container.innerHTML = '';

  if (lista.length === 0) {
    container.innerHTML = '<p style="opacity:.5;font-size:13px;padding:10px">Nenhuma outra Nébula na sala ainda...</p>';
    return;
  }

  // Cabeçalho
  container.innerHTML = `<h4 style="margin:0 0 8px;font-size:13px">🌟 ${lista.length} Nébula(s) na sala</h4>`;

  // Cada Nébula vira um "card" clicável
  lista.forEach((n, i) => {
    const card = document.createElement('div');
    card.style.cssText = `
      background: #ffffff1a;
      padding: 8px;
      border-radius: 12px;
      margin: 6px 0;
      cursor: pointer;
      transition: background .2s;
    `;
    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px">
        <div style="width:30px;height:30px;flex-shrink:0">${NEBO_SVG}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${n.nome || 'Nebo'}</div>
          <div style="font-size:10px;opacity:.5">${n.id}</div>
        </div>
      </div>
      <div style="font-size:11px;margin-top:6px;display:flex;gap:6px;justify-content:space-around">
        <span>😊${Math.round(n.humor||0)}</span>
        <span>🍎${Math.round(n.fome||0)}</span>
        <span>🔋${Math.round(n.energia||0)}</span>
      </div>
    `;

    card.onmouseenter = () => card.style.background = '#ffffff33';
    card.onmouseleave = () => card.style.background = '#ffffff1a';

    card.onclick = () => {
      mostrarBalao(`${n.nome} diz oi! 👋`);
    };

    container.appendChild(card);
  });
}
function abrirCidade() {
  let cidade = document.getElementById('cidade');
  if (!cidade) {
    cidade = document.createElement('div');
        cidade.innerHTML = `
      <img id="cidadeMapa" src="cidade.jpeg" alt="Nébula City">
      <div id="cidadeNebo">${NEBO_SVG}</div>
      <div id="cidadeBalao"></div>
      <button id="cidadeVoltar">← Voltar</button>
      <div id="outrasNebos" style="
        position:absolute;top:60px;right:12px;
        max-width:200px;max-height:60vh;overflow:auto;
        background:#1b1824e6;border-radius:14px;padding:10px;
        font-size:13px;color:#fff;z-index:30;
      "></div>
    `;
    document.body.appendChild(cidade);

    for (const [id, p] of Object.entries(CIDADE_PREDIOS)) {
      const area = document.createElement('div');
      area.className = 'predio';
      area.dataset.p = id;
      area.style.cssText = `left:${p.x}%;top:${p.y}%;width:${p.w}%;height:${p.h}%`;
      cidade.appendChild(area);
    }

    cidade.querySelectorAll('.predio').forEach(el => {
      el.onclick = () => clicarPredio(el.dataset.p);
    });

    document.getElementById('cidadeVoltar').onclick = () => {
      cidade.classList.remove('on');
    };
  }

   cidade.classList.add('on');
  setTimeout(() => mostrarBalao('Onde vamos hoje? ✨'), 400);
  mostrarNebulasNaCidade();
  setInterval(mostrarNebulasNaCidade, 15000);   // ← atualiza a cada 15s
}

function mostrarBalao(texto) {
  const b = document.getElementById('cidadeBalao');
  if (!b) return;
  b.textContent = texto;
  b.classList.add('on');
  clearTimeout(window._balaoTimer);
  window._balaoTimer = setTimeout(() => b.classList.remove('on'), 2200);
}

function clicarPredio(id) {
  const p = CIDADE_PREDIOS[id];
  if (!p) return;
  mostrarBalao(p.fala);
  setTimeout(() => {
    // NÃO esconde a cidade. Só mostra o painel por cima.
    panel(`<h3>${p.nome}</h3><p style="opacity:.7">Em breve ✨</p>`);
  }, 1200);
}
/* ============ CONECTAR CIDADE ============ */
function painelConectar() {
  panel(
    '<h3>🔗 Conectar Cidade</h3>' +
    `<p style="font-size:14px;opacity:.8;line-height:1.5">
      O ID desta Nébula é:<br>
      <code style="background:#ffffff20;padding:6px 10px;border-radius:6px;font-size:14px;display:inline-block;margin-top:6px">${S.id || 'sem ID'}</code>
    </p>` +
    '<p style="font-size:14px;opacity:.8;line-height:1.5;margin-top:14px">' +
      'Cole o ID da Cidade pra conectar:' +
    '</p>' +
    '<input id="idCidade" type="text" placeholder="Ex: CITY-XXXX" maxlength="20" ' +
      'style="width:100%;padding:12px;border-radius:12px;border:0;font-size:15px;' +
      'background:#ffffff1a;color:#fff;box-sizing:border-box;margin:8px 0">' +
    '<button id="btnConectar">Conectar</button>' +
    '<p style="font-size:12px;opacity:.5;margin-top:12px">' +
      '🔜 Em breve: conexão real via internet!' +
    '</p>'
  );

  setTimeout(() => {
    const btn = document.getElementById('btnConectar');
    const inp = document.getElementById('idCidade');
    if (!btn) return;
    btn.onclick = () => {
      const id = (inp.value || '').trim().toUpperCase();
      if (!id) {
        inp.style.background = '#ff000044';
        return;
      }
      S.conectado = true;
S.cidadeId = id;
save();
say('Conectada! ✨');
salvarNoFirebase();   // ← ESSA LINHA NOVA!
P.classList.remove('on');
setTimeout(mundo, 400);
    };
  }, 100);
}
/* ============ PAINÉIS DOS LUGARES (placeholders) ============ */
/* ============ MERCADO ============ */
let carrinho = {};   // { '🍎': 2, '🍕': 1 }
let carrinhoLivros = {}; // { 'divinos_rivais': 2, 'hp_pedra': 1 }
/* ============ MÚSICA DO MERCADO ============ */
let musicaMercado = null;

function tocarMusicaMercado() {
  if (musicaMercado) return;   // já tá tocando
  
  // Melodia tipo supermercado (loop)
  const melodia = [
    N.DO, N.MI, N.SOL, N.MI,
    N.FA, N.LA, N.DO2, N.LA,
    N.SOL, N.SI, N.RE2 || N.RE, N.SI,
    N.DO, N.MI, N.SOL, N.DO
  ];
  
  let i = 0;
  musicaMercado = setInterval(() => {
    SOM.nota(melodia[i % melodia.length], 0.25, 'triangle', 0.04);
    i++;
  }, 350);
}

function pararMusicaMercado() {
  if (musicaMercado) {
    clearInterval(musicaMercado);
    musicaMercado = null;
  }
}

function painelLoja() {
  carrinho = {};
  tocarMusicaMercado();
  
  // Reset (ela parou de pedir)
  vezesPediuMercado = 0;
  
  renderMercado();
}
function renderMercado() {
    const secoes = {
    saudavel:    { emoji: '🥗', nome: 'Saudáveis' },
    industrial:  { emoji: '🍔', nome: 'Industrializados' },
    doce:        { emoji: '🍰', nome: 'Doces' },
  };

  // Monta HTML de cada seção
  let html = '<h3>🛒 Mercado</h3>';
  html += `<p style="font-size:13px;opacity:.7;margin:0 0 8px">Você tem: 🪙 ${S.moedas || 0}</p>`;

  for (const [tipo, info] of Object.entries(secoes)) {
    const comidas = Object.entries(CATALOGO).filter(([_, c]) => c.tipo === tipo);
    if (comidas.length === 0) continue;
    html += `<div style="margin:12px 0 6px;font-size:14px"><b>${info.emoji} ${info.nome}</b></div>`;
    html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">';
    comidas.forEach(([emoji, c]) => {
      const noCarrinho = carrinho[emoji] || 0;
      html += `
        <div class="item-mercado" data-add="${emoji}" style="
          background:#ffffff1a;border-radius:10px;padding:8px 4px;
          text-align:center;cursor:pointer;transition:background .2s;
          border:2px solid ${noCarrinho > 0 ? '#f7d9e4' : 'transparent'};
        ">
          <div style="font-size:24px">${emoji}</div>
          <div style="font-size:10px;opacity:.7">${c.preco}🪙</div>
          ${noCarrinho > 0 ? `<div style="font-size:10px;color:#f7d9e4;font-weight:bold">x${noCarrinho}</div>` : ''}
                </div>
      `;
    });
    html += '</div>';
  }

  // Total do carrinho
  let total = 0;
  let itensCarrinho = '';
  const itens = Object.entries(carrinho).filter(([_, q]) => q > 0);
  if (itens.length > 0) {
      itens.forEach(([emoji, q]) => {
      const item = CATALOGO[emoji];
      const preco = (item?.preco || 0) * q;
      total += preco;
      itensCarrinho += `${emoji}x${q} `;
    });
  }

  html += `<hr style="border-color:#ffffff20;margin:12px 0">`;
  html += `<div style="font-size:14px;margin:8px 0">
    🛒 Carrinho: ${itensCarrinho || '<span style="opacity:.5">vazio</span>'}
  </div>`;
  html += `<div style="font-size:16px;font-weight:bold;margin:8px 0">
    Total: 🪙 ${total}
  </div>`;

  // Botões
  if (itens.length > 0) {
    html += `<button id="btnPagar" style="font-size:16px;padding:14px;background:#f7d9e4;color:#1b1824">✓ Pagar ${total}🪙</button>`;
  }

   const scrollAnt = P.scrollTop;
  panel(html);
  P.scrollTop = scrollAnt;

  // Handlers
  setTimeout(() => {
    // Clique nas comidas
    document.querySelectorAll('[data-add]').forEach(el => {
      el.onclick = () => {
        const emoji = el.dataset.add;
        carrinho[emoji] = (carrinho[emoji] || 0) + 1;
        SOM.nota(700 + Math.random() * 200, 0.05, 'sine', 0.08);
        renderMercado();
      };
    });

    // Pagar
    const btnPagar = document.getElementById('btnPagar');
    if (btnPagar) {
      btnPagar.onclick = () => {
               const total = Object.entries(carrinho).reduce((soma, [emoji, q]) => {
          const item = CATALOGO[emoji];
          return soma + (item?.preco || 0) * q;
        }, 0);
        
        if ((S.moedas || 0) < total) {
          say('Não tenho moedas suficientes... 😢');
          return;
        }

        // Debita
        S.moedas -= total;

        // Adiciona ao estoque (só comida — ingrediente agora é na Doceria)
if (!S.estoque) S.estoque = {};
Object.entries(carrinho).forEach(([emoji, q]) => {
  S.estoque[emoji] = (S.estoque[emoji] || 0) + q;
});
        SOM.melodia([N.DO, N.MI, N.SOL, N.DO2], 0.08, 'sine', 0.1);
        say('Comprei tudinho! 🛒✨');
        
                // Para a música
        pararMusicaMercado();

        // Fecha e volta
        P.classList.remove('on');
        carrinho = {};
        
        // Volta pro Mundo depois de 1s
        setTimeout(() => {
          if (S.conectado) mundo();
        }, 1000);
      };
    }
  }, 100);
}
/* ============ PAINEL DO SPA ============ */
function painelSpa() {
  const CUSTO = 10;
  
  if ((S.moedas || 0) < CUSTO) {
    panel(
      '<h3>💆 Spa</h3>' +
      `<p style="opacity:.8;margin:12px 0">
        Pra relaxar no Spa, preciso de <b>🪙 ${CUSTO} moedas</b>.
      </p>` +
      `<p style="opacity:.6;font-size:13px">
        Você tem: 🪙 ${S.moedas || 0}<br>
        Faça um minigame pra ganhar mais!
      </p>`
    );
    return;
  }
  
  panel(
    '<h3>💆 Spa</h3>' +
    `<p style="opacity:.8;margin:12px 0">
      Relaxar no Spa custa <b>🪙 ${CUSTO} moedas</b>.
    </p>` +
    `<p style="opacity:.6;font-size:13px;margin-bottom:16px">
      Você tem: 🪙 ${S.moedas || 0}
    </p>` +
    '<button id="btnFazerSpa" style="font-size:16px;padding:14px">💆 Relaxar agora</button>'
  );
  
  setTimeout(() => {
    const btn = document.getElementById('btnFazerSpa');
    if (!btn) return;
    btn.onclick = fazerSpa;
  }, 100);
}

function fazerSpa() {
  const CUSTO = 10;
  S.moedas = (S.moedas || 0) - CUSTO;
  save();
  P.classList.remove('on');
  abrirTelaSpa();
}

/* ============ SPA ============ */
function abrirTelaSpa() {
  const tela = document.createElement('div');
  tela.id = 'telaSpa';
  tela.style.cssText = `
    position: fixed;
    inset: 0;
    background: linear-gradient(180deg, #d8b8e0 0%, #a88fc8 100%);
    z-index: 100;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #fff;
    animation: fadeIn .4s;
    overflow: hidden;
  `;
  
  tela.innerHTML = `
    <h1 style="font-size:24px;margin:0 0 4px">💆 Spa</h1>
    <p style="opacity:.8;margin:0 0 20px;font-size:14px">Relaxando...</p>
    
    <div style="position:relative;width:240px;height:240px;margin:10px 0">
      <svg viewBox="0 0 240 240" style="width:100%;height:100%;overflow:visible">
        
        <!-- Toalha enrolada na cabeça -->
        <path d="M50 80 Q120 30 190 80 L190 95 Q120 55 50 95 Z" fill="#fff" opacity=".9"/>
        <circle cx="120" cy="60" r="14" fill="#fff" opacity=".9"/>
        <ellipse cx="120" cy="60" rx="14" ry="6" fill="#e8d5e8" opacity=".5"/>
        
        <!-- Corpo da nuvem -->
        <ellipse cx="120" cy="140" rx="85" ry="65" fill="#f7d9e4"/>
        <circle cx="75" cy="105" r="38" fill="#f7d9e4"/>
        <circle cx="165" cy="105" r="38" fill="#f7d9e4"/>
        
        <!-- Máscara de pepino (olhos) -->
        <ellipse cx="88" cy="120" rx="20" ry="13" fill="#7bc47f"/>
        <ellipse cx="152" cy="120" rx="20" ry="13" fill="#7bc47f"/>
        <ellipse cx="88" cy="117" rx="16" ry="9" fill="#a8dba8" opacity=".6"/>
        <ellipse cx="152" cy="117" rx="16" ry="9" fill="#a8dba8" opacity=".6"/>
        <!-- Brilho do pepino -->
        <circle cx="82" cy="115" r="2" fill="#fff" opacity=".7"/>
        <circle cx="146" cy="115" r="2" fill="#fff" opacity=".7"/>
        
        <!-- Bochechas rosas -->
        <ellipse cx="55" cy="150" rx="14" ry="8" fill="#f29db5" opacity=".6"/>
        <ellipse cx="185" cy="150" rx="14" ry="8" fill="#f29db5" opacity=".6"/>
        
        <!-- Boquinha relaxada -->
        <path d="M105 155 q15 12 30 0" stroke="#5d4f9e" stroke-width="3" fill="none" stroke-linecap="round"/>
        
        <!-- Unha sendo pintada (animação) -->
        <g id="unha">
          <!-- Mãozinha / unha -->
          <ellipse cx="200" cy="180" rx="10" ry="14" fill="#f7d9e4" stroke="#5d4f9e" stroke-width="2"/>
          <!-- Esmalte sendo aplicado -->
          <ellipse cx="200" cy="180" rx="7" ry="10" fill="#f29db5" opacity=".8">
            <animate attributeName="ry" values="2;10;10" dur="3s" repeatCount="indefinite"/>
          </ellipse>
          <!-- Pincel -->
          <line x1="200" y1="155" x2="200" y2="170" stroke="#8b6b4a" stroke-width="3" stroke-linecap="round"/>
          <rect x="197" y="145" width="6" height="12" fill="#d4a574" rx="2"/>
          <ellipse cx="200" cy="145" rx="3" ry="6" fill="#f29db5"/>
        </g>
        
        <!-- Brilhinhos -->
        <text x="40" y="60" font-size="20" opacity=".8" class="sparkle">✨</text>
        <text x="190" y="70" font-size="16" opacity=".8" class="sparkle">✨</text>
        <text x="60" y="210" font-size="16" opacity=".8" class="sparkle">✨</text>
        <text x="180" y="215" font-size="20" opacity=".8" class="sparkle">✨</text>
      </svg>
    </div>
    
    <p id="spaTexto" style="font-size:17px;margin-top:20px;min-height:24px">Aaah... que delícia 🥒</p>
    
    <!-- Barra de progresso -->
    <div style="width:200px;height:6px;background:#ffffff33;border-radius:6px;margin-top:16px;overflow:hidden">
      <div id="spaProgresso" style="height:100%;width:0%;background:#fff;border-radius:6px;transition:width 1s linear"></div>
    </div>
    
    <p style="opacity:.6;font-size:12px;margin-top:12px">Relaxando por 8 segundos...</p>
  `;
  
  document.body.appendChild(tela);
  
  // Som relaxante (harpa suave, repetido)
  SOM.melodia([N.SOL, N.MI, N.DO, N.MI], 0.5, 'sine', 0.06);
  setTimeout(() => SOM.melodia([N.FA, N.LA, N.DO2, N.LA], 0.5, 'sine', 0.06), 2000);
  setTimeout(() => SOM.melodia([N.SOL, N.MI, N.DO, N.MI], 0.5, 'sine', 0.06), 4000);
  setTimeout(() => SOM.melodia([N.DO, N.MI, N.SOL, N.DO2], 0.5, 'sine', 0.08), 6000);
  
  // Falas que trocam a cada 2 segundos
  const falas = [
    'Aaah... que delícia 😊',
    'Tô relaxando... 😌',
    'Que paz... ✨',
    'Pintando a unha 💅',
    'Ficou linda! 💗'
  ];
  
  const texto = document.getElementById('spaTexto');
  const progresso = document.getElementById('spaProgresso');
  let passo = 0;
  const TOTAL = 8000;
  const PASSO_TEMPO = 1600;
  
  const interval = setInterval(() => {
    passo++;
    if (passo < falas.length) {
      texto.textContent = falas[passo];
    }
    progresso.style.width = Math.min(100, (passo * PASSO_TEMPO / TOTAL) * 100) + '%';
  }, PASSO_TEMPO);
  
  // Depois de 8 segundos, termina
  setTimeout(() => {
    clearInterval(interval);
    progresso.style.width = '100%';
    
    // Aplica benefícios
    S.saude = clamp(S.saude + 15);
    S.humor = clamp(S.humor + 10);
    S.energia = clamp(S.energia + 5);
    save();
    
    // Tela final
    tela.innerHTML = `
      <div style="font-size:80px;animation:bounceIn .6s">✨</div>
      <h1 style="font-size:32px;margin:16px 0 8px">Tô renovada!</h1>
      <p style="font-size:15px;opacity:.9">
        ❤️ +15 · 😊 +10 · 🔋 +5
      </p>
      <p style="font-size:13px;opacity:.7;margin-top:12px">Unhas lindas 💅</p>
    `;
    
    SOM.melodia([N.DO, N.MI, N.SOL, N.DO2], 0.15, 'sine', 0.12);
    
    setTimeout(() => {
      tela.style.animation = 'fadeOut .5s forwards';
      setTimeout(() => {
        tela.remove();
        say('Tô renovada! 💅✨');
      }, 500);
    }, 2500);
  }, TOTAL);
}
function painelClinica()   { panel('<h3>🏥 Clínica</h3><p style="opacity:.7">Em breve! Vou me cuidar aqui. 💊</p>'); }
function painelBiblioteca(){ panel('<h3>📚 Biblioteca</h3><p style="opacity:.7">Em breve! Vou ler livros aqui. 📖</p>'); }
function painelJogos() {
  P.classList.remove('on');
  
  // Pega o status de conexão atual
  const conectado = S.conectado || false;

  panel(
    '<h3>🎮 Central de Jogos</h3>' +
    '<p style="font-size:13px;opacity:.7;margin:0 0 12px">Aqui você pode brincar e conectar com outras Nebos!</p>' +
    
    '<button data-g="f">🍎 Cesta de Frutas</button>' +
    '<button data-g="b">🦋 Borboletas</button>' +
    '<button data-g="d">🦖 Dino</button>' +
    '<button data-x="dance">💃 Dançar</button>' +
    '<hr style="border-color:#ffffff20;margin:12px 0">' +
    
    // O Botão Mágico de Amigar
    `<button id="btnAmigar" style="background: ${conectado ? '#ffb3b3' : '#b8dfd0'}; color: #1b1824; font-weight:bold;">
      ${conectado ? '🔌 Desconectar da Sala' : '🤝 Amigar (Conectar na Sala)'}
    </button>` +
    '<div id="listaAmigos" style="margin-top:12px; font-size:13px; color:#b8dfd0;"></div>'
  );

  setTimeout(() => {
    const btn = document.getElementById('btnAmigar');
    if (btn) {
      btn.onclick = () => {
        if (S.conectado) {
          sairDaSala();
        } else {
          entrarNaSala();
        }
      };
    }
  }, 100);
}
/* ============ FUNÇÕES AUXILIARES DA DOCERIA ============ */

/* Coloca conteúdo na bancada da Doceria */
function docMostrarConteudo(html) {
  const area = document.getElementById('doc-bancada-conteudo');
  if (area) area.innerHTML = html;
}

/* Limpa a bancada */
function docLimparConteudo() {
  const area = document.getElementById('doc-bancada-conteudo');
  if (area) area.innerHTML = '';
}

/* ============ LIVRO DE RECEITAS ============ */

/* Abre o Livro de Receitas na bancada */
function abrirLivroReceitas() {
  docMostrarConteudo(`
    <div id="livro-header">
      <h2>📖 Livro de Receitas</h2>
      <p>Escolha uma receita pra fazer</p>
    </div>
    <div id="livro-lista"></div>
  `);
  renderLivroReceitas();
}

/* Desenha a lista de receitas */
function renderLivroReceitas() {
  const lista = document.getElementById('livro-lista');
  if (!lista) return;

  let html = '';

  for (const [id, r] of Object.entries(RECEITAS)) {
    const check = verificarIngredientes(r);

    html += `
      <div class="livro-receita" data-receita="${id}">
        <div class="livro-receita-emoji">${r.emoji}</div>
        <div class="livro-receita-info">
          <div class="livro-receita-nome">${r.nome}</div>
          <div class="livro-receita-status ${check.temTudo ? 'ok' : 'falta'}">
            ${check.temTudo ? '✅ Pronto pra fazer' : '❌ Faltam ingredientes'}
          </div>
        </div>
      </div>
    `;
  }

  lista.innerHTML = html;

  // Handlers
  setTimeout(() => {
    document.querySelectorAll('.livro-receita').forEach(el => {
      el.onclick = () => clicarReceita(el.dataset.receita);
    });
  }, 50);
}

/* Verifica se tem os ingredientes da receita */
function verificarIngredientes(receita) {
  const falta = [];
  for (const [chave, qtd] of Object.entries(receita.ingredientes)) {
    const tem = S.ingredientes?.[chave] || 0;
    if (tem < qtd) {
      falta.push({
        chave,
        nome: INGREDIENTES[chave]?.nome || chave,
        emoji: INGREDIENTES[chave]?.emoji || '?',
        tem,
        precisa: qtd
      });
    }
  }
  return { temTudo: falta.length === 0, falta };
}

/* Quando clica numa receita */
function clicarReceita(id) {
  const r = RECEITAS[id];
  if (!r) return;

  const check = verificarIngredientes(r);

  if (!check.temTudo) {
    // Mostra o que falta
    let htmlFalta = '<div id="receita-detalhe">';
    htmlFalta += `<h2>${r.emoji} ${r.nome}</h2>`;
    htmlFalta += '<p class="receita-sub">Faltam esses ingredientes:</p>';
    htmlFalta += '<div class="receita-falta-lista">';

    check.falta.forEach(f => {
      htmlFalta += `
        <div class="receita-falta-item">
          <span class="receita-falta-emoji">${f.emoji}</span>
          <span class="receita-falta-nome">${f.nome}</span>
          <span class="receita-falta-qtd">${f.tem}/${f.precisa}</span>
        </div>
      `;
    });

    htmlFalta += '</div>';
    htmlFalta += '<button id="btnVoltarLivro" class="doc-btn-acao doc-btn-cinza">← Voltar</button>';
    htmlFalta += '<button id="btnComprarIng" class="doc-btn-acao doc-btn-verde">🫙 Comprar Ingredientes</button>';
    htmlFalta += '</div>';

    docMostrarConteudo(htmlFalta);

    setTimeout(() => {
      document.getElementById('btnVoltarLivro').onclick = abrirLivroReceitas;
      document.getElementById('btnComprarIng').onclick = abrirIngredientesDoceria;
    }, 50);
    return;
  }

  // Tem tudo! Mostra detalhe pra começar
  let htmlOk = '<div id="receita-detalhe">';
  htmlOk += `<h2>${r.emoji} ${r.nome}</h2>`;
  htmlOk += '<p class="receita-sub">Ingredientes:</p>';
  htmlOk += '<div class="receita-ing-lista">';

  for (const [chave, qtd] of Object.entries(r.ingredientes)) {
    const ing = INGREDIENTES[chave];
    htmlOk += `
      <div class="receita-ing-item">
        <span>${ing.emoji}</span>
        <span>${ing.nome}</span>
        <span class="receita-ing-qtd">x${qtd}</span>
      </div>
    `;
  }

  htmlOk += '</div>';
  htmlOk += '<button id="btnVoltarLivro" class="doc-btn-acao doc-btn-cinza">← Voltar</button>';
  htmlOk += '<button id="btnComecar" class="doc-btn-acao doc-btn-roxo">👩‍🍳 Começar a fazer</button>';
  htmlOk += '</div>';

  docMostrarConteudo(htmlOk);

   setTimeout(() => {
    document.getElementById('btnVoltarLivro').onclick = abrirLivroReceitas;
    document.getElementById('btnComecar').onclick = () => {
      iniciarPreparo(id);
    };
  }, 50);
}

/* ============ TELA DE PREPARO (passo a passo) ============ */

let preparoAtual = null;   // guarda { id, passo }

function iniciarPreparo(id) {
  const r = RECEITAS[id];
  if (!r) return;

  preparoAtual = { id, passo: 0 };
  renderPreparo();
}

function renderPreparo() {
  if (!preparoAtual) return;
  const r = RECEITAS[preparoAtual.id];
  const passo = r.passos[preparoAtual.passo];
  const total = r.passos.length;
  const num = preparoAtual.passo + 1;

  // Barra de progresso
  let bolinhas = '';
  for (let i = 0; i < total; i++) {
    bolinhas += `<span class="prep-bola ${i < num ? 'ok' : ''}"></span>`;
  }

  docMostrarConteudo(`
    <div id="prep-tela">
      <div id="prep-topo">
        <h2>${r.emoji} ${r.nome}</h2>
        <p>Passo ${num} de ${total}</p>
      </div>

      <div id="prep-bolinhas">${bolinhas}</div>

      <div id="prep-texto">${passo.texto}</div>

      <button id="prep-acao" class="prep-acao">
        ${passo.acao}
      </button>

      <button id="prep-cancelar" class="doc-btn-acao doc-btn-cinza">Cancelar</button>
    </div>
  `);

  setTimeout(() => {
    document.getElementById('prep-acao').onclick = avancarPreparo;
    document.getElementById('prep-cancelar').onclick = () => {
      preparoAtual = null;
      abrirLivroReceitas();
    };
  }, 50);
}

function avancarPreparo() {
  if (!preparoAtual) return;
  const r = RECEITAS[preparoAtual.id];
  const passo = r.passos[preparoAtual.passo];

  const btn = document.getElementById('prep-acao');
  if (btn) {
    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    // 1. Emoji voa do botão
    voarEmoji(passo.acao, cx, cy);

    // 2. Botão encolhe e some
    btn.style.transform = 'scale(.6)';
    btn.style.opacity = '.4';

    // 3. Brilhos saindo
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const dx = Math.cos(ang) * 60;
      const dy = Math.sin(ang) * 60;
      criarBrilho(cx, cy, dx, dy);
    }
  }

  // Som fofo
  SOM.melodia([N.DO + Math.random() * 150, N.MI + Math.random() * 150], 0.08, 'sine', 0.1);
  vib(30);

  preparoAtual.passo++;

  // Terminou?
  if (preparoAtual.passo >= r.passos.length) {
    setTimeout(() => {
      iniciarForno(preparoAtual.id);
      preparoAtual = null;
    }, 500);
    return;
  }

  // Próximo passo
  setTimeout(renderPreparo, 450);
}

/* Emoji voa do botão até a bancada */
function voarEmoji(emoji, x, y) {
  const el = document.createElement('div');
  el.textContent = emoji;
  el.style.cssText = `
    position: fixed;
    left: ${x}px; top: ${y}px;
    font-size: 60px;
    z-index: 9999;
    pointer-events: none;
    transform: translate(-50%, -50%);
    transition: all .5s cubic-bezier(.3, 1.4, .5, 1);
    filter: drop-shadow(0 4px 8px rgba(93,79,158,.4));
  `;
  document.body.appendChild(el);

  // Voa pra cima
  requestAnimationFrame(() => {
    el.style.left = x + 'px';
    el.style.top = (y - 150) + 'px';
    el.style.transform = 'translate(-50%, -50%) scale(1.4) rotate(15deg)';
  });

  // Cai pra bancada
  setTimeout(() => {
    el.style.top = (innerHeight - 100) + 'px';
    el.style.transform = 'translate(-50%, -50%) scale(.5) rotate(-15deg)';
    el.style.opacity = '0';
  }, 300);

  setTimeout(() => el.remove(), 900);
}

/* Brilhinho saindo do botão */
function criarBrilho(x, y, dx, dy) {
  const el = document.createElement('div');
  el.textContent = '✨';
  el.style.cssText = `
    position: fixed;
    left: ${x}px; top: ${y}px;
    font-size: 18px;
    z-index: 9998;
    pointer-events: none;
    transform: translate(-50%, -50%);
    transition: all .5s ease-out;
    opacity: 1;
  `;
  document.body.appendChild(el);

  requestAnimationFrame(() => {
    el.style.left = (x + dx) + 'px';
    el.style.top = (y + dy) + 'px';
    el.style.opacity = '0';
    el.style.fontSize = '10px';
  });

  setTimeout(() => el.remove(), 600);
}
/* ============ FORNO (minigame) ============ */
function iniciarForno(id) {
  const r = RECEITAS[id];
  if (!r) return;

  // Gasta ingredientes AGORA (eles foram usados)
  for (const [chave, qtd] of Object.entries(r.ingredientes)) {
    S.ingredientes[chave] = (S.ingredientes[chave] || 0) - qtd;
    if (S.ingredientes[chave] <= 0) delete S.ingredientes[chave];
  }
  save();

  // Tela do forno com barra
  docMostrarConteudo(`
    <div id="forno-tela">
      <div id="forno-emoji">${r.emoji}</div>
      <h2>Assando...</h2>
      <p>Tira do forno na hora certa!</p>

      <div id="forno-barra-wrap">
        <div id="forno-barra">
          <div id="forno-barra-preenche"></div>
          <div id="forno-zona-boa"></div>
        </div>
      </div>

      <button id="btnTirarForno" class="doc-btn-acao doc-btn-roxo">
        🔥 Tirar do forno
      </button>
    </div>
  `);

  setTimeout(() => {
    rodarMinigameForno(id);
  }, 50);
}

function rodarMinigameForno(id) {
  const r = RECEITAS[id];
  if (!r) return;

  const barra = document.getElementById('forno-barra-preenche');
  const zona = document.getElementById('forno-zona-boa');
  const btn = document.getElementById('btnTirarForno');
  if (!barra || !btn) return;

  // Define a zona boa (60% a 85% da barra)
  const ZONA_INICIO = 60;
  const ZONA_FIM = 85;
  zona.style.left = ZONA_INICIO + '%';
  zona.style.width = (ZONA_FIM - ZONA_INICIO) + '%';

  let progresso = 0;
  let terminou = false;

  // Velocidade: receita mais longa = barra mais lenta
  // Normaliza pra todas levarem ~3 a 5 segundos
  const duracao = 3000 + (r.tempo / 1000) * 300;   // ms
  const passo = 100 / (duracao / 50);              // % por frame

  const iv = setInterval(() => {
    if (terminou) return;
    progresso += passo;
    if (progresso > 100) progresso = 100;
    barra.style.width = progresso + '%';

    // Passou da zona boa → queimou
    if (progresso >= 100) {
      clearInterval(iv);
      terminou = true;
      setTimeout(() => finalizarDoce(id, 'queimou'), 200);
    }
  }, 50);

  btn.onclick = () => {
    if (terminou) return;
    terminou = true;
    clearInterval(iv);

    // Efeito visual
    btn.style.transform = 'scale(.9)';
    setTimeout(() => btn.style.transform = '', 150);

    // Avalia o resultado
    if (progresso < ZONA_INICIO) {
      finalizarDoce(id, 'cru');
    } else if (progresso > ZONA_FIM) {
      finalizarDoce(id, 'queimou');
    } else {
      finalizarDoce(id, 'perfeito');
    }
  };
}

function finalizarDoce(id, resultado) {
  const r = RECEITAS[id];
  if (!r) return;

  // ---------- PERFEITO ----------
  if (resultado === 'perfeito') {
    // Salva o doce no estoque com prefixo caseiro_
    if (!S.estoque) S.estoque = {};
    const chaveCaseiro = 'caseiro_' + r.emoji;
    S.estoque[chaveCaseiro] = (S.estoque[chaveCaseiro] || 0) + 1;
    save();

    docMostrarConteudo(`
      <div id="forno-tela">
        <div id="forno-emoji" class="pulse">${r.emoji}</div>
        <h2>Ficou pronto! ✨</h2>
        <p>${r.nome} perfeito</p>
        <p style="font-size:12px;opacity:.6;margin-top:8px">Foi pro estoque — come quando quiser 💗</p>
        <button id="btnVoltarLivro" class="doc-btn-acao doc-btn-roxo">📖 Voltar ao Livro</button>
      </div>
    `);

    SOM.melodia([N.DO, N.MI, N.SOL, N.DO2], 0.1, 'sine', 0.12);

    setTimeout(() => {
      document.getElementById('btnVoltarLivro').onclick = abrirLivroReceitas;
    }, 50);
    return;
  }

  // ---------- CRU ----------
  if (resultado === 'cru') {
    S.humor = clamp(S.humor - 2);
    save();

    docMostrarConteudo(`
      <div id="forno-tela">
        <div id="forno-emoji">🥣</div>
        <h2>Tá cru... 😖</h2>
        <p>Tirou do forno cedo demais</p>
        <button id="btnVoltarForno" class="doc-btn-acao doc-btn-cinza">← Voltar</button>
      </div>
    `);

    SOM.melodia([N.DO_BAIXO, N.DO_BAIXO], 0.2, 'sawtooth', 0.1);

    setTimeout(() => {
      document.getElementById('btnVoltarForno').onclick = abrirLivroReceitas;
    }, 50);
    return;
  }

  // ---------- QUEIMOU ----------
  S.humor = clamp(S.humor - 4);
  save();

  docMostrarConteudo(`
    <div id="forno-tela">
      <div id="forno-emoji" class="queimado">💨</div>
      <h2>Queimou! 🔥</h2>
      <p>Passou do ponto...</p>
      <button id="btnVoltarForno" class="doc-btn-acao doc-btn-cinza">← Voltar</button>
    </div>
  `);

  SOM.melodia([N.DO_BAIXO, N.DO_BAIXO, N.DO_BAIXO], 0.15, 'sawtooth', 0.12);

    setTimeout(() => {
    document.getElementById('btnVoltarForno').onclick = abrirLivroReceitas;
  }, 50);
}

/* ============ COMPRAR INGREDIENTES ============ */
function abrirIngredientesDoceria() {
  docMostrarConteudo(`
    <div id="ing-header">
      <h2>🫙 Ingredientes</h2>
      <p id="ing-moedas">Você tem: 🪙 ${S.moedas || 0}</p>
    </div>
    <div id="ing-lista"></div>
    <button id="btnVoltarLivro" class="doc-btn-acao doc-btn-cinza">← Voltar</button>
  `);
  renderIngredientes();
  setTimeout(() => {
    document.getElementById('btnVoltarLivro').onclick = abrirLivroReceitas;
  }, 50);
}

function renderIngredientes() {
  const lista = document.getElementById('ing-lista');
  if (!lista) return;

  let html = '';

  for (const [chave, ing] of Object.entries(INGREDIENTES)) {
    const qtd = S.ingredientes?.[chave] || 0;
    const podeComprar = (S.moedas || 0) >= ing.preco;

    html += `
      <div class="ing-item ${podeComprar ? '' : 'ing-sem-moeda'}" data-ing="${chave}">
        <div class="ing-emoji">${ing.emoji}</div>
        <div class="ing-info">
          <div class="ing-nome">${ing.nome}</div>
          <div class="ing-preco">🪙 ${ing.preco}</div>
        </div>
        <div class="ing-qtd">${qtd > 0 ? 'x' + qtd : ''}</div>
      </div>
    `;
  }

  lista.innerHTML = html;

  // Handlers
  setTimeout(() => {
    document.querySelectorAll('.ing-item').forEach(el => {
      el.onclick = () => comprarIngrediente(el.dataset.ing);
    });
  }, 50);
}

function comprarIngrediente(chave) {
  const ing = INGREDIENTES[chave];
  if (!ing) return;

  if ((S.moedas || 0) < ing.preco) {
    say('Não tenho moedas suficientes... 😢');
    SOM.melodia([N.DO_BAIXO, N.DO_BAIXO], 0.1, 'sawtooth', 0.1);
    return;
  }

  // Debita e adiciona
  S.moedas -= ing.preco;
  if (!S.ingredientes) S.ingredientes = {};
  S.ingredientes[chave] = (S.ingredientes[chave] || 0) + 1;

  save();
  SOM.melodia([N.DO, N.MI, N.SOL], 0.08, 'sine', 0.1);

  // Atualiza a tela sem fechar
  const moedasEl = document.getElementById('ing-moedas');
  if (moedasEl) moedasEl.textContent = `Você tem: 🪙 ${S.moedas || 0}`;
  renderIngredientes();
}
/* ============ DOCERIA (nova) ============ */
function abrirDoceria() {
  // Fecha qualquer painel aberto
  P.classList.remove('on');

  // Remove a Doceria antiga se existir
  let doceria = document.getElementById('doceria');
  if (doceria) doceria.remove();

  // Cria a tela
  doceria = document.createElement('div');
  doceria.id = 'doceria';
  doceria.innerHTML = `
    <!-- Topo: botões -->
    <div id="doc-topo">
      <button id="doc-sair" class="doc-btn-topo">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
        <span>Sair</span>
      </button>

      <div id="doc-botoes-direita">
        <button id="doc-livro" class="doc-btn-topo doc-btn-roxo">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 4h7a3 3 0 0 1 3 3v14a2 2 0 0 0-2-2H2z"/>
            <path d="M22 4h-7a3 3 0 0 0-3 3v14a2 2 0 0 1 2-2h8z"/>
          </svg>
          <span>Livro de Receitas</span>
        </button>
        <button id="doc-ingredientes" class="doc-btn-topo doc-btn-verde">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 2h8"/>
            <path d="M9 2v3"/>
            <path d="M15 2v3"/>
            <path d="M5 5h14a1 1 0 0 1 1 1v13a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6a1 1 0 0 1 1-1z"/>
            <path d="M4 10h16"/>
          </svg>
          <span>Ingredientes</span>
        </button>
      </div>
    </div>

    <!-- Cozinha (visual) -->
    <div id="doc-cozinha">
      <!-- Parede de azulejo -->
      <div id="doc-parede"></div>

      <!-- Prateleira com potes -->
      <div id="doc-prateleira">
        <div class="doc-pote" style="background:#f5c7d6"></div>
        <div class="doc-pote" style="background:#b8dfd0"></div>
        <div class="doc-pote" style="background:#d8c4ec"></div>
      </div>

      <!-- Quadro do café -->
      <div id="doc-quadro">☕</div>

      <!-- Geladeira lilás -->
      <div id="doc-geladeira">
        <div class="doc-geladeira-linha"></div>
        <div class="doc-geladeira-linha"></div>
      </div>

      <!-- Fogão -->
      <div id="doc-fogao">
        <div class="doc-fogao-topo">
          <div class="doc-boca"></div>
          <div class="doc-boca"></div>
        </div>
        <div class="doc-fogao-porta"></div>
      </div>

      <!-- Coifa -->
      <div id="doc-coifa"></div>

      <!-- Luminária -->
      <div id="doc-luminaria">
        <div class="doc-luz"></div>
      </div>
    </div>

    <!-- Bancada da frente (onde as coisas acontecem) -->
    <div id="doc-bancada">
      <div id="doc-toalha"></div>
      <div id="doc-bancada-conteudo"></div>
    </div>

    <!-- Tapete -->
    <div id="doc-tapete"></div>
  `;
  document.body.appendChild(doceria);

  // Handlers
  document.getElementById('doc-sair').onclick = () => {
    doceria.remove();
  };

  document.getElementById('doc-livro').onclick = () => {
    abrirLivroReceitas();
  };

    document.getElementById('doc-ingredientes').onclick = () => {
    abrirIngredientesDoceria();
  };
}


/* ============ DESENHAR A ESTANTE (espaços + livros) ============ */
const ESTANTE_LUGARES = 24;  // 4 prateleiras × 6 espaços

function desenharEstante(bib) {
  const fileiras = bib.querySelectorAll('.bib-fileira');
  if (!fileiras.length) return;

  // Pega o que tá salvo (Etapa 4 vai salvar; por enquanto inicia vazio)
  const comprados = S.livrosComprados || [];
  const estante = S.estante || {};   // { "0": "divinos_rivais", "1": "hp_pedra", ... }

  // Livros que estão na estante (por índice)
  const livrosNaEstante = new Set(Object.values(estante));

  // Livros comprados que AINDA NÃO estão na estante (pro fantasminha)
  const disponiveis = comprados.filter(id => !livrosNaEstante.has(id));
  const temDisponiveis = disponiveis.length > 0;

  // Distribui 6 espaços por fileira
  fileiras.forEach((fileira, fi) => {
    fileira.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const idx = fi * 6 + i;
      const livroId = estante[String(idx)];

      if (livroId && LIVROS[livroId]) {
        // Tem livro aqui → desenha o livro detalhado
        const el = criarLivroNaEstante(livroId, idx);
        fileira.appendChild(el);
      } else {
        // Espaço vazio → slot clicável
        const slot = document.createElement('div');
        slot.className = 'bib-slot' + (temDisponiveis ? ' tem-livro' : '');
        slot.dataset.idx = idx;
        slot.onclick = () => abrirEscolhaLivro(idx);
        fileira.appendChild(slot);
      }
    }
  });
}

/* Cria o elemento visual do livro (com lombada, título, autor) */
function criarLivroNaEstante(livroId, idx) {
  const L = LIVROS[livroId];
  const el = document.createElement('div');
  el.className = 'bib-livro raridade-' + (L.raridade || 'comum');
  el.dataset.idx = idx;
  el.dataset.livro = livroId;
  el.style.background = `linear-gradient(135deg,
    ${L.cor} 0%,
    ${ajustarCor(L.cor, -20)} 60%,
    ${L.cor} 100%)`;
  el.style.setProperty('--bib-cor2', L.cor2 || '#d4af37');

  // Texto (título + autor)
  const txt = document.createElement('div');
  txt.className = 'bib-livro-txt';
  txt.textContent = L.nome;
  el.appendChild(txt);

  const autor = document.createElement('div');
  autor.className = 'bib-livro-autor';
  autor.textContent = L.autor;
  el.appendChild(autor);

  el.onclick = (e) => {
    e.stopPropagation();
    abrirMenuLivro(livroId, idx);
  };

  return el;
}

/* Escurece/clareia uma cor hex */
function ajustarCor(hex, delta) {
  const h = hex.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(h.slice(0, 2), 16) + delta));
  const g = Math.max(0, Math.min(255, parseInt(h.slice(2, 4), 16) + delta));
  const b = Math.max(0, Math.min(255, parseInt(h.slice(4, 6), 16) + delta));
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

/* ---------- ESCOLHER LIVRO PRA COLOCAR NO SLOT ---------- */
function abrirEscolhaLivro(idx) {
  // Fecha se já tiver aberto
  const old = document.getElementById('bib-escolha');
  if (old) old.remove();

  const comprados = S.livrosComprados || [];
  const estante = S.estante || {};
  const naEstante = new Set(Object.values(estante));
  const disponiveis = comprados.filter(id => !naEstante.has(id));

  const modal = document.createElement('div');
  modal.id = 'bib-escolha';

  let html = `
    <div id="bib-escolha-card">
      <h3>📚 Colocar livro</h3>
      <p>Escolha um livro pra colocar aqui</p>
  `;

  if (disponiveis.length === 0) {
    html += `
      <div class="bib-escolha-vazio">
        Você ainda não tem livros<br>fora da estante! 🛍️<br><br>
        Compre novos na <b>Loja</b>.
      </div>
    `;
  } else {
    disponiveis.forEach(id => {
      const L = LIVROS[id];
      if (!L) return;
      html += `
        <div class="bib-escolha-item" data-id="${id}">
          <div class="bib-escolha-mini" style="background:linear-gradient(135deg, ${L.cor} 0%, ${ajustarCor(L.cor, -20)} 100%);"></div>
          <div class="bib-escolha-info">
            <div class="bib-escolha-nome">${L.nome}</div>
            <div class="bib-escolha-autor">${L.autor}</div>
          </div>
        </div>
      `;
    });
  }

  html += `
      <button id="bib-escolha-cancelar">Cancelar</button>
    </div>
  `;
  modal.innerHTML = html;
  document.body.appendChild(modal);

  // Handlers
  modal.querySelectorAll('.bib-escolha-item').forEach(el => {
    el.onclick = () => {
      const livroId = el.dataset.id;
      if (!S.estante) S.estante = {};
      S.estante[String(idx)] = livroId;
      save();
      SOM.melodia([N.DO, N.MI, N.SOL], 0.08, 'sine', 0.1);
      modal.remove();
      // Redesenha a estante
      const bib = document.getElementById('biblioteca');
      if (bib) desenharEstante(bib);
    };
  });

  document.getElementById('bib-escolha-cancelar').onclick = () => modal.remove();
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

/* ---------- MENU DO LIVRO (tirar da estante) ---------- */
function abrirMenuLivro(livroId, idx) {
  const old = document.getElementById('bib-menu');
  if (old) old.remove();

  const L = LIVROS[livroId];
  if (!L) return;

  const modal = document.createElement('div');
  modal.id = 'bib-menu';
   // Descobre o estado atual do livro (lembra se já leu)
  S.livrosLidos = S.livrosLidos || {};
  const info = S.livrosLidos[livroId];   // { gostou: true/false, ultimaLeitura: timestamp }
  const agora = Date.now();
  const cooldownMs = BIB_CONFIG.cooldownMin * 60 * 1000;
  const podeLer = !info || (agora - info.ultimaLeitura >= cooldownMs);

  // Status do livro pra mostrar no menu
  let statusTxt = '';
  if (!info) {
    statusTxt = '<p style="font-size:11px;opacity:.5;margin:4px 0 14px;">📖 Ainda não leu</p>';
  } else if (!podeLer) {
    const faltaMin = Math.ceil((cooldownMs - (agora - info.ultimaLeitura)) / 60000);
    statusTxt = `<p style="font-size:11px;opacity:.5;margin:4px 0 14px;">⏳ Pode reler em ${faltaMin} min</p>`;
  } else {
    statusTxt = `<p style="font-size:11px;opacity:.5;margin:4px 0 14px;">${info.gostou ? '💗 Ela gostou' : '😕 Ela não gostou'}</p>`;
  }

  modal.innerHTML = `
    <div id="bib-menu-card">
      <h3>${L.nome}</h3>
      <p>${L.autor}</p>
      ${statusTxt}
      <button id="bib-menu-ler" style="background:#d8c4ec;color:#5d4f9e;">📖 Ler</button>
      <button id="bib-menu-tirar" style="background:#f5c8c8;color:#8b3a3a;">🗑️ Tirar da estante</button>
      <button id="bib-menu-cancelar" style="background:#e8e0e8;color:#5d4f9e;">Cancelar</button>
    </div>
  `;
  document.body.appendChild(modal);

  
  // ---------- LER LIVRO ----------
  document.getElementById('bib-menu-ler').onclick = () => {
    modal.remove();
    lerLivro(livroId);
  };

  document.getElementById('bib-menu-tirar').onclick = () => {
    if (!S.estante) S.estante = {};
    delete S.estante[String(idx)];
    save();
    SOM.melodia([N.DO_BAIXO, N.DO_BAIXO], 0.1, 'sine', 0.1);
    modal.remove();
    const bib = document.getElementById('biblioteca');
    if (bib) desenharEstante(bib);
  };

  document.getElementById('bib-menu-cancelar').onclick = () => modal.remove();
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}


/* ============ LER LIVRO ============ */
function lerLivro(livroId) {
  const L = LIVROS[livroId];
  if (!L) return;

  S.livrosLidos = S.livrosLidos || {};
  const info = S.livrosLidos[livroId];
  const agora = Date.now();
  const cooldownMs = BIB_CONFIG.cooldownMin * 60 * 1000;

  // ---------- COOLDOWN ----------
  if (info && (agora - info.ultimaLeitura < cooldownMs)) {
    say(rnd(BIB_CONFIG.falaAindaNao), 3000);
    set('sleepy', 2500);
    SOM.melodia([N.DO_BAIXO, N.DO_BAIXO], 0.1, 'sine', 0.08);
    return;
  }

  // ---------- JÁ LEU ANTES ----------
  if (info) {
    const falas = info.gostou ? BIB_CONFIG.falaJaLeuGostou : BIB_CONFIG.falaJaLeuNaoGostou;
    say(rnd(falas), 3500);
    set(info.gostou ? 'carinho' : 'sad', 2800);

    // Aplica efeito de novo (mas menor)
    if (info.gostou) {
      S.humor = clamp(S.humor + Math.round(BIB_CONFIG.humorGostou * 0.5));
      ganharMoedas(Math.round(BIB_CONFIG.moedasGostou * 0.5));
    } else {
      S.humor = clamp(S.humor + Math.round(BIB_CONFIG.humorNaoGostou * 0.5));
    }
    info.ultimaLeitura = agora;
    save();
    return;
  }

  // ---------- PRIMEIRA VEZ LENDO ----------
  const gostou = Math.random() * 100 < BIB_CONFIG.chanceGostar;
  S.livrosLidos[livroId] = {
    gostou: gostou,
    ultimaLeitura: agora
  };

  // Animação de leitura (olhinhos se movem devagar)
  set('curious', 3500, '📖 ...');

  // Aplica efeito
  if (gostou) {
    S.humor = clamp(S.humor + BIB_CONFIG.humorGostou);
    ganharMoedas(BIB_CONFIG.moedasGostou);
    SOM.melodia([N.DO, N.MI, N.SOL, N.DO2], 0.12, 'sine', 0.12);
    vib([30, 40, 30]);

    // Fala depois de um tempo (ela "leu")
    setTimeout(() => {
      say(rnd(BIB_CONFIG.falaGostou), 3500);
      set('carinho', 3000);
      setTimeout(() => heart(innerWidth / 2, innerHeight / 2), 200);
    }, 3600);
  } else {
    S.humor = clamp(S.humor + BIB_CONFIG.humorNaoGostou);
    SOM.melodia([N.DO_BAIXO, N.DO_BAIXO], 0.15, 'sawtooth', 0.1);

    setTimeout(() => {
      say(rnd(BIB_CONFIG.falaNaoGostou), 3500);
      set('sad', 3000);
    }, 3600);
  }

  save();
}

/* ============ LOJA DE LIVROS ============ */
function abrirLojaLivros() {
  // Fecha se já tá aberta
  const old = document.getElementById('bib-loja-painel');
  if (old) old.remove();

  const painel = document.createElement('div');
  painel.id = 'bib-loja-painel';
  document.body.appendChild(painel);

  renderizarLojaLivros();
}

function renderizarLojaLivros() {
  const painel = document.getElementById('bib-loja-painel');
  if (!painel) return;
  const scrollAnt = document.getElementById('bib-loja-lista')?.scrollTop || 0;

  const comprados = S.livrosComprados || [];
  const total = Object.keys(LIVROS).length;
  const temTodos = comprados.length >= total;

  let html = `
    <div id="bib-loja-card">
      <div id="bib-loja-topo">
        <h2>🛍️ Loja de Livros</h2>
        <div id="bib-loja-moedas">🪙 ${S.moedas || 0}</div>
      </div>

      <div id="bib-loja-lista">
  `;

  const ordenados = Object.entries(LIVROS).sort((a, b) => a[1].nome.localeCompare(b[1].nome, 'pt-BR'));

  ordenados.forEach(([id, L]) => {
    const jaTem = comprados.includes(id);
    const noCarrinho = carrinhoLivros[id] || 0;
    const podeComprar = (S.moedas || 0) >= L.preco;
    
    let classes = ['bib-loja-item'];
    if (jaTem) classes.push('comprado');
    else if (!podeComprar) classes.push('sem-moedas');
    if (noCarrinho > 0) classes.push('no-carrinho'); // Nova classe visual

    html += `
      <div class="${classes.join(' ')}" data-id="${id}">
        <div class="bib-loja-capa" style="background:linear-gradient(135deg, ${L.cor} 0%, ${ajustarCor(L.cor, -25)} 60%, ${L.cor} 100%); --bib-cor2:${L.cor2 || '#d4af37'};"></div>
        <div class="bib-loja-info">
          <div class="bib-loja-nome">${L.nome}</div>
          <div class="bib-loja-autor">${L.autor}</div>
          ${jaTem 
            ? `<div class="bib-loja-preco comprado">✓ COMPRADO</div>` 
            : `<div class="bib-loja-preco">🪙 ${L.preco} ${noCarrinho > 0 ? `<span style="color:#f7d9e4">(x${noCarrinho})</span>` : ''}</div>`
          }
        </div>
      </div>
    `;
  });

  // Calcula o total do carrinho
  let totalCarrinho = 0;
  Object.entries(carrinhoLivros).forEach(([id, q]) => {
    if (LIVROS[id]) totalCarrinho += LIVROS[id].preco * q;
  });

  html += `</div>`;

  // Área do carrinho (só aparece se tiver algo)
  if (totalCarrinho > 0) {
    html += `
      <div id="bib-loja-carrinho">
        <div>🛒 Carrinho: 🪙 ${totalCarrinho}</div>
        <button id="bib-btn-pagar" class="bib-btn-pagar">Pagar</button>
      </div>
    `;
  }

  html += `
      <div id="bib-loja-rodape">
        <div id="bib-loja-progresso">
          📚 ${comprados.length} / ${total} livros na coleção
          ${temTodos ? ' — COMPLETA! 🎉' : ''}
        </div>
        <button id="bib-loja-fechar">Fechar</button>
      </div>
    </div>
  `;

  painel.innerHTML = html;
    const listaEl = document.getElementById('bib-loja-lista');
  if (listaEl) listaEl.scrollTop = scrollAnt;

  // Handlers (sem setTimeout: o HTML já está no DOM)
  painel.querySelectorAll('.bib-loja-item').forEach(el => {
    el.onclick = () => {
      const id = el.dataset.id;
      if ((S.livrosComprados || []).includes(id)) return;
      // clicar de novo tira do carrinho (livro só existe 1x)
      if (carrinhoLivros[id]) delete carrinhoLivros[id];
      else carrinhoLivros[id] = 1;
      SOM.nota(700 + Math.random() * 200, 0.05, 'sine', 0.08);
      renderizarLojaLivros();
    };
  });

  const btnPagar = document.getElementById('bib-btn-pagar');
  if (btnPagar) {
    btnPagar.onclick = () => {
      const comprados = S.livrosComprados || [];
      const ids = Object.keys(carrinhoLivros).filter(id => LIVROS[id] && !comprados.includes(id));
      if (!ids.length) return;

      const total = ids.reduce((soma, id) => soma + LIVROS[id].preco, 0);
      if ((S.moedas || 0) < total) {
        SOM.melodia([N.DO_BAIXO, N.DO_BAIXO], 0.1, 'sawtooth', 0.12);
        toastCompra('Moedas insuficientes! 😢');
        return;
      }

      S.moedas -= total;
      ids.forEach(id => comprados.push(id));
      S.livrosComprados = comprados;
      save();

      SOM.melodia([N.DO, N.MI, N.SOL, N.DO2], 0.08, 'sine', 0.12);
      toastCompra('📚 Livros comprados!');
      carrinhoLivros = {};
      renderizarLojaLivros();
      const bib = document.getElementById('biblioteca');
      if (bib) desenharEstante(bib);
    };
  }

  const btnFechar = document.getElementById('bib-loja-fechar');
  if (btnFechar) btnFechar.onclick = () => {
    carrinhoLivros = {};
    painel.remove();
    const bib = document.getElementById('biblioteca');
    if (bib) desenharEstante(bib);
  };
  
/* ---------- COMPRAR LIVRO ---------- */
function comprarLivro(id) {
  const L = LIVROS[id];
  if (!L) return;

  const comprados = S.livrosComprados || [];

  // Já tem?
  if (comprados.includes(id)) {
    SOM.melodia([N.DO_BAIXO, N.DO_BAIXO], 0.1, 'sine', 0.1);
    toastCompra('Você já tem esse livro! 📚');
    return;
  }

  // Sem moedas?
  if ((S.moedas || 0) < L.preco) {
    SOM.melodia([N.DO_BAIXO, N.DO_BAIXO], 0.1, 'sawtooth', 0.12);
    toastCompra('Moedas insuficientes... 😢');
    return;
  }

  // Compra!
  S.moedas -= L.preco;
  comprados.push(id);
  S.livrosComprados = comprados;
  save();

  // Som + vibração
  SOM.melodia([N.DO, N.MI, N.SOL, N.DO2], 0.08, 'sine', 0.12);
  vib([30, 40, 30]);
  toastCompra(`📚 ${L.nome} comprado!`);

  // Redesenha a loja (atualiza os contadores)
  renderizarLojaLivros();

  // Atualiza a estante de fundo também (fantasminha)
  const bib = document.getElementById('biblioteca');
  if (bib) desenharEstante(bib);
}

/* ---------- TOAST DE COMPRA ---------- */
function toastCompra(txt) {
  const el = document.createElement('div');
  el.className = 'bib-toast-compra';
  el.textContent = txt;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1600);
}

/* ============ BIBLIOTECA (etapa 1: só a tela) ============ */
function abrirBiblioteca() {
  // Fecha painel se estiver aberto
  P.classList.remove('on');

  // Remove versão antiga se existir
  let bib = document.getElementById('biblioteca');
  if (bib) bib.remove();

  // Cria a tela
  bib = document.createElement('div');
  bib.id = 'biblioteca';
  bib.innerHTML = `
    <!-- TOPO -->
    <div id="bib-topo">
      <button id="bib-sair" class="bib-btn-topo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 18l-6-6 6-6"/>
          <path d="M21 12H9"/>
        </svg>
        <span>Sair</span>
      </button>

      <button id="bib-loja" class="bib-btn-topo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
        <span>Loja</span>
      </button>
    </div>

    <!-- PAREDE -->
    <div id="bib-parede"></div>

    <!-- JANELA -->
    <div id="bib-janela"></div>

    <!-- QUADROS -->
    <div class="bib-quadro q1">🌙</div>
    <div class="bib-quadro q2">🌸</div>

        <!-- ESTANTE -->
    <div id="bib-estante">
      <div id="bib-estante-fundo"></div>
      <div class="bib-fileira f1"></div>
      <div class="bib-fileira f2"></div>
      <div class="bib-fileira f3"></div>
      <div class="bib-fileira f4"></div>
      <div class="bib-prateleira p1"></div>
      <div class="bib-prateleira p2"></div>
      <div class="bib-prateleira p3"></div>
      <div class="bib-prateleira p4"></div>
      <div id="bib-base"></div>
    </div>

    <!-- CHÃO -->
    <div id="bib-chao"></div>

    <!-- TAPETE -->
    <div id="bib-tapete"></div>

    <!-- PLANTA -->
    <div id="bib-planta"></div>
  `;
  document.body.appendChild(bib);

  // Handlers dos botões
  document.getElementById('bib-sair').onclick = () => {
    bib.remove();
  };

  
  // Desenha as fileiras de espaços/livros
  desenharEstante(bib);

    document.getElementById('bib-loja').onclick = () => {
    abrirLojaLivros();
  };
}

/* ============ HANDLER GLOBAL DE CLIQUES ============ */
P.onclick = e => {
  const b = e.target.closest('button');
  if (!b) return;
  const d = b.dataset;

  // Fechar
  if (d.x === 'close') { P.classList.remove('on'); pararMusicaMercado(); }

  // Conectar / Desconectar
  else if (d.x === 'conectar') { P.classList.remove('on'); painelConectar(); }
   else if (d.x === 'desconectar') {
    S.conectado = false;
    S.cidadeId = null;
    save();
    sairDoFirebase();
    say('Desconectei...');
    P.classList.remove('on');
  }

  // Lugares da cidade
  else if (d.x === 'loja')        { P.classList.remove('on'); painelLoja(); }
  else if (d.x === 'spa')         { P.classList.remove('on'); painelSpa(); }
  else if (d.x === 'clinica')     { P.classList.remove('on'); painelClinica(); }
  else if (d.x === 'biblioteca')  { P.classList.remove('on'); abrirBiblioteca(); }
  else if (d.x === 'jogos')       { P.classList.remove('on'); painelJogos(); }
  else if (d.x === 'doceria')     { P.classList.remove('on'); abrirDoceria(); }
  else if (d.x === 'boutique')    { P.classList.remove('on'); painelBoutique(); }

  // Coisas antigas
  else if (d.x === 'food') foodTray();
  else if (d.x === 'bath') startBath();
  else if (d.x === 'xarope') xarope();
  else if (d.f) eat(d.f);
  else if (d.p) visit(d.p);
  else if (d.pers) choose(d.pers);
    else if (d.g === 'f') startGame();
  else if (d.g === 'b') startButterflies();
  else if (d.g === 'd') startDino();
  else if (d.x === 'dance') { P.classList.remove('on'); startDance(10); }
};
/* ============ BOUTIQUE ============ */
let abaAtual = 'cabeca';

function painelBoutique() {
  renderBoutique();
}

function renderBoutique() {
  const abas = {
    cabeca: { emoji: '🌸', nome: 'Cabeça' },
    oculos: { emoji: '🕶️', nome: 'Óculos' },
    olhos:  { emoji: '🎨', nome: 'Olhos'  },
    fundo:  { emoji: '🌌', nome: 'Fundos' }
  };

  // Botões das abas
  let html = '<h3>👗 Boutique</h3>';
  html += `<p style="font-size:13px;opacity:.7;margin:0 0 8px">Você tem: 🪙 ${S.moedas || 0}</p>`;

  // Abas
  html += '<div style="display:flex;gap:6px;margin:12px 0">';
  for (const [id, info] of Object.entries(abas)) {
    const ativo = abaAtual === id;
    html += `<button data-aba="${id}" style="
      flex:1;padding:10px 4px;font-size:12px;
      background:${ativo ? '#f7d9e4' : '#ffffff1a'};
      color:${ativo ? '#1b1824' : '#fff'};
      border:0;border-radius:10px;cursor:pointer;
    ">${info.emoji}<br>${info.nome}</button>`;
  }
  html += '</div>';

  // Itens da aba atual
  const itens = BOUTIQUE[abaAtual] || {};
  const comprados = S.compras || [];
  const equipado = S.equipado || {};

  html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">';

  for (const [emoji, item] of Object.entries(itens)) {
    const comprado = comprados.includes(emoji);
    const usando = equipado[abaAtual] === emoji;

    html += `
      <div class="item-boutique" data-item="${emoji}" data-aba="${abaAtual}" style="
        background:${usando ? '#f7d9e4' : (comprado ? '#ffffff33' : '#ffffff1a')};
        border-radius:12px;padding:10px 4px;
        text-align:center;cursor:pointer;
        border:2px solid ${usando ? '#f7d9e4' : 'transparent'};
        position:relative;
      ">
        <div style="font-size:28px">${emoji}</div>
        <div style="font-size:10px;opacity:.7;margin-top:2px">${item.nome}</div>
        <div style="font-size:11px;font-weight:bold;margin-top:4px;color:${usando ? '#1b1824' : '#fff'}">
          ${usando ? '✓ USANDO' : (comprado ? 'EQUIPAR' : `${item.preco}🪙`)}
        </div>
      </div>
    `;
  }

  html += '</div>';

  // Botão de tirar
  const temAlgoEquipado = equipado[abaAtual];
  if (temAlgoEquipado) {
    html += `<button id="btnTirar" style="
      font-size:14px;padding:10px;margin-top:12px;
      background:#ff6666;color:#fff;opacity:.8;
    ">🗑️ Tirar ${temAlgoEquipado}</button>`;
  }

  panel(html);

  // Handlers
  setTimeout(() => {
    // Abas
    document.querySelectorAll('[data-aba]:not(.item-boutique)').forEach(b => {
      b.onclick = () => {
        abaAtual = b.dataset.aba;
        renderBoutique();
      };
    });

    // Itens
    document.querySelectorAll('.item-boutique').forEach(el => {
      el.onclick = () => {
        const emoji = el.dataset.item;
        const aba = el.dataset.aba;
        clicarItemBoutique(emoji, aba);
      };
    });

    // Tirar
    const btnTirar = document.getElementById('btnTirar');
    if (btnTirar) {
      btnTirar.onclick = () => {
        const equipado = S.equipado || {};
        equipado[abaAtual] = null;
        S.equipado = equipado;
        save();
        SOM.melodia([N.DO_BAIXO, N.DO_BAIXO], 0.1, 'sine', 0.1);
        say('Tirei! 🗑️');
        aplicarVisual();
        renderBoutique();
      };
    }
  }, 100);
}

function clicarItemBoutique(emoji, aba) {
  const item = BOUTIQUE[aba][emoji];
  if (!item) return;

  const comprados = S.compras || [];
  const equipado = S.equipado || {};
  const jaComprou = comprados.includes(emoji);
  const jaUsando = equipado[aba] === emoji;

  // Se já tá usando → desequipa
  if (jaUsando) {
    equipado[aba] = null;
    S.equipado = equipado;
    save();
    SOM.melodia([N.DO_BAIXO, N.DO_BAIXO], 0.1, 'sine', 0.1);
    say('Tirei! 🗑️');
    aplicarVisual();
    renderBoutique();
    return;
  }

  // Se já comprou → só equipa
  if (jaComprou) {
    equipado[aba] = emoji;
    S.equipado = equipado;
    save();
    SOM.melodia([N.DO, N.MI, N.SOL], 0.1, 'sine', 0.1);
    say('Equipei! ✨');
    aplicarVisual();
    renderBoutique();
    return;
  }

  // Se não comprou → tenta comprar
  if ((S.moedas || 0) < item.preco) {
    say('Não tenho moedas suficientes... 😢');
    return;
  }

  S.moedas -= item.preco;
  comprados.push(emoji);
  S.compras = comprados;
  equipado[aba] = emoji;
  S.equipado = equipado;
  save();
  SOM.melodia([N.DO, N.MI, N.SOL, N.DO2], 0.1, 'sine', 0.12);
  say('Comprei! ✨');
  aplicarVisual();
  renderBoutique();
}
/* ============ BOAS-VINDAS ============ */
function welcomePanel() {
  P.innerHTML = `
    <h3>Oi! Como você vai me chamar?</h3>
    <input id="nomeInput" type="text" maxlength="12"
           placeholder="Ex: Luna"
           style="width:100%;padding:12px;border-radius:12px;
                  border:0;font-size:17px;margin:8px 0;
                  background:#ffffff1a;color:#fff;
                  box-sizing:border-box">
    <button id="nomeOk">Pronto! ✨</button>
  `;
  P.classList.add('on');

  setTimeout(() => {
    const input = document.getElementById('nomeInput');
    const botao = document.getElementById('nomeOk');

    input.focus();
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') botao.click();
    });

    botao.onclick = () => {
      const nome = input.value.trim();
      if (!nome) {
        input.style.background = '#ff000044';
        return;
      }
      S.nome = nome;
      S.id = gerarID(nome);
      save();
      P.innerHTML = `
        <h3>Prazer, ${esc(nome)}! 💗</h3>
        <p style="opacity:.7;font-size:14px">
          Seu ID: <code>${S.id}</code>
        </p>
      `;
      setTimeout(() => {
        P.classList.remove('on');
        persPanel();
      }, 2000);
    };
  }, 100);
}

function persPanel() {
  panel('<h3>Como será a Nébula?</h3>' +
    PERS.map(p => {
      const k = p.split(' ')[1];
      return `<button data-pers="${k}">${p}</button>`;
    }).join('') +
    '<button data-pers="sorteio">🎲 Surpresa</button>');
}

function choose(k) {
  if (k === 'sorteio') k = rnd(PERS).split(' ')[1];
  S.pers = k;
  
  // Gera preferências
  const p = gerarPreferencias();
  S.favoritas = p.favoritas;
  S.detestadas = p.detestadas;
  
  P.classList.remove('on');
  say('Eu sou ' + k + '! ✨');
  save();
  
  // Mostra as preferências (fofo!)
  setTimeout(() => {
    say('Adoro ' + S.favoritas.join(' ') + ' 💗');
  }, 2800);
}

function drawEstado() {
  const rows = [
    ['🔋', 'Energia', S.energia],
    ['🍎', 'Fome', S.fome],
    ['❤️', 'Saúde', S.saude],
    ['😊', 'Humor', S.humor],
    ['🧼', 'Limpeza', S.limpeza]
  ];
  const nomeHtml = S.nome
    ? `<div class="st" style="font-size:14px"><b>${esc(S.nome)}</b>> <span style="opacity:.5;font-size:12px">${S.id || ''}</span></div>`
    : '';
  const moedasHtml =
    `<div class="st" style="font-size:14px">🪙 <b>${S.moedas || 0}</b> moedas</div>`;
  $('estado').innerHTML =
    nomeHtml +
    moedasHtml +
    rows.map(r => `<div class="st"><span>${r[0]}</span><i><b style="width:${Math.round(r[2])}%"></b></i><span>${Math.round(r[2])}%</span></div>`).join('') +
    `<div class="st" style="font-size:12px;opacity:.7">Sensores: inclinar ${gotO ? '✅' : '❌'} · mexer ${gotM ? '✅' : '❌'} · vibrar ${navigator.vibrate ? '✅' : '❌'} · bateria ${batOK ? '✅' : '❌'}</div>`;
}
$('bEstado').onclick = () => {
  drawEstado();
  $('estado').classList.add('on');
  setTimeout(() => $('estado').classList.remove('on'), 4500);
};
$('estado').onclick = () => $('estado').classList.remove('on');
$('bCuidar').onclick = () => panel(
  '<h3>🧸 Cuidar</h3><button data-x="food">🍎 Comida</button><button data-x="bath">🛁 Banho</button>' +
  (S.sick > Date.now() ? '<button data-x="xarope">💊 Xarope</button>' : '')
);
$('bBrincar').onclick = () => panel(
  '<h3>🎮 Brincar</h3>' +
  '<button data-g="f">🍎 Cesta de Frutas</button>' +
  '<button data-g="b">🦋 Borboletas</button>' +
  '<button data-g="d">🦖 Dino</button>' +
  '<button data-x="dance">💃 Dançar</button>'
);
$('bMundo').onclick = mundo;
$('bXarope').onclick = xarope;
/* ============ XAROPE (remédio quando doente) ============ */
function xarope() {
  if (!S.sick || S.sick <= Date.now()) {
    say('Não estou doente agora... 🙂');
    return;
  }
  S.sick = 0;
  S.saude = clamp(S.saude + 15);
  S.humor = clamp(S.humor + 3);
  P.classList.remove('on');
  say('Xarope tomado! Já me sinto melhor 🍯');
  set('happy', 2500);
      if (gOn || S.modo === 'cidade') return;   // não interrompe jogos nem o modo Cidade
  save();
}
/* ============ TICK DA COMIDA ============ */
function foodTick() {
  prefs();
}

/* ============ 13. LOOP PRINCIPAL ============ */
prefs();
aplicarVisual();   // ← ADICIONA (aplica o que tava equipado)
if (!S.modo) setTimeout(modoPanel, 400);
else iniciarModo();
/* Saudação inicial */
(() => {
  const d = new Date(), h = d.getHours(), k = d.toDateString();
  if (awayAtBoot > (S.pers === 'carinhosa' ? 60 : 180)) say('Que saudade! 💗');
  else if (S.greet !== k && h >= 6 && h < 12) { S.greet = k; say('Bom dia! ☀️'); }
  else if (isNight()) say('Boa noite... 😴');
  if (!navigator.onLine) say('Sem internet... 📵');
})();

setInterval(() => {
  decay(5 / 60);
  sickTick();
  foodTick();
  joyTick();
  save();
  if (['neutral', 'sleepy', 'sad', 'sick', 'bored'].includes(mood))
    set(baseMood(), 0);
}, 5000);

/* Pausa quando a aba fica escondida */
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    hiddenAt = Date.now();
  } else {
    if (hiddenAt) {
      const m = (Date.now() - hiddenAt) / 60000;
      offline(m);
      S.last = Date.now();
      save();
      set(baseMood(), 0);
      hiddenAt = 0;
    }
  }
});
/* ============ AVISO DE ATUALIZAÇÃO ============ */
(function checkVersion() {
  const VERSAO_KEY = 'nebula-versao-vista';

  // Lê a versão que o index.html declara
  const metaTag = document.querySelector('meta[name="version"]');
  const versaoNova = Number(metaTag?.content || 1);

  // Lê a versão que esse celular já viu
  const versaoVista = Number(localStorage.getItem(VERSAO_KEY) || 0);

  // Se o celular já viu alguma versão E ela é mais antiga que a nova...
  if (versaoVista && versaoVista < versaoNova) {
    mostrarAviso(versaoNova, VERSAO_KEY);
  } else {
    // Primeira vez — só salva
    localStorage.setItem(VERSAO_KEY, versaoNova);
  }
})();

function mostrarAviso(nova, key) {
  // Chave pra saber se essa versão já deu prêmio
  const KEY_PREMIO = 'nebula-premio-versao';
  const versaoPremiada = Number(localStorage.getItem(KEY_PREMIO) || 0);
  const jaPegou = versaoPremiada >= nova;

  const aviso = document.createElement('div');
  aviso.id = 'aviso-atualizacao';

  if (jaPegou) {
    // Já pegou o prêmio dessa versão — só recarrega
    aviso.textContent = BIB_CONFIG.avisoTextoJaPego;
    aviso.onclick = () => {
      localStorage.setItem(key, nova);
      location.reload();
    };
  } else {
    // Ainda não pegou — mostra com prêmio
    aviso.textContent = BIB_CONFIG.avisoTexto.replace('{m}', BIB_CONFIG.moedasAtualizacao);
    aviso.onclick = () => {
      // Dá o prêmio UMA VEZ
      ganharMoedas(BIB_CONFIG.moedasAtualizacao);

      // Marca como premiado
      localStorage.setItem(KEY_PREMIO, nova);
      localStorage.setItem(key, nova);

      // Feedback visual
      aviso.textContent = `🎉 +${BIB_CONFIG.moedasAtualizacao} moedas!`;
      aviso.style.background = '#b8dfd0';
      aviso.style.color = '#2e6b52';

      // Recarrega depois de 1s
      setTimeout(() => {
        location.reload();
      }, 1000);
    };
  }

  document.body.appendChild(aviso);
}
$('bVoz').onclick = () => {
  if (ouvindo) pararVoz();
  else iniciarVoz('passivo'); 
};

/* ============================================================
   MODO FOCO / CRONÔMETRO
   ============================================================ */
let timerFoco = null;
let fimFoco = 0;

function iniciarCronometro(minutos) {
  if (timerFoco) clearInterval(timerFoco);

  fimFoco = Date.now() + minutos * 60000;   // baseado no relógio: não atrasa em segundo plano
  P.classList.remove('on');

  let telaFoco = document.getElementById('tela-foco');
  if (!telaFoco) {
    telaFoco = document.createElement('div');
    telaFoco.id = 'tela-foco';
    telaFoco.style.cssText = `
      position: fixed; inset: 0; background: #1b1824ee;
      z-index: 100; display: flex; flex-direction: column;
      align-items: center; justify-content: center; color: #fff;
      font-family: system-ui, sans-serif; backdrop-filter: blur(5px);
    `;
    document.body.appendChild(telaFoco);
  }

  // Monta UMA vez; depois só o texto do tempo muda
  telaFoco.innerHTML = `
    <h1 style="font-size:24px;color:#f7d9e4;margin-bottom:10px">Modo Foco ⏱️</h1>
    <div id="foco-tempo" style="font-size:70px;font-weight:bold;font-variant-numeric:tabular-nums">00:00</div>
    <p style="opacity:.6;margin-top:20px">A Nebo está estudando com você...</p>
    <button id="btnPararFoco" style="margin-top:30px;padding:12px 24px;border-radius:20px;border:0;background:#ffb3b3;color:#1b1824;font-weight:bold">Cancelar Foco</button>
  `;
  document.getElementById('btnPararFoco').onclick = pararCronometro;
  const tempoEl = document.getElementById('foco-tempo');

  const atualizar = () => {
    const r = Math.max(0, Math.ceil((fimFoco - Date.now()) / 1000));
    tempoEl.textContent = String(Math.floor(r / 60)).padStart(2, '0') + ':' + String(r % 60).padStart(2, '0');
    return r;
  };

  atualizar();
  set('curious', minutos * 60000, 'Vou ficar quietinha te ajudando...');

  timerFoco = setInterval(() => {
    if (atualizar() > 0) return;

    clearInterval(timerFoco);
    timerFoco = null;
    telaFoco.remove();

    S.humor = clamp(S.humor + 15);
    S.energia = clamp(S.energia + 10);
    ganharMoedas(20);
    save();
    SOM.melodia([N.DO, N.MI, N.SOL, N.DO2], 0.15, 'sine', 0.15);
    until = 0;
    set('happy', 5000, 'Você conseguiu! Estudamos juntos! 💗 +20 moedas');
  }, 1000);
}

function pararCronometro() {
  if (timerFoco) clearInterval(timerFoco);
  timerFoco = null;
  const el = document.getElementById('tela-foco');
  if (el) el.remove();
  say('Foco cancelado. 😌');
  set('neutral', 3000);
}
// ==========================================
// REAÇÃO AO CLIMA 
// ==========================================
async function checarClima() {
  if (!navigator.geolocation) return;
  
  navigator.geolocation.getCurrentPosition(async (pos) => {
    try {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      
      // API gratuita, sem chave
      const resp = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
      const dados = await resp.json();
      const temp = dados.current_weather.temperature;
      const codigoClima = dados.current_weather.weathercode;

      // Códigos de chuva: 51 a 67, 80 a 82, 95 a 99
      const taChovendo = (codigoClima >= 51 && codigoClima <= 67) || (codigoClima >= 80 && codigoClima <= 82) || (codigoClima >= 95);
      
      if (taChovendo) {
        set('sad', 6000, 'Tá chovendo lá fora... que preguiça de estudar. ☔');
      } else if (temp > 30) {
        set('sleepy', 6000, 'Nossa, que calor! Tô derretendo... ☀️');
      } else if (temp < 15) {
        set('surprised', 6000, 'Tá frio hoje! Vem me dar um abraço? ❄️');
      } else {
        set('happy', 6000, 'O tempo tá ótimo hoje! Vamos aproveitar? 🌤️');
      }
    } catch (e) {
      console.log("Não consegui ver o clima:", e);
    }
  }, () => {
    console.log("Permissão de localização negada.");
  });
}

// Chama a função quando o jogo abrir e depois a cada 2 horas
setTimeout(checarClima, 10000); 
setInterval(checarClima, 7200000); 

async function entrarNaSala() {
  const db = iniciarFirebase();
  if (!db) return say('Sem internet... 📵');

  S.conectado = true;
  save();
  say('Conectada! Procurando amiguinhas... 🔍');
  
  // Atualiza seu status no Firebase
  await salvarNoFirebase();
  
  // Abre o painel de jogos de novo, agora mostrando que está conectada
  painelJogos(); 
}

async function sairDaSala() {
  S.conectado = false;
  save();
  say('Desconectada. Até mais! 👋');
  await sairDoFirebase();   // remove da sala em vez de só marcar como desconectada
  painelJogos();
}
