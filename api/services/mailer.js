const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const handlebars = require("handlebars");

// Contas de no-reply usadas pelo nodemailer, por ordem de tentativa: se o envio falhar
// numa conta (ex: limite de envio do Gmail atingido), tenta a seguinte antes de desistir.
const ACCOUNTS = [
  { user: process.env.NODEEMAIL, pass: process.env.NODEPASSWORD },
  { user: process.env.NODEEMAIL2, pass: process.env.NODEPASSWORD2 },
  { user: process.env.NODEEMAIL3, pass: process.env.NODEPASSWORD3 },
].filter(account => account.user && account.pass);

const transporters = new Map();
function getTransporter(account) {
  if (!transporters.has(account.user)) {
    transporters.set(account.user, nodemailer.createTransport({
      service: "gmail",
      auth: { user: account.user, pass: account.pass },
    }));
  }
  return transporters.get(account.user);
}

const TEMPLATES_DIR = path.join(__dirname, "emailTemplates");
const compiledTemplates = new Map();
function compileTemplate(name) {
  if (!compiledTemplates.has(name)) {
    const source = fs.readFileSync(path.join(TEMPLATES_DIR, `${name}.hbs`), "utf8");
    compiledTemplates.set(name, handlebars.compile(source));
  }
  return compiledTemplates.get(name);
}

// Renderiza um template hbs (o corpo do email) dentro do layout base (cabeçalho/rodapé
// com a marca MAGNA ISO9001), devolvendo o HTML final pronto a enviar.
function renderEmail(templateName, data) {
  const body = compileTemplate(templateName)(data);
  return compileTemplate("base-layout")({ ...data, body, logoCid: LOGO_CID });
}

const LOGO_CID = "magna-logo";
const LOGO_ATTACHMENT = {
  filename: "logo.png",
  path: path.join(__dirname, "emailTemplates", "assets", "logo.png"),
  cid: LOGO_CID,
};

async function sendMail({ to, subject, html }) {
  if (!to) {
    console.error("Sem destinatário  -  email não enviado:", subject);
    return;
  }
  if (ACCOUNTS.length === 0) {
    console.error("Nenhuma conta de no-reply configurada (NODEEMAIL/NODEPASSWORD)  -  email não enviado:", subject);
    return;
  }

  let lastError = null;
  for (const account of ACCOUNTS) {
    try {
      await getTransporter(account).sendMail({
        from: `"MAGNA ISO9001" <${account.user}>`,
        to,
        subject,
        html,
        attachments: [LOGO_ATTACHMENT],
      });
      return;
    } catch (error) {
      lastError = error;
      console.error(`Falha ao enviar email via ${account.user}, a tentar próxima conta:`, error.message);
    }
  }
  throw lastError;
}

module.exports = { sendMail, renderEmail, LOGO_CID };
