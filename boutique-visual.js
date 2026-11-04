/* ============================================================
   NÉBULA — boutique-visual.js
   Carregar DEPOIS de game.js (e dos outros scripts).
   - Acessórios desenhados em SVG (pastel, sem borda branca)
   - Óculos dimensionados em cima dos olhos
   - 3 itens novos: Flor Rosada, Trevo, Galáxia
   Os itens já comprados continuam valendo (mesmas chaves).
   ============================================================ */
(() => {
  /* ---------- utilidades ---------- */
  let _uid = 0;
  const uid = () => 'nb' + (++_uid) + '_';          // ids únicos p/ gradientes
  const svg = (vb, inner) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${inner}</svg>`;
  const rot = (n, fn) =>
    Array.from({ length: n }, (_, i) => fn(i * 360 / n, i)).join('');
  const star4 = (cx, cy, r, c) =>
    `<path d="M${cx} ${cy - r}Q${cx} ${cy} ${cx + r} ${cy}Q${cx} ${cy} ${cx} ${cy + r}Q${cx} ${cy} ${cx - r} ${cy}Q${cx} ${cy} ${cx} ${cy - r}Z" fill="${c}"/>`;
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

  /* ============================================================
     DESENHOS — cabeça
     ============================================================ */

  /* 🌸 Flor (cerejeira) */
  const cerejeira = u => svg('0 0 100 100', `
    <defs><linearGradient id="${u}p" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fde3ea"/><stop offset="1" stop-color="#f48fb1"/>
    </linearGradient></defs>
    <g transform="translate(50 52)">
      ${rot(5, a => `<path transform="rotate(${a})" d="M0 -4C-17 -14 -21 -38 -7 -46Q0 -41 7 -46C21 -38 17 -14 0 -4Z" fill="url(#${u}p)" stroke="#e58aa8" stroke-width="2.4" stroke-linejoin="round"/>`)}
      <circle r="7" fill="#f6dc86" stroke="#e9b95f" stroke-width="1.5"/>
      ${rot(6, a => `<circle transform="rotate(${a + 15})" cy="-12" r="1.8" fill="#e0527f"/>`)}
    </g>`);

  /* 🌺 Hibisco (coral, com estame comprido) */
  const hibisco = u => svg('0 0 100 100', `
    <defs>
      <linearGradient id="${u}h" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffb0bf"/><stop offset="1" stop-color="#ea4c83"/>
      </linearGradient>
      <radialGradient id="${u}t"><stop offset="0" stop-color="#b8205f"/><stop offset="1" stop-color="#b8205f" stop-opacity="0"/></radialGradient>
    </defs>
    <g transform="translate(50 56)">
      ${rot(5, a => `<path transform="rotate(${a})" d="M0 -2C-26 -8 -32 -38 -12 -46Q-4 -40 0 -46Q4 -40 12 -46C32 -38 26 -8 0 -2Z" fill="url(#${u}h)" stroke="#d6386f" stroke-width="2.2" stroke-linejoin="round"/>`)}
      <circle r="15" fill="url(#${u}t)"/>
      <path d="M0 0Q16 -10 24 -30" fill="none" stroke="#f0a23c" stroke-width="3" stroke-linecap="round"/>
      <circle cx="24" cy="-31" r="3.2" fill="#ffd45e"/>
      <circle cx="19" cy="-27" r="2.4" fill="#ffd45e"/>
      <circle cx="28" cy="-25" r="2.4" fill="#ffd45e"/>
    </g>`);

  /* 🌷 Flor Rosada (NOVA — aquarela, estames e brilhinhos) */
  const florRosada = u => {
    const petalas = [[0, 1], [76, .95], [140, 1.05], [218, .97], [290, 1.02]];
    const pontos = [[-6, -30, 1.6], [5, -36, 1.3], [-2, -22, 1.2], [8, -26, 1.5], [-10, -38, 1.2], [2, -44, 1.1]];
    const lens = [20, 26, 17, 24, 19, 27, 22, 25];
    return svg('0 0 100 100', `
    <defs><linearGradient id="${u}p" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fbd9e0"/><stop offset="1" stop-color="#f48aa8"/>
    </linearGradient></defs>
    <g transform="translate(50 52) scale(.92)">
      ${petalas.map(([a, s]) => `
        <g transform="rotate(${a}) scale(${s})">
          <path d="M0 -3C-24 -8 -36 -32 -22 -45C-10 -53 10 -53 22 -45C36 -32 24 -8 0 -3Z" fill="url(#${u}p)" stroke="#e48a9f" stroke-width="2.6" stroke-linejoin="round"/>
          ${pontos.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity=".85"/>`).join('')}
        </g>`).join('')}
      ${rot(8, (a, i) => `<g transform="rotate(${a + 10})"><path d="M0 -6V-${lens[i]}" stroke="#e8708f" stroke-width="1.4" stroke-linecap="round"/><circle cy="-${lens[i]}" r="2.1" fill="#e8708f"/></g>`)}
      <circle r="7" fill="#d4c87e" stroke="#b9ad5e" stroke-width="1.5"/>
    </g>`);
  };

  /* 🍀 Trevo (NOVO) */
  const trevo = u => svg('0 0 100 100', `
    <defs><linearGradient id="${u}l" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#86cc5c"/><stop offset="1" stop-color="#d4f08a"/>
    </linearGradient></defs>
    <g transform="translate(50 50) scale(.8)">
      <circle r="16" fill="#e8f57e" opacity=".9"/>
      ${rot(4, a => `<g transform="rotate(${a + 45})">
        <path d="M0 -3C-18 -14 -28 -30 -18 -40C-10 -47 -2 -42 0 -35C2 -42 10 -47 18 -40C28 -30 18 -14 0 -3Z" fill="url(#${u}l)" stroke="#6db84a" stroke-width="3.6" stroke-linejoin="round"/>
        <path d="M0 -8Q-4 -20 -12 -30M0 -8Q4 -20 12 -30" fill="none" stroke="#6db84a" stroke-width="2.4" stroke-linecap="round"/>
      </g>`)}
    </g>
    <g stroke="#aef25a" stroke-width="3.2" stroke-linecap="round">
      <path d="M6 22L12 12M17 22L23 12M78 88L84 78M89 90L95 80"/>
    </g>`);

  /* 🌌 Galáxia (NOVA — giz de cera) */
  const GALAXIA_CORES = [[0, [243, 150, 40]], [.2, [250, 206, 100]], [.45, [140, 220, 232]], [1, [96, 130, 214]]];
  const corGalaxia = t => {
    for (let i = 1; i < GALAXIA_CORES.length; i++) {
      const [t1, c1] = GALAXIA_CORES[i];
      if (t <= t1) {
        const [t0, c0] = GALAXIA_CORES[i - 1];
        return mix(c0, c1, (t - t0) / (t1 - t0));
      }
    }
    return GALAXIA_CORES[GALAXIA_CORES.length - 1][1];
  };
  const galaxia = u => {
    const N = 22, TH = 7.4;
    let arms = '';
    for (const off of [0, Math.PI]) {
      for (let i = 0; i < N; i++) {
        const t = i / N;
        let d = '';
        for (let j = 0; j <= 3; j++) {
          const s = (i + j / 3) / N * TH;
          const r = 4 + 5 * s;
          const x = 50 + r * Math.cos(off + s);
          const y = 52 + r * .95 * Math.sin(off + s);
          d += (j ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
        }
        const [R, G, B] = corGalaxia(t);
        arms += `<path d="${d}" stroke="rgb(${R},${G},${B})" stroke-width="${(8 - 4.5 * t).toFixed(1)}" stroke-linecap="round" fill="none"/>`;
      }
    }
    return svg('0 0 100 100', `
      <defs><filter id="${u}f" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3" result="n"/>
        <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2"/>
      </filter></defs>
      <g filter="url(#${u}f)">
        <circle cx="50" cy="52" r="8" fill="#f3a02e"/>
        ${arms}
      </g>
      ${star4(88, 20, 7, '#f6d44a')}
      ${star4(76, 28, 4, '#ec6fb0')}
      ${star4(91, 42, 5, '#e44fa0')}
      ${star4(10, 72, 6, '#f6d44a')}
      ${star4(22, 90, 5, '#ec6fb0')}`);
  };

  /* ❄️ Floco de neve */
  const floco = u => svg('0 0 100 100', `
    <g transform="translate(50 50)" stroke="#a6d3f4" stroke-width="4.5" stroke-linecap="round" fill="none">
      ${rot(6, a => `<g transform="rotate(${a})"><path d="M0 0V-38M0 -20L-9 -29M0 -20L9 -29M0 -30L-6 -36M0 -30L6 -36"/></g>`)}
      <circle r="4" fill="#c4e2f8" stroke="none"/>
    </g>`);

  /* 🎀 Laço */
  const laco = u => svg('0 0 100 80', `
    <defs><linearGradient id="${u}b" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fbc6d7"/><stop offset="1" stop-color="#ef86a8"/>
    </linearGradient></defs>
    <g stroke="#d96c8e" stroke-width="2.6" stroke-linejoin="round" fill="url(#${u}b)">
      <path d="M50 40C32 12 6 12 8 40C6 68 32 68 50 40Z"/>
      <path d="M50 40C68 12 94 12 92 40C94 68 68 68 50 40Z"/>
      <path d="M46 48L34 76L48 68L52 50Z"/>
      <path d="M54 48L66 76L52 68L48 50Z"/>
    </g>
    <path d="M44 40C34 30 22 28 14 36M56 40C66 30 78 28 86 36" fill="none" stroke="#d96c8e" stroke-width="2" opacity=".55" stroke-linecap="round"/>
    <ellipse cx="50" cy="40" rx="8" ry="10" fill="#ef86a8" stroke="#d96c8e" stroke-width="2.6"/>`);

  /* 👒 Chapéu de palha */
  const palha = u => svg('0 0 120 60', `
    <defs><linearGradient id="${u}g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f8e3b4"/><stop offset="1" stop-color="#e8c27c"/>
    </linearGradient></defs>
    <ellipse cx="60" cy="42" rx="56" ry="14" fill="url(#${u}g)" stroke="#d1a35c" stroke-width="2.4"/>
    <path d="M30 42C28 8 92 8 90 42Q60 52 30 42Z" fill="#f3d596" stroke="#d1a35c" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M40 22Q60 16 80 22" fill="none" stroke="#dcb877" stroke-width="1.6" opacity=".7" stroke-linecap="round"/>
    <path d="M30.5 38Q60 48 89.5 38L90 44Q60 54 30 44Z" fill="#f4a6c0" stroke="#e58aa6" stroke-width="1.8"/>
    <circle cx="82" cy="42" r="4" fill="#fbc6d7" stroke="#e58aa6" stroke-width="1.4"/>
    <circle cx="82" cy="42" r="1.6" fill="#f6dc86"/>`);

  /* 🧙 Chapéu de bruxa */
  const bruxa = u => svg('0 0 100 110', `
    <defs><linearGradient id="${u}w" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#a48ce0"/><stop offset="1" stop-color="#7358b8"/>
    </linearGradient></defs>
    <ellipse cx="50" cy="94" rx="46" ry="12" fill="url(#${u}w)" stroke="#5b469b" stroke-width="2.4"/>
    <path d="M24 94C34 72 40 42 46 30C50 20 60 12 78 10C66 16 64 26 66 38C70 58 76 78 78 94Q51 102 24 94Z" fill="url(#${u}w)" stroke="#5b469b" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M26 84Q51 94 77 84L78 94Q51 104 24 94Z" fill="#f4a6c0" stroke="#e58aa6" stroke-width="2"/>
    ${star4(51, 89, 6, '#ffe08a')}
    ${star4(54, 52, 4, '#ffe08a')}`);

  /* 🎃 Abóbora */
  const abobora = u => svg('0 0 100 90', `
    <defs><linearGradient id="${u}a" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffc07a"/><stop offset="1" stop-color="#f48a3a"/>
    </linearGradient></defs>
    <g fill="url(#${u}a)" stroke="#e0782f" stroke-width="2.6">
      <ellipse cx="30" cy="56" rx="24" ry="28"/>
      <ellipse cx="70" cy="56" rx="24" ry="28"/>
      <ellipse cx="50" cy="54" rx="22" ry="32"/>
    </g>
    <path d="M40 30Q36 54 40 80M60 30Q64 54 60 80" fill="none" stroke="#e0782f" stroke-width="2" opacity=".55" stroke-linecap="round"/>
    <ellipse cx="38" cy="42" rx="5" ry="9" fill="#ffd9a8" opacity=".6" transform="rotate(14 38 42)"/>
    <path d="M46 24Q48 8 58 12Q53 16 55 24Z" fill="#7cae5a" stroke="#5f9144" stroke-width="2" stroke-linejoin="round"/>
    <path d="M57 18Q74 8 78 20Q80 28 72 26" fill="none" stroke="#86c05f" stroke-width="2.6" stroke-linecap="round"/>`);

  /* 🦇 Morcego */
  const morcego = u => svg('0 0 120 70', `
    <defs><linearGradient id="${u}m" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#9a86c8"/><stop offset="1" stop-color="#6f5ca3"/>
    </linearGradient></defs>
    <g class="nb-asas" fill="url(#${u}m)" stroke="#5a4890" stroke-width="2.2" stroke-linejoin="round">
      <path d="M52 38C38 22 14 24 4 34C14 34 18 40 20 48C26 42 32 44 36 52C40 46 46 48 52 54Z"/>
      <path transform="translate(120 0) scale(-1 1)" d="M52 38C38 22 14 24 4 34C14 34 18 40 20 48C26 42 32 44 36 52C40 46 46 48 52 54Z"/>
    </g>
    <g fill="url(#${u}m)" stroke="#5a4890" stroke-width="2.2" stroke-linejoin="round">
      <ellipse cx="60" cy="42" rx="10" ry="14"/>
      <path d="M51 22L49 8L59 17ZM69 22L71 8L61 17Z"/>
      <circle cx="60" cy="27" r="11"/>
    </g>
    <circle cx="56" cy="26" r="2" fill="#ffd1e1"/><circle cx="64" cy="26" r="2" fill="#ffd1e1"/>
    <path d="M57 32Q60 35 63 32" fill="none" stroke="#5a4890" stroke-width="1.6" stroke-linecap="round"/>`);

  /* 🎉 Chapéu de festa */
  const festa = u => svg('0 0 80 100', `
    <defs>
      <clipPath id="${u}c"><path d="M40 10L8 92Q40 102 72 92Z"/></clipPath>
      <linearGradient id="${u}g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#c9b6f5"/><stop offset="1" stop-color="#9d86e0"/>
      </linearGradient>
    </defs>
    <path d="M40 10L8 92Q40 102 72 92Z" fill="url(#${u}g)"/>
    <g clip-path="url(#${u}c)">
      <path d="M0 72L80 42L80 56L0 86Z" fill="#f9bcd2"/>
      <path d="M0 42L80 12L80 26L0 56Z" fill="#ffe08a"/>
      <circle cx="30" cy="62" r="2.4" fill="#ffe08a"/><circle cx="50" cy="76" r="2.4" fill="#ffe08a"/>
      <circle cx="40" cy="34" r="2.2" fill="#f9bcd2"/><circle cx="24" cy="86" r="2.2" fill="#f9bcd2"/>
    </g>
    <path d="M40 10L8 92Q40 102 72 92Z" fill="none" stroke="#7b66c4" stroke-width="2.6" stroke-linejoin="round"/>
    <circle cx="40" cy="9" r="8" fill="#ffd86e" stroke="#e8b94a" stroke-width="2"/>`);

  /* 🎈 Balão */
  const balao = u => svg('0 0 60 110', `
    <defs><radialGradient id="${u}b" cx="35%" cy="30%" r="75%">
      <stop offset="0" stop-color="#ffc4d2"/><stop offset="1" stop-color="#f0839e"/>
    </radialGradient></defs>
    <path d="M30 4C10 4 4 22 8 36C12 52 24 60 30 62C36 60 48 52 52 36C56 22 50 4 30 4Z" fill="url(#${u}b)" stroke="#e0627f" stroke-width="2.4" stroke-linejoin="round"/>
    <ellipse cx="20" cy="20" rx="4.5" ry="9" transform="rotate(-20 20 20)" fill="#ffd9e2" opacity=".7"/>
    <path d="M30 62L26 69L34 69Z" fill="#e0627f" stroke="#e0627f" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M30 69C24 80 36 88 28 98C26 102 30 106 30 106" fill="none" stroke="#bfa6d6" stroke-width="2" stroke-linecap="round"/>`);

  /* 🎁 Presente */
  const presente = u => svg('0 0 90 90', `
    <defs><linearGradient id="${u}g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#c9ecde"/><stop offset="1" stop-color="#8fcdb6"/>
    </linearGradient></defs>
    <rect x="14" y="42" width="62" height="42" rx="6" fill="url(#${u}g)" stroke="#6fb39b" stroke-width="2.4"/>
    <rect x="10" y="32" width="70" height="16" rx="5" fill="#d6f1e5" stroke="#6fb39b" stroke-width="2.4"/>
    <rect x="40" y="32" width="10" height="52" fill="#f7c3d3" stroke="#e58aa6" stroke-width="2"/>
    <g fill="#f7c3d3" stroke="#e58aa6" stroke-width="2.2" stroke-linejoin="round">
      <path d="M45 32C30 8 12 18 26 32Z"/><path d="M45 32C60 8 78 18 64 32Z"/>
    </g>
    <circle cx="45" cy="32" r="4.5" fill="#ef86a8" stroke="#e58aa6" stroke-width="2"/>`);

  /* ============================================================
     DESENHOS — óculos (viewBox 1000×480 = largura dos dois olhos)
     ============================================================ */
  const solar = u => svg('0 0 1000 480', `
    <defs><linearGradient id="${u}s" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5a4a8a" stop-opacity=".78"/>
      <stop offset="1" stop-color="#2d2450" stop-opacity=".88"/>
    </linearGradient></defs>
    <g fill="url(#${u}s)" stroke="#8d7bc8" stroke-width="16">
      <rect x="40" y="52" width="440" height="376" rx="130"/>
      <rect x="520" y="52" width="440" height="376" rx="130"/>
    </g>
    <path d="M470 170Q500 140 530 170M42 150L8 128M958 150L992 128" fill="none" stroke="#8d7bc8" stroke-width="16" stroke-linecap="round"/>
    <g fill="none" stroke="#e4dcff" stroke-width="14" stroke-linecap="round" opacity=".5">
      <path d="M110 160Q140 118 200 108"/><path d="M590 160Q620 118 680 108"/>
    </g>`);

  const grau = u => svg('0 0 1000 480', `
    <g fill="#cfe6ff" fill-opacity=".08" stroke="#f4a6c6" stroke-width="14">
      <ellipse cx="258" cy="240" rx="218" ry="208"/>
      <ellipse cx="742" cy="240" rx="218" ry="208"/>
    </g>
    <path d="M472 222Q500 192 528 222M42 214L8 190M958 214L992 190" fill="none" stroke="#f4a6c6" stroke-width="14" stroke-linecap="round"/>
    <g fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity=".35">
      <path d="M130 160Q170 112 240 102"/><path d="M614 160Q654 112 724 102"/>
    </g>`);

  const natacao = u => svg('0 0 1000 480', `
    <path d="M36 240L-70 240M964 240L1070 240" stroke="#5aa9d6" stroke-width="34" stroke-linecap="round"/>
    <g fill="#9ed8e8" fill-opacity=".3" stroke="#7fc4e6" stroke-width="26">
      <rect x="36" y="48" width="448" height="384" rx="150"/>
      <rect x="516" y="48" width="448" height="384" rx="150"/>
    </g>
    <path d="M484 200L516 200" stroke="#7fc4e6" stroke-width="26" stroke-linecap="round"/>
    <g fill="none" stroke="#d8f3fa" stroke-width="12" stroke-linecap="round" opacity=".55">
      <path d="M110 150Q140 112 200 104"/><path d="M590 150Q620 112 680 104"/>
    </g>`);

  /* ============================================================
     POSIÇÕES  (X,Y em unidades de "olho"; a = c centro | b base)
     X: 0 = meio do rosto, ±0.66 = centro de cada olho
     Y: 0 = topo dos olhos, negativo = mais pra cima
     w: largura do acessório (em olhos); r: rotação; fx: animação
     ============================================================ */
  const ITENS = {
    cabeca: {
      'galaxia':     { art: galaxia,   X: 0,    Y: -.6,  w: 1.0,  r: 0,   fx: 'spin' },
      'flor_rosada': { art: florRosada, X: .8,  Y: -.02, w: .85,  r: 12,  fx: 'sway' },
      'trevo':       { art: trevo,     X: -.78, Y: -.04, w: .72,  r: -10, fx: 'sway' },
      '🌸':          { art: cerejeira, X: .8,   Y: -.04, w: .62,  r: 14,  fx: 'sway' },
      '🌺':          { art: hibisco,   X: -.8,  Y: -.02, w: .78,  r: -14, fx: 'sway' },
      '❄️':          { art: floco,     X: .82,  Y: -.1,  w: .55,  r: 0,   fx: 'spin' },
      '🎀':          { art: laco,      X: -.86, Y: -.04, w: .85,  r: -14, fx: 'sway' },
      '👒':          { art: palha,     X: .42,  Y: .08,  w: 1.3,  r: 10,  a: 'b' },
      '🧙':          { art: bruxa,     X: .5,   Y: .08,  w: .85,  r: 10,  a: 'b' },
      '🎃':          { art: abobora,   X: .85,  Y: .02,  w: .62,  r: 8,   a: 'b' },
      '👻':          { emoji: '👻',     X: .85,  Y: -.22, size: .55, r: 8, fx: 'float' },
      '🦇':          { art: morcego,   X: .88,  Y: -.3,  w: .8,   r: 0,   fx: 'float bat' },
      '🎉':          { art: festa,     X: .6,   Y: .04,  w: .62,  r: 18,  a: 'b' },
      '🎈':          { art: balao,     X: 1.1,  Y: -.3,  w: .45,  r: 8,   fx: 'sway' },
      '🎁':          { art: presente,  X: .5,   Y: .06,  w: .78,  r: -8,  a: 'b' }
    },
    oculos: {
      '🕶️': { art: solar },
      '👓':  { art: grau },
      '🥽':  { art: natacao }
    }
  };

  /* ---------- novos itens no catálogo (aparecem primeiro) ---------- */
  BOUTIQUE.cabeca = Object.assign({
    'galaxia':     { nome: 'Galáxia',      preco: 30 },
    'flor_rosada': { nome: 'Flor Rosada',  preco: 15 },
    'trevo':       { nome: 'Trevo',        preco: 18 }
  }, BOUTIQUE.cabeca);

  /* ---------- CSS ---------- */
  const css = document.createElement('style');
  css.textContent = `
    .nb-acc{position:absolute;z-index:10;pointer-events:none}
    .nb-in svg{width:100%;height:auto;display:block;overflow:visible}
    .nb-in.emoji{font-size:calc(var(--ew)*var(--sz,.5));line-height:1}
    .nb-gl{position:absolute;left:-9%;width:118%;top:50%;transform:translateY(-50%);z-index:11;pointer-events:none}
    .nb-gl svg{width:100%;height:auto;display:block;overflow:visible}
    .nb-thumb{width:48px;height:42px;margin:0 auto}
    .nb-thumb svg{width:100%;height:100%;display:block}
    .nb-in.sway{animation:nbSway 3.4s ease-in-out infinite;transform-origin:50% 80%}
    .nb-in.float{animation:nbFloat 3s ease-in-out infinite}
    .nb-in.spin{animation:nbSpin 24s linear infinite}
    .nb-in.bat .nb-asas{animation:nbFlap .45s ease-in-out infinite alternate;transform-origin:60px 40px}
    @keyframes nbSway{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}
    @keyframes nbFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
    @keyframes nbSpin{to{transform:rotate(360deg)}}
    @keyframes nbFlap{from{transform:scaleY(1)}to{transform:scaleY(.7)}}
    @media (prefers-reduced-motion:reduce){.nb-in,.nb-in .nb-asas{animation:none!important}}
  `;
  document.head.appendChild(css);

  /* ---------- aplicar visual (substitui o do game.js) ---------- */
  function aplicarVisual() {
    document.querySelectorAll('.acessorio-nebo').forEach(e => e.remove());
    const eq = S.equipado || {};

    // acessório de cabeça
    const dc = eq.cabeca && ITENS.cabeca[eq.cabeca];
    if (dc) {
      const el = document.createElement('div');
      el.className = 'acessorio-nebo nb-acc';
      const ancora = dc.a === 'b' ? '-50%,-100%' : '-50%,-50%';
      el.style.left = `calc(50% + var(--ew) * ${dc.X})`;
      el.style.top = `calc(var(--ew) * ${dc.Y})`;
      if (!dc.emoji) el.style.width = `calc(var(--ew) * ${dc.w})`;
      el.style.transform = `translate(${ancora}) rotate(${dc.r || 0}deg)`;
      el.innerHTML = dc.emoji
        ? `<div class="nb-in emoji ${dc.fx || ''}" style="--sz:${dc.size}">${dc.emoji}</div>`
        : `<div class="nb-in ${dc.fx || ''}">${dc.art(uid())}</div>`;
      document.getElementById('face').appendChild(el);
    }

    // óculos (cobrem os dois olhos, no tamanho certo)
    const dO = eq.oculos && ITENS.oculos[eq.oculos];
    if (dO) {
      const el = document.createElement('div');
      el.className = 'acessorio-nebo nb-gl';
      el.innerHTML = dO.art(uid());
      document.getElementById('eyes').appendChild(el);
    }

    // cor dos olhos
    const corOlho = eq.olhos && BOUTIQUE.olhos[eq.olhos]?.cor;
    document.documentElement.style.setProperty('--eye', corOlho || '#f7d9e4');

    // fundo
    const corFundo = eq.fundo && BOUTIQUE.fundo[eq.fundo]?.cor;
    if (corFundo) {
      document.body.style.background = corFundo;
      if (['🌌', '🌠', '🌉'].includes(eq.fundo)) {
        document.body.style.background = `${corFundo} radial-gradient(circle at 30% 30%, #ffffff22 0 1px, transparent 2px), radial-gradient(circle at 70% 60%, #ffffff22 0 1px, transparent 2px), radial-gradient(circle at 50% 80%, #ffffff22 0 1px, transparent 2px), ${corFundo}`;
        document.body.style.backgroundSize = '200px 200px, 300px 300px, 150px 150px, auto';
      }
    } else {
      document.body.style.background = '#000';
      document.body.style.backgroundImage = 'none';
    }
  }

  /* ---------- ícone de cada item na vitrine ---------- */
  function icone(aba, chave) {
    if (aba === 'olhos') {
      const c = BOUTIQUE.olhos[chave].cor;
      return `<div style="width:30px;height:30px;margin:2px auto;border-radius:50%;background:${c};box-shadow:0 0 12px ${c}"></div>`;
    }
    if (aba === 'fundo') {
      const c = BOUTIQUE.fundo[chave].cor;
      return `<div style="width:100%;height:30px;border-radius:8px;background:${c}"></div>`;
    }
    const d = ITENS[aba] && ITENS[aba][chave];
    if (!d) return `<div style="font-size:28px">${chave}</div>`;
    if (d.emoji) return `<div style="font-size:30px;line-height:42px">${d.emoji}</div>`;
    return `<div class="nb-thumb">${d.art(uid())}</div>`;
  }

  /* ---------- vitrine da boutique (substitui a do game.js) ---------- */
  function renderBoutique() {
    const abas = {
      cabeca: { emoji: '🌸', nome: 'Cabeça' },
      oculos: { emoji: '🕶️', nome: 'Óculos' },
      olhos:  { emoji: '🎨', nome: 'Olhos' },
      fundo:  { emoji: '🌌', nome: 'Fundos' }
    };

    let html = '<h3>👗 Boutique</h3>';
    html += `<p style="font-size:13px;opacity:.7;margin:0 0 8px">Você tem: 🪙 ${S.moedas || 0}</p>`;

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

    const itens = BOUTIQUE[abaAtual] || {};
    const comprados = S.compras || [];
    const equipado = S.equipado || {};

    html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">';
    for (const [chave, item] of Object.entries(itens)) {
      const comprado = comprados.includes(chave);
      const usando = equipado[abaAtual] === chave;
      html += `
        <div class="item-boutique" data-item="${chave}" data-aba="${abaAtual}" style="
          background:${usando ? '#f7d9e4' : (comprado ? '#ffffff33' : '#ffffff1a')};
          border-radius:12px;padding:10px 4px;
          text-align:center;cursor:pointer;
          border:2px solid ${usando ? '#f7d9e4' : 'transparent'};
          position:relative;
        ">
          ${icone(abaAtual, chave)}
          <div style="font-size:10px;opacity:.7;margin-top:2px;${usando ? 'color:#1b1824' : ''}">${item.nome}</div>
          <div style="font-size:11px;font-weight:bold;margin-top:4px;color:${usando ? '#1b1824' : '#fff'}">
            ${usando ? '✓ USANDO' : (comprado ? 'EQUIPAR' : `${item.preco}🪙`)}
          </div>
        </div>`;
    }
    html += '</div>';

    const temAlgo = equipado[abaAtual];
    if (temAlgo) {
      html += `<button id="btnTirar" style="
        font-size:14px;padding:10px;margin-top:12px;
        background:#ff6666;color:#fff;opacity:.8;
      ">🗑️ Tirar item</button>`;
    }

    panel(html);

    setTimeout(() => {
      document.querySelectorAll('[data-aba]:not(.item-boutique)').forEach(b => {
        b.onclick = () => { abaAtual = b.dataset.aba; renderBoutique(); };
      });
      document.querySelectorAll('.item-boutique').forEach(el => {
        el.onclick = () => clicarItemBoutique(el.dataset.item, el.dataset.aba);
      });
      const btnTirar = document.getElementById('btnTirar');
      if (btnTirar) {
        btnTirar.onclick = () => {
          const eq = S.equipado || {};
          eq[abaAtual] = null;
          S.equipado = eq;
          save();
          SOM.melodia([N.DO_BAIXO, N.DO_BAIXO], 0.1, 'sine', 0.1);
          say('Tirei! 🗑️');
          aplicarVisual();
          renderBoutique();
        };
      }
    }, 100);
  }

  /* troca as funções originais pelas novas e redesenha agora */
  window.aplicarVisual = aplicarVisual;
  window.renderBoutique = renderBoutique;
  aplicarVisual();
})();
