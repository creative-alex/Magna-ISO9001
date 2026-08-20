import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/userContext";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { toast } from "react-toastify";

const GOLD = "#C8932F";
const GOLD_LIGHT = "#f5e6ca";

const ORIGENS = [
  "Interna (detetada por quadros internos)",
  "Reclamação Informal (realizada via e-mail/telefone/presencial/outra)",
  "Reclamação Formal (e.g. Livro de Reclamações)",
  "Verificação Externa (e.g. auditoria/verificação de partes interessadas: ISO 9001/DGERT/ANQEP/Programas Operacionais)",
];

const DEPARTAMENTOS = [
  "Centro de Formação Avançada Comenius (Formação Não Financiada)",
  "Academia Comenius - Cursos EFA",
  "Academia Comenius - Formação Modular Certificada",
  "Centro Qualifica Comenius",
  "Mais Advantage - Formação-Ação - Interface - Outra",
  "Tecnisign - Cursos EFA",
  "Tecnisign - Formação Modular Certificada",
  "Tecnisign - Emprego Digital Mais",
  "Mentores & Tutores - Projetos",
  "Mentores e Tutores - Emprego Digital Mais",
  "NORTEFOR - Cursos EFA",
  "NORTEFOR - Formação Modular Certificada",
  "NORTEFOR - Emprego Digital Mais",
  "Act4Safe",
  "Gestão de Dados - Cooperativa Comenius",
  "Administrativo Financeiro/RH - Cooperativa Comenius",
  "Marketing - Fisherwolf",
  "Gestão do Sistema - Qualidade",
];

const GRAVIDADES = ["Pouco grave", "Grave", "Muito grave"];

const gravityColor = { "Pouco grave": "#22c55e", "Grave": "#f59e0b", "Muito grave": "#ef4444" };

function buildSteps(form) {
  const base = [
    { key: "origem", label: "Origem da ocorrência", required: true },
    { key: "gravidade", label: "Gravidade da ocorrência", required: true },
    { key: "departamentos", label: "Departamentos / Funções envolvidos", required: true },
    { key: "descricao", label: "Descrição da ocorrência", required: true },
    { key: "correcaoRealizada", label: "Foi realizada alguma correção?", required: true },
  ];
  if (form.correcaoRealizada === "Sim") {
    base.push({ key: "descricaoCorrecao", label: "Descrição das correções efetuadas", required: true });
  }
  base.push({ key: "registadoPor", label: "Ocorrência registada por", required: true });
  base.push({ key: "__summary__", label: "Confirmar e enviar", required: false });
  return base;
}

const initialForm = {
  origem: "",
  origemOutra: "",
  gravidade: "",
  departamentos: [],
  departamentosOutra: "",
  descricao: "",
  correcaoRealizada: "",
  descricaoCorrecao: "",
  registadoPor: "",
};

function RadioOption({ label, checked, onChange, color }) {
  return (
    <label
      className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border-2 transition-all duration-150"
      style={{
        borderColor: checked ? GOLD : "#e5e7eb",
        background: checked ? GOLD_LIGHT : "#fff",
      }}
      onClick={onChange}
    >
      <span
        className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center"
        style={{ borderColor: checked ? GOLD : "#9ca3af", background: checked ? GOLD : "#fff" }}
      >
        {checked && <span className="w-2 h-2 rounded-full bg-white block" />}
      </span>
      <span className="text-sm text-gray-700 leading-snug" style={color ? { color } : {}}>
        {label}
      </span>
    </label>
  );
}

function CheckOption({ label, checked, onChange }) {
  return (
    <label
      className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border-2 transition-all duration-150"
      style={{
        borderColor: checked ? GOLD : "#e5e7eb",
        background: checked ? GOLD_LIGHT : "#fff",
      }}
      onClick={onChange}
    >
      <span
        className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center"
        style={{ borderColor: checked ? GOLD : "#9ca3af", background: checked ? GOLD : "#fff" }}
      >
        {checked && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
      <span className="text-sm text-gray-700 leading-snug">{label}</span>
    </label>
  );
}

function StepProgress({ steps, current, maxStep, onJump }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 mb-6">
      <div className="flex items-center gap-1">
        {steps.map((s, i) => {
          const isLast = i === steps.length - 1;
          const done = i < current;
          const active = i === current;
          const visited = i <= maxStep;
          const clickable = visited && i !== current;
          return (
            <React.Fragment key={s.key}>
              <button
                type="button"
                disabled={!clickable}
                onClick={() => onJump(i)}
                title={visited ? s.label : undefined}
                className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold transition-all duration-200 focus:outline-none"
                style={{
                  background: done ? GOLD : active ? "#fff" : visited ? "#fff" : "#f3f4f6",
                  border: `2px solid ${visited || active ? GOLD : "#e5e7eb"}`,
                  color: done ? "#fff" : active ? GOLD : visited ? GOLD : "#9ca3af",
                  cursor: clickable ? "pointer" : "default",
                  boxShadow: active ? `0 0 0 3px ${GOLD_LIGHT}` : "none",
                }}
              >
                {i + 1}
              </button>
              {!isLast && (
                <div
                  className="flex-1 h-0.5 min-w-[6px] rounded transition-all duration-300"
                  style={{ background: done ? GOLD : "#e5e7eb" }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="mt-2 text-center text-xs text-gray-500">
        <span className="font-semibold" style={{ color: GOLD }}>{steps[current]?.label}</span>
        {current < steps.length - 1 && (
          <span className="text-gray-400"> — passo {current + 1} de {steps.length - 1}</span>
        )}
      </div>

      {maxStep > 0 && (
        <p className="text-center text-xs text-gray-400 mt-1">
          Clique em qualquer número visitado para saltar diretamente para esse passo
        </p>
      )}
    </div>
  );
}

function SummaryRow({ label, value, onEdit }) {
  return (
    <div className="py-3 border-b border-gray-100 last:border-0 flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: GOLD }}>
          {label}
        </div>
        <div className="text-sm text-gray-800 whitespace-pre-wrap break-words">
          {Array.isArray(value)
            ? value.length > 0
              ? value.map((v, i) => <div key={i}>• {v}</div>)
              : <span className="italic text-gray-400">Nenhum selecionado</span>
            : value || <span className="italic text-gray-400">Não respondido</span>}
        </div>
      </div>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="flex-shrink-0 text-xs px-2 py-1 rounded-md border transition-all duration-150 font-medium"
          style={{ borderColor: GOLD, color: GOLD, background: "#fff" }}
          title="Editar esta resposta"
        >
          Editar
        </button>
      )}
    </div>
  );
}

export default function RegistoNaoConformidade() {
  const navigate = useNavigate();
  const { userEmail } = useContext(UserContext);
  const [form, setForm] = useState(initialForm);
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const steps = buildSteps(form);
  const currentStepKey = steps[step]?.key;
  const isSummary = currentStepKey === "__summary__";

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const toggleDep = (dep) => {
    setForm(f => ({
      ...f,
      departamentos: f.departamentos.includes(dep)
        ? f.departamentos.filter(d => d !== dep)
        : [...f.departamentos, dep],
    }));
  };

  const getOrigemFinal = () => {
    if (form.origem === "__outra__") return form.origemOutra.trim() ? `Outra: ${form.origemOutra}` : "Outra";
    return form.origem;
  };

  const getDepartamentosFinal = () => {
    const list = [...form.departamentos];
    if (form.departamentosOutra.trim()) list.push(`Outra: ${form.departamentosOutra}`);
    return list;
  };

  const validate = () => {
    setError("");
    switch (currentStepKey) {
      case "origem":
        if (!form.origem) return "Por favor selecione a origem da ocorrência.";
        if (form.origem === "__outra__" && !form.origemOutra.trim()) return "Por favor descreva a origem.";
        break;
      case "gravidade":
        if (!form.gravidade) return "Por favor classifique a gravidade.";
        break;
      case "departamentos":
        if (form.departamentos.length === 0 && !form.departamentosOutra.trim())
          return "Por favor selecione pelo menos um departamento ou função.";
        break;
      case "descricao":
        if (!form.descricao.trim()) return "Por favor descreva a ocorrência.";
        break;
      case "correcaoRealizada":
        if (!form.correcaoRealizada) return "Por favor indique se foi realizada alguma correção.";
        break;
      case "descricaoCorrecao":
        if (!form.descricaoCorrecao.trim()) return "Por favor descreva as correções efetuadas.";
        break;
      case "registadoPor":
        if (!form.registadoPor.trim()) return "Por favor indique o seu nome completo.";
        break;
      default:
        break;
    }
    return null;
  };

  const stepIndexFor = (key) => steps.findIndex(s => s.key === key);

  const handleNext = () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    setStep(s => {
      const next = s + 1;
      setMaxStep(m => Math.max(m, next));
      return next;
    });
  };

  const handleBack = () => {
    setError("");
    setStep(s => s - 1);
  };

  const handleJump = (i) => {
    setError("");
    setStep(i);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        origem: getOrigemFinal(),
        gravidade: form.gravidade,
        departamentos: getDepartamentosFinal(),
        descricao: form.descricao,
        correcaoRealizada: form.correcaoRealizada,
        descricaoCorrecao: form.correcaoRealizada === "Sim" ? form.descricaoCorrecao : null,
        registadoPor: form.registadoPor,
        emailUtilizador: userEmail,
        dataRegisto: new Date().toISOString(),
      };

      const res = await fetch(`${process.env.REACT_APP_API_URL}/nao-conformidades`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Erro ${res.status}`);

      toast.success("Não conformidade registada com sucesso!");
      navigate("/dashboard");
    } catch (e) {
      setError("Ocorreu um erro ao enviar. Por favor tente novamente.");
      toast.error("Erro ao registar a não conformidade.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStepKey) {
      case "origem":
        return (
          <div className="flex flex-col gap-3">
            {ORIGENS.map(o => (
              <RadioOption
                key={o}
                label={o}
                checked={form.origem === o}
                onChange={() => update("origem", o)}
              />
            ))}
            <RadioOption
              label="Outra:"
              checked={form.origem === "__outra__"}
              onChange={() => update("origem", "__outra__")}
            />
            {form.origem === "__outra__" && (
              <input
                autoFocus
                className="mt-1 w-full border-2 rounded-lg px-3 py-2 text-sm outline-none transition"
                style={{ borderColor: GOLD }}
                placeholder="Descreva a origem..."
                value={form.origemOutra}
                onChange={e => update("origemOutra", e.target.value)}
              />
            )}
          </div>
        );

      case "gravidade":
        return (
          <div className="flex flex-col gap-3">
            {GRAVIDADES.map(g => (
              <RadioOption
                key={g}
                label={g}
                checked={form.gravidade === g}
                onChange={() => update("gravidade", g)}
                color={form.gravidade === g ? gravityColor[g] : undefined}
              />
            ))}
          </div>
        );

      case "departamentos":
        return (
          <div className="flex flex-col gap-2">
            {DEPARTAMENTOS.map(d => (
              <CheckOption
                key={d}
                label={d}
                checked={form.departamentos.includes(d)}
                onChange={() => toggleDep(d)}
              />
            ))}
            <div className="mt-1">
              <label className="text-sm text-gray-600 font-medium mb-1 block">Outra:</label>
              <input
                className="w-full border-2 rounded-lg px-3 py-2 text-sm outline-none transition"
                style={{ borderColor: form.departamentosOutra ? GOLD : "#e5e7eb" }}
                placeholder="Indique outro departamento ou função..."
                value={form.departamentosOutra}
                onChange={e => update("departamentosOutra", e.target.value)}
              />
            </div>
          </div>
        );

      case "descricao":
        return (
          <textarea
            autoFocus
            rows={6}
            className="w-full border-2 rounded-lg px-3 py-2 text-sm outline-none resize-none transition"
            style={{ borderColor: form.descricao ? GOLD : "#e5e7eb" }}
            placeholder="Descreva detalhadamente a ocorrência..."
            value={form.descricao}
            onChange={e => update("descricao", e.target.value)}
          />
        );

      case "correcaoRealizada":
        return (
          <div className="flex flex-col gap-3">
            {["Sim", "Não"].map(opt => (
              <RadioOption
                key={opt}
                label={opt}
                checked={form.correcaoRealizada === opt}
                onChange={() => update("correcaoRealizada", opt)}
              />
            ))}
          </div>
        );

      case "descricaoCorrecao":
        return (
          <textarea
            autoFocus
            rows={6}
            className="w-full border-2 rounded-lg px-3 py-2 text-sm outline-none resize-none transition"
            style={{ borderColor: form.descricaoCorrecao ? GOLD : "#e5e7eb" }}
            placeholder="Descreva as correções e ações efetuadas..."
            value={form.descricaoCorrecao}
            onChange={e => update("descricaoCorrecao", e.target.value)}
          />
        );

      case "registadoPor":
        return (
          <input
            autoFocus
            className="w-full border-2 rounded-lg px-3 py-2 text-sm outline-none transition"
            style={{ borderColor: form.registadoPor ? GOLD : "#e5e7eb" }}
            placeholder="Primeiro e último nome..."
            value={form.registadoPor}
            onChange={e => update("registadoPor", e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleNext()}
          />
        );

      case "__summary__":
        return (
          <div className="flex flex-col gap-0 rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b" style={{ background: GOLD_LIGHT }}>
              <span className="font-semibold text-sm" style={{ color: GOLD }}>
                Reveja as suas respostas antes de enviar
              </span>
            </div>
            <div className="px-4">
              <SummaryRow
                label="Origem da ocorrência"
                value={getOrigemFinal()}
                onEdit={() => handleJump(stepIndexFor("origem"))}
              />
              <SummaryRow
                label="Gravidade"
                value={
                  <span style={{ color: gravityColor[form.gravidade], fontWeight: 600 }}>
                    {form.gravidade}
                  </span>
                }
                onEdit={() => handleJump(stepIndexFor("gravidade"))}
              />
              <SummaryRow
                label="Departamentos / Funções"
                value={getDepartamentosFinal()}
                onEdit={() => handleJump(stepIndexFor("departamentos"))}
              />
              <SummaryRow
                label="Descrição da ocorrência"
                value={form.descricao}
                onEdit={() => handleJump(stepIndexFor("descricao"))}
              />
              <SummaryRow
                label="Correção realizada?"
                value={form.correcaoRealizada}
                onEdit={() => handleJump(stepIndexFor("correcaoRealizada"))}
              />
              {form.correcaoRealizada === "Sim" && (
                <SummaryRow
                  label="Descrição das correções"
                  value={form.descricaoCorrecao}
                  onEdit={() => handleJump(stepIndexFor("descricaoCorrecao"))}
                />
              )}
              <SummaryRow
                label="Registado por"
                value={form.registadoPor}
                onEdit={() => handleJump(stepIndexFor("registadoPor"))}
              />
              <SummaryRow label="E-mail" value={userEmail} />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const questionLabel = isSummary ? null : steps[step]?.label;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="ml-[230px] flex-1 flex flex-col min-h-screen">
        <Topbar icon="📋" title="Registo de Não Conformidades e Reclamações" />

        <div className="flex-1 flex justify-center items-start p-6">
          <div className="w-full max-w-2xl">
            {/* Header card */}
            <div
              className="rounded-2xl p-5 mb-6 shadow-sm"
              style={{ background: `linear-gradient(135deg, ${GOLD} 0%, #a87428 100%)` }}
            >
              <h1 className="text-lg font-bold text-white mb-1">
                Registo de Não Conformidades e Reclamações
              </h1>
              <p className="text-xs text-amber-100 leading-relaxed">
                Este formulário tem como objetivo o registo de reclamações formais e/ou informais
                realizadas por formadores/as, formandos/as, quadros internos e outras partes interessadas.
              </p>
              {userEmail && (
                <p className="text-xs text-amber-200 mt-2 font-medium">{userEmail}</p>
              )}
            </div>

            {/* Progress */}
            <StepProgress steps={steps} current={step} maxStep={maxStep} onJump={handleJump} />

            {/* Step card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 pt-6 pb-2">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: GOLD_LIGHT, color: GOLD }}
                  >
                    {isSummary ? "Resumo" : `Pergunta ${step + 1} de ${steps.length - 1}`}
                  </span>
                  {!isSummary && steps[step]?.required && (
                    <span className="text-xs text-red-500">* obrigatório</span>
                  )}
                </div>

                {questionLabel && (
                  <h2 className="text-base font-semibold text-gray-800 mb-4">{questionLabel}</h2>
                )}
              </div>

              <div className="px-6 pb-6">
                {renderStep()}

                {error && (
                  <div className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                    {error}
                  </div>
                )}

                <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
                  <button
                    onClick={handleBack}
                    disabled={step === 0}
                    className="px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ borderColor: GOLD, color: GOLD }}
                  >
                    ← Anterior
                  </button>

                  {isSummary ? (
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="px-6 py-2 rounded-lg text-sm font-bold text-white transition-all duration-150 disabled:opacity-60 shadow"
                      style={{ background: submitting ? "#9ca3af" : GOLD }}
                    >
                      {submitting ? "A enviar..." : "Enviar registo"}
                    </button>
                  ) : (
                    <button
                      onClick={handleNext}
                      className="px-6 py-2 rounded-lg text-sm font-bold text-white transition-all duration-150 shadow"
                      style={{ background: GOLD }}
                    >
                      Seguinte →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
