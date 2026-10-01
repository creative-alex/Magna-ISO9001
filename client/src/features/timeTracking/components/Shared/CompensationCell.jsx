import { useState } from 'react';
import { createPortal } from 'react-dom';
import { FaHourglassHalf } from 'react-icons/fa6';
import { formatarMinutos } from '../../utils/calcHours';
import { ESTADOS_HORA_EXTRA, estadoHoraExtra } from '../../utils/horasExtra';
import { DetalheEstado } from './ManualOvertimeCell';

// Célula "Compensação Horas" das tabelas de ponto (colaborador e admin).
// - compensatedMinutes: compensação EFETIVA do dia (horas_compensatorias no registo, só
//   gravada quando a GestorRH aprova o pedido) - a azul.
// - pedidos: pedidos de compensação do dia (PedidosCompensacao, todos os estados). Os
//   pendentes aparecem a dourado com ⌛ e não têm qualquer efeito; os rejeitados só no
//   tooltip (ou riscados, se o dia não tiver mais nada).
// - children: o botão "Compensar", que a tabela só passa quando o dia pode ser compensado.
const CompensationCell = ({ compensatedMinutes = 0, pedidos = [], children }) => {
  const [pos, setPos] = useState(null);

  const pendentes = pedidos.filter((p) => estadoHoraExtra(p) === ESTADOS_HORA_EXTRA.PENDENTE);
  const rejeitados = pedidos.filter((p) => estadoHoraExtra(p) === ESTADOS_HORA_EXTRA.REJEITADA);
  const minutosPendentes = pendentes.reduce((sum, p) => sum + (p.minutos || 0), 0);

  let valor = null;
  if (compensatedMinutes > 0) {
    valor = <span className="text-blue-600">{formatarMinutos(compensatedMinutes)}</span>;
  } else if (minutosPendentes > 0) {
    valor = (
      <span className="inline-flex items-center gap-1 text-[#C8932F]">
        {formatarMinutos(minutosPendentes)} <FaHourglassHalf title="Pendente de aprovação" />
      </span>
    );
  } else if (rejeitados.length > 0 && !children) {
    valor = <span className="text-danger line-through">{formatarMinutos(rejeitados[rejeitados.length - 1].minutos || 0)}</span>;
  }

  if (!valor && !children) return '-';

  const showTooltip = (e) => setPos({ x: e.clientX, y: e.clientY });
  const hideTooltip = () => setPos(null);

  return (
    <span className="inline-flex items-center gap-2">
      {valor && (
        <span
          className={pedidos.length ? 'cursor-help underline decoration-dotted underline-offset-2' : ''}
          onMouseEnter={pedidos.length ? showTooltip : undefined}
          onMouseMove={pedidos.length ? showTooltip : undefined}
          onMouseLeave={pedidos.length ? hideTooltip : undefined}
        >
          {valor}
        </span>
      )}
      {children}
      {pos && pedidos.length > 0 && createPortal(
        <div
          className="fixed z-[10000] pointer-events-none max-w-xs rounded bg-black/85 px-3 py-2 text-xs text-white shadow-lg"
          style={{ top: pos.y + 12, left: pos.x + 12 }}
        >
          <p className="mb-1 font-semibold">
            {pedidos.length === 1 ? 'Pedido de compensação:' : `${pedidos.length} pedidos de compensação:`}
          </p>
          <ul className="space-y-1.5">
            {pedidos.map((pedido, i) => (
              <li key={pedido.id || i}>
                <strong>{formatarMinutos(pedido.minutos || 0)}</strong>
                {pedido.saldoDisponivel != null && ` (saldo no pedido: ${formatarMinutos(pedido.saldoDisponivel)})`}
                <span className="block"><DetalheEstado entry={pedido} /></span>
              </li>
            ))}
          </ul>
        </div>,
        document.body
      )}
    </span>
  );
};

export default CompensationCell;
