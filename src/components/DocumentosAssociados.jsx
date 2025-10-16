import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../context/userContext';

const DocumentosAssociados = ({ 
  currentValue, 
  onChange, 
  originalFilename,
  isEditable = true, // Nova prop para controlar editabilidade
  canEdit = true // Nova prop para controlar se pode editar (permissões)
}) => {
  const { username, userRole } = useContext(UserContext);
  const isSuperAdmin = (userRole && userRole.toLowerCase() === 'superadmin') || (username && username.toLowerCase() === 'superadmin');
  const [documentosDisponiveis, setDocumentosDisponiveis] = useState([]);
  const [documentosSelecionados, setDocumentosSelecionados] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [currentFolderPath, setCurrentFolderPath] = useState('');
  
  // Sistema de notificações toast
  const [notifications, setNotifications] = useState([]);
  
  // Modal de confirmação
  const [confirmDialog, setConfirmDialog] = useState({ show: false, message: '', onConfirm: null });

  const showNotification = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  const showConfirmDialog = (message, onConfirm) => {
    setConfirmDialog({ show: true, message, onConfirm });
  };

  const handleConfirmDialog = (confirmed) => {
    if (confirmed && confirmDialog.onConfirm) {
      confirmDialog.onConfirm();
    }
    setConfirmDialog({ show: false, message: '', onConfirm: null });
  };

  // Busca documentos da subpasta específica baseada no prefixo do ficheiro atual
  const fetchDocumentos = async () => {
    if (!originalFilename) return;

    console.log('🔍 Procurando documentos para:', originalFilename);
    
    // Extrai a pasta principal do originalFilename
    const parts = originalFilename.split('/');
    if (parts.length < 2) {
      console.log('❌ Caminho inválido, deve ter pelo menos pasta/ficheiro');
      return;
    }
    
    // A pasta principal é sempre a primeira parte do caminho
    const mainFolder = parts[0];
    const currentFileName = parts[parts.length - 1]; // Nome do ficheiro atual
    
    console.log('📁 Pasta principal:', mainFolder);
    console.log('📄 Nome do ficheiro atual:', currentFileName);
    
    // Extrai o prefixo do nome do ficheiro (parte antes do primeiro espaço)
    const filePrefix = currentFileName.split(' ')[0];
    console.log('🏷️ Prefixo do ficheiro:', filePrefix);

    setLoading(true);
    try {
      // Busca todos os ficheiros na pasta principal e suas subpastas
      const response = await fetch('https://api9001.duckdns.org/files/list-files-tree');
      
      if (!response.ok) {
        throw new Error('Erro ao buscar árvore de ficheiros');
      }
      
      const fileTree = await response.json();
      console.log('🌳 Árvore de ficheiros recebida');
      
      // Encontra a pasta principal na árvore
      const mainFolderNode = fileTree.find(node => 
        node.type === 'folder' && node.name === mainFolder
      );
      
      if (!mainFolderNode || !mainFolderNode.children) {
        console.log('❌ Pasta principal não encontrada ou vazia');
        setDocumentosDisponiveis([]);
        setCurrentFolderPath(mainFolder);
        return;
      }
      
      // Encontra a subpasta que segue o padrão "Informação Documentada - Procedimento (prefixo)"
      const expectedSubfolderName = `Informação Documentada - Procedimento ${filePrefix}`;
      const targetSubfolder = mainFolderNode.children.find(node => 
        node.type === 'folder' && node.name === expectedSubfolderName
      );
      
      if (!targetSubfolder || !targetSubfolder.children) {
        console.log(`❌ Subpasta "${expectedSubfolderName}" não encontrada ou vazia`);
        setDocumentosDisponiveis([]);
        setCurrentFolderPath(`${mainFolder}/${expectedSubfolderName}`);
        return;
      }
      
      console.log(`📂 Subpasta encontrada: ${targetSubfolder.name}`);
      
      // Função recursiva para extrair todos os ficheiros da subpasta específica
      const extractAllFiles = (nodes, currentPath = '') => {
        let allFiles = [];
        
        for (const node of nodes) {
          const fullPath = currentPath ? `${currentPath}/${node.name}` : node.name;
          
          if (node.type === 'file') {
            // Adiciona o ficheiro com seu caminho relativo dentro da subpasta
            allFiles.push({
              name: node.name,
              path: fullPath,
              folder: currentPath || targetSubfolder.name
            });
          } else if (node.type === 'folder' && node.children) {
            // Recursivamente busca ficheiros nas subpastas
            const subFiles = extractAllFiles(node.children, fullPath);
            allFiles = allFiles.concat(subFiles);
          }
        }
        
        return allFiles;
      };
      
      // Extrai todos os ficheiros da subpasta específica
      const allFiles = extractAllFiles(targetSubfolder.children);
      console.log(`📋 ${allFiles.length} ficheiros encontrados na subpasta "${targetSubfolder.name}"`);
      
      // Filtra para mostrar apenas ficheiros (remove extensões para display)
      const documentos = allFiles.map(file => ({
        displayName: file.name,
        fullPath: `${mainFolder}/${targetSubfolder.name}/${file.path}`,
        folder: file.folder
      }));
      
      setDocumentosDisponiveis(documentos);
      setCurrentFolderPath(`${mainFolder}/${targetSubfolder.name}`);
      
    } catch (error) {
      console.error('🚨 Erro na busca de documentos:', error);
      setDocumentosDisponiveis([]);
    } finally {
      setLoading(false);
    }
  };

  // Carrega documentos quando o componente é montado
  useEffect(() => {
    fetchDocumentos();
  }, [originalFilename]);

  // Processa o valor atual para extrair documentos já selecionados
  useEffect(() => {
    if (currentValue) {
      // Assume que os documentos estão separados por vírgula ou quebra de linha
      const docs = currentValue
        .split(/[,\n]/)
        .map(doc => doc.trim())
        .filter(doc => doc.length > 0);
      setDocumentosSelecionados(docs);
    } else {
      setDocumentosSelecionados([]);
    }
  }, [currentValue]);

  // Função para fazer upload de novo documento
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!originalFilename) {
      showNotification('Não foi possível determinar a pasta de destino.', 'error');
      return;
    }

    // Usa a subpasta específica para upload
    const parts = originalFilename.split('/');
    const mainFolder = parts[0];
    const currentFileName = parts[parts.length - 1];
    const filePrefix = currentFileName.split(' ')[0];
    
    // Cria o nome da subpasta no formato correto
    const subfolderName = `Informação Documentada - Procedimento ${filePrefix}`;
    const folderPath = `${mainFolder}/${subfolderName}`;

    setUploading(true);
    
    try {
      console.log('Fazendo upload para:', folderPath);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folderPath', folderPath + '/');

      const response = await fetch('https://api9001.duckdns.org/files/upload-document', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        console.log('Upload realizado com sucesso');
        // Recarrega a lista de documentos
        await fetchDocumentos();
        
        // Adiciona automaticamente o documento aos selecionados
        toggleDocumento(file.name);
        
        showNotification('Documento enviado com sucesso!', 'success');
      } else {
        console.error('Erro no upload:', response.statusText);
        showNotification('Erro ao enviar documento. Tente novamente.', 'error');
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      showNotification('Erro ao enviar documento. Tente novamente.', 'error');
    } finally {
      setUploading(false);
      // Limpa o input file
      event.target.value = '';
    }
  };

  // Callback após eliminação: atualiza lista e seleção
  const handleDeleteAssociated = async (filePath) => {
    try {
      // Remove o documento eliminado da seleção, se existir
      const deletedName = filePath.split('/').pop();
      if (documentosSelecionados.includes(deletedName)) {
        const novos = documentosSelecionados.filter(d => d !== deletedName);
        setDocumentosSelecionados(novos);
        onChange(novos.join('\n'));
      }
    } finally {
      // Recarrega documentos da subpasta
      await fetchDocumentos();
    }
  };

  // Função para apagar documento da base de dados
  const handleDelete = async (documentoName) => {
    // Busca o documento na lista disponível para obter o caminho completo
    const documento = documentosDisponiveis.find(
      doc => (typeof doc === 'object' ? doc.displayName : doc) === documentoName
    );
    
    if (documento && typeof documento === 'object') {
      const fullPath = documento.fullPath;
      
      // Confirma a ação com modal personalizado
      showConfirmDialog(
        `Tem a certeza que deseja apagar permanentemente o arquivo "${documentoName}"?\n\nEsta ação não pode ser desfeita.`,
        async () => {
          try {
            console.log('Apagando arquivo:', fullPath);
            
            const response = await fetch(`https://api9001.duckdns.org/files/delete`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ filename: encodeURIComponent(fullPath) }),
            });
            
            if (response.ok) {
              console.log('Arquivo apagado com sucesso');
              
              // Remove da lista de selecionados se estiver selecionado
              if (documentosSelecionados.includes(documentoName)) {
                const novos = documentosSelecionados.filter(d => d !== documentoName);
                setDocumentosSelecionados(novos);
                onChange(novos.join('\n'));
              }
              
              // Recarrega a lista de documentos
              await fetchDocumentos();
              
              showNotification('Arquivo apagado com sucesso!', 'success');
            } else {
              console.error('Erro ao apagar arquivo:', response.statusText);
              showNotification('Erro ao apagar arquivo. Tente novamente.', 'error');
            }
          } catch (error) {
            console.error('Erro ao apagar arquivo:', error);
            showNotification('Erro ao apagar arquivo. Tente novamente.', 'error');
          }
        }
      );
    }
  };

  // Função para alternar seleção de documento
  const toggleDocumento = (documento) => {
    let novosDocumentos;
    const docName = typeof documento === 'string' ? documento : documento.displayName;
    
    if (documentosSelecionados.includes(docName)) {
      // Remove o documento se já estiver selecionado
      novosDocumentos = documentosSelecionados.filter(doc => doc !== docName);
    } else {
      // Adiciona o documento se não estiver selecionado
      novosDocumentos = [...documentosSelecionados, docName];
    }
    
    setDocumentosSelecionados(novosDocumentos);
    
    // Atualiza o valor no componente pai
    const novoValor = novosDocumentos.join('\n');
    onChange(novoValor);
  };

  // Função para fazer preview do documento
  const handlePreview = async (documento) => {
    const docObject = documentosDisponiveis.find(doc => 
      doc.displayName === documento || doc === documento
    );
    
    if (!docObject) {
      showNotification('Documento não encontrado.', 'error');
      return;
    }
    
    const fullPath = typeof docObject === 'object' ? docObject.fullPath : documento;
    console.log('👁️ Preview:', fullPath);
    
    try {
      const response = await fetch('https://api9001.duckdns.org/files/get-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: encodeURIComponent(fullPath) }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        // Abre o documento numa nova janela
        const newWindow = window.open(url, '_blank');
        if (!newWindow) {
          showNotification('Pop-ups bloqueados. Por favor, permita pop-ups para visualizar o documento.', 'warning');
        } else {
          // Limpa o URL após um tempo para libertar memória
          setTimeout(() => URL.revokeObjectURL(url), 5000);
        }
      } else {
        const errorText = await response.text();
        showNotification(`Erro ao carregar o documento para preview: ${errorText}`, 'error');
      }
    } catch (error) {
      console.error('🚨 Erro no preview:', error);
      showNotification('Erro ao fazer preview do documento.', 'error');
    }
  };

  // Função para fazer download do documento
  const handleDownload = async (documento) => {
    const docObject = documentosDisponiveis.find(doc => 
      doc.displayName === documento || doc === documento
    );
    
    if (!docObject) {
      showNotification('Documento não encontrado.', 'error');
      return;
    }
    
    const fullPath = typeof docObject === 'object' ? docObject.fullPath : documento;
    console.log('⬇️ Download:', fullPath);
    
    try {
      const response = await fetch('https://api9001.duckdns.org/files/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: encodeURIComponent(fullPath) }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        // Cria um link temporário para download
        const link = document.createElement('a');
        link.href = url;
        link.download = typeof docObject === 'object' ? docObject.displayName : documento;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Limpa o URL temporário
        URL.revokeObjectURL(url);
      } else {
        const errorText = await response.text();
        showNotification(`Erro ao fazer download do documento: ${errorText}`, 'error');
      }
    } catch (error) {
      console.error('🚨 Erro no download:', error);
      showNotification('Erro ao fazer download do documento.', 'error');
    }
  };

  return (
    <div className="documentos-associados-container" style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Input hidden para permitir extração do valor em PDFs */}
      <input 
        type="hidden" 
        value={currentValue || ''} 
        data-component="documentos-associados"
        readOnly
      />
      
      {/* Área principal de exibição e seleção */}
      <div 
        style={{
          minHeight: '50px',
          height: '100%',
          padding: '6px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          backgroundColor: isEditable 
            ? (documentosSelecionados.length > 0 ? '#f9f9f9' : '#fff')
            : '#f5f5f5',
          fontSize: '11px',
          display: 'flex',
          flexDirection: 'column',
          cursor: isEditable ? 'pointer' : 'default',
          position: 'relative',
          opacity: (isEditable && canEdit) ? 1 : 0.7
        }}
        onClick={(isEditable && canEdit) ? () => setShowModal(!showModal) : undefined}
        title={(isEditable && canEdit) ? "Clique para selecionar documentos associados" : ""}
        data-current-value={currentValue || ''}
      >
        {/* Cabeçalho com contador */}
        <div style={{
          fontSize: '10px',
          color: '#666',
          borderBottom: documentosSelecionados.length > 0 ? '1px solid #eee' : 'none',
          paddingBottom: documentosSelecionados.length > 0 ? '4px' : '0',
          marginBottom: documentosSelecionados.length > 0 ? '4px' : '0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>Documentos ({documentosSelecionados.length})</span>
          <span style={{ fontSize: '9px' }}>
            📂
          </span>
        </div>

        {/* Lista de documentos selecionados */}
        {documentosSelecionados.length > 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {documentosSelecionados.map((doc, index) => (
              <div key={index} style={{ 
                padding: '3px 6px',
                borderRadius: '3px',
                fontSize: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ flex: 1, wordBreak: 'break-word' }}>{doc}</span>
                {isEditable && (
                  <div style={{ display: 'flex', gap: '2px', marginLeft: '4px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDocumento(doc);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#666',
                        cursor: 'pointer',
                        fontSize: '12px',
                        padding: '0 4px',
                        borderRadius: '2px',
                        fontSize: '15px',
                      }}
                      title="Remover documento"
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#ffcdd2'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#999', 
            fontSize: '10px', 
            fontStyle: 'italic',
            textAlign: 'center'
          }}>
            Clique para selecionar<br/>documentos associados
          </div>
        )}
      </div>

      {showModal && canEdit && (
        <>
          {/* Overlay de fundo */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={() => setShowModal(false)}
          >
            {/* Janela Modal */}
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                width: '80%',
                maxWidth: '800px',
                maxHeight: '80%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Cabeçalho da Modal */}
              <div style={{ 
                padding: '16px', 
                borderBottom: '1px solid #eee', 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                    Documentos Associados
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
                    {currentFolderPath || 'Procurando...'}
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer',
                    color: '#666',
                    padding: '4px 8px',
                    borderRadius: '4px'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#e9ecef'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  ×
                </button>
              </div>

              {/* Conteúdo da Modal */}
              <div style={{ 
                flex: 1, 
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {/* Área de upload */}
                <div style={{ padding: '16px', borderBottom: '1px solid #eee', backgroundColor: '#f0f8f0' }}>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    style={{ display: 'none' }}
                    id="upload-documento"
                  />
                  <label
                    htmlFor="upload-documento"
                    style={{
                      display: 'inline-block',
                      padding: '8px 16px',
                      backgroundColor: uploading ? '#6c757d' : '#28a745',
                      color: 'white',
                      borderRadius: '4px',
                      cursor: uploading ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      border: 'none',
                      fontWeight: 'bold'
                    }}
                  >
                    {uploading ? 'A enviar...' : '📁 Enviar Novo Documento'}
                  </label>
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '6px' }}>
                    Selecione qualquer tipo de ficheiro para enviar para esta subpasta
                  </div>
                </div>
                
                {/* Lista de documentos */}
                <div style={{ 
                  flex: 1, 
                  overflow: 'auto',
                  minHeight: '300px',
                  padding: '8px'
                }}>
                  {loading && (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      height: '200px',
                      fontSize: '14px', 
                      color: '#666' 
                    }}>
                      🔄 A carregar documentos...
                    </div>
                  )}
                  
                  {!loading && documentosDisponiveis.length === 0 && (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      flexDirection: 'column',
                      height: '200px',
                      fontSize: '14px', 
                      color: '#666',
                      textAlign: 'center'
                    }}>
                      <p>📭 Nenhum documento encontrado na subpasta:</p>
                      <code style={{ fontSize: '12px', backgroundColor: '#f5f5f5', padding: '4px 8px', borderRadius: '4px' }}>
                        {currentFolderPath || 'Caminho não determinado'}
                      </code>
                    </div>
                  )}
                  
                  {!loading && documentosDisponiveis.map((documento, index) => {
                    const docName = typeof documento === 'object' ? documento.displayName : documento;
                    const docFolder = typeof documento === 'object' ? documento.folder : '';
                    const isSelected = documentosSelecionados.includes(docName);
                    
                    return (
                      <div
                        key={index}
                        style={{
                          padding: '12px',
                          margin: '8px 0',
                          fontSize: '13px',
                          backgroundColor: isSelected ? '#e8f5e8' : '#f8f9fa',
                          border: isSelected ? '2px solid #4caf50' : '1px solid #dee2e6',
                          borderRadius: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = '#e9ecef';
                            e.currentTarget.style.borderColor = '#adb5bd';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = '#f8f9fa';
                            e.currentTarget.style.borderColor = '#dee2e6';
                          }
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                          <div 
                            style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, cursor: 'pointer' }}
                            onClick={() => toggleDocumento(docName)}
                          >
                            <div style={{ 
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              backgroundColor: isSelected ? '#4caf50' : '#dee2e6',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              color: 'white',
                              fontWeight: 'bold'
                            }}>
                              {isSelected ? '✓' : ''}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>📄 {docName}</div>
                              {docFolder && docFolder !== '(raiz)' && (
                                <div style={{ fontSize: '11px', color: '#666', fontStyle: 'italic', marginTop: '2px' }}>
                                  📁 Pasta: {docFolder}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePreview(docName);
                              }}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#1976d2',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontWeight: 'bold'
                              }}
                              title="Visualizar documento"
                              onMouseEnter={(e) => e.target.style.backgroundColor = '#1565c0'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = '#1976d2'}
                            >
                              👁️ Ver
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(docName);
                              }}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#388e3c',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontWeight: 'bold'
                              }}
                              title="Descarregar documento"
                              onMouseEnter={(e) => e.target.style.backgroundColor = '#2e7d32'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = '#388e3c'}
                            >
                              ⬇️ Baixar
                            </button>
                            {isSuperAdmin && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(docName);
                                }}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: '#d32f2f',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '11px',
                                  fontWeight: 'bold'
                                }}
                                title="Apagar documento permanentemente"
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#c62828'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#d32f2f'}
                              >
                                🗑️ Apagar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Rodapé da Modal */}
                <div style={{ 
                  padding: '16px', 
                  borderTop: '1px solid #eee', 
                  backgroundColor: '#f8f9fa',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {documentosSelecionados.length} documento(s) selecionado(s)
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setShowModal(false)}
                      style={{
                        padding: '8px 16px',
                        fontSize: '12px',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* Modal de Confirmação */}
      {confirmDialog.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 10001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            width: '90%',
            maxWidth: '450px',
            padding: '0',
            overflow: 'hidden',
            animation: 'modalFadeIn 0.3s ease-out'
          }}>
            {/* Cabeçalho */}
            <div style={{
              padding: '20px 24px',
              backgroundColor: '#fff3cd',
              borderBottom: '2px solid #ffc107',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{ fontSize: '28px' }}>⚠️</span>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#856404' }}>
                Confirmação Necessária
              </h3>
            </div>
            
            {/* Conteúdo */}
            <div style={{
              padding: '24px',
              fontSize: '15px',
              lineHeight: '1.6',
              color: '#333',
              whiteSpace: 'pre-line'
            }}>
              {confirmDialog.message}
            </div>
            
            {/* Botões */}
            <div style={{
              padding: '16px 24px',
              backgroundColor: '#f8f9fa',
              borderTop: '1px solid #dee2e6',
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => handleConfirmDialog(false)}
                style={{
                  padding: '10px 24px',
                  fontSize: '14px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#5a6268'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#6c757d'}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleConfirmDialog(true)}
                style={{
                  padding: '10px 24px',
                  fontSize: '14px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#c82333'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#dc3545'}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Sistema de Notificações Toast */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {notifications.map(notification => (
          <div
            key={notification.id}
            style={{
              minWidth: '300px',
              maxWidth: '400px',
              padding: '16px 20px',
              backgroundColor: 
                notification.type === 'success' ? '#d4edda' :
                notification.type === 'error' ? '#f8d7da' :
                notification.type === 'warning' ? '#fff3cd' : '#d1ecf1',
              color: 
                notification.type === 'success' ? '#155724' :
                notification.type === 'error' ? '#721c24' :
                notification.type === 'warning' ? '#856404' : '#0c5460',
              border: `1px solid ${
                notification.type === 'success' ? '#c3e6cb' :
                notification.type === 'error' ? '#f5c6cb' :
                notification.type === 'warning' ? '#ffeaa7' : '#bee5eb'}`,
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              fontSize: '14px',
              fontWeight: '500',
              animation: 'slideIn 0.3s ease-out',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <span style={{ fontSize: '20px' }}>
              {notification.type === 'success' ? '✅' :
               notification.type === 'error' ? '❌' :
               notification.type === 'warning' ? '⚠️' : 'ℹ️'}
            </span>
            <span style={{ flex: 1 }}>{notification.message}</span>
          </div>
        ))}
      </div>
      
      {/* Estilos para animação */}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes modalFadeIn {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default DocumentosAssociados;
