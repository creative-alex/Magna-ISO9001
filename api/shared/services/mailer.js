const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const handlebars = require("handlebars");

// Conta de no-reply usada pelo nodemailer (SMTP mail.comenius.pt).
const NODEEMAIL = process.env.NODEEMAIL;
const NODEPASSWORD = process.env.NODEPASSWORD;

const transporter = nodemailer.createTransport({
  host: "mail.comenius.pt",
  port: 465,
  secure: true, // true porque é a porta 465 (SSL)
  auth: { user: NODEEMAIL, pass: NODEPASSWORD },
});

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
// com a marca da entidade), devolvendo o HTML final pronto a enviar.
function renderEmail(templateName, data) {
  const body = compileTemplate(templateName)(data);
  return compileTemplate("base-layout")({ ...data, body, logoCid: LOGO_CID });
}

const LOGO_CID = "magna-logo";
const ENTIDADES_LOGOS_DIR = path.join(__dirname, "emailTemplates", "assets", "entidades");
const DEFAULT_LOGO_ATTACHMENT = {
  filename: "logo.png",
  path: path.join(__dirname, "emailTemplates", "assets", "logo.png"),
  cid: LOGO_CID,
};
const LOGO_EXTENSIONS = [".png", ".jpg", ".jpeg"];

// Cada entidade pode ter o seu próprio logo em assets/entidades/<entityId>.{png,jpg},
// nomeado com o mesmo ID normalizado usado em entityController (normalizeEntityId).
// Quando não existe ficheiro para a entidade, usa-se o logo genérico como fallback.
function getLogoAttachment(entidadeRef) {
  const entityId = entidadeRef?.replace(/^entidades\//, "");
  if (entityId) {
    for (const ext of LOGO_EXTENSIONS) {
      const filePath = path.join(ENTIDADES_LOGOS_DIR, `${entityId}${ext}`);
      if (fs.existsSync(filePath)) {
        return { filename: `logo${ext}`, path: filePath, cid: LOGO_CID };
      }
    }
  }
  return DEFAULT_LOGO_ATTACHMENT;
}

async function sendMail({ to, subject, html, entidade }) {
  if (!to) {
    console.error("Sem destinatário  -  email não enviado:", subject);
    return;
  }
  if (!NODEEMAIL || !NODEPASSWORD) {
    console.error("Nenhuma conta de no-reply configurada (NODEEMAIL/NODEPASSWORD)  -  email não enviado:", subject);
    return;
  }

  const logoAttachment = getLogoAttachment(entidade);

  await transporter.sendMail({
    from: `"MAGNA ISO9001" <${NODEEMAIL}>`,
    to,
    subject,
    html,
    attachments: [logoAttachment],
  });
}

module.exports = { sendMail, renderEmail, LOGO_CID };
