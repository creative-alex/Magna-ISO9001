const admin = require("firebase-admin");
const db = admin.firestore();

const MENSAGEM_MES_FECHADO = "Este mês já foi fechado e não pode ser alterado. Contacte o RH caso necessite de efetuar uma correção.";

// "DD-MM-YYYY" (formato usado em Ferias/BaixasMedicas/AjustesPendentes) -> "YYYY-MM"
// (formato do documento fechoMensal, igual ao usado em salarios/{mes}).
function mesFromDataCompleta(dateStr) {
  const parts = (dateStr || "").split("-");
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  if (!dd || !mm || !yyyy) return null;
  return `${yyyy}-${mm.padStart(2, "0")}`;
}

// Um mês fica fechado assim que o colaborador (ou um admin/RH em nome dele) o confirma -
// ver fechoMensalController.confirmFechoMensal. A partir daí o próprio colaborador deixa
// de poder criar/alterar férias, baixas ou pedidos de alteração de horas nesse mês; um
// admin/RH continua a poder (ver refreshFechoMensalSnapshotIfClosed, chamado a seguir a
// essas correções para o processamento de salários não ficar preso ao snapshot antigo).
async function isMonthClosed(uid, dateStr) {
  const mes = mesFromDataCompleta(dateStr);
  if (!mes) return false;
  const doc = await db.collection("users").doc(uid).collection("fechoMensal").doc(mes).get();
  return doc.exists && doc.data().confirmed === true;
}

// Chamado depois de uma escrita administrativa (edição de horas, férias/baixa marcada ou
// aprovada em nome de alguém, registo apagado, ...) que possa alterar os totais de um mês
// já fechado. Sem isto, o processamento de salários continuaria a usar o summarySnapshot
// calculado na confirmação original, ignorando a correção.
async function refreshFechoMensalSnapshotIfClosed(uid, dateStr, actorUid) {
  const mes = mesFromDataCompleta(dateStr);
  if (!mes) return;

  const fechoRef = db.collection("users").doc(uid).collection("fechoMensal").doc(mes);
  const fechoDoc = await fechoRef.get();
  if (!fechoDoc.exists || fechoDoc.data().confirmed !== true) return;

  // Import tardio para evitar dependência circular (reportsController não precisa de
  // conhecer este módulo, só o inverso).
  const { calculateMonthlyAttendanceSummary } = require("../../domains/timeTracking/reportsController");
  const [ano, mesNum] = mes.split("-").map(Number);
  const confirmedAt = fechoDoc.data().confirmedAt?.toDate?.() || null;

  const { diasTrabalhados, diasFerias, diasBaixaMedica, diasAniversario, diasFalta } =
    await calculateMonthlyAttendanceSummary({ uid, year: ano, month: mesNum, assumeWorkedFrom: confirmedAt });

  await fechoRef.set({
    summarySnapshot: { diasTrabalhados, diasFerias, diasBaixaMedica, diasAniversario, diasFalta },
    correctedAt: admin.firestore.FieldValue.serverTimestamp(),
    correctedBy: actorUid,
  }, { merge: true });
}

module.exports = { isMonthClosed, refreshFechoMensalSnapshotIfClosed, mesFromDataCompleta, MENSAGEM_MES_FECHADO };
