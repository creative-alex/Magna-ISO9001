import React, { useState, useEffect, useRef } from 'react';
import { useTutorial, TUTORIAL_TYPES } from '../../context/tutorialContext';
import { FaRobot, FaXmark } from 'react-icons/fa6';
import { apiFetch } from '../../utils/apiFetch';

const AIAssistant = ({ 
  fileTree, 
  searchTerm, 
  username, 
  isAdmin, 
  isSuperAdmin = false,
  processOwners = {},
  onSuggestion 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [bubbleResponse, setBubbleResponse] = useState('');
  const [highlightedElements, setHighlightedElements] = useState([]);
  const [currentPage, setCurrentPage] = useState('unknown');

  // Hook do tutorial persistente
  const tutorial = useTutorial();

  // Detectar página atual
  useEffect(() => {
    const detectCurrentPage = () => {
      const path = window.location.pathname;
      
      if (path === '/file' || path === '/home' || path === '/') {
        setCurrentPage('selectPdf');
      } else if (path.startsWith('/file/') || path.startsWith('/table/')) {
        // Rotas /file/:filename ou /table/:filename são páginas de template
        setCurrentPage('template');
      } else if (path === '/novo-procedimento' || path === '/newtable') {
        setCurrentPage('createProcedure');
      } else if (path === '/novo-processo') {
        setCurrentPage('createProcess');
      } else if (path === '/create-user') {
        setCurrentPage('createUser');
      } else if (path === '/reset-password') {
        setCurrentPage('firstLogin');
      } else {
        setCurrentPage('unknown');
      }      
    };

    detectCurrentPage();
    
    // Detectar mudanças de navegação
    const handleNavigation = () => {
      setTimeout(detectCurrentPage, 300);
    };
    
    window.addEventListener('popstate', handleNavigation);
    
    const originalPushState = window.history.pushState;
    window.history.pushState = function(...args) {
      originalPushState.apply(window.history, args);
      handleNavigation();
    };
    
    return () => {
      window.removeEventListener('popstate', handleNavigation);
      window.history.pushState = originalPushState;
    };
  }, [currentPage]);

  // Funções para realce de elementos
  const highlightElement = (selector, scrollIntoView = true) => {
    // Remover destaques anteriores
    removeAllHighlights();
    
    const element = document.querySelector(selector);
    if (element) {
      // Adicionar classe de destaque
      element.classList.add('tutorial-highlight');
      setHighlightedElements([element]);
      
      // Scroll automático se necessário
      if (scrollIntoView) {
        setTimeout(() => {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
        }, 300);
      }
      
      console.log('✨ Elemento destacado:', selector);
      return element;
    } else {
      console.warn('⚠️ Elemento não encontrado para destacar:', selector);
      return null;
    }
  };

  const highlightMultipleElements = (selectors, scrollToFirst = true) => {
    removeAllHighlights();
    
    const elements = [];
    selectors.forEach(selector => {
      const foundElements = document.querySelectorAll(selector);
      foundElements.forEach(element => {
        element.classList.add('tutorial-highlight');
        elements.push(element);
      });
    });
    
    setHighlightedElements(elements);
    
    // Scroll para o primeiro elemento se necessário
    if (scrollToFirst && elements.length > 0) {
      setTimeout(() => {
        elements[0].scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }, 300);
    }
    
    console.log('✨ Elementos destacados:', selectors, 'Total:', elements.length);
    return elements;
  };

  const removeAllHighlights = () => {
    // Remover destaques de elementos anteriores
    highlightedElements.forEach(element => {
      if (element && element.classList) {
        element.classList.remove('tutorial-highlight');
      }
    });
    
    // Também remover de qualquer elemento que possa ter ficado
    const allHighlighted = document.querySelectorAll('.tutorial-highlight');
    allHighlighted.forEach(element => {
      element.classList.remove('tutorial-highlight');
    });
    
    setHighlightedElements([]);
  };

  const scrollToElement = (selector) => {
    const element = document.querySelector(selector);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
      return element;
    }
    return null;
  };

  // Sistema automático de detectores baseado no passo atual
  useEffect(() => {
    if (!tutorial.isActive) {
      // Remover destaques se tutorial não estiver ativo
      removeAllHighlights();
      return;
    }
    
    console.log('🎯 Configurando detectores para:', tutorial.tutorialState);

    const setupCurrentStepDetector = () => {
      switch (tutorial.tutorialState) {
        case tutorial.TUTORIAL_STATES.STARTING:
          // No passo inicial, não destacar nada ainda
          removeAllHighlights();
          break;
          
        case tutorial.TUTORIAL_STATES.SELECT_PROCESS:
          // Destacar pastas de processos
          setupProcessSelector();
          break;
          
        case tutorial.TUTORIAL_STATES.SELECT_PROCEDURE:
          // Destacar procedimentos/ficheiros
          setTimeout(() => checkProcedurePageAndAdvance(), 500);
          setTimeout(() => checkProcedurePageAndAdvance(), 1500);
          setupProcedureSelector();
          break;
          
        case tutorial.TUTORIAL_STATES.NAVIGATE_TO_EDITOR:
          detectNavigationToEditor();
          break;
          
        case tutorial.TUTORIAL_STATES.CLICK_EDIT_BUTTON:
          // Destacar botão de editar
          setupEditButtonDetector();
          break;
          
        case tutorial.TUTORIAL_STATES.SELECT_TABLE_ROW:
          // Destacar linhas da tabela
          setupTableRowDetector();
          break;
          
        case tutorial.TUTORIAL_STATES.CLICK_DOCUMENTS:
          // Destacar células de documentos
          setupDocumentsDetector();
          break;
          
        case tutorial.TUTORIAL_STATES.UPLOAD_NEW_DOCUMENT:
          // Destacar botão de upload
          setupUploadDetector();
          break;
      }
    };

    const timeout = setTimeout(setupCurrentStepDetector, 500);
    return () => clearTimeout(timeout);
  }, [tutorial.tutorialState, tutorial.isActive]);

  // Detectar mudanças de URL para reconfigurar detectores
  useEffect(() => {
    if (!tutorial.isActive) return;
    
    const handleURLChange = () => {
      console.log('🔄 URL mudou, reconfigurando detectores...', window.location.pathname);
      // Reconfigurar detectores após mudança de página com delay maior para garantir que DOM carregou
      setTimeout(() => {
        if (tutorial.tutorialState === tutorial.TUTORIAL_STATES.SELECT_PROCESS) {
          checkProcessPageAndAdvance();
        } else if (tutorial.tutorialState === tutorial.TUTORIAL_STATES.SELECT_PROCEDURE) {
          checkProcedurePageAndAdvance();
        }
      }, 1500); // Aumentar delay para 1.5s
    };

    // Também detectar quando o DOM muda significativamente
    const observer = new MutationObserver((mutations) => {
      const hasSignificantChanges = mutations.some(mutation => 
        mutation.type === 'childList' && mutation.addedNodes.length > 0
      );
      
      if (hasSignificantChanges) {
        console.log('🔄 DOM mudou, verificando contexto...');
        setTimeout(() => {
          if (tutorial.tutorialState === tutorial.TUTORIAL_STATES.SELECT_PROCEDURE) {
            checkProcedurePageAndAdvance();
          }
        }, 1000);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('popstate', handleURLChange);
    
    // Detectar navegação via History API
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    
    window.history.pushState = function(...args) {
      originalPushState.apply(window.history, args);
      handleURLChange();
    };
    
    window.history.replaceState = function(...args) {
      originalReplaceState.apply(window.history, args);
      handleURLChange();
    };

    return () => {
      observer.disconnect();
      window.removeEventListener('popstate', handleURLChange);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, [tutorial.isActive, tutorial.tutorialState]);

  // Detectores individuais para cada passo
  const checkProcessPageAndAdvance = () => {
    // Verificar se já estamos numa página que mostra procedimentos de um processo específico
    const currentPath = window.location.pathname;
    const processElements = document.querySelectorAll('.process-content, .procedure-list, .file-list, [data-process-id]');
    const hasProcessTitle = document.querySelector('h1, h2, h3, .page-title')?.textContent?.includes('PROCESSO');
    
    console.log('🔍 Verificando página atual:', { currentPath, processElements: processElements.length, hasProcessTitle });
    
    // Se detectar que estamos numa página de processo com lista de procedimentos
    if (processElements.length > 0 || hasProcessTitle || 
        currentPath.includes('process') || currentPath.includes('tableDisplay')) {
      
      console.log('✅ Página de processo detectada! Avançando automaticamente...');
      setTimeout(() => {
        tutorial.nextStep({ selectedProcess: 'Processo detectado automaticamente' });
      }, 1000);
      return true;
    }
    return false;
  };

  const checkProcedurePageAndAdvance = () => {
    // Verificar se já estamos numa página de procedimento específico
    const currentPath = window.location.pathname;
    const templateElements = document.querySelectorAll('.template-container, .editor-container, .procedure-content, .tabela-template, [class*="template"], table');
    const hasTemplateTitle = document.querySelector('h1, h2, h3, .page-title, .template-title')?.textContent?.includes('Template');
    const hasTable = document.querySelector('table, .table, .tabela');
    const isTemplatePage = currentPath.includes('template') || currentPath.includes('Template') || currentPath.includes('TabelaTemplate');
    
    console.log('🔍 Verificando página de procedimento:', { 
      currentPath, 
      templateElements: templateElements.length, 
      hasTemplateTitle, 
      hasTable: !!hasTable,
      isTemplatePage 
    });
    
    // Se detectar que estamos numa página de template/procedimento
    if (templateElements.length > 0 || hasTemplateTitle || hasTable || isTemplatePage) {
      
      console.log('✅ Página de procedimento detectada! Avançando automaticamente...');
      setTimeout(() => {
        tutorial.nextStep({ selectedProcedure: 'Procedimento detectado automaticamente' });
      }, 1000);
      return true;
    }
    return false;
  };

  // Detectores individuais para cada passo
  const setupProcessSelector = () => {
    // Seletores específicos para a estrutura do selectPdf.jsx
    const folders = document.querySelectorAll('.folder-header');
    
    // Destacar APENAS processos onde o utilizador é proprietário
    const ownedProcesses = [];
    folders.forEach(folder => {
      const folderNameSpan = folder.querySelector('.folder-name');
      const folderName = folderNameSpan ? folderNameSpan.textContent?.trim() : folder.textContent?.trim();
      console.log('📁 Verificando pasta:', folderName, 'Owner:', processOwners[folderName]);
      
      // Verificar se o utilizador é dono deste processo
      if (processOwners[folderName] === username || isSuperAdmin) {
        console.log('✅ Destacando pasta própria:', folderName);
        folder.classList.add('tutorial-highlight');
        ownedProcesses.push(folder);
      }
    });
    
    console.log('📁 Processos próprios encontrados:', ownedProcesses.length);
    
    if (ownedProcesses.length > 0) {
      setHighlightedElements(ownedProcesses);
      // Scroll para o primeiro processo próprio
      ownedProcesses[0].scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
    
    folders.forEach(folder => {
      const handleClick = (e) => {
        console.log('✅ Processo selecionado!');
        removeAllHighlights();
        tutorial.nextStep({ selectedProcess: folder.textContent || 'Processo' });
        folder.removeEventListener('click', handleClick);
      };
      folder.addEventListener('click', handleClick, { once: true });
    });
  };

  const setupProcedureSelector = () => {
    const procedures = document.querySelectorAll('.file-item, .table-item, [data-filename], a[href*="template"]');
    console.log('📄 Detectores de procedimento:', procedures.length);
    
    // Destacar todos os procedimentos/ficheiros
    if (procedures.length > 0) {
      const selectors = ['.file-item', '.table-item', '[data-filename]', 'a[href*="template"]'];
      highlightMultipleElements(selectors, true);
    }
    
    procedures.forEach(procedure => {
      const handleClick = (e) => {
        console.log('✅ Procedimento selecionado!');
        removeAllHighlights();
        tutorial.nextStep({ selectedProcedure: procedure.textContent || 'Procedimento' });
        procedure.removeEventListener('click', handleClick);
      };
      procedure.addEventListener('click', handleClick, { once: true });
    });
  };

  const detectNavigationToEditor = () => {
    console.log('🔄 Detectando navegação...');
    
    if (window.location.pathname.includes('template') || 
        document.querySelector('.template-container, .editor-container')) {
      setTimeout(() => {
        console.log('✅ Página de edição detectada!');
        tutorial.nextStep({ navigatedToEditor: true });
      }, 1000);
    } else {
      const checkNavigation = setInterval(() => {
        if (window.location.pathname.includes('template') || 
            document.querySelector('.template-container, .editor-container')) {
          clearInterval(checkNavigation);
          console.log('✅ Navegação detectada!');
          tutorial.nextStep({ navigatedToEditor: true });
        }
      }, 1000);
      
      setTimeout(() => clearInterval(checkNavigation), 10000);
    }
  };

  const setupEditButtonDetector = () => {
    const editButtons = document.querySelectorAll('button, .btn, [role="button"]');
    console.log('✏️ Detectores de edição:', editButtons.length);
    
    // Encontrar e destacar botões de editar
    const editButtonsFiltered = Array.from(editButtons).filter(button => {
      const text = button.textContent?.toLowerCase() || '';
      return text.includes('editar') || text.includes('edit') || button.type === 'submit';
    });
    
    if (editButtonsFiltered.length > 0) {
      // Destacar apenas botões de edição relevantes
      editButtonsFiltered.forEach(button => {
        button.classList.add('tutorial-highlight');
      });
      setHighlightedElements(editButtonsFiltered);
      
      // Scroll para o primeiro botão
      editButtonsFiltered[0].scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
    
    editButtons.forEach(button => {
      const text = button.textContent?.toLowerCase() || '';
      if (text.includes('editar') || text.includes('edit') || button.type === 'submit') {
        const handleClick = (e) => {
          console.log('✅ Edição ativada!');
          removeAllHighlights();
          tutorial.nextStep({ editActivated: true });
          button.removeEventListener('click', handleClick);
        };
        button.addEventListener('click', handleClick, { once: true });
      }
    });
  };

  const setupTableRowDetector = () => {
    const rows = document.querySelectorAll('tr, .table-row, td');
    console.log('📋 Detectores de linha:', rows.length);
    
    // NÃO destacar tabelas - apenas detectar cliques
    rows.forEach(row => {
      const handleClick = (e) => {
        if (row.tagName === 'TH' || row.closest('thead')) return;
        console.log('✅ Linha selecionada!');
        removeAllHighlights();
        tutorial.nextStep({ rowSelected: true });
        row.removeEventListener('click', handleClick);
      };
      row.addEventListener('click', handleClick, { once: true });
    });
  };

  const setupDocumentsDetector = () => {
    const docElements = document.querySelectorAll('td, .cell, .documentos-associados, [data-documentos]');
    console.log('📎 Detectores de documentos:', docElements.length);
    
    // Encontrar e destacar células de documentos
    const docCells = Array.from(docElements).filter(element => {
      const text = element.textContent?.toLowerCase() || '';
      const className = element.className?.toLowerCase() || '';
      return text.includes('documento') || text.includes('anexo') || className.includes('document');
    });
    
    if (docCells.length > 0) {
      docCells.forEach(cell => {
        cell.classList.add('tutorial-highlight');
      });
      setHighlightedElements(docCells);
      
      // Scroll para a primeira célula de documentos
      docCells[0].scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
    
    docElements.forEach(element => {
      const text = element.textContent?.toLowerCase() || '';
      const className = element.className?.toLowerCase() || '';
      
      if (text.includes('documento') || text.includes('anexo') || 
          className.includes('document')) {
        const handleClick = (e) => {
          console.log('✅ Documentos clicados!');
          removeAllHighlights();
          tutorial.nextStep({ documentsClicked: true });
          element.removeEventListener('click', handleClick);
        };
        element.addEventListener('click', handleClick, { once: true });
      }
    });
  };

  const setupUploadDetector = () => {
    const uploadElements = document.querySelectorAll('button, .btn, input[type="file"], [class*="upload"]');
    console.log('📤 Detectores de upload:', uploadElements.length);
    
    // Encontrar e destacar botões/elementos de upload
    const uploadButtonsFiltered = Array.from(uploadElements).filter(element => {
      const text = element.textContent?.toLowerCase() || '';
      return text.includes('enviar') || text.includes('upload') || 
             text.includes('novo documento') || element.type === 'file';
    });
    
    if (uploadButtonsFiltered.length > 0) {
      uploadButtonsFiltered.forEach(element => {
        element.classList.add('tutorial-highlight');
      });
      setHighlightedElements(uploadButtonsFiltered);
      
      // Scroll para o primeiro elemento de upload
      uploadButtonsFiltered[0].scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
    
    uploadElements.forEach(element => {
      const text = element.textContent?.toLowerCase() || '';
      if (text.includes('enviar') || text.includes('upload') || 
          text.includes('novo documento') || element.type === 'file') {
        const handleClick = (e) => {
          console.log('✅ Upload iniciado! Tutorial completo! 🎉');
          removeAllHighlights();
          tutorial.completeTutorial();
          element.removeEventListener('click', handleClick);
        };
        element.addEventListener('click', handleClick, { once: true });
      }
    });
  };

  // Função para obter mensagem do tutorial atual
  const getCurrentTutorialMessage = () => {
    if (!tutorial.isActive) return null;
    
    const stepData = tutorial.getCurrentStepMessage();
    if (!stepData) return 'Tutorial em progresso...';
    
    return (
      <div>
        <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>
          {stepData.title}
        </div>
        <div style={{ fontSize: '13px', lineHeight: '1.4', whiteSpace: 'pre-line' }}>
          {stepData.message}
        </div>
        <div style={{ 
          marginTop: '10px', 
          padding: '6px 10px', 
          backgroundColor: '#f3f4f6', 
          borderRadius: '6px',
          fontSize: '12px',
          fontStyle: 'italic',
          color: '#6b7280'
        }}>
          {stepData.action}
        </div>
        {/* Botão "Começar" apenas no passo inicial */}
        {stepData.showStartButton && (() => {
          // Verificar se o user tem processos atribuídos antes de mostrar o botão
          // SuperAdmin tem acesso a todos os processos
          const userOwnsProcess = isSuperAdmin || (processOwners && Object.values(processOwners).includes(username));
          
          if (!userOwnsProcess) {
            return (
              <div style={{
                marginTop: '12px',
                padding: '10px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#991b1b'
              }}>
                🔒 Não pode iniciar o tutorial porque não é proprietário de nenhum processo. Contacte um Super Admin.
              </div>
            );
          }
          
          return (
            <button
              onClick={() => {
                console.log('🚀 Utilizador clicou em "Começar"');
                tutorial.nextStep();
              }}
              style={{
                marginTop: '12px',
                padding: '8px 16px',
                backgroundColor: '#22c55e',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
                width: '100%'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#16a34a'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#22c55e'}
            >
              🚀 Começar Tutorial
            </button>
          );
        })()}
      </div>
    );
  };

  const buildPageContext = () => {
    const ctx = {};

    if (searchTerm) ctx.searchTerm = searchTerm;

    if (currentPage === 'selectPdf' && fileTree && fileTree.length > 0) {
      ctx.documentTree = fileTree.map(node => {
        if (node.type === 'folder') {
          return {
            process: node.name,
            procedures: (node.children || []).map(c => c.name),
          };
        }
        return { file: node.name };
      });
    }

    if (currentPage === 'template') {
      const parts = window.location.pathname.split('/');
      const filename = parts[parts.length - 1];
      if (filename) ctx.openFile = decodeURIComponent(filename);
    }

    const ownedProcesses = Object.entries(processOwners)
      .filter(([, owners]) => owners && String(owners).split(',').map(o => o.trim()).includes(username))
      .map(([proc]) => proc);
    if (ownedProcesses.length > 0) ctx.userProcesses = ownedProcesses;

    return ctx;
  };

  const handleBubbleQuestion = async () => {
    if (!userInput.trim()) return;

    const question = userInput.toLowerCase().trim();
    const inputText = userInput.trim();
    const userOwnsProcess = isSuperAdmin || (processOwners && Object.values(processOwners).includes(username));

    setUserInput('');
    setIsTyping(true);

    // Tutorial trigger — único caso com efeito de UI local
    const isTutorialRequest =
      question.includes('tutorial') ||
      (question.includes('como') && question.includes('anexo')) ||
      (question.includes('anexar') && !question.includes('?'));

    if (isTutorialRequest) {
      if (!userOwnsProcess) {
        setBubbleResponse('🔒 Não pode iniciar o tutorial porque não é proprietário de nenhum processo. Contacte um Super Admin.');
        setIsTyping(false);
        return;
      }
      if (currentPage === 'template' || document.querySelector('table.main-table, .tabela-template')) {
        setBubbleResponse('🎯 A iniciar tutorial de anexos! Siga os passos indicados.');
        setIsTyping(false);
        setTimeout(() => tutorial.startTutorial(), 1500);
        return;
      }
    }

    try {
      const res = await apiFetch(`/api/assistant`, {
        method: 'POST',
        body: JSON.stringify({ question: inputText, username, currentPage, pageContext: buildPageContext() }),
      });
      const data = await res.json();
      setBubbleResponse(data.answer || 'Não foi possível obter resposta.');
    } catch {
      setBubbleResponse('Erro ao contactar o assistente. Tente novamente.');
    } finally {
      setIsTyping(false);
    }
  };

  // Lidar com Enter no input do balão
  const handleBubbleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleBubbleQuestion();
    }
  };

  // Limpar highlights quando componente desmontar
  useEffect(() => {
    return () => {
      removeAllHighlights();
    };
  }, []);

  const toggleWidget = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="fixed bottom-5 right-5 z-[1000] transition-all duration-300">
      {/* Botão flutuante */}
      <button
        className="w-[60px] h-[60px] rounded-full border-2 border-[#a67725] bg-[#C8932F] text-white text-2xl cursor-pointer shadow-[0_4px_20px_rgba(200,147,47,0.3)] transition-all duration-300 flex items-center justify-center hover:-translate-y-0.5 hover:shadow-[0_6px_25px_rgba(200,147,47,0.5)] hover:bg-gradient-to-br hover:from-[#b8832a] hover:to-[#a67725]"
        onClick={toggleWidget}
        title="Assistente de navegação"
      >
        <FaRobot />
      </button>

      {/* Balão de fala do tutorial */}
      {tutorial.isActive && (
        <div className="absolute bottom-[75px] right-0 min-w-[20vw] max-w-[400px] bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.1)] animate-bubbleAppear text-[14px] leading-[1.4] text-blue-900 relative ai-bubble-arrow">
          <button
            className="absolute top-2 right-2 bg-transparent border-0 text-base cursor-pointer text-gray-400 p-0 leading-[1] hover:text-gray-600"
            onClick={() => {
              tutorial.stopTutorial();
              removeAllHighlights();
            }}
            title="Fechar tutorial"
          >
            <FaXmark />
          </button>
          {getCurrentTutorialMessage()}
        </div>
      )}

      {/* Balão de fala simples para mensagens normais */}
      {isOpen && !tutorial.isActive && (
        <div className="absolute bottom-[75px] right-0 min-w-[20vw] max-w-[400px] bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.1)] animate-bubbleAppear text-[14px] leading-[1.4] text-gray-700 relative ai-bubble-arrow">
          <button
            className="absolute top-2 right-2 bg-transparent border-0 text-base cursor-pointer text-gray-400 p-0 leading-[1] hover:text-gray-600"
            onClick={() => setIsOpen(false)}
            title="Fechar"
          >
            <FaXmark />
          </button>
          <div>
            <strong>🤖 Assistente ISO 9001</strong>
            <br />
            {bubbleResponse ? (
              <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f0fdf4', borderRadius: '8px', fontSize: '13px', whiteSpace: 'pre-line' }}>
                {bubbleResponse}
              </div>
            ) : (
              <div style={{ marginTop: '8px', fontSize: '13px', color: '#666' }}>
                {isTyping ? '⌨️ A processar...' : 'Como posso ajudar?'}
              </div>
            )}
            
            <div style={{ marginTop: '10px' }}>
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={handleBubbleKeyPress}
                placeholder="Digite sua pergunta..."
                style={{
                  width: '100%',
                  padding: '6px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
                disabled={isTyping}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;
