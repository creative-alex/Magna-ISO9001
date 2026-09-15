const admin = require("firebase-admin");
const { resolveTargetUid } = require("./helpers");
const { isMonthClosed, refreshFechoMensalSnapshotIfClosed, MENSAGEM_MES_FECHADO } = require("../../shared/lib/monthLock");
const { isWeekendOrHolidayDDMM } = require("./holidays");
const db = admin.firestore();

// Formato aceite: "DD-MM-YYYY" (mesmo formato usado em Ferias/BaixasMedicas).
function parseDataCompleta(date) {
  if (!date || typeof date !== "string") return null;
  const parts = date.split("-");
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts.map(Number);
  if (!dd || !mm || !yyyy) return null;
  const dataObj = new Date(yyyy, mm - 1, dd);
  if (dataObj.getDate() !== dd || dataObj.getMonth() !== mm - 1 || dataObj.getFullYear() !== yyyy) return null;
  return { dd, mm, yyyy, dataObj };
}

function isHoraValida(valor) {
  if (!valor) return false;
  const [h, m] = valor.split(":").map(Number);
  return Number.isInteger(h) && Number.isInteger(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

function registoIdFor(dd, mm, yyyy) {
  return `registo_${String(dd).padStart(2, "0")}${String(mm).padStart(2, "0")}${yyyy}`;
}

// Aplica de facto as horas pedidas ao registo oficial do dia (Registos/{registoId}),
// tal como updateUserTime, mas podendo mexer nos dois campos de uma só vez.
async function applyTimeEdit(userId, dd, mm, yyyy, horaEntrada, horaSaida) {
  const registoRef = db.collection("registo-ponto").doc(userId).collection("Registos").doc(registoIdFor(dd, mm, yyyy));
  const updateData = { timestamp: new Date(yyyy, mm - 1, dd) };
  if (horaEntrada) updateData.horaEntrada = horaEntrada;
  if (horaSaida) updateData.horaSaida = horaSaida;
  await registoRef.set(updateData, { merge: true });
}

// Pedido de alteração das horas de um dia passado: um colaborador comum fica sempre
// pendente de aprovação (nunca se confia num "Approved" vindo do cliente); um
// admin/GestorRH/Administrador a editar em nome de outro colaborador aplica-se de
// imediato  -  mesmo padrão de createVacation/createMedicalLeave em vacationController.js.
const requestTimeEdit = async (req, res) => {
  try {
    const { date, horaEntrada, horaSaida, justificativa } = req.body;

    const parsed = parseDataCompleta(date);
    if (!parsed) {
      return res.status(400).json({ error: "Data inválida. Usa o formato DD-MM-YYYY" });
    }

    if (!horaEntrada && !horaSaida) {
      return res.status(400).json({ error: "Indica pelo menos uma hora (entrada ou saída) para alterar" });
    }
    if ((horaEntrada && !isHoraValida(horaEntrada)) || (horaSaida && !isHoraValida(horaSaida))) {
      return res.status(400).json({ error: "Hora inválida fornecida" });
    }
    if (!justificativa || !justificativa.trim()) {
      return res.status(400).json({ error: "É obrigatório indicar uma justificação" });
    }

    const { dd, mm, yyyy, dataObj } = parsed;
    const agora = new Date();
    const hoje = new Date(agora);
    hoje.setHours(0, 0, 0, 0);
    // O servidor pode correr num fuso horário diferente do colaborador (ex.: servidor
    // em UTC, colaborador em Portugal)  -  tolera-se até 1 dia de desvio para o que
    // conta como "não é no futuro", para não rejeitar "hoje" à volta da meia-noite.
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    if (dataObj > amanha) {
      return res.status(400).json({ error: "Só é possível pedir alteração de hoje ou de dias passados" });
    }

    // A validação "a hora ainda não passou" só se aplica quando o servidor também
    // considera que a data pedida é hoje  -  com o desvio de fuso acima, fora desse
    // caso confia-se na validação já feita do lado do cliente.
    if (dataObj.getTime() === hoje.getTime()) {
      const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
      const paraMinutos = (hhmm) => {
        const [h, m] = hhmm.split(":").map(Number);
        return h * 60 + m;
      };
      if (horaEntrada && paraMinutos(horaEntrada) > minutosAgora) {
        return res.status(400).json({ error: "A hora de entrada ainda não passou" });
      }
      if (horaSaida && paraMinutos(horaSaida) > minutosAgora) {
        return res.status(400).json({ error: "A hora de saída ainda não passou" });
      }
    }

    const { uid: userId, error: authError } = await resolveTargetUid(req);
    if (authError) return res.status(403).json({ error: authError });

    // Não faz sentido pedir alteração de horas num dia em que não se esperava
    // trabalho (fim de semana ou feriado nacional/municipal da sede do colaborador)
    // -  mesma regra usada no mapa de férias e na baixa médica (ver holidays.js).
    const userDoc = await db.collection("users").doc(userId).get();
    const sede = userDoc.exists ? userDoc.data().sede : null;
    if (isWeekendOrHolidayDDMM(dd, mm, yyyy, sede)) {
      return res.status(400).json({ error: "Não é possível pedir alteração de horas num fim de semana ou feriado" });
    }

    // Um admin/GestorRH/Administrador a editar em nome de outro colaborador fica logo
    // aprovado; um pedido próprio fica sempre pendente.
    const Approved = userId !== req.user.uid;

    // O próprio colaborador não pode pedir alteração de horas num mês já fechado (ver
    // api/shared/lib/monthLock.js); um admin/RH continua a poder, como correção.
    if (!Approved && await isMonthClosed(userId, `${String(dd).padStart(2, "0")}-${String(mm).padStart(2, "0")}-${yyyy}`)) {
      return res.status(403).json({ error: MENSAGEM_MES_FECHADO });
    }

    const ajusteRef = db.collection("registo-ponto").doc(userId).collection("AjustesPendentes").doc(registoIdFor(dd, mm, yyyy));

    await ajusteRef.set({
      date: `${String(dd).padStart(2, "0")}-${String(mm).padStart(2, "0")}-${yyyy}`,
      horaEntrada: horaEntrada || null,
      horaSaida: horaSaida || null,
      justificativa: justificativa.trim(),
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      Approved,
      ...(Approved ? {
        approvedAt: admin.firestore.FieldValue.serverTimestamp(),
        approvedBy: req.user.uid,
      } : {}),
    });

    if (Approved) {
      await applyTimeEdit(userId, dd, mm, yyyy, horaEntrada, horaSaida);
      await refreshFechoMensalSnapshotIfClosed(userId, `${String(dd).padStart(2, "0")}-${String(mm).padStart(2, "0")}-${yyyy}`, req.user.uid);
    }

    return res.status(201).json({
      message: Approved ? "Horário atualizado com sucesso" : "Pedido de alteração enviado! Aguarda aprovação.",
      Approved,
    });
  } catch (error) {
    console.error("Erro ao pedir alteração de horas:", error);
    return res.status(500).json({ error: error.message });
  }
};

const getPendingTimeEdits = async (req, res) => {
  try {
    const { uid: userId, error: authError } = await resolveTargetUid(req);
    if (authError) return res.status(403).json({ error: authError });

    const snapshot = await db.collection("registo-ponto").doc(userId).collection("AjustesPendentes").get();
    const pendentes = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.Approved === false) {
        pendentes.push({
          date: data.date,
          horaEntrada: data.horaEntrada,
          horaSaida: data.horaSaida,
          justificativa: data.justificativa,
        });
      }
    });

    return res.status(200).json({ pendentes });
  } catch (error) {
    console.error("Erro ao buscar pedidos de alteração de horas:", error);
    return res.status(500).json({ error: error.message });
  }
};

const approveTimeEdit = async (req, res) => {
  try {
    const { date } = req.body;
    const parsed = parseDataCompleta(date);
    if (!parsed) return res.status(400).json({ error: "Data inválida" });

    const { uid: userId, error: authError } = await resolveTargetUid(req);
    if (authError) return res.status(403).json({ error: authError });

    const { dd, mm, yyyy } = parsed;

    // resolveTargetUid resolve para o próprio quando não é indicado "uid"  -  sem esta
    // verificação, um colaborador comum conseguiria auto-aprovar o próprio pedido pendente
    // num mês já fechado (ver api/shared/lib/monthLock.js). Um admin/RH continua a poder.
    if (userId === req.user.uid && await isMonthClosed(userId, `${String(dd).padStart(2, "0")}-${String(mm).padStart(2, "0")}-${yyyy}`)) {
      return res.status(403).json({ error: MENSAGEM_MES_FECHADO });
    }

    const ajusteRef = db.collection("registo-ponto").doc(userId).collection("AjustesPendentes").doc(registoIdFor(dd, mm, yyyy));
    const ajusteDoc = await ajusteRef.get();
    if (!ajusteDoc.exists) {
      return res.status(404).json({ error: "Pedido de alteração não encontrado" });
    }

    const ajuste = ajusteDoc.data();
    await applyTimeEdit(userId, dd, mm, yyyy, ajuste.horaEntrada, ajuste.horaSaida);
    await ajusteRef.update({
      Approved: true,
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      approvedBy: req.user.uid,
    });
    await refreshFechoMensalSnapshotIfClosed(userId, `${String(dd).padStart(2, "0")}-${String(mm).padStart(2, "0")}-${yyyy}`, req.user.uid);

    return res.status(200).json({ message: "Alteração de horas aprovada com sucesso" });
  } catch (error) {
    console.error("Erro ao aprovar alteração de horas:", error);
    return res.status(500).json({ error: error.message });
  }
};

const rejectTimeEdit = async (req, res) => {
  try {
    const { date } = req.body;
    const parsed = parseDataCompleta(date);
    if (!parsed) return res.status(400).json({ error: "Data inválida" });

    const { uid: userId, error: authError } = await resolveTargetUid(req);
    if (authError) return res.status(403).json({ error: authError });

    const { dd, mm, yyyy } = parsed;
    const ajusteRef = db.collection("registo-ponto").doc(userId).collection("AjustesPendentes").doc(registoIdFor(dd, mm, yyyy));
    const ajusteDoc = await ajusteRef.get();
    if (!ajusteDoc.exists) {
      return res.status(404).json({ error: "Pedido de alteração não encontrado" });
    }

    await ajusteRef.delete();
    return res.status(200).json({ message: "Pedido de alteração rejeitado" });
  } catch (error) {
    console.error("Erro ao rejeitar alteração de horas:", error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  requestTimeEdit,
  getPendingTimeEdits,
  approveTimeEdit,
  rejectTimeEdit,
};
