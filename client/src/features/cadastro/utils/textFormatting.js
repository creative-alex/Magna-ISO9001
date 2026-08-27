/**
 * Converte texto com marcação simples para HTML formatado
 * Suporta:
 * - **texto** -> <strong>texto</strong> (bold)
 * - *texto* -> <em>texto</em> (itálico)
 * - __texto__ -> <u>texto</u> (sublinhado)
 */
export const parseFormattedText = (text) => {
  if (!text) return '';
  
  let formatted = text;
  
  // Converte **texto** para <strong>texto</strong>
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Converte *texto* para <em>texto</em>
  formatted = formatted.replace(/(?<!\*)\*(?!\*)(.+?)\*(?!\*)/g, '<em>$1</em>');
  
  // Converte __texto__ para <u>texto</u>
  formatted = formatted.replace(/__(.+?)__/g, '<u>$1</u>');
  
  // Converte quebras de linha para <br>
  formatted = formatted.split('\n').join('<br>');
  
  return formatted;
};

/**
 * Remove as tags HTML e volta para o formato markdown
 */
export const stripHtmlTags = (html) => {
  if (!html) return '';
  
  let text = html;
  
  // Converte <strong> para **
  text = text.replace(/<strong>(.+?)<\/strong>/g, '**$1**');
  
  // Converte <em> para *
  text = text.replace(/<em>(.+?)<\/em>/g, '*$1*');
  
  // Converte <u> para __
  text = text.replace(/<u>(.+?)<\/u>/g, '__$1__');
  
  // Converte <br> para quebra de linha
  text = text.replace(/<br\s*\/?>/g, '\n');
  
  return text;
};

/**
 * Renderiza texto formatado em React
 */
export const renderFormattedText = (text) => {
  const html = parseFormattedText(text);
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
};
