const admin = require("firebase-admin");
const db = admin.firestore();
const { isAdminOrHR, isSuperAdmin } = require("../../middleware/auth");

const STANDARD_ANNUAL_QUOTA = 22;

// Formato armazenado em users/{uid}.data_admissao: "YYYY-MM-DD" (input type=date).
function parseDataAdmissao(dataAdmissao) {
  if (!dataAdmissao) return null;
  const [year, month, day] = dataAdmissao.split("-").map(Number);
  if (!year || !month || !day) return null;
  return { year, month: month - 1, day };
}

// No ano de admissão, a quota é proporcional: 2 dias por cada mês completo
// que resta no ano. O mês de admissão só conta como completo se a entrada
// foi até ao dia 15 (senão só o mês seguinte entra na conta).
// Um SuperAdmin/GestorRH pode substituir este cálculo por um valor manual
// por ano (users/{uid}/quotaOverrides/{year})  -  nesse caso o valor manual
// prevalece sempre sobre o automático.
function computeQuotaForYear(dataAdmissao, targetYear, overrideQuota) {
  if (typeof overrideQuota === "number") {
    return overrideQuota;
  }

  const hire = parseDataAdmissao(dataAdmissao);
  if (!hire) return STANDARD_ANNUAL_QUOTA;
  if (hire.year < targetYear) return STANDARD_ANNUAL_QUOTA;
  if (hire.year > targetYear) return 0;

  const firstCountedMonth = hire.day <= 15 ? hire.month : hire.month + 1;
  const monthsRemaining = 12 - firstCountedMonth;
  return Math.min(Math.max(monthsRemaining, 0) * 2, STANDARD_ANNUAL_QUOTA);
}

function computeUsedForYear(approvedDates, targetYear) {
  return approvedDates.filter((date) => {
    const parts = date.split("-");
    const year = parseInt(parts[2], 10);
    return year === targetYear;
  }).length;
}

function isApprovedDoc(data) {
  return data.Approved === true || data.Approved === "true" || data.Approved === 1;
}

// Feriados fixos portugueses (Porto), formato DD-MM  -  mantido em sincronia
// com HOLIDAYS_PORTO em client/src/utils/timeTracking/constants.js. 24 e 31
// de dezembro ficam de fora daqui porque são tratados à parte como "dias de
// dispensa" (categoria distinta pedida pela empresa, não são feriados legais).
const FIXED_HOLIDAYS_DDMM = [
  "01-01", "25-04", "01-05", "10-06", "24-06", "15-08",
  "05-10", "01-11", "01-12", "08-12", "25-12",
];
const DISPENSA_DDMM = ["24-12", "31-12"];

// Páscoa pelo algoritmo de Meeus/Jones/Butcher  -  mesmo cálculo usado em
// client/src/utils/timeTracking/constants.js (getMoveableHolidays).
function calculateEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function getMoveableHolidaysDDMM(year) {
  const easter = calculateEaster(year);
  const goodFriday = new Date(easter);
  goodFriday.setDate(goodFriday.getDate() - 2);
  const corpusChristi = new Date(easter);
  corpusChristi.setDate(corpusChristi.getDate() + 60);
  const toDDMM = (d) => `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return [toDDMM(goodFriday), toDDMM(corpusChristi)];
}

// Não é permitido marcar férias em fins de semana, feriados nacionais ou nos
// dias de dispensa da empresa (24/31 dez)  -  devolve o motivo do bloqueio, ou
// null se o dia for marcável.
function getBlockedReason(day, month, year) {
  const ddmm = `${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}`;
  if (DISPENSA_DDMM.includes(ddmm)) return "dispensa";

  const dayOfWeek = new Date(year, month - 1, day).getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return "weekend";

  if (FIXED_HOLIDAYS_DDMM.includes(ddmm) || getMoveableHolidaysDDMM(year).includes(ddmm)) return "holiday";

  return null;
}

async function getUsedDaysForYear(uid, targetYear) {
  const feriasSnapshot = await db.collection("registo-ponto").doc(uid).collection("Ferias").get();
  let count = 0;
  feriasSnapshot.forEach((doc) => {
    const data = doc.data();
    if (!data.date || !isApprovedDoc(data)) return;
    const parts = data.date.split("-");
    if (parts.length !== 3) return;
    if (parseInt(parts[2], 10) === targetYear) count++;
  });
  return count;
}

// Dia de aniversário: benefício fixo de 1 dia/ano por colaborador, independente
// da quota de férias (não faz proration nem transita de ano para ano).
const BIRTHDAY_ANNUAL_QUOTA = 1;

async function getUsedBirthdayDaysForYear(uid, targetYear) {
  const snapshot = await db.collection("registo-ponto").doc(uid).collection("DiasAniversario").get();
  let count = 0;
  snapshot.forEach((doc) => {
    const data = doc.data();
    if (!data.date || !isApprovedDoc(data)) return;
    const parts = data.date.split("-");
    if (parts.length !== 3) return;
    if (parseInt(parts[2], 10) === targetYear) count++;
  });
  return count;
}

const getVacationMap = async (req, res) => {
  try {
    const { year } = req.body;
    const currentYear = year || new Date().getFullYear();

    const [usersSnapshot, entidadesSnapshot] = await Promise.all([
      db.collection("users").get(),
      db.collection("entidades").get(),
    ]);

    const entidadeNomes = {};
    entidadesSnapshot.forEach((doc) => {
      entidadeNomes[doc.id] = doc.data().nome || doc.id;
    });

    const employees = [];
    for (const userDoc of usersSnapshot.docs) {
      const data = userDoc.data();
      if (isSuperAdmin(data.nivelAcesso)) continue;

      const uid = userDoc.id;
      const entidadeId = data.entidade ? data.entidade.replace("entidades/", "") : null;

      const [feriasSnapshot, aniversarioSnapshot, quotaOverrideDoc, diasTransitadosDoc] = await Promise.all([
        db.collection("registo-ponto").doc(uid).collection("Ferias").get(),
        db.collection("registo-ponto").doc(uid).collection("DiasAniversario").get(),
        userDoc.ref.collection("quotaOverrides").doc(String(currentYear)).get(),
        userDoc.ref.collection("diasTransitados").doc(String(currentYear)).get(),
      ]);

      const approvedDaysCurrentYear = [];

      feriasSnapshot.forEach((doc) => {
        const feriasData = doc.data();
        if (!feriasData.date || !isApprovedDoc(feriasData)) return;

        const parts = feriasData.date.split("-");
        if (parts.length !== 3) return;
        const docYear = parseInt(parts[2], 10);

        if (docYear === currentYear) approvedDaysCurrentYear.push(feriasData.date);
      });

      const birthdayDaysCurrentYear = [];

      aniversarioSnapshot.forEach((doc) => {
        const aniversarioData = doc.data();
        if (!aniversarioData.date || !isApprovedDoc(aniversarioData)) return;

        const parts = aniversarioData.date.split("-");
        if (parts.length !== 3) return;
        const docYear = parseInt(parts[2], 10);

        if (docYear === currentYear) birthdayDaysCurrentYear.push(aniversarioData.date);
      });

      const quotaOverrideAtual = quotaOverrideDoc.exists ? quotaOverrideDoc.data().quota : null;
      const carryoverOverrideAtual = diasTransitadosDoc.exists ? diasTransitadosDoc.data().dias : null;
      const quotaAtual = computeQuotaForYear(data.data_admissao, currentYear, quotaOverrideAtual ?? undefined);
      const carryoverAtual = carryoverOverrideAtual ?? 0;
      const usadoAtual = computeUsedForYear(approvedDaysCurrentYear, currentYear);
      const saldoDisponivel = quotaAtual + carryoverAtual - usadoAtual;
      const birthdayUsadoAtual = birthdayDaysCurrentYear.length;
      const birthdaySaldoDisponivel = BIRTHDAY_ANNUAL_QUOTA - birthdayUsadoAtual;

      employees.push({
        uid,
        nome: data.nome || "Nome não disponível",
        entidade: entidadeId ? entidadeNomes[entidadeId] || entidadeId : null,
        approvedDaysCurrentYear,
        quotaAtual,
        quotaOverrideAtual,
        carryoverAtual,
        carryoverOverrideAtual,
        usadoAtual,
        saldoDisponivel,
        birthdayDaysCurrentYear,
        birthdayUsadoAtual,
        birthdaySaldoDisponivel,
      });
    }

    return res.status(200).json({ year: currentYear, employees });
  } catch (error) {
    console.error("Erro ao buscar mapa de férias:", error);
    return res.status(500).json({ error: error.message });
  }
};

const toggleVacationDay = async (req, res) => {
  try {
    const { uid, date } = req.body;
    if (!uid || !date) {
      return res.status(400).json({ error: "Faltam campos obrigatórios: uid e/ou date" });
    }

    const isSelf = req.user.uid === uid;
    if (!isSelf && !isAdminOrHR(req.user.nivelAcesso)) {
      return res.status(403).json({ error: "Sem permissão para alterar férias deste colaborador" });
    }

    const [day, month, year] = date.split("-");
    const targetYear = parseInt(year, 10);
    const registoId = `registo_${day}${month}${year}`;
    const docRef = db.collection("registo-ponto").doc(uid).collection("Ferias").doc(registoId);
    const existing = await docRef.get();

    if (existing.exists) {
      await docRef.delete();
      return res.status(200).json({ message: "Dia de férias removido", action: "removed", date });
    }

    // Só valida fins de semana / feriados / saldo ao marcar um novo dia (nunca
    // ao desmarcar, para não impedir a limpeza de registos antigos/inválidos).
    const blockedReason = getBlockedReason(parseInt(day, 10), parseInt(month, 10), targetYear);
    if (blockedReason) {
      const messages = {
        weekend: "Não é possível marcar férias num fim de semana",
        holiday: "Não é possível marcar férias num feriado nacional",
        dispensa: "Não é possível marcar férias num dia de dispensa da empresa",
      };
      return res.status(400).json({ error: messages[blockedReason] });
    }

    const userRef = db.collection("users").doc(uid);
    const [userDoc, quotaOverrideDoc, diasTransitadosDoc, usedThisYear] = await Promise.all([
      userRef.get(),
      userRef.collection("quotaOverrides").doc(String(targetYear)).get(),
      userRef.collection("diasTransitados").doc(String(targetYear)).get(),
      getUsedDaysForYear(uid, targetYear),
    ]);
    const userData = userDoc.exists ? userDoc.data() : {};
    const quota = computeQuotaForYear(userData.data_admissao, targetYear, quotaOverrideDoc.exists ? quotaOverrideDoc.data().quota : undefined);
    const carryover = diasTransitadosDoc.exists ? diasTransitadosDoc.data().dias : 0;

    if (usedThisYear + 1 > quota + carryover) {
      return res.status(400).json({ error: "Sem dias de férias disponíveis para este colaborador" });
    }

    await docRef.set({
      date: `${day}-${month}-${year}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      Approved: true,
      createdBy: req.user.uid,
    });
    return res.status(201).json({ message: "Dia de férias marcado", action: "added", date });
  } catch (error) {
    console.error("Erro ao alternar dia de férias:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Dia de aniversário: benefício próprio, separado da quota de férias  -  1
// dia/ano, sem proration nem transição, auto-aprovado tal como o toggle de
// férias (o próprio marca diretamente, sem fluxo de aprovação do responsável).
const toggleBirthdayDay = async (req, res) => {
  try {
    const { uid, date } = req.body;
    if (!uid || !date) {
      return res.status(400).json({ error: "Faltam campos obrigatórios: uid e/ou date" });
    }

    const isSelf = req.user.uid === uid;
    if (!isSelf && !isAdminOrHR(req.user.nivelAcesso)) {
      return res.status(403).json({ error: "Sem permissão para alterar o dia de aniversário deste colaborador" });
    }

    const [day, month, year] = date.split("-");
    const targetYear = parseInt(year, 10);
    const registoId = `registo_${day}${month}${year}`;
    const docRef = db.collection("registo-ponto").doc(uid).collection("DiasAniversario").doc(registoId);
    const existing = await docRef.get();

    if (existing.exists) {
      await docRef.delete();
      return res.status(200).json({ message: "Dia de aniversário removido", action: "removed", date });
    }

    const blockedReason = getBlockedReason(parseInt(day, 10), parseInt(month, 10), targetYear);
    if (blockedReason) {
      const messages = {
        weekend: "Não é possível marcar o dia de aniversário num fim de semana",
        holiday: "Não é possível marcar o dia de aniversário num feriado nacional",
        dispensa: "Não é possível marcar o dia de aniversário num dia de dispensa da empresa",
      };
      return res.status(400).json({ error: messages[blockedReason] });
    }

    const usedThisYear = await getUsedBirthdayDaysForYear(uid, targetYear);
    if (usedThisYear + 1 > BIRTHDAY_ANNUAL_QUOTA) {
      return res.status(400).json({ error: "O dia de aniversário deste ano já foi utilizado" });
    }

    await docRef.set({
      date: `${day}-${month}-${year}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      Approved: true,
      createdBy: req.user.uid,
    });
    return res.status(201).json({ message: "Dia de aniversário marcado", action: "added", date });
  } catch (error) {
    console.error("Erro ao alternar dia de aniversário:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Só SuperAdmin/GestorRH (gate feito na rota via requireAdminOrHR) pode
// definir manualmente a quota de férias de um colaborador para um dado ano,
// substituindo o cálculo automático (22 dias/ano, prorateado no ano de
// admissão). Enviar quota=null remove a substituição e volta ao automático.
const setVacationQuotaOverride = async (req, res) => {
  try {
    const { uid, year, quota } = req.body;
    if (!uid || !year) {
      return res.status(400).json({ error: "Faltam campos obrigatórios: uid e/ou year" });
    }

    const overrideRef = db.collection("users").doc(uid).collection("quotaOverrides").doc(String(year));

    if (quota === null || quota === undefined || quota === "") {
      await overrideRef.delete();
      return res.status(200).json({ message: "Quota personalizada removida", quota: null });
    }

    const parsedQuota = Number(quota);
    if (!Number.isFinite(parsedQuota) || parsedQuota < 0) {
      return res.status(400).json({ error: "Quota inválida" });
    }

    await overrideRef.set({ quota: parsedQuota });
    return res.status(200).json({ message: "Quota personalizada guardada", quota: parsedQuota });
  } catch (error) {
    console.error("Erro ao definir quota personalizada de férias:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Só SuperAdmin/GestorRH (gate feito na rota via requireAdminOrHR) pode
// definir os dias de férias transitados do ano anterior para um colaborador,
// num dado ano  -  valor sempre manual, guardado em users/{uid}/diasTransitados/{year}.
// Enviar days=null remove a entrada (volta a 0).
const setVacationCarryover = async (req, res) => {
  try {
    const { uid, year, days } = req.body;
    if (!uid || !year) {
      return res.status(400).json({ error: "Faltam campos obrigatórios: uid e/ou year" });
    }

    const carryoverRef = db.collection("users").doc(uid).collection("diasTransitados").doc(String(year));

    if (days === null || days === undefined || days === "") {
      await carryoverRef.delete();
      return res.status(200).json({ message: "Transição de férias removida", days: null });
    }

    const parsedDays = Number(days);
    if (!Number.isFinite(parsedDays) || parsedDays < 0) {
      return res.status(400).json({ error: "Número de dias inválido" });
    }

    await carryoverRef.set({ dias: parsedDays });
    return res.status(200).json({ message: "Transição de férias guardada", days: parsedDays });
  } catch (error) {
    console.error("Erro ao definir transição de férias:", error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getVacationMap,
  toggleVacationDay,
  toggleBirthdayDay,
  setVacationQuotaOverride,
  setVacationCarryover,
};
