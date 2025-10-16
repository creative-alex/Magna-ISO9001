import React from 'react';
import { parseFormattedText } from '../utils/textFormatting';
import './FormattedTextarea.css';

/**
 * Component that displays formatted text or editable textarea
 * When editable: shows textarea with raw text
 * When not editable: shows formatted HTML with bold, italic, underline
 */
const FormattedTextarea = ({ 
  value = '', 
  onChange, 
  onInput,
  isEditable = false,
  className = '',
  placeholder = '',
  textAreaRef,
  style = {}
}) => {
  if (isEditable) {
    // When editable, render textarea with raw text
    return (
      <textarea
        ref={textAreaRef}
        className={className}
        value={value}
        onChange={onChange}
        onInput={onInput}
        placeholder={placeholder}
        style={style}
      />
    );
  }

  // When NOT editable, render formatted HTML
  return (
    <div 
      className={`formatted-display ${className}`}
      style={style}
      dangerouslySetInnerHTML={{ __html: parseFormattedText(value) }}
    />
  );
};

export default FormattedTextarea;