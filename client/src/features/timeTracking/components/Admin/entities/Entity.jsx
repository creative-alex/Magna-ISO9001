import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { FaBuilding } from "react-icons/fa6";
import { apiFetch } from "../../../../../shared/utils/apiFetch";
import { UserContext } from "../../../../../shared/context/userContext";

const GOLD = "#C8932F";

const normalizeName = (name) => {
  return name
   .toLowerCase()
      .normalize('NFD')
      .replace(new RegExp("[\\u0300-\\u036f]", "g"), '')
      .replace(/&/g, 'e')
      .replace(/-/g, ' ')
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')};

const inputStyle = {
  width: "100%", fontSize: 13, color: "#111827", fontWeight: 500,
  border: "1px solid #e5e7eb", borderRadius: 6, padding: "6px 9px",
  outline: "none", background: "#fafafa",
  boxSizing: "border-box",
};

const labelStyle = { fontSize: 11, color: "#6b7280", marginBottom: 4, display: "block" };
const valueStyle = { fontSize: 13, color: "#111827", fontWeight: 500 };
const btnOutline = (color) => ({ padding: "6px 14px", fontSize: 12, fontWeight: 500, borderRadius: 999, border: `1.5px solid ${color}`, color, background: "transparent", cursor: "pointer" });
const btnSolid = { padding: "7px 18px", fontSize: 12, fontWeight: 500, borderRadius: 999, border: "none", color: "#fff", background: GOLD, cursor: "pointer" };
const btnGhost = { padding: "7px 18px", fontSize: 12, fontWeight: 500, borderRadius: 999, border: "1px solid #e5e7eb", color: "#6b7280", background: "transparent", cursor: "pointer" };

const Entity = () => {
  const { nivelAcesso } = useContext(UserContext);
  // Editar/apagar a entidade (nome, NIF, morada) é sobre o registo da entidade em
  // si, não sobre os colaboradores  -  fica fora do que um Administrador gere.
  const canManageEntity = nivelAcesso !== "Administrador";
  const params = useParams();
  const entityParam = params.entityName || params.id_entidade;
  const formattedEntityName = decodeURIComponent(entityParam || "").replace(/%20/g, "-"); // Substitui "%20" por "-"
  const navigate = useNavigate();
  const [currentEntityName, setCurrentEntityName] = useState(formattedEntityName);
  const [entityData, setEntityData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(null);

  useEffect(() => {
    const fetchEntityData = async () => {
      try {
        setLoading(true);
        const response = await apiFetch(`/entities/entityDetails`, {
          method: "POST",
          body: JSON.stringify({ name: normalizeName(currentEntityName) }),
        });

        if (!response.ok) throw new Error("Erro ao buscar detalhes da entidade");

        const data = await response.json();
        setEntityData(data);
        setEditedData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (currentEntityName) {
      fetchEntityData();
    }
  }, [currentEntityName]);

  const handleEditClick = () => setIsEditing(true);
  const handleCancelClick = () => {
    setIsEditing(false);
    setEditedData(entityData);
  };
  const handleInputChange = (e) => setEditedData({ ...editedData, [e.target.name]: e.target.value });

  const handleSubmitClick = async () => {
    try {
      const response = await apiFetch(`/entities/updateEntity`, {
        method: "POST",
        body: JSON.stringify({ oldName: entityData.nome, ...editedData }),
      });

      if (!response.ok) throw new Error("Erro ao atualizar a entidade");

      const newEntityName = normalizeName(editedData.nome); // Nome atualizado normalizado
      setEntityData({ ...entityData, ...editedData }); // Atualiza o estado com os dados editados
      setIsEditing(false);
      setCurrentEntityName(newEntityName); // Atualiza o nome atual da entidade
      navigate(`/ponto/entidades/${newEntityName}`); // Redireciona para a nova rota
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteClick = async () => {
    if (window.confirm("Tem certeza de que deseja apagar esta entidade?")) {
      try {
        const response = await apiFetch(`/entities/deleteEntity`, {
          method: "POST",
          body: JSON.stringify({ name: entityData.nome }),
        });

        if (!response.ok) throw new Error("Erro ao apagar a entidade");

        alert("Entidade apagada com sucesso!");
        navigate("/ponto/entidades"); // Redireciona para a lista de entidades
      } catch (err) {
        setError(err.message);
      }
    }
  };

  if (error) {
    return (
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "18px 24px" }}>
        <p style={{ color: "#E86F51", fontWeight: 500, fontSize: 13, margin: 0 }}>⚠ Erro: {error}</p>
      </div>
    );
  }

  if (loading || !entityData) {
    return (
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 40, textAlign: "center" }}>
        <p style={{ color: "#9ca3af", fontSize: 13, margin: 0 }}>A carregar entidade...</p>
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8 }}>
        <FaBuilding style={{ color: GOLD, fontSize: 13 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "#111827", flex: 1, textTransform: "capitalize" }}>
          <Link to="/ponto/entidades" style={{ color: "#9ca3af", textDecoration: "none", fontWeight: 500 }}>Entidades</Link>
          <span style={{ color: "#d1d5db", margin: "0 6px" }}>/</span>
          {entityData?.nome}
        </span>
        {!isEditing && canManageEntity && (
          <div style={{ display: "flex", gap: 8 }}>
            <button style={btnOutline(GOLD)} onClick={handleEditClick}>Editar</button>
            <button style={btnOutline("#E86F51")} onClick={handleDeleteClick}>Apagar</button>
          </div>
        )}
      </div>

      <div style={{ padding: 18 }}>
        {isEditing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <span style={labelStyle}>Nome</span>
              <input style={inputStyle} type="text" name="nome" value={editedData?.nome || ""} onChange={handleInputChange} />
            </div>
            <div>
              <span style={labelStyle}>NIF</span>
              <input style={inputStyle} type="text" name="nif" value={editedData?.nif || ""} onChange={handleInputChange} />
            </div>
            <div>
              <span style={labelStyle}>Morada</span>
              <input style={inputStyle} type="text" name="morada" value={editedData?.morada || ""} onChange={handleInputChange} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button style={btnSolid} onClick={handleSubmitClick}>Submeter</button>
              <button style={btnGhost} onClick={handleCancelClick}>Cancelar</button>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            <div>
              <span style={labelStyle}>NIF</span>
              <div style={valueStyle}>{entityData.nif}</div>
            </div>
            <div>
              <span style={labelStyle}>Morada</span>
              <div style={valueStyle}>{entityData.morada}</div>
            </div>
            <div>
              <span style={labelStyle}>Colaboradores</span>
              <div style={valueStyle}>{entityData.userCount}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Entity;
