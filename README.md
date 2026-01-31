# Busca de Artigos Científicos 📚

Aplicação web para buscar artigos acadêmicos usando a API do [Semantic Scholar](https://www.semanticscholar.org/).

## Funcionalidades

- 🔍 Busca de artigos por palavras-chave
- 📄 Exibição de título, autores, resumo e citações
- 📥 Download de PDFs (quando disponíveis via Open Access)
- 🔎 Busca alternativa de PDFs via integração com n8n

## Setup Local

1. Clone o repositório:
```bash
git clone https://github.com/SEU_USUARIO/busca-artigos.git
cd busca-artigos
```

2. Copie o arquivo de configuração:
```bash
cp .env.example .env
```

3. Crie o arquivo `config.js` com suas credenciais:
```javascript
const CONFIG = {
    API_KEY: 'SUA_SEMANTIC_SCHOLAR_API_KEY',
    API_BASE_URL: 'https://api.semanticscholar.org/graph/v1',
    N8N_PDF_ENDPOINT: 'SEU_N8N_WEBHOOK_URL',
    RESULTS_PER_PAGE: 10
};
```

4. Abra `index.html` no navegador ou use um servidor local:
```bash
npx serve .
```

## Deploy no Railway

1. **Configure as variáveis de ambiente no Railway:**
   - `SEMANTIC_SCHOLAR_API_KEY` - Sua API key do Semantic Scholar
   - `N8N_PDF_ENDPOINT` - URL do webhook n8n para busca de PDFs

2. **Configure o build:**
   - Build Command: `npm run build`
   - Start Command: `npm start`

3. O Railway irá automaticamente:
   - Executar `npm run build` que injeta as variáveis no `config.js`
   - Servir os arquivos estáticos com `serve`

## Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `SEMANTIC_SCHOLAR_API_KEY` | API key do Semantic Scholar ([obter aqui](https://www.semanticscholar.org/product/api)) |
| `N8N_PDF_ENDPOINT` | URL do webhook n8n para busca de PDFs |

## Estrutura do Projeto

```
busca-artigos/
├── index.html          # Página principal
├── styles.css          # Estilos
├── app.js              # Lógica da aplicação
├── config.js           # Configurações locais (não commitado)
├── config.railway.js   # Template para Railway
├── build.js            # Script de build para injetar variáveis
├── package.json        # Dependências e scripts
├── .gitignore          # Arquivos ignorados pelo git
└── .env.example        # Exemplo de variáveis de ambiente
```

## Tecnologias

- HTML5 + CSS3 + JavaScript (Vanilla)
- [Semantic Scholar API](https://api.semanticscholar.org/)
- [Google Fonts - Inter](https://fonts.google.com/specimen/Inter)

## Licença

MIT
