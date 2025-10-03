import React, { useState, useEffect } from 'react';

const InstrucoesTrabalho = ({ 
  currentValue, 
  onChange,
  originalFilename,
  isEditable = true, // Nova prop para controlar editabilidade
  canEdit = true // Nova prop para controlar se pode editar (permissões)
}) => {
  const [instrucoesDisponiveis, setInstrucoesDisponiveis] = useState([]);
  const [instrucoesSelecionadas, setInstrucoesSelecionadas] = useState([]);
  const [showModal, setShowModal] = useState(false);
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
      console.log('🔍 Procurando por pasta que:');
      console.log('   - Contenha: "Instruções de trabalho procedimento"');
      console.log('   - Termine com: "' + filePrefix + '"');
      console.log('📂 Pastas disponíveis na pasta principal:');
      mainFolderNode.children.forEach(node => {
        if (node.type === 'folder') {
          console.log(`   - "${node.name}" (toLowerCase: "${node.name.toLowerCase()}")`)
          console.log(`     Contém "instruções": ${node.name.toLowerCase().includes('instruções de trabalho procedimento')}`)
          console.log(`     Termina com "${filePrefix}": ${node.name.endsWith(filePrefix)}`)
        }
      });
      
      let targetSubfolder = mainFolderNode.children.find(node => 
        node.type === 'folder' && 
        (node.name.toLowerCase().includes('instruções de trabalho procedimento') ||
         node.name.toLowerCase().includes('instrucoes de trabalho procedimento')) &&
        node.name.endsWith(filePrefix)
      );
      
      if (!targetSubfolder || !targetSubfolder.children) {
        console.log(`❌ Subpasta de "Instruções de trabalho procedimento" que termina com "${filePrefix}" não encontrada ou vazia`);
        
        // Tenta uma busca alternativa mais flexível
        console.log('🔄 Tentando busca alternativa...');
        const alternativeSubfolder = mainFolderNode.children.find(node => 
          node.type === 'folder' && 
          (node.name.toLowerCase().includes('instruções de trabalho') || 
           node.name.toLowerCase().includes('instrucoes de trabalho')) &&
          node.name.includes(filePrefix)
        );
        
        if (alternativeSubfolder && alternativeSubfolder.children) {
          console.log(`✅ Pasta alternativa encontrada: "${alternativeSubfolder.name}"`);
          targetSubfolder = alternativeSubfolder; // Usar a pasta alternativa
        } else {
          setInstrucoesDisponiveis([]);
          setCurrentFolderPath(`${mainFolder}/Instruções de trabalho procedimento ${filePrefix}`);
          return;
        }
      }
      
      console.log(`📂 Usando subpasta: ${targetSubfolder.name}`);
      
      // Função recursiva para extrair todos os ficheiros da subpasta específica
      const extractAllFiles = (nodes, currentPath = '', folderName = '') => {
        let allFiles = [];
        
        for (const node of nodes) {
          const fullPath = currentPath ? `${currentPath}/${node.name}` : node.name;
          
          if (node.type === 'file') {
            // Adiciona o ficheiro com seu caminho relativo dentro da subpasta
            allFiles.push({
              name: node.name,
              path: fullPath,
              folder: currentPath || folderName
            });
          } else if (node.type === 'folder' && node.children) {
            // Recursivamente busca ficheiros nas subpastas
            const subFiles = extractAllFiles(node.children, fullPath, folderName);
            allFiles = allFiles.concat(subFiles);
          }
        }
        
        return allFiles;
      };
      
      // Extrai todos os ficheiros da subpasta específica
      const allFiles = extractAllFiles(targetSubfolder.children, '', targetSubfolder.name);
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

  // Função para download de instrução
  const handleDownload = (instrucaoName) => {
    // Busca a instrução na lista disponível para obter o caminho completo
    const instrucao = instrucoesDisponiveis.find(
      inst => (typeof inst === 'object' ? inst.displayName : inst) === instrucaoName
    );
    
    if (instrucao && typeof instrucao === 'object') {
      const fullPath = instrucao.fullPath;
      console.log('Fazendo download de:', fullPath);
      
      // URL para download
      const downloadUrl = `http://192.168.1.219:8080/files/download/${encodeURIComponent(fullPath)}`;
      
      // Cria um link temporário para download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = instrucaoName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Função para apagar instrução da base de dados
  const handleDelete = async (instrucaoName) => {
    // Busca a instrução na lista disponível para obter o caminho completo
    const instrucao = instrucoesDisponiveis.find(
      inst => (typeof inst === 'object' ? inst.displayName : inst) === instrucaoName
    );
    
    if (instrucao && typeof instrucao === 'object') {
      const fullPath = instrucao.fullPath;
      
      // Confirma a ação
      const confirmDelete = window.confirm(`Tem certeza que deseja apagar permanentemente o arquivo "${instrucaoName}"?\nEsta ação não pode ser desfeita.`);
      
      if (!confirmDelete) {
        return;
      }
      
      try {
        console.log('Apagando arquivo:', fullPath);
        
        const response = await fetch(`http://192.168.1.219:8080/files/delete/${encodeURIComponent(fullPath)}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          console.log('Arquivo apagado com sucesso');
          
          // Remove da lista de selecionados se estiver selecionado
          if (instrucoesSelecionadas.includes(instrucaoName)) {
            removeInstrucao(instrucaoName);
          }
          
          // Recarrega a lista de instruções
          await fetchInstrucoes();
          
          alert('Arquivo apagado com sucesso!');
        } else {
          console.error('Erro ao apagar arquivo:', response.statusText);
          alert('Erro ao apagar arquivo. Tente novamente.');
        }
      } catch (error) {
        console.error('Erro ao apagar arquivo:', error);
        alert('Erro ao apagar arquivo. Tente novamente.');
      }
    }
  };

  return (
    <div className="instrucoes-trabalho-container" style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Input hidden para permitir extração do valor em PDFs */}
      <input 
        type="hidden" 
        value={currentValue || ''} 
        data-component="instrucoes-trabalho"
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
            ? (instrucoesSelecionadas.length > 0 ? '#f9f9f9' : '#fff')
            : '#f5f5f5',
          fontSize: '11px',
          display: 'flex',
          flexDirection: 'column',
          cursor: (isEditable && canEdit) ? 'pointer' : 'default',
          position: 'relative',
          opacity: (isEditable && canEdit) ? 1 : 0.7
        }}
        onClick={(isEditable && canEdit) ? () => setShowModal(true) : undefined}
        title={(isEditable && canEdit) ? "Clique para abrir janela de seleção de Instruções de trabalho procedimento" : ""}
        data-current-value={currentValue || ''}
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
            📂
          </span>
        </div>

        {/* Lista de instruções selecionadas */}
        {instrucoesSelecionadas.length > 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {instrucoesSelecionadas.map((instrucao, index) => {
              const isVideo = isVideoLink(instrucao);
              const displayName = isVideo ? getVideoTitle(instrucao) : instrucao;
              
              return (
                <div 
                  key={index} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 0',
                    borderBottom: index < instrucoesSelecionadas.length - 1 ? '1px solid #f0f0f0' : 'none'
                  }}
                >
                  {/* Ícone baseado no tipo */}
                  <span style={{ fontSize: '8px', minWidth: '12px' }}>
                    {isVideo ? '🎥' : '📄'}
                  </span>
                  
                  {/* Nome truncado */}
                  <span 
                    style={{ 
                      flex: 1, 
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis',
                      fontSize: '9px'
                    }}
                    title={displayName}
                  >
                    {displayName}
                  </span>
                  
                  {/* Botões de ação */}
                  {isEditable && (
                    <div style={{ display: 'flex', gap: '2px' }}>                                 
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
                        borderRadius: '2px',
                        fontSize: '15px',
                      }}
                      title="Remover Instrução"
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#ffcdd2'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      ×
                    </button>
                    </div>
                  )}
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
            Clique para abrir janela<br/>Instruções de trabalho procedimento
          </div>
        )}
      </div>

      {/* Modal */}
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
                backgroundColor: '#f8f9fa',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                    Instruções de Trabalho Procedimento
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
                    id="upload-instrucao"
                  />
                  <label
                    htmlFor="upload-instrucao"
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
                    {uploading ? 'A enviar...' : '📁 Enviar Nova Instrução'}
                  </label>
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '6px' }}>
                    Selecione qualquer tipo de ficheiro para enviar para esta subpasta
                  </div>
                </div>

                {/* Área de links de vídeo */}
                <div style={{ padding: '16px', borderBottom: '1px solid #eee', backgroundColor: '#f0f5ff' }}>
                  {!showVideoForm ? (
                    <div>
                      <button
                        onClick={() => setShowVideoForm(true)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#1976d2',
                          color: 'white',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          border: 'none',
                          fontWeight: 'bold'
                        }}
                      >
                        🎥 Adicionar Link de Vídeo
                      </button>
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '6px' }}>
                        Suporte: YouTube, Vimeo, Dailymotion, Twitch, Loom, Wistia
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: 'bold' }}>
                          URL do Vídeo:
                        </label>
                        <input
                          type="url"
                          value={videoLink}
                          onChange={(e) => setVideoLink(e.target.value)}
                          placeholder="https://www.youtube.com/watch?v=..."
                          style={{
                            width: '100%',
                            padding: '8px',
                            fontSize: '12px',
                            border: '1px solid #ccc',
                            borderRadius: '4px'
                          }}
                        />
                      </div>
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: 'bold' }}>
                          Título (opcional):
                        </label>
                        <input
                          type="text"
                          value={videoTitle}
                          onChange={(e) => setVideoTitle(e.target.value)}
                          placeholder="Título personalizado do vídeo"
                          style={{
                            width: '100%',
                            padding: '8px',
                            fontSize: '12px',
                            border: '1px solid #ccc',
                            borderRadius: '4px'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={handleAddVideoLink}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#28a745',
                            color: 'white',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
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
                            padding: '8px 16px',
                            backgroundColor: '#6c757d',
                            color: 'white',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            border: 'none'
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Lista de instruções */}
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
                      🔄 A carregar instruções...
                    </div>
                  )}
                  
                  {!loading && instrucoesDisponiveis.length === 0 && (
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
                      <p>📭 Nenhuma instrução encontrada na subpasta:</p>
                      <code style={{ fontSize: '12px', backgroundColor: '#f5f5f5', padding: '4px 8px', borderRadius: '4px' }}>
                        {currentFolderPath || 'Caminho não determinado'}
                      </code>
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
                            onClick={() => toggleInstrucao(instrucaoName)}
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
                              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>📄 {instrucaoName}</div>
                              {instrucaoFolder && instrucaoFolder !== '(raiz)' && (
                                <div style={{ fontSize: '11px', color: '#666', fontStyle: 'italic', marginTop: '2px' }}>
                                  📁 Pasta: {instrucaoFolder}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(instrucaoName);
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
                              title="Descarregar instrução"
                              onMouseEnter={(e) => e.target.style.backgroundColor = '#2e7d32'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = '#388e3c'}
                            >
                              ⬇️ Baixar
                            </button>
                            {isEditable && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(instrucaoName);
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
                                title="Apagar instrução permanentemente"
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
                    {instrucoesSelecionadas.length} instrução(ões) selecionada(s)
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
    </div>
  );
};

export default InstrucoesTrabalho;