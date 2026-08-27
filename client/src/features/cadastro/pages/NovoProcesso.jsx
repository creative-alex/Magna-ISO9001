import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../../shared/context/userContext';
import { generateEditablePdfTemplate2 } from '../utils/pdfGenerate';
import Sidebar from '../../../shared/components/Sidebar';
import Topbar from '../../../shared/components/Topbar';
import { apiFetch } from '../../../shared/utils/apiFetch';

export default function CreateProcess() {
  const navigate = useNavigate();
  const { username } = useContext(UserContext);

  const [processName, setProcessName] = useState('');
  const [nextProcessNumber, setNextProcessNumber] = useState(null);
  const [donosProcesso, setDonosProcesso] = useState([]);
  const [donosOpen, setDonosOpen] = useState(false);
  const [objetivoProcesso, setObjetivoProcesso] = useState('');
  const [servicosEntrada, setServicosEntrada] = useState('');
  const [servicoSaida, setServicoSaida] = useState('');
  const [atividades, setAtividades] = useState([
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
  ]);
  const [dragRowIdx, setDragRowIdx] = useState(null);
  const [dragOverRowIdx, setDragOverRowIdx] = useState(null);
  const [indicadores, setIndicadores] = useState(['', '', '']);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchNextProcessNumber = async () => {
      try {
        const response = await apiFetch('/files/process-owners');
        if (response.ok) {
          const processOwners = await response.json();
          const processNumbers = Object.keys(processOwners)
            .filter(n => n.startsWith('PROCESSO '))
            .map(n => { const m = n.match(/^PROCESSO (\d+):/); return m ? parseInt(m[1], 10) : -1; })
            .filter(n => n >= 0)
            .sort((a, b) => a - b);
          let nextNumber = 0;
          if (processNumbers.length > 0) {
            for (let i = 0; i < processNumbers.length; i++) {
              if (processNumbers[i] !== i) { nextNumber = i; break; }
            }
            if (nextNumber === 0 && processNumbers[0] === 0) nextNumber = processNumbers.length;
          }
          setNextProcessNumber(nextNumber);
        } else {
          setNextProcessNumber(0);
        }
      } catch {
        setNextProcessNumber(0);
      }
    };
    fetchNextProcessNumber();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await apiFetch('/users/getAllUsers');
        if (response.ok) setUsers(await response.json());
      } catch {}
    };
    fetchUsers();
  }, []);

  const handleAtividadesChange = (rowIdx, colIdx, value) => {
    setAtividades(prev => {
      const novo = prev.map(row => [...row]);
      novo[rowIdx][colIdx] = value;
      return novo;
    });
  };

  const handleIndicadoresChange = (idx, value) => {
    setIndicadores(prev => prev.map((v, i) => i === idx ? value : v));
  };

  const addIndicador = () => setIndicadores(prev => [...prev, '']);

  const removeIndicador = (idx) => {
    if (indicadores.length > 1) setIndicadores(prev => prev.filter((_, i) => i !== idx));
  };

  const addAtividadeRow = () => setAtividades(prev => [...prev, ['', '', '', '', '', '']]);

  const removeAtividadeRow = (index) => {
    if (atividades.length > 1) setAtividades(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragStart = (e, idx) => {
    setDragRowIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    if (idx !== dragRowIdx) setDragOverRowIdx(idx);
  };

  const handleDrop = (e, idx) => {
    e.preventDefault();
    if (dragRowIdx === null || dragRowIdx === idx) return;
    setAtividades(prev => {
      const novo = [...prev];
      const [removed] = novo.splice(dragRowIdx, 1);
      novo.splice(idx, 0, removed);
      return novo;
    });
    setDragRowIdx(null);
    setDragOverRowIdx(null);
  };

  const handleDragEnd = () => {
    setDragRowIdx(null);
    setDragOverRowIdx(null);
  };

  const handleCreateProcess = async () => {
    if (!processName.trim()) { setError('Nome do processo é obrigatório'); return; }
    if (donosProcesso.length === 0) { setError('Selecione pelo menos um dono do processo'); return; }
    if (nextProcessNumber === null) { setError('Aguarde o carregamento do número do processo...'); return; }

    setLoading(true);
    setError('');

    try {
      const fullProcessName = `PROCESSO ${nextProcessNumber}: ${processName.trim()}`;
      const donoProcesso = donosProcesso.join(', ');
      const indicadoresObj = Object.fromEntries(
        indicadores.map((v, i) => [`indicadores_r${i + 1}`, v])
      );
      const pdfBytes = await generateEditablePdfTemplate2({
        atividades, donoProcesso, objetivoProcesso, indicadores: indicadoresObj, servicosEntrada, servicoSaida,
      });

      const formData = new FormData();
      const fileName = `1-${fullProcessName}.pdf`;
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      formData.append('file', pdfBlob, fileName);
      formData.append('filename', fileName);
      formData.append('folders', JSON.stringify([fullProcessName]));
      formData.append('atividades', JSON.stringify(atividades));
      formData.append('donoProcesso', donoProcesso);
      formData.append('objetivoProcesso', objetivoProcesso);
      formData.append('servicos_entrada', servicosEntrada);
      formData.append('servico_saida', servicoSaida);
      indicadores.forEach((v, i) => formData.append(`indicadores_r${i + 1}`, v));

      const pdfResponse = await apiFetch('/files/save-pdf', {
        method: 'POST', body: formData,
      });
      if (!pdfResponse.ok) throw new Error('Erro ao guardar PDF');

      const recordResponse = await apiFetch('/files/create-record', {
        method: 'POST',
        body: JSON.stringify({
          processName: fullProcessName, donoProcesso, objetivoProcesso,
          servicos_entrada: servicosEntrada, servico_saida: servicoSaida,
          ...Object.fromEntries(indicadores.map((v, i) => [`indicadores_r${i + 1}`, v])),
          atividades,
        }),
      });
      if (!recordResponse.ok) throw new Error('Erro ao criar registro na BD');

      navigate('/dashboard');
    } catch (err) {
      setError('Erro ao criar processo: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const atividadeHeaders = ['Atividade', 'Responsável', 'Input', 'Output', 'Método', 'Requisitos CQCQ'];

  return (
    <div className="flex min-h-screen">
      <Sidebar onSelectFile={(path) => navigate(`/file/${path.replace(/\s/g, '-').replace(/\//g, '__')}`)} />

      <div className="ml-[230px] flex-1 flex flex-col min-h-screen">
        <Topbar icon="⚙️" title="Novo Processo" />

        <div className="p-6 flex-1">
          <div className="p-6 max-w-[1100px] mx-auto">

            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-[13px] mb-5">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            {/* Identificação */}
            <div className="bg-white border border-gray-200 rounded-[10px] p-6 mb-5">
              <p className="text-[11px] font-bold text-[#4A2E08] uppercase tracking-[0.8px] m-0 mb-5 pb-3 border-b border-gray-100">Identificação do Processo</p>

              <div className="flex flex-col gap-1.5 mb-4 last:mb-0">
                <label className="text-[11px] font-bold text-gray-700 uppercase tracking-[0.7px]">Nome do Processo</label>
                <input
                  type="text"
                  className="w-full px-[14px] py-2.5 border-[1.5px] border-gray-200 rounded-lg text-[14px] text-gray-900 bg-white box-border transition-all duration-200 focus:outline-none focus:border-[#C8932F] focus:shadow-[0_0_0_3px_rgba(200,147,47,0.1)] placeholder:text-[#c9d0d8]"
                  value={processName}
                  onChange={(e) => setProcessName(e.target.value)}
                  placeholder="Ex: Gestão de Recursos Humanos"
                />
                <span className="text-[12px] text-gray-400">
                  {nextProcessNumber !== null
                    ? <>Nome completo: <strong className="text-[#C8932F] font-semibold">PROCESSO {nextProcessNumber}: {processName || '[Nome do Processo]'}</strong></>
                    : 'A carregar número do processo...'}
                </span>
              </div>

              <div className="flex flex-col gap-1.5 mb-4 last:mb-0">
                <label className="text-[11px] font-bold text-gray-700 uppercase tracking-[0.7px]">Dono(s) do Processo</label>
                <div className="relative">
                  <button
                    type="button"
                    className="w-full px-[14px] py-2.5 border-[1.5px] border-gray-200 rounded-lg text-[14px] text-gray-900 bg-white cursor-pointer text-left flex justify-between items-center gap-2 transition-all duration-200 focus:outline-none hover:border-[#C8932F] hover:shadow-[0_0_0_3px_rgba(200,147,47,0.1)] focus:border-[#C8932F] focus:shadow-[0_0_0_3px_rgba(200,147,47,0.1)]"
                    onClick={() => setDonosOpen(o => !o)}
                  >
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap text-gray-900">
                      {donosProcesso.length === 0
                        ? 'Selecionar responsável(is)'
                        : donosProcesso.join(', ')}
                    </span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: donosOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>
                  {donosOpen && (
                    <>
                      <div className="fixed inset-0 z-[99]" onClick={() => setDonosOpen(false)} />
                      <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border-[1.5px] border-[#C8932F] rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.1)] z-[100] max-h-[220px] overflow-y-auto p-1">
                        {users.map((user) => {
                          const checked = donosProcesso.includes(user.nome);
                          return (
                            <label key={user.id} className="flex items-center gap-2.5 px-3 py-[9px] rounded-md cursor-pointer text-[14px] text-gray-700 transition-colors duration-[120ms] select-none hover:bg-[#FAF3E6]">
                              <input
                                type="checkbox"
                                className="w-[15px] h-[15px] accent-[#C8932F] cursor-pointer shrink-0"
                                checked={checked}
                                onChange={() => {
                                  setDonosProcesso(prev =>
                                    checked ? prev.filter(n => n !== user.nome) : [...prev, user.nome]
                                  );
                                }}
                              />
                              {user.nome}
                            </label>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Objetivo e Serviços */}
            <div className="bg-white border border-gray-200 rounded-[10px] p-6 mb-5">
              <p className="text-[11px] font-bold text-[#4A2E08] uppercase tracking-[0.8px] m-0 mb-5 pb-3 border-b border-gray-100">Objetivo e Serviços</p>

              <div className="flex flex-col gap-1.5 mb-4 last:mb-0">
                <label className="text-[11px] font-bold text-gray-700 uppercase tracking-[0.7px]">Objetivo do Processo</label>
                <textarea
                  className="w-full px-[14px] py-2.5 border-[1.5px] border-gray-200 rounded-lg text-[14px] text-gray-900 bg-white box-border transition-all duration-200 focus:outline-none focus:border-[#C8932F] focus:shadow-[0_0_0_3px_rgba(200,147,47,0.1)] placeholder:text-[#c9d0d8]"
                  value={objetivoProcesso}
                  onChange={(e) => setObjetivoProcesso(e.target.value)}
                  placeholder="Descreva o objetivo principal do processo"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1">
                <div className="flex flex-col gap-1.5 mb-4 last:mb-0">
                  <label className="text-[11px] font-bold text-gray-700 uppercase tracking-[0.7px]">Serviços de Entrada</label>
                  <textarea
                    className="w-full px-[14px] py-2.5 border-[1.5px] border-gray-200 rounded-lg text-[14px] text-gray-900 bg-white box-border transition-all duration-200 focus:outline-none focus:border-[#C8932F] focus:shadow-[0_0_0_3px_rgba(200,147,47,0.1)] placeholder:text-[#c9d0d8]"
                    value={servicosEntrada}
                    onChange={(e) => setServicosEntrada(e.target.value)}
                    placeholder="Recursos, informações ou serviços necessários"
                    rows={4}
                  />
                </div>
                <div className="flex flex-col gap-1.5 mb-4 last:mb-0">
                  <label className="text-[11px] font-bold text-gray-700 uppercase tracking-[0.7px]">Serviço de Saída</label>
                  <textarea
                    className="w-full px-[14px] py-2.5 border-[1.5px] border-gray-200 rounded-lg text-[14px] text-gray-900 bg-white box-border transition-all duration-200 focus:outline-none focus:border-[#C8932F] focus:shadow-[0_0_0_3px_rgba(200,147,47,0.1)] placeholder:text-[#c9d0d8]"
                    value={servicoSaida}
                    onChange={(e) => setServicoSaida(e.target.value)}
                    placeholder="Resultado ou produto final do processo"
                    rows={4}
                  />
                </div>
              </div>
            </div>

            {/* Atividades */}
            <div className="bg-white border border-gray-200 rounded-[10px] p-6 mb-5">
              <p className="text-[11px] font-bold text-[#4A2E08] uppercase tracking-[0.8px] m-0 mb-5 pb-3 border-b border-gray-100">Atividades do Processo</p>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr>
                      <th className="bg-[#FAF3E6] text-[#4A2E08] font-bold text-[11px] uppercase tracking-[0.5px] px-3 py-[11px] border-b-[1.5px] border-b-[#E8D0A0] text-left whitespace-nowrap" style={{ width: 32 }}></th>
                      {atividadeHeaders.map(h => (
                        <th key={h} className="bg-[#FAF3E6] text-[#4A2E08] font-bold text-[11px] uppercase tracking-[0.5px] px-3 py-[11px] border-b-[1.5px] border-b-[#E8D0A0] text-left whitespace-nowrap">{h}</th>
                      ))}
                      <th className="bg-[#FAF3E6] text-[#4A2E08] font-bold text-[11px] uppercase tracking-[0.5px] px-3 py-[11px] border-b-[1.5px] border-b-[#E8D0A0] text-left whitespace-nowrap" style={{ width: 42 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {atividades.map((row, rowIdx) => (
                      <tr
                        key={rowIdx}
                        draggable
                        onDragStart={(e) => handleDragStart(e, rowIdx)}
                        onDragOver={(e) => handleDragOver(e, rowIdx)}
                        onDrop={(e) => handleDrop(e, rowIdx)}
                        onDragEnd={handleDragEnd}
                        className={[
                          'hover:[&>td]:bg-[#fafafa]',
                          dragRowIdx === rowIdx ? '[&>td]:opacity-35' : '',
                          dragOverRowIdx === rowIdx && dragRowIdx !== rowIdx ? '[&>td]:border-t-2 [&>td]:border-t-[#C8932F]' : '',
                        ].filter(Boolean).join(' ')}
                      >
                        <td className="w-8 text-center align-middle border-b border-gray-100 px-2 py-1.5">
                          <span className="block text-gray-300 text-[18px] cursor-grab select-none transition-colors duration-150 leading-[1] hover:text-gray-400 active:cursor-grabbing">⠿</span>
                        </td>
                        {row.map((cell, colIdx) => (
                          <td key={colIdx} className="border-b border-gray-100 px-2 py-1.5 align-top">
                            <textarea
                              className="w-full min-h-[56px] border-0 bg-transparent resize-y text-[13px] p-1 text-gray-900 focus:outline-none focus:bg-[#fffbf0] focus:rounded"
                              value={cell}
                              onChange={(e) => handleAtividadesChange(rowIdx, colIdx, e.target.value)}
                              placeholder={atividadeHeaders[colIdx]}
                            />
                          </td>
                        ))}
                        <td className="w-[42px] text-center align-middle border-b border-gray-100 px-2 py-1.5">
                          {atividades.length > 1 && (
                            <button type="button" className="flex items-center justify-center w-7 h-7 bg-red-50 text-red-600 border border-red-200 rounded-md cursor-pointer text-base font-bold mx-auto transition-colors duration-150 hover:bg-red-100 leading-[1]" onClick={() => removeAtividadeRow(rowIdx)}>×</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-transparent text-[#C8932F] border-[1.5px] border-dashed border-[#C8932F] rounded-lg text-[13px] font-semibold cursor-pointer transition-colors duration-150 hover:bg-[#FAF3E6]" onClick={addAtividadeRow}>
                + Adicionar Atividade
              </button>
            </div>

            {/* Indicadores */}
            <div className="bg-white border border-gray-200 rounded-[10px] p-6 mb-5">
              <p className="text-[11px] font-bold text-[#4A2E08] uppercase tracking-[0.8px] m-0 mb-5 pb-3 border-b border-gray-100">Indicadores</p>
              <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1">
                {[
                  { key: 'indicadores_r1', label: 'Indicador 1', placeholder: 'Primeiro indicador' },
                  { key: 'indicadores_r2', label: 'Indicador 2', placeholder: 'Segundo indicador' },
                  { key: 'indicadores_r3', label: 'Indicador 3', placeholder: 'Terceiro indicador' },
                ].map(({ key, label, placeholder }, i) => (
                  <div className="flex flex-col gap-1.5 mb-4 last:mb-0" key={key}>
                    <label className="text-[11px] font-bold text-gray-700 uppercase tracking-[0.7px]">{label}</label>
                    <input
                      type="text"
                      className="w-full px-[14px] py-2.5 border-[1.5px] border-gray-200 rounded-lg text-[14px] text-gray-900 bg-white box-border transition-all duration-200 focus:outline-none focus:border-[#C8932F] focus:shadow-[0_0_0_3px_rgba(200,147,47,0.1)] placeholder:text-[#c9d0d8]"
                      value={indicadores[i]}
                      onChange={(e) => handleIndicadoresChange(i, e.target.value)}
                      placeholder={placeholder}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Acções */}
            <div className="flex gap-3 justify-end py-1 pb-2 max-sm:flex-col-reverse">
              <button type="button" className="px-6 py-[11px] bg-white text-gray-500 border-[1.5px] border-gray-200 rounded-lg text-[14px] font-semibold cursor-pointer transition-all duration-150 hover:bg-gray-50 hover:border-gray-300 max-sm:w-full max-sm:justify-center" onClick={() => navigate('/file')}>
                Cancelar
              </button>
              <button type="button" className="px-7 py-[11px] bg-gradient-to-br from-[#C8932F] to-[#DFA847] text-white border-0 rounded-lg text-[14px] font-bold cursor-pointer tracking-[0.4px] flex items-center gap-2 shadow-[0_3px_12px_rgba(200,147,47,0.28)] transition-all duration-200 hover:enabled:opacity-[.92] hover:enabled:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none max-sm:w-full max-sm:justify-center" onClick={handleCreateProcess} disabled={loading}>
                {loading ? <><span className="inline-block w-[15px] h-[15px] border-2 border-white/35 border-t-white rounded-full animate-spin" /> A criar...</> : 'Criar Processo'}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
