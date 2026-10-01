const admin = require("firebase-admin");
const { resolveTargetUid } = require("./helpers");
const { sendMail, renderEmail } = require("../../shared/services/mailer");
const db = admin.firestore();

// Estados de uma hora extra manual (registo-ponto/{uid}/HorasExtraManual/{id}):
//   pendente -> aprovada | rejeitada
// Todo o registo novo do colaborador fica "pendente" (ver registerManualOvertime) e só a
// GestorRH (ou SuperAdmin, ver requireAdminOrHR nas rotas) o decide. Registos antigos,
// criados antes de existir aprovação, não têm "estado" e contam como "aprovada" - eram
// considerados válidos até aqui e já podem ter sido usados em compensações.
const ESTADOS_HORA_EXTRA = { PENDENTE: "pendente", APROVADA: "aprovada", REJEITADA: "rejeitada" };

function estadoHoraExtra(data) {
  return data?.estado || ESTADOS_HORA_EXTRA.APROVADA;
}

// Só as horas extra aprovadas contam para totais e saldo anual (ver
// computeAnnualOvertimeBalance/getOvertimeSummary em reportsController.js).
function isHoraExtraAprovada(data) {
  return estadoHoraExtra(data) === ESTADOS_HORA_EXTRA.APROVADA;
}

// Campos de aprovação devolvidos ao frontend junto de cada registo (tabela de ponto,
// tooltip e lista de pendentes) - Timestamps convertidos em ISO.
function camposAprovacao(data) {
  const iso = (ts) => (ts && typeof ts.toDate === "function" ? ts.toDate().toISOString() : null);
  return {
    estado: estadoHoraExtra(data),
    createdAt: iso(data.createdAt),
    approvedAt: iso(data.approvedAt),
    approvedByNome: data.approvedByNome || null,
    rejectedAt: iso(data.rejectedAt),
    rejectedByNome: data.rejectedByNome || null,
    motivoRejeicao: data.motivoRejeicao || null,
  };
}

const formatarMinutos = (min) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

// Utilizadores com nível de acesso GestorRH (mesmo valor "GestorRH" usado em
// NIVEIS_ACESSO/usersController.js e isGestorRH em shared/middleware/auth.js - nunca um
// email fixo) e com email, excluindo quem fez o pedido (uma GestorRH não se notifica a
// si mesma). Partilhado com as compensações (compensationApprovalController.js).
async function listarGestoresRHParaNotificar(excluirUid) {
  const snapshot = await db.collection("users").where("nivelAcesso", "==", "GestorRH").get();
  return snapshot.docs
    .filter((d) => d.id !== excluirUid)
    .map((d) => d.data())
    .filter((u) => !!u.email);
}

// Envia o mesmo email (template hbs) a cada destinatário; nunca lança - falhas só no log.
async function enviarEmailGestoresRH({ destinatarios, subject, template, dados, entidade, contexto }) {
  const resultados = await Promise.allSettled(destinatarios.map((u) => sendMail({
    to: u.email,
    subject,
    html: renderEmail(template, { ...dados, nome: u.nome || "" }),
    entidade,
  })));
  resultados.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(`Erro ao notificar GestorRH (${destinatarios[i].email}) - ${contexto}:`, r.reason);
    }
  });
}

// Campos gravados ao aprovar/rejeitar um pedido (hora extra ou compensação).
function camposDecisao(req, novoEstado, motivoRejeicao) {
  const decisorNome = req.userData?.nome || req.user.email || req.user.uid;
  const agora = admin.firestore.FieldValue.serverTimestamp();
  return novoEstado === ESTADOS_HORA_EXTRA.APROVADA
    ? { estado: novoEstado, approvedAt: agora, approvedBy: req.user.uid, approvedByNome: decisorNome }
    : {
        estado: novoEstado,
        rejectedAt: agora,
        rejectedBy: req.user.uid,
        rejectedByNome: decisorNome,
        motivoRejeicao: (motivoRejeicao || "").trim() || null,
      };
}

// Avisa por email todos os utilizadores com nível de acesso GestorRH (mesmo valor
// "GestorRH" usado em NIVEIS_ACESSO/usersController.js e isGestorRH em
// shared/middleware/auth.js - nunca um email fixo) de que foi registada uma nova hora
// extra pendente de aprovação. Nunca lança: o registo já está gravado quando isto é
// chamado (ver registerManualOvertime), uma falha de envio só fica no log.
async function notificarGestoresRHHoraExtra({ uid, colaboradorNome, entidade, registo }) {
  try {
    const destinatarios = await listarGestoresRHParaNotificar(uid);
    if (destinatarios.length === 0) {
      console.warn(`[horas extra] Nenhuma GestorRH com email para notificar da hora extra de ${uid}`);
      return;
    }

    const [dd, mm, yyyy] = registo.date.split("-");
    const dados = {
      colaboradorNome: colaboradorNome || "um colaborador",
      data: `${dd}/${mm}/${yyyy}`,
      horario: registo.startHour && registo.endHour ? `${registo.startHour} – ${registo.endHour}` : "-",
      total: formatarMinutos(registo.totalMinutes),
      motivo: registo.description || "Sem descrição",
      link: `https://magnaiso9001.comenius.pt/ponto/user-details/${uid}`,
      eyebrow: "Hora Extra",
    };

    await enviarEmailGestoresRH({
      destinatarios,
      subject: `Nova hora extra pendente de aprovação - ${dados.colaboradorNome} (${dados.data})`,
      template: "hora-extra-nova",
      dados,
      entidade,
      contexto: `hora extra de ${uid}`,
    });
  } catch (error) {
    console.error(`Erro ao notificar GestorRH da hora extra de ${uid}:`, error);
  }
}

function serializarHoraExtra(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    date: data.date,
    startHour: data.startHour || "",
    endHour: data.endHour || "",
    totalMinutes: data.totalMinutes || 0,
    description: data.description || "",
    ...camposAprovacao(data),
  };
}

// Horas extra pendentes de um colaborador (detalhe do colaborador em /ponto/user-details,
// ver userStats.jsx) - mesmo padrão de getPendingTimeEdits.
const getPendingManualOvertime = async (req, res) => {
  try {
    const { uid: userId, error: authError } = await resolveTargetUid(req);
    if (authError) return res.status(403).json({ error: authError });

    const snapshot = await db.collection("registo-ponto").doc(userId).collection("HorasExtraManual")
      .where("estado", "==", ESTADOS_HORA_EXTRA.PENDENTE)
      .get();
    const pendentes = snapshot.docs.map(serializarHoraExtra);
    // "date" é DD-MM-YYYY - ordenar cronologicamente pela data invertida.
    const chave = (p) => p.date.split("-").reverse().join("") + p.startHour;
    pendentes.sort((a, b) => chave(a).localeCompare(chave(b)));

    return res.status(200).json({ pendentes });
  } catch (error) {
    console.error("Erro ao buscar horas extra pendentes:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Aprova ou rejeita uma hora extra pendente. Só GestorRH/SuperAdmin chegam aqui (ver
// requireAdminOrHR em timeTrackingRoutes.js) e nunca sobre a própria hora extra.
function decidirHoraExtra(novoEstado) {
  return async (req, res) => {
    try {
      const { uid, overtimeId, motivoRejeicao } = req.body;
      if (!uid || !overtimeId) {
        return res.status(400).json({ error: "Campos obrigatórios: uid, overtimeId" });
      }
      if (uid === req.user.uid) {
        return res.status(403).json({ error: "Não é possível aprovar ou rejeitar a própria hora extra" });
      }

      const ref = db.collection("registo-ponto").doc(uid).collection("HorasExtraManual").doc(overtimeId);
      const doc = await ref.get();
      if (!doc.exists) {
        return res.status(404).json({ error: "Registo de hora extra não encontrado" });
      }
      if (estadoHoraExtra(doc.data()) !== ESTADOS_HORA_EXTRA.PENDENTE) {
        return res.status(409).json({ error: "Esta hora extra já não está pendente de aprovação" });
      }

      await ref.update(camposDecisao(req, novoEstado, motivoRejeicao));

      return res.status(200).json({
        message: novoEstado === ESTADOS_HORA_EXTRA.APROVADA ? "Hora extra aprovada" : "Hora extra rejeitada",
        estado: novoEstado,
      });
    } catch (error) {
      console.error(`Erro ao decidir hora extra (${novoEstado}):`, error);
      return res.status(500).json({ error: error.message });
    }
  };
}

const approveManualOvertime = decidirHoraExtra(ESTADOS_HORA_EXTRA.APROVADA);
const rejectManualOvertime = decidirHoraExtra(ESTADOS_HORA_EXTRA.REJEITADA);

// Contagem de horas extra pendentes por colaborador - aviso na lista de colaboradores de
// /ponto/entidades (mesmo padrão e mesmo fallback de getUidsComAjustesPendentes: a query
// precisa do índice collection group de HorasExtraManual.estado; sem ele o Firestore
// responde FAILED_PRECONDITION e lê-se a collection group inteira).
const FAILED_PRECONDITION = 9;
const getUidsComHorasExtraPendentes = async (req, res) => {
  try {
    let snapshot;
    try {
      snapshot = await db.collectionGroup("HorasExtraManual").where("estado", "==", ESTADOS_HORA_EXTRA.PENDENTE).get();
    } catch (queryError) {
      if (queryError.code !== FAILED_PRECONDITION) throw queryError;
      console.warn("[getUidsComHorasExtraPendentes] Índice collection group de HorasExtraManual.estado em falta - a usar leitura completa:", queryError.message);
      snapshot = await db.collectionGroup("HorasExtraManual").get();
    }
    const contagemPorUid = {};
    snapshot.forEach((doc) => {
      if (estadoHoraExtra(doc.data()) !== ESTADOS_HORA_EXTRA.PENDENTE) return;
      if (doc.ref.parent.parent?.parent?.id !== "registo-ponto") return;
      const uid = doc.ref.parent.parent.id;
      contagemPorUid[uid] = (contagemPorUid[uid] || 0) + 1;
    });
    return res.status(200).json({ contagemPorUid });
  } catch (error) {
    console.error("Erro ao contar horas extra pendentes:", error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  ESTADOS_HORA_EXTRA,
  formatarMinutos,
  listarGestoresRHParaNotificar,
  enviarEmailGestoresRH,
  camposDecisao,
  estadoHoraExtra,
  isHoraExtraAprovada,
  camposAprovacao,
  notificarGestoresRHHoraExtra,
  getPendingManualOvertime,
  approveManualOvertime,
  rejectManualOvertime,
  getUidsComHorasExtraPendentes,
};
