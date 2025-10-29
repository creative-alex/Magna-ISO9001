import React from "react";
import downloadIcon from "../../icons/download.ico";

const PdfPreviewButton = ({ file, currentPath }) => {
  // Função para carregar automaticamente a imagem PNG da empresa
  const loadCompanyImage = async () => {
    try {
      const response = await fetch('/c_comenius_cor.png');
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        console.log("✅ Imagem da empresa carregada para preview");
        return new Uint8Array(arrayBuffer);
      } else {
        console.warn("⚠️ Imagem da empresa não encontrada para preview");
        return null;
      }
    } catch (error) {
      console.error("❌ Erro ao carregar imagem da empresa para preview:", error);
      return null;
    }
  };

  const handlePreviewClick = async (e) => {
    e.stopPropagation(); // Evita trigger do onClick do div pai
    try {
      const filePath = [...currentPath, file.name].join("/");
      
      // Carregar a imagem PNG da empresa
      const imageBytes = await loadCompanyImage();
      
      // Se está em subpasta de nível 2 ou mais (currentPath.length > 1), faz download direto
      // Nível 0: pasta raiz, Nível 1: primeira subpasta, Nível 2+: subpastas dentro de subpastas
      if (currentPath.length > 1) {
        console.log("Ficheiro em subpasta profunda (nível 2+) - fazendo download direto:", filePath);
        
        // Mostra feedback visual (opcional)
        const button = e.target.closest('button');
        const originalTitle = button.title;
        button.title = 'A descarregar...';
        button.style.opacity = '0.7';
        
        const response = await fetch('https://api9001.duckdns.org/files/download', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ path: encodeURIComponent(filePath) }),
        });

        // Restaura o estado do botão
        button.title = originalTitle;
        button.style.opacity = '1';

        if (response.ok) {
          const blob = await response.blob();
          
          // Cria um link temporário para download
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = file.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } else {
          const errorText = await response.text();
          console.error("Erro ao fazer download:", errorText);
          alert(`Erro ao fazer download do ficheiro: ${errorText}`);
        }
        return;
      }
      
      // 1. Primeiro, carrega os dados do PDF
      const formDataResponse = await fetch("https://api9001.duckdns.org/files/pdf-form-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filename: encodeURIComponent(filePath) }),
      });
      
      if (!formDataResponse.ok) {
        throw new Error("Erro ao carregar dados do PDF");
      }
      
      const formData = await formDataResponse.json();
      
      // Determina o tipo de template baseado no nome do arquivo
      const fileName = file.name;
      const isTemplate2 = /^\d/.test(fileName) && !/^\d{2}/.test(fileName); // Arquivos que começam com 1 dígito são Template 2
      
      // 2. Processa os dados para o formato das tabelas
      const { generateNonEditablePdf, generateNonEditablePdfTemplate2 } = await import("../../utils/pdfGenerate");
      
      if (isTemplate2) {
        // Template 2 - Processar dados específicos do template 2
        
        // Extrai dados específicos do Template 2
        let donoProcesso = formData['dono_processo'] || '';
        let objetivoProcesso = formData['objetivo_processo'] || '';
        let servicosEntrada = formData['servicos_entrada'] || '';
        let servicoSaida = formData['servico_saida'] || '';
        
        // Processa atividades (atividades_r*_c*)
        const atividadesRows = {};
        const indicadoresData = [];
        
        Object.keys(formData).forEach(key => {
          if (key.startsWith('atividades_r')) {
            const match = key.match(/atividades_r(\d+)_c(\d+)/);
            if (match) {
              const row = parseInt(match[1]) - 1; // -1 porque começa em r1
              const col = parseInt(match[2]) - 1; // -1 porque começa em c1
              if (!atividadesRows[row]) atividadesRows[row] = [];
              atividadesRows[row][col] = formData[key] || '';
            }
          } else if (key.startsWith('indicadores_r')) {
            const match = key.match(/indicadores_r(\d+)/);
            if (match) {
              const index = parseInt(match[1]) - 1; // -1 porque começa em r1
              indicadoresData[index] = formData[key] || '';
            }
          }
        });
        
        // Converte atividades em array ordenado
        const atividades = [];
        for (let i = 0; i < 10; i++) { // Máximo de 10 linhas
          if (atividadesRows[i]) {
            // Garante que cada linha tenha exatamente 6 colunas (Template 2)
            const row = atividadesRows[i];
            while (row.length < 6) {
              row.push('');
            }
            atividades.push(row);
          }
        }
        
        // Garante que há pelo menos uma linha
        if (atividades.length === 0) {
          atividades.push(['', '', '', '', '', '']);
        }
        
        // Garante que há pelo menos um indicador
        if (indicadoresData.length === 0) {
          indicadoresData.push('');
        }
        
        // 3. Gera o PDF não editável do Template 2
        const nonEditablePdfBytes = await generateNonEditablePdfTemplate2(
          atividades, 
          donoProcesso, 
          objetivoProcesso, 
          indicadoresData, 
          servicosEntrada, 
          servicoSaida,
          "Procedimento",
          imageBytes,
          filePath
        );
        
        // 4. Abre o preview
        const blob = new Blob([nonEditablePdfBytes], { type: "application/pdf" });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank");
        
      } else {
        // Template 1 - Procedimento existente
        // Converte os dados do formulário em formato de tabela
        // Tabela principal (table2_*)
        const mainTableData = [];
        const obsTableData = [];
        
        // Extrai dados da tabela principal
        const mainRows = {};
        const obsRows = {};
        
        Object.keys(formData).forEach(key => {
          if (key.startsWith('table2_r')) {
            const match = key.match(/table2_r(\d+)_c(\d+)/);
            if (match) {
              const row = parseInt(match[1]) - 2; // -2 porque começa em r2
              const col = parseInt(match[2]) - 1; // -1 porque começa em c1
              if (!mainRows[row]) mainRows[row] = [];
              mainRows[row][col] = formData[key] || '';
              
              // Debug para documentos associados e instruções
              if (col === 3 && formData[key]) {
                console.log(`📄 Documentos Associados linha ${row}:`, formData[key]);
              }
              if (col === 4 && formData[key]) {
                console.log(`📋 Instruções linha ${row}:`, formData[key]);
              }
            }
          } else if (key.startsWith('table1_r')) {
            const match = key.match(/table1_r(\d+)/);
            if (match) {
              const row = parseInt(match[1]) - 1; // -1 porque começa em r1
              obsRows[row] = [formData[key] || ''];
              
              // Debug para objetivos e outras seções
              if (row === 0 && formData[key]) {
                console.log('🎯 Objetivos encontrados:', formData[key]);
              }
              console.log(`📝 Seção ${row + 1}:`, formData[key]);
            }
          }
        });
        
        // Converte objetos em arrays ordenados
        for (let i = 0; i < 20; i++) { // Máximo de 20 linhas
          if (mainRows[i]) {
            // Garante que cada linha tenha exatamente 5 colunas
            const row = mainRows[i];
            while (row.length < 5) {
              row.push('');
            }
            mainTableData.push(row);
          }
        }
        
        for (let i = 0; i < 10; i++) { // Máximo de 10 linhas para observações
          if (obsRows[i]) {
            obsTableData.push(obsRows[i]);
          }
        }
        
        // Garante que há pelo menos uma linha de dados para evitar NaN
        if (mainTableData.length === 0) {
          mainTableData.push(['', '', '', '', '']);
        }
        
        if (obsTableData.length === 0) {
          obsTableData.push(['']);
        }
        
        // Headers do Template 1
        const headers = [
          'Fluxo\ndas Ações',
          'Descrição',
          'Responsável',
          'Documentos\nAssociados',
          'Instruções\nde Trabalho'
        ];
        
        // 3. Gera o PDF não editável do Template 1
        const nonEditablePdfBytes = await generateNonEditablePdf(
          mainTableData, 
          headers, 
          obsTableData, 
          "Procedimento", 
          imageBytes, 
          filePath
        );
        
        // 4. Abre o preview
        const blob = new Blob([nonEditablePdfBytes], { type: "application/pdf" });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank");
      }
      
    } catch (error) {
      console.error("Erro ao gerar preview:", error);
      alert("Erro ao gerar preview do PDF. Tente novamente.");
    }
  };

  return (
    <button onClick={handlePreviewClick}>
      <img 
        src={downloadIcon} 
        alt={currentPath.length > 1 ? "Download direto" : "Preview PDF"} 
        style={{ width: '16px', height: '16px' }} 
        title=" Download"
      />
    </button>
  );
};

export default PdfPreviewButton;
