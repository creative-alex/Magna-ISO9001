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
    const querySnapshot = await db.collection('users').where('email', '==', userRecord.email).get();

    let userData = {};
    if (!querySnapshot.empty) {
      userData = querySnapshot.docs[0].data();
    }

    const isSuperAdmin = userData.role === "SuperAdmin";

    res.json({
      message: 'Token válido',
      uid: decodedToken.uid,
      email: decodedToken.email,
      displayName: userRecord.displayName || userData.nome || 'N/A',
      role: userData.role || 'user',
      nome: userData.nome || userRecord.displayName || 'N/A',
      isFirstLogin: isSuperAdmin ? false : (userData.isFirstLogin ?? true),
    });

    console.log("RESPOSTA DO SERVIDOR:", {
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

module.exports = {
  verifyTokenAndGetUserInfo,
};