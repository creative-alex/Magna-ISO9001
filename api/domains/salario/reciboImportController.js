const admin = require("firebase-admin");
const { PDFDocument } = require("pdf-lib");
const pdfParse = require("pdf-parse");
const db = require("../../shared/db/firebase").db;
const { isSuperAdminOrGestorFinanceiro } = require("../../shared/middleware/auth");
const { sendMail, renderEmail } = require("../../shared/services/mailer");
const { MES_REGEX, getMesLabel } = require("./salarioController");
const { extractNifFromText, extractNomeFromText, buildNifIndex, classifyPage } = require("./reciboImportService");

const bucket = admin.storage().bucket();

// Acima disto o PDF é rejeitado antes de gastar qualquer tempo de CPU a extrair texto -
// um recibo mensal de uma empresa deste tipo não deverá ter isto de colaboradores.
const MAX_PAGINAS = 300;

// Extrai o texto de cada página numa única passagem do pdf-parse, em vez de separar as
// páginas primeiro e correr um parse por página - o hook "pagerender" é chamado uma vez por
// página à medida que o pdf.js (usado internamente pelo pdf-parse) as percorre.
async function extractTextPerPage(buffer) {
  const pagesText = [];
  await pdfParse(buffer, {
    pagerender(pageData) {
      return pageData.getTextContent({ normalizeWhitespace: true }).then((textContent) => {
        const text = textContent.items.map((item) => item.str).join(" ");
        pagesText[pageData.pageIndex] = text;
        return text;
      });
    },
  });
  return pagesText;
}

const MOTIVO_LABELS = {
  sem_nif: "Nenhum NIF encontrado na página",
  nif_invalido: "NIF encontrado não é válido",
  multiplos_candidatos_nif: "Vários números de 9 dígitos na página, nenhum identificável com confiança como NIF",
  nif_desconhecido: "NIF válido mas não corresponde a nenhum colaborador",
  nif_ambiguo: "NIF corresponde a mais do que um colaborador",
  colaborador_inativo: "Colaborador identificado mas não está ativo",
  pagina_duplicada: "Mais do que uma página deste PDF corresponde ao mesmo colaborador",
  ja_existe: "Este colaborador já tem um recibo importado para este mês",
  falha_ao_gravar: "Falha técnica ao gravar este recibo",
};

// Importação em lote de recibos de vencimento a partir de um único PDF mensal (uma página
// por colaborador). Reaproveita o mesmo destino do upload manual (RecibosVencimento/{uid}/
// {ano}/{mes}.pdf e users/{uid}/salarios/{mes}.recibo_path, ver uploadRecibo em
// salarioController.js) - só a origem da associação muda (NIF extraído em vez de uid na URL).
//
// Dois modos, no mesmo endpoint:
//  - Pré-visualização (sem "paginas" no pedido): analisa e classifica todas as páginas, mas
//    NÃO grava nada nem envia emails - só devolve o que faria.
//  - Confirmação (com "paginas": array de números de página no pedido): repete a mesma
//    análise (o ficheiro é sempre reenviado, nunca fica guardado em memória entre pedidos) e
//    só grava + notifica por email as páginas explicitamente escolhidas por quem confirma,
//    mesmo que outras também tenham dado "ok" - a escolha de quem guardar e notificar é
//    sempre humana, nunca automática.
//
// Nunca associa por nome nem por "parecença": só considera "ok" quando o NIF extraído é
// válido, corresponde a exatamente um colaborador ativo, essa página não é duplicada de outra
// do mesmo PDF, e esse colaborador ainda não tem recibo desse mês - qualquer outro caso fica
// em "review" para resolução manual (upload individual já existente), nunca é descartado.
const importRecibos = async (req, res) => {
  try {
    if (!isSuperAdminOrGestorFinanceiro(req.user?.nivelAcesso)) {
      return res.status(403).json({ error: "Acesso restrito a administradores e gestores financeiros" });
    }

    const { mes } = req.params;
    if (!MES_REGEX.test(mes)) {
      return res.status(400).json({ error: "Mês inválido (formato esperado AAAA-MM)" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Nenhum ficheiro enviado" });
    }
    if (req.file.mimetype !== "application/pdf") {
      return res.status(400).json({ error: "O ficheiro tem de ser um PDF" });
    }

    // "paginas" (opcional, enviado como campo de texto no multipart): array JSON de números
    // de página a gravar+notificar de facto. A sua ausência é o que distingue pré-visualização
    // de confirmação (ver nota acima) - nunca se confia em nenhum outro sinal para isto.
    let paginasSelecionadas = null;
    if (req.body.paginas !== undefined) {
      try {
        const parsed = JSON.parse(req.body.paginas);
        if (!Array.isArray(parsed)) throw new Error("não é um array");
        paginasSelecionadas = new Set(parsed.map(Number));
      } catch (err) {
        return res.status(400).json({ error: "Lista de páginas selecionadas inválida" });
      }
    }
    const isConfirmacao = paginasSelecionadas !== null;

    const buffer = req.file.buffer;

    // Sem bloqueio por hash do ficheiro completo: o mesmo PDF pode legitimamente ter de ser
    // reenviado várias vezes no mesmo mês (ex.: um colaborador ainda sem NIF no cadastro cai
    // em revisão na primeira vez; depois de o Gestor Financeiro completar o cadastro, volta-se
    // a importar o MESMO ficheiro só para apanhar esse colaborador). A proteção contra
    // duplicados é sempre por colaborador/mês (ver "ja_existe" abaixo), nunca pelo ficheiro.
    let pdfDoc;
    try {
      pdfDoc = await PDFDocument.load(buffer);
    } catch (err) {
      return res.status(400).json({ error: "Ficheiro PDF inválido ou corrompido" });
    }

    const totalPaginas = pdfDoc.getPageCount();
    if (totalPaginas === 0) {
      return res.status(400).json({ error: "O PDF não tem páginas" });
    }
    if (totalPaginas > MAX_PAGINAS) {
      return res.status(400).json({ error: `O PDF tem demasiadas páginas (máximo ${MAX_PAGINAS})` });
    }

    // O motor de extração de texto (pdf.js embutido no pdf-parse) é bastante mais antigo do
    // que o pdf-lib usado acima só para contar páginas/separar - PDFs gerados por algum
    // software de processamento de salários mais recente podem, em casos raros, usar uma
    // estrutura que este motor não consiga ler. Nesse caso falha aqui, de forma clara, em
    // vez de avançar com texto vazio/corrompido e arriscar não encontrar nenhum NIF.
    let pagesText;
    try {
      pagesText = await extractTextPerPage(buffer);
    } catch (err) {
      console.error("Erro ao extrair texto do PDF:", err.message);
      return res.status(400).json({ error: "Não foi possível ler o texto deste PDF. Confirma que o ficheiro não está corrompido ou protegido." });
    }

    // Única leitura Firestore para todos os colaboradores - o mapa nif->uid e os dados
    // necessários para o email são construídos a partir desta mesma leitura, nunca uma
    // query/leitura extra por página nem por colaborador candidato.
    const usersSnapshot = await db.collection("users").get();
    const usersByUid = new Map();
    const colaboradores = usersSnapshot.docs.map((doc) => {
      const data = doc.data();
      usersByUid.set(doc.id, data);
      return { uid: doc.id, nif: data.nif, nome: data.nome, situacao_contratual: data.situacao_contratual };
    });
    const nifIndex = buildNifIndex(colaboradores);

    const resultados = [];
    for (let i = 0; i < totalPaginas; i++) {
      const { nif, motivo } = extractNifFromText(pagesText[i] || "");
      const classificacao = classifyPage({ nif, motivoExtracao: motivo }, nifIndex);
      resultados.push({ pagina: i + 1, nif, ...classificacao });
    }

    // Páginas duplicadas dentro do mesmo PDF (duas páginas a resolver para o mesmo
    // colaborador): nenhuma das duas é gravada automaticamente.
    const contagemPorUid = new Map();
    resultados.forEach((r) => {
      if (r.status === "ok") contagemPorUid.set(r.uid, (contagemPorUid.get(r.uid) || 0) + 1);
    });
    resultados.forEach((r) => {
      if (r.status === "ok" && contagemPorUid.get(r.uid) > 1) {
        r.status = "review";
        r.motivo = "pagina_duplicada";
      }
    });

    // Recibo já existente este mês: só verificado para quem, até aqui, ficou "ok" - o custo
    // desta leitura é proporcional ao nº de colaboradores candidatos desta importação
    // (tipicamente = nº de páginas do PDF), nunca à totalidade da empresa nem por página.
    const ano = mes.split("-")[0];
    const candidatosOk = resultados.filter((r) => r.status === "ok");
    const existentes = await Promise.all(
      candidatosOk.map((r) => db.collection("users").doc(r.uid).collection("salarios").doc(mes).get())
    );
    existentes.forEach((doc, idx) => {
      if (doc.exists && doc.data().recibo_path) {
        candidatosOk[idx].status = "review";
        candidatosOk[idx].motivo = "ja_existe";
      }
    });

    // Escrita: só em modo confirmação, e só para as páginas "ok" que foram explicitamente
    // escolhidas (ver paginasSelecionadas acima) - em pré-visualização nada chega a acontecer
    // aqui. Cada colaborador é gravado (Storage + Firestore) de forma independente dos
    // outros - uma falha técnica a meio do lote só afeta esse colaborador (cai em "erro"),
    // nunca deixa os já gravados inconsistentes nem impede os restantes de continuar.
    const paraGravar = isConfirmacao
      ? resultados.filter((r) => r.status === "ok" && paginasSelecionadas.has(r.pagina))
      : [];

    if (paraGravar.length > 0) {
      await Promise.allSettled(paraGravar.map(async (r) => {
        try {
          const novoDoc = await PDFDocument.create();
          const [pagina] = await novoDoc.copyPages(pdfDoc, [r.pagina - 1]);
          novoDoc.addPage(pagina);
          const pdfBytes = await novoDoc.save();

          const filePath = `RecibosVencimento/${r.uid}/${ano}/${mes}.pdf`;
          await bucket.file(filePath).save(Buffer.from(pdfBytes), {
            metadata: { contentType: "application/pdf" },
          });

          await db.collection("users").doc(r.uid).collection("salarios").doc(mes).set({
            emissao_envio_recibos: true,
            recibo_path: filePath,
            recibo_uploaded_at: admin.firestore.FieldValue.serverTimestamp(),
            recibo_uploaded_by: req.user.uid,
            recibo_importado_em_lote: true,
          }, { merge: true });
        } catch (err) {
          console.error(`Erro ao gravar recibo importado em lote (colaborador uid=${r.uid}):`, err.message);
          r.status = "erro";
          r.motivo = "falha_ao_gravar";
        }
      }));
    }

    // Em confirmação, uma página "ok" que não foi selecionada não entra em nenhum dos três
    // grupos da resposta (o frontend já sabe que não a escolheu) - só as escolhidas (agora
    // gravadas, ou "erro" se a gravação falhou) e as que já estavam em revisão aparecem.
    const relevantes = isConfirmacao
      ? resultados.filter((r) => r.status !== "ok" || paginasSelecionadas.has(r.pagina))
      : resultados;

    const finalOk = relevantes.filter((r) => r.status === "ok");
    const finalReview = relevantes.filter((r) => r.status === "review");
    const finalErro = relevantes.filter((r) => r.status === "erro");

    const resumo = { ok: finalOk.length, review: finalReview.length, erro: finalErro.length };

    // Emails de notificação: só disparados em confirmação, só para quem acabou de ser
    // gravado com sucesso (finalOk) - nunca em pré-visualização. Disparados sem bloquear a
    // resposta e sem que uma falha de SMTP faça a confirmação parecer ter falhado. Reaproveita
    // os dados já lidos em usersByUid, sem nenhuma leitura Firestore adicional.
    if (isConfirmacao && finalOk.length > 0) {
      const mesLabel = getMesLabel(mes);
      Promise.allSettled(finalOk.map((r) => {
        const userData = usersByUid.get(r.uid);
        if (!userData?.email) return Promise.resolve();
        return sendMail({
          to: userData.email,
          subject: `Recibo de vencimento disponível - ${mesLabel}`,
          html: renderEmail("recibo-vencimento", { nome: userData.nome || "", mesLabel, eyebrow: "Recibo de vencimento" }),
          entidade: userData.entidade,
        });
      })).catch(() => {});
    }

    res.json({
      mes,
      totalPaginas,
      confirmado: isConfirmacao,
      resumo,
      ok: finalOk.map((r) => ({
        pagina: r.pagina, uid: r.uid, nome: r.nome || null, email: usersByUid.get(r.uid)?.email || null,
      })),
      // NIF em claro (não mascarado) nas páginas de revisão: este ecrã já é exclusivo de
      // quem também vê o NIF completo no Cadastro (ver isSuperAdminOrGestorFinanceiro
      // acima), e sem ele não é possível procurar/confirmar manualmente o colaborador
      // certo para um "nif_desconhecido"/"nif_ambiguo" - mascarar aqui só impedia a
      // própria resolução do caso.
      // "nomePdf": nome tal como impresso na própria página (extractNomeFromText) - só
      // preenchido quando não há "nome" (esse vem do cadastro, é sempre prioritário). Serve
      // só de contexto para o RH saber a quem associar o NIF; nunca decide a associação.
      review: finalReview.map((r) => ({
        pagina: r.pagina,
        motivo: r.motivo,
        motivoLabel: MOTIVO_LABELS[r.motivo] || r.motivo,
        nif: r.nif || null,
        nome: r.nome || null,
        nomePdf: r.nome ? null : extractNomeFromText(pagesText[r.pagina - 1] || ""),
      })),
      erros: finalErro.map((r) => ({ pagina: r.pagina, uid: r.uid, nome: r.nome || null })),
    });
  } catch (error) {
    console.error("Erro ao importar recibos em lote:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

module.exports = { importRecibos };
