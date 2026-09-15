const admin = require("firebase-admin");
const db = admin.firestore();
const { resolveTargetUid } = require("../timeTracking/helpers");
const { isSuperAdmin, isAdministrador } = require("../../shared/middleware/auth");
const { calculateMonthlyAttendanceSummary } = require("../timeTracking/reportsController");
const { sendMail, renderEmail } = require("../../shared/services/mailer");

const MES_REGEX = /^\d{4}-\d{2}$/;
// Fecho mensal: email de aviso no dia 20, segundo aviso (mais urgente) no dia 24 a quem
// ainda não confirmou, confirmação possível até ao dia 25 (inclusive) - ver Contexto/Regras
// no plano. Depois disso a verificação de dia 26 (sweepUnconfirmedMonths) sinaliza quem não
// confirmou.
const CONFIRM_DEADLINE_DAY = 25;

const MES_LABELS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
function getMesLabel(mes) {
  const [ano, m] = mes.split("-");
  return `${MES_LABELS[Number(m) - 1]} de ${ano}`;
}

// Só o nome do mês, sem o ano - usado no email (ver fecho-mensal.hbs, "até ao dia 25 de
// {{mesNome}}") separado de mesLabel porque a frase completa não leva o ano aqui.
function getMesNome(mes) {
  const [, m] = mes.split("-");
  return MES_LABELS[Number(m) - 1];
}

function mesAtual() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function resumoDoSnapshot(summary) {
  return {
    diasTrabalhados: summary.diasTrabalhados,
    diasFerias: summary.diasFerias,
    diasBaixaMedica: summary.diasBaixaMedica,
    diasAniversario: summary.diasAniversario,
    diasFalta: summary.diasFalta,
    diasLicenca: summary.diasLicenca,
  };
}

// Colaboradores ativos (exclui SuperAdmin e quem já não está "Ativo" - Cessado/Suspenso/
// Reformado), tal como getColaboradoresStatusHoje em usersController.js. Sem
// "scopeToEntidade" devolve todos - usado pelo agendador (sendMonthlyClosingReminders/
// sweepUnconfirmedMonths), que não tem um "req" de um admin específico.
async function getActiveColaboradores({ scopeToEntidade } = {}) {
  const snapshot = await db.collection("users").get();
  const colaboradores = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    if (isSuperAdmin(data.nivelAcesso)) return;
    if (data.situacao_contratual && data.situacao_contratual !== "Ativo") return;
    if (scopeToEntidade && data.entidade !== scopeToEntidade) return;
    colaboradores.push({ id: doc.id, nome: data.nome || doc.id, email: data.email || null, entidade: data.entidade || null });
  });
  return colaboradores;
}

async function getFechoDoc(uid, mes) {
  const doc = await db.collection("users").doc(uid).collection("fechoMensal").doc(mes).get();
  return doc.exists ? doc.data() : null;
}

const getFechoMensal = async (req, res) => {
  try {
    const { mes } = req.body;
    if (!MES_REGEX.test(mes || "")) {
      return res.status(400).json({ error: "Mês inválido (formato esperado AAAA-MM)" });
    }

    const { uid: userId, error: authError } = await resolveTargetUid(req);
    if (authError) return res.status(403).json({ error: authError });

    const fecho = await getFechoDoc(userId, mes);
    const [ano, mesNum] = mes.split("-").map(Number);

    if (fecho?.confirmed) {
      // O summarySnapshot só guarda totais - recalcula-se o detalhe diário (mesma
      // projeção usada na confirmação) só para exibição, sem tocar no snapshot gravado.
      const confirmedAtDate = fecho.confirmedAt?.toDate?.() || null;
      const detalhe = await calculateMonthlyAttendanceSummary({
        uid: userId, year: ano, month: mesNum, assumeWorkedFrom: confirmedAtDate,
      });

      return res.status(200).json({
        mes,
        confirmed: true,
        confirmedAt: confirmedAtDate,
        confirmedBy: fecho.confirmedBy || null,
        summary: fecho.summarySnapshot || null,
        dias: detalhe.dias,
      });
    }

    // Pré-visualização "se confirmasses agora": só faz sentido para o mês corrente (um mês
    // já terminado não tem dias por vir para projetar) - ver assumeWorkedFrom em
    // calculateMonthlyAttendanceSummary.
    const assumeWorkedFrom = mes === mesAtual() ? new Date() : undefined;
    const summary = await calculateMonthlyAttendanceSummary({ uid: userId, year: ano, month: mesNum, assumeWorkedFrom });

    return res.status(200).json({
      mes,
      confirmed: false,
      flagged: !!fecho?.flaggedUnconfirmedAt,
      reminderSentAt: fecho?.reminderSentAt?.toDate?.() || null,
      secondReminderSentAt: fecho?.secondReminderSentAt?.toDate?.() || null,
      deadlineDay: CONFIRM_DEADLINE_DAY,
      summary: resumoDoSnapshot(summary),
      dias: summary.dias,
    });
  } catch (error) {
    console.error("Erro ao buscar fecho mensal:", error);
    return res.status(500).json({ error: error.message });
  }
};

const confirmFechoMensal = async (req, res) => {
  try {
    const { mes } = req.body;
    if (!MES_REGEX.test(mes || "")) {
      return res.status(400).json({ error: "Mês inválido (formato esperado AAAA-MM)" });
    }

    const { uid: userId, error: authError } = await resolveTargetUid(req);
    if (authError) return res.status(403).json({ error: authError });

    const [ano, mesNum] = mes.split("-").map(Number);

    // Só o próprio colaborador tem prazo (dia 25); um admin/RH/Administrador a confirmar
    // em nome de alguém (resolveTargetUid já valida essa permissão) pode fazê-lo a
    // qualquer momento - é o mecanismo de "tratamento posterior" para quem não confirmou.
    const isSelf = userId === req.user.uid;
    if (isSelf) {
      const deadline = new Date(ano, mesNum - 1, CONFIRM_DEADLINE_DAY, 23, 59, 59);
      if (new Date() > deadline) {
        return res.status(403).json({ error: "Prazo de confirmação expirado para este mês. Contacte o RH/Administração." });
      }
    }

    const confirmedAtDate = new Date();
    const summary = await calculateMonthlyAttendanceSummary({
      uid: userId, year: ano, month: mesNum, assumeWorkedFrom: confirmedAtDate,
    });

    const fechoRef = db.collection("users").doc(userId).collection("fechoMensal").doc(mes);
    await fechoRef.set({
      mes,
      confirmed: true,
      confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
      confirmedBy: req.user.uid,
      summarySnapshot: resumoDoSnapshot(summary),
      flaggedUnconfirmedAt: admin.firestore.FieldValue.delete(),
    }, { merge: true });

    return res.status(200).json({ message: "Fecho do mês confirmado com sucesso", dias: summary.dias });
  } catch (error) {
    console.error("Erro ao confirmar fecho mensal:", error);
    return res.status(500).json({ error: error.message });
  }
};

const listFechoMensalStatus = async (req, res) => {
  try {
    const { mes } = req.body;
    if (!MES_REGEX.test(mes || "")) {
      return res.status(400).json({ error: "Mês inválido (formato esperado AAAA-MM)" });
    }

    // Mesmo âmbito de visibilidade que getColaboradoresStatusHoje: Administrador só vê a
    // própria entidade, SuperAdmin/GestorRH/GestorFinanceiro veem todos.
    const scopeToEntidade = isAdministrador(req.user?.nivelAcesso) ? req.user?.entidade : null;
    const [colaboradores, entidadesSnapshot] = await Promise.all([
      getActiveColaboradores({ scopeToEntidade }),
      db.collection("entidades").get(),
    ]);

    // Nome de entidade resolvido (não a referência "entidades/xyz" crua) - para o
    // agrupamento em /salarios (ver ExportFechoMensalButton/ProcessamentoSalarios.jsx)
    // usar exatamente a mesma chave que getColaboradores/ColaboradoresGroupedList.
    const entidadeNomes = {};
    entidadesSnapshot.forEach((doc) => { entidadeNomes[doc.id] = doc.data().nome || doc.id; });

    const estados = await Promise.all(colaboradores.map(async (colaborador) => {
      const fecho = await getFechoDoc(colaborador.id, mes);
      const entidadeId = colaborador.entidade ? colaborador.entidade.replace("entidades/", "") : null;
      const entidade = entidadeId ? (entidadeNomes[entidadeId] || entidadeId) : "Sem entidade";
      return {
        uid: colaborador.id,
        nome: colaborador.nome,
        email: colaborador.email,
        entidade,
        confirmed: !!fecho?.confirmed,
        confirmedAt: fecho?.confirmedAt?.toDate?.() || null,
        confirmedBy: fecho?.confirmedBy || null,
        flagged: !!fecho?.flaggedUnconfirmedAt,
        reminderSentAt: fecho?.reminderSentAt?.toDate?.() || null,
        secondReminderSentAt: fecho?.secondReminderSentAt?.toDate?.() || null,
      };
    }));

    return res.status(200).json({ mes, colaboradores: estados });
  } catch (error) {
    console.error("Erro ao listar estado do fecho mensal:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Envia (ou não, se já confirmado/sem email) o lembrete de fecho mensal a UM colaborador -
// partilhado entre os disparos em massa (sendMonthlyClosingReminders/
// sendSecondMonthlyClosingReminders, cron/QA) e o envio individual (sendReminderToUser, ver
// rota /send-reminder). "variant" escolhe o template/assunto/campo de data usados - ver
// REMINDER_VARIANTS abaixo.
async function sendReminderEmailToColaborador(colaborador, mes, variant) {
  const fechoRef = db.collection("users").doc(colaborador.id).collection("fechoMensal").doc(mes);
  const fechoDoc = await fechoRef.get();
  if (fechoDoc.exists && fechoDoc.data().confirmed === true) {
    return { sent: false, reason: "already_confirmed" };
  }
  if (!colaborador.email) {
    return { sent: false, reason: "no_email" };
  }

  const mesLabel = getMesLabel(mes);
  await sendMail({
    to: colaborador.email,
    subject: variant.subject(mesLabel),
    html: renderEmail(variant.template, { nome: colaborador.nome || "", mesLabel, mesNome: getMesNome(mes), eyebrow: "Fecho Mensal" }),
    entidade: colaborador.entidade,
  });
  await fechoRef.set({ mes, [variant.sentAtField]: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  return { sent: true };
}

const REMINDER_VARIANT = {
  template: "fecho-mensal",
  subject: (mesLabel) => `Fecho do mês — ${mesLabel}`,
  sentAtField: "reminderSentAt",
};
// Segundo aviso (dia 24, um dia antes do prazo) - só quem ainda não confirmou continua a
// receber (sendReminderEmailToColaborador já ignora quem tem confirmed:true), lembrete do
// prazo e de que dias sem ausência válida podem contar como falta se não confirmar.
const URGENT_REMINDER_VARIANT = {
  template: "fecho-mensal-urgente",
  subject: (mesLabel) => `Lembrete — confirmação dos registos de ${mesLabel}`,
  sentAtField: "secondReminderSentAt",
};

// Chamada pelo agendador (api/shared/services/scheduler.js) no dia 20 de cada mês.
async function sendMonthlyClosingReminders() {
  const mes = mesAtual();
  const colaboradores = await getActiveColaboradores();

  let enviados = 0;
  for (const colaborador of colaboradores) {
    try {
      const resultado = await sendReminderEmailToColaborador(colaborador, mes, REMINDER_VARIANT);
      if (resultado.sent) {
        enviados++;
      } else if (resultado.reason === "no_email") {
        console.error(`Colaborador ${colaborador.id} sem email - lembrete de fecho mensal não enviado`);
      }
    } catch (error) {
      console.error(`Erro ao enviar lembrete de fecho mensal a ${colaborador.id}:`, error);
    }
  }
  return enviados;
}

// Chamada pelo agendador no dia 24 de cada mês - segundo aviso, mais urgente, só a quem
// ainda não confirmou o fecho (ver REMINDER_VARIANT/URGENT_REMINDER_VARIANT acima).
async function sendSecondMonthlyClosingReminders() {
  const mes = mesAtual();
  const colaboradores = await getActiveColaboradores();

  let enviados = 0;
  for (const colaborador of colaboradores) {
    try {
      const resultado = await sendReminderEmailToColaborador(colaborador, mes, URGENT_REMINDER_VARIANT);
      if (resultado.sent) {
        enviados++;
      } else if (resultado.reason === "no_email") {
        console.error(`Colaborador ${colaborador.id} sem email - segundo lembrete de fecho mensal não enviado`);
      }
    } catch (error) {
      console.error(`Erro ao enviar segundo lembrete de fecho mensal a ${colaborador.id}:`, error);
    }
  }
  return enviados;
}

// Envio individual (botões "Enviar email"/"Enviar 2º lembrete" por colaborador em
// FechoMensalAdmin.jsx) - mesma visibilidade de listFechoMensalStatus (Administrador só à
// própria entidade). "urgent" escolhe o segundo aviso (mais urgente, ver
// URGENT_REMINDER_VARIANT) em vez do lembrete normal do dia 20.
const sendReminderToUser = async (req, res) => {
  try {
    const { uid, mes, urgent } = req.body;
    if (!uid) {
      return res.status(400).json({ error: "uid do colaborador é obrigatório" });
    }
    if (!MES_REGEX.test(mes || "")) {
      return res.status(400).json({ error: "Mês inválido (formato esperado AAAA-MM)" });
    }

    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "Colaborador não encontrado" });
    }
    const userData = userDoc.data();

    if (isAdministrador(req.user?.nivelAcesso) && userData.entidade !== req.user?.entidade) {
      return res.status(403).json({ error: "Acesso restrito a colaboradores da sua entidade" });
    }

    const colaborador = { id: uid, nome: userData.nome || uid, email: userData.email || null, entidade: userData.entidade || null };
    const variant = urgent ? URGENT_REMINDER_VARIANT : REMINDER_VARIANT;
    const resultado = await sendReminderEmailToColaborador(colaborador, mes, variant);

    if (!resultado.sent) {
      const mensagem = resultado.reason === "no_email"
        ? "Colaborador sem email associado"
        : "Este mês já está confirmado para este colaborador";
      return res.status(400).json({ error: mensagem });
    }

    return res.status(200).json({ message: urgent ? "Segundo lembrete enviado com sucesso" : "Email de fecho mensal enviado com sucesso" });
  } catch (error) {
    console.error("Erro ao enviar email individual de fecho mensal:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Chamada pelo agendador no dia 26 - sinaliza quem não confirmou até ao prazo (dia 25).
async function sweepUnconfirmedMonths() {
  const mes = mesAtual();
  const colaboradores = await getActiveColaboradores();

  let sinalizados = 0;
  for (const colaborador of colaboradores) {
    try {
      const fechoRef = db.collection("users").doc(colaborador.id).collection("fechoMensal").doc(mes);
      const fechoDoc = await fechoRef.get();
      if (fechoDoc.exists && fechoDoc.data().confirmed === true) continue;

      await fechoRef.set({ mes, flaggedUnconfirmedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      sinalizados++;
    } catch (error) {
      console.error(`Erro ao sinalizar mês não confirmado para ${colaborador.id}:`, error);
    }
  }
  return sinalizados;
}

// Disparo manual (SuperAdmin) das funções acima - úteis para QA (não dá para esperar pelo
// dia 20/24/25 em produção) e como rede de segurança se o cron falhar.
const triggerReminders = async (req, res) => {
  try {
    const enviados = await sendMonthlyClosingReminders();
    return res.status(200).json({ message: "Lembretes de fecho mensal processados", enviados });
  } catch (error) {
    console.error("Erro ao disparar lembretes de fecho mensal:", error);
    return res.status(500).json({ error: error.message });
  }
};

const triggerSecondReminders = async (req, res) => {
  try {
    const enviados = await sendSecondMonthlyClosingReminders();
    return res.status(200).json({ message: "Segundos lembretes de fecho mensal processados", enviados });
  } catch (error) {
    console.error("Erro ao disparar segundos lembretes de fecho mensal:", error);
    return res.status(500).json({ error: error.message });
  }
};

const triggerSweep = async (req, res) => {
  try {
    const sinalizados = await sweepUnconfirmedMonths();
    return res.status(200).json({ message: "Verificação de meses não confirmados processada", sinalizados });
  } catch (error) {
    console.error("Erro ao sinalizar meses não confirmados:", error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getFechoMensal,
  confirmFechoMensal,
  listFechoMensalStatus,
  sendMonthlyClosingReminders,
  sendSecondMonthlyClosingReminders,
  sweepUnconfirmedMonths,
  triggerReminders,
  triggerSecondReminders,
  triggerSweep,
  sendReminderToUser,
};
