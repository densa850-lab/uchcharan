// Number → words in the Indian system (हज़ार, लाख, करोड़).

function below1000(n, L) {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts = [];
  if (h) parts.push(L.hundred(h, r));
  if (r) parts.push(L.ones[r]);
  return parts.join(' ');
}

function positive(n, L) {
  const parts = [];
  if (n >= 1e7) {
    // Indians say "एक हज़ार करोड़", not "दस अरब".
    parts.push(positive(Math.floor(n / 1e7), L), L.scales.crore);
    n %= 1e7;
  }
  const lakh = Math.floor(n / 1e5);
  n %= 1e5;
  const thousand = Math.floor(n / 1e3);
  n %= 1e3;
  if (lakh) parts.push(L.ones[lakh], L.scales.lakh);
  if (thousand) parts.push(L.ones[thousand], L.scales.thousand);
  if (n) parts.push(below1000(n, L));
  return parts.join(' ');
}

export function intToWords(n, L) {
  n = Number(n);
  if (!Number.isSafeInteger(n)) return digitsToWords(String(n), L);
  if (n === 0) return L.zero;
  if (n < 0) return `${L.minus} ${positive(-n, L)}`;
  return positive(n, L);
}

export function digitsToWords(str, L) {
  return [...String(str).replace(/\D/g, '')].map((d) => L.ones[Number(d)]).join(' ');
}

/** "2,500.75" → int words + point + each decimal digit. */
export function numberStringToWords(str, L) {
  const clean = String(str).replace(/,/g, '');
  const [int, frac] = clean.split('.');
  if (int.length > 15) return digitsToWords(clean, L);
  const intWords = intToWords(int, L);
  return frac ? `${intWords} ${L.point} ${digitsToWords(frac, L)}` : intWords;
}

/** 1998 → "उन्नीस सौ अट्ठानवे" / "एकोणीसशे अठ्ठ्याण्णव"; 2026 → normal reading. */
export function yearToWords(y, L) {
  y = Number(y);
  if (L.year) return L.year(y, (n) => intToWords(n, L));
  if (y >= 1100 && y <= 1999) {
    const c = Math.floor(y / 100);
    const r = y % 100;
    return r ? `${L.century(c)} ${L.ones[r]}` : L.century(c);
  }
  return intToWords(y, L);
}

/** Amounts before लाख/करोड़: 1.5 → डेढ़, 2.5 → ढाई, 3.5 → साढ़े तीन. */
export function amountWords(str, L) {
  const clean = String(str).replace(/,/g, '');
  const m = /^(\d+)\.50*$/.exec(clean);
  if (m) {
    const n = Number(m[1]);
    if (typeof L.half === 'function' && n >= 1) return L.half(n, (x) => intToWords(x, L));
    if (n === 1) return L.half[1];
    if (n === 2) return L.half[2];
    if (n > 2) return `${L.half.prefix} ${intToWords(n, L)}`;
  }
  return numberStringToWords(clean, L);
}
