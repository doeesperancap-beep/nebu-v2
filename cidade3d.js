
(() => {
  if (window.__nebulaCity3DLoaded) return;
  window.__nebulaCity3DLoaded = true;

  let scene, camera, renderer, controls;
  let houses = 0;
  let cityRoot;
  let animationId;
  let started = false;

  function start() {
    if (document.getElementById('cidade3d')) return;

    const root = document.createElement('section');
    root.id = 'cidade3d';
    root.hidden = true;
    root.innerHTML = `
      <div class="c3-top">
        <div class="c3-title">🌆 Nébula City <span id="c3count">🏠 8 casas</span></div>
        <div>
          <button id="c3home">🎯 Centralizar</button>
          <button id="c3close">✕ Voltar</button>
        </div>
      </div>
      <div id="c3canvas" style="flex:1;min-height:0"></div>
      <div class="c3-help">🖱️ Arraste para girar · Rode a rodinha para aproximar</div>
      <div class="c3-bottom">
        <button id="c3add">🏡 Nova casa</button>
        <button id="c3park">🌳 Criar parque</button>
      </div>`;
    document.body.appendChild(root);

    document.getElementById('c3close').onclick = () => {
      root.hidden = true;
      if (renderer) renderer.setAnimationLoop(null);
    };
    document.getElementById('c3home').onclick = () => {
      if (!camera || !controls) return;
      camera.position.set(18, 22, 25);
      controls.target.set(0, 0, 0);
      controls.update();
    };
    document.getElementById('c3add').onclick = addHouse;
    document.getElementById('c3park').onclick = addPark;


    // Three.js e controles oficiais carregados por CDN
    if (!window.THREE) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js';
      script.onload = loadControls;
      script.onerror = () => alert('Não consegui carregar a cidade 3D. Confira sua internet.');
      document.head.appendChild(script);
    } else loadControls();

    function loadControls() {
      if (window.THREE.OrbitControls) {
        setup();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
      script.onload = setup;
      script.onerror = () => alert('Não consegui carregar os controles 3D.');
      document.head.appendChild(script);
    }

    function setup() {
      if (started) return;
      started = true;
      const THREE = window.THREE;
      const mount = document.getElementById('c3canvas');

      scene = new THREE.Scene();
      scene.background = new THREE.Color('#b8dafa');
      scene.fog = new THREE.Fog('#b8dafa', 45, 100);

      camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
      camera.position.set(18, 22, 25);

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      mount.appendChild(renderer.domElement);

      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.maxPolarAngle = Math.PI / 2.05;
      controls.minDistance = 8;
      controls.maxDistance = 65;
      controls.target.set(0, 0, 0);

      scene.add(new THREE.HemisphereLight('#ffffff', '#8d9c9e', 2));
      const sun = new THREE.DirectionalLight('#fff4d6', 2.4);
      sun.position.set(12, 25, 10);
      sun.castShadow = true;
      scene.add(sun);

      cityRoot = new THREE.Group();
      scene.add(cityRoot);

      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100),
        new THREE.MeshStandardMaterial({ color: '#a8d9a0' })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.08;
      ground.receiveShadow = true;
      cityRoot.add(ground);

      // Ruas em grade e calçadas
      for (let i = -4; i <= 4; i++) {
        const road1 = new THREE.Mesh(
          new THREE.BoxGeometry(100, 0.12, 3.2),
          new THREE.MeshStandardMaterial({ color: '#626b7a' })
        );
        road1.position.set(0, 0, i * 8);
        cityRoot.add(road1);

        const road2 = new THREE.Mesh(
          new THREE.BoxGeometry(3.2, 0.12, 100),
          new THREE.MeshStandardMaterial({ color: '#626b7a' })
        );
        road2.position.set(i * 8, 0, 0);
        cityRoot.add(road2);

        for (const side of [-1, 1]) {
          const sidewalk = new THREE.Mesh(
            new THREE.BoxGeometry(100, 0.16, 0.55),
            new THREE.MeshStandardMaterial({ color: '#e6d9d2' })
          );
          sidewalk.position.set(0, 0.02, i * 8 + side * 1.9);
          cityRoot.add(sidewalk);
        }
      }

      // Quarteirões com casas e prédios
      const colors = ['#ffb7ca', '#b9a7ff', '#ffda92', '#9ce3dc', '#c6e6ff'];
      const positions = [
        [-5, -5], [5, -5], [-5, 5], [5, 5],
        [-13, -13], [13, -13], [-13, 13], [13, 13]
      ];
      positions.forEach((p, i) => makeHouse(p[0], p[1], colors[i % colors.length], i === 6 ? 1.8 : 1));

      // Prédios centrais
      for (let i = 0; i < 5; i++) {
        const building = new THREE.Mesh(
          new THREE.BoxGeometry(2.5, 3 + i * 0.8, 2.5),
          new THREE.MeshStandardMaterial({ color: colors[i] })
        );
        building.position.set(-21 + i * 3.5, (3 + i * 0.8) / 2, -5);
        building.castShadow = true;
        cityRoot.add(building);

        for (let y = 1; y < 3 + i; y++) {
          const windowMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.35, 0.04),
            new THREE.MeshStandardMaterial({ color: '#fff3b0', emissive: '#423b22' })
          );
          windowMesh.position.set(building.position.x, y * 0.8, -3.72);
          cityRoot.add(windowMesh);
        }
      }

      // Lago e parque inicial
      addLake();
      addParkAt(-20, 12);
      addTrees();

      window.addEventListener('resize', resize);
      resize();

      renderer.setAnimationLoop(() => {
        controls.update();
        renderer.render(scene, camera);
      });
    }
  }

  function makeHouse(x, z, color, scale = 1) {
    const THREE = window.THREE;
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.scale.setScalar(scale);

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 2.2, 2.8),
      new THREE.MeshStandardMaterial({ color })
    );
    base.position.y = 1.15;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(2.45, 1.3, 4),
      new THREE.MeshStandardMaterial({ color: '#8d527c' })
    );
    roof.position.y = 2.9;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 1.1, 0.08),
      new THREE.MeshStandardMaterial({ color: '#76503b' })
    );
    door.position.set(0, 0.6, 1.44);
    group.add(door);

    const windowMaterial = new THREE.MeshStandardMaterial({ color: '#b9ecff', emissive: '#27485b' });
    for (const xw of [-0.9, 0.9]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.08), windowMaterial);
      win.position.set(xw, 1.45, 1.44);
      group.add(win);
    }

    cityRoot.add(group);
    houses++;
    return group;
  }

  function addHouse() {
    if (!cityRoot) return;
    const colors = ['#ffb7ca', '#b9a7ff', '#ffda92', '#9ce3dc', '#c6e6ff', '#ffc6a8'];
    const i = houses;
    const x = ((i % 5) - 2) * 5 + 2;
    const z = (Math.floor(i / 5) - 1) * 5 + 2;
    makeHouse(x, z, colors[i % colors.length]);
    const counter = document.getElementById('c3count');
    if (counter) counter.textContent = `🏠 ${houses} casas`;
  }

  function addLake() {
    const THREE = window.THREE;
    const lake = new THREE.Mesh(
      new THREE.CircleGeometry(5, 32),
      new THREE.MeshStandardMaterial({ color: '#7bd7f0', roughness: 0.25 })
    );
    lake.rotation.x = -Math.PI / 2;
    lake.position.set(23, 0.04, 18);
    cityRoot.add(lake);
  }

  function addParkAt(x, z) {
    const THREE = window.THREE;
    const grass = new THREE.Mesh(
      new THREE.BoxGeometry(8, 0.18, 7),
      new THREE.MeshStandardMaterial({ color: '#7bc77b' })
    );
    grass.position.set(x, 0.05, z);
    cityRoot.add(grass);
    addTree(x - 2, z);
    addTree(x + 2, z + 1);
    addTree(x, z - 2);
  }

  function addPark() {
    if (!cityRoot) return;
    const i = Math.floor(houses / 2);
    addParkAt(-20 + (i % 3) * 9, 20 + Math.floor(i / 3) * 9);
  }

  function addTree(x, z) {
    const THREE = window.THREE;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.25, 1, 7),
      new THREE.MeshStandardMaterial({ color: '#805536' })
    );
    trunk.position.set(x, 0.5, z);
    cityRoot.add(trunk);

    const leaves = new THREE.Mesh(
      new THREE.SphereGeometry(0.85, 9, 7),
      new THREE.MeshStandardMaterial({ color: '#45a86b' })
    );
    leaves.position.set(x, 1.4, z);
    leaves.castShadow = true;
    cityRoot.add(leaves);
  }

  function addTrees() {
    for (let i = 0; i < 18; i++) {
      addTree(-30 + i * 3.5, 30 + (i % 2) * 2);
    }
  }

  function resize() {
    if (!renderer || !camera) return;
    const mount = document.getElementById('c3canvas');
    if (!mount) return;
    const w = mount.clientWidth || innerWidth;
    const h = mount.clientHeight || innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function open() {
    start();
    const root = document.getElementById('cidade3d');
    if (!root) return;
    root.hidden = false;
    if (renderer) {
      resize();
      renderer.setAnimationLoop(() => {
        controls.update();
        renderer.render(scene, camera);
      });
    }
  }

  document.addEventListener('DOMContentLoaded', start);
  window.abrirCidade3D = open;
})();

