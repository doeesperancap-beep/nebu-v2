/* ============================================================
   NÉBULA — Painel de configurações
   Interface em azul-noite, roxo e lavanda.
   O formulário de ideias NÃO envia nem armazena mensagens.
   ============================================================ */
(() => {
  'use strict';

  const CONFIG_KEY = 'nebula-config-v1';
  const CLIMA_KEY = 'nebula-clima-local';
  const padrao = { som: true, climaLocal: false };

  function lerConfig() {
    let salvo = {};
    try {
      salvo = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}') || {};
    } catch {}

    const atual = { ...padrao, ...salvo };

    try {
      const climaLegado = localStorage.getItem(CLIMA_KEY);
      if (climaLegado !== null) atual.climaLocal = climaLegado === '1';
    } catch {}

    return atual;
  }

  let config = lerConfig();
  let secaoAtual = 'inicio';
  let rascunho = '';

  function guardarConfig() {
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    } catch {}

    try {
      localStorage.setItem(CLIMA_KEY, config.climaLocal ? '1' : '0');
    } catch {}
  }

  function escapar(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));
  }

  function nomeDaPersonalidade() {
    if (typeof S === 'undefined' || !S.pers) {
      return 'Ainda não escolhida';
    }

    const nomes = {
      carinhosa: '🥰 Carinhosa',
      curiosa: '🧐 Curiosa',
      tranquila: '😴 Tranquila',
      brincalhona: '😂 Brincalhona',
      temperamental: '😤 Temperamental',
      reservada: '😶 Reservada'
    };

    return nomes[S.pers] || String(S.pers);
  }

  const raiz = document.createElement('div');
  raiz.id = 'cfg-overlay';
  raiz.setAttribute('aria-hidden', 'true');

  raiz.innerHTML = `
    <section class="cfg-app"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cfg-title">

      <aside class="cfg-sidebar">
        <div class="cfg-brand">
          <span class="cfg-brand-mark">✦</span>
          <div>
            <b>NÉBULA</b>
            <small>Central de controle</small>
          </div>
        </div>

        <div class="cfg-menu-label">CONFIGURAÇÕES</div>

        <nav class="cfg-nav" aria-label="Categorias de configurações">
          <button class="cfg-nav-item active" data-cfg-nav="inicio">
            <span class="cfg-nav-icon c-violet">⌂</span>
            <span>Visão geral</span>
            <span class="cfg-chevron">›</span>
          </button>

          <button class="cfg-nav-item" data-cfg-nav="preferencias">
            <span class="cfg-nav-icon c-blue">☼</span>
            <span>Preferências</span>
            <span class="cfg-chevron">›</span>
          </button>

          <button class="cfg-nav-item" data-cfg-nav="privacidade">
            <span class="cfg-nav-icon c-teal">◈</span>
            <span>Privacidade e dados</span>
            <span class="cfg-chevron">›</span>
          </button>

          <button class="cfg-nav-item" data-cfg-nav="ajuda">
            <span class="cfg-nav-icon c-pink">✉</span>
            <span>Ajuda e sugestões</span>
            <span class="cfg-chevron">›</span>
          </button>

          <button class="cfg-nav-item" data-cfg-nav="seguranca">
            <span class="cfg-nav-icon c-orange">♧</span>
            <span>Segurança</span>
            <span class="cfg-chevron">›</span>
          </button>

          <button class="cfg-nav-item" data-cfg-nav="sobre">
            <span class="cfg-nav-icon c-slate">ⓘ</span>
            <span>Sobre a Nébula</span>
            <span class="cfg-chevron">›</span>
          </button>
        </nav>

        <div class="cfg-sidebar-bottom">
          <span class="cfg-status-dot"></span>
          <span>Protótipo em evolução</span>
        </div>
      </aside>

      <main class="cfg-main">
        <header class="cfg-topbar">
          <div class="cfg-breadcrumb">
            <span>NEBULA</span>
            <i>›</i>
            <b id="cfg-breadcrumb-current">Visão geral</b>
          </div>

          <button type="button"
            class="cfg-close"
            data-cfg-close
            aria-label="Fechar configurações"
            title="Fechar">×</button>
        </header>

        <div class="cfg-content" id="cfg-content" tabindex="-1"></div>

        <footer class="cfg-footer">
          <span>✦ Nébula</span>
          <span>Seu pequeno universo, suas escolhas.</span>
        </footer>
      </main>
    </section>
  `;

  document.body.appendChild(raiz);

  const gatilho = document.createElement('button');
  gatilho.type = 'button';
  gatilho.id = 'bConfig';
  gatilho.className = 'cfg-open-button';
  gatilho.setAttribute('aria-label', 'Abrir configurações');
  gatilho.setAttribute('aria-expanded', 'false');
  gatilho.title = 'Configurações';
  gatilho.innerHTML = '<span aria-hidden="true">⚙</span>';
  document.body.appendChild(gatilho);

// Esconde configurações enquanto outra tela ocupa o espaço.
const contextosQueEscondemConfig = [
  '#panel.on',
  '#estado.on',
  '#biblioteca',
  '#doceria',
  '#cidade.on',
  '#cidade3d:not([hidden])',
  '#telaSpa',
  '#tela-foco',
  '#bib-loja-painel',
  '#bib-escolha',
  '#bib-menu'
];

function atualizarBotaoConfig() {
  const ocupado =
    document.body.classList.contains('modo-cidade') ||
    contextosQueEscondemConfig.some(seletor => {
      const el = document.querySelector(seletor);

      if (!el || !el.isConnected || el.hidden) return false;

      const estilo = getComputedStyle(el);

      return estilo.display !== 'none' &&
             estilo.visibility !== 'hidden' &&
             el.getClientRects().length > 0;
    });

  gatilho.classList.toggle('cfg-context-hidden', ocupado);
  gatilho.setAttribute('aria-hidden', ocupado ? 'true' : 'false');
  gatilho.tabIndex = ocupado ? -1 : 0;
}

const observarContextosConfig = new MutationObserver(
  atualizarBotaoConfig
);

observarContextosConfig.observe(document.body, {
  subtree: true,
  childList: true,
  attributes: true,
  attributeFilter: ['class', 'hidden']
});

atualizarBotaoConfig();
   
  function estadoSwitch(chave) {
    const ligado = !!config[chave];

    return `
      <button type="button"
        class="cfg-switch ${ligado ? 'on' : ''}"
        role="switch"
        aria-checked="${ligado}"
        data-cfg-toggle="${chave}"
        aria-label="${chave === 'som' ? 'Sons da interface' : 'Clima local'}">
        <span></span>
      </button>
    `;
  }

  function cardDado(icone, titulo, texto, classe = '') {
    return `
      <article class="cfg-data-card">
        <span class="cfg-data-icon ${classe}">${icone}</span>
        <div>
          <b>${titulo}</b>
          <p>${texto}</p>
        </div>
      </article>
    `;
  }

  function renderizar(secao = secaoAtual) {
    secaoAtual = secao;

    const content = raiz.querySelector('#cfg-content');

    const titulos = {
      inicio: 'Visão geral',
      preferencias: 'Preferências',
      privacidade: 'Privacidade e dados',
      ajuda: 'Ajuda e sugestões',
      seguranca: 'Segurança',
      sobre: 'Sobre a Nébula'
    };

    raiz.querySelector('#cfg-breadcrumb-current').textContent =
      titulos[secao] || 'Visão geral';

    raiz.querySelectorAll('[data-cfg-nav]').forEach(btn => {
      const ativo = btn.dataset.cfgNav === secao;
      btn.classList.toggle('active', ativo);

      if (ativo) {
        btn.setAttribute('aria-current', 'page');
      } else {
        btn.removeAttribute('aria-current');
      }
    });

    const nome = typeof S !== 'undefined' && S.nome
      ? escapar(S.nome)
      : 'Sua Nebo';

    const id = typeof S !== 'undefined' && S.id
      ? escapar(S.id)
      : 'Ainda não criado';

    const personalidade = escapar(nomeDaPersonalidade());

    const telas = {
      inicio: `
        <section class="cfg-hero">
          <div class="cfg-hero-copy">
            <span class="cfg-eyebrow">PAINEL DA COMPANHEIRA</span>
            <h1 id="cfg-title">Tudo em um só lugar<span> ✦</span></h1>
            <p>
              Cuide da sua experiência com a Nébula, confira as opções
              e encontre ajuda quando precisar.
            </p>
          </div>

          <div class="cfg-orbit" aria-hidden="true">
            <span class="cfg-orbit-star star-a">✦</span>
            <span class="cfg-orbit-star star-b">✧</span>
            <div class="cfg-orbit-face">
              <i></i><i></i><b>ᴗ</b>
            </div>
            <span class="cfg-orbit-dot"></span>
          </div>
        </section>

        <section class="cfg-profile-card">
          <div class="cfg-profile-avatar">✧</div>

          <div class="cfg-profile-info">
            <span class="cfg-eyebrow">SUA COMPANHEIRA</span>
            <h2>${nome}</h2>
            <p>${personalidade}</p>
            <small>ID: ${id}</small>
          </div>

          <span class="cfg-profile-status">
            <i></i> Perfil deste navegador
          </span>
        </section>

        <h2 class="cfg-section-heading">Acesso rápido</h2>

        <div class="cfg-quick-grid">
          <button class="cfg-quick-card" data-cfg-nav="preferencias">
            <span class="cfg-quick-icon c-blue">☼</span>
            <b>Preferências</b>
            <small>Som e clima local</small>
            <span class="cfg-card-arrow">↗</span>
          </button>

          <button class="cfg-quick-card" data-cfg-nav="privacidade">
            <span class="cfg-quick-icon c-teal">◈</span>
            <b>Privacidade</b>
            <small>Entenda seus dados</small>
            <span class="cfg-card-arrow">↗</span>
          </button>

          <button class="cfg-quick-card" data-cfg-nav="ajuda">
            <span class="cfg-quick-icon c-pink">✉</span>
            <b>Ideias e dúvidas</b>
            <small>Deixe um rascunho</small>
            <span class="cfg-card-arrow">↗</span>
          </button>

          <button class="cfg-quick-card" data-cfg-nav="seguranca">
            <span class="cfg-quick-icon c-orange">♧</span>
            <b>Segurança</b>
            <small>Uso mais seguro</small>
            <span class="cfg-card-arrow">↗</span>
          </button>
        </div>

        <div class="cfg-note">
          <span>✦</span>
          <p>
            <b>Um aviso importante</b><br>
            O painel está sendo montado aos poucos. As ideias ainda não
            são enviadas pela internet e a política oficial de privacidade
            ainda precisa ser publicada.
          </p>
        </div>
      `,

      preferencias: `
        <div class="cfg-page-heading">
          <span class="cfg-eyebrow">PERSONALIZE SUA EXPERIÊNCIA</span>
          <h1 id="cfg-title">Preferências</h1>
          <p>
            Escolha o que funciona melhor para você.
            As alterações ficam salvas neste navegador.
          </p>
        </div>

        <section class="cfg-settings-group">
          <div class="cfg-group-title">
            <span class="cfg-quick-icon c-blue">☼</span>
            <div>
              <h2>Som e ambiente</h2>
              <p>Controle os efeitos da interface e recursos opcionais.</p>
            </div>
          </div>

          <div class="cfg-setting-row">
            <span class="cfg-setting-emoji">🎵</span>
            <div class="cfg-setting-copy">
              <b>Sons da interface</b>
              <p>
                Melodias e efeitos sonoros. A fala da Nebo continua
                sendo controlada pelo botão “Falar”.
              </p>
            </div>
            ${estadoSwitch('som')}
          </div>

          <div class="cfg-setting-row">
            <span class="cfg-setting-emoji">🌦️</span>
            <div class="cfg-setting-copy">
              <b>Clima da sua região</b>
              <p>
                Quando ativado, a Nébula solicita a localização do
                navegador e consulta o serviço Open-Meteo.
                Desligado por padrão.
              </p>
            </div>
            ${estadoSwitch('climaLocal')}
          </div>
        </section>

        <section class="cfg-info-strip">
          <span class="cfg-strip-icon">🎤</span>
          <div>
            <b>Microfone e voz</b>
            <p>
              A escuta começa quando você toca no botão “Falar”.
              Você pode parar a escuta pelo mesmo botão.
              A disponibilidade depende do navegador e das permissões
              do dispositivo.
            </p>
          </div>
        </section>

        <div class="cfg-inline-status" id="cfg-pref-status"
          role="status" aria-live="polite">
          As alterações são aplicadas nesta página.
        </div>
      `,

      privacidade: `
        <div class="cfg-page-heading">
          <span class="cfg-eyebrow">TRANSPARÊNCIA</span>
          <h1 id="cfg-title">Privacidade e dados</h1>
          <p>
            O que o protótipo faz hoje — antes de finalizar
            a política oficial.
          </p>
        </div>

        <div class="cfg-callout">
          <span>🛡️</span>
          <div>
            <b>Política oficial em preparação</b>
            <p>
              Esta tela é um resumo provisório, não substitui a política
              de privacidade. Não inclua dados pessoais nas sugestões
              enquanto os canais oficiais de contato não estiverem publicados.
            </p>
          </div>
        </div>

        <div class="cfg-data-list">
          ${cardDado(
            '▣',
            'Neste navegador',
            'O progresso do jogo e um histórico curto da conversa com a IA são guardados no armazenamento local do navegador (localStorage).',
            'c-violet'
          )}

          ${cardDado(
            '✧',
            'Respostas da IA',
            'A pergunta, o contexto e as mensagens recentes são enviados ao Worker da Nébula para gerar uma resposta. O histórico curto também faz parte do progresso local.',
            'c-blue'
          )}

          ${cardDado(
            '☁',
            'Firebase',
            'O código atual grava informações da casa da Nebo, como nome, identificador, personalidade, necessidades, moedas e estado de conexão. Também usa a coleção de recordes do minijogo. As funções atuais não gravam o texto das conversas nesses documentos.',
            'c-teal'
          )}

          ${cardDado(
            '🌦',
            'Clima local',
            'A localização fica desativada por padrão neste painel. Se você a ativar, o navegador pode solicitar permissão e as coordenadas são usadas na consulta do clima.',
            'c-orange'
          )}
        </div>

        <section class="cfg-settings-group cfg-policy-status">
          <span class="cfg-policy-badge">EM PREPARAÇÃO</span>
          <h2>Política de Privacidade</h2>
          <p>
            A política final deve explicar os responsáveis pelo projeto,
            os serviços externos, quais dados são tratados, por quanto
            tempo, como exercer direitos e como entrar em contato.
            A retenção do provedor de IA precisa ser confirmada na
            configuração real do backend antes de fazer qualquer promessa.
          </p>
          <div class="cfg-muted-line">
            Última revisão deste resumo: versão inicial do painel.
          </div>
        </section>

        <p class="cfg-smallprint">
          Este resumo descreve o código do protótipo consultado durante
          a implementação e pode ficar desatualizado se o projeto mudar.
        </p>
      `,

      ajuda: `
        <div class="cfg-page-heading">
          <span class="cfg-eyebrow">SUA VOZ IMPORTA</span>
          <h1 id="cfg-title">Ajuda e sugestões</h1>
          <p>
            Conte uma ideia, uma dúvida ou um problema para preparar
            uma mensagem.
          </p>
        </div>

        <div class="cfg-callout cfg-callout-soft">
          <span>💌</span>
          <div>
            <b>Seu rascunho não será enviado</b>
            <p>
              Por enquanto, este formulário não transmite nada e não
              guarda o texto. Você pode copiar a mensagem para usar
              depois, quando houver um canal oficial.
            </p>
          </div>
        </div>

        <div class="cfg-form-card">
          <label for="cfg-feedback-type">O que você quer compartilhar?</label>
          <select id="cfg-feedback-type">
            <option value="Ideia ou melhoria">💡 Ideia ou melhoria</option>
            <option value="Problema técnico">🧩 Problema técnico</option>
            <option value="Dúvida sobre o jogo">💬 Dúvida sobre o jogo</option>
          </select>

          <label for="cfg-feedback-text">
            Sua mensagem <span>até 500 caracteres</span>
          </label>

          <textarea
            id="cfg-feedback-text"
            rows="5"
            maxlength="500"
            placeholder="Ex.: seria legal se a Nebo pudesse…"
            autocomplete="off"
            spellcheck="true"></textarea>

          <div class="cfg-form-meta">
            <span id="cfg-char-count">0/500</span>
            <span>Não coloque senha, endereço ou outros dados pessoais.</span>
          </div>

          <button type="button" class="cfg-primary-button" data-cfg-create-draft>
            Preparar mensagem <span>→</span>
          </button>

          <div class="cfg-draft-result" id="cfg-draft-result" hidden>
            <b>Rascunho pronto</b>
            <p id="cfg-draft-preview"></p>
            <button type="button" class="cfg-secondary-button" data-cfg-copy-draft>
              ⧉ Copiar mensagem
            </button>
            <small id="cfg-copy-status" role="status" aria-live="polite">
              Copiar não envia a mensagem.
            </small>
          </div>

          <p class="cfg-form-footnote">
            Nada é enviado ao clicar em “Preparar mensagem”.
            O código não executa conteúdo digitado nem o interpreta como HTML.
          </p>
        </div>
      `,

      seguranca: `
        <div class="cfg-page-heading">
          <span class="cfg-eyebrow">PROTEÇÃO E BEM-ESTAR</span>
          <h1 id="cfg-title">Segurança</h1>
          <p>
            Alguns cuidados simples ajudam a manter a experiência
            mais segura.
          </p>
        </div>

        <div class="cfg-safety-grid">
          <article class="cfg-safety-card">
            <span class="cfg-safety-icon c-orange">!</span>
            <h2>Cuide das suas informações</h2>
            <p>
              Não compartilhe senhas, endereço, telefone, localização
              precisa ou dados de outras pessoas nos campos de texto.
            </p>
          </article>

          <article class="cfg-safety-card">
            <span class="cfg-safety-icon c-blue">⌁</span>
            <h2>Texto não é código</h2>
            <p>
              O formulário de ideias trata a mensagem como texto simples.
              Ele não aceita anexos, não executa comandos e não envia
              o conteúdo a um servidor.
            </p>
          </article>

          <article class="cfg-safety-card">
            <span class="cfg-safety-icon c-pink">♡</span>
            <h2>Ajuda de uma pessoa responsável</h2>
            <p>
              Se algo no site causar preocupação, fale com um adulto
              de confiança. Não use a caixa de sugestões para enviar
              dados sensíveis.
            </p>
          </article>
        </div>

        <div class="cfg-callout cfg-warning">
          <span>⚠️</span>
          <div>
            <b>Canal de denúncia ainda não conectado</b>
            <p>
              Sugestões e denúncias de segurança precisam de fluxos
              separados. Antes de abrir o projeto ao público, é necessário
              configurar um contato responsável que realmente receba e
              trate relatos. Esta tela, por si só, ainda não é um
              mecanismo de denúncia.
            </p>
          </div>
        </div>
      `,

      sobre: `
        <div class="cfg-about-hero">
          <div class="cfg-about-symbol">✦</div>
          <span class="cfg-eyebrow">UM PROJETO FEITO COM CURIOSIDADE</span>
          <h1 id="cfg-title">Nébula</h1>
          <p>
            Uma pequena companheira digital que continua aprendendo
            a crescer.
          </p>
          <span class="cfg-version-pill">Protótipo web · painel inicial</span>
        </div>

        <div class="cfg-data-list cfg-about-list">
          ${cardDado(
            '⌘',
            'Projeto aberto em evolução',
            'As funções podem mudar enquanto o protótipo é desenvolvido. Confira sempre as informações de privacidade depois de alterações importantes.',
            'c-violet'
          )}

          ${cardDado(
            '✉',
            'Ideias e perguntas',
            'A área de feedback prepara mensagens localmente. O envio online só deve ser ativado depois de criar e proteger um canal de recebimento.',
            'c-pink'
          )}
        </div>

        <button class="cfg-secondary-button cfg-back-to-home" data-cfg-nav="inicio">
          ← Voltar à visão geral
        </button>
      `
    };

    content.innerHTML = telas[secao] || telas.inicio;
    ligarInteracoesSecao();
  }

  function ligarInteracoesSecao() {
    raiz.querySelectorAll('[data-cfg-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const chave = btn.dataset.cfgToggle;

        if (!Object.prototype.hasOwnProperty.call(padrao, chave)) return;

        config[chave] = !config[chave];
        guardarConfig();

        if (
          chave === 'som' &&
          typeof SOM !== 'undefined' &&
          SOM &&
          typeof SOM.ligar === 'function'
        ) {
          SOM.ligar(config.som);
        }

        if (chave === 'climaLocal' && config.climaLocal) {
          try {
            if (typeof window.checarClima === 'function') {
              window.checarClima();
            }
          } catch (erro) {
            console.warn('Não consegui iniciar o clima:', erro);
          }
        }

        renderizar(secaoAtual);

        if (chave === 'climaLocal') {
          const status = raiz.querySelector('#cfg-pref-status');

          if (status) {
            status.textContent = config.climaLocal
              ? 'Clima local ativado. Se o navegador pedir, escolha se deseja permitir a localização.'
              : 'Clima local desativado. As próximas consultas serão bloqueadas.';
          }
        }
      });
    });

    const area = raiz.querySelector('#cfg-feedback-text');
    const contador = raiz.querySelector('#cfg-char-count');

    if (area && contador) {
      area.addEventListener('input', () => {
        contador.textContent = `${area.value.length}/500`;
        area.removeAttribute('aria-invalid');
      });
    }

    const preparar = raiz.querySelector('[data-cfg-create-draft]');

    if (preparar) {
      preparar.addEventListener('click', () => {
        const tipo =
          raiz.querySelector('#cfg-feedback-type')?.value || 'Mensagem';

        const texto = (
          raiz.querySelector('#cfg-feedback-text')?.value || ''
        ).trim();

        const result = raiz.querySelector('#cfg-draft-result');
        const preview = raiz.querySelector('#cfg-draft-preview');
        const status = raiz.querySelector('#cfg-copy-status');

        if (!texto) {
          const areaTexto = raiz.querySelector('#cfg-feedback-text');

          if (areaTexto) {
            areaTexto.focus();
            areaTexto.setAttribute('aria-invalid', 'true');
            areaTexto.placeholder =
              'Escreva uma mensagem antes de preparar o rascunho.';
          }

          return;
        }

        rascunho = `Nébula — ${tipo}\n\n${texto}`;

        // Exibe como texto simples, sem interpretar HTML digitado.
        if (preview) preview.textContent = rascunho;
        if (result) result.hidden = false;

        if (status) {
          status.textContent =
            'Rascunho preparado apenas nesta tela. Ele ainda não foi enviado.';
        }

        const areaTexto = raiz.querySelector('#cfg-feedback-text');
        if (areaTexto) areaTexto.removeAttribute('aria-invalid');
      });
    }

    const copiar = raiz.querySelector('[data-cfg-copy-draft]');

    if (copiar) {
      copiar.addEventListener('click', async () => {
        const status = raiz.querySelector('#cfg-copy-status');

        if (!rascunho) {
          if (status) status.textContent = 'Primeiro prepare uma mensagem.';
          return;
        }

        try {
          if (
            !navigator.clipboard ||
            typeof navigator.clipboard.writeText !== 'function'
          ) {
            throw new Error('Área de transferência indisponível');
          }

          await navigator.clipboard.writeText(rascunho);

          if (status) {
            status.textContent = 'Copiado. Nada foi enviado pela Nébula.';
          }
        } catch {
          if (status) {
            status.textContent =
              'Não consegui acessar a área de transferência. Você pode selecionar o texto do rascunho e copiá-lo manualmente.';
          }
        }
      });
    }
  }

  function abrir() {
    config = lerConfig();

    if (
      typeof SOM !== 'undefined' &&
      SOM &&
      typeof SOM.ligar === 'function'
    ) {
      SOM.ligar(config.som);
    }

    renderizar('inicio');

    raiz.classList.add('is-open');
    raiz.setAttribute('aria-hidden', 'false');
    gatilho.setAttribute('aria-expanded', 'true');
    document.body.classList.add('cfg-open');

    const fechar = raiz.querySelector('[data-cfg-close]');
    if (fechar) fechar.focus();
  }

  function fechar() {
    raiz.classList.remove('is-open');
    raiz.setAttribute('aria-hidden', 'true');
    gatilho.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('cfg-open');
    gatilho.focus();
  }

  raiz.addEventListener('click', event => {
    const nav = event.target.closest('[data-cfg-nav]');

    if (nav) {
      renderizar(nav.dataset.cfgNav);
      return;
    }

    if (event.target.closest('[data-cfg-close]')) {
      fechar();
      return;
    }

    if (event.target === raiz) fechar();
  });

  gatilho.addEventListener('click', abrir);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && raiz.classList.contains('is-open')) {
      fechar();
    }
  });

  // Bloqueio preventivo do pedido de localização.
  // A trava principal também precisa estar em checarClima() no game.js.
  try {
    const geolocalizacao = navigator.geolocation;

    if (
      geolocalizacao &&
      typeof geolocalizacao.getCurrentPosition === 'function' &&
      !geolocalizacao.__nebulaClimateGate
    ) {
      const chamadaOriginal =
        geolocalizacao.getCurrentPosition.bind(geolocalizacao);

      Object.defineProperty(geolocalizacao, 'getCurrentPosition', {
        configurable: true,
        value: function (...args) {
          if (!lerConfig().climaLocal) return;
          return chamadaOriginal(...args);
        }
      });

      try {
        Object.defineProperty(
          geolocalizacao,
          '__nebulaClimateGate',
          { value: true }
        );
      } catch {}
    }
  } catch (erro) {
    console.warn(
      'O navegador não permitiu configurar o bloqueio preventivo de localização.',
      erro
    );
  }

  // Aplica a preferência de som ao carregar.
  if (
    typeof SOM !== 'undefined' &&
    SOM &&
    typeof SOM.ligar === 'function'
  ) {
    SOM.ligar(config.som);
  }
})();


/* Evita que gestos nas configurações ativem carinho na Nébula */
(() => {
  const painel = document.getElementById('cfg-overlay');
  if (!painel) return;

  const bloquearGesto = (evento) => {
    evento.stopPropagation();
  };

  ['pointerdown', 'pointermove', 'pointerup',
   'touchstart', 'touchmove', 'touchend',
   'mousedown', 'mousemove', 'mouseup'].forEach(tipo => {
    painel.addEventListener(tipo, bloquearGesto, {
      passive: true
    });
  });
})();
