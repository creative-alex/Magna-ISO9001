const admin = require("firebase-admin");
const path = require("path");

// Inicializar Firebase Admin
const serviceAccount = require('../db/serviceAccountKey.json');
serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  storageBucket: 'gs://iso-9001-d6cb8.firebasestorage.app'
});

const db = admin.firestore();

async function createSuperAdmin() {
  try {
    const superAdminEmail = 'superadmin@magna.com';
    const superAdminPassword = 'magna123';
    const superAdminName = 'SuperAdmin';
    const superAdminUid = 'superadmin';

    console.log('🔧 A criar Super Admin...');

    // 1. Criar no Firebase Auth
    try {
      await admin.auth().createUser({
        uid: superAdminUid,
        email: superAdminEmail,
        password: superAdminPassword,
        displayName: superAdminName
      });
      console.log('✅ Super Admin criado no Firebase Auth');
    } catch (authError) {
      if (authError.code === 'auth/uid-already-exists') {
        console.log('⚠️ Super Admin já existe no Firebase Auth');
        // Atualizar password
        await admin.auth().updateUser(superAdminUid, {
          password: superAdminPassword
        });
        console.log('✅ Password do Super Admin atualizada');
      } else {
        throw authError;
      }
    }

    // 2. Criar/Atualizar no Firestore
    const userDocRef = db.collection('users').doc(superAdminUid);
    await userDocRef.set({
      nome: superAdminName,
      email: superAdminEmail,
      role: 'SuperAdmin',
      isFirstLogin: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    
    console.log('✅ Super Admin criado/atualizado no Firestore');
    console.log('');
    console.log('📋 Credenciais do Super Admin:');
    console.log('   Email:', superAdminEmail);
    console.log('   Password:', superAdminPassword);
    console.log('   Nome:', superAdminName);
    console.log('');
    console.log('🎉 Super Admin criado com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao criar Super Admin:', error);
  } finally {
    process.exit(0);
  }
}

createSuperAdmin();