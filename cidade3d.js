/* ============================================================
   CIDADE NEBO v2 — diorama low-poly
   Prédios e ruas: estilo voxel isométrico (referência 1)
   Terreno, névoa e céu: estilo low-poly facetado (referência 2)
   ============================================================ */
(() => {
  if (window.__nebulaCity3DLoaded) return;
  window.__nebulaCity3DLoaded = true;

  /* ---------- Medidas ---------- */
  const BLOCO = 30;
  const CASAS_POR_QUARTEIRAO = 4;
  const LARGURA_CASA = 5.4;
  const PROF_CASA = 4.8;
  // Casas coladas lado a lado (fileira de prédios), duas fileiras por quarteirão
  const OFFSETS_CASA = [[-2.8,-6.2],[2.8,-6.2],[-2.8,6.2],[2.8,6.2]];

  /* ---------- Paleta ---------- */
  const PAL = {
    paredes:  ['#F2B84B','#EE9A3E','#F5C766','#E8843C','#F0A94A','#F7D27A','#E99B54','#F1AE62'],
    telhados: ['#E0833A','#D6722F','#E8924A','#CF6A2E'],
    beiral:   '#A9A499',
    soco:     '#CFC7B2',
    moldura:  '#F6E7C8',
    vidro:    '#AEE0E4',
    porta:    '#9A6A3E',
    madeira:  '#A9633A',
    madeira2: '#C98A52',
    asfalto:  '#4F4540',
    faixa:    '#F4EFE1',
    calcada:  '#C4C0B0',
    guia:     '#9F9C93',
    caminho:  '#E3D9BC',
    gramado:  '#A8D27A',
    poste:    '#8B8A82',
    lampada:  '#EF7B6E',
     areia: '#E8C987',
   areiaClara: '#F5E2B0',
   mar: '#39B8BF',
   marProfundo: '#278D9B',
   espuma: '#F7F0D9',
   madeiraPraia: '#B98150',
   guardaSol: '#E47D55',
   azulPraia: '#80CFD0'
  };
  const CEU = { topo:'#74BBE8', meio:'#B9E0F2', horizonte:'#DCEEE2' };
  const COR_NEVOA = '#DCEEE2';

  const VERDES_TERRENO = ['#A9D27B','#B2D884','#9FCB72','#B9DC8E','#A3CF76','#AED680'];
  const PEDRAS_TERRENO = ['#A9A995','#C0B9A1','#909985','#B3AC96'];

  /* ---------- Estado ---------- */
  let scene, camera, renderer, controls, luzSol, grupoCidade, ceu, grupoNuvens;
  let terrenoMesh = null, terrenoExtent = 0;
  let casasRenderizadas = [];
  let jatoFonte = null, jatoBaseY = 0;
  let iniciado = false;
  let carregandoThree = false;
  let firebaseUnsubscribe = null;
  let ultimaAssinatura = '';
  let houvePrimeiraLeitura = false;
  let houveMapaComCasas = false;
  let raioAtual = 1;
  let relogio = null;

let aguaMar = null;
let ondasEspuma = [];
let praiaAtual = null;

let grupoFaunaMarinha = null;
let aparicaoFaunaMarinha = null;
let proximaAparicaoFauna = 0;
let ultimaEspecieVista = '';
let avisoFaunaTimer = null;

  const $ = id => document.getElementById(id);
  const ehCelular = () => Math.min(window.innerWidth, window.innerHeight) < 700;

  /* ============================================================
     UTILIDADES
     ============================================================ */
  function hashTexto(texto) {
    let h = 2166136261;
    for (const ch of String(texto || 'nebo')) {
      h ^= ch.charCodeAt(0);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // Aleatório determinístico: mesma entrada, mesma saída
  function rand2(x, y) {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  const pick = (lista, n) => lista[(n >>> 0) % lista.length];
  const limitar = (v, a, b) => Math.max(a, Math.min(b, v));

const suavizar = t => {
  t = limitar(t, 0, 1);
  return t * t * (3 - 2 * t);
};

function parametrosPraia(extent) {
  const areiaInicio = extent + 4;
  const costaZ = extent + 72;
  const largura = Math.max(300, extent * 2 + 140);
  const larguraMar = largura + 100;
  const inicioMar = costaZ - 14;
  const profundidadeMar = Math.max(400, extent * 2.75);

  return {
    areiaInicio,
    costaZ,
    largura,
    larguraMar,
    inicioMar,
    profundidadeMar,
    fimMar: inicioMar + profundidadeMar
  };
}

// Cria pequenas irregularidades na linha da costa.
function costaEm(x, praia) {
  const recorte =
    Math.round((rand2(x, 6.4) - 0.5) * 2) * 1.2;

  return praia.costaZ
    + Math.sin(x * 0.021) * 4.2
    + Math.sin(x * 0.057 + 1.1) * 1.9
    + recorte;
}

// Ondas suaves, com movimentos em várias direções.
function alturaOnda(x, z, tempo) {
  return Math.sin(x * 0.035 + tempo * 1.15) * 0.18
    + Math.cos(z * 0.06 - tempo * 1.35) * 0.11
    + Math.sin((x + z) * 0.022 + tempo * 0.85) * 0.06;
}
   
  const CACHE_COR = new Map();
  function corTHREE(hex) {
    let c = CACHE_COR.get(hex);
    if (!c) { c = new THREE.Color(hex); CACHE_COR.set(hex, c); }
    return c;
  }

  // Clareia (t > 0) ou escurece (t < 0) uma cor hex
  function tom(hex, t) {
    const c = new THREE.Color(hex);
    const alvo = t > 0 ? 1 : 0;
    const k = Math.abs(t);
    c.r += (alvo - c.r) * k;
    c.g += (alvo - c.g) * k;
    c.b += (alvo - c.b) * k;
    return '#' + c.getHexString();
  }

  /* ============================================================
     MESCLADOR: junta centenas de caixas coloridas em UMA malha.
     Resultado: poucas chamadas de desenho e visual de voxel limpo.
     ============================================================ */
  const FACES = [
    { n:[0,0,1],  v:[[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]] },
    { n:[0,0,-1], v:[[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]] },
    { n:[1,0,0],  v:[[1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1]] },
    { n:[-1,0,0], v:[[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1]] },
    { n:[0,1,0],  v:[[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1]] }
    // a face de baixo nunca aparece, então não é gerada
  ];
  const TRIANGULOS = [0,1,2,0,2,3];

  let MAT_PADRAO = null;
  function matPadrao() {
    if (!MAT_PADRAO) {
      MAT_PADRAO = new THREE.MeshStandardMaterial({
        vertexColors: true, roughness: 0.95, metalness: 0
      });
      MAT_PADRAO.userData.shared = true;
    }
    return MAT_PADRAO;
  }

  class Mesclador {
    constructor() { this.p = []; this.n = []; this.c = []; }

    caixa(w, h, d, cor, x, y, z, jit = 0) {
      const base = corTHREE(cor);
      const f = 1 + (jit ? (rand2(x * 3.1 + w, z * 1.7 + h) - 0.5) * jit : 0);
      const r = Math.min(1, base.r * f);
      const g = Math.min(1, base.g * f);
      const bl = Math.min(1, base.b * f);
      // Sombra de contato falsa: base de peças baixas encostadas no chão fica mais escura
      const tocaChao = (y - h / 2) < 0.7 && h < 1.2;
      const hw = w / 2, hh = h / 2, hd = d / 2;

      for (let fi = 0; fi < FACES.length; fi++) {
        const F = FACES[fi];
        for (let t = 0; t < 6; t++) {
          const v = F.v[TRIANGULOS[t]];
          this.p.push(x + v[0] * hw, y + v[1] * hh, z + v[2] * hd);
          this.n.push(F.n[0], F.n[1], F.n[2]);
          const esc = (tocaChao && v[1] < 0 && F.n[1] === 0) ? 0.8 : 1;
          this.c.push(r * esc, g * esc, bl * esc);
        }
      }
    }

    construir() {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
      geo.setAttribute('normal',   new THREE.Float32BufferAttribute(this.n, 3));
      geo.setAttribute('color',    new THREE.Float32BufferAttribute(this.c, 3));
      geo.computeBoundingSphere();
      const malha = new THREE.Mesh(geo, matPadrao());
      malha.castShadow = true;
      malha.receiveShadow = true;
      return malha;
    }
  }

  // Materiais simples reaproveitados (fonte, etc.)
  const MATS = new Map();
  function mat(cor, op = {}) {
    const k = cor + JSON.stringify(op);
    let m = MATS.get(k);
    if (!m) {
      m = new THREE.MeshStandardMaterial({
        color: cor, roughness: 0.9, metalness: 0, flatShading: true, ...op
      });
      m.userData.shared = true;
      MATS.set(k, m);
    }
    return m;
  }

  /* ============================================================
     PEÇAS REUTILIZÁVEIS (árvore, arbusto, poste, banco, cerca)
     ============================================================ */
  const Y_CHAO = 0.08; // topo do gramado

  function arbusto(b, x, z, s = 1) {
    b.caixa(s, s * 0.9, s, '#86BE49', x, Y_CHAO + s * 0.45, z, 0.1);
    b.caixa(s * 0.82, s * 0.2, s * 0.82, '#A4D85C', x, Y_CHAO + s * 0.9 + s * 0.1, z, 0.06);
  }

  function arvore(b, x, z, s = 1) {
    b.caixa(0.4 * s, 1.1 * s, 0.4 * s, '#9B6E4A', x, Y_CHAO + 0.55 * s, z);
    b.caixa(1.35 * s, 1.0 * s, 1.35 * s, '#7DB343', x, Y_CHAO + 1.1 * s + 0.5 * s, z, 0.06);
    b.caixa(1.05 * s, 0.85 * s, 1.05 * s, '#93C954', x, Y_CHAO + 2.1 * s + 0.42 * s, z, 0.06);
    b.caixa(0.62 * s, 0.5 * s, 0.62 * s, '#A9DB66', x, Y_CHAO + 2.95 * s + 0.25 * s, z, 0.06);
  }

  function poste(b, x, z) {
    b.caixa(0.14, 3.0, 0.14, PAL.poste, x, Y_CHAO + 1.5, z);
    b.caixa(0.5,  0.14, 0.5,  PAL.lampada, x, Y_CHAO + 3.07, z);
    b.caixa(0.36, 0.14, 0.36, PAL.lampada, x, Y_CHAO + 3.21, z);
    b.caixa(0.2,  0.14, 0.2,  PAL.lampada, x, Y_CHAO + 3.35, z);
  }

  function banco(b, x, z) {
    const lado = z > 0 ? 1 : -1;
    b.caixa(2.0, 0.12, 0.55, PAL.madeira2, x, Y_CHAO + 0.5, z);
    b.caixa(2.0, 0.45, 0.1,  PAL.madeira,  x, Y_CHAO + 0.82, z + lado * 0.28);
    b.caixa(0.12, 0.45, 0.45, PAL.madeira, x - 0.8, Y_CHAO + 0.22, z);
    b.caixa(0.12, 0.45, 0.45, PAL.madeira, x + 0.8, Y_CHAO + 0.22, z);
  }

  // Cerca de madeira de x0 a x1, na posição z (coordenadas locais da casa)
  function cerca(b, x0, x1, z) {
    const n = Math.max(1, Math.round((x1 - x0) / 0.62));
    for (let i = 0; i <= n; i++) {
      b.caixa(0.1, 0.52, 0.1, PAL.madeira, x0 + (x1 - x0) * i / n, Y_CHAO + 0.26, z);
    }
    b.caixa(x1 - x0, 0.07, 0.06, PAL.madeira2, (x0 + x1) / 2, Y_CHAO + 0.4, z);
    b.caixa(x1 - x0, 0.07, 0.06, PAL.madeira2, (x0 + x1) / 2, Y_CHAO + 0.2, z);
  }

  function vaso(b, x, z) {
    b.caixa(0.46, 0.36, 0.42, '#C7845A', x, Y_CHAO + 0.18, z);
    b.caixa(0.52, 0.4, 0.48, '#7FB84A', x, Y_CHAO + 0.56, z, 0.08);
    b.caixa(0.14, 0.1, 0.14, '#F28FAD', x - 0.1, Y_CHAO + 0.8, z + 0.04);
    b.caixa(0.14, 0.1, 0.14, '#F7D14C', x + 0.12, Y_CHAO + 0.78, z - 0.05);
  }

  /* ============================================================
     PLACA COM O NOME DA DONA
     ============================================================ */
  function criarPlaca(nome) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 112;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFBEF';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(7, 7, 498, 98, 25);
    else ctx.rect(7, 7, 498, 98);
    ctx.fill();
    ctx.strokeStyle = '#7A5A3A';
    ctx.lineWidth = 8;
    ctx.stroke();

    ctx.fillStyle = '#4A3524';
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(nome || 'Nebo').slice(0, 20), 256, 56, 450);

    const textura = new THREE.CanvasTexture(canvas);
    if ('colorSpace' in textura && THREE.SRGBColorSpace) {
      textura.colorSpace = THREE.SRGBColorSpace;
    }

    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: textura, transparent: true, depthTest: false })
    );
    sprite.scale.set(6.5, 1.42, 1);
    return sprite;
  }

  /* ============================================================
     CASA (prédio alto ou lojinha), uma única malha por casa
     ============================================================ */

  // Coloca uma caixa colada numa face da casa.
  // face: f (frente +z), b (fundo -z), r (direita +x), l (esquerda -x)
  // u: posição ao longo da face · recuo: distância do centro da caixa até a parede
  function colar(b, face, u, y, w, h, esp, cor, recuo) {
    const W = LARGURA_CASA, D = PROF_CASA;
    switch (face) {
      case 'f': b.caixa(w, h, esp, cor, u, y,  D / 2 + recuo); break;
      case 'b': b.caixa(w, h, esp, cor, u, y, -D / 2 - recuo); break;
      case 'r': b.caixa(esp, h, w, cor,  W / 2 + recuo, y, u); break;
      case 'l': b.caixa(esp, h, w, cor, -W / 2 - recuo, y, u); break;
    }
  }

  // Janela com vidro azul-claro, moldura em 4 barras e peitoril
  function janela(b, face, u, y, w = 0.66, h = 0.82) {
    const t = 0.09, e = 0.12, m = PAL.moldura;
    colar(b, face, u, y, w, h, 0.06, PAL.vidro, 0.03);
    colar(b, face, u, y + h / 2 + t / 2, w + 2 * t, t, e, m, e / 2);
    colar(b, face, u, y - h / 2 - t / 2, w + 2 * t, t, e, m, e / 2);
    colar(b, face, u - w / 2 - t / 2, y, t, h, e, m, e / 2);
    colar(b, face, u + w / 2 + t / 2, y, t, h, e, m, e / 2);
    colar(b, face, u, y - h / 2 - t - 0.04, w + 0.34, 0.07, 0.22, m, 0.11);
  }

  function criarCasa(dados, x, z, indice) {
    const grupo = new THREE.Group();
    grupo.position.set(x, 0, z);

    const h = hashTexto(dados.id || dados.nome || indice);
    // Padrão xadrez: prédio alto e lojinha se alternam, como na referência
    const torre = (indice % 4 === 0 || indice % 4 === 3);
    const andares = torre ? 3 + (h % 2) : 1 + ((h >>> 3) % 2);

    const W = LARGURA_CASA, D = PROF_CASA;
    const AA = 1.72, BASE = 0.32;
    const altura = andares * AA;
    const topo = BASE + altura;
    const cor = pick(PAL.paredes, h);
    const teto = pick(PAL.telhados, h >>> 5);
    const yJ = a => BASE + a * AA + 1.0;

    const b = new Mesclador();

    /* Corpo */
    b.caixa(W + 0.16, BASE, D + 0.16, PAL.soco, 0, BASE / 2, 0);
    b.caixa(W, altura, D, cor, 0, BASE + altura / 2, 0);
    for (let a = 1; a < andares; a++) {
      b.caixa(W + 0.08, 0.07, D + 0.08, tom(cor, 0.22), 0, BASE + a * AA, 0);
    }

    /* Beiral cinza em moldura + laje laranja rebaixada */
    const alt = 0.34, g = PAL.beiral;
    b.caixa(W + 0.44, alt, 0.24, g, 0, topo + alt / 2,  D / 2 + 0.1);
    b.caixa(W + 0.44, alt, 0.24, g, 0, topo + alt / 2, -D / 2 - 0.1);
    b.caixa(0.24, alt, D + 0.02, g,  W / 2 + 0.1, topo + alt / 2, 0);
    b.caixa(0.24, alt, D + 0.02, g, -W / 2 - 0.1, topo + alt / 2, 0);
    b.caixa(W, 0.2, D, teto, 0, topo + 0.1, 0);

    /* Coisinhas no telhado */
    b.caixa(0.9, 0.32, 0.75, '#B7B2A3', -W * 0.2, topo + 0.36, -D * 0.15);
    b.caixa(0.55, 0.18, 0.45, '#8E8F86', -W * 0.2, topo + 0.61, -D * 0.15);
    if (h % 3 !== 1) b.caixa(0.42, 0.5, 0.42, '#E0796B', W * 0.25, topo + 0.45, D * 0.12);
    if (h % 2 === 0) b.caixa(0.6, 0.26, 0.5, '#B7B2A3', W * 0.22, topo + 0.33, -D * 0.25);

    /* Fachada */
    const portaFrente = () => {
      colar(b, 'f', 0, BASE + 0.83, 1.15, 1.66, 0.1, PAL.moldura, 0.04);
      colar(b, 'f', 0, BASE + 0.78, 0.95, 1.56, 0.16, PAL.porta, 0.07);
      colar(b, 'f', 0.25, BASE + 0.78, 0.07, 0.07, 0.06, '#E8C56B', 0.17);
    };

    if (torre) {
      for (let a = 0; a < andares; a++) {
        for (const u of (a === 0 ? [-1.7, 1.7] : [-1.7, 0, 1.7])) janela(b, 'f', u, yJ(a));
        janela(b, 'r', 0, yJ(a));
        janela(b, 'l', 0, yJ(a));
        janela(b, 'b', -1.2, yJ(a));
        janela(b, 'b',  1.2, yJ(a));
      }
      portaFrente();
      colar(b, 'f', 0, BASE + 1.88, 1.3, 0.14, 0.55, '#F3DDB0', 0.3); // toldinho
      vaso(b, -0.95, PROF_CASA / 2 + 0.42);
      vaso(b,  0.95, PROF_CASA / 2 + 0.42);
    } else {
      // Vitrine: duas janelinhas, porta dupla de vidro e janelão
      janela(b, 'f', -1.95, yJ(0) + 0.1, 0.62, 0.8);
      janela(b, 'f', -1.0,  yJ(0) + 0.1, 0.62, 0.8);
      janela(b, 'f',  1.75, yJ(0) + 0.05, 1.4, 1.0);
      colar(b, 'f', 0.15, BASE + 0.83, 1.28, 1.66, 0.1, PAL.moldura, 0.04);
      colar(b, 'f', 0.15, BASE + 0.8, 1.1, 1.6, 0.12, PAL.porta, 0.06);
      colar(b, 'f', -0.12, BASE + 0.95, 0.4, 1.0, 0.04, '#B9E4E6', 0.12);
      colar(b, 'f',  0.42, BASE + 0.95, 0.4, 1.0, 0.04, '#B9E4E6', 0.12);
      colar(b, 'f', 0.15, BASE + 1.88, 1.5, 0.14, 0.55, '#F3DDB0', 0.3);
      for (let a = 0; a < andares; a++) {
        if (a > 0) for (const u of [-1.7, 0, 1.7]) janela(b, 'f', u, yJ(a));
        janela(b, 'r', 0, yJ(a));
        janela(b, 'l', 0, yJ(a));
        janela(b, 'b', -1.2, yJ(a));
        janela(b, 'b',  1.2, yJ(a));
      }
    }
    // Portinha dos fundos
    colar(b, 'b', 0, BASE + 0.78, 0.95, 1.56, 0.16, '#8A5E38', 0.07);

    /* Tijolinhos soltos nas paredes laterais, como na referência */
    const nTijolos = torre ? 9 : 4;
    const corTijolo = tom(cor, -0.18);
    for (let i = 0; i < nTijolos; i++) {
      const r1 = rand2(h + i * 1.3, 7.7);
      const r2 = rand2(h + i * 2.1, 3.3);
      const r3 = rand2(i + h * 0.01, 9.1);
      const face = r3 < 0.5 ? 'r' : 'l';
      const u = (r1 < 0.5 ? -1 : 1) * (0.95 + r2 * 1.1);
      const y = BASE + 0.5 + rand2(i * 5.5, h * 0.003) * (altura - 1.0);
      colar(b, face, u, y, 0.5, 0.22, 0.05, corTijolo, 0.025);
    }

    /* Degrau, caminho de pedra e cerquinha na frente */
    b.caixa(1.3, 0.12, 0.5, PAL.soco, 0, 0.06 + 0.02, D / 2 + 0.25);
    b.caixa(1.0, 0.05, 1.3, PAL.caminho, 0, Y_CHAO + 0.02, D / 2 + 1.15);
    cerca(b, -W / 2, -0.7, D / 2 + 1.6);
    cerca(b, 0.7, W / 2, D / 2 + 1.6);

    grupo.add(b.construir());

    /* Placa do nome */
    const placa = criarPlaca(dados.nome || 'Nebo');
    placa.position.set(0, topo + 2.0, 0);
    placa.renderOrder = 5;
    grupo.add(placa);

    grupo.userData.imovel = {
      id: dados.id,
      nome: dados.nome || 'Nebo',
      tipo: 'Casa',
      pers: dados.pers || ''
    };
    grupo.userData.indiceCasa = indice;

    grupoCidade.add(grupo);
    casasRenderizadas.push(grupo);
  }

  /* ============================================================
     RUAS, CALÇADAS, FAIXAS, POSTES
     ============================================================ */
  function criarRuas(b, raio, extent) {
    const centros = [];
    for (let k = -raio - 1; k <= raio; k++) centros.push(k * BLOCO + BLOCO / 2);

    // Trechos entre cruzamentos (calçada não atravessa a outra rua)
    const trechos = [];
    let ini = -extent;
    centros.forEach(c => { trechos.push([ini, c - 2.35]); ini = c + 2.35; });
    trechos.push([ini, extent]);

    // Asfalto
    centros.forEach(p => {
      b.caixa(4.7, 0.10, extent * 2, PAL.asfalto, p, 0.03, 0);
      b.caixa(extent * 2, 0.10, 4.7, PAL.asfalto, 0, 0.03, p);
    });

    centros.forEach((p, k) => {
      trechos.forEach(([a, z], ti) => {
        const len = z - a;
        if (len < 0.5) return;
        const meio = (a + z) / 2;

        for (const lado of [-1, 1]) {
          // Calçada e guia (meio-fio)
          b.caixa(0.76, 0.14, len, PAL.calcada, p + lado * 2.85, 0.07, meio);
          b.caixa(0.12, 0.12, len, PAL.guia,    p + lado * 2.42, 0.09, meio);
          b.caixa(len, 0.14, 0.76, PAL.calcada, meio, 0.07, p + lado * 2.85);
          b.caixa(len, 0.12, 0.12, PAL.guia,    meio, 0.09, p + lado * 2.42);
        }

        // Faixas tracejadas (deixam folga perto dos cruzamentos)
        const mA = ti > 0 ? 5.8 : 1;
        const mB = ti < trechos.length - 1 ? 5.8 : 1;
        for (let s = a + mA + 1; s <= z - mB - 1; s += 4) {
          b.caixa(0.18, 0.02, 2.0, PAL.faixa, p, 0.09, s);
          b.caixa(2.0, 0.02, 0.18, PAL.faixa, s, 0.09, p);
        }

        // Poste no meio do trecho (lado alterna) e arbustos nos quartos
        const lado = ((k + ti) % 2 === 0) ? 1 : -1;
        const pertoDaPraca = Math.abs(meio) < 13 && Math.abs(p) < 17;
        if (!pertoDaPraca && len > 12) {
          poste(b, p + lado * 2.85, meio);
          poste(b, meio, p + lado * 2.85);
        }
        if (len > 18) {
          for (const f of [0.25, 0.75]) {
            const s = a + len * f;
            arbusto(b, p + lado * 3.95, s, 0.9);
            arbusto(b, s, p - lado * 3.95, 0.9);
          }
        }
      });
    });

    // Faixas de pedestre em cada cruzamento
    centros.forEach(px => centros.forEach(pz => {
      for (const sg of [-1, 1]) {
        for (let i = -2; i <= 2; i++) {
          b.caixa(2.0, 0.02, 0.5, PAL.faixa, px + sg * 4.2, 0.09, pz + i * 0.85);
          b.caixa(0.5, 0.02, 2.0, PAL.faixa, px + i * 0.85, 0.09, pz + sg * 4.2);
        }
      }
    }));
  }

  /* ============================================================
     QUARTEIRÕES, PRAÇA, FONTE
     ============================================================ */
  function gramado(b, bx, bz) {
    b.caixa(23.6, 0.08, 23.6, PAL.gramado, bx * BLOCO, 0.04, bz * BLOCO, 0.07);
  }

  // Pátio entre as duas fileiras de casas
  function patio(b, cx, cz) {
    b.caixa(11.2, 0.04, 1.0, PAL.caminho, cx, 0.1, cz + 0.6);
    arbusto(b, cx - 5.0, cz + 2.6, 0.9);
    arbusto(b, cx + 5.0, cz + 2.6, 0.9);
    arbusto(b, cx - 2.6, cz + 2.6, 0.7);
    arbusto(b, cx + 2.6, cz + 2.6, 0.7);
  }

  function criarPraca(b) {
    // Caminhos em cruz
    b.caixa(2.0, 0.04, 22.4, PAL.caminho, 0, 0.1, 0);
    b.caixa(22.4, 0.04, 2.0, PAL.caminho, 0, 0.1, 0);

    // Canteiros de flores nos quatro cantos
    const flores = ['#F28FAD', '#F7D14C', '#FFFFFF', '#E86F6F'];
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx, sz], q) => {
      const cx = sx * 6.2, cz = sz * 6.2;
      b.caixa(4.2, 0.16, 4.2, '#8FC463', cx, Y_CHAO + 0.04, cz, 0.06);
      for (let i = 0; i < 14; i++) {
        const fx = cx + (rand2(q * 9 + i, 1.7) - 0.5) * 3.4;
        const fz = cz + (rand2(i + 3.3, q * 7) - 0.5) * 3.4;
        const cor = pick(flores, Math.floor(rand2(fx, fz) * 4));
        b.caixa(0.26, 0.18, 0.26, cor, fx, Y_CHAO + 0.22, fz);
      }
      arvore(b, sx * 9.3, sz * 9.3, 0.85);
    });

    banco(b, -5.5, 1.7);
    banco(b,  5.5, -1.7);
  }

/* ============================================================
   PRAIA NEBO — areia, calçadão, quiosque e acessórios
   ============================================================ */

function palmeira(b, x, z, s = 1) {
  // Tronco em blocos, combinando com o estilo voxel da cidade.
  for (let i = 0; i < 4; i++) {
    b.caixa(
      0.42 * s, 0.92 * s, 0.42 * s,
      '#9A6A3E',
      x + i * 0.075 * s,
      Y_CHAO + (0.46 + i * 0.68) * s,
      z - i * 0.025 * s
    );
  }

  const copaY = Y_CHAO + 3.15 * s;

  // Copa em cruz, com vários tons de verde.
  b.caixa(
    2.65 * s, 0.22 * s, 0.48 * s,
    '#76B84B', x, copaY, z
  );

  b.caixa(
    0.48 * s, 0.22 * s, 2.65 * s,
    '#88C953', x, copaY + 0.01 * s, z
  );

  b.caixa(
    1.75 * s, 0.18 * s, 0.42 * s,
    '#9CD95E',
    x - 0.22 * s, copaY - 0.12 * s, z - 0.18 * s
  );

  b.caixa(
    0.42 * s, 0.18 * s, 1.75 * s,
    '#A7D96B',
    x + 0.18 * s, copaY - 0.10 * s, z + 0.20 * s
  );

  b.caixa(
    0.22 * s, 0.22 * s, 0.22 * s,
    '#74512E',
    x - 0.14 * s, copaY - 0.18 * s, z
  );

  b.caixa(
    0.22 * s, 0.22 * s, 0.22 * s,
    '#74512E',
    x + 0.16 * s, copaY - 0.18 * s, z + 0.12 * s
  );
}

function criarSombrilla(b, x, z, cor, s = 1) {
  b.caixa(
    0.14 * s, 1.02 * s, 0.14 * s,
    PAL.madeira, x, Y_CHAO + 0.51 * s, z
  );

  b.caixa(
    2.65 * s, 0.18 * s, 2.65 * s,
    '#FFF1D0', x, Y_CHAO + 1.10 * s, z
  );

  b.caixa(
    2.65 * s, 0.075 * s, 0.62 * s,
    cor, x, Y_CHAO + 1.21 * s, z - 0.80 * s
  );

  b.caixa(
    2.65 * s, 0.075 * s, 0.62 * s,
    cor, x, Y_CHAO + 1.21 * s, z + 0.80 * s
  );
}

function criarEspreguicadeira(b, x, z, cor) {
  b.caixa(
    1.15, 0.12, 2.35,
    '#FFF0CF', x, 0.20, z
  );

  b.caixa(
    1.03, 0.055, 1.00,
    cor, x, 0.285, z - 0.48
  );

  b.caixa(
    1.03, 0.055, 0.72,
    '#F8EFD8', x, 0.285, z + 0.40
  );

  for (const sx of [-0.42, 0.42]) {
    b.caixa(
      0.10, 0.22, 0.10,
      PAL.madeira, x + sx, 0.12, z - 0.78
    );

    b.caixa(
      0.10, 0.22, 0.10,
      PAL.madeira, x + sx, 0.12, z + 0.78
    );
  }
}

function criarQuiosquePraia(b, x, z) {
  b.caixa(
    4.5, 0.12, 3.6,
    PAL.madeiraPraia, x, 0.13, z
  );

  b.caixa(
    4.0, 1.75, 3.0,
    '#F4E5C2', x, 1.00, z
  );

  b.caixa(
    4.65, 0.25, 3.75,
    PAL.guardaSol, x, 2.02, z
  );

  // Janela de atendimento voltada para a areia.
  b.caixa(
    1.9, 0.58, 0.12,
    PAL.azulPraia, x, 1.18, z + 1.56
  );

  b.caixa(
    4.1, 0.12, 0.18,
    PAL.madeira, x, 0.89, z + 1.62
  );

  b.caixa(
    4.25, 0.09, 0.10,
    PAL.areiaClara, x, 1.86, z + 1.78
  );
}

function criarPraia(b, praia, extent) {
  const segmentos = Math.max(
    22,
    Math.ceil(praia.largura / 9)
  );

  const larguraSegmento = praia.largura / segmentos;

  // A linha da costa varia por segmento para não parecer um retângulo.
  for (let i = 0; i < segmentos; i++) {
    const x =
      -praia.largura / 2 +
      (i + 0.5) * larguraSegmento;

    const costa = costaEm(x, praia);
    const profundidade = Math.max(
      1,
      costa - praia.areiaInicio
    );

    const cor =
      (i % 5 === 0 || i % 7 === 0)
        ? PAL.areiaClara
        : PAL.areia;

    b.caixa(
      larguraSegmento + 0.28,
      0.10,
      profundidade,
      cor,
      x,
      0.04,
      praia.areiaInicio + profundidade / 2,
      0.035
    );
  }

  // Calçadão que liga a rua à praia.
  const caminhoInicio = extent - 25;
  const caminhoFim = praia.costaZ - 6;
  const caminhoComprimento = caminhoFim - caminhoInicio;
  const caminhoCentro = (caminhoInicio + caminhoFim) / 2;

  b.caixa(
    4.8, 0.075, caminhoComprimento,
    PAL.madeiraPraia,
    0, 0.11, caminhoCentro
  );

  // Ripas visíveis no piso de madeira.
  for (
    let z = caminhoInicio + 0.8;
    z < caminhoFim;
    z += 1.45
  ) {
    b.caixa(
      4.72, 0.018, 0.10,
      '#D5A16B', 0, 0.158, z, 0.02
    );
  }

  // Guarda-corpos apenas na parte sobre a areia.
  const guardaInicio = extent + 8;
  const guardaFim = caminhoFim;
  const guardaComprimento = guardaFim - guardaInicio;
  const guardaCentro = (guardaInicio + guardaFim) / 2;

  if (guardaComprimento > 6) {
    for (const lado of [-1, 1]) {
      b.caixa(
        0.12, 0.085, guardaComprimento,
        PAL.madeira, lado * 2.35, 0.535, guardaCentro
      );

      for (let z = guardaInicio + 3; z < guardaFim; z += 7) {
        b.caixa(
          0.12, 0.38, 0.12,
          PAL.madeira, lado * 2.35, 0.34, z
        );
      }
    }
  }

  // Palmeiras nas laterais para emoldurar a praia.
  palmeira(
    b, -praia.largura * 0.405,
    praia.areiaInicio + 12, 0.95
  );

  palmeira(
    b, praia.largura * 0.405,
    praia.areiaInicio + 14, 0.95
  );

  // Guarda-sóis coloridos e espreguiçadeiras.
  const guardaSois = [
    { x: -0.23, z: praia.areiaInicio + 20, cor: '#E47D55' },
    { x:  0.23, z: praia.areiaInicio + 22, cor: '#82CFC9' },
    { x: -0.13, z: praia.areiaInicio + 43, cor: '#F0BD50' },
    { x:  0.13, z: praia.areiaInicio + 45, cor: '#A9A0D8' }
  ];

  guardaSois.forEach((item, i) => {
    const x = item.x * praia.largura;

    criarSombrilla(
      b, x, item.z, item.cor,
      i % 2 === 0 ? 1 : 0.92
    );

    criarEspreguicadeira(
      b,
      x + (x < 0 ? 3 : -3),
      item.z + 4.2,
      i % 2 === 0 ? '#80CFD0' : '#E7A5A2'
    );
  });

  // Quiosque pequeno, mantendo o estilo dos outros prédios.
  criarQuiosquePraia(
    b,
    -praia.largura * 0.34,
    praia.areiaInicio + 34
  );

  // Pequenas conchas e pedrinhas perto da água.
  const conchas = [
    '#F28FAD', '#F7D14C', '#FFFFFF',
    '#E86F6F', '#8BD4D2'
  ];

  for (let i = 0; i < 24; i++) {
    const x =
      (rand2(i + 2, 19.7) - 0.5) *
      praia.largura * 0.82;

    const z =
      praia.costaZ - 8 -
      rand2(i + 6.2, 7.4) * 12;

    if (Math.abs(x) < 4) continue;

    b.caixa(
      0.22 + rand2(i, 20) * 0.18,
      0.055,
      0.16,
      pick(conchas, Math.floor(rand2(i, 21) * conchas.length)),
      x, 0.12, z
    );
  }
}

/* ============================================================
   MAR ANIMADO — ondas e espuma que acompanha a maré
   ============================================================ */
function construirMar(praia) {
  praiaAtual = praia;

  const segmentosX = Math.max(
    40,
    Math.min(60, Math.ceil(praia.larguraMar / 7))
  );

  const geometria = new THREE.PlaneGeometry(
    praia.larguraMar,
    praia.profundidadeMar,
    segmentosX,
    44
  );

  const pos = geometria.attributes.position;

  // Curva a borda da água para acompanhar os recortes da areia.
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);

    pos.setY(
      i,
      pos.getY(i) - (costaEm(x, praia) - praia.costaZ)
    );
  }

  geometria.rotateX(-Math.PI / 2);
  geometria.computeVertexNormals();

  aguaMar = new THREE.Mesh(
    geometria,
    mat(PAL.mar, {
      roughness: 0.28,
      metalness: 0,
      flatShading: true
    })
  );

  aguaMar.position.set(
    0,
    0.035,
    praia.inicioMar + praia.profundidadeMar / 2
  );

  // Guarda a altura original de cada vértice para animar sem acumular erros.
  const vertices = geometria.attributes.position;
  const alturasBase = new Float32Array(vertices.count);

  for (let i = 0; i < vertices.count; i++) {
    alturasBase[i] = vertices.getY(i);
  }

  aguaMar.userData.alturasBase = alturasBase;
  aguaMar.frustumCulled = false;
  aguaMar.castShadow = false;
  aguaMar.receiveShadow = false;

  grupoCidade.add(aguaMar);

  // Espuma em fragmentos para a onda não parecer uma linha reta.
  ondasEspuma = [];

  const materialEspuma = mat(PAL.espuma, {
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    roughness: 1
  });

  const total = Math.max(
    28,
    Math.min(100, Math.ceil(praia.largura / 8))
  );

  for (let i = 0; i < total; i++) {
    const x =
      -praia.largura / 2 +
      (i + 0.5) * praia.largura / total;

    const largura = praia.largura / total;
    const w = largura * (0.48 + rand2(i, 23) * 0.42);
    const d = 0.32 + rand2(i, 25) * 0.65;

    const malha = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.035, d),
      materialEspuma
    );

    const fase = rand2(i, 8) * Math.PI * 2;
    const deslocamento = (rand2(i, 11) - 0.5) * 2.4;

    malha.position.set(
      x,
      0.12,
      costaEm(x, praia) - 6 + deslocamento
    );

    malha.castShadow = false;
    malha.receiveShadow = false;
    malha.renderOrder = 2;

    grupoCidade.add(malha);
    ondasEspuma.push({ malha, x, fase, deslocamento });
  }
}

/* ============================================================
   FAUNA MARINHA — aparições e comportamentos
   ============================================================ */

function pecaFauna(parent, geometria, cor, x, y, z, sx, sy, sz, rz = 0) {
  const mesh = new THREE.Mesh(
    geometria,
    mat(cor, { roughness: 0.88, metalness: 0, flatShading: true })
  );

  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  mesh.rotation.z = rz;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  parent.add(mesh);

  return mesh;
}

function corpoFauna(parent, cor, x, y, z, sx, sy, sz, detalhe = 0) {
  return pecaFauna(
    parent,
    new THREE.IcosahedronGeometry(1, detalhe),
    cor, x, y, z, sx, sy, sz
  );
}

/* ---------------- GOLFINHO ---------------- */

function criarGolfinho() {
  const g = new THREE.Group();

  corpoFauna(g, '#657F91', 0, 0, 0, 1.9, 0.67, 0.58, 1);
  corpoFauna(g, '#E9E4D4', 0.25, -0.37, 0, 1.35, 0.22, 0.38);
  corpoFauna(g, '#718F9D', 1.55, -0.09, 0, 0.66, 0.28, 0.34);

  pecaFauna(
    g, new THREE.ConeGeometry(0.43, 0.86, 3),
    '#506879', -0.12, 0.65, 0, 0.72, 0.85, 0.5, -0.16
  );

  const cauda = new THREE.Group();
  cauda.position.set(-1.72, 0.04, 0);

  pecaFauna(
    cauda, new THREE.ConeGeometry(0.38, 0.9, 3),
    '#506879', -0.22, 0.12, -0.18,
    0.65, 0.78, 0.4, Math.PI / 2
  );

  pecaFauna(
    cauda, new THREE.ConeGeometry(0.38, 0.9, 3),
    '#506879', -0.22, -0.12, 0.18,
    0.65, 0.78, 0.4, Math.PI / 2
  );

  g.add(cauda);
  g.userData.cauda = cauda;

  [-1, 1].forEach(lado => {
    corpoFauna(
      g, '#192C3D', 1.04, 0.13, lado * 0.48,
      0.10, 0.10, 0.07
    );

    corpoFauna(
      g, '#F7F1DE', 1.08, 0.16, lado * 0.535,
      0.035, 0.035, 0.025
    );
  });

  return g;
}

/* ---------------- TARTARUGA ---------------- */

function criarTartaruga() {
  const g = new THREE.Group();

  corpoFauna(g, '#5D9B69', 0, -0.12, 0, 1.20, 0.28, 0.78, 1);
  corpoFauna(g, '#927650', -0.08, 0.20, 0, 1.02, 0.56, 0.75, 1);
  corpoFauna(g, '#B8A176', -0.10, 0.49, 0, 0.76, 0.10, 0.55);
  corpoFauna(g, '#70AE75', 1.16, 0.02, 0, 0.50, 0.28, 0.30, 1);

  const patas = [];

  [
    [-0.72, -0.18, -0.64],
    [ 0.72, -0.18, -0.64],
    [-0.72, -0.18,  0.64],
    [ 0.72, -0.18,  0.64]
  ].forEach(p => {
    patas.push(
      corpoFauna(
        g, '#70AE75', p[0], p[1], p[2],
        0.46, 0.13, 0.23
      )
    );
  });

  [-1, 1].forEach(lado => {
    corpoFauna(
      g, '#172E2C', 1.32, 0.12, lado * 0.21,
      0.07, 0.07, 0.05
    );
  });

  g.userData.patas = patas;
  return g;
}

/* ---------------- BALEIA ---------------- */

function criarBaleia() {
  const g = new THREE.Group();

  corpoFauna(g, '#65727B', 0, 0, 0, 3.55, 1.08, 1.12, 1);
  corpoFauna(g, '#D9D7C9', 0.36, -0.67, 0, 2.40, 0.34, 0.78, 1);
  corpoFauna(g, '#727E84', 2.90, -0.15, 0, 0.78, 0.43, 0.65);

  pecaFauna(
    g, new THREE.ConeGeometry(0.42, 0.82, 3),
    '#4E5C67', -0.85, 1.00, 0, 0.78, 0.72, 0.5
  );

  const cauda = new THREE.Group();
  cauda.position.set(-3.2, 0.24, 0);

  pecaFauna(
    cauda, new THREE.ConeGeometry(0.55, 1.4, 3),
    '#4E5C67', -0.35, 0.17, -0.30,
    0.8, 0.75, 0.55, Math.PI / 2
  );

  pecaFauna(
    cauda, new THREE.ConeGeometry(0.55, 1.4, 3),
    '#4E5C67', -0.35, -0.17, 0.30,
    0.8, 0.75, 0.55, Math.PI / 2
  );

  g.add(cauda);
  g.userData.cauda = cauda;

  const jato = new THREE.Group();

  pecaFauna(
    jato, new THREE.ConeGeometry(0.18, 0.72, 5),
    '#C0E8E8', 0, 0.34, 0, 0.62, 1, 0.62
  );

  pecaFauna(
    jato, new THREE.ConeGeometry(0.12, 0.42, 5),
    '#E3F4E9', 0.22, 0.54, 0.08, 0.58, 0.88, 0.58
  );

  jato.position.set(0.50, 0.95, 0);
  g.add(jato);
  g.userData.jato = jato;

  return g;
}

/* ---------------- PEIXES ---------------- */

function criarPeixe(cor) {
  const g = new THREE.Group();

  corpoFauna(g, cor, 0, 0, 0, 0.55, 0.25, 0.28);
  corpoFauna(g, '#EDE5D0', 0.08, -0.09, 0, 0.28, 0.065, 0.18);

  const cauda = new THREE.Group();
  cauda.position.x = -0.46;

  pecaFauna(
    cauda, new THREE.ConeGeometry(0.27, 0.58, 3),
    cor, -0.18, 0, 0, 0.7, 0.7, 0.62, Math.PI / 2
  );

  g.add(cauda);
  g.userData.cauda = cauda;

  corpoFauna(g, '#192B35', 0.32, 0.07, 0.21, 0.05, 0.05, 0.03);

  return g;
}

/* ---------------- GRUPOS DE ANIMAIS ---------------- */

function criarGrupoDaEspecie(tipo) {
  const grupo = new THREE.Group();
  const animais = [];

  if (tipo === 'cardume') {
    const cores = [
      '#E58A58', '#8CABC0', '#E7C36B',
      '#698E9B', '#D5A1A4'
    ];

    for (let i = 0; i < 7; i++) {
      const peixe = criarPeixe(cores[i % cores.length]);

      peixe.position.set(
        -i * 1.25 + (i % 2) * 0.45,
        (i % 3) * 0.16,
        (i % 2 ? 1 : -1) * (0.8 + (i % 3) * 0.4)
      );

      grupo.add(peixe);

      animais.push({
        objeto: peixe,
        tipo: 'peixe',
        fase: i * 0.8,
        yBase: peixe.position.y
      });
    }
  } else if (tipo === 'golfinhos') {
    for (let i = 0; i < 3; i++) {
      const delfim = criarGolfinho();

      delfim.scale.setScalar(i === 0 ? 0.88 : 0.67);
      delfim.position.set(-i * 4.7, -i * 0.10, (i - 1) * 2);

      grupo.add(delfim);

      animais.push({
        objeto: delfim,
        tipo: 'golfinho',
        fase: i * 1.7,
        yBase: delfim.position.y
      });
    }
  } else if (tipo === 'tartaruga') {
    const tartaruga = criarTartaruga();

    grupo.add(tartaruga);

    animais.push({
      objeto: tartaruga,
      tipo: 'tartaruga',
      fase: 1.2,
      yBase: 0
    });
  } else {
    const baleia = criarBaleia();

    baleia.scale.setScalar(1.15);
    grupo.add(baleia);

    animais.push({
      objeto: baleia,
      tipo: 'baleia',
      fase: 2.3,
      yBase: 0
    });
  }

  grupo.userData.animais = animais;
  return grupo;
}

/* ---------------- REGRAS DA CIDADE ---------------- */

// O horário influencia as probabilidades.
// A mesma espécie não é sorteada em duas aparições seguidas.
function escolherEspecieMarinha() {
  const hora = new Date().getHours();
  const dia = hora >= 7 && hora < 18;

  const opcoes = [
    { tipo: 'cardume', peso: 4 },
    { tipo: 'golfinhos', peso: dia ? 4 : 2 },
    { tipo: 'tartaruga', peso: dia ? 2.5 : 1 },
    { tipo: 'baleia', peso: dia ? 0.7 : 1.5 }
  ].filter(o => o.tipo !== ultimaEspecieVista);

  const total = opcoes.reduce((s, o) => s + o.peso, 0);
  let sorteio = Math.random() * total;

  for (const opcao of opcoes) {
    sorteio -= opcao.peso;
    if (sorteio <= 0) return opcao.tipo;
  }

  return opcoes[0].tipo;
}

function mostrarAvistamentoMarinho(texto) {
  const aviso = $('c3sighting');
  if (!aviso) return;

  aviso.textContent = texto;
  aviso.hidden = false;

  clearTimeout(avisoFaunaTimer);

  avisoFaunaTimer = setTimeout(() => {
    aviso.hidden = true;
  }, 4300);
}

function iniciarFaunaMarinha(praia) {
  grupoFaunaMarinha = new THREE.Group();
  grupoCidade.add(grupoFaunaMarinha);

  aparicaoFaunaMarinha = null;

  // A primeira aparição ocorre pouco depois de abrir a cidade.
  proximaAparicaoFauna =
    (relogio ? relogio.elapsedTime : 0) + 8 + Math.random() * 12;

  praiaAtual = praia;
}

function comecarAvistamentoMarinho(tempo) {
  if (!grupoFaunaMarinha || !praiaAtual || aparicaoFaunaMarinha) return;

  const tipo = escolherEspecieMarinha();
  const direcao = Math.random() < 0.5 ? 1 : -1;
  const lado = praiaAtual.largura * 0.34;

  const xInicio = direcao > 0 ? -lado : lado;
  const xFim = -xInicio;
  const centroX = (xInicio + xFim) / 2;

  const distanciaCosta =
    tipo === 'baleia' ? 54 :
    tipo === 'tartaruga' ? 8 : 24;

  const zBase = costaEm(centroX, praiaAtual) + distanciaCosta;
  const grupo = criarGrupoDaEspecie(tipo);

  grupo.position.set(
    xInicio,
    tipo === 'baleia' ? 0.86 :
      tipo === 'tartaruga' ? 0.34 :
      tipo === 'cardume' ? 0.50 : 0.72,
    zBase
  );

  grupo.rotation.y = direcao < 0 ? Math.PI : 0;
  grupo.scale.setScalar(0.02);

  grupoFaunaMarinha.add(grupo);

  const duracao =
    tipo === 'cardume' ? 17 :
    tipo === 'golfinhos' ? 21 :
    tipo === 'tartaruga' ? 30 : 25;

  const mensagens = {
    cardume: '🐟 Um cardume de peixes saltou perto da praia!',
    golfinhos: '🐬 Golfinhos apareceram brincando no mar!',
    tartaruga: '🐢 Uma tartaruga marinha passou perto da areia!',
    baleia: '🐋 Uma baleia surgiu ao longe na costa!'
  };

  ultimaEspecieVista = tipo;
  mostrarAvistamentoMarinho(mensagens[tipo]);

  aparicaoFaunaMarinha = {
    grupo,
    tipo,
    inicio: tempo,
    duracao,
    xInicio,
    xFim,
    zBase,
    fase: Math.random() * Math.PI * 2
  };
}

function atualizarFaunaMarinha(tempo) {
  if (!grupoFaunaMarinha || !praiaAtual) return;

  if (!aparicaoFaunaMarinha && tempo >= proximaAparicaoFauna) {
    comecarAvistamentoMarinho(tempo);
  }

  const a = aparicaoFaunaMarinha;
  if (!a) return;

  const progresso = (tempo - a.inicio) / a.duracao;

  if (progresso >= 1) {
    grupoFaunaMarinha.remove(a.grupo);

    a.grupo.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
    });

    aparicaoFaunaMarinha = null;
    proximaAparicaoFauna = tempo + 38 + Math.random() * 42;
    return;
  }

  const p = limitar(progresso, 0, 1);

  // Os animais entram e saem suavemente do cenário.
  const escala =
    suavizar(Math.min(1, p * 5)) *
    suavizar(Math.min(1, (1 - p) * 5));

  a.grupo.scale.setScalar(escala);
  a.grupo.position.x = a.xInicio + (a.xFim - a.xInicio) * p;
  a.grupo.position.z =
    a.zBase + Math.sin(tempo * 0.55 + a.fase) * 2.2;

  if (a.tipo === 'golfinhos') {
    a.grupo.position.y =
      0.72 + Math.sin(tempo * 1.5 + a.fase) * 0.10;
  } else if (a.tipo === 'cardume') {
    a.grupo.position.y =
      0.42 + Math.sin(tempo * 1.3 + a.fase) * 0.08;
  } else if (a.tipo === 'tartaruga') {
    a.grupo.position.y =
      0.34 + Math.sin(tempo * 0.9 + a.fase) * 0.04;
  } else {
    a.grupo.position.y =
      0.78 + Math.sin(tempo * 0.65 + a.fase) * 0.18;
  }

  (a.grupo.userData.animais || []).forEach(animal => {
    const obj = animal.objeto;

    if (animal.tipo === 'golfinho') {
      obj.position.y =
        animal.yBase +
        Math.max(0, Math.sin(tempo * 1.65 + animal.fase)) * 1.12;

      obj.rotation.z =
        Math.sin(tempo * 2.4 + animal.fase) * 0.08;

      if (obj.userData.cauda) {
        obj.userData.cauda.rotation.y =
          Math.sin(tempo * 7 + animal.fase) * 0.36;
      }
    } else if (animal.tipo === 'peixe') {
      obj.position.y =
        animal.yBase +
        Math.max(0, Math.sin(tempo * 3.1 + animal.fase)) * 0.34;

      if (obj.userData.cauda) {
        obj.userData.cauda.rotation.y =
          Math.sin(tempo * 8 + animal.fase) * 0.42;
      }
    } else if (animal.tipo === 'tartaruga') {
      (obj.userData.patas || []).forEach((pata, i) => {
        pata.rotation.x =
          Math.sin(tempo * 2.1 + animal.fase + i) * 0.22;
      });

      obj.rotation.z =
        Math.sin(tempo * 0.7 + animal.fase) * 0.035;
    } else if (animal.tipo === 'baleia') {
      if (obj.userData.cauda) {
        obj.userData.cauda.rotation.y =
          Math.sin(tempo * 1.8 + animal.fase) * 0.22;
      }

      if (obj.userData.jato) {
        const ciclo =
          Math.max(0, Math.sin(tempo * 1.5 + animal.fase));

        obj.userData.jato.scale.setScalar(0.25 + ciclo * 0.9);
      }
    }
  });
}
   
  function criarFonte() {
    const g = new THREE.Group();

    const anel = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.06, 8), mat('#E3D9BC'));
    anel.position.y = 0.11;
    anel.receiveShadow = true;
    g.add(anel);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.55, 0.5, 8), mat('#DCD1B8'));
    base.position.y = 0.33;
    base.castShadow = true; base.receiveShadow = true;
    g.add(base);

    const agua = new THREE.Mesh(
      new THREE.CylinderGeometry(1.85, 1.85, 0.1, 8),
      mat('#7CC8D4', { roughness: 0.3 })
    );
    agua.position.y = 0.6;
    g.add(agua);

    const pilar = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 0.9, 8), mat('#E8DEC6'));
    pilar.position.y = 1.05;
    pilar.castShadow = true;
    g.add(pilar);

    const jato = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 0.9, 6),
      mat('#B4E4EC', { transparent: true, opacity: 0.85 })
    );
    jatoBaseY = 1.95;
    jato.position.y = jatoBaseY;
    g.add(jato);
    jatoFonte = jato;

    grupoCidade.add(g);
  }

  /* ============================================================
     TERRENO FACETADO (referência 2)
     Plano no centro, colinas e montanhas ao redor.
     Triângulos irregulares, cada um com sua cor.
     ============================================================ */
  function criarTerreno(extent) {
    const margem = Math.max(900, extent * 3.8);
    const lado = (extent + margem) * 2;
    const segmentos = Math.min(132, Math.max(84, Math.ceil(lado / 18)));
    const celula = lado / segmentos;

    const geo = new THREE.PlaneGeometry(lado, lado, segmentos, segmentos).toNonIndexed();
    const pos = geo.attributes.position;
    const limite = lado / 2 - 0.01;

    // Tira a regularidade da grade: triângulos de tamanhos variados
    for (let i = 0; i < pos.count; i++) {
      const x0 = pos.getX(i), y0 = pos.getY(i);
      if (Math.abs(x0) < limite && Math.abs(y0) < limite) {
        pos.setX(i, x0 + (rand2(x0, y0) - 0.5) * celula * 0.6);
        pos.setY(i, y0 + (rand2(y0 + 17.3, x0 - 9.1) - 0.5) * celula * 0.6);
      }
    }

    const larguraTransicao = Math.max(210, extent * 0.48);
    const deslocamento = Math.max(175, extent * 0.22);
    const raioMorro = Math.max(145, extent * 0.24);
    const escalaAltura = Math.max(1, extent / 330);
    const praia = parametrosPraia(extent);
     
    const picos = [
      [ extent + deslocamento, -extent * 0.14, 52],
      [-extent - deslocamento,  extent * 0.10, 60],
      [ extent * 0.12, extent + deslocamento, 48],
      [-extent * 0.10, -extent - deslocamento, 54],
      [ extent + deslocamento * 1.30,  extent + deslocamento * 1.16, 38],
      [-extent - deslocamento * 1.24, -extent - deslocamento * 1.12, 32]
    ];

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = -pos.getY(i);
      const borda = Math.max(Math.abs(x), Math.abs(z));

      let t = (borda - (extent + 12)) / larguraTransicao;
      t = limitar(t, 0, 1);
      const suave = t * t * (3 - 2 * t);

      const ondas =
        Math.sin(x * 0.013 + Math.sin(z * 0.009) * 1.7) * 0.50 +
        Math.cos(z * 0.019 - x * 0.011) * 0.32 +
        Math.sin((x + z) * 0.033) * 0.18;

      let morros = 0;
      for (const [hx, hz, altura] of picos) {
        const dx = x - hx, dz = z - hz;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const infl = Math.max(0, 1 - dist / (raioMorro * 1.55));
        morros += altura * infl * infl * escalaAltura;
      }

      const alturaNatural = suave * (4 + ondas * 13 + morros);

const faixaZ =
  suavizar((z - (extent - 14)) / 22) *
  (1 - suavizar((z - (praia.fimMar - 18)) / 68));

const faixaX =
  1 - suavizar(
    (Math.abs(x) - praia.larguraMar / 2 + 8) / 78
  );

const aplainar = limitar(faixaZ * faixaX, 0, 1);

// Mantém o terreno plano sob a faixa de areia e sob o mar.
pos.setZ(
  i,
  alturaNatural * (1 - aplainar) + 0.12 * aplainar
);
    }

    geo.computeVertexNormals();
    const nor = geo.attributes.normal;
    const cores = new Float32Array(pos.count * 3);
    const c = new THREE.Color(), tmp = new THREE.Color();

    for (let i = 0; i < pos.count; i += 3) {
      const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
      const cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
      const alt = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
      const inclinacao = 1 - nor.getZ(i);
      const sorteio = rand2(cx * 0.071, cy * 0.053);

      c.set(VERDES_TERRENO[Math.floor(sorteio * VERDES_TERRENO.length) % VERDES_TERRENO.length]);

      // Encostas ficam verde-azulado escuro, como nas sombras da referência
      if (inclinacao > 0.1) {
        tmp.set('#3E9E78');
        c.lerp(tmp, Math.min(1, (inclinacao - 0.1) / 0.22) * 0.9);
      }
      // Rocha cinza nos picos íngremes
      if (alt > 16 && inclinacao > 0.14 && sorteio > 0.4) {
        tmp.set(PEDRAS_TERRENO[Math.floor(sorteio * 97) % PEDRAS_TERRENO.length]);
        c.lerp(tmp, Math.min(1, (alt - 16) / 22));
      }
const zCentro = -cy;

if (
  Math.abs(cx) <= praia.largura / 2 &&
  zCentro >= praia.areiaInicio &&
  zCentro <= costaEm(cx, praia)
) {
  c.set(
    sorteio > 0.48 ? PAL.areia : PAL.areiaClara
  );
} else if (
  Math.abs(cx) <= praia.larguraMar / 2 &&
  zCentro >= costaEm(cx, praia) - 12 &&
  zCentro <= praia.fimMar + 8
) {
  c.set(PAL.marProfundo);
}

       
      for (let j = 0; j < 3; j++) {
        const k = (i + j) * 3;
        cores[k] = c.r; cores[k + 1] = c.g; cores[k + 2] = c.b;
      }
    }

    geo.setAttribute('color', new THREE.BufferAttribute(cores, 3));
    geo.computeBoundingSphere();

    const terreno = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({
        vertexColors: true, flatShading: true, roughness: 1, metalness: 0
      })
    );
    terreno.rotation.x = -Math.PI / 2;
    terreno.position.y = -0.12;
    terreno.receiveShadow = true;
    return terreno;
  }

  function garantirTerreno(extent) {
    if (terrenoMesh && terrenoExtent === extent) return;
    if (terrenoMesh) {
      scene.remove(terrenoMesh);
      terrenoMesh.geometry.dispose();
      terrenoMesh.material.dispose();
    }
    terrenoMesh = criarTerreno(extent);
    terrenoExtent = extent;
    scene.add(terrenoMesh);
  }

  /* ============================================================
     CÉU E NUVENS
     ============================================================ */
  function criarCeu() {
    const material = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        cTopo: { value: new THREE.Color(CEU.topo) },
        cMeio: { value: new THREE.Color(CEU.meio) },
        cHor:  { value: new THREE.Color(CEU.horizonte) }
      },
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 cTopo; uniform vec3 cMeio; uniform vec3 cHor;
        varying vec3 vDir;
        void main() {
          float t = clamp(normalize(vDir).y, 0.0, 1.0);
          vec3 c = mix(cHor, cMeio, smoothstep(0.0, 0.18, t));
          c = mix(c, cTopo, smoothstep(0.12, 0.75, t));
          gl_FragColor = vec4(c, 1.0);
        }`
    });
    ceu = new THREE.Mesh(new THREE.SphereGeometry(1800, 24, 14), material);
    ceu.renderOrder = -10;
    ceu.frustumCulled = false;
    scene.add(ceu);
  }

  function criarNuvens() {
    grupoNuvens = new THREE.Group();
    const geo = new THREE.IcosahedronGeometry(1, 0);
    const material = new THREE.MeshStandardMaterial({
      color: '#FFFFFF', roughness: 1, flatShading: true,
      emissive: '#FFFFFF', emissiveIntensity: 0.35, fog: false
    });

    for (let i = 0; i < 16; i++) {
      const nuvem = new THREE.Group();
      const puffs = 3 + Math.floor(rand2(i, 4.2) * 3);
      for (let p = 0; p < puffs; p++) {
        const m = new THREE.Mesh(geo, material);
        m.scale.set(
          5 + rand2(i, p) * 5,
          2.2 + rand2(p, i + 2) * 1.6,
          4 + rand2(i + 5, p) * 3
        );
        m.position.set((p - puffs / 2) * 5.2, rand2(p + 3, i) * 1.4, (rand2(i, p + 9) - 0.5) * 3);
        nuvem.add(m);
      }
      const ang = rand2(i, 77) * Math.PI * 2;
      const dist = 250 + rand2(i, 31) * 600;
      nuvem.position.set(Math.cos(ang) * dist, 95 + rand2(i, 13) * 110, Math.sin(ang) * dist);
      nuvem.rotation.y = rand2(i, 5) * Math.PI;
      nuvem.userData.vel = 1.6 + rand2(i, 88) * 2.2;
      grupoNuvens.add(nuvem);
    }
    scene.add(grupoNuvens);
  }

  /* ============================================================
     CONSTRUÇÃO DA CIDADE
     ============================================================ */
  function gerarBlocos(quantidade) {
    const coords = [[0, 0]];
    for (let camada = 1; coords.length < quantidade; camada++) {
      for (let x = -camada; x < camada; x++) coords.push([x, -camada]);
      for (let z = -camada; z < camada; z++) coords.push([camada, z]);
      for (let x = camada; x > -camada; x--) coords.push([x, camada]);
      for (let z = camada; z > -camada; z--) coords.push([-camada, z]);
    }
    return coords.slice(0, quantidade);
  }

  function ordenarCasas(lista) {
    return lista.slice().sort((a, b) => {
      const ta = Number(a.criadaEm || a.atualizadoEm || 0);
      const tb = Number(b.criadaEm || b.atualizadoEm || 0);
      return ta - tb || String(a.id || '').localeCompare(String(b.id || ''));
    });
  }

  function limparCidade() {
    while (grupoCidade.children.length) {
      const obj = grupoCidade.children[0];
      grupoCidade.remove(obj);
      obj.traverse(item => {
        if (item.geometry) item.geometry.dispose();
        if (item.material) {
          const materiais = Array.isArray(item.material) ? item.material : [item.material];
          materiais.forEach(m => {
            if (m.userData && m.userData.shared) return;
            if (m.map) m.map.dispose();
            m.dispose();
          });
        }
      });
    }
    casasRenderizadas = [];
jatoFonte = null;
aguaMar = null;
ondasEspuma = [];
praiaAtual = null;

grupoFaunaMarinha = null;
aparicaoFaunaMarinha = null;
proximaAparicaoFauna = 0;

clearTimeout(avisoFaunaTimer);

const avisoFauna = $('c3sighting');
if (avisoFauna) avisoFauna.hidden = true;
  }

  function construirCidade(lista, recentralizar = false) {
    if (!scene || !grupoCidade) return;

    limparCidade();
    const casas = ordenarCasas(lista);
    const blocosPorCasa = Math.max(1, Math.ceil(casas.length / CASAS_POR_QUARTEIRAO));
    const coords = gerarBlocos(blocosPorCasa + 1);
    let raio = 1;
    for (let i = 1; i < coords.length; i++) {
      raio = Math.max(raio, Math.abs(coords[i][0]), Math.abs(coords[i][1]));
    }

    raioAtual = Math.max(1, raio);
    const extent = (raioAtual + 1.2) * BLOCO;
    const praia = parametrosPraia(extent);
     
    // Névoa acompanha o tamanho da cidade
    if (scene.fog) {
      scene.fog.near = Math.max(180, extent * 1.25);
      scene.fog.far = Math.max(800, extent * 5);
    }

    garantirTerreno(extent);

    // Tudo que é estático (ruas, gramados, praça, árvores) vira UMA malha só
    const b = new Mesclador();
    coords.forEach(c => gramado(b, c[0], c[1]));
    criarRuas(b, raioAtual, extent);
criarPraca(b);
criarPraia(b, praia, extent);

    const blocosUsados = new Set();
    casas.forEach((c, i) => blocosUsados.add(Math.floor(i / CASAS_POR_QUARTEIRAO) + 1));
    blocosUsados.forEach(indice => {
      const bl = coords[indice] || [0, 0];
      const cx = bl[0] * BLOCO, cz = bl[1] * BLOCO;
      patio(b, cx, cz);
      arvore(b, cx - 10.2, cz - 10.2, 0.7);
      arvore(b, cx + 10.2, cz + 10.2, 0.62);
    });

    grupoCidade.add(b.construir());
criarFonte();
construirMar(praia);
iniciarFaunaMarinha(praia);
     
    casas.forEach((casa, i) => {
      const bloco = coords[Math.floor(i / CASAS_POR_QUARTEIRAO) + 1] || [0, 0];
      const off = OFFSETS_CASA[i % CASAS_POR_QUARTEIRAO];
      criarCasa(casa, bloco[0] * BLOCO + off[0], bloco[1] * BLOCO + off[1], i);
    });

    if (luzSol) {
      const span = (raioAtual + 1.4) * BLOCO * 1.35; // folga para as diagonais
      luzSol.shadow.camera.left = -span;
      luzSol.shadow.camera.right = span;
      luzSol.shadow.camera.top = span;
      luzSol.shadow.camera.bottom = -span;
      luzSol.shadow.camera.far = span * 3 + 220;
      luzSol.shadow.camera.updateProjectionMatrix();
    }

    const contador = $('c3count');
    if (contador) contador.textContent = casas.length + (casas.length === 1 ? ' casa registrada' : ' casas registradas');
    const estado = $('c3status');
    if (estado) estado.textContent = houvePrimeiraLeitura ? 'Cidade sincronizada' : 'Conectando ao Firebase…';

    ajustarCamera(recentralizar || !camera.userData || !camera.userData.posicionada);
  }

  /* ============================================================
     CÂMERA, CLIQUE, REDIMENSIONAMENTO
     ============================================================ */
  function ajustarCamera(resetar = false) {
    if (!camera || !controls) return;

    // FOV baixo + distância maior = visual isométrico, como na referência
    const distancia = Math.max(80, (raioAtual + 1.1) * BLOCO * 1.48 * 1.32);
    controls.minDistance = 25;
    controls.maxDistance = Math.max(160, distancia * 2.8);

    if (resetar || !camera.userData || !camera.userData.posicionada) {
      camera.position.set(distancia * 0.85, distancia * 0.82, distancia * 0.92);
      controls.target.set(0, 0.6, 0);
      camera.userData = camera.userData || {};
      camera.userData.posicionada = true;
      controls.update();
    }
  }

  function limitarAlvo() {
    if (!controls) return;
    const lim = (raioAtual + 1.5) * BLOCO;
    controls.target.x = limitar(controls.target.x, -lim, lim);
    controls.target.z = limitar(controls.target.z, -lim, lim);
    controls.target.y = limitar(controls.target.y, 0, 40);
  }

  function abrirInfoCasa(evento) {
    if (!renderer || !camera) return;

    const rect = renderer.domElement.getBoundingClientRect();
    const ponto = new THREE.Vector2(
      ((evento.clientX - rect.left) / rect.width) * 2 - 1,
      -((evento.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raio = new THREE.Raycaster();
    raio.setFromCamera(ponto, camera);
    const intersecoes = raio.intersectObjects(casasRenderizadas, true);
    if (!intersecoes.length) return;

    let obj = intersecoes[0].object;
    while (obj && !obj.userData.imovel) obj = obj.parent;
    if (!obj) return;

    const dados = obj.userData.imovel;
    const painel = $('c3info');
    if (!painel) return;

    $('c3infonome').textContent = dados.nome || 'Casa da Nebo';
    $('c3infotipo').textContent = 'Residência, ' + (dados.pers || 'personalidade não informada');
    painel.hidden = false;
  }

  function ajustarTamanho() {
    if (!renderer || !camera) return;
    const area = $('c3canvas');
    if (!area) return;
    const w = area.clientWidth || window.innerWidth;
    const h = area.clientHeight || window.innerHeight;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function mostrarErro(texto) {
    const status = $('c3status');
    if (status) status.textContent = texto;
  }

  /* ============================================================
     CENA, LUZES E LOOP
     ============================================================ */
  function quadro() {
  const dt = Math.min(0.05, relogio.getDelta());
  const t = relogio.elapsedTime;

  if (controls) {
    controls.update();
    limitarAlvo();
  }

  if (ceu) ceu.position.copy(camera.position);

  if (grupoNuvens) {
    grupoNuvens.children.forEach(n => {
      n.position.x += n.userData.vel * dt;
      if (n.position.x > 900) n.position.x = -900;
    });
  }

  if (jatoFonte) {
    const s = 1 + 0.18 * Math.sin(t * 3);
    jatoFonte.scale.y = s;
    jatoFonte.position.y = jatoBaseY + (s - 1) * 0.45;
  }

  // Maré independente da fonte da praça.
  if (aguaMar && praiaAtual) {
    const pos = aguaMar.geometry.attributes.position;
    const base = aguaMar.userData.alturasBase;

    aguaMar.position.y =
      0.035 + Math.sin(t * 0.32) * 0.025;

    for (let i = 0; i < pos.count; i++) {
      pos.setY(
        i,
        base[i] + alturaOnda(
          pos.getX(i),
          pos.getZ(i),
          t
        )
      );
    }

    pos.needsUpdate = true;
    aguaMar.geometry.computeVertexNormals();

    ondasEspuma.forEach(o => {
      const balanco = Math.sin(t * 0.62 + o.fase);

      const z = costaEm(o.x, praiaAtual) - 6
        + balanco * 5.8
        + o.deslocamento;

      o.malha.position.z = z;

      o.malha.position.y =
        aguaMar.position.y +
        alturaOnda(
          o.x,
          z - aguaMar.position.z,
          t
        ) +
        0.035;
    });
  }

  // Atualiza os avistamentos da fauna marinha.
  atualizarFaunaMarinha(t);

  renderer.render(scene, camera);
}
  function rodar() {
    if (!renderer) return;
    if (!relogio) relogio = new THREE.Clock();
    renderer.setAnimationLoop(quadro);
  }

  function montarCena() {
    if (iniciado || !window.THREE || !THREE.OrbitControls) return;
    const area = $('c3canvas');
    if (!area) return;

    iniciado = true;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(COR_NEVOA);
    scene.fog = new THREE.Fog(COR_NEVOA, 180, 800);

    camera = new THREE.PerspectiveCamera(30, 1, 1, 4000);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, ehCelular() ? 1.5 : 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Sem tone mapping: as cores da paleta aparecem como foram escolhidas
    renderer.toneMapping = THREE.NoToneMapping;
    // No three r128 (o usado aqui) as cores hex já são tratadas como estão.
    // Só versões novas do three precisam de espaço de cor sRGB explícito.
    if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    }

    area.appendChild(renderer.domElement);
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.maxPolarAngle = Math.PI / 2.08;
    controls.minDistance = 25;
    controls.enablePan = true;
    controls.screenSpacePanning = false;
    controls.target.set(0, 0.6, 0);

    // Luz ambiente suave (céu claro, chão verde) + sol baixo e quente = sombras longas
    scene.add(new THREE.HemisphereLight('#FFF6E0', '#9DBF86', 0.62));

    luzSol = new THREE.DirectionalLight('#FFE6B8', 1.0);
    luzSol.position.set(66, 44, 50);
    luzSol.castShadow = true;
    luzSol.shadow.mapSize.set(ehCelular() ? 2048 : 4096, ehCelular() ? 2048 : 4096);
    luzSol.shadow.bias = -0.0002;
    luzSol.shadow.normalBias = 0.04;
    luzSol.shadow.camera.near = 1;
    luzSol.shadow.camera.far = 450;
    scene.add(luzSol);

    const preenchimento = new THREE.DirectionalLight('#CFE8FF', 0.18);
    preenchimento.position.set(-40, 20, -30);
    scene.add(preenchimento);

    criarCeu();
    criarNuvens();

    grupoCidade = new THREE.Group();
    scene.add(grupoCidade);

    renderer.domElement.addEventListener('click', abrirInfoCasa);
    window.addEventListener('resize', ajustarTamanho);
    ajustarTamanho();

    construirCidade([]);
    rodar();

    conectarFirebase();
  }

  function iniciarThree() {
    if (carregandoThree || renderer) return;
    carregandoThree = true;

    function carregarControles() {
      if (THREE.OrbitControls) {
        montarCena();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
      script.onload = montarCena;
      script.onerror = () => mostrarErro('Falha ao carregar os controles 3D. Verifique a conexão.');
      document.head.appendChild(script);
    }

    if (!window.THREE) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js';
      script.onload = carregarControles;
      script.onerror = () => mostrarErro('Falha ao carregar o motor 3D. Verifique a conexão.');
      document.head.appendChild(script);
    } else carregarControles();
  }

  /* ============================================================
     FIREBASE (sem alterações de comportamento)
     ============================================================ */
  function conectarFirebase() {
    if (firebaseUnsubscribe) return;

    if (!window.firebase || typeof iniciarFirebase !== 'function') {
      mostrarErro('Firebase não está disponível nesta página.');
      return;
    }

    const db = iniciarFirebase();
    if (!db) {
      mostrarErro('Não consegui iniciar o Firebase.');
      return;
    }

    mostrarErro('Conectando ao Firebase…');

    firebaseUnsubscribe = db.collection('nebulas').onSnapshot(snapshot => {
      const casas = [];

      snapshot.forEach(doc => {
        const d = doc.data() || {};
        if (!d.nome || d.modo === 'cidade' || (d.tipoRegistro && d.tipoRegistro !== 'casa')) return;

        casas.push({
          ...d,
          id: d.id || doc.id,
          nome: String(d.nome).slice(0, 22)
        });
      });

      const ordenadas = ordenarCasas(casas);
      const assinatura = ordenadas.map(c =>
        [c.id, c.nome, c.criadaEm || c.atualizadoEm || '', c.pers || ''].join(':')
      ).join('|');

      houvePrimeiraLeitura = true;
      mostrarErro('Cidade sincronizada com Firebase');

      if (assinatura === ultimaAssinatura) return;
      ultimaAssinatura = assinatura;

      const recentralizar = ordenadas.length > 0 && !houveMapaComCasas;
      if (ordenadas.length > 0) houveMapaComCasas = true;
      construirCidade(ordenadas, recentralizar);
    }, erro => {
      console.error('Erro ao sincronizar a Cidade Nebo:', erro);
      mostrarErro('Não foi possível ler as casas. Confira as regras do Firebase.');
    });
  }

  /* ============================================================
     PAINEL (HTML)
     ============================================================ */
  function criarPainel() {
    if ($('cidade3d')) return;

    const el = document.createElement('section');
    el.id = 'cidade3d';
    el.hidden = true;

    el.innerHTML =
      '<div class="c3-top">' +
        '<div class="c3-title">' +
          '<span class="c3-eyebrow">Cidade costeira em expansão</span>' +
          '<strong>Cidade Nebo</strong>' +
          '<span id="c3count">Carregando casas…</span>' +
          '<span id="c3status">Aguardando conexão…</span>' +
        '</div>' +
        '<div class="c3-actions">' +
          '<button id="c3home" type="button">⌖ Centralizar</button>' +
          '<button id="c3close" type="button">← Voltar</button>' +
        '</div>' +
      '</div>' +
      '<div id="c3canvas"></div>' +
       '<div id="c3sighting" class="c3-sighting" hidden aria-live="polite"></div>' +
      '<div class="c3-help">Arraste para explorar a cidade e a praia. A maré se move sozinha; toque em uma casa para conhecê-la.</div>' +
      '<div id="c3info" hidden>' +
        '<button id="c3infoclose" type="button" aria-label="Fechar informações">×</button>' +
        '<span class="c3-info-eyebrow">Casa da Nebo</span>' +
        '<strong id="c3infonome"></strong>' +
        '<span id="c3infotipo"></span>' +
      '</div>';

    document.body.appendChild(el);

    $('c3home').onclick = () => ajustarCamera(true);

    $('c3close').onclick = () => {
      el.hidden = true;
      document.body.classList.remove('modo-cidade');

      if (renderer) renderer.setAnimationLoop(null);
      if (firebaseUnsubscribe) {
        firebaseUnsubscribe();
        firebaseUnsubscribe = null;
      }

      if (typeof window.voltarParaEscolhaDeModo === 'function') {
        window.voltarParaEscolhaDeModo();
      }
    };

    $('c3infoclose').onclick = () => {
      $('c3info').hidden = true;
    };
  }

  function abrirCidade() {
    criarPainel();
    const el = $('cidade3d');
    if (!el) return;

    el.hidden = false;
    document.body.classList.add('modo-cidade');
    iniciarThree();

    if (renderer) {
      ajustarTamanho();
      rodar();
      conectarFirebase();
    }
  }

  window.abrirCidade3D = abrirCidade;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      criarPainel();
      if (typeof S !== 'undefined' && S.modo === 'cidade') abrirCidade();
    }, { once: true });
  } else {
    criarPainel();
    if (typeof S !== 'undefined' && S.modo === 'cidade') abrirCidade();
  }
})();
