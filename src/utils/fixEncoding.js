// Corrige nomes com mojibake (bytes UTF-8 lidos como Latin-1)
export function fixEncoding(str) {
  if (!str) return str;
  try {
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i) & 0xFF;
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return str;
  }
}
