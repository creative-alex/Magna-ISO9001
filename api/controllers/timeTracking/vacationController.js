const admin = require("firebase-admin");
const { resolveTargetUid } = require("./helpers");
const db = admin.firestore();

const createVacation = async (req, res) => {
  try {
    const { date, year } = req.body;

    if (!date) {
      return res.status(400).json({ error: "Falta o campo obrigatório: date" });
    }

    const { uid: userId, error: authError } = resolveTargetUid(req);
    if (authError) return res.status(403).json({ error: authError });

    // Um admin a registar férias por um colaborador fica automaticamente
    // aprovado; um pedido próprio fica sempre pendente de aprovação — nunca
    // se confia num "Approved" vindo do cliente.
    const Approved = userId !== req.user.uid;

    console.log("A registar férias para o user:", userId);

    const userDocRef = db.collection("registo-ponto").doc(userId);

    const [day, month] = date.split("-");
    const selectedYear = year || new Date().getFullYear();
    const registoId = `registo_${day}${month}${selectedYear}`;

    console.log("Gerado registoId:", registoId);

    await userDocRef.collection("Ferias").doc(registoId).set({
      date: `${day}-${month}-${selectedYear}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      Approved
    });

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

const createMedicalLeave = async (req, res) => {
  try {
    const { date, year } = req.body;

    if (!date) {
      console.log("Erro: Campo obrigatório ausente.");
      return res.status(400).json({ error: "Falta o campo obrigatório: date" });
    }

    const { uid: userId, error: authError } = resolveTargetUid(req);
    if (authError) return res.status(403).json({ error: authError });

    const Approved = userId !== req.user.uid;

    console.log("A registar baixa médica para o user:", userId);

    const userDocRef = db.collection("registo-ponto").doc(userId);

    const [day, month] = date.split("-");
    const selectedYear = year || new Date().getFullYear();
    const registoId = `registo_${day}${month}${selectedYear}`;

    console.log("Gerado registoId:", registoId);

    await userDocRef.collection("BaixasMedicas").doc(registoId).set({
      date: `${day}-${month}-${selectedYear}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      Approved
    });

    console.log("Baixa médica registada com sucesso no Firestore.");
    return res.status(201).json({ message: "Baixa médica registada com sucesso", registoId });
  } catch (error) {
    console.error("Erro ao registar baixa médica:", error);
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
  getPendingVacations,
  getAllUsersVacations
};
