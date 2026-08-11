const { askAssistant } = require("../services/ai-assistant/assistantService");

async function handleAssistantQuery(req, res) {
  const { question, username, currentPage, pageContext } = req.body;

  if (!question || !question.trim()) {
    return res.status(400).json({ error: "Pergunta em falta." });
  }

  try {
    const answer = await askAssistant(question.trim(), currentPage, pageContext);
    return res.json({ answer });
  } catch (err) {
    console.error("[Assistant] Erro ao chamar Groq:", err.message);
    return res.status(500).json({ error: "Erro ao contactar o assistente." });
  }
}

async function logQuestion(req, res) {
  const { question, username, currentPage, hasLocalAnswer, responseType, timestamp } = req.body;
  console.log(`[Assistant Log] ${timestamp} | user=${username} | page=${currentPage} | type=${responseType} | q="${question}"`);
  return res.json({ ok: true });
}

module.exports = { handleAssistantQuery, logQuestion };
