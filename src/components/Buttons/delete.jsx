import React, { useState } from "react";
import { FaTrash } from "react-icons/fa6";

const DeleteButton = ({ file, currentPath, onDelete, isFolder = false, size = 16, className }) => {
    const [notification, setNotification] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({ show: false, message: "", onConfirm: null });

    if (!file || !file.name) return null;

    const showNotification = (message, type = "info") => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        const label = isFolder
            ? `o processo "${file.name}" e todos os procedimentos associados`
            : `o ficheiro "${file.name}"`;
        setConfirmDialog({
            show: true,
            message: `Tem a certeza que deseja eliminar ${label}? Esta ação não pode ser revertida.`,
            onConfirm: performDelete,
        });
    };

    const performDelete = async () => {
        try {
            const filePath = [...currentPath, file.name].join("/");
            const response = await fetch(`${process.env.REACT_APP_API_URL}/files/delete`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filename: encodeURIComponent(filePath) }),
            });

            if (!response.ok) throw new Error("Erro ao eliminar");

            if (onDelete) onDelete(filePath);
            showNotification(
                isFolder ? "Processo eliminado com sucesso!" : "Ficheiro eliminado com sucesso!",
                "success"
            );
        } catch {
            showNotification("Erro ao eliminar. Tente novamente.", "error");
        }
    };

    return (
        <>
            <button
                className={className ?? "bg-red-50 text-red-500 border border-red-200 rounded px-2 py-1 cursor-pointer text-xs hover:bg-red-100 hover:text-red-600 transition-colors duration-150"}
                onClick={handleDelete}
                title={isFolder ? "Eliminar processo" : "Eliminar ficheiro"}
            >
                <FaTrash size={size} />
            </button>

            {notification && (
                <div
                    className={`fixed bottom-4 right-4 z-[9999] px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${
                        notification.type === "success" ? "bg-green-500" : "bg-red-500"
                    }`}
                >
                    {notification.message}
                </div>
            )}

            {confirmDialog.show && (
                <div
                    className="fixed inset-0 bg-black/40 flex justify-center items-center z-[1000]"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="bg-white rounded-xl p-7 min-w-[300px] max-w-[400px] text-center shadow-xl">
                        <div className="text-4xl mb-4">⚠️</div>
                        <p className="text-gray-700 text-[14px] mb-6 leading-relaxed">{confirmDialog.message}</p>
                        <div className="flex gap-2.5 justify-center">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDialog({ show: false, message: "", onConfirm: null });
                                }}
                                className="px-5 py-[9px] bg-gray-100 text-gray-700 border-0 rounded-lg cursor-pointer text-[14px] font-medium hover:bg-gray-200"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirmDialog.onConfirm) confirmDialog.onConfirm();
                                    setConfirmDialog({ show: false, message: "", onConfirm: null });
                                }}
                                className="px-5 py-[9px] bg-red-600 text-white border-0 rounded-lg cursor-pointer text-[14px] font-medium hover:bg-red-700"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default DeleteButton;
