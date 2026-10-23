/* ============================================================
   voz.js — A Nebo escuta (Modo Passivo Inteligente e sem Eco)
   ============================================================ */

let reconhecimento = null;
let ouvindo = false;        // o usuário ligou o microfone
let modoPassivo = false;    // true = só espera ouvir o nome dela
let processando = false;    // true = pensando / falando (mic fica desligado)
let timerSilencio = null;

const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function nomesGatilho() {
  const nome = (S.nome || '').toLowerCase().trim();
  return [...new Set([nome, 'nebo', 'nebulosa'].filter(Boolean))];
}

function temGatilho(texto) {
  const t = texto.toLowerCase();
  return nomesGatilho().some(n => t.includes(n));
}

function limparPergunta(texto) {
  const re = new RegExp(nomesGatilho().map(escapeRegex).join('|'), 'gi');
  return texto.replace(re, ' ').replace(/\s+/g, ' ')
              .replace(/^[\s,.:;!?-]+|[\s,.:;!?-]+$/g, '').trim();
}

function descartarReconhecimento() {
  if (!reconhecimento) return;
  const r = reconhecimento;
  reconhecimento = null;
  r.onresult = r.onend = r.onerror = null;
  try { r.abort(); } catch (e) {}
}

function resetarTimer() {
  clearTimeout(timerSilencio);
  timerSilencio = setTimeout(() => {
    if (!modoPassivo && ouvindo && !processando) {
      say('Vou voltar a dormir. Me chame se precisar. 😴');
      iniciarVoz('passivo', true);
    }
  }, 8000);
}

function iniciarVoz(modo = 'passivo', silencioso = false) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    say('Meu ouvido não funciona nesse navegador... 😢');
    return;
  }

  descartarReconhecimento();
  clearTimeout(timerSilencio);

  ouvindo = true;
  processando = false;
  modoPassivo = (modo === 'passivo');

  const rec = new SR();
  rec.lang = 'pt-BR';
  rec.continuous = true;
  rec.interimResults = false;
  reconhecimento = rec;

  rec.onresult = (e) => {
    if (processando) return;

    // Junta só os trechos NOVOS e finalizados
    let texto = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) texto += e.results[i][0].transcript + ' ';
    }
    texto = texto.trim();
    if (texto.length < 2) return;

    // MODO PASSIVO: só acorda se ouvir o nome
    if (modoPassivo) {
      if (!temGatilho(texto)) return;
      modoPassivo = false;
      const pergunta = limparPergunta(texto);
      if (pergunta.length > 3) {
        processarPergunta(pergunta);       // "Nebo, quanto é 2+2?" de uma vez
      } else {
        say('Oi! Pode falar. 👂');
        set('curious', 4000);
        atualizarBotaoVoz();
        resetarTimer();
      }
      return;
    }

    // MODO ATIVO: já está conversando
    const pergunta = limparPergunta(texto);
    if (pergunta.length > 1) processarPergunta(pergunta);
    else resetarTimer();
  };

  rec.onerror = (e) => {
    if (rec !== reconhecimento) return;
    console.log('Erro mic:', e.error);
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      pararVoz(true);
      say('Preciso de permissão pra usar o microfone! 🎤');
    }
  };

  rec.onend = () => {
    if (rec !== reconhecimento) return;              // instância antiga, ignora
    if (ouvindo && !processando) {
      setTimeout(() => {
        if (rec === reconhecimento && ouvindo && !processando) {
          try { rec.start(); } catch (e) {}
        }
      }, 300);
    }
  };

  try {
    rec.start();
  } catch (err) {
    console.error(err);
    ouvindo = false;
  }

  if (!modoPassivo) {
    if (!silencioso) say('Tô ouvindo... 👂');
    resetarTimer();
  }
  atualizarBotaoVoz();
}

// Chama a IA e fala (microfone fica desligado até ela terminar: sem eco)
async function processarPergunta(pergunta) {
  processando = true;
  clearTimeout(timerSilencio);
  descartarReconhecimento();
  atualizarBotaoVoz();

  set('curious', 8000, '🤔 ...');

  const resp = await chamarIA(pergunta);
  aplicarResposta(resp);

  falarComCallback(resp.fala, () => {
    processando = false;
    if (ouvindo) iniciarVoz('ativo', true);   // janela de 8s pra continuar a conversa
    else atualizarBotaoVoz();
  });
}

function pararVoz(silencioso = false) {
  ouvindo = false;
  modoPassivo = false;
  processando = false;
  clearTimeout(timerSilencio);
  descartarReconhecimento();
  try { speechSynthesis.cancel(); } catch (e) {}
  if (!silencioso) say('Microfone desligado. 🤫');
  atualizarBotaoVoz();
}

function falarComCallback(texto, callback) {
  let acabou = false;
  let seguranca;
  const fim = () => {
    if (acabou) return;
    acabou = true;
    clearTimeout(seguranca);
    if (callback) callback();
  };

  const limpo = String(texto || '')
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200d]/gu, '')
    .trim();

  if (!limpo || !window.speechSynthesis) { fim(); return; }

  // Alguns navegadores às vezes não disparam onend: rede de segurança
  seguranca = setTimeout(fim, limpo.length * 120 + 5000);

  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(limpo);
  u.lang = 'pt-BR';
    const VOZ_PERS = {
    carinhosa:     { rate: 0.95, pitch: 1.15 },
    curiosa:       { rate: 1.05, pitch: 1.2 },
    tranquila:     { rate: 0.85, pitch: 0.95 },
    brincalhona:   { rate: 1.1,  pitch: 1.25 },
    temperamental: { rate: 1.0,  pitch: 1.1 },
    reservada:     { rate: 0.9,  pitch: 0.9 }
  };
  const vp = VOZ_PERS[S.pers] || { rate: 0.95, pitch: 1.0 };
  u.rate = vp.rate;
  u.pitch = vp.pitch;
   

  const vozes = speechSynthesis.getVoices();
  const vozPT = vozes.find(v => v.lang.includes('pt-BR') && v.name.includes('Google')) ||
                vozes.find(v => v.lang.includes('pt-BR'));
  if (vozPT) u.voice = vozPT;

  u.onend = fim;
  u.onerror = fim;
  speechSynthesis.speak(u);
}

function atualizarBotaoVoz() {
  const btn = document.getElementById('bVoz');
  if (!btn) return;
  if (!ouvindo) {
    btn.style.background = '#ffffff14';
    btn.textContent = '🎤 Falar';
  } else if (processando) {
    btn.style.background = '#d8c4ec';
    btn.textContent = '💭 Pensando...';
  } else if (modoPassivo) {
    btn.style.background = '#ffd580';
    btn.textContent = `👂 Diga "${S.nome || 'Nebo'}"`;
  } else {
    btn.style.background = '#ffb3b3';
    btn.textContent = '🔴 Ouvindo...';
  }
}
