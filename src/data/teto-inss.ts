// Teto máximo do INSS (RGPS) — valores históricos de 07/1994 a 01/2015
// Fonte: Legislação previdenciária — Portarias interministeriais

interface TetoRange {
  from: string; // MM/YYYY
  to: string;   // MM/YYYY
  valor: number;
}

const TETO_RANGES: TetoRange[] = [
  { from: '07/1994', to: '04/1995', valor: 582.86 },
  { from: '05/1995', to: '04/1996', valor: 832.66 },
  { from: '05/1996', to: '05/1997', valor: 957.56 },
  { from: '06/1997', to: '05/1998', valor: 1031.87 },
  { from: '06/1998', to: '11/1998', valor: 1081.50 },
  { from: '12/1998', to: '05/1999', valor: 1200.00 },
  { from: '06/1999', to: '05/2000', valor: 1255.32 },
  { from: '06/2000', to: '05/2001', valor: 1328.25 },
  { from: '06/2001', to: '05/2002', valor: 1430.00 },
  { from: '06/2002', to: '05/2003', valor: 1561.56 },
  { from: '06/2003', to: '12/2003', valor: 1869.34 },
  { from: '01/2004', to: '04/2004', valor: 2400.00 },
  { from: '05/2004', to: '04/2005', valor: 2508.72 },
  { from: '05/2005', to: '03/2006', valor: 2668.15 },
  { from: '04/2006', to: '07/2006', valor: 2801.56 },
  { from: '08/2006', to: '03/2007', valor: 2801.82 },
  { from: '04/2007', to: '02/2008', valor: 2894.28 },
  { from: '03/2008', to: '01/2009', valor: 3038.99 },
  { from: '02/2009', to: '12/2009', valor: 3218.90 },
  { from: '01/2010', to: '05/2010', valor: 3416.54 },
  { from: '06/2010', to: '12/2010', valor: 3467.40 },
  { from: '01/2011', to: '06/2011', valor: 3689.66 },
  { from: '07/2011', to: '12/2011', valor: 3691.74 },
  { from: '01/2012', to: '12/2012', valor: 3916.20 },
  { from: '01/2013', to: '12/2013', valor: 4159.00 },
  { from: '01/2014', to: '12/2014', valor: 4390.24 },
  { from: '01/2015', to: '01/2015', valor: 4663.75 },
];

function parseCompet(compet: string): number {
  const [mm, yyyy] = compet.split('/');
  return parseInt(yyyy) * 100 + parseInt(mm);
}

export function getTetoINSS(compet: string): number | null {
  const val = parseCompet(compet);
  for (const range of TETO_RANGES) {
    if (val >= parseCompet(range.from) && val <= parseCompet(range.to)) {
      return range.valor;
    }
  }
  return null;
}

export function isInTetoRange(compet: string): boolean {
  const val = parseCompet(compet);
  return val >= parseCompet('07/1994') && val <= parseCompet('01/2015');
}
