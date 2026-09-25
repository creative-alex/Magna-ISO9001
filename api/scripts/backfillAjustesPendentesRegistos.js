// Script único: para cada documento em registo-ponto/*/AjustesPendentes com Approved:true,
// confirma se o registo correspondente em registo-ponto/{uid}/Registos/{registoId} já tem
// as horas aprovadas gravadas - e, se não tiver (ou o documento nem existir), cria/corrige-o.
//
// Motivo: encontrados pedidos de alteração de horas já aprovados (Approved:true) cujo
// Registos correspondente nunca chegou a ser escrito (ver applyTimeEdit em
// timeEditRequestController.js) ou ficou incompleto. Este script repõe esses registos a
// partir do que já está aprovado em AjustesPendentes, sem repetir nenhuma aprovação nem
// tocar nos pedidos ainda pendentes (Approved:false).
//
// Sem "where" no collectionGroup (filtra Approved em memória) - mesma convenção usada em
// getUidsComAjustesPendentes/getUidsComDeslocacoesPendentes, para não depender de um
// índice de collection group dedicado.
//
// Por omissão corre em modo simulação (não escreve nada, só relata o que faria).
// Uso:
//   node api/scripts/backfillAjustesPendentesRegistos.js           (dry-run)
//   node api/scripts/backfillAjustesPendentesRegistos.js --apply   (aplica as correções)
//
// Idempotente: documentos já corretos (Registos já tem as mesmas horas) são ignorados.

const { db } = require("../shared/db/firebase");

function registoIdFor(dd, mm, yyyy) {
  return `registo_${String(dd).padStart(2, "0")}${String(mm).padStart(2, "0")}${yyyy}`;
}

// Formato aceite: "DD-MM-YYYY" (mesmo formato gravado em AjustesPendentes.date).
function parseDataCompleta(date) {
  if (!date || typeof date !== "string") return null;
  const parts = date.split("-");
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts.map(Number);
  if (!dd || !mm || !yyyy) return null;
  return { dd, mm, yyyy };
}

async function main() {
  const apply = process.argv.includes("--apply");
  console.log(apply ? "Modo: A APLICAR correções." : "Modo: simulação (dry-run) - nada será escrito. Usa --apply para aplicar.");

  const snapshot = await db.collectionGroup("AjustesPendentes").get();
  console.log(`Total de pedidos de alteração de horas encontrados: ${snapshot.size}`);

  let aprovados = 0;
  let jaCorretos = 0;
  let corrigidos = 0;
  let invalidos = 0;
  const detalhes = [];

  let batch = db.batch();
  let opsInBatch = 0;

  for (const doc of snapshot.docs) {
    const ajuste = doc.data();
    if (ajuste.Approved !== true) continue;
    aprovados++;

    const uid = doc.ref.parent.parent.id;
    const parsed = parseDataCompleta(ajuste.date);
    if (!parsed) {
      invalidos++;
      console.warn(`  [ignorado - date inválida] ${doc.ref.path} date=${JSON.stringify(ajuste.date)}`);
      continue;
    }

    const { dd, mm, yyyy } = parsed;
    const registoId = registoIdFor(dd, mm, yyyy);
    const registoRef = db.collection("registo-ponto").doc(uid).collection("Registos").doc(registoId);
    const registoDoc = await registoRef.get();
    const registoData = registoDoc.exists ? registoDoc.data() : {};

    const faltaEntrada = !!ajuste.horaEntrada && registoData.horaEntrada !== ajuste.horaEntrada;
    const faltaSaida = !!ajuste.horaSaida && registoData.horaSaida !== ajuste.horaSaida;

    if (!faltaEntrada && !faltaSaida) {
      jaCorretos++;
      continue;
    }

    const updateData = { timestamp: new Date(yyyy, mm - 1, dd) };
    if (ajuste.horaEntrada) updateData.horaEntrada = ajuste.horaEntrada;
    if (ajuste.horaSaida) updateData.horaSaida = ajuste.horaSaida;

    corrigidos++;
    detalhes.push(
      `  [${apply ? "CORRIGIDO" : "a corrigir"}] ${registoRef.path} <- ${JSON.stringify(updateData)} (documento já existia: ${registoDoc.exists})`
    );

    if (apply) {
      batch.set(registoRef, updateData, { merge: true });
      opsInBatch++;
      if (opsInBatch === 450) {
        await batch.commit();
        batch = db.batch();
        opsInBatch = 0;
      }
    }
  }

  if (apply && opsInBatch > 0) {
    await batch.commit();
  }

  detalhes.forEach((linha) => console.log(linha));
  console.log(`\nPedidos aprovados encontrados: ${aprovados}`);
  console.log(`Já corretos (nada a fazer): ${jaCorretos}`);
  console.log(`${apply ? "Corrigidos" : "A corrigir (dry-run)"}: ${corrigidos}`);
  console.log(`Inválidos (date malformada, ignorados): ${invalidos}`);
  if (!apply && corrigidos > 0) {
    console.log("\nNada foi escrito. Corre com --apply para aplicar estas correções.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Erro no backfill de AjustesPendentes -> Registos:", err);
    process.exit(1);
  });
