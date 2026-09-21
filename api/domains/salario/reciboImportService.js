const { validarNIF } = require("../../shared/utils/validators");

// Rótulos habituais num recibo de vencimento português ("NIF", "N.I.F.", "Contribuinte",
// "N.º Contribuinte", ...). "n\.?\s*i\.?\s*f\.?" cobre tanto "NIF" como "N.I.F." (pontos
// entre as letras são frequentes no cabeçalho do colaborador).
const NIF_LABEL_ALTERNATIVAS = "n[uú]mero de identifica[cç][aã]o fiscal|n\\.?\\s*i\\.?\\s*f\\.?|n\\.?\\s*contribuinte|contribuinte";

// A maioria dos modelos escreve "rótulo: valor" (ex.: "NIF: 510388892" da entidade), mas
// alguns campos do mesmo PDF (visto num recibo real: Filosoft SIGEP) desenham o valor ANTES
// da legenda (ex.: "223312355 N.I.F. :" do colaborador) - por isso procuram-se as duas ordens,
// nunca só uma, e a escolha entre candidatos é feita pela âncora abaixo, não pela ordem.
const NIF_LABEL_ANTES_VALOR_REGEX = new RegExp(`(?:${NIF_LABEL_ALTERNATIVAS})\\s*[:\\-]?\\s*(\\d[\\d\\s.]{7,13}\\d)`, "gi");
const NIF_VALOR_ANTES_LABEL_REGEX = new RegExp(`(\\d[\\d\\s.]{7,13}\\d)\\s*[:\\-]?\\s*(?:${NIF_LABEL_ALTERNATIVAS})`, "gi");
const NIF_BARE_REGEX = /\b\d{9}\b/g;

// Alguns modelos de recibo têm dois números de NIF na mesma página: o da entidade
// empregadora (normalmente junto da data/mês, no bloco de cabeçalho) e o do colaborador
// (sempre junto da Segurança Social/Salário Base, no bloco de dados pessoais). Nunca se pode
// assumir que "o primeiro que aparece no texto" é o do colaborador - por isso, quando há mais
// do que uma ocorrência de NIF na página, usa-se a Segurança Social como âncora e escolhe-se
// o NIF imediatamente antes dela (o do colaborador), nunca o mais distante (o da entidade).
const ANCORA_SEG_SOCIAL_REGEX = /seg(?:uran[çc]a)?\.?\s*social/i;

// Extrai um candidato a NIF do texto de uma página. Nunca devolve um NIF sem validar o
// checksum (validarNIF) - se não houver exatamente um candidato válido e inequívoco, devolve
// null com o motivo, para a página cair em revisão em vez de arriscar uma associação errada.
function extractNifFromText(text) {
  const cleanText = text || "";

  const paraCandidatos = (regex) => [...cleanText.matchAll(regex)]
    .map((m) => ({ digits: m[1].replace(/\D/g, ""), index: m.index }))
    .filter((m) => m.digits.length === 9);

  const labelMatches = [
    ...paraCandidatos(NIF_LABEL_ANTES_VALOR_REGEX),
    ...paraCandidatos(NIF_VALOR_ANTES_LABEL_REGEX),
  ].sort((a, b) => a.index - b.index);

  if (labelMatches.length > 0) {
    let escolhido = labelMatches[0];
    if (labelMatches.length > 1) {
      const ancora = cleanText.match(ANCORA_SEG_SOCIAL_REGEX);
      const antesDaAncora = ancora ? labelMatches.filter((m) => m.index < ancora.index) : [];
      escolhido = antesDaAncora.length > 0 ? antesDaAncora[antesDaAncora.length - 1] : labelMatches[labelMatches.length - 1];
    }
    return validarNIF(escolhido.digits) ? { nif: escolhido.digits, motivo: null } : { nif: null, motivo: "nif_invalido" };
  }

  // Sem rótulo reconhecido: procura sequências de 9 dígitos "soltas" na página e só aceita
  // se exatamente uma delas passar o checksum de NIF - mais do que uma candidata válida é
  // ambiguidade dentro da própria página, não uma decisão que o sistema deva tomar sozinho.
  const bareCandidates = [...new Set(cleanText.match(NIF_BARE_REGEX) || [])];
  const validCandidates = bareCandidates.filter(validarNIF);
  if (validCandidates.length === 1) return { nif: validCandidates[0], motivo: null };
  if (validCandidates.length > 1) return { nif: null, motivo: "multiplos_candidatos_nif" };
  if (bareCandidates.length > 0) return { nif: null, motivo: "nif_invalido" };
  return { nif: null, motivo: "sem_nif" };
}

// Índice nif -> colaboradores (pode ter mais do que um, ver classifyPage) construído a
// partir de UMA única leitura da coleção "users" - nunca uma leitura/query por página.
function buildNifIndex(colaboradores) {
  const index = new Map();
  (colaboradores || []).forEach(({ uid, nif, nome, situacao_contratual }) => {
    const digits = (nif || "").replace(/\D/g, "");
    if (digits.length !== 9) return;
    if (!index.has(digits)) index.set(digits, []);
    index.get(digits).push({ uid, nome, situacao_contratual });
  });
  return index;
}

// Decide o destino de uma página já com o NIF extraído (ou o motivo de falha da extração)
// contra o índice nif->colaboradores. Só devolve status "ok" quando o NIF é válido,
// corresponde a exatamente um colaborador, e esse colaborador está ativo - qualquer outro
// caso cai em revisão com o motivo correspondente, nunca é resolvido "pelo mais parecido".
function classifyPage({ nif, motivoExtracao }, nifIndex) {
  if (!nif) return { status: "review", motivo: motivoExtracao || "sem_nif" };

  const matches = nifIndex.get(nif) || [];
  if (matches.length === 0) return { status: "review", motivo: "nif_desconhecido" };
  if (matches.length > 1) return { status: "review", motivo: "nif_ambiguo" };

  const [colaborador] = matches;
  if (colaborador.situacao_contratual && colaborador.situacao_contratual !== "Ativo") {
    return { status: "review", motivo: "colaborador_inativo", uid: colaborador.uid, nome: colaborador.nome };
  }
  return { status: "ok", uid: colaborador.uid, nome: colaborador.nome };
}

// Nome do colaborador tal como impresso no recibo (modelo Filosoft SIGEP, visto num recibo
// real: "RECIBO DE REMUNERAÇÕES 00001 DIOGO ALEXANDRE ALMEIDA NATÁRIO URBANIZAÇÃO..."). Só
// para dar contexto humano numa página de revisão (ex.: "nif_desconhecido" - dizer quem é,
// para o RH saber a quem associar o NIF no cadastro) - NUNCA usado para decidir a associação,
// que continua a ser sempre só pelo NIF (ver extractNifFromText/classifyPage). Se o modelo do
// PDF não tiver este rótulo, ou a heurística não conseguir isolar o nome, devolve null.
const NOME_APOS_RECIBO_REGEX = /RECIBO\s+DE\s+REMUNERA[CÇ][OÕ]ES\s+\d+\s+([A-ZÀ-Ü][A-ZÀ-Ü\s]{2,60}?)(?=\s+(?:URBANIZA[CÇ][AÃ]O|RUA|AVENIDA|AV\.|TRAVESSA|LARGO|PRA[CÇ]A|ESTRADA|LUGAR|BAIRRO|QUINTA|MONTE|CAMINHO|BECO|ZONA|APARTADO|EDIF[IÍ]CIO|\d))/i;

function extractNomeFromText(text) {
  const match = (text || "").match(NOME_APOS_RECIBO_REGEX);
  if (!match) return null;
  const nome = match[1].replace(/\s+/g, " ").trim();
  return nome.length >= 3 ? nome : null;
}

module.exports = {
  extractNifFromText, extractNomeFromText, buildNifIndex, classifyPage,
  NIF_LABEL_ANTES_VALOR_REGEX, NIF_VALOR_ANTES_LABEL_REGEX, NIF_BARE_REGEX,
};
