import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../shared/context/userContext";
import Sidebar from "../../shared/components/Sidebar";
import Topbar from "../../shared/components/Topbar";
import { toast } from "react-toastify";

const GOLD = "#C8932F";
const GOLD_LIGHT = "#f5e6ca";

function buildSteps() {
  return [
    { key: "descricaoAnalise", label: "Descrição da Não Conformidade na perspetiva do/a(s) responsável/eis pela análise da Não Conformidade ou Reclamação", required: true },
    { key: "analiseCausas", label: "Análise das Causas", required: true },
    { key: "descricaoAcoesCorretivas", label: "Descrição das Ações Corretivas (ações implementadas tendo em vista o evitar de nova ocorrência da situação verificada)", required: true },
    { key: "responsavelAcoesCorretivas", label: "Quem ficou responsável por implementar a(s) ação/ações corretiva(s)?", required: true },
    { key: "prazoAcoesCorretivas", label: "Prazo para a implementação de ações corretivas", required: true },
    { key: "verificacaoEficacia", label: "Como e em que prazo será possível verificar a eficácia das ações corretivas?", required: true },
    { key: "outrasCorrecoes", label: "Descrição de outras Correções, Responsável e Prazo (ações implementadas tendo em vista minorar o impacto da ocorrência verificada)", required: false },
    { key: "autorAnalise", label: "Autor/a(s) da análise e tratamento (por favor indique o seu primeiro e último nome)", required: false },
    { key: "outrosEnvolvidos", label: "Outros envolvidos na análise e tratamento (por favor indique o primeiro e último nome)", required: false },
    { key: "__summary__", label: "Confirmar e enviar", required: false },
  ];
}

const initialForm = {
  descricaoAnalise: "",
  analiseCausas: "",
  descricaoAcoesCorretivas: "",
  responsavelAcoesCorretivas: "",
  prazoAcoesCorretivas: "",
  verificacaoEficacia: "",
  outrasCorrecoes: "",
  autorAnalise: "",
  outrosEnvolvidos: "",
};

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
          <span className="text-gray-400">  -  passo {current + 1} de {steps.length - 1}</span>
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
          {value || <span className="italic text-gray-400">Não respondido</span>}
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

export default function TratamentoNaoConformidade() {
  const navigate = useNavigate();
  const { userEmail } = useContext(UserContext);
  const [form, setForm] = useState(initialForm);
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const steps = buildSteps();
  const currentStepKey = steps[step]?.key;
  const isSummary = currentStepKey === "__summary__";

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const validate = () => {
    setError("");
    switch (currentStepKey) {
      case "descricaoAnalise":
        if (!form.descricaoAnalise.trim()) return "Por favor descreva a Não Conformidade na perspetiva do/a(s) responsável/eis pela análise.";
        break;
      case "analiseCausas":
        if (!form.analiseCausas.trim()) return "Por favor descreva a análise das causas.";
        break;
      case "descricaoAcoesCorretivas":
        if (!form.descricaoAcoesCorretivas.trim()) return "Por favor descreva as ações corretivas.";
        break;
      case "responsavelAcoesCorretivas":
        if (!form.responsavelAcoesCorretivas.trim()) return "Por favor indique quem ficou responsável pela implementação das ações corretivas.";
        break;
      case "prazoAcoesCorretivas":
        if (!form.prazoAcoesCorretivas.trim()) return "Por favor indique o prazo para a implementação das ações corretivas.";
        break;
      case "verificacaoEficacia":
        if (!form.verificacaoEficacia.trim()) return "Por favor indique como e em que prazo será possível verificar a eficácia das ações corretivas.";
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
        descricaoAnalise: form.descricaoAnalise,
        analiseCausas: form.analiseCausas,
        descricaoAcoesCorretivas: form.descricaoAcoesCorretivas,
        responsavelAcoesCorretivas: form.responsavelAcoesCorretivas,
        prazoAcoesCorretivas: form.prazoAcoesCorretivas,
        verificacaoEficacia: form.verificacaoEficacia,
        outrasCorrecoes: form.outrasCorrecoes || null,
        autorAnalise: form.autorAnalise || null,
        outrosEnvolvidos: form.outrosEnvolvidos || null,
        emailUtilizador: userEmail,
        dataRegisto: new Date().toISOString(),
      };

      const res = await fetch(`${process.env.REACT_APP_API_URL}/nao-conformidades/tratamento`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Erro ${res.status}`);

      toast.success("Análise e tratamento registados com sucesso!");
      navigate("/dashboard");
    } catch (e) {
      setError("Ocorreu um erro ao enviar. Por favor tente novamente.");
      toast.error("Erro ao registar a análise e tratamento.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStepKey) {
      case "descricaoAnalise":
        return (
          <textarea
            autoFocus
            rows={6}
            className="w-full border-2 rounded-lg px-3 py-2 text-sm outline-none resize-none transition"
            style={{ borderColor: form.descricaoAnalise ? GOLD : "#e5e7eb" }}
            placeholder="Descreva a Não Conformidade na perspetiva do/a(s) responsável/eis pela análise..."
            value={form.descricaoAnalise}
            onChange={e => update("descricaoAnalise", e.target.value)}
          />
        );

      case "analiseCausas":
        return (
          <textarea
            autoFocus
            rows={6}
            className="w-full border-2 rounded-lg px-3 py-2 text-sm outline-none resize-none transition"
            style={{ borderColor: form.analiseCausas ? GOLD : "#e5e7eb" }}
            placeholder="Descreva a análise das causas..."
            value={form.analiseCausas}
            onChange={e => update("analiseCausas", e.target.value)}
          />
        );

      case "descricaoAcoesCorretivas":
        return (
          <textarea
            autoFocus
            rows={6}
            className="w-full border-2 rounded-lg px-3 py-2 text-sm outline-none resize-none transition"
            style={{ borderColor: form.descricaoAcoesCorretivas ? GOLD : "#e5e7eb" }}
            placeholder="Descreva as ações corretivas implementadas..."
            value={form.descricaoAcoesCorretivas}
            onChange={e => update("descricaoAcoesCorretivas", e.target.value)}
          />
        );

      case "responsavelAcoesCorretivas":
        return (
          <input
            autoFocus
            className="w-full border-2 rounded-lg px-3 py-2 text-sm outline-none transition"
            style={{ borderColor: form.responsavelAcoesCorretivas ? GOLD : "#e5e7eb" }}
            placeholder="Nome do/a responsável..."
            value={form.responsavelAcoesCorretivas}
            onChange={e => update("responsavelAcoesCorretivas", e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleNext()}
          />
        );

      case "prazoAcoesCorretivas":
        return (
          <input
            autoFocus
            type="date"
            className="w-full border-2 rounded-lg px-3 py-2 text-sm outline-none transition"
            style={{ borderColor: form.prazoAcoesCorretivas ? GOLD : "#e5e7eb" }}
            value={form.prazoAcoesCorretivas}
            onChange={e => update("prazoAcoesCorretivas", e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleNext()}
          />
        );

      case "verificacaoEficacia":
        return (
          <textarea
            autoFocus
            rows={6}
            className="w-full border-2 rounded-lg px-3 py-2 text-sm outline-none resize-none transition"
            style={{ borderColor: form.verificacaoEficacia ? GOLD : "#e5e7eb" }}
            placeholder="Descreva como e em que prazo será possível verificar a eficácia das ações corretivas..."
            value={form.verificacaoEficacia}
            onChange={e => update("verificacaoEficacia", e.target.value)}
          />
        );

      case "outrasCorrecoes":
        return (
          <textarea
            autoFocus
            rows={6}
            className="w-full border-2 rounded-lg px-3 py-2 text-sm outline-none resize-none transition"
            style={{ borderColor: form.outrasCorrecoes ? GOLD : "#e5e7eb" }}
            placeholder="Descreva outras correções, responsável e prazo (opcional)..."
            value={form.outrasCorrecoes}
            onChange={e => update("outrasCorrecoes", e.target.value)}
          />
        );

      case "autorAnalise":
        return (
          <input
            autoFocus
            className="w-full border-2 rounded-lg px-3 py-2 text-sm outline-none transition"
            style={{ borderColor: form.autorAnalise ? GOLD : "#e5e7eb" }}
            placeholder="Primeiro e último nome (opcional)..."
            value={form.autorAnalise}
            onChange={e => update("autorAnalise", e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleNext()}
          />
        );

      case "outrosEnvolvidos":
        return (
          <input
            autoFocus
            className="w-full border-2 rounded-lg px-3 py-2 text-sm outline-none transition"
            style={{ borderColor: form.outrosEnvolvidos ? GOLD : "#e5e7eb" }}
            placeholder="Primeiro e último nome (opcional)..."
            value={form.outrosEnvolvidos}
            onChange={e => update("outrosEnvolvidos", e.target.value)}
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
                label="Descrição da Não Conformidade (perspetiva da análise)"
                value={form.descricaoAnalise}
                onEdit={() => handleJump(stepIndexFor("descricaoAnalise"))}
              />
              <SummaryRow
                label="Análise das Causas"
                value={form.analiseCausas}
                onEdit={() => handleJump(stepIndexFor("analiseCausas"))}
              />
              <SummaryRow
                label="Descrição das Ações Corretivas"
                value={form.descricaoAcoesCorretivas}
                onEdit={() => handleJump(stepIndexFor("descricaoAcoesCorretivas"))}
              />
              <SummaryRow
                label="Responsável pela implementação"
                value={form.responsavelAcoesCorretivas}
                onEdit={() => handleJump(stepIndexFor("responsavelAcoesCorretivas"))}
              />
              <SummaryRow
                label="Prazo para implementação"
                value={form.prazoAcoesCorretivas}
                onEdit={() => handleJump(stepIndexFor("prazoAcoesCorretivas"))}
              />
              <SummaryRow
                label="Verificação da eficácia"
                value={form.verificacaoEficacia}
                onEdit={() => handleJump(stepIndexFor("verificacaoEficacia"))}
              />
              <SummaryRow
                label="Outras Correções, Responsável e Prazo"
                value={form.outrasCorrecoes}
                onEdit={() => handleJump(stepIndexFor("outrasCorrecoes"))}
              />
              <SummaryRow
                label="Autor/a(s) da análise e tratamento"
                value={form.autorAnalise}
                onEdit={() => handleJump(stepIndexFor("autorAnalise"))}
              />
              <SummaryRow
                label="Outros envolvidos"
                value={form.outrosEnvolvidos}
                onEdit={() => handleJump(stepIndexFor("outrosEnvolvidos"))}
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
        <Topbar icon="🛠️" title="Análise e Tratamento de Não Conformidades/Reclamações" />

        <div className="flex-1 flex justify-center items-start p-6">
          <div className="w-full max-w-2xl">
            {/* Header card */}
            <div
              className="rounded-2xl p-5 mb-6 shadow-sm"
              style={{ background: `linear-gradient(135deg, ${GOLD} 0%, #a87428 100%)` }}
            >
              <h1 className="text-lg font-bold text-white mb-1">
                Análise e Tratamento de Não Conformidades/Reclamações
              </h1>
              <p className="text-xs text-amber-100 leading-relaxed">
                Este formulário tem como objetivo a análise e tratamento de Não Conformidades/Reclamações.
                Inclui a análise das causas e a implementação de ações corretivas, tendo em vista a
                eliminação/redução do impacto das mesmas no Sistema.
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
