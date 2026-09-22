const admin = require("firebase-admin");
const db = admin.firestore();
const { resolveTargetUid } = require("../timeTracking/helpers");
const { calcularDistanciaKm } = require("../../shared/services/googleRoutes");
const { isAdminOrHR, isGestorFinanceiro } = require("../../shared/middleware/auth");
const { isMonthClosed, MENSAGEM_MES_FECHADO } = require("../../shared/lib/monthLock");

const MES_REGEX = /^\d{4}-\d{2}$/;
const DATA_REGEX = /^(\d{2})-(\d{2})-(\d{4})$/;

// Mesma convenção de ID "registo_DDMMAAAA" usada em Ferias/registos do livro de ponto,
// com um sufixo (_2, _3, ...) quando já existe uma deslocação nesse dia - ao contrário de
// Ferias (no máximo 1/dia), uma deslocação pode ter mais do que uma no mesmo dia (ex.:
// duas viagens diferentes), por isso o ID sozinho não pode assumir unicidade por dia.
async function gerarRefDeslocacao(colRef, dia, mesNum, ano) {
  const base = `registo_${dia}${mesNum}${ano}`;
  let ref = colRef.doc(base);
  if (!(await ref.get()).exists) return ref;

  let n = 2;
  while (true) {
    ref = colRef.doc(`${base}_${n}`);
    if (!(await ref.get()).exists) return ref;
    n++;
  }
}

// Regista uma deslocação (Data/Motivo/Origem/Destino), com km/valor sempre calculados no
// servidor (nunca confia num km vindo do cliente). Ao contrário de Ferias/BaixasMedicas/
// AjustesPendentes, começa SEMPRE com Approved:false, seja quem for a criar (mesmo um
// admin em nome de outro colaborador) - só approveDeslocacao (ação explícita da GestorRH)
// muda isto, ver Modelo de dados no plano.
const createDeslocacao = async (req, res) => {
  try {
    const { mes, data, motivo, origem, destino, idaEVolta } = req.body;
    if (!MES_REGEX.test(mes || "")) {
      return res.status(400).json({ error: "Mês inválido (formato esperado AAAA-MM)" });
    }
    if (!data || !motivo || !origem || !destino) {
      return res.status(400).json({ error: "Faltam campos obrigatórios: data, motivo, origem e/ou destino" });
    }

    // A data (DD-MM-AAAA) tem de pertencer ao mês indicado - o <input type="date"> do
    // modal já limita isto com min/max, mas nunca se confia só na validação do cliente.
    const dataMatch = data.match(DATA_REGEX);
    if (!dataMatch || `${dataMatch[3]}-${dataMatch[2]}` !== mes) {
      return res.status(400).json({ error: "A data da deslocação tem de pertencer ao mês indicado" });
    }

    const { uid: userId, error: authError } = await resolveTargetUid(req);
    if (authError) return res.status(403).json({ error: authError });

    // O próprio colaborador não pode registar deslocações num mês já fechado (ver
    // api/shared/lib/monthLock.js); um admin/RH em nome de alguém continua a poder, como
    // correção - mesma regra de createVacation.
    const isSelf = userId === req.user.uid;
    if (isSelf && await isMonthClosed(userId, data)) {
      return res.status(403).json({ error: MENSAGEM_MES_FECHADO });
    }

    // Ida e volta no mesmo dia (A -> B -> A): um único pedido à Routes API para a distância
    // de ida, depois duplicada aqui - nunca se pede à API o trajeto de volta em separado
    // (mesmo troço ao contrário), para não duplicar consumo/custo por nada.
    const kmIda = await calcularDistanciaKm(origem, destino);
    const km = idaEVolta ? Math.round(kmIda * 2 * 10) / 10 : kmIda;

    const geralDoc = await db.collection("parametrosSalario").doc("geral").get();
    const valorKm = geralDoc.exists ? (geralDoc.data().valor_km_deslocacao ?? null) : null;
    const valor = valorKm != null ? Math.round(km * valorKm * 100) / 100 : null;

    const deslocacoesRef = db.collection("users").doc(userId).collection("deslocacoes");
    const deslocacaoRef = await gerarRefDeslocacao(deslocacoesRef, dataMatch[1], dataMatch[2], dataMatch[3]);
    await deslocacaoRef.set({
      mes,
      data,
      motivo,
      origem,
      destino,
      idaEVolta: !!idaEVolta,
      km,
      valorKm,
      valor,
      Approved: false,
      createdBy: req.user.uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(201).json({
      message: "Deslocação registada com sucesso, aguarda aprovação",
      deslocacao: { id: deslocacaoRef.id, mes, data, motivo, origem, destino, idaEVolta: !!idaEVolta, km, valor, Approved: false },
    });
  } catch (error) {
    console.error("Erro ao registar deslocação:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Deslocações de um mês (aprovadas e pendentes) - usado para mostrar a lista já registada
// ao reabrir o modal de Fecho Mensal.
const listDeslocacoes = async (req, res) => {
  try {
    const { mes } = req.body;
    if (!MES_REGEX.test(mes || "")) {
      return res.status(400).json({ error: "Mês inválido (formato esperado AAAA-MM)" });
    }

    const { uid: userId, error: authError } = await resolveTargetUid(req);
    if (authError) return res.status(403).json({ error: authError });

    const snapshot = await db.collection("users").doc(userId).collection("deslocacoes")
      .where("mes", "==", mes)
      .get();

    const deslocacoes = [];
    snapshot.forEach(doc => {
      const d = doc.data();
      deslocacoes.push({
        id: doc.id, data: d.data, motivo: d.motivo, origem: d.origem, destino: d.destino,
        idaEVolta: !!d.idaEVolta, km: d.km, valor: d.valor, Approved: !!d.Approved,
      });
    });

    const toDate = (str) => {
      const [d, m, y] = str.split("-").map(Number);
      return new Date(y, m - 1, d);
    };
    deslocacoes.sort((a, b) => toDate(a.data) - toDate(b.data));

    return res.status(200).json({ deslocacoes });
  } catch (error) {
    console.error("Erro ao listar deslocações:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Todas as deslocações pendentes de um colaborador (sem filtrar por mês, mesma convenção
// de getPendingVacations/getPendingTimeEdits) - usado na secção "Deslocações Pendentes" em
// UserDetails.jsx/userStats.jsx.
const getPendingDeslocacoes = async (req, res) => {
  try {
    const { uid } = req.body;
    if (!uid) {
      return res.status(400).json({ error: "uid do colaborador é obrigatório" });
    }

    const snapshot = await db.collection("users").doc(uid).collection("deslocacoes")
      .where("Approved", "==", false)
      .get();

    const pendentes = [];
    snapshot.forEach(doc => {
      const d = doc.data();
      pendentes.push({
        id: doc.id, mes: d.mes, data: d.data, motivo: d.motivo, origem: d.origem,
        destino: d.destino, idaEVolta: !!d.idaEVolta, km: d.km, valor: d.valor,
      });
    });

    return res.status(200).json({ pendentes });
  } catch (error) {
    console.error("Erro ao buscar deslocações pendentes:", error);
    return res.status(500).json({ error: error.message });
  }
};

const approveDeslocacao = async (req, res) => {
  try {
    const { uid, id } = req.body;
    if (!uid || !id) {
      return res.status(400).json({ error: "Faltam campos obrigatórios: uid e/ou id" });
    }

    const deslocacaoRef = db.collection("users").doc(uid).collection("deslocacoes").doc(id);
    const deslocacaoDoc = await deslocacaoRef.get();
    if (!deslocacaoDoc.exists) {
      return res.status(404).json({ error: "Deslocação não encontrada" });
    }

    await deslocacaoRef.update({
      Approved: true,
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      approvedBy: req.user.uid,
    });

    return res.status(200).json({ message: "Deslocação aprovada com sucesso" });
  } catch (error) {
    console.error("Erro ao aprovar deslocação:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Rejeitar apaga o documento - mesma convenção usada em Ferias/BaixasMedicas/
// AjustesPendentes (nunca existe um estado "Rejeitado" persistido).
const rejectDeslocacao = async (req, res) => {
  try {
    const { uid, id } = req.body;
    if (!uid || !id) {
      return res.status(400).json({ error: "Faltam campos obrigatórios: uid e/ou id" });
    }

    const deslocacaoRef = db.collection("users").doc(uid).collection("deslocacoes").doc(id);
    const deslocacaoDoc = await deslocacaoRef.get();
    if (!deslocacaoDoc.exists) {
      return res.status(404).json({ error: "Deslocação não encontrada" });
    }

    await deslocacaoRef.delete();

    return res.status(200).json({ message: "Deslocação rejeitada e eliminada com sucesso" });
  } catch (error) {
    console.error("Erro ao rejeitar deslocação:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Apaga uma deslocação própria (self-service, ou em nome de outro colaborador quando quem
// chama tem permissão para isso - mesma resolveTargetUid de createDeslocacao/
// listDeslocacoes) - só enquanto ainda estiver pendente; depois de aprovada já conta para o
// vencimento e só a GestorRH a pode remover a partir daí (ver rejectDeslocacao).
const deleteDeslocacao = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: "Campo obrigatório: id" });
    }

    const { uid: userId, error: authError } = await resolveTargetUid(req);
    if (authError) return res.status(403).json({ error: authError });

    const deslocacaoRef = db.collection("users").doc(userId).collection("deslocacoes").doc(id);
    const deslocacaoDoc = await deslocacaoRef.get();
    if (!deslocacaoDoc.exists) {
      return res.status(404).json({ error: "Deslocação não encontrada" });
    }
    const deslocacaoData = deslocacaoDoc.data();
    if (deslocacaoData.Approved === true) {
      return res.status(403).json({ error: "Não é possível apagar uma deslocação já aprovada. Contacte o RH." });
    }

    // Mesma regra de createDeslocacao - o próprio não pode apagar deslocações de um mês já
    // fechado; um admin/RH em nome de alguém continua a poder.
    const isSelf = userId === req.user.uid;
    if (isSelf && await isMonthClosed(userId, deslocacaoData.data)) {
      return res.status(403).json({ error: MENSAGEM_MES_FECHADO });
    }

    await deslocacaoRef.delete();

    return res.status(200).json({ message: "Deslocação apagada com sucesso" });
  } catch (error) {
    console.error("Erro ao apagar deslocação:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Uids com pelo menos uma deslocação pendente - usado para o aviso "Quilómetros por
// validar" na lista de /salarios (ProcessamentoSalarios.jsx). Sem "where" no
// collectionGroup para não precisar de um índice novo (um where() aqui falharia com
// FAILED_PRECONDITION sem índice dedicado - ver a mesma nota em
// fetchBaixasECedenciasPorUid, api/domains/users/usersController.js); filtra-se
// Approved em memória, tal como aí.
const getUidsComDeslocacoesPendentes = async (req, res) => {
  try {
    if (!isAdminOrHR(req.user?.nivelAcesso) && !isGestorFinanceiro(req.user?.nivelAcesso)) {
      return res.status(403).json({ error: "Acesso restrito a administradores, RH ou financeiro" });
    }

    const snapshot = await db.collectionGroup("deslocacoes").get();
    const contagemPorUid = {};
    snapshot.forEach((doc) => {
      if (doc.data().Approved === false) {
        const uid = doc.ref.parent.parent.id;
        contagemPorUid[uid] = (contagemPorUid[uid] || 0) + 1;
      }
    });

    return res.status(200).json({ contagemPorUid });
  } catch (error) {
    console.error("Erro ao buscar colaboradores com deslocações pendentes:", error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createDeslocacao,
  listDeslocacoes,
  getPendingDeslocacoes,
  approveDeslocacao,
  rejectDeslocacao,
  deleteDeslocacao,
  getUidsComDeslocacoesPendentes,
};
