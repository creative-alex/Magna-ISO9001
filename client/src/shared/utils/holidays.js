// Feriados portugueses fixos (Porto)  -  formato DD-MM
export const HOLIDAYS_PORTO = [
  "01-01",   // Ano Novo
  "25-04",   // Dia da Liberdade
  "01-05",   // Dia do Trabalhador
  "10-06",   // Dia de Portugal, de Camões e das Comunidades Portuguesas
  "15-08",   // Assunção de Nossa Senhora
  "05-10",   // Implantação da República
  "01-11",   // Todos os Santos
  "01-12",   // Restauração da Independência
  "08-12",   // Imaculada Conceição
  "24-12",   // Véspera de Natal
  "25-12",   // Natal
  "31-12",   // Véspera de Ano Novo
  "24-06",   // São João do Porto
];

// Calcula a Páscoa pelo algoritmo de Meeus/Jones/Butcher
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

// Retorna os feriados móveis do ano em formato DD-MM
export const getMoveableHolidays = (year) => {
  const easter = calculateEaster(year);

  const goodFriday = new Date(easter);
  goodFriday.setDate(goodFriday.getDate() - 2);

  const corpusChristi = new Date(easter);
  corpusChristi.setDate(corpusChristi.getDate() + 60);

  const toDDMM = (d) =>
    `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  return [toDDMM(goodFriday), toDDMM(corpusChristi)];
};
