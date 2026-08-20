const admin = require("firebase-admin");
const { normalizeEntityId, normalizeUserId } = require("./helpers");
const db = admin.firestore();

// Únicos valores válidos para o nível de acesso (controla permissões). Distinto
// de "role", que é só o cargo/título mostrado (texto livre) e nunca deve ser
// usado para decidir permissões.
const NIVEIS_ACESSO = ["SuperAdmin", "GestorRH", "Colaborador"];
function normalizeNivelAcesso(nivelAcesso) {
  return NIVEIS_ACESSO.includes(nivelAcesso) ? nivelAcesso : "Colaborador";
}

const createUser = async (req, res) => {
  try {
    const { nome, email, entidade, role, nivelAcesso, temporaryPassword } = req.body;

    // Validação básica
    if (!nome || !email || !entidade || !temporaryPassword) {
      return res.status(400).json({ error: 'Nome, email, entidade e senha temporária são obrigatórios' });
    }

    // Gerar ID único
    let baseUserId = normalizeUserId(nome);
    let userId = baseUserId;
    let counter = 1;

    // Verificar colisões no Firestore
    let userDocRef = db.collection('users').doc(userId);
    let docSnapshot = await userDocRef.get();

    while (docSnapshot.exists) {
      userId = `${baseUserId}-${String(++counter).padStart(2, '0')}`;
      userDocRef = db.collection('users').doc(userId);
      docSnapshot = await userDocRef.get();
    }

    // Criar colaborador no Firebase Authentication
    let authUser;
    try {
      authUser = await admin.auth().createUser({
        uid: userId,
        email,
        password: temporaryPassword,
        displayName: nome
      });
    } catch (authError) {
      if (authError.code === 'auth/email-already-exists') {
        return res.status(409).json({ error: 'Email já está em uso' });
      }
      throw authError;
    }

    // Criar colaborador no Firestore
    try {
      const entityId = normalizeEntityId(entidade);
      const entityRef = `entidades/${entityId}`;

      await userDocRef.set({
        nome,
        email,
        entidade: entityRef,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        role: role ? normalizeUserId(role) : 'user',
        nivelAcesso: normalizeNivelAcesso(nivelAcesso),
        isFirstLogin: true
      });

      return res.status(201).json({
        message: 'colaborador criado com sucesso',
        id: userId
      });

    } catch (firestoreError) {
      // Rollback: Apagar colaborador do Auth se o Firestore falhar
      await admin.auth().deleteUser(userId);
      throw firestoreError;
    }

  } catch (error) {
    console.error('Erro no processo completo:', error);
    return res.status(500).json({ error: 'Falha na criação do colaborador' });
  }
};

const userDetails = async (req, res) => {
  try {
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({ error: "O campo uid é obrigatório." });
    }

    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User não encontrado." });
    }

    const userData = userDoc.data();

    let entidadeNome = "Desconhecida";

    if (userData.entidade && typeof userData.entidade === "string") {
      const entidadeParts = userData.entidade.split("/");

      if (entidadeParts.length === 2 && entidadeParts[0] === "entidades") {
        const entidadeId = entidadeParts[1];

        try {
          const entidadeRef = await db.collection("entidades").doc(entidadeId).get();
          if (entidadeRef.exists) {
            entidadeNome = entidadeRef.data().nome || "Desconhecida";
          }
        } catch (err) {
          console.error("⚠️ Erro ao buscar entidade:", err);
        }
      }
    }

    const userDetails = {
      uid,
      email: userData.email || "N/A",
      entidade: entidadeNome,
      nome: userData.nome || "N/A",
      role: userData.role || "N/A",
      nivelAcesso: normalizeNivelAcesso(userData.nivelAcesso),
    };

    res.json(userDetails);
  } catch (error) {
    console.error("🚨 Erro ao buscar detalhes do user:", error);
    res.status(500).json({ error: "Erro ao buscar detalhes do user." });
  }
};

const getUsersByEntity = async (req, res) => {
  try {
    const { entidadeNome } = req.body;

    if (!entidadeNome) {
      return res.status(400).json({ error: "O campo entidadeNome é obrigatório." });
    }

    const entidadeId = normalizeEntityId(entidadeNome);

    const usersRef = db.collection("users");
    const snapshot = await usersRef.where("entidade", "==", `entidades/${entidadeId}`).get();

    if (snapshot.empty) {
      return res.status(200).json([]);
    }

    const users = snapshot.docs.map(doc => {
      return {
        uid: doc.id,
        ...doc.data(),
      };
    });

    return res.status(200).json(users);
  } catch (error) {
    console.error("Erro ao buscar users por entidade:", error);
    return res.status(500).json({ error: "Erro ao buscar users." });
  }
};

const updateUserDetails = async (req, res) => {
  try {
    const { uid, nome, entidade, role, nivelAcesso, newPassword } = req.body;

    if (!uid || !nome || !entidade || !role) {
      return res.status(400).json({ error: "Todos os campos são obrigatórios." });
    }

    const entidadeId = normalizeEntityId(entidade);
    const entidadeRef = `entidades/${entidadeId}`;

    const userDocRef = db.collection("users").doc(uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "user não encontrado." });
    }

    // O ID do documento (== UID do Firebase Auth) nunca muda, mesmo quando o
    // nome muda — os dados em "registo-ponto/{uid}" continuam válidos sem
    // precisar de nenhuma migração.
    const updatedData = { entidade: entidadeRef, nome, role, updatedAt: new Date() };
    if (nivelAcesso !== undefined) {
      updatedData.nivelAcesso = normalizeNivelAcesso(nivelAcesso);
    }

    if (newPassword) {
      updatedData.isFirstLogin = true;
      await admin.auth().updateUser(uid, { password: newPassword });
    }

    await userDocRef.update(updatedData);

    const entidadeDoc = await db.collection("entidades").doc(entidadeId).get();
    const entidadeNome = entidadeDoc.exists ? (entidadeDoc.data().nome || "Desconhecida") : "Desconhecida";

    return res.status(200).json({
      message: "colaborador atualizado com sucesso.",
      uid,
      nome,
      role,
      nivelAcesso: updatedData.nivelAcesso ?? normalizeNivelAcesso(userDoc.data().nivelAcesso),
      entidade: entidadeNome,
    });
  } catch (error) {
    console.error("🚨 Erro ao atualizar colaborador:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
};

const deleteUser = async (req, res) => {
  const { uid } = req.body;

  if (!uid) {
    return res.status(400).json({ error: "O uid é obrigatório" });
  }

  console.log("A apagar user", uid, "e os seus dados");

  try {
    const userDocRef = db.collection("users").doc(uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "user não encontrado." });
    }

    const registoPontoRef = db.collection("registo-ponto").doc(uid);
    const subcollections = ["Registos", "Ferias", "BaixasMedicas", "HorasExtraManual", "DeducoesHorasExtras"];
    const CHUNK_SIZE = 400;
    for (const sub of subcollections) {
      const snapshot = await registoPontoRef.collection(sub).get();
      const docs = snapshot.docs;
      for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
        const chunk = docs.slice(i, i + CHUNK_SIZE);
        const batchDel = db.batch();
        chunk.forEach((doc) => batchDel.delete(doc.ref));
        await batchDel.commit();
      }
    }

    await registoPontoRef.delete();
    await userDocRef.delete();
    await admin.auth().deleteUser(uid);

    console.log("Utilizador", uid, "apagado com sucesso.");
    return res.status(200).json({ message: "Utilizador apagado com sucesso." });
  } catch (error) {
    console.error("Erro ao apagar utilizador:", error);
    return res.status(500).json({ error: "Erro ao apagar utilizador." });
  }
};

module.exports = {
  createUser,
  userDetails,
  getUsersByEntity,
  updateUserDetails,
  deleteUser
};
