
/* ============================================================
   NEBO CARRO — sensores independentes da Nébula normal
   Ativa somente com ?carro=1
   Não altera o estado salvo, Firebase ou outras Nebos.
   ============================================================ */

(() => {
  if (new URLSearchParams(location.search).get('carro') !== '1') return;

  const css = document.createElement('style');
  css.textContent = `
    #nebo-carro-box {
      position: fixed;
      z-index: 10060;
      top: max(12px, env(safe-area-inset-top));
      left: 50%;
      transform: translateX(-50%);
      width: min(350px, calc(100vw - 28px));
      padding: 14px;
      border: 1px solid rgba(205,170,255,.3);
      border-radius: 16px;
      background: rgba(19,12,30,.95);
      color: #f7edff;
      font: 13px/1.45 system-ui;
      text-align: center;
      box-shadow: 0 8px 30px #0008;
    }
    #nebo-carro-box strong { display: block; font-size: 16px; }
    #nebo-carro-box p { opacity: .8; margin: 7px 0; }
    #nebo-carro-box button {
      border: 0;
      border-radius: 999px;
      padding: 9px 14px;
      margin: 4px;
      background: #c9a3ff;
      color: #241333;
      font-weight: 700;
      cursor: pointer;
    }
    #nebo-carro-box button:disabled { opacity: .6; cursor: wait; }
    #nebo-carro-status { display: block; margin-top: 8px; opacity: .82; }
  `;
  document.head.appendChild(css);

  const box = document.createElement('section');
  box.id = 'nebo-carro-box';
  box.innerHTML = `
    <strong>🚗 Modo Nebo Carro</strong>
    <p id="carro-instrucao">Mantenha o celular preso ao carrinho e parado durante a calibração.</p>
    <button id="carro-sensores" type="button">Permitir sensores</button>
    <button id="carro-gps" type="button">Ativar velocidade GPS</button>
    <span id="nebo-carro-status">Preparando os sensores...</span>
  `;
  document.body.appendChild(box);

  const status = document.getElementById('nebo-carro-status');
  const instrucao = document.getElementById('carro-instrucao');
  const botaoSensores = document.getElementById('carro-sensores');
  const botaoGPS = document.getElementById('carro-gps');

  let ativo = false;
  let gpsAtivo = false;
  let gpsId = null;

  // Calibração de inclinação.
  let baseBeta = null;
  let baseGamma = null;
  let somaBeta = 0;
  let somaGamma = 0;
  let amostrasOrientacao = 0;
  let inicioCalibracao = 0;
  let inclinacaoAtual = 'nivelado';

  // Filtro para remover a gravidade.
  let gravidade = null;
  let ultimaAceleracao = null;
  let ultimoImpacto = 0;
  let ultimaReacao = 0;

  // Velocidade GPS.
  let historicoVelocidade = [];
  let ultimaVelocidade = null;
  let ultimoTempoGPS = null;
  let contagemRapido = 0;
  let contagemLento = 0;
  let contagemParado = 0;
  let jaAndou = false;

  function mostrarStatus(texto) {
    status.textContent = texto;
  }

  function reagir(expressao, frase, intervalo = 1900) {
    const agora = Date.now();
    if (!ativo || agora - ultimaReacao < intervalo) return;

    ultimaReacao = agora;

    // Muda somente a expressão visual da Nebo.
    if (typeof window.set === 'function') {
      window.set(expressao, 1900, frase);
    } else {
      mostrarStatus(frase);
    }
  }

  function numeroValido(v) {
    return typeof v === 'number' && Number.isFinite(v);
  }

  /* ======================== INCLINAÇÃO ======================== */

  function orientar(e) {
    if (!ativo || !numeroValido(e.beta) || !numeroValido(e.gamma)) return;

    // Calibra a posição em que o carrinho foi colocado.
    if (baseBeta === null || baseGamma === null) {
      somaBeta += e.beta;
      somaGamma += e.gamma;
      amostrasOrientacao++;

      if (Date.now() - inicioCalibracao >= 1100 && amostrasOrientacao >= 8) {
        baseBeta = somaBeta / amostrasOrientacao;
        baseGamma = somaGamma / amostrasOrientacao;
        instrucao.textContent = 'Inclinação, aceleração e trepidações estão sendo monitoradas.';
        mostrarStatus('Sensores ativos. Inclinação e movimento estão sendo observados.');
      }
      return;
    }

    const lateral = e.gamma - baseGamma;
    const frente = e.beta - baseBeta;
    const intensidadeLateral = Math.abs(lateral);
    const intensidadeFrente = Math.abs(frente);

    // Evita oscilações causadas por pequenas vibrações.
    let novoEstado = inclinacaoAtual;
    const limiteEntrada = 14;
    const limiteSaida = 8;

    if (intensidadeLateral < limiteSaida && intensidadeFrente < limiteSaida) {
      novoEstado = 'nivelado';
    } else if (intensidadeLateral >= intensidadeFrente) {
      if (lateral >= limiteEntrada) novoEstado = 'direita';
      else if (lateral <= -limiteEntrada) novoEstado = 'esquerda';
    } else {
      if (frente >= limiteEntrada) novoEstado = 'frente';
      else if (frente <= -limiteEntrada) novoEstado = 'tras';
    }

    if (novoEstado === inclinacaoAtual) return;

    const estadoAnterior = inclinacaoAtual;
    inclinacaoAtual = novoEstado;

    if (novoEstado === 'direita') {
      reagir('curious', 'Opa! O carrinho está pendendo para a direita! 👀');
    } else if (novoEstado === 'esquerda') {
      reagir('dizzy', 'Eita! Estamos inclinando para a esquerda! 😵‍💫');
    } else if (novoEstado === 'frente') {
      reagir('surprised', 'Uau! A frente do carrinho está baixando! 😮');
    } else if (novoEstado === 'tras') {
      reagir('scared', 'Epa! O carrinho está empinando para trás! 😳');
    } else if (estadoAnterior !== 'nivelado') {
      reagir('happy', 'Prontinho! Voltamos ao equilíbrio. 💗', 1200);
    }
  }

  /* ======================== ACELERAÇÃO ======================== */

  function obterAceleracaoLinear(e) {
    const a = e.acceleration;

    // Usa aceleração sem gravidade quando disponível.
    if (a && numeroValido(a.x) && numeroValido(a.y) && numeroValido(a.z)) {
      return { x: a.x, y: a.y, z: a.z };
    }

    // Alternativa: remove a gravidade por filtragem.
    const total = e.accelerationIncludingGravity;
    if (!total || !numeroValido(total.x) || !numeroValido(total.y) || !numeroValido(total.z)) {
      return null;
    }

    const atual = { x: total.x, y: total.y, z: total.z };
    const dt = Math.min(.20, Math.max(.008, (Number(e.interval) || 16) / 1000));
    const alpha = 1 - Math.exp(-dt / .85);

    if (!gravidade) {
      gravidade = { ...atual };
      return null;
    }

    gravidade.x += (atual.x - gravidade.x) * alpha;
    gravidade.y += (atual.y - gravidade.y) * alpha;
    gravidade.z += (atual.z - gravidade.z) * alpha;

    return {
      x: atual.x - gravidade.x,
      y: atual.y - gravidade.y,
      z: atual.z - gravidade.z
    };
  }

  function movimento(e) {
    if (!ativo) return;

    const a = obterAceleracaoLinear(e);
    if (!a) return;

    const intensidade = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
    const agora = Date.now();
    const dt = ultimaAceleracao
      ? Math.min(.20, Math.max(.008, (agora - ultimaAceleracao.tempo) / 1000))
      : .016;
    const variacao = ultimaAceleracao
      ? Math.abs(intensidade - ultimaAceleracao.intensidade) / dt
      : 0;

    ultimaAceleracao = { intensidade, tempo: agora };

    // Acelerômetro reconhece impactos e mudanças bruscas,
    // mas não mede velocidade constante.
    if (intensidade >= 5.2 && agora - ultimoImpacto > 2200) {
      ultimoImpacto = agora;
      reagir('scared', 'Uiii! Que solavanco forte! Segura firme! 😳', 2200);
    } else if (intensidade >= 2.6 && variacao >= 18 && agora - ultimoImpacto > 1800) {
      ultimoImpacto = agora;
      reagir('dizzy', 'Esse caminho está bem irregular! 😵‍💫', 1900);
    } else if (intensidade >= 1.7 && variacao >= 8 && agora - ultimoImpacto > 1800) {
      ultimoImpacto = agora;
      reagir('surprised', 'Uhu! Sentimos uma arrancada! 🚀', 1900);
    }
  }

  /* ======================== VELOCIDADE GPS ======================== */

  function velocidadeGPS(pos) {
    if (!ativo || !gpsAtivo) return;

    const c = pos.coords;
    if (!numeroValido(c.speed) || !numeroValido(c.accuracy) || c.accuracy > 35) {
      return;
    }

    const agora = Date.now();
    const velocidadeBruta = Math.max(0, c.speed);

    historicoVelocidade.push(velocidadeBruta);
    if (historicoVelocidade.length > 4) historicoVelocidade.shift();
    const velocidade = historicoVelocidade.reduce((s, v) => s + v, 0) / historicoVelocidade.length;

    if (ultimaVelocidade !== null && ultimoTempoGPS !== null) {
      const segundos = (agora - ultimoTempoGPS) / 1000;
      if (segundos >= .5 && segundos <= 8) {
        const aceleracao = (velocidade - ultimaVelocidade) / segundos;

        if (aceleracao >= .95) {
          reagir('surprised', 'Uhuuu! Estamos ganhando velocidade! 🚀', 2600);
        } else if (aceleracao <= -.95) {
          reagir('scared', 'Epa! Estamos perdendo velocidade de repente! 😳', 2600);
        }
      }
    }

    ultimaVelocidade = velocidade;
    ultimoTempoGPS = agora;

    // 2 m/s equivalem a 7,2 km/h.
    if (velocidade >= 2) {
      contagemRapido++;
      contagemLento = 0;
      contagemParado = 0;
      jaAndou = true;

      if (contagemRapido >= 3) {
        const kmh = Math.round(velocidade * 3.6);
        reagir('scared', `Uau, ${kmh} km/h! Estamos rápidas demais! 💨`, 5500);
        contagemRapido = 0;
      }
    } else {
      contagemRapido = 0;
    }

    if (velocidade > .10 && velocidade <= .50) {
      contagemLento++;
      contagemParado = 0;

      if (contagemLento >= 4) {
        reagir('bored', 'Estamos andando bem devagarinho hoje... 🥱', 8500);
        contagemLento = 0;
      }
    } else {
      contagemLento = 0;
    }

    if (velocidade <= .10 && jaAndou) {
      contagemParado++;
      if (contagemParado >= 4) {
        reagir('sleepy', 'Paramos? Acho que estacionamos! 💤', 9000);
        contagemParado = 0;
        jaAndou = false;
      }
    } else if (velocidade > .10) {
      contagemParado = 0;
    }
  }

  function erroGPS(erro) {
    gpsAtivo = false;
    if (gpsId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(gpsId);
      gpsId = null;
    }

    botaoGPS.disabled = false;
    botaoGPS.textContent = 'Tentar GPS novamente';

    if (erro && erro.code === 1) {
      mostrarStatus('GPS não autorizado. Inclinação e trepidações continuam funcionando.');
    } else {
      mostrarStatus('GPS sem sinal preciso agora. Os outros sensores continuam ativos.');
    }
  }

  function ativarGPS() {
    if (!navigator.geolocation) {
      mostrarStatus('Este navegador não disponibiliza GPS. Os outros sensores continuam ativos.');
      botaoGPS.remove();
      return;
    }

    botaoGPS.disabled = true;
    botaoGPS.textContent = 'Conectando GPS...';
    mostrarStatus('Solicitando a leitura de velocidade pelo GPS...');

    gpsId = navigator.geolocation.watchPosition(
      (pos) => {
        const c = pos.coords;
        const preciso = Number.isFinite(c.speed) && Number.isFinite(c.accuracy) && c.accuracy <= 35;
        if (!preciso) {
          mostrarStatus('GPS ligado, mas ainda sem precisão suficiente. Aguardando uma leitura melhor...');
          return;
        }
        if (!gpsAtivo) {
          gpsAtivo = true;
          botaoGPS.remove();
          mostrarStatus('GPS conectado. Agora também consigo distinguir velocidade e paradas.');
        }
        velocidadeGPS(pos);
      },
      erroGPS,
      {
        enableHighAccuracy: true,
        maximumAge: 500,
        timeout: 15000
      }
    );
  }

  /* ======================== ATIVAÇÃO DOS SENSORES ======================== */

  async function ativarSensores() {
    if (ativo) return;

    const temMovimento = typeof DeviceMotionEvent !== 'undefined';
    const temOrientacao = typeof DeviceOrientationEvent !== 'undefined';

    if (!temMovimento && !temOrientacao) {
      mostrarStatus('Este aparelho não disponibiliza sensores de movimento compatíveis.');
      botaoSensores.remove();
      return;
    }

    try {
      let movimentoPermitido = temMovimento;
      let orientacaoPermitida = temOrientacao;

      // Solicita as duas permissões juntas para preservar o toque inicial.
      const pedidos = [];

      if (temMovimento && typeof DeviceMotionEvent.requestPermission === 'function') {
        pedidos.push(DeviceMotionEvent.requestPermission().then(p => {
          movimentoPermitido = p === 'granted';
        }));
      }

      if (temOrientacao && typeof DeviceOrientationEvent.requestPermission === 'function') {
        pedidos.push(DeviceOrientationEvent.requestPermission().then(p => {
          orientacaoPermitida = p === 'granted';
        }));
      }

      await Promise.all(pedidos);

      if (!movimentoPermitido && !orientacaoPermitida) {
        throw new Error('Permissão dos sensores negada');
      }

      ativo = true;
      inicioCalibracao = Date.now();
      baseBeta = null;
      baseGamma = null;
      somaBeta = 0;
      somaGamma = 0;
      amostrasOrientacao = 0;
      inclinacaoAtual = 'nivelado';
      gravidade = null;
      ultimaAceleracao = null;

      if (orientacaoPermitida) {
        window.addEventListener('deviceorientation', orientar, true);
      }

      if (movimentoPermitido) {
        window.addEventListener('devicemotion', movimento, true);
      }

      // O botão desaparece assim que os sensores são autorizados.
      botaoSensores.remove();

      if (orientacaoPermitida) {
        instrucao.textContent = 'Calibrando a posição inicial...';
        mostrarStatus('Sensores autorizados. Deixe o carrinho quietinho por um instante.');
      } else {
        instrucao.textContent = 'Aceleração e trepidações estão sendo monitoradas.';
        mostrarStatus('Sensores de movimento ativos. A inclinação não está disponível neste aparelho.');
      }

    } catch (erro) {
      mostrarStatus('Não consegui acessar os sensores. Confira as permissões do navegador e tente novamente.');
      console.warn('Nebo Carro — sensores:', erro);
    }
  }

  botaoSensores.addEventListener('click', ativarSensores);
  botaoGPS.addEventListener('click', ativarGPS);

  // Sem exigência de toque, a ativação acontece automaticamente.
  const exigeToque =
    (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') ||
    (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function');

  if (!exigeToque && (typeof DeviceMotionEvent !== 'undefined' || typeof DeviceOrientationEvent !== 'undefined')) {
    ativarSensores();
  } else if (exigeToque) {
    mostrarStatus('Toque em “Permitir sensores” uma única vez para liberar os movimentos.');
  }

  window.addEventListener('pagehide', () => {
    if (gpsId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(gpsId);
      gpsId = null;
    }
  });
})();
