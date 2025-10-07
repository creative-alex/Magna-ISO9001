import React, { useState, useEffect } from 'react';
import './styleTemplates.css';

// Importar a imagem PNG da empresa
import companyLogo from '../../icons/c_comenius_cor.png';

const HeaderSettings = ({ onTitleChange, onImageChange, title, imageFile }) => {
  const [currentTitle, setCurrentTitle] = useState(title || 'Procedimento');
  const [currentImage, setCurrentImage] = useState(null);

  // Carregar automaticamente o logótipo da empresa quando o componente monta
  useEffect(() => {
    const loadDefaultLogo = async () => {
      try {
        const response = await fetch(companyLogo);
        const blob = await response.blob();
        const file = new File([blob], 'c_comenius_cor.png', { type: 'image/png' });
        setCurrentImage(file);
        if (onImageChange) {
          onImageChange(file);
        }
        console.log('📷 Logótipo PNG carregado automaticamente:', file.name);
      } catch (error) {
        console.error('Erro ao carregar logótipo da empresa:', error);
      }
    };

    // Se não há imagem selecionada, carrega o logótipo padrão
    if (!imageFile) {
      loadDefaultLogo();
    } else {
      setCurrentImage(imageFile);
    }
  }, [imageFile, onImageChange]);

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setCurrentTitle(newTitle);
    if (onTitleChange) {
      onTitleChange(newTitle);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Verificar se é PNG ou JPEG
      if (file.type === 'image/png' || file.type === 'image/jpeg' || file.type === 'image/jpg') {
        setCurrentImage(file);
        if (onImageChange) {
          onImageChange(file);
        }
      } else {
        alert('Por favor, selecione apenas ficheiros PNG ou JPEG. SVG não é suportado para PDFs.');
      }
    }
  };

  return (
    <div className="header-settings">
      <h3>Configurações do Cabeçalho</h3>
      
      <div className="setting-group">
        <label htmlFor="pdf-title">Título do Documento:</label>
        <input
          id="pdf-title"
          type="text"
          value={currentTitle}
          onChange={handleTitleChange}
          placeholder="Título do documento"
          className="title-input"
        />
      </div>

      <div className="setting-group">
        <label htmlFor="pdf-image">Imagem/Logótipo (PNG ou JPEG apenas):</label>
        <input
          id="pdf-image"
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          onChange={handleImageChange}
          className="image-input"
        />
        
        {currentImage && (
          <div className="image-preview">
            <p>
              <strong>Ficheiro selecionado:</strong> {currentImage.name}
            </p>
            {currentImage.type.startsWith('image/') && (
              <img 
                src={URL.createObjectURL(currentImage)} 
                alt="Preview" 
              />
            )}
          </div>
        )}
        
        <p className="help-text">
          <strong>Nota:</strong> O logótipo da empresa é carregado automaticamente. Pode selecionar uma imagem diferente se necessário.
        </p>
      </div>
    </div>
  );
};

export default HeaderSettings;
