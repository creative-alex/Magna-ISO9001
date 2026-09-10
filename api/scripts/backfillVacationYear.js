// Script único: adiciona o campo numérico "year" aos documentos existentes de
// registo-ponto/*/Ferias e registo-ponto/*/DiasAniversario, parseado a partir
// do campo "date" (formato dd-mm-yyyy). Necessário porque getVacationMap,
// getUsedDaysForYear e getUsedBirthdayDaysForYear passaram a filtrar por
// `.where("year", "==", ano)` em vez de ler a coleção toda — sem este backfill,
// os documentos antigos (sem "year") deixariam de aparecer no mapa de férias.
//
// Idempotente: pode ser corrido mais que uma vez sem duplicar nem estragar nada
// (documentos já com o "year" certo são ignorados).
//
// Uso: node api/scripts/backfillVacationYear.js

const { db } = require("../shared/db/firebase");

function parseYear(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;
  const year = parseInt(parts[2], 10);
  return Number.isFinite(year) ? year : null;
}

async function backfillCollectionGroup(collectionName) {
  const snapshot = await db.collectionGroup(collectionName).get();
  console.log(`[${collectionName}] documentos encontrados: ${snapshot.size}`);

  let batch = db.batch();
  let opsInBatch = 0;
  let updated = 0;
  let jaCorretos = 0;
  let invalidos = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const year = parseYear(data.date);

    if (year === null) {
      invalidos++;
      console.warn(`  [ignorado - date inválida] ${doc.ref.path} date=${JSON.stringify(data.date)}`);
      continue;
    }

    if (data.year === year) {
      jaCorretos++;
      continue;
    }

    batch.update(doc.ref, { year });
    opsInBatch++;
    updated++;

    if (opsInBatch === 450) {
      await batch.commit();
      batch = db.batch();
      opsInBatch = 0;
    }
  }

  if (opsInBatch > 0) {
    await batch.commit();
  }

  console.log(`[${collectionName}] atualizados=${updated} já corretos=${jaCorretos} inválidos=${invalidos}`);
}

async function main() {
  await backfillCollectionGroup("Ferias");
  await backfillCollectionGroup("DiasAniversario");
  console.log("Backfill concluído.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Erro no backfill:", err);
  process.exit(1);
});
