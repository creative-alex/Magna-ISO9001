import React, { useRef, useEffect, useState } from "react";
import ExportPdfButton from "./ExportPdfButton";
import PreviewPdfButton from "./PreviewPdfButton";
import useRowContextMenu from "../hooks/useRowContextMenu";
import MultiSelectDonos from "./MultiSelectDonos";
import { FaPencil, FaXmark, FaCheck, FaGripVertical, FaArrowRotateLeft, FaArrowLeft, FaClipboardList } from "react-icons/fa6";

export default function Template2({
  isEditable = false,
  setIsEditable,
  canEdit = true,
  isSuperAdmin = false,
  data = [["", ""]],
  handleChange,
  handleAtividadesChange,
  handleIndicadoresChange,
  donoProcesso = "",
  setDonoProcesso,
  donoProcessoOriginal = "",
  objetivoProcesso = "",
  setObjetivoProcesso,
  atividades = [
    ["", "", "", "", "", ""],
    ["", "", "", "", "", ""],
    ["", "", "", "", "", ""],
    ["", "", "", "", "", ""],
  ],
  indicadores = [""],
  servicosEntrada = "",
  setServicosEntrada,
  servicoSaida = "",
  setServicoSaida,
  funcionarios = [],
  getTablesHtml,
  onMoveAtividadeUp,
  onMoveAtividadeDown,
  onInsertAtividadeAbove,
  onInsertAtividadeBelow,
  onDeleteAtividade,
  onMoveIndicadorUp,
  onMoveIndicadorDown,
  onInsertIndicadorAbove,
  onInsertIndicadorBelow,
  onDeleteIndicador,
  pathFilename = "",
  onSaveSuccess,
  onRenameFile,
  history = [],
  initialMergedSpans = {},
  initialHiddenCells = {},
}) {
  const textAreaRefs = useRef({});
  const titleInputRef = useRef(null);
  const [contextMenuCell, setContextMenuCell] = useState(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [mergedSpans, setMergedSpans] = useState(initialMergedSpans);
  const [hiddenCells, setHiddenCells] = useState(initialHiddenCells);

  // Resincroniza a união de células vinda da API sempre que o documento muda
  // (o estado local é o único dono da união durante a edição, por isso não
  // reagimos a qualquer alteração de referência dos props, só à troca de ficheiro).
  useEffect(() => {
    console.log("🔗 [DEBUG merge] tabelaMatriz recebeu initialMergedSpans:", initialMergedSpans, "initialHiddenCells:", initialHiddenCells);
    setMergedSpans(initialMergedSpans);
    setHiddenCells(initialHiddenCells);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathFilename]);

  const contextMenuAtividades = useRowContextMenu({
    totalRows: atividades.length,
    onMoveRowUp: onMoveAtividadeUp,
    onMoveRowDown: onMoveAtividadeDown,
    onInsertRowAbove: onInsertAtividadeAbove,
    onInsertRowBelow: onInsertAtividadeBelow,
    onDeleteRow: onDeleteAtividade,
    cellContextMenu: (() => {
      const canAct =
        contextMenuCell &&
        Number.isInteger(contextMenuCell.row) &&
        Number.isInteger(contextMenuCell.col);
      const keyTop = canAct ? `${contextMenuCell.row}-${contextMenuCell.col}` : "";
      const currentSpan = canAct && mergedSpans[keyTop] ? mergedSpans[keyTop] : 1;
      const nextRow = canAct ? contextMenuCell.row + currentSpan : -1;
      const canExpandDown =
        !!canAct &&
        nextRow < atividades.length &&
        !hiddenCells[`${nextRow}-${contextMenuCell.col}`];
      const canUnmergeStep = !!canAct && currentSpan >= 2;

      return [
        {
          label: "Unir/Expandir para baixo",
          icon: <FaGripVertical size={14} />,
          className: "merge-down",
          disabled: !canExpandDown,
          action: () => {
            if (!canExpandDown) return;
            const { row, col } = contextMenuCell;
            const topKey = `${row}-${col}`;
            const span = mergedSpans[topKey] ? mergedSpans[topKey] : 1;
            const targetRow = row + span;
            const topVal = (atividades[row] && atividades[row][col]) || "";
            const bottomVal = (atividades[targetRow] && atividades[targetRow][col]) || "";
            const newVal =
              topVal && bottomVal ? `${topVal}\n${bottomVal}` : topVal || bottomVal;
            handleAtividadesChange(row, col, newVal);
            handleAtividadesChange(targetRow, col, "");
            setMergedSpans((prev) => ({ ...prev, [topKey]: span + 1 }));
            setHiddenCells((prev) => ({ ...prev, [`${targetRow}-${col}`]: true }));
          },
        },
        {
          label: "Reduzir união",
          icon: <FaArrowRotateLeft size={12} />,
          className: "unmerge",
          disabled: !canUnmergeStep,
          action: () => {
            if (!canUnmergeStep) return;
            const { row, col } = contextMenuCell;
            const topKey = `${row}-${col}`;
            const span = mergedSpans[topKey];
            if (!span || span < 2) return;
            const lastCoveredRow = row + span - 1;
            const mergedValue = (atividades[row] && atividades[row][col]) || "";
            const lastNl = mergedValue.lastIndexOf("\n");
            if (lastNl !== -1) {
              handleAtividadesChange(row, col, mergedValue.slice(0, lastNl));
              handleAtividadesChange(lastCoveredRow, col, mergedValue.slice(lastNl + 1));
            }
            setMergedSpans((prev) => {
              const next = { ...prev };
              if (span > 2) next[topKey] = span - 1;
              else delete next[topKey];
              return next;
            });
            setHiddenCells((prev) => {
              const next = { ...prev };
              delete next[`${lastCoveredRow}-${col}`];
              return next;
            });
          },
        },
      ];
    })(),
  });

  const contextMenuIndicadores = useRowContextMenu({
    totalRows: Array.isArray(indicadores) ? indicadores.length : 3,
    onMoveRowUp: onMoveIndicadorUp,
    onMoveRowDown: onMoveIndicadorDown,
    onInsertRowAbove: onInsertIndicadorAbove,
    onInsertRowBelow: onInsertIndicadorBelow,
    onDeleteRow: onDeleteIndicador,
  });

  const donoProcessoAlterado = donoProcesso !== donoProcessoOriginal;

  const handleTextareaResize = (e) => {
    const textarea = e.target;
    // Limpa padding inline de um resize anterior; o padding por omissão (py-2)
    // já alinha o texto ao topo, tal como nas células normais.
    textarea.style.paddingTop = "";
    textarea.style.paddingBottom = "";
    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(textarea.scrollHeight, 40)}px`;
    const isMerged = textarea.dataset && textarea.dataset.merged === "1";
    if (isMerged) {
      const td = textarea.closest("td");
      if (td) {
        const tdH = td.clientHeight;
        textarea.style.height = "auto";
        const contentH = textarea.scrollHeight;
        // Altura explícita em pixels (não "100%"): dentro de uma <td> com
        // altura automática (definida pelas outras colunas da linha), um
        // filho com height:100% não estica de forma fiável em todos os
        // browsers. Medir tdH e aplicá-lo diretamente garante que a área de
        // texto preenche mesmo a união (texto ao topo, sobra fica em baixo).
        textarea.style.height = `${Math.max(contentH, tdH)}px`;
      }
    }
    textarea.style.overflowY = "hidden";
  };

  useEffect(() => {
    const doRecalc = () => {
      Object.values(textAreaRefs.current || {}).forEach((el) => {
        if (el) el.dispatchEvent(new Event("input", { bubbles: true }));
      });
    };
    const raf = requestAnimationFrame(doRecalc);
    window.addEventListener("resize", doRecalc);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", doRecalc);
    };
  }, [atividades, mergedSpans, hiddenCells]);

  useEffect(() => {
    Object.values(textAreaRefs.current).forEach((textarea) => {
      if (textarea) handleTextareaResize({ target: textarea });
    });
  }, [atividades, servicosEntrada, servicoSaida, objetivoProcesso, indicadores]);

  const processTitle = () => {
    if (!pathFilename) return [""];
    const nameWithoutExtension = pathFilename.replace(/\.pdf$/i, "");
    const parts = nameWithoutExtension.split("/");
    if (parts.length > 1 && parts[1]) parts[1] = `Procedimento ${parts[1]}`;
    return parts;
  };
  const Title = processTitle();

  const getFilenameParts = () => {
    const full = pathFilename.replace(/\.pdf$/i, "");
    const slashIdx = full.indexOf("/");
    if (slashIdx === -1) return { prefix: "", suffix: full };
    return { prefix: full.slice(0, slashIdx + 1), suffix: full.slice(slashIdx + 1) };
  };

  const startRename = () => {
    setDraftTitle(getFilenameParts().suffix);
    setIsEditingTitle(true);
  };

  const cancelRename = () => {
    setIsEditingTitle(false);
    setDraftTitle("");
  };

  const confirmRename = async () => {
    if (!draftTitle.trim() || !onRenameFile) return;
    const { prefix } = getFilenameParts();
    setIsSavingTitle(true);
    try {
      await onRenameFile(prefix + draftTitle.trim());
    } finally {
      setIsSavingTitle(false);
      setIsEditingTitle(false);
    }
  };

  const COL_LABELS = [
    "Principais Atividades",
    "Procedimentos Associados",
    "Requisitos ISO 9001",
    "Requisitos DGERT",
    "Requisitos EQAVET",
    "Requisitos CQCQ",
  ];

  const sharedFabStyle = {
    width: 44,
    height: 44,
    borderRadius: "50%",
    border: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
    cursor: "pointer",
  };

  return (
    <div className="flex flex-col items-center justify-start p-10 w-[80vw] max-w-full mx-auto bg-white rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-gray-200 overflow-visible">

      {/* ── Cabeçalho ── */}
      <div className="w-full flex justify-between items-start mb-7 pb-5 border-b-2 border-[#f0f0f0]">
        <div className="flex flex-col gap-1">
          {Title.length > 1 && (
            <span className="text-xs font-semibold text-[#C8932F] uppercase tracking-[1px]">
              {Title[0]}
            </span>
          )}

          {isEditingTitle ? (
            <div className="flex items-center gap-1.5">
              {getFilenameParts().prefix && (
                <span className="text-[1.6rem] font-bold text-gray-400 whitespace-nowrap select-none">
                  {getFilenameParts().prefix}
                </span>
              )}
              <input
                ref={titleInputRef}
                className="text-[1.6rem] font-bold text-gray-900 border-0 border-b-2 border-b-[#C8932F] bg-transparent outline-none px-1 py-0.5 w-[700px] max-w-[70vw] font-[inherit]"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmRename();
                  if (e.key === "Escape") cancelRename();
                }}
                disabled={isSavingTitle}
                autoFocus
              />
              <button
                className={`w-7 h-7 rounded-full border-0 cursor-pointer flex items-center justify-center text-[13px] transition-colors duration-150 shrink-0 bg-green-500 text-white hover:enabled:bg-green-700${isSavingTitle || !draftTitle.trim() ? " opacity-50 cursor-not-allowed" : ""}`}
                onClick={confirmRename}
                disabled={isSavingTitle || !draftTitle.trim()}
                title="Confirmar"
              >
                {isSavingTitle ? "..." : <FaCheck size={14} />}
              </button>
              <button
                className={`w-7 h-7 rounded-full border-0 cursor-pointer flex items-center justify-center text-[13px] transition-colors duration-150 shrink-0 bg-red-600 text-white hover:enabled:bg-red-800${isSavingTitle ? " opacity-50 cursor-not-allowed" : ""}`}
                onClick={cancelRename}
                disabled={isSavingTitle}
                title="Cancelar"
              >
                <FaXmark size={14} />
              </button>
            </div>
          ) : (
            <div className="group flex items-center gap-2">
              <h2 className="text-[1.6rem] font-bold text-gray-900 m-0">
                {Title.length > 1 ? Title.slice(1).join(" ") : Title[0]}
              </h2>
              {onRenameFile && (
                <button
                  className={`bg-transparent border-0 cursor-pointer text-[#C8932F] p-1 rounded transition-all duration-200 flex items-center${isEditable ? " opacity-100" : " opacity-0 group-hover:opacity-100"}`}
                  onClick={startRename}
                  title="Clique para renomear"
                >
                  <FaPencil size={13} />
                </button>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => window.history.back()}
          className="text-orange-500 border-0 bg-transparent cursor-pointer mr-2.5 inline-flex items-center gap-[5px] text-base"
          title="Voltar à página anterior"
        >
          <FaArrowLeft size={14} />
          <span>Retroceder</span>
        </button>
      </div>

      {/* ── Secção: Informações do Processo ── */}
      <section className="w-full bg-white border border-gray-200 rounded-[10px] mb-6 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-2.5 px-5 py-[14px] bg-gradient-to-br from-[#C8932F] to-[#e0a93a] border-b border-b-[#b8832a]">
          <FaClipboardList size={16} className="text-white" />
          <h3 className="text-[13px] font-bold text-white uppercase tracking-[0.8px] m-0">
            Informações do Processo
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-0 max-md:grid-cols-1">

          {/* Dono do Processo */}
          <div className="px-5 py-4 border-r border-r-[#f0f0f0] border-b border-b-[#f0f0f0] even:border-r-0 last:border-b-0">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-[0.6px] mb-2">
              <span className="w-[7px] h-[7px] rounded-full bg-[#C8932F] shrink-0" />
              Dono do Processo (nomeado)
            </div>
            <MultiSelectDonos
              funcionarios={funcionarios}
              donoProcesso={donoProcesso}
              setDonoProcesso={setDonoProcesso}
              isEditable={isEditable}
              isSuperAdmin={isSuperAdmin}
              donoProcessoAlterado={donoProcessoAlterado}
            />
          </div>

          {/* Objetivo do Processo */}
          <div className="px-5 py-4 border-r border-r-[#f0f0f0] border-b border-b-[#f0f0f0] even:border-r-0 last:border-b-0">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-[0.6px] mb-2">
              <span className="w-[7px] h-[7px] rounded-full bg-[#C8932F] shrink-0" />
              Objetivo do Processo
            </div>
            <textarea
              ref={(el) => (textAreaRefs.current["objetivo"] = el)}
              className="w-full border border-transparent rounded-md px-2.5 py-2 font-[inherit] text-[14px] text-gray-700 bg-gray-50 transition-all duration-200 resize-none box-border overflow-y-hidden min-h-[40px] leading-[1.5] focus:outline-none focus:border-[#C8932F] focus:bg-white focus:shadow-[0_0_0_3px_rgba(200,147,47,0.12)] read-only:bg-transparent read-only:cursor-default"
              value={objetivoProcesso}
              onChange={(e) => setObjetivoProcesso(e.target.value)}
              onInput={handleTextareaResize}
              placeholder="Descreva o objetivo do processo..."
              readOnly={!isEditable}
            />
          </div>

          {/* Serviços de Entrada */}
          <div className="px-5 py-4 border-r border-r-[#f0f0f0] border-b border-b-[#f0f0f0] even:border-r-0 last:border-b-0">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-[0.6px] mb-2">
              <span className="w-[7px] h-[7px] rounded-full bg-blue-500 shrink-0" />
              Serviços de Entrada
            </div>
            <textarea
              ref={(el) => (textAreaRefs.current["servicosEntrada"] = el)}
              className="w-full border border-transparent rounded-md px-2.5 py-2 font-[inherit] text-[14px] text-gray-700 bg-gray-50 transition-all duration-200 resize-none box-border overflow-y-hidden min-h-[40px] leading-[1.5] focus:outline-none focus:border-[#C8932F] focus:bg-white focus:shadow-[0_0_0_3px_rgba(200,147,47,0.12)] read-only:bg-transparent read-only:cursor-default"
              value={servicosEntrada}
              onChange={(e) => setServicosEntrada(e.target.value)}
              onInput={handleTextareaResize}
              placeholder="Serviços / documentos de entrada..."
              readOnly={!isEditable}
            />
          </div>

          {/* Serviço de Saída */}
          <div className="px-5 py-4 border-r border-r-[#f0f0f0] border-b border-b-[#f0f0f0] even:border-r-0 last:border-b-0">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-[0.6px] mb-2">
              <span className="w-[7px] h-[7px] rounded-full bg-emerald-500 shrink-0" />
              Serviço de Saída
            </div>
            <textarea
              ref={(el) => (textAreaRefs.current["servicoSaida"] = el)}
              className="w-full border border-transparent rounded-md px-2.5 py-2 font-[inherit] text-[14px] text-gray-700 bg-gray-50 transition-all duration-200 resize-none box-border overflow-y-hidden min-h-[40px] leading-[1.5] focus:outline-none focus:border-[#C8932F] focus:bg-white focus:shadow-[0_0_0_3px_rgba(200,147,47,0.12)] read-only:bg-transparent read-only:cursor-default"
              value={servicoSaida}
              onChange={(e) => setServicoSaida(e.target.value)}
              onInput={handleTextareaResize}
              placeholder="Serviços / documentos de saída..."
              readOnly={!isEditable}
            />
          </div>

        </div>
      </section>

      {/* ── Tabela: Principais Atividades ── */}
      <div className="w-full overflow-x-auto mb-5 rounded-md border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <table className="w-full border-collapse font-sans bg-white table-fixed min-w-full break-words">
          <colgroup>
            <col style={{ width: "30%" }} />
            <col style={{ width: "30%", minWidth: "200px" }} />
            <col style={{ width: "8%", minWidth: "60px" }} />
            <col style={{ width: "8%", minWidth: "60px" }} />
            <col style={{ width: "8%", minWidth: "60px" }} />
            <col style={{ width: "8%", minWidth: "60px" }} />
          </colgroup>
          <thead>
            <tr>
              {COL_LABELS.map((label, i) => (
                <th
                  key={i}
                  className="bg-[#C8932F] text-white px-5 py-4 font-bold uppercase text-[11px] border-0 tracking-[0.8px] text-center border-b-[3px] border-b-[#b8832a] shadow-[inset_0_-2px_4px_rgba(0,0,0,0.1)] relative"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {atividades.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className="transition-colors duration-200 border-b border-gray-200 hover:bg-gray-50 even:bg-[#fafbfc] even:hover:bg-gray-100"
                onContextMenu={
                  isEditable
                    ? (e) => contextMenuAtividades.handleContextMenuEvent(e, rowIdx)
                    : undefined
                }
              >
                {row.map((cell, colIdx) => {
                  const key = `${rowIdx}-${colIdx}`;
                  const mergedTop = !!(mergedSpans[key] && mergedSpans[key] >= 2);
                  if (hiddenCells[key]) return null;
                  return (
                    <td
                      key={colIdx}
                      data-label={COL_LABELS[colIdx]}
                      onContextMenu={
                        isEditable
                          ? (e) => {
                              e.stopPropagation();
                              setContextMenuCell({ row: rowIdx, col: colIdx });
                              contextMenuAtividades.handleContextMenuEvent(e, rowIdx);
                            }
                          : undefined
                      }
                      rowSpan={mergedTop ? mergedSpans[key] : 1}
                      className={`p-0 bg-[inherit] relative h-auto overflow-hidden break-words w-full max-w-full box-border border border-gray-200 align-top text-[14px]${mergedTop ? " align-top" : ""}`}
                    >
                      <textarea
                        ref={(el) =>
                          (textAreaRefs.current[`atividade-${rowIdx}-${colIdx}`] = el)
                        }
                        className="w-full h-full border-0 bg-transparent px-3 py-2 font-[inherit] text-[14px] text-gray-700 leading-[1.3] resize-none overflow-hidden break-words min-h-8 max-w-full box-border block whitespace-pre-wrap m-0 focus:outline-none focus:bg-white focus:shadow-[inset_0_0_0_2px_#C8932F] focus:rounded placeholder:text-gray-400 placeholder:italic"
                        value={cell}
                        onChange={(e) =>
                          handleAtividadesChange(rowIdx, colIdx, e.target.value)
                        }
                        onInput={handleTextareaResize}
                        placeholder={
                          colIdx === 0
                            ? "Atividade..."
                            : colIdx === 1
                            ? "Procedimento..."
                            : "Requisito..."
                        }
                        style={{ resize: "none" }}
                        data-merged={mergedTop ? "1" : "0"}
                        readOnly={!isEditable}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Secção: Indicadores ── */}
      <section className="w-full bg-white border border-gray-200 rounded-[10px] mb-6 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-2.5 px-5 py-[14px] bg-gradient-to-br from-[#C8932F] to-[#e0a93a] border-b border-b-[#b8832a]">
          <h3 className="text-[13px] font-bold text-white uppercase tracking-[0.8px] m-0">
            Indicadores de monitorização do processo
          </h3>
        </div>
        <div className="flex flex-col gap-px bg-[#f0f0f0] p-px">
          {Array.isArray(indicadores) ? (
            indicadores.map((indicador, rowIdx) => (
              <div
                key={rowIdx}
                className="bg-white p-4 flex gap-3 items-start transition-colors duration-150 hover:bg-[#fafaf8]"
                onContextMenu={
                  isEditable
                    ? (e) => contextMenuIndicadores.handleContextMenuEvent(e, rowIdx)
                    : undefined
                }
              >
                <span className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-[#C8932F] to-[#e0a93a] text-white text-[11px] font-bold flex items-center justify-center shadow-[0_2px_6px_rgba(200,147,47,0.3)] mt-0.5">
                  {rowIdx + 1}
                </span>
                <textarea
                  ref={(el) => (textAreaRefs.current[`indicador-${rowIdx}`] = el)}
                  className="flex-1 w-full border border-transparent rounded-md px-2.5 py-2 font-[inherit] text-[14px] text-gray-700 bg-gray-50 transition-all duration-200 resize-none box-border overflow-y-hidden min-h-[60px] leading-[1.5] focus:outline-none focus:border-[#C8932F] focus:bg-white focus:shadow-[0_0_0_3px_rgba(200,147,47,0.12)] read-only:bg-transparent read-only:cursor-default"
                  value={indicador || ""}
                  onChange={(e) => handleIndicadoresChange(rowIdx, e.target.value)}
                  onInput={handleTextareaResize}
                  placeholder={`Indicador ${rowIdx + 1} de monitorização...`}
                  style={{ resize: "none" }}
                  readOnly={!isEditable}
                />
              </div>
            ))
          ) : (
            ["r1", "r2", "r3"].map((r, idx) => (
              <div
                key={r}
                className="bg-white p-4 flex gap-3 items-start transition-colors duration-150 hover:bg-[#fafaf8]"
                onContextMenu={
                  isEditable
                    ? (e) => contextMenuIndicadores.handleContextMenuEvent(e, idx)
                    : undefined
                }
              >
                <span className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-[#C8932F] to-[#e0a93a] text-white text-[11px] font-bold flex items-center justify-center shadow-[0_2px_6px_rgba(200,147,47,0.3)] mt-0.5">
                  {idx + 1}
                </span>
                <textarea
                  ref={(el) => (textAreaRefs.current[`indicador-${r}`] = el)}
                  className="flex-1 w-full border border-transparent rounded-md px-2.5 py-2 font-[inherit] text-[14px] text-gray-700 bg-gray-50 transition-all duration-200 resize-none box-border overflow-y-hidden min-h-[60px] leading-[1.5] focus:outline-none focus:border-[#C8932F] focus:bg-white focus:shadow-[0_0_0_3px_rgba(200,147,47,0.12)] read-only:bg-transparent read-only:cursor-default"
                  value={indicadores[`indicadores_${r}`] || ""}
                  onChange={(e) =>
                    handleIndicadoresChange(`indicadores_${r}`, e.target.value)
                  }
                  onInput={handleTextareaResize}
                  placeholder={`${
                    idx === 0 ? "Primeiro" : idx === 1 ? "Segundo" : "Terceiro"
                  } indicador de monitorização...`}
                  style={{ resize: "none" }}
                  readOnly={!isEditable}
                />
              </div>
            ))
          )}
        </div>
      </section>

      {/* Context menus */}
      {isEditable && contextMenuAtividades.contextMenu}
      {isEditable && contextMenuIndicadores.contextMenu}

      {/* ── Botões flutuantes ── */}
      <div className="fixed bottom-[100px] right-5 z-[1002] flex flex-col gap-3 items-center max-md:bottom-4 max-md:right-4">
        {setIsEditable && canEdit && (
          !isEditable ? (
            <button
              className="w-11 h-11 rounded-full bg-transparent border-0 flex items-center justify-center text-[22px] shadow-[0_2px_8px_rgba(0,0,0,0.10)] cursor-pointer"
              onClick={() => setIsEditable(true)}
              title="Ativar modo de edição"
              style={{ ...sharedFabStyle, backgroundColor: "#1976d2", color: "white" }}
            >
              <FaPencil size={18} />
            </button>
          ) : (
            <ExportPdfButton
              templateType={2}
              data={data}
              headers={[]}
              dataObs={[]}
              headersObs={[]}
              atividades={atividades}
              donoProcesso={donoProcesso}
              donoProcessoOriginal={donoProcessoOriginal}
              objetivoProcesso={objetivoProcesso}
              indicadores={indicadores}
              pathFilename={pathFilename}
              servicosEntrada={servicosEntrada}
              servicoSaida={servicoSaida}
              mergedSpans={mergedSpans}
              hiddenCells={hiddenCells}
              onSaveSuccess={() => {
                onSaveSuccess && onSaveSuccess();
                setIsEditable(false);
              }}
              history={history}
              style={{ ...sharedFabStyle, backgroundColor: "#4caf50", color: "white" }}
            />
          )
        )}
        <PreviewPdfButton
          templateType={2}
          atividades={atividades}
          donoProcesso={donoProcesso}
          objetivoProcesso={objetivoProcesso}
          indicadores={indicadores}
          servicosEntrada={servicosEntrada}
          servicoSaida={servicoSaida}
          pathFilename={pathFilename}
          history={history}
          mergedSpans={mergedSpans}
          hiddenCells={hiddenCells}
          style={{ ...sharedFabStyle, backgroundColor: "#ff9800", color: "white" }}
        />
        {isEditable && setIsEditable && (
          <button
            onClick={() => setIsEditable(false)}
            title="Cancelar Edição"
            style={{ ...sharedFabStyle, backgroundColor: "#e53935", color: "white" }}
          >
            <FaXmark size={20} />
          </button>
        )}
      </div>

    </div>
  );
}
