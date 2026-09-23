const admin = require("firebase-admin");
const db = admin.firestore();
const bucket = admin.storage().bucket();
const { isGestorQualidade, isSuperAdmin } = require("../../shared/middleware/auth");

// SuperAdmin é sempre a autoridade máxima do sistema e tem de conseguir manipular
// qualquer NC (preencher tratamento, marcar ações, anexar ficheiros), mesmo sem ser o
// responsável nem ter gestorQualidade=true - usado como alternativa aos vários "só o
// responsável"/"só o envolvido" abaixo (as ações de Qualidade em si já passam por
// requireGestorQualidade, que também já inclui este bypass, ver auth.js).
function ehSuperAdmin(user) {
  return isSuperAdmin(user?.nivelAcesso);
}
const { validatePdfBuffer } = require("./pdfValidation");

// Estados da NC (exatamente estes 4, nada mais):
//   registada -> para_tratamento -> tratada -> fechada
// Estados de uma ação corretiva (exatamente estes 3):
//   por_implementar -> implementada -> eficaz
// Ambos são sempre derivados/escritos pelo backend, nunca aceites do cliente.

// Único campo de classificação/gravidade da NC (campo "gravidade" no documento) - o autor
// da NC atribui o valor inicial no registo (createNaoConformidade), e a Gestora de
// Qualidade pode alterá-lo durante a catalogação (updateCatalogacao); o valor mais
// recente é sempre "a classificação atualmente válida", não existem dois campos
// separados. Mesma lista usada no frontend (RegistoNaoConformidade.jsx/estados.js).
const GRAVIDADES_VALIDAS = ["Pouco grave", "Grave", "Muito grave"];

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function handleControllerError(res, error) {
  if (error && error.status) return res.status(error.status).json({ error: error.message });
  console.error(error);
  return res.status(500).json({ error: "Erro interno do servidor" });
}

// Resolve uma lista de uids em {uid, nome}, validando que existem mesmo em users/{uid} -
// batch get único (db.getAll), nunca um .get() por uid dentro de um ciclo.
async function resolveEnvolvidos(envolvidosInput) {
  const uids = Array.isArray(envolvidosInput)
    ? [...new Set(envolvidosInput.filter((u) => typeof u === "string" && u.trim()))]
    : [];
  if (!uids.length) return [];
  const refs = uids.map((uid) => db.collection("users").doc(uid));
  const docs = await db.getAll(...refs);
  return docs
    .filter((d) => d.exists)
    .map((d) => ({ uid: d.id, nome: d.data().nome || d.data().email || d.id }));
}

async function resolveNomes(uids) {
  if (!uids.length) return new Map();
  const refs = uids.map((uid) => db.collection("users").doc(uid));
  const docs = await db.getAll(...refs);
  const map = new Map();
  docs.forEach((d) => { if (d.exists) map.set(d.id, d.data().nome || d.data().email || d.id); });
  return map;
}

async function addHistorico(docRef, { tipo, resumo, atorUid, atorNome }) {
  await docRef.collection("historico").add({
    tipo,
    resumo,
    atorUid,
    atorNome: atorNome || null,
    em: admin.firestore.FieldValue.serverTimestamp(),
  });
}

function tsToIso(ts) {
  return ts && typeof ts.toDate === "function" ? ts.toDate().toISOString() : (ts || null);
}

function serializeNC(data) {
  return {
    origem: data.origem,
    gravidade: data.gravidade,
    departamentos: data.departamentos || [],
    descricao: data.descricao,
    correcaoRealizada: data.correcaoRealizada,
    descricaoCorrecao: data.descricaoCorrecao || null,
    registadoPor: data.registadoPor,
    registadoPorUid: data.registadoPorUid,
    registadoPorEmail: data.registadoPorEmail,
    dataRegisto: tsToIso(data.dataRegisto),
    envolvidos: data.envolvidos || [],
    catalogacao: data.catalogacao ? { ...data.catalogacao, em: tsToIso(data.catalogacao.em) } : null,
    responsavelTratamentoUid: data.responsavelTratamentoUid || null,
    responsavelTratamentoNome: data.responsavelTratamentoNome || null,
    atribuidoEm: tsToIso(data.atribuidoEm),
    estado: data.estado,
    tratamento: data.tratamento ? { ...data.tratamento, submetidoEm: tsToIso(data.tratamento.submetidoEm) } : null,
    totalAcoes: data.totalAcoes || 0,
    acoesImplementadas: data.acoesImplementadas || 0,
    acoesEficazes: data.acoesEficazes || 0,
    anexos: data.anexos || [],
    fechadaEm: tsToIso(data.fechadaEm),
    fechadaPorUid: data.fechadaPorUid || null,
  };
}

function serializeAcao(data) {
  return {
    descricao: data.descricao,
    responsavelUid: data.responsavelUid,
    responsavelNome: data.responsavelNome,
    prazoImplementacao: data.prazoImplementacao,
    prazoVerificacaoEficacia: data.prazoVerificacaoEficacia,
    estado: data.estado, // "por_implementar" | "implementada" | "eficaz"
    implementadaEm: tsToIso(data.implementadaEm),
    implementadaPorUid: data.implementadaPorUid || null,
    eficaciaObservacoes: data.eficaciaObservacoes || null,
    eficazEm: tsToIso(data.eficazEm),
    eficazPorUid: data.eficazPorUid || null,
  };
}

function summarize(doc) {
  const d = doc.data();
  return {
    id: doc.id,
    origem: d.origem,
    gravidade: d.gravidade,
    descricao: d.descricao,
    dataRegisto: tsToIso(d.dataRegisto),
    estado: d.estado,
    catalogacao: d.catalogacao ? { notas: d.catalogacao.notas } : null,
    responsavelTratamentoUid: d.responsavelTratamentoUid || null,
    responsavelTratamentoNome: d.responsavelTratamentoNome || null,
    registadoPor: d.registadoPor,
    registadoPorUid: d.registadoPorUid,
    totalAcoes: d.totalAcoes || 0,
    acoesImplementadas: d.acoesImplementadas || 0,
    acoesEficazes: d.acoesEficazes || 0,
  };
}

const createNaoConformidade = async (req, res) => {
  try {
    const {
      origem, gravidade, departamentos, descricao, correcaoRealizada, descricaoCorrecao,
      registadoPor, envolvidos,
    } = req.body;

    if (!origem || !gravidade || !descricao || !correcaoRealizada || !registadoPor) {
      return res.status(400).json({ error: "Preencha todos os campos obrigatórios." });
    }
    if (correcaoRealizada === "Sim" && !descricaoCorrecao) {
      return res.status(400).json({ error: "Descreva as correções efetuadas." });
    }

    const envolvidosLimpos = await resolveEnvolvidos(envolvidos);
    // Quem regista fica sempre como pessoa envolvida - todos os colaboradores já podem
    // consultar qualquer NC (ver listNaoConformidades/getNaoConformidade), mas só quem é
    // envolvido/responsável pode ser escolhido como responsável por uma ação corretiva
    // (ver submitTratamento). Nunca fica responsável pela NC automaticamente por isto.
    if (!envolvidosLimpos.some((e) => e.uid === req.user.uid)) {
      envolvidosLimpos.push({ uid: req.user.uid, nome: req.user.nome || req.user.email });
    }

    const docRef = db.collection("nao-conformidades").doc();
    await docRef.set({
      origem,
      gravidade,
      departamentos: Array.isArray(departamentos) ? departamentos : [],
      descricao,
      correcaoRealizada,
      descricaoCorrecao: correcaoRealizada === "Sim" ? descricaoCorrecao : null,
      registadoPor,
      registadoPorUid: req.user.uid,
      registadoPorEmail: req.user.email,
      dataRegisto: admin.firestore.FieldValue.serverTimestamp(),
      envolvidos: envolvidosLimpos,
      envolvidosUids: envolvidosLimpos.map((e) => e.uid),
      catalogacao: null,
      responsavelTratamentoUid: null,
      responsavelTratamentoNome: null,
      atribuidoPorUid: null,
      atribuidoEm: null,
      estado: "registada",
      tratamento: null,
      totalAcoes: 0,
      acoesImplementadas: 0,
      acoesEficazes: 0,
      anexos: [],
      fechadaEm: null,
      fechadaPorUid: null,
    });
    await addHistorico(docRef, {
      tipo: "criacao",
      resumo: "Não conformidade registada",
      atorUid: req.user.uid,
      atorNome: req.user.nome || req.user.email,
    });

    return res.status(201).json({ id: docRef.id });
  } catch (error) {
    console.error("Erro ao criar não conformidade:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// Qualquer colaborador autenticado pode consultar todas as NC (opcionalmente filtradas
// por estado) - a restrição não é de leitura, é de interação: catalogar/atribuir/fechar
// continua exclusivo de quem tem gestorQualidade=true (requireGestorQualidade nas rotas
// respetivas), preencher o tratamento continua exclusivo do responsável pela NC
// (submitTratamento), e marcar uma ação como implementada continua exclusivo do
// responsável por essa ação (marcarAcaoImplementada). Um único orderBy sem "where" nunca
// precisa de índice composto; só o filtro por estado precisa.
const listNaoConformidades = async (req, res) => {
  try {
    const estadoFiltro = typeof req.query.estado === "string" && req.query.estado ? req.query.estado : null;
    let query = db.collection("nao-conformidades").orderBy("dataRegisto", "desc");
    if (estadoFiltro) {
      query = db.collection("nao-conformidades").where("estado", "==", estadoFiltro).orderBy("dataRegisto", "desc");
    }
    const snapshot = await query.get();

    return res.json(snapshot.docs.map(summarize));
  } catch (error) {
    console.error("Erro ao listar não conformidades:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// 1 leitura do documento + 1 leitura da subcoleção de ações (sem N+1). Consulta aberta a
// qualquer colaborador autenticado - ver nota em listNaoConformidades sobre o que
// continua restrito.
const getNaoConformidade = async (req, res) => {
  try {
    const docRef = db.collection("nao-conformidades").doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Não conformidade não encontrada." });
    const data = doc.data();

    const acoesSnap = await docRef.collection("acoes").orderBy("prazoImplementacao", "asc").get();
    const acoes = acoesSnap.docs.map((d) => ({ id: d.id, ...serializeAcao(d.data()) }));

    return res.json({ id: doc.id, ...serializeNC(data), acoes });
  } catch (error) {
    console.error("Erro ao obter não conformidade:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// Só Gestor(a) de Qualidade (requireGestorQualidade na rota). A catalogação por si só não
// muda o estado da NC (só existem os 4 estados definidos - ver topo do ficheiro); quem faz
// a NC avançar de "registada" para "para_tratamento" é a atribuição do responsável (ver
// updateResponsavel). Pode também atualizar a lista de pessoas envolvidas nesta fase.
const updateCatalogacao = async (req, res) => {
  try {
    const docRef = db.collection("nao-conformidades").doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Não conformidade não encontrada." });
    const data = doc.data();

    // "categoria" saiu do fluxo ativo de catalogação (fica comentado, não apagado, para o
    // caso de vir a ser reutilizado) - const { categoria, classificacao, notas, envolvidos } = req.body;
    const { notas, gravidade, envolvidos } = req.body;
    const updates = {
      catalogacao: {
        // categoria: categoria || null,
        notas: notas || null,
        atorUid: req.user.uid,
        em: admin.firestore.FieldValue.serverTimestamp(),
      },
    };

    // "gravidade" é o único campo de classificação (ver nota em GRAVIDADES_VALIDAS) - a
    // Gestora de Qualidade pode rever/alterar aqui o valor inicialmente atribuído pelo
    // autor da NC; o novo valor passa a ser a classificação válida em toda a NC (badge,
    // listagem, etc., que já leem sempre o mesmo campo "gravidade").
    if (gravidade !== undefined) {
      if (!GRAVIDADES_VALIDAS.includes(gravidade)) {
        return res.status(400).json({ error: "Classificação inválida." });
      }
      if (gravidade !== data.gravidade) {
        updates.gravidade = gravidade;
        await addHistorico(docRef, {
          tipo: "classificacao",
          resumo: `Classificação alterada de "${data.gravidade || "-"}" para "${gravidade}"`,
          atorUid: req.user.uid,
          atorNome: req.user.nome || req.user.email,
        });
      }
    }

    if (envolvidos !== undefined) {
      const envolvidosLimpos = await resolveEnvolvidos(envolvidos);
      if (data.registadoPorUid && !envolvidosLimpos.some((e) => e.uid === data.registadoPorUid)) {
        envolvidosLimpos.push({ uid: data.registadoPorUid, nome: data.registadoPor });
      }
      // Nunca remover o responsável já atribuído da lista de envolvidos - ficaria sem
      // poder aceder à própria NC que lhe foi atribuída.
      if (data.responsavelTratamentoUid && !envolvidosLimpos.some((e) => e.uid === data.responsavelTratamentoUid)) {
        envolvidosLimpos.push({ uid: data.responsavelTratamentoUid, nome: data.responsavelTratamentoNome });
      }
      updates.envolvidos = envolvidosLimpos;
      updates.envolvidosUids = envolvidosLimpos.map((e) => e.uid);
    }

    await docRef.update(updates);
    await addHistorico(docRef, {
      tipo: "catalogacao",
      resumo: "Catalogação atualizada",
      atorUid: req.user.uid,
      atorNome: req.user.nome || req.user.email,
    });

    const updatedDoc = await docRef.get();
    return res.json({ id: updatedDoc.id, ...serializeNC(updatedDoc.data()) });
  } catch (error) {
    console.error("Erro ao catalogar não conformidade:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// Só Gestor(a) de Qualidade (requireGestorQualidade na rota). O responsável pela NC tem
// de ser uma pessoa envolvida - validado aqui, nunca só confiado ao frontend. É esta
// atribuição que faz a NC avançar de "registada" para "para_tratamento".
const updateResponsavel = async (req, res) => {
  try {
    const docRef = db.collection("nao-conformidades").doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Não conformidade não encontrada." });
    const data = doc.data();

    const { responsavelUid } = req.body;
    if (!responsavelUid) return res.status(400).json({ error: "responsavelUid é obrigatório." });
    if (!(data.envolvidosUids || []).includes(responsavelUid)) {
      return res.status(400).json({ error: "O responsável pela não conformidade tem de ser uma das pessoas envolvidas." });
    }

    const userDoc = await db.collection("users").doc(responsavelUid).get();
    if (!userDoc.exists) return res.status(404).json({ error: "Utilizador não encontrado." });

    const updates = {
      responsavelTratamentoUid: responsavelUid,
      responsavelTratamentoNome: userDoc.data().nome || userDoc.data().email || responsavelUid,
      atribuidoPorUid: req.user.uid,
      atribuidoEm: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (data.estado === "registada") updates.estado = "para_tratamento";

    await docRef.update(updates);
    await addHistorico(docRef, {
      tipo: "responsavel",
      resumo: `Responsável pela não conformidade definido: ${userDoc.data().nome || responsavelUid}`,
      atorUid: req.user.uid,
      atorNome: req.user.nome || req.user.email,
    });

    const updatedDoc = await docRef.get();
    return res.json({ id: updatedDoc.id, ...serializeNC(updatedDoc.data()) });
  } catch (error) {
    console.error("Erro ao atribuir responsável:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// Só o responsável pelo tratamento (nunca a Gestora de Qualidade nem envolvidos) - 403
// caso contrário. Submissão única: rejeita se já houver tratamento. Definir as ações não
// faz, por si só, a NC avançar para "tratada" - isso só acontece quando TODAS as ações
// ficarem "implementada" (ver marcarAcaoImplementada), por isso o estado da NC não muda aqui.
const submitTratamento = async (req, res) => {
  try {
    const docRef = db.collection("nao-conformidades").doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Não conformidade não encontrada." });
    const data = doc.data();

    if (data.responsavelTratamentoUid !== req.user.uid && !ehSuperAdmin(req.user)) {
      return res.status(403).json({ error: "Só o responsável pela não conformidade pode preencher o tratamento." });
    }
    if (data.tratamento) {
      return res.status(409).json({ error: "O tratamento desta não conformidade já foi submetido." });
    }

    const { descricaoAnalise, analiseCausas, outrasCorrecoes, autorAnalise, outrosEnvolvidos, acoes } = req.body;
    if (!descricaoAnalise) {
      return res.status(400).json({ error: "Descrição da não conformidade é obrigatória." });
    }
    // "Análise das causas" é uma lista de pontos, não um texto único (ver
    // AnaliseCausasEditor.jsx no frontend) - guardada como array de strings.
    const causasLimpa = Array.isArray(analiseCausas)
      ? analiseCausas.map((c) => (typeof c === "string" ? c.trim() : "")).filter(Boolean)
      : [];
    if (causasLimpa.length === 0) {
      return res.status(400).json({ error: "Indique pelo menos uma causa na análise das causas." });
    }
    if (!Array.isArray(acoes) || acoes.length === 0) {
      return res.status(400).json({ error: "Defina pelo menos uma ação corretiva." });
    }

    const envolvidosUids = data.envolvidosUids || [];
    for (const acao of acoes) {
      if (!acao.descricao || !acao.responsavelUid || !acao.prazoImplementacao || !acao.prazoVerificacaoEficacia) {
        return res.status(400).json({ error: "Cada ação corretiva precisa de descrição, responsável e prazos." });
      }
      if (!envolvidosUids.includes(acao.responsavelUid)) {
        return res.status(400).json({ error: "O responsável de cada ação corretiva tem de ser uma pessoa envolvida na não conformidade." });
      }
    }

    const nomesPorUid = await resolveNomes([...new Set(acoes.map((a) => a.responsavelUid))]);

    const batch = db.batch();
    const acoesCollection = docRef.collection("acoes");
    acoes.forEach((acao) => {
      const acaoRef = acoesCollection.doc();
      batch.set(acaoRef, {
        descricao: acao.descricao,
        responsavelUid: acao.responsavelUid,
        responsavelNome: nomesPorUid.get(acao.responsavelUid) || acao.responsavelUid,
        prazoImplementacao: acao.prazoImplementacao,
        prazoVerificacaoEficacia: acao.prazoVerificacaoEficacia,
        estado: "por_implementar",
        implementadaEm: null,
        implementadaPorUid: null,
        eficaciaObservacoes: null,
        eficazEm: null,
        eficazPorUid: null,
      });
    });
    batch.update(docRef, {
      tratamento: {
        descricaoAnalise,
        analiseCausas: causasLimpa,
        // "outrasCorrecoes"/"autorAnalise"/"outrosEnvolvidos" saíram do fluxo ativo do
        // questionário (ver campos comentados em NaoConformidadeDetail.jsx) - continuam
        // aceites aqui (não removidos do modelo de dados), só deixam de ser preenchidos
        // enquanto os campos estiverem desativados no frontend.
        outrasCorrecoes: outrasCorrecoes || null,
        autorAnalise: autorAnalise || null,
        outrosEnvolvidos: outrosEnvolvidos || null,
        preenchidoPorUid: req.user.uid,
        submetidoEm: admin.firestore.FieldValue.serverTimestamp(),
      },
      totalAcoes: acoes.length,
    });
    await batch.commit();

    await addHistorico(docRef, {
      tipo: "tratamento",
      resumo: `Tratamento submetido com ${acoes.length} ação(ões) corretiva(s)`,
      atorUid: req.user.uid,
      atorNome: req.user.nome || req.user.email,
    });

    const updatedDoc = await docRef.get();
    const acoesSnap = await acoesCollection.get();
    return res.json({
      id: updatedDoc.id,
      ...serializeNC(updatedDoc.data()),
      acoes: acoesSnap.docs.map((d) => ({ id: d.id, ...serializeAcao(d.data()) })),
    });
  } catch (error) {
    console.error("Erro ao submeter tratamento:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// Só o responsável pela própria ação. Quando esta é a última ação por implementar da NC,
// a NC avança automaticamente de "para_tratamento" para "tratada" (ver regra de
// transição no topo do ficheiro) - nunca antes disso.
const marcarAcaoImplementada = async (req, res) => {
  const { id, acaoId } = req.params;
  const docRef = db.collection("nao-conformidades").doc(id);
  const acaoRef = docRef.collection("acoes").doc(acaoId);
  try {
    await db.runTransaction(async (tx) => {
      const [ncSnap, acaoSnap] = await Promise.all([tx.get(docRef), tx.get(acaoRef)]);
      if (!ncSnap.exists) throw httpError(404, "Não conformidade não encontrada.");
      if (!acaoSnap.exists) throw httpError(404, "Ação corretiva não encontrada.");
      const acao = acaoSnap.data();
      if (acao.responsavelUid !== req.user.uid && !ehSuperAdmin(req.user)) throw httpError(403, "Só o responsável por esta ação a pode marcar como implementada.");
      if (acao.estado !== "por_implementar") throw httpError(409, "Esta ação já está marcada como implementada.");

      tx.update(acaoRef, {
        estado: "implementada",
        implementadaEm: admin.firestore.FieldValue.serverTimestamp(),
        implementadaPorUid: req.user.uid,
      });
      const ncData = ncSnap.data();
      const novasImplementadas = (ncData.acoesImplementadas || 0) + 1;
      const updates = { acoesImplementadas: novasImplementadas };
      if (novasImplementadas >= (ncData.totalAcoes || 0) && ncData.estado === "para_tratamento") {
        updates.estado = "tratada";
      }
      tx.update(docRef, updates);
    });
    await addHistorico(docRef, {
      tipo: "acao_implementada",
      resumo: "Ação corretiva marcada como implementada",
      atorUid: req.user.uid,
      atorNome: req.user.nome || req.user.email,
    });
    return res.json({ ok: true });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// Só Gestor(a) de Qualidade (requireGestorQualidade na rota), e só depois de a ação estar
// implementada - é uma etapa formal e distinta da implementação (ver secção 11 do pedido).
// Quando esta é a última ação da NC a ficar eficaz, a NC fecha-se automaticamente aqui
// mesmo (mesmo critério de fecharNaoConformidade, que fica só como salvaguarda/fecho
// manual para registos antigos que já estivessem "tratada" com tudo eficaz).
const verificarEficaciaAcao = async (req, res) => {
  const { id, acaoId } = req.params;
  const { observacoes } = req.body;
  const docRef = db.collection("nao-conformidades").doc(id);
  const acaoRef = docRef.collection("acoes").doc(acaoId);
  let fechouAutomaticamente = false;
  try {
    await db.runTransaction(async (tx) => {
      const [ncSnap, acaoSnap] = await Promise.all([tx.get(docRef), tx.get(acaoRef)]);
      if (!ncSnap.exists) throw httpError(404, "Não conformidade não encontrada.");
      if (!acaoSnap.exists) throw httpError(404, "Ação corretiva não encontrada.");
      const acao = acaoSnap.data();
      if (acao.estado === "por_implementar") throw httpError(409, "A ação ainda não foi marcada como implementada.");
      if (acao.estado === "eficaz") throw httpError(409, "A eficácia desta ação já foi verificada.");

      tx.update(acaoRef, {
        estado: "eficaz",
        eficaciaObservacoes: observacoes || null,
        eficazEm: admin.firestore.FieldValue.serverTimestamp(),
        eficazPorUid: req.user.uid,
      });

      const ncData = ncSnap.data();
      const novasEficazes = (ncData.acoesEficazes || 0) + 1;
      const updates = { acoesEficazes: novasEficazes };

      const total = ncData.totalAcoes || 0;
      if (total > 0 && novasEficazes >= total && ncData.estado === "tratada") {
        updates.estado = "fechada";
        updates.fechadaEm = admin.firestore.FieldValue.serverTimestamp();
        updates.fechadaPorUid = req.user.uid;
        fechouAutomaticamente = true;
      }
      tx.update(docRef, updates);
    });
    await addHistorico(docRef, {
      tipo: "eficacia_verificada",
      resumo: "Ação corretiva validada como eficaz",
      atorUid: req.user.uid,
      atorNome: req.user.nome || req.user.email,
    });
    if (fechouAutomaticamente) {
      await addHistorico(docRef, {
        tipo: "fecho",
        resumo: "Não conformidade fechada automaticamente - todas as ações corretivas validadas como eficazes",
        atorUid: req.user.uid,
        atorNome: req.user.nome || req.user.email,
      });
    }
    return res.json({ ok: true, fechouAutomaticamente });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// Só Gestor(a) de Qualidade (requireGestorQualidade na rota). O backend é sempre a
// autoridade final: só fecha quando a NC já está "tratada" (todas as ações implementadas)
// e TODAS as ações estão "eficaz" - nunca confiar num pedido de fecho vindo só do frontend.
const fecharNaoConformidade = async (req, res) => {
  const docRef = db.collection("nao-conformidades").doc(req.params.id);
  try {
    await db.runTransaction(async (tx) => {
      const ncSnap = await tx.get(docRef);
      if (!ncSnap.exists) throw httpError(404, "Não conformidade não encontrada.");
      const data = ncSnap.data();
      if (data.estado === "fechada") throw httpError(409, "Esta não conformidade já está fechada.");
      if (data.estado !== "tratada") throw httpError(409, "Existem ações corretivas ainda por implementar.");
      const total = data.totalAcoes || 0;
      const eficazes = data.acoesEficazes || 0;
      if (total === 0 || eficazes < total) {
        throw httpError(409, "Existem ações corretivas por verificar formalmente.");
      }
      tx.update(docRef, {
        estado: "fechada",
        fechadaEm: admin.firestore.FieldValue.serverTimestamp(),
        fechadaPorUid: req.user.uid,
      });
    });
    await addHistorico(docRef, {
      tipo: "fecho",
      resumo: "Não conformidade fechada definitivamente",
      atorUid: req.user.uid,
      atorNome: req.user.nome || req.user.email,
    });
    return res.json({ ok: true });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// Anexos PDF: registante, responsável pelo tratamento ou Gestor(a) de Qualidade. Nunca
// confia na extensão - valida o conteúdo real do ficheiro (ver pdfValidation.js). Nunca
// guardado publicamente; só acessível via downloadAnexo (com a mesma autorização de
// leitura da NC).
const uploadAnexo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Nenhum ficheiro enviado." });
    const docRef = db.collection("nao-conformidades").doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Não conformidade não encontrada." });
    const data = doc.data();

    const podeAnexar = isGestorQualidade(req.user)
      || ehSuperAdmin(req.user)
      || data.registadoPorUid === req.user.uid
      || data.responsavelTratamentoUid === req.user.uid;
    if (!podeAnexar) return res.status(403).json({ error: "Sem permissão para anexar ficheiros a esta não conformidade." });

    const erro = await validatePdfBuffer(req.file.buffer);
    if (erro) return res.status(400).json({ error: erro });

    const nomeOriginal = Buffer.from(req.file.originalname, "latin1").toString("utf8");
    const nomeSanitizado = nomeOriginal.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `NaoConformidades/${docRef.id}/${Date.now()}_${nomeSanitizado}`;

    await bucket.file(filePath).save(req.file.buffer, { metadata: { contentType: "application/pdf" } });

    const anexo = {
      nome: nomeOriginal,
      path: filePath,
      tamanho: req.file.buffer.length,
      tipo: "application/pdf",
      uploadedByUid: req.user.uid,
      uploadedEm: new Date().toISOString(),
    };
    await docRef.update({ anexos: admin.firestore.FieldValue.arrayUnion(anexo) });
    await addHistorico(docRef, {
      tipo: "anexo",
      resumo: `Anexo adicionado: ${nomeOriginal}`,
      atorUid: req.user.uid,
      atorNome: req.user.nome || req.user.email,
    });

    return res.status(201).json({ anexo });
  } catch (error) {
    console.error("Erro ao anexar ficheiro:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// Consulta aberta a qualquer colaborador autenticado, tal como o resto da NC (ver
// listNaoConformidades) - só o upload (uploadAnexo, acima) continua restrito.
const downloadAnexo = async (req, res) => {
  try {
    const docRef = db.collection("nao-conformidades").doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Não conformidade não encontrada." });
    const data = doc.data();

    const index = parseInt(req.params.index, 10);
    const anexo = (data.anexos || [])[index];
    if (!anexo) return res.status(404).json({ error: "Anexo não encontrado." });

    const file = bucket.file(anexo.path);
    const [exists] = await file.exists();
    if (!exists) return res.status(404).json({ error: "Ficheiro não encontrado." });

    const [buffer] = await file.download();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(anexo.nome)}"`);
    res.send(buffer);
  } catch (error) {
    console.error("Erro ao descarregar anexo:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// Apagar é irreversível e reservado ao SuperAdmin (ver requireAdmin na rota) - nem a
// Gestora de Qualidade nem o responsável pela NC o podem fazer. Remove também a
// subcoleção (ações, histórico) e os anexos no Storage, para não deixar dados órfãos.
const deleteNaoConformidade = async (req, res) => {
  try {
    const docRef = db.collection("nao-conformidades").doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Não conformidade não encontrada." });

    try {
      await bucket.deleteFiles({ prefix: `NaoConformidades/${docRef.id}/` });
    } catch (err) {
      console.error("Erro ao apagar anexos da não conformidade:", err);
    }
    await db.recursiveDelete(docRef);

    return res.json({ ok: true });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

module.exports = {
  createNaoConformidade,
  listNaoConformidades,
  getNaoConformidade,
  updateCatalogacao,
  updateResponsavel,
  submitTratamento,
  marcarAcaoImplementada,
  verificarEficaciaAcao,
  fecharNaoConformidade,
  uploadAnexo,
  downloadAnexo,
  deleteNaoConformidade,
};
