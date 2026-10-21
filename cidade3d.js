
/* CIDADE NEBO — versão 1
   Cidade 3D pastel com prédios identificados.
   A cidade é um painel: não há botão para construir.
*/
(() => {
  if (window.__nebulaCity3DLoaded) return;
  window.__nebulaCity3DLoaded = true;

  let scene, camera, renderer, controls, cityRoot;
  let iniciado = false;
  const predios = [];
  const cores = [
    '#f6aeca', '#b6a5f4', '#ffd38e',
    '#8fd8c9', '#a9d5f7', '#f5b59c'
  ];

  function criarNome(nome) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fffaf0';
    ctx.beginPath();
    ctx.roundRect(8, 12, 496, 104, 24);
    ctx.fill();

    ctx.fillStyle = '#513c63';
    ctx.font = 'bold 34px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(nome || 'Imóvel').slice(0, 22), 256, 64, 460);

    const textura = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: textura,
        transparent: true,
        depthTest: false
      })
    );

    sprite.scale.set(4.8, 1.2, 1);
    return sprite;
  }

  function criarPredio(dados, x, z, indice = 0) {
    const grupo = new THREE.Group();
    grupo.position.set(x, 0, z);

    const tipo = dados.tipo || 'casa';
    const altura = tipo === 'observatorio'
      ? 5.4
      : ['biblioteca', 'escola', 'laboratorio', 'museu'].includes(tipo)
        ? 4
        : 3;

    const corpo = new THREE.Mesh(
      new THREE.BoxGeometry(3.1, altura, 2.8),
      new THREE.MeshStandardMaterial({
        color: dados.cor || cores[indice % cores.length],
        roughness: 0.88
      })
    );

    corpo.position.y = altura / 2;
    corpo.castShadow = true;
    corpo.receiveShadow = true;
    grupo.add(corpo);

    const telhado = new THREE.Mesh(
      new THREE.ConeGeometry(2.3, 1.2, 4),
      new THREE.MeshStandardMaterial({
        color: ['#956d93', '#a76572', '#7188a8', '#b17e4e'][indice % 4]
      })
    );

    telhado.position.y = altura + 0.45;
    telhado.rotation.y = Math.PI / 4;
    grupo.add(telhado);

    const porta = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 1.1, 0.08),
      new THREE.MeshStandardMaterial({ color: '#795b4b' })
    );
    porta.position.set(0, 0.55, 1.45);
    grupo.add(porta);

    for (const xJanela of [-0.85, 0.85]) {
      const janela = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.55, 0.08),
        new THREE.MeshStandardMaterial({ color: '#d8f4ff' })
      );
      janela.position.set(xJanela, Math.min(altura - 0.65, 1.8), 1.45);
      grupo.add(janela);
    }

    const placa = criarNome(dados.nome);
    placa.position.y = altura + 1.6;
    grupo.add(placa);

    grupo.userData.imovel = dados;
    cityRoot.add(grupo);
    predios.push(grupo);
  }

  function criarArvore(x, z, tamanho = 1) {
    const tronco = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.15 * tamanho,
        0.22 * tamanho,
        1.1 * tamanho,
        7
      ),
      new THREE.MeshStandardMaterial({ color: '#9a704d' })
    );

    tronco.position.set(x, 0.55 * tamanho, z);
    cityRoot.add(tronco);

    const copa = new THREE.Mesh(
      new THREE.SphereGeometry(0.78 * tamanho, 10, 8),
      new THREE.MeshStandardMaterial({
        color: ['#5fae78', '#78bd7b', '#8bc98a'][
          Math.abs(Math.round(x + z)) % 3
        ]
      })
    );

    copa.position.set(x, 1.35 * tamanho, z);
    copa.castShadow = true;
    cityRoot.add(copa);
  }

  function criarParque(x, z) {
    const gramado = new THREE.Mesh(
      new THREE.BoxGeometry(9, 0.12, 8),
      new THREE.MeshStandardMaterial({ color: '#83c981' })
    );

    gramado.position.set(x, 0.03, z);
    cityRoot.add(gramado);

    for (const [dx, dz] of [
      [-3, -2], [3, -2], [-3, 2], [3, 2]
    ]) {
      criarArvore(x + dx, z + dz, 0.8);
    }

    const caminho = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.04, 5),
      new THREE.MeshStandardMaterial({ color: '#e8d9bc' })
    );

    caminho.position.set(x, 0.11, z);
    cityRoot.add(caminho);
  }

  function criarRuas() {
    const asfalto = new THREE.MeshStandardMaterial({ color: '#858d9b' });
    const calcada = new THREE.MeshStandardMaterial({ color: '#f3e6d7' });

    for (const p of [-16, 0, 16]) {
      const vertical = new THREE.Mesh(
        new THREE.BoxGeometry(4.2, 0.12, 70),
        asfalto
      );
      vertical.position.set(p, 0.02, 0);
      cityRoot.add(vertical);

      const horizontal = new THREE.Mesh(
        new THREE.BoxGeometry(70, 0.12, 4.2),
        asfalto
      );
      horizontal.position.set(0, 0.02, p);
      cityRoot.add(horizontal);

      for (const lado of [-1, 1]) {
        const c1 = new THREE.Mesh(
          new THREE.BoxGeometry(0.65, 0.16, 70),
          calcada
        );
        c1.position.set(p + lado * 2.4, 0.02, 0);
        cityRoot.add(c1);

        const c2 = new THREE.Mesh(
          new THREE.BoxGeometry(70, 0.16, 0.65),
          calcada
        );
        c2.position.set(0, 0.02, p + lado * 2.4);
        cityRoot.add(c2);
      }
    }
  }

  function atualizarContador() {
    const el = document.getElementById('c3count');
    if (el) el.textContent = '🏘️ ' + predios.length + ' imóveis';
  }

  function redimensionar() {
    if (!renderer || !camera) return;

    const area = document.getElementById('c3canvas');
    if (!area) return;

    const largura = area.clientWidth || innerWidth;
    const altura = area.clientHeight || innerHeight;

    camera.aspect = largura / altura;
    camera.updateProjectionMatrix();
    renderer.setSize(largura, altura);
  }

  function clicarPredio(evento) {
    const rect = renderer.domElement.getBoundingClientRect();
    const ponto = new THREE.Vector2(
      ((evento.clientX - rect.left) / rect.width) * 2 - 1,
      -(((evento.clientY - rect.top) / rect.height) * 2 - 1)
    );

    const raio = new THREE.Raycaster();
    raio.setFromCamera(ponto, camera);

    const toque = raio.intersectObjects(predios, true)[0];
    if (!toque) return;

    let objeto = toque.object;
    while (objeto && !objeto.userData.imovel) {
      objeto = objeto.parent;
    }
    if (!objeto) return;

    const imovel = objeto.userData.imovel;
    const info = document.getElementById('c3info');

    info.querySelector('strong').textContent =
      imovel.nome || 'Imóvel';

    info.querySelector('span').textContent =
      (imovel.tipo || 'Construção') +
      (imovel.criador ? ' · por ' + imovel.criador : '');

    info.hidden = false;
  }

  async function carregarImoveisCompartilhados() {
    if (!window.firebase || typeof iniciarFirebase !== 'function') return;

    try {
      const db = iniciarFirebase();
      if (!db) return;

      const snapshot = await db.collection('cidade_imoveis')
        .limit(80)
        .get();

      snapshot.forEach(doc => {
        const dados = doc.data();
        if (!dados || !dados.nome) return;

        if (predios.some(p => p.userData.imovel.id === doc.id)) return;

        const indice = predios.length;
        const posicoes = [
          [-25, -17], [-9, -25], [8, -25], [25, -17],
          [-25, 17], [-9, 25], [8, 25], [25, 17],
          [0, -31], [0, 31]
        ];

        const pos = posicoes[(indice - 8) % posicoes.length]
          || [((indice % 5) - 2) * 8, (Math.floor(indice / 5) - 2) * 8];

        criarPredio({ ...dados, id: doc.id }, pos[0], pos[1], indice);
      });

      atualizarContador();
    } catch (erro) {
      console.warn('Não foi possível carregar os imóveis:', erro);
    }
  }

  function montarCidade() {
    if (iniciado || !window.THREE) return;

    const area = document.getElementById('c3canvas');
    if (!area) return;

    iniciado = true;

    scene = new THREE.Scene();
    scene.background = new THREE.Color('#c6e2f7');
    scene.fog = new THREE.Fog('#c6e2f7', 55, 115);

    camera = new THREE.PerspectiveCamera(48, 1, 0.1, 220);
    camera.position.set(28, 28, 34);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.8));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    } else if ('outputEncoding' in renderer && THREE.sRGBEncoding) {
      renderer.outputEncoding = THREE.sRGBEncoding;
    }

    area.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minDistance = 12;
    controls.maxDistance = 75;
    controls.target.set(0, 0, 0);

    scene.add(new THREE.HemisphereLight('#fffaf0', '#78977e', 1.6));

    const sol = new THREE.DirectionalLight('#fff0ce', 2.2);
    sol.position.set(-18, 35, 20);
    sol.castShadow = true;
    sol.shadow.mapSize.set(1024, 1024);
    scene.add(sol);

    cityRoot = new THREE.Group();
    scene.add(cityRoot);

    const chao = new THREE.Mesh(
      new THREE.PlaneGeometry(110, 110),
      new THREE.MeshStandardMaterial({ color: '#a9d59b', roughness: 1 })
    );
    chao.rotation.x = -Math.PI / 2;
    chao.position.y = -0.1;
    chao.receiveShadow = true;
    cityRoot.add(chao);

    criarRuas();
    criarParque(-27, -25);
    criarParque(27, 25);

    const lago = new THREE.Mesh(
      new THREE.CircleGeometry(4.4, 32),
      new THREE.MeshStandardMaterial({ color: '#83d4e7', roughness: 0.3 })
    );
    lago.rotation.x = -Math.PI / 2;
    lago.position.set(27, 0.02, -24);
    cityRoot.add(lago);

    for (let i = 0; i < 28; i++) {
      criarArvore(
        -32 + (i % 7) * 10,
        -31 + Math.floor(i / 7) * 20,
        0.8
      );
    }

    const iniciais = [
      { nome: 'Biblioteca das Estrelas', tipo: 'biblioteca', x: -9, z: -9 },
      { nome: 'Café das Nebos', tipo: 'cafe', x: 8, z: -9 },
      { nome: 'Escola Nebular', tipo: 'escola', x: -9, z: 8 },
      { nome: 'Laboratório Criativo', tipo: 'laboratorio', x: 8, z: 8 },
      { nome: 'Observatório Orion', tipo: 'observatorio', x: -25, z: -9 },
      { nome: 'Museu das Memórias', tipo: 'museu', x: 25, z: 8 },
      { nome: 'Casinha Lilás', tipo: 'casa', x: 25, z: -9 },
      { nome: 'Ateliê das Cores', tipo: 'cafe', x: -25, z: 8 }
    ];

    iniciais.forEach((p, i) => {
      criarPredio({
        ...p,
        cor: cores[i % cores.length],
        criador: 'Cidade Nebo'
      }, p.x, p.z, i);
    });

    renderer.domElement.addEventListener('click', clicarPredio);
    window.addEventListener('resize', redimensionar);
    redimensionar();

    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
    });

    carregarImoveisCompartilhados();
    atualizarContador();
  }

  function iniciar() {
    if (document.getElementById('cidade3d')) return;

    const el = document.createElement('section');
    el.id = 'cidade3d';
    el.hidden = true;

    el.innerHTML = `
      <div class="c3-top">
        <div class="c3-title">
          🌷 Cidade Nebo
          <span id="c3count">🏘️ Cidade em crescimento</span>
        </div>
        <div class="c3-actions">
          <button id="c3home">🎯 Centralizar</button>
          <button id="c3close">✕ Voltar</button>
        </div>
      </div>
      <div id="c3canvas"></div>
      <div class="c3-help">
        🖱️ Arraste para explorar · Rodinha para aproximar ·
        Clique em um imóvel para conhecê-lo
      </div>
      <div id="c3info" hidden>
        <strong></strong>
        <span></span>
        <button id="c3infoclose">✕</button>
      </div>
    `;

    document.body.appendChild(el);

    document.getElementById('c3close').onclick = () => {
      el.hidden = true;
      if (renderer) renderer.setAnimationLoop(null);
    };

    document.getElementById('c3home').onclick = () => {
      if (!camera || !controls) return;
      camera.position.set(28, 28, 34);
      controls.target.set(0, 0, 0);
      controls.update();
    };

    document.getElementById('c3infoclose').onclick = () => {
      document.getElementById('c3info').hidden = true;
    };

    function carregarControles() {
      if (window.THREE.OrbitControls) {
        montarCidade();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
      script.onload = montarCidade;
      document.head.appendChild(script);
    }

    if (!window.THREE) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js';
      script.onload = carregarControles;
      document.head.appendChild(script);
    } else {
      carregarControles();
    }
  }

  function abrir() {
    iniciar();

    const el = document.getElementById('cidade3d');
    if (!el) return;

    el.hidden = false;
    document.body.classList.add('modo-cidade');

    if (renderer) {
      redimensionar();
      renderer.setAnimationLoop(() => {
        controls.update();
        renderer.render(scene, camera);
      });
    }
  }

  document.addEventListener('DOMContentLoaded', iniciar);
  window.abrirCidade3D = abrir;
})();
