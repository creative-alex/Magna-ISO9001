import React, { useState, useEffect, useRef } from 'react';
import { useTutorial, TUTORIAL_TYPES } from '../../context/tutorialContext';
import './AIAssistant.css';

const AIAssistant = ({ 
  fileTree, 
  searchTerm, 
  username, 
  isAdmin, 
  isSuperAdmin = false, // Adicionar isSuperAdmin às props
  processOwners = {}, // Adicionar processOwners às props
  onSuggestion 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [highlightedElements, setHighlightedElements] = useState([]);
  const [isInTutorial, setIsInTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [bubbleResponse, setBubbleResponse] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Hook do tutorial persistente
  const tutorial = useTutorial();

  // Auto scroll nas mensagens
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Monitorar estado do tutorial e reagir às mudanças
  useEffect(() => {
    if (tutorial.isActive && tutorial.getCurrentStepMessage()) {
      const stepMessage = tutorial.getCurrentStepMessage();
      
      // Abrir assistente automaticamente se tutorial estiver ativo
      if (!isOpen) {
        setIsOpen(true);
      }
      
      // Mostrar mensagem do passo atual
      handleSuggestion(
        `${stepMessage.title}\n\n${stepMessage.message}`, 
        true
      );
      
      // Executar ação do passo depois de um delay
      setTimeout(() => {
        executeStepAction(tutorial.tutorialState);
      }, 1500);
    }
  }, [tutorial.tutorialState, tutorial.isActive]);

  // Sistema de detectores de ações do usuário
  useEffect(() => {
    if (!tutorial.isActive) return;
    
    console.log('🎯 Configurando detectores para:', tutorial.tutorialState);

    const setupCurrentStepDetector = () => {
      switch (tutorial.tutorialState) {
        case tutorial.TUTORIAL_STATES.STARTING:
          // No passo inicial, apenas aguarda
          setTimeout(() => {
            console.log('▶️ Iniciando primeiro passo');
            tutorial.nextStep();
          }, 2000);
          break;
          
        case tutorial.TUTORIAL_STATES.SELECT_PROCESS:
          setupProcessSelector();
          break;
          
        case tutorial.TUTORIAL_STATES.SELECT_PROCEDURE:
          setupProcedureSelector();
          break;
          
        case tutorial.TUTORIAL_STATES.NAVIGATE_TO_EDITOR:
          detectNavigationToEditor();
          break;
          
        case tutorial.TUTORIAL_STATES.CLICK_EDIT_BUTTON:
          setupEditButtonDetector();
          break;
          
        case tutorial.TUTORIAL_STATES.SELECT_TABLE_ROW:
          setupTableRowDetector();
          break;
          
        case tutorial.TUTORIAL_STATES.CLICK_DOCUMENTS:
          setupDocumentsDetector();
          break;
          
        case tutorial.TUTORIAL_STATES.UPLOAD_NEW_DOCUMENT:
          setupUploadDetector();
          break;
      }
    };

    // Configurar detectores com um pequeno delay
    const timeout = setTimeout(setupCurrentStepDetector, 500);
    
    return () => clearTimeout(timeout);
  }, [tutorial.tutorialState, tutorial.isActive]);

  // Detector para seleção de processo
  const setupProcessSelector = () => {
    const folders = document.querySelectorAll('.folder-header, .process-folder, [data-process], .folder-item, [class*="folder"]');
    console.log('📁 Configurando detector de processo. Encontrados:', folders.length, 'elementos');
    
    folders.forEach(folder => {
      const handleClick = (e) => {
        console.log('✅ Processo selecionado! Avançando para próximo passo...');
        tutorial.nextStep({ selectedProcess: folder.textContent || 'Processo selecionado' });
        folder.removeEventListener('click', handleClick);
      };
      folder.addEventListener('click', handleClick, { once: true });
    });
  };

  // Detector para seleção de procedimento  
  const setupProcedureSelector = () => {
    const procedures = document.querySelectorAll('.file-item, .table-item, [data-filename], a[href*="template"], [class*="file"]');
    console.log('📄 Configurando detector de procedimento. Encontrados:', procedures.length, 'elementos');
    
    procedures.forEach(procedure => {
      const handleClick = (e) => {
        console.log('✅ Procedimento selecionado! Navegando para página de edição...');
        tutorial.nextStep({ selectedProcedure: procedure.textContent || 'Procedimento selecionado' });
        procedure.removeEventListener('click', handleClick);
      };
      procedure.addEventListener('click', handleClick, { once: true });
    });
  };

  // Detectar navegação para página de edição
  const detectNavigationToEditor = () => {
    console.log('🔄 Detectando navegação para página de edição...');
    
    // Verificar se já estamos na página de procedimento/template
    if (window.location.pathname.includes('template') || 
        window.location.pathname.includes('editor') ||
        document.querySelector('.editor-container, [data-editor], .template-container')) {
      
      setTimeout(() => {
        console.log('✅ Página de edição detectada! Avançando...');
        tutorial.nextStep({ navigatedToEditor: true });
      }, 1000);
    } else {
      // Se não estiver ainda, aguardar mudança de URL
      const checkNavigation = setInterval(() => {
        if (window.location.pathname.includes('template') || 
            window.location.pathname.includes('editor') ||
            document.querySelector('.editor-container, [data-editor], .template-container')) {
          
          clearInterval(checkNavigation);
          console.log('✅ Navegação detectada! Avançando...');
          tutorial.nextStep({ navigatedToEditor: true });
        }
      }, 1000);
      
      // Timeout de 10 segundos
      setTimeout(() => clearInterval(checkNavigation), 10000);
    }
  };

  // Detector para botão de edição
  const setupEditButtonDetector = () => {
    const editButtons = document.querySelectorAll('button, .btn, [role="button"], input[type="button"]');
    console.log('✏️ Configurando detector de edição. Encontrados:', editButtons.length, 'botões');
    
    editButtons.forEach(button => {
      const text = button.textContent?.toLowerCase() || '';
      const type = button.type?.toLowerCase() || '';
      
      if (text.includes('editar') || text.includes('edit') || 
          button.dataset.action === 'edit' || type === 'submit') {
        
        const handleClick = (e) => {
          console.log('✅ Modo de edição ativado! Avançando...');
          tutorial.nextStep({ editActivated: true });
          button.removeEventListener('click', handleClick);
        };
        button.addEventListener('click', handleClick, { once: true });
      }
    });
  };

  // Detector para seleção de linha da tabela
  const setupTableRowDetector = () => {
    const rows = document.querySelectorAll('tr, .table-row, .row-item, td');
    console.log('📋 Configurando detector de linha. Encontradas:', rows.length, 'linhas');
    
    rows.forEach(row => {
      const handleClick = (e) => {
        // Evitar cliques em cabeçalho
        if (row.tagName === 'TH' || row.closest('thead')) return;
        
        console.log('✅ Linha da tabela selecionada! Avançando...');
        tutorial.nextStep({ rowSelected: true });
        row.removeEventListener('click', handleClick);
      };
      row.addEventListener('click', handleClick, { once: true });
    });
  };

  // Detector para célula de documentos
  const setupDocumentsDetector = () => {
    const docElements = document.querySelectorAll('td, .cell, .documentos-associados, [data-documentos], [class*="document"]');
    console.log('📎 Configurando detector de documentos. Encontrados:', docElements.length, 'elementos');
    
    docElements.forEach(element => {
      const text = element.textContent?.toLowerCase() || '';
      const className = element.className?.toLowerCase() || '';
      
      if (text.includes('documento') || text.includes('anexo') || 
          className.includes('document') || className.includes('anexo') ||
          element.dataset.documentos) {
        
        const handleClick = (e) => {
          console.log('✅ Célula de documentos clicada! Avançando...');
          tutorial.nextStep({ documentsClicked: true });
          element.removeEventListener('click', handleClick);
        };
        element.addEventListener('click', handleClick, { once: true });
      }
    });
  };

  // Detector para upload de documento
  const setupUploadDetector = () => {
    const uploadElements = document.querySelectorAll('button, .btn, input[type="file"], [role="button"], [class*="upload"]');
    console.log('📤 Configurando detector de upload. Encontrados:', uploadElements.length, 'elementos');
    
    uploadElements.forEach(element => {
      const text = element.textContent?.toLowerCase() || '';
      const className = element.className?.toLowerCase() || '';
      
      if (text.includes('enviar') || text.includes('upload') || 
          text.includes('novo documento') || text.includes('adicionar') ||
          element.type === 'file' || className.includes('upload')) {
        
        const handleClick = (e) => {
          console.log('✅ Upload iniciado! Tutorial completo! 🎉');
          tutorial.completeTutorial();
          element.removeEventListener('click', handleClick);
        };
        element.addEventListener('click', handleClick, { once: true });
      }
    });
  };

    // Configurar detectores com um pequeno delay
    const timeout = setTimeout(setupCurrentStepDetector, 500);
    
    return () => clearTimeout(timeout);
  }, [tutorial.tutorialState, tutorial.isActive]);

  // Executar ações específicas para cada passo do tutorial
  const executeStepAction = (tutorialState) => {
    switch (tutorialState) {
      case tutorial.TUTORIAL_STATES.SELECT_PROCESS:
        // Destacar pastas de processos
        const processFolders = document.querySelectorAll('.folder-header, .process-folder, [data-process]');
        if (processFolders.length > 0) {
          processFolders.forEach((folder, index) => {
            setTimeout(() => {
              highlightElement(folder, 3000, true);
            }, index * 500);
          });
        }
        break;
        
      case tutorial.TUTORIAL_STATES.SELECT_PROCEDURE:
        // Destacar arquivos de procedimentos
        const procedureFiles = document.querySelectorAll('.file-item, .table-item, [data-filename]');
        if (procedureFiles.length > 0) {
          procedureFiles.forEach((file, index) => {
            setTimeout(() => {
              highlightElement(file, 2000, true);
            }, index * 300);
          });
        }
        break;
        
      case tutorial.TUTORIAL_STATES.OPEN_EDITOR:
        // Destacar botão de editar
        const editButton = document.querySelector('[data-action="edit"], .edit-btn, button:contains("Editar")');
        if (editButton) {
          highlightElement(editButton, 4000, true);
        }
        break;
        
      case tutorial.TUTORIAL_STATES.FIND_ATTACHMENTS:
        // Encontrar e destacar secção de anexos
        const attachmentSection = document.querySelector('[data-section="documentos-associados"], .documentos-associados, .file-attachment-manager');
        if (attachmentSection) {
          attachmentSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
          highlightElement(attachmentSection, 5000, true);
        }
        break;
        
      case tutorial.TUTORIAL_STATES.SELECT_DOCUMENTS:
        // Destacar botão de selecionar documentos
        const selectButton = document.querySelector('[data-action="select-documents"], .select-documents-btn');
        if (selectButton) {
          highlightElement(selectButton, 4000, true);
        }
        break;
        
      case tutorial.TUTORIAL_STATES.UPLOAD_DOCUMENT:
        // Destacar todas as funcionalidades de anexos
        const attachmentButtons = document.querySelectorAll('.attachment-actions button, .document-actions button');
        attachmentButtons.forEach((btn, index) => {
          setTimeout(() => {
            highlightElement(btn, 2000);
          }, index * 500);
        });
        break;
    }
  };

  // Função para processar markdown simples
  const processMarkdown = (text) => {
    // Primeiro, processar formatação básica
    let processed = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // **bold**
      .replace(/\*(.*?)\*/g, '<em>$1</em>'); // *italic*
    
    // Processar linhas para criar estrutura HTML
    const lines = processed.split('\n');
    let html = '';
    let inList = false;
    
    for (let line of lines) {
      line = line.trim();
      
      if (line === '') {
        if (inList) {
          html += '</ul>';
          inList = false;
        }
        html += '<br>';
      } else if (line.startsWith('•') || line.startsWith('*')) {
        if (!inList) {
          html += '<ul>';
          inList = true;
        }
        html += `<li>${line.substring(1).trim()}</li>`;
      } else {
        if (inList) {
          html += '</ul>';
          inList = false;
        }
        html += `<p>${line}</p>`;
      }
    }
    
    if (inList) {
      html += '</ul>';
    }
    
    return html;
  };

  // Função para verificar e fechar o assistente se necessário
  const checkAssistantOverlap = (highlightedElement) => {
    const assistant = document.querySelector('.ai-assistant');
    const widget = document.querySelector('.ai-assistant__widget');
    
    if (!assistant || !highlightedElement || !isOpen) return;
    
    const assistantRect = assistant.getBoundingClientRect();
    const elementRect = highlightedElement.getBoundingClientRect();
    const widgetRect = widget ? widget.getBoundingClientRect() : null;
    
    // Verificar se há sobreposição
    const isOverlapping = (
      assistantRect.left < elementRect.right + 50 &&
      assistantRect.right > elementRect.left - 50 &&
      assistantRect.top < elementRect.bottom + 50 &&
      assistantRect.bottom > elementRect.top - 50
    ) || (
      widgetRect &&
      widgetRect.left < elementRect.right + 50 &&
      widgetRect.right > elementRect.left - 50 &&
      widgetRect.top < elementRect.bottom + 50 &&
      widgetRect.bottom > elementRect.top - 50
    );
    
    // Fechar assistente se estiver a tapar o elemento
    if (isOverlapping) {
      setIsOpen(false);
    }
  };

  // Função para fazer scroll do chat para baixo
  const scrollChatToBottom = () => {
    setTimeout(() => {
      const messagesContainer = document.querySelector('.ai-assistant__messages');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 100);
  };

  // Função para realçar elementos na página
  const highlightElement = (selector, duration = 3000, waitForClick = false) => {
    const element = document.querySelector(selector);
    if (element) {
      element.classList.add('ai-highlighted');
      
      // Auto scroll para o elemento
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest' 
      });
      
      // Aguardar o scroll terminar antes de verificar sobreposição
      setTimeout(() => {
        checkAssistantOverlap(element);
      }, 800);

      // Se waitForClick é true, mantém o realce até clicar
      if (waitForClick) {
        // Adiciona evento de clique para remover o realce
        const handleClick = () => {
          element.classList.remove('ai-highlighted');
          element.removeEventListener('click', handleClick);
          
          // Remove da lista de elementos realçados
          setHighlightedElements(prev => prev.filter(sel => sel !== selector));
          
          // Feedback visual de que foi clicado
          element.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
          element.style.transform = 'scale(1.05)';
          element.style.boxShadow = '0 0 15px rgba(40, 167, 69, 0.6)';
          setTimeout(() => {
            element.style.transform = 'scale(1)';
            element.style.boxShadow = '';
          }, 300);
        };
        
        element.addEventListener('click', handleClick);
        
        // Adiciona à lista de elementos realçados
        setHighlightedElements(prev => [...prev, selector]);
      } else {
        // Remove o realce após o tempo especificado (comportamento original)
        setTimeout(() => {
          element.classList.remove('ai-highlighted');
        }, duration);

        // Adiciona à lista de elementos realçados
        setHighlightedElements(prev => [...prev, selector]);
      }
    }
  };

  // Função para interagir automaticamente com elementos
  const interactWithElement = (selector, action = 'click', waitForUserClick = false) => {
    const element = document.querySelector(selector);
    if (element) {
      // Se deve aguardar clique do utilizador, realça indefinidamente
      if (waitForUserClick) {
        highlightElement(selector, 3000, true);
        return;
      }
      
      highlightElement(selector, 1500);
      
      setTimeout(() => {
        switch (action) {
          case 'click':
            element.click();
            break;
          case 'focus':
            element.focus();
            break;
          case 'scroll':
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            break;
        }
      }, 1000);
    }
  };

  // Tutorial guiado
  const startTutorial = () => {
    setIsInTutorial(true);
    setTutorialStep(0);
    
    const tutorialSteps = [
      {
        message: "Vamos fazer uma visita guiada! 🚀\nPrimeiro, vou mostrar-lhe a barra de pesquisa no topo da página. ✨ Clique nela quando piscar!",
        action: () => highlightElement('input[type="text"]', 3000, true)
      },
      {
        message: "Perfeito! Esta é a barra de pesquisa! 🔍\nEscreva qualquer parte do nome de um ficheiro para encontrá-lo rapidamente.",
        action: () => interactWithElement('input[type="text"]', 'focus')
      },
      {
        message: "Agora vou mostrar-lhe como expandir pastas de processos. 📁\nClique na pasta quando ela piscar! ✨",
        action: () => {
          const firstFolder = document.querySelector('.folder-header');
          if (firstFolder) {
            highlightElement('.folder-header', 3000, true);
          }
        }
      },
      {
        message: "Vê o botão + ao lado das pastas? ➕\nEsse botão permite criar novos procedimentos dentro de cada processo. Clique nele quando piscar! ✨",
        action: () => highlightElement('.create-table-btn', 3000, true)
      },
      {
        message: "No topo da página tem botões administrativos! 👥\n" + 
                 (isAdmin ? "Como administrador, pode adicionar utilizadores e criar novos processos. Clique nos botões quando piscarem! ✨" : "Estes botões estão disponíveis para administradores."),
        action: () => {
          if (isAdmin) {
            highlightElement('.admin-buttons', 3000, true);
          }
        }
      },
      {
        message: "Tutorial concluído! 🎉\nAgora já sabe navegar pela página. Sempre que precisar de ajuda, clique no meu ícone!",
        action: () => {}
      }
    ];

    const runTutorialStep = (step) => {
      if (step < tutorialSteps.length) {
        const currentStep = tutorialSteps[step];
        handleSuggestion(currentStep.message, true);
        
        setTimeout(() => {
          currentStep.action();
        }, 500);
      } else {
        setIsInTutorial(false);
        setTutorialStep(0);
      }
    };

    runTutorialStep(0);
  };

  // Tutorial específico para anexos de arquivos
  const startAttachmentTutorial = () => {
    setIsInTutorial(true);
    setTutorialStep(0);
    
    const attachmentTutorialSteps = [
      {
        message: "📎 **Tutorial de Anexos - Passo 1/5**\nVamos aprender a anexar documentos! 🚀\n\nPrimeiro, precisa abrir um procedimento para edição.\n✨ **Clique em qualquer ficheiro quando piscar!**",
        action: () => {
          // Encontra o primeiro arquivo disponível e destaca
          const firstFile = document.querySelector('.file-item, .table-item, [data-filename]');
          if (firstFile) {
            highlightElement(firstFile, 5000, true);
          } else {
            // Se não encontrar arquivos na página principal, dar instruções
            setTimeout(() => {
              handleSuggestion("ℹ️ **Nota:** Para continuar o tutorial de anexos, precisa primeiro abrir um procedimento para edição. Navegue para a página de edição de um procedimento e reinicie o tutorial de anexos.");
            }, 2000);
          }
        }
      },
      {
        message: "📎 **Tutorial de Anexos - Passo 2/5**\nExcelente! Agora estamos na página de edição.\n\nProcure pela secção **'Documentos Associados'** - geralmente está na parte inferior do formulário.\n✨ **Vou destacá-la quando a encontrar!**",
        action: () => {
          // Procura pelo componente de documentos associados
          const docSection = document.querySelector('[data-section="documentos-associados"], .documentos-associados, .documents-section');
          if (docSection) {
            docSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            highlightElement(docSection, 5000, true);
          } else {
            // Se não encontrar, procura por elementos relacionados
            const docElements = document.querySelectorAll('*[class*="document"], *[class*="anexo"], *[class*="attach"]');
            if (docElements.length > 0) {
              const targetElement = docElements[0];
              targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              highlightElement(targetElement, 5000, true);
            } else {
              setTimeout(() => {
                handleSuggestion("⚠️ **Tutorial interrompido:** Não consegui encontrar a secção de 'Documentos Associados' nesta página.\n\n📝 **Para continuar:**\n• Certifique-se de que está numa página de edição de procedimento\n• Procure pela secção 'Documentos Associados'\n• Reinicie o tutorial quando a encontrar");
              }, 1000);
            }
          }
        }
      },
      {
        message: "📎 **Tutorial de Anexos - Passo 3/5**\nPerfeito! Esta é a secção de Documentos Associados! 📄\n\n**Aqui pode:**\n• Ver documentos já anexados\n• Selecionar novos documentos\n• Fazer upload de arquivos\n\n✨ **Clique no botão 'Selecionar Documentos' quando piscar!**",
        action: () => {
          const selectButton = document.querySelector('[data-action="select-documents"], .select-documents-btn, button[class*="select"], button:contains("Selecionar")');
          if (selectButton) {
            highlightElement(selectButton, 5000, true);
          } else {
            // Procura por botões relacionados
            const buttons = Array.from(document.querySelectorAll('button')).filter(btn => 
              btn.textContent.toLowerCase().includes('selecionar') || 
              btn.textContent.toLowerCase().includes('documento') ||
              btn.textContent.toLowerCase().includes('anexar')
            );
            if (buttons.length > 0) {
              highlightElement(buttons[0], 5000, true);
            }
          }
        }
      },
      {
        message: "📎 **Tutorial de Anexos - Passo 4/5**\nÓtimo! Agora pode ver a lista de documentos disponíveis! 📋\n\n**Funcionalidades disponíveis:**\n👁️ **Preview:** Visualizar documento\n⬇️ **Download:** Baixar arquivo\n☑️ **Selecionar:** Anexar ao procedimento\n\n✨ **Experimente clicar numa checkbox para selecionar um documento!**",
        action: () => {
          // Procura por checkboxes ou elementos selecionáveis
          const checkboxes = document.querySelectorAll('input[type="checkbox"], .document-checkbox, .selectable-item');
          if (checkboxes.length > 0) {
            checkboxes[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
            highlightElement(checkboxes[0], 5000, true);
          }
        }
      },
      {
        message: "📎 **Tutorial de Anexos - Passo 5/5**\nExcelente trabalho! 🎉\n\n**Resumo do que aprendeu:**\n✅ Como encontrar a secção de Documentos Associados\n✅ Como selecionar documentos existentes\n✅ Como usar Preview e Download\n✅ Como anexar documentos ao procedimento\n\n**💡 Dica extra:** Para fazer upload de novos documentos, use o botão 'Upload Novo Documento'!\n\n🎯 **Tutorial de anexos concluído!**",
        action: () => {
          // Remove qualquer highlight ativo
          document.querySelectorAll('.ai-highlighted').forEach(el => {
            el.classList.remove('ai-highlighted');
          });
        }
      }
    ];

    const runAttachmentTutorialStep = (step) => {
      if (step < attachmentTutorialSteps.length) {
        const currentStep = attachmentTutorialSteps[step];
        handleSuggestion(currentStep.message, true);
        
        setTimeout(() => {
          currentStep.action();
        }, 500);
      } else {
        setIsInTutorial(false);
        setTutorialStep(0);
      }
    };

    runAttachmentTutorialStep(0);
  };

  const nextTutorialStep = () => {
    const nextStep = tutorialStep + 1;
    setTutorialStep(nextStep);
    
    const tutorialSteps = [
      {
        message: "Vamos fazer uma visita guiada! 🚀\nPrimeiro, vou mostrar-lhe a barra de pesquisa no topo da página. ✨ Clique nela quando piscar!",
        action: () => highlightElement('input[type="text"]', 3000, true)
      },
      {
        message: "Perfeito! Esta é a barra de pesquisa! 🔍\nEscreva qualquer parte do nome de um ficheiro para encontrá-lo rapidamente.",
        action: () => interactWithElement('input[type="text"]', 'focus')
      },
      {
        message: "Agora vou mostrar-lhe como expandir pastas de processos. 📁\nClique na pasta quando ela piscar! ✨",
        action: () => {
          const firstFolder = document.querySelector('.folder-header');
          if (firstFolder) {
            highlightElement('.folder-header', 3000, true);
          }
        }
      },
      {
        message: "Vê o botão + ao lado das pastas? ➕\nEsse botão permite criar novos procedimentos dentro de cada processo. Clique nele quando piscar! ✨",
        action: () => highlightElement('.create-table-btn', 3000, true)
      },
      {
        message: "No topo da página tem botões administrativos! 👥\n" + 
                 (isAdmin ? "Como administrador, pode adicionar utilizadores e criar novos processos. Clique nos botões quando piscarem! ✨" : "Estes botões estão disponíveis para administradores."),
        action: () => {
          if (isAdmin) {
            highlightElement('.admin-buttons', 3000, true);
          }
        }
      },
      {
        message: "Tutorial concluído! 🎉\nAgora já sabe navegar pela página. Sempre que precisar de ajuda, clique no meu ícone!",
        action: () => {}
      }
    ];

    if (nextStep < tutorialSteps.length) {
      const currentStep = tutorialSteps[nextStep];
      setTimeout(() => {
        handleSuggestion(currentStep.message, true);
        currentStep.action();
      }, 1000);
    } else {
      setIsInTutorial(false);
      setTutorialStep(0);
    }
  };

  // Inicializar mensagem de boas-vindas
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage = {
        id: 1,
        type: 'ai',
        text: `Olá ${username}! 👋\n🤖 **Sou o seu assistente de navegação**\nPosso ajudar em:\n📝 **Página**\n• Navegar ficheiros\n🛠️ **Funcionalidades**\n• Botões e permissões\n➕ **Procedimentos**\n• Passos e boas práticas\n� **Anexos**\n• Como anexar documentos\n�📊 **ISO**\n• ISO 9001 simples\n💬 **Escreva a sua pergunta abaixo!** 😊`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [username, messages.length]);

  // Processar pergunta do utilizador
  const processUserQuestion = (question) => {
    const lowerQuestion = question.toLowerCase();
    
    // Adicionar mensagem do utilizador
    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      text: question,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    
    // Simular typing
    setIsTyping(true);
    
    setTimeout(() => {
      let response = generateIntelligentResponse(lowerQuestion);
      
      const aiResponse = {
        id: messages.length + 2,
        type: 'ai',
        text: response.text,
        timestamp: new Date(),
        action: response.action
      };
      
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
      
      // Executar ação se existir
      if (response.action) {
        setTimeout(() => response.action(), 1000);
      }
    }, 1500);
  };

  // Gerar resposta inteligente baseada na pergunta
  const generateIntelligentResponse = (question) => {
    // Base de conhecimento sobre a aplicação
    const responses = {
      // Perguntas sobre pesquisa
      search: {
        keywords: ['pesquisar', 'procurar', 'encontrar', 'buscar', 'search', 'find', 'encontro'],
        response: {
          text: "🔍 **Como pesquisar ficheiros:**\n� **Onde encontrar:**\n• Barra de pesquisa no topo da página\n⚡ **Como usar:**\n• Escreva parte do nome do ficheiro\n• Procura em nomes e pastas\n✨ **Vou mostrar-lhe!** (Clique na barra quando piscar)",
          action: () => {
            highlightElement('input[type="text"]', 3000, true);
            setTimeout(() => interactWithElement('input[type="text"]', 'focus'), 2000);
          }
        }
      },
      
      // Perguntas sobre navegação
      navigation: {
        keywords: ['navegar', 'abrir', 'expandir', 'pasta', 'folder', 'como usar', 'navigation'],
        response: {
          text: "📁 **Como navegar pelos processos:**\n� **Expandir pastas:**\n• Clique nas pastas 'PROCESSO X:'\n• Os ficheiros aparecem organizados\n📄 **Abrir ficheiros:**\n• Clique em qualquer ficheiro para editar\n• Numeração sequencial para fácil localização\n✨ **Vou mostrar-lhe!** (Clique na pasta quando piscar)",
          action: () => {
            const firstFolder = document.querySelector('.folder-header');
            if (firstFolder) {
              highlightElement('.folder-header', 3000, true);
            }
          }
        }
      },
      
      // Perguntas sobre criação
      create: {
        keywords: [ 'novo', 'adicionar', 'procedimento', 'create', 'new', 'add'],
        response: {
          text: "➕ **Como criar novos procedimentos:**\n🎯 **Passo a passo:**\n• Clique no botão **+** ao lado das pastas\n• Escolha o processo onde quer adicionar\n• Preencha os dados necessários\n💾 **Resultado:**\n• Sistema gera PDF automaticamente\n• Procedimento fica disponível imediatamente\n✨ **Vou mostrar-lhe!** (Clique no + quando piscar)",
          action: () => highlightElement('.create-table-btn', 3000, true)
        }
      },
      
      // Perguntas sobre permissões
      permissions: {
        keywords: ['permissões', 'permissoes' , 'acesso', 'editar', 'pode', 'permissions', 'access', 'edit'],
        response: {
          text: `🔐 **As suas permissões atuais são:**\n${isSuperAdmin ? 
            '👑 **Super Administrador - Acesso Total**\n✅ **Pode:**\n• Editar todos os processos\n• Gerir utilizadores\n• Criar novos processos\n• Aceder a todas as funcionalidades\n• Gerir outros administradores' : 
            isAdmin ? 
            '🛡️ **Administrador - Acesso Limitado**\n✅ **Pode fazer:**\n• Editar todos os processos\n• Visualizar utilizadores\n⚠️ **Não pode fazer:**\n• Criar utilizadores (só SuperAdmin)\n• Criar processos (só SuperAdmin)' : 
            (() => {
              // Encontrar processos que o usuário possui baseado no processOwners
              const userProcesses = Object.entries(processOwners)
                .filter(([processName, owner]) => owner === username)
                .map(([processName, owner]) => ({ name: processName, owner }));
              
              if (userProcesses.length === 0) {
                return '👤 **Utilizador - Sem Processos**\n✅ **Pode fazer:**\n• Visualizar todos os ficheiros\n⚠️ **Sem processos atribuídos**\n• Apenas visualização dos ficheiros\n• Contacte o administrador para obter permissões';
              } else if (userProcesses.length === 1) {
                return `👤 **Utilizador - Processo Atribuído**\n✅ **Processo atribuído:**\n• ${userProcesses[0].name}\n✅ **Pode fazer:**\n• Editar este processo\n• Criar novos procedimentos\n• Visualizar outros processos (só leitura)`;
              } else {
                return `👤 **Utilizador - Múltiplos Processos**\n✅ **Processos atribuídos (${userProcesses.length}):**\n${userProcesses.map(p => `• ${p.name}`).join('\n')}\n✅ **Pode fazer:**\n• Editar estes processos\n• Criar novos procedimentos\n• Visualizar outros processos (só leitura)`;
              }
            })()
          }`,
          action: () => {
            if (isSuperAdmin || isAdmin) {
              highlightElement('.admin-buttons', 3000, true);
            } else {
              // Encontrar processos que o usuário possui baseado no processOwners
              const userProcesses = Object.entries(processOwners)
                .filter(([processName, owner]) => owner === username)
                .map(([processName, owner]) => ({ name: processName, owner }));
              
              if (userProcesses.length === 0) {
                // Se não tem processos, mostrar mensagem
                return;
              } else if (userProcesses.length === 1) {
                // Se tem apenas um processo, destacar esse
                const processElement = document.querySelector(`[data-process="${userProcesses[0].name}"]`) || 
                                     document.querySelector('.owner-folder');
                if (processElement) {
                  processElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  processElement.classList.add('ai-highlighted');
                  setTimeout(() => {
                    processElement.classList.remove('ai-highlighted');
                  }, 3000);
                }
              } else {
                // Se tem múltiplos processos, fazer todos piscarem em sequência
                userProcesses.forEach((process, index) => {
                  setTimeout(() => {
                    const processElement = document.querySelector(`[data-process="${process.name}"]`) || 
                                         document.querySelectorAll('.owner-folder')[index];
                    if (processElement) {
                      if (index === 0) {
                        processElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                      processElement.classList.add('ai-highlighted');
                      setTimeout(() => {
                        processElement.classList.remove('ai-highlighted');
                      }, 2000);
                    }
                  }, index * 800);
                });
              }
            }
          }
        }
      },
      
      // Perguntas sobre anexos de arquivos
      attachments: {
        keywords: ['anexar', 'anexo', 'arquivo', 'ficheiro', 'documentos associados', 'attach', 'attachment', 'file', 'document', 'upload', 'adicionar documento'],
        response: {
          text: "📎 **Como anexar arquivos em procedimentos:**\n🎯 **Tutorial interativo disponível!**\n\n**O que vai aprender:**\n• Navegar pelos processos\n• Selecionar procedimentos\n• Encontrar secção de anexos\n• Selecionar e fazer upload de documentos\n\n✨ **Iniciar tutorial dinâmico que continua entre páginas?**",
          action: () => {
            // Iniciar o novo sistema de tutorial persistente
            tutorial.startTutorial(TUTORIAL_TYPES.ATTACHMENTS, {
              startedFrom: 'ai_assistant',
              userName: username
            });
          }
        }
      },
      
      // Perguntas sobre criação de utilizadores 
      createUser: {
        keywords: ['criar utilizador', 'adicionar utilizador', 'novo utilizador', 'create user', 'add user', 'new user', 'utilizadores', 'criar user'],
        response: {
          text: isSuperAdmin ? 
            "👥 **Como criar utilizadores:**\n🎯 **Passo a passo:**\n• Clique no botão 'Adicionar Utilizador'\n• Preencha os dados do utilizador\n• Defina as permissões necessárias\n💾 **Resultado:**\n• Utilizador fica disponível imediatamente\n• Pode atribuir processos ao utilizador\n✨ **Vou mostrar-lhe!** (Clique no botão quando piscar)" :
            isAdmin ?
            "⚠️ **Sem permissão para criar utilizadores!**\n🛡️ **Apenas SuperAdmin pode:**\n• Criar novos utilizadores\n• Gerir contas de utilizadores\n• Definir permissões\n👤 **Como administrador pode:**\n• Editar todos os processos\n• Visualizar informações dos utilizadores\n📞 **Contacte o SuperAdmin para criar utilizadores**" :
            "🚫 **Sem permissão para criar utilizadores!**\n👤 **Utilizadores normais não podem:**\n• Criar contas\n• Gerir utilizadores\n📞 **Contacte o SuperAdmin ou um Administrador**",
          action: () => {
            if (isSuperAdmin) {
              highlightElement('[data-testid="add-user-btn"], .add-user-btn, .admin-buttons button:first-child', 3000, true);
            }
          }
        }
      },
      
      // Perguntas sobre criação de processos
      createProcess: {
        keywords: ['criar processo', 'adicionar processo', 'novo processo', 'create process', 'add process', 'new process', 'processos'],
        response: {
          text: isSuperAdmin ? 
            "📁 **Como criar processos:**\n🎯 **Passo a passo:**\n• Clique no botão 'Criar Processo'\n• Defina o nome do processo\n• Atribua um responsável\n💾 **Resultado:**\n• Processo fica disponível imediatamente\n• Pode começar a criar procedimentos\n✨ **Vou mostrar-lhe!** (Clique no botão quando piscar)" :
            isAdmin ?
            "⚠️ **Sem permissão para criar processos!**\n🛡️ **Apenas SuperAdmin pode:**\n• Criar novos processos\n• Definir estrutura organizacional\n👤 **Como administrador pode:**\n• Editar processos existentes\n• Criar procedimentos dentro dos processos\n📞 **Contacte o SuperAdmin para criar processos**" :
            "🚫 **Sem permissão para criar processos!**\n👤 **Utilizadores normais não podem:**\n• Criar processos\n• Alterar estrutura organizacional\n📞 **Contacte o SuperAdmin ou administrador**",
          action: () => {
            if (isSuperAdmin) {
              highlightElement('[data-testid="create-process-btn"], .create-process-btn, .admin-buttons button:last-child', 3000, true);
            }
          }
        }
      },
      
      // Perguntas sobre ISO
      iso: {
        keywords: ['iso', '9001', 'qualidade', 'procedimento', 'processo', 'norma'],
        response: {
          text: "📊 **Sobre ISO 9001:**\n🎯 **O que é:**\n• Sistema de gestão da qualidade\n• Norma internacional reconhecida\n🔄 **Princípios fundamentais:**\n• Foco em melhoria contínua\n• Processos documentados\n• Satisfação do cliente\n✅ **Cada procedimento deve ter:**\n• **Objetivo claro** - Para que serve\n• **Responsáveis definidos** - Quem executa\n• **Documentos associados** - Formulários, anexos\n• **Instruções de trabalho** - Como fazer\n🎉 **Esta aplicação simplifica tudo isso!**"
        }
      },
      
      // Tutorial específico
      tutorial: {
        keywords: ['tutorial', 'visita', 'guia', 'guiada', 'começar', 'iniciar'],
        response: {
          text: "Vou iniciar uma visita guiada completa! 🎓\nVou mostrar-lhe passo a passo como usar a aplicação, com destaque nos elementos importantes. Prepare-se! 🚀",
          action: () => startTutorial()
        }
      },
      
      // Ajuda geral
      help: {
        keywords: ['ajuda', 'help', 'what', 'que', 'explicar'],
        response: {
          text: "🎯 **Como posso ajudar:**\n🔍 **Pesquisa**\n• Como encontrar ficheiros rapidamente\n📁 **Navegação**\n• Como usar pastas e organização\n➕ **Criação**\n• Como criar novos procedimentos\n🔐 **Permissões**\n• O que pode fazer na aplicação\n📋 **ISO 9001**\n• Explicações sobre a norma\n🎓 **Tutorial**\n• Visita guiada completa\n**Que área gostaria de explorar?** 😊",
          action: () => {}
        }
      }
    };
    
    // Tentar encontrar categoria mais relevante
    let bestMatch = { category: 'help', score: 0 };
    
    Object.entries(responses).forEach(([category, data]) => {
      const matchCount = data.keywords.filter(keyword => 
        question.includes(keyword)
      ).length;
      
      if (matchCount > bestMatch.score) {
        bestMatch = { category, score: matchCount };
      }
    });
    
    // Se não encontrou match, usar resposta genérica
    if (bestMatch.score === 0) {
      return {
        text: `🤔 Hmm, ainda não tenho resposta para isso.\nMas olha, aqui está o que sei agora:\n• Dos ${fileTree.length} processos disponíveis:\n• ${isSuperAdmin ? 'Modo SuperAdmin ligado' : isAdmin ? 'Modo admin ligado' : (() => {
          const userProcesses = Object.entries(processOwners)
            .filter(([processName, owner]) => owner === username)
            .map(([processName, owner]) => ({ name: processName, owner }));
          
          if (userProcesses.length === 0) {
            return 'Sem processos atribuídos';
          } else if (userProcesses.length === 1) {
            return `És dono de 1 processo (${userProcesses[0].name})`;
          } else {
            return `És dono de ${userProcesses.length} processos`;
          }
        })()}\n\n💡 Podes perguntar coisas como:\n• *"Como pesquisar ficheiros?"*\n• *"Como criar um procedimento?"*\n• *"Que permissões tenho?"*\n• *"Explica-me o ISO 9001"*\n\nQueres tentar ser mais específico? 😊`,
        action: null
      };
    }
    
    return responses[bestMatch.category].response;
  };

  // Enviar mensagem
  const handleSendMessage = () => {
    if (userInput.trim()) {
      processUserQuestion(userInput.trim());
      setUserInput('');
      // Garantir scroll para baixo após enviar mensagem
      scrollChatToBottom();
    }
  };

  // Handle Enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Analisar contexto e gerar sugestões
  // (Removido - sugestões desativadas)

  const countFilteredItems = (nodes, term) => {
    let count = 0;
    const searchLower = term.toLowerCase();
    
    const countInNodes = (nodeList) => {
      nodeList.forEach(node => {
        if (node.name.toLowerCase().includes(searchLower)) {
          count++;
        }
        if (node.type === 'folder' && node.children) {
          countInNodes(node.children);
        }
      });
    };
    
    countInNodes(nodes);
    return count;
  };

  const handleSuggestion = (suggestionText, isFromTutorial = false) => {
    const newMessage = {
      id: messages.length + 1,
      type: 'ai',
      text: suggestionText,
      timestamp: new Date(),
      isFromTutorial
    };
    setMessages(prev => [...prev, newMessage]);
    
    // Fazer scroll para baixo após adicionar mensagem
    scrollChatToBottom();
    
    // Callback para página pai se necessário
    if (onSuggestion) {
      onSuggestion(suggestionText);
    }
  };

  const handleQuickAction = (actionType) => {
    let responseText = '';
    let highlightAction = null;
    
    switch (actionType) {
      case 'search-help':
        responseText = "Para pesquisar:\n• Digite parte do nome do ficheiro na barra de pesquisa\n• Procura tanto em nomes de ficheiros como de pastas";
        highlightAction = () => {
          setTimeout(() => {
            highlightElement('input[type="text"]', 4000);
            interactWithElement('input[type="text"]', 'focus');
          }, 1000);
        };
        break;
      case 'navigation-help':
        responseText = "Para navegar:\n• Clique nas pastas para expandir\n• Ficheiros estão ordenados numericamente\n• Use o botão + para criar novos procedimentos";
        highlightAction = () => {
          setTimeout(() => {
            const firstFolder = document.querySelector('.folder-header');
            if (firstFolder) {
              highlightElement('.folder-header', 3000);
            }
          }, 1000);
        };
        break;
      case 'permissions-help':
        responseText = (() => {
          if (isAdmin) {
            return 'Suas permissões:\n• Administrador: Acesso total\n• Pode editar todos os processos\n• Gerir utilizadores e criar processos';
          } else {
            const userProcesses = Object.entries(processOwners)
              .filter(([processName, owner]) => owner === username)
              .map(([processName, owner]) => ({ name: processName, owner }));
            
            if (userProcesses.length === 0) {
              return 'Suas permissões:\n• Utilizador (Sem Processos): Sem processos atribuídos\n• Apenas visualização de ficheiros\n• Contacte o administrador';
            } else if (userProcesses.length === 1) {
              return `Suas permissões:\n• Utilizador (Processo Atribuído): 1 processo atribuído\n• Processo: ${userProcesses[0].name}\n• Pode editar e criar procedimentos`;
            } else {
              return `Suas permissões:\n• Utilizador (Múltiplos Processos): ${userProcesses.length} processos atribuídos\n• Processos: ${userProcesses.map(p => p.name).join(', ')}\n• Pode editar estes processos`;
            }
          }
        })();
        highlightAction = () => {
          setTimeout(() => {
            if (isAdmin) {
              highlightElement('.admin-buttons', 3000);
            } else {
              const userProcesses = Object.entries(processOwners)
                .filter(([processName, owner]) => owner === username)
                .map(([processName, owner]) => ({ name: processName, owner }));
              
              if (userProcesses.length === 0) {
                return;
              } else if (userProcesses.length === 1) {
                const processElement = document.querySelector(`[data-process="${userProcesses[0].name}"]`) || 
                                     document.querySelector('.owner-folder');
                if (processElement) {
                  highlightElement(processElement, 3000);
                }
              } else {
                userProcesses.forEach((process, index) => {
                  setTimeout(() => {
                    const processElement = document.querySelector(`[data-process="${process.name}"]`) || 
                                         document.querySelectorAll('.owner-folder')[index];
                    if (processElement) {
                      processElement.classList.add('ai-highlighted');
                      setTimeout(() => {
                        processElement.classList.remove('ai-highlighted');
                      }, 2000);
                    }
                  }, index * 800);
                });
              }
            }
          }, 1000);
        };
        break;
      default:
        responseText = "Como posso ajudar? Pode fazer-me qualquer pergunta sobre navegação, criação de procedimentos, permissões ou ISO 9001.";
    }

    handleSuggestion(responseText);
    
    if (highlightAction) {
      highlightAction();
    }
  };

  const toggleWidget = () => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    
    // Fazer scroll para baixo quando abrir
    if (newIsOpen) {
      scrollChatToBottom();
    }
  };

  // Obter mensagem do tutorial atual
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
      </div>
    );
  };

  // Processar pergunta simples no balão
  const handleBubbleQuestion = () => {
    if (!userInput.trim()) return;
    
    setIsTyping(true);
    const question = userInput.toLowerCase();
    
    setTimeout(() => {
      let response = '';
      let actionType = null;
      
      if (question.includes('pesquis') || question.includes('procur') || question.includes('encontr')) {
        response = '🔍 Use a barra de pesquisa no topo para encontrar ficheiros rapidamente!';
        actionType = 'search';
      } else if (question.includes('pasta') || question.includes('abrir') || question.includes('naveg')) {
        response = '📁 Clique nas pastas "PROCESSO X:" para expandir e ver os ficheiros.';
        actionType = 'folder';
      } else if (question.includes('criar') || question.includes('novo') || question.includes('adicion') || question.includes('procedimento')) {
        response = '➕ Use o botão + ao lado das pastas para criar novos procedimentos.';
        actionType = 'create';
      } else if (question.includes('permiss') || question.includes('edit') || question.includes('posso')) {
        response = `🔐 Como ${isAdmin ? 'administrador' : 'utilizador'}, pode ${isAdmin ? 'editar todos os processos' : 'editar os seus processos atribuídos'}.`;
        actionType = 'permissions';
      } else if (question.includes('anexo') || question.includes('documento') || question.includes('ficheiro') || question.includes('anexar')) {
        response = '📎 Vou iniciar o tutorial de anexos! Siga os 6 passos para aprender a anexar documentos corretamente.';
        actionType = 'attachment';
        // Iniciar tutorial automaticamente
        setTimeout(() => {
          tutorial.startTutorial();
        }, 1500);
      } else if (question.includes('tutorial') || question.includes('ajuda') || question.includes('como')) {
        response = '🎯 Iniciando tutorial de anexos! Vou guiá-lo através do processo completo passo a passo.';
        actionType = 'tutorial';
        // Iniciar tutorial automaticamente
        setTimeout(() => {
          tutorial.startTutorial();
        }, 1500);
      } else {
        response = '🤖 Posso ajudar com: pesquisa, navegação, criação de procedimentos, permissões e anexos. Seja mais específico!';
        actionType = 'general';
      }
      
      setBubbleResponse(response);
      setIsTyping(false);
      setUserInput('');
      
      // Configurar detectores para limpar resposta quando ação for executada
      if (actionType) {
        setupResponseDetector(actionType);
      } else {
        // Para respostas gerais, limpar após 5 segundos
        setTimeout(() => setBubbleResponse(''), 5000);
      }
    }, 1000);
  };

  // Lidar com Enter no input do balão
  const handleBubbleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleBubbleQuestion();
    }
  };

  // Configurar detectores para limpar resposta quando ação é executada
  const setupResponseDetector = (actionType) => {
    const clearResponse = () => setBubbleResponse('');
    
    switch (actionType) {
      case 'search':
        // Detectar quando usuário clica na barra de pesquisa ou digita algo
        const searchInput = document.querySelector('input[type="text"]');
        if (searchInput) {
          const handleSearchInteraction = () => {
            clearResponse();
            searchInput.removeEventListener('focus', handleSearchInteraction);
            searchInput.removeEventListener('input', handleSearchInteraction);
          };
          searchInput.addEventListener('focus', handleSearchInteraction);
          searchInput.addEventListener('input', handleSearchInteraction);
        }
        break;
        
      case 'folder':
      case 'select_process':
        // Detectar quando usuário clica numa pasta para expandir
        const folders = document.querySelectorAll('.folder-header, .process-folder, [data-process]');
        folders.forEach(folder => {
          const handleFolderClick = () => {
            clearResponse();
            // Avançar tutorial se estiver no passo correto
            if (tutorial.isActive && tutorial.tutorialState === tutorial.TUTORIAL_STATES.SELECT_PROCESS) {
              tutorial.nextStep();
            }
            folder.removeEventListener('click', handleFolderClick);
          };
          folder.addEventListener('click', handleFolderClick);
        });
        break;
        
      case 'select_procedure':
        // Detectar quando usuário clica num procedimento
        const procedures = document.querySelectorAll('.file-item, .table-item, [data-filename]');
        procedures.forEach(procedure => {
          const handleProcedureClick = () => {
            clearResponse();
            // Avançar tutorial se estiver no passo correto
            if (tutorial.isActive && tutorial.tutorialState === tutorial.TUTORIAL_STATES.SELECT_PROCEDURE) {
              tutorial.nextStep();
            }
            procedure.removeEventListener('click', handleProcedureClick);
          };
          procedure.addEventListener('click', handleProcedureClick);
        });
        break;
        
      case 'click_edit':
        // Detectar quando usuário clica no botão editar
        const editButtons = document.querySelectorAll('button:contains("Editar"), [data-action="edit"], .edit-btn');
        editButtons.forEach(button => {
          const handleEditClick = () => {
            clearResponse();
            // Avançar tutorial se estiver no passo correto
            if (tutorial.isActive && tutorial.tutorialState === tutorial.TUTORIAL_STATES.CLICK_EDIT_BUTTON) {
              tutorial.nextStep();
            }
            button.removeEventListener('click', handleEditClick);
          };
          button.addEventListener('click', handleEditClick);
        });
        break;
        
      case 'select_table_row':
        // Detectar quando usuário clica numa linha da tabela
        const tableRows = document.querySelectorAll('tr, .table-row, .row-item');
        tableRows.forEach(row => {
          const handleRowClick = () => {
            clearResponse();
            // Avançar tutorial se estiver no passo correto
            if (tutorial.isActive && tutorial.tutorialState === tutorial.TUTORIAL_STATES.SELECT_TABLE_ROW) {
              tutorial.nextStep();
            }
            row.removeEventListener('click', handleRowClick);
          };
          row.addEventListener('click', handleRowClick);
        });
        break;
        
      case 'click_documents':
        // Detectar quando usuário clica na célula de documentos
        const documentCells = document.querySelectorAll('.documentos-associados, [data-documentos], .documents-cell');
        documentCells.forEach(cell => {
          const handleDocumentClick = () => {
            clearResponse();
            // Avançar tutorial se estiver no passo correto
            if (tutorial.isActive && tutorial.tutorialState === tutorial.TUTORIAL_STATES.CLICK_DOCUMENTS) {
              tutorial.nextStep();
            }
            cell.removeEventListener('click', handleDocumentClick);
          };
          cell.addEventListener('click', handleDocumentClick);
        });
        break;
        
      case 'upload_document':
        // Detectar quando usuário clica em "Enviar novo Documento"
        const uploadButtons = document.querySelectorAll('button:contains("Enviar"), [data-action="upload"], .upload-btn');
        uploadButtons.forEach(button => {
          const handleUploadClick = () => {
            clearResponse();
            // Completar tutorial se estiver no último passo
            if (tutorial.isActive && tutorial.tutorialState === tutorial.TUTORIAL_STATES.UPLOAD_NEW_DOCUMENT) {
              tutorial.completeTutorial();
            }
            button.removeEventListener('click', handleUploadClick);
          };
          button.addEventListener('click', handleUploadClick);
        });
        break;
        
      case 'create':
        // Detectar quando usuário clica no botão +
        const createButtons = document.querySelectorAll('.create-table-btn, [data-action="create"]');
        createButtons.forEach(button => {
          const handleCreateClick = () => {
            clearResponse();
            button.removeEventListener('click', handleCreateClick);
          };
          button.addEventListener('click', handleCreateClick);
        });
        break;
        
      case 'attachment':
        // Detectar quando usuário abre um procedimento ou interage com anexos
        const procedureLinks = document.querySelectorAll('.file-item, .table-item, [data-filename]');
        const attachmentElements = document.querySelectorAll('[class*="document"], [class*="anexo"]');
        
        const handleAttachmentInteraction = () => {
          clearResponse();
          // Remover todos os listeners
          procedureLinks.forEach(link => link.removeEventListener('click', handleAttachmentInteraction));
          attachmentElements.forEach(el => el.removeEventListener('click', handleAttachmentInteraction));
        };
        
        procedureLinks.forEach(link => link.addEventListener('click', handleAttachmentInteraction));
        attachmentElements.forEach(el => el.addEventListener('click', handleAttachmentInteraction));
        break;
        
      case 'tutorial':
        // Para tutorial, limpar quando o tutorial for iniciado
        setTimeout(() => {
          if (tutorial.isActive) {
            clearResponse();
          } else {
            // Se tutorial não foi iniciado, dar timeout normal
            setTimeout(clearResponse, 10000);
          }
        }, 2000);
        break;
        
      default:
        // Para outros casos, timeout padrão de 8 segundos
        setTimeout(clearResponse, 8000);
    }
  };

  return (
    <div className="ai-assistant">
      {/* Botão flutuante */}
      <button 
        className="ai-assistant__toggle"
        onClick={toggleWidget}
        title="Assistente de navegação"
      >
        🤖
      </button>

      {/* Balão de fala do tutorial */}
      {tutorial.isActive && (
        <div className="ai-assistant__bubble ai-assistant__bubble--info">
          <button 
            className="ai-assistant__bubble-close"
            onClick={() => tutorial.completeTutorial()}
            title="Fechar tutorial"
          >
            ✕
          </button>
          {getCurrentTutorialMessage()}
          <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.8 }}>
            Progresso: {Math.round(tutorial.getProgressPercentage())}%
          </div>
        </div>
      )}

      {/* Balão de fala simples para mensagens normais */}
      {isOpen && !tutorial.isActive && (
        <div className="ai-assistant__bubble">
          <button 
            className="ai-assistant__bubble-close"
            onClick={() => setIsOpen(false)}
            title="Fechar"
          >
            ✕
          </button>
          <div>
            <strong>🤖 Assistente ISO 9001</strong>
            <br />
            {bubbleResponse ? (
              <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f0fdf4', borderRadius: '8px', fontSize: '13px' }}>
                {bubbleResponse}
              </div>
            ) : (
              <>
                Como posso ajudar?
                <br />
                <div style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>
                  Pergunte sobre: pesquisa, navegação, anexos, permissões...
                </div>
              </>
            )}
          </div>
          
          {/* Input pequeno para perguntas */}
          <div className="ai-assistant__bubble-input">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={handleBubbleKeyPress}
              placeholder="Escreva sua pergunta..."
              disabled={isTyping}
            />
            <button
              className="ai-assistant__bubble-send-btn"
              onClick={handleBubbleQuestion}
              disabled={!userInput.trim() || isTyping}
              title="Enviar pergunta"
            >
              {isTyping ? '⏳' : '📤'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;