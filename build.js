#!/usr/bin/env node
/**
 * Build script para Railway
 * Injeta variáveis de ambiente no config.js durante o deploy
 */

const fs = require('fs');
const path = require('path');

// Lê o template de configuração
const templatePath = path.join(__dirname, 'config.railway.js');
const outputPath = path.join(__dirname, 'config.js');

// Verifica se existe o template
if (!fs.existsSync(templatePath)) {
    console.error('❌ config.railway.js não encontrado!');
    process.exit(1);
}

let configContent = fs.readFileSync(templatePath, 'utf8');

// Substitui os placeholders pelas variáveis de ambiente
const replacements = {
    '%%SEMANTIC_SCHOLAR_API_KEY%%': process.env.SEMANTIC_SCHOLAR_API_KEY || '',
    '%%N8N_PDF_ENDPOINT%%': process.env.N8N_PDF_ENDPOINT || ''
};

for (const [placeholder, value] of Object.entries(replacements)) {
    if (!value) {
        console.warn(`⚠️  Variável de ambiente não encontrada para: ${placeholder}`);
    }
    configContent = configContent.replace(placeholder, value);
}

// Escreve o config.js final
fs.writeFileSync(outputPath, configContent);
console.log('✅ config.js gerado com sucesso!');

// Validação
const missingVars = Object.entries(replacements)
    .filter(([_, v]) => !v)
    .map(([k]) => k.replace(/%%/g, ''));

if (missingVars.length > 0) {
    console.warn(`⚠️  Variáveis faltando: ${missingVars.join(', ')}`);
}
