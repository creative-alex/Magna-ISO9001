const admin = require("firebase-admin");
const { resolveTargetUid } = require("./helpers");
const { getHolidaysDDMM } = require("./holidays");
const { isBlocoAtivoEm } = require("../../shared/lib/absenceBlocks");
const db = admin.firestore();

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

// Sede do colaborador (users/{uid}.sede)  -  usada para saber que feriado
// municipal aplicar no cálculo de faltas (ver ./holidays.js).
async function getUserSede(uid) {
  try {
    const userDoc = await db.collection('users').doc(uid).get();
    return userDoc.exists ? (userDoc.data().sede || null) : null;
  } catch (error) {
    console.error("Erro ao buscar sede do colaborador:", error);
    return null;
  }
}

// Situação contratual e ausências geridas no módulo de Cadastro (situacao_contratual/
// data_fim_contrato no próprio documento do colaborador, e as subcoleções
// users/{uid}/cedencias e users/{uid}/baixasMedicas  -  ver cadastroController.js).
// Distintas das coleções Ferias/BaixasMedicas do livro de ponto acima, e até agora nunca
// cruzadas com o cálculo de faltas (ver isDiaForaDeAtivo, usado em
// calculateMonthlyAttendanceSummary).
async function getUserCadastroAusencias(uid) {
  const userDoc = await db.collection("users").doc(uid).get();
  const userData = userDoc.exists ? userDoc.data() : {};

  const [cedenciasSnap, licencasSnap] = await Promise.all([
    db.collection("users").doc(uid).collection("cedencias").get(),
    db.collection("users").doc(uid).collection("baixasMedicas").get(),
  ]);

  return {
    situacaoContratual: userData.situacao_contratual || "Ativo",
    dataFimContrato: userData.data_fim_contrato || null,
    cedencias: cedenciasSnap.docs.map(doc => doc.data()),
    licencasOuBaixas: licencasSnap.docs.map(doc => doc.data()),
  };
}

// Situação contratual diferente de "Ativo" exclui o dia de contar como falta, exceto
// quando é "Cessado" com data de fim de contrato conhecida  -  nesse caso só os dias
// depois dessa data ficam de fora (antes dela o colaborador estava mesmo ativo). Sem
// essa data (ou "Suspenso"/"Reformado", que não têm campo de data próprio no cadastro),
// não há como delimitar o período, por isso o mês inteiro fica de fora por segurança.
function isDiaForaDeAtivo({ situacaoContratual, dataFimContrato }, dataIso) {
  if (situacaoContratual === "Ativo") return false;
  if (situacaoContratual === "Cessado" && dataFimContrato) return dataIso > dataFimContrato;
  return true;
}

// Saldo anual de horas extra: bruto acumulado (Registos + HorasExtraManual do ano,
// sem subtrair faltas  -  o mensal passa a não se mexer, ver compensateShortDay em
// timeTrackingController.js) menos o que já foi usado para compensar dias curtos
// (campo "horas_compensatorias", gravado no próprio Registos do dia compensado).
async function computeAnnualOvertimeBalance(uid, year) {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59);

  const registosSnapshot = await db
    .collection("registo-ponto")
    .doc(uid)
    .collection("Registos")
    .where("timestamp", ">=", yearStart)
    .where("timestamp", "<=", yearEnd)
    .get();

  let grossMinutes = 0;
  let compensatedMinutes = 0;
  registosSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.horaEntrada && data.horaSaida) {
      const { minutosExtras } = calcularHorasHelper(data.horaEntrada, data.horaSaida, data.timestamp.toDate());
      grossMinutes += minutosExtras;
    }
    compensatedMinutes += data.horas_compensatorias || 0;
  });

  const manualOvertimeSnapshot = await db
    .collection("registo-ponto")
    .doc(uid)
    .collection("HorasExtraManual")
    .get();

  manualOvertimeSnapshot.forEach(doc => {
    const data = doc.data();
    const docYear = parseInt((data.date || "").split("-")[2]);
    if (docYear === year) grossMinutes += data.totalMinutes || 0;
  });

  return { grossMinutes, compensatedMinutes, netMinutes: grossMinutes - compensatedMinutes };
}

const getUserRecords = async (req, res) => {
  try {
    const { month, year } = req.body;

    if (!month) {
      return res.status(400).json({ error: "O mês é obrigatório" });
    }

    const { uid: userId, error: authError } = await resolveTargetUid(req);
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
          const totalMinutes = data.totalMinutes || 0;
          // Registos antigos foram gravados só com totalMinutes, sem hours/minutes
          // -  derivar a partir do total em vez de assumir 0h 0m (ver ManualOvertimeModal.jsx,
          // que mostra "{entry.hours}h {entry.minutes}m").
          const hours = data.hours !== undefined && data.hours !== null ? data.hours : Math.floor(totalMinutes / 60);
          const minutes = data.minutes !== undefined && data.minutes !== null ? data.minutes : totalMinutes % 60;
          return {
            id: doc.id,
            date: data.date,
            hours,
            minutes,
            totalMinutes,
            description: data.description || "",
            startHour: data.startHour || "",
            endHour: data.endHour || ""
          };
        })
      );
    }

    // Data de criação do colaborador, para o frontend não contar faltas antes da conta existir
    const userCreatedAt = await getUserCreatedAt(userId);
    // Sede do colaborador, para o frontend saber que feriado municipal aplicar
    const sede = await getUserSede(userId);
    // Situação contratual, cedências e licenças/baixas do Cadastro, para o frontend não
    // marcar esses dias como falta (ver isDiaForaDeAtivo/getUserCadastroAusencias acima).
    const cadastroAusencias = await getUserCadastroAusencias(userId);

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
        manualOvertimeDescription: manualOvertimeForDay.map(mo => mo.description).join(', '),
        horasCompensatorias: data.horas_compensatorias || 0
      };
    });

    return res.status(200).json({
      registos,
      ferias: feriasInfos,
      baixas: baixasInfos,
      aniversario: aniversarioInfos,
      manualOvertime: manualOvertimeInfos,
      createdAt: userCreatedAt ? userCreatedAt.toISOString() : null,
      sede,
      situacaoContratual: cadastroAusencias.situacaoContratual,
      dataFimContrato: cadastroAusencias.dataFimContrato,
      cedencias: cadastroAusencias.cedencias,
      licencasOuBaixasCadastro: cadastroAusencias.licencasOuBaixas
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getOvertimeSummary = async (req, res) => {
  try {
    const { year } = req.body;

    const { uid: userId, error: authError } = await resolveTargetUid(req);
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

    const monthlyData = {};
    let totalOvertimeMinutes = 0;
    // Compensações de dias curtos usadas no ano (campo "horas_compensatorias" no
    // próprio Registos do dia)  -  descontam do saldo anual, nunca do mês.
    let totalCompensatedMinutes = 0;

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
          workDays: 0
        };
      }

      if (data.horaEntrada && data.horaSaida) {
        const { minutos, minutosExtras } = calcularHorasHelper(data.horaEntrada, data.horaSaida, date);
        // Dia compensado: soma-se o que foi coberto pelo saldo anual (o utilizador
        // escolhe quanto, pode não ser o défice todo), para que as 40h
        // semanais/mensais reflitam sempre a compensação  -  ver compensateShortDay.
        monthlyData[monthKey].totalMinutes += minutos + (data.horas_compensatorias || 0);
        monthlyData[monthKey].overtimeMinutes += minutosExtras;
        monthlyData[monthKey].workDays++;
        totalOvertimeMinutes += minutosExtras;
      }

      totalCompensatedMinutes += data.horas_compensatorias || 0;
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
          workDays: 0
        };
      }

      monthlyData[monthKey].manualOvertimeMinutes += data.totalMinutes || 0;
      totalManualOvertimeMinutes += data.totalMinutes || 0;
    });

    // Somar horas extras automáticas e manuais
    totalOvertimeMinutes += totalManualOvertimeMinutes;

    for (let month = 1; month <= 12; month++) {
      const monthKey = `${String(month).padStart(2, "0")}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: month,
          monthName: getMonthName(month),
          totalMinutes: 0,
          overtimeMinutes: 0,
          manualOvertimeMinutes: 0,
          workDays: 0
        };
      }
    }

    // O mensal é sempre bruto (nunca reduzido por faltas ou deduções  -  ver
    // compensateShortDay/computeAnnualOvertimeBalance, que descontam do anual).
    const monthlyArray = Object.values(monthlyData)
      .filter(month => month.workDays > 0 || month.manualOvertimeMinutes > 0) // Mostrar meses com registos ou horas extras manuais
      .sort((a, b) => a.month - b.month) // Ordenar por número do mês (1=Janeiro, 2=Fevereiro, etc.)
      .map(month => {
        const totalMonthOvertimeMinutes = month.overtimeMinutes + month.manualOvertimeMinutes;
        return {
          ...month,
          totalHours: formatarMinutosHelper(month.totalMinutes),
          overtimeHours: formatarMinutosHelper(month.overtimeMinutes),
          manualOvertimeHours: month.manualOvertimeMinutes > 0 ? formatarMinutosHelper(month.manualOvertimeMinutes) : null,
          totalOvertimeHours: formatarMinutosHelper(totalMonthOvertimeMinutes),
          netOvertimeHours: formatarMinutosHelper(totalMonthOvertimeMinutes),
          netOvertimeMinutes: totalMonthOvertimeMinutes
        };
      });

    const totalNetOvertimeMinutes = Math.max(0, totalOvertimeMinutes - totalCompensatedMinutes);

    return res.status(200).json({
      monthlyOvertime: monthlyArray,
      totalOvertimeHours: formatarMinutosHelper(totalOvertimeMinutes),
      totalCompensatedHours: totalCompensatedMinutes > 0 ? formatarMinutosHelper(totalCompensatedMinutes) : null,
      totalCompensatedMinutes,
      totalNetOvertimeHours: formatarMinutosHelper(totalNetOvertimeMinutes),
      totalNetOvertimeMinutes,
      year: currentYear
    });

  } catch (error) {
    console.error("Erro ao buscar resumo de horas extras:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Resumo anual de assiduidade (Faltas/Férias/Baixas Médicas) para a página de
// detalhe do colaborador. Reutiliza calculateMonthlyAttendanceSummary (mesma
// lógica usada no processamento de salários) mês a mês, para que os totais
// anuais fiquem consistentes com a tabela mensal do livro de ponto: dias
// inteiros (não frações) e feriados/férias/baixas/aniversário excluídos.
const getYearlySummary = async (req, res) => {
  try {
    const { year } = req.body;

    const { uid: userId, error: authError } = await resolveTargetUid(req);
    if (authError) return res.status(403).json({ error: authError });

    const now = new Date();
    const currentYear = year || now.getFullYear();

    let diasFerias = 0;
    let diasBaixaMedica = 0;
    let diasFalta = 0;

    for (let month = 1; month <= 12; month++) {
      const monthSummary = await calculateMonthlyAttendanceSummary({ uid: userId, year: currentYear, month });
      diasFerias += monthSummary.diasFerias;
      diasBaixaMedica += monthSummary.diasBaixaMedica;
      diasFalta += monthSummary.diasFalta;
    }

    return res.status(200).json({
      year: currentYear,
      diasFerias,
      diasBaixaMedica,
      diasFalta
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
  const [userCreatedAt, sede, cadastroAusencias] = await Promise.all([
    getUserCreatedAt(uid),
    getUserSede(uid),
    getUserCadastroAusencias(uid),
  ]);
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

  // Feriados nacionais + móveis + feriado municipal da sede do colaborador (mesma
  // lógica usada em processOvertimeDeduction, abaixo).
  const holidays = getHolidaysDDMM(sede, year);

  const diasNoMes = new Date(year, month, 0).getDate();
  let diasFalta = 0;

  for (let dia = 1; dia <= diasNoMes; dia++) {
    const dataAtual = new Date(year, month - 1, dia);
    const diaSemana = dataAtual.getDay();
    if (diaSemana < 1 || diaSemana > 5) continue; // só dias úteis

    const diaString = `${String(dia).padStart(2, "0")}-${String(month).padStart(2, "0")}`;
    if (holidays.includes(diaString) || feriasDias.has(dia) || baixasDias.has(dia) || aniversarioDias.has(dia)) continue;

    // Cedência temporária, licença/baixa médica (registada no Cadastro) ou contrato já
    // não ativo (cessado/suspenso/reformado)  -  ver getUserCadastroAusencias acima.
    const diaIso = `${year}-${String(month).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    if (isDiaForaDeAtivo(cadastroAusencias, diaIso)) continue;
    if (cadastroAusencias.cedencias.some(bloco => isBlocoAtivoEm(bloco, diaIso))) continue;
    if (cadastroAusencias.licencasOuBaixas.some(bloco => isBlocoAtivoEm(bloco, diaIso))) continue;

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

module.exports = {
  getUserRecords,
  getOvertimeSummary,
  getYearlySummary,
  calculateMonthlyAttendanceSummary,
  computeAnnualOvertimeBalance
};
