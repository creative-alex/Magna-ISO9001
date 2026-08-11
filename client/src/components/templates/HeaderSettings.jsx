import React, { useState, useEffect } from 'react';

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
    <div className="w-full mb-[30px] p-5 bg-gray-50 rounded-lg border border-gray-200">
      <h3 className="m-0 mb-5 text-gray-600 text-[18px] font-semibold">Configurações do Cabeçalho</h3>

      <div className="mb-[15px]">
        <label htmlFor="pdf-title" className="block mb-[5px] font-medium text-gray-600 text-[14px]">
          Título do Documento:
        </label>
        <input
          id="pdf-title"
          type="text"
          value={currentTitle}
          onChange={handleTitleChange}
          placeholder="Título do documento"
          className="w-full px-3 py-2 border border-[#ced4da] rounded text-[14px] transition-all focus:outline-none focus:border-[#80bdff] focus:shadow-[0_0_0_0.2rem_rgba(0,123,255,0.25)]"
        />
      </div>

      <div className="mb-[15px]">
        <label htmlFor="pdf-image" className="block mb-[5px] font-medium text-gray-600 text-[14px]">
          Imagem/Logótipo (PNG ou JPEG apenas):
        </label>
        <input
          id="pdf-image"
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          onChange={handleImageChange}
          className="w-full px-3 py-2 border border-[#ced4da] rounded text-[14px] transition-all focus:outline-none focus:border-[#80bdff] focus:shadow-[0_0_0_0.2rem_rgba(0,123,255,0.25)]"
        />

        {currentImage && (
          <div className="mt-2.5 p-2.5 bg-gray-200 rounded flex justify-between items-center">
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

        <p className="mt-2 text-xs text-gray-500 italic">
          <strong>Nota:</strong> O logótipo da empresa é carregado automaticamente. Pode selecionar uma imagem diferente se necessário.
        </p>
      </div>
    </div>
  );
};

export default HeaderSettings;
