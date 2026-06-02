import React, { useRef, useEffect, useState } from "react";
import ExportPdfButton from "../Buttons/exportPdf";
import PreviewPdfButton from "../Buttons/previewPDF";
import useRowContextMenu from "../ContextMenu/useRowContextMenu";
import MultiSelectDonos from "../MultiSelectDonos";
import { FaPencil, FaXmark, FaCheck } from "react-icons/fa6";
import "./styleTemplates.css";

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
}) {
  const textAreaRefs = useRef({});
  const titleInputRef = useRef(null);
  const [contextMenuCell, setContextMenuCell] = useState(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [mergedSpans, setMergedSpans] = useState({});
  const [hiddenCells, setHiddenCells] = useState({});

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
          icon: "↕",
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
          icon: "⟲",
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
    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(textarea.scrollHeight, 40)}px`;
    const isMerged = textarea.dataset && textarea.dataset.merged === "1";
    if (isMerged) {
      const td = textarea.closest("td");
      if (td) {
        const tdH = td.clientHeight;
        textarea.style.height = "auto";
        const contentH = textarea.scrollHeight;
        const cs = window.getComputedStyle(textarea);
        const baseTop = parseFloat(cs.paddingTop) || 10;
        const baseBottom = parseFloat(cs.paddingBottom) || 10;
        if (contentH <= tdH) {
          const extraEach = Math.max(Math.floor((tdH - contentH) / 2), 0);
          textarea.style.height = "100%";
          textarea.style.paddingTop = `${baseTop + extraEach}px`;
          textarea.style.paddingBottom = `${baseBottom + extraEach}px`;
        } else {
          textarea.style.height = `${contentH}px`;
          textarea.style.paddingTop = `${baseTop}px`;
          textarea.style.paddingBottom = `${baseBottom}px`;
        }
        textarea.style.overflowY = "hidden";
      }
    } else {
      textarea.style.paddingTop = "";
      textarea.style.paddingBottom = "";
      textarea.style.overflowY = "hidden";
    }
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
    <div className="template1-container">

      {/* ── Cabeçalho ── */}
      <div className="matriz-header">
        <div className="matriz-title-block">
          {Title.length > 1 && <span className="matriz-breadcrumb">{Title[0]}</span>}

          {isEditingTitle ? (
            <div className="matriz-title-edit">
              {getFilenameParts().prefix && (
                <span className="matriz-title-prefix">
                  {getFilenameParts().prefix}
                </span>
              )}
              <input
                ref={titleInputRef}
                className="matriz-title-input"
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
                className="matriz-title-action confirm"
                onClick={confirmRename}
                disabled={isSavingTitle || !draftTitle.trim()}
                title="Confirmar"
              >
                {isSavingTitle ? "..." : <FaCheck size={14} />}
              </button>
              <button
                className="matriz-title-action cancel"
                onClick={cancelRename}
                disabled={isSavingTitle}
                title="Cancelar"
              >
                <FaXmark size={14} />
              </button>
            </div>
          ) : (
            <div className="matriz-title-display">
              <h2 className="matriz-title">
                {Title.length > 1 ? Title.slice(1).join(" ") : Title[0]}
              </h2>
              {onRenameFile && (
                <button
                  className={`matriz-title-edit-btn${isEditable ? " visible" : ""}`}
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
          className="back-button"
          title="Voltar à página anterior"
        >
          <span className="back-arrow">←</span>
          <span className="back-text">Retroceder</span>
        </button>
      </div>

      {/* ── Secção: Informações do Processo ── */}
      <section className="matriz-section">
        <div className="matriz-section-header">
          <span className="matriz-section-icon">📋</span>
          <h3 className="matriz-section-title">Informações do Processo</h3>
        </div>

        <div className="matriz-info-grid">

          {/* Dono do Processo */}
          <div className="matriz-info-card">
            <div className="matriz-info-label">
              <span className="matriz-label-dot" />
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
          <div className="matriz-info-card">
            <div className="matriz-info-label">
              <span className="matriz-label-dot" />
              Objetivo do Processo
            </div>
            <textarea
              ref={(el) => (textAreaRefs.current["objetivo"] = el)}
              className="tabela-processo-textarea"
              value={objetivoProcesso}
              onChange={(e) => setObjetivoProcesso(e.target.value)}
              onInput={handleTextareaResize}
              placeholder="Descreva o objetivo do processo..."
              readOnly={!isEditable}
            />
          </div>

          {/* Serviços de Entrada */}
          <div className="matriz-info-card">
            <div className="matriz-info-label matriz-label-entrada">
              <span className="matriz-label-dot entrada" />
              Serviços de Entrada
            </div>
            <textarea
              ref={(el) => (textAreaRefs.current["servicosEntrada"] = el)}
              className="tabela-processo-textarea large"
              value={servicosEntrada}
              onChange={(e) => setServicosEntrada(e.target.value)}
              onInput={handleTextareaResize}
              placeholder="Serviços / documentos de entrada..."
              readOnly={!isEditable}
            />
          </div>

          {/* Serviço de Saída */}
          <div className="matriz-info-card">
            <div className="matriz-info-label matriz-label-saida">
              <span className="matriz-label-dot saida" />
              Serviço de Saída
            </div>
            <textarea
              ref={(el) => (textAreaRefs.current["servicoSaida"] = el)}
              className="tabela-processo-textarea large"
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
      <table className="tabela-atividades">
        <colgroup>
          <col className="col-1" />
          <col className="col-2" />
          <col className="col-3" />
          <col className="col-4" />
          <col className="col-5" />
          <col className="col-6" />
        </colgroup>
        <thead>
          <tr>
            {COL_LABELS.map((label, i) => (
              <th key={i} className={`col-${i + 1}`}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {atividades.map((row, rowIdx) => (
            <tr
              key={rowIdx}
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
                    className={`${mergedTop ? "merged-cell " : ""}col-${colIdx + 1}`}
                  >
                    <textarea
                      ref={(el) =>
                        (textAreaRefs.current[`atividade-${rowIdx}-${colIdx}`] = el)
                      }
                      className="tabela-atividades-input custom"
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

      {/* ── Tabela: Indicadores ── */}
      <table className="tabela-indicadores">
        <thead>
          <tr>
            <th className="header-center">Indicadores de monitorização do processo</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(indicadores) ? (
            indicadores.map((indicador, rowIdx) => (
              <tr
                key={rowIdx}
                onContextMenu={
                  isEditable
                    ? (e) => contextMenuIndicadores.handleContextMenuEvent(e, rowIdx)
                    : undefined
                }
              >
                <td>
                  <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "bold" }}>
                    Indicador R{rowIdx + 1}:
                  </label>
                  <textarea
                    ref={(el) => (textAreaRefs.current[`indicador-${rowIdx}`] = el)}
                    className="tabela-indicadores-textarea medium"
                    value={indicador || ""}
                    onChange={(e) => handleIndicadoresChange(rowIdx, e.target.value)}
                    onInput={handleTextareaResize}
                    placeholder={`Indicador ${rowIdx + 1} de monitorização...`}
                    style={{ resize: "none" }}
                    readOnly={!isEditable}
                  />
                </td>
              </tr>
            ))
          ) : (
            ["r1", "r2", "r3"].map((r, idx) => (
              <tr
                key={r}
                onContextMenu={
                  isEditable
                    ? (e) => contextMenuIndicadores.handleContextMenuEvent(e, idx)
                    : undefined
                }
              >
                <td>
                  <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", fontWeight: "bold" }}>
                    Indicador R{idx + 1}:
                  </label>
                  <textarea
                    ref={(el) => (textAreaRefs.current[`indicador-${r}`] = el)}
                    className="tabela-indicadores-textarea medium"
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
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Context menus */}
      {isEditable && contextMenuAtividades.contextMenu}
      {isEditable && contextMenuIndicadores.contextMenu}

      {/* ── Botões flutuantes ── */}
      <div className="fab-container">
        {setIsEditable && canEdit && (
          !isEditable ? (
            <button
              className="edit-button"
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
