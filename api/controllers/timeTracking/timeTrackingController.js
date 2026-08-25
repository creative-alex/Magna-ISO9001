const admin = require("firebase-admin");
const { resolveTargetUid } = require("./helpers");
const db = admin.firestore();

// NOTA: o ID do documento em "registo-ponto" é, por omissão, o UID do
// Firebase Auth do utilizador autenticado (req.user.uid)  -  nunca um valor
// vindo do corpo do pedido  -  isto evita que um utilizador aceda/altere os
// registos de outro só por enviar um "username"/"uid" diferente. As poucas
// funções que um admin também usa para ver/editar os dados de OUTRO
// colaborador (updateUserTime) usam resolveTargetUid, que só deixa usar um
// "uid" diferente do próprio quando o requisitante é SuperAdmin.

const registerEntry = async (req, res) => {
  try {
    const { time } = req.body;

    if (!time) {
      console.log("Erro: Campos obrigatórios ausentes.");
      return res.status(400).json({ error: "Falta o campo obrigatório: time" });
    }

    const userId = req.user.uid;

    const userDocRef = db.collection("registo-ponto").doc(userId);

    // Extrai data do parâmetro time enviado pelo cliente (formato: YYYY-MM-DD HH:mm)
    let dd, mm, yyyy, horaEntrada;
    if (time.includes(' ')) {
      // Formato completo: YYYY-MM-DD HH:mm
      const [datePart, horaPart] = time.split(' ');
      [yyyy, mm, dd] = datePart.split('-');
      horaEntrada = horaPart;
    } else {
      // Formato antigo (apenas hora) - fallback para data do servidor
      const today = new Date();
      dd = String(today.getDate()).padStart(2, "0");
      mm = String(today.getMonth() + 1).padStart(2, "0");
      yyyy = today.getFullYear();
      horaEntrada = time;
    }

    const registoId = `registo_${dd}${mm}${yyyy}`;

    console.log("Gerado registoId:", registoId);

    await userDocRef.collection("Registos").doc(registoId).set({
      horaEntrada,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log("Entrada registada com sucesso no Firestore.");
    return res.status(201).json({ message: "Entrada registada com sucesso", registoId });
  } catch (error) {
    console.error("Erro ao registar entrada:", error);
    return res.status(500).json({ error: error.message });
  }
};

const checkEntry = async (req, res) => {
  try {
    const userId = req.user.uid;

    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();

    const startOfDay = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
    const endOfDay = new Date(`${yyyy}-${mm}-${dd}T23:59:59.999Z`);

    const registosRef = db
      .collection("registo-ponto")
      .doc(userId)
      .collection("Registos");

    const snapshot = await registosRef
      .where("timestamp", ">=", startOfDay)
      .where("timestamp", "<=", endOfDay)
      .orderBy("timestamp", "asc")
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.log("Nenhum registo encontrado para hoje.");
      return res.status(200).json({ hasEntry: false });
    }

    const data = snapshot.docs[0].data();

    if (data.horaEntrada) {
      return res.status(200).json({ hasEntry: true });
    }

    return res.status(200).json({ hasEntry: false });
  } catch (error) {
    console.error("Erro ao verificar entrada:", error);
    return res.status(500).json({ error: error.message });
  }
};

const registerLeave = async (req, res) => {
  try {
    const { time } = req.body;

    if (!time) {
      console.log("Erro: Campos obrigatórios ausentes.");
      return res.status(400).json({ error: "Campo time é obrigatório" });
    }

    const userId = req.user.uid;

    // Extrai data do parâmetro time enviado pelo cliente (formato: YYYY-MM-DD HH:mm)
    let dd, mm, yyyy, horaSaida;
    if (time.includes(' ')) {
      // Formato completo: YYYY-MM-DD HH:mm
      const [datePart, horaPart] = time.split(' ');
      [yyyy, mm, dd] = datePart.split('-');
      horaSaida = horaPart;
    } else {
      // Formato antigo (apenas hora) - fallback para data do servidor
      const today = new Date();
      dd = String(today.getDate()).padStart(2, "0");
      mm = String(today.getMonth() + 1).padStart(2, "0");
      yyyy = today.getFullYear();
      horaSaida = time;
    }

    console.log("Buscando documento de entrada no Firestore...");

    const registosRef = db.collection("registo-ponto").doc(userId).collection("Registos");

    const snapshot = await registosRef
      .where("timestamp", ">=", new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`))
      .where("timestamp", "<=", new Date(`${yyyy}-${mm}-${dd}T23:59:59.999Z`))
      .orderBy("timestamp", "desc")
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.log("Erro: Nenhum registo de entrada encontrado para hoje.");
      return res.status(404).json({ error: "Nenhum registo de entrada encontrado para hoje" });
    }

    const registoDoc = snapshot.docs[0];
    const registoId = registoDoc.id;

    console.log(`Atualizando registo ${registoId} com hora de saída...`);

    await registosRef.doc(registoId).update({
      horaSaida,
    });

    console.log("Saída registada com sucesso no Firestore.");

    return res.status(200).json({ message: "Saída registada com sucesso", registoId });
  } catch (error) {
    console.error("Erro ao registar saída:", error);
    return res.status(500).json({ error: error.message });
  }
};

const checkLeave = async (req, res) => {
  try {
    const userId = req.user.uid;

    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();

    const registosRef = db.collection("registo-ponto").doc(userId).collection("Registos");

    const snapshot = await registosRef
      .where("timestamp", ">=", new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`))
      .where("timestamp", "<=", new Date(`${yyyy}-${mm}-${dd}T23:59:59.999Z`))
      .orderBy("timestamp", "desc")
      .limit(1)
      .get();

    if (snapshot.empty || !snapshot.docs[0].data().horaSaida) {
      return res.status(200).json({ hasLeave: false });
    }

    return res.status(200).json({ hasLeave: true });
  } catch (error) {
    console.error("Erro ao verificar saída:", error);
    return res.status(500).json({ error: error.message });
  }
};

const updateUserTime = async (req, res) => {
  try {
    const { date, campo, valor, year } = req.body;

    if (!date || !campo || !valor) {
      return res.status(400).json({ error: "Todos os campos são obrigatórios" });
    }

    const { uid: userId, error: authError } = resolveTargetUid(req);
    if (authError) return res.status(403).json({ error: authError });

    const dateParts = date.split("-");
    if (dateParts.length !== 2) {
      console.log("Erro: Formato de data inválido.", date);
      return res.status(400).json({ error: "Formato de data inválido. Use DD-MM" });
    }

    const [day, month] = dateParts.map(Number);
    const selectedYear = year || new Date().getFullYear();

    if (isNaN(day) || isNaN(month)) {
      console.log("Erro: Data contém valores inválidos.", date);
      return res.status(400).json({ error: "Data inválida fornecida" });
    }

    let [hour, minute] = valor.split(":").map(Number);
    if (isNaN(hour) || isNaN(minute)) {
      console.log("Erro: Horário inválido.", valor);
      return res.status(400).json({ error: "Horário inválido fornecido" });
    }

    const dataRegisto = new Date(selectedYear, month - 1, day, hour, minute);
    if (isNaN(dataRegisto.getTime())) {
      console.log("Erro: Data gerada inválida.", dataRegisto);
      return res.status(400).json({ error: "Data inválida gerada" });
    }

    console.log("Data processada com horário:", dataRegisto.toISOString());

    const registoId = `registo_${String(day).padStart(2, '0')}${String(month).padStart(2, '0')}${selectedYear}`;

    const registoRef = db
      .collection("registo-ponto")
      .doc(userId)
      .collection("Registos")
      .doc(registoId);

    const docSnapshot = await registoRef.get();
    if (!docSnapshot.exists) {
      console.log("Registo não encontrado. Criando novo documento...");
    }

    const updateData = { timestamp: dataRegisto };
    updateData[campo] = valor;
    await registoRef.set(updateData, { merge: true });

    return res.status(200).json({ message: "Horário atualizado com sucesso" });
  } catch (error) {
    console.error("Erro ao atualizar horário do user:", error);
    return res.status(500).json({ error: error.message });
  }
};

const deleteRegister = async (req, res) => {
  try {
    console.log("🔹 Recebendo requisição para apagar registo...");
    const { uid, date, year } = req.body;

    if (!uid || !date) {
      console.log("❌ Erro: uid e data são obrigatórios.");
      return res.status(400).json({ error: "O uid do colaborador e a data são obrigatórios" });
    }

    const formatDateForId = (date, year) => {
      const [day, month, dateYear] = date.split("-");
      const ano = dateYear || year || new Date().getFullYear();
      return `${day.padStart(2, "0")}${month.padStart(2, "0")}${ano}`;
    };

    const registoId = `registo_${formatDateForId(date, year)}`;

    const userDocRef = db.collection("registo-ponto").doc(uid);
    const registosRef = userDocRef.collection("Registos");
    const feriasRef = userDocRef.collection("Ferias");
    const baixasRef = userDocRef.collection("BaixasMedicas");
    const aniversarioRef = userDocRef.collection("DiasAniversario");

    console.log("📌 Buscando registo com ID:", registoId);
    const registoDoc = await registosRef.doc(registoId).get();
    const feriasDoc = await feriasRef.doc(registoId).get();
    const baixasDoc = await baixasRef.doc(registoId).get();
    const aniversarioDoc = await aniversarioRef.doc(registoId).get();

    if (!registoDoc.exists && !feriasDoc.exists && !baixasDoc.exists && !aniversarioDoc.exists) {
      console.log("⚠️ Nenhum registo encontrado para a data informada");
      return res.status(404).json({ error: "Nenhum registo encontrado para a data informada" });
    }

    const batch = db.batch();

    if (registoDoc.exists) {
      console.log("🗑️ Apagando registo:", registoId);
      batch.delete(registoDoc.ref);
    }
    if (feriasDoc.exists) {
      console.log("🗑️ Apagando registo de férias:", feriasDoc.id);
      batch.delete(feriasDoc.ref);
    }
    if (baixasDoc.exists) {
      console.log("🗑️ Apagando registo de baixa médica:", baixasDoc.id);
      batch.delete(baixasDoc.ref);
    }
    if (aniversarioDoc.exists) {
      console.log("🗑️ Apagando dia de aniversário:", aniversarioDoc.id);
      batch.delete(aniversarioDoc.ref);
    }

    console.log("🔄 Executando batch delete...");
    await batch.commit();

    console.log("✅ Registos apagados com sucesso.");
    return res.status(200).json({ message: "Registos apagados com sucesso" });
  } catch (error) {
    console.error("❌ Erro ao apagar registos:", error);
    return res.status(500).json({ error: error.message });
  }
};

const registerManualOvertime = async (req, res) => {
  try {
    const { startHour, endHour, hours, minutes, date, description } = req.body;
    console.log("Dados recebidos para horas extras manuais:", { startHour, endHour, hours, minutes, date, description });

    if (hours === undefined || hours === null || minutes === undefined || minutes === null || !date) {
      console.log("Erro: Campos obrigatórios ausentes.");
      return res.status(400).json({ error: "Campos obrigatórios: hours, minutes, date" });
    }

    // Validar se hours e minutes são números válidos
    const hoursNum = parseInt(hours);
    const minutesNum = parseInt(minutes);

    if (isNaN(hoursNum) || isNaN(minutesNum) || hoursNum < 0 || minutesNum < 0) {
      console.log("Erro: Valores de horas ou minutos inválidos.");
      return res.status(400).json({ error: "Horas e minutos devem ser números válidos e não negativos" });
    }

    // Verificar limites razoáveis (máx 24h por registo)
    if (hoursNum > 24 || minutesNum > 59) {
      console.log("Erro: Valores fora dos limites permitidos.");
      return res.status(400).json({ error: "Horas devem ser no máximo 24 e minutos no máximo 59" });
    }

    // Verificar se o total é maior que 0
    const totalMinutes = hoursNum * 60 + minutesNum;
    if (totalMinutes <= 0) {
      console.log("Erro: Total de minutos deve ser maior que 0.");
      return res.status(400).json({ error: "Total de horas extras deve ser maior que 0" });
    }

    const userId = req.user.uid;

    const userDocRef = db.collection("registo-ponto").doc(userId);

    // Converter a data para o formato DD-MM-YYYY
    // O date vem no formato YYYY-MM-DD do input type="date"
    const [yyyy, mm, dd] = date.split('-');
    const formattedDate = `${dd}-${mm}-${yyyy}`;

    const overtimeId = `overtime_${dd}${mm}${yyyy}_${Date.now()}`;

    console.log("Data recebida:", date, "-> Formatada:", formattedDate, "-> ID:", overtimeId);

    await userDocRef.collection("HorasExtraManual").doc(overtimeId).set({
      startHour: startHour,
      endHour: endHour,
      date: formattedDate,
      hours: hoursNum,
      minutes: minutesNum,
      totalMinutes: totalMinutes,
      description: description || "Horas extras trabalhadas após horário normal"
    });

    console.log("Horas extras manuais registadas com sucesso no Firestore.");
    return res.status(201).json({
      message: "Horas extras registadas com sucesso",
      overtimeId,
      totalMinutes
    });
  } catch (error) {
    console.error("Erro ao registar horas extras manuais:", error);
    return res.status(500).json({ error: error.message });
  }
};

const getManualOvertimeForMonth = async (req, res) => {
  try {
    const { month } = req.body;

    if (!month) {
      console.log("Erro: Campos obrigatórios ausentes.");
      return res.status(400).json({ error: "Campo obrigatório: month" });
    }

    const userId = req.user.uid;

    const userDocRef = db.collection("registo-ponto").doc(userId);

    // Buscar todas as horas extras manuais para o mês
    const manualOvertimeSnapshot = await userDocRef
      .collection("HorasExtraManual")
      .get();

    const manualOvertimeByDay = {};

    manualOvertimeSnapshot.forEach(doc => {
      const data = doc.data();
      const dateParts = data.date.split('-');
      const monthFromDate = parseInt(dateParts[1]);

      // Só incluir se for do mês solicitado
      if (monthFromDate === parseInt(month)) {
        const day = dateParts[0]; // DD
        const dayKey = `${day}-${String(month).padStart(2, "0")}`;

        if (!manualOvertimeByDay[dayKey]) {
          manualOvertimeByDay[dayKey] = {
            totalMinutes: 0,
            entries: []
          };
        }

        manualOvertimeByDay[dayKey].totalMinutes += data.totalMinutes;
        manualOvertimeByDay[dayKey].entries.push({
          id: doc.id,
          startHour: data.startHour,
          endHour: data.endHour,
          hours: data.hours || 0,
          minutes: data.minutes || 0,
          totalMinutes: data.totalMinutes,
          description: data.description || "Horas extras",
          date: data.date
        });
      }
    });

    console.log("Horas extras manuais encontradas:", manualOvertimeByDay);
    return res.status(200).json({ manualOvertimeByDay });
  } catch (error) {
    console.error("Erro ao buscar horas extras manuais:", error);
    return res.status(500).json({ error: error.message });
  }
};

const updateManualOvertime = async (req, res) => {
  try {
    const { hourStart, hourEnd, overtimeId, hours, minutes, date, description } = req.body;

    if (!overtimeId || hours === undefined || hours === null || minutes === undefined || minutes === null || !date) {
      console.log("Erro: Campos obrigatórios ausentes para atualização.");
      return res.status(400).json({ error: "Campos obrigatórios: overtimeId, hours, minutes, date" });
    }

    // Validar se hours e minutes são números válidos
    const hoursNum = parseInt(hours);
    const minutesNum = parseInt(minutes);

    if (isNaN(hoursNum) || isNaN(minutesNum) || hoursNum < 0 || minutesNum < 0) {
      console.log("Erro: Valores de horas ou minutos inválidos.");
      return res.status(400).json({ error: "Horas e minutos devem ser números válidos e não negativos" });
    }

    // Verificar se o total é maior que 0
    const totalMinutes = hoursNum * 60 + minutesNum;
    if (totalMinutes <= 0) {
      console.log("Erro: Total de minutos deve ser maior que 0.");
      return res.status(400).json({ error: "Total de horas extras deve ser maior que 0" });
    }

    const userId = req.user.uid;

    const userDocRef = db.collection("registo-ponto").doc(userId);
    const overtimeRef = userDocRef.collection("HorasExtraManual").doc(overtimeId);

    // Verificar se o documento existe
    const overtimeDoc = await overtimeRef.get();
    if (!overtimeDoc.exists) {
      console.log("Erro: Registo de horas extras não encontrado.");
      return res.status(404).json({ error: "Registo de horas extras não encontrado" });
    }

    // A data já vem no formato DD-MM-YYYY, só precisamos garantir que está correto
    let formattedDate = date;

    // Se a data vier em outro formato (YYYY-MM-DD), converter
    if (date.includes('-') && date.split('-')[0].length === 4) {
      const [yyyy, mm, dd] = date.split('-');
      formattedDate = `${dd}-${mm}-${yyyy}`;
    }

    await overtimeRef.update({
      startHour: hourStart,
      endHour: hourEnd,
      date: formattedDate,
      hours: hoursNum,
      minutes: minutesNum,
      totalMinutes: totalMinutes,
      description: description || "Horas extras trabalhadas após horário normal"
    });

    console.log("Horas extras manuais atualizadas com sucesso no Firestore.");
    return res.status(200).json({
      message: "Horas extras atualizadas com sucesso",
      overtimeId,
      totalMinutes
    });
  } catch (error) {
    console.error("Erro ao atualizar horas extras manuais:", error);
    return res.status(500).json({ error: error.message });
  }
};

const deleteManualOvertime = async (req, res) => {
  try {
    const { overtimeId } = req.body;

    if (!overtimeId) {
      console.log("Erro: Campo obrigatório ausente para exclusão.");
      return res.status(400).json({ error: "Campo obrigatório: overtimeId" });
    }

    const userId = req.user.uid;

    const userDocRef = db.collection("registo-ponto").doc(userId);
    const overtimeRef = userDocRef.collection("HorasExtraManual").doc(overtimeId);

    // Verificar se o documento existe
    const overtimeDoc = await overtimeRef.get();
    if (!overtimeDoc.exists) {
      console.log("Erro: Registo de horas extras não encontrado.");
      return res.status(404).json({ error: "Registo de horas extras não encontrado" });
    }

    await overtimeRef.delete();

    console.log("Horas extras manuais excluídas com sucesso do Firestore.");
    return res.status(200).json({
      message: "Horas extras excluídas com sucesso",
      overtimeId
    });
  } catch (error) {
    console.error("Erro ao excluir horas extras manuais:", error);
    return res.status(500).json({ error: error.message });
  }
};

const checkTimeTracking = async (req, res) => {
  try {
    const userId = req.user.uid;

    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();

    const registosRef = db.collection("registo-ponto").doc(userId).collection("Registos");

    const snapshot = await registosRef
      .where("timestamp", ">=", new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`))
      .where("timestamp", "<=", new Date(`${yyyy}-${mm}-${dd}T23:59:59.999Z`))
      .orderBy("timestamp", "desc")
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(200).json({ hasEntry: false, hasLeave: false });
    }

    const data = snapshot.docs[0].data();
    return res.status(200).json({
      hasEntry: !!data.horaEntrada,
      hasLeave: !!data.horaSaida
    });
  } catch (error) {
    console.error("Erro ao verificar time tracking:", error);
    return res.status(500).json({ error: error.message });
  }
};

const debugCorruptOvertime = async (req, res) => {
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: "uid obrigatório" });

    const snapshot = await db
      .collection("registo-ponto")
      .doc(uid)
      .collection("HorasExtraManual")
      .get();

    const all = [];
    snapshot.forEach(doc => {
      const d = doc.data();
      all.push({ id: doc.id, ...d });
    });

    const corrupt = all.filter(d => (d.totalMinutes || 0) > 1440);
    const normal = all.filter(d => (d.totalMinutes || 0) <= 1440);

    return res.status(200).json({
      total: all.length,
      corruptCount: corrupt.length,
      corrupt,
      normal,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const deleteCorruptOvertime = async (req, res) => {
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: "uid obrigatório" });

    const colRef = db.collection("registo-ponto").doc(uid).collection("HorasExtraManual");
    const snapshot = await colRef.get();
    const batch = db.batch();
    let count = 0;

    snapshot.forEach(doc => {
      if ((doc.data().totalMinutes || 0) > 1440) {
        batch.delete(doc.ref);
        count++;
      }
    });

    if (count > 0) await batch.commit();

    return res.status(200).json({ deleted: count });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  registerEntry,
  checkEntry,
  registerLeave,
  checkLeave,
  checkTimeTracking,
  updateUserTime,
  deleteRegister,
  registerManualOvertime,
  getManualOvertimeForMonth,
  updateManualOvertime,
  deleteManualOvertime,
  debugCorruptOvertime,
  deleteCorruptOvertime,
};
