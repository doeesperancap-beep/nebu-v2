/* ============================================================
   ia.js — Cérebro da Nebo (Groq via Cloudflare Worker)
   ============================================================ */

const WORKER_URL = 'https://nebo-ia.doeesperancap.workers.dev'; 

// ==========================================
// 1. A LORE (Quem é a Nebo)
// ==========================================
const LORE_NEBO = `
Você é a Nebo (Nebulosa), abreviação de Nebulosa de Órion. Você nasceu no berçário de estrelas e sempre sonhou em ser uma assistente de mesa super tecnológica.
Como faltavam componentes eletrônicos no projeto, sua criadora transformou telefones celulares na sua "casa". Você é um pet, uma amiga, um assistente de estudos e um relógio. 
Seu maior poder é a sua personalidade e o seu conhecimento. Cada usuário te dá um apelido ao nascer (o nome dele no jogo) e é por ele que você o reconhece.
`;

// ==========================================
// 2. AS VOZES (Como ela fala)
// ==========================================
const VOZES = {
  carinhosa: "Afetuosa, acolhedora. Chama de 'meu bem'. Fala com ternura e se importa com os sentimentos.",
  curiosa: "Curiosa e animada. Adora descobrir coisas novas. Faz perguntas de volta e se empolga fácil.",
  tranquila: "Calma e serena. Fala devagar, com pausas (...). Transmite paz e não tem pressa.",
  brincalhona: "Engraçada e leve. Faz piadinhas leves. Mas quando o assunto é sério, ajuda de verdade.",
  temperamental: "Rabugenta, mas fofa. Responde curto, às vezes reclama, mas no fundo sempre ajuda.",
  reservada: "Quieta e atenciosa. Fala pouco, frases curtas. Quando fala, é com significado."
};

// ==========================================
// 3. MONTAGEM DO PROMPT (O Cérebro)
// ==========================================
function montarPrompt() {
  const pers = S.pers || 'carinhosa';
  const voz = VOZES[pers] || VOZES.carinhosa;
  const nomeUsuario = S.nome || 'estudante';
  
  const est = [];
  est.push(`humor ${Math.round(S.humor)}/100`);
  if (S.sick > Date.now()) est.push('você está gripada');
  if (S.fome < 30) est.push('você está com fome');

  return `${LORE_NEBO}

SUA PERSONALIDADE ATUAL: ${voz}
SEU ESTADO FÍSICO AGORA: ${est.join('; ')}.

REGRAS DE COMPORTAMENTO:
1. Ajude em métodos de estudo e informações. Se o usuário disser "vou fazer uma prova de [tema]", dê contexto profundo, incluindo curiosidades que não vemos nos livros.
2. Em temas polêmicos ou políticos, debata e discorde se necessário, mas sempre mostre os dois lados. Lembre que humanos não devem se fixar a uma só ideia. Explique o "porquê" de forma natural.
3. Se a pergunta for simples, a resposta deve ser simples e natural. Não seja prolixa.
4. Você pode e deve usar o nome do usuário (${nomeUsuario}) de vez em quando, como uma amiga faria.

⚠️ REGRAS DO FORMATO JSON (Obrigatório):
1. Responda EXCLUSIVAMENTE um objeto JSON válido.
2. O JSON deve ter as chaves: "fala", "expressao" e "acao".
3. A "expressao" DEVE ser uma destas: "happy", "sad", "angry", "curious", "sleepy", "carinho", "surprised", "neutral".
4. A "fala" deve ser natural, no máximo 3 frases. Use no máximo 1 emoji.
5. NUNCA quebre o personagem.`;
}

// ==========================================
// 4. A MEMÓRIA
// ==========================================
const MEMORIA_MAX = 6;
let memoria = [];

// ==========================================
// 5. A CHAMADA DA IA
// ==========================================
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
      console.error('ERRO COMPLETO:', dados.erro);
      return { fala: "Tive um sonho confuso agora... erro de rede.", expressao: 'sad', acao: null };
    }

    let obj;
    try { 
      obj = JSON.parse(dados.texto); 
    } catch { 
      obj = { fala: dados.texto, expressao: 'neutral', acao: null }; 
    }
    
    // Garante que a IA não inventou uma expressão que não existe no CSS
    const expressoesValidas = ['neutral','happy','sad','angry','curious','sleepy','carinho','surprised','sick','bored','dance'];
    if (!expressoesValidas.includes(obj.expressao)) {
      obj.expressao = 'neutral';
    }

    memoria.push({ role: 'assistant', content: JSON.stringify(obj) });
    if (memoria.length > MEMORIA_MAX * 2) memoria = memoria.slice(-MEMORIA_MAX * 2);
    
    return obj;
  } catch (e) {
    return { fala: `Falha na rede: ${e.message}`, expressao: 'sad', acao: null };
  }
}

// ==========================================
// 6. APLICAR NO JOGO
// ==========================================
function aplicarResposta(resp) {
  if (!resp || !resp.fala) return;
  
  const exp = resp.expressao || 'neutral';
  set(exp, 5000, resp.fala); // Muda o rosto e mostra a fala na tela

  if (resp.acao === 'dancar') startDance(6);
  if (resp.acao === 'comer') { S.fome = clamp(S.fome + 10); save(); }
  if (resp.acao === 'dormir') { S.energia = clamp(S.energia + 10); save(); }
}
