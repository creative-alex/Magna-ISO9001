import React, { useState, useEffect, useCallback } from 'react';
import TableRow from './tableRow';
import { calcularHoras, formatarMinutos } from '../../utils/calcHours';
import ContextMenu from './contextMenu';
import ManualOvertimeModal from './ManualOvertimeModal';
import { apiFetch } from '../../../../shared/utils/apiFetch';

const TimeTrackingTable = ({ username, month = new Date().getMonth() + 1, year = new Date().getFullYear(), className = '' }) => {
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, dayIndex: null });
  const [selectedDate, setSelectedDate] = useState(null);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: '' });
  const [overtimeModal, setOvertimeModal] = useState({ show: false, entries: [], date: '' });

  // Função para extrair apenas a hora no formato HH:MM
  const extractTime = (timeString) => {
    if (!timeString || timeString === "-") return null;
    // Se tem espaço, é formato YYYY-MM-DD HH:MM, pega a parte após o espaço
    if (timeString.includes(' ')) {
      return timeString.split(' ')[1];
    }
    // Se já é só HH:MM, retorna como está
    return timeString;
  };

  const fetchData = useCallback(async () => {
    if (!username) return;

    try {
      setLoading(true);

      const response = await apiFetch(`/timetracking/calendar`, {
        method: "POST",
        body: JSON.stringify({ month, year }),
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data = await response.json();
      const diasNoMes = new Date(year, month, 0).getDate();
      const registos = data.registos || [];
      const manualOvertimeData = data.manualOvertime || [];
      const ferias = data.ferias || [];
      const baixas = data.baixas || [];
      const aniversario = data.aniversario || [];

      const dadosProcessados = Array.from({ length: diasNoMes }, (_, i) => {
        const dia = `${String(i + 1).padStart(2, "0")}-${String(month).padStart(2, "0")}`;
        const diaCompleto = `${String(i + 1).padStart(2, "0")}-${String(month).padStart(2, "0")}-${year}`;
        const registo = registos.find((r) => new Date(r.timestamp).getDate() === i + 1);

        const feriaDodia = ferias.find(f => f.date === diaCompleto);
        const baixaDodia = baixas.find(b => b.date === diaCompleto);
        const aniversarioDodia = aniversario.find(a => a.date === diaCompleto);

        const manualOvertimeForDay = manualOvertimeData.filter(mo => mo.date === diaCompleto);
        const hasManualOvertime = manualOvertimeForDay.length > 0;
        const manualOvertimeTotalMinutes = manualOvertimeForDay.reduce((sum, mo) => sum + mo.totalMinutes, 0);

        const isFerias = feriaDodia != null;
        const isBaixa = baixaDodia != null;
        const isAniversario = aniversarioDodia != null;

        const horaEntrada = isFerias ? "Férias" : isBaixa ? "Baixa" : isAniversario ? "🎂 Aniversário" : (registo?.horaEntrada || "-");
        const horaSaida  = isFerias ? "Férias" : isBaixa ? "Baixa" : isAniversario ? "🎂 Aniversário" : (registo?.horaSaida  || "-");
        const dataObj = registo ? new Date(registo.timestamp) : null;
        const horaEntradaExtraida = extractTime(registo?.horaEntrada);
        const horaSaidaExtraida   = extractTime(registo?.horaSaida);
        const horasCalculadas = (horaEntradaExtraida && horaSaidaExtraida && !isFerias && !isBaixa && !isAniversario)
          ? calcularHoras(horaEntradaExtraida, horaSaidaExtraida, dataObj)
          : { total: "-", extra: "-", minutosExtras: 0, minutosFalta: 0 };

        return {
          dia,
          diaCompleto,
          horaEntrada,
          horaSaida,
          total: horasCalculadas.total,
          extra: horasCalculadas.extra,
          minutosExtras: horasCalculadas.minutosExtras || 0,
          minutosFalta: horasCalculadas.minutosFalta || 0,
          manualOvertime: hasManualOvertime ? `${Math.floor(manualOvertimeTotalMinutes / 60)}h ${manualOvertimeTotalMinutes % 60}m` : null,
          manualOvertimeMinutes: manualOvertimeTotalMinutes,
          manualOvertimeEntries: manualOvertimeForDay,
          manualOvertimeDescription: manualOvertimeForDay.map(mo => mo.description).join(', '),
          feriasPendente: isFerias,
          baixaPendente: isBaixa
        };
      });

      setDados(dadosProcessados);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  }, [username, month, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleContextMenu = (e, dayIndex) => {
    e.preventDefault();
    const dia = `${String(dayIndex + 1).padStart(2, "0")}-${String(month).padStart(2, "0")}`;
    setSelectedDate(dia);
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      dayIndex
    });
  };

  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, dayIndex: null });
  };

  const showTooltip = (e, manualOvertime, description) => {
    setTooltip({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      content: `Horas Extras Manuais: ${manualOvertime}${description ? `\n${description}` : ''}`
    });
  };

  const hideTooltip = () => {
    setTooltip({ visible: false, x: 0, y: 0, content: '' });
  };

  const openOvertimeManager = (entries, date) => {
    console.log('Abrir modal para gerenciar horas extras:', entries, date);
    setOvertimeModal({
      show: true,
      entries: entries.map(entry => ({
        ...entry,
        id: entry.id || `${entry.date}_${entry.startHour}`
      })),
      date: date
    });
  };

  const closeOvertimeModal = () => {
    setOvertimeModal({ show: false, entries: [], date: '' });
  };

  const handleOvertimeUpdate = () => {
    closeOvertimeModal();
    fetchData();
  };


  if (loading) {
    return <div>A carregar...</div>;
  }

  // Calcular totais
  const calcularTotais = () => {
    let totalMinutosTrabalho = 0;
    let totalMinutosExtras = 0;
    let totalMinutosFalta = 0;
    let totalManualOvertime = 0;

    dados.forEach(item => {
      if (item.total !== '-') {
        const match = item.total.match(/(\d+)h (\d+)m/);
        if (match) {
          totalMinutosTrabalho += parseInt(match[1]) * 60 + parseInt(match[2]);
        }
      }
      totalMinutosExtras += item.minutosExtras || 0;
      totalMinutosFalta += item.minutosFalta || 0;
      totalManualOvertime += item.manualOvertimeMinutes || 0;
    });

    const totalExtrasLiquido = totalMinutosExtras + totalManualOvertime - totalMinutosFalta;

    return {
      totalTrabalho: formatarMinutos(totalMinutosTrabalho),
      totalExtras: formatarMinutos(totalExtrasLiquido)
    };
  };

  const totais = calcularTotais();

  return (
    <div className={`${className}`.trim()}>
      <table className="w-full border-collapse text-[0.9rem] bg-white">
        <thead className="sticky top-0 bg-white">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-gold uppercase text-xs tracking-wide border-b-2 border-gray-200">Data</th>
            <th className="px-4 py-3 text-left font-semibold text-gold uppercase text-xs tracking-wide border-b-2 border-gray-200">Hora Entrada</th>
            <th className="px-4 py-3 text-left font-semibold text-gold uppercase text-xs tracking-wide border-b-2 border-gray-200">Hora Saída</th>
            <th className="px-4 py-3 text-left font-semibold text-gold uppercase text-xs tracking-wide border-b-2 border-gray-200">Horas Trabalhadas</th>
            <th className="px-4 py-3 text-left font-semibold text-gold uppercase text-xs tracking-wide border-b-2 border-gray-200">Horas Extras</th>
          </tr>
        </thead>
        <tbody>
            {dados.map((item, index) => (
              <TableRow
                key={index}
                item={item}
                index={index}
                month={month}
                onContextMenu={handleContextMenu}
                showTooltip={showTooltip}
                hideTooltip={hideTooltip}
                openOvertimeManager={openOvertimeManager}
              />
            ))}
          </tbody>
          <tfoot className="border-t-2 border-gray-200 bg-gold-light font-bold">
            <tr>
              <td colSpan="3" className="text-right p-3">Total:</td>
              <td className="text-warning p-3">{totais.totalTrabalho}</td>
              <td className={`p-3 ${totais.totalExtras.startsWith('-') ? 'text-danger' : 'text-success'}`}>{totais.totalExtras}</td>
            </tr>
          </tfoot>
      </table>
      {tooltip.visible && (
        <div
          style={{
            position: 'fixed',
            top: tooltip.y + 10,
            left: tooltip.x + 10,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'pre-line',
            zIndex: 10000,
            pointerEvents: 'none'
          }}
        >
          {tooltip.content}
        </div>
      )}
      <ContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        onClose={closeContextMenu}
        date={selectedDate}
        username={username}
        month={month}
        onOvertimeRegistered={fetchData}
      />
      <ManualOvertimeModal
        show={overtimeModal.show}
        onClose={closeOvertimeModal}
        selectedDayEntries={overtimeModal.entries}
        selectedDate={overtimeModal.date}
        username={username}
        onUpdate={handleOvertimeUpdate}
      />
    </div>
  );
};

export default TimeTrackingTable;
