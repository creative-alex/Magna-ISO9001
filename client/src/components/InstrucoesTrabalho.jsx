import React, { useState, useEffect } from 'react';

const InstrucoesTrabalho = ({ 
  currentValue, 
  onChange,
  originalFilename
}) => {
  const [instrucoesDisponiveis, setInstrucoesDisponiveis] = useState([]);
  const [instrucoesSelecionadas, setInstrucoesSelecionadas] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Estados para links de vídeo
  const [videoLink, setVideoLink] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [showVideoForm, setShowVideoForm] = useState(false);

  const [currentFolderPath, setCurrentFolderPath] = useState('');

  // Função para verificar se uma entrada é um vídeo
  const isVideoEntry = (entry) => {
    return entry.startsWith('[VIDEO]');
  };

  // Função para validar URLs de vídeo
  const isValidVideoUrl = (url) => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      // Suporte para YouTube, Vimeo, e outros serviços de vídeo comuns
      return (
        hostname.includes('youtube.com') ||
        hostname.includes('youtu.be') ||
        hostname.includes('vimeo.com') ||
        hostname.includes('dailymotion.com') ||
        hostname.includes('twitch.tv') ||
        hostname.includes('wistia.com') ||
        hostname.includes('loom.com') ||
        url.match(/\.(mp4|avi|mov|wmv|flv|webm)$/i) // Arquivos de vídeo diretos
      );
    } catch {
      return false;
    }
  };

  // Função para extrair título automático de URLs do YouTube
  const extractYouTubeTitle = async (url) => {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
        // Extrai o ID do vídeo
        let videoId;
        if (urlObj.hostname.includes('youtu.be')) {
          videoId = urlObj.pathname.substring(1);
        } else {
          videoId = urlObj.searchParams.get('v');
        }
        
        if (videoId) {
          // Retorna um título padrão simples
          return `Vídeo YouTube`;
        }
      }
      return '';
    } catch {
      return '';
    }
  };

  // Função para adicionar link de vídeo
  const handleAddVideoLink = async () => {
    if (!videoLink.trim()) {
      alert('Por favor, insira um link de vídeo válido.');
      return;
    }

    if (!isValidVideoUrl(videoLink)) {
      alert('URL de vídeo não suportada. Suporte: YouTube, Vimeo, Dailymotion, Twitch, Loom, Wistia ou arquivos de vídeo diretos.');
      return;
    }

    let title = videoTitle.trim();
    if (!title) {
      // Tenta extrair título automaticamente
      title = await extractYouTubeTitle(videoLink);
      if (!title) {
        // Se não conseguir extrair, usa um título padrão
        const urlObj = new URL(videoLink);
        title = `Vídeo - ${urlObj.hostname}`;
      }
    }

    // Formato especial para links de vídeo: inclui título e URL para o PDF
    const videoEntry = `[VIDEO] ${title}||${videoLink}`;
    
    // Adiciona aos selecionados
    const novasInstrucoes = [...instrucoesSelecionadas, videoEntry];
    setInstrucoesSelecionadas(novasInstrucoes);
    
    // Atualiza o valor no componente pai
    const novoValor = novasInstrucoes.join('\n');
    onChange(novoValor);

    // Limpa o formulário
    setVideoLink('');
    setVideoTitle('');
    setShowVideoForm(false);
  };

  // Função para abrir link de vídeo
  const handleOpenVideoLink = (videoEntry) => {
    const urlMatch = videoEntry.match(/\| (.+)$/);
    if (urlMatch) {
      const url = urlMatch[1];
      window.open(url, '_blank');
    }
  };

  // Função para verificar se uma entrada é um link de vídeo
  const isVideoLink = (entry) => {
    return entry.startsWith('[VIDEO]');
  };

  // Função para extrair título do link de vídeo
  const getVideoTitle = (videoEntry) => {
    // Remove o prefixo [VIDEO] e extrai apenas o título (antes do ||)
    const titlePart = videoEntry.replace('[VIDEO] ', '').split('||')[0];
    return titlePart;
  };

  // Função para extrair URL do link de vídeo
  const getVideoUrl = (videoEntry) => {
    // Extrai a URL (depois do ||)
    const parts = videoEntry.split('||');
    return parts.length > 1 ? parts[1] : '';
  };

  // Busca Instruções de trabalho procedimento da subpasta específica baseada no prefixo do ficheiro atual
  const fetchInstrucoes = async () => {
    if (!originalFilename) return;

    console.log('🔍 Procurando Instruções de trabalho procedimento para:', originalFilename);
    
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
        setInstrucoesDisponiveis([]);
        setCurrentFolderPath(mainFolder);
        return;
      }
      
      // Encontra a subpasta que contém "Instruções de trabalho procedimento" e termina com o mesmo prefixo do ficheiro atual
      const targetSubfolder = mainFolderNode.children.find(node => 
        node.type === 'folder' && 
        node.name.toLowerCase().includes('Instruções de trabalho procedimento') &&
        node.name.endsWith(filePrefix)
      );
      
      if (!targetSubfolder || !targetSubfolder.children) {
        console.log(`❌ Subpasta de "Instruções de trabalho procedimento" que termina com "${filePrefix}" não encontrada ou vazia`);
        setInstrucoesDisponiveis([]);
        setCurrentFolderPath(`${mainFolder}/Instruções de trabalho procedimento ${filePrefix}*`);
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
      const instrucoes = allFiles.map(file => ({
        displayName: file.name,
        fullPath: `${mainFolder}/${targetSubfolder.name}/${file.path}`,
        folder: file.folder
      }));
      
      setInstrucoesDisponiveis(instrucoes);
      setCurrentFolderPath(`${mainFolder}/${targetSubfolder.name}`);
      
    } catch (error) {
      console.error('🚨 Erro na busca de Instruções de trabalho procedimento:', error);
      setInstrucoesDisponiveis([]);
    } finally {
      setLoading(false);
    }
  };

  // Carrega instruções quando o componente é montado
  useEffect(() => {
    fetchInstrucoes();
  }, [originalFilename]);

  // Processa o valor atual para extrair instruções já selecionadas
  useEffect(() => {
    if (currentValue) {
      // Assume que as instruções estão separadas por vírgula ou quebra de linha
      const instrucoes = currentValue
        .split(/[,\n]/)
        .map(instrucao => instrucao.trim())
        .filter(instrucao => instrucao.length > 0);
      setInstrucoesSelecionadas(instrucoes);
    } else {
      setInstrucoesSelecionadas([]);
    }
  }, [currentValue]);

  // Função para fazer upload de nova instrução
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
    
    // Busca a subpasta correta para Instruções de trabalho procedimento
    const folderPath = `${mainFolder}/Instruções de trabalho procedimento ${filePrefix}`;

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
        // Recarrega a lista de instruções
        await fetchInstrucoes();
        
        // Adiciona automaticamente a instrução aos selecionados
        toggleInstrucao(file.name);
        
        alert('Instrução de trabalho enviada com sucesso!');
      } else {
        console.error('Erro no upload:', response.statusText);
        alert('Erro ao enviar instrução de trabalho. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      alert('Erro ao enviar instrução de trabalho. Tente novamente.');
    } finally {
      setUploading(false);
      // Limpa o input file
      event.target.value = '';
    }
  };

  // Função para alternar seleção de instrução
  const toggleInstrucao = (instrucao) => {
    let novasInstrucoes;
    const instrucaoName = typeof instrucao === 'string' ? instrucao : instrucao.displayName;
    
    if (instrucoesSelecionadas.includes(instrucaoName)) {
      // Remove a instrução se já estiver selecionada
      novasInstrucoes = instrucoesSelecionadas.filter(inst => inst !== instrucaoName);
    } else {
      // Adiciona a instrução se não estiver selecionada
      novasInstrucoes = [...instrucoesSelecionadas, instrucaoName];
    }
    
    setInstrucoesSelecionadas(novasInstrucoes);
    
    // Atualiza o valor no componente pai
    const novoValor = novasInstrucoes.join('\n');
    onChange(novoValor);
  };

  // Função para remover instrução específica (arquivo ou vídeo)
  const removeInstrucao = (instrucao) => {
    const novasInstrucoes = instrucoesSelecionadas.filter(inst => inst !== instrucao);
    setInstrucoesSelecionadas(novasInstrucoes);
    
    // Atualiza o valor no componente pai
    const novoValor = novasInstrucoes.join('\n');
    onChange(novoValor);
  };

  // Função para fazer preview da instrução
  const handlePreview = async (instrucao) => {
    const instrucaoObject = instrucoesDisponiveis.find(inst => 
      inst.displayName === instrucao || inst === instrucao
    );
    
    if (!instrucaoObject) {
      alert('Instrução de trabalho não encontrada.');
      return;
    }
    
    const fullPath = typeof instrucaoObject === 'object' ? instrucaoObject.fullPath : instrucao;
    console.log('👁️ Preview:', fullPath);
    
    try {
      const response = await fetch('http://192.168.1.219:8080/files/get-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: fullPath }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        // Abre o documento numa nova janela
        const newWindow = window.open(url, '_blank');
        if (!newWindow) {
          alert('Pop-ups bloqueados. Por favor, permita pop-ups para visualizar a instrução.');
        } else {
          // Limpa o URL após um tempo para libertar memória
          setTimeout(() => URL.revokeObjectURL(url), 5000);
        }
      } else {
        const errorText = await response.text();
        alert(`Erro ao carregar a instrução para preview: ${errorText}`);
      }
    } catch (error) {
      console.error('🚨 Erro no preview:', error);
      alert('Erro ao fazer preview da instrução de trabalho.');
    }
  };

  // Função para fazer download da instrução
  const handleDownload = async (instrucao) => {
    const instrucaoObject = instrucoesDisponiveis.find(inst => 
      inst.displayName === instrucao || inst === instrucao
    );
    
    if (!instrucaoObject) {
      alert('Instrução de trabalho não encontrada.');
      return;
    }
    
    const fullPath = typeof instrucaoObject === 'object' ? instrucaoObject.fullPath : instrucao;
    console.log('⬇️ Download:', fullPath);
    
    try {
      const response = await fetch('http://192.168.1.219:8080/files/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: fullPath }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        // Cria um link temporário para download
        const link = document.createElement('a');
        link.href = url;
        link.download = typeof instrucaoObject === 'object' ? instrucaoObject.displayName : instrucao;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Limpa o URL temporário
        URL.revokeObjectURL(url);
      } else {
        const errorText = await response.text();
        alert(`Erro ao fazer download da instrução: ${errorText}`);
      }
    } catch (error) {
      console.error('🚨 Erro no download:', error);
      alert('Erro ao fazer download da instrução de trabalho.');
    }
  };

  return (
    <div className="instrucoes-trabalho-container" style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Área principal de exibição e seleção */}
      <div 
        style={{
          minHeight: '50px',
          height: '100%',
          padding: '6px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          backgroundColor: instrucoesSelecionadas.length > 0 ? '#f9f9f9' : '#fff',
          fontSize: '11px',
          display: 'flex',
          flexDirection: 'column',
          cursor: 'pointer',
          position: 'relative'
        }}
        onClick={() => setShowDropdown(!showDropdown)}
        title="Clique para selecionar Instruções de trabalho procedimento"
      >
        {/* Cabeçalho com contador */}
        <div style={{
          fontSize: '10px',
          color: '#666',
          borderBottom: instrucoesSelecionadas.length > 0 ? '1px solid #eee' : 'none',
          paddingBottom: instrucoesSelecionadas.length > 0 ? '4px' : '0',
          marginBottom: instrucoesSelecionadas.length > 0 ? '4px' : '0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>Instruções ({instrucoesSelecionadas.length})</span>
          <span style={{ fontSize: '9px' }}>
            {showDropdown ? '^' : 'v'}
          </span>
        </div>

        {/* Lista de instruções selecionadas */}
        {instrucoesSelecionadas.length > 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {instrucoesSelecionadas.map((instrucao, index) => {
              const isVideo = isVideoLink(instrucao);
              const displayName = isVideo ? getVideoTitle(instrucao) : instrucao;
              
              return (
                <div key={index} style={{ 
                  padding: '3px 6px',
                  backgroundColor: isVideo ? '#e8f0ff' : '#e8f5e8',
                  borderRadius: '3px',
                  fontSize: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: isVideo ? '1px solid #c8d6e5' : '1px solid #c8e6c9'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', flex: 1, wordBreak: 'break-word' }}>
                    {isVideo && (
                      <span style={{ 
                        marginRight: '4px', 
                        fontSize: '8px', 
                        backgroundColor: '#1976d2', 
                        color: 'white', 
                        padding: '1px 3px', 
                        borderRadius: '2px' 
                      }}>
                        VIDEO
                      </span>
                    )}
                    <span>{displayName}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '2px', marginLeft: '4px' }}>
                    {isVideo ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenVideoLink(instrucao);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#1976d2',
                          cursor: 'pointer',
                          fontSize: '10px',
                          padding: '1px 3px',
                          borderRadius: '2px'
                        }}
                        title="Abrir vídeo"
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#e3f2fd'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        ▶
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(instrucao);
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
                        title="Descarregar instrução"
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#e8f5e8'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        v
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeInstrucao(instrucao);
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
                      title="Remover instrução"
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#ffcdd2'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
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
            Clique para selecionar<br/>Instruções de trabalho procedimento
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
          <div style={{ padding: '8px', borderBottom: '1px solid #eee', backgroundColor: '#f0f8f0' }}>
            <input
              type="file"
              onChange={handleFileUpload}
              disabled={uploading}
              style={{ display: 'none' }}
              id="upload-instrucao"
            />
            <label
              htmlFor="upload-instrucao"
              style={{
                display: 'inline-block',
                padding: '6px 12px',
                backgroundColor: uploading ? '#6c757d' : '#28a745',
                color: 'white',
                borderRadius: '4px',
                cursor: uploading ? 'not-allowed' : 'pointer',
                fontSize: '11px',
                border: 'none',
                fontWeight: 'bold'
              }}
            >
              {uploading ? 'Enviando...' : 'Enviar Nova Instrução'}
            </label>
            <div style={{ fontSize: '9px', color: '#666', marginTop: '4px' }}>
              Selecione qualquer tipo de ficheiro para enviar para esta subpasta
            </div>
          </div>

          {/* Área de links de vídeo */}
          <div style={{ padding: '8px', borderBottom: '1px solid #eee', backgroundColor: '#f0f5ff' }}>
            {!showVideoForm ? (
              <div>
                <button
                  onClick={() => setShowVideoForm(true)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#1976d2',
                    color: 'white',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    border: 'none',
                    fontWeight: 'bold'
                  }}
                >
                  Adicionar Link de Vídeo
                </button>
                <div style={{ fontSize: '9px', color: '#666', marginTop: '4px' }}>
                  Suporte: YouTube, Vimeo, Dailymotion, Twitch, Loom, Wistia
                </div>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'block', fontSize: '10px', marginBottom: '2px', fontWeight: 'bold' }}>
                    URL do Vídeo:
                  </label>
                  <input
                    type="url"
                    value={videoLink}
                    onChange={(e) => setVideoLink(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    style={{
                      width: '100%',
                      padding: '4px',
                      fontSize: '10px',
                      border: '1px solid #ccc',
                      borderRadius: '3px'
                    }}
                  />
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'block', fontSize: '10px', marginBottom: '2px', fontWeight: 'bold' }}>
                    Título (opcional):
                  </label>
                  <input
                    type="text"
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    placeholder="Título personalizado do vídeo"
                    style={{
                      width: '100%',
                      padding: '4px',
                      fontSize: '10px',
                      border: '1px solid #ccc',
                      borderRadius: '3px'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={handleAddVideoLink}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '10px',
                      border: 'none'
                    }}
                  >
                    Adicionar
                  </button>
                  <button
                    onClick={() => {
                      setShowVideoForm(false);
                      setVideoLink('');
                      setVideoTitle('');
                    }}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '10px',
                      border: 'none'
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {loading && (
            <div style={{ padding: '8px', textAlign: 'center', fontSize: '12px', color: '#666' }}>
              Carregando instruções...
            </div>
          )}
          
          {!loading && instrucoesDisponiveis.length === 0 && (
            <div style={{ padding: '8px', textAlign: 'center', fontSize: '12px', color: '#666' }}>
              Nenhuma instrução encontrada na subpasta:<br/>
              <code style={{ fontSize: '10px' }}>{currentFolderPath || 'Caminho não determinado'}</code>
            </div>
          )}
          
          {!loading && instrucoesDisponiveis.map((instrucao, index) => {
            const instrucaoName = typeof instrucao === 'object' ? instrucao.displayName : instrucao;
            const instrucaoFolder = typeof instrucao === 'object' ? instrucao.folder : '';
            const isSelected = instrucoesSelecionadas.includes(instrucaoName);
            
            return (
              <div
                key={index}
                style={{
                  padding: '6px 8px',
                  fontSize: '12px',
                  backgroundColor: isSelected ? '#e8f5e8' : 'transparent',
                  borderLeft: isSelected ? '3px solid #4caf50' : '3px solid transparent',
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
                    onClick={() => toggleInstrucao(instrucaoName)}
                  >
                    <span style={{ fontSize: '10px' }}>
                      {isSelected ? 'X' : 'O'}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold' }}>{instrucaoName}</div>
                      {instrucaoFolder && instrucaoFolder !== '(raiz)' && (
                        <div style={{ fontSize: '10px', color: '#666', fontStyle: 'italic' }}>
                          Pasta: {instrucaoFolder}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(instrucaoName);
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
                      title="Visualizar instrução"
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#e3f2fd'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      Ver
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(instrucaoName);
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
                      title="Descarregar instrução"
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

export default InstrucoesTrabalho;
