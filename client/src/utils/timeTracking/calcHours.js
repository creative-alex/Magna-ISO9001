import { isWeekend } from './dateHelpers';

export const calcularHoras = (entrada, saida, date = null) => {
    if (!entrada || !saida) return { total: "-", extra: "-", minutos: 0, minutosExtras: 0, minutosFalta: 480 };
  
    const [hEntrada, mEntrada] = entrada.split(":").map(Number);
    const [hSaida, mSaida] = saida.split(":").map(Number);
  
    if (isNaN(hEntrada) || isNaN(mEntrada) || isNaN(hSaida) || isNaN(mSaida)) {
      return { total: "-", extra: "-", minutos: 0, minutosExtras: 0, minutosFalta: 480 };
    }
  
    let minutosTrabalhados = (hSaida * 60 + mSaida) - (hEntrada * 60 + mEntrada);
    if (minutosTrabalhados > 300) {
      minutosTrabalhados -= 30;
    }
  
    // Verificar se é fim de semana
    const isWeekendDay = isWeekend(date);
    
    let minutosNormais, minutosExtras, minutosFalta;
    
    if (isWeekendDay) {
      // Nos fins de semana, todas as horas são consideradas extra
      minutosNormais = 0;
      minutosExtras = minutosTrabalhados;
      minutosFalta = 0; // Não há falta nos fins de semana
    } else {
      // Lógica normal para dias de semana
      minutosNormais = Math.min(minutosTrabalhados, 480);
      minutosExtras = Math.max(0, minutosTrabalhados - 480);
      minutosFalta = Math.max(0, 480 - minutosTrabalhados);
    }
  
    return {
      total: formatarMinutos(minutosTrabalhados),
      extra: minutosExtras > 0 ? formatarMinutos(minutosExtras) : "-",
      minutos: minutosNormais,
      minutosExtras,
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
  