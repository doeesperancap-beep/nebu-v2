
(() => {
  const botao = document.getElementById('nebo-apresentacao-toggle');
  if (!botao) return;

  let ativa = false;
  let wakeLock = null;

  function atualizar() {
    const cheia = !!document.fullscreenElement;
    botao.textContent = cheia ? '↩' : '⛶';
    botao.title = cheia
      ? 'Voltar ao navegador (Esc)'
      : 'Ativar apresentação';
  }

  async function manterTelaAcesa() {
    if (!ativa || document.visibilityState !== 'visible') return;
    if (!('wakeLock' in navigator) || wakeLock) return;

    try {
      wakeLock = await navigator.wakeLock.request('screen');

      wakeLock.addEventListener('release', () => {
        wakeLock = null;
      });
    } catch (e) {
      console.info('Wake Lock indisponível:', e);
    }
  }

  async function sair() {
    ativa = false;

    if (wakeLock) {
      try { await wakeLock.release(); } catch {}
      wakeLock = null;
    }

    if (document.fullscreenElement) {
      try { await document.exitFullscreen(); } catch {}
    }

    atualizar();
  }

  async function entrar() {
    ativa = true;

    try {
      await document.documentElement.requestFullscreen({
        navigationUI: 'hide'
      });
    } catch (e) {
      console.info('Tela cheia indisponível:', e);
    }

    await manterTelaAcesa();
    atualizar();
  }

  botao.addEventListener('click', () => {
    if (ativa || document.fullscreenElement) sair();
    else entrar();
  });

  document.addEventListener('fullscreenchange', () => {
    atualizar();

    if (!document.fullscreenElement && ativa) {
      ativa = false;
      if (wakeLock) {
        wakeLock.release().catch(() => {});
        wakeLock = null;
      }
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (ativa && document.visibilityState === 'visible') {
      manterTelaAcesa();
    }
  });

  atualizar();
})();
