/* ============================================================
   voz.js — A Nebo escuta e fala (Modo Conversa Contínua)
   ============================================================ */

let reconhecimento = null;
let ouvindo = false;

function iniciarVoz() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    say('Meu ouvido não funciona nesse navegador... 😢');
    return;
  }

  reconhecimento = new SR();
  reconhecimento.lang = 'pt-BR';
  reconhecimento.continuous = true; // <-- Fica ouvindo sem parar!
  reconhecimento.interimResults = false;

  reconhecimento.onresult = async (e) => {
    // Pega a última frase que a pessoa falou
    const ultimoResultado = e.results[e.results.length - 1];
    const texto = ultimoResultado[0].transcript.trim();
    
    if (!texto) return;
    
    // Se a pessoa falou algo, a gente pausa o microfone para ela não ouvir a própria resposta da Nebo
    reconhecimento.stop(); 
    
    set('curious', 2000, '🤔 ...');
    const resp = await chamarIA(texto);
    aplicarResposta(resp);
    
    // Ela fala a resposta
    falar(resp.fala);
    
    // Depois que ela terminar de falar, liga o microfone de novo
    setTimeout(() => {
      if (ouvindo) {
        try { reconhecimento.start(); } catch(e) {}
      }
    }, 4000); // 4 segundos de pausa
  };

  reconhecimento.onerror = (e) => { 
    console.log('Erro no microfone:', e.error); 
    ouvindo = false; 
    atualizarBotaoVoz();
  };
  
  reconhecimento.onend = () => { 
    // Se parou de ouvir sozinho, tenta religar se ainda estivermos no modo "ouvindo"
    if (ouvindo) {
      try { reconhecimento.start(); } catch(e) { ouvindo = false; atualizarBotaoVoz(); }
    }
  };

  try {
    reconhecimento.start();
    ouvindo = true;
    say('Pode falar! 👂'); 
    atualizarBotaoVoz();
  } catch(e) {
    say('Erro ao ligar o microfone. 😢');
  }
}

function pararVoz() {
  ouvindo = false;
  if (reconhecimento) {
    reconhecimento.stop();
  }
  say('Microfone desligado. 🤫');
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

// Avisa no botão se está ouvindo ou não
function atualizarBotaoVoz() {
  const btn = document.getElementById('bVoz');
  if (!btn) return;
  if (ouvindo) {
    btn.style.background = '#ffb3b3'; // Fica vermelho quando tá ouvindo
    btn.textContent = '🔴 Parar';
  } else {
    btn.style.background = '#ffffff14'; // Cor normal
    btn.textContent = '🎤 Falar';
  }
}
