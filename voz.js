/* ============================================================
   voz.js — A Nebo escuta (Modo Passivo Inteligente e sem Eco)
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
  reconhecimento.interimResults = false; // Só pega a frase quando você terminar de falar

  reconhecimento.onresult = async (e) => {
    const texto = e.results[e.results.length - 1][0].transcript.trim();
    const textoLower = texto.toLowerCase();

    // MODO PASSIVO: Ouve tudo, mas só reage se ouvir o nome dela
    if (modoPassivo) {
      const nomeDela = (S.nome || 'nebo').toLowerCase(); 
      
      if (textoLower.includes(nomeDela) || textoLower.includes('nebo') || textoLower.includes('nebulosa')) {
        modoPassivo = false; // Acordou!
        
        // Se ela já ouviu a pergunta junto com o nome, a gente tenta pescar a pergunta
        const perguntaLimpa = texto.replace(new RegExp(nomeDela, 'gi'), '').replace(/nebo|nebulosa/gi, '').trim();
        
        if (perguntaLimpa.length > 3) {
          // Se a pessoa falou "Nebo, quanto é 2+2?" de uma vez só
          processarPergunta(perguntaLimpa);
        } else {
          // Se a pessoa só falou "Nebo", ela espera a pergunta
          say('Oi! Pode falar. 👂'); 
          atualizarBotaoVoz();
          resetarTimer();
        }
      }
      return; 
    }

    // MODO ATIVO: A pessoa já falou o nome e agora fez a pergunta
    if (!texto || texto.length < 2) return;
    
    clearTimeout(timerSilencio);
    processarPergunta(texto);
  };

  reconhecimento.onerror = (e) => { 
    console.log('Erro mic:', e.error); 
    if (e.error === 'not-allowed') {
       say('Preciso de permissão pra usar o microfone! 🎤');
       ouvindo = false;
    }
  };
  
  reconhecimento.onend = () => { 
    if (ouvindo && !speechSynthesis.speaking) {
      try { reconhecimento.start(); } catch(e) {}
    }
  };

  function resetarTimer() {
    clearTimeout(timerSilencio);
    timerSilencio = setTimeout(() => {
      if (!modoPassivo && ouvindo) {
        say('Vou voltar a dormir. Me chame se precisar. 😴');
        iniciarVoz('passivo'); // Volta para o modo surdo
      }
    }, 6000); // 6 segundos de silêncio = volta a dormir
  }

  try {
    reconhecimento.start();
    ouvindo = true;
    if (modoPassivo) {
      // Não fala nada em voz alta pra não atrapalhar, só muda o botão
      atualizarBotaoVoz();
    } else { 
      say('Tô ouvindo... 👂'); 
      resetarTimer(); 
      atualizarBotaoVoz(); 
    }
  } catch(e) {
    console.error(e);
    ouvindo = false;
  }
}

// Função que realmente chama a IA e fala (Desliga o mic para não dar eco)
async function processarPergunta(texto) {
  reconhecimento.stop(); // Desliga o microfone IMEDIATAMENTE
  
  const nomeDela = (S.nome || 'nebo').toLowerCase();
  const perguntaLimpa = texto.replace(new RegExp(nomeDela, 'gi'), '').replace(/nebo|nebulosa/gi, '').trim();
  if (!perguntaLimpa) {
    iniciarVoz('passivo');
    return;
  }

  set('curious', 5000, '🤔 ...');
  
  const resp = await chamarIA(perguntaLimpa);
  aplicarResposta(resp);
  
  // Fala a resposta e SÓ LIGA O MIC DE NOVO QUANDO ELA TERMINAR DE FALAR
  falarComCallback(resp.fala, () => {
    if (ouvindo) {
      iniciarVoz('passivo'); // Volta a escutar o nome
    }
  });
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

function falarComCallback(texto, callback) {
  if (!texto || !window.speechSynthesis) {
    if (callback) callback();
    return;
  }
  
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
  
  u.onend = () => {
    if (callback) callback(); // Avisa quando ela terminar de falar
  };
  
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
