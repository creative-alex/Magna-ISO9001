import React, { useState } from "react";
import { toast } from "react-toastify";
import { FaEnvelope } from "react-icons/fa6";
import { apiFetch } from "../../shared/utils/apiFetch";

const GOLD = "#C8932F";
const MES_LABELS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

// Botão junto ao nome de cada entidade em ColaboradoresGroupedList (ver renderGroupExtra
// em ProcessamentoSalarios.jsx) - (re)envia o email "Recibo de vencimento disponível" a
// todos os colaboradores dessa entidade que já têm recibo guardado no mês indicado (ver
// notificarRecibosEntidade em salarioController.js). "entidade" vai pelo nome, tal como
// devolvido por getColaboradores/ColaboradoresGroupedList.
export default function NotificarRecibosButton({ entidade, mes }) {
  const [sending, setSending] = useState(false);
  const [ano, m] = mes.split("-");
  const mesLabel = `${MES_LABELS[Number(m) - 1]} de ${ano}`;

  const handleClick = async (e) => {
    e.stopPropagation(); // não colapsar o grupo da entidade ao clicar

    if (!window.confirm(`Enviar o email de recibo de vencimento (${mesLabel}) a todos os colaboradores de ${entidade} que já têm recibo guardado?`)) return;

    setSending(true);
    try {
      const res = await apiFetch(`/salario/notificar-recibos/${mes}`, {
        method: "POST",
        body: JSON.stringify({ entidade }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Falha ao enviar os emails", { position: "top-right" });
        return;
      }
      if (data.message) {
        toast.info(data.message, { position: "top-right" });
        return;
      }
      if (data.enviados > 0) {
        toast.success(`Email enviado a ${data.enviados} colaborador${data.enviados === 1 ? "" : "es"}`, { position: "top-right", autoClose: 3000 });
      }
      if (data.falhados?.length > 0) {
        toast.error(`Falhou o envio a ${data.falhados.length}: ${data.falhados.map((f) => f.nome).join(", ")} (${data.falhados[0].erro})`, { position: "top-right", autoClose: false });
      }
      if (data.semEmail?.length > 0) {
        toast.warn(`Sem email no cadastro: ${data.semEmail.join(", ")}`, { position: "top-right" });
      }
    } catch (err) {
      console.error("Erro ao notificar recibos da entidade:", err);
      toast.error("Falha ao enviar os emails", { position: "top-right" });
    } finally {
      setSending(false);
    }
  };

  return (
    <button
      type="button"
      disabled={sending}
      onClick={handleClick}
      title={`Enviar email de recibo (${mesLabel}) a quem já tem recibo guardado`}
      style={{
        display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
        padding: "4px 10px", fontSize: 11, fontWeight: 600, borderRadius: 999, whiteSpace: "nowrap",
        border: `1px solid ${GOLD}`, color: GOLD, background: "#fff", cursor: sending ? "wait" : "pointer",
      }}
    >
      <FaEnvelope size={11} />
      {sending ? "A enviar..." : "Notificar recibos"}
    </button>
  );
}
