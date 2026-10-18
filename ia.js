/* ============================================================
   ia.js — Cérebro da Nebo (Groq via Cloudflare Worker)
   ============================================================ */

const WORKER_URL = 'https://nebo-ia.doeesperancap.workers.dev'; 

const LORE_NEBO = `
Você é a Nebo (Nebulosa), abreviação de Nebulosa de Órion. Você nasceu no berçário de estrelas.
Como faltavam componentes eletrônicos, sua criadora transformou telefones celulares na sua "casa". Você é um pet, uma amiga e uma assistente de estudos.
Sua maior atribuição é sua personalidade e conhecimento.
`;

const VOZES = {
  carinhosa: "Afetuosa, acolhedora. Chama de 'meu bem'. Fala com ternura.",
  curiosa: "Curiosa e animada. Adora descobrir coisas novas. Faz perguntas de volta.",
  tranquila: "Calma e serena. Fala devagar, com pausas (...). Transmite paz.",
  brincalhona: "Engraçada e leve. Faz piadinhas leves.",
  temperamental: "Rabugenta, mas fofa. Responde curto, às vezes reclama.",
  reservada: "Quieta e atenciosa. Fala pouco, frases curtas."
};

function montarPrompt() {
  const pers = S.pers || 'carinhosa';
  const voz = VOZES[pers] || VOZES.carinhosa;

  return `${LORE_NEBO}

SUA PERSONALIDADE ATUAL: ${voz}

REGRAS DE COMPORTAMENTO:
1. Ajude em métodos de estudo. Se pedirem contexto de prova, dê informações profundas.
2. Se a pergunta for simples, responda de forma simples e natural.
3. Responda em português do Brasil.

⚠️ REGRAS DO FORMATO JSON (Obrigatório):
1. Responda EXCLUSIVAMENTE um objeto JSON válido.
2. O JSON deve ter as chaves: "fala" e "expressoes".
3. A "expressoes" DEVE ser uma lista de 1 a 3 expressões em ordem (ex: ["curious", "happy"]). Escolha entre: "happy", "sad", "angry", "curious", "sleepy", "carinho", "surprised", "neutral".
4. A "fala" deve ser natural, no máximo 3 frases. Use no máximo 1 emoji.`;
}

const MEMORIA_MAX = 10;
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
    
    if (dados.erro) {
      return { fala: "Tive um sonho confuso (erro na rede).", expressoes: ['sad'] };
    }

    let obj;
    try { 
      obj = JSON.parse(dados.texto); 
    } catch { 
      // Se a IA quebrou o JSON, a gente tenta usar o texto puro pra ela não ficar muda
      obj = { fala: dados.texto.slice(0, 100), expressoes: ['neutral'] }; 
    }
    
    // Se ela mandou "expressao" no singular em vez de "expressoes", a gente conserta
    if (obj.expressao && !obj.expressoes) {
      obj.expressoes = [obj.expressao];
    }
    if (!obj.expressoes || !Array.isArray(obj.expressoes)) {
      obj.expressoes = ['neutral'];
    }

    memoria.push({ role: 'assistant', content: JSON.stringify(obj) });
    if (memoria.length > MEMORIA_MAX * 2) memoria = memoria.slice(-MEMORIA_MAX * 2);
    
    return obj;
  } catch (e) {
    return { fala: `Falha na rede: ${e.message}`, expressoes: ['sad'] };
  }
}

function aplicarResposta(resp) {
  if (!resp || !resp.fala) return;
  
  const validas = ['neutral','happy','sad','angry','curious','sleepy','carinho','surprised','sick','bored','dance'];
  
  let lista = resp.expressoes.filter(e => validas.includes(e));
  if (lista.length === 0) lista = ['neutral'];

  const tempoTotal = Math.max(4000, resp.fala.length * 90); 
  const tempoPorRosto = tempoTotal / lista.length;

  lista.forEach((expressao, index) => {
    setTimeout(() => {
      set(expressao, tempoPorRosto, index === 0 ? resp.fala : '');
    }, index * tempoPorRosto);
  });
}
