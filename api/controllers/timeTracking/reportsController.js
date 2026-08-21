const admin = require("firebase-admin");
const { resolveTargetUid } = require("./helpers");
const db = admin.firestore();

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

function getMoveableHolidays(year) {
  const easter = calculateEaster(year);
  const goodFriday = new Date(easter);
  goodFriday.setDate(goodFriday.getDate() - 2);
  const corpusChristi = new Date(easter);
  corpusChristi.setDate(corpusChristi.getDate() + 60);
  const toDDMM = (d) =>
    `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return [toDDMM(goodFriday), toDDMM(corpusChristi)];
}

// Função auxiliar para calcular horas (similar à do frontend)
function calcularHorasHelper(horaEntrada, horaSaida, date = null) {
  if (!horaEntrada || !horaSaida) return { minutos: 0, minutosExtras: 0 };

  const [hEntrada, mEntrada] = horaEntrada.split(':').map(Number);
  const [hSaida, mSaida] = horaSaida.split(':').map(Number);

  if (isNaN(hEntrada) || isNaN(mEntrada) || isNaN(hSaida) || isNaN(mSaida)) {
    return { minutos: 0, minutosExtras: 0 };
  }

  let minutosTrabalhados = (hSaida * 60 + mSaida) - (hEntrada * 60 + mEntrada);

  if (minutosTrabalhados > 300) {
    minutosTrabalhados -= 30;
  }

  // Fins de semana são tratados como dias normais
  const minutosNormais = Math.min(minutosTrabalhados, 480);
  const minutosExtras = Math.max(0, minutosTrabalhados - 480);

  return { minutos: minutosNormais, minutosExtras };
}

// Função auxiliar para formatar minutos
function formatarMinutosHelper(totalMinutos) {
  if (totalMinutos <= 0) return "0h 0m";
  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;
  return `${horas}h ${minutos}m`;
}

// Função auxiliar para obter nome do mês
function getMonthName(month) {
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  return months[month - 1];
}

// Função auxiliar para buscar a data de criação do colaborador
async function getUserCreatedAt(uid) {
  try {
    const userDoc = await db.collection('users').doc(uid).get();

    if (userDoc.exists) {
      const userData = userDoc.data();
      const createdAt = userData.createdAt;

      if (!createdAt) {
        return null;
      }

      // Verificar se é um Timestamp do Firestore
      if (createdAt && typeof createdAt.toDate === 'function') {
        return createdAt.toDate();
      }

      // Verificar se é uma string ISO
      if (typeof createdAt === 'string') {
        const dateFromString = new Date(createdAt);
        if (!isNaN(dateFromString.getTime())) {
          return dateFromString;
        }
      }

      return null;
    }

    return null;
  } catch (error) {
    console.error("Erro ao buscar data de criação do colaborador:", error);
    return null;
  }
}

const getUserRecords = async (req, res) => {
  try {
    const { month, year } = req.body;

    if (!month) {
      return res.status(400).json({ error: "O mês é obrigatório" });
    }

    const { uid: userId, error: authError } = resolveTargetUid(req);
    if (authError) return res.status(403).json({ error: authError });

    const now = new Date();
    const selectedYear = year || now.getFullYear();
    const firstDay = new Date(selectedYear, month - 1, 1);
    const lastDay = new Date(selectedYear, month, 0, 23, 59, 59);

    const registosRef = db
      .collection("registo-ponto")
      .doc(userId)
      .collection("Registos");

    const snapshot = await registosRef
      .where("timestamp", ">=", firstDay)
      .where("timestamp", "<=", lastDay)
      .orderBy("timestamp", "asc")
      .get();

    const listaDeDatas = [];
    let tempDate = new Date(firstDay);
    while (tempDate <= lastDay) {
      let dd = String(tempDate.getDate()).padStart(2, "0");
      let mm = String(tempDate.getMonth() + 1).padStart(2, "0");
      let yyyy = tempDate.getFullYear();
      listaDeDatas.push(`${dd}-${mm}-${yyyy}`);
      tempDate.setDate(tempDate.getDate() + 1);
    }

    const feriasRef = db
      .collection("registo-ponto")
      .doc(userId)
      .collection("Ferias");

    const baixasRef = db
      .collection("registo-ponto")
      .doc(userId)
      .collection("BaixasMedicas");

    const aniversarioRef = db
      .collection("registo-ponto")
      .doc(userId)
      .collection("DiasAniversario");

    let feriasInfos = [];
    for (let i = 0; i < listaDeDatas.length; i += 30) {
      const batch = listaDeDatas.slice(i, i + 30);
      const feriasSnapshot = await feriasRef.where("date", "in", batch).get();
      feriasInfos.push(
        ...feriasSnapshot.docs.map((doc) => ({
          date: doc.data().date,
          approved: doc.data().Approved ?? false
        }))
      );
    }

    let baixasInfos = [];
    for (let i = 0; i < listaDeDatas.length; i += 30) {
      const batch = listaDeDatas.slice(i, i + 30);
      const baixasSnapshot = await baixasRef.where("date", "in", batch).get();
      baixasInfos.push(
        ...baixasSnapshot.docs.map((doc) => ({
          date: doc.data().date,
          approved: doc.data().Approved ?? false
        }))
      );
    }

    let aniversarioInfos = [];
    for (let i = 0; i < listaDeDatas.length; i += 30) {
      const batch = listaDeDatas.slice(i, i + 30);
      const aniversarioSnapshot = await aniversarioRef.where("date", "in", batch).get();
      aniversarioInfos.push(
        ...aniversarioSnapshot.docs.map((doc) => ({
          date: doc.data().date,
          approved: doc.data().Approved ?? false
        }))
      );
    }

    // Buscar horas extras manuais
    const manualOvertimeRef = db
      .collection("registo-ponto")
      .doc(userId)
      .collection("HorasExtraManual");

    let manualOvertimeInfos = [];
    for (let i = 0; i < listaDeDatas.length; i += 30) {
      const batch = listaDeDatas.slice(i, i + 30);
      const manualOvertimeSnapshot = await manualOvertimeRef.where("date", "in", batch).get();
      manualOvertimeInfos.push(
        ...manualOvertimeSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            date: data.date,
            hours: data.hours || 0,
            minutes: data.minutes || 0,
            totalMinutes: data.totalMinutes || 0,
            description: data.description || "",
            startHour: data.startHour || "",
            endHour: data.endHour || ""
          };
        })
      );
    }

    // Buscar deduções de horas extras para o mês
    const deductionsRef = db
      .collection("registo-ponto")
      .doc(userId)
      .collection("DeducoesHorasExtras");

    const monthKey = `${selectedYear}-${String(month).padStart(2, "0")}`;
    const deductionDoc = await deductionsRef.doc(monthKey).get();
    const deductionMinutes = deductionDoc.exists ? (deductionDoc.data().deductionMinutes || 0) : 0;

    // Data de criação do colaborador, para o frontend não contar faltas antes da conta existir
    const userCreatedAt = await getUserCreatedAt(userId);

    const registos = snapshot.docs.map((doc) => {
      const data = doc.data();
      const dataFormatada = data.timestamp.toDate().toISOString().split("T")[0];
      const [yyyy, mm, dd] = dataFormatada.split("-");
      const diaMesAnoFormatado = `${dd}-${mm}-${yyyy}`;

      let status = "Trabalho";
      let horaEntrada = data.horaEntrada || "-";
      let horaSaida = data.horaSaida || "-";

      // Verificar se há horas extras manuais para esta data
      const manualOvertimeForDay = manualOvertimeInfos.filter(mo => mo.date === diaMesAnoFormatado);
      const hasManualOvertime = manualOvertimeForDay.length > 0;
      const manualOvertimeTotalMinutes = manualOvertimeForDay.reduce((sum, mo) => sum + (mo.totalMinutes || 0), 0);

      if (feriasInfos.some(f => f.date === diaMesAnoFormatado)) {
        status = "Férias";
        horaEntrada = "ferias";
        horaSaida = "ferias";
      } else if (baixasInfos.some(b => b.date === diaMesAnoFormatado)) {
        status = "Baixa Médica";
        horaEntrada = "Baixa";
        horaSaida = "Baixa";
      } else if (aniversarioInfos.some(a => a.date === diaMesAnoFormatado)) {
        status = "Aniversário";
        horaEntrada = "aniversario";
        horaSaida = "aniversario";
      }

      return {
        timestamp: data.timestamp.toDate().toISOString(),
        horaEntrada,
        horaSaida,
        status,
        manualOvertime: hasManualOvertime ? `${Math.floor(manualOvertimeTotalMinutes / 60)}h ${manualOvertimeTotalMinutes % 60}m` : null,
        manualOvertimeMinutes: manualOvertimeTotalMinutes,
        manualOvertimeEntries: manualOvertimeForDay,
        manualOvertimeDescription: manualOvertimeForDay.map(mo => mo.description).join(', ')
      };
    });

    return res.status(200).json({
      registos,
      ferias: feriasInfos,
      baixas: baixasInfos,
      aniversario: aniversarioInfos,
      manualOvertime: manualOvertimeInfos,
      deductionMinutes: deductionMinutes,
      createdAt: userCreatedAt ? userCreatedAt.toISOString() : null
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getOvertimeSummary = async (req, res) => {
  try {
    const { year } = req.body;

    const { uid: userId, error: authError } = resolveTargetUid(req);
    if (authError) return res.status(403).json({ error: authError });

    const now = new Date();
    const currentYear = year || now.getFullYear();

    const registosRef = db
      .collection("registo-ponto")
      .doc(userId)
      .collection("Registos");

    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59);

    const snapshot = await registosRef
      .where("timestamp", ">=", yearStart)
      .where("timestamp", "<=", yearEnd)
      .orderBy("timestamp", "asc")
      .get();

    // Buscar deduções de horas extras
    const deductionsRef = db
      .collection("registo-ponto")
      .doc(userId)
      .collection("DeducoesHorasExtras");

    const deductionsSnapshot = await deductionsRef.get();
    const deductionsMap = {};
    let totalDeductionMinutes = 0;

    deductionsSnapshot.forEach(doc => {
      const data = doc.data();
      const monthKey = `${String(data.month).padStart(2, "0")}`;
      deductionsMap[monthKey] = data.deductionMinutes || 0;
      totalDeductionMinutes += data.deductionMinutes || 0;
    });

    const monthlyData = {};
    let totalOvertimeMinutes = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      const date = data.timestamp.toDate();
      const month = date.getMonth() + 1;
      const monthKey = `${String(month).padStart(2, "0")}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: month,
          monthName: getMonthName(month),
          totalMinutes: 0,
          overtimeMinutes: 0,
          manualOvertimeMinutes: 0,
          deductionMinutes: deductionsMap[monthKey] || 0,
          workDays: 0
        };
      }

      if (data.horaEntrada && data.horaSaida) {
        const { minutos, minutosExtras } = calcularHorasHelper(data.horaEntrada, data.horaSaida, date);
        monthlyData[monthKey].totalMinutes += minutos;
        monthlyData[monthKey].overtimeMinutes += minutosExtras;
        monthlyData[monthKey].workDays++;
        totalOvertimeMinutes += minutosExtras;
      }
    });

    // Buscar horas extras manuais
    const manualOvertimeRef = db
      .collection("registo-ponto")
      .doc(userId)
      .collection("HorasExtraManual");

    // Sem campo "timestamp" nesta subcoleção  -  filtra-se pelo ano embutido em
    // "date" (formato DD-MM-YYYY), tal como o resto dos endpoints já fazem.
    const manualOvertimeSnapshot = await manualOvertimeRef.get();

    let totalManualOvertimeMinutes = 0;

    manualOvertimeSnapshot.forEach(doc => {
      const data = doc.data();
      // Extrair mês e ano da data no formato DD-MM-YYYY
      const dateParts = data.date.split('-');
      const month = parseInt(dateParts[1]);
      const docYear = parseInt(dateParts[2]);
      if (docYear !== currentYear) return;
      const monthKey = `${String(month).padStart(2, "0")}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: month,
          monthName: getMonthName(month),
          totalMinutes: 0,
          overtimeMinutes: 0,
          manualOvertimeMinutes: 0,
          deductionMinutes: deductionsMap[monthKey] || 0,
          workDays: 0
        };
      }

      monthlyData[monthKey].manualOvertimeMinutes += data.totalMinutes || 0;
      totalManualOvertimeMinutes += data.totalMinutes || 0;
    });

    // Somar horas extras automáticas e manuais
    totalOvertimeMinutes += totalManualOvertimeMinutes;

    // Garantir que todos os meses têm deduções (mesmo que 0)
    for (let month = 1; month <= 12; month++) {
      const monthKey = `${String(month).padStart(2, "0")}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: month,
          monthName: getMonthName(month),
          totalMinutes: 0,
          overtimeMinutes: 0,
          manualOvertimeMinutes: 0,
          deductionMinutes: deductionsMap[monthKey] || 0,
          workDays: 0
        };
      } else if (!monthlyData[monthKey].deductionMinutes) {
        monthlyData[monthKey].deductionMinutes = deductionsMap[monthKey] || 0;
      }
    }

    const monthlyArray = Object.values(monthlyData)
      .filter(month => month.workDays > 0 || month.manualOvertimeMinutes > 0) // Mostrar meses com registos ou horas extras manuais
      .sort((a, b) => a.month - b.month) // Ordenar por número do mês (1=Janeiro, 2=Fevereiro, etc.)
      .map(month => {
        const totalMonthOvertimeMinutes = month.overtimeMinutes + month.manualOvertimeMinutes;
        const netOvertimeMinutes = Math.max(0, totalMonthOvertimeMinutes - month.deductionMinutes);
        return {
          ...month,
          totalHours: formatarMinutosHelper(month.totalMinutes),
          overtimeHours: formatarMinutosHelper(month.overtimeMinutes),
          manualOvertimeHours: month.manualOvertimeMinutes > 0 ? formatarMinutosHelper(month.manualOvertimeMinutes) : null,
          totalOvertimeHours: formatarMinutosHelper(totalMonthOvertimeMinutes),
          deductionHours: month.deductionMinutes > 0 ? formatarMinutosHelper(month.deductionMinutes) : null,
          netOvertimeHours: formatarMinutosHelper(netOvertimeMinutes),
          netOvertimeMinutes
        };
      });

    const totalNetOvertimeMinutes = Math.max(0, totalOvertimeMinutes - totalDeductionMinutes);

    return res.status(200).json({
      monthlyOvertime: monthlyArray,
      totalOvertimeHours: formatarMinutosHelper(totalOvertimeMinutes),
      totalDeductionHours: totalDeductionMinutes > 0 ? formatarMinutosHelper(totalDeductionMinutes) : null,
      totalNetOvertimeHours: formatarMinutosHelper(totalNetOvertimeMinutes),
      year: currentYear
    });

  } catch (error) {
    console.error("Erro ao buscar resumo de horas extras:", error);
    return res.status(500).json({ error: error.message });
  }
};

const getYearlySummary = async (req, res) => {
  try {
    const { year } = req.body;

    const { uid: userId, error: authError } = resolveTargetUid(req);
    if (authError) return res.status(403).json({ error: authError });

    const now = new Date();
    const currentYear = year || now.getFullYear();

    // Buscar a data de criação do colaborador
    const userCreatedAt = await getUserCreatedAt(userId);

    let totalFeriasAprovadas = 0;
    let totalBaixasAprovadas = 0;
    let totalFaltas = 0;

    for (let month = 1; month <= 12; month++) {
      const feriasRef = db
        .collection("registo-ponto")
        .doc(userId)
        .collection("Ferias");

      const feriasSnapshot = await feriasRef.get();

      feriasSnapshot.forEach(doc => {
        const data = doc.data();
        const dateStr = data.date;

        if (dateStr && dateStr.includes('-')) {
          const parts = dateStr.split('-');
          let docMonth, docYear;

          if (parts.length === 2) {
            docMonth = parseInt(parts[1]);
            docYear = currentYear;
          } else if (parts.length === 3) {
            if (parts[0].length === 4) {
              docYear = parseInt(parts[0]);
              docMonth = parseInt(parts[1]);
            } else {
              docMonth = parseInt(parts[1]);
              docYear = parseInt(parts[2]);
            }
          }

          if (docMonth === month && docYear === currentYear && data.Approved === true) {
            totalFeriasAprovadas++;
          }
        }
      });

      const baixasRef = db
        .collection("registo-ponto")
        .doc(userId)
        .collection("BaixasMedicas");

      const baixasSnapshot = await baixasRef.get();

      baixasSnapshot.forEach(doc => {
        const data = doc.data();
        const dateStr = data.date;

        if (dateStr && dateStr.includes('-')) {
          const parts = dateStr.split('-');
          let docMonth, docYear;

          if (parts.length === 2) {
            docMonth = parseInt(parts[1]);
            docYear = currentYear;
          } else if (parts.length === 3) {
            if (parts[0].length === 4) {
              docYear = parseInt(parts[0]);
              docMonth = parseInt(parts[1]);
            } else {
              docMonth = parseInt(parts[1]);
              docYear = parseInt(parts[2]);
            }
          }

          if (docMonth === month && docYear === currentYear && data.Approved === true) {
            totalBaixasAprovadas++;
          }
        }
      });
    }

    const registosRef = db
      .collection("registo-ponto")
      .doc(userId)
      .collection("Registos");

    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59);

    const snapshot = await registosRef
      .where("timestamp", ">=", yearStart)
      .where("timestamp", "<=", yearEnd)
      .get();

    let totalHorasEmFalta = 0; // Em minutos
    let totalDiasComFaltas = 0;

    snapshot.forEach(doc => {
      const registo = doc.data();
      const date = new Date(registo.timestamp.toDate());
      const dayOfWeek = date.getDay();
      const isDiaUtil = dayOfWeek >= 1 && dayOfWeek <= 5;

      // Verificar se a data é após a criação do colaborador
      const isAfterCreation = !userCreatedAt || date >= userCreatedAt;

      const isFeriado = registo.horaEntrada === "feriado" || registo.horaSaida === "feriado";
      const isFerias = registo.horaEntrada === "ferias" || registo.horaSaida === "ferias";
      const isBaixaMedica = registo.horaEntrada === "baixa medica" || registo.horaSaida === "baixa medica";

      if (isDiaUtil && isAfterCreation && !isFeriado && !isFerias && !isBaixaMedica) {
        // Calcular horas trabalhadas no dia
        if (registo.horaEntrada && registo.horaSaida) {
          const { minutos } = calcularHorasHelper(registo.horaEntrada, registo.horaSaida, date);
          const minutosObrigatorios = 480; // 8 horas

          if (minutos < minutosObrigatorios) {
            const minutosEmFalta = minutosObrigatorios - minutos;
            totalHorasEmFalta += minutosEmFalta;
            totalDiasComFaltas += minutosEmFalta / minutosObrigatorios; // Fração do dia
          }
        } else if (!registo.horaEntrada && !registo.horaSaida) {
          // Falta completa
          totalHorasEmFalta += 480;
          totalDiasComFaltas += 1;
        }
      }
    });

    // Arredondar dias com faltas para 2 casas decimais
    totalFaltas = Math.round(totalDiasComFaltas * 100) / 100;

    return res.status(200).json({
      year: currentYear,
      diasFerias: totalFeriasAprovadas,
      diasBaixaMedica: totalBaixasAprovadas,
      diasFalta: totalFaltas,
      horasEmFalta: formatarMinutosHelper(totalHorasEmFalta),
      minutosEmFalta: totalHorasEmFalta
    });

  } catch (error) {
    console.error("Erro ao buscar resumo anual:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Resumo de assiduidade de UM mês para um colaborador  -  usado pelo processamento
// de salários (dias trabalhados/faltas/férias/baixas deixam de ser inseridos à mão
// e passam a vir do livro de ponto). Função pura, sem req/res e sem efeitos
// secundários (não grava nada), ao contrário de processOvertimeDeduction.
async function calculateMonthlyAttendanceSummary({ uid, year, month }) {
  const userCreatedAt = await getUserCreatedAt(uid);
  const now = new Date();

  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0, 23, 59, 59);

  const registosRef = db.collection("registo-ponto").doc(uid).collection("Registos");
  const registosSnapshot = await registosRef
    .where("timestamp", ">=", firstDay)
    .where("timestamp", "<=", lastDay)
    .get();

  let diasTrabalhados = 0;
  const registoPorDia = {};
  registosSnapshot.forEach(doc => {
    const registo = doc.data();
    if (registo.horaEntrada && registo.horaSaida) diasTrabalhados++;
    registoPorDia[registo.timestamp.toDate().getDate()] = registo;
  });

  // Datas em Ferias/BaixasMedicas aparecem tanto em "DD-MM" como em "DD-MM-YYYY"
  // (ver getYearlySummary acima)  -  normalizar para {dia, mes, ano}.
  function parseDocDate(dateStr) {
    if (!dateStr || !dateStr.includes("-")) return null;
    const parts = dateStr.split("-");
    if (parts.length === 2) return { dia: parseInt(parts[0]), mes: parseInt(parts[1]), ano: null };
    if (parts[0].length === 4) return { ano: parseInt(parts[0]), mes: parseInt(parts[1]), dia: parseInt(parts[2]) };
    return { dia: parseInt(parts[0]), mes: parseInt(parts[1]), ano: parseInt(parts[2]) };
  }

  const feriasRef = db.collection("registo-ponto").doc(uid).collection("Ferias");
  const baixasRef = db.collection("registo-ponto").doc(uid).collection("BaixasMedicas");
  const aniversarioRef = db.collection("registo-ponto").doc(uid).collection("DiasAniversario");
  const [feriasSnapshot, baixasSnapshot, aniversarioSnapshot] = await Promise.all([
    feriasRef.get(),
    baixasRef.get(),
    aniversarioRef.get(),
  ]);

  let diasFerias = 0;
  const feriasDias = new Set();
  feriasSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.Approved !== true) return;
    const parsed = parseDocDate(data.date);
    if (!parsed || parsed.mes !== month || (parsed.ano !== null && parsed.ano !== year)) return;
    diasFerias++;
    feriasDias.add(parsed.dia);
  });

  let diasBaixaMedica = 0;
  const baixasDias = new Set();
  baixasSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.Approved !== true) return;
    const parsed = parseDocDate(data.date);
    if (!parsed || parsed.mes !== month || (parsed.ano !== null && parsed.ano !== year)) return;
    diasBaixaMedica++;
    baixasDias.add(parsed.dia);
  });

  // Dia de aniversário: excluído de faltas tal como férias/baixa, mas não conta
  // como "dia trabalhado" nem entra na quota de férias.
  let diasAniversario = 0;
  const aniversarioDias = new Set();
  aniversarioSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.Approved !== true) return;
    const parsed = parseDocDate(data.date);
    if (!parsed || parsed.mes !== month || (parsed.ano !== null && parsed.ano !== year)) return;
    diasAniversario++;
    aniversarioDias.add(parsed.dia);
  });

  // Feriados portugueses (Porto)  -  fixos + móveis calculados para o ano (mesma
  // lista usada em processOvertimeDeduction, abaixo).
  const holidays = [
    "01-01", "25-04", "01-05", "10-06", "15-08", "05-10",
    "01-11", "01-12", "08-12", "25-12", "24-06",
    ...getMoveableHolidays(year),
  ];

  const diasNoMes = new Date(year, month, 0).getDate();
  let diasFalta = 0;

  for (let dia = 1; dia <= diasNoMes; dia++) {
    const dataAtual = new Date(year, month - 1, dia);
    const diaSemana = dataAtual.getDay();
    if (diaSemana < 1 || diaSemana > 5) continue; // só dias úteis

    const diaString = `${String(dia).padStart(2, "0")}-${String(month).padStart(2, "0")}`;
    if (holidays.includes(diaString) || feriasDias.has(dia) || baixasDias.has(dia) || aniversarioDias.has(dia)) continue;

    const isAfterCreation = !userCreatedAt || dataAtual >= userCreatedAt;
    if (!isAfterCreation) continue;

    // Não contar falta em dias futuros (ou no próprio dia de hoje, ainda a decorrer)
    const isPast = dataAtual < now && dataAtual.toDateString() !== now.toDateString();
    if (!isPast) continue;

    // Falta = não há registo nenhum nesse dia. Um registo incompleto (ex.: entrada
    // sem saída, esqueceu-se de bater o ponto) não conta como falta  -  segue a mesma
    // regra da tabela do livro de ponto (pontoTable.jsx), onde calcularHoras devolve
    // total "-" nesse caso e por isso não entra no filtro de diasFalta.
    if (!registoPorDia[dia]) diasFalta++;
  }

  return { diasTrabalhados, diasFerias, diasBaixaMedica, diasAniversario, diasFalta };
}

// Processar deduções de horas extras baseadas em faltas
const processOvertimeDeduction = async (req, res) => {
  try {
    const { uid, month } = req.body;

    if (!uid || !month) {
      return res.status(400).json({ error: "uid e mês são obrigatórios" });
    }

    // Buscar a data de criação do colaborador
    const userCreatedAt = await getUserCreatedAt(uid);

    const now = new Date();
    const year = now.getFullYear();
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0, 23, 59, 59);

    // Buscar registos do mês
    const registosRef = db
      .collection("registo-ponto")
      .doc(uid)
      .collection("Registos");

    const snapshot = await registosRef
      .where("timestamp", ">=", firstDay)
      .where("timestamp", "<=", lastDay)
      .orderBy("timestamp", "asc")
      .get();

    // Buscar férias e baixas médicas do mês
    const feriasRef = db
      .collection("registo-ponto")
      .doc(uid)
      .collection("Ferias");

    const baixasRef = db
      .collection("registo-ponto")
      .doc(uid)
      .collection("BaixasMedicas");

    const aniversarioRef = db
      .collection("registo-ponto")
      .doc(uid)
      .collection("DiasAniversario");

    const feriasSnapshot = await feriasRef.get();
    const baixasSnapshot = await baixasRef.get();
    const aniversarioSnapshot = await aniversarioRef.get();

    // Mapear férias, baixas e dia de aniversário por data
    const feriasMap = {};
    const baixasMap = {};
    const aniversarioMap = {};

    feriasSnapshot.forEach(doc => {
      const data = doc.data();
      const dateStr = data.date;
      let key;

      if (dateStr.length === 10 && dateStr[2] === "-") {
        key = dateStr.slice(0, 5); // "DD-MM"
      } else if (dateStr.length === 10 && dateStr[4] === "-") {
        key = dateStr.slice(8, 10) + "-" + dateStr.slice(5, 7); // "DD-MM"
      } else {
        key = dateStr;
      }

      if (data.Approved === true) {
        feriasMap[key] = true;
      }
    });

    baixasSnapshot.forEach(doc => {
      const data = doc.data();
      const dateStr = data.date;
      let key;

      if (dateStr.length === 10 && dateStr[2] === "-") {
        key = dateStr.slice(0, 5); // "DD-MM"
      } else if (dateStr.length === 10 && dateStr[4] === "-") {
        key = dateStr.slice(8, 10) + "-" + dateStr.slice(5, 7); // "DD-MM"
      } else {
        key = dateStr;
      }

      if (data.Approved === true) {
        baixasMap[key] = true;
      }
    });

    aniversarioSnapshot.forEach(doc => {
      const data = doc.data();
      const dateStr = data.date;
      let key;

      if (dateStr.length === 10 && dateStr[2] === "-") {
        key = dateStr.slice(0, 5); // "DD-MM"
      } else if (dateStr.length === 10 && dateStr[4] === "-") {
        key = dateStr.slice(8, 10) + "-" + dateStr.slice(5, 7); // "DD-MM"
      } else {
        key = dateStr;
      }

      if (data.Approved === true) {
        aniversarioMap[key] = true;
      }
    });

    // Feriados portugueses (Porto)  -  fixos + móveis calculados para o ano
    const holidays = [
      "01-01", "25-04", "01-05", "10-06", "15-08", "05-10",
      "01-11", "01-12", "08-12", "25-12", "24-06",
      ...getMoveableHolidays(year),
    ];

    // Calcular faltas
    const diasNoMes = new Date(year, month, 0).getDate();
    let minutosEmFalta = 0;
    let diasFalta = 0;
    const diasDetalhe = []; // { data: "DD-MM", minutosEmFalta, tipo }

    for (let dia = 1; dia <= diasNoMes; dia++) {
      const dataAtual = new Date(year, month - 1, dia);
      const diaSemana = dataAtual.getDay();
      const diaString = `${String(dia).padStart(2, "0")}-${String(month).padStart(2, "0")}`;

      // Só considerar dias úteis (segunda a sexta)
      if (diaSemana >= 1 && diaSemana <= 5) {
        const isFeriado = holidays.includes(diaString);
        const isFerias = feriasMap[diaString];
        const isBaixaMedica = baixasMap[diaString];
        const isAniversario = aniversarioMap[diaString];

        if (!isFeriado && !isFerias && !isBaixaMedica && !isAniversario) {
          // Verificar se a data é após a criação do colaborador
          const isAfterCreation = !userCreatedAt || dataAtual >= userCreatedAt;

          if (isAfterCreation && dataAtual < new Date() && dataAtual.toDateString() !== new Date().toDateString()) {
            // Verificar se há registo para este dia e calcular horas trabalhadas
            const registosDoDia = snapshot.docs.filter(doc => {
              const registo = doc.data();
              const dataRegisto = new Date(registo.timestamp.toDate());
              return dataRegisto.getDate() === dia;
            });

            let minutosTrabalhadosNoDia = 0;
            let temRegistoCompleto = false;

            registosDoDia.forEach(doc => {
              const registo = doc.data();
              if (registo.horaEntrada && registo.horaSaida) {
                const { minutos } = calcularHorasHelper(registo.horaEntrada, registo.horaSaida, dataAtual);
                minutosTrabalhadosNoDia += minutos;
                temRegistoCompleto = true;
              }
            });

            // 8 horas = 480 minutos
            const minutosObrigatorios = 480;

            if (!temRegistoCompleto) {
              // Falta completa - deduzir 8 horas
              minutosEmFalta += minutosObrigatorios;
              diasFalta++;
              diasDetalhe.push({ data: diaString, minutosEmFalta: minutosObrigatorios });
            } else if (minutosTrabalhadosNoDia < minutosObrigatorios) {
              // Trabalhou menos que 8 horas - deduzir a diferença
              const minutosEmFaltaNoDia = minutosObrigatorios - minutosTrabalhadosNoDia;
              minutosEmFalta += minutosEmFaltaNoDia;
              diasDetalhe.push({ data: diaString, minutosEmFalta: minutosEmFaltaNoDia });

              // Contar como dia parcial em falta se for mais de 30 minutos
              if (minutosEmFaltaNoDia > 30) {
                diasFalta += minutosEmFaltaNoDia / minutosObrigatorios; // Fração do dia
              }
            }
          }
        }
      }
    }

    if (minutosEmFalta > 0) {
      // Salvar a dedução na coleção DeducoesHorasExtras
      const deductionRef = db
        .collection("registo-ponto")
        .doc(uid)
        .collection("DeducoesHorasExtras");

      const deductionId = `${year}-${String(month).padStart(2, "0")}`;

      await deductionRef.doc(deductionId).set({
        month: month,
        year: year,
        deductionMinutes: minutosEmFalta,
        deductionHours: formatarMinutosHelper(minutosEmFalta),
        diasFalta: diasFalta,
        dias: diasDetalhe,
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`[processOvertimeDeduction] Dedução salva: ${formatarMinutosHelper(minutosEmFalta)} para ${diasFalta} dias`);
    }

    return res.status(200).json({
      success: true,
      month: month,
      year: year,
      minutosEmFalta,
      deductionHours: formatarMinutosHelper(minutosEmFalta),
      diasFalta,
      dias: diasDetalhe
    });

  } catch (error) {
    console.error("[processOvertimeDeduction] Erro:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Limpar todas as deduções (função de debug)
const clearOvertimeDeductions = async (req, res) => {
  try {
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({ error: "uid é obrigatório" });
    }

    const deductionRef = db
      .collection("registo-ponto")
      .doc(uid)
      .collection("DeducoesHorasExtras");

    const snapshot = await deductionRef.get();
    let deletedCount = 0;

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
      deletedCount++;
    });

    await batch.commit();

    return res.status(200).json({
      success: true,
      deletedCount
    });

  } catch (error) {
    console.error("[clearOvertimeDeductions] Erro:", error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getUserRecords,
  getOvertimeSummary,
  getYearlySummary,
  processOvertimeDeduction,
  clearOvertimeDeductions,
  calculateMonthlyAttendanceSummary
};
