// Indian English (en) language data for uchcharan.
// Numbers use the Indian system (thousand, lakh, crore), as Indians say them in English.
const units = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
// Words are kept apart with plain spaces (no hyphens), which every TTS reads cleanly.
const ones = Array.from({ length: 100 }, (_, n) =>
  n < 20 ? units[n] : n % 10 ? `${tens[Math.floor(n / 10)]} ${units[n % 10]}` : tens[n / 10]);

const ORD = { one: 'first', two: 'second', three: 'third', five: 'fifth', eight: 'eighth', nine: 'ninth', twelve: 'twelfth' };
function ordinalWord(w) {
  if (ORD[w]) return ORD[w];
  if (w.endsWith('ty')) return `${w.slice(0, -1)}ieth`;
  return `${w}th`;
}

function ordinal(n, words) {
  const w = words(n).split(' ');
  w.push(ordinalWord(w.pop()));
  return w.join(' ');
}

export default {
  code: 'en',
  name: 'English (India)',
  ones,
  zero: 'zero',
  point: 'point',
  minus: 'minus',
  plus: 'plus',
  times: 'times',
  equals: 'equals',
  to: 'to',
  and: 'and',
  number: 'number',
  percent: 'percent',
  at: 'at',
  dot: 'dot',
  underscore: 'underscore',
  dash: 'dash',
  scales: { thousand: 'thousand', lakh: 'lakh', crore: 'crore' },
  hundred: (h, rest) => (rest ? `${ones[h]} hundred and` : `${ones[h]} hundred`),
  century: (c) => `${ones[c]} hundred`,
  // 2.5 lakh → "two and a half lakh"
  half: (n, words) => (n === 1 ? 'one and a half' : `${words(n)} and a half`),
  rupee: (n) => (n === 1 ? 'rupee' : 'rupees'),
  paise: (n) => (n === 1 ? 'paisa' : 'paise'),
  paiseJoin: 'and',
  months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  // 25/11/2026 → "twenty fifth November twenty twenty six"
  day: (d, words) => ordinal(d, words),
  year(y, words) {
    if (y >= 2000 && y <= 2009) return words(y);
    if (y >= 1100 && y <= 2099 && y % 100 !== 0) {
      const r = y % 100;
      return `${ones[Math.floor(y / 100)]} ${r < 10 ? `oh ${ones[r]}` : ones[r]}`;
    }
    if (y >= 1100 && y <= 1999) return `${ones[y / 100]} hundred`;
    return words(y);
  },
  time(h24, m, showPeriod, words) {
    const h12 = h24 % 12 || 12;
    const ap = showPeriod ? ` ${h24 < 12 ? 'A M' : 'P M'}` : '';
    if (!m) return showPeriod ? `${words(h12)}${ap}` : `${words(h12)} o'clock`;
    return `${words(h12)} ${m < 10 ? `oh ${words(m)}` : words(m)}${ap}`;
  },
  ordinal,
  letters: Object.fromEntries([...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((c) => [c, c])),
  wordAcronyms: {
    ISRO: 'Isro', NASA: 'Nasa', AIIMS: 'Aims', NEET: 'Neet', OK: 'okay', SEBI: 'Sebi', NABARD: 'Nabard',
    BHIM: 'Bheem', COVID: 'Covid', PIN: 'pin', UNESCO: 'Unesco', NITI: 'Niti', WiFi: 'WiFi',
  },
  units: {
    'km/h': 'kilometres per hour', kmph: 'kilometres per hour', km: 'kilometres', kg: 'kilos', gm: 'grams', g: 'grams',
    cm: 'centimetres', mm: 'millimetres', ml: 'millilitres', gb: 'GB', mb: 'MB', tb: 'TB',
    '°c': 'degrees Celsius', '°f': 'degrees Fahrenheit',
  },
  abbreviations: [
    ['Dr\\.', 'Doctor'], ['Mr\\.', 'Mister'], ['Mrs\\.', 'Missus'], ['Smt\\.', 'Shrimati'],
    ['Prof\\.', 'Professor'], ['etc\\.', 'etcetera'], ['vs\\.?', 'versus'], ['approx\\.', 'approximately'],
    ['Ltd\\.', 'Limited'], ['Pvt\\.', 'Private'],
  ],
  periodWords: [],
  // UPI handle suffix pieces: spoken word, or null = spell the letters.
  upiTokens: {
    ok: 'okay', axis: 'axis', bank: 'bank', yes: 'yes', paytm: 'Paytm', kotak: 'Kotak', airtel: 'Airtel',
    jio: 'Jio', jupiter: 'Jupiter', freecharge: 'Freecharge', slice: 'Slice', federal: 'Federal', indus: 'Indus',
  },
};
