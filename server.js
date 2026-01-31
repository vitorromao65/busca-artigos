const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Carregar configuração
let CONFIG = {};
try {
    const configContent = fs.readFileSync(path.join(__dirname, 'config.js'), 'utf8');
    // Extrair o objeto CONFIG do arquivo
    const match = configContent.match(/const CONFIG = ({[\s\S]*?});/);
    if (match) {
        CONFIG = eval('(' + match[1] + ')');
    }
} catch (error) {
    console.error('Erro ao carregar config.js:', error.message);
    process.exit(1);
}

const PORT = process.env.PORT || 3001;

// MIME types para servir arquivos estáticos
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.yaml': 'text/yaml'
};

// Função para fazer requisição HTTPS
function httpsRequest(options, postData) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });
        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
    });
}

// Servidor HTTP
const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const url = new URL(req.url, `http://localhost:${PORT}`);

    // ========================================
    // API Proxy: /api/embedding
    // ========================================
    if (url.pathname === '/api/embedding' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { query } = JSON.parse(body);

                if (!query) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Query is required' }));
                    return;
                }

                console.log(`[Proxy] Gerando embedding para: "${query}"`);

                const postData = JSON.stringify([{
                    paper_id: 'query',
                    title: query,
                    abstract: ''
                }]);

                const response = await httpsRequest({
                    hostname: 'model-apis.semanticscholar.org',
                    path: '/specter/v1/invoke',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': CONFIG.API_KEY,
                        'Content-Length': Buffer.byteLength(postData)
                    }
                }, postData);

                if (response.statusCode !== 200) {
                    console.error(`[Proxy] Erro na API SPECTER: ${response.statusCode}`);
                    res.writeHead(response.statusCode, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: `SPECTER API error: ${response.statusCode}` }));
                    return;
                }

                const data = JSON.parse(response.body);
                const embedding = data.preds?.[0]?.embedding;

                if (embedding) {
                    console.log(`[Proxy] Embedding gerado com ${embedding.length} dimensões`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ embedding }));
                } else {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'No embedding returned' }));
                }
            } catch (error) {
                console.error('[Proxy] Erro:', error.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }

    // ========================================
    // Servir arquivos estáticos
    // ========================================
    let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
    filePath = path.join(__dirname, filePath);

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    try {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
        } else {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Server Error');
        }
    }
});

server.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║  🚀 Servidor de Busca de Artigos                      ║
╠═══════════════════════════════════════════════════════╣
║  Local:    http://localhost:${PORT}                      ║
║  API Key:  ${CONFIG.API_KEY ? '✓ Configurada' : '✗ Não encontrada'}                        ║
╠═══════════════════════════════════════════════════════╣
║  Endpoints:                                           ║
║    GET  /              → Frontend                     ║
║    POST /api/embedding → Gerar embedding via SPECTER  ║
╚═══════════════════════════════════════════════════════╝
`);
});
