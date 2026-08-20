import React, { useContext, useState, useRef, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { UserContext } from "../context/userContext";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import {
  FaUser, FaLocationDot, FaIdCard, FaUsers, FaFileContract,
  FaGraduationCap, FaCloudArrowUp, FaArrowUpRightFromSquare,
  FaCircleMinus, FaPencil, FaCheck, FaArrowLeft,
} from "react-icons/fa6";
import { apiFetch } from "../utils/apiFetch";
import { getNomeCurto } from "../utils/nomeCurto";

const GOLD = "#C8932F";

const SITUACAO_FAMILIAR_OPTIONS = ["Solteiro(a)", "Casado(a)", "União de facto", "Divorciado(a)", "Viúvo(a)"];
const TIPO_CONTRATO_OPTIONS = [
  "Contrato sem termo", "Contrato a termo certo", "Contrato a termo incerto",
  "Prestação de serviços", "Contrato de estágio", "Outro",
];
const SITUACAO_CONTRATUAL_OPTIONS = ["Ativo", "Suspenso", "Cessado", "Reformado"];
const TIPO_CONTRATO_ESTAGIO = "Contrato de estágio";

const SECTIONS = [
  {
    title: "Dados pessoais",
    Icon: FaUser,
    fields: [
      { key: "nome_completo", label: "Nome completo", type: "text" },
      { key: "data_nascimento", label: "Data de nascimento", type: "date" },
    ],
  },
  {
    title: "Morada e contactos",
    Icon: FaLocationDot,
    fields: [
      { key: "morada", label: "Morada", type: "text" },
      { key: "codigo_postal", label: "Código postal", type: "text", placeholder: "0000-000" },
      { key: "localidade", label: "Localidade", type: "text" },
      { key: "telefone", label: "Telefone", type: "tel" },
      { key: "email_profissional", label: "Email profissional", type: "email" },
    ],
  },
  {
    title: "Identificação civil e fiscal",
    Icon: FaIdCard,
    fields: [
      { key: "n_cartao_cidadao", label: "Nº cartão de cidadão", type: "text" },
      { key: "nif", label: "NIF", type: "text" },
      { key: "n_seguranca_social", label: "Nº segurança social", type: "text" },
      { key: "digitalizacao_cc", label: "Digitalização CC (frente e verso)", type: "file" },
    ],
  },
  {
    title: "Situação familiar",
    Icon: FaUsers,
    fields: [
      { key: "situacao_familiar", label: "Situação familiar", type: "select", options: SITUACAO_FAMILIAR_OPTIONS },
      { key: "n_dependentes", label: "Nº dependentes", type: "number" },
      { key: "n_dependentes_deficientes", label: "Nº dependentes com deficiência", type: "number" },
      { key: "declarante_deficiente", label: "Declarante com deficiência", type: "toggle" },
      { key: "conjuge_deficiente", label: "Cônjuge com deficiência", type: "toggle" },
    ],
  },
  {
    title: "Formação e habilitações",
    Icon: FaGraduationCap,
    fields: [
      { key: "habilitacoes", label: "Habilitações literárias", type: "text" },
      { key: "ccp", label: "CCP (Certificado de Competências Pedagógicas)", type: "text" },
      { key: "cv_atualizado", label: "CV atualizado", type: "toggle" },
      { key: "ficha_dgert_atualizada", label: "Ficha curricular DGERT atualizada", type: "toggle" },
      { key: "digitalizacao_cv_original", label: "Digitalização do CV original", type: "file" },
    ],
  },
  {
    title: "Contrato de trabalho",
    Icon: FaFileContract,
    restricted: true,
    monthHistory: true,
    fields: [
      { key: "tipo_contrato", label: "Tipo de contrato celebrado", type: "select", options: TIPO_CONTRATO_OPTIONS },
      { key: "situacao_contratual", label: "Situação contratual", type: "select", options: SITUACAO_CONTRATUAL_OPTIONS },

      // Campos abaixo só se aplicam a contratos que não sejam de estágio profissional
      { key: "funcao", label: "Função", type: "text", showIf: f => f.tipo_contrato !== TIPO_CONTRATO_ESTAGIO },
      { key: "data_admissao", label: "Data de admissão", type: "date", showIf: f => f.tipo_contrato !== TIPO_CONTRATO_ESTAGIO },
      { key: "data_fim_contrato", label: "Data de fim de contrato", type: "date", showIf: f => f.tipo_contrato !== TIPO_CONTRATO_ESTAGIO },
      { key: "digitalizacao_contrato", label: "Digitalização do contrato (todas as páginas)", type: "file", showIf: f => f.tipo_contrato !== TIPO_CONTRATO_ESTAGIO },
      { key: "cedencia_temporaria", label: "Cedência temporária", type: "toggle", showIf: f => f.tipo_contrato !== TIPO_CONTRATO_ESTAGIO },
      { key: "entidade_cedencia_temporaria", label: "Entidade de cedência temporária", type: "text", showIf: f => f.tipo_contrato !== TIPO_CONTRATO_ESTAGIO && f.cedencia_temporaria === true },
      { key: "data_inicio_cedencia", label: "Data de início da cedência", type: "date", showIf: f => f.tipo_contrato !== TIPO_CONTRATO_ESTAGIO && f.cedencia_temporaria === true },
      { key: "data_fim_cedencia", label: "Data de fim da cedência", type: "date", showIf: f => f.tipo_contrato !== TIPO_CONTRATO_ESTAGIO && f.cedencia_temporaria === true },
      { key: "digitalizacao_contrato_cedencia", label: "Digitalização do contrato de cedência temporária", type: "file", showIf: f => f.tipo_contrato !== TIPO_CONTRATO_ESTAGIO && f.cedencia_temporaria === true },
      { key: "digitalizacao_acordos_desvinculacao", label: "Digitalização de acordos de desvinculação", type: "file", showIf: f => f.tipo_contrato !== TIPO_CONTRATO_ESTAGIO },
      { key: "baixa_medica", label: "Em baixa/licença médica", type: "toggle", showIf: f => f.tipo_contrato !== TIPO_CONTRATO_ESTAGIO },
      { key: "data_inicio_baixa_medica", label: "Data de início da baixa/licença", type: "date", showIf: f => f.tipo_contrato !== TIPO_CONTRATO_ESTAGIO && f.baixa_medica === true },
      { key: "data_fim_baixa_medica", label: "Data de fim (prevista)", type: "date", showIf: f => f.tipo_contrato !== TIPO_CONTRATO_ESTAGIO && f.baixa_medica === true },
      { key: "digitalizacao_comprovativo_baixa_medica", label: "Digitalização do comprovativo médico", type: "file", showIf: f => f.tipo_contrato !== TIPO_CONTRATO_ESTAGIO && f.baixa_medica === true },

      // Campos abaixo só se aplicam a contratos de estágio profissional
      { key: "funcao_estagio", label: "Função no estágio", type: "text", showIf: f => f.tipo_contrato === TIPO_CONTRATO_ESTAGIO },
      { key: "n_processo_estagio", label: "Nº de processo", type: "text", showIf: f => f.tipo_contrato === TIPO_CONTRATO_ESTAGIO },
      { key: "duracao_estagio", label: "Duração do estágio", type: "text", placeholder: "ex: 9 meses", showIf: f => f.tipo_contrato === TIPO_CONTRATO_ESTAGIO },
      { key: "data_inicio_estagio", label: "Data de início do estágio", type: "date", showIf: f => f.tipo_contrato === TIPO_CONTRATO_ESTAGIO },
      { key: "data_fim_estagio", label: "Data de fim do estágio", type: "date", showIf: f => f.tipo_contrato === TIPO_CONTRATO_ESTAGIO },
      { key: "entidade_financiadora", label: "Entidade financiadora", type: "text", showIf: f => f.tipo_contrato === TIPO_CONTRATO_ESTAGIO },
      { key: "valor_apoio_entidade", label: "Valor do apoio à entidade (€)", type: "number", showIf: f => f.tipo_contrato === TIPO_CONTRATO_ESTAGIO },
      { key: "digitalizacao_contrato_estagio", label: "Digitalização do contrato de estágio", type: "file", showIf: f => f.tipo_contrato === TIPO_CONTRATO_ESTAGIO },
      { key: "outra_documentacao_estagio", label: "Outra documentação de estágio", type: "file", showIf: f => f.tipo_contrato === TIPO_CONTRATO_ESTAGIO },
    ],
  },
];

function getCurrentMonthStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const CONTRATO_HISTORY_SECTION = SECTIONS.find(s => s.monthHistory);
const CONTRATO_HISTORY_KEYS = CONTRATO_HISTORY_SECTION.fields.filter(f => f.type !== "file").map(f => f.key);

const ALL_FIELDS = SECTIONS.flatMap(s => s.fields);
const INITIAL_FORM = ALL_FIELDS.filter(f => f.type !== "file").reduce((acc, f) => {
  acc[f.key] = f.type === "toggle" ? false : "";
  return acc;
}, {});

export default function Cadastro() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { username, uid, nivelAcesso, setUsername } = useContext(UserContext);
  const isAdmin = nivelAcesso === "SuperAdmin";
  const isHR = nivelAcesso === "GestorRH";
  const canEditRestricted = isAdmin || isHR;
  const isViewingOther = !!id;
  const targetKey = id || uid;
  const targetLabel = isViewingOther ? (location.state?.nome || id) : username;

  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [docRefs, setDocRefs] = useState({});
  const [contratoHistorico, setContratoHistorico] = useState({});
  const [historyMonth, setHistoryMonth] = useState(getCurrentMonthStr());
  const nomeCurto = getNomeCurto(form.nome_completo) || targetLabel;
  const [uploading, setUploading] = useState({});
  const [viewing, setViewing] = useState({});
  const fileInputRefs = useRef({});

  useEffect(() => {
    if (isViewingOther && !isAdmin && !isHR) {
      navigate("/cadastro", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isViewingOther, isAdmin, isHR]);

  const fetchCadastro = async () => {
    const res = await apiFetch(`/cadastro/${targetKey}`);
    if (res.ok) {
      const data = await res.json();
      setForm({ ...INITIAL_FORM, ...(data.form || {}) });
      setDocRefs(data.docs || {});
      setContratoHistorico(data.contratoHistorico || {});
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (!targetKey) return;
    setLoading(true);
    (async () => {
      try {
        const ok = await fetchCadastro();
        if (!ok) toast.error("Não foi possível carregar a ficha de cadastro", { position: "top-right" });
      } catch (e) {
        console.error(e);
        toast.error("Não foi possível carregar a ficha de cadastro", { position: "top-right" });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey]);

  const handleChange = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(`/cadastro/${targetKey}`, {
        method: "PUT",
        body: JSON.stringify({ form, docs: docRefs }),
      });
      if (res.ok) {
        await fetchCadastro();
        setEditMode(false);
        if (!isViewingOther && nomeCurto) setUsername(nomeCurto);
        toast.success("Ficha de cadastro guardada", { position: "top-right", autoClose: 2500 });
      } else {
        toast.error("Falha ao guardar a ficha de cadastro", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao guardar a ficha de cadastro", { position: "top-right" });
    } finally {
      setSaving(false);
    }
  };

  const resolveContratoSnapshotForMonth = (mes) => {
    const keys = Object.keys(contratoHistorico).sort();
    let snapshot;
    for (const k of keys) {
      if (k <= mes) snapshot = contratoHistorico[k];
      else break;
    }
    if (snapshot) return snapshot;
    if (keys.length === 0) {
      // Ainda não há histórico guardado (cadastro anterior a esta funcionalidade) — melhor esforço com os dados atuais.
      return CONTRATO_HISTORY_KEYS.reduce((acc, key) => { acc[key] = form[key]; return acc; }, {});
    }
    return null;
  };

  const handleDocUpload = async (docKey, file) => {
    if (!file) return;
    setUploading(prev => ({ ...prev, [docKey]: true }));
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folderPath", `Cadastro/${targetKey}/`);
      const res = await apiFetch(`/files/upload-document`, { method: "POST", body: formData });
      if (res.ok) {
        setDocRefs(prev => ({ ...prev, [docKey]: { name: file.name, path: `Cadastro/${targetKey}/${file.name}` } }));
      } else {
        toast.error("Falha ao enviar ficheiro", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao enviar ficheiro", { position: "top-right" });
    } finally {
      setUploading(prev => ({ ...prev, [docKey]: false }));
    }
  };

  const handleViewDoc = async (docKey) => {
    const ref = docRefs[docKey];
    if (!ref) return;
    setViewing(prev => ({ ...prev, [docKey]: true }));
    try {
      const res = await apiFetch(`/files/download`, {
        method: "POST",
        body: JSON.stringify({ path: encodeURIComponent(ref.path) }),
      });
      if (res.ok) {
        const blob = await res.blob();
        window.open(URL.createObjectURL(blob), "_blank");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setViewing(prev => ({ ...prev, [docKey]: false }));
    }
  };

  const inputStyle = {
    width: "100%", fontSize: 13, color: "#111827", fontWeight: 500,
    border: "1px solid #e5e7eb", borderRadius: 6, padding: "7px 9px",
    outline: "none", background: editMode ? "#fafafa" : "#fff",
    boxSizing: "border-box",
  };

  const labelStyle = { fontSize: 11, color: "#6b7280", marginBottom: 4, display: "block" };

  const renderValue = (field, dataSource) => {
    const value = dataSource[field.key];
    if (field.type === "date" && value) {
      const [y, m, d] = value.split("-");
      return `${d}/${m}/${y}`;
    }
    if (field.type === "select" || field.type === "text" || field.type === "email" || field.type === "tel" || field.type === "number") {
      return value || "—";
    }
    return "—";
  };

  const renderField = (field, editable, dataSource = form) => {
    const { key, label, type, options, placeholder } = field;

    if (type === "toggle") {
      const value = !!dataSource[key];
      return (
        <div key={key}>
          <span style={labelStyle}>{label}</span>
          {editable ? (
            <div style={{ display: "flex", gap: 6 }}>
              {[["Sim", true], ["Não", false]].map(([txt, v]) => (
                <button
                  key={txt}
                  type="button"
                  onClick={() => handleChange(key, v)}
                  style={{
                    flex: 1, padding: "6px 0", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    borderRadius: 6, border: `1px solid ${value === v ? GOLD : "#e5e7eb"}`,
                    background: value === v ? GOLD : "#fff",
                    color: value === v ? "#fff" : "#6b7280",
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
              background: value ? "#DCFCE7" : "#F3F4F6", color: value ? "#15803D" : "#374151",
            }}>
              {value ? "Sim" : "Não"}
            </span>
          )}
        </div>
      );
    }

    if (type === "file") {
      const ref = docRefs[key];
      const isUploading = uploading[key];
      const isViewing = viewing[key];
      const hasFile = !!ref;
      const isActive = editable || hasFile;
      return (
        <div key={key} style={{ gridColumn: "1 / -1" }}>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            style={{ display: "none" }}
            ref={el => { fileInputRefs.current[key] = el; }}
            onChange={e => {
              const f = e.target.files[0];
              if (f) handleDocUpload(key, f);
              e.target.value = "";
            }}
          />
          <div
            onClick={() => {
              if (isUploading || isViewing) return;
              if (editable) fileInputRefs.current[key]?.click();
              else if (hasFile) handleViewDoc(key);
            }}
            style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
              border: "1px solid #e5e7eb", borderRadius: 8,
              cursor: isUploading || isViewing ? "wait" : isActive ? "pointer" : "default",
              background: "#fafafa", transition: "background 0.12s",
            }}
          >
            <FaCloudArrowUp style={{ color: hasFile ? GOLD : "#d1d5db", fontSize: 15, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: "#111827", fontWeight: 500 }}>{label}</div>
              <div style={{ fontSize: 11, marginTop: 2, color: hasFile ? "#6b7280" : "#b0b7c3", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {isUploading ? "A enviar..." : isViewing ? "A abrir..." : hasFile ? ref.name : editable ? "Clique para enviar ficheiro" : "Sem ficheiro enviado"}
              </div>
            </div>
            <div style={{ flexShrink: 0 }}>
              {hasFile && !editable ? <FaArrowUpRightFromSquare style={{ fontSize: 12, color: GOLD }} />
                : !hasFile && !editable ? <FaCircleMinus style={{ fontSize: 13, color: "#e5e7eb" }} />
                : null}
            </div>
          </div>
        </div>
      );
    }

    if (type === "select") {
      return (
        <div key={key}>
          <span style={labelStyle}>{label}</span>
          {editable ? (
            <select value={form[key]} onChange={e => handleChange(key, e.target.value)} style={inputStyle}>
              <option value="">Selecionar...</option>
              {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{renderValue(field, dataSource)}</div>
          )}
        </div>
      );
    }

    // text, email, tel, number, date
    return (
      <div key={key}>
        <span style={labelStyle}>{label}</span>
        {editable ? (
          <input
            type={type}
            value={form[key]}
            placeholder={placeholder}
            onChange={e => handleChange(key, e.target.value)}
            style={inputStyle}
          />
        ) : (
          <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{renderValue(field, dataSource)}</div>
        )}
      </div>
    );
  };

  const handleSelectFile = (filePath) => {
    const formattedPath = filePath.replace(/\s/g, "-").replace(/\//g, "__");
    navigate(`/file/${formattedPath}`, { state: { originalFilename: filePath } });
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar onSelectFile={handleSelectFile} />

      <div className="ml-[230px] flex-1 flex flex-col min-h-screen">
        <Topbar icon="🪪" title="Cadastro" />

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Header */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "18px 24px", display: "flex", alignItems: "center", gap: 16 }}>
            {isViewingOther && (
              <button
                onClick={() => navigate("/colaboradores")}
                title="Voltar à lista de colaboradores"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 32, height: 32, border: "1px solid #e5e7eb", borderRadius: 7,
                  background: "#fff", color: "#6b7280", cursor: "pointer", flexShrink: 0,
                }}
              >
                <FaArrowLeft style={{ fontSize: 12 }} />
              </button>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#111827" }}>
                Ficha de cadastro — {nomeCurto}
              </div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 3 }}>
                Dados pessoais, contratuais e documentação associados ao processo individual do colaborador.
              </div>
            </div>
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
          </div>

          {loading && (
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 40, textAlign: "center", fontSize: 13, color: "#9ca3af" }}>
              A carregar ficha de cadastro...
            </div>
          )}

          {/* Sections */}
          {!loading && SECTIONS.map(section => {
            const sectionEditable = editMode && (!section.restricted || canEditRestricted);
            const sectionData = section.monthHistory && !editMode
              ? resolveContratoSnapshotForMonth(historyMonth)
              : form;
            const visibleFields = sectionData ? section.fields.filter(f => !f.showIf || f.showIf(sectionData)) : [];
            return (
              <div key={section.title} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8 }}>
                  <section.Icon style={{ color: GOLD, fontSize: 13 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{section.title}</span>
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
                    {section.restricted && editMode && !canEditRestricted && (
                      <span style={{ fontSize: 10.5, fontWeight: 500, color: "#9ca3af" }}>
                        Apenas RH/Admin pode editar
                      </span>
                    )}
                    {section.monthHistory && (
                      <>
                        <span style={{ fontSize: 11.5, color: "#6b7280", whiteSpace: "nowrap" }}>
                          {(sectionData && sectionData.tipo_contrato) || "Sem registo para este mês"}
                        </span>
                        <input
                          type="month"
                          value={historyMonth}
                          disabled={editMode}
                          onChange={e => e.target.value && setHistoryMonth(e.target.value)}
                          title={editMode ? "Termina a edição para consultar outro mês" : "Ver o contrato de trabalho num mês específico"}
                          style={{
                            fontSize: 12, padding: "5px 8px", border: "1px solid #e5e7eb",
                            borderRadius: 6, color: "#111827", background: "#fafafa", outline: "none",
                            opacity: editMode ? 0.6 : 1, cursor: editMode ? "not-allowed" : "pointer",
                          }}
                        />
                      </>
                    )}
                  </div>
                </div>
                {sectionData ? (
                  <div style={{ padding: 18, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px 20px" }}>
                    {visibleFields.map(f => renderField(f, sectionEditable, sectionData))}
                  </div>
                ) : (
                  <div style={{ padding: 18, fontSize: 12.5, color: "#9ca3af" }}>
                    Sem registo de contrato de trabalho para este mês.
                  </div>
                )}
              </div>
            );
          })}

        </div>
      </div>
    </div>
  );
}
