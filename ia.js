/* ============================================================
   ia.js — O Motor da IA (Conexão e Leitura)
   ============================================================ */

const WORKER_URL = 'https://nebo-ia.doeesperancap.workers.dev';
const MEMORIA_MAX = 6;          // quantas trocas (pergunta+resposta) ela lembra
let memoriaConversa = [];
let memoriaCarregada = false;

const EXPRESSOES_VALIDAS = ['neutral','happy','sad','angry','curious','sleepy','carinho','surprised','sick','bored','dance'];
const ACOES_VALIDAS = ['dancar','dormir','comer','estudar_25','estudar_5','parar_foco','nenhuma'];

/* Tenta extrair um JSON de qualquer texto (aceita ```json ... ```) */
function extrairJSON(txt) {
  if (txt && typeof txt === 'object') return txt;
  if (typeof txt !== 'string') return null;
  const t = txt.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try { return JSON.parse(t); } catch {}
  const i = t.indexOf('{'), j = t.lastIndexOf('}');
  if (i >= 0 && j > i) { try { return JSON.parse(t.slice(i, j + 1)); } catch {} }
  return null;
}

/* Histórico que vai pra API: sempre começa com "user" */
function recorteMemoria() {
  const m = memoriaConversa.slice(-MEMORIA_MAX * 2);
  while (m.length && m[0].role !== 'user') m.shift();
  return m;
}

function guardarMemoriaDaResposta(obj) {
  const nomeU = limparTextoMemoria(obj.nome_usuario, 30);
  if (nomeU) S.nomeUsuario = nomeU;

  const m = obj.salvar_memoria;
  if (typeof m === 'string' && m.trim()) {
    adicionarMemoria('fatos', m);
  } else if (m && typeof m === 'object' && m.texto) {
    const tipo = ['gostos', 'fatos', 'apelidos'].includes(m.tipo) ? m.tipo : 'fatos';
    adicionarMemoria(tipo, m.texto);
  }
}

async function chamarIA(textoUsuario) {
     if (!memoriaCarregada) {
    memoriaCarregada = true;
    if (Array.isArray(S.conversaRecente)) memoriaConversa = S.conversaRecente.slice();
  }
  memoriaConversa.push({ role: 'user', content: textoUsuario });

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 20000);

  try {
    const resp = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system: montarPrompt(), messages: recorteMemoria() }),
      signal: ctrl.signal
    });
    clearTimeout(timeout);

    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const dados = await resp.json();
    if (dados.erro) throw new Error(String(dados.erro));

    let obj = extrairJSON(dados.texto);
    if (!obj || typeof obj.fala !== 'string') {
      // A IA não mandou JSON: usa o texto bruto como fala
      obj = { fala: String(dados.texto || '').slice(0, 300) || 'Hmm...', expressoes: ['neutral'], acao: 'nenhuma' };
    }

    obj.fala = obj.fala.slice(0, 400);
    if (obj.expressao && !obj.expressoes) obj.expressoes = [obj.expressao];
    if (!Array.isArray(obj.expressoes)) obj.expressoes = ['neutral'];
    if (!ACOES_VALIDAS.includes(obj.acao)) obj.acao = 'nenhuma';

    guardarMemoriaDaResposta(obj);

    memoriaConversa.push({ role: 'assistant', content: JSON.stringify(obj) });
    if (memoriaConversa.length > MEMORIA_MAX * 2) memoriaConversa = memoriaConversa.slice(-MEMORIA_MAX * 2);
    S.conversaRecente = memoriaConversa.slice(-MEMORIA_MAX * 2);
     
    return obj;
  } catch (e) {
    clearTimeout(timeout);
    memoriaConversa.pop(); // tira a pergunta que ficou sem resposta
    console.error('Erro IA:', e);
    return {
      fala: e.name === 'AbortError'
        ? 'Demorei demais pra pensar... tenta de novo? 😅'
        : 'Fiquei sem conexão com meus pensamentos... 😢',
      expressoes: ['sad'],
      acao: 'nenhuma'
    };
  }
}

function aplicarResposta(resp) {
  if (!resp || !resp.fala) return;

  let lista = (resp.expressoes || []).filter(e => EXPRESSOES_VALIDAS.includes(e)).slice(0, 3);
  if (!lista.length) lista = ['neutral'];

  const tempoTotal = Math.max(4000, resp.fala.length * 90);
  const tempoPorRosto = tempoTotal / lista.length;

  say(resp.fala, tempoTotal);   // balão fica o tempo todo da fala

  lista.forEach((expressao, i) => {
    setTimeout(() => {
      until = 0;                // libera: a resposta não pode ser bloqueada pelo "🤔"
      set(expressao, tempoPorRosto);
    }, i * tempoPorRosto);
  });

  switch (resp.acao) {
    case 'dancar':     startDance(6); break;
    case 'dormir':     S.energia = clamp(S.energia + 10); save(); break;
    case 'comer':      foodTray(); break;
    case 'estudar_25': iniciarCronometro(25); break;
    case 'estudar_5':  iniciarCronometro(5); break;
    case 'parar_foco': pararCronometro(); break;
  }
}

/* ============ PENSAMENTO ESPONTÂNEO (IA fala sozinha) ============ */
const PENSAMENTO_COOLDOWN_MIN = 25;
let ultimoPensamentoIA = 0;

function pensamentoPodeIA() {
  return Date.now() - ultimoPensamentoIA > PENSAMENTO_COOLDOWN_MIN * 60000;
}

async function pensamentoEspontaneo() {
  ultimoPensamentoIA = Date.now();
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 15000);
  try {
    const resp = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: montarPrompt(),
        messages: [{
          role: 'user',
          content: '[AVISO DO SISTEMA: o usuário não disse nada. Diga UMA frase curta e espontânea, no seu tom, sobre o que você sente agora ou o que aconteceu há pouco. Não faça pergunta.]'
        }]
      }),
      signal: ctrl.signal
    });
    clearTimeout(timeout);
    if (!resp.ok) return null;
    const dados = await resp.json();
    if (dados.erro) return null;
    const obj = extrairJSON(dados.texto);
    if (!obj || typeof obj.fala !== 'string') return null;
    const expr = Array.isArray(obj.expressoes) ? obj.expressoes : (obj.expressao ? [obj.expressao] : ['neutral']);
    return { fala: obj.fala.slice(0, 160), expressoes: expr.slice(0, 2), acao: 'nenhuma' };
  } catch (e) {
    clearTimeout(timeout);
    return null;
  }
}
