import React, { useContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  FaArrowLeft, FaCircleCheck, FaClipboardCheck, FaClipboardList, FaClock,
  FaFileLines, FaPaperclip, FaTag, FaTrash, FaUserCheck, FaUsers,
} from "react-icons/fa6";
import { apiFetch } from "../../shared/utils/apiFetch";
import { UserContext } from "../../shared/context/userContext";
import { usePermissions } from "../../shared/hooks/usePermissions";
import { NC_ESTADOS, ACAO_ESTADOS, GRAVIDADES, ncEstadoLabel, acaoEstadoLabel } from "./estados";
import EnvolvidosPicker from "./components/EnvolvidosPicker";
import AcoesCorretivasEditor, { novaAcaoVazia } from "./components/AcoesCorretivasEditor";
import AnaliseCausasEditor, { novaCausaVazia } from "./components/AnaliseCausasEditor";

const GOLD = "#C8932F";
const gravityColor = { "Pouco grave": "#22c55e", "Grave": "#f59e0b", "Muito grave": "#ef4444" };
const NC_ESTADO_ORDER = ["registada", "para_tratamento", "tratada", "fechada"];
const ACAO_ICONS = { por_implementar: FaClock, implementada: FaClipboardCheck, eficaz: FaCircleCheck };

function Badge({ label, color }) {
  return (
    <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: `${color}1a`, color }}>
      {label}
    </span>
  );
}

function EstadoStepper({ estado }) {
  const currentIdx = NC_ESTADO_ORDER.indexOf(estado);
  return (
    <div className="flex items-start mb-6">
      {NC_ESTADO_ORDER.map((key, idx) => {
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        const color = NC_ESTADOS[key]?.color || GOLD;
        return (
          <React.Fragment key={key}>
            <div className="flex flex-col items-center gap-1.5 w-[90px] flex-shrink-0">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={done || active ? { background: color, color: "#fff" } : { background: "#e5e7eb", color: "#9ca3af" }}
              >
                {done ? <FaCircleCheck /> : idx + 1}
              </div>
              <span className="text-[11px] font-medium text-center leading-tight" style={{ color: active ? color : "#9ca3af" }}>
                {NC_ESTADOS[key]?.label}
              </span>
            </div>
            {idx < NC_ESTADO_ORDER.length - 1 && (
              <div className="flex-1 h-0.5 mt-3.5" style={{ background: idx < currentIdx ? color : "#e5e7eb" }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function Card({ title, icon, children, actions }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
      <div className="px-5 py-3.5 flex items-center justify-between gap-2 border-b border-gray-50">
        <div className="flex items-center gap-2.5 min-w-0">
          {icon && (
            <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-sm" style={{ background: "#f5e6ca", color: GOLD }}>
              {icon}
            </span>
          )}
          <h3 className="text-sm font-semibold text-gray-800 truncate">{title}</h3>
        </div>
        {actions}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="mb-3">
      <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: GOLD }}>{label}</div>
      <div className="text-sm text-gray-800 whitespace-pre-wrap break-words">
        {value || <span className="italic text-gray-400">Não indicado</span>}
      </div>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return null;
  try { return new Date(iso).toLocaleDateString("pt-PT"); } catch { return iso; }
}

export default function NaoConformidadeDetail({ id, onBack, onChanged }) {
  const { uid } = useContext(UserContext);
  const {
    isGestorQualidade, isSuperAdmin, canManageNaoConformidades, canAssignNaoConformidade,
    canVerifyEficacia, canEditNaoConformidade, canMarkAcaoImplementada,
  } = usePermissions();

  const [nc, setNc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [editingEnvolvidos, setEditingEnvolvidos] = useState(false);
  const [envolvidosDraft, setEnvolvidosDraft] = useState([]);
  const [editingCatalog, setEditingCatalog] = useState(false);
  // "categoria" saiu do fluxo ativo de catalogação (ver pedido) - fica comentado no JSX,
  // não removido daqui, para não perder o campo caso volte a ser necessário.
  const [catalogForm, setCatalogForm] = useState({ /* categoria: "", */ notas: "" });
  // Classificação deixou de ser um campo próprio da catalogação e passou a ser só o
  // campo "gravidade" da NC (o mesmo que o autor preenche no registo) - a Gestora de
  // Qualidade edita-o aqui, e o valor mais recente é sempre "o válido" em toda a NC.
  const [gravidadeDraft, setGravidadeDraft] = useState("");
  const [editingResponsavel, setEditingResponsavel] = useState(false);
  const [responsavelDraft, setResponsavelDraft] = useState("");
  const [tratamentoForm, setTratamentoForm] = useState({
    descricaoAnalise: "",
    // "outrasCorrecoes"/"autorAnalise"/"outrosEnvolvidos" estão desativados na UI (ver
    // pedido) - mantidos no estado/payload para poderem ser reativados facilmente.
    outrasCorrecoes: "", autorAnalise: "", outrosEnvolvidos: "",
  });
  // "Análise das causas" deixou de ser um único texto e passou a ser uma lista de causas
  // (ver AnaliseCausasEditor.jsx) - guardada à parte de tratamentoForm.
  const [causasDraft, setCausasDraft] = useState([novaCausaVazia()]);
  const [acoesDraft, setAcoesDraft] = useState([novaAcaoVazia()]);
  const [tratamentoErrors, setTratamentoErrors] = useState({});
  const [eficaciaNotas, setEficaciaNotas] = useState({});

  const fetchNC = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/nao-conformidades/${id}`);
      if (!res.ok) throw new Error("Não foi possível carregar a não conformidade.");
      const data = await res.json();
      setNc(data);
      setCatalogForm({ notas: data.catalogacao?.notas || "" });
      setGravidadeDraft(data.gravidade || "");
      setEnvolvidosDraft((data.envolvidos || []).map((e) => e.uid));
      setResponsavelDraft(data.responsavelTratamentoUid || "");
      // Pré-preenche a descrição do questionário com a descrição da ocorrência já
      // registada, para o responsável não ter de a reescrever/copiar à mão - só quando o
      // tratamento ainda não foi submetido, e só na primeira carga (nunca sobrepõe o que a
      // pessoa já esteja a escrever num refresh a meio da edição).
      if (!data.tratamento) {
        setTratamentoForm((f) => (f.descricaoAnalise ? f : { ...f, descricaoAnalise: data.descricao || "" }));
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNC();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const refresh = async () => { await fetchNC(); onChanged?.(); };

  const runAction = async (fn) => {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  };

  const handleSaveCatalogacao = () => runAction(async () => {
    const res = await apiFetch(`/nao-conformidades/${id}/catalogacao`, {
      method: "PATCH",
      body: JSON.stringify({ notas: catalogForm.notas, ...(gravidadeDraft ? { gravidade: gravidadeDraft } : {}) }),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error); }
    toast.success("Catalogação guardada.");
    setEditingCatalog(false);
    await refresh();
  }).catch((e) => toast.error(e.message || "Erro ao guardar catalogação."));

  const handleSaveEnvolvidos = () => runAction(async () => {
    const res = await apiFetch(`/nao-conformidades/${id}/catalogacao`, { method: "PATCH", body: JSON.stringify({ envolvidos: envolvidosDraft }) });
    if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error); }
    toast.success("Pessoas envolvidas atualizadas.");
    setEditingEnvolvidos(false);
    await refresh();
  }).catch((e) => toast.error(e.message || "Erro ao atualizar envolvidos."));

  const handleAssignResponsavel = () => runAction(async () => {
    if (!responsavelDraft) { toast.error("Selecione um responsável."); return; }
    const res = await apiFetch(`/nao-conformidades/${id}/responsavel`, { method: "PATCH", body: JSON.stringify({ responsavelUid: responsavelDraft }) });
    if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error); }
    toast.success("Responsável pela não conformidade atribuído.");
    setEditingResponsavel(false);
    await refresh();
  }).catch((e) => toast.error(e.message || "Erro ao atribuir responsável."));

  const validateTratamento = () => {
    const errs = {};
    if (!tratamentoForm.descricaoAnalise.trim()) errs.descricaoAnalise = "Descreva a não conformidade na perspetiva da análise.";
    if (!causasDraft.some((c) => c.texto.trim())) errs.analiseCausas = "Indique pelo menos uma causa na análise das causas.";
    if (acoesDraft.length === 0) errs.acoes = "Defina pelo menos uma ação corretiva.";
    for (const a of acoesDraft) {
      if (!a.descricao.trim() || !a.responsavelUid || !a.prazoImplementacao || !a.prazoVerificacaoEficacia) {
        errs.acoes = "Preencha descrição, responsável e ambos os prazos em cada ação corretiva.";
        break;
      }
    }
    return errs;
  };

  const handleSubmitTratamento = () => {
    const errs = validateTratamento();
    setTratamentoErrors(errs);
    if (Object.keys(errs).length) return;
    return runAction(async () => {
      const res = await apiFetch(`/nao-conformidades/${id}/tratamento`, {
        method: "POST",
        body: JSON.stringify({
          ...tratamentoForm,
          analiseCausas: causasDraft.map((c) => c.texto.trim()).filter(Boolean),
          acoes: acoesDraft.map(({ descricao, responsavelUid, prazoImplementacao, prazoVerificacaoEficacia }) => ({
            descricao, responsavelUid, prazoImplementacao, prazoVerificacaoEficacia,
          })),
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error); }
      toast.success("Tratamento submetido com sucesso.");
      await refresh();
    }).catch((e) => toast.error(e.message || "Erro ao submeter tratamento."));
  };

  const handleMarcarImplementada = (acaoId) => runAction(async () => {
    const res = await apiFetch(`/nao-conformidades/${id}/acoes/${acaoId}/implementar`, { method: "PATCH" });
    if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error); }
    toast.success("Ação marcada como implementada.");
    await refresh();
  }).catch((e) => toast.error(e.message || "Erro ao marcar ação como implementada."));

  const handleVerificarEficacia = (acaoId) => runAction(async () => {
    const res = await apiFetch(`/nao-conformidades/${id}/acoes/${acaoId}/eficacia`, {
      method: "PATCH",
      body: JSON.stringify({ observacoes: eficaciaNotas[acaoId] || "" }),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error); }
    const data = await res.json().catch(() => ({}));
    toast.success(data.fechouAutomaticamente
      ? "Ação validada como eficaz. Todas as ações eram eficazes - não conformidade fechada automaticamente."
      : "Ação validada como eficaz.");
    await refresh();
  }).catch((e) => toast.error(e.message || "Erro ao validar eficácia."));

  const handleFechar = () => runAction(async () => {
    const res = await apiFetch(`/nao-conformidades/${id}/fechar`, { method: "POST" });
    if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error); }
    toast.success("Não conformidade fechada.");
    await refresh();
  }).catch((e) => toast.error(e.message || "Erro ao fechar não conformidade."));

  const handleDelete = () => {
    const confirmado = window.confirm("Tem a certeza que quer apagar esta não conformidade? Esta ação é irreversível e remove também os anexos e o histórico.");
    if (!confirmado) return;
    runAction(async () => {
      const res = await apiFetch(`/nao-conformidades/${id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error); }
      toast.success("Não conformidade apagada.");
      onChanged?.();
      onBack();
    }).catch((e) => toast.error(e.message || "Erro ao apagar não conformidade."));
  };

  const handleUploadAnexo = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    runAction(async () => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiFetch(`/nao-conformidades/${id}/anexos`, { method: "POST", body: formData });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error); }
      toast.success("Anexo adicionado.");
      await refresh();
    }).catch((err) => toast.error(err.message || "Erro ao anexar ficheiro."));
  };

  const handleDownloadAnexo = async (idx, nome) => {
    try {
      const res = await apiFetch(`/nao-conformidades/${id}/anexos/${idx}/download`);
      if (!res.ok) throw new Error("Não foi possível obter o ficheiro.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      toast.error(err.message || "Erro ao descarregar anexo.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-gray-100 p-12">
        <span className="w-6 h-6 rounded-full border-2 border-gray-200 animate-spin" style={{ borderTopColor: GOLD }} />
        <span className="text-sm text-gray-400">A carregar...</span>
      </div>
    );
  }
  if (!nc) return <div className="p-6 text-sm text-gray-500">Não conformidade não encontrada.</div>;

  const podeAnexar = isGestorQualidade || isSuperAdmin || nc.registadoPorUid === uid || nc.responsavelTratamentoUid === uid;
  const podeEditarQuestionario = canEditNaoConformidade(nc);
  const podeFechar = canManageNaoConformidades && nc.estado === "tratada" && nc.totalAcoes > 0 && nc.acoesEficazes === nc.totalAcoes;
  const totalAcoesNc = nc.acoes?.length || 0;
  const eficazesNc = nc.acoes?.filter((a) => a.estado === "eficaz").length || 0;
  // "analiseCausas" passou a ser guardado como array (ver ponto 4 do pedido); aceita
  // também o formato antigo (string única) por compatibilidade com NC já submetidas.
  const causasExibidas = Array.isArray(nc.tratamento?.analiseCausas)
    ? nc.tratamento.analiseCausas
    : (nc.tratamento?.analiseCausas ? [nc.tratamento.analiseCausas] : []);

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-5">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border-2 transition-colors hover:bg-[#C8932F]/5"
          style={{ borderColor: GOLD, color: GOLD }}
        >
          <FaArrowLeft className="text-[10px]" /> Voltar à lista
        </button>

        {isSuperAdmin && (
          <button
            disabled={busy}
            onClick={handleDelete}
            className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border-2 border-red-200 text-red-500 transition-colors hover:bg-red-50 disabled:opacity-60"
          >
            <FaTrash className="text-[10px]" /> Apagar não conformidade
          </button>
        )}
      </div>

      <EstadoStepper estado={nc.estado} />

      <div className="flex flex-wrap items-center gap-2 mb-5">
        <Badge label={ncEstadoLabel(nc.estado)} color={NC_ESTADOS[nc.estado]?.color || "#6b7280"} />
        <Badge label={nc.gravidade} color={gravityColor[nc.gravidade] || "#6b7280"} />
        <span className="text-xs text-gray-400">Registada em {formatDate(nc.dataRegisto)}</span>
      </div>

      <Card title="Dados do registo" icon={<FaFileLines />}>
        <Field label="Origem da ocorrência" value={nc.origem} />
        <Field label="Departamentos / Funções envolvidos" value={(nc.departamentos || []).join(", ")} />
        <Field label="Descrição da ocorrência" value={nc.descricao} />
        <Field label="Correção realizada?" value={nc.correcaoRealizada} />
        {nc.correcaoRealizada === "Sim" && <Field label="Descrição das correções efetuadas" value={nc.descricaoCorrecao} />}
        <Field label="Registado por" value={nc.registadoPor} />
      </Card>

      <Card
        title="Pessoas envolvidas"
        icon={<FaUsers />}
        actions={canManageNaoConformidades && !editingEnvolvidos && (
          <button onClick={() => setEditingEnvolvidos(true)} className="text-xs font-semibold flex-shrink-0" style={{ color: GOLD }}>Editar</button>
        )}
      >
        {editingEnvolvidos ? (
          <>
            <EnvolvidosPicker value={envolvidosDraft} onChange={setEnvolvidosDraft} />
            <div className="flex gap-2 mt-3">
              <button disabled={busy} onClick={handleSaveEnvolvidos} className="px-4 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: GOLD }}>Guardar</button>
              <button onClick={() => { setEditingEnvolvidos(false); setEnvolvidosDraft((nc.envolvidos || []).map((e) => e.uid)); }} className="px-4 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-500">Cancelar</button>
            </div>
          </>
        ) : (nc.envolvidos || []).length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {(nc.envolvidos || []).map((e) => (
              <span key={e.uid} className="text-xs font-medium px-2 py-1 rounded-full" style={{ background: "#f5e6ca", color: GOLD }}>{e.nome}</span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">Nenhuma pessoa envolvida indicada.</p>
        )}
      </Card>

      <Card
        title="Catalogação"
        icon={<FaTag />}
        actions={canManageNaoConformidades && !editingCatalog && (
          <button onClick={() => setEditingCatalog(true)} className="text-xs font-semibold flex-shrink-0" style={{ color: GOLD }}>Editar</button>
        )}
      >
        {editingCatalog ? (
          <>
            {/* "Categoria" saiu do fluxo ativo de catalogação - código mantido comentado
                para reutilização futura, não apagado.
            <label className="text-xs text-gray-600 font-medium mb-1 block">Categoria</label>
            <input className="w-full border-2 rounded-lg px-3 py-2 text-sm outline-none transition mb-3" style={{ borderColor: "#e5e7eb" }}
              value={catalogForm.categoria} onChange={(e) => setCatalogForm({ ...catalogForm, categoria: e.target.value })} />
            */}
            <label className="text-xs text-gray-600 font-medium mb-1 block">Classificação</label>
            <p className="text-[11px] text-gray-400 mb-1">
              Classificação inicial atribuída por quem registou a NC. Pode ser alterada aqui pela Gestora de Qualidade - o valor guardado passa a ser o válido em toda a NC.
            </p>
            <select className="w-full border-2 rounded-lg px-3 py-2 text-sm outline-none transition mb-3 bg-white" style={{ borderColor: "#e5e7eb" }}
              value={gravidadeDraft} onChange={(e) => setGravidadeDraft(e.target.value)}>
              <option value="">-- Selecione --</option>
              {GRAVIDADES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <label className="text-xs text-gray-600 font-medium mb-1 block">Notas</label>
            <textarea rows={3} className="w-full border-2 rounded-lg px-3 py-2 text-sm outline-none resize-none transition mb-3" style={{ borderColor: "#e5e7eb" }}
              value={catalogForm.notas} onChange={(e) => setCatalogForm({ ...catalogForm, notas: e.target.value })} />
            <div className="flex gap-2">
              <button disabled={busy} onClick={handleSaveCatalogacao} className="px-4 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: GOLD }}>Guardar catalogação</button>
              <button
                onClick={() => {
                  setEditingCatalog(false);
                  setCatalogForm({ notas: nc.catalogacao?.notas || "" });
                  setGravidadeDraft(nc.gravidade || "");
                }}
                className="px-4 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-500"
              >
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <>
            <Field label="Classificação" value={nc.gravidade} />
            <Field label="Notas" value={nc.catalogacao?.notas} />
          </>
        )}
      </Card>

      <Card
        title="Responsável pelo tratamento da não conformidade"
        icon={<FaUserCheck />}
        actions={canAssignNaoConformidade && !editingResponsavel && (
          <button onClick={() => setEditingResponsavel(true)} className="text-xs font-semibold flex-shrink-0" style={{ color: GOLD }}>
            {nc.responsavelTratamentoUid ? "Alterar" : "Atribuir"}
          </button>
        )}
      >
        {editingResponsavel ? (
          <>
            <select className="w-full border-2 rounded-lg px-3 py-2 text-sm outline-none transition mb-3 bg-white" style={{ borderColor: "#e5e7eb" }}
              value={responsavelDraft} onChange={(e) => setResponsavelDraft(e.target.value)}>
              <option value="">-- Selecione uma pessoa envolvida --</option>
              {(nc.envolvidos || []).map((e) => <option key={e.uid} value={e.uid}>{e.nome}</option>)}
            </select>
            <div className="flex gap-2">
              <button disabled={busy} onClick={handleAssignResponsavel} className="px-4 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: GOLD }}>
                {nc.responsavelTratamentoUid ? "Alterar responsável" : "Atribuir responsável"}
              </button>
              <button
                onClick={() => { setEditingResponsavel(false); setResponsavelDraft(nc.responsavelTratamentoUid || ""); }}
                className="px-4 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-500"
              >
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <Field label="Responsável" value={nc.responsavelTratamentoNome} />
        )}
      </Card>

      <Card title="Questionário de tratamento" icon={<FaClipboardList />}>
        {nc.tratamento ? (
          <>
            <Field label="Descrição da não conformidade (perspetiva da análise)" value={nc.tratamento.descricaoAnalise} />
            <div className="mb-3">
              <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: GOLD }}>Análise das causas</div>
              {causasExibidas.length > 0 ? (
                <ol className="list-decimal list-inside text-sm text-gray-800 space-y-1">
                  {causasExibidas.map((c, i) => <li key={i}>{c}</li>)}
                </ol>
              ) : (
                <span className="text-sm italic text-gray-400">Não indicado</span>
              )}
            </div>
            {/* "Outras correções"/"Autor da análise"/"Outros envolvidos" desativados na UI -
                código mantido comentado para reutilização futura, não apagado.
            <Field label="Outras correções, responsável e prazo" value={nc.tratamento.outrasCorrecoes} />
            <Field label="Autor/a(s) da análise e tratamento" value={nc.tratamento.autorAnalise} />
            <Field label="Outros envolvidos na análise e tratamento" value={nc.tratamento.outrosEnvolvidos} />
            */}
          </>
        ) : podeEditarQuestionario ? (
          <>
            <label className="text-xs text-gray-600 font-medium mb-1 block">Descrição da não conformidade (perspetiva da análise) *</label>
            <p className="text-[11px] text-gray-400 mb-1">Pré-preenchida com a descrição da ocorrência do registo original - pode ajustar se necessário.</p>
            <textarea rows={4} className="w-full border-2 rounded-lg px-3 py-2 text-sm outline-none resize-none transition mb-1" style={{ borderColor: "#e5e7eb" }}
              value={tratamentoForm.descricaoAnalise} onChange={(e) => setTratamentoForm({ ...tratamentoForm, descricaoAnalise: e.target.value })} />
            {tratamentoErrors.descricaoAnalise && <p className="text-xs text-red-500 mb-2">{tratamentoErrors.descricaoAnalise}</p>}

            <label className="text-xs text-gray-600 font-medium mb-1 block mt-2">Análise das causas *</label>
            <AnaliseCausasEditor causas={causasDraft} onChange={setCausasDraft} error={tratamentoErrors.analiseCausas} />

            {/* "Outras correções, responsável e prazo" desativado na UI - código mantido
                comentado para reutilização futura, não apagado.
            <label className="text-xs text-gray-600 font-medium mb-1 block mt-2">Outras correções, responsável e prazo (opcional)</label>
            <textarea rows={3} className="w-full border-2 rounded-lg px-3 py-2 text-sm outline-none resize-none transition mb-3" style={{ borderColor: "#e5e7eb" }}
              value={tratamentoForm.outrasCorrecoes} onChange={(e) => setTratamentoForm({ ...tratamentoForm, outrasCorrecoes: e.target.value })} />
            */}

            {/* "Autor/a(s) da análise" e "Outros envolvidos na análise" desativados na UI -
                código mantido comentado para reutilização futura, não apagado.
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs text-gray-600 font-medium mb-1 block">Autor/a(s) da análise (opcional)</label>
                <input className="w-full border-2 rounded-lg px-3 py-2 text-sm outline-none transition" style={{ borderColor: "#e5e7eb" }}
                  value={tratamentoForm.autorAnalise} onChange={(e) => setTratamentoForm({ ...tratamentoForm, autorAnalise: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-600 font-medium mb-1 block">Outros envolvidos na análise (opcional)</label>
                <input className="w-full border-2 rounded-lg px-3 py-2 text-sm outline-none transition" style={{ borderColor: "#e5e7eb" }}
                  value={tratamentoForm.outrosEnvolvidos} onChange={(e) => setTratamentoForm({ ...tratamentoForm, outrosEnvolvidos: e.target.value })} />
              </div>
            </div>
            */}

            <h4 className="text-sm font-semibold text-gray-800 mb-2 mt-4">Ações corretivas *</h4>
            <AcoesCorretivasEditor acoes={acoesDraft} onChange={setAcoesDraft} envolvidos={nc.envolvidos || []} errors={tratamentoErrors} />

            <button disabled={busy} onClick={handleSubmitTratamento} className="mt-4 px-5 py-2 rounded-lg text-sm font-bold text-white transition-opacity disabled:opacity-60" style={{ background: GOLD }}>
              Submeter tratamento
            </button>
          </>
        ) : (
          <p className="text-sm text-gray-400 italic">
            {nc.responsavelTratamentoUid ? "Aguarda que o responsável pela não conformidade preencha o tratamento." : "Aguarda atribuição de um responsável pela não conformidade."}
          </p>
        )}
      </Card>

      {nc.acoes?.length > 0 && (
        <Card
          title="Ações corretivas"
          icon={<FaClipboardCheck />}
          actions={
            <span className="flex items-center gap-2 text-xs font-semibold text-gray-500 flex-shrink-0">
              <span className="w-14 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <span className="block h-full rounded-full" style={{ width: `${totalAcoesNc ? (eficazesNc / totalAcoesNc) * 100 : 0}%`, background: "#22c55e" }} />
              </span>
              {eficazesNc}/{totalAcoesNc} eficazes
            </span>
          }
        >
          <div className="flex flex-col gap-3">
            {nc.acoes.map((acao) => {
              const AcaoIcon = ACAO_ICONS[acao.estado] || FaClock;
              const acaoColor = ACAO_ESTADOS[acao.estado]?.color || "#6b7280";
              return (
                <div key={acao.id} className="border border-gray-200 rounded-xl p-4" style={{ borderLeftWidth: 4, borderLeftColor: acaoColor }}>
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <span className="text-sm font-medium text-gray-800 flex items-center gap-2 min-w-0 truncate">
                      <FaUserCheck className="text-gray-400 flex-shrink-0" /> {acao.responsavelNome}
                    </span>
                    <Badge label={<span className="inline-flex items-center gap-1"><AcaoIcon className="text-[10px]" /> {acaoEstadoLabel(acao.estado)}</span>} color={acaoColor} />
                  </div>
                  <p className="text-sm text-gray-600 mb-2 whitespace-pre-wrap">{acao.descricao}</p>
                  <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-2">
                    <span>Prazo de implementação: {formatDate(acao.prazoImplementacao) || acao.prazoImplementacao}</span>
                    <span>Prazo de verificação: {formatDate(acao.prazoVerificacaoEficacia) || acao.prazoVerificacaoEficacia}</span>
                  </div>

                  {acao.estado === "por_implementar" && canMarkAcaoImplementada(acao) && (
                    <button disabled={busy} onClick={() => handleMarcarImplementada(acao.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: GOLD }}>
                      Marcar como implementada
                    </button>
                  )}

                  {acao.estado === "implementada" && canVerifyEficacia && (
                    <div className="mt-2">
                      <input
                        className="w-full border-2 rounded-lg px-3 py-2 text-xs outline-none transition mb-2"
                        style={{ borderColor: "#e5e7eb" }}
                        placeholder="Observações da verificação (opcional)"
                        value={eficaciaNotas[acao.id] || ""}
                        onChange={(e) => setEficaciaNotas({ ...eficaciaNotas, [acao.id]: e.target.value })}
                      />
                      <button disabled={busy} onClick={() => handleVerificarEficacia(acao.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: "#22c55e" }}>
                        Validar eficácia
                      </button>
                    </div>
                  )}

                  {acao.estado === "eficaz" && acao.eficaciaObservacoes && (
                    <p className="text-xs text-gray-500 mt-1 italic">Observações da verificação: {acao.eficaciaObservacoes}</p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card title="Anexos (PDF)" icon={<FaPaperclip />}>
        {(nc.anexos || []).length > 0 ? (
          <ul className="flex flex-col gap-1.5 mb-3">
            {nc.anexos.map((anexo, idx) => (
              <li key={idx} className="flex items-center justify-between gap-2 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                <span className="flex items-center gap-2 min-w-0 truncate">
                  <FaFileLines className="text-gray-400 flex-shrink-0" /> <span className="truncate">{anexo.nome}</span>
                </span>
                <button onClick={() => handleDownloadAnexo(idx, anexo.nome)} className="text-xs font-semibold flex-shrink-0" style={{ color: GOLD }}>Abrir</button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400 italic mb-3">Sem anexos.</p>
        )}
        {podeAnexar && (
          <label className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border-2 cursor-pointer transition-colors hover:bg-[#C8932F]/5" style={{ borderColor: GOLD, color: GOLD }}>
            <FaPaperclip /> Anexar ficheiro PDF
            <input type="file" accept="application/pdf" onChange={handleUploadAnexo} className="hidden" />
          </label>
        )}
      </Card>

      {podeFechar && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-green-50 border border-green-200 rounded-2xl p-4 mb-10">
          <span className="flex items-center gap-2 text-sm text-green-700">
            <FaCircleCheck /> Todas as ações corretivas foram validadas como eficazes.
          </span>
          <button disabled={busy} onClick={handleFechar} className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold text-white shadow" style={{ background: "#22c55e" }}>
            <FaCircleCheck /> Fechar não conformidade definitivamente
          </button>
        </div>
      )}
    </div>
  );
}
