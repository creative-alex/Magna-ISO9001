import React, { useState, useEffect, useRef } from 'react';
import useFileAttachment from '../hooks/useFileAttachment';
import { useTutorial } from '../context/tutorialContext';

/**
 * Componente reutilizável para gerenciar anexos de arquivos
 * Pode ser usado em qualquer página que precise de funcionalidade de anexos
 */
const FileAttachmentManager = ({ 
  originalFilename,
  initialValue = '',
  onChange,
  isEditable = true,
  canEdit = true,
  showTitle = true,
  className = '',
  onError,
  onSuccess
}) => {
  const {
    attachedFiles,
    availableFiles,
    loading,
    uploading,
    currentFolderPath,
    fetchAvailableFiles,
    uploadFile,
    toggleAttachment,
    setAttachmentsFromString,
    getAttachmentsAsString,
    previewFile,
    downloadFile,
    clearAttachments
  } = useFileAttachment();

  const [showModal, setShowModal] = useState(false);
  const fileInputRef = useRef(null);
  
  // Hook do tutorial para detecção de passos
  const tutorial = useTutorial();

  // Carrega documentos quando o componente é montado
  useEffect(() => {
    if (originalFilename) {
      fetchAvailableFiles(originalFilename);
    }
  }, [originalFilename, fetchAvailableFiles]);

  // Processa o valor inicial
  useEffect(() => {
    setAttachmentsFromString(initialValue);
  }, [initialValue, setAttachmentsFromString]);

  // Notifica mudanças para o componente pai
  useEffect(() => {
    if (onChange) {
      onChange(getAttachmentsAsString());
    }
  }, [attachedFiles, onChange, getAttachmentsAsString]);

  // Detectar mudanças relacionadas ao tutorial
  useEffect(() => {
    // Se o modal foi aberto durante o passo de seleção de documentos
    if (showModal && tutorial.isInStep(tutorial.TUTORIAL_STATES.SELECT_DOCUMENTS)) {
      setTimeout(() => {
        tutorial.nextStep({ documentModalOpened: true });
      }, 1000);
    }
  }, [showModal, tutorial]);

  // Função para fazer upload de arquivo
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !originalFilename) return;

    try {
      const result = await uploadFile(file, originalFilename);
      if (onSuccess) {
        onSuccess(result.message);
      }
    } catch (error) {
      if (onError) {
        onError(error.message);
      } else {
        alert(error.message);
      }
    } finally {
      // Limpa o input file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Função para fazer preview com tratamento de erro
  const handlePreview = async (fileName) => {
    try {
      await previewFile(fileName);
    } catch (error) {
      if (onError) {
        onError(error.message);
      } else {
        alert(error.message);
      }
    }
  };

  // Função para fazer download com tratamento de erro
  const handleDownload = async (fileName) => {
    try {
      await downloadFile(fileName);
    } catch (error) {
      if (onError) {
        onError(error.message);
      } else {
        alert(error.message);
      }
    }
  };

  return (
    <div className={`file-attachment-manager ${className}`} data-section="documentos-associados">
      {showTitle && (
        <h4>Documentos Associados</h4>
      )}
      
      {/* Mostra arquivos anexados */}
      {attachedFiles.length > 0 && (
        <div className="attached-files-summary">
          <ul>
            {attachedFiles.map((file, index) => (
              <li key={index} className="attached-file-item">
                <span>{file}</span>
                <div className="file-actions">
                  <button
                    type="button"
                    onClick={() => handlePreview(file)}
                    title="Visualizar documento"
                    className="preview-btn"
                  >
                    👁️
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload(file)}
                    title="Baixar documento"
                    className="download-btn"
                  >
                    ⬇️
                  </button>
                  {isEditable && canEdit && (
                    <button
                      type="button"
                      onClick={() => toggleAttachment(file)}
                      title="Remover anexo"
                      className="remove-btn"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Botões de ação */}
      {isEditable && canEdit && (
        <div className="attachment-actions">
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="select-documents-btn"
            data-action="select-documents"
            disabled={loading}
          >
            {loading ? '📂 Carregando...' : '📂 Selecionar Documentos'}
          </button>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
            style={{ display: 'none' }}
            disabled={uploading}
          />
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="upload-btn"
            disabled={uploading || !originalFilename}
          >
            {uploading ? '📤 Enviando...' : '📤 Upload Novo Documento'}
          </button>

          {attachedFiles.length > 0 && (
            <button
              type="button"
              onClick={clearAttachments}
              className="clear-btn"
              title="Remover todos os anexos"
            >
              🗑️ Limpar Anexos
            </button>
          )}
        </div>
      )}

      {/* Modal para seleção de documentos */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Selecionar Documentos</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              {currentFolderPath && (
                <p className="folder-info">
                  <strong>Pasta:</strong> {currentFolderPath}
                </p>
              )}
              
              {loading ? (
                <div className="loading-message">
                  📂 Carregando documentos...
                </div>
              ) : availableFiles.length === 0 ? (
                <div className="no-documents">
                  📄 Nenhum documento disponível nesta pasta.
                </div>
              ) : (
                <div className="documents-list">
                  {availableFiles.map((doc, index) => (
                    <div key={index} className="document-item">
                      <div className="document-info">
                        <input
                          type="checkbox"
                          id={`doc-${index}`}
                          checked={attachedFiles.includes(doc.displayName)}
                          onChange={() => toggleAttachment(doc.displayName)}
                          className="document-checkbox"
                        />
                        <label htmlFor={`doc-${index}`} className="document-name">
                          {doc.displayName}
                        </label>
                        {doc.folder && (
                          <span className="document-folder">📁 {doc.folder}</span>
                        )}
                      </div>
                      
                     
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <p className="selection-info">
                {attachedFiles.length} documento(s) selecionado(s)
              </p>
              <button
                type="button"
                className="modal-confirm"
                onClick={() => setShowModal(false)}
              >
                Confirmar Seleção
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .file-attachment-manager {
          margin: 20px 0;
          padding: 15px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background-color: #f9f9f9;
        }

        .file-attachment-manager.table-attachment-manager {
          margin: 0;
          padding: 8px;
          border: none;
          border-radius: 0;
          background-color: transparent;
        }

        .file-attachment-manager.table-attachment-manager .attachment-actions {
          flex-direction: column;
          align-items: stretch;
        }

        .file-attachment-manager.table-attachment-manager .attachment-actions button {
          margin-bottom: 5px;
          padding: 6px 10px;
          font-size: 12px;
        }

        .attached-files-summary {
          margin-bottom: 15px;
        }

        .table-attachment-manager .attached-files-summary {
          margin-bottom: 8px;
        }

        .attached-files-summary ul {
          list-style: none;
          padding: 0;
          margin: 10px 0 0 0;
        }

        .attached-file-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px;
          margin: 5px 0;
          background: white;
          border-radius: 4px;
          border: 1px solid #eee;
        }

        .table-attachment-manager .attached-file-item {
          padding: 4px;
          margin: 2px 0;
          font-size: 12px;
        }

        .file-actions {
          display: flex;
          gap: 5px;
        }

        .file-actions button {
          border: none;
          background: none;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 3px;
          font-size: 14px;
        }

        .table-attachment-manager .file-actions button {
          padding: 2px 4px;
          font-size: 12px;
        }

        .preview-btn:hover { background: #e3f2fd; }
        .download-btn:hover { background: #e8f5e8; }
        .remove-btn:hover { background: #ffebee; }

        .attachment-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .attachment-actions button {
          padding: 8px 15px;
          border: 1px solid #ddd;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .select-documents-btn:hover { background: #e3f2fd; }
        .upload-btn:hover { background: #e8f5e8; }
        .clear-btn:hover { background: #ffebee; }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          width: 90%;
          max-width: 600px;
          max-height: 80%;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #eee;
        }

        .modal-close {
          border: none;
          background: none;
          font-size: 18px;
          cursor: pointer;
        }

        .modal-body {
          padding: 20px;
          overflow-y: auto;
          flex: 1;
        }

        .folder-info {
          background: #f0f0f0;
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 15px;
          font-size: 14px;
        }

        .loading-message, .no-documents {
          text-align: center;
          padding: 20px;
          color: #666;
        }

        .documents-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .document-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          border: 1px solid #eee;
          border-radius: 4px;
          background: #fafafa;
        }

        .document-info {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
        }

        .document-checkbox {
          margin: 0;
        }

        .document-name {
          font-weight: 500;
          cursor: pointer;
        }

        .document-folder {
          font-size: 12px;
          color: #666;
          background: #e0e0e0;
          padding: 2px 6px;
          border-radius: 3px;
        }

        .document-actions {
          display: flex;
          gap: 5px;
        }

        .modal-footer {
          padding: 20px;
          border-top: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .selection-info {
          color: #666;
          margin: 0;
        }

        .modal-confirm {
          padding: 10px 20px;
          background: #2196f3;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .modal-confirm:hover {
          background: #1976d2;
        }
      `}</style>
    </div>
  );
};

export default FileAttachmentManager;