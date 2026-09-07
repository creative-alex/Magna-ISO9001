import React, { useCallback, useContext, useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { UserContext } from "../../shared/context/userContext";
import Sidebar from "../../shared/components/Sidebar";
import Topbar from "../../shared/components/Topbar";
import {
  FaGraduationCap, FaFileLines, FaPencil, FaCheck, FaArrowLeft, FaTrash, FaPlus,
  FaCircleCheck, FaClock, FaChevronDown, FaChevronUp,
} from "react-icons/fa6";
import { apiFetch } from "../../shared/utils/apiFetch";
import { getNomeCurto } from "../../shared/utils/nomeCurto";

const GOLD = "#C8932F";

const ACAO_FIELDS = [
  { key: "nome_acao", label: "Nome da ação", type: "text", span: 2 },
  { key: "entidade_formadora", label: "Entidade formadora", type: "text", span: 1 },
  { key: "local", label: "Local", type: "text", span: 1 },
  { key: "horario", label: "Horário", type: "select", span: 1, options: ["Laboral", "Pós-Laboral", "Misto"] },
  { key: "duracao", label: "Duração (horas)", type: "number", span: 1 },
  { key: "prazo_ano", label: "Prazo (ano limite)", type: "number", span: 1 },
  { key: "objetivos", label: "Objetivos", type: "textarea", span: 3, rows: 4 },
];

function getCurrentYear() {
  return String(new Date().getFullYear());
}

function getTodayISO() {
  return new Date().toISOString().slice(0, 10);
}

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

export default function FormacaoColaborador() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { uid, nivelAcesso, username } = useContext(UserContext);
  const isAdmin = nivelAcesso === "SuperAdmin";
  const isHR = nivelAcesso === "GestorRH";
  const isAdministrador = nivelAcesso === "Administrador";
  const canManage = isAdmin || isHR;
  const isSelf = uid === id;
  // Administrador só tem acesso de leitura (o backend confirma que o colaborador é da
  // sua entidade); nunca ganha canManage, por isso os botões de edição continuam ocultos.
  const canView = canManage || isSelf || isAdministrador;
  // Quando um colaborador acede ao seu próprio plano (ex. redirecionado a partir de
  // /plano-formacao), não vem nenhum "nome" na navegação  -  usa-se o nome do próprio
  // utilizador autenticado em vez de cair no id (UID/slug) em bruto.
  const targetLabel = location.state?.nome || (isSelf ? username : null) || id;
  const nomeCurto = getNomeCurto(targetLabel);

  const [ano, setAno] = useState(getCurrentYear());
  const [loading, setLoading] = useState(true);
  const [acoes, setAcoes] = useState([]);
  const [addingAcao, setAddingAcao] = useState(false);
  const [editingIds, setEditingIds] = useState(new Set());
  const [savingIds, setSavingIds] = useState(new Set());
  const [uploadingCertId, setUploadingCertId] = useState(null);
  const [viewingCertId, setViewingCertId] = useState(null);
  const [removingCertId, setRemovingCertId] = useState(null);
  const [deletingAcaoId, setDeletingAcaoId] = useState(null);
  const [markingDoneId, setMarkingDoneId] = useState(null);
  const [confirmingDoneId, setConfirmingDoneId] = useState(null);
  const [dataConclusaoDraft, setDataConclusaoDraft] = useState("");
  // Ações já realizadas começam colapsadas (só o cabeçalho é visível); o
  // colaborador/RH pode expandir uma de cada vez para ver os detalhes.
  const [expandedIds, setExpandedIds] = useState(new Set());
  // Formulário para o colaborador registar, por iniciativa própria, uma
  // formação que já fez (entra sempre criada como concluída).
  const [addingConcluidaOpen, setAddingConcluidaOpen] = useState(false);
  const [savingNovaConcluida, setSavingNovaConcluida] = useState(false);
  const [novaAcaoConcluida, setNovaAcaoConcluida] = useState(() => ({
    nome_acao: "", entidade_formadora: "", local: "", horario: "", duracao: "", objetivos: "",
    dataConclusao: getTodayISO(),
  }));

  useEffect(() => {
    if (!canView) {
      navigate("/dashboard", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchFormacao = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/formacao/${id}/${ano}`);
      if (res.ok) {
        const data = await res.json();
        setAcoes(data.acoes || []);
        setEditingIds(new Set());
      } else {
        toast.error("Não foi possível carregar o plano de formação", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível carregar o plano de formação", { position: "top-right" });
    } finally {
      setLoading(false);
    }
  }, [id, ano]);

  useEffect(() => {
    if (!canView) return;
    fetchFormacao();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, ano]);

  const handleChange = (acaoId, key, value) => {
    setAcoes(prev => prev.map(a => a.id === acaoId ? { ...a, [key]: value } : a));
  };

  // Uma ação "por fazer" continua visível em todos os anos até ser concluída, por
  // isso pode não estar fisicamente guardada no ano que está a ser consultado; os
  // pedidos por ação têm de apontar sempre para o ano onde ela ficou guardada.
  const getAnoArmazenamento = (acaoId) => acoes.find(a => a.id === acaoId)?.ano_armazenamento || ano;

  const handleAddAcao = async () => {
    setAddingAcao(true);
    try {
      const res = await apiFetch(`/formacao/${id}/${ano}/acoes`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setAcoes(prev => [...prev, data.acao]);
        setEditingIds(prev => new Set(prev).add(data.acao.id));
      } else {
        toast.error("Falha ao adicionar ação de formação", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao adicionar ação de formação", { position: "top-right" });
    } finally {
      setAddingAcao(false);
    }
  };

  const handleAbrirNovaConcluida = () => {
    setNovaAcaoConcluida({
      nome_acao: "", entidade_formadora: "", local: "", horario: "", duracao: "", objetivos: "",
      dataConclusao: getTodayISO(),
    });
    setAddingConcluidaOpen(true);
  };

  const handleCancelarNovaConcluida = () => {
    setAddingConcluidaOpen(false);
  };

  const handleChangeNovaConcluida = (key, value) => {
    setNovaAcaoConcluida(prev => ({ ...prev, [key]: value }));
  };

  const handleGuardarNovaConcluida = async () => {
    if (!novaAcaoConcluida.nome_acao || !novaAcaoConcluida.dataConclusao) return;
    setSavingNovaConcluida(true);
    try {
      const { dataConclusao, ...acao } = novaAcaoConcluida;
      const res = await apiFetch(`/formacao/${id}/${ano}/acoes/concluida`, {
        method: "POST",
        body: JSON.stringify({ acao, dataConclusao }),
      });
      if (res.ok) {
        // Uma ação concluída só aparece no ano em que caiu a data de conclusão, por
        // isso é preciso voltar a ir buscar a lista em vez de só adicionar em memória.
        await fetchFormacao();
        setAddingConcluidaOpen(false);
        toast.success("Ação de formação adicionada", { position: "top-right", autoClose: 2000 });
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Falha ao adicionar a ação de formação", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao adicionar a ação de formação", { position: "top-right" });
    } finally {
      setSavingNovaConcluida(false);
    }
  };

  const handleDeleteAcao = async (acaoId) => {
    setDeletingAcaoId(acaoId);
    try {
      const res = await apiFetch(`/formacao/${id}/${getAnoArmazenamento(acaoId)}/acoes/${acaoId}`, { method: "DELETE" });
      if (res.ok) {
        setAcoes(prev => prev.filter(a => a.id !== acaoId));
        setEditingIds(prev => removeFromSet(prev, acaoId));
        toast.success("Ação de formação eliminada", { position: "top-right", autoClose: 2000 });
      } else {
        toast.error("Falha ao eliminar a ação de formação", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao eliminar a ação de formação", { position: "top-right" });
    } finally {
      setDeletingAcaoId(null);
    }
  };

  const handleToggleEdit = (acaoId) => {
    setEditingIds(prev => toggleInSet(prev, acaoId));
  };

  const handleToggleExpand = (acaoId) => {
    setExpandedIds(prev => toggleInSet(prev, acaoId));
  };

  const handleSaveAcao = async (acaoId) => {
    const acao = acoes.find(a => a.id === acaoId);
    if (!acao) return;
    setSavingIds(prev => new Set(prev).add(acaoId));
    try {
      const res = await apiFetch(`/formacao/${id}/${acao.ano_armazenamento || ano}/acoes/${acaoId}`, {
        method: "PUT",
        body: JSON.stringify({ acao }),
      });
      if (res.ok) {
        setEditingIds(prev => removeFromSet(prev, acaoId));
        toast.success("Ação de formação guardada", { position: "top-right", autoClose: 2000 });
      } else {
        toast.error("Falha ao guardar a ação de formação", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao guardar a ação de formação", { position: "top-right" });
    } finally {
      setSavingIds(prev => removeFromSet(prev, acaoId));
    }
  };

  const handleAbrirConfirmacaoConcluida = (acaoId) => {
    setConfirmingDoneId(acaoId);
    setDataConclusaoDraft(getTodayISO());
  };

  const handleCancelarConfirmacaoConcluida = () => {
    setConfirmingDoneId(null);
    setDataConclusaoDraft("");
  };

  const handleMarcarConcluida = async (acaoId) => {
    if (!dataConclusaoDraft) return;
    setMarkingDoneId(acaoId);
    try {
      const res = await apiFetch(`/formacao/${id}/${getAnoArmazenamento(acaoId)}/acoes/${acaoId}/concluida`, {
        method: "PUT",
        body: JSON.stringify({ dataConclusao: dataConclusaoDraft }),
      });
      if (res.ok) {
        // Uma ação concluída só aparece no ano em que caiu a data de conclusão, por
        // isso é preciso voltar a ir buscar a lista em vez de só marcar em memória.
        await fetchFormacao();
        setConfirmingDoneId(null);
        setDataConclusaoDraft("");
        toast.success("Ação de formação marcada como concluída", { position: "top-right", autoClose: 2000 });
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Falha ao marcar a ação como concluída", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao marcar a ação como concluída", { position: "top-right" });
    } finally {
      setMarkingDoneId(null);
    }
  };

  const handleUploadCertificado = async (acaoId, file) => {
    if (!file) return;
    setUploadingCertId(acaoId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiFetch(`/formacao/${id}/${getAnoArmazenamento(acaoId)}/acoes/${acaoId}/certificado`, { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        setAcoes(prev => prev.map(a => a.id === acaoId
          ? { ...a, certificado_nome_ficheiro: data.certificado_nome_ficheiro, certificado_path: data.certificado_path }
          : a));
        toast.success("Certificado guardado", { position: "top-right", autoClose: 2500 });
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Falha ao enviar o certificado", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao enviar o certificado", { position: "top-right" });
    } finally {
      setUploadingCertId(null);
    }
  };

  const handleRemoveCertificado = async (acaoId) => {
    setRemovingCertId(acaoId);
    try {
      const res = await apiFetch(`/formacao/${id}/${getAnoArmazenamento(acaoId)}/acoes/${acaoId}/certificado`, { method: "DELETE" });
      if (res.ok) {
        setAcoes(prev => prev.map(a => a.id === acaoId
          ? { ...a, certificado_nome_ficheiro: null, certificado_path: null }
          : a));
        toast.success("Certificado removido", { position: "top-right", autoClose: 2000 });
      } else {
        toast.error("Falha ao remover o certificado", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao remover o certificado", { position: "top-right" });
    } finally {
      setRemovingCertId(null);
    }
  };

  const handleViewCertificado = async (acao) => {
    if (!acao.certificado_path) return;
    setViewingCertId(acao.id);
    try {
      const res = await apiFetch(`/files/download`, {
        method: "POST",
        body: JSON.stringify({ path: encodeURIComponent(acao.certificado_path) }),
      });
      if (res.ok) {
        const blob = await res.blob();
        window.open(URL.createObjectURL(blob), "_blank");
      } else {
        toast.error("Falha ao abrir o certificado", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao abrir o certificado", { position: "top-right" });
    } finally {
      setViewingCertId(null);
    }
  };

  const inputStyle = (isEditing) => ({
    width: "100%", fontSize: 13, color: "#111827", fontWeight: 500,
    border: "1px solid #e5e7eb", borderRadius: 6, padding: "7px 9px",
    outline: "none", background: isEditing ? "#fafafa" : "#fff",
    boxSizing: "border-box", fontFamily: "inherit",
  });

  const labelStyle = { fontSize: 11, color: "#6b7280", marginBottom: 4, display: "block" };

  const renderAcaoField = (acao, field, isEditing) => {
    const { key, label, type, span, rows, options } = field;
    const value = acao[key];

    if (type === "select") {
      return (
        <div key={key} style={{ gridColumn: `span ${span}` }}>
          <span style={labelStyle}>{label}</span>
          {isEditing ? (
            <select value={value} onChange={e => handleChange(acao.id, key, e.target.value)} style={inputStyle(isEditing)}>
              <option value="">Selecionar...</option>
              {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{value || " - "}</div>
          )}
        </div>
      );
    }

    return (
      <div key={key} style={{ gridColumn: `span ${span}` }}>
        <span style={labelStyle}>{label}</span>

        {isEditing ? (
          type === "textarea" ? (
            <textarea
              value={value}
              onChange={e => handleChange(acao.id, key, e.target.value)}
              rows={rows || 2}
              style={{ ...inputStyle(isEditing), resize: "vertical" }}
            />
          ) : (
            <input
              type={type === "number" ? "number" : "text"}
              min={type === "number" ? 0 : undefined}
              value={value}
              onChange={e => handleChange(acao.id, key, e.target.value)}
              style={inputStyle(isEditing)}
            />
          )
        ) : (
          <div style={{ fontSize: 13, color: "#111827", fontWeight: 500, whiteSpace: "pre-wrap" }}>
            {value || " - "}
          </div>
        )}
      </div>
    );
  };

  const handleSelectFile = (filePath) => {
    const formattedPath = filePath.replace(/\s/g, "-").replace(/\//g, "__");
    navigate(`/file/${formattedPath}`, { state: { originalFilename: filePath } });
  };

  if (!canView) return null;

  const anoOptions = Array.from({ length: 6 }, (_, i) => String(new Date().getFullYear() - i));
  const anySaving = savingIds.size > 0;
  const totalHorasAno = acoes.filter(a => a.concluida).reduce((sum, a) => sum + (Number(a.duracao) || 0), 0);
  // O colaborador só pode marcar como concluídas as ações que o RH colocou
  // "por fazer"; por isso a lista aparece sempre dividida nestes dois grupos.
  const porFazerList = acoes.filter(a => !a.concluida);
  const concluidasList = acoes.filter(a => a.concluida);

  const sectionHeaderStyle = {
    display: "flex", alignItems: "center", gap: 8,
    fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: -6,
  };
  const emptySectionStyle = {
    background: "#fff", border: "1px dashed #e5e7eb", borderRadius: 10,
    padding: 18, textAlign: "center", fontSize: 13, color: "#9ca3af",
  };

  const renderAcaoCard = (acao, index, list) => {
    const isEditing = editingIds.has(acao.id);
    const isSaving = savingIds.has(acao.id);
    const isMarkingDone = markingDoneId === acao.id;
    const isConfirmingDone = confirmingDoneId === acao.id;
    const isLast = index === list.length - 1;
    // Uma ação concluída começa colapsada; só mostra os detalhes se o utilizador
    // a expandir ou estiver a editá-la (o RH precisa de ver os campos para editar).
    const showBody = !acao.concluida || isEditing || expandedIds.has(acao.id);
    // O certificado pode ser gerido pelo próprio colaborador ou pelo RH/SuperAdmin.
    const canManageCertificado = isSelf || canManage;
    return (
      <div key={acao.id} style={{ borderBottom: isLast ? "none" : "1px solid #e5e7eb" }}>
        <div
          onClick={() => { if (acao.concluida && !isEditing) handleToggleExpand(acao.id); }}
          title={acao.concluida && !isEditing ? (showBody ? "Colapsar" : "Expandir") : undefined}
          style={{
            padding: "14px 18px", borderBottom: "1px solid #f3f4f6", borderLeft: `3px solid ${GOLD}`,
            background: `${GOLD}26`, display: "flex", alignItems: "center", gap: 8,
            cursor: acao.concluida && !isEditing ? "pointer" : "default",
          }}
        >
          <FaGraduationCap style={{ color: GOLD, fontSize: 14 }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>
            {acao.nome_acao || `Ação ${index + 1}`}
          </span>
          {!acao.concluida && acao.prazo_ano && (
            <span style={{
              fontSize: 11, fontWeight: 600, color: "#92400e",
              background: "#fff", border: "1px solid #fde68a", borderRadius: 999, padding: "2px 8px",
            }}>
              até {acao.prazo_ano}
            </span>
          )}
          <div
            onClick={e => e.stopPropagation()}
            style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}
          >
            {isSelf && !acao.concluida && (
              isConfirmingDone ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="date"
                    value={dataConclusaoDraft}
                    max={getTodayISO()}
                    onChange={e => setDataConclusaoDraft(e.target.value)}
                    style={{
                      fontSize: 12, padding: "6px 8px", border: "1px solid #e5e7eb", borderRadius: 7,
                      background: "#fafafa", color: "#111827",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleMarcarConcluida(acao.id)}
                    disabled={isMarkingDone || !dataConclusaoDraft}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "6px 12px", fontSize: 12, fontWeight: 500,
                      cursor: (isMarkingDone || !dataConclusaoDraft) ? "not-allowed" : "pointer",
                      border: "1px solid #22c55e", borderRadius: 7, background: "#fff",
                      color: "#22c55e", opacity: (isMarkingDone || !dataConclusaoDraft) ? 0.6 : 1,
                    }}
                  >
                    <FaCheck style={{ fontSize: 11 }} />
                    {isMarkingDone ? "A marcar..." : "Confirmar"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelarConfirmacaoConcluida}
                    disabled={isMarkingDone}
                    style={{
                      padding: "6px 12px", fontSize: 12, fontWeight: 500, cursor: isMarkingDone ? "wait" : "pointer",
                      border: "1px solid #e5e7eb", borderRadius: 7, background: "#fff", color: "#6b7280",
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleAbrirConfirmacaoConcluida(acao.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer",
                    border: "1px solid #22c55e", borderRadius: 7, background: "#fff", color: "#22c55e",
                  }}
                >
                  <FaCheck style={{ fontSize: 11 }} />
                  Marcar como concluída
                </button>
              )
            )}
            {canManage && isEditing && (
              <button
                type="button"
                onClick={() => handleDeleteAcao(acao.id)}
                disabled={deletingAcaoId === acao.id}
                title="Eliminar ação de formação"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 26, height: 26,
                  cursor: deletingAcaoId === acao.id ? "wait" : "pointer",
                  border: "1px solid #fee2e2", borderRadius: 7, background: "#fff", color: "#dc2626",
                }}
              >
                <FaTrash style={{ fontSize: 10 }} />
              </button>
            )}
            {canManage && isEditing && (
              <select
                value={acao.concluida ? "concluida" : "por_fazer"}
                onChange={e => handleChange(acao.id, "concluida", e.target.value === "concluida")}
                title="Estado da ação de formação"
                style={{
                  fontSize: 12, padding: "6px 8px", border: "1px solid #e5e7eb", borderRadius: 7,
                  background: "#fafafa", color: "#111827",
                }}
              >
                <option value="por_fazer">Por fazer</option>
                <option value="concluida">Concluída</option>
              </select>
            )}
            {canManage && (
              <button
                disabled={isSaving}
                onClick={() => { if (isEditing) handleSaveAcao(acao.id); else handleToggleEdit(acao.id); }}
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
            {acao.concluida && !isEditing && (
              <button
                type="button"
                onClick={() => handleToggleExpand(acao.id)}
                title={showBody ? "Colapsar" : "Expandir"}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 26, height: 26, border: "1px solid #e5e7eb", borderRadius: 7,
                  background: "#fff", color: "#6b7280", cursor: "pointer",
                }}
              >
                {showBody ? <FaChevronUp style={{ fontSize: 10 }} /> : <FaChevronDown style={{ fontSize: 10 }} />}
              </button>
            )}
          </div>
        </div>

        {acao.concluida && (
          // Fora do showBody de propósito: o colaborador tem de poder anexar/ver o
          // certificado mesmo com a ação colapsada, sem ter de a expandir.
          <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 10, borderBottom: showBody ? "1px solid #f3f4f6" : "none" }}>
            <span style={{ ...labelStyle, marginBottom: 0 }}>Certificado:</span>
            {acao.certificado_nome_ficheiro ? (
              <>
                <span style={{
                  display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#111827",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220,
                }}>
                  <FaFileLines style={{ color: "#9ca3af", fontSize: 12, flexShrink: 0 }} />
                  {acao.certificado_nome_ficheiro}
                </span>
                <button
                  type="button"
                  onClick={() => handleViewCertificado(acao)}
                  disabled={viewingCertId === acao.id}
                  style={{
                    padding: "4px 10px", fontSize: 12, fontWeight: 500,
                    cursor: viewingCertId === acao.id ? "wait" : "pointer",
                    border: "1px solid #e5e7eb", borderRadius: 7, background: "#fff", color: "#6b7280",
                  }}
                >
                  {viewingCertId === acao.id ? "A abrir..." : "Ver"}
                </button>
                {canManageCertificado && (
                  <button
                    type="button"
                    onClick={() => handleRemoveCertificado(acao.id)}
                    disabled={removingCertId === acao.id}
                    title="Remover certificado"
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      width: 26, height: 26, cursor: removingCertId === acao.id ? "wait" : "pointer",
                      border: "1px solid #fee2e2", borderRadius: 7, background: "#fff", color: "#dc2626",
                    }}
                  >
                    <FaTrash style={{ fontSize: 10 }} />
                  </button>
                )}
              </>
            ) : canManageCertificado ? (
              // O certificado só pode ser adicionado pelo próprio colaborador ou pelo
              // RH/SuperAdmin, e só depois de a ação estar marcada como concluída (o
              // backend impõe as mesmas duas regras).
              <label
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "5px 11px", fontSize: 12, fontWeight: 500,
                  border: `1px solid ${GOLD}`, borderRadius: 7, background: "#fff", color: GOLD,
                  cursor: uploadingCertId === acao.id ? "wait" : "pointer",
                  opacity: uploadingCertId === acao.id ? 0.6 : 1,
                }}
              >
                {uploadingCertId === acao.id ? "A enviar..." : "Adicionar certificado"}
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  disabled={uploadingCertId === acao.id}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    handleUploadCertificado(acao.id, file);
                  }}
                  style={{ display: "none" }}
                />
              </label>
            ) : (
              <span style={{ fontSize: 13, color: "#9ca3af" }}>Sem certificado</span>
            )}
          </div>
        )}

        {showBody && (
          <div style={{ padding: 18 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px 20px" }}>
              {ACAO_FIELDS
                .filter(field => field.key !== "prazo_ano" || !acao.concluida)
                .map(field => renderAcaoField(acao, field, isEditing))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar onSelectFile={handleSelectFile} />

      <div className="ml-[var(--sidebar-w,230px)] transition-[margin-left] duration-200 flex-1 min-w-0 flex flex-col min-h-screen">
        <Topbar icon="🎓" title="Plano de Formação" />

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>

          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "18px 24px", display: "flex", alignItems: "center", gap: 16 }}>
            <button
              onClick={() => navigate(canManage ? "/plano-formacao" : "/dashboard")}
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
                Plano de formação  -  {nomeCurto}
              </div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 3 }}>
                Ano civil de {ano}
              </div>
            </div>
            <select
              value={ano}
              disabled={editingIds.size > 0 || anySaving}
              onChange={e => setAno(e.target.value)}
              title={editingIds.size > 0 ? "Termina a edição para mudar de ano" : "Mudar de ano"}
              style={{
                fontSize: 13, padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7,
                background: editingIds.size > 0 ? "#f3f4f6" : "#fafafa", color: "#111827", flexShrink: 0,
              }}
            >
              {anoOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          {loading ? (
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 40, textAlign: "center", fontSize: 13, color: "#9ca3af" }}>
              A carregar plano de formação...
            </div>
          ) : acoes.length === 0 ? (
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 24, textAlign: "center", fontSize: 13, color: "#9ca3af" }}>
              Sem ações de formação registadas para este ano.
            </div>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={sectionHeaderStyle}>
                  <FaClock style={{ color: "#92400e", fontSize: 13 }} />
                  Por realizar ({porFazerList.length})
                </div>
                {porFazerList.length === 0 ? (
                  <div style={emptySectionStyle}>Sem ações de formação por realizar.</div>
                ) : (
                  <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                    {porFazerList.map(renderAcaoCard)}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ ...sectionHeaderStyle, justifyContent: "space-between" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <FaCircleCheck style={{ color: "#15803d", fontSize: 13 }} />
                    Já realizadas ({concluidasList.length})
                  </span>
                  <span style={{ display: "flex", alignItems: "baseline", gap: 5, fontWeight: 400 }}>
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>Total de horas</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{totalHorasAno}h</span>
                  </span>
                </div>
                {concluidasList.length === 0 ? (
                  <div style={emptySectionStyle}>Sem ações de formação concluídas.</div>
                ) : (
                  <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                    {concluidasList.map(renderAcaoCard)}
                  </div>
                )}
              </div>
            </>
          )}

          {!loading && canManage && (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <button
                type="button"
                onClick={handleAddAcao}
                disabled={addingAcao}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 16px", fontSize: 13, fontWeight: 500,
                  cursor: addingAcao ? "wait" : "pointer",
                  border: `1px dashed ${GOLD}`, borderRadius: 7, background: "#fff", color: GOLD,
                }}
              >
                <FaPlus style={{ fontSize: 11 }} />
                {addingAcao ? "A adicionar..." : "Adicionar ação de formação"}
              </button>
            </div>
          )}

          {!loading && isSelf && (
            addingConcluidaOpen ? (
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
                  Nova ação de formação já concluída
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px 20px" }}>
                  {ACAO_FIELDS.filter(field => field.key !== "prazo_ano").map(field => (
                    <div key={field.key} style={{ gridColumn: `span ${field.span}` }}>
                      <span style={labelStyle}>{field.label}</span>
                      {field.type === "select" ? (
                        <select
                          value={novaAcaoConcluida[field.key]}
                          onChange={e => handleChangeNovaConcluida(field.key, e.target.value)}
                          style={inputStyle(true)}
                        >
                          <option value="">Selecionar...</option>
                          {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : field.type === "textarea" ? (
                        <textarea
                          value={novaAcaoConcluida[field.key]}
                          onChange={e => handleChangeNovaConcluida(field.key, e.target.value)}
                          rows={field.rows || 2}
                          style={{ ...inputStyle(true), resize: "vertical" }}
                        />
                      ) : (
                        <input
                          type={field.type === "number" ? "number" : "text"}
                          min={field.type === "number" ? 0 : undefined}
                          value={novaAcaoConcluida[field.key]}
                          onChange={e => handleChangeNovaConcluida(field.key, e.target.value)}
                          style={inputStyle(true)}
                        />
                      )}
                    </div>
                  ))}
                  <div style={{ gridColumn: "span 1" }}>
                    <span style={labelStyle}>Data de conclusão</span>
                    <input
                      type="date"
                      max={getTodayISO()}
                      value={novaAcaoConcluida.dataConclusao}
                      onChange={e => handleChangeNovaConcluida("dataConclusao", e.target.value)}
                      style={inputStyle(true)}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <button
                    type="button"
                    onClick={handleCancelarNovaConcluida}
                    disabled={savingNovaConcluida}
                    style={{
                      padding: "7px 14px", fontSize: 13, fontWeight: 500, cursor: savingNovaConcluida ? "wait" : "pointer",
                      border: "1px solid #e5e7eb", borderRadius: 7, background: "#fff", color: "#6b7280",
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleGuardarNovaConcluida}
                    disabled={savingNovaConcluida || !novaAcaoConcluida.nome_acao || !novaAcaoConcluida.dataConclusao}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "7px 14px", fontSize: 13, fontWeight: 500,
                      cursor: (savingNovaConcluida || !novaAcaoConcluida.nome_acao || !novaAcaoConcluida.dataConclusao) ? "not-allowed" : "pointer",
                      border: "1px solid #22c55e", borderRadius: 7, background: "#fff", color: "#22c55e",
                      opacity: (savingNovaConcluida || !novaAcaoConcluida.nome_acao || !novaAcaoConcluida.dataConclusao) ? 0.6 : 1,
                    }}
                  >
                    <FaCheck style={{ fontSize: 11 }} />
                    {savingNovaConcluida ? "A guardar..." : "Guardar"}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "center" }}>
                <button
                  type="button"
                  onClick={handleAbrirNovaConcluida}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer",
                    border: "1px dashed #22c55e", borderRadius: 7, background: "#fff", color: "#22c55e",
                  }}
                >
                  <FaPlus style={{ fontSize: 11 }} />
                  Registar Formação Interna por Iniciativa do Colaborador/a
                </button>
              </div>
            )
          )}

        </div>
      </div>
    </div>
  );
}
