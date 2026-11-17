
// SCRIPT - PETSHOP MINAC
// API EXTERNA (Fake Store): produtos em destaque na página inicial
// API INTERNA (produtos.json): catálogo, filtros e busca
// Carrinho: dados salvos no localStorage

const ARQUIVO_PRODUTOS = 'produtos.json';
const API_EXTERNA = 'https://fakestoreapi.com/products';
const QTD_DESTAQUES = 4;
const CHAVE_CARRINHO = 'minacCarrinho';
const CHAVE_ENTREGA = 'minacEntrega';
const FRETE_CASA = 20;

var produtos = [];
var catalogo = {};
var categoriaAtual = 'todos';
var textoBusca = '';

const containerDestaques = document.querySelector('#destaques-container');
const containerProdutos = document.querySelector('#produtos-container');

// ---------- Funções auxiliares ----------

function formatarPreco(valor) {
    return 'R$ ' + Number(valor).toFixed(2).replace('.', ',');
}

async function buscarJson(url) {
    const resposta = await fetch(url);

    if (!resposta.ok) {
        throw new Error('Erro ao carregar os dados: ' + resposta.status);
    }

    return resposta.json();
}

// Diferencia produtos da API externa e do catálogo interno,
// pois os dois podem ter o mesmo número de ID.
function chaveProduto(produto) {
    return produto._origem === 'externa'
        ? 'ext-' + produto.id
        : String(produto.id);
}

// ---------- Cards de produtos ----------

function criarCardHtml(produto) {
    const emEstoque = produto.stock === undefined || produto.stock > 0;

    const estoque = emEstoque
        ? '<span class="badge badge-ok">✓ Em estoque</span>'
        : '<span class="badge badge-off">Sob encomenda</span>';

    const chave = chaveProduto(produto);

    const link = 'produto.html?id=' + produto.id +
        (produto._origem === 'externa' ? '&origem=externa' : '');

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

            <button type="button" class="btn btn-primary btn-block" data-add="${chave}">
                ＋ Adicionar ao carrinho
            </button>
        </article>
    `;
}

function criarCardProduto(listaProdutos, container) {
    if (!container) return;

    listaProdutos.forEach(produto => {
        catalogo[chaveProduto(produto)] = produto;
    });

    if (listaProdutos.length === 0) {
        container.innerHTML = '<p class="aviso-vazio">Nenhum produto encontrado.</p>';
        return;
    }

    container.innerHTML = listaProdutos.map(criarCardHtml).join('');
}

// ---------- Página inicial: destaques da Fake Store API ----------

async function carregarDestaquesAPI() {
    if (!containerDestaques) return;

    try {
        const lista = await buscarJson(API_EXTERNA + '?limit=' + QTD_DESTAQUES);

        lista.forEach(produto => {
            produto._origem = 'externa';
        });

        criarCardProduto(lista, containerDestaques);

    } catch (error) {
        console.error('Erro ao carregar os destaques:', error);

        containerDestaques.innerHTML =
            '<p class="aviso-vazio">Não foi possível carregar os destaques. Verifique sua conexão com a internet.</p>';
    }
}

// ---------- Página de produtos: carregar produtos.json ----------

async function carregarProdutos() {
    if (!containerProdutos) return;

    try {
        const resposta = await fetch(ARQUIVO_PRODUTOS);

        if (!resposta.ok) {
            throw new Error('Erro HTTP: ' + resposta.status);
        }

        produtos = await resposta.json();

        montarFiltros();
        iniciarCatalogo();

    } catch (error) {
        console.error('Erro ao carregar os produtos:', error);

        containerProdutos.innerHTML =
            '<p class="aviso-vazio">Não foi possível carregar os produtos. Verifique o arquivo produtos.json.</p>';
    }
}

// ---------- Filtros e busca ----------

function aplicarFiltros() {
    const produtosFiltrados = produtos.filter(produto =>
        (categoriaAtual === 'todos' || produto.category === categoriaAtual) &&
        produto.title.toLowerCase().includes(textoBusca)
    );

    criarCardProduto(produtosFiltrados, containerProdutos);
}

function filtrarPorCategoria(categoriaEscolhida) {
    categoriaAtual = categoriaEscolhida;

    document.querySelectorAll('[data-filtro]').forEach(link => {
        link.classList.toggle(
            'ativo',
            link.dataset.filtro === categoriaEscolhida
        );
    });

    aplicarFiltros();
}

function filtrarPorNome(pesquisa) {
    textoBusca = pesquisa.toLowerCase();
    aplicarFiltros();
}

// Cria os filtros de acordo com as categorias do produtos.json.
function montarFiltros() {
    const lista = document.querySelector('#filtros-categorias');

    if (!lista) return;

    const categorias = [...new Set(produtos.map(produto => produto.category))];

    categorias.forEach(categoria => {
        const li = document.createElement('li');
        const link = document.createElement('a');

        link.href = 'produtos.html';
        link.dataset.filtro = categoria;
        link.textContent = categoria;

        li.appendChild(link);
        lista.appendChild(li);
    });

    lista.addEventListener('click', evento => {
        const link = evento.target.closest('[data-filtro]');

        if (!link) return;

        evento.preventDefault();
        filtrarPorCategoria(link.dataset.filtro);
    });

    const campo = document.querySelector('#busca-produtos');

    if (campo) {
        campo.addEventListener('input', () => {
            filtrarPorNome(campo.value);
        });
    }

    const formulario = document.querySelector('.busca-produtos');

    if (formulario) {
        formulario.addEventListener('submit', evento => {
            evento.preventDefault();
        });
    }
}

function iniciarCatalogo() {
    const parametros = new URLSearchParams(location.search);
    const pesquisa = parametros.get('q');

    if (pesquisa) {
        textoBusca = pesquisa.toLowerCase();

        const campo = document.querySelector('#busca-produtos');

        if (campo) {
            campo.value = pesquisa;
        }
    }

    const categoria = parametros.get('categoria');

    if (categoria && produtos.some(produto => produto.category === categoria)) {
        categoriaAtual = categoria;
    }

    filtrarPorCategoria(categoriaAtual);
}

// ---------- Página de detalhes do produto ----------

async function iniciarDetalhe() {
    const detalhe = document.querySelector('.detalhe');

    if (!detalhe) return;

    var produto;

    try {
        const parametros = new URLSearchParams(location.search);
        const id = Number(parametros.get('id')) || 1;

        if (parametros.get('origem') === 'externa') {
            produto = await buscarJson(API_EXTERNA + '/' + id);
            produto._origem = 'externa';

        } else {
            const resposta = await fetch(ARQUIVO_PRODUTOS);

            if (!resposta.ok) {
                throw new Error('Erro HTTP: ' + resposta.status);
            }

            const lista = await resposta.json();

            produto = lista.find(item => item.id === id) || lista[0];
        }

    } catch (error) {
        console.error('Erro ao carregar o produto:', error);

        detalhe.innerHTML =
            '<p class="aviso-vazio">Não foi possível carregar o produto.</p>';

        return;
    }

    if (!produto) return;

    catalogo[chaveProduto(produto)] = produto;

    const avaliacoes = produto.rating || { rate: 5, count: 0 };

    document.title = produto.title + ' — PetShop Minac';
    detalhe.dataset.id = chaveProduto(produto);
    detalhe.dataset.categoria = produto.category;

    document.querySelectorAll('.produto-nome').forEach(elemento => {
        elemento.textContent = produto.title;
    });

    const migalhaProduto = document.querySelector('.migalha-produto');

    if (migalhaProduto) {
        migalhaProduto.textContent = produto.title;
    }

    const migalhaCategoria = document.querySelector('.migalha-categoria');

    if (migalhaCategoria) {
        migalhaCategoria.textContent = produto.category;

        if (produto._origem !== 'externa') {
            migalhaCategoria.href =
                'produtos.html?categoria=' + encodeURIComponent(produto.category);
        }
    }

    const preco = document.querySelector('.produto-preco');

    if (preco) {
        preco.textContent = formatarPreco(produto.price);
    }

    const descricao = document.querySelector('.produto-descricao');

    if (descricao) {
        descricao.textContent =
            produto.description || 'Produto selecionado com carinho para o seu pet.';
    }

    document.querySelectorAll('.detalhe img').forEach(img => {
        img.src = produto.image;
        img.alt = produto.title;
    });

    const avaliacao = document.querySelector('.produto-avaliacoes');

    if (avaliacao) {
        const estrelas = Math.round(avaliacoes.rate);

        avaliacao.innerHTML =
            '★'.repeat(estrelas) +
            '☆'.repeat(5 - estrelas) +
            ' <span>(' +
            (avaliacoes.count
                ? avaliacoes.count + ' avaliações'
                : 'sem avaliações ainda') +
            ')</span>';
    }

    const categoria = document.querySelector('#info-categoria');

    if (categoria) {
        categoria.textContent = produto.category;
    }

    const material = document.querySelector('#info-material');

    if (material) {
        material.textContent = produto.material || 'Não informado';
    }

    const caracteristicas = document.querySelector('#info-caracteristicas');

    if (caracteristicas) {
        caracteristicas.textContent = produto.caracteristicas || 'Não informado';
    }

    const selo = document.querySelector('.detalhe .badge');

    if (selo) {
        const emEstoque = produto.stock === undefined || produto.stock > 0;

        selo.className = 'badge ' + (emEstoque ? 'badge-ok' : 'badge-off');

        selo.textContent = emEstoque
            ? '✓ Em estoque'
            : 'Sob encomenda';
    }
}

// ---------- Carrinho ----------

function lerCarrinho() {
    try {
        return JSON.parse(localStorage.getItem(CHAVE_CARRINHO)) || [];
    } catch (error) {
        return [];
    }
}

function salvarCarrinho(carrinho) {
    localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(carrinho));
    atualizarContador();
}

function atualizarContador() {
    const total = lerCarrinho().reduce((soma, item) => soma + item.qtd, 0);

    document.querySelectorAll('.contador').forEach(elemento => {
        elemento.textContent = total;
    });
}

function adicionarAoCarrinho(id, qtd) {
    const produto = catalogo[id];

    if (!produto) return;

    const carrinho = lerCarrinho();
    const item = carrinho.find(i => String(i.id) === String(id));

    if (item) {
        item.qtd += qtd;

    } else {
        carrinho.push({
            id: id,
            title: produto.title,
            price: produto.price,
            image: produto.image,
            qtd: qtd
        });
    }

    salvarCarrinho(carrinho);
}

function calcularTotais() {
    const carrinho = lerCarrinho();

    const subtotal = carrinho.reduce(
        (soma, item) => soma + item.price * item.qtd,
        0
    );

    const entrega = localStorage.getItem(CHAVE_ENTREGA) || 'casa';

    const frete = carrinho.length > 0 && entrega === 'casa'
        ? FRETE_CASA
        : 0;

    return {
        subtotal: subtotal,
        frete: frete,
        total: subtotal + frete,
        entrega: entrega,
        vazio: carrinho.length === 0
    };
}

function escreverTexto(seletor, texto) {
    const elemento = document.querySelector(seletor);

    if (elemento) {
        elemento.textContent = texto;
    }
}

function ativarBotoesComprar() {
    document.addEventListener('click', evento => {
        const botao = evento.target.closest('[data-add]');

        if (!botao) return;

        adicionarAoCarrinho(botao.dataset.add, 1);

        const textoOriginal = botao.textContent;
        botao.textContent = '✓ Adicionado!';

        setTimeout(() => {
            botao.textContent = textoOriginal;
        }, 1200);
    });

    const formulario = document.querySelector('.compra');

    if (formulario) {
        formulario.addEventListener('submit', evento => {
            evento.preventDefault();

            const detalhe = document.querySelector('.detalhe');

            if (!detalhe) return;

            const id = detalhe.dataset.id;

            const qtd = Math.max(
                1,
                parseInt(formulario.elements['quantidade'].value, 10) || 1
            );

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
        corpo.innerHTML = `
            <tr>
                <td colspan="5">
                    Seu carrinho está vazio.
                    <a href="produtos.html"><strong>Ver produtos</strong></a>
                </td>
            </tr>
        `;

    } else {
        corpo.innerHTML = carrinho.map(item => `
            <tr class="carrinho-item" data-id="${item.id}">
                <td class="ci-produto">
                    <img src="${item.image}" alt="${item.title}">
                    <strong>${item.title}</strong>
                </td>

                <td data-label="Preço">${formatarPreco(item.price)}</td>

                <td data-label="Quantidade">
                    <label class="qtd">
                        <span class="sr">Quantidade</span>
                        <input type="number" value="${item.qtd}" min="1">
                    </label>
                </td>

                <td data-label="Subtotal">
                    <strong>${formatarPreco(item.price * item.qtd)}</strong>
                </td>

                <td>
                    <a class="remover" href="#" aria-label="Remover ${item.title}">🗑</a>
                </td>
            </tr>
        `).join('');
    }

    renderResumo();
}

function renderResumo() {
    const totais = calcularTotais();

    escreverTexto('#resumo-subtotal', formatarPreco(totais.subtotal));
    escreverTexto('#resumo-frete', formatarPreco(totais.frete));
    escreverTexto('#resumo-total', formatarPreco(totais.total));
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

        if (!item) return;

        item.qtd = Math.max(
            1,
            parseInt(evento.target.value, 10) || 1
        );

        salvarCarrinho(carrinho);
        renderCarrinho();
    });

    corpo.addEventListener('click', evento => {
        const remover = evento.target.closest('.remover');

        if (!remover) return;

        evento.preventDefault();

        const id = remover.closest('tr').dataset.id;

        const carrinhoAtualizado = lerCarrinho().filter(
            item => String(item.id) !== id
        );

        salvarCarrinho(carrinhoAtualizado);
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

    const formulario = document.querySelector('form.carrinho');

    if (formulario) {
        formulario.addEventListener('submit', evento => {
            if (lerCarrinho().length === 0) {
                evento.preventDefault();
            }
        });
    }
}

// ---------- Página de finalizar compra ----------

function iniciarCheckout() {
    const formulario = document.querySelector('form.checkout');

    if (!formulario) return;

    const totais = calcularTotais();

    escreverTexto('#checkout-produtos', formatarPreco(totais.subtotal));
    escreverTexto('#checkout-frete', formatarPreco(totais.frete));
    escreverTexto('#checkout-total', formatarPreco(totais.total));

    formulario.addEventListener('submit', evento => {
        evento.preventDefault();

        if (totais.vazio) {
            formulario.innerHTML = `
                <section class="painel">
                    <h2>Seu carrinho está vazio</h2>
                    <a class="btn btn-primary" href="produtos.html">Ver produtos</a>
                </section>
            `;

            return;
        }

        localStorage.removeItem(CHAVE_CARRINHO);
        atualizarContador();

        document.querySelectorAll('.etapas li').forEach(li => {
            li.classList.add('ativo');
        });

        formulario.innerHTML = `
            <section class="painel">
                <h2>Pedido confirmado! 🐾</h2>
                <p>Obrigado pela compra no PetShop Minac. Seu pedido foi recebido.</p>
                <a class="btn btn-primary" href="index.html">Voltar ao início</a>
            </section>
        `;
    });
}

// ---------- Inicialização ----------

atualizarContador();
ativarBotoesComprar();
iniciarCarrinho();
iniciarCheckout();

carregarDestaquesAPI();
carregarProdutos();
iniciarDetalhe();
