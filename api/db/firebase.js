const admin = require("firebase-admin");

const serviceAccount = require('./serviceAccountKey.json');

serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  storageBucket: 'gs://iso-9001-d6cb8.firebasestorage.app'
});

const db = admin.firestore();
module.exports = { db };