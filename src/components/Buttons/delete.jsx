import React from "react";
import Bin from "../../icons/bin.ico"; 

const DeleteButton = ({ file, currentPath, onDelete, showNotification, showConfirmDialog }) => {
    if (!file || !file.name) {
        return null; // Retorna null se não houver arquivo ou nome
    }

    const handleDelete = async (e) => {
        e.stopPropagation(); // Evita trigger do onClick do div pai
        
        // Confirma se o utilizador quer realmente apagar o ficheiro
        showConfirmDialog(`Tem a certeza que deseja eliminar o ficheiro "${file.name}"?`, async () => {
            await performDelete();
        });
    };

    const performDelete = async () => {
        try {
            const filePath = [...currentPath, file.name].join("/");
            
            const response = await fetch(`https://api9001.duckdns.org/files/delete`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ filename: encodeURIComponent(filePath) }),
            });

            if (!response.ok) {
                throw new Error("Erro ao eliminar o arquivo");
            }

            // Chama a função callback para atualizar a lista de ficheiros
            if (onDelete) {
                onDelete(filePath);
            }

            showNotification("Ficheiro eliminado com sucesso!", "success");

        } catch (error) {
            console.error("Erro ao eliminar o arquivo:", error);
            showNotification("Erro ao eliminar o ficheiro. Tente novamente.", "error");
        }
    };

    return (
        <button 
            className="delete-button" 
            onClick={handleDelete}
            style={{ 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                padding: '4px 8px',
                cursor: 'pointer',
                fontSize: '12px'
            }}
            title="Eliminar ficheiro"
        >
            <img src={Bin} alt="Eliminar" style={{ width: '16px', height: '16px' }} /> 
        </button>
    );
};

export default DeleteButton;
