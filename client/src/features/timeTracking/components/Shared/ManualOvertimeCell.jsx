import { useState } from 'react';
import { createPortal } from 'react-dom';
import { FaHourglassHalf } from 'react-icons/fa6';
import { formatarMinutos } from '../../utils/calcHours';
import { ESTADOS_HORA_EXTRA, LABEL_ESTADO_HORA_EXTRA, estadoHoraExtra } from '../../utils/horasExtra';

// Texto que o registo manual gravava por omissão quando o colaborador não escrevia
// nada (ver registerManualOvertime/updateManualOvertime e manualOvertime.jsx) - não é
// uma razão indicada pelo colaborador, por isso conta como "sem descrição".
const DESCRICOES_POR_OMISSAO = new Set(['Horas extras trabalhadas após horário normal', 'Horas extras']);

const descricaoDoRegisto = (entry) => {
  const descricao = (entry.description || '').trim();
  return descricao && !DESCRICOES_POR_OMISSAO.has(descricao) ? descricao : 'Sem descrição';
};

const formatarData = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-PT') : null);

const COR_ESTADO = {
  [ESTADOS_HORA_EXTRA.PENDENTE]: 'text-[#F5C26B]',
  [ESTADOS_HORA_EXTRA.APROVADA]: 'text-[#86EFAC]',
  [ESTADOS_HORA_EXTRA.REJEITADA]: 'text-[#FCA5A5]',
};

// Estado de um registo + quem decidiu e quando (ou o motivo da rejeição), em texto.
// Também usado pela célula de compensações (CompensationCell.jsx).
export const DetalheEstado = ({ entry }) => {
  const estado = estadoHoraExtra(entry);
  let detalhe = null;
  if (estado === ESTADOS_HORA_EXTRA.APROVADA && (entry.approvedByNome || entry.approvedAt)) {
    detalhe = ` por ${entry.approvedByNome || '-'}${entry.approvedAt ? ` em ${formatarData(entry.approvedAt)}` : ''}`;
  } else if (estado === ESTADOS_HORA_EXTRA.REJEITADA && (entry.rejectedByNome || entry.rejectedAt)) {
    detalhe = ` por ${entry.rejectedByNome || '-'}${entry.rejectedAt ? ` em ${formatarData(entry.rejectedAt)}` : ''}`;
  } else if (estado === ESTADOS_HORA_EXTRA.PENDENTE) {
    detalhe = ' de aprovação';
  }
  return (
    <>
      <span className={`font-semibold ${COR_ESTADO[estado]}`}>{LABEL_ESTADO_HORA_EXTRA[estado]}</span>
      {detalhe}
      {estado === ESTADOS_HORA_EXTRA.REJEITADA && entry.motivoRejeicao && (
        <span className="block">Motivo da rejeição: {entry.motivoRejeicao}</span>
      )}
    </>
  );
};

// Célula "Horas Extra" das tabelas de ponto (colaborador e admin). Mostra as horas
// extra manuais do dia (nunca calculadas a partir da entrada/saída) e o respetivo
// estado: o valor soma as pendentes e as aprovadas (as rejeitadas só aparecem riscadas
// quando o dia não tem mais nenhuma); ⌛ = há pelo menos uma pendente. Ao passar o rato,
// o tooltip mostra o motivo e o estado de cada registo. É desenhado com position: fixed
// num portal para não ser cortado pelo overflow da tabela.
const ManualOvertimeCell = ({ entries = [] }) => {
  const [pos, setPos] = useState(null);

  if (!entries.length) return '-';

  const naoRejeitados = entries.filter((e) => estadoHoraExtra(e) !== ESTADOS_HORA_EXTRA.REJEITADA);
  const soRejeitados = naoRejeitados.length === 0;
  const temPendentes = entries.some((e) => estadoHoraExtra(e) === ESTADOS_HORA_EXTRA.PENDENTE);
  const minutos = (soRejeitados ? entries : naoRejeitados).reduce((sum, e) => sum + (e.totalMinutes || 0), 0);
  const classeValor = soRejeitados ? 'text-danger line-through' : temPendentes ? 'text-[#C8932F]' : 'text-success';

  const showTooltip = (e) => setPos({ x: e.clientX, y: e.clientY });
  const hideTooltip = () => setPos(null);

  return (
    <>
      <span
        className={`inline-flex items-center gap-1 cursor-help underline decoration-dotted underline-offset-2 ${classeValor}`}
        onMouseEnter={showTooltip}
        onMouseMove={showTooltip}
        onMouseLeave={hideTooltip}
      >
        {formatarMinutos(minutos)}
        {temPendentes && <FaHourglassHalf className="no-underline" title="Pendente de aprovação" />}
      </span>
      {pos && createPortal(
        <div
          className="fixed z-[10000] pointer-events-none max-w-xs rounded bg-black/85 px-3 py-2 text-xs text-white shadow-lg"
          style={{ top: pos.y + 12, left: pos.x + 12 }}
        >
          {entries.length === 1 ? (
            <>
              <p><strong>Motivo:</strong> {descricaoDoRegisto(entries[0])}</p>
              <p className="mt-1"><DetalheEstado entry={entries[0]} /></p>
            </>
          ) : (
            <>
              <p className="mb-1 font-semibold">{entries.length} registos de hora extra:</p>
              <ul className="space-y-1.5">
                {entries.map((entry, i) => (
                  <li key={entry.id || i}>
                    <strong>
                      {entry.startHour && entry.endHour ? `${entry.startHour}–${entry.endHour} · ` : ''}
                      {formatarMinutos(entry.totalMinutes || 0)}:
                    </strong>{' '}
                    {descricaoDoRegisto(entry)}
                    <span className="block"><DetalheEstado entry={entry} /></span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>,
        document.body
      )}
    </>
  );
};

export default ManualOvertimeCell;
