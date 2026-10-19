/* ============================================================
   ia.js — O Motor da IA (Conexão e Leitura)
   ============================================================ */

const WORKER_URL = 'https://nebo-ia.doeesperancap.workers.dev'; 
const MEMORIA_MAX = 6; // Histórico da conversa atual
let memoriaConversa = [];

async function chamarIA(textoUsuario) {
  memoriaConversa.push({ role: 'user', content: textoUsuario });

  try {
    const resp = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Chama a função montarPrompt() que agora vive no nebo_dna.js
      body: JSON.stringify({ system: montarPrompt(), messages: memoriaConversa.slice(-MEMORIA_MAX) }),
    });

    const dados = await resp.json();
    if (dados.erro) return { fala: "Tive um sonho confuso (erro).", expressoes: ['sad'] };

    let obj;
    try { obj = JSON.parse(dados.texto); } catch { obj = { fala: dados.texto, expressoes: ['neutral'] }; }
    
    // 🧠 SE A IA MANDOU SALVAR ALGO, A GENTE SALVA AQUI:
    if (obj.salvar_memoria && typeof obj.salvar_memoria === 'string') {
      adicionarMemoria('fatos', obj.salvar_memoria);
    }

    if (obj.expressao && !obj.expressoes) obj.expressoes = [obj.expressao];
    if (!obj.expressoes || !Array.isArray(obj.expressoes)) obj.expressoes = ['neutral'];

    memoriaConversa.push({ role: 'assistant', content: JSON.stringify(obj) });
    return obj;
  } catch (e) {
    return { fala: `Falha na rede.`, expressoes: ['sad'] };
  }
}

function aplicarResposta(resp) {
  if (!resp || !resp.fala) return;
  
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

  // Executa ações
  if (resp.acao === 'dancar') startDance(6);
  if (resp.acao === 'dormir') { S.energia = clamp(S.energia + 10); save(); }
  if (resp.acao === 'comer') { foodTray(); }
  if (resp.acao === 'estudar_25') iniciarCronometro(25);
  if (resp.acao === 'estudar_5') iniciarCronometro(5);
  if (resp.acao === 'parar_foco') pararCronometro();
}
