// SCRIPT - PETSHOP MINAC
// Duas fontes de produtos:
//  - API EXTERNA (fakestoreapi): 4 produtos em destaque no index.html
//  - API INTERNA (produtos.json): catálogo completo em produtos.html, com filtro e busca
//  - produto.html: detalhes (de qualquer uma das duas)  |  carrinho.html / finalizar-compra.html: carrinho (localStorage)
// Obs.: o fetch do arquivo local precisa de servidor (extensão Live Server do VS Code).

const ARQUIVO_PRODUTOS = 'produtos.json'; // API interna
const API_EXTERNA = 'https://fakestoreapi.com/products';
const QTD_DESTAQUES = 4;
const CHAVE_CARRINHO = 'minacCarrinho';
const CHAVE_ENTREGA = 'minacEntrega';
const FRETE_CASA = 20;

var produtos = [];
var catalogo = {}; // produtos já carregados, por id
var categoriaAtual = 'todos';
var textoBusca = '';

const containerDestaques = document.querySelector('#destaques-container');
const containerProdutos = document.querySelector('#produtos-container');

function formatarPreco(valor) {
    return 'R$ ' + Number(valor).toFixed(2).replace('.', ',');
}

async function buscarJson(url) {
    const resposta = await fetch(url, { cache: 'no-store' });
    if (!resposta.ok) throw new Error('HTTP ' + resposta.status);
    return resposta.json();
}

// Lê o produtos.json; se o navegador bloquear (site aberto com duplo clique),
// usa a cópia de js/produtos-data.js
async function buscarProdutos() {
    try {
        return await buscarJson(ARQUIVO_PRODUTOS);
    } catch (error) {
        if (typeof PRODUTOS_LOCAIS !== 'undefined') return PRODUTOS_LOCAIS;
        throw error;
    }
}

// Chave única do produto (os ids da API interna e da externa podem se repetir)
function chaveProduto(produto) {
    return produto._origem === 'externa' ? 'ext-' + produto.id : String(produto.id);
}

// ---------- Cards ----------
function criarCardHtml(produto) {
    const emEstoque = produto.stock === undefined || produto.stock > 0;
    const estoque = emEstoque
        ? '<span class="badge badge-ok">✓ Em estoque</span>'
        : '<span class="badge badge-off">Sob encomenda</span>';
    const chave = chaveProduto(produto);
    const link = 'produto.html?id=' + produto.id + (produto._origem === 'externa' ? '&origem=externa' : '');

    return `
        <article class="produto-card" data-id="${produto.id}" data-categoria="${produto.category}" data-estoque="${emEstoque ? 1 : 0}">
            <a class="produto-card__img" href="${link}">
                <img class="produto-imagem" src="${produto.image}" alt="${produto.title}">
            </a>
            <span class="produto-card__cat produto-categoria">${produto.category}</span>
            <h3 class="produto-card__nome produto-nome">${produto.title}</h3>
            <p class="produto-card__preco produto-preco">${formatarPreco(produto.price)}</p>
            ${estoque}
            <a class="btn btn-outline btn-block" href="${link}">Ver produto</a>
            <button type="button" class="btn btn-primary btn-block" data-add="${chave}">＋ Adicionar ao carrinho</button>
        </article>
    `;
}

function criarCardProduto(listaProdutos, container) {
    if (!container) return;
    listaProdutos.forEach(p => catalogo[chaveProduto(p)] = p);
    container.innerHTML = listaProdutos.length === 0
        ? '<p class="aviso-vazio">Nenhum produto encontrado.</p>'
        : listaProdutos.map(criarCardHtml).join('');
}

// ---------- Página inicial: destaques (API externa) ----------
async function carregarDestaquesAPI() {
    if (!containerDestaques) return;
    try {
        const lista = await buscarJson(API_EXTERNA + '?limit=' + QTD_DESTAQUES);
        lista.forEach(p => p._origem = 'externa');
        criarCardProduto(lista, containerDestaques);
    } catch (error) {
        console.error('Erro ao carregar os destaques:', error);
        containerDestaques.innerHTML = '<p class="aviso-vazio">Não foi possível carregar os destaques. Verifique sua conexão com a internet.</p>';
    }
}

// ---------- Página de produtos: catálogo e filtros (API interna) ----------
function aplicarFiltros() {
    const lista = produtos.filter(p =>
        (categoriaAtual === 'todos' || p.category === categoriaAtual) &&
        p.title.toLowerCase().includes(textoBusca)
    );
    criarCardProduto(lista, containerProdutos);
}

function filtrarPorCategoria(categoriaEscolhida) {
    categoriaAtual = categoriaEscolhida;
    document.querySelectorAll('[data-filtro]').forEach(l =>
        l.classList.toggle('ativo', l.dataset.filtro === categoriaEscolhida));
    aplicarFiltros();
}

function filtrarPorNome(pesquisa) {
    textoBusca = pesquisa.toLowerCase();
    aplicarFiltros();
}

// Cria os filtros a partir das categorias que existem no produtos.json
function montarFiltros() {
    const lista = document.querySelector('#filtros-categorias');
    if (!lista) return;
    const categorias = [...new Set(produtos.map(p => p.category))];
    categorias.forEach(categoria => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = 'produtos.html';
        a.dataset.filtro = categoria;
        a.textContent = categoria;
        li.appendChild(a);
        lista.appendChild(li);
    });
    lista.addEventListener('click', evento => {
        const link = evento.target.closest('[data-filtro]');
        if (!link) return;
        evento.preventDefault();
        filtrarPorCategoria(link.dataset.filtro);
    });

    const campo = document.querySelector('#busca-produtos');
    if (campo) campo.addEventListener('input', () => filtrarPorNome(campo.value));
    const form = document.querySelector('.busca-produtos');
    if (form) form.addEventListener('submit', e => e.preventDefault());
}

function iniciarCatalogo() {
    if (!containerProdutos) return;
    montarFiltros();
    const parametros = new URLSearchParams(location.search);
    const q = parametros.get('q');
    if (q) {
        textoBusca = q.toLowerCase();
        const campo = document.querySelector('#busca-produtos');
        if (campo) campo.value = q;
    }
    const categoria = parametros.get('categoria');
    if (categoria && produtos.some(p => p.category === categoria)) categoriaAtual = categoria;
    filtrarPorCategoria(categoriaAtual);
}

// ---------- Página de detalhes ----------
async function iniciarDetalhe() {
    const detalhe = document.querySelector('.detalhe');
    if (!detalhe) return;
    var p;
    try {
        const parametros = new URLSearchParams(location.search);
        const id = Number(parametros.get('id')) || 1;
        if (parametros.get('origem') === 'externa') {
            p = await buscarJson(API_EXTERNA + '/' + id);
            p._origem = 'externa';
        } else {
            const lista = await buscarProdutos();
            p = lista.find(item => item.id === id) || lista[0];
        }
    } catch (error) {
        console.error('Erro ao carregar o produto:', error);
        detalhe.innerHTML = '<p class="aviso-vazio">Não foi possível carregar o produto.</p>';
        return;
    }
    catalogo[chaveProduto(p)] = p;

    const avaliacoes = p.rating || { rate: 5, count: 0 };
    document.title = p.title + ' — PetShop Minac';
    detalhe.dataset.id = chaveProduto(p);
    detalhe.dataset.categoria = p.category;
    document.querySelectorAll('.produto-nome').forEach(e => e.textContent = p.title);
    document.querySelector('.migalha-produto').textContent = p.title;
    const migalha = document.querySelector('.migalha-categoria');
    migalha.textContent = p.category;
    if (p._origem !== 'externa') migalha.href = 'produtos.html?categoria=' + encodeURIComponent(p.category);
    document.querySelector('.produto-preco').textContent = formatarPreco(p.price);
    document.querySelector('.produto-descricao').textContent = p.description || 'Produto selecionado com carinho para o seu pet.';
    document.querySelectorAll('.detalhe img').forEach(img => { img.src = p.image; img.alt = p.title; });
    const estrelas = Math.round(avaliacoes.rate);
    document.querySelector('.produto-avaliacoes').innerHTML = '★'.repeat(estrelas) + '☆'.repeat(5 - estrelas) +
        ' <span>(' + (avaliacoes.count ? avaliacoes.count + ' avaliações' : 'sem avaliações ainda') + ')</span>';
    document.querySelector('#info-categoria').textContent = p.category;
    document.querySelector('#info-material').textContent = p.material || 'Não informado';
    document.querySelector('#info-caracteristicas').textContent = p.caracteristicas || 'Não informado';
    const selo = document.querySelector('.detalhe .badge');
    const emEstoque = p.stock === undefined || p.stock > 0;
    selo.className = 'badge ' + (emEstoque ? 'badge-ok' : 'badge-off');
    selo.textContent = emEstoque ? '✓ Em estoque' : 'Sob encomenda';
}

// ---------- Carrinho (salvo no navegador) ----------
function lerCarrinho() {
    try { return JSON.parse(localStorage.getItem(CHAVE_CARRINHO)) || []; }
    catch (error) { return []; }
}

function salvarCarrinho(carrinho) {
    localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(carrinho));
    atualizarContador();
}

function atualizarContador() {
    const total = lerCarrinho().reduce((soma, item) => soma + item.qtd, 0);
    document.querySelectorAll('.contador').forEach(e => e.textContent = total);
}

function adicionarAoCarrinho(id, qtd) {
    const produto = catalogo[id];
    if (!produto) return;
    const carrinho = lerCarrinho();
    const item = carrinho.find(i => String(i.id) === String(id));
    if (item) item.qtd += qtd;
    else carrinho.push({ id: id, title: produto.title, price: produto.price, image: produto.image, qtd: qtd });
    salvarCarrinho(carrinho);
}

function calcularTotais() {
    const carrinho = lerCarrinho();
    const subtotal = carrinho.reduce((soma, i) => soma + i.price * i.qtd, 0);
    const entrega = localStorage.getItem(CHAVE_ENTREGA) || 'casa';
    const frete = (carrinho.length > 0 && entrega === 'casa') ? FRETE_CASA : 0;
    return { subtotal: subtotal, frete: frete, total: subtotal + frete, entrega: entrega, vazio: carrinho.length === 0 };
}

function escreverTexto(seletor, texto) {
    const e = document.querySelector(seletor);
    if (e) e.textContent = texto;
}

function ativarBotoesComprar() {
    document.addEventListener('click', evento => {
        const botao = evento.target.closest('[data-add]');
        if (!botao) return;
        adicionarAoCarrinho(botao.dataset.add, 1);
        const original = botao.textContent;
        botao.textContent = '✓ Adicionado!';
        setTimeout(() => botao.textContent = original, 1200);
    });

    const form = document.querySelector('.compra'); // página de detalhes
    if (form) {
        form.addEventListener('submit', evento => {
            evento.preventDefault();
            const id = document.querySelector('.detalhe').dataset.id;
            const qtd = Math.max(1, parseInt(form.elements['quantidade'].value, 10) || 1);
            adicionarAoCarrinho(id, qtd);
            location.href = 'carrinho.html';
        });
    }
}

// ---------- Página do carrinho ----------
function renderCarrinho() {
    const corpo = document.querySelector('#carrinho-itens');
    if (!corpo) return;
    const carrinho = lerCarrinho();

    if (carrinho.length === 0) {
        corpo.innerHTML = '<tr><td colspan="5">Seu carrinho está vazio. <a href="produtos.html"><strong>Ver produtos</strong></a></td></tr>';
    } else {
        corpo.innerHTML = carrinho.map(item => `
            <tr class="carrinho-item" data-id="${item.id}">
                <td class="ci-produto"><img src="${item.image}" alt="${item.title}"><strong>${item.title}</strong></td>
                <td data-label="Preço">${formatarPreco(item.price)}</td>
                <td data-label="Quantidade"><label class="qtd"><span class="sr">Quantidade</span><input type="number" value="${item.qtd}" min="1"></label></td>
                <td data-label="Subtotal"><strong>${formatarPreco(item.price * item.qtd)}</strong></td>
                <td><a class="remover" href="#" aria-label="Remover ${item.title}">🗑</a></td>
            </tr>`).join('');
    }
    renderResumo();
}

function renderResumo() {
    const t = calcularTotais();
    escreverTexto('#resumo-subtotal', formatarPreco(t.subtotal));
    escreverTexto('#resumo-frete', formatarPreco(t.frete));
    escreverTexto('#resumo-total', formatarPreco(t.total));
}

function iniciarCarrinho() {
    const corpo = document.querySelector('#carrinho-itens');
    if (!corpo) return;
    renderCarrinho();

    corpo.addEventListener('change', evento => {
        if (!evento.target.matches('input')) return;
        const id = evento.target.closest('tr').dataset.id;
        const carrinho = lerCarrinho();
        const item = carrinho.find(i => String(i.id) === id);
        item.qtd = Math.max(1, parseInt(evento.target.value, 10) || 1);
        salvarCarrinho(carrinho);
        renderCarrinho();
    });

    corpo.addEventListener('click', evento => {
        const remover = evento.target.closest('.remover');
        if (!remover) return;
        evento.preventDefault();
        const id = remover.closest('tr').dataset.id;
        salvarCarrinho(lerCarrinho().filter(i => String(i.id) !== id));
        renderCarrinho();
    });

    const entrega = localStorage.getItem(CHAVE_ENTREGA) || 'casa';
    document.querySelectorAll('input[name="entrega"]').forEach(radio => {
        radio.checked = radio.value === entrega;
        radio.addEventListener('change', () => {
            localStorage.setItem(CHAVE_ENTREGA, radio.value);
            renderResumo();
        });
    });

    document.querySelector('form.carrinho').addEventListener('submit', evento => {
        if (lerCarrinho().length === 0) evento.preventDefault();
    });
}

// ---------- Página de finalizar compra ----------
function iniciarCheckout() {
    const form = document.querySelector('form.checkout');
    if (!form) return;
    const t = calcularTotais();
    escreverTexto('#checkout-produtos', formatarPreco(t.subtotal));
    escreverTexto('#checkout-frete', formatarPreco(t.frete));
    escreverTexto('#checkout-total', formatarPreco(t.total));

    form.addEventListener('submit', evento => {
        evento.preventDefault();
        if (t.vazio) {
            form.innerHTML = '<section class="painel"><h2>Seu carrinho está vazio</h2><a class="btn btn-primary" href="produtos.html">Ver produtos</a></section>';
            return;
        }
        localStorage.removeItem(CHAVE_CARRINHO);
        atualizarContador();
        document.querySelectorAll('.etapas li').forEach(li => li.classList.add('ativo'));
        form.innerHTML = '<section class="painel"><h2>Pedido confirmado! 🐾</h2><p>Obrigado pela compra no PetShop Minac. Seu pedido foi recebido.</p><a class="btn btn-primary" href="index.html">Voltar ao início</a></section>';
    });
}

// ---------- Início ----------
async function carregarProdutosInternos() {
    if (!containerProdutos) return;
    try {
        produtos = await buscarProdutos();
        iniciarCatalogo();
    } catch (error) {
        console.error('Erro ao carregar o produtos.json:', error);
        const endereco = new URL(ARQUIVO_PRODUTOS, location.href).href;
        containerProdutos.innerHTML = '<p class="aviso-vazio">Não foi possível carregar o produtos.json.<br>Tentei abrir: ' + endereco + '<br>Motivo: ' + error.message + '</p>';
    }
}

atualizarContador();
ativarBotoesComprar();
iniciarCarrinho();
iniciarCheckout();
carregarDestaquesAPI();
carregarProdutosInternos();
iniciarDetalhe();
