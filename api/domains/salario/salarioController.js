const admin = require("firebase-admin");
const db = require("../../shared/db/firebase").db;
const { calculateMonthlyAttendanceSummary } = require("../timeTracking/reportsController");
const { isAdminOrHR, isAdministrador } = require("../../shared/middleware/auth");
const { sendMail, renderEmail } = require("../../shared/services/mailer");

const bucket = admin.storage().bucket();

function canAccess(req) {
  return isAdminOrHR(req.user?.nivelAcesso);
}

// Leitura: admin/RH vê qualquer colaborador; Administrador vê os colaboradores da
// sua própria entidade; um colaborador comum só pode consultar os seus próprios
// dados (nunca editar nem enviar recibos - isso continua restrito a canAccess).
function canRead(req, id, targetEntidade) {
  return canAccess(req) || req.user?.uid === id
    || (isAdministrador(req.user?.nivelAcesso) && !!targetEntidade && targetEntidade === req.user?.entidade);
}

const MES_REGEX = /^\d{4}-\d{2}$/;

const MES_LABELS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
function getMesLabel(mes) {
  const [ano, m] = mes.split("-");
  return `${MES_LABELS[Number(m) - 1]} de ${ano}`;
}

// Campos mensais  -  cada mês é o seu próprio documento em users/{id}/salarios/{mes}.
// Nota: o valor do subsídio de alimentação e o valor/km de deslocações são iguais
// para todos e vêm de parametrosSalario  -  aqui só se guarda se a pessoa tem
// deslocações este mês e quantos km, não o valor em euros.
// Baixas, licenças, faltas, férias e dias trabalhados NÃO entram aqui: vêm sempre
// calculados a partir do livro de ponto em getSalario (ver calculateMonthlyAttendanceSummary),
// nunca são inseridos manualmente nem persistidos neste documento.
const SALARIO_MES_FIELD_KEYS = [
  "deslocacoes_ativas", "deslocacoes_km",
  "cartao_coverflex",
  "emissao_envio_recibos",
];

const getSalario = async (req, res) => {
  try {
    const { id, mes } = req.params;

    if (!MES_REGEX.test(mes)) {
      return res.status(400).json({ error: "Mês inválido (formato esperado AAAA-MM)" });
    }

    const userDocRef = db.collection("users").doc(id);
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "Colaborador não encontrado" });
    }

    const userData = userDoc.data();
    if (!canRead(req, id, userData.entidade)) {
      return res.status(403).json({ error: "Sem permissão para consultar estes dados salariais" });
    }

    const escalaoVencimento = userData.escalao_vencimento || "";
    const temIsencaoHorario = !!userData.tem_isencao_horario;

    const [mesDoc, geralDoc, escaloesDoc] = await Promise.all([
      userDocRef.collection("salarios").doc(mes).get(),
      db.collection("parametrosSalario").doc("geral").get(),
      db.collection("parametrosSalario").doc("escaloes").get(),
    ]);

    const mesData = mesDoc.exists ? mesDoc.data() : {};
    const form = {};
    SALARIO_MES_FIELD_KEYS.forEach(key => {
      if (mesData[key] !== undefined) form[key] = mesData[key];
    });

    const geral = geralDoc.exists ? geralDoc.data() : {};
    const valorSubsidioAlimentacao = geral.valor_subsidio_alimentacao ?? null;
    const valorKmDeslocacao = geral.valor_km_deslocacao ?? null;
    const escaloesData = escaloesDoc.exists ? escaloesDoc.data() : {};

    // Isenção de horário de trabalho: valor vem sempre da tabela (igual para todos
    // no mesmo escalão). Escalão I nunca tem. Escalão III/IV têm sempre. Escalão II
    // depende de um Sim/Não definido pessoa a pessoa (tem_isencao_horario).
    let valorBruto = null;
    let valorIsencao = null;
    if (escalaoVencimento) {
      const escalaoData = escaloesData[escalaoVencimento] || {};
      valorBruto = escalaoData.valor_bruto ?? null;

      if (escalaoVencimento === "I") {
        valorIsencao = null;
      } else if (escalaoVencimento === "II") {
        valorIsencao = temIsencaoHorario ? (escalaoData.valor_isencao_horario_trabalho ?? null) : null;
      } else {
        valorIsencao = escalaoData.valor_isencao_horario_trabalho ?? null;
      }
    }

    const deslocacoesAtivas = !!form.deslocacoes_ativas;
    const deslocacoesKm = Number(form.deslocacoes_km) || 0;
    const valorDeslocacoes = deslocacoesAtivas && valorKmDeslocacao != null
      ? Math.round(deslocacoesKm * valorKmDeslocacao * 100) / 100
      : null;

    // Dias trabalhados, faltas, férias e baixas médicas vêm sempre do livro de
    // ponto (registo-ponto/{id}), nunca de dados inseridos manualmente.
    const [anoStr, mesStr] = mes.split("-");
    const attendance = await calculateMonthlyAttendanceSummary({
      uid: id,
      year: Number(anoStr),
      month: Number(mesStr),
    });

    const valorSubsidioAlimentacaoPagar = valorSubsidioAlimentacao != null
      ? Math.round(attendance.diasTrabalhados * valorSubsidioAlimentacao * 100) / 100
      : null;

    res.json({
      escalao_vencimento: escalaoVencimento,
      valor_vencimento_bruto: valorBruto,
      valor_isencao_horario_trabalho: valorIsencao,
      tem_isencao_horario: temIsencaoHorario,
      valor_subsidio_alimentacao: valorSubsidioAlimentacao,
      valor_subsidio_alimentacao_pagar: valorSubsidioAlimentacaoPagar,
      valor_km_deslocacao: valorKmDeslocacao,
      valor_deslocacoes: valorDeslocacoes,
      dias_trabalhados: attendance.diasTrabalhados,
      dias_ferias: attendance.diasFerias,
      dias_baixa_medica: attendance.diasBaixaMedica,
      dias_aniversario: attendance.diasAniversario,
      dias_falta: attendance.diasFalta,
      recibo_path: mesData.recibo_path || null,
      form,
    });
  } catch (error) {
    console.error("Erro ao buscar dados salariais:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

const saveSalario = async (req, res) => {
  try {
    if (!canAccess(req)) {
      return res.status(403).json({ error: "Acesso restrito a administradores e gestores de recursos humanos" });
    }

    const { id, mes } = req.params;
    if (!MES_REGEX.test(mes)) {
      return res.status(400).json({ error: "Mês inválido (formato esperado AAAA-MM)" });
    }

    const { escalao_vencimento, tem_isencao_horario, form } = req.body;
    if (!form || typeof form !== "object") {
      return res.status(400).json({ error: "Dados inválidos" });
    }

    const userDocRef = db.collection("users").doc(id);
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "Colaborador não encontrado" });
    }

    const effectiveEscalao = escalao_vencimento || userDoc.data().escalao_vencimento || "";
    const userUpdate = {};
    if (escalao_vencimento) userUpdate.escalao_vencimento = escalao_vencimento;
    if (effectiveEscalao === "II" && tem_isencao_horario !== undefined) {
      userUpdate.tem_isencao_horario = !!tem_isencao_horario;
    }
    if (Object.keys(userUpdate).length > 0) {
      await userDocRef.update(userUpdate);
    }

    const update = {};
    SALARIO_MES_FIELD_KEYS.forEach(key => {
      if (key in form) update[key] = form[key];
    });
    update.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    update.updatedBy = req.user.uid;

    await userDocRef.collection("salarios").doc(mes).set(update, { merge: true });

    res.json({ message: "Dados salariais guardados com sucesso" });
  } catch (error) {
    console.error("Erro ao guardar dados salariais:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

const uploadRecibo = async (req, res) => {
  try {
    if (!canAccess(req)) {
      return res.status(403).json({ error: "Acesso restrito a administradores e gestores de recursos humanos" });
    }

    const { id, mes } = req.params;
    if (!MES_REGEX.test(mes)) {
      return res.status(400).json({ error: "Mês inválido (formato esperado AAAA-MM)" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Nenhum ficheiro enviado" });
    }
    if (req.file.mimetype !== "application/pdf") {
      return res.status(400).json({ error: "O recibo tem de ser um ficheiro PDF" });
    }

    const userDocRef = db.collection("users").doc(id);
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "Colaborador não encontrado" });
    }
    const userData = userDoc.data();

    const ano = mes.split("-")[0];
    const filePath = `RecibosVencimento/${id}/${ano}/${mes}.pdf`;
    await bucket.file(filePath).save(req.file.buffer, {
      metadata: { contentType: "application/pdf" },
    });

    await userDocRef.collection("salarios").doc(mes).set({
      emissao_envio_recibos: true,
      recibo_path: filePath,
      recibo_uploaded_at: admin.firestore.FieldValue.serverTimestamp(),
      recibo_uploaded_by: req.user.uid,
    }, { merge: true });

    if (userData.email) {
      const mesLabel = getMesLabel(mes);
      const nome = userData.nome || "";
      try {
        await sendMail({
          to: userData.email,
          subject: `Recibo de vencimento disponível  -  ${mesLabel}`,
          html: renderEmail("recibo-vencimento", { nome, mesLabel, eyebrow: "Recibo de vencimento" }),
        });
      } catch (mailError) {
        console.error("Erro ao enviar email de notificação de recibo:", mailError);
      }
    } else {
      console.error(`Colaborador ${id} sem email  -  notificação de recibo não enviada`);
    }

    res.json({ message: "Recibo guardado com sucesso", recibo_path: filePath });
  } catch (error) {
    console.error("Erro ao guardar recibo:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

module.exports = { getSalario, saveSalario, uploadRecibo };
