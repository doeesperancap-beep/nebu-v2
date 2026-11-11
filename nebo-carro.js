
/* ============================================================
   NEBO CARRO — modo independente por instância
   Ativa somente com ?carro=1
   Não altera S, Firebase ou outras Nebos.
   ============================================================ */

(() => {
  if (new URLSearchParams(location.search).get('carro') !== '1') return;

  const css = document.createElement('style');
  css.textContent = `
    #nebo-carro-box {
      position:fixed; z-index:10060;
      top:max(12px,env(safe-area-inset-top));
      left:50%; transform:translateX(-50%);
      width:min(350px,calc(100vw - 28px));
      padding:14px; border:1px solid rgba(205,170,255,.3);
      border-radius:16px; background:rgba(19,12,30,.95);
      color:#f7edff; font:13px/1.45 system-ui;
      text-align:center; box-shadow:0 8px 30px #0008;
    }
    #nebo-carro-box strong {display:block;font-size:16px}
    #nebo-carro-box p {opacity:.8}
    #nebo-carro-box button {
      border:0;border-radius:999px;padding:9px 14px;
      margin:4px;background:#c9a3ff;color:#241333;
      font-weight:700;
    }
    #nebo-carro-status {display:block;margin-top:8px;opacity:.75}
  `;
  document.head.appendChild(css);

  const box = document.createElement('section');
  box.id = 'nebo-carro-box';
  box.innerHTML = `
    <strong>🚗 Modo Nebo Carro</strong>
    <p>Prenda o celular ao carrinho e deixe-o parado para calibrar.</p>
    <button id="carro-sensores">Ativar sensores</button>
    <button id="carro-gps">Ativar velocidade GPS</button>
    <span id="nebo-carro-status">
      Modo isolado. As outras Nebos não serão afetadas.
    </span>
  `;
  document.body.appendChild(box);

  const status = document.getElementById('nebo-carro-status');
  const botaoSensores = document.getElementById('carro-sensores');
  const botaoGPS = document.getElementById('carro-gps');

  let ativo = false;
  let baseBeta = null;
  let baseGamma = null;
  let ultimaReacao = 0;
  let ultimaIntensidade = 0;
  let ultimoMovimento = Date.now();
  let jaSeMoveu = false;
  let gpsId = null;
  let ultimaVelocidade = null;
  let ultimoTempoGPS = null;
  let contagemLento = 0;
  let contagemRapido = 0;

  function reagir(expressao, frase, intervalo = 1700) {
    const agora = Date.now();

    if (!ativo || agora - ultimaReacao < intervalo) return;

    ultimaReacao = agora;

    // Usa o sistema de expressões já existente.
    if (typeof window.set === 'function') {
      window.set(expressao, 1400, frase);
    }
  }

  /* INCLINAÇÕES */

  function orientar(e) {
    if (!ativo || e.beta == null || e.gamma == null) return;

    if (baseBeta === null || baseGamma === null) {
      baseBeta = e.beta;
      baseGamma = e.gamma;
      return;
    }

    const lateral = e.gamma - baseGamma;
    const frente = e.beta - baseBeta;

    if (lateral > 16) {
      reagir(
        'curious',
        'Opa! Estamos inclinando para a direita! 👀'
      );
    } else if (lateral < -16) {
      reagir(
        'curious',
        'Opa! Estamos inclinando para a esquerda! 👀'
      );
    } else if (frente > 18) {
      reagir(
        'surprised',
        'Epa! Estamos inclinando para frente! 😮'
      );
    } else if (frente < -18) {
      reagir(
        'surprised',
        'Uau! Estamos inclinando para trás! 😮'
      );
    }
  }

  /* ARRANCADAS E TREPIDAÇÕES */

  function movimento(e) {
    if (!ativo) return;

    const a = e.acceleration;
    if (!a || a.x == null || a.y == null || a.z == null) return;

    const intensidade = Math.sqrt(
      a.x*a.x + a.y*a.y + a.z*a.z
    );

    const variacao = intensidade - ultimaIntensidade;
    ultimaIntensidade = intensidade;

    if (intensidade > 1.15) {
      ultimoMovimento = Date.now();
      jaSeMoveu = true;
    }

    if (intensidade > 6.2) {
      reagir(
        'scared',
        'Uiii! Que sacolejo! Segura firme! 😳',
        2300
      );
    } else if (intensidade > 2.8 && variacao > 1) {
      reagir(
        'surprised',
        'Uhu! Que arrancada! 😮',
        1900
      );
    } else if (intensidade > 2.2) {
      reagir(
        'dizzy',
        'Eita! Esse caminho está irregular! 😵‍💫',
        2400
      );
    }
  }

  /* VELOCIDADE REAL — GPS OPCIONAL */

  function velocidadeGPS(pos) {
    if (!ativo) return;

    const c = pos.coords;

    // Ignora leituras muito imprecisas.
    if (c.accuracy > 30 || c.speed == null) return;

    const velocidade = c.speed;
    const agora = Date.now();

    if (ultimaVelocidade !== null && ultimoTempoGPS !== null) {
      const segundos = (agora - ultimoTempoGPS) / 1000;

      if (segundos > 0) {
        const aceleracao =
          (velocidade - ultimaVelocidade) / segundos;

        if (aceleracao > 0.9) {
          reagir(
            'surprised',
            'Uhuuu! Que arrancada! 🚀',
            2500
          );
        } else if (aceleracao < -0.9) {
          reagir(
            'scared',
            'Epa! Que freada! 😳',
            2500
          );
        }
      }
    }

    ultimaVelocidade = velocidade;
    ultimoTempoGPS = agora;

    if (velocidade > 2) {
      contagemRapido++;
      contagemLento = 0;

      if (contagemRapido >= 2) {
        reagir(
          'scared',
          'Estamos rápidas demais! Segura firme! 💨',
          6000
        );
        contagemRapido = 0;
      }
    } else {
      contagemRapido = 0;
    }

    if (velocidade > 0.15 && velocidade < 0.45) {
      contagemLento++;

      if (contagemLento >= 3) {
        reagir(
          'bored',
          'Estamos indo tão devagar hoje... 🥱',
          9000
        );
        contagemLento = 0;
      }
    } else {
      contagemLento = 0;
    }
  }

  function erroGPS() {
    status.textContent =
      'GPS indisponível ou sem precisão suficiente. Os outros sensores continuam ativos.';
  }

  /* PARADA */

  setInterval(() => {
    if (!ativo || !jaSeMoveu) return;

    if (Date.now() - ultimoMovimento > 12000) {
      reagir(
        'bored',
        'Estamos quase paradas... será que vamos continuar? 🥱',
        10000
      );

      jaSeMoveu = false;
    }
  }, 12000);

  /* ATIVAÇÃO */

  async function ativarSensores() {
    try {
      if (
        typeof DeviceMotionEvent === 'undefined' &&
        typeof DeviceOrientationEvent === 'undefined'
      ) {
        status.textContent =
          'Este aparelho não disponibiliza sensores compatíveis.';
        return;
      }

      if (
        typeof DeviceMotionEvent !== 'undefined' &&
        typeof DeviceMotionEvent.requestPermission === 'function'
      ) {
        const p = await DeviceMotionEvent.requestPermission();
        if (p !== 'granted') throw new Error('Permissão negada');
      }

      if (
        typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function'
      ) {
        const p = await DeviceOrientationEvent.requestPermission();
        if (p !== 'granted') throw new Error('Permissão negada');
      }

      ativo = true;
      baseBeta = null;
      baseGamma = null;
      ultimaIntensidade = 0;
      ultimoMovimento = Date.now();

      window.addEventListener('deviceorientation', orientar, true);
      window.addEventListener('devicemotion', movimento, true);

      botaoSensores.disabled = true;
      botaoSensores.textContent = 'Sensores ativados';

      status.textContent =
        'Sensores ativos! Deixe o carrinho quietinho por um instante para calibrar.';
    } catch (erro) {
      status.textContent =
        'Não foi possível ativar. Confira as permissões do aparelho.';
      console.warn('Nebo Carro:', erro);
    }
  }

  function ativarGPS() {
    if (!navigator.geolocation) {
      status.textContent = 'GPS não disponível neste navegador.';
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {
        gpsId = navigator.geolocation.watchPosition(
          velocidadeGPS,
          erroGPS,
          {
            enableHighAccuracy: true,
            maximumAge: 1000,
            timeout: 12000
          }
        );

        botaoGPS.disabled = true;
        botaoGPS.textContent = 'GPS ativado';
        status.textContent =
          'GPS ativo. A velocidade é estimada e pode falhar em locais fechados.';
      },
      erroGPS,
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  botaoSensores.addEventListener('click', ativarSensores);
  botaoGPS.addEventListener('click', ativarGPS);
})();
