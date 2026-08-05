export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

export function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function parseDecimalBR(value: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function formatRFMask(value: string): string {
  const digits = value.replace(/\D/g, '');
  let result = '';
  for (let i = 0; i < Math.min(digits.length, 8); i++) {
    if (i === 3 || i === 6) result += '.';
    if (i === 7) result += ' ';
    result += digits[i];
  }
  return result;
}

export function formatRFFromNumber(num: number | string): string {
  const digits = String(num).replace(/\D/g, '').padStart(8, '0');
  return formatRFMask(digits);
}

export function generateCompetencias(startMM: number, startYYYY: number, endMM: number, endYYYY: number): string[] {
  const result: string[] = [];
  let mm = startMM;
  let yyyy = startYYYY;
  while (yyyy < endYYYY || (yyyy === endYYYY && mm <= endMM)) {
    result.push(`${String(mm).padStart(2, '0')}/${yyyy}`);
    mm++;
    if (mm > 12) { mm = 1; yyyy++; }
  }
  return result;
}

export function competToSortKey(compet: string): number {
  const parts = compet.split('/');
  if (parts.length === 3) {
    return parseInt(parts[2]) * 100 + parseInt(parts[1]);
  }
  const [mm, yyyy] = parts;
  return parseInt(yyyy) * 100 + parseInt(mm);
}

/** Convert mm/aaaa to 01/mm/aaaa (dd/mm/aaaa) */
export function convertDateMMYYYY(value: string): string {
  if (!value) return value;
  const trimmed = value.trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{1,2})\/(\d{4})$/);
  if (match) return `01/${match[1].padStart(2, '0')}/${match[2]}`;
  return value;
}

export function isMMYYYYFormat(value: string): boolean {
  return /^\d{1,2}\/\d{4}$/.test(value.trim());
}

/** Extract MM/YYYY from dd/mm/yyyy, mm/yyyy, or yyyy-mm-dd */
export function extractMMYYYY(value: string): string {
  if (!value) return value;
  const trimmed = value.trim();
  const match3 = trimmed.match(/^\d{1,2}\/(\d{1,2})\/(\d{4})$/);
  if (match3) return `${match3[1].padStart(2, '0')}/${match3[2]}`;
  const match2 = trimmed.match(/^(\d{1,2})\/(\d{4})$/);
  if (match2) return `${match2[1].padStart(2, '0')}/${match2[2]}`;
  const matchIso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (matchIso) return `${matchIso[2]}/${matchIso[1]}`;
  return value;
}

export function formatCompetAsDate(compet: string): string {
  const parts = compet.split('/');
  if (parts.length === 2) return `01/${parts[0].padStart(2, '0')}/${parts[1]}`;
  return compet;
}

/**
 * Given an array of index rows (compet + indice), returns a Map of compet -> indice.
 * Also computes the last available index competency.
 * Competencies after the last index competency use 1.000000 explicitly.
 */
export function buildIndexMap(indices: { compet: string; indice: number }[]): { map: Map<string, number>; lastCompetSortKey: number } {
  const map = new Map<string, number>();
  let lastCompetSortKey = 0;
  for (const idx of indices) {
    const c = extractMMYYYY(idx.compet);
    if (!c) continue;
    const sk = competToSortKey(c);
    if (sk > lastCompetSortKey) lastCompetSortKey = sk;
    map.set(c, idx.indice);
  }
  return { map, lastCompetSortKey };
}

/**
 * Returns the index factor for a given competency.
 * - If the competency exists in the index map, returns its value.
 * - If the competency is AFTER the last index competency, returns 1.000000.
 * - If no indices are loaded at all, returns 1.
 */
export function getFatorAtualizacao(compet: string, indexMap: Map<string, number>, lastCompetSortKey: number): number {
  const known = indexMap.get(compet);
  if (known !== undefined) return known;
  const sk = competToSortKey(compet);
  if (lastCompetSortKey > 0 && sk > lastCompetSortKey) return 1;
  return 1;
}

export function roundExcel(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
