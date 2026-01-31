// Configuração para Railway (deploy)
// As variáveis serão injetadas pelo Railway em runtime

const CONFIG = {
    // Semantic Scholar API
    API_KEY: '%%SEMANTIC_SCHOLAR_API_KEY%%',
    API_BASE_URL: 'https://api.semanticscholar.org/graph/v1',

    // N8N Webhook
    N8N_PDF_ENDPOINT: '%%N8N_PDF_ENDPOINT%%',

    // App settings
    RESULTS_PER_PAGE: 10
};
