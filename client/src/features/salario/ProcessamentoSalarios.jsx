import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { UserContext } from "../../shared/context/userContext";
import Sidebar from "../../shared/components/Sidebar";
import Topbar from "../../shared/components/Topbar";
import ColaboradoresGroupedList from "../../shared/components/ColaboradoresGroupedList";
import ExportFechoMensalButton from "./ExportFechoMensalButton";
import ImportarRecibosButton from "./ImportarRecibosButton";
import { FaPencil, FaCheck, FaSliders, FaChevronDown, FaTriangleExclamation, FaXmark } from "react-icons/fa6";
import { apiFetch } from "../../shared/utils/apiFetch";
import { usePermissions } from "../../shared/hooks/usePermissions";

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

// Estado do fecho mensal (mês corrente) + reenvio do email de aviso, por colaborador -
// mesma informação/ação da página /fecho-mensal (ver FechoMensalAdmin.jsx), trazida para
// aqui para o processamento de salários poder ver de imediato quem ainda falta fechar.
function FechoMensalRowBadge({ status, onSendReminder, sending }) {
  if (!status) return null;

  if (status.confirmed) {
    return (
      <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6, background: "#DCFCE7", color: "#15803D", whiteSpace: "nowrap" }}>
        Mês fechado
      </span>
    );
  }

  const badgeStyle = status.flagged
    ? { background: "#FEE2E2", color: "#B91C1C" }
    : { background: "#FEF3C7", color: "#92400E" };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6, whiteSpace: "nowrap", ...badgeStyle }}>
        {status.flagged ? "Não confirmado" : "Mês por fechar"}
      </span>
      <button
        type="button"
        onClick={onSendReminder}
        disabled={sending}
        style={{
          fontSize: 11, fontWeight: 500, padding: "4px 10px", borderRadius: 999, whiteSpace: "nowrap",
          border: `1px solid ${GOLD}`, color: GOLD, background: "#fff", cursor: sending ? "wait" : "pointer",
        }}
      >
        {sending ? "A enviar..." : "Enviar email"}
      </button>
    </div>
  );
}

// Confirmação explícita antes do fecho universal (ver Interface no pedido original) - ação
// global e potencialmente irreversível para os colaboradores, por isso não basta o próprio
// botão vermelho: tem de haver um segundo passo deliberado antes de chamar a API.
function TerminarVencimentoModal({ onConfirm, onCancel, loading }) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-5"
      onClick={() => !loading && onCancel()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-[420px] w-full relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="absolute top-4 right-4 !w-8 !h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer border-none bg-transparent disabled:cursor-not-allowed"
        >
          <FaXmark size={16} />
        </button>

        <div className="flex items-center gap-3 px-6 pt-6 pb-4 pr-14 border-b border-gray-100">
          <span className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <FaTriangleExclamation size={16} />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-gray-900 leading-tight">Terminar vencimento</h2>
          </div>
        </div>

        <div className="px-6 pt-5 pb-6">
          <p className="text-sm font-semibold text-gray-900 leading-relaxed mb-3">
            Ação global — fecha o mês para todos os colaboradores que ainda não o tenham confirmado.
          </p>
          <p className="text-sm text-gray-700 leading-relaxed mb-6">
            Ao executar esta ação, o mês será fechado para <strong>todos os colaboradores que permanecem com o fecho pendente</strong>.
            Os dias normais de trabalho que não tenham qualquer registo ou ausência válida serão considerados <strong className="text-red-600">falta</strong>.
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 py-2.5 px-4 border border-gray-200 rounded-full bg-white text-gray-600 text-sm font-medium cursor-pointer transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-2.5 px-4 border-none rounded-full bg-red-600 text-white text-sm font-semibold cursor-pointer transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {loading ? "A fechar..." : "Sim, terminar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProcessamentoSalarios() {
  const navigate = useNavigate();
  const { uid } = useContext(UserContext);
  const { isSuperAdmin, isGestorRH, isGestorFinanceiro, canViewColaboradores, canViewPayroll, canEditPayroll } = usePermissions();
  const canView = canViewColaboradores;
  // Fecho mensal (estado + exportação) só faz sentido para quem processa vencimentos a
  // nível global - Administrador continua de fora, tal como nos Parâmetros de salário.
  const canSeeFechoMensal = canViewPayroll;
  // "Terminar vencimento" (fecho universal, ver terminarVencimento em
  // fechoMensalController.js): SuperAdmin vê sempre; GestorRH/GestorFinanceiro só a partir
  // do dia 25 (mesmo prazo do fecho normal) - backend aceita os três (ver
  // requireAdminOrHRorFinanceiro), esta restrição de dia é só de interface.
  const canTerminarVencimento = isSuperAdmin || ((isGestorRH || isGestorFinanceiro) && new Date().getDate() >= 25);
  // Importação de recibos em lote: mesma restrição do upload manual (ver canAccess em
  // salarioController.js/uploadRecibo) - GestorRH mantém consulta mas não pode importar.
  const canImportarRecibos = canEditPayroll;

  useEffect(() => {
    // Esta página (parâmetros + lista de colaboradores) é só para admin/RH/
    // Administrador; um colaborador comum vê antes o seu próprio processamento.
    if (!canView) {
      navigate(`/salarios/${uid}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mesAtual = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const [fechoStatusList, setFechoStatusList] = useState([]);
  const [sendingUid, setSendingUid] = useState(null);
  const [closingUniversal, setClosingUniversal] = useState(false);
  const [showTerminarModal, setShowTerminarModal] = useState(false);

  const fetchFechoStatus = useCallback(async () => {
    if (!canSeeFechoMensal) return;
    try {
      const response = await apiFetch("/fecho-mensal/all-status", {
        method: "POST",
        body: JSON.stringify({ mes: mesAtual }),
      });
      if (response.ok) {
        const data = await response.json();
        setFechoStatusList(data.colaboradores || []);
      }
    } catch (err) {
      console.error("Erro ao carregar o estado do fecho mensal:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSeeFechoMensal, mesAtual]);

  useEffect(() => {
    fetchFechoStatus();
  }, [fetchFechoStatus]);

  const fechoStatusByUid = useMemo(
    () => new Map(fechoStatusList.map((s) => [s.uid, s])),
    [fechoStatusList]
  );

  // Por entidade: só "fechado" (dourado) quando TODOS os colaboradores dessa entidade já
  // confirmaram o mês corrente; havendo pelo menos um por confirmar, o botão fica vermelho.
  const entidadeClosedMap = useMemo(() => {
    const totals = new Map();
    fechoStatusList.forEach((s) => {
      const key = s.entidade || "Sem entidade";
      const agg = totals.get(key) || { total: 0, confirmed: 0 };
      agg.total += 1;
      if (s.confirmed) agg.confirmed += 1;
      totals.set(key, agg);
    });
    const result = new Map();
    totals.forEach((agg, key) => result.set(key, agg.total > 0 && agg.confirmed === agg.total));
    return result;
  }, [fechoStatusList]);

  const handleSendReminder = async (uidToRemind) => {
    setSendingUid(uidToRemind);
    try {
      const response = await apiFetch("/fecho-mensal/send-reminder", {
        method: "POST",
        body: JSON.stringify({ uid: uidToRemind, mes: mesAtual }),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success("Email enviado");
        await fetchFechoStatus();
      } else {
        toast.error(data.error || "Erro ao enviar o email");
      }
    } catch (err) {
      console.error("Erro ao enviar email de fecho mensal:", err);
      toast.error("Erro ao enviar o email");
    } finally {
      setSendingUid(null);
    }
  };

  const confirmTerminarVencimento = async () => {
    setClosingUniversal(true);
    try {
      const response = await apiFetch("/fecho-mensal/terminar-vencimento", {
        method: "POST",
        body: JSON.stringify({ mes: mesAtual }),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(`Mês fechado para ${data.fechados} colaborador(es)`);
        await fetchFechoStatus();
        setShowTerminarModal(false);
      } else {
        toast.error(data.error || "Erro ao terminar o vencimento");
      }
    } catch (err) {
      console.error("Erro ao terminar o vencimento:", err);
      toast.error("Erro ao terminar o vencimento");
    } finally {
      setClosingUniversal(false);
    }
  };

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
        {canSeeFechoMensal && (
          <div className="px-4 sm:px-6 pt-4 sm:pt-6" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <ParametrosSalario canEdit={canEditPayroll} />
          </div>
        )}

        <ColaboradoresGroupedList
          title="Colaboradores"
          subtitle="Agrupados por entidade. Seleciona um colaborador para consultar ou preencher os dados de processamento salarial do mês."
          onSelect={(c) => navigate(`/salarios/${c.id}`, { state: { nome: c.nome, email: c.email } })}
          renderHeaderExtra={
            canSeeFechoMensal
              ? () => (
                  <div className="flex items-center gap-2">
                    {canImportarRecibos && <ImportarRecibosButton />}
                    <ExportFechoMensalButton />
                    {canTerminarVencimento && (
                      <button
                        type="button"
                        onClick={() => setShowTerminarModal(true)}
                        disabled={closingUniversal}
                        title="Ação global: fecha o mês para todos os colaboradores que ainda não confirmaram - dias normais sem registo ficam como falta"
                        className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg border-0 cursor-pointer transition-colors bg-red-600 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        {closingUniversal ? "A fechar..." : "Terminar vencimento"}
                      </button>
                    )}
                  </div>
                )
              : undefined
          }
          renderGroupExtra={
            canSeeFechoMensal
              ? (entidade) => <ExportFechoMensalButton entidade={entidade} compact closed={entidadeClosedMap.get(entidade)} />
              : undefined
          }
          renderMemberExtra={
            canSeeFechoMensal
              ? (c) => (
                  <FechoMensalRowBadge
                    status={fechoStatusByUid.get(c.id)}
                    onSendReminder={() => handleSendReminder(c.id)}
                    sending={sendingUid === c.id}
                  />
                )
              : undefined
          }
        />
      </div>

      {showTerminarModal && (
        <TerminarVencimentoModal
          onConfirm={confirmTerminarVencimento}
          onCancel={() => setShowTerminarModal(false)}
          loading={closingUniversal}
        />
      )}
    </div>
  );
}
