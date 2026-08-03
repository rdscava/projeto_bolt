export interface ParsedCSV {
  headers: string[];
  rows: string[][];
  separator: string;
  encoding: string;
}

export async function parseCSVFile(file: File): Promise<ParsedCSV> {
  const { text, encoding } = await readFileWithEncoding(file);
  const separator = detectSeparator(text);
  const { headers, rows } = parseCSVText(text, separator);
  return { headers, rows, separator, encoding };
}

async function readFileWithEncoding(file: File): Promise<{ text: string; encoding: string }> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return { text: new TextDecoder('utf-8').decode(bytes.slice(3)), encoding: 'UTF-8 (BOM)' };
  }
  if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return { text: new TextDecoder('utf-16le').decode(bytes.slice(2)), encoding: 'UTF-16 LE' };
  }
  if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
    return { text: new TextDecoder('utf-16be').decode(bytes.slice(2)), encoding: 'UTF-16 BE' };
  }
  if (isValidUTF8(bytes)) {
    return { text: new TextDecoder('utf-8').decode(bytes), encoding: 'UTF-8' };
  }
  return { text: new TextDecoder('windows-1252').decode(bytes), encoding: 'ANSI (Windows-1252)' };
}

function isValidUTF8(bytes: Uint8Array): boolean {
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i];
    if (b < 0x80) { i++; }
    else if (b >= 0xC2 && b < 0xE0) {
      if (i + 1 >= bytes.length || (bytes[i + 1] & 0xC0) !== 0x80) return false;
      i += 2;
    } else if (b >= 0xE0 && b < 0xF0) {
      if (i + 2 >= bytes.length || (bytes[i + 1] & 0xC0) !== 0x80 || (bytes[i + 2] & 0xC0) !== 0x80) return false;
      i += 3;
    } else if (b >= 0xF0 && b < 0xF8) {
      if (i + 3 >= bytes.length || (bytes[i + 1] & 0xC0) !== 0x80 || (bytes[i + 2] & 0xC0) !== 0x80 || (bytes[i + 3] & 0xC0) !== 0x80) return false;
      i += 4;
    } else { return false; }
  }
  return true;
}

export function detectSeparator(text: string): string {
  const firstLine = text.split(/\r?\n/).find(l => l.trim()) || '';
  let inQuotes = false;
  let semiCount = 0;
  let commaCount = 0;
  for (let i = 0; i < firstLine.length; i++) {
    const ch = firstLine[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes) {
      if (ch === ';') semiCount++;
      else if (ch === ',') commaCount++;
    }
  }
  if (semiCount >= commaCount && semiCount > 0) return ';';
  if (commaCount > 0) return ',';
  return ';';
}

export function parseCSVText(text: string, separator: string): { headers: string[]; rows: string[][] } {
  const allRows = parseRawRows(text, separator);
  if (allRows.length === 0) return { headers: [], rows: [] };
  const headers = allRows[0].map(h => h.trim());
  const dataRows = allRows.slice(1).filter(r => r.some(c => c.trim() !== ''));
  return { headers, rows: dataRows };
}

function parseRawRows(text: string, separator: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === separator) {
        current.push(field);
        field = '';
        i++;
      } else if (ch === '\r') {
        i++;
      } else if (ch === '\n') {
        current.push(field);
        rows.push(current);
        current = [];
        field = '';
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }
  if (field !== '' || current.length > 0) {
    current.push(field);
    rows.push(current);
  }
  return rows;
}

export function generateCSV(headers: string[], rows: (string | number)[][]): string {
  const escape = (val: string | number) => {
    const s = String(val ?? '');
    if (s.includes(';') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [headers.map(escape).join(';')];
  for (const row of rows) {
    lines.push(row.map(escape).join(';'));
  }
  return '\uFEFF' + lines.join('\r\n');
}

export function downloadCSV(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
