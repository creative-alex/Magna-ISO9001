import React, { useState } from "react";
import { toast } from "react-toastify";
import { FaPaperPlane } from "react-icons/fa6";
import { apiFetch } from "../../../shared/utils/apiFetch";

// Botão junto ao nome de cada entidade em ColaboradoresGroupedList (ver renderGroupExtra
// em Colaboradores.jsx) - notifica de uma só vez todos os colaboradores dessa entidade
// que ainda não têm NIF registado, reaproveitando o mesmo aviso por email do botão
// individual "Notificar cadastro incompleto" em Cadastro.jsx (ver notifyEntidadeSemNif em
// cadastroController.js). "entidade" vai pelo nome, tal como devolvido por
// getColaboradores/ColaboradoresGroupedList.
export default function NotifySemNifButton({ entidade, count }) {
  const [sending, setSending] = useState(false);

  const handleClick = async (e) => {
    e.stopPropagation(); // não colapsar o grupo da entidade ao clicar

    const confirmMsg = `Enviar email de "cadastro incompleto" a ${count} colaborador${count === 1 ? "" : "es"} de ${entidade} sem NIF registado?`;
    if (!window.confirm(confirmMsg)) return;

    setSending(true);
    try {
      const res = await apiFetch("/cadastro/notify-sem-nif", {
        method: "POST",
        body: JSON.stringify({ entidade }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Falha ao enviar notificação", { position: "top-right" });
        return;
      }
      toast.success(data.message || "Notificação enviada", { position: "top-right", autoClose: 2500 });
    } catch (err) {
      console.error("Erro ao notificar colaboradores sem NIF:", err);
      toast.error("Falha ao enviar notificação", { position: "top-right" });
    } finally {
      setSending(false);
    }
  };

  return (
    <button
      type="button"
      disabled={sending}
      onClick={handleClick}
      title={`Notificar ${count} colaborador${count === 1 ? "" : "es"} sem NIF registado`}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border shrink-0 text-amber-700 border-amber-600 hover:bg-amber-50 disabled:cursor-wait disabled:opacity-60"
    >
      <FaPaperPlane size={11} />
      {sending ? "A enviar..." : `Sem NIF (${count})`}
    </button>
  );
}
