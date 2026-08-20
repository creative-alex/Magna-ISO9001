import React, { useContext, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/userContext";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import {
  FaUser, FaEnvelope, FaShield, FaKey, FaBuilding,
  FaFileContract, FaIdCard, FaFileLines, FaGraduationCap, FaFile,
  FaPencil, FaCheck, FaCloudArrowUp, FaArrowUpRightFromSquare, FaCircleMinus,
} from "react-icons/fa6";
import { apiFetch } from "../utils/apiFetch";

const DOCUMENT_FIELDS = [
  { key: "contrato",     label: "Contrato de trabalho",       Icon: FaFileContract,  accept: ".pdf,.doc,.docx" },
  { key: "bi",           label: "BI / Cartão de Cidadão",     Icon: FaIdCard,        accept: ".pdf,.jpg,.jpeg,.png" },
  { key: "morada",       label: "Comprovativo de morada",     Icon: FaFileLines,     accept: ".pdf,.jpg,.jpeg,.png" },
  { key: "iban",         label: "Comprovativo de IBAN",       Icon: FaFile,          accept: ".pdf,.jpg,.jpeg,.png" },
  { key: "habilitacoes", label: "Certificado de habilitações",Icon: FaGraduationCap, accept: ".pdf,.doc,.docx" },
];

export default function Perfil() {
  const navigate = useNavigate();
  const { username, userEmail, userRole, nivelAcesso } = useContext(UserContext);
  const gold = "#C8932F";
  const isAdmin = nivelAcesso === "SuperAdmin";
  const initials = username ? username.slice(0, 2).toUpperCase() : "??";

  const docsKey = `magna_perfil_docs_${username}`;
  const entidadeKey = `magna_perfil_entidade_${username}`;
  const [editMode, setEditMode] = useState(false);
  const [entidade, setEntidade] = useState(() => localStorage.getItem(entidadeKey) || "");
  const [docRefs, setDocRefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem(docsKey) || "{}"); }
    catch { return {}; }
  });
  const [uploading, setUploading] = useState({});
  const [viewing, setViewing] = useState({});
  const fileInputRefs = useRef({});

  const handleSelectFile = (filePath) => {
    const formattedPath = filePath.replace(/\s/g, "-").replace(/\//g, "__");
    navigate(`/file/${formattedPath}`, { state: { originalFilename: filePath } });
  };

  const handleDocUpload = async (docKey, file) => {
    if (!file) return;
    setUploading(prev => ({ ...prev, [docKey]: true }));
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folderPath", `Colaboradores/${username}/`);
      const res = await apiFetch(`/files/upload-document`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const updated = { ...docRefs, [docKey]: { name: file.name, path: `Colaboradores/${username}/${file.name}` } };
        setDocRefs(updated);
        localStorage.setItem(docsKey, JSON.stringify(updated));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(prev => ({ ...prev, [docKey]: false }));
    }
  };

  const handleViewDoc = async (docKey) => {
    const ref = docRefs[docKey];
    if (!ref) return;
    setViewing(prev => ({ ...prev, [docKey]: true }));
    try {
      const res = await apiFetch(`/files/download`, {
        method: "POST",
        body: JSON.stringify({ path: encodeURIComponent(ref.path) }),
      });
      if (res.ok) {
        const blob = await res.blob();
        window.open(URL.createObjectURL(blob), "_blank");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setViewing(prev => ({ ...prev, [docKey]: false }));
    }
  };

  const infoRows = [
    { Icon: FaUser,     label: "Nome",                 value: username },
    { Icon: FaEnvelope, label: "Email",                value: userEmail },
    { Icon: FaBuilding, label: "Entidade empregadora", value: entidade, editable: true },
    { Icon: FaShield,   label: "Função",               value: isAdmin ? "SuperAdmin" : userRole || "Utilizador" },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar onSelectFile={handleSelectFile} />

      <div className="ml-[230px] flex-1 flex flex-col min-h-screen">
        <Topbar icon="👤" title="Perfil" />

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Avatar + nome + botão editar — full width */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{
                width: 72, height: 72, borderRadius: "50%", background: gold, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 26, fontWeight: 700, color: "#fff",
              }}>
                {initials}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>{username || "—"}</div>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 3 }}>{userEmail || "—"}</div>
                <div style={{
                  display: "inline-block", marginTop: 8,
                  fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                  background: isAdmin ? "#FEF3C7" : "#F3F4F6",
                  color: isAdmin ? "#92400E" : "#374151",
                }}>
                  {isAdmin ? "SuperAdmin" : userRole || "Utilizador"}
                </div>
              </div>
              <button
                onClick={() => {
                  if (editMode) localStorage.setItem(entidadeKey, entidade);
                  setEditMode(v => !v);
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer",
                  border: `1px solid ${editMode ? "#22c55e" : gold}`,
                  borderRadius: 7, background: "#fff",
                  color: editMode ? "#22c55e" : gold,
                  transition: "all 0.15s", flexShrink: 0,
                }}
              >
                {editMode
                  ? <><FaCheck style={{ fontSize: 12 }} /> Concluído</>
                  : <><FaPencil style={{ fontSize: 12 }} /> Editar</>
                }
              </button>
            </div>
          </div>

          {/* 2 colunas */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 20, alignItems: "start" }}>

            {/* Coluna esquerda: Info + Segurança */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Informação da conta */}
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Informação da conta</span>
                </div>
                {infoRows.map(({ Icon, label, value, editable }, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "13px 18px",
                    borderBottom: i < infoRows.length - 1 ? "1px solid #f9fafb" : "none",
                  }}>
                    <Icon style={{ color: gold, fontSize: 14, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: "#6b7280", width: 72, flexShrink: 0 }}>{label}</span>
                    {editable && editMode ? (
                      <input
                        value={entidade}
                        onChange={e => setEntidade(e.target.value)}
                        placeholder="Nome da entidade..."
                        style={{
                          flex: 1, fontSize: 13, color: "#111827", fontWeight: 500,
                          border: "1px solid #e5e7eb", borderRadius: 6,
                          padding: "4px 8px", outline: "none",
                          background: "#fafafa",
                        }}
                        onFocus={e => e.target.style.borderColor = gold}
                        onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                      />
                    ) : (
                      <span style={{ fontSize: 13, color: "#111827", fontWeight: 500, wordBreak: "break-all" }}>{value || "—"}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Segurança */}
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Segurança</span>
                </div>
                <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <FaKey style={{ color: gold, fontSize: 14, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>Palavra-passe</div>
                      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Altere a sua palavra-passe</div>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/reset-password")}
                    style={{
                      padding: "7px 16px", fontSize: 12, fontWeight: 500, cursor: "pointer",
                      border: `1px solid ${gold}`, borderRadius: 7, background: "#fff", color: gold,
                      transition: "all 0.15s", flexShrink: 0,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = gold; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = gold; }}
                  >
                    Alterar
                  </button>
                </div>
              </div>

            </div>

            {/* Coluna direita: Documentos */}
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Documentos do colaborador</span>
                <span style={{ fontSize: 11, color: "#9ca3af" }}>
                  {editMode ? "Clique para enviar" : "Clique para abrir"}
                </span>
              </div>

              {DOCUMENT_FIELDS.map(({ key, label, Icon, accept }, i) => {
                const ref = docRefs[key];
                const isUploading = uploading[key];
                const isViewing = viewing[key];
                const hasFile = !!ref;
                const isLast = i === DOCUMENT_FIELDS.length - 1;
                const isActive = editMode || hasFile;

                return (
                  <div key={key}>
                    <input
                      type="file"
                      accept={accept}
                      style={{ display: "none" }}
                      ref={el => { fileInputRefs.current[key] = el; }}
                      onChange={e => {
                        const f = e.target.files[0];
                        if (f) handleDocUpload(key, f);
                        e.target.value = "";
                      }}
                    />
                    <div
                      onClick={() => {
                        if (isUploading || isViewing) return;
                        if (editMode) fileInputRefs.current[key]?.click();
                        else if (hasFile) handleViewDoc(key);
                      }}
                      style={{
                        display: "flex", alignItems: "center", gap: 14, padding: "15px 18px",
                        borderBottom: isLast ? "none" : "1px solid #f9fafb",
                        cursor: isUploading || isViewing ? "wait" : isActive ? "pointer" : "default",
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={e => { if (isActive) e.currentTarget.style.background = "#fafafa"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = ""; }}
                    >
                      <Icon style={{ color: hasFile ? gold : "#d1d5db", fontSize: 16, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{label}</div>
                        <div style={{ fontSize: 11, marginTop: 2, color: hasFile ? "#6b7280" : "#b0b7c3" }}>
                          {isUploading
                            ? "A enviar..."
                            : isViewing
                            ? "A abrir..."
                            : hasFile
                            ? ref.name
                            : editMode
                            ? "Clique para enviar ficheiro"
                            : "Sem ficheiro enviado"}
                        </div>
                      </div>
                      <div style={{ flexShrink: 0 }}>
                        {isUploading || isViewing ? (
                          <span style={{ fontSize: 11, color: gold, fontWeight: 600 }}>...</span>
                        ) : editMode ? (
                          <FaCloudArrowUp style={{ fontSize: 16, color: hasFile ? "#22c55e" : "#d1d5db" }} />
                        ) : hasFile ? (
                          <FaArrowUpRightFromSquare style={{ fontSize: 12, color: gold }} />
                        ) : (
                          <FaCircleMinus style={{ fontSize: 13, color: "#e5e7eb" }} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
