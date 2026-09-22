import React, { useEffect, useMemo, useState } from "react";
import { FaMagnifyingGlass } from "react-icons/fa6";
import { apiFetch } from "../../../shared/utils/apiFetch";

const GOLD = "#C8932F";

// Seletor de "pessoas envolvidas" - carrega o diretório mínimo (uid+nome, GET
// /users/directory, aberto a qualquer autenticado) uma única vez e deixa filtrar/marcar.
// Usado tanto no registo da NC como na catalogação (só a Gestora de Qualidade edita aí).
export default function EnvolvidosPicker({ value, onChange, disabled }) {
  const [diretorio, setDiretorio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/users/directory");
        if (res.ok) {
          const data = await res.json();
          setDiretorio(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Erro ao carregar diretório de utilizadores:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const nomesPorUid = useMemo(() => {
    const map = new Map();
    diretorio.forEach((u) => map.set(u.uid, u.nome));
    return map;
  }, [diretorio]);

  const filtrados = useMemo(() => {
    const termo = filtro.trim().toLowerCase();
    const lista = termo ? diretorio.filter((u) => (u.nome || "").toLowerCase().includes(termo)) : diretorio;
    return [...lista].sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
  }, [diretorio, filtro]);

  const toggle = (uid) => {
    if (disabled) return;
    onChange(value.includes(uid) ? value.filter((u) => u !== uid) : [...value, uid]);
  };

  return (
    <div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((uid) => (
            <span
              key={uid}
              className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full"
              style={{ background: "#f5e6ca", color: GOLD }}
            >
              {nomesPorUid.get(uid) || uid}
              {!disabled && (
                <button type="button" onClick={() => toggle(uid)} className="ml-0.5 text-[10px] leading-none" title="Remover">
                  ✕
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      {!disabled && (
        <>
          <div className="relative mb-2">
            <FaMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400" />
            <input
              className="w-full border-2 rounded-lg pl-8 pr-3 py-2 text-sm outline-none transition"
              style={{ borderColor: "#e5e7eb" }}
              placeholder="Pesquisar colega por nome..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            />
          </div>
          <div className="max-h-52 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
            {loading && <div className="p-3 text-xs text-gray-400">A carregar colaboradores...</div>}
            {!loading && filtrados.length === 0 && <div className="p-3 text-xs text-gray-400">Nenhum colaborador encontrado.</div>}
            {!loading && filtrados.map((u) => (
              <label key={u.uid} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
                <input type="checkbox" checked={value.includes(u.uid)} onChange={() => toggle(u.uid)} />
                {u.nome}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
