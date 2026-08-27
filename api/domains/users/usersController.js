const admin = require("firebase-admin");
const db = require("../../shared/db/firebase").db;
const { isSuperAdmin: hasSuperAdminAccess, isAdministrador } = require("../../shared/middleware/auth");

// Únicos valores válidos para o nível de acesso (controla permissões). Distinto
// de "role", que é só o cargo/título mostrado (texto livre, ex: "Gestora RH /
// Coordenadora Pedagógica") e nunca deve ser usado para decidir permissões.
const NIVEIS_ACESSO = ["SuperAdmin", "GestorRH", "Administrador", "Colaborador"];
function normalizeNivelAcesso(nivelAcesso) {
  return NIVEIS_ACESSO.includes(nivelAcesso) ? nivelAcesso : "Colaborador";
}

const verifyTokenAndGetUserInfo = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      console.log('Erro: Token não fornecido.');
      return res.status(400).json({ message: 'Token não fornecido' });
    }

    console.log('📍 Iniciando verificação de token...');
    console.log('📍 Token recebido (primeiros 50 chars):', token.substring(0, 50) + '...');

    // Verifica o token e obtém o utilizador do Firebase Auth
    console.log('📍 Tentando verificar token com Firebase...');
    const decodedToken = await admin.auth().verifyIdToken(token);
    console.log('✅ Token verificado com sucesso. UID:', decodedToken.uid);
    
    console.log('📍 Buscando dados do usuário no Firebase Auth...');
    const userRecord = await admin.auth().getUser(decodedToken.uid);
    console.log('✅ Dados do usuário obtidos do Auth. Email:', userRecord.email);

    // Busca informações adicionais do utilizador no Firestore
    // Primeiro tenta buscar por UID (documento)
    console.log('📍 Buscando dados adicionais no Firestore...');
    let userDoc = await db.collection('users').doc(decodedToken.uid).get();
    let userData = {};
    
    if (userDoc.exists) {
      userData = userDoc.data();
      console.log('✅ Dados encontrados no Firestore por UID');
    } else {
      // Se não encontrar por UID, tenta buscar por email (compatibilidade com dados antigos)
      console.log('📍 Não encontrado por UID, tentando buscar por email...');
      const querySnapshot = await db.collection('users').where('email', '==', userRecord.email).get();
      if (!querySnapshot.empty) {
        userData = querySnapshot.docs[0].data();
        console.log('✅ Dados encontrados no Firestore por email');
      } else {
        console.log('⚠️ Nenhum dado adicional encontrado no Firestore');
      }
    }

    const isSuperAdmin = hasSuperAdminAccess(userData.nivelAcesso);
    console.log('📍 Role do usuário:', userData.role || 'user');

    // Nome legível da entidade  -  só é preciso resolver quando o utilizador é
    // Administrador (usado no frontend para bloquear o campo "Entidade" ao criar/editar
    // colaboradores, para não deixar sair da sua própria entidade).
    let entidadeNome = null;
    if (isAdministrador(userData.nivelAcesso) && typeof userData.entidade === 'string') {
      const entidadeId = userData.entidade.replace('entidades/', '');
      try {
        const entidadeDoc = await db.collection('entidades').doc(entidadeId).get();
        entidadeNome = entidadeDoc.exists ? (entidadeDoc.data().nome || null) : null;
      } catch (err) {
        console.error('⚠️ Erro ao buscar nome da entidade:', err);
      }
    }

    const responseData = {
      message: 'Token válido',
      uid: decodedToken.uid,
      email: decodedToken.email,
      displayName: userRecord.displayName || userData.nome || 'N/A',
      role: userData.role || 'user',
      nivelAcesso: normalizeNivelAcesso(userData.nivelAcesso),
      nome: userData.nome || userRecord.displayName || 'N/A',
      isFirstLogin: isSuperAdmin ? false : (userData.isFirstLogin ?? true),
      entidade: userData.entidade || null,
      entidadeNome,
    };

    console.log('✅ Retornando dados do usuário:', JSON.stringify(responseData, null, 2));
    res.json(responseData);

  } catch (error) {
    console.error('Erro ao verificar token e buscar user:', error);
    res.status(401).json({ message: 'Token inválido ou erro ao buscar user' });
  }
};

const createUser = async (req, res) => {
  try {
    const { nome, email, role, nivelAcesso, uid, isFirstLogin } = req.body;

    // Validação básica
    if (!nome || !email) {
      return res.status(400).json({ error: 'Nome e email são obrigatórios' });
    }

    // Se foi criado via Firebase Auth no frontend, apenas salvar no Firestore
    if (uid) {
      try {
        const userDocRef = db.collection('users').doc(uid);
        await userDocRef.set({
          nome,
          email,
          role: role || 'User',
          nivelAcesso: normalizeNivelAcesso(nivelAcesso),
          isFirstLogin: isFirstLogin !== undefined ? isFirstLogin : true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return res.status(201).json({ 
          message: 'Usuário criado com sucesso',
          id: uid
        });
      } catch (firestoreError) {
        console.error('Erro ao salvar no Firestore:', firestoreError);
        return res.status(500).json({ error: 'Falha ao salvar usuário na base de dados' });
      }
    }

    // Lógica para criação via admin (caso não tenha uid do Firebase Auth)
    const { temporaryPassword, entidade } = req.body;
    
    if (!temporaryPassword) {
      return res.status(400).json({ error: 'Password temporária é obrigatória quando não há uid' });
    }

    // Gerar ID único baseado no nome
    let baseUserId = nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
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

    // Criar usuário no Firebase Authentication
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

    // Criar usuário no Firestore
    try {
      let entityRef = null;
      if (entidade) {
        const entityId = entidade
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/&/g, 'e')
          .replace(/-/g, ' ')
          .replace(/[^a-z0-9\s]/g, '')
          .trim()
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-+|-+$/g, '');

        entityRef = `entidades/${entityId}`;
      }
      
      await userDocRef.set({
        nome,
        email,
        entidade: entityRef,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        role: role?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-') || 'user',
        nivelAcesso: normalizeNivelAcesso(nivelAcesso),
        isFirstLogin: true
      });

      return res.status(201).json({ 
        message: 'Usuário criado com sucesso',
        id: userId
      });

    } catch (firestoreError) {
      // Rollback: Apagar usuário do Auth se o Firestore falhar
      await admin.auth().deleteUser(userId);
      throw firestoreError;
    }

  } catch (error) {
    console.error('Erro no processo completo:', error);
    return res.status(500).json({ error: 'Falha na criação do usuário' });
  }
};

const getAllUsers = async (req, res) => {
  try {
    console.log("getAllUsers chamado");
    
    // Acessa a coleção users no Firestore
    const db = admin.firestore();
    const usersRef = db.collection('users');
    
    // Busca todos os documentos da coleção users
    const snapshot = await usersRef.get();
    
    if (snapshot.empty) {
      console.log("Nenhum usuário encontrado");
      return res.json([]);
    }
    
    const users = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      // Filtrar SuperAdmins da lista
      if (!hasSuperAdminAccess(data.nivelAcesso)) {
        users.push({
          id: doc.id,
          nome: data.nome || data.name || data.displayName || 'Nome não disponível',
          email: data.email || 'Email não disponível'
        });
      }
    });
    
    res.json(users);
    
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);
    res.status(500).json({ error: "Erro interno do servidor", details: error.message });
  }
};

const getColaboradores = async (req, res) => {
  try {
    const db = admin.firestore();
    const [snapshot, entidadesSnapshot] = await Promise.all([
      db.collection('users').get(),
      db.collection('entidades').get(),
    ]);

    if (snapshot.empty) {
      return res.json([]);
    }

    const entidadeNomes = {};
    entidadesSnapshot.forEach(doc => {
      entidadeNomes[doc.id] = doc.data().nome || doc.id;
    });

    // Administrador só vê os colaboradores da sua própria entidade; SuperAdmin/GestorRH
    // (os únicos outros níveis que chegam aqui, ver requireCanViewColaboradores) veem todos.
    const actorNivelAcesso = req.user?.nivelAcesso;
    const scopeToOwnEntidade = isAdministrador(actorNivelAcesso);
    const actorEntidade = req.user?.entidade || null;

    const colaboradores = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (hasSuperAdminAccess(data.nivelAcesso)) return;
      if (scopeToOwnEntidade && data.entidade !== actorEntidade) return;

      const entidadeId = data.entidade ? data.entidade.replace('entidades/', '') : null;
      colaboradores.push({
        id: doc.id,
        nome: data.nome || 'Nome não disponível',
        email: data.email || 'Email não disponível',
        role: data.role || 'user',
        entidade: entidadeId ? (entidadeNomes[entidadeId] || entidadeId) : null,
      });
    });

    res.json(colaboradores);
  } catch (error) {
    console.error("Erro ao buscar colaboradores:", error);
    res.status(500).json({ error: "Erro interno do servidor", details: error.message });
  }
};

const updateFirstLogin = async (req, res) => {
  try {
    const { userEmail, newPassword, isFirstLogin } = req.body;

    // Validação básica
    if (!userEmail) {
      return res.status(400).json({ error: 'Email do usuário é obrigatório' });
    }

    if (!newPassword) {
      return res.status(400).json({ error: 'Nova senha é obrigatória' });
    }

    console.log('📍 Iniciando atualização de primeiro login para:', userEmail);

    // Buscar usuário no Firebase Auth pelo email
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(userEmail);
      console.log('✅ Usuário encontrado no Auth. UID:', userRecord.uid);
    } catch (authError) {
      console.error('❌ Usuário não encontrado no Auth:', authError);
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Atualizar senha no Firebase Auth
    try {
      await admin.auth().updateUser(userRecord.uid, {
        password: newPassword
      });
      console.log('✅ Senha atualizada no Firebase Auth');
    } catch (passwordError) {
      console.error('❌ Erro ao atualizar senha:', passwordError);
      return res.status(500).json({ error: 'Erro ao atualizar senha' });
    }

    // Atualizar isFirstLogin no Firestore
    try {
      // Primeiro tenta buscar por UID (documento)
      let userDocRef = db.collection('users').doc(userRecord.uid);
      let userDoc = await userDocRef.get();
      
      if (userDoc.exists) {
        // Atualiza documento existente por UID
        await userDocRef.update({
          isFirstLogin: isFirstLogin !== undefined ? isFirstLogin : false,
          lastPasswordChange: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('✅ isFirstLogin atualizado no Firestore (por UID)');
      } else {
        // Se não encontrar por UID, tenta buscar por email (compatibilidade)
        const querySnapshot = await db.collection('users').where('email', '==', userEmail).get();
        if (!querySnapshot.empty) {
          const docRef = querySnapshot.docs[0].ref;
          await docRef.update({
            isFirstLogin: isFirstLogin !== undefined ? isFirstLogin : false,
            lastPasswordChange: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log('✅ isFirstLogin atualizado no Firestore (por email)');
        } else {
          // Se não existe no Firestore, criar documento
          await userDocRef.set({
            email: userEmail,
            nome: userRecord.displayName || 'N/A',
            role: 'user',
            isFirstLogin: isFirstLogin !== undefined ? isFirstLogin : false,
            lastPasswordChange: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log('✅ Documento criado no Firestore com isFirstLogin atualizado');
        }
      }
    } catch (firestoreError) {
      console.error('❌ Erro ao atualizar Firestore:', firestoreError);
      return res.status(500).json({ error: 'Erro ao atualizar dados do usuário' });
    }

    console.log('✅ Primeiro login atualizado com sucesso para:', userEmail);
    res.json({ 
      message: 'Primeiro login e senha atualizados com sucesso',
      email: userEmail,
      isFirstLogin: isFirstLogin !== undefined ? isFirstLogin : false
    });

  } catch (error) {
    console.error('❌ Erro geral ao atualizar primeiro login:', error);
    res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
};


const getFavorites = async (req, res) => {
  try {
    const { username } = req.params;
    if (username !== req.user.nome) {
      return res.status(403).json({ error: 'Não podes ver os favoritos de outro utilizador' });
    }
    const snapshot = await db.collection('users').where('nome', '==', username).get();
    if (snapshot.empty) return res.json([]);
    const userData = snapshot.docs[0].data();
    return res.json(userData.favorites || []);
  } catch (error) {
    console.error('Erro ao buscar favoritos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const updateFavorite = async (req, res) => {
  try {
    const { username, filePath, fileName, action } = req.body;
    if (!username || !filePath || !action) {
      return res.status(400).json({ error: 'username, filePath e action são obrigatórios' });
    }
    if (username !== req.user.nome) {
      return res.status(403).json({ error: 'Não podes alterar os favoritos de outro utilizador' });
    }

    const snapshot = await db.collection('users').where('nome', '==', username).get();
    if (snapshot.empty) return res.status(404).json({ error: 'Utilizador não encontrado' });

    const userDocRef = snapshot.docs[0].ref;
    const favorites = snapshot.docs[0].data().favorites || [];

    let updatedFavorites;
    if (action === 'add') {
      if (favorites.some(f => (f.path || f.filePath) === filePath)) {
        return res.json({ message: 'Já está nos favoritos' });
      }
      updatedFavorites = [...favorites, { path: filePath, name: fileName || filePath.split('/').pop().replace('.pdf', '') }];
    } else if (action === 'remove') {
      updatedFavorites = favorites.filter(f => (f.path || f.filePath) !== filePath);
    } else {
      return res.status(400).json({ error: 'Action deve ser "add" ou "remove"' });
    }

    await userDocRef.update({ favorites: updatedFavorites });
    return res.json({ favorites: updatedFavorites });
  } catch (error) {
    console.error('Erro ao atualizar favoritos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = {
  verifyTokenAndGetUserInfo, createUser, getAllUsers, getColaboradores, getFavorites, updateFavorite, updateFirstLogin
};