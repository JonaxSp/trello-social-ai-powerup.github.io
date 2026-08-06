// ============================================
// CONFIGURAÇÃO - TUDO NO FRONTEND!
// ============================================

// Estado
let conteudoGerado = null;
let boardCriado = false;
let geminiAPIKey = '';
let trelloAPIKey = '';
let trelloToken = '';

// Elementos DOM
const promptInput = document.getElementById('prompt');
const plataformaSelect = document.getElementById('plataforma');
const diasSelect = document.getElementById('dias');
const tomSelect = document.getElementById('tom');
const btnGerar = document.getElementById('btnGerar');
const btnCriarPainel = document.getElementById('btnCriarPainel');
const loadingDiv = document.getElementById('loading');
const previewDiv = document.getElementById('preview');
const conteudoCards = document.getElementById('conteudoCards');
const statusDiv = document.getElementById('status');
const progressFill = document.getElementById('progressFill');

// Campos de API
const geminiKeyInput = document.getElementById('geminiKey');
const trelloKeyInput = document.getElementById('trelloKey');
const trelloTokenInput = document.getElementById('trelloToken');

// ============================================
// CARREGAR CHAVES DO LOCALSTORAGE
// ============================================

function carregarChaves() {
  geminiAPIKey = localStorage.getItem('geminiKey') || '';
  trelloAPIKey = localStorage.getItem('trelloKey') || '';
  trelloToken = localStorage.getItem('trelloToken') || '';
  
  if (geminiAPIKey) geminiKeyInput.value = geminiAPIKey;
  if (trelloAPIKey) trelloKeyInput.value = trelloAPIKey;
  if (trelloToken) trelloTokenInput.value = trelloToken;
}

function salvarChaves() {
  geminiAPIKey = geminiKeyInput.value.trim();
  trelloAPIKey = trelloKeyInput.value.trim();
  trelloToken = trelloTokenInput.value.trim();
  
  if (geminiAPIKey) localStorage.setItem('geminiKey', geminiAPIKey);
  if (trelloAPIKey) localStorage.setItem('trelloKey', trelloAPIKey);
  if (trelloToken) localStorage.setItem('trelloToken', trelloToken);
}

// Carregar chaves ao iniciar
carregarChaves();

// Salvar quando mudar
geminiKeyInput.addEventListener('change', salvarChaves);
trelloKeyInput.addEventListener('change', salvarChaves);
trelloTokenInput.addEventListener('change', salvarChaves);

// ============================================
// EVENT LISTENERS
// ============================================

btnGerar.addEventListener('click', gerarConteudo);
btnCriarPainel.addEventListener('click', criarPainelNoTrello);

// Exemplos rápidos
document.querySelectorAll('.example-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    promptInput.value = this.dataset.prompt;
    promptInput.focus();
  });
});

// ============================================
// FUNÇÃO: GERAR CONTEÚDO COM GEMINI (DIRETO!)
// ============================================

async function gerarConteudo() {
  const prompt = promptInput.value.trim();
  if (!prompt) {
    mostrarStatus('Por favor, descreva o conteúdo desejado.', 'error');
    return;
  }

  // Verificar chaves
  salvarChaves();
  if (!geminiAPIKey) {
    mostrarStatus('❌ Configure sua Gemini API Key no topo da página.', 'error');
    return;
  }

  const plataforma = plataformaSelect.value;
  const dias = parseInt(diasSelect.value);
  const tom = tomSelect.value;

  // Desabilitar botões
  btnGerar.disabled = true;
  btnGerar.innerHTML = '⏳ Gerando...';
  btnCriarPainel.disabled = true;
  
  // Mostrar loading
  loadingDiv.classList.remove('hidden');
  previewDiv.classList.add('hidden');
  statusDiv.classList.add('hidden');
  progressFill.style.width = '10%';

  try {
    // ============================================
    // CHAMADA DIRETA PARA GEMINI API (SEM BACKEND!)
    // ============================================
    
    const promptCompleto = `
      Você é um expert em marketing digital e criação de conteúdo para redes sociais.
      
      Crie um plano de conteúdo para ${plataforma} com base no seguinte pedido:
      "${prompt}"
      
      Informações:
      - Período: ${dias} dias
      - Tom: ${tom}
      
      IMPORTANTE: Retorne APENAS um JSON válido com a estrutura:
      [
        {
          "dia": "Segunda-feira",
          "titulo": "Título do post",
          "descricao": "Descrição detalhada",
          "script": "Script completo",
          "hashtags": "#hashtag1 #hashtag2",
          "horario": "10:00",
          "formato": "Carrossel | Vídeo | Imagem | Story | Reels",
          "cta": "Call to action",
          "legenda": "Legenda completa",
          "imagem_sugerida": "Descrição da imagem",
          "topicos": ["Tópico 1", "Tópico 2"]
        }
      ]
      
      Gere exatamente ${dias} posts.
      Seja criativo e específico. Use emojis.
      Retorne APENAS o JSON, sem texto adicional.
    `;

    progressFill.style.width = '30%';

    // Chamada direta para Gemini API
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + geminiAPIKey, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: promptCompleto
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048
        }
      })
    });

    progressFill.style.width = '60%';

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Erro ${response.status}`);
    }

    const data = await response.json();
    progressFill.style.width = '80%';

    // Extrair texto da resposta
    const textoGerado = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Extrair JSON do texto
    const jsonStr = extrairJSON(textoGerado);
    const conteudo = JSON.parse(jsonStr);

    progressFill.style.width = '100%';

    // Salvar conteúdo
    conteudoGerado = conteudo;
    
    // Mostrar preview
    mostrarPreview(conteudo);
    
    // Habilitar botão de criar painel
    btnCriarPainel.disabled = false;
    
    mostrarStatus(`✅ ${conteudo.length} posts gerados com sucesso!`, 'success');
    
  } catch (error) {
    console.error('Erro:', error);
    mostrarStatus(`❌ Erro: ${error.message}`, 'error');
  } finally {
    btnGerar.disabled = false;
    btnGerar.innerHTML = '✨ Gerar Conteúdo';
    setTimeout(() => {
      loadingDiv.classList.add('hidden');
    }, 500);
  }
}

// ============================================
// FUNÇÃO: EXTRAIR JSON DO TEXTO
// ============================================

function extrairJSON(texto) {
  // Remove ```json e ``` do texto
  let clean = texto.replace(/```json/g, '').replace(/```/g, '');
  clean = clean.trim();
  
  // Tenta encontrar um array JSON
  const match = clean.match(/\[[\s\S]*\]/);
  if (match) {
    return match[0];
  }
  
  // Tenta encontrar um objeto JSON
  const matchObj = clean.match(/\{[\s\S]*\}/);
  if (matchObj) {
    return matchObj[0];
  }
  
  return clean;
}

// ============================================
// FUNÇÃO: CRIAR PAINEL NO TRELLO (DIRETO!)
// ============================================

async function criarPainelNoTrello() {
  if (!conteudoGerado || conteudoGerado.length === 0) {
    mostrarStatus('❌ Nenhum conteúdo para criar painel.', 'error');
    return;
  }

  // Verificar chaves do Trello
  salvarChaves();
  if (!trelloAPIKey || !trelloToken) {
    mostrarStatus('❌ Configure suas chaves do Trello no topo da página.', 'error');
    return;
  }

  const nomePainel = prompt('Nome do painel:', `Conteúdo ${plataformaSelect.value} - ${new Date().toLocaleDateString()}`);
  if (!nomePainel) return;

  btnCriarPainel.disabled = true;
  btnCriarPainel.innerHTML = '⏳ Criando...';
  
  mostrarStatus('📋 Criando painel no Trello...', 'info');

  try {
    // ============================================
    // CHAMADA DIRETA PARA TRELLO API (SEM BACKEND!)
    // ============================================
    
    // 1. Criar Board
    const board = await criarBoardTrello(nomePainel);
    
    // 2. Criar Listas
    const listas = await criarListasTrello(board.id, conteudoGerado);
    
    // 3. Criar Cards
    const cards = await criarCardsTrello(listas, conteudoGerado);
    
    mostrarStatus(
      `✅ Painel criado! <a href="${board.url}" target="_blank">Abrir no Trello</a> (${cards.length} cards)`,
      'success'
    );
    
    boardCriado = true;
    
  } catch (error) {
    console.error('Erro:', error);
    mostrarStatus(`❌ Erro ao criar painel: ${error.message}`, 'error');
  } finally {
    btnCriarPainel.disabled = false;
    btnCriarPainel.innerHTML = '📋 Criar no Trello';
  }
}

// ============================================
// FUNÇÕES TRELLO API
// ============================================

async function criarBoardTrello(nome) {
  const url = `https://api.trello.com/1/boards/?key=${trelloAPIKey}&token=${trelloToken}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: nome,
      defaultLists: false,
      desc: 'Painel gerado pelo Social Content Builder AI'
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao criar board');
  }

  return await response.json();
}

async function criarListasTrello(boardId, conteudo) {
  const listas = [];
  
  // Lista de rascunhos
  const rascunho = await criarListaTrello(boardId, '📝 Rascunhos / Ideias');
  listas.push(rascunho);
  
  // Listas para cada dia
  const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  
  for (let i = 0; i < conteudo.length; i++) {
    const item = conteudo[i];
    const dia = item.dia || diasSemana[(i + 1) % 7];
    const nomeLista = `📅 ${dia}`;
    
    // Evitar duplicatas
    if (!listas.find(l => l.name === nomeLista)) {
      const lista = await criarListaTrello(boardId, nomeLista);
      listas.push(lista);
    }
  }
  
  // Lista de publicados
  const publicados = await criarListaTrello(boardId, '✅ Publicados');
  listas.push(publicados);
  
  return listas;
}

async function criarListaTrello(boardId, nome) {
  const url = `https://api.trello.com/1/lists/?key=${trelloAPIKey}&token=${trelloToken}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: nome,
      idBoard: boardId
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao criar lista');
  }

  return await response.json();
}

async function criarCardsTrello(listas, conteudo) {
  const cardsCriados = [];
  
  // Mapear listas por nome
  const mapaListas = {};
  for (const lista of listas) {
    mapaListas[lista.name] = lista.id;
  }
  
  // Lista de rascunho
  const idListaRascunho = mapaListas['📝 Rascunhos / Ideias'];
  
  for (let i = 0; i < conteudo.length; i++) {
    const item = conteudo[i];
    const dia = item.dia || `Dia ${i + 1}`;
    const nomeLista = `📅 ${dia}`;
    const idLista = mapaListas[nomeLista] || idListaRascunho || listas[0]?.id;
    
    if (!idLista) continue;
    
    // Formatar descrição
    const descricao = `
## 📝 Descrição
${item.descricao || 'Sem descrição'}

## 📜 Script
${item.script || 'Sem script'}

## 🏷️ Hashtags
${item.hashtags || 'Sem hashtags'}

## ⏰ Horário
${item.horario || 'Não definido'}

## 📸 Formato
${item.formato || 'Não definido'}

## 🎯 Call to Action
${item.cta || 'Não definido'}

## 💬 Legenda
${item.legenda || 'Sem legenda'}

## 🖼️ Sugestão de Imagem
${item.imagem_sugerida || 'Sem sugestão'}

## 📌 Tópicos
${item.topicos ? item.topicos.map(t => `- ${t}`).join('\n') : 'Não definido'}
    `;
    
    const card = await criarCardTrello(idLista, item.titulo || `Post ${i + 1}`, descricao);
    cardsCriados.push(card);
  }
  
  return cardsCriados;
}

async function criarCardTrello(idLista, titulo, descricao) {
  const url = `https://api.trello.com/1/cards/?key=${trelloAPIKey}&token=${trelloToken}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: titulo,
      desc: descricao,
      idList: idLista,
      pos: 'bottom'
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao criar card');
  }

  return await response.json();
}

// ============================================
// FUNÇÕES UI
// ============================================

function mostrarPreview(conteudo) {
  previewDiv.classList.remove('hidden');
  conteudoCards.innerHTML = '';
  
  if (!conteudo || conteudo.length === 0) {
    conteudoCards.innerHTML = '<p style="color:#5e6c84;">Nenhum conteúdo gerado.</p>';
    return;
  }
  
  conteudo.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'content-card';
    
    const dia = item.dia || `Dia ${index + 1}`;
    
    card.innerHTML = `
      <h3>#${index + 1} - ${item.titulo || 'Sem título'}</h3>
      <div class="meta">
        <span>📅 ${dia}</span>
        <span>⏰ ${item.horario || '-'}</span>
        <span>📸 ${item.formato || '-'}</span>
      </div>
      <p>${item.descricao ? item.descricao.substring(0, 100) + '...' : 'Sem descrição'}</p>
      <div class="hashtags">${item.hashtags || ''}</div>
    `;
    
    conteudoCards.appendChild(card);
  });
}

function mostrarStatus(mensagem, tipo = 'info') {
  statusDiv.className = 'status ' + tipo;
  statusDiv.classList.remove('hidden');
  
  if (tipo === 'success' && mensagem.includes('href')) {
    statusDiv.innerHTML = mensagem;
  } else {
    statusDiv.textContent = mensagem;
  }
}

// ============================================
// INICIALIZAÇÃO TRELLO POWER-UP
// ============================================

// Se estiver rodando dentro do Trello, inicializa
if (typeof TrelloPowerUp !== 'undefined') {
  TrelloPowerUp.initialize({
    'card-buttons': function(t, options) {
      return [{
        icon: 'https://cdn.glitch.com/1b42d3fe-bda4-4c65-9ae5-0cc27a93f27a%2Frocket-ship.png?1543178833318',
        text: 'Social Content Builder',
        callback: function(t) {
          return t.popup({
            title: 'Social Content Builder',
            url: window.location.href,
            height: 640
          });
        }
      }];
    }
  });
}

console.log('🚀 Social Content Builder AI - Versão SEM SERVER');
console.log('📌 Tudo roda no frontend!');
console.log('📌 Suas chaves API ficam salvas no LocalStorage');
