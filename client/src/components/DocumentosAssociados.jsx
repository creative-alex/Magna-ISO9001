import React, { useState, useEffect } from 'react';

const DocumentosAssociados = ({ 
  currentValue, 
  onChange, 
  originalFilename
}) => {
  const [documentosDisponiveis, setDocumentosDisponiveis] = useState([]);
  const [documentosSelecionados, setDocumentosSelecionados] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [currentFolderPath, setCurrentFolderPath] = useState('');

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
      const response = await fetch('http://192.168.1.219:8080/files/list-files-tree');
      
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
      alert('Não foi possível determinar a pasta de destino.');
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

      const response = await fetch('http://192.168.1.219:8080/files/upload-document', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        console.log('Upload realizado com sucesso');
        // Recarrega a lista de documentos
        await fetchDocumentos();
        
        // Adiciona automaticamente o documento aos selecionados
        toggleDocumento(file.name);
        
        alert('Documento enviado com sucesso!');
      } else {
        console.error('Erro no upload:', response.statusText);
        alert('Erro ao enviar documento. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      alert('Erro ao enviar documento. Tente novamente.');
    } finally {
      setUploading(false);
      // Limpa o input file
      event.target.value = '';
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
      alert('Documento não encontrado.');
      return;
    }
    
    const fullPath = typeof docObject === 'object' ? docObject.fullPath : documento;
    console.log('👁️ Preview:', fullPath);
    
    try {
      const response = await fetch('http://192.168.1.219:8080/files/get-pdf', {
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
          alert('Pop-ups bloqueados. Por favor, permita pop-ups para visualizar o documento.');
        } else {
          // Limpa o URL após um tempo para libertar memória
          setTimeout(() => URL.revokeObjectURL(url), 5000);
        }
      } else {
        const errorText = await response.text();
        alert(`Erro ao carregar o documento para preview: ${errorText}`);
      }
    } catch (error) {
      console.error('🚨 Erro no preview:', error);
      alert('Erro ao fazer preview do documento.');
    }
  };

  // Função para fazer download do documento
  const handleDownload = async (documento) => {
    const docObject = documentosDisponiveis.find(doc => 
      doc.displayName === documento || doc === documento
    );
    
    if (!docObject) {
      alert('Documento não encontrado.');
      return;
    }
    
    const fullPath = typeof docObject === 'object' ? docObject.fullPath : documento;
    console.log('⬇️ Download:', fullPath);
    
    try {
      const response = await fetch('http://192.168.1.219:8080/files/download', {
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
        alert(`Erro ao fazer download do documento: ${errorText}`);
      }
    } catch (error) {
      console.error('🚨 Erro no download:', error);
      alert('Erro ao fazer download do documento.');
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
          backgroundColor: documentosSelecionados.length > 0 ? '#f9f9f9' : '#fff',
          fontSize: '11px',
          display: 'flex',
          flexDirection: 'column',
          cursor: 'pointer',
          position: 'relative'
        }}
        onClick={() => setShowDropdown(!showDropdown)}
        title="Clique para selecionar documentos associados"
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
            {showDropdown ? '^' : 'v'}
          </span>
        </div>

        {/* Lista de documentos selecionados */}
        {documentosSelecionados.length > 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {documentosSelecionados.map((doc, index) => (
              <div key={index} style={{ 
                padding: '3px 6px',
                backgroundColor: '#e3f2fd',
                borderRadius: '3px',
                fontSize: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: '1px solid #bbdefb'
              }}>
                <span style={{ flex: 1, wordBreak: 'break-word' }}>{doc}</span>
                <div style={{ display: 'flex', gap: '2px', marginLeft: '4px' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(doc);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#388e3c',
                      cursor: 'pointer',
                      fontSize: '10px',
                      padding: '1px 3px',
                      borderRadius: '2px'
                    }}
                    title="Descarregar documento"
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#e8f5e8'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    v
                  </button>
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
                      borderRadius: '2px'
                    }}
                    title="Remover documento"
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#ffcdd2'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    ×
                  </button>
                </div>
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

      {showDropdown && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            zIndex: 1000,
            maxHeight: '300px',
            overflowY: 'auto'
          }}
        >
          <div style={{ padding: '8px', borderBottom: '1px solid #eee', fontWeight: 'bold', fontSize: '12px' }}>
            Ficheiros da subpasta: {currentFolderPath || 'Procurando...'}
          </div>
          
          {/* Área de upload */}
          <div style={{ padding: '8px', borderBottom: '1px solid #eee', backgroundColor: '#f8f9fa' }}>
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
                padding: '6px 12px',
                backgroundColor: uploading ? '#6c757d' : '#007bff',
                color: 'white',
                borderRadius: '4px',
                cursor: uploading ? 'not-allowed' : 'pointer',
                fontSize: '11px',
                border: 'none',
                fontWeight: 'bold'
              }}
            >
              {uploading ? 'A enviar...' : 'Enviar Novo Documento'}
            </label>
            <div style={{ fontSize: '9px', color: '#666', marginTop: '4px' }}>
              Selecione qualquer tipo de ficheiro para enviar para esta subpasta
            </div>
          </div>
          
          {loading && (
            <div style={{ padding: '8px', textAlign: 'center', fontSize: '12px', color: '#666' }}>
              Carregando documentos...
            </div>
          )}
          
          {!loading && documentosDisponiveis.length === 0 && (
            <div style={{ padding: '8px', textAlign: 'center', fontSize: '12px', color: '#666' }}>
              Nenhum documento encontrado na subpasta:<br/>
              <code style={{ fontSize: '10px' }}>{currentFolderPath || 'Caminho não determinado'}</code>
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
                  padding: '6px 8px',
                  fontSize: '12px',
                  backgroundColor: isSelected ? '#e3f2fd' : 'transparent',
                  borderLeft: isSelected ? '3px solid #2196f3' : '3px solid transparent',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.target.style.backgroundColor = '#f5f5f5';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                  <div 
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, cursor: 'pointer' }}
                    onClick={() => toggleDocumento(docName)}
                  >
                    <span style={{ fontSize: '10px' }}>
                      {isSelected ? 'X' : 'O'}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold' }}>{docName}</div>
                      {docFolder && docFolder !== '(raiz)' && (
                        <div style={{ fontSize: '10px', color: '#666', fontStyle: 'italic' }}>
                          Pasta: {docFolder}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(docName);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#1976d2',
                        cursor: 'pointer',
                        fontSize: '12px',
                        padding: '2px 4px',
                        borderRadius: '2px'
                      }}
                      title="Visualizar documento"
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#e3f2fd'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      Ver
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(docName);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#388e3c',
                        cursor: 'pointer',
                        fontSize: '12px',
                        padding: '2px 4px',
                        borderRadius: '2px'
                      }}
                      title="Descarregar documento"
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#e8f5e8'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      Baixar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          
          <div style={{ padding: '4px 8px', borderTop: '1px solid #eee', textAlign: 'center' }}>
            <button
              onClick={() => setShowDropdown(false)}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                backgroundColor: '#f0f0f0',
                border: '1px solid #ccc',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentosAssociados;