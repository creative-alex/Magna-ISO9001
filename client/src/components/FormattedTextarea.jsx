import React from 'react';
import { parseFormattedText } from '../utils/textFormatting';

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
  if (!isEditable) {
    return (
      <div
        className={`min-h-[50px] p-2 bg-[#f5f5f5] border border-[#e0e0e0] whitespace-pre-wrap break-words ${className}`}
        dangerouslySetInnerHTML={{ __html: parseFormattedText(value || '') }}
        style={rest.style}
      />
    );
  }

  return (
    <textarea
      ref={textAreaRef}
      className={`w-full min-h-[50px] p-2 border border-[#ddd] rounded font-[inherit] text-[inherit] resize-y bg-white ${className}`}
      value={value}
      onChange={onChange}
      onInput={onInput}
      placeholder={placeholder}
      {...rest}
      style={rest.style}
    />
  );
}
