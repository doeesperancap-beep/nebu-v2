/* ============================================================
   CIDADE NEBO — cidade low-poly, luz solar e casas compartilhadas
   ============================================================ */
(() => {
  if (window.__nebulaCity3DLoaded) return;
  window.__nebulaCity3DLoaded = true;

  const BLOCO = 30;
  const CASAS_POR_QUARTEIRAO = 4;
  const OFFSETS_CASA = [[-5.6,-5.6],[5.6,-5.6],[-5.6,5.6],[5.6,5.6]];
  const CORES_CASAS = ['#E5AD58','#D98257','#E8C77D','#B8A7D8','#8EB9A0','#DDA0A0','#C7C49B','#E6B98B'];
  const CORES_TELHADO = ['#A65F45','#8D6654','#6F7767','#B77A53'];

  let scene, camera, renderer, controls, luzSol, grupoCidade;
  let casasRenderizadas = [];
  let iniciado = false;
  let carregandoThree = false;
  let firebaseUnsubscribe = null;
  let ultimaAssinatura = '';
  let houvePrimeiraLeitura = false;
  let houveMapaComCasas = false;
  let raioAtual = 1;

  const $ = id => document.getElementById(id);

  function mat(cor, opcoes = {}) {
    return new THREE.MeshStandardMaterial({
      color: cor, roughness: 0.92, metalness: 0, ...opcoes
    });
  }

  function caixa(pai, w, h, d, cor, x, y, z, opcoes = {}) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w,h,d),
      mat(cor, opcoes.material || {})
    );
    mesh.position.set(x,y,z);
    mesh.castShadow = opcoes.sombra !== false;
    mesh.receiveShadow = true;
    pai.add(mesh);
    return mesh;
  }

  function hashTexto(texto) {
    let h = 2166136261;
    for (const ch of String(texto || 'nebo')) {
      h ^= ch.charCodeAt(0);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function gerarBlocos(quantidade) {
    const coords = [[0,0]];
    for (let camada = 1; coords.length < quantidade; camada++) {
      for (let x=-camada; x<camada; x++) coords.push([x,-camada]);
      for (let z=-camada; z<camada; z++) coords.push([camada,z]);
      for (let x=camada; x>-camada; x--) coords.push([x,camada]);
      for (let z=camada; z>-camada; z--) coords.push([-camada,z]);
    }
    return coords.slice(0,quantidade);
  }

  function ordenarCasas(lista) {
    return lista.slice().sort((a,b) => {
      const ta = Number(a.criadaEm || a.atualizadoEm || 0);
      const tb = Number(b.criadaEm || b.atualizadoEm || 0);
      return ta - tb || String(a.id || '').localeCompare(String(b.id || ''));
    });
  }

  function criarPlaca(nome) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 112;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFF8E8';
    ctx.beginPath();

    if (ctx.roundRect) ctx.roundRect(7,7,498,98,25);
    else ctx.rect(7,7,498,98);

    ctx.fill();
    ctx.strokeStyle = '#6C5945';
    ctx.lineWidth = 8;
    ctx.stroke();

    ctx.fillStyle = '#42372E';
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(nome || 'Nebo').slice(0,20),256,56,450);

    const textura = new THREE.CanvasTexture(canvas);
    if ('colorSpace' in textura && THREE.SRGBColorSpace) {
      textura.colorSpace = THREE.SRGBColorSpace;
    }

    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: textura,
        transparent: true,
        depthTest: false
      })
    );
    sprite.scale.set(6.5,1.42,1);
    return sprite;
  }

  function criarCasa(dados,x,z,indice) {
    const grupo = new THREE.Group();
    grupo.position.set(x,0,z);

    const h = hashTexto(dados.id || dados.nome || indice);
    const andares = 2 + (h % 3);
    const largura = 5.05 + ((h >>> 4) % 3) * 0.22;
    const profundidade = 4.8;
    const altura = andares * 1.72;
    const cor = CORES_CASAS[h % CORES_CASAS.length];
    const telhado = CORES_TELHADO[(h >>> 5) % CORES_TELHADO.length];

    // Base e paredes
    caixa(grupo,largura+0.46,0.32,profundidade+0.46,'#D6C7A8',0,0.16,0);
    caixa(grupo,largura,altura,profundidade,cor,0,altura/2+0.32,0);

    // Telhado plano com borda, no estilo da referência
    caixa(grupo,largura+0.42,0.22,profundidade+0.42,'#E8D9B8',0,altura+0.45,0);
    caixa(grupo,largura-0.25,0.10,profundidade-0.25,telhado,0,altura+0.60,0);
    caixa(grupo,0.92,0.34,0.76,'#B8B19C',-1.35,altura+0.82,-0.78,{sombra:false});
    caixa(grupo,0.58,0.18,0.48,'#76776E',-1.35,altura+1.08,-0.78,{sombra:false});

    // Molduras
    caixa(grupo,0.13,altura,0.12,'#F4E5C5',-largura/2+0.12,altura/2+0.32,profundidade/2+0.035,{sombra:false});
    caixa(grupo,0.13,altura,0.12,'#F4E5C5',largura/2-0.12,altura/2+0.32,profundidade/2+0.035,{sombra:false});

    // Janelas
    for (let andar=0; andar<andares; andar++) {
      const wy = 1.15 + andar*1.72;

      for (const wx of [-1.28,1.28]) {
        caixa(grupo,0.88,0.98,0.14,'#F4E5C5',wx,wy+0.32,profundidade/2+0.09,{sombra:false});
        caixa(grupo,0.66,0.75,0.06,'#83B9C4',wx,wy+0.32,profundidade/2+0.18,{
          sombra:false,
          material:{roughness:0.42,metalness:0.05}
        });
        caixa(grupo,0.70,0.06,0.08,'#F9EBD1',wx,wy-0.12,profundidade/2+0.21,{sombra:false});
      }
    }

    // Porta e toldo
    caixa(grupo,0.85,1.52,0.16,'#865B45',0,1.08,profundidade/2+0.11,{sombra:false});
    caixa(grupo,1.13,0.17,0.52,'#F0D7A7',0,1.92,profundidade/2+0.22,{sombra:false});
    caixa(grupo,0.07,0.07,0.06,'#E8C56B',0.25,1.04,profundidade/2+0.21,{sombra:false});

    // Pequenos vasos
    for (const lado of [-1,1]) {
      caixa(grupo,0.48,0.40,0.42,'#B98260',lado*2.18,0.38,profundidade/2+0.42,{sombra:false});
      caixa(grupo,0.56,0.48,0.48,'#719B5B',lado*2.18,0.79,profundidade/2+0.42,{sombra:false});
    }

    // O nome da dona fica sobre a casa
    const placa = criarPlaca(dados.nome || 'Nebo');
    placa.position.set(0,altura+1.95,0);
    grupo.add(placa);

    grupo.userData.imovel = {
      id:dados.id,
      nome:dados.nome || 'Nebo',
      tipo:'Casa',
      pers:dados.pers || ''
    };

    grupo.traverse(obj => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });

    placa.renderOrder = 5;
    grupo.userData.indiceCasa = indice;
    grupoCidade.add(grupo);
    casasRenderizadas.push(grupo);
  }

  function criarArvore(x,z,escala=1) {
    const g = new THREE.Group();
    g.position.set(x,0,z);

    caixa(g,0.42*escala,1.18*escala,0.42*escala,'#8D684A',0,0.59*escala,0);
    caixa(g,1.25*escala,1.08*escala,1.18*escala,'#6C9859',0,1.55*escala,0);
    caixa(g,0.94*escala,0.75*escala,0.92*escala,'#80A965',0,2.12*escala,0.02);

    grupoCidade.add(g);
  }

  function criarPoste(x,z) {
    const g = new THREE.Group();
    g.position.set(x,0,z);

    caixa(g,0.16,2.65,0.16,'#6A6256',0,1.32,0);
    caixa(g,0.68,0.15,0.42,'#6A6256',0.20,2.62,0);
    caixa(g,0.35,0.20,0.30,'#F9D99A',0.48,2.52,0,{
      sombra:false,
      material:{emissive:'#B98843',emissiveIntensity:0.14}
    });

    grupoCidade.add(g);
  }

  function criarPracaCentral() {
    caixa(grupoCidade,22.4,0.14,22.4,'#80A967',0,0.01,0,{sombra:false});
    caixa(grupoCidade,2,0.06,21.8,'#D8CBAA',0,0.10,0,{sombra:false});
    caixa(grupoCidade,21.8,0.06,2,'#D8CBAA',0,0.11,0,{sombra:false});

    const fonte = new THREE.Mesh(
      new THREE.CylinderGeometry(2.1,2.35,0.52,8),
      mat('#D8C9A4')
    );
    fonte.position.set(0,0.42,0);
    fonte.castShadow = true;
    grupoCidade.add(fonte);

    const agua = new THREE.Mesh(
      new THREE.CylinderGeometry(1.65,1.65,0.10,8),
      mat('#78B8C7',{roughness:0.35,metalness:0.05})
    );
    agua.position.set(0,0.73,0);
    grupoCidade.add(agua);

    const jato = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12,0.18,0.64,6),
      mat('#9CCED3')
    );
    jato.position.set(0,1.08,0);
    grupoCidade.add(jato);

    [[-8,-8],[8,-8],[-8,8],[8,8]].forEach(p => criarArvore(p[0],p[1],0.84));
    caixa(grupoCidade,2,0.28,0.58,'#A77C58',-5.5,0.38,0,{sombra:false});
    caixa(grupoCidade,2,0.28,0.58,'#A77C58',5.5,0.38,0,{sombra:false});
  }

  function criarRuas(raio,extent) {
    const ruaMat = '#4E4A43';
    const calcada = '#D1C5A8';
    const guia = '#AAA58F';

    for (let k=-raio-1; k<=raio; k++) {
      const p = k*BLOCO+BLOCO/2;

      caixa(grupoCidade,4.7,0.10,extent*2,ruaMat,p,0.03,0,{sombra:false});
      caixa(grupoCidade,extent*2,0.10,4.7,ruaMat,0,0.03,p,{sombra:false});

      for (const lado of [-1,1]) {
        const off = lado*2.85;
        caixa(grupoCidade,0.76,0.14,extent*2,calcada,p+off,0.07,0,{sombra:false});
        caixa(grupoCidade,extent*2,0.14,0.76,calcada,0,0.07,p+off,{sombra:false});
        caixa(grupoCidade,0.12,0.12,extent*2,guia,p+lado*2.42,0.12,0,{sombra:false});
        caixa(grupoCidade,extent*2,0.12,0.12,guia,0,0.12,p+lado*2.42,{sombra:false});
      }

      for (let s=-extent+4; s<extent; s+=8) {
        caixa(grupoCidade,0.18,0.025,2.35,'#F5EBDD',p,0.095,s,{sombra:false});
        caixa(grupoCidade,2.35,0.025,0.18,'#F5EBDD',s,0.095,p,{sombra:false});
      }

      for (let s=-extent+15; s<extent; s+=30) {
        if (Math.abs(s)<12 && Math.abs(p)<18) continue;
        if (k%2===0) criarPoste(p+4.1,s);
      }
    }
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
            if (m.map) m.map.dispose();
            m.dispose();
          });
        }
      });
    }
    casasRenderizadas = [];
  }


function criarTerrenoRelevo(extent) {
  // Terreno plano no centro e montanhas ao redor.
  const margem = Math.max(900, extent * 3.8);
  const lado = (extent + margem) * 2;
  const segmentos = Math.min(
    132,
    Math.max(84, Math.ceil(lado / 18))
  );

  const geometria = new THREE.PlaneGeometry(
    lado, lado, segmentos, segmentos
  ).toNonIndexed();

  const pos = geometria.attributes.position;

  const larguraTransicao = Math.max(210, extent * 0.48);
  const deslocamento = Math.max(175, extent * 0.22);
  const raioMorro = Math.max(145, extent * 0.24);
  const escalaAltura = Math.max(1, extent / 330);

  // Picos distribuídos ao redor da cidade.
  const picos = [
    [ extent + deslocamento, -extent * 0.14, 52],
    [-extent - deslocamento,  extent * 0.10, 60],
    [ extent * 0.12, extent + deslocamento, 48],
    [-extent * 0.10, -extent - deslocamento, 54],
    [ extent + deslocamento * 1.30,
      extent + deslocamento * 1.16, 38],
    [-extent - deslocamento * 1.24,
     -extent - deslocamento * 1.12, 32]
  ];

  // Criar a altura de cada ponto do terreno.
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = -pos.getY(i);
    const borda = Math.max(Math.abs(x), Math.abs(z));

    let t = (borda - (extent + 12)) / larguraTransicao;
    t = Math.max(0, Math.min(1, t));

    // Faz a elevação começar suavemente.
    const suave = t * t * (3 - 2 * t);

    const ondas =
      Math.sin(x * 0.013 + Math.sin(z * 0.009) * 1.7) * 0.50 +
      Math.cos(z * 0.019 - x * 0.011) * 0.32 +
      Math.sin((x + z) * 0.033) * 0.18;

    let morros = 0;

    for (const [hx, hz, altura] of picos) {
      const dx = x - hx;
      const dz = z - hz;
      const distancia = Math.sqrt(dx * dx + dz * dz);
      const influencia = Math.max(
        0, 1 - distancia / (raioMorro * 1.55)
      );

      morros += altura * influencia * influencia * escalaAltura;
    }

    pos.setZ(i, suave * (4 + ondas * 13 + morros));
  }

  // Paleta facetada de grama, musgo e pedra.
  const verdes = [
    '#9DC778', '#A8C97E', '#B6D18B',
    '#8DB56A', '#C1D791', '#83AB61'
  ];

  const pedras = [
    '#A9A995', '#C0B9A1', '#909985', '#B3AC96'
  ];

  const cores = new Float32Array(pos.count * 3);

  // Cada triângulo recebe uma variação sutil de cor.
  for (let i = 0; i < pos.count; i += 3) {
    const cx = (
      pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)
    ) / 3;

    const cz = -(
      pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)
    ) / 3;

    const alturaMedia = (
      pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)
    ) / 3;

    const sorteio = Math.abs(
      Math.sin(cx * 12.9898 + cz * 78.233) * 43758.5453
    ) % 1;

    const paleta =
      alturaMedia > 20 && sorteio > 0.48 ? pedras : verdes;

    const cor = new THREE.Color(
      paleta[Math.floor(sorteio * paleta.length) % paleta.length]
    );

    for (let j = 0; j < 3; j++) {
      const k = (i + j) * 3;
      cores[k] = cor.r;
      cores[k + 1] = cor.g;
      cores[k + 2] = cor.b;
    }
  }

  geometria.setAttribute(
    'color',
    new THREE.BufferAttribute(cores, 3)
  );

  geometria.computeVertexNormals();
  geometria.computeBoundingSphere();

  const terreno = new THREE.Mesh(
    geometria,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 1,
      metalness: 0
    })
  );

  terreno.rotation.x = -Math.PI / 2;
  terreno.position.y = -0.12;
  terreno.receiveShadow = true;
  terreno.castShadow = false;

  return terreno;
}

   
  function construirCidade(lista,recentralizar=false) {
    if (!scene || !grupoCidade) return;

    limparCidade();
    const casas = ordenarCasas(lista);
    const blocosPorCasa = Math.max(1,Math.ceil(casas.length/CASAS_POR_QUARTEIRAO));
    const coords = gerarBlocos(blocosPorCasa+1);
    let raio = 1;

    for (let i=1; i<coords.length; i++) {
      raio = Math.max(raio,Math.abs(coords[i][0]),Math.abs(coords[i][1]));
    }

    raioAtual = Math.max(1,raio);
    const extent = (raioAtual+1.2)*BLOCO;

// A névoa acompanha o tamanho da cidade
if (scene.fog) {
  scene.fog.near = Math.max(180, extent * 1.25);
  scene.fog.far = Math.max(800, extent * 5);
}
     
    
    const chao = criarTerrenoRelevo(extent);
    grupoCidade.add(chao);

    chao.rotation.x = -Math.PI/2;
    chao.position.y = -0.12;
    chao.receiveShadow = true;
    grupoCidade.add(chao);

    criarRuas(raioAtual,extent);
    criarPracaCentral();

    casas.forEach((casa,i) => {
      const bloco = coords[Math.floor(i/CASAS_POR_QUARTEIRAO)+1] || [0,0];
      const off = OFFSETS_CASA[i%CASAS_POR_QUARTEIRAO];
      criarCasa(casa,bloco[0]*BLOCO+off[0],bloco[1]*BLOCO+off[1],i);
    });

    const blocosUsados = new Set();
    casas.forEach((c,i) => blocosUsados.add(Math.floor(i/CASAS_POR_QUARTEIRAO)+1));

    blocosUsados.forEach(indice => {
      const b = coords[indice] || [0,0];
      criarArvore(b[0]*BLOCO-10.2,b[1]*BLOCO-10.2,0.62);
      criarArvore(b[0]*BLOCO+10.2,b[1]*BLOCO+10.2,0.56);
    });

    if (luzSol) {
      const span = (raioAtual+1.4)*BLOCO;
      luzSol.shadow.camera.left = -span;
      luzSol.shadow.camera.right = span;
      luzSol.shadow.camera.top = span;
      luzSol.shadow.camera.bottom = -span;
      luzSol.shadow.camera.far = span*4;
      luzSol.shadow.camera.updateProjectionMatrix();
    }

    const contador = $('c3count');
    if (contador) contador.textContent = casas.length+(casas.length===1?' casa registrada':' casas registradas');
    const estado = $('c3status');
    if (estado) estado.textContent = houvePrimeiraLeitura?'Cidade sincronizada':'Conectando ao Firebase…';

    ajustarCamera(recentralizar || !camera.userData || !camera.userData.posicionada);
  }

  function ajustarCamera(resetar=false) {
    if (!camera || !controls) return;

    const distancia = Math.max(58,(raioAtual+1.1)*BLOCO*1.48);
    controls.minDistance = 20;
    controls.maxDistance = Math.max(130,distancia*2.8);

    if (resetar || !camera.userData || !camera.userData.posicionada) {
      camera.position.set(distancia*0.85,distancia*0.82,distancia*0.92);
      controls.target.set(0,0.6,0);
      camera.userData = camera.userData || {};
      camera.userData.posicionada = true;
      controls.update();
    }
  }

  function abrirInfoCasa(evento) {
    if (!renderer || !camera) return;

    const rect = renderer.domElement.getBoundingClientRect();
    const ponto = new THREE.Vector2(
      ((evento.clientX-rect.left)/rect.width)*2-1,
      -((evento.clientY-rect.top)/rect.height)*2+1
    );

    const raio = new THREE.Raycaster();
    raio.setFromCamera(ponto,camera);
    const intersecoes = raio.intersectObjects(casasRenderizadas,true);
    if (!intersecoes.length) return;

    let obj = intersecoes[0].object;
    while (obj && !obj.userData.imovel) obj = obj.parent;
    if (!obj) return;

    const dados = obj.userData.imovel;
    const painel = $('c3info');
    if (!painel) return;

    $('c3infonome').textContent = dados.nome || 'Casa da Nebo';
    $('c3infotipo').textContent = 'Residência · '+(dados.pers || 'personalidade não informada');
    painel.hidden = false;
  }

  function ajustarTamanho() {
    if (!renderer || !camera) return;
    const area = $('c3canvas');
    if (!area) return;
    const w = area.clientWidth || window.innerWidth;
    const h = area.clientHeight || window.innerHeight;

    camera.aspect = w/h;
    camera.updateProjectionMatrix();
    renderer.setSize(w,h);
  }

  function mostrarErro(texto) {
    const status = $('c3status');
    if (status) status.textContent = texto;
  }

  function montarCena() {
    if (iniciado || !window.THREE || !THREE.OrbitControls) return;
    const area = $('c3canvas');
    if (!area) return;

    iniciado = true;
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#C5C5BC');
   scene.fog = new THREE.Fog('#C5C5BC',180,800);
    camera = new THREE.PerspectiveCamera(39,1,0.1,1200);
    renderer = new THREE.WebGLRenderer({antialias:true,alpha:false});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    if (THREE.ACESFilmicToneMapping) renderer.toneMapping = THREE.ACESFilmicToneMapping;
   renderer.toneMappingExposure = 1.00;

    if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    } else if ('outputEncoding' in renderer && THREE.sRGBEncoding) {
      renderer.outputEncoding = THREE.sRGBEncoding;
    }

    area.appendChild(renderer.domElement);
    controls = new THREE.OrbitControls(camera,renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.maxPolarAngle = Math.PI/2.08;
    controls.minDistance = 20;
    controls.enablePan = true;
    controls.target.set(0,0.6,0);

    // Sol baixo e lateral para sombras longas como na primeira referência.
    scene.add(new THREE.HemisphereLight('#FFF1D0','#68665B',0.42));

    luzSol = new THREE.DirectionalLight('#FFE0A1',2.45);
    luzSol.position.set(42,34,36);
    luzSol.castShadow = true;
    luzSol.shadow.mapSize.set(2048,2048);
    luzSol.shadow.bias = -0.00025;
    luzSol.shadow.normalBias = 0.035;
    luzSol.shadow.radius = 3;
    luzSol.shadow.camera.near = 1;
    luzSol.shadow.camera.far = 450;
    scene.add(luzSol);

    const preenchimento = new THREE.DirectionalLight('#E1EACB',0.24);
    preenchimento.position.set(24,20,32);
    scene.add(preenchimento);

    grupoCidade = new THREE.Group();
    scene.add(grupoCidade);

    renderer.domElement.addEventListener('click',abrirInfoCasa);
    window.addEventListener('resize',ajustarTamanho);
    ajustarTamanho();

    construirCidade([]);
    renderer.setAnimationLoop(() => {
      if (controls) controls.update();
      renderer.render(scene,camera);
    });

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
          id:d.id || doc.id,
          nome:String(d.nome).slice(0,22)
        });
      });

      const ordenadas = ordenarCasas(casas);
      const assinatura = ordenadas.map(c =>
        [c.id,c.nome,c.criadaEm || c.atualizadoEm || '',c.pers || ''].join(':')
      ).join('|');

      houvePrimeiraLeitura = true;
      mostrarErro('Cidade sincronizada com Firebase');

      if (assinatura === ultimaAssinatura) return;
      ultimaAssinatura = assinatura;

      const recentralizar = ordenadas.length>0 && !houveMapaComCasas;
      if (ordenadas.length>0) houveMapaComCasas = true;
      construirCidade(ordenadas,recentralizar);
    },erro => {
      console.error('Erro ao sincronizar a Cidade Nebo:',erro);
      mostrarErro('Não foi possível ler as casas. Confira as regras do Firebase.');
    });
  }

  function criarPainel() {
    if ($('cidade3d')) return;

    const el = document.createElement('section');
    el.id = 'cidade3d';
    el.hidden = true;

    el.innerHTML =
      '<div class="c3-top">' +
        '<div class="c3-title">' +
          '<span class="c3-eyebrow">UNIVERSO COMPARTILHADO</span>' +
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
      '<div class="c3-help">Arraste para explorar · Use a roda do mouse para aproximar · Clique em uma casa para conhecê-la</div>' +
      '<div id="c3info" hidden>' +
        '<button id="c3infoclose" type="button" aria-label="Fechar informações">×</button>' +
        '<span class="c3-info-eyebrow">CASA DA NEBO</span>' +
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
      renderer.setAnimationLoop(() => {
        if (controls) controls.update();
        renderer.render(scene,camera);
      });
      conectarFirebase();
    }
  }

  window.abrirCidade3D = abrirCidade;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded',() => {
      criarPainel();
      if (typeof S !== 'undefined' && S.modo === 'cidade') abrirCidade();
    },{once:true});
  } else {
    criarPainel();
    if (typeof S !== 'undefined' && S.modo === 'cidade') abrirCidade();
  }
})();
