export interface ParsedCSV {
  headers: string[];
  rows: string[][];
  separator: string;
  encoding: string;
}

const KNOWN_SEPARATORS = [';', ',', '\t', '|'];

export async function parseCSVFile(file: File): Promise<ParsedCSV> {
  const { text, encoding } = await readFileWithEncoding(file);
  const separator = detectSeparator(text);
  let { headers, rows } = parseCSVText(text, separator);

  if (headers.length <= 1 && rows.length > 0) {
    const reSplit = tryReSplitSingleColumn(headers, rows);
    if (reSplit) {
      headers = reSplit.headers;
      rows = reSplit.rows;
    }
  }

  headers = headers.map(h => h.trim());

  console.log('[CSV Import] Delimitador detectado:', separator);
  console.log('[CSV Import] Encoding detectado:', encoding);
  console.log('[CSV Import] Quantidade de colunas:', headers.length);
  console.log('[CSV Import] Primeira linha interpretada:', headers.join(separator));
  console.log('[CSV Import] Cabeçalhos encontrados:', headers);

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
  const winText = new TextDecoder('windows-1252').decode(bytes);
  if (hasInvalidWindows1252(bytes)) {
    return { text: new TextDecoder('iso-8859-1').decode(bytes), encoding: 'ISO-8859-1' };
  }
  return { text: winText, encoding: 'ANSI (Windows-1252)' };
}

function hasInvalidWindows1252(bytes: Uint8Array): boolean {
  const undefinedBytes = [0x81, 0x8D, 0x8F, 0x90, 0x9D];
  for (let i = 0; i < bytes.length; i++) {
    if (undefinedBytes.includes(bytes[i])) return true;
  }
  return false;
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
  return detectSeparatorFromLine(firstLine);
}

function detectSeparatorFromLine(line: string): string {
  let inQuotes = false;
  const counts: Record<string, number> = { ';': 0, ',': 0, '\t': 0, '|': 0 };
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && ch in counts) counts[ch]++;
  }
  let best = ';';
  let bestCount = 0;
  for (const sep of KNOWN_SEPARATORS) {
    if (counts[sep] > bestCount) { best = sep; bestCount = counts[sep]; }
  }
  return bestCount > 0 ? best : ';';
}

export function parseCSVText(text: string, separator: string): { headers: string[]; rows: string[][] } {
  const allRows = parseRawRows(text, separator);
  if (allRows.length === 0) return { headers: [], rows: [] };
  const headers = allRows[0].map(h => h.trim());
  const dataRows = allRows.slice(1).filter(r => r.some(c => c.trim() !== ''));
  return { headers, rows: dataRows };
}

function tryReSplitSingleColumn(headers: string[], rows: string[][]): { headers: string[]; rows: string[][] } | null {
  const sample = headers.length === 1 ? headers[0] : (rows[0]?.[0] || '');
  if (!sample) return null;
  const innerSep = detectSeparatorFromLine(sample);
  if (!KNOWN_SEPARATORS.includes(innerSep)) return null;
  const parts = sample.split(innerSep);
  if (parts.length < 2) return null;

  console.log('[CSV Import] Linhas com aspas externas detectadas — re-dividindo com delimitador:', innerSep);

  const newHeaders = headers.length === 1
    ? sample.split(innerSep).map(h => h.trim())
    : headers;

  const newRows = rows.map(row => {
    if (row.length === 1) {
      const inner = row[0];
      return inner.split(innerSep);
    }
    return row;
  });

  return { headers: newHeaders, rows: newRows };
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
