// Validações de formato para campos do cadastro (documentos/contactos portugueses).
// Cada função recebe o valor tal como está no formulário e devolve true/false - quem
// chama decide a mensagem de erro e quando a validação já faz sentido ser mostrada
// (ex: só depois do valor ter o comprimento esperado, para não assinalar erro a meio da escrita).

export function validarNIF(nif) {
  const digitos = (nif || "").replace(/\D/g, "");
  if (digitos.length !== 9) return false;
  const nums = digitos.split("").map(Number);
  const soma = nums.slice(0, 8).reduce((acc, d, i) => acc + d * (9 - i), 0);
  const resto = soma % 11;
  const check = resto < 2 ? 0 : 11 - resto;
  return check === nums[8];
}

const PESOS_NISS = [29, 23, 19, 17, 13, 11, 7, 5, 3, 2];

export function validarNISS(niss) {
  const digitos = (niss || "").replace(/\D/g, "");
  if (digitos.length !== 11) return false;
  const nums = digitos.split("").map(Number);
  const soma = nums.slice(0, 10).reduce((acc, d, i) => acc + d * PESOS_NISS[i], 0);
  const check = 9 - (soma % 10);
  return check === nums[10];
}

export function validarCodigoPostal(cp) {
  return /^\d{4}-\d{3}$/.test((cp || "").trim());
}

export function validarTelefone(tel) {
  const digitos = (tel || "").replace(/[\s.()-]/g, "").replace(/^\+351/, "");
  return /^\d{9}$/.test(digitos);
}

// Só valida a forma do número (8 dígitos + dígito de controlo + 2 letras + dígito de
// versão) - não recalcula o dígito de controlo (algoritmo ISO 7064 MOD 37,36), para não
// arriscar rejeitar cartões válidos por um erro na implementação do checksum.
export function validarCartaoCidadao(cc) {
  const limpo = (cc || "").replace(/\s/g, "").toUpperCase();
  return /^\d{9}[A-Z]{2}\d$/.test(limpo);
}

// IBAN português: "PT50" + 21 dígitos, validado pelo checksum mod-97 (ISO 13616/7064).
export function validarIBAN(iban) {
  const limpo = (iban || "").replace(/\s/g, "").toUpperCase();
  if (!/^PT\d{23}$/.test(limpo)) return false;
  const rearranjado = limpo.slice(4) + limpo.slice(0, 4);
  const numerico = rearranjado.replace(/[A-Z]/g, ch => (ch.charCodeAt(0) - 55).toString());
  let resto = 0;
  for (let i = 0; i < numerico.length; i++) {
    resto = (resto * 10 + Number(numerico[i])) % 97;
  }
  return resto === 1;
}
