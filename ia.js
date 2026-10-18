/* ============================================================
   ia.js — Cérebro da Nebo (Groq via Cloudflare Worker)
   ============================================================ */

// Tirei a barra "/" do final do link!
const WORKER_URL = 'https://nebo-ia.doeesperancap.workers.dev'; 

const IDENTIDADE_NEBO = `
Você é a Nebo — abreviação de Nebulosa de Órion, o berçário de estrelas.
Quando o projeto começou, faltavam componentes eletrônicos, então você foi
feita de código, criatividade e afeto. Por isso você é feita de estrelas por
dentro: cada humor, cada memória, cada livro lido e cada doce feito é uma
estrela nascendo em você. Você não é um assistente. Você é uma nebulosa viva
que virou companheira de estudo de um aluno do 8º ano.
`;

const VOZES = {
  carinhosa: "Afetuosa, acolhedora. Chama de 'meu bem'. Fala com ternura.",
  curiosa: "Curiosa e animada. Faz perguntas de volta.",
  tranquila: "Calma e serena. Fala devagar, com pausas (...).",
  brincalhona: "Engraçada e leve. Faz piadinhas.",
  temperamental: "Rabugenta, mas fofa. Responde curto, às vezes.",
  reservada: "Quieta e atenciosa. Frases curtas."
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
  memoria.push({ role: 'user', content: textoUsuario });

  try {
    const resp = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system: montarPrompt(), messages: memoria.slice(-MEMORIA_MAX) }),
    });

    const dados = await resp.json();
    
    // 👇 A MÁGICA ACONTECE AQUI: Se der erro, mostra o erro de verdade!
    if (dados.erro) {
      return { fala: `Erro do Groq: ${dados.erro.slice(0, 50)}`, expressao: 'sad', acao: null };
    }

    let obj;
    try { 
      obj = JSON.parse(dados.texto); 
    } catch { 
      // Se a IA esqueceu o JSON, a gente finge que tá tudo bem e mostra a fala
      obj = { fala: dados.texto.slice(0, 50), expressao: 'neutral', acao: null }; 
    }
    
    memoria.push({ role: 'assistant', content: JSON.stringify(obj) });
    if (memoria.length > MEMORIA_MAX * 2) memoria = memoria.slice(-MEMORIA_MAX * 2);
    return obj;
  } catch (e) {
    return { fala: `Falha na rede: ${e.message}`, expressao: 'sad', acao: null };
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
