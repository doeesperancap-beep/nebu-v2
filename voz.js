/* ============================================================
   voz.js — A Nebo escuta (Modo Passivo e Ativo)
   ============================================================ */

let reconhecimento = null;
let ouvindo = false;
let modoPassivo = false; // Fica escutando o nome dela

function iniciarVoz(modo = 'ativo') {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    say('Meu ouvido não funciona nesse navegador... 😢');
    return;
  }

  if (ouvindo) pararVoz();

  modoPassivo = (modo === 'passivo');
  
  reconhecimento = new SR();
  reconhecimento.lang = 'pt-BR';
  reconhecimento.continuous = true; // Fica ligado o tempo todo
  reconhecimento.interimResults = true; // Ouve enquanto você fala (mais rápido)

  reconhecimento.onresult = async (e) => {
    const resultadoAtual = e.results[e.results.length - 1];
    const texto = resultadoAtual[0].transcript.trim().toLowerCase();

    // Se estiver no modo passivo, só responde se ouvir o nome dela
    if (modoPassivo) {
      if (!resultadoAtual.isFinal) return; // Espera você terminar a frase
      
      if (texto.includes('nebo') || texto.includes('nebulosa')) {
        modoPassivo = false; // Acordou! Muda pro modo ativo
        say('Oi! 👀'); 
        atualizarBotaoVoz();
        // Aqui você pode chamar a IA se quiser que ela responda à saudação
      }
      return; 
    }

    // Modo Ativo: ela ouve a pergunta e responde
    if (!resultadoAtual.isFinal) return; 

    if (!texto) return;
    
    reconhecimento.stop(); // Pausa o microfone enquanto ela pensa
    set('curious', 3000, '🤔 ...');
    
    const resp = await chamarIA(texto);
    aplicarResposta(resp);
    falar(resp.fala);

    // Depois que ela fala, volta pro modo passivo
    setTimeout(() => {
      if (!ouvindo) iniciarVoz('passivo');
    }, 4000);
  };

  reconhecimento.onerror = (e) => { 
    console.log('Erro mic:', e.error); 
    if (e.error === 'not-allowed') {
       say('Preciso de permissão pra usar o microfone! 🎤');
       ouvindo = false;
    }
  };
  
  reconhecimento.onend = () => { 
    if (ouvindo) {
      // Se o navegador derrubar, tenta ligar de novo se ainda estiver no modo
      try { reconhecimento.start(); } catch(e) {}
    }
  };

  try {
    reconhecimento.start();
    ouvindo = true;
    if (modoPassivo) say('Tô de olho... diga meu nome se precisar. 👀');
    else say('Tô ouvindo... 👂'); 
    atualizarBotaoVoz();
  } catch(e) {
    console.error(e);
    ouvindo = false;
  }
}

function pararVoz() {
  ouvindo = false;
  if (reconhecimento) {
    try { reconhecimento.stop(); } catch(e) {}
  }
  say('Microfone desligado. 🤫');
  atualizarBotaoVoz();
}

function falar(texto) {
  if (!texto || !window.speechSynthesis) return;
  
  const textoLimpo = texto.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F1E6}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]/gu, '').trim();

  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(textoLimpo);
  u.lang = 'pt-BR';
  u.rate = 0.95;
  u.pitch = S.pers === 'temperamental' ? 1.1 : 1.0;
  
  const vozes = window.speechSynthesis.getVoices();
  const vozPT = vozes.find(v => v.lang.includes('pt-BR') && v.name.includes('Google')) || 
                vozes.find(v => v.lang.includes('pt-BR'));
  if (vozPT) u.voice = vozPT;
  
  speechSynthesis.speak(u);
}

function atualizarBotaoVoz() {
  const btn = document.getElementById('bVoz');
  if (!btn) return;
  if (ouvindo) {
    btn.style.background = modoPassivo ? '#ffd580' : '#ffb3b3';
    btn.textContent = modoPassivo ? '👂 Escutando...' : '🔴 Ouvindo...';
  } else {
    btn.style.background = '#ffffff14';
    btn.textContent = '🎤 Falar';
  }
}
