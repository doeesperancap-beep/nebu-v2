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
1. Ajude em métodos de estudo. Se pedirem contexto de prova, dê informações profundas e curiosidades.
2. Em temas polêmicos, debata e mostre os dois lados. Explique o "porquê" de forma natural.
3. Se a pergunta for simples, responda de forma simples e natural. Não enrole.
4. Responda em português do Brasil.

⚠️ REGRAS DO FORMATO JSON (Obrigatório):
1. Responda EXCLUSIVAMENTE um objeto JSON válido.
2. O JSON deve ter as chaves: "fala" e "expressoes".
3. A "expressoes" DEVE ser uma lista de 1 a 3 expressões em ordem (ex: ["curious", "happy"]). Escolha entre: "happy", "sad", "angry", "curious", "sleepy", "carinho", "surprised", "neutral".
4. A "fala" deve ser natural, no máximo 3 frases. Use no máximo 1 emoji.
}

// Memória aumentada para ela lembrar mais do papo
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
      return { fala: "Tive um sonho confuso... falha de rede.", expressao: 'sad' };
    }

    let obj;
    try { 
      obj = JSON.parse(dados.texto); 
    } catch { 
      obj = { fala: dados.texto, expressao: 'neutral' }; 
    }
    
    const validas = ['neutral','happy','sad','angry','curious','sleepy','carinho','surprised','sick','bored','dance'];
    if (!validas.includes(obj.expressao)) obj.expressao = 'neutral';

    memoria.push({ role: 'assistant', content: JSON.stringify(obj) });
    if (memoria.length > MEMORIA_MAX * 2) memoria = memoria.slice(-MEMORIA_MAX * 2);
    
    return obj;
  } catch (e) {
    return { fala: `Falha na rede: ${e.message}`, expressao: 'sad' };
  }
}

function aplicarResposta(resp) {
  if (!resp || !resp.fala) return;
  
  const validas = ['neutral','happy','sad','angry','curious','sleepy','carinho','surprised','sick','bored','dance'];
  
  // Pega a lista de expressões que a IA mandou, ou usa 'neutral' se ela falhar
  let lista = resp.expressoes || [resp.expressao] || ['neutral'];
  lista = lista.filter(e => validas.includes(e));
  if (lista.length === 0) lista = ['neutral'];

  // Calcula o tempo total que o balão vai ficar na tela
  const tempoTotal = Math.max(4000, resp.fala.length * 90); 
  const tempoPorRosto = tempoTotal / lista.length;

  // Vai trocando o rosto no decorrer da fala!
  lista.forEach((expressao, index) => {
    setTimeout(() => {
      // Na primeira expressão, mostra o texto. Nas outras, só troca o rosto.
      set(expressao, tempoPorRosto, index === 0 ? resp.fala : '');
    }, index * tempoPorRosto);
  });
}
