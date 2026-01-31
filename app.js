// Configurações são carregadas do config.js (desenvolvimento) ou injetadas pelo Railway (produção)
// Verifica se CONFIG existe (carregado via script tag antes deste arquivo)
const API_KEY = typeof CONFIG !== 'undefined' ? CONFIG.API_KEY : '';
const API_BASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'https://api.semanticscholar.org/graph/v1';
const RESULTS_PER_PAGE = typeof CONFIG !== 'undefined' ? CONFIG.RESULTS_PER_PAGE : 10;

// Endpoint n8n para busca de PDF
const N8N_PDF_ENDPOINT = typeof CONFIG !== 'undefined' ? CONFIG.N8N_PDF_ENDPOINT : '';

// Cache de PDFs encontrados
const pdfCache = new Map();

// Estado da aplicação
let currentQuery = '';
let currentOffset = 0;
let totalResults = 0;
let isLoading = false;

// Elementos DOM
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');

const clearBtn = document.getElementById('clearBtn');

const resultsContainer = document.getElementById('resultsContainer');
const loadMoreContainer = document.getElementById('loadMoreContainer');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const loadingSpinner = document.getElementById('loadingSpinner');
const errorMessage = document.getElementById('errorMessage');
const resultsInfo = document.getElementById('resultsInfo');

// Event Listeners
searchInput.addEventListener('input', handleInputChange);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchPapers();
});
searchBtn.addEventListener('click', searchPapers);
clearBtn.addEventListener('click', clearSearch);
loadMoreBtn.addEventListener('click', loadMore);

// Handlers
function handleInputChange() {
    clearBtn.classList.toggle('hidden', !searchInput.value);
}

function clearSearch() {
    searchInput.value = '';
    clearBtn.classList.add('hidden');
    resultsContainer.innerHTML = '';
    loadMoreContainer.classList.add('hidden');
    resultsInfo.classList.add('hidden');
    errorMessage.classList.add('hidden');
    currentQuery = '';
    currentOffset = 0;
    totalResults = 0;
    searchInput.focus();
}

async function searchPapers() {
    const query = searchInput.value.trim();

    if (!query) {
        showError('Por favor, digite um termo de busca.');
        return;
    }

    // Reset state for new search
    currentQuery = query;
    currentOffset = 0;
    resultsContainer.innerHTML = '';

    await fetchPapers();
}

async function loadMore() {
    await fetchPapers();
}

async function fetchPapers() {
    if (isLoading) return;

    isLoading = true;
    showLoading(true);
    hideError();

    try {
        const fields = [
            'paperId',
            'title',
            'abstract',
            'authors',
            'year',
            'citationCount',
            'influentialCitationCount',
            'isOpenAccess',
            'openAccessPdf',
            'url',
            'tldr',
            'fieldsOfStudy',
            's2FieldsOfStudy'
        ].join(',');

        const params = new URLSearchParams({
            query: currentQuery,
            offset: currentOffset,
            limit: RESULTS_PER_PAGE,
            fields: fields
        });



        const response = await fetch(`${API_BASE_URL}/paper/search?${params}`, {
            method: 'GET',
            headers: {
                'x-api-key': API_KEY
            }
        });

        if (!response.ok) {
            if (response.status === 429) {
                throw new Error('Limite de requisições excedido. Aguarde alguns segundos e tente novamente.');
            } else if (response.status === 403) {
                throw new Error('Erro de autenticação. Verifique sua API key.');
            }
            throw new Error(`Erro na API: ${response.status}`);
        }

        const data = await response.json();

        totalResults = data.total || 0;
        const papers = data.data || [];

        if (papers.length === 0 && currentOffset === 0) {
            showError('Nenhum artigo encontrado para sua busca. Tente outros termos.');
            return;
        }

        renderPapers(papers);
        currentOffset += papers.length;

        // Update results info
        updateResultsInfo();

        // Show/hide load more button
        const hasMore = currentOffset < totalResults && currentOffset < 1000; // API limit is 1000
        loadMoreContainer.classList.toggle('hidden', !hasMore);

    } catch (error) {
        console.error('Erro ao buscar artigos:', error);
        showError(error.message || 'Erro ao buscar artigos. Tente novamente.');
    } finally {
        isLoading = false;
        showLoading(false);
    }
}

function renderPapers(papers) {
    papers.forEach(paper => {
        const card = createPaperCard(paper);
        resultsContainer.appendChild(card);
    });
}

function createPaperCard(paper) {
    const card = document.createElement('article');
    card.className = 'paper-card';

    // Format authors
    const authors = paper.authors?.slice(0, 5).map(a => a.name).join(', ') || 'Autores não disponíveis';
    const authorsDisplay = paper.authors?.length > 5
        ? `${authors} et al.`
        : authors;

    // Format fields of study
    const fields = paper.s2FieldsOfStudy?.slice(0, 3).map(f => f.category) ||
        paper.fieldsOfStudy?.slice(0, 3) || [];

    // TLDR text
    const tldrText = paper.tldr?.text || null;

    // Abstract
    const abstract = paper.abstract || null;

    card.innerHTML = `
        <header class="paper-header">
            <a href="${paper.url}" target="_blank" rel="noopener" class="paper-title">
                ${escapeHtml(paper.title)}
            </a>
            <p class="paper-authors">${escapeHtml(authorsDisplay)}</p>
            <div class="paper-meta">
                ${paper.year ? `
                    <span class="paper-meta-item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line></svg>
                        ${paper.year}
                    </span>
                ` : ''}
                ${paper.citationCount !== undefined ? `
                    <span class="paper-meta-item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21c0 1 0 1 1 1z"></path><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"></path></svg>
                        ${formatNumber(paper.citationCount)} citações
                    </span>
                ` : ''}
                ${paper.influentialCitationCount ? `
                    <span class="paper-meta-item">
                        ⭐ ${paper.influentialCitationCount} influentes
                    </span>
                ` : ''}
            </div>
        </header>
        
        ${tldrText ? `
            <div class="paper-tldr">
                <strong>TL;DR:</strong> ${escapeHtml(tldrText)}
            </div>
        ` : ''}
        
        ${abstract && !tldrText ? `
            <p class="paper-abstract truncated">${escapeHtml(abstract)}</p>
        ` : ''}
        
        <div class="paper-tags">
            ${paper.isOpenAccess ? '<span class="paper-tag open-access">🔓 Open Access</span>' : ''}
            ${fields.map(f => `<span class="paper-tag">${escapeHtml(f)}</span>`).join('')}
        </div>
        
        <div class="paper-actions">
            <a href="${paper.url}" target="_blank" rel="noopener" class="paper-link">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" x2="21" y1="14" y2="3"></line></svg>
                Ver no Semantic Scholar
            </a>
            ${paper.openAccessPdf?.url ? `
                <a href="${paper.openAccessPdf.url}" target="_blank" rel="noopener" class="paper-link paper-link-pdf">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" x2="12" y1="15" y2="3"></line></svg>
                    Baixar PDF
                </a>
            ` : `
                <button class="paper-link paper-link-search-pdf" 
                    data-paper-id="${paper.paperId}" 
                    data-paper-title="${escapeHtml(paper.title).replace(/"/g, '&quot;')}" 
                    data-paper-abstract="${escapeHtml(tldrText || abstract || '').replace(/"/g, '&quot;')}"
                    data-paper-authors="${escapeHtml(authorsDisplay).replace(/"/g, '&quot;')}"
                    data-paper-year="${paper.year || ''}"
                    onclick="searchPdfForPaper(this)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
                    <span class="btn-text">Buscar PDF</span>
                </button>
            `}
        </div>
    `;

    return card;
}

function updateResultsInfo() {
    const showing = Math.min(currentOffset, totalResults);
    resultsInfo.textContent = `Mostrando ${showing} de ${formatNumber(totalResults)} resultados para "${currentQuery}"`;
    resultsInfo.classList.remove('hidden');
}

function showLoading(show) {
    loadingSpinner.classList.toggle('hidden', !show);
    searchBtn.disabled = show;
    loadMoreBtn.disabled = show;
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

function hideError() {
    errorMessage.classList.add('hidden');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

// Função para buscar PDF via n8n (automação com SerpApi + IA)
async function searchPdfForPaper(button) {
    const paperId = button.dataset.paperId;
    const paperTitle = button.dataset.paperTitle;
    const paperAbstract = button.dataset.paperAbstract || '';
    const paperAuthors = button.dataset.paperAuthors || '';
    const paperYear = button.dataset.paperYear || '';
    const btnText = button.querySelector('.btn-text');

    // Verificar cache primeiro
    if (pdfCache.has(paperId)) {
        const cached = pdfCache.get(paperId);
        if (cached.pdfUrl) {
            replaceBtnWithPdfLink(button, cached.pdfUrl);
        } else {
            replaceBtnWithScholarLink(button, paperTitle);
        }
        return;
    }

    // Mostrar estado de loading
    button.disabled = true;
    btnText.textContent = 'Buscando...';
    button.classList.add('loading');

    try {
        // Chamar endpoint n8n
        const response = await fetch(N8N_PDF_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                titulo: paperTitle,
                apresentacao: paperAbstract,
                autor: paperAuthors,
                ano: parseInt(paperYear) || null
            })
        });

        if (!response.ok) {
            throw new Error('Erro na busca');
        }

        const data = await response.json();
        const pdfUrl = data.Response || null;

        // Salvar no cache
        pdfCache.set(paperId, { pdfUrl });

        if (pdfUrl && pdfUrl.trim() !== '') {
            replaceBtnWithPdfLink(button, pdfUrl);
        } else {
            // Não encontrou PDF, mostrar link para Google Scholar
            replaceBtnWithScholarLink(button, paperTitle);
        }

    } catch (error) {
        console.error('Erro ao buscar PDF:', error);
        // Em caso de erro, mostrar link para busca manual
        replaceBtnWithScholarLink(button, paperTitle);
    }
}

// Substituir botão por link de PDF
function replaceBtnWithPdfLink(button, pdfUrl) {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.target = '_blank';
    link.rel = 'noopener';
    link.className = 'paper-link paper-link-pdf';
    link.title = 'Baixar PDF';
    link.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" x2="12" y1="15" y2="3"></line>
        </svg>
        Baixar PDF
    `;
    button.replaceWith(link);
}

// Substituir botão por link do Google Scholar (quando não encontra PDF)
function replaceBtnWithScholarLink(button, title) {
    const link = document.createElement('a');
    link.href = `https://scholar.google.com/scholar?q=${encodeURIComponent(title)}`;
    link.target = '_blank';
    link.rel = 'noopener';
    link.className = 'paper-link paper-link-scholar';
    link.title = 'Buscar versão gratuita no Google Scholar';
    link.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.3-4.3"></path>
        </svg>
        Ver no Google Scholar
    `;
    button.replaceWith(link);
}

// Focus input on load
searchInput.focus();
