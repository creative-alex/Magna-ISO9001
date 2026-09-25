import React, { useCallback, useContext, useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { UserContext } from "../../shared/context/userContext";
import Sidebar from "../../shared/components/Sidebar";
import Topbar from "../../shared/components/Topbar";
import {
  FaSackDollar, FaCalendarDays, FaCreditCard, FaFileInvoiceDollar, FaCarSide,
  FaPencil, FaCheck, FaArrowLeft, FaTrash, FaPlus,
} from "react-icons/fa6";
import { apiFetch } from "../../shared/utils/apiFetch";
import { usePermissions } from "../../shared/hooks/usePermissions";
import { getNomeCurto } from "../../shared/utils/nomeCurto";

const GOLD = "#C8932F";

const ESCALAO_OPTIONS = ["I", "II", "III", "IV"];

const SUBSIDIO_FIELDS = [
  { key: "cartao_coverflex", label: "Tem cartão coverflex", type: "toggle" },
];

const ALL_MONTHLY_FIELDS = [...SUBSIDIO_FIELDS];
const INITIAL_FORM = ALL_MONTHLY_FIELDS.reduce((acc, f) => {
  acc[f.key] = f.type === "toggle" ? false : "";
  return acc;
}, {});

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const EMPTY_DESLOCACAO_FORM = { id: null, data: "", motivo: "", origem: "", destino: "", idaEVolta: false };

// DD-MM-AAAA (formato guardado no backend) <-> AAAA-MM-DD (<input type="date">).
function dataParaInput(data) {
  if (!data) return "";
  const [d, m, y] = data.split("-");
  return `${y}-${m}-${d}`;
}
function inputParaData(valor) {
  const [y, m, d] = valor.split("-");
  return `${d}-${m}-${y}`;
}

function getUltimoDiaMes(mes) {
  const [y, m] = mes.split("-").map(Number);
  return `${mes}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
}

function getMesLabel(mes) {
  const [y, m] = mes.split("-");
  const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function SalarioColaborador() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { uid, username } = useContext(UserContext);
  const { isAdministrador, isAdminOrHR, isGestorFinanceiro, canViewPayroll, canEditPayroll } = usePermissions();
  // Aprovação de deslocações (ver api/domains/deslocacoes/): mesmo âmbito de
  // requireAdminOrHRorFinanceiro no backend - SuperAdmin/GestorRH/GestorFinanceiro.
  const canApproveDeslocacoes = isAdminOrHR || isGestorFinanceiro;
  // Edição exclusiva de SuperAdmin/Gestor Financeiro  -  GestorRH mantém consulta
  // (ver canViewList/canView) mas já não pode editar dados salariais.
  const canManage = canEditPayroll;
  const canViewList = canViewPayroll;
  const isSelf = uid === id;
  // Administrador só tem acesso de leitura (o backend confirma que o colaborador é da
  // sua entidade); nunca ganha canManage, por isso os botões de edição continuam ocultos.
  const canView = canViewList || isSelf || isAdministrador;
  // Quando o próprio colaborador é redirecionado para o seu salário (sem vir da
  // lista, logo sem "nome" na navegação), usa-se o nome do utilizador autenticado
  // em vez de cair no id em bruto  -  mesma lógica de Formação/Prémios/Medicina.
  const targetLabel = location.state?.nome || (isSelf ? username : null) || id;
  const nomeCurto = getNomeCurto(targetLabel);

  const [mes, setMes] = useState(getCurrentMonth());
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [escalaoVencimento, setEscalaoVencimento] = useState("");
  const [valorBruto, setValorBruto] = useState(null);
  const [valorIsencao, setValorIsencao] = useState(null);
  const [temIsencaoHorario, setTemIsencaoHorario] = useState(false);
  const [valorSubsidioAlimentacao, setValorSubsidioAlimentacao] = useState(null);
  const [valorSubsidioAlimentacaoPagar, setValorSubsidioAlimentacaoPagar] = useState(null);
  const [valorKmDeslocacao, setValorKmDeslocacao] = useState(null);
  const [deslocacoesKm, setDeslocacoesKm] = useState(null);
  const [valorDeslocacoes, setValorDeslocacoes] = useState(null);
  const [diasTrabalhados, setDiasTrabalhados] = useState(null);
  const [diasFerias, setDiasFerias] = useState(null);
  const [diasBaixaMedica, setDiasBaixaMedica] = useState(null);
  const [diasFalta, setDiasFalta] = useState(null);
  const [diasLicenca, setDiasLicenca] = useState(null);
  const [fechoConfirmado, setFechoConfirmado] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [reciboPath, setReciboPath] = useState(null);
  const [uploadingRecibo, setUploadingRecibo] = useState(false);
  const [viewingRecibo, setViewingRecibo] = useState(false);
  const [removingRecibo, setRemovingRecibo] = useState(false);
  const [deslocacoesPendentes, setDeslocacoesPendentes] = useState([]);
  const [processingDeslocacaoId, setProcessingDeslocacaoId] = useState(null);
  // Deslocações do mês selecionado (aprovadas e pendentes) + formulário de registar/editar
  // em nome do colaborador - mesmo âmbito de canApproveDeslocacoes.
  const [deslocacoesMes, setDeslocacoesMes] = useState([]);
  const [showDeslocacaoForm, setShowDeslocacaoForm] = useState(false);
  const [deslocacaoForm, setDeslocacaoForm] = useState(EMPTY_DESLOCACAO_FORM);
  const [submittingDeslocacao, setSubmittingDeslocacao] = useState(false);
  const isencaoDependePessoa = escalaoVencimento === "II";

  useEffect(() => {
    if (!canView) {
      navigate("/dashboard", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSalario = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/salario/${id}/${mes}`);
      if (res.ok) {
        const data = await res.json();
        setEscalaoVencimento(data.escalao_vencimento || "");
        setValorBruto(data.valor_vencimento_bruto);
        setValorIsencao(data.valor_isencao_horario_trabalho);
        setTemIsencaoHorario(!!data.tem_isencao_horario);
        setValorSubsidioAlimentacao(data.valor_subsidio_alimentacao);
        setValorSubsidioAlimentacaoPagar(data.valor_subsidio_alimentacao_pagar);
        setValorKmDeslocacao(data.valor_km_deslocacao);
        setDeslocacoesKm(data.deslocacoes_km);
        setValorDeslocacoes(data.valor_deslocacoes);
        setDiasTrabalhados(data.dias_trabalhados);
        setDiasFerias(data.dias_ferias);
        setDiasBaixaMedica(data.dias_baixa_medica);
        setDiasFalta(data.dias_falta);
        setDiasLicenca(data.dias_licenca);
        setFechoConfirmado(!!data.fecho_confirmado);
        setForm({ ...INITIAL_FORM, ...(data.form || {}) });
        setReciboPath(data.recibo_path || null);
      } else {
        toast.error("Não foi possível carregar os dados salariais", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível carregar os dados salariais", { position: "top-right" });
    } finally {
      setLoading(false);
    }
  }, [id, mes]);

  useEffect(() => {
    if (!canView) return;
    fetchSalario();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, mes]);

  // Todas as deslocações pendentes do colaborador (sem filtrar por mês, mesma convenção
  // de getPendingVacations/getPendingTimeEdits) - a lista pode ter viagens de meses
  // diferentes do que está selecionado acima.
  const fetchDeslocacoesPendentes = useCallback(async () => {
    if (!canApproveDeslocacoes) return;
    try {
      const res = await apiFetch("/deslocacoes/pending", {
        method: "POST",
        body: JSON.stringify({ uid: id }),
      });
      if (res.ok) {
        const data = await res.json();
        setDeslocacoesPendentes(data.pendentes || []);
      } else {
        setDeslocacoesPendentes([]);
      }
    } catch (e) {
      console.error(e);
      setDeslocacoesPendentes([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, canApproveDeslocacoes]);

  useEffect(() => {
    fetchDeslocacoesPendentes();
  }, [fetchDeslocacoesPendentes]);

  const fetchDeslocacoesMes = useCallback(async () => {
    if (!canApproveDeslocacoes) return;
    try {
      const res = await apiFetch("/deslocacoes/list", {
        method: "POST",
        body: JSON.stringify({ uid: id, mes }),
      });
      if (res.ok) {
        const data = await res.json();
        setDeslocacoesMes(data.deslocacoes || []);
      } else {
        setDeslocacoesMes([]);
      }
    } catch (e) {
      console.error(e);
      setDeslocacoesMes([]);
    }
  }, [id, mes, canApproveDeslocacoes]);

  useEffect(() => {
    fetchDeslocacoesMes();
    setShowDeslocacaoForm(false);
    setDeslocacaoForm(EMPTY_DESLOCACAO_FORM);
  }, [fetchDeslocacoesMes]);

  const refreshDeslocacoes = () => Promise.all([fetchDeslocacoesMes(), fetchDeslocacoesPendentes(), fetchSalario()]);

  const handleNovaDeslocacao = () => {
    setDeslocacaoForm(EMPTY_DESLOCACAO_FORM);
    setShowDeslocacaoForm(true);
  };

  const handleEditarDeslocacao = (d) => {
    setDeslocacaoForm({
      id: d.id, data: dataParaInput(d.data), motivo: d.motivo || "", origem: d.origem || "",
      destino: d.destino || "", idaEVolta: !!d.idaEVolta,
    });
    setShowDeslocacaoForm(true);
  };

  const handleCancelarDeslocacao = () => {
    setShowDeslocacaoForm(false);
    setDeslocacaoForm(EMPTY_DESLOCACAO_FORM);
  };

  const handleSubmitDeslocacao = async (e) => {
    e.preventDefault();
    const { id: deslocacaoId, data, motivo, origem, destino, idaEVolta } = deslocacaoForm;
    if (!data || !motivo.trim() || !origem.trim() || !destino.trim()) {
      toast.error("Preencha todos os campos da deslocação", { position: "top-right" });
      return;
    }
    const isEdit = !!deslocacaoId;
    // Um registo novo tem de ser do mês selecionado (o backend confirma); na edição a data
    // pode mudar de mês (ex.: corrigir uma viagem registada no mês errado).
    if (!isEdit && data.slice(0, 7) !== mes) {
      toast.error("A data da deslocação tem de pertencer ao mês selecionado", { position: "top-right" });
      return;
    }
    const errorMsg = isEdit ? "Falha ao atualizar a deslocação" : "Falha ao registar a deslocação";

    setSubmittingDeslocacao(true);
    try {
      const payload = {
        uid: id, data: inputParaData(data), motivo: motivo.trim(), origem: origem.trim(),
        destino: destino.trim(), idaEVolta,
      };
      const res = await apiFetch("/deslocacoes", {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify(isEdit ? { ...payload, id: deslocacaoId } : { ...payload, mes }),
      });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(resData.error || errorMsg, { position: "top-right" });
        return;
      }
      handleCancelarDeslocacao();
      await refreshDeslocacoes();
      toast.success(isEdit ? "Deslocação atualizada" : "Deslocação registada, aguarda aprovação", { position: "top-right", autoClose: 2500 });
    } catch (err) {
      console.error(err);
      toast.error(errorMsg, { position: "top-right" });
    } finally {
      setSubmittingDeslocacao(false);
    }
  };

  const handleApproveDeslocacao = async (deslocacao) => {
    setProcessingDeslocacaoId(deslocacao.id);
    try {
      const res = await apiFetch("/deslocacoes/approve", {
        method: "POST",
        body: JSON.stringify({ uid: id, id: deslocacao.id }),
      });
      if (res.ok) {
        await refreshDeslocacoes();
        toast.success("Deslocação aprovada", { position: "top-right", autoClose: 2000 });
      } else {
        toast.error("Falha ao aprovar a deslocação", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao aprovar a deslocação", { position: "top-right" });
    } finally {
      setProcessingDeslocacaoId(null);
    }
  };

  const handleRejectDeslocacao = async (deslocacao) => {
    setProcessingDeslocacaoId(deslocacao.id);
    try {
      const res = await apiFetch("/deslocacoes/reject", {
        method: "POST",
        body: JSON.stringify({ uid: id, id: deslocacao.id }),
      });
      if (res.ok) {
        await refreshDeslocacoes();
        toast.success("Deslocação rejeitada", { position: "top-right", autoClose: 2000 });
      } else {
        toast.error("Falha ao rejeitar a deslocação", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao rejeitar a deslocação", { position: "top-right" });
    } finally {
      setProcessingDeslocacaoId(null);
    }
  };

  const handleChange = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(`/salario/${id}/${mes}`, {
        method: "PUT",
        body: JSON.stringify({
          escalao_vencimento: escalaoVencimento,
          tem_isencao_horario: isencaoDependePessoa ? temIsencaoHorario : undefined,
          form,
        }),
      });
      if (res.ok) {
        setEditMode(false);
        await fetchSalario();
        toast.success("Dados salariais guardados", { position: "top-right", autoClose: 2500 });
      } else {
        toast.error("Falha ao guardar os dados salariais", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao guardar os dados salariais", { position: "top-right" });
    } finally {
      setSaving(false);
    }
  };

  const handleUploadRecibo = async (file) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("O recibo tem de ser um ficheiro PDF", { position: "top-right" });
      return;
    }
    setUploadingRecibo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiFetch(`/salario/${id}/${mes}/recibo`, { method: "POST", body: formData });
      if (res.ok) {
        await fetchSalario();
        toast.success("Recibo guardado e email enviado ao colaborador", { position: "top-right", autoClose: 3000 });
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Falha ao enviar o recibo", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao enviar o recibo", { position: "top-right" });
    } finally {
      setUploadingRecibo(false);
    }
  };

  const handleViewRecibo = async () => {
    if (!reciboPath) return;
    setViewingRecibo(true);
    try {
      const res = await apiFetch(`/files/download`, {
        method: "POST",
        body: JSON.stringify({ path: encodeURIComponent(reciboPath) }),
      });
      if (res.ok) {
        const blob = await res.blob();
        window.open(URL.createObjectURL(blob), "_blank");
      } else {
        toast.error("Falha ao abrir o recibo", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao abrir o recibo", { position: "top-right" });
    } finally {
      setViewingRecibo(false);
    }
  };

  const handleRemoveRecibo = async () => {
    setRemovingRecibo(true);
    try {
      const res = await apiFetch(`/salario/${id}/${mes}/recibo`, { method: "DELETE" });
      if (res.ok) {
        await fetchSalario();
        toast.success("Recibo removido", { position: "top-right", autoClose: 2000 });
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Falha ao remover o recibo", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao remover o recibo", { position: "top-right" });
    } finally {
      setRemovingRecibo(false);
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

    if (type === "toggle") {
      const isTrue = !!value;
      return (
        <div key={key}>
          <span style={labelStyle}>{label}</span>
          {editMode ? (
            <div style={{ display: "flex", gap: 6 }}>
              {[["Sim", true], ["Não", false]].map(([txt, v]) => (
                <button
                  key={txt}
                  type="button"
                  onClick={() => handleChange(key, v)}
                  style={{
                    flex: 1, padding: "6px 0", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    borderRadius: 6, border: `1px solid ${isTrue === v ? GOLD : "#e5e7eb"}`,
                    background: isTrue === v ? GOLD : "#fff",
                    color: isTrue === v ? "#fff" : "#6b7280",
                    transition: "all 0.15s",
                  }}
                >
                  {txt}
                </button>
              ))}
            </div>
          ) : (
            <span style={{
              display: "inline-block", fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
              background: isTrue ? "#DCFCE7" : "#F3F4F6", color: isTrue ? "#15803D" : "#374151",
            }}>
              {isTrue ? "Sim" : "Não"}
            </span>
          )}
        </div>
      );
    }

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

      <div className="ml-[var(--sidebar-w,230px)] transition-[margin-left] duration-200 flex-1 min-w-0 flex flex-col min-h-screen">
        <Topbar icon="💰" title="Processamento Salários" />

        <div className="p-4 sm:p-6" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          <div
            className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
            style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "16px 18px" }}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 min-w-0" style={{ flex: 1 }}>
              <button
                onClick={() => navigate(canViewList ? "/salarios" : "/dashboard")}
                title={canViewList ? "Voltar à lista de colaboradores" : "Voltar ao dashboard"}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 32, height: 32, border: "1px solid #e5e7eb", borderRadius: 7,
                  background: "#fff", color: "#6b7280", cursor: "pointer", flexShrink: 0,
                }}
              >
                <FaArrowLeft style={{ fontSize: 12 }} />
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#111827" }}>
                  Processamento de salário  -  {nomeCurto}
                </div>
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 3 }}>
                  {getMesLabel(mes)}
                </div>
              </div>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <input
                type="month"
                value={mes}
                disabled={editMode || saving}
                onChange={e => e.target.value && setMes(e.target.value)}
                title={editMode ? "Termina a edição para mudar de mês" : "Mudar de mês"}
                className="flex-1 sm:flex-none"
                style={{
                  fontSize: 13, padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7,
                  background: editMode ? "#f3f4f6" : "#fafafa", color: "#111827", minWidth: 0,
                }}
              />
              {canManage && (
                <button
                  disabled={saving}
                  onClick={() => { if (editMode) handleSave(); else setEditMode(true); }}
                  className="flex-1 sm:flex-none"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    padding: "8px 16px", fontSize: 13, fontWeight: 500, cursor: saving ? "wait" : "pointer",
                    border: `1px solid ${editMode ? "#22c55e" : GOLD}`,
                    borderRadius: 7, background: "#fff",
                    color: editMode ? "#22c55e" : GOLD,
                    transition: "all 0.15s", opacity: saving ? 0.6 : 1,
                  }}
                >
                  {saving
                    ? "A guardar..."
                    : editMode ? <><FaCheck style={{ fontSize: 12 }} /> Guardar</> : <><FaPencil style={{ fontSize: 12 }} /> Editar</>}
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 40, textAlign: "center", fontSize: 13, color: "#9ca3af" }}>
              A carregar dados salariais...
            </div>
          ) : (
            <>
              {/* Vencimento  -  escalão editável; valores vêm sempre da tabela de vencimentos */}
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <FaSackDollar style={{ color: GOLD, fontSize: 13 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Vencimento</span>
                  <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: "auto" }}>
                    Bruto vem da tabela de vencimento; isenção depende do escalão
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ padding: 18, gap: "16px 20px" }}>
                  <div>
                    <span style={labelStyle}>Escalão de vencimento</span>
                    {editMode ? (
                      <select value={escalaoVencimento} onChange={e => setEscalaoVencimento(e.target.value)} style={inputStyle}>
                        <option value="">Selecionar...</option>
                        {ESCALAO_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{escalaoVencimento || " - "}</div>
                    )}
                  </div>
                  <div>
                    <span style={labelStyle}>Valor de vencimento bruto (€)</span>
                    <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{valorBruto ?? " - "}</div>
                  </div>
                  <div>
                    <span style={labelStyle}>Tem isenção de horário</span>
                    {escalaoVencimento === "I" ? (
                      <div style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500 }}>Nunca</div>
                    ) : !isencaoDependePessoa ? (
                      <div style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500 }}>Sempre (escalão {escalaoVencimento})</div>
                    ) : editMode ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        {[["Sim", true], ["Não", false]].map(([txt, v]) => (
                          <button
                            key={txt}
                            type="button"
                            onClick={() => setTemIsencaoHorario(v)}
                            style={{
                              flex: 1, padding: "6px 0", fontSize: 12, fontWeight: 600, cursor: "pointer",
                              borderRadius: 6, border: `1px solid ${temIsencaoHorario === v ? GOLD : "#e5e7eb"}`,
                              background: temIsencaoHorario === v ? GOLD : "#fff",
                              color: temIsencaoHorario === v ? "#fff" : "#6b7280",
                              transition: "all 0.15s",
                            }}
                          >
                            {txt}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span style={{
                        display: "inline-block", fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                        background: temIsencaoHorario ? "#DCFCE7" : "#F3F4F6", color: temIsencaoHorario ? "#15803D" : "#374151",
                      }}>
                        {temIsencaoHorario ? "Sim" : "Não"}
                      </span>
                    )}
                  </div>
                  <div>
                    <span style={labelStyle}>Valor de isenção de horário de trabalho (€)</span>
                    <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{valorIsencao ?? " - "}</div>
                  </div>
                </div>
              </div>

              {/* Subsídio de alimentação  -  valor/dia fixo (parâmetros gerais); só varia o cartão e os dias trabalhados */}
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <FaCreditCard style={{ color: GOLD, fontSize: 13 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Subsídio de alimentação</span>
                  <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: "auto" }}>
                    {valorSubsidioAlimentacao != null ? `${valorSubsidioAlimentacao} €/dia` : "Valor por dia não definido"}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3" style={{ padding: 18, gap: "16px 20px" }}>
                  {SUBSIDIO_FIELDS.map(renderField)}
                  <div>
                    <span style={labelStyle}>Dias trabalhados</span>
                    <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{diasTrabalhados ?? " - "}</div>
                  </div>
                  <div>
                    <span style={labelStyle}>Valor a receber (€)</span>
                    <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{valorSubsidioAlimentacaoPagar ?? " - "}</div>
                  </div>
                </div>
              </div>

              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <FaCarSide style={{ color: GOLD, fontSize: 13 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Deslocações</span>
                  <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: "auto" }}>
                    {valorKmDeslocacao != null ? `${valorKmDeslocacao} €/km` : "Valor por km não definido"}
                  </span>
                </div>
                {/* Calculado a partir das deslocações aprovadas no Fecho Mensal (ver
                    api/domains/deslocacoes/) - deixou de ser editável aqui. */}
                <div className="grid grid-cols-1 sm:grid-cols-3" style={{ padding: 18, gap: "16px 20px" }}>
                  <div>
                    <span style={labelStyle}>Quilómetros aprovados</span>
                    <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{deslocacoesKm ?? " - "}</div>
                  </div>
                  <div>
                    <span style={labelStyle}>Valor a receber (€)</span>
                    <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{valorDeslocacoes ?? " - "}</div>
                  </div>
                </div>

                {/* Registo/edição em nome do colaborador pela GestorRH/GestorFinanceiro (ou
                    SuperAdmin) - ver updateDeslocacao/resolveDeslocacaoTargetUid no backend.
                    Um registo novo entra pendente, como qualquer outro. */}
                {canApproveDeslocacoes && (
                  <div style={{ borderTop: "1px solid #f3f4f6", padding: 18 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: GOLD, textTransform: "uppercase", letterSpacing: 0.4 }}>
                        Deslocações de {getMesLabel(mes)}
                      </span>
                      {!showDeslocacaoForm && (
                        <button
                          type="button"
                          onClick={handleNovaDeslocacao}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", fontSize: 11, fontWeight: 600,
                            cursor: "pointer", borderRadius: 6, border: `1px solid ${GOLD}`, background: "#fff", color: GOLD,
                          }}
                        >
                          <FaPlus size={9} /> Adicionar deslocação
                        </button>
                      )}
                    </div>

                    {showDeslocacaoForm && (
                      <form onSubmit={handleSubmitDeslocacao} style={{ background: "#FAF3E6", borderRadius: 8, padding: 12, marginBottom: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 10 }}>
                          {deslocacaoForm.id ? "Editar deslocação" : "Nova deslocação"}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: "10px 14px" }}>
                          <div>
                            <span style={labelStyle}>Data</span>
                            <input
                              type="date" required value={deslocacaoForm.data}
                              min={deslocacaoForm.id ? undefined : `${mes}-01`}
                              max={deslocacaoForm.id ? undefined : getUltimoDiaMes(mes)}
                              onChange={(e) => setDeslocacaoForm((f) => ({ ...f, data: e.target.value }))}
                              style={{ ...inputStyle, background: "#fff" }}
                            />
                          </div>
                          <div>
                            <span style={labelStyle}>Motivo de Deslocação</span>
                            <input
                              type="text" required value={deslocacaoForm.motivo}
                              onChange={(e) => setDeslocacaoForm((f) => ({ ...f, motivo: e.target.value }))}
                              style={{ ...inputStyle, background: "#fff" }}
                            />
                          </div>
                          <div>
                            <span style={labelStyle}>Origem (morada)</span>
                            <input
                              type="text" required value={deslocacaoForm.origem}
                              onChange={(e) => setDeslocacaoForm((f) => ({ ...f, origem: e.target.value }))}
                              style={{ ...inputStyle, background: "#fff" }}
                            />
                          </div>
                          <div>
                            <span style={labelStyle}>Destino (morada)</span>
                            <input
                              type="text" required value={deslocacaoForm.destino}
                              onChange={(e) => setDeslocacaoForm((f) => ({ ...f, destino: e.target.value }))}
                              style={{ ...inputStyle, background: "#fff" }}
                            />
                          </div>
                        </div>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#4b5563", marginTop: 10, cursor: "pointer" }}>
                          <input
                            type="checkbox" checked={deslocacaoForm.idaEVolta}
                            onChange={(e) => setDeslocacaoForm((f) => ({ ...f, idaEVolta: e.target.checked }))}
                          />
                          Fez o regresso no mesmo dia (ida e volta)
                        </label>
                        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                          <button
                            type="submit" disabled={submittingDeslocacao}
                            style={{
                              padding: "5px 14px", fontSize: 11, fontWeight: 600, cursor: submittingDeslocacao ? "wait" : "pointer",
                              borderRadius: 6, border: `1px solid ${GOLD}`, background: GOLD, color: "#fff", opacity: submittingDeslocacao ? 0.6 : 1,
                            }}
                          >
                            {submittingDeslocacao ? "A calcular..." : "Guardar"}
                          </button>
                          <button
                            type="button" disabled={submittingDeslocacao} onClick={handleCancelarDeslocacao}
                            style={{
                              padding: "5px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                              borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", color: "#6b7280",
                            }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    )}

                    {deslocacoesMes.length === 0 ? (
                      <div style={{ fontSize: 12, color: "#9ca3af" }}>Sem deslocações registadas neste mês.</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {deslocacoesMes.map((d) => (
                          <div key={d.id} style={{ border: "1px solid #f3f4f6", borderRadius: 8, padding: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 12.5, fontWeight: 600, color: "#374151" }}>{d.data}</span>
                                <span style={{
                                  fontSize: 10.5, padding: "1px 8px", borderRadius: 999, fontWeight: 500,
                                  background: d.Approved ? "#DCFCE7" : "#FEF3C7", color: d.Approved ? "#15803D" : "#92400E",
                                }}>
                                  {d.Approved ? "Aprovada" : "Pendente"}
                                </span>
                              </div>
                              <button
                                type="button"
                                disabled={submittingDeslocacao}
                                onClick={() => handleEditarDeslocacao(d)}
                                style={{
                                  display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", fontSize: 11, fontWeight: 600,
                                  cursor: "pointer", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", color: "#374151",
                                }}
                              >
                                <FaPencil size={9} /> Editar
                              </button>
                            </div>
                            <span style={{ fontSize: 11.5, color: "#374151" }}>
                              {d.origem} → {d.destino}{d.idaEVolta ? ` → ${d.origem}` : ""} · {d.km} km{d.idaEVolta ? " (ida e volta)" : ""}
                              {d.valor != null ? ` · ${d.valor.toFixed(2)} €` : ""}
                            </span>
                            <span style={{ fontSize: 11.5, color: "#6b7280", fontStyle: "italic" }}>
                              Motivo de Deslocação: {d.motivo}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Aprovação pela GestorRH (ou SuperAdmin) - mesmo âmbito de requireAdminOrHR
                    no backend, independente de canManage (GestorFinanceiro não aprova). Sem
                    filtro por mês: mostra pendentes de qualquer mês, tal como
                    getPendingVacations/getPendingTimeEdits. */}
                {canApproveDeslocacoes && deslocacoesPendentes.length > 0 && (
                  <div style={{ borderTop: "1px solid #f3f4f6", padding: 18 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: GOLD, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 10 }}>
                      Deslocações Pendentes
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {deslocacoesPendentes.map((d) => (
                        <div key={d.id} style={{ background: "#FAF3E6", borderRadius: 8, padding: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                            <span style={{ fontSize: 12.5, fontWeight: 600, color: "#374151" }}>{d.data}</span>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                type="button"
                                disabled={processingDeslocacaoId === d.id}
                                onClick={() => handleEditarDeslocacao(d)}
                                style={{
                                  padding: "4px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                                  borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", color: "#374151",
                                }}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                disabled={processingDeslocacaoId === d.id}
                                onClick={() => handleApproveDeslocacao(d)}
                                style={{
                                  padding: "4px 12px", fontSize: 11, fontWeight: 600, cursor: processingDeslocacaoId === d.id ? "wait" : "pointer",
                                  borderRadius: 6, border: `1px solid ${GOLD}`, background: GOLD, color: "#fff",
                                  opacity: processingDeslocacaoId === d.id ? 0.6 : 1,
                                }}
                              >
                                Aprovar
                              </button>
                              <button
                                type="button"
                                disabled={processingDeslocacaoId === d.id}
                                onClick={() => handleRejectDeslocacao(d)}
                                style={{
                                  padding: "4px 12px", fontSize: 11, fontWeight: 600, cursor: processingDeslocacaoId === d.id ? "wait" : "pointer",
                                  borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", color: "#6b7280",
                                  opacity: processingDeslocacaoId === d.id ? 0.6 : 1,
                                }}
                              >
                                Negar
                              </button>
                            </div>
                          </div>
                          <span style={{ fontSize: 11.5, color: "#374151" }}>
                            Trajétoria: &nbsp; 
                             {d.origem} → {d.destino}{d.idaEVolta ? ` → ${d.origem}` : ""} · {d.km} km{d.idaEVolta ? " (ida e volta)" : ""}
                             {d.valor != null ? ` · ${d.valor.toFixed(2)} €` : ""}
                          </span>
                          <span style={{ fontSize: 11.5, color: "#6b7280", fontStyle: "italic" }}>
                            Motivo de Deslocação: {d.motivo}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Ajustes do mês  -  vem sempre do livro de ponto, não é editável aqui */}
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <FaCalendarDays style={{ color: GOLD, fontSize: 13 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Ajustes do mês</span>
                  <span
                    style={{
                      fontSize: 11, marginLeft: "auto", padding: "2px 8px", borderRadius: 999, fontWeight: 500,
                      background: fechoConfirmado ? "#DCFCE7" : "#FEF3C7",
                      color: fechoConfirmado ? "#15803D" : "#92400E",
                    }}
                    title={fechoConfirmado ? "Dados fixos pela confirmação do fecho mensal" : "Ainda não confirmado pelo colaborador - calculado ao vivo a partir do livro de ponto"}
                  >
                    {fechoConfirmado ? "Fecho mensal confirmado" : "Fecho mensal não confirmado"}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ padding: 18, gap: "16px 20px" }}>
                  <div>
                    <span style={labelStyle}>Baixas</span>
                    <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{diasBaixaMedica ?? " - "}</div>
                  </div>
                  <div>
                    <span style={labelStyle}>Licenças</span>
                    <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{diasLicenca ?? " - "}</div>
                  </div>
                  <div>
                    <span style={labelStyle}>Faltas</span>
                    <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{diasFalta ?? " - "}</div>
                  </div>
                  <div>
                    <span style={labelStyle}>Férias</span>
                    <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{diasFerias ?? " - "}</div>
                  </div>
                </div>
              </div>

              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8 }}>
                  <FaFileInvoiceDollar style={{ color: GOLD, fontSize: 13 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Recibos</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3" style={{ padding: 18, gap: "16px 20px" }}>
                  <div>
                    <span style={labelStyle}>Recibo emitido/enviado este mês</span>
                    <span style={{
                      display: "inline-block", fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                      background: reciboPath ? "#DCFCE7" : "#F3F4F6", color: reciboPath ? "#15803D" : "#374151",
                    }}>
                      {reciboPath ? "Sim" : "Não"}
                    </span>
                  </div>
                  <div>
                    <span style={labelStyle}>Recibo (PDF)</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {editMode && (
                        <label
                          style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "6px 12px", fontSize: 12, fontWeight: 500,
                            border: `1px solid ${GOLD}`, borderRadius: 7, background: "#fff", color: GOLD,
                            cursor: uploadingRecibo ? "wait" : "pointer",
                            opacity: uploadingRecibo ? 0.6 : 1,
                          }}
                        >
                          {uploadingRecibo ? "A enviar..." : reciboPath ? "Substituir" : "Enviar recibo"}
                          <input
                            type="file"
                            accept="application/pdf"
                            disabled={uploadingRecibo}
                            onChange={e => {
                              const file = e.target.files?.[0];
                              e.target.value = "";
                              handleUploadRecibo(file);
                            }}
                            style={{ display: "none" }}
                          />
                        </label>
                      )}
                      {reciboPath && (
                        <button
                          type="button"
                          onClick={handleViewRecibo}
                          disabled={viewingRecibo}
                          style={{
                            padding: "6px 12px", fontSize: 12, fontWeight: 500, cursor: viewingRecibo ? "wait" : "pointer",
                            border: "1px solid #e5e7eb", borderRadius: 7, background: "#fff", color: "#6b7280",
                          }}
                        >
                          {viewingRecibo ? "A abrir..." : "Ver"}
                        </button>
                      )}
                      {reciboPath && canManage && (
                        <button
                          type="button"
                          onClick={handleRemoveRecibo}
                          disabled={removingRecibo}
                          title="Remover recibo"
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "center",
                            width: 30, height: 30, cursor: removingRecibo ? "wait" : "pointer",
                            border: "1px solid #fee2e2", borderRadius: 7, background: "#fff", color: "#dc2626",
                          }}
                        >
                          <FaTrash style={{ fontSize: 11 }} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
