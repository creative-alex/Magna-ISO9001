const admin = require("firebase-admin");

// Em produção (Render) a chave vem de uma env var (o Secret Files do Render só
// aceita nomes de ficheiro sem barras, não dá para pôr em api/db/). Em
// desenvolvimento local continua a usar o ficheiro normal, gitignored.
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
  : require('./serviceAccountKey.json');

serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  storageBucket: 'gs://iso-9001-d6cb8.firebasestorage.app'
});

const db = admin.firestore();
module.exports = { db };