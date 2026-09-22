import React, { useContext, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../shared/context/userContext";
import Sidebar from "../../shared/components/Sidebar";
import Topbar from "../../shared/components/Topbar";
import { apiFetch } from "../../shared/utils/apiFetch";
import { APP_CONSTANTS } from "../../shared/utils/constants";
import EnvolvidosPicker from "./components/EnvolvidosPicker";
import { GRAVIDADES } from "./estados";
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

const gravityColor = { "Pouco grave": "#22c55e", "Grave": "#f59e0b", "Muito grave": "#ef4444" };

const initialForm = {
  origem: "",
  origemOutra: "",
  gravidade: "",
  departamentos: [],
  departamentosOutra: "",
  descricao: "",
  correcaoRealizada: "",
  descricaoCorrecao: "",
};

function RadioOption({ label, checked, onChange, color }) {
  return (
    <label
      className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border-2 transition-all duration-150"
      style={{ borderColor: checked ? GOLD : "#e5e7eb", background: checked ? GOLD_LIGHT : "#fff" }}
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
      style={{ borderColor: checked ? GOLD : "#e5e7eb", background: checked ? GOLD_LIGHT : "#fff" }}
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

function Section({ title, subtitle, required, error, sectionRef, children }) {
  return (
    <div ref={sectionRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5 scroll-mt-6">
      <div className="px-6 pt-5 pb-1">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-base font-semibold text-gray-800">{title}</h2>
          {required && <span className="text-xs text-red-500">* obrigatório</span>}
        </div>
        {subtitle && <p className="text-xs text-gray-500 mb-3">{subtitle}</p>}
      </div>
      <div className="px-6 pb-6">
        {children}
        {error && (
          <div className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">{error}</div>
        )}
      </div>
    </div>
  );
}

const MAX_ANEXOS_MB = Math.round(APP_CONSTANTS.MAX_UPLOAD_SIZE / (1024 * 1024));

export default function RegistoNaoConformidade() {
  const navigate = useNavigate();
  const { userEmail, username } = useContext(UserContext);
  const [form, setForm] = useState(initialForm);
  const [envolvidos, setEnvolvidos] = useState([]);
  const [anexos, setAnexos] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const refs = {
    origem: useRef(null),
    gravidade: useRef(null),
    departamentos: useRef(null),
    descricao: useRef(null),
    correcaoRealizada: useRef(null),
    registadoPor: useRef(null),
  };

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const toggleDep = (dep) => {
    setForm((f) => ({
      ...f,
      departamentos: f.departamentos.includes(dep)
        ? f.departamentos.filter((d) => d !== dep)
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
    const next = {};
    if (!form.origem) next.origem = "Por favor selecione a origem da ocorrência.";
    else if (form.origem === "__outra__" && !form.origemOutra.trim()) next.origem = "Por favor descreva a origem.";

    if (!form.gravidade) next.gravidade = "Por favor classifique a gravidade.";

    if (form.departamentos.length === 0 && !form.departamentosOutra.trim()) {
      next.departamentos = "Por favor selecione pelo menos um departamento ou função.";
    }

    if (!form.descricao.trim()) next.descricao = "Por favor descreva a ocorrência.";

    if (!form.correcaoRealizada) next.correcaoRealizada = "Por favor indique se foi realizada alguma correção.";
    else if (form.correcaoRealizada === "Sim" && !form.descricaoCorrecao.trim()) {
      next.correcaoRealizada = "Por favor descreva as correções efetuadas.";
    }

    if (!username) next.registadoPor = "Não foi possível identificar a pessoa autenticada. Recarregue a página.";

    return next;
  };

  const handleFilesSelected = (e) => {
    const novos = Array.from(e.target.files || []);
    e.target.value = "";
    const validos = [];
    for (const file of novos) {
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        toast.error(`"${file.name}" não é um PDF.`);
        continue;
      }
      if (file.size > APP_CONSTANTS.MAX_UPLOAD_SIZE) {
        toast.error(`"${file.name}" excede o limite de ${MAX_ANEXOS_MB}MB.`);
        continue;
      }
      validos.push(file);
    }
    setAnexos((prev) => [...prev, ...validos]);
  };

  const removeAnexo = (idx) => setAnexos((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    const validation = validate();
    setErrors(validation);
    const firstErrorKey = Object.keys(validation)[0];
    if (firstErrorKey) {
      refs[firstErrorKey]?.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        origem: getOrigemFinal(),
        gravidade: form.gravidade,
        departamentos: getDepartamentosFinal(),
        descricao: form.descricao,
        correcaoRealizada: form.correcaoRealizada,
        descricaoCorrecao: form.correcaoRealizada === "Sim" ? form.descricaoCorrecao : null,
        registadoPor: username,
        envolvidos,
      };

      const res = await apiFetch("/nao-conformidades", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Erro ${res.status}`);
      }
      const { id } = await res.json();

      for (const file of anexos) {
        const formData = new FormData();
        formData.append("file", file);
        const anexoRes = await apiFetch(`/nao-conformidades/${id}/anexos`, { method: "POST", body: formData });
        if (!anexoRes.ok) {
          toast.error(`Falha ao anexar "${file.name}".`);
        }
      }

      toast.success("Não conformidade registada com sucesso!");
      navigate("/tratar-nao-conformidade");
    } catch (e) {
      toast.error(e.message || "Erro ao registar a não conformidade.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="ml-[var(--sidebar-w,230px)] transition-[margin-left] duration-200 flex-1 min-w-0 flex flex-col min-h-screen">
        <Topbar icon="📋" title="Registo de Não Conformidades e Reclamações" />

        <div className="flex-1 flex justify-center items-start p-6">
          <div className="w-full max-w-2xl">
            <div className="rounded-2xl p-5 mb-6 shadow-sm" style={{ background: `linear-gradient(135deg, ${GOLD} 0%, #a87428 100%)` }}>
              <h1 className="text-lg font-bold text-white mb-1">Registo de Não Conformidades e Reclamações</h1>
              <p className="text-xs text-amber-100 leading-relaxed">
                Este formulário tem como objetivo o registo de reclamações formais e/ou informais
                realizadas por formadores/as, formandos/as, quadros internos e outras partes interessadas.
              </p>
              {userEmail && <p className="text-xs text-amber-200 mt-2 font-medium">{userEmail}</p>}
            </div>

            <Section title="Origem da ocorrência" required error={errors.origem} sectionRef={refs.origem}>
              <div className="flex flex-col gap-3">
                {ORIGENS.map((o) => (
                  <RadioOption key={o} label={o} checked={form.origem === o} onChange={() => update("origem", o)} />
                ))}
                <RadioOption label="Outra:" checked={form.origem === "__outra__"} onChange={() => update("origem", "__outra__")} />
                {form.origem === "__outra__" && (
                  <input
                    className="mt-1 w-full border-2 rounded-lg px-3 py-2 text-sm outline-none transition"
                    style={{ borderColor: GOLD }}
                    placeholder="Descreva a origem..."
                    value={form.origemOutra}
                    onChange={(e) => update("origemOutra", e.target.value)}
                  />
                )}
              </div>
            </Section>

            <Section title="Gravidade da ocorrência" required error={errors.gravidade} sectionRef={refs.gravidade}>
              <div className="flex flex-col gap-3">
                {GRAVIDADES.map((g) => (
                  <RadioOption
                    key={g}
                    label={g}
                    checked={form.gravidade === g}
                    onChange={() => update("gravidade", g)}
                    color={form.gravidade === g ? gravityColor[g] : undefined}
                  />
                ))}
              </div>
            </Section>

            <Section title="Departamentos / Funções envolvidos" required error={errors.departamentos} sectionRef={refs.departamentos}>
              <div className="flex flex-col gap-2">
                {DEPARTAMENTOS.map((d) => (
                  <CheckOption key={d} label={d} checked={form.departamentos.includes(d)} onChange={() => toggleDep(d)} />
                ))}
                <div className="mt-1">
                  <label className="text-sm text-gray-600 font-medium mb-1 block">Outra:</label>
                  <input
                    className="w-full border-2 rounded-lg px-3 py-2 text-sm outline-none transition"
                    style={{ borderColor: form.departamentosOutra ? GOLD : "#e5e7eb" }}
                    placeholder="Indique outro departamento ou função..."
                    value={form.departamentosOutra}
                    onChange={(e) => update("departamentosOutra", e.target.value)}
                  />
                </div>
              </div>
            </Section>

            <Section title="Descrição da ocorrência" required error={errors.descricao} sectionRef={refs.descricao}>
              <textarea
                rows={5}
                className="w-full border-2 rounded-lg px-3 py-2 text-sm outline-none resize-none transition"
                style={{ borderColor: form.descricao ? GOLD : "#e5e7eb" }}
                placeholder="Descreva detalhadamente a ocorrência..."
                value={form.descricao}
                onChange={(e) => update("descricao", e.target.value)}
              />
            </Section>

            <Section title="Foi realizada alguma correção?" required error={errors.correcaoRealizada} sectionRef={refs.correcaoRealizada}>
              <div className="flex flex-col gap-3">
                {["Sim", "Não"].map((opt) => (
                  <RadioOption key={opt} label={opt} checked={form.correcaoRealizada === opt} onChange={() => update("correcaoRealizada", opt)} />
                ))}
              </div>
              {form.correcaoRealizada === "Sim" && (
                <div className="mt-3">
                  <label className="text-sm text-gray-600 font-medium mb-1 block">Descrição das correções efetuadas</label>
                  <textarea
                    rows={5}
                    className="w-full border-2 rounded-lg px-3 py-2 text-sm outline-none resize-none transition"
                    style={{ borderColor: form.descricaoCorrecao ? GOLD : "#e5e7eb" }}
                    placeholder="Descreva as correções e ações efetuadas..."
                    value={form.descricaoCorrecao}
                    onChange={(e) => update("descricaoCorrecao", e.target.value)}
                  />
                </div>
              )}
            </Section>

            <Section title="Ocorrência registada por" error={errors.registadoPor} sectionRef={refs.registadoPor}>
              <div
                className="w-full border-2 rounded-lg px-3 py-2 text-sm"
                style={{ borderColor: "#e5e7eb", background: "#f9fafb", color: "#111827", fontWeight: 500 }}
              >
                {username || "—"}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Preenchido automaticamente com a pessoa autenticada, não editável. E-mail associado à sessão: {userEmail}
              </p>
            </Section>

            <Section title="Pessoas envolvidas" subtitle="Colegas relacionados com esta ocorrência. Poderão consultar a NC e vir a ser escolhidos como responsáveis por ações corretivas.">
              <EnvolvidosPicker value={envolvidos} onChange={setEnvolvidos} />
            </Section>

            <Section title="Anexos (PDF)" subtitle={`Documentos de suporte, opcional. Só PDF, até ${MAX_ANEXOS_MB}MB por ficheiro.`}>
              <input type="file" accept="application/pdf" multiple onChange={handleFilesSelected} className="text-sm" />
              {anexos.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1.5">
                  {anexos.map((file, idx) => (
                    <li key={`${file.name}-${idx}`} className="flex items-center justify-between text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                      <span className="truncate">{file.name}</span>
                      <button type="button" onClick={() => removeAnexo(idx)} className="text-red-500 text-xs font-medium ml-2">Remover</button>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <div className="flex justify-end mt-2 mb-10">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2.5 rounded-lg text-sm font-bold text-white transition-all duration-150 disabled:opacity-60 shadow"
                style={{ background: submitting ? "#9ca3af" : GOLD }}
              >
                {submitting ? "A enviar..." : "Enviar registo"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
