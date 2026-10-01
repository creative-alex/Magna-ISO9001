// Script único: remove o campo "horas_compensatorias" de todos os documentos de
// registo-ponto/*/Registos (todos os utilizadores, todos os anos), anulando todas
// as compensações de dias curtos feitas com o saldo anual de horas extra (ver
// compensateShortDay em timeTrackingController.js).
//
// Documentos que só existiam por causa da compensação (dia de falta total, criados
// por compensateShortDay só com "horas_compensatorias" + "timestamp") são apagados
// por inteiro, para não ficarem registos vazios a contar como dia com ponto.
//
// Aplica-se também a meses já fechados (fechoMensal), cujo summarySnapshot é
// recalculado no fim.
//
// Por omissão corre em modo simulação (não escreve nada, só lista o que faria).
// Para aplicar de facto, passar --apply.
//
// Uso:
//   node api/scripts/removeHorasCompensatorias.js           (simulação)
//   node api/scripts/removeHorasCompensatorias.js --apply   (aplica)

const admin = require("firebase-admin");
const { db } = require("../shared/db/firebase");

const APPLY = process.argv.includes("--apply");
const CAMPOS_SO_DA_COMPENSACAO = new Set(["horas_compensatorias", "timestamp"]);

async function main() {
  console.log(APPLY ? "MODO APLICAR - as alterações vão ser gravadas." : "MODO SIMULAÇÃO - nada vai ser gravado (usar --apply para aplicar).");

  const snapshot = await db.collectionGroup("Registos").get();
  console.log(`Documentos Registos encontrados: ${snapshot.size}`);

  let batch = db.batch();
  let opsInBatch = 0;
  let camposRemovidos = 0;
  let docsApagados = 0;
  let minutosTotais = 0;
  const mesesAfetados = new Set();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!Object.prototype.hasOwnProperty.call(data, "horas_compensatorias")) continue;

    // Só documentos de registo-ponto/{uid}/Registos (collectionGroup apanha qualquer
    // subcoleção chamada "Registos").
    if (doc.ref.parent.parent?.parent?.id !== "registo-ponto") continue;

    const uid = doc.ref.parent.parent.id;
    minutosTotais += Number(data.horas_compensatorias) || 0;

    // registo_DDMMYYYY -> "01-MM-YYYY" (basta o mês para o fecho mensal)
    const m = /^registo_(\d{2})(\d{2})(\d{4})$/.exec(doc.id);
    if (m) mesesAfetados.add(`${uid}|01-${m[2]}-${m[3]}`);

    const soCompensacao = Object.keys(data).every(k => CAMPOS_SO_DA_COMPENSACAO.has(k));
    if (soCompensacao) {
      console.log(`  [apagar doc]    ${uid}/${doc.id}  (${data.horas_compensatorias} min, sem ponto)`);
      if (APPLY) batch.delete(doc.ref);
      docsApagados++;
    } else {
      console.log(`  [remover campo] ${uid}/${doc.id}  (${data.horas_compensatorias} min)`);
      if (APPLY) batch.update(doc.ref, { horas_compensatorias: admin.firestore.FieldValue.delete() });
      camposRemovidos++;
    }

    if (APPLY && ++opsInBatch === 450) {
      await batch.commit();
      batch = db.batch();
      opsInBatch = 0;
    }
  }

  if (APPLY && opsInBatch > 0) {
    await batch.commit();
  }

  // Meses já fechados (fechoMensal confirmado) são alterados na mesma; recalcula-se o
  // summarySnapshot desses meses para o processamento de salários não ficar com os
  // totais antigos (refreshFechoMensalSnapshotIfClosed não faz nada a meses abertos).
  if (APPLY && mesesAfetados.size > 0) {
    const { refreshFechoMensalSnapshotIfClosed } = require("../shared/lib/monthLock");
    console.log(`\nA atualizar snapshots de fecho mensal (${mesesAfetados.size} mês/utilizador)...`);
    for (const chave of mesesAfetados) {
      const [uid, dateStr] = chave.split("|");
      await refreshFechoMensalSnapshotIfClosed(uid, dateStr, "script:removeHorasCompensatorias");
    }
  }

  console.log(`\nCampos removidos: ${camposRemovidos}`);
  console.log(`Documentos apagados (só tinham a compensação): ${docsApagados}`);
  console.log(`Total de minutos compensados anulados: ${minutosTotais} (${Math.floor(minutosTotais / 60)}h ${minutosTotais % 60}m)`);
  console.log(APPLY ? "Concluído." : "Simulação concluída - correr com --apply para aplicar.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
