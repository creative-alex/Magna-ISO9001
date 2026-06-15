const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `És um assistente especializado em ISO 9001 e gestão de qualidade, integrado numa plataforma de gestão documental chamada Magna.

A plataforma permite:
- Gerir ficheiros e documentos PDF organizados em pastas
- Controlar permissões de acesso por utilizador
- Registar e consultar histórico de processos
- Fazer upload e download de documentos

Responde SEMPRE em português europeu de Portugal (pt-PT), nunca em português do Brasil. De forma clara e concisa.
Quando não souberes a resposta, diz honestamente que não tens essa informação.
Não inventes informação sobre a plataforma ou sobre normas ISO.`;

const PAGE_NAMES = {
  selectPdf: 'Lista de documentos',
  template: 'Editor de procedimento',
  createProcedure: 'Criar novo procedimento',
  createProcess: 'Criar novo processo',
  createUser: 'Gestão de utilizadores',
  firstLogin: 'Primeiro login / redefinir password',
};

function buildContextBlock(currentPage, pageContext) {
  const lines = [];

  if (currentPage) lines.push(`Página atual: ${PAGE_NAMES[currentPage] || currentPage}`);

  if (!pageContext) return lines.join('\n');

  if (pageContext.openFile) lines.push(`Ficheiro aberto: ${pageContext.openFile}`);
  if (pageContext.searchTerm) lines.push(`Pesquisa ativa: "${pageContext.searchTerm}"`);
  if (pageContext.userProcesses?.length) lines.push(`Processos do utilizador: ${pageContext.userProcesses.join(', ')}`);

  if (pageContext.documentTree?.length) {
    lines.push('Documentos visíveis:');
    pageContext.documentTree.forEach(entry => {
      if (entry.process) {
        const procs = entry.procedures?.length ? ` (${entry.procedures.join(', ')})` : '';
        lines.push(`  - ${entry.process}${procs}`);
      } else if (entry.file) {
        lines.push(`  - ${entry.file}`);
      }
    });
  }

  return lines.join('\n');
}

async function askAssistant(question, currentPage, pageContext) {
  const contextBlock = buildContextBlock(currentPage, pageContext);
  const userMessage = contextBlock
    ? `[Contexto]\n${contextBlock}\n\n[Pergunta]\n${question}`
    : question;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    temperature: 0.5,
    max_tokens: 512,
  });

  return completion.choices[0]?.message?.content ?? "Não foi possível obter resposta.";
}

module.exports = { askAssistant };
