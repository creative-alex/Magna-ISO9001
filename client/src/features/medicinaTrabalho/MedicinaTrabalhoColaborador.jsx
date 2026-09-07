import React, { useCallback, useContext, useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { UserContext } from "../../shared/context/userContext";
import Sidebar from "../../shared/components/Sidebar";
import Topbar from "../../shared/components/Topbar";
import {
  FaFileLines, FaCheck, FaArrowLeft, FaTrash, FaPlus, FaClock, FaXmark, FaPencil,
} from "react-icons/fa6";
import { apiFetch } from "../../shared/utils/apiFetch";
import { getNomeCurto } from "../../shared/utils/nomeCurto";

const GOLD = "#C8932F";

function formatDate(value) {
  if (!value) return "-";
  const [y, m, d] = value.split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

// Data de hoje no formato "AAAA-MM-DD" (comparável diretamente com data_exame).
function getTodayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function MedicinaTrabalhoColaborador() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { uid, nivelAcesso, username } = useContext(UserContext);
  const isAdmin = nivelAcesso === "SuperAdmin";
  const isHR = nivelAcesso === "GestorRH";
  const isAdministrador = nivelAcesso === "Administrador";
  const canManage = isAdmin || isHR;
  const isSelf = uid === id;
  // Administrador só tem acesso de leitura (o backend confirma que o colaborador é da
  // sua entidade); nunca ganha canManage, por isso os botões de gestão continuam ocultos.
  const canView = canManage || isSelf || isAdministrador;
  const targetLabel = location.state?.nome || (isSelf ? username : null) || id;
  const nomeCurto = getNomeCurto(targetLabel);

  const [loading, setLoading] = useState(true);
  const [exames, setExames] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState("");
  const [modalFile, setModalFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const [editingRowId, setEditingRowId] = useState(null);
  const [editRowData, setEditRowData] = useState("");
  const [editRowFile, setEditRowFile] = useState(null);
  const [savingRow, setSavingRow] = useState(false);

  const [viewingId, setViewingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    if (!canView) {
      navigate("/dashboard", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMedicinaTrabalho = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/medicina-trabalho/${id}`);
      if (res.ok) {
        const data = await res.json();
        setExames(data.exames || []);
      } else {
        toast.error("Não foi possível carregar a medicina do trabalho", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível carregar a medicina do trabalho", { position: "top-right" });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!canView) return;
    fetchMedicinaTrabalho();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const openModal = () => {
    setModalData("");
    setModalFile(null);
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setModalData("");
    setModalFile(null);
  };

  const handleCreateExame = async () => {
    if (!modalData) {
      toast.error("Indica a data do exame", { position: "top-right" });
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("data_exame", modalData);
      if (modalFile) formData.append("file", modalFile);

      const res = await apiFetch(`/medicina-trabalho/${id}/exames`, { method: "POST", body: formData });

      if (res.ok) {
        closeModal();
        await fetchMedicinaTrabalho();
        toast.success("Exame registado", { position: "top-right", autoClose: 2500 });
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Falha ao registar o exame", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao registar o exame", { position: "top-right" });
    } finally {
      setSaving(false);
    }
  };

  const startEditRow = (ex) => {
    setEditingRowId(ex.id);
    setEditRowData(ex.data_exame);
    setEditRowFile(null);
  };

  const cancelEditRow = () => {
    if (savingRow) return;
    setEditingRowId(null);
    setEditRowData("");
    setEditRowFile(null);
  };

  const handleSaveRow = async (exame) => {
    if (!editRowData) {
      toast.error("Indica a data do exame", { position: "top-right" });
      return;
    }
    setSavingRow(true);
    try {
      const formData = new FormData();
      formData.append("data_exame", editRowData);
      if (editRowFile) formData.append("file", editRowFile);

      const res = await apiFetch(`/medicina-trabalho/${id}/exames/${exame.id}`, { method: "PUT", body: formData });

      if (res.ok) {
        setEditingRowId(null);
        setEditRowData("");
        setEditRowFile(null);
        await fetchMedicinaTrabalho();
        toast.success("Exame atualizado", { position: "top-right", autoClose: 2500 });
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Falha ao atualizar o exame", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao atualizar o exame", { position: "top-right" });
    } finally {
      setSavingRow(false);
    }
  };

  const handleRemoveExame = async (exameId) => {
    setRemovingId(exameId);
    try {
      const res = await apiFetch(`/medicina-trabalho/${id}/exames/${exameId}`, { method: "DELETE" });
      if (res.ok) {
        setExames(prev => prev.filter(e => e.id !== exameId));
        toast.success("Exame removido", { position: "top-right", autoClose: 2000 });
      } else {
        toast.error("Falha ao remover exame", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao remover exame", { position: "top-right" });
    } finally {
      setRemovingId(null);
    }
  };

  const handleViewFicha = async (fichaPath, exameId) => {
    if (!fichaPath) return;
    setViewingId(exameId);
    try {
      const res = await apiFetch(`/files/download`, {
        method: "POST",
        body: JSON.stringify({ path: encodeURIComponent(fichaPath) }),
      });
      if (res.ok) {
        const blob = await res.blob();
        window.open(URL.createObjectURL(blob), "_blank");
      } else {
        toast.error("Falha ao abrir a ficha", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao abrir a ficha", { position: "top-right" });
    } finally {
      setViewingId(null);
    }
  };

  const handleSelectFile = (filePath) => {
    const formattedPath = filePath.replace(/\s/g, "-").replace(/\//g, "__");
    navigate(`/file/${formattedPath}`, { state: { originalFilename: filePath } });
  };

  const labelStyle = { fontSize: 11, color: "#6b7280", marginBottom: 4, display: "block" };
  const inputStyle = {
    width: "100%", fontSize: 13, color: "#111827", fontWeight: 500,
    border: "1px solid #e5e7eb", borderRadius: 6, padding: "7px 9px",
    outline: "none", background: "#fafafa", boxSizing: "border-box",
  };

  if (!canView) return null;

  const todayStr = getTodayStr();
  const porFazer = exames.filter(e => e.data_exame > todayStr).sort((a, b) => a.data_exame.localeCompare(b.data_exame));
  const feitos = exames.filter(e => e.data_exame <= todayStr).sort((a, b) => b.data_exame.localeCompare(a.data_exame));

  const renderExameRow = (ex) => {
    if (editingRowId === ex.id) {
      return (
        <div key={ex.id} style={{ padding: "16px 18px", borderBottom: "1px solid #f3f4f6", background: "#fffbf4" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 24, flexWrap: "wrap", marginBottom: 14 }}>
            <div style={{ width: 150 }}>
              <span style={labelStyle}>Data do exame</span>
              <input
                type="date"
                value={editRowData}
                onChange={e => setEditRowData(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <span style={labelStyle}>Ficha (PDF)</span>
              <label
                style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  padding: "7px 13px", fontSize: 12, fontWeight: 500,
                  border: `1px solid ${GOLD}`, borderRadius: 6, background: "#fff", color: GOLD,
                  cursor: "pointer", whiteSpace: "nowrap",
                }}
              >
                <FaFileLines style={{ fontSize: 12 }} />
                {ex.ficha_nome_ficheiro ? "Substituir ficheiro" : "Escolher ficheiro"}
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={e => setEditRowFile(e.target.files?.[0] || null)}
                  style={{ display: "none" }}
                />
              </label>
              {(editRowFile || ex.ficha_nome_ficheiro) && (
                <div style={{
                  fontSize: 11, color: "#6b7280", marginTop: 6, maxWidth: 220,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {editRowFile ? editRowFile.name : `Atual: ${ex.ficha_nome_ficheiro} (mantido)`}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              onClick={cancelEditRow}
              disabled={savingRow}
              style={{
                padding: "7px 14px", fontSize: 12, fontWeight: 500, cursor: savingRow ? "not-allowed" : "pointer",
                border: "1px solid #e5e7eb", borderRadius: 7, background: "#fff", color: "#6b7280",
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => handleSaveRow(ex)}
              disabled={savingRow || !editRowData}
              style={{
                padding: "7px 14px", fontSize: 12, fontWeight: 500,
                cursor: savingRow || !editRowData ? "not-allowed" : "pointer",
                border: `1px solid ${GOLD}`, borderRadius: 7, background: GOLD, color: "#fff",
                opacity: savingRow || !editRowData ? 0.6 : 1,
              }}
            >
              {savingRow ? "A guardar..." : "Guardar"}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div key={ex.id} style={{ padding: "12px 18px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 110, flexShrink: 0 }}>
          <span style={labelStyle}>Data do exame</span>
          <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{formatDate(ex.data_exame)}</div>
        </div>
        {ex.ficha_nome_ficheiro ? (
          <span style={{
            display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#111827", flex: 1,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            <FaFileLines style={{ color: "#9ca3af", fontSize: 12, flexShrink: 0 }} />
            {ex.ficha_nome_ficheiro}
          </span>
        ) : (
          <span style={{ flex: 1, fontSize: 12, color: "#9ca3af" }}>Sem ficha anexada</span>
        )}
        {ex.ficha_path && (
          <button
            type="button"
            onClick={() => handleViewFicha(ex.ficha_path, ex.id)}
            disabled={viewingId === ex.id}
            style={{
              padding: "4px 10px", fontSize: 12, fontWeight: 500,
              cursor: viewingId === ex.id ? "wait" : "pointer",
              border: "1px solid #e5e7eb", borderRadius: 7, background: "#fff", color: "#6b7280",
            }}
          >
            {viewingId === ex.id ? "A abrir..." : "Ver"}
          </button>
        )}
        {canManage && (
          <>
            <button
              type="button"
              onClick={() => startEditRow(ex)}
              title="Editar"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 26, height: 26, cursor: "pointer",
                border: "1px solid #e5e7eb", borderRadius: 7, background: "#fff", color: "#6b7280",
              }}
            >
              <FaPencil style={{ fontSize: 10 }} />
            </button>
            <button
              type="button"
              onClick={() => handleRemoveExame(ex.id)}
              disabled={removingId === ex.id}
              title="Remover"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 26, height: 26, cursor: removingId === ex.id ? "wait" : "pointer",
                border: "1px solid #fee2e2", borderRadius: 7, background: "#fff", color: "#dc2626",
              }}
            >
              <FaTrash style={{ fontSize: 10 }} />
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar onSelectFile={handleSelectFile} />

      <div className="ml-[var(--sidebar-w,230px)] transition-[margin-left] duration-200 flex-1 min-w-0 flex flex-col min-h-screen">
        <Topbar icon="🩺" title="Medicina do Trabalho" />

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>

          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "18px 24px", display: "flex", alignItems: "center", gap: 16 }}>
            <button
              onClick={() => navigate(canManage || isAdministrador ? "/medicina-trabalho" : "/dashboard")}
              title={canManage || isAdministrador ? "Voltar à lista de colaboradores" : "Voltar ao dashboard"}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 32, height: 32, border: "1px solid #e5e7eb", borderRadius: 7,
                background: "#fff", color: "#6b7280", cursor: "pointer", flexShrink: 0,
              }}
            >
              <FaArrowLeft style={{ fontSize: 12 }} />
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#111827" }}>
                Medicina do trabalho  -  {nomeCurto}
              </div>
            </div>
            {canManage && (
              <button
                onClick={openModal}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer",
                  border: `1px solid ${GOLD}`,
                  borderRadius: 7, background: "#fff",
                  color: GOLD,
                  transition: "all 0.15s", flexShrink: 0,
                }}
              >
                <FaPlus style={{ fontSize: 11 }} /> Registar Exame Médico
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 40, textAlign: "center", fontSize: 13, color: "#9ca3af" }}>
              A carregar medicina do trabalho...
            </div>
          ) : (
            <>
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8 }}>
                  <FaClock style={{ color: GOLD, fontSize: 13 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Por fazer</span>
                </div>

                {showModal && (
                  <div style={{ padding: "16px 18px", borderBottom: "1px solid #f3f4f6", background: "#fffbf4" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
                        Registar Exame Médico
                      </span>
                      <button
                        type="button"
                        onClick={closeModal}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          width: 24, height: 24, border: "none", background: "transparent", color: "#9ca3af", cursor: "pointer",
                        }}
                      >
                        <FaXmark style={{ fontSize: 13 }} />
                      </button>
                    </div>

                    <div style={{ display: "flex", alignItems: "flex-start", gap: 24, flexWrap: "wrap", marginBottom: 14 }}>
                      <div style={{ width: 160 }}>
                        <span style={labelStyle}>Data do exame</span>
                        <input
                          type="date"
                          value={modalData}
                          onChange={e => setModalData(e.target.value)}
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <span style={labelStyle}>Ficha (PDF)</span>
                        <label
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 7,
                            padding: "7px 13px", fontSize: 12, fontWeight: 500,
                            border: `1px solid ${GOLD}`, borderRadius: 6, background: "#fff", color: GOLD,
                            cursor: "pointer", whiteSpace: "nowrap",
                          }}
                        >
                          <FaFileLines style={{ fontSize: 12 }} />
                          Escolher ficheiro
                          <input
                            type="file"
                            accept="application/pdf"
                            onChange={e => setModalFile(e.target.files?.[0] || null)}
                            style={{ display: "none" }}
                          />
                        </label>
                        {modalFile && (
                          <div style={{
                            fontSize: 11, color: "#6b7280", marginTop: 6, maxWidth: 220,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {modalFile.name}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                      <button
                        type="button"
                        onClick={closeModal}
                        disabled={saving}
                        style={{
                          padding: "7px 14px", fontSize: 12, fontWeight: 500, cursor: saving ? "not-allowed" : "pointer",
                          border: "1px solid #e5e7eb", borderRadius: 7, background: "#fff", color: "#6b7280",
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateExame}
                        disabled={saving || !modalData}
                        style={{
                          padding: "7px 14px", fontSize: 12, fontWeight: 500,
                          cursor: saving || !modalData ? "not-allowed" : "pointer",
                          border: `1px solid ${GOLD}`, borderRadius: 7, background: GOLD, color: "#fff",
                          opacity: saving || !modalData ? 0.6 : 1,
                        }}
                      >
                        {saving ? "A guardar..." : "Guardar"}
                      </button>
                    </div>
                  </div>
                )}

                {porFazer.length === 0 ? (
                  <div style={{ padding: 18, fontSize: 13, color: "#9ca3af" }}>Sem exames por fazer.</div>
                ) : (
                  <div>{porFazer.map(renderExameRow)}</div>
                )}
              </div>

              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8 }}>
                  <FaCheck style={{ color: GOLD, fontSize: 13 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Feitos</span>
                </div>

                {feitos.length === 0 ? (
                  <div style={{ padding: 18, fontSize: 13, color: "#9ca3af" }}>Sem exames feitos.</div>
                ) : (
                  <div>{feitos.map(renderExameRow)}</div>
                )}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
