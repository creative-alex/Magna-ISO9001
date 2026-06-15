const admin = require("firebase-admin");
const db = require("../db/firebase").db;

const verifyTokenAndGetUserInfo = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      console.log('Erro: Token não fornecido.');
      return res.status(400).json({ message: 'Token não fornecido' });
    }

    // Verifica o token e obtém o utilizador do Firebase Auth
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userRecord = await admin.auth().getUser(decodedToken.uid);

    // Busca informações adicionais do utilizador no Firestore
    // Primeiro tenta buscar por UID (documento)
    let userDoc = await db.collection('users').doc(decodedToken.uid).get();
    let userData = {};
    
    if (userDoc.exists) {
      userData = userDoc.data();
    } else {
      // Se não encontrar por UID, tenta buscar por email (compatibilidade com dados antigos)
      const querySnapshot = await db.collection('users').where('email', '==', userRecord.email).get();
      if (!querySnapshot.empty) {
        userData = querySnapshot.docs[0].data();
      }
    }

    const isSuperAdmin = userData.role === "SuperAdmin" || userData.role === "superadmin";

    res.json({
      message: 'Token válido',
      uid: decodedToken.uid,
      email: decodedToken.email,
      displayName: userRecord.displayName || userData.nome || 'N/A',
      role: userData.role || 'user',
      nome: userData.nome || userRecord.displayName || 'N/A',
      isFirstLogin: isSuperAdmin ? false : (userData.isFirstLogin ?? true),
    });

  } catch (error) {
    console.error('Erro ao verificar token e buscar user:', error);
    res.status(401).json({ message: 'Token inválido ou erro ao buscar user' });
  }
};

const createUser = async (req, res) => {
  try {
    const { nome, email, role, uid, isFirstLogin } = req.body;

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
      if (data.role !== "SuperAdmin" && data.role !== "superadmin") {
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


const getFavorites = async (req, res) => {
  try {
    const { username } = req.params;
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
  verifyTokenAndGetUserInfo, createUser, getAllUsers, getFavorites, updateFavorite
};