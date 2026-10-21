
/* CIDADE NEBO — visual low-poly suave */
(() => {
  if (window.__nebulaCity3DLoaded) return;
  window.__nebulaCity3DLoaded = true;

  let scene, camera, renderer, controls, root;
  let iniciado = false;
  const predios = [];
  const coresCasa = ['#f0eee2', '#e8e7dc', '#f5f0e5', '#dfe5df'];

  function material(cor, extra = {}) {
    return new THREE.MeshStandardMaterial({
      color: cor, roughness: 1, metalness: 0, ...extra
    });
  }

  function nomePlaca(nome) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 112;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.roundRect(8, 8, 496, 96, 28); ctx.fill();
    ctx.strokeStyle = '#202631'; ctx.lineWidth = 10; ctx.stroke();
    ctx.fillStyle = '#202631';
    ctx.font = 'bold 34px system-ui'; ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(nome || 'Imóvel').slice(0, 22), 256, 56, 450);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(canvas), transparent: true,
      depthTest: false
    }));
    sprite.scale.set(5.5, 1.2, 1);
    return sprite;
  }

  function criarPredio(dados, x, z, indice = 0) {
    const grupo = new THREE.Group();
    grupo.position.set(x, 0, z);
    const tipo = dados.tipo || 'casa';
    const alto = tipo === 'observatorio' ? 9 :
      ['biblioteca', 'escola', 'laboratorio', 'museu'].includes(tipo) ? 6 : 3.2;
    const torre = alto > 5;
    const largura = torre ? 2.8 : 3.2;
    const profundidade = torre ? 2.8 : 3;
    const cor = torre ? (indice % 2 ? '#e7e7df' : '#d9dedb') :
      (dados.cor && !String(dados.cor).startsWith('#f') ? dados.cor : coresCasa[indice % coresCasa.length]);

    const corpo = new THREE.Mesh(
      new THREE.BoxGeometry(largura, alto, profundidade), material(cor)
    );
    corpo.position.y = alto / 2;
    corpo.castShadow = true; corpo.receiveShadow = true;
    grupo.add(corpo);

    if (!torre) {
      const telhado = new THREE.Mesh(
        new THREE.ConeGeometry(2.45, 1.25, 4),
        material(['#d99b63', '#c98555', '#d9a66f', '#b87b54'][indice % 4])
      );
      telhado.position.y = alto + 0.5;
      telhado.rotation.y = Math.PI / 4;
      telhado.castShadow = true;
      grupo.add(telhado);

      const porta = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 1.05, 0.08), material('#8b725d')
      );
      porta.position.set(0, 0.53, profundidade / 2 + 0.045);
      grupo.add(porta);

      for (const wx of [-0.9, 0.9]) {
        const janela = new THREE.Mesh(
          new THREE.BoxGeometry(0.58, 0.58, 0.08), material('#82b9cc')
        );
        janela.position.set(wx, 1.9, profundidade / 2 + 0.05);
        grupo.add(janela);
      }
    } else {
      const andares = Math.floor(alto / 1.15);
      for (let y = 0; y < andares; y++) {
        for (const lado of [-1, 1]) {
          const janela = new THREE.Mesh(
            new THREE.BoxGeometry(0.68, 0.43, 0.06), material('#252d36')
          );
          janela.position.set(lado * 0.72, 0.7 + y * 1.05, profundidade / 2 + 0.04);
          grupo.add(janela);
        }
        const faixa = new THREE.Mesh(
          new THREE.BoxGeometry(largura + 0.08, 0.09, profundidade + 0.08),
          material('#f5f0df')
        );
        faixa.position.y = 0.2 + y * 1.05;
        grupo.add(faixa);
      }
      const topo = new THREE.Mesh(
        new THREE.BoxGeometry(largura + 0.25, 0.25, profundidade + 0.25),
        material('#c9cbc5')
      );
      topo.position.y = alto + 0.08;
      grupo.add(topo);
    }

    const placa = nomePlaca(dados.nome);
    placa.position.y = alto + (torre ? 1.6 : 1.9);
    grupo.add(placa);
    grupo.userData.imovel = dados;
    root.add(grupo);
    predios.push(grupo);
  }

  function arvore(x, z, escala = 1) {
    const tronco = new THREE.Mesh(
      new THREE.CylinderGeometry(.12 * escala, .18 * escala, .75 * escala, 6),
      material('#94704c')
    );
    tronco.position.set(x, .38 * escala, z);
    root.add(tronco);

    const copa = new THREE.Mesh(
      new THREE.DodecahedronGeometry(.62 * escala, 0),
      material(['#63965a', '#76a565', '#82ad6c'][Math.abs(Math.round(x + z)) % 3])
    );
    copa.position.set(x, .95 * escala, z);
    copa.castShadow = true;
    root.add(copa);
  }

  function rua(x, z, w, d) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, .08, d), material('#777b7b')
    );
    mesh.position.set(x, .015, z);
    root.add(mesh);
  }

  function montarCidade() {
    if (iniciado || !window.THREE || !THREE.OrbitControls) return;
    const area = document.getElementById('c3canvas');
    if (!area) return;
    iniciado = true;

    scene = new THREE.Scene();
    scene.background = new THREE.Color('#b8d9e8');
    scene.fog = new THREE.Fog('#b8d9e8', 90, 175);

    camera = new THREE.PerspectiveCamera(42, 1, .1, 300);
    camera.position.set(36, 34, 42);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if ('outputColorSpace' in renderer && THREE.SRGBColorSpace)
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    else if ('outputEncoding' in renderer && THREE.sRGBEncoding)
      renderer.outputEncoding = THREE.sRGBEncoding;
    area.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = .07;
    controls.maxPolarAngle = Math.PI / 2.08;
    controls.minDistance = 15;
    controls.maxDistance = 100;
    controls.target.set(0, 0, 0);

    scene.add(new THREE.HemisphereLight('#ffffff', '#78816b', 1.05));
    const sol = new THREE.DirectionalLight('#fff4df', 1.25);
    sol.position.set(-25, 42, 18);
    sol.castShadow = true;
    sol.shadow.mapSize.set(1024, 1024);
    sol.shadow.camera.left = -65; sol.shadow.camera.right = 65;
    sol.shadow.camera.top = 65; sol.shadow.camera.bottom = -65;
    sol.shadow.bias = -.0005;
    scene.add(sol);

    root = new THREE.Group();
    scene.add(root);

    const chao = new THREE.Mesh(
      new THREE.PlaneGeometry(150, 150),
      material('#a9b875')
    );
    chao.rotation.x = -Math.PI / 2;
    chao.position.y = -.06;
    chao.receiveShadow = true;
    root.add(chao);

    // Ruas em quarteirões
    [-30, -10, 10, 30].forEach(p => {
      rua(p, 0, 3.6, 100);
      rua(0, p, 100, 3.6);
    });

    // Calçadas discretas
    [-30, -10, 10, 30].forEach(p => {
      [-1, 1].forEach(s => {
        const a = new THREE.Mesh(new THREE.BoxGeometry(.45, .1, 100), material('#c8c7b7'));
        a.position.set(p + s * 2.05, .025, 0); root.add(a);
        const b = new THREE.Mesh(new THREE.BoxGeometry(100, .1, .45), material('#c8c7b7'));
        b.position.set(0, .025, p + s * 2.05); root.add(b);
      });
    });

    // Construções e casinhas da cidade
    const iniciais = [
      { nome:'Biblioteca das Estrelas', tipo:'biblioteca', x:-20, z:-20 },
      { nome:'Café das Nebos', tipo:'casa', x:0, z:-20 },
      { nome:'Escola Nebular', tipo:'escola', x:20, z:-20 },
      { nome:'Laboratório Criativo', tipo:'laboratorio', x:-20, z:0 },
      { nome:'Observatório Orion', tipo:'observatorio', x:20, z:0 },
      { nome:'Museu das Memórias', tipo:'museu', x:-20, z:20 },
      { nome:'Casinha Lilás', tipo:'casa', x:0, z:20 },
      { nome:'Ateliê das Cores', tipo:'casa', x:20, z:20 },
      { nome:'Torre Central', tipo:'observatorio', x:0, z:0 }
    ];
    iniciais.forEach((p, i) => criarPredio(p, p.x, p.z, i));

    // Árvores espalhadas, sem cobrir as ruas
    for (let z = -44; z <= 44; z += 8) {
      for (let x = -44; x <= 44; x += 8) {
        if (Math.abs(x % 20) < 3 || Math.abs(z % 20) < 3) continue;
        if (Math.abs(x) < 24 && Math.abs(z) < 24) continue;
        arvore(x + ((z / 8) % 2) * 2, z, .7 + ((x + z) % 3 + 3) % 3 * .12);
      }
    }

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

  function redimensionar() {
    if (!renderer || !camera) return;
    const area = document.getElementById('c3canvas');
    if (!area) return;
    const w = area.clientWidth || innerWidth;
    const h = area.clientHeight || innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function clicarPredio(evento) {
    const rect = renderer.domElement.getBoundingClientRect();
    const ponto = new THREE.Vector2(
      ((evento.clientX - rect.left) / rect.width) * 2 - 1,
      -((evento.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raio = new THREE.Raycaster();
    raio.setFromCamera(ponto, camera);
    const toque = raio.intersectObjects(predios, true)[0];
    if (!toque) return;
    let obj = toque.object;
    while (obj && !obj.userData.imovel) obj = obj.parent;
    if (!obj) return;
    const imovel = obj.userData.imovel;
    const info = document.getElementById('c3info');
    if (!info) return;
    info.querySelector('strong').textContent = imovel.nome || 'Imóvel';
    info.querySelector('span').textContent =
      (imovel.tipo || 'Construção') + (imovel.criador ? ' · por ' + imovel.criador : '');
    info.hidden = false;
  }

  async function carregarImoveisCompartilhados() {
    if (!window.firebase || typeof iniciarFirebase !== 'function') return;
    try {
      const db = iniciarFirebase();
      if (!db) return;
      const snapshot = await db.collection('cidade_imoveis').limit(80).get();
      snapshot.forEach(doc => {
        const dados = doc.data();
        if (!dados || !dados.nome || predios.some(p => p.userData.imovel.id === doc.id)) return;
        const i = predios.length;
        const pos = [
          [-40,-20],[-40,0],[-40,20],[40,-20],[40,0],[40,20],
          [-20,-40],[0,-40],[20,-40],[-20,40],[0,40],[20,40]
        ][(i - 9) % 12] || [((i % 5) - 2) * 9, (Math.floor(i / 5) - 2) * 9];
        criarPredio({ ...dados, id: doc.id }, pos[0], pos[1], i);
      });
      atualizarContador();
    } catch (e) {
      console.warn('Não foi possível carregar os imóveis:', e);
    }
  }

  function atualizarContador() {
    const el = document.getElementById('c3count');
    if (el) el.textContent = '🏘️ ' + predios.length + ' imóveis';
  }

  function iniciar() {
    if (document.getElementById('cidade3d')) return;
    const el = document.createElement('section');
    el.id = 'cidade3d';
    el.hidden = true;
    el.innerHTML = `
      <div class="c3-top">
        <div class="c3-title">Cidade Nebo <span id="c3count">Cidade em crescimento</span></div>
        <div class="c3-actions">
          <button id="c3home">Centralizar</button>
          <button id="c3close">✕ Voltar</button>
        </div>
      </div>
      <div id="c3canvas"></div>
      <div class="c3-help">Arraste para explorar · Zoom para aproximar · Clique em um imóvel</div>
      <div id="c3info" hidden><strong></strong><span></span><button id="c3infoclose">✕</button></div>
    `;
    document.body.appendChild(el);

    document.getElementById('c3close').onclick = () => {
      el.hidden = true;
      if (renderer) renderer.setAnimationLoop(null);
      document.body.classList.remove('modo-cidade');
      if (typeof window.voltarModoNebo === 'function') window.voltarModoNebo();
    };
    document.getElementById('c3home').onclick = () => {
      if (!camera || !controls) return;
      camera.position.set(36, 34, 42);
      controls.target.set(0, 0, 0);
      controls.update();
    };
    document.getElementById('c3infoclose').onclick = () => {
      document.getElementById('c3info').hidden = true;
    };

    function controles() {
      if (THREE.OrbitControls) { montarCidade(); return; }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
      s.onload = montarCidade;
      document.head.appendChild(s);
    }
    if (!window.THREE) {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js';
      s.onload = controles;
      document.head.appendChild(s);
    } else controles();
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
