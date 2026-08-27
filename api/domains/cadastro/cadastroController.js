const admin = require("firebase-admin");
const db = require("../../shared/db/firebase").db;
const { isAdminOrHR, isAdministrador } = require("../../shared/middleware/auth");

function canAccess(req, id) {
  return req.user?.uid === id || isAdminOrHR(req.user?.nivelAcesso);
}

// Leitura: admin/RH vê qualquer colaborador; Administrador vê os colaboradores da
// sua própria entidade (nunca de outra); um colaborador comum só vê o seu próprio
// cadastro. Nunca dá direito de escrita  -  isso continua só em canAccess/canEditRestricted.
function canRead(req, id, targetEntidade) {
  return canAccess(req, id) || (isAdministrador(req.user?.nivelAcesso) && !!targetEntidade && targetEntidade === req.user?.entidade);
}

function canEditRestricted(req) {
  return isAdminOrHR(req.user?.nivelAcesso);
}

// Campos de "Contrato de trabalho" e "Estágio": só GestorRH/SuperAdmin pode alterá-los,
// mesmo que o próprio colaborador tenha acesso de escrita ao resto do seu cadastro.
const RESTRICTED_FORM_KEYS = [
  "sede", "tipo_contrato", "funcao", "situacao_contratual", "data_admissao", "data_fim_contrato",
  "cedencia_temporaria", "entidade_cedencia_temporaria", "data_inicio_cedencia", "data_fim_cedencia",
  "baixa_medica", "data_inicio_baixa_medica", "data_fim_baixa_medica",
  "funcao_estagio", "n_processo_estagio", "duracao_estagio",
  "data_inicio_estagio", "data_fim_estagio", "entidade_financiadora", "valor_apoio_entidade",
];
const RESTRICTED_DOC_KEYS = [
  "digitalizacao_contrato", "digitalizacao_contrato_cedencia",
  "digitalizacao_acordos_desvinculacao", "digitalizacao_comprovativo_baixa_medica",
  "digitalizacao_contrato_estagio", "outra_documentacao_estagio",
];

// "nome" (conta) guarda o nome curto  -  primeiro e último nome do "nome_completo" do cadastro.
function getNomeCurto(nomeCompleto) {
  const partes = (nomeCompleto || "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "";
  if (partes.length === 1) return partes[0];
  return `${partes[0]} ${partes[partes.length - 1]}`;
}

// Únicos campos que os endpoints de cadastro podem ler/escrever no documento do colaborador
// (outras funcionalidades, como o processamento de salários, guardam os seus próprios campos
// no mesmo documento  -  sem esta lista explícita, ficariam a "vazar" para dentro do cadastro).
const CADASTRO_FIELD_KEYS = [
  "nome_completo", "data_nascimento",
  "morada", "codigo_postal", "localidade", "telefone", "telefone_emergencia", "email_profissional",
  "n_cartao_cidadao", "nif", "n_seguranca_social",
  "situacao_conjugal", "irs_jovem", "percentagem_isencao", "n_titulares",
  "n_dependentes", "n_dependentes_deficientes", "declarante_deficiente", "conjuge_deficiente",
  "area_formacao", "habilitacoes", "ccp", "cv_atualizado", "ficha_dgert_atualizada",
  "sede", "tipo_contrato", "funcao", "situacao_contratual", "data_admissao", "data_fim_contrato",
  "cedencia_temporaria", "entidade_cedencia_temporaria", "data_inicio_cedencia", "data_fim_cedencia",
  "baixa_medica", "data_inicio_baixa_medica", "data_fim_baixa_medica",
  "funcao_estagio", "n_processo_estagio", "duracao_estagio",
  "data_inicio_estagio", "data_fim_estagio", "entidade_financiadora", "valor_apoio_entidade",
];

const getCadastro = async (req, res) => {
  try {
    const { id } = req.params;

    const userDoc = await db.collection("users").doc(id).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "Colaborador não encontrado" });
    }

    const data = userDoc.data();
    if (!canRead(req, id, data.entidade)) {
      return res.status(403).json({ error: "Sem permissão para consultar este cadastro" });
    }

    const form = {};
    CADASTRO_FIELD_KEYS.forEach(key => {
      if (data[key] !== undefined) form[key] = data[key];
    });

    // Histórico mensal de "Contrato de trabalho"  -  um documento por mês em users/{id}/contratoHistorico/{mes}.
    const historicoSnap = await userDoc.ref.collection("contratoHistorico").get();
    const contratoHistorico = {};
    historicoSnap.forEach(doc => { contratoHistorico[doc.id] = doc.data(); });

    // Documentos digitalizados  -  um documento por chave (ex: "digitalizacao_cc") em users/{id}/docs/{docKey}.
    const docsSnap = await userDoc.ref.collection("docs").get();
    const docs = {};
    docsSnap.forEach(doc => { docs[doc.id] = doc.data(); });

    res.json({ form, docs, contratoHistorico });
  } catch (error) {
    console.error("Erro ao buscar cadastro:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

const saveCadastro = async (req, res) => {
  try {
    const { id } = req.params;
    if (!canAccess(req, id)) {
      return res.status(403).json({ error: "Sem permissão para editar este cadastro" });
    }

    const { form, docs } = req.body;
    if (!form || typeof form !== "object") {
      return res.status(400).json({ error: "Dados de cadastro inválidos" });
    }

    const userDocRef = db.collection("users").doc(id);
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "Colaborador não encontrado" });
    }

    const privileged = canEditRestricted(req);
    const existingData = userDoc.data();

    const update = {};
    CADASTRO_FIELD_KEYS.forEach(key => {
      if (!(key in form)) return;
      if (!privileged && RESTRICTED_FORM_KEYS.includes(key)) return;
      update[key] = form[key];
    });

    const incomingDocs = docs || {};
    const existingDocsSnap = await userDocRef.collection("docs").get();
    const existingDocs = {};
    existingDocsSnap.forEach(doc => { existingDocs[doc.id] = doc.data(); });

    let finalDocs;
    if (privileged) {
      finalDocs = incomingDocs;
    } else {
      const mergedDocs = { ...incomingDocs };
      RESTRICTED_DOC_KEYS.forEach(key => {
        if (key in existingDocs) mergedDocs[key] = existingDocs[key];
        else delete mergedDocs[key];
      });
      finalDocs = mergedDocs;
    }

    let novoHistoricoMes = null;
    let novoHistoricoSnapshot = null;
    if (privileged) {
      const novoSnapshot = {};
      RESTRICTED_FORM_KEYS.forEach(key => {
        novoSnapshot[key] = key in update ? update[key] : (existingData[key] !== undefined ? existingData[key] : "");
      });

      const historicoSnap = await userDocRef.collection("contratoHistorico").get();
      const ultimoMes = historicoSnap.docs.map(doc => doc.id).sort().pop();
      const lastSnapshot = ultimoMes
        ? historicoSnap.docs.find(doc => doc.id === ultimoMes).data()
        : null;
      const changed = !lastSnapshot || RESTRICTED_FORM_KEYS.some(key => (lastSnapshot[key] ?? "") !== (novoSnapshot[key] ?? ""));

      if (changed) {
        const now = new Date();
        novoHistoricoMes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        novoHistoricoSnapshot = novoSnapshot;
      }
    }

    update.cadastroUpdatedAt = admin.firestore.FieldValue.serverTimestamp();
    update.cadastroUpdatedBy = req.user.uid;

    const nomeCurto = getNomeCurto(form.nome_completo);
    if (nomeCurto) update.nome = nomeCurto;

    await userDocRef.update(update);
    if (novoHistoricoMes) {
      await userDocRef.collection("contratoHistorico").doc(novoHistoricoMes).set(novoHistoricoSnapshot);
    }

    const docsBatch = db.batch();
    const allDocKeys = new Set([...Object.keys(existingDocs), ...Object.keys(finalDocs)]);
    allDocKeys.forEach(key => {
      const docRef = userDocRef.collection("docs").doc(key);
      if (key in finalDocs) docsBatch.set(docRef, finalDocs[key]);
      else docsBatch.delete(docRef);
    });
    if (allDocKeys.size > 0) await docsBatch.commit();

    res.json({ message: "Cadastro guardado com sucesso" });
  } catch (error) {
    console.error("Erro ao guardar cadastro:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

module.exports = { getCadastro, saveCadastro };
