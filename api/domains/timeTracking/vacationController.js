const admin = require("firebase-admin");
const { resolveTargetUid } = require("./helpers");
const { isMonthClosed, refreshFechoMensalSnapshotIfClosed, MENSAGEM_MES_FECHADO } = require("../../shared/lib/monthLock");
const { isWeekendOrHolidayDDMM, pad2 } = require("./holidays");
const db = admin.firestore();

// Mesma regra de bloqueio usada no mapa de férias (ver getBlockedReason em
// vacationMapController.js) e nos pedidos de alteração de horas (ver
// timeEditRequestController.js), sem os "dias de dispensa" da empresa (24/31 dez)  -
// estar doente nesses dias é um facto médico, não uma escolha do colaborador.
const isWeekendOrHoliday = isWeekendOrHolidayDDMM;

// A partir do dia de início, avança dia a dia saltando fins de semana e feriados
// até reunir "count" dias úteis  -  é assim que um pedido de baixa médica de N dias
// úteis se traduz numa lista concreta de datas a marcar.
function computeBusinessDayDates(startDay, startMonth, startYear, count, sede) {
  const dates = [];
  const cursor = new Date(startYear, startMonth - 1, startDay);
  while (dates.length < count) {
    const day = cursor.getDate();
    const month = cursor.getMonth() + 1;
    const year = cursor.getFullYear();
    if (!isWeekendOrHoliday(day, month, year, sede)) {
      dates.push({ day, month, year });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

const createVacation = async (req, res) => {
  try {
    const { date, year } = req.body;

    if (!date) {
      return res.status(400).json({ error: "Falta o campo obrigatório: date" });
    }

    const { uid: userId, error: authError } = await resolveTargetUid(req);
    if (authError) return res.status(403).json({ error: authError });

    // Um admin a registar férias por um colaborador fica automaticamente
    // aprovado; um pedido próprio fica sempre pendente de aprovação  -  nunca
    // se confia num "Approved" vindo do cliente.
    const Approved = userId !== req.user.uid;

    const [day, month] = date.split("-");
    const selectedYear = year || new Date().getFullYear();
    const dataCompleta = `${day}-${month}-${selectedYear}`;

    // O próprio colaborador não pode marcar férias num mês já fechado (ver
    // api/shared/lib/monthLock.js); um admin/RH continua a poder, como correção.
    if (!Approved && await isMonthClosed(userId, dataCompleta)) {
      return res.status(403).json({ error: MENSAGEM_MES_FECHADO });
    }

    console.log("A registar férias para o user:", userId);

    const userDocRef = db.collection("registo-ponto").doc(userId);
    const registoId = `registo_${day}${month}${selectedYear}`;

    console.log("Gerado registoId:", registoId);

    await userDocRef.collection("Ferias").doc(registoId).set({
      date: dataCompleta,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      Approved
    });

    if (Approved) {
      await refreshFechoMensalSnapshotIfClosed(userId, dataCompleta, req.user.uid);
    }

    console.log("Férias registadas com sucesso no Firestore.");
    return res.status(201).json({ message: "Férias registadas com sucesso", registoId });
  } catch (error) {
    console.error("Erro ao registar férias:", error);
    return res.status(500).json({ error: error.message });
  }
};

const approveVacation = async (req, res) => {
  try {
    const { uid, date } = req.body;

    if (!uid || !date) {
      return res.status(400).json({ error: "Faltam campos obrigatórios: uid e/ou date" });
    }

    const userDocRef = db.collection("registo-ponto").doc(uid);

    const feriasSnapshot = await userDocRef.collection("Ferias")
      .where("date", "==", date)
      .get();

    if (feriasSnapshot.empty) {
      return res.status(404).json({ error: "Registo de férias não encontrado" });
    }

    const feriasDoc = feriasSnapshot.docs[0];
    await feriasDoc.ref.update({
      Approved: true,
      approvedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await refreshFechoMensalSnapshotIfClosed(uid, date, req.user.uid);

    console.log("Férias aprovadas com sucesso.");
    return res.status(200).json({ message: "Férias aprovadas com sucesso" });
  } catch (error) {
    console.error("Erro ao aprovar férias:", error);
    return res.status(500).json({ error: error.message });
  }
};

const rejectVacation = async (req, res) => {
  try {
    const { uid, date } = req.body;

    if (!uid || !date) {
      return res.status(400).json({ error: "Faltam campos obrigatórios: uid e/ou date" });
    }

    const userDocRef = db.collection("registo-ponto").doc(uid);

    const feriasSnapshot = await userDocRef.collection("Ferias")
      .where("date", "==", date)
      .get();

    if (feriasSnapshot.empty) {
      return res.status(404).json({ error: "Registo de férias não encontrado" });
    }

    const feriasDoc = feriasSnapshot.docs[0];
    await feriasDoc.ref.delete();

    console.log("Férias rejeitadas e eliminadas com sucesso.");
    return res.status(200).json({ message: "Férias rejeitadas e eliminadas com sucesso" });
  } catch (error) {
    console.error("Erro ao rejeitar férias:", error);
    return res.status(500).json({ error: error.message });
  }
};

const MAX_DIAS_UTEIS_BAIXA = 366;

// Pedido de baixa médica: em vez de um único dia, recebe um dia de início e um
// número de dias úteis (a contar sempre a partir da justificação em PDF anexada),
// e marca essa quantidade de dias úteis a partir daí, saltando automaticamente
// fins de semana e feriados (nunca marca nesses dias  -  ver isWeekendOrHoliday).
const createMedicalLeave = async (req, res) => {
  try {
    const { startDate, businessDays, pdfPath, year } = req.body;

    if (!startDate) {
      return res.status(400).json({ error: "Falta o campo obrigatório: startDate" });
    }

    const parsedDays = Number(businessDays);
    if (!Number.isInteger(parsedDays) || parsedDays < 1 || parsedDays > MAX_DIAS_UTEIS_BAIXA) {
      return res.status(400).json({ error: "Número de dias úteis inválido" });
    }

    if (!pdfPath) {
      return res.status(400).json({ error: "É obrigatório anexar o documento de justificação (PDF)" });
    }

    const { uid: userId, error: authError } = await resolveTargetUid(req);
    if (authError) return res.status(403).json({ error: authError });

    const Approved = userId !== req.user.uid;

    const [dayStr, monthStr, yearStr] = startDate.split("-");
    const startDay = parseInt(dayStr, 10);
    const startMonth = parseInt(monthStr, 10);
    const startYear = parseInt(yearStr, 10) || year || new Date().getFullYear();

    const userDoc = await db.collection("users").doc(userId).get();
    const sede = userDoc.exists ? userDoc.data().sede : null;

    if (isWeekendOrHoliday(startDay, startMonth, startYear, sede)) {
      return res.status(400).json({ error: "Não é possível marcar baixa médica com início num fim de semana ou feriado. Escolhe um dia útil." });
    }

    const dias = computeBusinessDayDates(startDay, startMonth, startYear, parsedDays, sede);
    const dataCompletas = dias.map(({ day, month, year: y }) => `${pad2(day)}-${pad2(month)}-${y}`);

    // O próprio colaborador não pode marcar baixa médica num mês já fechado (ver
    // api/shared/lib/monthLock.js); um admin/RH continua a poder, como correção.
    // Um representante (YYYY-MM -> data) chega para verificar cada mês uma única
    // vez, em vez de repetir a mesma leitura ao Firestore por cada dia do pedido.
    const representantesPorMes = new Map();
    dataCompletas.forEach((d) => representantesPorMes.set(`${d.slice(6)}-${d.slice(3, 5)}`, d));

    if (!Approved) {
      for (const dataCompleta of representantesPorMes.values()) {
        if (await isMonthClosed(userId, dataCompleta)) {
          return res.status(403).json({ error: MENSAGEM_MES_FECHADO });
        }
      }
    }

    console.log("A registar baixa médica para o user:", userId, "-", parsedDays, "dias úteis a partir de", startDate);

    const userDocRef = db.collection("registo-ponto").doc(userId);
    const requestId = userDocRef.collection("BaixasMedicas").doc().id;
    const batch = db.batch();

    dias.forEach(({ day, month, year: y }, index) => {
      const registoId = `registo_${pad2(day)}${pad2(month)}${y}`;
      batch.set(userDocRef.collection("BaixasMedicas").doc(registoId), {
        date: dataCompletas[index],
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        Approved,
        pdfPath,
        requestId,
        totalDiasUteis: parsedDays,
      });
    });

    await batch.commit();

    if (Approved) {
      for (const dataCompleta of representantesPorMes.values()) {
        await refreshFechoMensalSnapshotIfClosed(userId, dataCompleta, req.user.uid);
      }
    }

    console.log("Baixa médica registada com sucesso no Firestore:", dataCompletas.join(", "));
    return res.status(201).json({
      message: Approved ? "Baixa médica registada com sucesso" : "Pedido de baixa médica enviado! Aguarda aprovação.",
      dates: dataCompletas,
    });
  } catch (error) {
    console.error("Erro ao registar baixa médica:", error);
    return res.status(500).json({ error: error.message });
  }
};

// "DD-MM-YYYY" -> número ordenável (YYYYMMDD), para ordenar pedidos cronologicamente.
function dataParaOrdenacao(dataCompleta) {
  const [dd, mm, yyyy] = dataCompleta.split("-");
  return parseInt(`${yyyy}${mm}${dd}`, 10);
}

// Pedidos de baixa médica pendentes de um colaborador, agrupados por pedido
// (requestId)  -  um pedido de N dias úteis vira N documentos em BaixasMedicas
// (ver createMedicalLeave), por isso aqui juntam-se de novo num só item para o RH
// aprovar/rejeitar o pedido inteiro de uma vez, em vez de dia a dia. Registos
// antigos sem requestId (de antes desta funcionalidade existir) aparecem como um
// pedido de 1 dia, usando o próprio id do documento como chave.
const getPendingMedicalLeaves = async (req, res) => {
  try {
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({ error: "uid do colaborador é obrigatório" });
    }

    const baixasSnapshot = await db
      .collection("registo-ponto")
      .doc(uid)
      .collection("BaixasMedicas")
      .where("Approved", "==", false)
      .get();

    const porPedido = new Map();
    baixasSnapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.date) return;
      const key = data.requestId || doc.id;
      if (!porPedido.has(key)) {
        porPedido.set(key, {
          requestId: data.requestId || null,
          dates: [],
          pdfPath: data.pdfPath || null,
          totalDiasUteis: data.totalDiasUteis || null,
        });
      }
      porPedido.get(key).dates.push(data.date);
    });

    const baixasPendentes = Array.from(porPedido.values(), (pedido) => ({
      ...pedido,
      dates: pedido.dates.sort((a, b) => dataParaOrdenacao(a) - dataParaOrdenacao(b)),
    })).sort((a, b) => dataParaOrdenacao(a.dates[0]) - dataParaOrdenacao(b.dates[0]));

    return res.status(200).json({ baixasPendentes });
  } catch (error) {
    console.error("Erro ao buscar baixas médicas pendentes:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Aprova/rejeita um pedido inteiro de baixa médica (todos os dias com o mesmo
// requestId de uma vez); "date" continua aceite como alternativa para registos
// antigos sem requestId.
async function findBaixaMedicaDocs(uid, { requestId, date }) {
  const baixasRef = db.collection("registo-ponto").doc(uid).collection("BaixasMedicas");
  const snapshot = requestId
    ? await baixasRef.where("requestId", "==", requestId).get()
    : await baixasRef.where("date", "==", date).get();
  return snapshot.docs;
}

const approveMedicalLeave = async (req, res) => {
  try {
    const { uid, requestId, date } = req.body;

    if (!uid || (!requestId && !date)) {
      return res.status(400).json({ error: "Faltam campos obrigatórios: uid e requestId (ou date)" });
    }

    const docs = await findBaixaMedicaDocs(uid, { requestId, date });
    if (docs.length === 0) {
      return res.status(404).json({ error: "Pedido de baixa médica não encontrado" });
    }

    const batch = db.batch();
    const datasAprovadas = [];
    docs.forEach((doc) => {
      batch.update(doc.ref, {
        Approved: true,
        approvedAt: admin.firestore.FieldValue.serverTimestamp(),
        approvedBy: req.user.uid,
      });
      datasAprovadas.push(doc.data().date);
    });
    await batch.commit();

    const representantesPorMes = new Map();
    datasAprovadas.forEach((d) => representantesPorMes.set(`${d.slice(6)}-${d.slice(3, 5)}`, d));
    for (const dataCompleta of representantesPorMes.values()) {
      await refreshFechoMensalSnapshotIfClosed(uid, dataCompleta, req.user.uid);
    }

    console.log("Baixa médica aprovada com sucesso:", datasAprovadas.join(", "));
    return res.status(200).json({ message: "Baixa médica aprovada com sucesso" });
  } catch (error) {
    console.error("Erro ao aprovar baixa médica:", error);
    return res.status(500).json({ error: error.message });
  }
};

const rejectMedicalLeave = async (req, res) => {
  try {
    const { uid, requestId, date } = req.body;

    if (!uid || (!requestId && !date)) {
      return res.status(400).json({ error: "Faltam campos obrigatórios: uid e requestId (ou date)" });
    }

    const docs = await findBaixaMedicaDocs(uid, { requestId, date });
    if (docs.length === 0) {
      return res.status(404).json({ error: "Pedido de baixa médica não encontrado" });
    }

    const batch = db.batch();
    docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    console.log("Baixa médica rejeitada e eliminada com sucesso:", docs.map((d) => d.data().date).join(", "));
    return res.status(200).json({ message: "Pedido de baixa médica rejeitado" });
  } catch (error) {
    console.error("Erro ao rejeitar baixa médica:", error);
    return res.status(500).json({ error: error.message });
  }
};

const getPendingVacations = async (req, res) => {
  try {
    const { uid, year } = req.body;

    if (!uid) {
      return res.status(400).json({ error: "uid do colaborador é obrigatório" });
    }

    const currentYear = year || new Date().getFullYear();

    const feriasRef = db
      .collection("registo-ponto")
      .doc(uid)
      .collection("Ferias");

    const feriasSnapshot = await feriasRef.get();
    const feriasPendentes = [];

    feriasSnapshot.forEach(doc => {
      const data = doc.data();

      // Verificar se é do ano correto
      const dateStr = data.date;
      let docYear;

      if (dateStr && dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          // Formato DD-MM-YYYY ou YYYY-MM-DD
          if (parts[0].length === 4) {
            docYear = parseInt(parts[0]);
          } else {
            docYear = parseInt(parts[2]);
          }
        }
      }

      if (data.Approved === false && (!docYear || docYear === currentYear)) {
        feriasPendentes.push({
          date: data.date,
          approved: data.Approved
        });
      }
    });

    return res.status(200).json({
      feriasPendentes: feriasPendentes
    });

  } catch (error) {
    console.error("Erro ao buscar férias pendentes:", error);
    return res.status(500).json({ error: error.message });
  }
};

const getAllUsersVacations = async (req, res) => {
  try {
    const { year } = req.body;
    const currentYear = year || new Date().getFullYear();

    console.log('[getAllUsersVacations] Ano usado:', currentYear);

    // Buscar todos os utilizadores da coleção users (o ID do doc já é o UID)
    const usersSnapshot = await db.collection("users").get();
    console.log('[getAllUsersVacations] Total users na coleção users:', usersSnapshot.size);

    const allVacations = [];

    for (const userDoc of usersSnapshot.docs) {
      const uid = userDoc.id;
      const nome = userDoc.data().nome || uid;

      // Buscar férias no registo-ponto
      const feriasSnapshot = await db
        .collection("registo-ponto")
        .doc(uid)
        .collection("Ferias")
        .get();

      if (feriasSnapshot.size > 0) {
        console.log(`  -> ${nome}: ${feriasSnapshot.size} documentos de férias`);
      }

      feriasSnapshot.forEach(doc => {
        const data = doc.data();

        // Verificar se está aprovada
        const isApproved = data.Approved === true || data.Approved === 'true' || data.Approved === 1;

        if (data.date && isApproved) {
          const parts = data.date.split('-');
          let docYear;

          if (parts.length === 3) {
            docYear = parseInt(parts[2]);
          } else if (parts.length === 2) {
            docYear = currentYear;
          } else {
            console.log(`    [Skip] Formato inválido: ${data.date}`);
            return;
          }

          if (docYear === currentYear) {
            allVacations.push({
              uid,
              nome,
              date: data.date,
              timestamp: data.timestamp,
              approved: true
            });
          }
        }
      });
    }

    console.log('[Result] Total:', allVacations.length);

    return res.status(200).json({
      year: currentYear,
      vacations: allVacations
    });

  } catch (error) {
    console.error('[Error]', error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createVacation,
  approveVacation,
  rejectVacation,
  createMedicalLeave,
  getPendingMedicalLeaves,
  approveMedicalLeave,
  rejectMedicalLeave,
  getPendingVacations,
  getAllUsersVacations
};
