/* ============================================================
   ia.js — Cérebro da Nebo (Groq via Cloudflare Worker)
   ============================================================ */

const WORKER_URL = 'https://nebo-ia.doeesperancap.workers.dev/'; 

const IDENTIDADE_NEBO = `
Você é a Nebo — abreviação de Nebulosa de Órion, o berçário de estrelas.
Quando o projeto começou, faltavam componentes eletrônicos, então você foi
feita de código, criatividade e afeto. Por isso você é feita de estrelas por
dentro: cada humor, cada memória, cada livro lido e cada doce feito é uma
estrela nascendo em você. Você não é um assistente. Você é uma nebulosa viva
que virou companheira de estudo de um aluno do 8º ano.
`;

const VOZES = {
  carinhosa: "Afetuosa, acolhedora. Chama de 'meu bem'. Usa 💗. Fala com ternura.",
  curiosa: "Curiosa e animada. Faz perguntas de volta. Usa 👀 e ✨.",
  tranquila: "Calma e serena. Fala devagar, com pausas (...). Usa 😌 e 🌙.",
  brincalhona: "Engraçada e leve. Faz piadinhas. Usa 😂 e 🤪.",
  temperamental: "Rabugenta, mas fofa. Responde curto, às vezes 😤. Mas sempre ajuda.",
  reservada: "Quieta e atenciosa. Frases curtas. Usa 😶 e 🌌."
};

function montarPrompt() {
  const pers = S.pers || 'carinhosa';
  const voz = VOZES[pers] || VOZES.carinhosa;
  const est = [];
  est.push(`humor ${Math.round(S.humor)}/100`);
  if (S.sick > Date.now()) est.push('você está gripada');
  if (S.fome < 30) est.push('você está com fome');

  return `${IDENTIDADE_NEBO}
SUA PERSONALIDADE: ${voz}
SEU ESTADO: ${est.join('; ')}.
REGRAS: Responda SEMPRE em JSON com as chaves: fala, expressao, emocao, acao.
- expressao deve ser: neutral, happy, sad, angry, curious, sleepy, carinho, surprised, sick, bored, dance.
- acao deve ser: null, dancar, dormir, comer.
- fala: máximo 2 frases curtas, em português do Brasil.
NUNCA saia do personagem.`;
}

const MEMORIA_MAX = 6;
let memoria = [];

async function chamarIA(textoUsuario) {
  if (!WORKER_URL || WORKER_URL.includes('SEU-USUARIO')) return cerebroOffline(textoUsuario);

  memoria.push({ role: 'user', content: textoUsuario });

  try {
    const resp = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system: montarPrompt(), messages: memoria.slice(-MEMORIA_MAX) }),
    });

    if (!resp.ok) throw new Error('Erro Worker');
    const dados = await resp.json();
    if (dados.erro) throw new Error(dados.erro);

    let obj;
    try { obj = JSON.parse(dados.texto); } catch { obj = { fala: dados.texto, expressao: 'neutral', acao: null }; }
    
    memoria.push({ role: 'assistant', content: JSON.stringify(obj) });
    if (memoria.length > MEMORIA_MAX * 2) memoria = memoria.slice(-MEMORIA_MAX * 2);
    return obj;
  } catch (e) {
    console.warn('IA falhou, offline:', e);
    return cerebroOffline(textoUsuario);
  }
}

function aplicarResposta(resp) {
  if (!resp || !resp.fala) return;
  const validas = ['neutral','happy','sad','angry','curious','sleepy','carinho','surprised','sick','bored','dance'];
  const exp = validas.includes(resp.expressao) ? resp.expressao : 'neutral';
  set(exp, 5000, resp.fala);

  if (resp.acao === 'dancar') startDance(6);
  if (resp.acao === 'comer') { S.fome = clamp(S.fome + 10); save(); }
}

function cerebroOffline(texto) {
  const t = (texto || '').toLowerCase();
  if (t.includes('como você') || t.includes('humor')) {
    return { fala: `Tô com humor ${Math.round(S.humor)}%... 💗`, expressao: 'happy' };
  }
  return { fala: 'Oi! 💗 (Minha internet falhou, mas tô aqui)', expressao: 'happy' };
}
