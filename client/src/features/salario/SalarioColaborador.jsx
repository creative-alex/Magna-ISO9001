import React, { useCallback, useContext, useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { UserContext } from "../../shared/context/userContext";
import Sidebar from "../../shared/components/Sidebar";
import Topbar from "../../shared/components/Topbar";
import {
  FaSackDollar, FaCalendarDays, FaCreditCard, FaFileInvoiceDollar, FaCarSide,
  FaPencil, FaCheck, FaArrowLeft, FaArrowsRotate,
} from "react-icons/fa6";
import { apiFetch } from "../../shared/utils/apiFetch";
import { getNomeCurto } from "../../shared/utils/nomeCurto";

const GOLD = "#C8932F";

const ESCALAO_OPTIONS = ["I", "II", "III", "IV"];

const DESLOCACOES_FIELDS = [
  { key: "deslocacoes_ativas", label: "Tem deslocações este mês", type: "toggle" },
  { key: "deslocacoes_km", label: "Quilómetros", type: "number", conditionalOn: "deslocacoes_ativas" },
];

const SUBSIDIO_FIELDS = [
  { key: "cartao_coverflex", label: "Tem cartão coverflex", type: "toggle" },
];

const ALL_MONTHLY_FIELDS = [...DESLOCACOES_FIELDS, ...SUBSIDIO_FIELDS];
const INITIAL_FORM = ALL_MONTHLY_FIELDS.reduce((acc, f) => {
  acc[f.key] = f.type === "toggle" ? false : "";
  return acc;
}, {});

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
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

  const [mes, setMes] = useState(getCurrentMonth());
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [escalaoVencimento, setEscalaoVencimento] = useState("");
  const [valorBruto, setValorBruto] = useState(null);
  const [valorIsencao, setValorIsencao] = useState(null);
  const [temIsencaoHorario, setTemIsencaoHorario] = useState(false);
  const [valorSubsidioAlimentacao, setValorSubsidioAlimentacao] = useState(null);
  const [valorSubsidioAlimentacaoPagar, setValorSubsidioAlimentacaoPagar] = useState(null);
  const [valorKmDeslocacao, setValorKmDeslocacao] = useState(null);
  const [valorDeslocacoes, setValorDeslocacoes] = useState(null);
  const [diasTrabalhados, setDiasTrabalhados] = useState(null);
  const [diasFerias, setDiasFerias] = useState(null);
  const [diasBaixaMedica, setDiasBaixaMedica] = useState(null);
  const [diasFalta, setDiasFalta] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [reciboPath, setReciboPath] = useState(null);
  const [uploadingRecibo, setUploadingRecibo] = useState(false);
  const [viewingRecibo, setViewingRecibo] = useState(false);
  const isencaoDependePessoa = escalaoVencimento === "II";

  useEffect(() => {
    if (!canView) {
      navigate("/dashboard", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSalario = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true); else setLoading(true);
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
        setValorDeslocacoes(data.valor_deslocacoes);
        setDiasTrabalhados(data.dias_trabalhados);
        setDiasFerias(data.dias_ferias);
        setDiasBaixaMedica(data.dias_baixa_medica);
        setDiasFalta(data.dias_falta);
        setForm({ ...INITIAL_FORM, ...(data.form || {}) });
        setReciboPath(data.recibo_path || null);
        if (silent) toast.success("Dados do livro de ponto atualizados", { position: "top-right", autoClose: 2000 });
      } else {
        toast.error("Não foi possível carregar os dados salariais", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível carregar os dados salariais", { position: "top-right" });
    } finally {
      if (silent) setRefreshing(false); else setLoading(false);
    }
  }, [id, mes]);

  useEffect(() => {
    if (!canView) return;
    fetchSalario();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, mes]);

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

      <div className="ml-[230px] flex-1 flex flex-col min-h-screen">
        <Topbar icon="💰" title="Processamento Salários" />

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>

          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "18px 24px", display: "flex", alignItems: "center", gap: 16 }}>
            <button
              onClick={() => navigate(canManage ? "/salarios" : "/dashboard")}
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
                Processamento de salário  -  {nomeCurto}
              </div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 3 }}>
                {getMesLabel(mes)}
              </div>
            </div>
            <input
              type="month"
              value={mes}
              disabled={editMode || saving}
              onChange={e => e.target.value && setMes(e.target.value)}
              title={editMode ? "Termina a edição para mudar de mês" : "Mudar de mês"}
              style={{
                fontSize: 13, padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7,
                background: editMode ? "#f3f4f6" : "#fafafa", color: "#111827", flexShrink: 0,
              }}
            />
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
              A carregar dados salariais...
            </div>
          ) : (
            <>
              {/* Vencimento  -  escalão editável; valores vêm sempre da tabela de vencimentos */}
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8 }}>
                  <FaSackDollar style={{ color: GOLD, fontSize: 13 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Vencimento</span>
                  <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: "auto" }}>
                    Bruto vem da tabela de vencimento; isenção depende do escalão
                  </span>
                </div>
                <div style={{ padding: 18, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px 20px" }}>
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
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8 }}>
                  <FaCreditCard style={{ color: GOLD, fontSize: 13 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Subsídio de alimentação</span>
                  <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: "auto" }}>
                    {valorSubsidioAlimentacao != null ? `${valorSubsidioAlimentacao} €/dia` : "Valor por dia não definido"}
                  </span>
                </div>
                <div style={{ padding: 18, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px 20px" }}>
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
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8 }}>
                  <FaCarSide style={{ color: GOLD, fontSize: 13 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Deslocações</span>
                  <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: "auto" }}>
                    {valorKmDeslocacao != null ? `${valorKmDeslocacao} €/km` : "Valor por km não definido"}
                  </span>
                </div>
                <div style={{ padding: 18, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px 20px" }}>
                  {DESLOCACOES_FIELDS.filter(f => !f.conditionalOn || form[f.conditionalOn] === true).map(renderField)}
                  <div>
                    <span style={labelStyle}>Valor a receber (€)</span>
                    <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{valorDeslocacoes ?? " - "}</div>
                  </div>
                </div>
              </div>

              {/* Ajustes do mês  -  vem sempre do livro de ponto, não é editável aqui */}
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8 }}>
                  <FaCalendarDays style={{ color: GOLD, fontSize: 13 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Ajustes do mês</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>
                      Calculado a partir do livro de ponto
                    </span>
                    <button
                      type="button"
                      onClick={() => fetchSalario({ silent: true })}
                      disabled={editMode || loading || refreshing || saving}
                      title={editMode ? "Termina a edição para atualizar" : "Ir buscar os dias do livro de ponto outra vez"}
                      style={{
                        display: "flex", alignItems: "center", gap: 5,
                        padding: "4px 9px", fontSize: 11, fontWeight: 500,
                        border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", color: "#6b7280",
                        cursor: (editMode || loading || refreshing || saving) ? "not-allowed" : "pointer",
                        opacity: (editMode || loading || refreshing || saving) ? 0.5 : 1,
                      }}
                    >
                      <FaArrowsRotate style={{ fontSize: 10 }} />
                      {refreshing ? "A atualizar..." : "Atualizar"}
                    </button>
                  </div>
                </div>
                <div style={{ padding: 18, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px 20px" }}>
                  <div>
                    <span style={labelStyle}>Baixas</span>
                    <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{diasBaixaMedica ?? " - "}</div>
                  </div>
                  <div>
                    <span style={labelStyle}>Licenças</span>
                    <div style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500 }}> - </div>
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
                <div style={{ padding: 18, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px 20px" }}>
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
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
