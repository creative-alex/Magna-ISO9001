const db = require("../../shared/db/firebase").db;
const { isAdminOrHR } = require("../../shared/middleware/auth");

// Uma única conversa por colaborador, partilhada por todos os GestorRH/SuperAdmin
// (caixa de entrada tipo suporte, não é 1-para-1 com um gestor específico)
// conversas/{colaboradorId} + subcoleção conversas/{colaboradorId}/mensagens.
function canAccessConversa(req, colaboradorId) {
  return req.user?.uid === colaboradorId || isAdminOrHR(req.user?.nivelAcesso);
}

function serializeMensagem(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    autorId: data.autorId,
    autorNome: data.autorNome,
    autorTipo: data.autorTipo,
    texto: data.texto,
    criadoEm: data.criadoEm ? data.criadoEm.toDate().toISOString() : null,
  };
}

const getConversas = async (req, res) => {
  try {
    const snapshot = await db.collection("conversas").orderBy("lastMessageAt", "desc").get();
    const conversas = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        colaboradorId: doc.id,
        colaboradorNome: data.colaboradorNome || "",
        lastMessage: data.lastMessage || "",
        lastMessageAt: data.lastMessageAt ? data.lastMessageAt.toDate().toISOString() : null,
        unreadForGestor: !!data.unreadForGestor,
      };
    });
    res.json({ conversas });
  } catch (error) {
    console.error("Erro ao listar conversas:", error);
    res.status(500).json({ error: "Erro ao listar conversas" });
  }
};

const getMensagens = async (req, res) => {
  try {
    const { colaboradorId } = req.params;
    if (!canAccessConversa(req, colaboradorId)) {
      return res.status(403).json({ error: "Sem permissão para consultar esta conversa" });
    }

    const snapshot = await db.collection("conversas").doc(colaboradorId)
      .collection("mensagens").orderBy("criadoEm", "asc").limitToLast(200).get();

    res.json({ mensagens: snapshot.docs.map(serializeMensagem) });
  } catch (error) {
    console.error("Erro ao buscar mensagens:", error);
    res.status(500).json({ error: "Erro ao buscar mensagens" });
  }
};

const marcarLida = async (req, res) => {
  try {
    const { colaboradorId } = req.params;
    if (!canAccessConversa(req, colaboradorId)) {
      return res.status(403).json({ error: "Sem permissão para atualizar esta conversa" });
    }

    const isGestor = isAdminOrHR(req.user?.nivelAcesso);
    const field = isGestor ? "unreadForGestor" : "unreadForColaborador";

    const conversaRef = db.collection("conversas").doc(colaboradorId);
    const conversaDoc = await conversaRef.get();
    if (conversaDoc.exists) {
      await conversaRef.update({ [field]: false });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error("Erro ao marcar conversa como lida:", error);
    res.status(500).json({ error: "Erro ao marcar conversa como lida" });
  }
};

module.exports = { getConversas, getMensagens, marcarLida, canAccessConversa };
