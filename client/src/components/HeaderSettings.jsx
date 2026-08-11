import React, { useEffect } from 'react';
import './templates/styleTemplates.css';
import defaultLogo from '../icons/c_comenius_cor.png';

export default function HeaderSettings({ title, setTitle, imageFile, setImageFile }) {
  
  // Carregar imagem por defeito quando o componente monta
  useEffect(() => {
    if (!imageFile) {
      // Carregar a imagem SVG por defeito
      fetch(defaultLogo)
        .then(response => response.blob())
        .then(blob => {
          // Criar um File object a partir do blob
          const file = new File([blob], 'c_comenius_cor.svg', { type: 'image/svg+xml' });
          setImageFile(file);
        })
        .catch(error => {
          console.error('Erro ao carregar imagem por defeito:', error);
        });
    }
  }, [imageFile, setImageFile]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Verificar se é uma imagem válida
      if (file.type.startsWith('image/')) {
        setImageFile(file);
      } else {
        alert('Por favor, selecione um ficheiro de imagem válido (PNG, JPEG, etc.)');
      }
    }
  };

  const removeImage = () => {
    // Voltar à imagem por defeito em vez de remover
    fetch(defaultLogo)
      .then(response => response.blob())
      .then(blob => {
        const file = new File([blob], 'c_comenius_cor.svg', { type: 'image/svg+xml' });
        setImageFile(file);
      })
      .catch(error => {
        console.error('Erro ao voltar à imagem por defeito:', error);
        setImageFile(null);
      });
  };

  return (
    <div className="header-settings">
      <h3>Configurações do Cabeçalho</h3>
      
      {/* Campo para título */}
      <div className="form-group">
        <label htmlFor="pdf-title">Título do PDF:</label>
        <input
          id="pdf-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Procedimento 00"
          className="title-input"
        />
      </div>

      {/* Campo para imagem */}
      <div className="form-group">
        <label htmlFor="pdf-image">Logótipo/Imagem:</label>
        <div className="image-info">
          <span>📸 Imagem por defeito: Logótipo Cooperativa Comenius</span>
        </div>
        <input
          id="pdf-image"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="image-input"
          placeholder="Escolher outra imagem (opcional)"
        />
        
        {imageFile && (
          <div className="image-preview">
            <span>
              {imageFile.name === 'c_comenius_cor.svg' 
                ? '✅ Usando logótipo por defeito: ' + imageFile.name
                : '🖼️ Imagem personalizada: ' + imageFile.name
              }
            </span>
            {imageFile.name !== 'c_comenius_cor.svg' && (
              <button type="button" onClick={removeImage} className="remove-image-btn">
                Usar Defeito
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}