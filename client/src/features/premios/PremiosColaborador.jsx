import React, { useCallback, useContext, useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { UserContext } from "../../shared/context/userContext";
import Sidebar from "../../shared/components/Sidebar";
import Topbar from "../../shared/components/Topbar";
import { FaTrophy, FaPencil, FaCheck, FaArrowLeft, FaTrash, FaPlus } from "react-icons/fa6";
import { apiFetch } from "../../shared/utils/apiFetch";
import { getNomeCurto } from "../../shared/utils/nomeCurto";

const GOLD = "#C8932F";

const MAX_TRANSFERENCIAS = 4;

const PREMIO_FIELDS = [
  { key: "valor", label: "Valor (€)", type: "number" },
  {
    key: "numero_transferencias", label: "Número de transferências", type: "select",
    options: Array.from({ length: MAX_TRANSFERENCIAS + 1 }, (_, i) => String(i)),
  },
];

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

export default function PremiosColaborador() {
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
  const [premios, setPremios] = useState([]);
  const [addingPremio, setAddingPremio] = useState(false);
  const [editingIds, setEditingIds] = useState(new Set());
  const [savingIds, setSavingIds] = useState(new Set());
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (!canView) {
      navigate("/dashboard", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPremios = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/premios/${id}`);
      if (res.ok) {
        const data = await res.json();
        setPremios(data.premios || []);
        setEditingIds(new Set());
      } else {
        toast.error("Não foi possível carregar os prémios", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível carregar os prémios", { position: "top-right" });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!canView) return;
    fetchPremios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleChange = (premioId, key, value) => {
    setPremios(prev => prev.map(p => {
      if (p.id !== premioId) return p;
      if (key !== "numero_transferencias") return { ...p, [key]: value };

      // Redimensiona logo as datas de transferência para acompanhar o número
      // indicado  -  crescer acrescenta campos vazios, encolher descarta as
      // datas a mais (o mesmo clamp que o servidor aplica ao guardar).
      const n = Math.max(0, parseInt(value, 10) || 0);
      const existing = Array.isArray(p.datas_transferencia) ? p.datas_transferencia : [];
      const datas_transferencia = Array.from({ length: n }, (_, i) => existing[i] || "");
      return { ...p, numero_transferencias: value, datas_transferencia };
    }));
  };

  const handleDataTransferenciaChange = (premioId, index, value) => {
    setPremios(prev => prev.map(p => {
      if (p.id !== premioId) return p;
      const datas = [...(p.datas_transferencia || [])];
      datas[index] = value;
      return { ...p, datas_transferencia: datas };
    }));
  };

  const handleAddPremio = async () => {
    setAddingPremio(true);
    try {
      const res = await apiFetch(`/premios/${id}`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setPremios(prev => [...prev, data.premio]);
        setEditingIds(prev => new Set(prev).add(data.premio.id));
      } else {
        toast.error("Falha ao adicionar prémio", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao adicionar prémio", { position: "top-right" });
    } finally {
      setAddingPremio(false);
    }
  };

  const handleDeletePremio = async (premioId) => {
    setDeletingId(premioId);
    try {
      const res = await apiFetch(`/premios/${id}/${premioId}`, { method: "DELETE" });
      if (res.ok) {
        setPremios(prev => prev.filter(p => p.id !== premioId));
        setEditingIds(prev => removeFromSet(prev, premioId));
        toast.success("Prémio eliminado", { position: "top-right", autoClose: 2000 });
      } else {
        toast.error("Falha ao eliminar o prémio", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao eliminar o prémio", { position: "top-right" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleEdit = (premioId) => {
    setEditingIds(prev => toggleInSet(prev, premioId));
  };

  const handleSavePremio = async (premioId) => {
    const premio = premios.find(p => p.id === premioId);
    if (!premio) return;
    setSavingIds(prev => new Set(prev).add(premioId));
    try {
      const res = await apiFetch(`/premios/${id}/${premioId}`, {
        method: "PUT",
        body: JSON.stringify({ premio }),
      });
      if (res.ok) {
        const data = await res.json();
        // "recebido" é um booleano explícito  -  o prémio só passa para a
        // secção "Recebidos" quando este campo é marcado como Sim e guardado.
        setPremios(prev => prev.map(p => p.id === premioId ? data.premio : p));
        setEditingIds(prev => removeFromSet(prev, premioId));
        toast.success("Prémio guardado", { position: "top-right", autoClose: 2000 });
      } else {
        toast.error("Falha ao guardar o prémio", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao guardar o prémio", { position: "top-right" });
    } finally {
      setSavingIds(prev => removeFromSet(prev, premioId));
    }
  };

  const inputStyle = (isEditing) => ({
    width: "100%", fontSize: 13, color: "#111827", fontWeight: 500,
    border: "1px solid #e5e7eb", borderRadius: 6, padding: "7px 9px",
    outline: "none", background: isEditing ? "#fafafa" : "#fff",
    boxSizing: "border-box",
  });

  const labelStyle = { fontSize: 11, color: "#6b7280", marginBottom: 4, display: "block" };

  const renderNomeField = (premio, isEditing) => (
    isEditing ? (
      <input
        type="text"
        value={premio.nome_premio}
        onChange={e => handleChange(premio.id, "nome_premio", e.target.value)}
        placeholder="Nome do prémio"
        style={{
          fontSize: 13, fontWeight: 600, color: "#111827",
          border: "1px solid #e5e7eb", borderRadius: 6, padding: "5px 9px",
          outline: "none", background: "#fafafa", boxSizing: "border-box",
        }}
      />
    ) : (
      <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
        {premio.nome_premio || "Prémio sem nome"}
      </span>
    )
  );

  const renderField = (premio, field, isEditing) => {
    const { key, label, type, options } = field;
    const value = premio[key];

    if (type === "select") {
      return (
        <div key={key}>
          <span style={labelStyle}>{label}</span>
          {isEditing ? (
            <select
              value={value || "0"}
              onChange={e => handleChange(premio.id, key, e.target.value)}
              style={inputStyle(isEditing)}
            >
              {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          ) : (
            <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{value || "0"}</div>
          )}
        </div>
      );
    }

    return (
      <div key={key}>
        <span style={labelStyle}>{label}</span>
        {isEditing ? (
          <input
            type={type}
            min={type === "number" ? 0 : undefined}
            step={type === "number" ? "0.01" : undefined}
            value={value}
            onChange={e => handleChange(premio.id, key, e.target.value)}
            style={inputStyle(isEditing)}
          />
        ) : (
          <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{value || " - "}</div>
        )}
      </div>
    );
  };

  const renderDatasTransferencia = (premio, isEditing) => {
    const datas = premio.datas_transferencia || [];
    if (datas.length === 0) {
      return (
        <div style={{ fontSize: 12, color: "#9ca3af", fontStyle: "italic" }}>
          Define o número de transferências para indicar as respetivas datas.
        </div>
      );
    }
    return (
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${datas.length}, 1fr)`, gap: "14px 16px" }}>
        {datas.map((data, index) => (
          <div key={index}>
            <span style={labelStyle}>Data de transferência {index + 1}</span>
            {isEditing ? (
              <input
                type="date"
                value={data}
                onChange={e => handleDataTransferenciaChange(premio.id, index, e.target.value)}
                style={inputStyle(isEditing)}
              />
            ) : (
              <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{data || " - "}</div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const handleSelectFile = (filePath) => {
    const formattedPath = filePath.replace(/\s/g, "-").replace(/\//g, "__");
    navigate(`/file/${formattedPath}`, { state: { originalFilename: filePath } });
  };

  const renderPremioCard = (premio) => {
    const isEditing = editingIds.has(premio.id);
    const isSaving = savingIds.has(premio.id);
    return (
      <div key={premio.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8 }}>
          <FaTrophy style={{ color: GOLD, fontSize: 13, flexShrink: 0 }} />
          {renderNomeField(premio, isEditing)}
          <span style={{
            display: "inline-block", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
            background: premio.recebido ? "#DCFCE7" : "#F3F4F6", color: premio.recebido ? "#15803D" : "#6b7280",
          }}>
            {premio.recebido ? "Recebido" : "A receber"}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
            {canManage && isEditing && (
              <button
                type="button"
                onClick={() => handleDeletePremio(premio.id)}
                disabled={deletingId === premio.id}
                title="Eliminar prémio"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 26, height: 26,
                  cursor: deletingId === premio.id ? "wait" : "pointer",
                  border: "1px solid #fee2e2", borderRadius: 7, background: "#fff", color: "#dc2626",
                }}
              >
                <FaTrash style={{ fontSize: 10 }} />
              </button>
            )}
            {canManage && (
              <button
                disabled={isSaving}
                onClick={() => { if (isEditing) handleSavePremio(premio.id); else handleToggleEdit(premio.id); }}
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
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "14px 16px" }}>
            {PREMIO_FIELDS.map(field => renderField(premio, field, isEditing))}
          </div>
          {renderDatasTransferencia(premio, isEditing)}
        </div>
      </div>
    );
  };

  if (!canView) return null;

  const aReceber = premios.filter(p => !p.recebido);
  const recebidos = premios.filter(p => p.recebido);

  return (
    <div className="flex min-h-screen">
      <Sidebar onSelectFile={handleSelectFile} />

      <div className="ml-[230px] flex-1 flex flex-col min-h-screen">
        <Topbar icon="🏆" title="Prémios" />

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>

          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "18px 24px", display: "flex", alignItems: "center", gap: 16 }}>
            <button
              onClick={() => navigate(canManage || isAdministrador ? "/premios" : "/dashboard")}
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
                Prémios  -  {nomeCurto}
              </div>
            </div>
            {canManage && (
              <button
                type="button"
                onClick={handleAddPremio}
                disabled={addingPremio}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 14px", fontSize: 13, fontWeight: 500,
                  cursor: addingPremio ? "wait" : "pointer",
                  border: `1px dashed ${GOLD}`, borderRadius: 7, background: "#fff", color: GOLD,
                  flexShrink: 0,
                }}
              >
                <FaPlus style={{ fontSize: 11 }} />
                {addingPremio ? "A adicionar..." : "Adicionar prémio"}
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 40, textAlign: "center", fontSize: 13, color: "#9ca3af" }}>
              A carregar prémios...
            </div>
          ) : premios.length === 0 ? (
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 24, textAlign: "center", fontSize: 13, color: "#9ca3af" }}>
              Sem prémios registados.
            </div>
          ) : (
            <>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 10 }}>
                  A receber {aReceber.length > 0 && `(${aReceber.length})`}
                </div>
                {aReceber.length === 0 ? (
                  <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 6 }}>Nenhum prémio pendente.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {aReceber.map(renderPremioCard)}
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 10 }}>
                  Recebidos {recebidos.length > 0 && `(${recebidos.length})`}
                </div>
                {recebidos.length === 0 ? (
                  <div style={{ fontSize: 13, color: "#9ca3af" }}>Nenhum prémio recebido ainda.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {recebidos.map(renderPremioCard)}
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
