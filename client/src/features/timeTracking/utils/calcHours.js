import { isWeekend } from './dateHelpers';

// Horas extra NÃO são calculadas aqui: tempo registado além das 8h / fora das
// 08:30-17:00 (ou ao fim de semana) não conta automaticamente como hora extra.
// Só contam as registadas explicitamente como Hora Extra (HorasExtraManual).
export const calcularHoras = (entrada, saida, date = null) => {
    if (!entrada || !saida) return { total: "-", minutos: 0, minutosFalta: 480 };
  
    const [hEntrada, mEntrada] = entrada.split(":").map(Number);
    const [hSaida, mSaida] = saida.split(":").map(Number);
  
    if (isNaN(hEntrada) || isNaN(mEntrada) || isNaN(hSaida) || isNaN(mSaida)) {
      return { total: "-", minutos: 0, minutosFalta: 480 };
    }
  
    let minutosTrabalhados = (hSaida * 60 + mSaida) - (hEntrada * 60 + mEntrada);
    if (minutosTrabalhados > 300) {
      minutosTrabalhados -= 30;
    }
  
    // Verificar se é fim de semana
    const isWeekendDay = isWeekend(date);
    
    const minutosNormais = Math.min(minutosTrabalhados, 480);
    // Não há falta nos fins de semana
    const minutosFalta = isWeekendDay ? 0 : Math.max(0, 480 - minutosTrabalhados);
  
    return {
      total: formatarMinutos(minutosTrabalhados),
      minutos: minutosNormais,
      minutosFalta
    };
  };
  
  export const formatarMinutos = (minutos) => {
    const neg = minutos < 0;
    const abs = Math.abs(minutos);
    const horas = Math.floor(abs / 60);
    const mins = abs % 60;
    return `${neg ? '-' : ''}${horas}h ${mins}m`;
  };
  