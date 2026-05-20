import React from 'react';
import { parseFormattedText } from '../utils/textFormatting';
import './FormattedTextarea.css';

/**
 * Componente que usa textarea normal quando editando
 * e mostra formatação quando não está editando
 */
export default function FormattedTextarea({
  value,
  onChange,
  onInput,
  isEditable,
  placeholder,
  textAreaRef,
  className = '',
  ...rest
}) {
  // Se não está editável, mostra o texto formatado
  if (!isEditable) {
    return (
      <div 
        className={`formatted-display ${className}`}
        dangerouslySetInnerHTML={{ __html: parseFormattedText(value || '') }}
        style={{
          minHeight: '50px',
          padding: '8px',
          backgroundColor: '#f5f5f5',
          border: '1px solid #e0e0e0',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          ...rest.style
        }}
      />
    );
  }

  // Se está editável, usa textarea NORMAL
  return (
    <textarea
      ref={textAreaRef}
      className={`formatted-textarea ${className}`}
      value={value}
      onChange={onChange}
      onInput={onInput}
      placeholder={placeholder}
      {...rest}
      style={{
        width: '100%',
        minHeight: '50px',
        padding: '8px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontFamily: 'inherit',
        fontSize: 'inherit',
        resize: 'vertical',
        backgroundColor: 'white',
        ...rest.style
      }}
    />
  );
}
