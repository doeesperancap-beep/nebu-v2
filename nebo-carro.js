
/* ============================================================
   NEBO CARRO — SISTEMA DE MOVIMENTO
   Ativa somente com ?carro=1
   Sem GPS, sem localização e sem interferência na Nebo normal.
   ============================================================ */

(() => {
  if (new URLSearchParams(location.search).get('carro') !== '1') return;

  /* ===================== PAINEL DE AUTORIZAÇÃO ===================== */

  const estilo = document.createElement('style');

  estilo.textContent = `
    #nebo-carro-box {
      position: fixed;
      z-index: 10060;
      top: max(12px, env(safe-area-inset-top));
      left: 50%;
      transform: translateX(-50%);
      width: min(350px, calc(100vw - 28px));
      padding: 16px;
      border: 1px solid rgba(205,170,255,.3);
      border-radius: 16px;
      background: rgba(19,12,30,.96);
      color: #f7edff;
      font: 13px/1.5 system-ui;
      text-align: center;
      box-shadow: 0 8px 30px #0008;
    }

    #nebo-carro-box strong {
      display: block;
      font-size: 16px;
    }

    #nebo-carro-box p {
      opacity: .8;
    }

    #nebo-carro-box button {
      border: 0;
      border-radius: 999px;
      padding: 10px 18px;
      background: #c9a3ff;
      color: #241333;
      font-weight: 700;
      cursor: pointer;
    }

    #nebo-carro-status {
      display: block;
      margin-top: 9px;
      opacity: .8;
    }
  `;

  document.head.appendChild(estilo);

  const box = document.createElement('section');
  box.id = 'nebo-carro-box';

  box.innerHTML = `
    <strong>🚗 Modo Nebo Carro</strong>
    <p>Permita o acesso aos sensores para começarmos!</p>
    <button id="carro-sensores" type="button">
      Permitir sensores
    </button>
    <span id="nebo-carro-status"></span>
  `;

  document.body.appendChild(box);

  const botao = document.getElementById('carro-sensores');
  const status = document.getElementById('nebo-carro-status');

  /* ===================== ESTADOS INTERNOS ===================== */

  let ativo = false;

  // Calibração da posição.
  let baseBeta = null;
  let baseGamma = null;
  let somaBeta = 0;
  let somaGamma = 0;
  let amostras = 0;
  let inicioCalibracao = 0;
  let calibrado = false;

  // Inclinação.
  let inclinacao = 'nivelado';

  // Aceleração.
  let gravidade = null;
  let ultimaAceleracao = null;
  let ultimoImpacto = 0;

  // Controle das reações.
  let ultimaReacao = 0;
  let reacaoAtual = '';

  function valido(n) {
    return typeof n === 'number' && Number.isFinite(n);
  }

  /* ===================== EXPRESSÕES DA NEBO ===================== */

  function reagir(expressao, frase, intervalo = 1800) {
    if (!ativo) return;

    const agora = Date.now();

    if (agora - ultimaReacao < intervalo) return;

    ultimaReacao = agora;
    reacaoAtual = expressao;

    if (typeof window.set === 'function') {
      window.set(expressao, 1900, frase);
    }
  }

  /* ===================== CALIBRAÇÃO ===================== */

  function calibrar(e) {
    if (!valido(e.beta) || !valido(e.gamma)) return false;

    somaBeta += e.beta;
    somaGamma += e.gamma;
    amostras++;

    if (Date.now() - inicioCalibracao < 1200 || amostras < 10) {
      return false;
    }

    baseBeta = somaBeta / amostras;
    baseGamma = somaGamma / amostras;

    calibrado = true;

    return true;
  }

  /* ===================== INCLINAÇÃO ===================== */

  function orientar(e) {
    if (!ativo || !valido(e.beta) || !valido(e.gamma)) return;

    if (!calibrado) {
      calibrar(e);
      return;
    }

    const lateral = e.gamma - baseGamma;
    const frente = e.beta - baseBeta;

    const absLateral = Math.abs(lateral);
    const absFrente = Math.abs(frente);

    let novoEstado = inclinacao;

    // Pequena zona neutra para evitar oscilações.
    if (absLateral < 8 && absFrente < 8) {
      novoEstado = 'nivelado';
    } else if (absLateral >= absFrente) {
      if (lateral > 14) novoEstado = 'direita';
      else if (lateral < -14) novoEstado = 'esquerda';
    } else {
      if (frente > 14) novoEstado = 'frente';
      else if (frente < -14) novoEstado = 'tras';
    }

    if (novoEstado === inclinacao) return;

    const anterior = inclinacao;
    inclinacao = novoEstado;

    switch (novoEstado) {
      case 'direita':
        reagir(
          'curious',
          'Opa! Estamos inclinando para a direita! 👀'
        );
        break;

      case 'esquerda':
        reagir(
          'dizzy',
          'Eita! Estamos inclinando para a esquerda! 😵‍💫'
        );
        break;

      case 'frente':
        reagir(
          'surprised',
          'Uau! Estamos descendo para frente! 😮'
        );
        break;

      case 'tras':
        reagir(
          'scared',
          'Epa! Estamos inclinando para trás! 😳'
        );
        break;

      case 'nivelado':
        if (anterior !== 'nivelado') {
          reagir(
            'happy',
            'Voltamos ao equilíbrio! 💗',
            1200
          );
        }
        break;
    }
  }

  /* ===================== FILTRO DE GRAVIDADE ===================== */

  function obterAceleracao(e) {
    const a = e.acceleration;

    // Prioridade para a aceleração sem gravidade.
    if (a && valido(a.x) && valido(a.y) && valido(a.z)) {
      return { x: a.x, y: a.y, z: a.z };
    }

    // Alternativa para aparelhos que incluem a gravidade.
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

    const dt = Math.min(
      .20,
      Math.max(.008, (Number(e.interval) || 16) / 1000)
    );

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

  /* ===================== MOVIMENTO ===================== */

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
      ? Math.max(.008, Math.min(
          .20,
          (agora - ultimaAceleracao.tempo) / 1000
        ))
      : .016;

    const variacao = ultimaAceleracao
      ? Math.abs(
          intensidade - ultimaAceleracao.intensidade
        ) / dt
      : 0;

    ultimaAceleracao = {
      intensidade,
      tempo: agora
    };

    if (agora - ultimoImpacto < 1200) return;

    // 1. Impacto forte.
    if (intensidade >= 5.2) {
      ultimoImpacto = agora;

      reagir(
        'scared',
        'Uiii! Que solavanco forte! 😳',
        2300
      );

      return;
    }

    // 2. Caminho irregular.
    if (intensidade >= 2.6 && variacao >= 18) {
      ultimoImpacto = agora;

      reagir(
        'dizzy',
        'Esse caminho está bem irregular! 😵‍💫',
        2200
      );

      return;
    }

    // 3. Arrancada.
    if (intensidade >= 1.7 && variacao >= 8) {
      ultimoImpacto = agora;

      reagir(
        'surprised',
        'Uhu! Que arrancada! 🚀',
        2000
      );

      return;
    }

    // 4. Movimento leve.
    if (intensidade >= .9 && variacao >= 4) {
      ultimoImpacto = agora;

      reagir(
        'curious',
        'Estamos nos movimentando! 👀',
        2800
      );
    }
  }

  /* ===================== ATIVAÇÃO ===================== */

  async function ativarSensores() {
    if (ativo) return;

    const temMovimento =
      typeof DeviceMotionEvent !== 'undefined';

    const temOrientacao =
      typeof DeviceOrientationEvent !== 'undefined';

    if (!temMovimento && !temOrientacao) {
      status.textContent =
        'Sensores não disponíveis neste aparelho.';
      return;
    }

    botao.disabled = true;
    botao.textContent = 'Autorizando...';

    try {
      let movimentoPermitido = temMovimento;
      let orientacaoPermitida = temOrientacao;

      const pedidos = [];

      if (
        temMovimento &&
        typeof DeviceMotionEvent.requestPermission === 'function'
      ) {
        pedidos.push(
          DeviceMotionEvent.requestPermission().then(p => {
            movimentoPermitido = p === 'granted';
          })
        );
      }

      if (
        temOrientacao &&
        typeof DeviceOrientationEvent.requestPermission === 'function'
      ) {
        pedidos.push(
          DeviceOrientationEvent.requestPermission().then(p => {
            orientacaoPermitida = p === 'granted';
          })
        );
      }

      await Promise.all(pedidos);

      if (!movimentoPermitido && !orientacaoPermitida) {
        throw new Error('Permissões negadas');
      }

      // Ativação confirmada.
      ativo = true;

      inicioCalibracao = Date.now();

      baseBeta = null;
      baseGamma = null;
      somaBeta = 0;
      somaGamma = 0;
      amostras = 0;
      calibrado = false;

      gravidade = null;
      ultimaAceleracao = null;
      inclinacao = 'nivelado';

      // Conecta somente os sensores autorizados.
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

      // LIMPEZA COMPLETA: painel e estilo são removidos.
      box.remove();
      estilo.remove();

    } catch (erro) {
      botao.disabled = false;
      botao.textContent = 'Tentar novamente';

      status.textContent =
        'Não consegui acessar os sensores. Verifique as permissões.';

      console.warn('Nebo Carro:', erro);
    }
  }

  botao.addEventListener('click', ativarSensores);

  /* ===================== INICIALIZAÇÃO ===================== */

  const exigeToque =
    (
      typeof DeviceMotionEvent !== 'undefined' &&
      typeof DeviceMotionEvent.requestPermission === 'function'
    ) ||
    (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function'
    );

  // Android e outros navegadores sem permissão explícita.
  if (
    !exigeToque &&
    (typeof DeviceMotionEvent !== 'undefined' ||
     typeof DeviceOrientationEvent !== 'undefined')
  ) {
    ativarSensores();
  }

  // iPhone: aguarda o toque para solicitar autorização.
  else if (exigeToque) {
    status.textContent =
      'Toque uma vez para liberar os sensores.';
  }

})();
