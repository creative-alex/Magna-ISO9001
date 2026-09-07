import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { UserContext } from "../../shared/context/userContext";
import Sidebar from "../../shared/components/Sidebar";
import Topbar from "../../shared/components/Topbar";
import ColaboradoresGroupedList from "../../shared/components/ColaboradoresGroupedList";
import { FaPencil, FaCheck, FaSliders, FaChevronDown } from "react-icons/fa6";
import { apiFetch } from "../../shared/utils/apiFetch";

const GOLD = "#C8932F";

function ParametrosSalario({ canEdit }) {
  const [parametros, setParametros] = useState({ valor_subsidio_alimentacao: "", valor_km_deslocacao: "", escaloes: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/parametros-salario");
        if (res.ok) setParametros(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleChange = (key, value) => setParametros(prev => ({ ...prev, [key]: value }));

  const handleEscalaoChange = (escalao, key, value) => {
    setParametros(prev => ({
      ...prev,
      escaloes: prev.escaloes.map(e => e.escalao === escalao ? { ...e, [key]: value } : e),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch("/parametros-salario", {
        method: "PUT",
        body: JSON.stringify(parametros),
      });
      if (res.ok) {
        setEditMode(false);
        toast.success("Parâmetros guardados", { position: "top-right", autoClose: 2500 });
      } else {
        toast.error("Falha ao guardar os parâmetros", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao guardar os parâmetros", { position: "top-right" });
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%", fontSize: 13, color: "#111827", fontWeight: 500,
    border: "1px solid #e5e7eb", borderRadius: 6, padding: "6px 9px",
    outline: "none", background: editMode ? "#fafafa" : "#fff",
    boxSizing: "border-box",
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: collapsed ? "none" : "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? "Expandir parâmetros" : "Colapsar parâmetros"}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", padding: 4, margin: -4, cursor: "pointer" }}
        >
          <FaSliders style={{ color: GOLD, fontSize: 13 }} />
        </button>
        <span
          onClick={() => setCollapsed(c => !c)}
          style={{ fontSize: 13, fontWeight: 600, color: "#111827", flex: 1, cursor: "pointer" }}
        >
          Parâmetros de salário
        </span>
        {!collapsed && canEdit && (
          <button
            disabled={saving || loading}
            onClick={() => { if (editMode) handleSave(); else setEditMode(true); }}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px", fontSize: 12, fontWeight: 500, cursor: saving ? "wait" : "pointer",
              border: `1px solid ${editMode ? "#22c55e" : GOLD}`,
              borderRadius: 7, background: "#fff",
              color: editMode ? "#22c55e" : GOLD,
            }}
          >
            {saving
              ? "A guardar..."
              : editMode ? <><FaCheck style={{ fontSize: 11 }} /> Guardar</> : <><FaPencil style={{ fontSize: 11 }} /> Editar</>}
          </button>
        )}
        <FaChevronDown
          onClick={() => setCollapsed(c => !c)}
          style={{ color: "#9ca3af", fontSize: 12, cursor: "pointer", transition: "transform 0.15s", transform: collapsed ? "rotate(-90deg)" : "none" }}
        />
      </div>

      {!collapsed && (loading ? (
        <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "#9ca3af" }}>A carregar parâmetros...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-[18px] border-b border-[#f3f4f6]">
            <div>
              <span style={{ fontSize: 11, color: "#6b7280", marginBottom: 4, display: "block" }}>Valor do subsídio de alimentação (€/dia)</span>
              {editMode ? (
                <input
                  type="number"
                  step="0.01"
                  value={parametros.valor_subsidio_alimentacao}
                  onChange={e => handleChange("valor_subsidio_alimentacao", e.target.value)}
                  style={inputStyle}
                />
              ) : (
                <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{parametros.valor_subsidio_alimentacao || " - "}</div>
              )}
            </div>
            <div>
              <span style={{ fontSize: 11, color: "#6b7280", marginBottom: 4, display: "block" }}>Valor por quilómetro em deslocações (€/km)</span>
              {editMode ? (
                <input
                  type="number"
                  step="0.01"
                  value={parametros.valor_km_deslocacao}
                  onChange={e => handleChange("valor_km_deslocacao", e.target.value)}
                  style={inputStyle}
                />
              ) : (
                <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{parametros.valor_km_deslocacao || " - "}</div>
              )}
            </div>
          </div>

          <div style={{ padding: "12px 18px 6px", fontSize: 12, fontWeight: 600, color: "#111827" }}>Tabela de vencimento por escalão</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-[18px] pb-[18px]">
            {parametros.escaloes.map(e => (
              <div key={e.escalao} style={{ border: "1px solid #f3f4f6", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#111827", marginBottom: 8 }}>Escalão {e.escalao}</div>
                <span style={{ fontSize: 11, color: "#6b7280", marginBottom: 4, display: "block" }}>Valor bruto (€)</span>
                {editMode ? (
                  <input
                    type="number"
                    value={e.valor_bruto}
                    onChange={ev => handleEscalaoChange(e.escalao, "valor_bruto", ev.target.value)}
                    style={{ ...inputStyle, marginBottom: 8 }}
                  />
                ) : (
                  <div style={{ fontSize: 13, color: "#111827", fontWeight: 500, marginBottom: 8 }}>{e.valor_bruto || " - "}</div>
                )}
                <span style={{ fontSize: 11, color: "#6b7280", marginBottom: 4, display: "block" }}>Valor isenção horário (€)</span>
                {e.escalao === "I" ? (
                  <div style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500 }}>Nunca aplicável</div>
                ) : editMode ? (
                  <input
                    type="number"
                    value={e.valor_isencao_horario_trabalho}
                    onChange={ev => handleEscalaoChange(e.escalao, "valor_isencao_horario_trabalho", ev.target.value)}
                    style={inputStyle}
                  />
                ) : (
                  <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>
                    {e.valor_isencao_horario_trabalho}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      ))}
    </div>
  );
}

export default function ProcessamentoSalarios() {
  const navigate = useNavigate();
  const { uid, nivelAcesso } = useContext(UserContext);
  const isAdmin = nivelAcesso === "SuperAdmin";
  const isHR = nivelAcesso === "GestorRH";
  const isAdministrador = nivelAcesso === "Administrador";
  const isGestorFinanceiro = nivelAcesso === "GestorFinanceiro";
  const canView = isAdmin || isHR || isAdministrador || isGestorFinanceiro;

  useEffect(() => {
    // Esta página (parâmetros + lista de colaboradores) é só para admin/RH/
    // Administrador; um colaborador comum vê antes o seu próprio processamento.
    if (!canView) {
      navigate(`/salarios/${uid}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectFile = (filePath) => {
    const formattedPath = filePath.replace(/\s/g, "-").replace(/\//g, "__");
    navigate(`/file/${formattedPath}`, { state: { originalFilename: filePath } });
  };

  if (!canView) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar onSelectFile={handleSelectFile} />

      <div className="ml-[var(--sidebar-w,230px)] transition-[margin-left] duration-200 flex-1 min-w-0 flex flex-col min-h-screen">
        <Topbar icon="💰" title="Processamento Salários" />

        {/* Parâmetros de salário são globais (não são "dados dos colaboradores da
            entidade"), por isso continuam fora do alcance do Administrador. GestorRH
            mantém consulta mas a edição passou a ser exclusiva de SuperAdmin/Gestor
            Financeiro  -  separação de funções entre RH e Financeiro. */}
        {(isAdmin || isHR || isGestorFinanceiro) && (
          <div className="px-4 sm:px-6 pt-4 sm:pt-6" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <ParametrosSalario canEdit={isAdmin || isGestorFinanceiro} />
          </div>
        )}

        <ColaboradoresGroupedList
          title="Colaboradores"
          subtitle="Agrupados por entidade. Seleciona um colaborador para consultar ou preencher os dados de processamento salarial do mês."
          onSelect={(c) => navigate(`/salarios/${c.id}`, { state: { nome: c.nome, email: c.email } })}
        />
      </div>
    </div>
  );
}
