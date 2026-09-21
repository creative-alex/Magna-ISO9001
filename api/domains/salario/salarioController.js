const admin = require("firebase-admin");
const db = require("../../shared/db/firebase").db;
const { calculateMonthlyAttendanceSummary } = require("../timeTracking/reportsController");
const { getHolidaysDDMM } = require("../timeTracking/holidays");
const { isAdminOrHR, isAdministrador, isGestorFinanceiro, isSuperAdmin, isSuperAdminOrGestorFinanceiro, entidadeNoAmbito } = require("../../shared/middleware/auth");
const { sendMail, renderEmail } = require("../../shared/services/mailer");

const bucket = admin.storage().bucket();

// Edição (guardar dados salariais / enviar recibo): exclusiva de SuperAdmin e
// Gestor Financeiro. GestorRH mantém leitura (ver canRead) mas já não edita  -
// separação de funções entre RH e Financeiro.
function canAccess(req) {
  return isSuperAdminOrGestorFinanceiro(req.user?.nivelAcesso);
}

// Leitura: admin/RH/Gestor Financeiro vê qualquer colaborador; Administrador vê os
// colaboradores da sua própria entidade; um colaborador comum só pode consultar os
// seus próprios dados (nunca editar nem enviar recibos - isso continua restrito a canAccess).
function canRead(req, id, targetEntidade) {
  return isAdminOrHR(req.user?.nivelAcesso) || isGestorFinanceiro(req.user?.nivelAcesso) || req.user?.uid === id
    || (isAdministrador(req.user?.nivelAcesso) && entidadeNoAmbito(req.user, targetEntidade));
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
    // Quando o pedido é sobre o próprio utilizador, reaproveita o documento que o
    // middleware (requireAuth) já leu, em vez de o reler.
    let userData;
    if (req.user?.uid === id && req.userDocExists) {
      userData = req.userData;
    } else {
      const userDoc = await userDocRef.get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: "Colaborador não encontrado" });
      }
      userData = userDoc.data();
    }

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
    // ponto (registo-ponto/{id}), nunca de dados inseridos manualmente  -  exceto quando o
    // colaborador já confirmou o fecho mensal desse mês, caso em que se usa o
    // summarySnapshot congelado na confirmação (ver api/domains/fechoMensal/), para uma
    // correção posterior ao livro de ponto não alterar retroativamente um mês já fechado.
    const [anoStr, mesStr] = mes.split("-");
    let attendance;
    let fechoConfirmado;
    if (isAdministrador(userData.nivelAcesso)) {
      // Administrador não participa no fluxo de fecho mensal (não recebe os emails nem
      // aparece em getActiveColaboradores, ver fechoMensalController.js) - o mês conta
      // sempre como fechado e totalmente trabalhado para efeitos de vencimento.
      attendance = {
        diasTrabalhados: countDiasUteis(Number(anoStr), Number(mesStr)),
        diasFerias: 0, diasBaixaMedica: 0, diasAniversario: 0, diasFalta: 0, diasLicenca: 0,
      };
      fechoConfirmado = true;
    } else {
      const fechoMensalDoc = await userDocRef.collection("fechoMensal").doc(mes).get();
      const fechoMensal = fechoMensalDoc.exists ? fechoMensalDoc.data() : null;
      fechoConfirmado = fechoMensal?.confirmed === true;
      attendance = fechoConfirmado
        ? fechoMensal.summarySnapshot
        : await calculateMonthlyAttendanceSummary({ uid: id, year: Number(anoStr), month: Number(mesStr) });
    }

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
      dias_licenca: attendance.diasLicenca || 0,
      fecho_confirmado: fechoConfirmado,
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
    let userData;
    if (req.user?.uid === id && req.userDocExists) {
      userData = req.userData;
    } else {
      const userDoc = await userDocRef.get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: "Colaborador não encontrado" });
      }
      userData = userDoc.data();
    }

    const effectiveEscalao = escalao_vencimento || userData.escalao_vencimento || "";
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
    let userData;
    if (req.user?.uid === id && req.userDocExists) {
      userData = req.userData;
    } else {
      const userDoc = await userDocRef.get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: "Colaborador não encontrado" });
      }
      userData = userDoc.data();
    }

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
          entidade: userData.entidade,
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

const deleteRecibo = async (req, res) => {
  try {
    if (!canAccess(req)) {
      return res.status(403).json({ error: "Acesso restrito a administradores e gestores de recursos humanos" });
    }

    const { id, mes } = req.params;
    if (!MES_REGEX.test(mes)) {
      return res.status(400).json({ error: "Mês inválido (formato esperado AAAA-MM)" });
    }

    const mesRef = db.collection("users").doc(id).collection("salarios").doc(mes);
    const mesDoc = await mesRef.get();
    if (!mesDoc.exists) {
      return res.status(404).json({ error: "Recibo não encontrado" });
    }

    const { recibo_path } = mesDoc.data();
    if (recibo_path) {
      await bucket.file(recibo_path).delete({ ignoreNotFound: true });
    }

    await mesRef.update({
      emissao_envio_recibos: false,
      recibo_path: admin.firestore.FieldValue.delete(),
      recibo_uploaded_at: admin.firestore.FieldValue.delete(),
      recibo_uploaded_by: admin.firestore.FieldValue.delete(),
    });

    res.json({ message: "Recibo removido com sucesso" });
  } catch (error) {
    console.error("Erro ao remover recibo:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// Dias úteis (segunda a sexta, sem feriados nacionais/móveis) de um mês  -  figura única
// e global para o cabeçalho do export (ver exportFechoMensal), por isso não depende da
// sede de nenhum colaborador em concreto: usa sede=null, que cai no feriado municipal por
// omissão (Porto/Gaia), mesmo comportamento de quem não tem sede definida em todo o resto
// do sistema (ver getMunicipalHolidayDDMM em holidays.js).
function countDiasUteis(year, month) {
  const holidays = getHolidaysDDMM(null, year);
  const diasNoMes = new Date(year, month, 0).getDate();
  let count = 0;
  for (let dia = 1; dia <= diasNoMes; dia++) {
    const diaSemana = new Date(year, month - 1, dia).getDay();
    if (diaSemana === 0 || diaSemana === 6) continue;
    const ddmm = `${String(dia).padStart(2, "0")}-${String(month).padStart(2, "0")}`;
    if (holidays.includes(ddmm)) continue;
    count++;
  }
  return count;
}

// Dados para o Excel de processamento de salários (ver ProcessamentoSalarios.jsx),
// agrupados por entidade  -  só inclui colaboradores cujo fecho mensal desse mês já está
// confirmado (ver api/domains/fechoMensal/), usando sempre o summarySnapshot congelado na
// confirmação, nunca um recálculo ao vivo, tal como getSalario para um mês confirmado.
const exportFechoMensal = async (req, res) => {
  try {
    if (!isAdminOrHR(req.user?.nivelAcesso) && !isGestorFinanceiro(req.user?.nivelAcesso)) {
      return res.status(403).json({ error: "Acesso restrito a administradores e gestores de recursos humanos/financeiro" });
    }

    const { mes } = req.params;
    if (!MES_REGEX.test(mes)) {
      return res.status(400).json({ error: "Mês inválido (formato esperado AAAA-MM)" });
    }
    const [anoStr, mesStr] = mes.split("-");
    const ano = Number(anoStr);
    const mesNum = Number(mesStr);

    // Nome de entidade tal como devolvido por getColaboradores/ColaboradoresGroupedList (o
    // botão por entidade em ProcessamentoSalarios.jsx só conhece o nome, nunca o id do
    // documento). Quando indicado, o export limita-se a essa entidade e garante que ela
    // aparece na resposta mesmo sem nenhum colaborador confirmado ainda - sem isto, pedir o
    // export de uma entidade só com fechos por confirmar devolvia uma lista vazia em vez do
    // cabeçalho da entidade, impedindo até pré-visualizar/testar o botão.
    const entidadeFiltro = typeof req.query.entidade === "string" && req.query.entidade ? req.query.entidade : null;

    const [usersSnapshot, entidadesSnapshot] = await Promise.all([
      db.collection("users").get(),
      db.collection("entidades").get(),
    ]);

    const entidadesInfo = {};
    entidadesSnapshot.forEach((doc) => {
      const data = doc.data();
      entidadesInfo[doc.id] = { nome: data.nome || doc.id, nif: data.nif || "" };
    });

    const entidadesMap = new Map();

    if (entidadeFiltro) {
      const entidadeInfoExistente = Object.values(entidadesInfo).find((info) => info.nome === entidadeFiltro);
      entidadesMap.set(entidadeFiltro, { nome: entidadeFiltro, nif: entidadeInfoExistente?.nif || "", colaboradores: [] });
    }

    for (const userDoc of usersSnapshot.docs) {
      const data = userDoc.data();
      if (isSuperAdmin(data.nivelAcesso)) continue;
      if (data.situacao_contratual && data.situacao_contratual !== "Ativo") continue;

      const entidadeId = data.entidade ? data.entidade.replace("entidades/", "") : null;
      const entidadeInfo = entidadeId ? entidadesInfo[entidadeId] : null;
      const entidadeKey = entidadeInfo ? entidadeInfo.nome : "Sem entidade";

      if (entidadeFiltro && entidadeKey !== entidadeFiltro) continue;

      let snapshot;
      if (isAdministrador(data.nivelAcesso)) {
        // Ver getSalario: Administrador não participa no fluxo de fecho mensal, conta
        // sempre como fechado e totalmente trabalhado, nunca fica de fora do export.
        snapshot = { diasTrabalhados: countDiasUteis(ano, mesNum), diasFerias: 0, diasBaixaMedica: 0, diasLicenca: 0 };
      } else {
        const fechoDoc = await userDoc.ref.collection("fechoMensal").doc(mes).get();
        if (!fechoDoc.exists || fechoDoc.data().confirmed !== true) continue;
        snapshot = fechoDoc.data().summarySnapshot || {};
      }

      const salarioDoc = await userDoc.ref.collection("salarios").doc(mes).get();
      const salarioData = salarioDoc.exists ? salarioDoc.data() : {};

      if (!entidadesMap.has(entidadeKey)) {
        entidadesMap.set(entidadeKey, { nome: entidadeKey, nif: entidadeInfo?.nif || "", colaboradores: [] });
      }

      const deslocacoesAtivas = !!salarioData.deslocacoes_ativas;
      entidadesMap.get(entidadeKey).colaboradores.push({
        nome: data.nome || userDoc.id,
        diasTrabalhados: snapshot.diasTrabalhados ?? 0,
        diasFerias: snapshot.diasFerias ?? 0,
        diasBaixaMedica: snapshot.diasBaixaMedica ?? 0,
        diasLicenca: snapshot.diasLicenca ?? 0,
        deslocacoesAtivas,
        deslocacoesKm: deslocacoesAtivas ? (Number(salarioData.deslocacoes_km) || 0) : 0,
      });
    }

    const entidades = Array.from(entidadesMap.values())
      .map((ent) => ({ ...ent, colaboradores: ent.colaboradores.sort((a, b) => a.nome.localeCompare(b.nome, "pt")) }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt"));

    return res.status(200).json({
      mes,
      mesLabel: getMesLabel(mes),
      diasUteis: countDiasUteis(ano, mesNum),
      entidades,
    });
  } catch (error) {
    console.error("Erro ao gerar export de fecho mensal:", error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = { getSalario, saveSalario, uploadRecibo, deleteRecibo, exportFechoMensal, getMesLabel, MES_REGEX };
