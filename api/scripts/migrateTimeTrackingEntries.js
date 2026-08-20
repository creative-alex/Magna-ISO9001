/**
 * Migra as entradas/saídas (Registros -> Registos) da base de dados antiga
 * do Livro de Ponto (Firestore "livro-de-ponto-a0184") para a base de dados
 * deste projeto (Firestore "iso-9001-d6cb8").
 *
 * Diferenças de esquema entre as duas bases:
 *   - Coleção raiz:        "registro-ponto"      -> "registo-ponto"
 *   - Subcoleção de dias:  "Registros"           -> "Registos"
 *   - ID do doc de user:   slug do nome (user_x) -> UID do Firebase Auth
 *   - ID do registo diário: "registro_DDMMYYYY"  -> "registo_DDMMYYYY"
 *   - Campos do registo (horaEntrada, horaSaida, timestamp): iguais
 *
 * Como a chave do utilizador mudou de "slug do nome" para "UID do Auth", o
 * mapeamento entre um user antigo e o novo é feito pelo email, lido da
 * coleção "users" de cada uma das duas bases.
 *
 * Uso:
 *   node api/scripts/migrateTimeTrackingEntries.js [opções]
 *
 * Opções:
 *   --dry-run        Não escreve nada, só mostra o que seria migrado.
 *   --overwrite      Sobrescreve registos que já existam no destino
 *                     (por omissão, registos já existentes são saltados).
 *   --old-key=<path> Caminho alternativo para o serviceAccountKey.json antigo.
 *   --new-key=<path> Caminho alternativo para o serviceAccountKey.json novo.
 *   --limit=<n>      Só processa os primeiros N users antigos (para testes).
 */

const path = require("path");
const fs = require("fs");
const admin = require("firebase-admin");

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const OVERWRITE = args.includes("--overwrite");
const getArgValue = (name) => {
  const prefix = `--${name}=`;
  const found = args.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
};
const LIMIT = getArgValue("limit") ? parseInt(getArgValue("limit"), 10) : null;

const DEFAULT_OLD_KEY = path.join(__dirname, "..", "..", "..", "LivroDePonto", "api", "db", "serviceAccountKey.json");
const DEFAULT_NEW_KEY = path.join(__dirname, "..", "db", "serviceAccountKey.json");

const OLD_KEY_PATH = getArgValue("old-key") || DEFAULT_OLD_KEY;
const NEW_KEY_PATH = getArgValue("new-key") || DEFAULT_NEW_KEY;

const CHUNK_SIZE = 400;

const normalizeUserId = (nome) =>
  nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "-");

function loadServiceAccount(keyPath, label) {
  if (!fs.existsSync(keyPath)) {
    throw new Error(`Credencial "${label}" não encontrada em: ${keyPath}`);
  }
  const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  return serviceAccount;
}

function initApps() {
  const oldAccount = loadServiceAccount(OLD_KEY_PATH, "antiga (LivroDePonto)");
  const newAccount = loadServiceAccount(NEW_KEY_PATH, "nova (Magna-ISO-9001)");

  const oldApp = admin.initializeApp({ credential: admin.credential.cert(oldAccount) }, "oldDb");
  const newApp = admin.initializeApp({ credential: admin.credential.cert(newAccount) }, "newDb");

  return { oldDb: oldApp.firestore(), newDb: newApp.firestore() };
}

async function buildOldUserIndex(oldDb) {
  const snapshot = await oldDb.collection("users").get();
  // por ID de doc e por slug derivado do nome, para máxima tolerância a
  // colisões de nome que geraram sufixos (-02, -03, ...) no ID original
  const byId = new Map();
  const byNameSlug = new Map();
  snapshot.forEach((doc) => {
    const data = doc.data();
    const entry = { id: doc.id, nome: data.nome || null, email: (data.email || "").toLowerCase().trim() };
    byId.set(doc.id, entry);
    if (data.nome) {
      byNameSlug.set(normalizeUserId(data.nome), entry);
    }
  });
  return { byId, byNameSlug };
}

async function buildNewUserIndexByEmail(newDb) {
  const snapshot = await newDb.collection("users").get();
  const byEmail = new Map();
  snapshot.forEach((doc) => {
    const data = doc.data();
    const email = (data.email || "").toLowerCase().trim();
    if (email) {
      byEmail.set(email, { uid: doc.id, nome: data.nome || null });
    }
  });
  return byEmail;
}

// Resolve, para um doc "registro-ponto/{oldSlugId}", a que colaborador
// antigo (com email) ele corresponde.
function resolveOldUser(oldSlugId, oldUserIndex) {
  const bareId = oldSlugId.startsWith("user_") ? oldSlugId.slice("user_".length) : oldSlugId;

  // 1) match direto pelo ID do doc em "users"
  if (oldUserIndex.byId.has(bareId)) {
    return oldUserIndex.byId.get(bareId);
  }
  // 2) match pelo slug do nome (cobre casos em que o ID em "users" tem
  //    sufixo de colisão mas o slug usado no ponto não)
  if (oldUserIndex.byNameSlug.has(bareId)) {
    return oldUserIndex.byNameSlug.get(bareId);
  }
  return null;
}

function toNewRegistoId(oldRegistroId) {
  // "registro_DDMMYYYY" -> "registo_DDMMYYYY"; se não seguir o padrão
  // esperado, mantém o ID original tal como está.
  const match = oldRegistroId.match(/^registro_(\d{8})$/);
  return match ? `registo_${match[1]}` : oldRegistroId;
}

async function migrateEntriesForUser({ newDb, oldSlugId, newUid, oldRegistrosSnapshot, report, overwrite, dryRun }) {
  const destCollectionRef = newDb.collection("registo-ponto").doc(newUid).collection("Registos");

  const docsToWrite = [];
  for (const doc of oldRegistrosSnapshot.docs) {
    const newId = toNewRegistoId(doc.id);
    docsToWrite.push({ id: newId, data: doc.data() });
  }

  let existingIds = new Set();
  if (!overwrite) {
    const existingSnapshot = await destCollectionRef.get();
    existingSnapshot.forEach((d) => existingIds.add(d.id));
  }

  let written = 0;
  let skipped = 0;

  for (let i = 0; i < docsToWrite.length; i += CHUNK_SIZE) {
    const chunk = docsToWrite.slice(i, i + CHUNK_SIZE);
    const batch = newDb.batch();
    let chunkHasWrites = false;

    for (const { id, data } of chunk) {
      if (!overwrite && existingIds.has(id)) {
        skipped++;
        continue;
      }
      chunkHasWrites = true;
      written++;
      if (!dryRun) {
        batch.set(destCollectionRef.doc(id), data, { merge: true });
      }
    }

    if (chunkHasWrites && !dryRun) {
      await batch.commit();
    }
  }

  report.entriesMigrated += written;
  report.entriesSkippedExisting += skipped;
  report.users.push({
    oldSlugId,
    newUid,
    totalOldEntries: docsToWrite.length,
    written,
    skippedExisting: skipped,
  });
}

async function main() {
  console.log(`Modo: ${DRY_RUN ? "DRY-RUN (nada será escrito)" : "EXECUÇÃO REAL"}${OVERWRITE ? " | overwrite ativo" : ""}`);
  console.log(`Credencial antiga: ${OLD_KEY_PATH}`);
  console.log(`Credencial nova:   ${NEW_KEY_PATH}`);

  const { oldDb, newDb } = initApps();

  console.log("A carregar índice de utilizadores antigos...");
  const oldUserIndex = await buildOldUserIndex(oldDb);
  console.log(`  -> ${oldUserIndex.byId.size} utilizadores antigos encontrados.`);

  console.log("A carregar índice de utilizadores novos (por email)...");
  const newUsersByEmail = await buildNewUserIndexByEmail(newDb);
  console.log(`  -> ${newUsersByEmail.size} utilizadores novos encontrados.`);

  console.log("A listar utilizadores com registos de ponto na base antiga...");
  let oldPontoDocs = (await oldDb.collection("registro-ponto").listDocuments());
  if (LIMIT) {
    oldPontoDocs = oldPontoDocs.slice(0, LIMIT);
  }
  console.log(`  -> ${oldPontoDocs.length} users com registo-ponto na base antiga.`);

  const report = {
    startedAt: new Date().toISOString(),
    dryRun: DRY_RUN,
    overwrite: OVERWRITE,
    entriesMigrated: 0,
    entriesSkippedExisting: 0,
    users: [],
    unmatched: [],
  };

  for (const oldDocRef of oldPontoDocs) {
    const oldSlugId = oldDocRef.id;
    const oldUser = resolveOldUser(oldSlugId, oldUserIndex);

    if (!oldUser || !oldUser.email) {
      report.unmatched.push({ oldSlugId, reason: !oldUser ? "sem correspondência em users antigos" : "user antigo sem email" });
      console.warn(`  [SKIP] ${oldSlugId}: sem correspondência em "users" (antigo) ou sem email.`);
      continue;
    }

    const newUser = newUsersByEmail.get(oldUser.email);
    if (!newUser) {
      report.unmatched.push({ oldSlugId, email: oldUser.email, nome: oldUser.nome, reason: "email não encontrado em users novos" });
      console.warn(`  [SKIP] ${oldSlugId} (${oldUser.email}): não encontrado na base nova.`);
      continue;
    }

    const registrosSnapshot = await oldDocRef.collection("Registros").get();
    if (registrosSnapshot.empty) {
      continue;
    }

    console.log(`  [OK] ${oldSlugId} (${oldUser.email}) -> uid ${newUser.uid}: ${registrosSnapshot.size} registos`);

    await migrateEntriesForUser({
      newDb,
      oldSlugId,
      newUid: newUser.uid,
      oldRegistrosSnapshot: registrosSnapshot,
      report,
      overwrite: OVERWRITE,
      dryRun: DRY_RUN,
    });
  }

  report.finishedAt = new Date().toISOString();

  const outDir = path.join(__dirname, "migration-output");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `timetracking-entries-${Date.now()}.json`);
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2), "utf8");

  console.log("\n===== Resumo =====");
  console.log(`Users migrados:        ${report.users.length}`);
  console.log(`Users sem match:       ${report.unmatched.length}`);
  console.log(`Registos migrados:     ${report.entriesMigrated}`);
  console.log(`Registos já existentes (saltados): ${report.entriesSkippedExisting}`);
  console.log(`Relatório completo em: ${outFile}`);

  if (DRY_RUN) {
    console.log("\nNenhuma alteração foi escrita (--dry-run). Corre sem essa flag para aplicar.");
  }

  await Promise.all([admin.app("oldDb").delete(), admin.app("newDb").delete()]);
}

main().catch((err) => {
  console.error("Erro fatal na migração:", err);
  process.exit(1);
});
