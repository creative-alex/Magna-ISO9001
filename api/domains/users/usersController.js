const admin = require("firebase-admin");
const db = require("../../shared/db/firebase").db;
const { isSuperAdmin: hasSuperAdminAccess, isAdministrador, entidadesGeridasPor } = require("../../shared/middleware/auth");
const { isBlocoAtivoEm, labelBaixaOuLicenca } = require("../../shared/lib/absenceBlocks");

// Únicos valores válidos para o nível de acesso (controla permissões). Distinto
// de "role", que é só o cargo/título mostrado (texto livre, ex: "Gestora RH /
// Coordenadora Pedagógica") e nunca deve ser usado para decidir permissões.
const NIVEIS_ACESSO = ["SuperAdmin", "GestorRH", "Administrador", "GestorFinanceiro", "Colaborador"];
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

    // Nomes legíveis das entidades geridas  -  só é preciso resolver quando o utilizador é
    // Administrador (usado no frontend para bloquear/restringir o campo "Entidade" ao
    // criar/editar colaboradores, para não deixar sair das entidades que gere). Normalmente
    // uma só ("entidadeNome"), mas um Administrador pode gerir mais do que uma (ver
    // entidadesGeridasPor) - "entidadesGeridasNomes" traz todas.
    let entidadeNome = null;
    let entidadesGeridasNomes = [];
    if (isAdministrador(userData.nivelAcesso)) {
      const geridas = entidadesGeridasPor(userData);
      entidadesGeridasNomes = await Promise.all(geridas.map(async (ref) => {
        const entidadeId = ref.replace('entidades/', '');
        try {
          const entidadeDoc = await db.collection('entidades').doc(entidadeId).get();
          return entidadeDoc.exists ? (entidadeDoc.data().nome || entidadeId) : entidadeId;
        } catch (err) {
          console.error('⚠️ Erro ao buscar nome da entidade:', err);
          return entidadeId;
        }
      }));
      entidadeNome = entidadesGeridasNomes[0] || null;
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
      entidadesGeridasNomes,
      // Função de Gestor(a) de Qualidade  -  independente de nivelAcesso (ver
      // isGestorQualidade em auth.js). Sempre boolean, nunca undefined.
      gestorQualidade: userData.gestorQualidade === true,
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

// Situação contratual não-ativa é sempre a informação mais relevante (ver
// getColaboradores/getColaboradoresStatusHoje) - ignora baixas/cedências/férias nesse
// caso. Caso contrário, procura uma baixa/cedência ativa hoje nas listas já agrupadas
// por colaborador (ver collectionGroup em getEstadoHojeParaColaboradores), e só then
// faz a única leitura que continua por colaborador (Ferias de hoje, ver nota aí).
async function resolveEstadoHoje(db, { id, situacao_contratual }, { baixasPorUid, cedenciasPorUid, todayIso, todayBr }) {
  if (situacao_contratual && situacao_contratual !== "Ativo") {
    return situacao_contratual;
  }

  const baixaAtiva = (baixasPorUid.get(id) || []).find(b => isBlocoAtivoEm(b, todayIso));
  if (baixaAtiva) return labelBaixaOuLicenca(baixaAtiva.tipo);

  const cedenciaAtiva = (cedenciasPorUid.get(id) || []).some(b => isBlocoAtivoEm(b, todayIso));
  if (cedenciaAtiva) return "Cedência temporária";

  // Só esta continua 1 leitura por colaborador: precisa de where("date","==",hoje) e
  // um collectionGroup com esse filtro exigiria um índice que ainda não existe no
  // projeto (confirmado - falha com FAILED_PRECONDITION); ao contrário de
  // baixasMedicas/cedencias acima, que um collectionGroup sem filtro já resolve bem.
  const feriasSnap = await db.collection('registo-ponto').doc(id).collection('Ferias').where('date', '==', todayBr).get();
  const emFerias = feriasSnap.docs.some(d => {
    const data = d.data();
    return data.Approved === true || data.Approved === 'true' || data.Approved === 1;
  });
  if (emFerias) return "Férias";

  return "Ativo";
}

// baixasMedicas/cedencias (módulo de Cadastro) de TODOS os colaboradores, lidas de
// uma só vez via collectionGroup (funciona sem índice novo para uma leitura sem
// where - confirmado) e agrupadas por uid, em vez de 1 leitura de cada subcoleção por
// colaborador (era o N+1 de getColaboradoresStatusHoje: 2×M leituras extra).
async function fetchBaixasECedenciasPorUid(db) {
  const [baixasSnap, cedenciasSnap] = await Promise.all([
    db.collectionGroup('baixasMedicas').get(),
    db.collectionGroup('cedencias').get(),
  ]);
  const groupByUid = (snap) => {
    const map = new Map();
    snap.forEach(doc => {
      const uid = doc.ref.parent.parent.id;
      if (!map.has(uid)) map.set(uid, []);
      map.get(uid).push(doc.data());
    });
    return map;
  };
  return { baixasPorUid: groupByUid(baixasSnap), cedenciasPorUid: groupByUid(cedenciasSnap) };
}

const getColaboradores = async (req, res) => {
  try {
    const db = admin.firestore();
    // Opcional: inclui o estado "hoje" de cada colaborador na mesma resposta (ver
    // getColaboradoresStatusHoje) - evita que o frontend tenha de pedir a coleção
    // "users" inteira uma segunda vez só para calcular isto (ver
    // ColaboradoresGroupedList.jsx).
    const comEstadoHoje = req.query?.comEstadoHoje === 'true';

    const reads = [db.collection('users').get(), db.collection('entidades').get()];
    const [snapshot, entidadesSnapshot, baixasECedencias] = await Promise.all(
      comEstadoHoje ? [...reads, fetchBaixasECedenciasPorUid(db)] : reads
    );

    if (snapshot.empty) {
      return res.json([]);
    }

    const entidadeNomes = {};
    entidadesSnapshot.forEach(doc => {
      entidadeNomes[doc.id] = doc.data().nome || doc.id;
    });

    // Administrador só vê os colaboradores das entidades que gere (normalmente uma só);
    // SuperAdmin/GestorRH (os únicos outros níveis que chegam aqui, ver
    // requireCanViewColaboradores) veem todos.
    const actorNivelAcesso = req.user?.nivelAcesso;
    const scopeToOwnEntidade = isAdministrador(actorNivelAcesso);
    const actorEntidades = scopeToOwnEntidade ? entidadesGeridasPor(req.user) : null;

    const colaboradores = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (hasSuperAdminAccess(data.nivelAcesso)) return;
      if (scopeToOwnEntidade && !actorEntidades.includes(data.entidade)) return;

      const entidadeId = data.entidade ? data.entidade.replace('entidades/', '') : null;
      colaboradores.push({
        id: doc.id,
        nome: data.nome || 'Nome não disponível',
        email: data.email || 'Email não disponível',
        role: data.role || 'user',
        entidade: entidadeId ? (entidadeNomes[entidadeId] || entidadeId) : null,
        situacao_contratual: data.situacao_contratual || 'Ativo',
        nivelAcesso: normalizeNivelAcesso(data.nivelAcesso),
        // Só o booleano (nunca o NIF em si) - usado pelo botão "Notificar sem NIF" por
        // entidade em ColaboradoresGroupedList (ver notifyEntidadeSemNif em cadastroController.js).
        temNif: !!(data.nif || '').trim(),
      });
    });

    if (!comEstadoHoje) {
      return res.json(colaboradores);
    }

    const hoje = new Date();
    const ctx = {
      ...baixasECedencias,
      todayIso: hoje.toISOString().slice(0, 10),
      todayBr: `${String(hoje.getDate()).padStart(2, "0")}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${hoje.getFullYear()}`,
    };
    const colaboradoresComEstado = await Promise.all(colaboradores.map(async (c) => ({
      ...c,
      estadoHoje: await resolveEstadoHoje(db, c, ctx),
    })));

    res.json(colaboradoresComEstado);
  } catch (error) {
    console.error("Erro ao buscar colaboradores:", error);
    res.status(500).json({ error: "Erro interno do servidor", details: error.message });
  }
};

// Estado "hoje" de cada colaborador, para a lista de /colaboradores  -  por ordem de
// prioridade: situação contratual não-ativa (cessado/suspenso/reformado) > baixa/licença
// a decorrer > cedência temporária a decorrer > férias aprovadas para hoje > ativo.
// Mantido como endpoint próprio por compatibilidade; o ecrã de Colaboradores usa antes
// GET /users/getColaboradores?comEstadoHoje=true (mesmo cálculo, sem repetir a leitura
// da coleção "users").
const getColaboradoresStatusHoje = async (req, res) => {
  try {
    const db = admin.firestore();

    const [usersSnapshot, baixasECedencias] = await Promise.all([
      db.collection('users').get(),
      fetchBaixasECedenciasPorUid(db),
    ]);

    // Mesmo âmbito de visibilidade que getColaboradores (ver requireCanViewColaboradores).
    const actorNivelAcesso = req.user?.nivelAcesso;
    const scopeToOwnEntidade = isAdministrador(actorNivelAcesso);
    const actorEntidades = scopeToOwnEntidade ? entidadesGeridasPor(req.user) : null;

    const alvo = [];
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (hasSuperAdminAccess(data.nivelAcesso)) return;
      if (scopeToOwnEntidade && !actorEntidades.includes(data.entidade)) return;
      alvo.push({ id: doc.id, situacao_contratual: data.situacao_contratual || null });
    });

    const hoje = new Date();
    const ctx = {
      ...baixasECedencias,
      todayIso: hoje.toISOString().slice(0, 10),
      todayBr: `${String(hoje.getDate()).padStart(2, "0")}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${hoje.getFullYear()}`,
    };
    const estados = await Promise.all(alvo.map(async ({ id, situacao_contratual }) => ({
      id,
      estado: await resolveEstadoHoje(db, { id, situacao_contratual }, ctx),
    })));

    res.json(estados);
  } catch (error) {
    console.error("Erro ao calcular estado dos colaboradores:", error);
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
    // Este endpoint só devolve os favoritos do próprio utilizador (ver verificação
    // acima), documento que o middleware (requireAuth) já leu - reaproveita-lo em vez
    // de repetir a mesma pesquisa por "nome". No caso raro em que esse documento não
    // exista em users/{uid} (ver req.userDocExists), mantém a pesquisa original.
    if (req.userDocExists) {
      return res.json(req.userData.favorites || []);
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

    let userDocRef;
    let favorites;
    if (req.userDocExists) {
      userDocRef = db.collection('users').doc(req.user.uid);
      favorites = req.userData.favorites || [];
    } else {
      const snapshot = await db.collection('users').where('nome', '==', username).get();
      if (snapshot.empty) return res.status(404).json({ error: 'Utilizador não encontrado' });
      userDocRef = snapshot.docs[0].ref;
      favorites = snapshot.docs[0].data().favorites || [];
    }

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

// Diretório mínimo de utilizadores (uid + nome), aberto a qualquer utilizador autenticado
// - usado para escolher "pessoas envolvidas" numa Não Conformidade (qualquer colaborador
// pode reportar uma NC e identificar quem esteve envolvido, não só quem já tem acesso a
// getColaboradores). Devolve só o mínimo necessário para um seletor (sem email/entidade/
// nivelAcesso), e exclui SuperAdmins tal como getAllUsers.
const getUserDirectory = async (req, res) => {
  try {
    const snapshot = await db.collection('users').get();
    const directory = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (hasSuperAdminAccess(data.nivelAcesso)) return;
      directory.push({ uid: doc.id, nome: data.nome || data.email || doc.id });
    });
    res.json(directory);
  } catch (error) {
    console.error('Erro ao buscar diretório de utilizadores:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = {
  verifyTokenAndGetUserInfo, createUser, getAllUsers, getColaboradores, getColaboradoresStatusHoje,
  getFavorites, updateFavorite, updateFirstLogin, getUserDirectory,
};