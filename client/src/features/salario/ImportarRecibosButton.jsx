import React, { useState } from "react";
import { toast } from "react-toastify";
import { FaFileImport, FaCircleCheck, FaTriangleExclamation, FaCircleXmark, FaPaperPlane, FaXmark } from "react-icons/fa6";
import { apiFetch } from "../../shared/utils/apiFetch";

const GOLD = "#C8932F";

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getMesLabel(mes) {
  const [y, m] = mes.split("-");
  const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const cardStyle = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" };

// Mensagem de uma página em revisão - "nome" vem do cadastro (colaborador identificado mas
// com outro problema, ex. já tem recibo ou está inativo); "nomePdf" é só o nome impresso no
// próprio recibo, usado quando não há nenhum colaborador correspondente no cadastro, para o
// RH saber a quem associar o NIF em falta.
function getReviewMessage(r) {
  if (r.motivo === "ja_existe") return `O colaborador ${r.nome || "?"} já tem o recibo deste mês guardado`;
  if (r.motivo === "nif_desconhecido") {
    return r.nomePdf
      ? `O colaborador ${r.nomePdf} não tem este NIF no cadastro`
      : "Nenhum colaborador tem este NIF no cadastro";
  }
  const nome = r.nome || r.nomePdf;
  return r.motivoLabel + (nome ? ` - ${nome}` : "");
}

function ContadorPill({ icon, count, label, color, bg }) {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderRadius: 10, background: bg }}>
      <span style={{ fontSize: 18, color }}>{icon}</span>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color }}>{count}</div>
        <div style={{ fontSize: 11, color, opacity: 0.85 }}>{label}</div>
      </div>
    </div>
  );
}

// Botão + modal de importação em lote de recibos de vencimento (ver ProcessamentoSalarios.jsx)
// - segue o mesmo padrão de ExportFechoMensalButton.jsx (componente autocontido, sem rota
// própria) em vez de uma página dedicada, já que é uma ação pontual sobre a lista de
// colaboradores, não um ecrã que se visite por si só.
export default function ImportarRecibosButton() {
  const [showModal, setShowModal] = useState(false);
  const [mes, setMes] = useState(getCurrentMonth());
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [resultado, setResultado] = useState(null);
  // Seleção de quem guardar e notificar - começa vazia de propósito (nada é gravado nem
  // enviado sem escolha explícita). O botão "Analisar" só faz uma pré-visualização (o
  // servidor classifica as páginas mas não escreve nada); é só ao confirmar a seleção que o
  // mesmo PDF é reenviado e essas páginas são efetivamente gravadas + notificadas por email.
  const [selecionados, setSelecionados] = useState(new Set());
  const [confirming, setConfirming] = useState(false);

  const resetState = () => {
    setMes(getCurrentMonth());
    setFile(null);
    setProcessing(false);
    setResultado(null);
    setSelecionados(new Set());
    setConfirming(false);
  };

  const openModal = (e) => {
    if (e) e.stopPropagation();
    resetState();
    setShowModal(true);
  };

  const closeModal = () => {
    if (processing || confirming) return;
    setShowModal(false);
  };

  const handleSelectPdf = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.type !== "application/pdf") {
      toast.error("O ficheiro tem de ser um PDF", { position: "top-right" });
      return;
    }
    setFile(f);
    setResultado(null);
    setSelecionados(new Set());
  };

  const handleProcessar = async () => {
    if (!file) {
      toast.error("Seleciona primeiro o PDF com os recibos do mês", { position: "top-right" });
      return;
    }
    setProcessing(true);
    setResultado(null);
    setSelecionados(new Set());
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiFetch(`/salario/import-recibos/${mes}`, { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        // Mantém o ficheiro em memória - é reenviado ao confirmar a seleção (ver
        // handleConfirmar), nada foi gravado ainda nesta fase.
        setResultado(data);
        toast.success("Análise concluída - escolhe quem guardar e notificar", { position: "top-right", autoClose: 3500 });
      } else {
        toast.error(data.error || "Falha ao analisar os recibos", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao analisar os recibos", { position: "top-right" });
    } finally {
      setProcessing(false);
    }
  };

  const toggleSelecionado = (uid) => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid); else next.add(uid);
      return next;
    });
  };

  const handleConfirmar = async () => {
    if (selecionados.size === 0) {
      toast.error("Seleciona pelo menos um colaborador", { position: "top-right" });
      return;
    }
    if (!file) {
      toast.error("O PDF já não está disponível - seleciona-o outra vez", { position: "top-right" });
      return;
    }
    const paginas = resultado.ok.filter((r) => selecionados.has(r.uid)).map((r) => r.pagina);
    setConfirming(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("paginas", JSON.stringify(paginas));
      const res = await apiFetch(`/salario/import-recibos/${mes}`, { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        setResultado(data);
        setSelecionados(new Set());
        setFile(null);
        toast.success(`${data.resumo.ok} recibo(s) guardado(s) e email(s) enviado(s)`, { position: "top-right", autoClose: 3500 });
      } else {
        toast.error(data.error || "Falha ao guardar os recibos", { position: "top-right" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao guardar os recibos", { position: "top-right" });
    } finally {
      setConfirming(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        title="Importar recibos de vencimento a partir de um PDF mensal"
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border cursor-pointer transition-colors"
        style={{ borderColor: GOLD, color: GOLD, background: "#fff" }}
      >
        <FaFileImport style={{ fontSize: 13 }} />
        Importar recibos
      </button>

      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-5"
          onClick={(e) => { e.stopPropagation(); closeModal(); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-[640px] w-full relative overflow-y-auto"
            style={{ maxHeight: "85vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeModal}
              disabled={processing || confirming}
              className="absolute top-4 right-4 !w-8 !h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer border-none bg-transparent disabled:cursor-not-allowed"
            >
              <FaXmark size={16} />
            </button>

            <div className="flex items-center gap-3 px-6 pt-6 pb-4 pr-14 border-b border-gray-100">
              <span className="w-10 h-10 rounded-xl bg-[#C8932F]/10 text-[#C8932F] flex items-center justify-center shrink-0">
                <FaFileImport size={15} />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-gray-900 leading-tight">Importar recibos de vencimento</h2>
                <p className="text-xs text-gray-500 mt-1">Um PDF com um recibo por página - cada página é associada ao colaborador pelo NIF</p>
              </div>
            </div>

            <div className="px-6 py-5" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="flex flex-col sm:flex-row gap-3">
                <div>
                  <span style={{ fontSize: 11, color: "#6b7280", marginBottom: 4, display: "block" }}>Mês</span>
                  <input
                    type="month"
                    value={mes}
                    disabled={processing}
                    onChange={(e) => e.target.value && setMes(e.target.value)}
                    style={{
                      fontSize: 13, padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7,
                      background: processing ? "#f3f4f6" : "#fafafa", color: "#111827",
                    }}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 11, color: "#6b7280", marginBottom: 4, display: "block" }}>PDF com os recibos de {getMesLabel(mes)}</span>
                  <label
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      padding: "8px 14px", fontSize: 13, fontWeight: 500,
                      border: `1px solid ${GOLD}`, borderRadius: 7, background: "#fff", color: GOLD,
                      cursor: processing ? "wait" : "pointer", opacity: processing ? 0.6 : 1,
                    }}
                  >
                    {file ? "Trocar ficheiro" : "Selecionar PDF"}
                    <input type="file" accept="application/pdf" disabled={processing} onChange={handleSelectPdf} style={{ display: "none" }} />
                  </label>
                  {file && (
                    <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                      {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleProcessar}
                disabled={processing || !file}
                style={{
                  padding: "10px 18px", fontSize: 13, fontWeight: 600, borderRadius: 8, border: "none",
                  background: processing || !file ? "#d1d5db" : GOLD, color: "#fff",
                  cursor: processing || !file ? "not-allowed" : "pointer", alignSelf: "flex-start",
                }}
              >
                {processing ? "A analisar..." : "Analisar PDF"}
              </button>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>
                Isto só analisa o PDF - nada é gravado nem notificado ainda. Páginas com NIF em falta, inválido,
                desconhecido, ambíguo, duplicado ou de um colaborador que já tem recibo este mês não ficam disponíveis
                para seleção (aparecem em revisão, com o NIF completo, para poderes confirmar no Cadastro; resolve-se
                depois com o upload individual na página do colaborador). Escolhe abaixo quem queres mesmo guardar e
                notificar por email.
              </div>

              {resultado && (
                <div style={cardStyle}>
                  <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
                      {resultado.confirmado ? "Importação concluída" : "Análise concluída"}
                    </span>
                    <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 8 }}>
                      {getMesLabel(resultado.mes)} · {resultado.totalPaginas} página{resultado.totalPaginas === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 16 }}>
                    <div className="flex flex-col sm:flex-row" style={{ gap: 10 }}>
                      <ContadorPill
                        icon={<FaCircleCheck />} count={resultado.resumo.ok}
                        label={resultado.confirmado ? "recibos guardados e notificados" : "recibos prontos a guardar"}
                        color="#15803D" bg="#DCFCE7"
                      />
                      <ContadorPill icon={<FaTriangleExclamation />} count={resultado.resumo.review} label="recibo(s) requer(em) revisão" color="#92400E" bg="#FEF3C7" />
                      <ContadorPill icon={<FaCircleXmark />} count={resultado.resumo.erro} label="erro(s) ao gravar" color="#B91C1C" bg="#FEE2E2" />
                    </div>

                    {/* Seleção só aparece na pré-visualização - depois de confirmado, "ok" já
                        representa o que foi mesmo gravado, não há mais nada a escolher. */}
                    {!resultado.confirmado && resultado.ok?.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>
                            Guardar e notificar ({selecionados.size} de {resultado.ok.length} selecionado{selecionados.size === 1 ? "" : "s"})
                          </span>
                          <div style={{ display: "flex", gap: 10 }}>
                            <button
                              type="button"
                              onClick={() => setSelecionados(new Set(resultado.ok.map((r) => r.uid)))}
                              style={{ fontSize: 11, color: GOLD, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                            >
                              Selecionar todos
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelecionados(new Set())}
                              style={{ fontSize: 11, color: "#6b7280", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                            >
                              Limpar
                            </button>
                          </div>
                        </div>
                        <div style={{ border: "1px solid #f3f4f6", borderRadius: 8, overflow: "hidden", marginBottom: 10 }}>
                          {resultado.ok.map((r, idx) => (
                            <label
                              key={r.uid}
                              style={{
                                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", cursor: "pointer",
                                borderTop: idx === 0 ? "none" : "1px solid #f3f4f6", fontSize: 12,
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={selecionados.has(r.uid)}
                                onChange={() => toggleSelecionado(r.uid)}
                              />
                              <span style={{ fontWeight: 600, color: "#111827" }}>{r.nome || r.uid}</span>
                              <span style={{ color: "#9ca3af" }}>{r.email || "sem email"}</span>
                            </label>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={handleConfirmar}
                          disabled={confirming || selecionados.size === 0}
                          style={{
                            display: "flex", alignItems: "center", gap: 8,
                            padding: "8px 14px", fontSize: 12, fontWeight: 600, borderRadius: 7, border: "none",
                            background: confirming || selecionados.size === 0 ? "#d1d5db" : GOLD, color: "#fff",
                            cursor: confirming || selecionados.size === 0 ? "not-allowed" : "pointer",
                          }}
                        >
                          <FaPaperPlane style={{ fontSize: 11 }} />
                          {confirming ? "A guardar..." : "Guardar e enviar emails aos selecionados"}
                        </button>
                      </div>
                    )}

                    {resultado.review?.length > 0 && (
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#111827", marginBottom: 8 }}>Páginas que requerem revisão</div>
                        <div style={{ border: "1px solid #f3f4f6", borderRadius: 8, overflow: "hidden" }}>
                          {resultado.review.map((r, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: "flex", flexDirection: "column", gap: 2, padding: "10px 12px",
                                borderTop: idx === 0 ? "none" : "1px solid #f3f4f6", fontSize: 12,
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                <span style={{ fontWeight: 600, color: "#111827" }}>Página {r.pagina}</span>
                                {r.nif && <span style={{ color: "#9ca3af" }}>NIF {r.nif}</span>}
                              </div>
                              <span style={{ color: "#92400E" }}>{getReviewMessage(r)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {resultado.erros?.length > 0 && (
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#111827", marginBottom: 8 }}>Falhas técnicas ao gravar</div>
                        <div style={{ border: "1px solid #f3f4f6", borderRadius: 8, overflow: "hidden" }}>
                          {resultado.erros.map((r, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: "flex", justifyContent: "space-between", padding: "10px 12px",
                                borderTop: idx === 0 ? "none" : "1px solid #f3f4f6", fontSize: 12,
                              }}
                            >
                              <span style={{ fontWeight: 600, color: "#111827" }}>Página {r.pagina}</span>
                              <span style={{ color: "#B91C1C" }}>{r.nome || r.uid}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
