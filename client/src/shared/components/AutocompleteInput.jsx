import React, { useState, useRef, useEffect } from "react";

// Normaliza para comparar valores "equivalentes" apesar de pequenas diferenças de
// escrita: ignora acentos, maiúsculas/minúsculas, sufixos de género entre parêntesis
// (ex: "Gestor(a)") e espaços a mais  -  assim "gestor de rh" reconhece-se como
// equivalente a "Gestor(a) de RH".
function normalize(str) {
  return (str || "")
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/\([^)]*\)/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Input de texto com sugestões  -  como um <datalist>, mas com dropdown estilizado (o
// popup nativo do <datalist> não é customizável e não segue o resto do design da página).
export default function AutocompleteInput({ value, onChange, options, placeholder, inputStyle, className, id, required, disabled }) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = (options || []).filter(o => !value || o.toLowerCase().includes(value.toLowerCase()));

  const selectOption = (o) => {
    onChange(o);
    setOpen(false);
  };

  // Se o texto escrito corresponder (a menos de acentos/maiúsculas/sufixo de género) a
  // exatamente uma opção, assume essa opção  -  só quando é uma correspondência
  // inequívoca, para não "corrigir" texto livre à força.
  const snapToMatch = () => {
    if (!value) return;
    const normValue = normalize(value);
    const matches = (options || []).filter(o => normalize(o) === normValue);
    if (matches.length === 1 && matches[0] !== value) onChange(matches[0]);
  };

  const handleBlur = () => {
    setOpen(false);
    snapToMatch();
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        required={required}
        disabled={disabled}
        className={className}
        onChange={e => { onChange(e.target.value); setOpen(true); setHighlight(-1); }}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        onKeyDown={e => {
          if (e.key === "Enter") {
            if (open && highlight >= 0 && filtered.length > 0) { e.preventDefault(); selectOption(filtered[highlight]); }
            else snapToMatch();
            return;
          }
          if (!open || filtered.length === 0) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setHighlight(h => (h + 1) % filtered.length); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight(h => (h - 1 + filtered.length) % filtered.length); }
          else if (e.key === "Escape") setOpen(false);
        }}
        style={inputStyle}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20,
          background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8,
          boxShadow: "0 10px 26px rgba(17,24,39,0.12)", maxHeight: 220, overflowY: "auto", padding: 4,
        }}>
          {filtered.map((o, i) => (
            <div
              key={o}
              onMouseDown={e => { e.preventDefault(); selectOption(o); }}
              onMouseEnter={() => setHighlight(i)}
              style={{
                padding: "7px 10px", fontSize: 13, borderRadius: 6, cursor: "pointer",
                background: highlight === i ? "rgba(200,147,47,0.12)" : "transparent",
                color: "#111827", fontWeight: 500,
              }}
            >
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
