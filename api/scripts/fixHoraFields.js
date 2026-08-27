// Script de manutenção: corrige registos de ponto em que horaEntrada/horaSaida
// ficaram gravados com a data incluída (ex: "2026-08-25 09:00" ou um ISO
// completo) em vez de só a hora ("09:00"), que é o formato esperado pelo
// resto da app (ex: calcularHoras em client/src/utils/timeTracking/calcHours.js).
//
// Uso (a partir da pasta api/):
//   node scripts/fixHoraFields.js            -> dry-run, só mostra o que ia mudar
//   node scripts/fixHoraFields.js --apply    -> aplica as correções no Firestore
//
// Requer as mesmas credenciais Firebase Admin que o servidor usa
// (api/db/serviceAccountKey.json ou a env var FIREBASE_SERVICE_ACCOUNT_JSON).

const { db } = require("../shared/db/firebase");

const APPLY = process.argv.includes("--apply");

const HORA_OK = /^\d{1,2}:\d{2}$/;

// Tenta extrair só a hora (HH:mm) de um valor que pode já estar correto,
// ou pode ter a data incluída em vários formatos possíveis.
function extractHora(valorOriginal) {
  if (typeof valorOriginal !== "string") return { ok: true, hora: null };

  const trimmed = valorOriginal.trim();

  if (HORA_OK.test(trimmed)) {
    return { ok: true, hora: null }; // já está correto, nada a fazer
  }

  // "YYYY-MM-DD HH:mm" ou "DD-MM-YYYY HH:mm" -> a hora é a última parte
  if (trimmed.includes(" ")) {
    const ultimaParte = trimmed.split(" ").pop();
    if (HORA_OK.test(ultimaParte)) {
      return { ok: true, hora: ultimaParte };
    }
  }

  // ISO completo, ex: "2026-08-25T09:00:00.000Z" -> converter para hora local (Europe/Lisbon)
  if (trimmed.includes("T")) {
    const data = new Date(trimmed);
    if (!isNaN(data.getTime())) {
      const horaLocal = data.toLocaleTimeString("pt-PT", {
        timeZone: "Europe/Lisbon",
        hour: "2-digit",
        minute: "2-digit",
      });
      return { ok: true, hora: horaLocal };
    }
  }

  // Último recurso: procurar um padrão HH:mm em qualquer parte da string
  const match = trimmed.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    return { ok: true, hora: `${match[1].padStart(2, "0")}:${match[2]}` };
  }

  return { ok: false, hora: null }; // não foi possível interpretar
}

async function run() {
  console.log(APPLY ? "Modo: APLICAR alterações\n" : "Modo: DRY-RUN (nenhuma alteração é guardada)\n");

  // Nota: registo-ponto/{uid} é um documento "virtual" (nunca é criado com
  // .set() diretamente) - só existe por ter a subcoleção "Registos" por
  // baixo. Por isso não se pode enumerar via db.collection("registo-ponto").get()
  // (devolve 0); uma collectionGroup query encontra os documentos "Registos"
  // de TODOS os utilizadores de uma vez, independentemente do documento pai.
  const registosSnapshot = await db.collectionGroup("Registos").get();

  const uids = new Set(registosSnapshot.docs.map((d) => d.ref.parent.parent.id));
  console.log(`Utilizadores encontrados: ${uids.size}`);
  console.log(`Registos encontrados: ${registosSnapshot.size}\n`);

  let totalRegistos = 0;
  let totalCorrigidos = 0;
  let totalNaoInterpretados = 0;

  const BATCH_LIMIT = 400;
  let batch = db.batch();
  let opsNoBatch = 0;

  for (const registoDoc of registosSnapshot.docs) {
    totalRegistos++;
    const uid = registoDoc.ref.parent.parent.id;
    const data = registoDoc.data();
    const updates = {};

    for (const campo of ["horaEntrada", "horaSaida"]) {
      if (!data[campo]) continue;

      const { ok, hora } = extractHora(data[campo]);

      if (!ok) {
        console.warn(`  [?] ${uid}/${registoDoc.id} ${campo}="${data[campo]}" -> não interpretado, revisar manualmente`);
        totalNaoInterpretados++;
        continue;
      }

      if (hora && hora !== data[campo]) {
        updates[campo] = hora;
      }
    }

    if (Object.keys(updates).length > 0) {
      totalCorrigidos++;
      const resumo = Object.entries(updates)
        .map(([campo, novoValor]) => `${campo}: "${data[campo]}" -> "${novoValor}"`)
        .join(", ");
      console.log(`  ${uid}/${registoDoc.id}: ${resumo}`);

      if (APPLY) {
        batch.update(registoDoc.ref, updates);
        opsNoBatch++;
        if (opsNoBatch >= BATCH_LIMIT) {
          await batch.commit();
          batch = db.batch();
          opsNoBatch = 0;
        }
      }
    }
  }

  if (APPLY && opsNoBatch > 0) {
    await batch.commit();
  }

  console.log("\n--- Resumo ---");
  console.log(`Registos analisados:       ${totalRegistos}`);
  console.log(`Registos corrigidos:       ${totalCorrigidos}`);
  console.log(`Não interpretados:         ${totalNaoInterpretados}`);
  console.log(
    APPLY
      ? "\nAlterações guardadas no Firestore."
      : "\nDry-run: nada foi alterado. Corre com --apply para gravar as correções."
  );
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Erro ao corrigir registos:", err);
    process.exit(1);
  });
