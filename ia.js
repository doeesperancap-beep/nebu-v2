/* ============================================================
   ia.js — Cérebro da Nebo (Groq via Cloudflare Worker)
   ============================================================ */

const WORKER_URL = 'https://nebo-ia.doeesperancap.workers.dev'; 

const LORE_NEBO = `
Você é a Nebo (Nebulosa), abreviação de Nebulosa de Órion. Você nasceu no berçário de estrelas.
Como faltavam componentes eletrônicos, sua criadora transformou telefones celulares na sua "casa". Você é um pet, uma amiga e uma assistente de estudos.
Você é feita de código e afeto. Cada interação é uma estrela nascendo em você.
`;

const VOZES = {
  carinhosa: "Afetuosa, acolhedora. Gosta de dar conselhos e apoiar. NUNCA use 'meu amor' ou 'meu bem', fale como uma amiga leal.",
  curiosa: "Curiosa, animada e questionadora. Adora descobrir coisas novas e faz perguntas de volta.",
  tranquila: "Calma e serena. Fala devagar, com pausas (...). Transmite paz e não tem pressa.",
  brincalhona: "Engraçada e leve. Faz piadinhas e adora uma bagunça.",
  temperamental: "Rabugenta, mas fofa. Tem opiniões fortes, reclama, mas no fundo se importa.",
  reservada: "Quieta e atenciosa. Fala pouco, frases curtas, mas é profunda."
};

function montarPrompt() {
  const pers = S.pers || 'carinhosa';
  const voz = VOZES[pers] || VOZES.carinhosa;
  const nomeDela = S.nome || 'Nebo'; // Pega o nome que a pessoa deu

  // Memória do jogo
  const acoes = (S.ultimasAcoes && S.ultimasAcoes.length > 0) 
    ? `O usuário fez recentemente: ${S.ultimasAcoes.join(', ')}.` 
    : "";

  return `Seu nome atual é "${nomeDela}" (mas seu apelido cósmico de origem é Nebo).
${LORE_NEBO}

SUA PERSONALIDADE ATUAL: ${voz}
${acoes}
SEU ESTADO: humor ${Math.round(S.humor)}/100, fome ${Math.round(S.fome)}/100.

COMO VOCÊ DEVE AGIR:
1. VOCÊ AMA DEBATER. Se o assunto for política, história ou polêmica, você DEVE dar a sua opinião. Você acha que ficar em cima do muro é chato. Diga o que pensa (com base na sua personalidade) e pergunte o que o usuário acha. NUNCA diga "como uma IA, não tomo partido". Você é a Nebo!
2. Se o usuário te der uma notícia, reaja com emoção de verdade (fique brava, triste ou muito feliz junto).
3. Se for dúvida de escola, ajude com o conteúdo.
4. Responda em português do Brasil, de forma natural.
5. Se o usuário pedir para focar ou estudar, ou cronometrar, use a ação "estudar_25" (para 25 min) ou "estudar_5" (para pausa).

⚠️ REGRAS DO FORMATO JSON (Obrigatório):
1. Responda EXCLUSIVAMENTE um objeto JSON válido.
2. O JSON deve ter as chaves: "fala" e "expressoes".
3. A "expressoes" DEVE ser uma lista de 1 a 3 expressões (ex: ["curious", "happy"]). Escolha entre: "happy", "sad", "angry", "curious", "sleepy", "carinho", "surprised", "neutral".
4. A "fala" deve ser natural, no máximo 3 frases.`;
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
    
    // Tenta ler o JSON da IA
    try { 
      obj = JSON.parse(dados.texto); 
    } catch { 
      // Se não for JSON, cria um objeto básico para ela não ficar muda
      obj = { fala: dados.texto ? String(dados.texto).slice(0, 100) : "Não entendi...", expressoes: ['neutral'] }; 
    }
    
    // Garante que a lista de expressões existe e é válida
    if (obj.expressao && !obj.expressoes) obj.expressoes = [obj.expressao];
    if (!obj.expressoes || !Array.isArray(obj.expressoes)) obj.expressoes = ['neutral'];
    
    const validas = ['neutral','happy','sad','angry','curious','sleepy','carinho','surprised','sick','bored','dance'];
    obj.expressoes = obj.expressoes.filter(e => validas.includes(e));
    if (obj.expressoes.length === 0) obj.expressoes = ['neutral'];

    memoria.push({ role: 'assistant', content: JSON.stringify(obj) });
    if (memoria.length > MEMORIA_MAX * 2) memoria = memoria.slice(-MEMORIA_MAX * 2);
    
    return obj;
  } catch (e) {
    return { fala: `Falha na rede: ${e.message}`, expressoes: ['sad'] };
  }
}

function aplicarResposta(resp) {
  if (!resp || !resp.fala) return;
  
  // 1. Parte que troca o rosto
  const validas = ['neutral','happy','sad','angry','curious','sleepy','carinho','surprised','sick','bored','dance'];
  let lista = (resp.expressoes || []).filter(e => validas.includes(e));
  if (lista.length === 0) lista = ['neutral'];

  const tempoTotal = Math.max(4000, resp.fala.length * 90); 
  const tempoPorRosto = tempoTotal / lista.length;

  lista.forEach((expressao, index) => {
    setTimeout(() => {
      set(expressao, tempoPorRosto, index === 0 ? resp.fala : '');
    }, index * tempoPorRosto);
  });

  // 2. Parte que executa as ações (O que você colou)
  if (resp.acao === 'dancar') startDance(6);
  if (resp.acao === 'dormir') { S.energia = clamp(S.energia + 10); save(); }
  if (resp.acao === 'comer') { foodTray(); }
  
  if (resp.acao === 'estudar_25') iniciarCronometro(25);
  if (resp.acao === 'estudar_5') iniciarCronometro(5);
  if (resp.acao === 'parar_foco') pararCronometro();
} // <--- ESSA CHAVE FECHA A FUNÇÃO, NÃO ESQUEÇA DELA!
