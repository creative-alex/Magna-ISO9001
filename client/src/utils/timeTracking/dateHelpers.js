import { DATE_FORMATS, HOLIDAYS_PORTO } from './constants';

// Formatação de datas
export const formatDate = (date, format = DATE_FORMATS.DEFAULT) => {
  if (!date) return '';
  
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  switch (format) {
    case DATE_FORMATS.DEFAULT:
      return `${day}-${month}-${year}`;
    case DATE_FORMATS.TIME:
      return `${hours}:${minutes}`;
    case DATE_FORMATS.DATETIME:
      return `${day}-${month}-${year} ${hours}:${minutes}`;
    case DATE_FORMATS.API:
      return `${year}-${month}-${day}`;
    default:
      return `${day}-${month}-${year}`;
  }
};

// Verificar se é feriado
export const isHoliday = (date) => {
  const dateStr = formatDate(date, 'MM-DD');
  return HOLIDAYS_PORTO.includes(dateStr);
};

// Verificar se é fim de semana
export const isWeekend = (date) => {
  const day = new Date(date).getDay();
  return day === 0 || day === 6; // Domingo = 0, Sábado = 6
};

// Verificar se é dia útil
export const isWorkingDay = (date) => {
  return !isWeekend(date) && !isHoliday(date);
};

// Obter dias no mês
export const getDaysInMonth = (month, year = new Date().getFullYear()) => {
  return new Date(year, month, 0).getDate();
};

// Obter primeiro dia da semana do mês
export const getFirstDayOfMonth = (month, year = new Date().getFullYear()) => {
  return new Date(year, month - 1, 1).getDay();
};

// Calcular diferença entre datas em dias
export const getDaysDifference = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Adicionar dias a uma data
export const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// Obter o início do mês
export const getStartOfMonth = (date = new Date()) => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

// Obter o fim do mês
export const getEndOfMonth = (date = new Date()) => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};
