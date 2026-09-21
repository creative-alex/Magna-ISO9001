import React, { useState, useEffect, useCallback } from 'react';
import { FaClipboardCheck, FaXmark, FaCircleInfo, FaCircleCheck, FaTriangleExclamation } from 'react-icons/fa6';
import { toast } from 'react-toastify';
import { apiFetch } from '../../../../shared/utils/apiFetch';

const STATUS_LABELS = {
  trabalho: 'Trabalho',
  trabalho_previsto: 'Trabalho (previsto)',
  ferias: 'Férias',
  baixa: 'Baixa Médica',
  aniversario: 'Aniversário',
  feriado: 'Feriado',
  'fim-de-semana': 'Fim de semana',
  falta: 'Falta',
  incompleto: 'Registo incompleto',
  inativo: '-',
  futuro: '-',
};

// Confirmação do fecho mensal (auto-serviço, sempre para o próprio - nunca envia "uid",
// tal como RequestTimeEditButton). Mostra o resumo/dias devolvidos por
// POST /fecho-mensal/status e, se ainda não confirmado, permite confirmar via
// POST /fecho-mensal/confirm  -  ver api/domains/fechoMensal/fechoMensalController.js.
const MonthlyClosingButton = ({ mes, mesLabel, triggerClassName, onSuccess }) => {
  const [showModal, setShowModal] = useState(false);
  // Verificação inicial (silenciosa, sem toast) só para decidir se o botão sequer aparece -
  // separada de "loading" (usada dentro do modal) para uma falha/refetch ao reabrir não
  // desmontar o botão/modal já visíveis (ver render mais abaixo).
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState(null);

  const fetchStatus = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const response = await apiFetch('/fecho-mensal/status', {
        method: 'POST',
        body: JSON.stringify({ mes }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (silent) {
          setStatus(null);
        } else {
          toast.error(data.error || 'Erro ao consultar o fecho mensal');
          setShowModal(false);
        }
        return;
      }
      setStatus(data);
    } catch (err) {
      console.error('Erro ao consultar fecho mensal:', err);
      if (silent) {
        setStatus(null);
      } else {
        toast.error('Erro ao consultar o fecho mensal. Tente novamente.');
        setShowModal(false);
      }
    } finally {
      if (!silent) setLoading(false);
      setInitialLoading(false);
    }
  }, [mes]);

  // O botão só deve aparecer depois de o colaborador ter recebido o email de aviso (dia 20)
  // - ou já ter confirmado (ex.: um admin confirmou em nome dele antes disso) - nunca antes,
  // para não convidar a confirmar um mês que ainda nem foi avisado.
  useEffect(() => {
    setInitialLoading(true);
    fetchStatus({ silent: true });
  }, [fetchStatus]);

  const openModal = (e) => {
    if (e) e.stopPropagation();
    setShowModal(true);
    fetchStatus();
  };

  const closeModal = () => {
    if (confirming) return;
    setShowModal(false);
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const response = await apiFetch('/fecho-mensal/confirm', {
        method: 'POST',
        body: JSON.stringify({ mes }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Erro ao confirmar o fecho do mês');
        return;
      }
      toast.success(data.message || 'Fecho do mês confirmado!');
      await fetchStatus();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Erro ao confirmar fecho mensal:', err);
      toast.error('Erro ao confirmar o fecho do mês. Tente novamente.');
    } finally {
      setConfirming(false);
    }
  };

  if (initialLoading || !(status?.reminderSentAt || status?.confirmed)) {
    return null;
  }

  return (
    <>
      <button type="button" onClick={openModal} className={triggerClassName}>
        <FaClipboardCheck className="text-[#C8932F]" /> Fecho Mensal
      </button>

      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-5"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-[520px] w-full max-h-[85vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeModal}
              disabled={confirming}
              className="absolute top-4 right-4 !w-8 !h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer border-none bg-transparent disabled:cursor-not-allowed z-10"
            >
              <FaXmark size={16} />
            </button>

            <div className="flex items-center gap-3 px-6 pt-6 pb-4 pr-14 border-b border-gray-100">
              <span className="w-10 h-10 rounded-xl bg-[#C8932F]/10 text-[#C8932F] flex items-center justify-center shrink-0">
                <FaClipboardCheck size={15} />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-gray-900 leading-tight">Fecho Mensal</h2>
                {mesLabel && <p className="text-xs text-gray-500 mt-1">{mesLabel}</p>}
              </div>
            </div>

            <div className="px-6 pt-5 pb-6">
              {loading || !status ? (
                <p className="text-sm text-gray-500 py-8 text-center">A carregar...</p>
              ) : (
                <>
                  {status.confirmed ? (
                    <div className="flex items-start gap-2 bg-green-50 text-green-800 text-xs leading-relaxed rounded-lg px-3 py-2.5 mb-4">
                      <FaCircleCheck className="mt-0.5 shrink-0" size={13} />
                      <span>
                        Mês confirmado{status.confirmedAt ? ` em ${new Date(status.confirmedAt).toLocaleString('pt-PT')}` : ''}.
                        Os dados usados no processamento de vencimentos ficam fixos a partir daqui.
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 bg-[#C8932F]/10 text-[#8a6a22] text-xs leading-relaxed rounded-lg px-3 py-2.5 mb-4">
                      <FaCircleInfo className="mt-0.5 shrink-0" size={13} />
                      <span>
                        Ao confirmar, os dias seguintes sem férias ou baixa registada ficam marcados como trabalhados
                        e deixa de ser possível marcar férias, baixas ou pedir alterações de horas neste mês. Confirma até dia {status.deadlineDay || 25}.
                      </span>
                    </div>
                  )}

                  {!status.confirmed && status.flagged && (
                    <div className="flex items-start gap-2 bg-red-50 text-red-700 text-xs leading-relaxed rounded-lg px-3 py-2.5 mb-4">
                      <FaTriangleExclamation className="mt-0.5 shrink-0" size={13} />
                      <span>O prazo para confirmar este mês já passou e ficou assinalado como não confirmado. Contacte o RH.</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm mb-4">
                    <p><strong>Trabalhados:</strong> {status.summary?.diasTrabalhados ?? 0}</p>
                    <p><strong>Férias:</strong> {status.summary?.diasFerias ?? 0}</p>
                    <p><strong>Baixa Médica:</strong> {status.summary?.diasBaixaMedica ?? 0}</p>
                    <p><strong>Faltas:</strong> {status.summary?.diasFalta ?? 0}</p>
                  </div>

                  {Array.isArray(status.dias) && status.dias.length > 0 && (
                    <div className="max-h-56 overflow-y-auto border border-gray-100 rounded-lg mb-5">
                      <table className="w-full text-xs">
                        <tbody>
                          {status.dias.map((d) => (
                            <tr key={d.dia} className="border-b border-gray-50 last:border-0">
                              <td className="py-1.5 px-3 text-gray-500 w-20">{d.data}</td>
                              <td className={`py-1.5 px-3 ${d.status === 'trabalho_previsto' ? 'text-[#C8932F] font-medium' : 'text-gray-700'}`}>
                                {STATUS_LABELS[d.status] || d.status}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={status.confirmed || confirming}
                    className="w-full py-2.5 px-4 border-none rounded-full bg-[#C8932F] text-white text-sm font-semibold cursor-pointer transition-colors hover:bg-[#A47422] disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    {status.confirmed ? 'Mês já confirmado' : confirming ? 'A confirmar...' : 'Confirmar Fecho do Mês'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MonthlyClosingButton;
