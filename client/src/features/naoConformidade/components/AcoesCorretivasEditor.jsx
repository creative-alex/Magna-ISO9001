import React from "react";
import { FaPlus, FaTrash } from "react-icons/fa6";

const GOLD = "#C8932F";

let nextLocalId = 1;
export function novaAcaoVazia() {
  return { localId: nextLocalId++, descricao: "", responsavelUid: "", prazoImplementacao: "", prazoVerificacaoEficacia: "" };
}

// Editor das ações corretivas dentro do questionário de tratamento - só usado pelo
// responsável pela NC (ver NaoConformidadeDetail.jsx). O responsável de cada ação só pode
// ser escolhido de entre "envolvidos" (a validação real está sempre no backend, ver
// submitTratamento em naoConformidadeController.js - isto é só para não deixar escolher
// no frontend quem já sabemos que o backend vai recusar).
export default function AcoesCorretivasEditor({ acoes, onChange, envolvidos, errors }) {
  const update = (localId, field, value) => {
    onChange(acoes.map((a) => (a.localId === localId ? { ...a, [field]: value } : a)));
  };
  const remove = (localId) => onChange(acoes.filter((a) => a.localId !== localId));
  const add = () => onChange([...acoes, novaAcaoVazia()]);

  return (
    <div className="flex flex-col gap-4">
      {acoes.map((acao, idx) => (
        <div key={acao.localId} className="border border-gray-200 rounded-xl p-4 relative bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: GOLD }}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0" style={{ background: GOLD }}>
                {idx + 1}
              </span>
              Ação corretiva
            </span>
            {acoes.length > 1 && (
              <button type="button" onClick={() => remove(acao.localId)} className="flex items-center gap-1 text-xs text-red-500 font-medium hover:text-red-600">
                <FaTrash className="text-[10px]" /> Remover
              </button>
            )}
          </div>

          <label className="text-xs text-gray-600 font-medium mb-1 block">Descrição da ação</label>
          <textarea
            rows={3}
            className="w-full border-2 rounded-lg px-3 py-2 text-sm outline-none resize-none transition mb-3"
            style={{ borderColor: acao.descricao ? GOLD : "#e5e7eb" }}
            placeholder="Descreva a ação corretiva..."
            value={acao.descricao}
            onChange={(e) => update(acao.localId, "descricao", e.target.value)}
          />

          <label className="text-xs text-gray-600 font-medium mb-1 block">Responsável pela ação</label>
          <select
            className="w-full border-2 rounded-lg px-3 py-2 text-sm outline-none transition mb-3 bg-white"
            style={{ borderColor: acao.responsavelUid ? GOLD : "#e5e7eb" }}
            value={acao.responsavelUid}
            onChange={(e) => update(acao.localId, "responsavelUid", e.target.value)}
          >
            <option value="">-- Selecione uma pessoa envolvida --</option>
            {envolvidos.map((e) => (
              <option key={e.uid} value={e.uid}>{e.nome}</option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600 font-medium mb-1 block">Prazo de implementação</label>
              <input
                type="date"
                className="w-full border-2 rounded-lg px-3 py-2 text-sm outline-none transition"
                style={{ borderColor: acao.prazoImplementacao ? GOLD : "#e5e7eb" }}
                value={acao.prazoImplementacao}
                onChange={(e) => update(acao.localId, "prazoImplementacao", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 font-medium mb-1 block">Prazo de verificação de eficácia</label>
              <input
                type="date"
                className="w-full border-2 rounded-lg px-3 py-2 text-sm outline-none transition"
                style={{ borderColor: acao.prazoVerificacaoEficacia ? GOLD : "#e5e7eb" }}
                value={acao.prazoVerificacaoEficacia}
                onChange={(e) => update(acao.localId, "prazoVerificacaoEficacia", e.target.value)}
              />
            </div>
          </div>
        </div>
      ))}

      {errors?.acoes && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">{errors.acoes}</div>
      )}

      <button
        type="button"
        onClick={add}
        className="self-start flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border-2 transition-all duration-150 hover:bg-[#C8932F]/5"
        style={{ borderColor: GOLD, color: GOLD, background: "#fff" }}
      >
        <FaPlus className="text-[10px]" /> Adicionar ação corretiva
      </button>
    </div>
  );
}
