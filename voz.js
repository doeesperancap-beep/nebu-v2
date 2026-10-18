/* ============================================================
   voz.js — A Nebo escuta e fala (Versão Estável)
   ============================================================ */

let reconhecimento = null;
let ouvindo = false;

function iniciarVoz() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    say('Meu ouvido não funciona nesse navegador... 😢');
    return;
  }

  // Se já estiver ouvindo, não faz nada
  if (ouvindo) return;

  reconhecimento = new SR();
  reconhecimento.lang = 'pt-BR';
  reconhecimento.continuous = false; // <-- Ouve só uma vez e para
  reconhecimento.interimResults = false;

  reconhecimento.onresult = async (e) => {
    const texto = e.results[0][0].transcript.trim();
    if (!texto) return;
    
    set('curious', 2000, '🤔 ...');
    
    // Chama a IA
    const resp = await chamarIA(texto);
    aplicarResposta(resp);
    falar(resp.fala);
  };

  reconhecimento.onerror = (e) => { 
    console.log('Erro no microfone:', e.error); 
    ouvindo = false; 
    atualizarBotaoVoz();
    if (e.error === 'not-allowed') say('Preciso de permissão pra usar o microfone! 🎤');
  };
  
  reconhecimento.onend = () => { 
    ouvindo = false; 
    atualizarBotaoVoz();
  };

  try {
    reconhecimento.start();
    ouvindo = true;
    say('Tô ouvindo... 👂'); 
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
  atualizarBotaoVoz();
}

function falar(texto) {
  if (!texto || !window.speechSynthesis) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(texto);
  u.lang = 'pt-BR';
  u.rate = 1.05;
  u.pitch = S.pers === 'temperamental' ? 1.15 : 1.0;
  speechSynthesis.speak(u);
}

function atualizarBotaoVoz() {
  const btn = document.getElementById('bVoz');
  if (!btn) return;
  if (ouvindo) {
    btn.style.background = '#ffb3b3';
    btn.textContent = '🔴 Ouvindo...';
  } else {
    btn.style.background = '#ffffff14';
    btn.textContent = '🎤 Falar';
  }
}
