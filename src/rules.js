// Ordered normalization rules. Order matters: specific patterns (currency,
// dates, phones) run before generic number reading.
import { intToWords, digitsToWords, numberStringToWords, yearToWords, amountWords } from './numbers.js';

// Number with Western (1,500,000) or Indian (15,00,000) commas, optional decimals.
const NUM = String.raw`(?:\d{1,3}(?:,\d{3})+(?!\d)|\d{1,2}(?:,\d{2})+,\d{3}(?!\d)|\d+)(?:\.\d+)?`;
const DEV = String.raw`\u0900-\u097F`;
const MONTHS = String.raw`Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?`;
const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const MULTIPLIER = {
  lakh: 'lakh', lakhs: 'lakh', lac: 'lakh', lacs: 'lakh', 'लाख': 'lakh',
  crore: 'crore', crores: 'crore', cr: 'crore', ['करोड़'.normalize('NFC')]: 'crore', 'करोड': 'crore', 'कोटी': 'crore',
  k: 'thousand', thousand: 'thousand', ['हज़ार'.normalize('NFC')]: 'thousand', 'हजार': 'thousand',
};
const MULT_RE = String.raw`lakhs?|lacs?|crores?|cr\.?|k|K|thousand|लाख|करोड़|करोड|कोटी|हज़ार|हजार`.normalize('NFC');
const PLAIN_MULT_RE = String.raw`lakhs?|lacs?|crores?|cr\.?|लाख|करोड़|करोड|कोटी`.normalize('NFC');

const re = (src, flags = 'gu') => new RegExp(src.normalize('NFC'), flags);
const multKey = (s) => MULTIPLIER[s.replace(/\.$/, '').toLowerCase()] || MULTIPLIER[s];

export function buildRules(L, opts) {
  const words = (n) => intToWords(n, L);
  const num = (s) => numberStringToWords(s, L);
  const date = (d, m, y) => {
    d = Number(d); m = Number(m);
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    const parts = [words(d), L.months[m - 1]];
    if (y) parts.push(yearToWords(String(y).length === 2 ? 2000 + Number(y) : y, L));
    return parts.join(' ');
  };

  return [
    {
      name: 'currency',
      re: re(String.raw`(?<![A-Za-z])(?:₹|Rs\.?|INR|रु\.?|रू\.?)\s*(${NUM})(?:\s*(${MULT_RE})(?![A-Za-z${DEV}]))?(?:\s*\/-)?`),
      fn: (m, [amount, mult]) => {
        if (mult) return `${amountWords(amount, L)} ${L.scales[multKey(mult)]} ${L.rupee(2)}`;
        const [int, frac] = amount.replace(/,/g, '').split('.');
        const rupees = Number(int);
        let out = `${words(rupees)} ${L.rupee(rupees)}`;
        const paise = frac ? Number(frac.slice(0, 2).padEnd(2, '0')) : 0;
        if (paise) out += ` ${words(paise)} ${L.paise(paise)}`;
        return out;
      },
    },
    ...L.abbreviations.map(([pat, rep]) => ({
      name: 'abbreviation',
      re: re(String.raw`(?<![A-Za-z${DEV}])${pat}(?![A-Za-z])`),
      fn: () => rep,
    })),
    { name: 'number-sign', re: re(String.raw`(?<![A-Za-z])(?:No\.|#)\s*(?=\d)`), fn: () => `${L.number} ` },
    {
      name: 'date',
      re: re(String.raw`(?<!\d)(\d{1,2})([\/.\-])(\d{1,2})\2(\d{4}|\d{2})(?!\d)`),
      fn: (m, [d, , mo, y]) => date(d, mo, y) ?? m,
    },
    {
      name: 'date',
      re: re(String.raw`(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)`),
      fn: (m, [y, mo, d]) => date(d, mo, y) ?? m,
    },
    {
      name: 'date',
      re: re(String.raw`(?<!\d)(\d{1,2})(?:st|nd|rd|th)?\s+(${MONTHS})\.?(?:,?\s+(\d{4}))?(?![A-Za-z])`),
      fn: (m, [d, mon, y]) => date(d, MONTH_KEYS.indexOf(mon.slice(0, 3).toLowerCase()) + 1, y) ?? m,
    },
    {
      name: 'date',
      re: re(String.raw`(?<![A-Za-z])(${MONTHS})\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?(?!\d)`),
      fn: (m, [mon, d, y]) => date(d, MONTH_KEYS.indexOf(mon.slice(0, 3).toLowerCase()) + 1, y) ?? m,
    },
    {
      name: 'time',
      re: re(String.raw`(?<![\d:])([01]?\d|2[0-3]):([0-5]\d)(?:\s*([AaPp])\.?\s?[Mm]\.?(?![A-Za-z]))?(?![\d:])`),
      fn: (m, [h, min, ap]) => {
        let h24 = Number(h);
        if (ap) {
          if (ap.toLowerCase() === 'p' && h24 < 12) h24 += 12;
          if (ap.toLowerCase() === 'a' && h24 === 12) h24 = 0;
        }
        return L.time(h24, Number(min), Boolean(ap) || h24 > 12 || h24 === 0, words);
      },
    },
    {
      name: 'phone',
      re: re(String.raw`(?<![\d+])(\+91[\s-]?|0)?([6-9]\d{4})[\s-]?(\d{5})(?!\d)`),
      fn: (m, [prefix, a, b]) => {
        let pre = '';
        if (prefix && prefix.startsWith('+')) pre = `${L.plus} ${digitsToWords('91', L)} `;
        else if (prefix) pre = `${L.zero} `;
        return `${pre}${digitsToWords(a, L)}, ${digitsToWords(b, L)}`;
      },
    },
    {
      // PNR, account numbers, OTPs, PIN codes: read digit by digit.
      name: 'digit-run',
      re: re(String.raw`(?<!\d|\d[.,])\d{${opts.digitRunMin},}(?!\d|[.,]\d)`),
      fn: (m) => digitsToWords(m, L),
    },
    {
      name: 'year',
      re: re(String.raw`(?<![A-Za-z${DEV}])(सन्|सन|साल|वर्ष|year|in|In)(\s+)(1[1-9]\d\d)(?![\d,.]?\d)`),
      fn: (m, [w, sp, y]) => `${w}${sp}${yearToWords(y, L)}`,
    },
    {
      name: 'year',
      re: re(String.raw`(?<![\d.,])(1[1-9]\d\d)(?=\s+(?:में|साल|साली|मध्ये)(?![${DEV}]))`),
      fn: (m, [y]) => yearToWords(y, L),
    },
    {
      name: 'negative',
      re: re(String.raw`(?<![\w\d${DEV}])-(?=\d)`),
      fn: () => `${L.minus} `,
    },
    {
      name: 'percent',
      re: re(String.raw`(?<![\d.])(${NUM})\s*%`),
      fn: (m, [n]) => `${num(n)} ${L.percent}`,
    },
    {
      name: 'unit',
      re: re(String.raw`(?<![\d.])(${NUM})\s*(km\/h|kmph|km|Km|KM|kg|Kg|KG|gm|g|cm|mm|ml|mL|GB|MB|TB|°C|°F)(?![A-Za-z])`),
      fn: (m, [n, u]) => `${num(n)} ${L.units[u.toLowerCase()]}`,
    },
    {
      name: 'multiplier',
      re: re(String.raw`(?<![\d.])(${NUM})\s*(${PLAIN_MULT_RE})(?![A-Za-z${DEV}])`),
      fn: (m, [n, mult]) => `${amountWords(n, L)} ${L.scales[multKey(mult)]}`,
    },
    {
      name: 'ordinal',
      re: re(String.raw`(?<![\d.])(\d+)(st|nd|rd|th)(?![A-Za-z])`),
      fn: (m, [n]) => L.ordinal(Number(n), words),
    },
    {
      name: 'operator',
      re: re(String.raw`(?<=\d)\s*([+×=])\s*(?=\d)`),
      fn: (m, [op]) => ` ${{ '+': L.plus, '×': L.times, '=': L.equals }[op]} `,
    },
    {
      name: 'range',
      re: re(String.raw`(?<![\d.])(${NUM})\s*[-–]\s*(${NUM})(?!\d)`),
      fn: (m, [a, b]) => `${num(a)} ${L.to} ${num(b)}`,
    },
    {
      name: 'number',
      re: re(String.raw`(?<![\d.])(${NUM})`),
      fn: (m, [n]) => num(n),
    },
    {
      name: 'acronym',
      re: re(String.raw`(?<![A-Za-z])([A-Z]{2,6}|WiFi)(?![A-Za-z])`),
      fn: (m) => {
        if (L.wordAcronyms[m]) return L.wordAcronyms[m];
        if (!opts.spellAcronyms) return m;
        return [...m].map((c) => L.letters[c] ?? c).join(' ');
      },
    },
    { name: 'symbol', re: re(String.raw`\s&\s`), fn: () => ` ${L.and} ` },
  ];
}
