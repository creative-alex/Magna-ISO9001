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
  "tipo_contrato", "role", "departamento", "situacao_contratual", "motivo_cessacao", "data_admissao", "data_fim_contrato",
  "tipo_estagio", "n_processo_estagio", "id_processo_estagio", "entidade_medida",
  "data_inicio_estagio", "data_fim_estagio", "area_funcao", "habilitacoes_estagio",
  "entidade_estagio", "orientador", "observacao_estagio",
];
// "sede" também só é editável por GestorRH/SuperAdmin, mas é um simples campo do colaborador
// (usado pelo livro de ponto/mapa de férias para saber que feriados regionais aplicar).
const RESTRICTED_KEYS = [...RESTRICTED_FORM_KEYS, "sede"];
const RESTRICTED_DOC_KEYS = [
  "digitalizacao_contrato",
  "digitalizacao_acordos_desvinculacao",
  "digitalizacao_contrato_estagio", "outra_documentacao_estagio",
];

// Cedências temporárias e baixas médicas: cada uma é uma lista de blocos independentes
// (data início/fim + PDF), por isso vivem em subcoleções (um documento por bloco) em vez
// de um campo no documento do user  -  só GestorRH/SuperAdmin pode alterá-las (ver
// canEditRestricted). "collection" é o nome da subcoleção em users/{id}/{collection}/{blocoId};
// "requestKey" é a chave correspondente no corpo do pedido (ver saveCadastro) e na resposta
// de getCadastro.
const BLOCK_COLLECTIONS = [
  { collection: "cedencias", requestKey: "cedencias" },
  { collection: "baixasMedicas", requestKey: "baixasMedicas" },
];

// Substitui o conteúdo de uma subcoleção de "blocos" pelos itens recebidos (cada um
// identificado pelo seu próprio id de documento)  -  cria/atualiza os que vieram no
// pedido e apaga os que já não constam da lista.
async function syncBlockCollection(collectionRef, items) {
  const incoming = Array.isArray(items) ? items.filter(it => it && it.id) : [];
  const existingSnap = await collectionRef.get();
  const existingIds = new Set(existingSnap.docs.map(doc => doc.id));
  const incomingIds = new Set(incoming.map(it => it.id));

  const batch = db.batch();
  let ops = 0;
  incoming.forEach(({ id, ...blocoData }) => {
    batch.set(collectionRef.doc(id), blocoData);
    ops++;
  });
  existingIds.forEach(docId => {
    if (!incomingIds.has(docId)) {
      batch.delete(collectionRef.doc(docId));
      ops++;
    }
  });
  if (ops > 0) await batch.commit();
}

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
  "nome_completo", "data_nascimento", "nacionalidade",
  "morada", "codigo_postal", "localidade", "telefone", "telefone_emergencia", "grau_parentesco_emergencia",
  "n_cartao_cidadao", "validade_cc", "nif", "n_seguranca_social",
  "situacao_conjugal", "irs_jovem", "escalao_irs_jovem", "n_titulares",
  "n_dependentes", "tem_dependentes_deficientes", "n_dependentes_deficientes", "declarante_deficiente", "IBAN",
  "area_formacao", "habilitacoes", "ccp", "cv_atualizado", "ficha_dgert_atualizada",
  "sede", "tipo_contrato", "role", "departamento", "situacao_contratual", "motivo_cessacao", "data_admissao", "data_fim_contrato",
  "tipo_estagio", "n_processo_estagio", "id_processo_estagio", "entidade_medida",
  "data_inicio_estagio", "data_fim_estagio", "area_funcao", "habilitacoes_estagio",
  "entidade_estagio", "orientador", "observacao_estagio",
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

    // Documentos digitalizados  -  um documento por chave (ex: "digitalizacao_cc") em users/{id}/docs/{docKey}.
    const docsSnap = await userDoc.ref.collection("docs").get();
    const docs = {};
    docsSnap.forEach(doc => { docs[doc.id] = doc.data(); });

    // Cedências temporárias / baixas médicas  -  cada uma numa subcoleção própria (ver BLOCK_COLLECTIONS).
    const blocks = {};
    await Promise.all(BLOCK_COLLECTIONS.map(async ({ collection, requestKey }) => {
      const snap = await userDoc.ref.collection(collection).get();
      blocks[requestKey] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }));

    // "email" não é um campo de cadastro (não entra em CADASTRO_FIELD_KEYS)  -  é o
    // email da conta, devolvido à parte só para consulta no ecrã de cadastro.
    res.json({ form, docs, ...blocks, email: data.email || null });
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

    const update = {};
    CADASTRO_FIELD_KEYS.forEach(key => {
      if (!(key in form)) return;
      if (!privileged && RESTRICTED_KEYS.includes(key)) return;
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

    update.cadastroUpdatedAt = admin.firestore.FieldValue.serverTimestamp();
    update.cadastroUpdatedBy = req.user.uid;

    const nomeCurto = getNomeCurto(form.nome_completo);
    if (nomeCurto) update.nome = nomeCurto;

    await userDocRef.update(update);

    const docsBatch = db.batch();
    const allDocKeys = new Set([...Object.keys(existingDocs), ...Object.keys(finalDocs)]);
    allDocKeys.forEach(key => {
      const docRef = userDocRef.collection("docs").doc(key);
      if (key in finalDocs) docsBatch.set(docRef, finalDocs[key]);
      else docsBatch.delete(docRef);
    });
    if (allDocKeys.size > 0) await docsBatch.commit();

    // Cedências temporárias / baixas médicas: só quem pode editar dados restritos altera
    // estas subcoleções  -  um utilizador sem privilégio pode enviá-las de volta tal como
    // as recebeu (o campo continua "só de leitura" no frontend), por isso ignoramo-las aqui.
    if (privileged) {
      await Promise.all(BLOCK_COLLECTIONS.map(({ collection, requestKey }) =>
        syncBlockCollection(userDocRef.collection(collection), req.body[requestKey])
      ));
    }

    res.json({ message: "Cadastro guardado com sucesso" });
  } catch (error) {
    console.error("Erro ao guardar cadastro:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

module.exports = { getCadastro, saveCadastro };