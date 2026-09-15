import React, { useState } from 'react';
import { FaPen, FaXmark, FaCalendarDay, FaCircleInfo } from 'react-icons/fa6';
import { toast } from 'react-toastify';
import { apiFetch } from '../../../../shared/utils/apiFetch';

// Extrai "HH:MM" de um valor de hora guardado (pode vir como "HH:MM", "YYYY-MM-DD HH:MM",
// "-" ou um estado especial como "Férias"/"Baixa"/"🎂 Aniversário")  -  só serve para
// pré-preencher o formulário, nunca para validar o que é enviado.
function sanitizeHoraAtual(value) {
  if (!value || value === '-') return '';
  const timePart = value.includes(' ') ? value.split(' ')[1] : value;
  return /^\d{2}:\d{2}$/.test(timePart || '') ? timePart : '';
}

// "YYYY-MM-DD" (valor de um <input type="date">) -> "DD-MM-YYYY" (formato do backend).
function isoParaBr(isoDate) {
  if (!isoDate) return null;
  const [yyyy, mm, dd] = isoDate.split('-');
  return `${dd}-${mm}-${yyyy}`;
}

// Maior data selecionável no seletor: hoje (hoje e dias passados são editáveis).
function getHojeIso() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
}

// Hora atual em "HH:MM"  -  usada para não deixar marcar, para hoje, uma hora que
// ainda não passou (ver dataEhHoje mais abaixo).
function getHoraAtual() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Só fins de semana  -  não conhecemos a sede do colaborador aqui, por isso feriados
// só são validados no submit (ver isWeekendOrHolidayDDMM em holidays.js, usado no
// backend). Serve só para dar feedback imediato antes de submeter.
function ehFimDeSemana(isoDate) {
  if (!isoDate) return false;
  const [yyyy, mm, dd] = isoDate.split('-').map(Number);
  const diaSemana = new Date(yyyy, mm - 1, dd).getDay();
  return diaSemana === 0 || diaSemana === 6;
}

// Pedido de alteração das horas de um dia passado, feito pelo próprio colaborador.
// Fica sempre pendente de aprovação (ver requestTimeEdit no backend)  -  nunca aplica
// a alteração de imediato, ao contrário da edição direta que um admin/GestorRH tem em
// Admin/clients/pontoTable.jsx.
//
// Com "date" (DD-MM-YYYY) já definido  -  ex.: a partir do menu de contexto de um dia
// específico  -  esse dia aparece fixo. Sem "date"  -  ex.: o botão nos Totais, sempre
// visível  -  mostra um seletor para escolher o dia.
const RequestTimeEditButton = ({ date, horaEntradaAtual, horaSaidaAtual, onSuccess, triggerClassName, triggerLabel }) => {
  const [showModal, setShowModal] = useState(false);
  const [diaEscolhido, setDiaEscolhido] = useState('');
  const [horaEntrada, setHoraEntrada] = useState('');
  const [horaSaida, setHoraSaida] = useState('');
  // Valores com que o formulário abriu (as horas atuais)  -  usados só para saber
  // quais os campos que o utilizador realmente alterou (ver handleSubmit): os campos
  // vêm pré-preenchidos por conveniência, mas só quem for mudado é que é pedido.
  const [horaEntradaOriginal, setHoraEntradaOriginal] = useState('');
  const [horaSaidaOriginal, setHoraSaidaOriginal] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [loading, setLoading] = useState(false);

  const openModal = (e) => {
    if (e) e.stopPropagation();
    const entradaAtual = sanitizeHoraAtual(horaEntradaAtual);
    const saidaAtual = sanitizeHoraAtual(horaSaidaAtual);
    setDiaEscolhido('');
    setHoraEntrada(entradaAtual);
    setHoraSaida(saidaAtual);
    setHoraEntradaOriginal(entradaAtual);
    setHoraSaidaOriginal(saidaAtual);
    setJustificativa('');
    setShowModal(true);
  };

  const closeModal = () => {
    if (loading) return;
    setShowModal(false);
  };

  // Dia efetivamente selecionado (fixo via "date", ou escolhido no seletor) é hoje?
  // Nesse caso nenhuma das horas pode ainda estar no futuro (ver handleSubmit e os
  // "max" dos campos de hora, mais abaixo).
  const dataSelecionadaIso = date
    ? (() => { const [dd, mm, yyyy] = date.split('-'); return `${yyyy}-${mm}-${dd}`; })()
    : diaEscolhido;
  const dataEhHoje = !!dataSelecionadaIso && dataSelecionadaIso === getHojeIso();
  const dataEhFimDeSemana = ehFimDeSemana(dataSelecionadaIso);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const dataParaEnviar = date || isoParaBr(diaEscolhido);
    if (!dataParaEnviar) {
      toast.error('Escolhe o dia a corrigir');
      return;
    }
    if (dataEhFimDeSemana) {
      toast.error('Não é possível pedir alteração de horas num fim de semana. Escolhe um dia útil.');
      return;
    }

    // Só se pede o que realmente mudou em relação ao valor com que o campo abriu  -
    // caso contrário, deixar a entrada pré-preenchida e só corrigir a saída (ou
    // vice-versa) seria sempre interpretado como um pedido de mudar as duas.
    const entradaPedida = horaEntrada && horaEntrada !== horaEntradaOriginal ? horaEntrada : null;
    const saidaPedida = horaSaida && horaSaida !== horaSaidaOriginal ? horaSaida : null;

    if (!entradaPedida && !saidaPedida) {
      toast.error('Altera pelo menos uma das horas (entrada ou saída)');
      return;
    }
    if (dataEhHoje) {
      const horaAtual = getHoraAtual();
      if (entradaPedida && entradaPedida > horaAtual) {
        toast.error('A hora de entrada ainda não passou');
        return;
      }
      if (saidaPedida && saidaPedida > horaAtual) {
        toast.error('A hora de saída ainda não passou');
        return;
      }
    }
    if (!justificativa.trim()) {
      toast.error('Indica uma justificação para o pedido');
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch('/timetracking/request-time-edit', {
        method: 'POST',
        body: JSON.stringify({
          date: dataParaEnviar,
          horaEntrada: entradaPedida,
          horaSaida: saidaPedida,
          justificativa: justificativa.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Erro ao pedir alteração de horas');
        return;
      }

      toast.success(data.message || 'Pedido enviado!');
      setShowModal(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Erro ao pedir alteração de horas:', err);
      toast.error('Erro ao pedir alteração de horas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button type="button" onClick={openModal} className={triggerClassName}>
        {triggerLabel || (<><FaPen className="text-[#C8932F]" /> Pedir Alteração de Horas</>)}
      </button>

      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-5"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-[440px] w-full overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeModal}
              disabled={loading}
              className="absolute top-4 right-4 !w-8 !h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer border-none bg-transparent disabled:cursor-not-allowed z-10"
            >
              <FaXmark size={16} />
            </button>

            <div className="flex items-center gap-3 px-6 pt-6 pb-4 pr-14 border-b border-gray-100">
              <span className="w-10 h-10 rounded-xl bg-[#C8932F]/10 text-[#C8932F] flex items-center justify-center shrink-0">
                <FaPen size={15} />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-gray-900 leading-tight">Pedir alteração de horas</h2>
                {date && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                    <FaCalendarDay className="text-gray-400" size={11} /> {date}
                  </p>
                )}
                {date && dataEhFimDeSemana && (
                  <p className="text-xs text-danger mt-1">Este dia é um fim de semana  -  não é possível pedir alteração de horas.</p>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="px-6 pt-5 pb-6">
              <div className="flex items-start gap-2 bg-[#C8932F]/10 text-[#8a6a22] text-xs leading-relaxed rounded-lg px-3 py-2.5 mb-5">
                <FaCircleInfo className="mt-0.5 shrink-0" size={13} />
                <span>Fica pendente de aprovação de um Gestor(a) de RH ou Administrador. Não é possível pedir alteração de horas num fim de semana ou feriado.</span>
              </div>

              {!date && (
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Dia</label>
                  <input
                    type="date"
                    value={diaEscolhido}
                    max={getHojeIso()}
                    onChange={(e) => setDiaEscolhido(e.target.value)}
                    required
                    className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:bg-white focus:border-[#C8932F] focus:ring-2 focus:ring-[#C8932F]/25"
                  />
                  {dataEhFimDeSemana && (
                    <p className="text-xs text-danger mt-1.5">Este dia é um fim de semana  -  escolhe um dia útil.</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Entrada</label>
                  <input
                    type="time"
                    value={horaEntrada}
                    max={dataEhHoje ? getHoraAtual() : undefined}
                    onChange={(e) => setHoraEntrada(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:bg-white focus:border-[#C8932F] focus:ring-2 focus:ring-[#C8932F]/25"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Saída</label>
                  <input
                    type="time"
                    value={horaSaida}
                    max={dataEhHoje ? getHoraAtual() : undefined}
                    onChange={(e) => setHoraSaida(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:bg-white focus:border-[#C8932F] focus:ring-2 focus:ring-[#C8932F]/25"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Justificação</label>
                <textarea
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  rows={3}
                  placeholder="Explica o motivo da alteração"
                  className="w-full border border-gray-200 bg-gray-50 rounded-lg text-sm p-3 resize-y focus:outline-none focus:bg-white focus:border-[#C8932F] focus:ring-2 focus:ring-[#C8932F]/25"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 border border-gray-200 rounded-full bg-white text-gray-600 text-sm font-medium cursor-pointer transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || dataEhFimDeSemana}
                  className="flex-1 py-2.5 px-4 border-none rounded-full bg-[#C8932F] text-white text-sm font-semibold cursor-pointer transition-colors hover:bg-[#A47422] disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {loading ? 'A enviar...' : 'Pedir alteração'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default RequestTimeEditButton;
