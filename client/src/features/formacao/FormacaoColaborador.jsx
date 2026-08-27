import React, { useCallback, useContext, useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { UserContext } from "../../shared/context/userContext";
import Sidebar from "../../shared/components/Sidebar";
import Topbar from "../../shared/components/Topbar";
import {
  FaGraduationCap, FaFileLines, FaPencil, FaCheck, FaArrowLeft, FaTrash, FaPlus,
} from "react-icons/fa6";
import { apiFetch } from "../../shared/utils/apiFetch";
import { getNomeCurto } from "../../shared/utils/nomeCurto";

const GOLD = "#C8932F";

const ACAO_FIELDS = [
  { key: "nome_acao", label: "Nome da ação", type: "text", span: 2 },
  { key: "entidade_formadora", label: "Entidade formadora", type: "text", span: 1 },
  { key: "local", label: "Local", type: "text", span: 1 },
  { key: "horario", label: "Modalidade", type: "select", span: 1, options: ["Laboral", "Pós-Laboral", "Misto"] },
  { key: "duracao", label: "Duração (horas)", type: "number", span: 1 },
  { key: "observacao", label: "Observação", type: "textarea", span: 3, rows: 4 },
];

function getCurrentYear() {
  return String(new Date().getFullYear());
}

function toggleInSet(set, value) {
  const next = new Set(set);
  if (next.has(value)) next.delete(value); else next.add(value);
  return next;
}

function removeFromSet(set, value) {
  const next = new Set(set);
  next.delete(value);
  return next;
}

export default function FormacaoColaborador() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { uid, nivelAcesso } = useContext(UserContext);
  const isAdmin = nivelAcesso === "SuperAdmin";
  const isHR = nivelAcesso === "GestorRH";
  const isAdministrador = nivelAcesso === "Administrador";
  const canManage = isAdmin || isHR;
  const isSelf = uid === id;
  // Administrador só tem acesso de leitura (o backend confirma que o colaborador é da
  // sua entidade); nunca ganha canManage, por isso os botões de edição continuam ocultos.
  const canView = canManage || isSelf || isAdministrador;
  const targetLabel = location.state?.nome || id;
  const nomeCurto = getNomeCurto(targetLabel);

  const [ano, setAno] = useState(getCurrentYear());
  const [loading, setLoading] = useState(true);
  const [acoes, setAcoes] = useState([]);
  const [addingAcao, setAddingAcao] = useState(false);
  const [editingIds, setEditingIds] = useState(new Set());
  const [savingIds, setSavingIds] = useState(new Set());
  const [uploadingCertId, setUploadingCertId] = useState(null);
  const [viewingCertId, setViewingCertId] = useState(null);
  const [removingCertId, setRemovingCertId] = useState(null);
  const [deletingAcaoId, setDeletingAcaoId] = useState(null);

  useEffect(() => {
    if (!canView) {
      navigate("/dashboard", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchFormacao = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/formacao/${id}/${ano}`);
      if (res.ok) {
        const data = await res.json();
        setAcoes(data.acoes || []);
        setEditingIds(new Set());
      } else {
        toast.error("Não foi possível carregar o plano de formação", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível carregar o plano de formação", { position: "top-right" });
    } finally {
      setLoading(false);
    }
  }, [id, ano]);

  useEffect(() => {
    if (!canView) return;
    fetchFormacao();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, ano]);

  const handleChange = (acaoId, key, value) => {
    setAcoes(prev => prev.map(a => a.id === acaoId ? { ...a, [key]: value } : a));
  };

  const handleAddAcao = async () => {
    setAddingAcao(true);
    try {
      const res = await apiFetch(`/formacao/${id}/${ano}/acoes`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setAcoes(prev => [...prev, data.acao]);
        setEditingIds(prev => new Set(prev).add(data.acao.id));
      } else {
        toast.error("Falha ao adicionar ação de formação", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao adicionar ação de formação", { position: "top-right" });
    } finally {
      setAddingAcao(false);
    }
  };

  const handleDeleteAcao = async (acaoId) => {
    setDeletingAcaoId(acaoId);
    try {
      const res = await apiFetch(`/formacao/${id}/${ano}/acoes/${acaoId}`, { method: "DELETE" });
      if (res.ok) {
        setAcoes(prev => prev.filter(a => a.id !== acaoId));
        setEditingIds(prev => removeFromSet(prev, acaoId));
        toast.success("Ação de formação eliminada", { position: "top-right", autoClose: 2000 });
      } else {
        toast.error("Falha ao eliminar a ação de formação", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao eliminar a ação de formação", { position: "top-right" });
    } finally {
      setDeletingAcaoId(null);
    }
  };

  const handleToggleEdit = (acaoId) => {
    setEditingIds(prev => toggleInSet(prev, acaoId));
  };

  const handleSaveAcao = async (acaoId) => {
    const acao = acoes.find(a => a.id === acaoId);
    if (!acao) return;
    setSavingIds(prev => new Set(prev).add(acaoId));
    try {
      const res = await apiFetch(`/formacao/${id}/${ano}/acoes/${acaoId}`, {
        method: "PUT",
        body: JSON.stringify({ acao }),
      });
      if (res.ok) {
        setEditingIds(prev => removeFromSet(prev, acaoId));
        toast.success("Ação de formação guardada", { position: "top-right", autoClose: 2000 });
      } else {
        toast.error("Falha ao guardar a ação de formação", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao guardar a ação de formação", { position: "top-right" });
    } finally {
      setSavingIds(prev => removeFromSet(prev, acaoId));
    }
  };

  const handleUploadCertificado = async (acaoId, file) => {
    if (!file) return;
    setUploadingCertId(acaoId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiFetch(`/formacao/${id}/${ano}/acoes/${acaoId}/certificado`, { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        setAcoes(prev => prev.map(a => a.id === acaoId
          ? { ...a, certificado_nome_ficheiro: data.certificado_nome_ficheiro, certificado_path: data.certificado_path }
          : a));
        toast.success("Certificado guardado", { position: "top-right", autoClose: 2500 });
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Falha ao enviar o certificado", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao enviar o certificado", { position: "top-right" });
    } finally {
      setUploadingCertId(null);
    }
  };

  const handleRemoveCertificado = async (acaoId) => {
    setRemovingCertId(acaoId);
    try {
      const res = await apiFetch(`/formacao/${id}/${ano}/acoes/${acaoId}/certificado`, { method: "DELETE" });
      if (res.ok) {
        setAcoes(prev => prev.map(a => a.id === acaoId
          ? { ...a, certificado_nome_ficheiro: null, certificado_path: null }
          : a));
        toast.success("Certificado removido", { position: "top-right", autoClose: 2000 });
      } else {
        toast.error("Falha ao remover o certificado", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao remover o certificado", { position: "top-right" });
    } finally {
      setRemovingCertId(null);
    }
  };

  const handleViewCertificado = async (acao) => {
    if (!acao.certificado_path) return;
    setViewingCertId(acao.id);
    try {
      const res = await apiFetch(`/files/download`, {
        method: "POST",
        body: JSON.stringify({ path: encodeURIComponent(acao.certificado_path) }),
      });
      if (res.ok) {
        const blob = await res.blob();
        window.open(URL.createObjectURL(blob), "_blank");
      } else {
        toast.error("Falha ao abrir o certificado", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao abrir o certificado", { position: "top-right" });
    } finally {
      setViewingCertId(null);
    }
  };

  const inputStyle = (isEditing) => ({
    width: "100%", fontSize: 13, color: "#111827", fontWeight: 500,
    border: "1px solid #e5e7eb", borderRadius: 6, padding: "7px 9px",
    outline: "none", background: isEditing ? "#fafafa" : "#fff",
    boxSizing: "border-box", fontFamily: "inherit",
  });

  const labelStyle = { fontSize: 11, color: "#6b7280", marginBottom: 4, display: "block" };

  const renderAcaoField = (acao, field, isEditing) => {
    const { key, label, type, span, rows, options } = field;
    const value = acao[key];

    if (type === "select") {
      return (
        <div key={key} style={{ gridColumn: `span ${span}` }}>
          <span style={labelStyle}>{label}</span>
          {isEditing ? (
            <select value={value} onChange={e => handleChange(acao.id, key, e.target.value)} style={inputStyle(isEditing)}>
              <option value="">Selecionar...</option>
              {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{value || " - "}</div>
          )}
        </div>
      );
    }

    return (
      <div key={key} style={{ gridColumn: `span ${span}` }}>
        <span style={labelStyle}>{label}</span>

        {isEditing ? (
          type === "textarea" ? (
            <textarea
              value={value}
              onChange={e => handleChange(acao.id, key, e.target.value)}
              rows={rows || 2}
              style={{ ...inputStyle(isEditing), resize: "vertical" }}
            />
          ) : (
            <input
              type={type === "number" ? "number" : "text"}
              min={type === "number" ? 0 : undefined}
              value={value}
              onChange={e => handleChange(acao.id, key, e.target.value)}
              style={inputStyle(isEditing)}
            />
          )
        ) : (
          <div style={{ fontSize: 13, color: "#111827", fontWeight: 500, whiteSpace: "pre-wrap" }}>
            {value || " - "}
          </div>
        )}
      </div>
    );
  };

  const handleSelectFile = (filePath) => {
    const formattedPath = filePath.replace(/\s/g, "-").replace(/\//g, "__");
    navigate(`/file/${formattedPath}`, { state: { originalFilename: filePath } });
  };

  if (!canView) return null;

  const anoOptions = Array.from({ length: 6 }, (_, i) => String(new Date().getFullYear() - i));
  const anySaving = savingIds.size > 0;
  const totalHorasAno = acoes.reduce((sum, a) => sum + (Number(a.duracao) || 0), 0);

  return (
    <div className="flex min-h-screen">
      <Sidebar onSelectFile={handleSelectFile} />

      <div className="ml-[230px] flex-1 flex flex-col min-h-screen">
        <Topbar icon="🎓" title="Plano de Formação" />

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>

          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "18px 24px", display: "flex", alignItems: "center", gap: 16 }}>
            <button
              onClick={() => navigate(canManage ? "/plano-formacao" : "/dashboard")}
              title={canManage ? "Voltar à lista de colaboradores" : "Voltar ao dashboard"}
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
                Plano de formação  -  {nomeCurto}
              </div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 3 }}>
                Ano civil de {ano}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 11, color: "#9ca3af" }}>Total de horas no ano</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{totalHorasAno}h</span>
            </div>
            <select
              value={ano}
              disabled={editingIds.size > 0 || anySaving}
              onChange={e => setAno(e.target.value)}
              title={editingIds.size > 0 ? "Termina a edição para mudar de ano" : "Mudar de ano"}
              style={{
                fontSize: 13, padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7,
                background: editingIds.size > 0 ? "#f3f4f6" : "#fafafa", color: "#111827", flexShrink: 0,
              }}
            >
              {anoOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          {loading ? (
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 40, textAlign: "center", fontSize: 13, color: "#9ca3af" }}>
              A carregar plano de formação...
            </div>
          ) : acoes.length === 0 ? (
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 24, textAlign: "center", fontSize: 13, color: "#9ca3af" }}>
              Sem ações de formação registadas para este ano.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {acoes.map((acao, index) => {
                const isEditing = editingIds.has(acao.id);
                const isSaving = savingIds.has(acao.id);
                return (
                  <div key={acao.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                    <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8 }}>
                      <FaGraduationCap style={{ color: GOLD, fontSize: 13 }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
                        {acao.nome_acao || `Ação ${index + 1}`}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
                        {canManage && isEditing && (
                          <button
                            type="button"
                            onClick={() => handleDeleteAcao(acao.id)}
                            disabled={deletingAcaoId === acao.id}
                            title="Eliminar ação de formação"
                            style={{
                              display: "flex", alignItems: "center", justifyContent: "center",
                              width: 26, height: 26,
                              cursor: deletingAcaoId === acao.id ? "wait" : "pointer",
                              border: "1px solid #fee2e2", borderRadius: 7, background: "#fff", color: "#dc2626",
                            }}
                          >
                            <FaTrash style={{ fontSize: 10 }} />
                          </button>
                        )}
                        {canManage && (
                          <button
                            disabled={isSaving}
                            onClick={() => { if (isEditing) handleSaveAcao(acao.id); else handleToggleEdit(acao.id); }}
                            style={{
                              display: "flex", alignItems: "center", gap: 6,
                              padding: "6px 12px", fontSize: 12, fontWeight: 500, cursor: isSaving ? "wait" : "pointer",
                              border: `1px solid ${isEditing ? "#22c55e" : GOLD}`,
                              borderRadius: 7, background: "#fff",
                              color: isEditing ? "#22c55e" : GOLD,
                              transition: "all 0.15s", opacity: isSaving ? 0.6 : 1,
                            }}
                          >
                            {isSaving
                              ? "A guardar..."
                              : isEditing ? <><FaCheck style={{ fontSize: 11 }} /> Guardar</> : <><FaPencil style={{ fontSize: 11 }} /> Editar</>}
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ padding: 18 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px 20px", marginBottom: 14 }}>
                        {ACAO_FIELDS.map(field => renderAcaoField(acao, field, isEditing))}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ ...labelStyle, marginBottom: 0 }}>Certificado:</span>
                        {acao.certificado_nome_ficheiro ? (
                          <>
                            <span style={{
                              display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#111827",
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220,
                            }}>
                              <FaFileLines style={{ color: "#9ca3af", fontSize: 12, flexShrink: 0 }} />
                              {acao.certificado_nome_ficheiro}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleViewCertificado(acao)}
                              disabled={viewingCertId === acao.id}
                              style={{
                                padding: "4px 10px", fontSize: 12, fontWeight: 500,
                                cursor: viewingCertId === acao.id ? "wait" : "pointer",
                                border: "1px solid #e5e7eb", borderRadius: 7, background: "#fff", color: "#6b7280",
                              }}
                            >
                              {viewingCertId === acao.id ? "A abrir..." : "Ver"}
                            </button>
                            {isEditing && (
                              <button
                                type="button"
                                onClick={() => handleRemoveCertificado(acao.id)}
                                disabled={removingCertId === acao.id}
                                title="Remover certificado"
                                style={{
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  width: 26, height: 26, cursor: removingCertId === acao.id ? "wait" : "pointer",
                                  border: "1px solid #fee2e2", borderRadius: 7, background: "#fff", color: "#dc2626",
                                }}
                              >
                                <FaTrash style={{ fontSize: 10 }} />
                              </button>
                            )}
                          </>
                        ) : isEditing ? (
                          <label
                            style={{
                              display: "flex", alignItems: "center", gap: 6,
                              padding: "5px 11px", fontSize: 12, fontWeight: 500,
                              border: `1px solid ${GOLD}`, borderRadius: 7, background: "#fff", color: GOLD,
                              cursor: uploadingCertId === acao.id ? "wait" : "pointer",
                              opacity: uploadingCertId === acao.id ? 0.6 : 1,
                            }}
                          >
                            {uploadingCertId === acao.id ? "A enviar..." : "Adicionar certificado"}
                            <input
                              type="file"
                              accept="application/pdf,image/*"
                              disabled={uploadingCertId === acao.id}
                              onChange={e => {
                                const file = e.target.files?.[0];
                                e.target.value = "";
                                handleUploadCertificado(acao.id, file);
                              }}
                              style={{ display: "none" }}
                            />
                          </label>
                        ) : (
                          <span style={{ fontSize: 13, color: "#9ca3af" }}> - </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && canManage && (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <button
                type="button"
                onClick={handleAddAcao}
                disabled={addingAcao}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 16px", fontSize: 13, fontWeight: 500,
                  cursor: addingAcao ? "wait" : "pointer",
                  border: `1px dashed ${GOLD}`, borderRadius: 7, background: "#fff", color: GOLD,
                }}
              >
                <FaPlus style={{ fontSize: 11 }} />
                {addingAcao ? "A adicionar..." : "Adicionar ação de formação"}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
