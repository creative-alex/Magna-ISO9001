import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserContext } from '../../../shared/context/userContext';
import { generateEditablePdfTemplate1 } from '../utils/pdfGenerate';
import Sidebar from '../../../shared/components/Sidebar';
import Topbar from '../../../shared/components/Topbar';
import { apiFetch } from '../../../shared/utils/apiFetch';

export default function NewTable() {
  const navigate = useNavigate();
  const location = useLocation();
  const { username } = useContext(UserContext);

  const [processName, setProcessName] = useState('');
  const [processFolder, setProcessFolder] = useState('');
  const [nextTableNumber, setNextTableNumber] = useState(null);
  const [manualPrefix, setManualPrefix] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (location.state?.preselectedFolder) {
      setProcessFolder(location.state.preselectedFolder);
    }
  }, [location.state]);

  useEffect(() => {
    const fetchNextTableNumber = async () => {
      try {
        const response = await apiFetch('/files/list-files-tree');
        if (response.ok) {
          const pdfTree = await response.json();
          if (!processFolder) { setNextTableNumber(null); return; }

          let processNumber = 0;
          const processMatch = processFolder.match(/^PROCESSO (\d+):/);
          if (processMatch) processNumber = parseInt(processMatch[1], 10);

          const findFolderInTree = (nodes, targetPath) => {
            for (const node of nodes) {
              if (node.type === 'folder' && node.name === targetPath) return node;
              if (node.type === 'folder' && node.children) {
                const found = findFolderInTree(node.children, targetPath);
                if (found) return found;
              }
            }
            return null;
          };

          const targetFolder = findFolderInTree(pdfTree, processFolder);
          const tableNumbers = [];

          if (targetFolder?.children) {
            targetFolder.children.forEach(node => {
              if (node.type === 'file') {
                let fileNumber = null;
                const matchDash = node.name.match(/^(\d{1,2})-/);
                if (matchDash) fileNumber = parseInt(matchDash[1], 10);
                else {
                  const matchSingle = node.name.match(/^(\d{1,2})\s/);
                  if (matchSingle) fileNumber = parseInt(matchSingle[1], 10);
                }
                if (fileNumber !== null) {
                  const fileProcessNumber = Math.floor(fileNumber / 10);
                  if (fileNumber < 10 && fileNumber === processNumber) tableNumbers.push(fileNumber);
                  else if (fileProcessNumber === processNumber) tableNumbers.push(fileNumber);
                }
              }
            });
          }

          let nextNumber;
          if (tableNumbers.length > 0) {
            nextNumber = Math.max(...tableNumbers) + 1;
          } else {
            nextNumber = processNumber === 0 ? 1 : processNumber * 10;
          }
          setNextTableNumber(nextNumber);
        } else {
          setNextTableNumber(null);
        }
      } catch {
        setNextTableNumber(null);
      }
    };
    fetchNextTableNumber();
  }, [processFolder]);

  const [observacoes, setObservacoes] = useState([[''], [''], [''], [''], ['']]);
  const [tabelaPrincipal, setTabelaPrincipal] = useState([
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
  ]);

  const mainHeaders = ['Fluxo das Ações', 'Descrição', 'Responsável', 'Documentos Associados', 'Instruções de Trabalho'];
  const headersObs = ['Observações'];

  const handleObservacoesChange = (rowIdx, value) => {
    setObservacoes(prev => { const n = [...prev]; n[rowIdx] = [value]; return n; });
  };

  const handleTabelaPrincipalChange = (rowIdx, colIdx, value) => {
    setTabelaPrincipal(prev => {
      const n = prev.map(row => [...row]);
      n[rowIdx][colIdx] = value;
      return n;
    });
  };

  const addTabelaPrincipalRow = () => setTabelaPrincipal(prev => [...prev, ['', '', '', '', '']]);
  const removeTabelaPrincipalRow = (index) => {
    if (tabelaPrincipal.length > 1) setTabelaPrincipal(prev => prev.filter((_, i) => i !== index));
  };

  const handleProcessNameChange = (value) => {
    const cleanValue = value.replace(/[\/\\]/g, '|');
    setProcessName(cleanValue);
    if (value !== cleanValue) {
      setError('Caracteres "/" e "\\" foram substituídos por "|" para evitar problemas de ficheiro');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleCreateTable = async () => {
    if (!processName.trim()) { setError('Nome do procedimento é obrigatório'); return; }
    if (!processFolder.trim()) { setError('Pasta do processo é obrigatória'); return; }
    if (nextTableNumber === null && !manualPrefix.trim()) {
      setError('Aguarde o carregamento do número ou insira um prefixo manual');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const pdfBytes = await generateEditablePdfTemplate1(tabelaPrincipal, mainHeaders, observacoes, headersObs);

      const formData = new FormData();
      const cleanProcessName = processName.trim().replace(/[\/\\]/g, '|');
      const prefix = manualPrefix.trim() || nextTableNumber.toString().padStart(2, '0');
      const fileName = `${prefix} ${cleanProcessName}.pdf`;

      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      formData.append('file', pdfBlob, fileName);
      formData.append('filename', fileName);
      formData.append('folders', JSON.stringify([processFolder.trim()]));
      formData.append('mainTableData', JSON.stringify(tabelaPrincipal));
      formData.append('obsTableData', JSON.stringify(observacoes));

      const response = await apiFetch('/files/upload-pdf', {
        method: 'POST', body: formData,
      });
      if (!response.ok) throw new Error('Erro ao criar procedimento');

      navigate('/dashboard');
    } catch (err) {
      setError('Erro ao criar procedimento: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const secoes = [
    { idx: 0, label: '1. Objetivos', placeholder: 'Digite os objetivos do documento...' },
    { idx: 1, label: '2. Campo de Aplicação', placeholder: 'Digite o campo de aplicação...' },
    { idx: 2, label: '3. Definições', placeholder: 'Digite as definições relevantes...' },
    { idx: 3, label: '4. Abreviaturas', placeholder: 'Digite as abreviaturas utilizadas...' },
    { idx: 4, label: '5. Observações', placeholder: 'Digite observações adicionais...' },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar onSelectFile={(path) => navigate(`/file/${path.replace(/\s/g, '-').replace(/\//g, '__')}`)} />

      <div className="ml-[230px] flex-1 flex flex-col min-h-screen">
        <Topbar icon="📄" title="Novo Procedimento" />

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

            {/* Configuração */}
            <div className="bg-white border border-gray-200 rounded-[10px] p-6 mb-5">
              <p className="text-[11px] font-bold text-[#4A2E08] uppercase tracking-[0.8px] m-0 mb-5 pb-3 border-b border-gray-100">Configuração do Procedimento</p>

              {/* Pasta do processo */}
              <div className="flex flex-col gap-1.5 mb-4 last:mb-0">
                <label className="text-[11px] font-bold text-gray-700 uppercase tracking-[0.7px]">Processo</label>
                {processFolder ? (
                  <div className="inline-flex items-center gap-2 bg-[#FAF3E6] border border-[#E8D0A0] rounded-lg px-4 py-2.5 text-[13px] font-semibold text-[#4A2E08]">
                    <svg className="text-[#C8932F] shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                    </svg>
                    {processFolder}
                  </div>
                ) : (
                  <input
                    type="text"
                    className="w-full px-[14px] py-2.5 border-[1.5px] border-gray-200 rounded-lg text-[14px] text-gray-900 bg-white box-border transition-all duration-200 focus:outline-none focus:border-[#C8932F] focus:shadow-[0_0_0_3px_rgba(200,147,47,0.1)] placeholder:text-[#c9d0d8]"
                    value={processFolder}
                    onChange={(e) => setProcessFolder(e.target.value)}
                    placeholder="Nome da pasta do processo"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1">
                <div className="flex flex-col gap-1.5 mb-4 last:mb-0">
                  <label className="text-[11px] font-bold text-gray-700 uppercase tracking-[0.7px]">Nome do Procedimento</label>
                  <input
                    type="text"
                    className="w-full px-[14px] py-2.5 border-[1.5px] border-gray-200 rounded-lg text-[14px] text-gray-900 bg-white box-border transition-all duration-200 focus:outline-none focus:border-[#C8932F] focus:shadow-[0_0_0_3px_rgba(200,147,47,0.1)] placeholder:text-[#c9d0d8]"
                    value={processName}
                    onChange={(e) => handleProcessNameChange(e.target.value)}
                    placeholder="Ex: Gestão de Recursos Humanos"
                  />
                  <span className="text-[12px] text-gray-400">
                    {processFolder
                      ? (() => {
                          const prefix = manualPrefix.trim() || (nextTableNumber !== null ? nextTableNumber.toString().padStart(2, '0') : null);
                          if (!prefix) return 'A carregar número...';
                          return <>Ficheiro: <strong className="text-[#C8932F] font-semibold">{prefix} {processName || '[Nome]'}.pdf</strong></>;
                        })()
                      : 'Selecione um processo para ver o nome do ficheiro'}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5 mb-4 last:mb-0">
                  <label className="text-[11px] font-bold text-gray-700 uppercase tracking-[0.7px]">Prefixo Manual <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 11, color: '#9ca3af' }}>(opcional)</span></label>
                  <input
                    type="text"
                    className="w-full px-[14px] py-2.5 border-[1.5px] border-gray-200 rounded-lg text-[14px] text-gray-900 bg-white box-border transition-all duration-200 focus:outline-none focus:border-[#C8932F] focus:shadow-[0_0_0_3px_rgba(200,147,47,0.1)] placeholder:text-[#c9d0d8]"
                    value={manualPrefix}
                    onChange={(e) => setManualPrefix(e.target.value)}
                    placeholder="Ex: 01, 02 (vazio = automático)"
                  />
                  <span className="text-[12px] text-gray-400">Deixe vazio para numeração automática</span>
                </div>
              </div>
            </div>

            {/* Secções do documento */}
            <div className="bg-white border border-gray-200 rounded-[10px] p-6 mb-5">
              <p className="text-[11px] font-bold text-[#4A2E08] uppercase tracking-[0.8px] m-0 mb-5 pb-3 border-b border-gray-100">Secções do Documento</p>
              {secoes.map(({ idx, label, placeholder }) => (
                <div className="flex flex-col gap-1.5 mb-4 last:mb-0" key={idx}>
                  <label className="text-[11px] font-bold text-gray-700 uppercase tracking-[0.7px]">{label}</label>
                  <textarea
                    className="w-full px-[14px] py-2.5 border-[1.5px] border-gray-200 rounded-lg text-[14px] text-gray-900 bg-white box-border transition-all duration-200 focus:outline-none focus:border-[#C8932F] focus:shadow-[0_0_0_3px_rgba(200,147,47,0.1)] placeholder:text-[#c9d0d8]"
                    value={observacoes[idx][0]}
                    onChange={(e) => handleObservacoesChange(idx, e.target.value)}
                    placeholder={placeholder}
                    rows={3}
                  />
                </div>
              ))}
            </div>

            {/* Tabela principal */}
            <div className="bg-white border border-gray-200 rounded-[10px] p-6 mb-5">
              <p className="text-[11px] font-bold text-[#4A2E08] uppercase tracking-[0.8px] m-0 mb-5 pb-3 border-b border-gray-100">Tabela Principal</p>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr>
                      {mainHeaders.map(h => (
                        <th key={h} className="bg-[#FAF3E6] text-[#4A2E08] font-bold text-[11px] uppercase tracking-[0.5px] px-3 py-[11px] border-b-[1.5px] border-b-[#E8D0A0] text-left whitespace-nowrap">{h}</th>
                      ))}
                      <th className="bg-[#FAF3E6] text-[#4A2E08] font-bold text-[11px] uppercase tracking-[0.5px] px-3 py-[11px] border-b-[1.5px] border-b-[#E8D0A0] text-left whitespace-nowrap" style={{ width: 42 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tabelaPrincipal.map((row, rowIdx) => (
                      <tr key={rowIdx} className="hover:[&>td]:bg-[#fafafa]">
                        {row.map((cell, colIdx) => (
                          <td key={colIdx} className="border-b border-gray-100 px-2 py-1.5 align-top">
                            <textarea
                              className="w-full min-h-[56px] border-0 bg-transparent resize-y text-[13px] p-1 text-gray-900 focus:outline-none focus:bg-[#fffbf0] focus:rounded"
                              value={cell}
                              onChange={(e) => handleTabelaPrincipalChange(rowIdx, colIdx, e.target.value)}
                              placeholder={mainHeaders[colIdx]}
                            />
                          </td>
                        ))}
                        <td className="w-[42px] text-center align-middle border-b border-gray-100 px-2 py-1.5">
                          {tabelaPrincipal.length > 1 && (
                            <button type="button" className="flex items-center justify-center w-7 h-7 bg-red-50 text-red-600 border border-red-200 rounded-md cursor-pointer text-base font-bold mx-auto transition-colors duration-150 hover:bg-red-100 leading-[1]" onClick={() => removeTabelaPrincipalRow(rowIdx)}>×</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-transparent text-[#C8932F] border-[1.5px] border-dashed border-[#C8932F] rounded-lg text-[13px] font-semibold cursor-pointer transition-colors duration-150 hover:bg-[#FAF3E6]" onClick={addTabelaPrincipalRow}>
                + Adicionar Linha
              </button>
            </div>

            {/* Acções */}
            <div className="flex gap-3 justify-end py-1 pb-2 max-sm:flex-col-reverse">
              <button type="button" className="px-6 py-[11px] bg-white text-gray-500 border-[1.5px] border-gray-200 rounded-lg text-[14px] font-semibold cursor-pointer transition-all duration-150 hover:bg-gray-50 hover:border-gray-300 max-sm:w-full max-sm:justify-center" onClick={() => navigate('/file')}>
                Cancelar
              </button>
              <button type="button" className="px-7 py-[11px] bg-gradient-to-br from-[#C8932F] to-[#DFA847] text-white border-0 rounded-lg text-[14px] font-bold cursor-pointer tracking-[0.4px] flex items-center gap-2 shadow-[0_3px_12px_rgba(200,147,47,0.28)] transition-all duration-200 hover:enabled:opacity-[.92] hover:enabled:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none max-sm:w-full max-sm:justify-center" onClick={handleCreateTable} disabled={loading}>
                {loading ? <><span className="inline-block w-[15px] h-[15px] border-2 border-white/35 border-t-white rounded-full animate-spin" /> A criar...</> : 'Criar Procedimento'}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
