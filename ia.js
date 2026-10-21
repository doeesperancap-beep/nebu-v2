/* ============================================================
   ia.js — O Motor da IA (Conexão e Leitura)
   ============================================================ */

const WORKER_URL = 'https://nebo-ia.doeesperancap.workers.dev'; 
const MEMORIA_MAX = 6; 
let memoriaConversa = [];

async function chamarIA(textoUsuario) {
  memoriaConversa.push({ role: 'user', content: textoUsuario });

  try {
    const resp = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system: montarPrompt(), messages: memoriaConversa.slice(-MEMORIA_MAX) }),
    });

    const dados = await resp.json();
    
    // Se a Cloudflare devolver um erro, avisa e não tenta ler o JSON
    if (dados.erro) {
      return { fala: "Tive um sonho confuso (erro na nuvem).", expressoes: ['sad'], acao: 'nenhuma' };
    }

    let obj;
    try { 
      obj = JSON.parse(dados.texto); 
    } catch { 
      // Se a IA quebrar o JSON, a gente tenta usar o texto bruto
      obj = { fala: String(dados.texto).slice(0, 100), expressoes: ['neutral'], acao: 'nenhuma' }; 
    }
    
    // Garante que a memória seja salva com segurança
    if (obj.salvar_memoria && typeof obj.salvar_memoria === 'string') {
      adicionarMemoria('fatos', obj.salvar_memoria);
    }

    // Garante que as expressões existam e sejam válidas
    if (obj.expressao && !obj.expressoes) obj.expressoes = [obj.expressao];
    if (!obj.expressoes || !Array.isArray(obj.expressoes)) obj.expressoes = ['neutral'];

    memoriaConversa.push({ role: 'assistant', content: JSON.stringify(obj) });
    if (memoriaConversa.length > MEMORIA_MAX * 2) memoriaConversa = memoriaConversa.slice(-MEMORIA_MAX * 2);
    
    return obj;
  } catch (e) {
    return { fala: `Falha na rede: ${e.message}`, expressoes: ['sad'], acao: 'nenhuma' };
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

  // Executa ações com segurança (só se a função existir)
  if (resp.acao === 'dancar' && typeof startDance === 'function') startDance(6);
  if (resp.acao === 'dormir' && typeof clamp === 'function') { S.energia = clamp(S.energia + 10); save(); }
  if (resp.acao === 'comer' && typeof foodTray === 'function') foodTray();
  if (resp.acao === 'cochilar' && typeof iniciarCochilo === 'function') iniciarCochilo(2, false);
  
  if (resp.acao && resp.acao.startsWith('estudar_') && typeof iniciarCronometro === 'function') {
    const minutos = parseInt(resp.acao.replace('estudar_', ''));
    if (!isNaN(minutos)) iniciarCronometro(minutos);
  }
  if (resp.acao === 'parar_foco' && typeof pararCronometro === 'function') pararCronometro();
}
