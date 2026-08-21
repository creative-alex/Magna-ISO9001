import React, { useCallback, useContext, useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { UserContext } from "../context/userContext";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import {
  FaGraduationCap, FaFileLines, FaPencil, FaCheck, FaArrowLeft, FaTrash, FaPlus,
} from "react-icons/fa6";
import { apiFetch } from "../utils/apiFetch";
import { getNomeCurto } from "../utils/nomeCurto";

const GOLD = "#C8932F";

const ACAO_FIELDS = [
  { key: "nome_acao", label: "Nome da ação", type: "text", span: 2 },
  { key: "duracao", label: "Duração", type: "text", span: 1 },
  { key: "local", label: "Local", type: "text", span: 1 },
  { key: "horario", label: "Horário", type: "text", span: 1 },
  { key: "objetivo", label: "Objetivo", type: "textarea", span: 1 },
  { key: "entidade_formadora", label: "Entidade formadora", type: "text", span: 1 },
];

function getCurrentYear() {
  return String(new Date().getFullYear());
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
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [acoes, setAcoes] = useState([]);
  const [addingAcao, setAddingAcao] = useState(false);
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const results = await Promise.all(acoes.map(a =>
        apiFetch(`/formacao/${id}/${ano}/acoes/${a.id}`, {
          method: "PUT",
          body: JSON.stringify({ acao: a }),
        })
      ));
      if (results.every(r => r.ok)) {
        setEditMode(false);
        await fetchFormacao();
        toast.success("Plano de formação guardado", { position: "top-right", autoClose: 2500 });
      } else {
        toast.error("Falha ao guardar o plano de formação", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao guardar o plano de formação", { position: "top-right" });
    } finally {
      setSaving(false);
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

  const inputStyle = {
    width: "100%", fontSize: 13, color: "#111827", fontWeight: 500,
    border: "1px solid #e5e7eb", borderRadius: 6, padding: "7px 9px",
    outline: "none", background: editMode ? "#fafafa" : "#fff",
    boxSizing: "border-box", fontFamily: "inherit",
  };

  const labelStyle = { fontSize: 11, color: "#6b7280", marginBottom: 4, display: "block" };

  const renderAcaoField = (acao, field) => {
    const { key, label, type, span } = field;
    const value = acao[key];

    return (
      <div key={key} style={{ gridColumn: `span ${span}` }}>
        <span style={labelStyle}>{label}</span>
        {editMode ? (
          type === "textarea" ? (
            <textarea
              value={value}
              onChange={e => handleChange(acao.id, key, e.target.value)}
              rows={2}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          ) : (
            <input
              type="text"
              value={value}
              onChange={e => handleChange(acao.id, key, e.target.value)}
              style={inputStyle}
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
            <select
              value={ano}
              disabled={editMode || saving}
              onChange={e => setAno(e.target.value)}
              title={editMode ? "Termina a edição para mudar de ano" : "Mudar de ano"}
              style={{
                fontSize: 13, padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7,
                background: editMode ? "#f3f4f6" : "#fafafa", color: "#111827", flexShrink: 0,
              }}
            >
              {anoOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            {canManage && (
              <button
                disabled={saving}
                onClick={() => { if (editMode) handleSave(); else setEditMode(true); }}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 16px", fontSize: 13, fontWeight: 500, cursor: saving ? "wait" : "pointer",
                  border: `1px solid ${editMode ? "#22c55e" : GOLD}`,
                  borderRadius: 7, background: "#fff",
                  color: editMode ? "#22c55e" : GOLD,
                  transition: "all 0.15s", flexShrink: 0, opacity: saving ? 0.6 : 1,
                }}
              >
                {saving
                  ? "A guardar..."
                  : editMode ? <><FaCheck style={{ fontSize: 12 }} /> Guardar</> : <><FaPencil style={{ fontSize: 12 }} /> Editar</>}
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 40, textAlign: "center", fontSize: 13, color: "#9ca3af" }}>
              A carregar plano de formação...
            </div>
          ) : (
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8 }}>
                <FaGraduationCap style={{ color: GOLD, fontSize: 13 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Plano de formação</span>
                <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: "auto" }}>Ano civil {ano}</span>
              </div>

              {acoes.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "#9ca3af" }}>
                  Sem ações de formação registadas para este ano.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {acoes.map((acao, index) => (
                    <div
                      key={acao.id}
                      style={{
                        padding: 18,
                        borderBottom: index < acoes.length - 1 ? "1px solid #f3f4f6" : "none",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af" }}>
                          Ação {index + 1}
                        </span>
                        {editMode && (
                          <button
                            type="button"
                            onClick={() => handleDeleteAcao(acao.id)}
                            disabled={deletingAcaoId === acao.id}
                            title="Eliminar ação de formação"
                            style={{
                              display: "flex", alignItems: "center", justifyContent: "center",
                              width: 26, height: 26, marginLeft: "auto",
                              cursor: deletingAcaoId === acao.id ? "wait" : "pointer",
                              border: "1px solid #fee2e2", borderRadius: 7, background: "#fff", color: "#dc2626",
                            }}
                          >
                            <FaTrash style={{ fontSize: 10 }} />
                          </button>
                        )}
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px 20px", marginBottom: 14 }}>
                        {ACAO_FIELDS.map(field => renderAcaoField(acao, field))}
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
                            {editMode && (
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
                        ) : editMode ? (
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
                  ))}
                </div>
              )}

              {editMode && canManage && (
                <div style={{ padding: 18, borderTop: acoes.length > 0 ? "1px solid #f3f4f6" : "none" }}>
                  <button
                    type="button"
                    onClick={handleAddAcao}
                    disabled={addingAcao}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "8px 14px", fontSize: 13, fontWeight: 500,
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
          )}

        </div>
      </div>
    </div>
  );
}
