# Implementação de Busca Semântica com SPECTER2 Embeddings

## Objetivo

Implementar ordenação de resultados por **compatibilidade semântica** (fitting) utilizando embeddings SPECTER2 da API Semantic Scholar e cálculo de similaridade por cosine similarity.

---

## Referências Oficiais

### Documentação da API
- **Swagger/OpenAPI**: `swagger.yaml` (local) - linhas 620-625, 805-810
- **Repositório Oficial**: [allenai/s2-folks](https://github.com/allenai/s2-folks)
- **FAQ**: [s2-folks/FAQ.md](https://github.com/allenai/s2-folks/blob/main/FAQ.md)
- **API Docs**: [api.semanticscholar.org/api-docs](https://api.semanticscholar.org/api-docs/)

### Modelos de Embedding
- **SPECTER v1**: [github.com/allenai/specter](https://github.com/allenai/specter)
- **SPECTER v2**: [huggingface.co/allenai/specter2](https://huggingface.co/allenai/specter2)

---

## Conceito Técnico

### O que são Embeddings SPECTER?

SPECTER (Scientific Paper Embeddings using Citation-informed TransformERs) são representações vetoriais de documentos científicos que capturam seu significado semântico. Papers similares ficam próximos no espaço vetorial.

```
Query: "machine learning healthcare" 
     ↓ (gera embedding)
Vector: [0.23, -0.45, 0.12, ..., 0.78] (768 dimensões)
     ↓ (compara com embeddings dos papers)
Papers ordenados por similaridade de cosseno
```

### Cosine Similarity

Métrica que mede o ângulo entre dois vetores:
- **1.0** = Documentos idênticos/muito similares
- **0.0** = Documentos não relacionados
- **-1.0** = Documentos opostos (raro em texto)

---

## Arquitetura Proposta

```
┌──────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                  │
│  ┌─────────┐    ┌─────────────┐    ┌─────────────────────────┐   │
│  │  Input  │───▶│   Query     │───▶│  Exibe resultados       │   │
│  │  Busca  │    │  Embedding  │    │  ordenados por score    │   │
│  └─────────┘    └─────────────┘    └─────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                       BACKEND (Node.js)                           │
│  ┌─────────────────┐    ┌────────────────┐    ┌───────────────┐  │
│  │ 1. Gerar embed  │───▶│ 2. Buscar      │───▶│ 3. Calcular   │  │
│  │    da query     │    │    papers      │    │    cosine     │  │
│  │  (SPECTER API)  │    │  (com embeds)  │    │  similarity   │  │
│  └─────────────────┘    └────────────────┘    └───────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                    SEMANTIC SCHOLAR API                           │
│  • POST /paper/batch (com fields=embedding.specter_v2)           │
│  • Retorna vetores de 768 dimensões para cada paper              │
└──────────────────────────────────────────────────────────────────┘
```

---

## Endpoints da API Utilizados

### 1. Buscar Papers com Embeddings

**Endpoint**: `GET /paper/search`

```bash
curl "https://api.semanticscholar.org/graph/v1/paper/search?query=machine+learning&limit=10&fields=title,abstract,embedding.specter_v2" \
  -H "x-api-key: YOUR_API_KEY"
```

**Resposta**:
```json
{
  "data": [
    {
      "paperId": "abc123",
      "title": "Deep Learning for Healthcare",
      "abstract": "...",
      "embedding": {
        "model": "specter2@v0.0.1",
        "vector": [0.123, -0.456, 0.789, ...]  // 768 floats
      }
    }
  ]
}
```

> **Referência swagger.yaml**: linhas 805-810
> ```yaml
> embedding - Vector embedding of paper content. Use an optional suffix:
>   - embedding.specter_v1 (default)
>   - embedding.specter_v2 from SPECTER2
> ```

### 2. Gerar Embedding da Query

**Opção A**: Usar API pública do SPECTER
- URL: `https://model-apis.semanticscholar.org/specter/v1/invoke`
- Método: POST
- Body: `{"title": "query text", "abstract": ""}`

**Opção B**: Usar modelo local (HuggingFace)
```python
from transformers import AutoTokenizer, AutoModel
tokenizer = AutoTokenizer.from_pretrained('allenai/specter2')
model = AutoModel.from_pretrained('allenai/specter2')
```

**Opção C**: Buscar um paper similar e usar seu embedding como referência

---

## Implementação Passo a Passo

### Passo 1: Modificar a Busca para Incluir Embeddings

```javascript
// app.js - Adicionar embedding.specter_v2 aos fields
const fields = [
    'paperId',
    'title',
    'abstract',
    'authors',
    'year',
    'citationCount',
    'embedding.specter_v2'  // NOVO
].join(',');
```

### Passo 2: Criar Função de Cosine Similarity

```javascript
function cosineSimilarity(vectorA, vectorB) {
    if (!vectorA || !vectorB || vectorA.length !== vectorB.length) {
        return 0;
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vectorA.length; i++) {
        dotProduct += vectorA[i] * vectorB[i];
        normA += vectorA[i] * vectorA[i];
        normB += vectorB[i] * vectorB[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (normA * normB);
}
```

### Passo 3: Gerar Embedding da Query

```javascript
async function getQueryEmbedding(queryText) {
    const response = await fetch('https://model-apis.semanticscholar.org/specter/v1/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{
            paper_id: 'query',
            title: queryText,
            abstract: ''
        }])
    });
    
    const data = await response.json();
    return data.preds[0];  // Vetor de 768 dimensões
}
```

### Passo 4: Ordenar Resultados por Similaridade

```javascript
async function searchWithSemanticRanking(query) {
    // 1. Buscar papers com embeddings
    const papers = await fetchPapersWithEmbeddings(query);
    
    // 2. Gerar embedding da query
    const queryEmbedding = await getQueryEmbedding(query);
    
    // 3. Calcular similaridade para cada paper
    const rankedPapers = papers.map(paper => ({
        ...paper,
        semanticScore: paper.embedding?.vector 
            ? cosineSimilarity(queryEmbedding, paper.embedding.vector)
            : 0
    }));
    
    // 4. Ordenar por score decrescente
    rankedPapers.sort((a, b) => b.semanticScore - a.semanticScore);
    
    return rankedPapers;
}
```

---

## Limitações e Considerações

### Limitações da API

1. **Rate Limiting**: API pública tem limite de 1 req/seg (autenticada)
2. **Tamanho do Embedding**: 768 floats por paper (~6KB cada)
3. **Nem todos os papers têm embedding**: Alguns podem retornar `null`

### Performance

| Aspecto | Impacto |
|---------|---------|
| Payload maior | +6KB por paper (embedding) |
| Processamento | O(n) para calcular N similaridades |
| Latência | +1 request para gerar embedding da query |

### Fallback

Se o embedding não estiver disponível para um paper, usar `citationCount` como critério secundário de ordenação.

---

## Verificação e Testes

### Teste Manual

1. Buscar "machine learning" com embeddings
2. Verificar se papers sobre ML aparecem com score > 0.7
3. Comparar ordem com busca sem embeddings

### Teste Automatizado

```javascript
describe('Semantic Search', () => {
    it('should return higher score for related papers', async () => {
        const query = 'neural network deep learning';
        const results = await searchWithSemanticRanking(query);
        
        // Primeiro resultado deve ter score alto
        expect(results[0].semanticScore).toBeGreaterThan(0.5);
        
        // Resultados devem estar ordenados
        for (let i = 1; i < results.length; i++) {
            expect(results[i-1].semanticScore).toBeGreaterThanOrEqual(results[i].semanticScore);
        }
    });
});
```

---

## Referências Adicionais

- [Blog: Building a Better Search Engine for Semantic Scholar](https://medium.com/ai2-blog/building-a-better-search-engine-for-semantic-scholar-ea23a0b661e7)
- [Paper: SPECTER - Document-level Representation Learning](https://arxiv.org/abs/2004.07180)
- [Paper: SPECTER2 - Improved Scientific Embeddings](https://huggingface.co/papers/2211.13308)
- [SciDocs Benchmark](https://github.com/allenai/scidocs)

---

## Status da Implementação

> **Implementado em 31/01/2026** usando estratégia "Proxy Embedding" (frontend-only)

1. [x] ~~Implementar endpoint backend para gerar embedding da query~~ → Usamos Proxy Embedding (1º paper como referência)
2. [x] Modificar `app.js` para solicitar embeddings (`embedding.specter_v2`)
3. [x] Implementar função `cosineSimilarity` no frontend
4. [x] Adicionar UI para exibir score de relevância (badge 🎯)
5. [x] Implementar fallback para papers sem embedding
6. [x] Testar com queries em português e inglês
7. [x] Avaliar performance e otimizar se necessário

