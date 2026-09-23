import React from "react";
import { FaPlus, FaTrash } from "react-icons/fa6";

const GOLD = "#C8932F";

let nextLocalId = 1;
export function novaCausaVazia() {
  return { localId: nextLocalId++, texto: "" };
}

// Análise das causas como lista de pontos (não um único texto livre) - cada causa pode
// ser adicionada, editada e removida individualmente antes de submeter. Guardado no
// backend como array de strings (ver submitTratamento em naoConformidadeController.js).
export default function AnaliseCausasEditor({ causas, onChange, error }) {
  const update = (localId, texto) => onChange(causas.map((c) => (c.localId === localId ? { ...c, texto } : c)));
  const remove = (localId) => onChange(causas.filter((c) => c.localId !== localId));
  const add = () => onChange([...causas, novaCausaVazia()]);

  return (
    <div className="flex flex-col gap-2">
      {causas.map((causa, idx) => (
        <div key={causa.localId} className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0" style={{ background: GOLD }}>
            {idx + 1}
          </span>
          <input
            className="flex-1 border-2 rounded-lg px-3 py-2 text-sm outline-none transition"
            style={{ borderColor: causa.texto ? GOLD : "#e5e7eb" }}
            placeholder="Descreva uma causa..."
            value={causa.texto}
            onChange={(e) => update(causa.localId, e.target.value)}
          />
          {causas.length > 1 && (
            <button type="button" onClick={() => remove(causa.localId)} className="text-red-500 hover:text-red-600 flex-shrink-0" title="Remover">
              <FaTrash className="text-xs" />
            </button>
          )}
        </div>
      ))}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">{error}</div>
      )}

      <button
        type="button"
        onClick={add}
        className="self-start flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border-2 transition-all duration-150 hover:bg-[#C8932F]/5"
        style={{ borderColor: GOLD, color: GOLD, background: "#fff" }}
      >
        <FaPlus className="text-[10px]" /> Adicionar causa
      </button>
    </div>
  );
}
