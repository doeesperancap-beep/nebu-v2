
/* ============================================================
   NEBO CARRO — sensores independentes
   Ativa somente com ?carro=1
   Sem GPS. Sem localização. Sem alterar a Nebo normal.
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
    #nebo-carro-box strong {
      display: block;
      font-size: 16px;
    }
    #nebo-carro-box p {
      opacity: .8;
      margin: 7px 0;
    }
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
    #nebo-carro-status {
      display: block;
      margin-top: 8px;
      opacity: .82;
    }
  `;
  document.head.appendChild(css);

  const box = document.createElement('section');
  box.id = 'nebo-carro-box';

  box.innerHTML = `
    <strong>🚗 Modo Nebo Carro</strong>
    <p id="carro-instrucao">
      Mantenha o celular preso ao carrinho para calibrar.
    </p>
    <button id="carro-sensores" type="button">
      Permitir sensores
    </button>
    <span id="nebo-carro-status">
      Preparando sensores...
    </span>
  `;

  document.body.appendChild(box);

  const status = document.getElementById('nebo-carro-status');
  const instrucao = document.getElementById('carro-instrucao');
  const botaoSensores = document.getElementById('carro-sensores');

  let ativo = false;

  // Calibração
  let baseBeta = null;
  let baseGamma = null;
  let somaBeta = 0;
  let somaGamma = 0;
  let amostras = 0;
  let inicioCalibracao = 0;
  let inclinacao = 'nivelado';

  // Filtro de movimento
  let gravidade = null;
  let ultimaAceleracao = null;
  let ultimoImpacto = 0;
  let ultimaReacao = 0;

  function reagir(expressao, frase, intervalo = 1900) {
    const agora = Date.now();

    if (!ativo || agora - ultimaReacao < intervalo) return;

    ultimaReacao = agora;

    if (typeof window.set === 'function') {
      window.set(expressao, 1900, frase);
    } else {
      status.textContent = frase;
    }
  }

  function valido(v) {
    return typeof v === 'number' && Number.isFinite(v);
  }

  /* ============================================================
     INCLINAÇÃO
     ============================================================ */

  function orientar(e) {
    if (!ativo || !valido(e.beta) || !valido(e.gamma)) return;

    // Calibração da posição inicial.
    if (baseBeta === null || baseGamma === null) {
      somaBeta += e.beta;
      somaGamma += e.gamma;
      amostras++;

      if (Date.now() - inicioCalibracao >= 1100 && amostras >= 8) {
        baseBeta = somaBeta / amostras;
        baseGamma = somaGamma / amostras;

        instrucao.textContent =
          'Estou observando os movimentos do carrinho!';

        status.textContent = 'Sensores funcionando. 💗';
      }

      return;
    }

    const lateral = e.gamma - baseGamma;
    const frente = e.beta - baseBeta;

    const absLateral = Math.abs(lateral);
    const absFrente = Math.abs(frente);

    let novoEstado = inclinacao;

    if (absLateral < 8 && absFrente < 8) {
      novoEstado = 'nivelado';
    } else if (absLateral >= absFrente) {
      if (lateral >= 14) novoEstado = 'direita';
      else if (lateral <= -14) novoEstado = 'esquerda';
    } else {
      if (frente >= 14) novoEstado = 'frente';
      else if (frente <= -14) novoEstado = 'tras';
    }

    if (novoEstado === inclinacao) return;

    const anterior = inclinacao;
    inclinacao = novoEstado;

    if (novoEstado === 'direita') {
      reagir('curious',
        'Opa! Estamos pendendo para a direita! 👀');
    }

    else if (novoEstado === 'esquerda') {
      reagir('dizzy',
        'Eita! Estamos inclinando para a esquerda! 😵‍💫');
    }

    else if (novoEstado === 'frente') {
      reagir('surprised',
        'Uau! A frente está inclinando para baixo! 😮');
    }

    else if (novoEstado === 'tras') {
      reagir('scared',
        'Epa! Estamos inclinando para trás! 😳');
    }

    else if (anterior !== 'nivelado') {
      reagir('happy',
        'Voltamos ao equilíbrio! 💗', 1200);
    }
  }

  /* ============================================================
     ACELERAÇÃO E TREPIDAÇÕES
     ============================================================ */

  function obterAceleracao(e) {
    const a = e.acceleration;

    if (a && valido(a.x) && valido(a.y) && valido(a.z)) {
      return { x: a.x, y: a.y, z: a.z };
    }

    // Alternativa quando o aparelho inclui a gravidade.
    const total = e.accelerationIncludingGravity;

    if (!total ||
        !valido(total.x) ||
        !valido(total.y) ||
        !valido(total.z)) {
      return null;
    }

    const atual = {
      x: total.x,
      y: total.y,
      z: total.z
    };

    const dt = Math.min(.20,
      Math.max(.008, (Number(e.interval) || 16) / 1000));

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

    const a = obterAceleracao(e);
    if (!a) return;

    const intensidade = Math.sqrt(
      a.x * a.x +
      a.y * a.y +
      a.z * a.z
    );

    const agora = Date.now();

    const dt = ultimaAceleracao
      ? Math.min(.20, Math.max(.008,
          (agora - ultimaAceleracao.tempo) / 1000))
      : .016;

    const variacao = ultimaAceleracao
      ? Math.abs(intensidade -
          ultimaAceleracao.intensidade) / dt
      : 0;

    ultimaAceleracao = {
      intensidade,
      tempo: agora
    };

    // Solavanco forte.
    if (intensidade >= 5.2 &&
        agora - ultimoImpacto > 2200) {

      ultimoImpacto = agora;

      reagir('scared',
        'Uiii! Que solavanco forte! 😳',
        2200);
    }

    // Caminho irregular.
    else if (intensidade >= 2.6 &&
             variacao >= 18 &&
             agora - ultimoImpacto > 1800) {

      ultimoImpacto = agora;

      reagir('dizzy',
        'Esse caminho está bem irregular! 😵‍💫',
        1900);
    }

    // Arrancada ou mudança rápida de movimento.
    else if (intensidade >= 1.7 &&
             variacao >= 8 &&
             agora - ultimoImpacto > 1800) {

      ultimoImpacto = agora;

      reagir('surprised',
        'Uhu! Sentimos uma arrancada! 🚀',
        1900);
    }
  }

  /* ============================================================
     ATIVAÇÃO
     ============================================================ */

  async function ativarSensores() {
    if (ativo) return;

    const temMovimento =
      typeof DeviceMotionEvent !== 'undefined';

    const temOrientacao =
      typeof DeviceOrientationEvent !== 'undefined';

    if (!temMovimento && !temOrientacao) {
      status.textContent =
        'Este aparelho não disponibiliza sensores compatíveis.';

     // Remove todo o painel após a autorização.
box.remove();
      return;
    }

    botaoSensores.disabled = true;
    botaoSensores.textContent = 'Autorizando...';

    try {
      let movimentoPermitido = temMovimento;
      let orientacaoPermitida = temOrientacao;

      const pedidos = [];

      if (temMovimento &&
          typeof DeviceMotionEvent.requestPermission === 'function') {

        pedidos.push(
          DeviceMotionEvent.requestPermission().then(p => {
            movimentoPermitido = p === 'granted';
          })
        );
      }

      if (temOrientacao &&
          typeof DeviceOrientationEvent.requestPermission === 'function') {

        pedidos.push(
          DeviceOrientationEvent.requestPermission().then(p => {
            orientacaoPermitida = p === 'granted';
          })
        );
      }

      await Promise.all(pedidos);

      if (!movimentoPermitido && !orientacaoPermitida) {
        throw new Error('Permissão negada');
      }

      ativo = true;

      baseBeta = null;
      baseGamma = null;
      somaBeta = 0;
      somaGamma = 0;
      amostras = 0;
      inicioCalibracao = Date.now();

      gravidade = null;
      ultimaAceleracao = null;
      inclinacao = 'nivelado';

      if (orientacaoPermitida) {
        window.addEventListener(
          'deviceorientation',
          orientar,
          true
        );
      }

      if (movimentoPermitido) {
        window.addEventListener(
          'devicemotion',
          movimento,
          true
        );
      }

      // O botão desaparece depois da autorização.
      botaoSensores.remove();

      if (orientacaoPermitida) {
        instrucao.textContent =
          'Calibrando a posição inicial...';

        status.textContent =
          'Sensores autorizados! Deixe o carrinho quietinho.';
      } else {
        instrucao.textContent =
          'Monitorando aceleração e trepidações.';

        status.textContent =
          'Aceleração ativa. Inclinação indisponível.';
      }

    } catch (erro) {
      botaoSensores.disabled = false;
      botaoSensores.textContent = 'Tentar novamente';

      status.textContent =
        'Não consegui acessar os sensores. Confira as permissões.';

      console.warn('Nebo Carro:', erro);
    }
  }

  botaoSensores.addEventListener('click', ativarSensores);

  // Aparelhos sem solicitação explícita começam automaticamente.
  const exigeToque =
    (typeof DeviceMotionEvent !== 'undefined' &&
     typeof DeviceMotionEvent.requestPermission === 'function') ||
    (typeof DeviceOrientationEvent !== 'undefined' &&
     typeof DeviceOrientationEvent.requestPermission === 'function');

  if (!exigeToque &&
      (typeof DeviceMotionEvent !== 'undefined' ||
       typeof DeviceOrientationEvent !== 'undefined')) {

    ativarSensores();

  } else if (exigeToque) {
    status.textContent =
      'Toque em Permitir sensores uma única vez.';
  }

})();
