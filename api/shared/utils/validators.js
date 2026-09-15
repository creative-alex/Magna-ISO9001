// Validações de formato para campos do cadastro (documentos/contactos portugueses).
// Rede de segurança do lado do servidor - o cliente já bloqueia o "Guardar" com estes
// mesmos formatos inválidos (ver client/src/shared/utils/validators.js), mas a API não
// deve confiar apenas nisso.

function validarNIF(nif) {
  const digitos = (nif || "").replace(/\D/g, "");
  if (digitos.length !== 9) return false;
  const nums = digitos.split("").map(Number);
  const soma = nums.slice(0, 8).reduce((acc, d, i) => acc + d * (9 - i), 0);
  const resto = soma % 11;
  const check = resto < 2 ? 0 : 11 - resto;
  return check === nums[8];
}

const PESOS_NISS = [29, 23, 19, 17, 13, 11, 7, 5, 3, 2];

function validarNISS(niss) {
  const digitos = (niss || "").replace(/\D/g, "");
  if (digitos.length !== 11) return false;
  const nums = digitos.split("").map(Number);
  const soma = nums.slice(0, 10).reduce((acc, d, i) => acc + d * PESOS_NISS[i], 0);
  const check = 9 - (soma % 10);
  return check === nums[10];
}

function validarCodigoPostal(cp) {
  return /^\d{4}-\d{3}$/.test((cp || "").trim());
}

function validarTelefone(tel) {
  const digitos = (tel || "").replace(/[\s.()-]/g, "").replace(/^\+351/, "");
  return /^\d{9}$/.test(digitos);
}

function validarCartaoCidadao(cc) {
  const limpo = (cc || "").replace(/\s/g, "").toUpperCase();
  return /^\d{9}[A-Z]{2}\d$/.test(limpo);
}

function validarIBAN(iban) {
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

module.exports = {
  validarNIF, validarNISS, validarCodigoPostal, validarTelefone, validarCartaoCidadao, validarIBAN,
};
