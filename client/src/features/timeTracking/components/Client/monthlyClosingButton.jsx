import React, { useState, useEffect, useCallback } from 'react';
import { FaClipboardCheck, FaXmark, FaCircleInfo, FaCircleCheck, FaTriangleExclamation, FaCar, FaPlus, FaTrash } from 'react-icons/fa6';
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

// Limites (AAAA-MM-DD) do <input type="date"> das deslocações - a viagem tem de pertencer
// ao mês do fecho em curso, nunca a outro mês.
function getMesDateBounds(mes) {
  const [ano, mesNum] = mes.split('-').map(Number);
  const ultimoDia = new Date(ano, mesNum, 0).getDate();
  return { min: `${mes}-01`, max: `${mes}-${String(ultimoDia).padStart(2, '0')}` };
}

// "DD-MM-AAAA" -> "DD/MM" - datas mostradas neste modal (dias do mês, deslocações) não
// precisam do ano, é sempre o mês em fecho.
function formatDiaMes(data) {
  const [dia, mesNum] = data.split('-');
  return `${dia}/${mesNum}`;
}

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

  // Deslocações do mês - pergunta e registo (ver createDeslocacao/listDeslocacoes em
  // api/domains/deslocacoes/), sempre a par do fecho, nunca a bloquear "Confirmar Fecho do
  // Mês" (pendentes ou não).
  const [deslocacoes, setDeslocacoes] = useState([]);
  const [deslocacoesLoading, setDeslocacoesLoading] = useState(false);
  // null = ainda não respondeu à pergunta nesta abertura do modal; 'sim'/'nao' = resposta
  // local, não persistida (só decide o que mostrar no ecrã).
  const [deslocacaoResposta, setDeslocacaoResposta] = useState(null);
  const [showDeslocacaoForm, setShowDeslocacaoForm] = useState(false);
  const [deslocacaoForm, setDeslocacaoForm] = useState({ data: '', motivo: '', origem: '', destino: '', idaEVolta: false });
  const [submittingDeslocacao, setSubmittingDeslocacao] = useState(false);
  const mesDateBounds = getMesDateBounds(mes);

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

  const fetchDeslocacoes = useCallback(async () => {
    setDeslocacoesLoading(true);
    try {
      const response = await apiFetch('/deslocacoes/list', {
        method: 'POST',
        body: JSON.stringify({ mes }),
      });
      const data = await response.json();
      const lista = response.ok ? (data.deslocacoes || []) : [];
      setDeslocacoes(lista);
      // Já há deslocações registadas este mês - abre a secção diretamente em vez de
      // voltar a perguntar "Sim/Não" (a pergunta só faz sentido quando ainda está vazio).
      if (lista.length > 0) setDeslocacaoResposta('sim');
      return lista;
    } catch (err) {
      console.error('Erro ao consultar deslocações:', err);
      setDeslocacoes([]);
      return [];
    } finally {
      setDeslocacoesLoading(false);
    }
  }, [mes]);

  // Botão "Sim" funciona como interruptor: os botões Sim/Não ficam sempre visíveis (nunca
  // desaparecem) e só o bloco de baixo (lista/formulário) aparece/desaparece - carregar em
  // "Sim" outra vez com o bloco já aberto volta a escondê-lo.
  const handleToggleDeslocacaoSim = () => {
    if (deslocacaoResposta === 'sim') {
      setDeslocacaoResposta('nao');
      return;
    }
    setDeslocacaoResposta('sim');
    if (deslocacoes.length === 0) setShowDeslocacaoForm(true);
  };

  const [apagandoTodasDeslocacoes, setApagandoTodasDeslocacoes] = useState(false);
  // true enquanto mostra o aviso inline "isto vai apagar X deslocações" - substitui
  // window.confirm por uma confirmação no próprio estilo do modal.
  const [confirmandoApagarDeslocacoes, setConfirmandoApagarDeslocacoes] = useState(false);

  // "Não" significa "afinal não tenho deslocações este mês" - apaga as pendentes
  // já registadas (as aprovadas não são tocadas, ver deleteDeslocacao no backend, que as
  // recusa; nesse caso a secção mantém-se aberta porque ainda há o que mostrar).
  const handleClickNao = () => {
    const pendentes = deslocacoes.filter((d) => !d.Approved);
    if (pendentes.length === 0) {
      setDeslocacaoResposta('nao');
      return;
    }
    setConfirmandoApagarDeslocacoes(true);
  };

  const handleConfirmarApagarDeslocacoes = async () => {
    const pendentes = deslocacoes.filter((d) => !d.Approved);
    setConfirmandoApagarDeslocacoes(false);
    setApagandoTodasDeslocacoes(true);
    try {
      const resultados = await Promise.all(pendentes.map((d) =>
        apiFetch('/deslocacoes', { method: 'DELETE', body: JSON.stringify({ mes, id: d.id }) })
      ));
      const falhas = resultados.filter((r) => !r.ok).length;
      if (falhas > 0) {
        toast.error(`Não foi possível apagar ${falhas} deslocaç${falhas > 1 ? 'ões' : 'ão'}.`);
      }
      const restantes = await fetchDeslocacoes();
      if (restantes.length === 0) setDeslocacaoResposta('nao');
    } finally {
      setApagandoTodasDeslocacoes(false);
    }
  };

  const openModal = (e) => {
    if (e) e.stopPropagation();
    setShowModal(true);
    setDeslocacaoResposta(null);
    setShowDeslocacaoForm(false);
    setDeslocacaoForm({ data: '', motivo: '', origem: '', destino: '', idaEVolta: false });
    fetchStatus();
    fetchDeslocacoes();
  };

  const handleAddDeslocacao = async (e) => {
    e.preventDefault();
    const { data, motivo, origem, destino, idaEVolta } = deslocacaoForm;
    if (!data || !motivo || !origem || !destino) {
      toast.error('Preencha todos os campos da deslocação.');
      return;
    }
    if (data < mesDateBounds.min || data > mesDateBounds.max) {
      toast.error('A data da deslocação tem de pertencer ao mês em fecho.');
      return;
    }

    setSubmittingDeslocacao(true);
    try {
      // input type="date" devolve AAAA-MM-DD; o backend espera DD-MM-AAAA (mesma convenção
      // usada no resto da app, ver createVacation).
      const [ano, mesNum, dia] = data.split('-');
      const response = await apiFetch('/deslocacoes', {
        method: 'POST',
        body: JSON.stringify({ mes, data: `${dia}-${mesNum}-${ano}`, motivo, origem, destino, idaEVolta }),
      });
      const responseData = await response.json();
      if (!response.ok) {
        toast.error(responseData.error || 'Erro ao registar a deslocação');
        return;
      }
      setDeslocacoes((prev) => [...prev, responseData.deslocacao]);
      toast.success('Deslocação registada, aguarda aprovação da GestorRH.');
      setDeslocacaoForm({ data: '', motivo: '', origem: '', destino: '', idaEVolta: false });
      setShowDeslocacaoForm(false);
    } catch (err) {
      console.error('Erro ao registar deslocação:', err);
      toast.error('Erro ao registar a deslocação. Tente novamente.');
    } finally {
      setSubmittingDeslocacao(false);
    }
  };

  const [deletingDeslocacaoId, setDeletingDeslocacaoId] = useState(null);

  // Só a própria (ou um admin em nome dela) pode apagar - e só enquanto ainda estiver
  // pendente; depois de aprovada já conta para o vencimento (ver deleteDeslocacao no backend).
  const handleDeleteDeslocacao = async (id) => {
    setDeletingDeslocacaoId(id);
    try {
      const response = await apiFetch('/deslocacoes', {
        method: 'DELETE',
        body: JSON.stringify({ mes, id }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Erro ao apagar a deslocação');
        return;
      }
      setDeslocacoes((prev) => prev.filter((d) => d.id !== id));
      toast.success('Deslocação apagada.');
    } catch (err) {
      console.error('Erro ao apagar deslocação:', err);
      toast.error('Erro ao apagar a deslocação. Tente novamente.');
    } finally {
      setDeletingDeslocacaoId(null);
    }
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

  // Uma vez confirmado, o botão desaparece por completo - já não há nada de self-service
  // para fazer neste mês (nem deslocações, ver month-lock em deslocacoesController.js).
  // Antes disso, só aparece depois de o colaborador ter recebido o email de aviso (dia 20)
  // - nunca antes, para não convidar a confirmar um mês que ainda nem foi avisado.
  if (initialLoading || status?.confirmed || !status?.reminderSentAt) {
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
                          {status.dias.map((d) => {
                            const isWeekend = d.status === 'fim-de-semana';
                            return (
                              <tr key={d.dia} className={`border-b border-gray-50 last:border-0 ${isWeekend ? 'bg-gray-50' : ''}`}>
                                <td className={`py-2.5 px-3 w-20 ${isWeekend ? 'text-gray-400' : 'text-gray-500'}`}>{formatDiaMes(d.data)}</td>
                                <td className={`py-2.5 px-3 ${isWeekend ? 'text-gray-400' : d.status === 'trabalho_previsto' ? 'text-[#C8932F] font-medium' : 'text-gray-700'}`}>
                                  {STATUS_LABELS[d.status] || d.status}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="mb-5">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <FaCar className="text-[#C8932F]" size={11} /> Deslocações
                    </h3>

                    {deslocacoesLoading ? (
                      <p className="text-xs text-gray-400 py-1">A carregar deslocações...</p>
                    ) : (
                      <div className="bg-gray-50 rounded-lg px-3 py-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="text-xs text-gray-600">Tem deslocações a registar neste mês?</p>
                          <div className="flex gap-1.5 bg-white border border-gray-200 rounded-full p-1 shrink-0">
                            <button
                              type="button"
                              disabled={apagandoTodasDeslocacoes || confirmandoApagarDeslocacoes}
                              onClick={handleToggleDeslocacaoSim}
                              className={`px-4 py-1 rounded-full text-xs font-semibold border-none cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${deslocacaoResposta === 'sim' ? 'bg-[#C8932F] text-white' : 'bg-white text-gray-500 hover:bg-gray-100'}`}
                            >
                              Sim
                            </button>
                            <button
                              type="button"
                              disabled={apagandoTodasDeslocacoes || confirmandoApagarDeslocacoes}
                              onClick={handleClickNao}
                              className={`px-4 py-1 rounded-full text-xs font-semibold border-none cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${deslocacaoResposta !== 'sim' ? 'bg-gray-200 text-gray-700' : 'bg-white text-gray-500 hover:bg-gray-100'}`}
                            >
                              {apagandoTodasDeslocacoes ? 'A apagar...' : 'Não'}
                            </button>
                          </div>
                        </div>

                        {confirmandoApagarDeslocacoes && (() => {
                          const pendentesCount = deslocacoes.filter((d) => !d.Approved).length;
                          const plural = pendentesCount > 1;
                          return (
                            <div className="mt-3 bg-red-50 rounded-lg px-3 py-2.5">
                              <p className="text-xs text-red-700 mb-2.5">
                                Isto vai apagar {pendentesCount} deslocaç{plural ? 'ões' : 'ão'} pendente{plural ? 's' : ''} já registada{plural ? 's' : ''} este mês.
                              </p>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={handleConfirmarApagarDeslocacoes}
                                  className="px-3 py-1.5 rounded-full text-xs font-semibold bg-red-600 text-white border-none cursor-pointer hover:bg-red-700"
                                >
                                  Sim, apagar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmandoApagarDeslocacoes(false)}
                                  className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white text-gray-600 border border-gray-200 cursor-pointer hover:bg-gray-100"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          );
                        })()}

                        {deslocacaoResposta === 'sim' && (
                          <div className="mt-3">
                            {deslocacoes.length > 0 && (
                              <ul className="flex flex-col gap-1.5 mb-2.5">
                                {deslocacoes.map((d) => (
                                  <li key={d.id} className="flex flex-col gap-1 bg-white rounded-lg px-3 py-2 text-xs">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-gray-400">{formatDiaMes(d.data)}</span>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${d.Approved ? 'bg-green-100 text-green-700' : 'bg-[#C8932F]/10 text-[#8a6a22]'}`}>
                                          {d.Approved ? 'Aprovada' : 'Pendente'}
                                        </span>
                                        {!d.Approved && (
                                          <button
                                            type="button"
                                            title="Apagar deslocação"
                                            disabled={deletingDeslocacaoId === d.id}
                                            onClick={() => handleDeleteDeslocacao(d.id)}
                                            className="flex items-center justify-center w-5 h-5 rounded-full border-none bg-transparent text-red-500 cursor-pointer hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                          >
                                            <FaTrash size={10} />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                    <p className="font-semibold text-gray-700 break-words">
                                      {d.origem} → {d.destino}{d.idaEVolta ? ' → ' + d.origem : ''}
                                    </p>
                                    <p className="text-gray-500">
                                      {d.km} km{d.idaEVolta ? ' (ida e volta)' : ''}{d.valor != null ? ` · ${d.valor.toFixed(2)} €` : ''}
                                    </p>
                                  </li>
                                ))}
                              </ul>
                            )}

                            {showDeslocacaoForm ? (
                              <form onSubmit={handleAddDeslocacao} className="bg-white rounded-lg p-3 flex flex-col gap-2">
                                <input
                                  type="date" required value={deslocacaoForm.data}
                                  min={mesDateBounds.min} max={mesDateBounds.max}
                                  onChange={(e) => setDeslocacaoForm((f) => ({ ...f, data: e.target.value }))}
                                  className="text-xs border border-gray-200 rounded-md px-2 py-1.5"
                                />
                                <input
                                  type="text" required placeholder="Motivo de Deslocação" value={deslocacaoForm.motivo}
                                  onChange={(e) => setDeslocacaoForm((f) => ({ ...f, motivo: e.target.value }))}
                                  className="text-xs border border-gray-200 rounded-md px-2 py-1.5"
                                />
                                <input
                                  type="text" required placeholder="Origem (morada)" value={deslocacaoForm.origem}
                                  onChange={(e) => setDeslocacaoForm((f) => ({ ...f, origem: e.target.value }))}
                                  className="text-xs border border-gray-200 rounded-md px-2 py-1.5"
                                />
                                <input
                                  type="text" required placeholder="Destino (morada)" value={deslocacaoForm.destino}
                                  onChange={(e) => setDeslocacaoForm((f) => ({ ...f, destino: e.target.value }))}
                                  className="text-xs border border-gray-200 rounded-md px-2 py-1.5"
                                />
                                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                                  <input
                                    type="checkbox" checked={deslocacaoForm.idaEVolta}
                                    onChange={(e) => setDeslocacaoForm((f) => ({ ...f, idaEVolta: e.target.checked }))}
                                    className="cursor-pointer"
                                  />
                                  Fez o regresso no mesmo dia (ida e volta)
                                </label>
                                <div className="flex gap-2 mt-1">
                                  <button
                                    type="submit" disabled={submittingDeslocacao}
                                    className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#C8932F] text-white border-none cursor-pointer hover:bg-[#A47422] disabled:bg-gray-300 disabled:cursor-not-allowed"
                                  >
                                    {submittingDeslocacao ? 'A calcular...' : 'Guardar deslocação'}
                                  </button>
                                  <button
                                    type="button" disabled={submittingDeslocacao}
                                    onClick={() => setShowDeslocacaoForm(false)}
                                    className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white text-gray-600 border border-gray-200 cursor-pointer hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setShowDeslocacaoForm(true)}
                                className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#8a6a22] bg-transparent border-none p-0 cursor-pointer hover:underline"
                              >
                                <FaPlus size={9} /> {deslocacoes.length > 0 ? 'Adicionar outra deslocação' : 'Registar deslocação'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

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
