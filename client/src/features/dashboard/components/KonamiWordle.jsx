import React, { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "../../../shared/utils/apiFetch";

const GOLD = "#C8932F";
const STORAGE_KEY = "magnaWordleWords";
const MAX_GUESSES = 6;
const ROUND_SECONDS = 60;
const TIME_BONUS_SECONDS = 5;
const TIMER_PREF_KEY = "magnaWordleTimerEnabled";
const STREAK_KEY = "magnaWordleStreak";
const BEST_STREAK_KEY = "magnaWordleBestStreak";

function loadTimerPref() {
  try {
    const raw = localStorage.getItem(TIMER_PREF_KEY);
    if (raw !== null) return raw === "true";
  } catch {}
  return true;
}

function loadIntPref(key) {
  try {
    const raw = localStorage.getItem(key);
    const n = raw !== null ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

const EDITOR_FORMATS = [
  ["PALAVRA", "sem dica"],
  ["PALAVRA - dica", "dica manual"],
  ["PALAVRA @ Entidade", "dica automática (colaborador ou NIF)"],
  ["PALAVRA @ Entidade - dica", "as duas em simultâneo"],
];

const DEFAULT_WORDS = [
  { word: "NORMA", hint: "Documento que define requisitos e boas práticas (ex: ISO 9001)" },
  { word: "PLANO", hint: "Documento que define objetivos e as ações para os atingir" },
  { word: "RISCO", hint: "Algo que pode comprometer um objetivo se não for gerido" },
  { word: "DADOS", hint: "Informação registada para consulta ou decisão" },
  { word: "MEDIR", hint: "Ação de quantificar um indicador de desempenho" },
  { word: "FALHA", hint: "Quando algo não corre como esperado" },
  { word: "ERROS", hint: "Desvios que devem ser corrigidos e registados" },
  { word: "PECAS", hint: "Componentes produzidos numa linha de produção" },
  { word: "CAUSA", hint: "Origem de um problema ou não conformidade" },
  { word: "PONTO", hint: "Registo de entrada e saída no livro de ponto" },
  { word: "TURNO", hint: "Período de trabalho de um colaborador" },
  { word: "SAIDA", hint: "Registo do fim de um turno de trabalho" },
  { word: "NIVEL", hint: "Grau de acesso de um utilizador no sistema" },
  { word: "PRAZO", hint: "Data limite para concluir uma tarefa" },
  { word: "MEIOS", hint: "Recursos usados para atingir um objetivo" },
  { word: "MODOS", hint: "Formas possíveis de realizar um processo" },
  { word: "REGRA", hint: "Norma interna que deve ser seguida" },
  { word: "ITENS", hint: "Elementos que compõem uma lista ou checklist" },
  { word: "FICHA", hint: "Documento com informação de um colaborador ou processo" },
  { word: "PASSO", hint: "Etapa de um procedimento" },
];

const KONAMI_CODE = [
  "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
  "b", "a", "Enter",
];

const KEYBOARD_ROWS = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACK"],
];

// Palavras podem ser letras e/ou dígitos (ex: um NIF a adivinhar)
function normalizeWord(word) {
  return word.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function tileMetrics(length) {
  if (length <= 6) return { size: 34, gap: 5, font: 16 };
  if (length <= 7) return { size: 30, gap: 4, font: 15 };
  if (length <= 9) return { size: 26, gap: 3, font: 13 };
  return { size: 22, gap: 2, font: 11 };
}

function normalizeEntries(list) {
  return list
    .map((item) => (typeof item === "string" ? { word: normalizeWord(item) } : { ...item, word: normalizeWord(item.word || "") }))
    .filter((entry) => entry.word.length >= 3);
}

function loadWordList() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.length > 0) return normalizeEntries(parsed);
  } catch {}
  return DEFAULT_WORDS;
}

function pickEntry(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Entradas do editor, uma por linha:
//   PALAVRA                              -> sem dica
//   PALAVRA - dica manual                -> dica fixa
//   PALAVRA @ Nome da Entidade            -> dica automática (colaborador ou NIF)
//   PALAVRA @ Nome da Entidade - dica     -> as duas em simultâneo
function parseEditorText(text) {
  const entries = [];
  text.split(/\n+/).map((l) => l.trim()).filter(Boolean).forEach((line) => {
    const atIdx = line.indexOf("@");
    if (atIdx !== -1) {
      const word = normalizeWord(line.slice(0, atIdx));
      const rest = line.slice(atIdx + 1).trim();
      const dashIdx = rest.indexOf(" - ");
      const entity = dashIdx !== -1 ? rest.slice(0, dashIdx).trim() : rest;
      const hint = dashIdx !== -1 ? rest.slice(dashIdx + 3).trim() : "";
      if (word.length >= 3 && entity) entries.push({ word, entity, ...(hint ? { hint } : {}) });
      return;
    }
    const dashIdx = line.indexOf(" - ");
    if (dashIdx !== -1) {
      const word = normalizeWord(line.slice(0, dashIdx));
      const hint = line.slice(dashIdx + 3).trim();
      if (word.length >= 3 && hint) entries.push({ word, hint });
      return;
    }
    line.split(",").map(normalizeWord).filter((w) => w.length >= 3).forEach((word) => entries.push({ word }));
  });
  return entries;
}

function entriesToEditorText(entries) {
  return entries.map((e) => {
    if (e.entity && e.hint) return `${e.word} @ ${e.entity} - ${e.hint}`;
    if (e.entity) return `${e.word} @ ${e.entity}`;
    if (e.hint) return `${e.word} - ${e.hint}`;
    return e.word;
  }).join("\n");
}

// targetWord evita que a dica automática mostre o NIF quando a própria
// palavra a adivinhar já É esse NIF (não faria sentido dar a resposta).
async function fetchEntityHint(entityName, targetWord) {
  try {
    const [detailsRes, usersRes] = await Promise.all([
      apiFetch("/entities/entityDetails", { method: "POST", body: JSON.stringify({ name: entityName }) }),
      apiFetch("/timetracking/byEntity", { method: "POST", body: JSON.stringify({ entidadeNome: entityName }) }).catch(() => null),
    ]);
    const details = detailsRes && detailsRes.ok ? await detailsRes.json() : null;
    const users = usersRes && usersRes.ok ? await usersRes.json() : [];

    const options = [];
    if (details?.nif && String(details.nif) !== targetWord) {
      options.push(`${details.nif}`);
    }
    if (Array.isArray(users) && users.length > 0) {
      const person = users[Math.floor(Math.random() * users.length)];
      if (person?.nome) options.push(`${person.nome}`);
    }
    if (options.length === 0) return null;
    return options[Math.floor(Math.random() * options.length)];
  } catch {
    return null;
  }
}

function evaluateGuess(guess, target) {
  const result = new Array(guess.length).fill("absent");
  const targetLetters = target.split("");
  const used = new Array(target.length).fill(false);

  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === targetLetters[i]) {
      result[i] = "correct";
      used[i] = true;
    }
  }
  for (let i = 0; i < guess.length; i++) {
    if (result[i] === "correct") continue;
    const idx = targetLetters.findIndex((l, j) => l === guess[i] && !used[j]);
    if (idx !== -1) {
      result[i] = "present";
      used[idx] = true;
    }
  }
  return result;
}

const rankOf = { correct: 3, present: 2, absent: 1 };
const colorFor = (s) => (s === "correct" ? "#22c55e" : s === "present" ? GOLD : s === "absent" ? "#9ca3af" : "#fff");

export default function KonamiWordle() {
  const [open, setOpen] = useState(false);
  const [justOpened, setJustOpened] = useState(false);
  const [wordList, setWordList] = useState(loadWordList);
  const [entry, setEntry] = useState(() => pickEntry(loadWordList()));
  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [status, setStatus] = useState("playing");
  const [shake, setShake] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editorText, setEditorText] = useState("");
  const [syncError, setSyncError] = useState(false);
  const [manualHint, setManualHint] = useState(null);
  const [autoHint, setAutoHint] = useState(null);
  const [autoHintLoading, setAutoHintLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [lostReason, setLostReason] = useState(null);
  const [timerEnabled, setTimerEnabled] = useState(loadTimerPref);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [streak, setStreak] = useState(() => loadIntPref(STREAK_KEY));
  const [bestStreak, setBestStreak] = useState(() => loadIntPref(BEST_STREAK_KEY));

  const bufferRef = useRef([]);
  const hintRequestRef = useRef(0);
  const target = entry.word;

  const toggleTimerEnabled = () => {
    setTimerEnabled((v) => {
      const next = !v;
      try { localStorage.setItem(TIMER_PREF_KEY, String(next)); } catch {}
      return next;
    });
  };

  // Sequência de vitórias consecutivas (e melhor sequência de sempre),
  // guardada neste navegador. Atualiza-se sempre que a ronda termina,
  // seja por acerto, por esgotar tentativas ou por esgotar o tempo.
  useEffect(() => {
    if (status === "won") {
      setStreak((s) => {
        const next = s + 1;
        try { localStorage.setItem(STREAK_KEY, String(next)); } catch {}
        setBestStreak((b) => {
          const nextBest = Math.max(b, next);
          try { localStorage.setItem(BEST_STREAK_KEY, String(nextBest)); } catch {}
          return nextBest;
        });
        return next;
      });
    } else if (status === "lost") {
      setStreak(0);
      try { localStorage.setItem(STREAK_KEY, "0"); } catch {}
    }
  }, [status]);

  // Tempo limite (opcional) para adivinhar a palavra da ronda atual. Cada
  // tentativa submetida devolve alguns segundos, para não penalizar só por
  // estar a pensar/escrever (ver submitGuess).
  useEffect(() => {
    if (!open || !timerEnabled || status !== "playing") return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          setLostReason("time");
          setStatus("lost");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [open, status, entry, timerEnabled]);

  // Cronómetro (sempre ativo) que mede quanto tempo a pessoa demorou a acertar.
  useEffect(() => {
    if (!open || status !== "playing") return;
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [open, status, entry]);

  // Sincroniza com a lista partilhada no servidor (Firestore), para que
  // colegas na mesma rede joguem com as mesmas palavras/dicas.
  useEffect(() => {
    apiFetch("/konami-wordle/words")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.entries) && data.entries.length > 0) {
          const remote = normalizeEntries(data.entries);
          setWordList(remote);
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(remote)); } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const startNewGame = useCallback((list) => {
    const source = list || wordList;
    const nextEntry = pickEntry(source);
    setEntry(nextEntry);
    setGuesses([]);
    setCurrentGuess("");
    setStatus("playing");
    setLostReason(null);
    setTimeLeft(ROUND_SECONDS);
    setElapsedSeconds(0);
    setOpen(true);
    setJustOpened(true);
    setTimeout(() => setJustOpened(false), 350);

    setManualHint(nextEntry.hint || null);

    const requestId = ++hintRequestRef.current;
    if (nextEntry.entity) {
      setAutoHint(null);
      setAutoHintLoading(true);
      fetchEntityHint(nextEntry.entity, nextEntry.word).then((h) => {
        if (hintRequestRef.current === requestId) { setAutoHint(h); setAutoHintLoading(false); }
      });
    } else {
      setAutoHint(null);
      setAutoHintLoading(false);
    }
  }, [wordList]);

  // Konami code detector, always listening in the background
  useEffect(() => {
    const onKeyDown = (e) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      bufferRef.current = [...bufferRef.current, key].slice(-KONAMI_CODE.length);
      const matches = bufferRef.current.length === KONAMI_CODE.length &&
        bufferRef.current.every((k, i) => k === KONAMI_CODE[i]);
      if (matches) {
        bufferRef.current = [];
        startNewGame();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [startNewGame]);

  const submitGuess = useCallback(() => {
    if (currentGuess.length !== target.length) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    const nextGuesses = [...guesses, currentGuess];
    setGuesses(nextGuesses);
    setCurrentGuess("");
    if (timerEnabled) setTimeLeft((t) => Math.min(ROUND_SECONDS, t + TIME_BONUS_SECONDS));
    if (currentGuess === target) setStatus("won");
    else if (nextGuesses.length >= MAX_GUESSES) { setLostReason("guesses"); setStatus("lost"); }
  }, [currentGuess, target, guesses, timerEnabled]);

  const handleKey = useCallback((key) => {
    if (status !== "playing") return;
    if (key === "ENTER") submitGuess();
    else if (key === "BACK") setCurrentGuess((g) => g.slice(0, -1));
    else if (/^[A-Z0-9]$/.test(key) && currentGuess.length < target.length) setCurrentGuess((g) => g + key);
  }, [status, currentGuess, target, submitGuess]);

  // Gameplay keyboard listener, only while the modal is open
  useEffect(() => {
    if (!open || showEditor) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") { setOpen(false); return; }
      if (e.key === "Enter") { handleKey("ENTER"); return; }
      if (e.key === "Backspace") { handleKey("BACK"); return; }
      const letter = normalizeWord(e.key);
      if (letter.length === 1) handleKey(letter);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, showEditor, handleKey]);

  const saveWordList = () => {
    const entries = parseEditorText(editorText);
    const finalList = entries.length > 0 ? entries : DEFAULT_WORDS;
    setWordList(finalList);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(finalList)); } catch {}
    setShowEditor(false);
    startNewGame(finalList);

    setSyncError(false);
    apiFetch("/konami-wordle/words", { method: "POST", body: JSON.stringify({ entries: finalList }) })
      .then((r) => { if (!r.ok) setSyncError(true); })
      .catch(() => setSyncError(true));
  };

  if (!open) return null;

  const rows = [];
  for (let i = 0; i < MAX_GUESSES; i++) {
    if (i < guesses.length) rows.push({ letters: guesses[i].split(""), states: evaluateGuess(guesses[i], target) });
    else if (i === guesses.length) rows.push({ letters: currentGuess.padEnd(target.length).split(""), states: null });
    else rows.push({ letters: new Array(target.length).fill(""), states: null });
  }

  const letterStates = {};
  guesses.forEach((g) => {
    evaluateGuess(g, target).forEach((s, i) => {
      const l = g[i];
      if (!letterStates[l] || rankOf[s] > rankOf[letterStates[l]]) letterStates[l] = s;
    });
  });

  const tile = tileMetrics(target.length);

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(17,24,39,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={() => setOpen(false)}
    >
      <div
        style={{
          background: "#fff", borderRadius: 14, padding: 24, width: 400, maxWidth: "92vw", boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
          animation: justOpened ? "magna-wordle-pop 0.35s ease-out" : "none",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Magna Wordle</span>
            {!showEditor && (
              <span
                title={`Melhor sequência: ${bestStreak}`}
                style={{
                  display: "flex", alignItems: "center", gap: 3, fontSize: 11.5, fontWeight: 700,
                  color: streak > 0 ? "#ef4444" : "#9ca3af", background: streak > 0 ? "#FEF2F2" : "#f3f4f6",
                  border: `1px solid ${streak > 0 ? "#FECACA" : "#e5e7eb"}`, borderRadius: 999, padding: "2px 8px",
                }}
              >
                🔥 {streak}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {!showEditor && (
              <button
                onClick={toggleTimerEnabled}
                title="Ativar/desativar tempo limite"
                style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                <span style={{ fontSize: 11, color: "#9ca3af" }}>tempo limite</span>
                <span style={{
                  width: 28, height: 16, borderRadius: 999, background: timerEnabled ? GOLD : "#e5e7eb",
                  position: "relative", transition: "background 0.2s", flexShrink: 0,
                }}>
                  <span style={{
                    position: "absolute", top: 2, left: timerEnabled ? 14 : 2, width: 12, height: 12, borderRadius: "50%",
                    background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
                  }} />
                </span>
              </button>
            )}
            <button
              className="magna-wordle-chip"
              onClick={() => { setEditorText(entriesToEditorText(wordList)); setShowEditor(true); }}
              style={{
                fontSize: 11.5, fontWeight: 600, color: GOLD, background: "#FFF7E6",
                border: "1px solid #F0E2C4", borderRadius: 999, padding: "5px 12px", cursor: "pointer",
              }}
            >
              editar palavras
            </button>
            <button
              className="magna-wordle-icon-btn"
              onClick={() => setOpen(false)}
              style={{
                width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, color: "#9ca3af", background: "none", border: "none", borderRadius: 6, cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {showEditor ? (
          <div>
            <p style={{ fontSize: 11.5, color: "#9ca3af", marginBottom: 10, lineHeight: 1.5 }}>
              Uma entrada por linha. A palavra pode ter letras e/ou números (ex: um NIF). Fica guardado para todos na rede.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
              {EDITOR_FORMATS.map(([code, desc]) => (
                <div key={code} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <code style={{
                    fontSize: 10.5, fontFamily: "Consolas, monospace", background: "#f3f4f6", color: "#4b5563",
                    padding: "3px 7px", borderRadius: 5, whiteSpace: "nowrap", flexShrink: 0,
                  }}>
                    {code}
                  </code>
                  <span style={{ fontSize: 11.5, color: "#9ca3af" }}>{desc}</span>
                </div>
              ))}
            </div>
            <textarea
              className="magna-wordle-textarea"
              value={editorText}
              onChange={(e) => setEditorText(e.target.value)}
              spellCheck={false}
              style={{
                width: "100%", height: 130, border: "1px solid #e5e7eb", borderRadius: 8, padding: 10,
                fontSize: 12.5, fontFamily: "Consolas, monospace", lineHeight: 1.6, color: "#111827",
                background: "#fafafa", resize: "none", boxSizing: "border-box",
              }}
            />
            {syncError && (
              <p style={{ fontSize: 11, color: "#ef4444", marginTop: 6 }}>
                Não foi possível sincronizar com o servidor — a lista ficou guardada só neste dispositivo.
              </p>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
              <button onClick={() => setShowEditor(false)} style={{ fontSize: 12, padding: "7px 14px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 999, cursor: "pointer" }}>
                cancelar
              </button>
              <button onClick={saveWordList} style={{ fontSize: 12, fontWeight: 600, padding: "7px 16px", background: GOLD, color: "#fff", border: "none", borderRadius: 999, cursor: "pointer" }}>
                guardar e jogar
              </button>
            </div>
          </div>
        ) : (
          <>
            {timerEnabled && (() => {
              const pct = Math.max(0, Math.min(100, (timeLeft / ROUND_SECONDS) * 100));
              const urgent = timeLeft <= 10 && status === "playing";
              const barColor = urgent ? "#ef4444" : GOLD;
              return (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.4 }}>Tempo</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: urgent ? "#ef4444" : "#111827", transition: "color 0.2s" }}>
                      {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:{String(timeLeft % 60).padStart(2, "0")}
                    </span>
                  </div>
                  <div style={{ height: 4, background: "#f3f4f6", borderRadius: 2 }}>
                    <div style={{ height: 4, width: `${pct}%`, background: barColor, borderRadius: 2, transition: "width 1s linear, background 0.3s" }} />
                  </div>
                </div>
              );
            })()}

            {(() => {
              const hintCount = (manualHint ? 1 : 0) + ((autoHint || autoHintLoading) ? 1 : 0);
              if (hintCount === 0) return null;

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                  {manualHint && (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 9, background: "#FFF7E6", border: "1px solid #F3E2B8", borderRadius: 9, padding: "8px 10px 8px 8px" }}>
                      <span style={{ width: 21, height: 21, borderRadius: "50%", background: GOLD, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0 }}>💡</span>
                      <span style={{ fontSize: 12.5, color: "#7A5010", lineHeight: 1.45, paddingTop: 2 }}>{manualHint}</span>
                    </div>
                  )}
                  {(autoHint || autoHintLoading) && (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 9, background: "#EEF3FF", border: "1px solid #D6E2FB", borderRadius: 9, padding: "8px 10px 8px 8px" }}>
                      <span style={{ width: 21, height: 21, borderRadius: "50%", background: "#4C6FE0", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0 }}>🔎</span>
                      {autoHintLoading ? (
                        <span style={{
                          flex: 1, height: 12, marginTop: 4, borderRadius: 4,
                          background: "linear-gradient(90deg, #D6E2FB 25%, #f4f8ff 37%, #D6E2FB 63%)",
                          backgroundSize: "400% 100%", animation: "magna-wordle-shimmer 1.4s ease infinite",
                        }} />
                      ) : (
                        <span style={{ fontSize: 12.5, color: "#1E3A8A", lineHeight: 1.45, paddingTop: 2 }}>{autoHint}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            <div style={{ display: "flex", flexDirection: "column", gap: tile.gap, alignItems: "center", marginBottom: 14 }}>
              {rows.map((row, ri) => (
                <div key={ri} style={{ display: "flex", gap: tile.gap, animation: shake && ri === guesses.length ? "magna-wordle-shake 0.4s" : "none" }}>
                  {row.letters.map((l, ci) => (
                    <div
                      key={ci}
                      style={{
                        width: tile.size, height: tile.size,
                        border: `2px solid ${row.states ? colorFor(row.states[ci]) : (l.trim() ? "#9ca3af" : "#e5e7eb")}`,
                        background: row.states ? colorFor(row.states[ci]) : "#fff",
                        color: row.states ? "#fff" : "#111827",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: tile.font, fontWeight: 700, borderRadius: 4, textTransform: "uppercase",
                      }}
                    >
                      {l.trim()}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {status === "won" && (
              <p style={{ textAlign: "center", color: "#22c55e", fontWeight: 600, fontSize: 13, marginBottom: 10 }}>
                Acertou em {elapsedSeconds}s! 🎉
              </p>
            )}
            {status === "lost" && (
              <p style={{ textAlign: "center", color: "#ef4444", fontWeight: 600, fontSize: 13, marginBottom: 10 }}>
                {lostReason === "time" ? "Tempo esgotado! " : ""}A palavra era: {target}
              </p>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "center" }}>
              {KEYBOARD_ROWS.map((row, ri) => (
                <div key={ri} style={{ display: "flex", gap: 4 }}>
                  {row.map((k) => (
                    <button
                      key={k}
                      onClick={() => handleKey(k)}
                      style={{
                        minWidth: k === "ENTER" || k === "BACK" ? 44 : 26, height: 34,
                        fontSize: 11, fontWeight: 600, border: "none", borderRadius: 4, cursor: "pointer",
                        background: letterStates[k] ? colorFor(letterStates[k]) : "#e5e7eb",
                        color: letterStates[k] ? "#fff" : "#111827",
                      }}
                    >
                      {k === "BACK" ? "⌫" : k === "ENTER" ? "OK" : k}
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {status !== "playing" && (
              <div style={{ textAlign: "center", marginTop: 12 }}>
                <button onClick={() => startNewGame()} style={{ fontSize: 12, padding: "7px 16px", background: GOLD, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
                  Jogar outra vez
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <style>{`
        @keyframes magna-wordle-shake { 0%,100%{transform:translateX(0);} 25%{transform:translateX(-6px);} 75%{transform:translateX(6px);} }
        @keyframes magna-wordle-pop { 0%{transform:scale(0.85); opacity:0;} 100%{transform:scale(1); opacity:1;} }
        @keyframes magna-wordle-shimmer { 0%{background-position:100% 0;} 100%{background-position:0 0;} }
        .magna-wordle-chip, .magna-wordle-icon-btn { transition: background 0.15s, border-color 0.15s; }
        .magna-wordle-chip:hover { background: #FCEFD1 !important; }
        .magna-wordle-icon-btn:hover { background: #f3f4f6 !important; }
        .magna-wordle-chip:focus, .magna-wordle-icon-btn:focus, .magna-wordle-textarea:focus { outline: none; }
        .magna-wordle-chip:focus-visible, .magna-wordle-icon-btn:focus-visible { outline: 2px solid ${GOLD}; outline-offset: 2px; }
        .magna-wordle-textarea:focus { border-color: ${GOLD} !important; box-shadow: 0 0 0 3px rgba(200,147,47,0.15); background: #fff !important; }
      `}</style>
    </div>
  );
}
