import React, { useCallback, useContext, useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { UserContext } from "../../shared/context/userContext";
import Sidebar from "../../shared/components/Sidebar";
import Topbar from "../../shared/components/Topbar";
import {
  FaBriefcaseMedical, FaFileLines, FaPencil, FaCheck, FaArrowLeft, FaTrash,
} from "react-icons/fa6";
import { apiFetch } from "../../shared/utils/apiFetch";
import { getNomeCurto } from "../../shared/utils/nomeCurto";

const GOLD = "#C8932F";

const FORM_FIELDS = [
  { key: "data_ultimo_exame", label: "Data do último exame", type: "date" },
  { key: "data_proximo_exame", label: "Data do próximo exame", type: "date" },
];

const INITIAL_FORM = FORM_FIELDS.reduce((acc, f) => {
  acc[f.key] = "";
  return acc;
}, {});

export default function MedicinaTrabalhoColaborador() {
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

  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [fichaNomeFicheiro, setFichaNomeFicheiro] = useState(null);
  const [fichaPath, setFichaPath] = useState(null);
  const [uploadingFicha, setUploadingFicha] = useState(false);
  const [viewingFicha, setViewingFicha] = useState(false);
  const [removingFicha, setRemovingFicha] = useState(false);

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
        setForm({ ...INITIAL_FORM, ...(data.form || {}) });
        setFichaNomeFicheiro(data.ficha_nome_ficheiro || null);
        setFichaPath(data.ficha_path || null);
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

  const handleChange = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(`/medicina-trabalho/${id}`, {
        method: "PUT",
        body: JSON.stringify({ form }),
      });
      if (res.ok) {
        setEditMode(false);
        await fetchMedicinaTrabalho();
        toast.success("Medicina do trabalho guardada", { position: "top-right", autoClose: 2500 });
      } else {
        toast.error("Falha ao guardar a medicina do trabalho", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao guardar a medicina do trabalho", { position: "top-right" });
    } finally {
      setSaving(false);
    }
  };

  const handleUploadFicha = async (file) => {
    if (!file) return;
    setUploadingFicha(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiFetch(`/medicina-trabalho/${id}/ficha`, { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        setFichaNomeFicheiro(data.ficha_nome_ficheiro);
        setFichaPath(data.ficha_path);
        toast.success("Ficha guardada", { position: "top-right", autoClose: 2500 });
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Falha ao enviar a ficha", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao enviar a ficha", { position: "top-right" });
    } finally {
      setUploadingFicha(false);
    }
  };

  const handleRemoveFicha = async () => {
    setRemovingFicha(true);
    try {
      const res = await apiFetch(`/medicina-trabalho/${id}/ficha`, { method: "DELETE" });
      if (res.ok) {
        setFichaNomeFicheiro(null);
        setFichaPath(null);
        toast.success("Ficha removida", { position: "top-right", autoClose: 2000 });
      } else {
        toast.error("Falha ao remover a ficha", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao remover a ficha", { position: "top-right" });
    } finally {
      setRemovingFicha(false);
    }
  };

  const handleViewFicha = async () => {
    if (!fichaPath) return;
    setViewingFicha(true);
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
      setViewingFicha(false);
    }
  };

  const inputStyle = {
    width: "100%", fontSize: 13, color: "#111827", fontWeight: 500,
    border: "1px solid #e5e7eb", borderRadius: 6, padding: "7px 9px",
    outline: "none", background: editMode ? "#fafafa" : "#fff",
    boxSizing: "border-box",
  };

  const labelStyle = { fontSize: 11, color: "#6b7280", marginBottom: 4, display: "block" };

  const renderField = (field) => {
    const { key, label, type } = field;
    const value = form[key];

    return (
      <div key={key}>
        <span style={labelStyle}>{label}</span>
        {editMode ? (
          <input
            type={type}
            value={value}
            onChange={e => handleChange(key, e.target.value)}
            style={inputStyle}
          />
        ) : (
          <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{value || " - "}</div>
        )}
      </div>
    );
  };

  const handleSelectFile = (filePath) => {
    const formattedPath = filePath.replace(/\s/g, "-").replace(/\//g, "__");
    navigate(`/file/${formattedPath}`, { state: { originalFilename: filePath } });
  };

  if (!canView) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar onSelectFile={handleSelectFile} />

      <div className="ml-[230px] flex-1 flex flex-col min-h-screen">
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
              A carregar medicina do trabalho...
            </div>
          ) : (
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8 }}>
                <FaBriefcaseMedical style={{ color: GOLD, fontSize: 13 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Medicina do trabalho</span>
              </div>

              <div style={{ padding: 18, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px 20px", marginBottom: 4 }}>
                {FORM_FIELDS.map(renderField)}
              </div>

              <div style={{ padding: "0 18px 18px", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ ...labelStyle, marginBottom: 0 }}>Ficha de aptidão médica:</span>
                {fichaNomeFicheiro ? (
                  <>
                    <span style={{
                      display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#111827",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260,
                    }}>
                      <FaFileLines style={{ color: "#9ca3af", fontSize: 12, flexShrink: 0 }} />
                      {fichaNomeFicheiro}
                    </span>
                    <button
                      type="button"
                      onClick={handleViewFicha}
                      disabled={viewingFicha}
                      style={{
                        padding: "4px 10px", fontSize: 12, fontWeight: 500,
                        cursor: viewingFicha ? "wait" : "pointer",
                        border: "1px solid #e5e7eb", borderRadius: 7, background: "#fff", color: "#6b7280",
                      }}
                    >
                      {viewingFicha ? "A abrir..." : "Ver"}
                    </button>
                    {editMode && (
                      <button
                        type="button"
                        onClick={handleRemoveFicha}
                        disabled={removingFicha}
                        title="Remover ficha"
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          width: 26, height: 26, cursor: removingFicha ? "wait" : "pointer",
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
                      cursor: uploadingFicha ? "wait" : "pointer",
                      opacity: uploadingFicha ? 0.6 : 1,
                    }}
                  >
                    {uploadingFicha ? "A enviar..." : "Adicionar ficha"}
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      disabled={uploadingFicha}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        handleUploadFicha(file);
                      }}
                      style={{ display: "none" }}
                    />
                  </label>
                ) : (
                  <span style={{ fontSize: 13, color: "#9ca3af" }}> - </span>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
