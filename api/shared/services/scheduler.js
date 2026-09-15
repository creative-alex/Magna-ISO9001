const cron = require("node-cron");
const {
  sendMonthlyClosingReminders,
  sendSecondMonthlyClosingReminders,
  sweepUnconfirmedMonths,
} = require("../../domains/fechoMensal/fechoMensalController");

// Fecho mensal (ver plano em memória/PRs): dia 20 envia o email de aviso, dia 24 envia um
// segundo aviso mais urgente a quem ainda não confirmou, dia 26 sinaliza quem não confirmou
// até ao prazo do dia 25. Corre uma vez por dia às 08:00 e decide internamente o que fazer,
// em vez de três expressões cron separadas, para ficar tudo num único ponto de log em caso
// de falha.
function startSchedulers() {
  cron.schedule("0 8 * * *", async () => {
    const day = new Date().getDate();
    if (day === 20) {
      await sendMonthlyClosingReminders().catch(e => console.error("Erro ao enviar lembretes de fecho mensal:", e));
    }
    if (day === 24) {
      await sendSecondMonthlyClosingReminders().catch(e => console.error("Erro ao enviar segundos lembretes de fecho mensal:", e));
    }
    if (day === 26) {
      await sweepUnconfirmedMonths().catch(e => console.error("Erro ao sinalizar meses não confirmados:", e));
    }
  }, { timezone: "Europe/Lisbon" });
}

module.exports = { startSchedulers };
