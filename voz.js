/* ============================================================
   voz.js — A Nebo escuta e fala
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
  reconhecimento.continuous = false;
  reconhecimento.interimResults = false;

  reconhecimento.onresult = async (e) => {
    const texto = e.results[0][0].transcript.trim();
    if (!texto) return;
    set('curious', 2000, '🤔 ...');
    const resp = await chamarIA(texto);
    aplicarResposta(resp);
    falar(resp.fala);
  };

  reconhecimento.onerror = () => { ouvindo = false; };
  reconhecimento.onend = () => { ouvindo = false; };

  reconhecimento.start();
  ouvindo = true;
  set('curious', 4000, 'Tô ouvindo... 👂');
}

function pararVoz() {
  if (reconhecimento && ouvindo) { reconhecimento.stop(); ouvindo = false; }
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
