// Feriados nacionais fixos, formato DD-MM (não inclui feriados municipais, que
// variam por sede  -  ver MUNICIPAL_HOLIDAY_DDMM_BY_SEDE/getMunicipalHolidayDDMM).
// 24 e 31 de dezembro ficam de fora porque são tratados à parte como "dias de
// dispensa" nalguns pontos do sistema (categoria distinta, não são feriados legais).
const NATIONAL_HOLIDAYS_DDMM = [
  "01-01", "25-04", "01-05", "10-06", "15-08",
  "05-10", "01-11", "01-12", "08-12", "25-12",
];

// Feriado municipal fixo de cada sede, formato DD-MM. Paredes fica de fora daqui
// porque o seu feriado municipal é móvel (ver getMunicipalHolidayDDMM). Sedes sem
// entrada aqui (ou por preencher) caem no feriado do Porto/Gaia (24-06)  -  era o
// comportamento de toda a gente antes de existirem feriados por sede.
const MUNICIPAL_HOLIDAY_DDMM_BY_SEDE = {
  "Coimbra": "04-07",            // Rainha Santa Isabel
  "Abrantes": "14-06",           // Elevação de Abrantes a cidade
};
const DEFAULT_MUNICIPAL_HOLIDAY_DDMM = "24-06";

function pad2(n) {
  return String(n).padStart(2, "0");
}

// Paredes: feriado do Divino Salvador, na segunda-feira seguinte ao 3º domingo de
// julho  -  por isso é móvel, ao contrário dos outros feriados municipais.
function getParedesHolidayDDMM(year) {
  const july1 = new Date(year, 6, 1);
  const firstSunday = 1 + ((7 - july1.getDay()) % 7);
  const thirdSunday = firstSunday + 14;
  const monday = new Date(year, 6, thirdSunday + 1);
  return `${pad2(monday.getDate())}-${pad2(monday.getMonth() + 1)}`;
}

// Feriado municipal da sede para o ano indicado (fixo ou móvel, consoante a sede).
function getMunicipalHolidayDDMM(sede, year) {
  if (sede === "Paredes") return getParedesHolidayDDMM(year);
  return MUNICIPAL_HOLIDAY_DDMM_BY_SEDE[sede] || DEFAULT_MUNICIPAL_HOLIDAY_DDMM;
}

// Páscoa pelo algoritmo de Meeus/Jones/Butcher.
function calculateEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

// Feriados móveis nacionais (Sexta-feira Santa, Corpo de Deus), formato DD-MM.
function getMoveableHolidaysDDMM(year) {
  const easter = calculateEaster(year);
  const goodFriday = new Date(easter);
  goodFriday.setDate(goodFriday.getDate() - 2);
  const corpusChristi = new Date(easter);
  corpusChristi.setDate(corpusChristi.getDate() + 60);
  const toDDMM = (d) => `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}`;
  return [toDDMM(goodFriday), toDDMM(corpusChristi)];
}

// Lista completa de feriados (nacionais fixos + móveis + municipal da sede) para
// o ano indicado, formato DD-MM. Usar isto para saber que dias não contam como
// falta/dia útil para um colaborador desta sede.
function getHolidaysDDMM(sede, year) {
  return [
    ...NATIONAL_HOLIDAYS_DDMM,
    getMunicipalHolidayDDMM(sede, year),
    ...getMoveableHolidaysDDMM(year),
  ];
}

module.exports = {
  NATIONAL_HOLIDAYS_DDMM,
  MUNICIPAL_HOLIDAY_DDMM_BY_SEDE,
  getMunicipalHolidayDDMM,
  getMoveableHolidaysDDMM,
  getHolidaysDDMM,
};
