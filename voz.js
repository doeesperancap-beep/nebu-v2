/* ============================================================
   voz.js — A Nebo escuta (Modo Passivo e Ativo Inteligente)
   ============================================================ */

let reconhecimento = null;
let ouvindo = false;
let modoPassivo = false; 
let timerSilencio = null;

function iniciarVoz(modo = 'passivo') {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    say('Meu ouvido não funciona nesse navegador... 😢');
    return;
  }

  if (ouvindo) pararVoz();

  modoPassivo = (modo === 'passivo');
  
  reconhecimento = new SR();
  reconhecimento.lang = 'pt-BR';
  reconhecimento.continuous = true; 
  reconhecimento.interimResults = true; 

  reconhecimento.onresult = async (e) => {
    const resultadoAtual = e.results[e.results.length - 1];
    const texto = resultadoAtual[0].transcript.trim();
    const textoLower = texto.toLowerCase();

    // Se estiver no modo passivo, só responde se ouvir o nome dela
    if (modoPassivo) {
      if (!resultadoAtual.isFinal) return; 
      
      // Pega o nome que você deu pra ela no início
      const nomeDela = (S.nome || 'nebo').toLowerCase(); 
      
      if (textoLower.includes(nomeDela) || textoLower.includes('nebo') || textoLower.includes('nebulosa')) {
        modoPassivo = false; // Acordou! Muda pro modo ativo
        say('Oi! Pode falar. 👂'); 
        atualizarBotaoVoz();
        return; // Espera a próxima frase que ela vai falar
      }
      return; 
    }

    // Modo Ativo: Ela ouviu o nome e agora vai ouvir a pergunta
    if (!resultadoAtual.isFinal) return; 

    // Se a pessoa não falou nada ou só gaguejou
    if (!texto || texto.length < 2) return;
    
    // Se ela ainda estiver com o microfone ligado, limpa o timer de silêncio
    clearTimeout(timerSilencio);
    
    reconhecimento.stop(); // Pausa o microfone enquanto ela pensa
    set('curious', 4000, '🤔 ...');
    
    // 👇 REMOVE O NOME DELA DA PERGUNTA (pra IA não ficar confusa)
    const nomeDela = (S.nome || 'nebo').toLowerCase();
    const perguntaLimpa = texto.replace(new RegExp(nomeDela, 'gi'), '').replace(/nebo|nebulosa/gi, '').trim();

    // Se depois de tirar o nome a frase ficou vazia (ex: só falou "Nebo")
    if (!perguntaLimpa) {
      setTimeout(() => { if (!ouvindo) iniciarVoz('passivo'); }, 2000);
      return;
    }
    
    const resp = await chamarIA(perguntaLimpa);
    aplicarResposta(resp);
    falar(resp.fala);

    // Depois que ela fala, volta pro modo passivo
    setTimeout(() => {
      if (!ouvindo) iniciarVoz('passivo');
    }, 5000); // 5 segundos pra ela terminar de falar e voltar a ouvir
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
      try { reconhecimento.start(); } catch(e) {}
    }
  };

  // Timer de silêncio: se ela ficar 5 segundos sem ouvir nada no modo ativo, desliga.
  function resetarTimer() {
    clearTimeout(timerSilencio);
    timerSilencio = setTimeout(() => {
      if (!modoPassivo && ouvindo) {
        say('Acho que você não precisa de mim agora. Vou dormir. 😴');
        pararVoz();
      }
    }, 5000);
  }

  try {
    reconhecimento.start();
    ouvindo = true;
    if (modoPassivo) say(`Tô de olho... diga "${S.nome || 'Nebo'}" se precisar. 👀`);
    else { say('Tô ouvindo... 👂'); resetarTimer(); }
    atualizarBotaoVoz();
  } catch(e) {
    console.error(e);
    ouvindo = false;
  }
}

function pararVoz() {
  ouvindo = false;
  modoPassivo = false;
  clearTimeout(timerSilencio);
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
    btn.textContent = modoPassivo ? `👂 Diga "${S.nome || 'Nebo'}"` : '🔴 Ouvindo...';
  } else {
    btn.style.background = '#ffffff14';
    btn.textContent = '🎤 Falar';
  }
}
