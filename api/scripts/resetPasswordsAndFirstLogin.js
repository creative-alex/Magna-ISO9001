/**
 * Repõe a password de todos os utilizadores (exceto o SuperAdmin) para a
 * password temporária partilhada, e marca isFirstLogin: true para forçar a
 * troca de password no próximo login.
 *
 * O SuperAdmin é identificado por nivelAcesso === "SuperAdmin" (campo que
 * controla permissões) e é sempre ignorado, seja qual for o seu uid/email.
 *
 * No fim, regenera migration-output/password-temporaria-partilhada.json com
 * a lista completa e atual de contas afetadas (substitui o ficheiro anterior,
 * que estava desatualizado e não incluía todos os users já criados).
 *
 * Uso:
 *   node api/scripts/resetPasswordsAndFirstLogin.js [--dry-run] [--password=Bemvindo2026]
 */

const path = require("path");
const fs = require("fs");
const admin = require("firebase-admin");

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const getArgValue = (name) => {
  const prefix = `--${name}=`;
  const found = args.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
};
const NEW_PASSWORD = getArgValue("password") || "Bemvindo2026";

const KEY_PATH = path.join(__dirname, "..", "db", "serviceAccountKey.json");
const OUTPUT_FILE = path.join(__dirname, "migration-output", "password-temporaria-partilhada.json");

function initApp() {
  const serviceAccount = JSON.parse(fs.readFileSync(KEY_PATH, "utf8"));
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  return admin.firestore();
}

async function main() {
  console.log(`Modo: ${DRY_RUN ? "DRY-RUN (nada será alterado)" : "EXECUÇÃO REAL"}`);
  console.log(`Password nova: ${NEW_PASSWORD}`);

  const db = initApp();

  const snapshot = await db.collection("users").get();
  const allUsers = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    allUsers.push({ uid: doc.id, nome: data.nome || doc.id, email: data.email || null, nivelAcesso: data.nivelAcesso });
  });

  const superAdmins = allUsers.filter((u) => u.nivelAcesso === "SuperAdmin");
  const targets = allUsers.filter((u) => u.nivelAcesso !== "SuperAdmin");

  console.log(`Total de utilizadores: ${allUsers.length}`);
  console.log(`SuperAdmin(s) ignorado(s): ${superAdmins.map((u) => `${u.nome} <${u.email}>`).join(", ") || "nenhum encontrado"}`);
  console.log(`A processar ${targets.length} utilizadores:\n`);

  let updated = 0;
  let failed = [];

  for (const user of targets) {
    if (!user.email) {
      console.warn(`  [SKIP] ${user.uid}: sem email, não é possível confirmar identidade.`);
      failed.push({ ...user, reason: "sem email" });
      continue;
    }

    console.log(`  ${user.nome} <${user.email}> (uid: ${user.uid})`);

    if (!DRY_RUN) {
      try {
        await admin.auth().updateUser(user.uid, { password: NEW_PASSWORD });
        await db.collection("users").doc(user.uid).update({ isFirstLogin: true });
        updated++;
      } catch (err) {
        console.error(`    -> ERRO: ${err.message}`);
        failed.push({ ...user, reason: err.message });
      }
    }
  }

  if (!DRY_RUN) {
    const outputData = {
      passwordTemporaria: NEW_PASSWORD,
      totalContas: targets.length - failed.length,
      geradoEm: new Date().toISOString(),
      contas: targets
        .filter((u) => !failed.some((f) => f.uid === u.uid))
        .map((u) => ({ nome: u.nome, email: u.email }))
        .sort((a, b) => a.nome.localeCompare(b.nome)),
    };
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputData, null, 2), "utf8");
    console.log(`\nFicheiro atualizado: ${OUTPUT_FILE}`);
  }

  console.log("\n===== Resumo =====");
  console.log(`Utilizadores processados com sucesso: ${DRY_RUN ? "(dry-run, nenhum alterado)" : updated}`);
  console.log(`Falhas: ${failed.length}`);
  if (failed.length) {
    console.log(JSON.stringify(failed, null, 2));
  }

  if (DRY_RUN) {
    console.log("\nNenhuma alteração foi escrita (--dry-run). Corre sem essa flag para aplicar.");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
