import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/apiFetch';

const InstrucoesTrabalho = ({ 
  currentValue, 
  onChange,
  originalFilename,
  isEditable = true, 
  canEdit = true 
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
      showNotification('Por favor, insira um link de vídeo válido.', 'warning');
      return;
    }

    if (!isValidVideoUrl(videoLink)) {
      showNotification('URL de vídeo não suportada. Suporte: YouTube, Vimeo, Dailymotion, Twitch, Loom, Wistia ou arquivos de vídeo diretos.', 'error');
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
    const urlMatch = videoEntry.match(/\|\|(.+)$/);
    if (urlMatch) {
      const url = urlMatch[1];
      window.open(url, '_blank');
    }
  };

  // Função para visualizar instrução em nova tab
  const handleViewInstrucao = async (instrucao) => {
    // Verifica se é um link de vídeo
    if (isVideoLink(instrucao)) {
      const url = getVideoUrl(instrucao);
      if (url) {
        window.open(url, '_blank');
      }
      return;
    }

    // Para ficheiros normais, busca o caminho e abre preview
    const instrucaoObject = typeof instrucao === 'object' ? instrucao : instrucoesDisponiveis.find(i => i.displayName === instrucao);
    const fullPath = typeof instrucao === 'object' ? instrucao.fullPath : instrucaoObject?.fullPath;

    if (!fullPath) {
      console.error('Caminho não encontrado para:', instrucao);
      showNotification('Erro: Caminho da instrução não encontrado.', 'error');
      return;
    }
    
    try {
      const response = await apiFetch('/files/download', {
        method: 'POST',
        body: JSON.stringify({ path: encodeURIComponent(fullPath) }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        // Abre em nova tab
        window.open(url, '_blank');
        
        // Limpa o URL após um tempo
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } else {
        const errorText = await response.text();
        showNotification(`Erro ao visualizar a instrução: ${errorText}`, 'error');
      }
    } catch (error) {
      console.error('🚨 Erro na visualização:', error);
      showNotification('Erro ao visualizar a instrução.', 'error');
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

  // Valor processado para o PDF (apenas títulos; remove URLs de vídeos)
  const hiddenValueForPdf = (instrucoesSelecionadas && instrucoesSelecionadas.length > 0)
    ? instrucoesSelecionadas
        .map((it) => (isVideoLink(it) ? getVideoTitle(it) : it))
        .join('\n')
    : '';

  // Busca Instruções de trabalho procedimento da subpasta específica baseada no prefixo do ficheiro atual
  const fetchInstrucoes = async () => {
    if (!originalFilename) return;

    
    // Extrai a pasta principal do originalFilename
    const parts = originalFilename.split('/');
    if (parts.length < 2) {
      return;
    }
    
    // A pasta principal é sempre a primeira parte do caminho
    const mainFolder = parts[0];
    const currentFileName = parts[parts.length - 1]; // Nome do ficheiro atual
    
    // Extrai o prefixo do nome do ficheiro (parte antes do primeiro espaço)
    const filePrefix = currentFileName.split(' ')[0];

    setLoading(true);
    try {
      // Busca todos os ficheiros na pasta principal e suas subpastas
      const response = await apiFetch('/files/list-files-tree');
      
      if (!response.ok) {
        throw new Error('Erro ao buscar árvore de ficheiros');
      }
      
      const fileTree = await response.json();
      
      // Encontra a pasta principal na árvore
      const mainFolderNode = fileTree.find(node => 
        node.type === 'folder' && node.name === mainFolder
      );
      
      if (!mainFolderNode || !mainFolderNode.children) {
        setInstrucoesDisponiveis([]);
        setCurrentFolderPath(mainFolder);
        return;
      }
      
      let targetSubfolder = mainFolderNode.children.find(node => 
        node.type === 'folder' && 
        (node.name.toLowerCase().includes('instruções de trabalho procedimento') ||
         node.name.toLowerCase().includes('instrucoes de trabalho procedimento')) &&
        node.name.endsWith(filePrefix)
      );
      
      if (!targetSubfolder || !targetSubfolder.children) {
        
        // Tenta uma busca alternativa mais flexível
        const alternativeSubfolder = mainFolderNode.children.find(node => 
          node.type === 'folder' && 
          (node.name.toLowerCase().includes('instruções de trabalho') || 
           node.name.toLowerCase().includes('instrucoes de trabalho')) &&
          node.name.includes(filePrefix)
        );
        
        if (alternativeSubfolder && alternativeSubfolder.children) {
          targetSubfolder = alternativeSubfolder; // Usar a pasta alternativa
        } else {
          setInstrucoesDisponiveis([]);
          setCurrentFolderPath(`${mainFolder}/Instruções de trabalho procedimento ${filePrefix}`);
          return;
        }
      }
      
      
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

    // Verifica se o arquivo é PDF
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showNotification('Apenas arquivos PDF são permitidos nas Instruções de Trabalho.', 'warning');
      event.target.value = ''; // Limpa o input
      return;
    }

    if (!originalFilename) {
      showNotification('Não foi possível determinar a pasta de destino.', 'error');
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
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folderPath', folderPath + '/');

      const response = await apiFetch('/files/upload-document', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        // Recarrega a lista de instruções
        await fetchInstrucoes();
        
        // Adiciona automaticamente a instrução aos selecionados
        toggleInstrucao(file.name);
        
        showNotification('Instrução de trabalho enviada com sucesso!', 'success');
      } else {
        console.error('Erro no upload:', response.statusText);
        showNotification('Erro ao enviar instrução de trabalho. Tente novamente.', 'error');
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      showNotification('Erro ao enviar instrução de trabalho. Tente novamente.', 'error');
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
  const handleDownload = async (instrucaoName) => {
    // Busca a instrução na lista disponível para obter o caminho completo
    const instrucao = instrucoesDisponiveis.find(
      inst => (typeof inst === 'object' ? inst.displayName : inst) === instrucaoName
    );

    if (instrucao && typeof instrucao === 'object') {
      const fullPath = instrucao.fullPath;

      try {
        // Pedido autenticado (o endpoint exige sessão válida, por isso já não
        // pode ser um <a href> simples  -  precisa de ir via apiFetch)
        const response = await apiFetch(`/files/download/${encodeURIComponent(fullPath)}`);
        if (!response.ok) {
          showNotification('Erro ao descarregar a instrução.', 'error');
          return;
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = instrucaoName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('🚨 Erro no download:', error);
        showNotification('Erro ao descarregar a instrução.', 'error');
      }
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
      
      // Confirma a ação com modal personalizado
      showConfirmDialog(
        `Tem a certeza que deseja apagar permanentemente o arquivo "${instrucaoName}"?\n\nEsta ação não pode ser desfeita.`,
        async () => {
          try {
            
            const response = await apiFetch(`/files/delete/${encodeURIComponent(fullPath)}`, {
              method: 'DELETE'
            });
            
            if (response.ok) {
              
              // Remove da lista de selecionados se estiver selecionado
              if (instrucoesSelecionadas.includes(instrucaoName)) {
                removeInstrucao(instrucaoName);
              }
              
              // Recarrega a lista de instruções
              await fetchInstrucoes();
              
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

  return (
    <div className="instrucoes-trabalho-container" style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Input hidden para permitir extração do valor em PDFs */}
      <input 
        type="hidden" 
        value={hiddenValueForPdf} 
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
                  
                  {/* Nome truncado - clicável quando não está em edição */}
                  <span 
                    onClick={!isEditable ? (e) => {
                      e.stopPropagation();
                      handleViewInstrucao(instrucao);
                    } : undefined}
                    style={{ 
                      flex: 1, 
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis',
                      fontSize: '9px',
                      cursor: !isEditable ? 'pointer' : 'default',
                      color: !isEditable ? '#0066cc' : 'inherit',
                      textDecoration: !isEditable ? 'underline' : 'none'
                    }}
                    title={!isEditable ? `Clique para abrir: ${displayName}` : displayName}
                    onMouseEnter={(e) => {
                      if (!isEditable) {
                        e.target.style.color = '#0052a3';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isEditable) {
                        e.target.style.color = '#0066cc';
                      }
                    }}
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
                    accept=".pdf,application/pdf"
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

export default InstrucoesTrabalho;
