
/* ============================================================
   NÉBULA — falas roteirizadas por personalidade
   Este arquivo não usa IA nem acessa o microfone.
   ============================================================ */

function registrarEvento(txt) {
  if (!Array.isArray(S.eventos)) S.eventos = [];

  const texto = String(txt || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);

  if (!texto) return;

  S.eventos.push({ t: Date.now(), txt: texto });
  if (S.eventos.length > 8) S.eventos.shift();
}

const FALAS = {
  comeu_fav: {
    carinhosa: ['Você lembrou do meu favorito... 🥰', 'Nham, isso me deixou tão feliz! 💗'],
    curiosa: ['Uau, que sabor incrível! Como será que fazem? 🤩', 'Meu favorito! Quero saber todos os ingredientes! ✨'],
    tranquila: ['Mmm... isso é paz em forma de comida... 😌', 'Meu favorito... vou saborear devagar... 💗'],
    brincalhona: ['AAAA meu favoritoooo! Hihi 🤪', 'Nham nham nham! Pode trazer mais! 😋'],
    temperamental: ['Hmpf... tá, esse eu admito que é bom. 😤', 'Tsc. Não vou agradecer... mas tá ótimo. 💗'],
    reservada: ['...obrigada. Era o meu favorito. 💗', 'Mm. Bom. 😊']
  },

  comeu_det: {
    carinhosa: ['Ai... não gosto muito, mas obrigada por tentar 😅', 'Hmm... não é minha preferida, tá? 🥺'],
    curiosa: ['Que textura estranha! Por que isso existe? 🤢', 'Interessante... e horrível! Anotado! 😖'],
    tranquila: ['Ah... isso não me agrada... 😶', 'Hmm... prefiro não repetir... 😔'],
    brincalhona: ['BLEH! Quer me matar de nojinho? 🤮', 'Eca eca eca! Você me paga! 😝'],
    temperamental: ['ECA. Eu DETESTO isso. Tsc! 😤', 'Hmpf! De propósito, né? 😠'],
    reservada: ['...não gosto disso. 😕', 'Eca. Por favor, não. 😖']
  },

  banho: {
    carinhosa: ['Que gostoso, obrigada por cuidar de mim 🥰✨', 'Fiquei limpinha e cheirosa! 💗'],
    curiosa: ['Quantas bolhas! Será que dá pra fazer mais? 🫧✨', 'Limpinha! Agora sinto meu cheirinho de longe! 🤩'],
    tranquila: ['Aaah... água morninha... que paz... 😌', 'Tô leve... obrigada... ✨'],
    brincalhona: ['Splash! Hihi, virei uma bolhinha! 🫧😄', 'Limpa e fedendo a flor! Pode me cheirar! 🤪'],
    temperamental: ['Hmpf. Tá, ficou bom. Não precisava demorar tanto. 😤', 'Tsc... tô limpa. Satisfeito? ✨'],
    reservada: ['...obrigada. Tava precisando. ✨', 'Limpinha. Bom. 😊']
  },

  leu_gostou: {
    carinhosa: ['Que história linda... quase chorei 📖💗', 'Adorei! Preciso te contar o final! 🥰'],
    curiosa: ['Que mundo! Já quero ler mais sobre isso! 📖🤩', 'Tanta coisa nova! Vou pensar nisso o dia todo! ✨'],
    tranquila: ['Que leitura gostosa... vou ficar pensando nela... 📖😌', 'Uma boa história... assim, devagar... ✨'],
    brincalhona: ['Hahaha, que livro divertido! Leio de novo! 📖😄', 'Plot twist! Não esperava! 🤯'],
    temperamental: ['Hmpf... foi bom. Mas não conta pra ninguém. 📖😤', 'Tsc... tá, gostei. Só um pouquinho. 💗'],
    reservada: ['...foi bom. Muito. 📖', 'Gostei. Fiquei pensando. 💗']
  },

  leu_nao: {
    carinhosa: ['Hmm, esse não me pegou... mas valeu a tentativa 📖🥺', 'Não foi pra mim, mas tudo bem! 😅'],
    curiosa: ['Esperava mais! Cadê as respostas? 📖🤔', 'Estranho... talvez eu precise reler. Talvez. 😕'],
    tranquila: ['Hmm... não me tocou... mas tudo bem... 📖😶', 'Nem toda história é pra gente... 😌'],
    brincalhona: ['Zzz... dormi com os olhos abertos! 📖😴', 'Que livro sem graça! Eu faria melhor! 😝'],
    temperamental: ['Hmpf. Perda de tempo. Que livro chato. 📖😠', 'Tsc! Esperava mais. Muito mais. 😤'],
    reservada: ['...não gostei. 📖', 'Sem graça. 😕']
  }
};

function falaDe(evento, padrao) {
  const lista = FALAS[evento] && FALAS[evento][S.pers];
  return (lista && lista.length) ? rnd(lista) : padrao;
}
