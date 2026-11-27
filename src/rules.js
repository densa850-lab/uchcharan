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

// Indian state / UT codes used on vehicle number plates.
const STATES = 'AN|AP|AR|AS|BR|CG|CH|DD|DL|DN|GA|GJ|HP|HR|JH|JK|KA|KL|LA|LD|MH|ML|MN|MP|MZ|NL|OD|OR|PB|PY|RJ|SK|TN|TR|TS|UA|UK|UP|WB';
// UPI handle suffix pieces that are spelled letter by letter (bank / app short names).
const UPI_SPELL = ['icici', 'sbi', 'hdfc', 'idfc', 'ybl', 'ibl', 'axl', 'apl', 'yapl', 'upi', 'kbl', 'kmbl', 'pt', 'pnb', 'boi', 'bob', 'rbl', 'fbl', 'hsbc', 'au', 'idbi', 'uco', 'cnrb', 'barodampay', 'waaxis', 'wahdfc', 'wasbi', 'waicici'];
// Spoken whole: names that are not abbreviations.
const UPI_WORDS = ['ok', 'axis', 'bank', 'yes', 'paytm', 'kotak', 'airtel', 'jio', 'jupiter', 'freecharge', 'slice', 'federal', 'indus'];
const UPI_SPLIT = { barodampay: ['baroda', 'mpay'], waaxis: ['wa', 'axis'], wahdfc: ['wa', 'hdfc'], wasbi: ['wa', 'sbi'], waicici: ['wa', 'icici'] };

export function buildRules(L, opts) {
  const words = (n) => intToWords(n, L);
  const spell = (str) => [...str.toUpperCase()].map((c) => L.letters[c] ?? c).join(' ');
  const dayWord = (d) => (L.day ? L.day(d, words) : words(d));

  // "okicici" → ["ok", "icici"]; null when the suffix is not made of known pieces.
  const pieces = [...UPI_SPELL.filter((p) => !UPI_SPLIT[p]), ...UPI_WORDS].sort((a, b) => b.length - a.length);
  const splitSuffix = (suf) => {
    if (suf === '') return [];
    for (const p of pieces) {
      if (!suf.startsWith(p)) continue;
      const rest = splitSuffix(suf.slice(p.length));
      if (rest) return [p, ...rest];
    }
    return null;
  };
  const upiPiece = (p) => (UPI_WORDS.includes(p) ? L.upiTokens[p] : spell(p));
  const handlePart = (part) =>
    part.split(/([._-])/).filter(Boolean).map((seg) => {
      if (seg === '.') return L.dot;
      if (seg === '_') return L.underscore;
      if (seg === '-') return L.dash;
      return seg.split(/(\d+)/).filter(Boolean).map((run) => {
        if (/^\d+$/.test(run)) return digitsToWords(run, L);
        // Short or vowel-less runs ("rk", "xyz") are spelled; names ("densa") stay a word.
        if (run.length <= 3 || !/[aeiouy]/i.test(run)) return spell(run);
        return run.toLowerCase();
      }).join(' ');
    }).join(' ');

  const PERIOD = L.periodWords.length
    ? String.raw`(?:(?<![${DEV}])(${L.periodWords.join('|')})(\s+(?:के\s+|को\s+)?))?`
    : '()()';
  const timeFn = (pw, psp, h, min, ap, suffix, until) => {
    let h24 = Number(h);
    if (ap) {
      if (ap.toLowerCase() === 'p' && h24 < 12) h24 += 12;
      if (ap.toLowerCase() === 'a' && h24 === 12) h24 = 0;
    }
    // If the text already says शाम / संध्याकाळी, do not add the period word a second time.
    const showPeriod = !pw && (Boolean(ap) || h24 > 12 || h24 === 0);
    let out = L.time(h24, Number(min || 0), showPeriod, words);
    // Marathi "10:30 वाजता" means "at 10:30": दहा वाजून तीस मिनिटांनी.
    if (suffix === 'वाजता') out = out.replace(/मिनिटे?$/u, 'मिनिटांनी');
    if (until) {
      // "7:00 PM पर्यंत" → सात वाजेपर्यंत
      if (L.code === 'mr') out = out.replace(/वाजता$/u, 'वाजेपर्यंत').replace(/(मिनिटे?|मिनिटांनी)$/u, 'मिनिटांपर्यंत');
      else out += until;
    }
    return pw ? `${pw}${psp}${out}` : out;
  };
  const num = (s) => numberStringToWords(s, L);
  const date = (d, m, y) => {
    d = Number(d); m = Number(m);
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    const parts = [dayWord(d), L.months[m - 1]];
    if (y) parts.push(yearToWords(String(y).length === 2 ? 2000 + Number(y) : y, L));
    return parts.join(' ');
  };

  const plateDigits = (num) => {
    if (opts.vehicleDigits !== 'pairs' || num.length !== 4) return digitsToWords(num, L);
    return [num.slice(0, 2), num.slice(2)].map((p) => (p.startsWith('0') ? digitsToWords(p, L) : words(Number(p)))).join(' ');
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
        if (paise) out += `${L.paiseJoin ? ` ${L.paiseJoin}` : ''} ${words(paise)} ${L.paise(paise)}`;
        return out;
      },
    },
    ...L.abbreviations.map(([pat, rep]) => ({
      name: 'abbreviation',
      re: re(String.raw`(?<![A-Za-z${DEV}])${pat}(?![A-Za-z])`),
      fn: () => rep,
    })),
    {
      // UPI IDs: densa@okicici → "densa ऐट ओके आई सी आई सी आई". Emails (x@gmail.com) are left alone.
      name: 'upi',
      re: re(String.raw`(?<![A-Za-z0-9._\-@])([A-Za-z0-9][A-Za-z0-9._\-]{1,48})@([A-Za-z]{2,24})(?![A-Za-z0-9@]|\.[A-Za-z])`),
      fn: (m, [handle, suffix], _L, input) => {
        const known = splitSuffix(suffix.toLowerCase());
        const upiContext = /UPI|यूपीआई|यूपीआय/i.test(input);
        if (!known && !upiContext) return m;
        const suf = known
          ? known.flatMap((p) => UPI_SPLIT[p] ?? [p]).map((p) => (p === 'baroda' ? handlePart(p) : p === 'mpay' ? `${spell('m')} pay` : upiPiece(p))).join(' ')
          : handlePart(suffix);
        return `${handlePart(handle)} ${L.at} ${suf}`;
      },
    },
    {
      // Vehicle registration: MH15AB1234 / MH 15 AB 1234 / MH-15-AB-1234.
      // Letters spelled, district as a number (leading zero read as digits), last digits one by one
      // (or in pairs with { vehicleDigits: 'pairs' }).
      name: 'vehicle',
      re: re(String.raw`(?<![A-Za-z0-9])(${STATES})[\s-]?(\d{1,2})[\s-]?([A-Z]{1,3})[\s-]?(\d{1,4})(?![A-Za-z0-9])`, 'g'),
      fn: (m, [st, dist, series, num]) => {
        const d = dist.startsWith('0') ? digitsToWords(dist, L) : words(Number(dist));
        return `${spell(st)} ${d} ${spell(series)} ${plateDigits(num)}`;
      },
    },
    {
      // Bharat series: 22 BH 1234 AA
      name: 'vehicle',
      re: re(String.raw`(?<![A-Za-z0-9])(\d{2})[\s-]?BH[\s-]?(\d{4})[\s-]?([A-Z]{1,2})(?![A-Za-z0-9])`, 'g'),
      fn: (m, [yy, num, series]) => `${words(Number(yy))} ${spell('BH')} ${plateDigits(num)} ${spell(series)}`,
    },
    {
      // One capital letter + a short number, as in error codes and seat numbers: E4 → ई चार, A12 → ए बारह.
      name: 'letter-code',
      re: re(String.raw`(?<![A-Za-z0-9])([A-Z])-?(\d{1,3})(?![A-Za-z0-9]|[.,]\d)`),
      fn: (m, [c, d]) => `${spell(c)} ${d.length <= 2 && !d.startsWith('0') ? words(Number(d)) : digitsToWords(d, L)}`,
    },
    {
      // Indian Railways announces train numbers digit by digit: "गाड़ी संख्या एक दो नौ पाँच एक".
      name: 'train',
      re: re(String.raw`(?<![A-Za-z${DEV}])(trains?|Trains?|TRAIN|ट्रेन|गाड़ी|गाडी|रेलगाड़ी|रेलगाडी|एक्सप्रेस|[Ee]xpress)(\s*(?:no\.?|No\.?|number|Number|नंबर|नं\.|क्रमांक|क्र\.|संख्या|#)?\s*:?\s*)(\d{5})(?![\d.,]\d|\d)`),
      fn: (m, [k, sep, d]) => `${k}${sep.replace(/(?:No|no)\.?|#/, L.number)}${digitsToWords(d, L)}`,
    },
    {
      // A number right after OTP / PIN / PNR / CVV / code is always read digit by digit,
      // even when it is short (a 4-digit OTP must not become "four thousand ...").
      name: 'code',
      re: re(String.raw`(?<![A-Za-z${DEV}])(OTP|[Oo]tp|MPIN|TPIN|UPI PIN|PIN|PNR|CVV|ओटीपी|पिन|सत्यापन कोड|कोड|[Pp]asscode|[Vv]erification code|[Ss]ecurity code|[Cc]ode|[Oo]ne[- ]time password)((?:\s+(?:for|to|of)\s+[A-Za-z]+)?\s*(?:[:\-]|is|no\.?|number|नंबर|क्रमांक)?\s*:?\s*)(\d{3,})(?![\d.,]\d|\d)`),
      fn: (m, [k, sep, d]) => `${k}${sep}${digitsToWords(d, L)}`,
    },
    {
      // "4821 is your OTP" / "482913 हा तुमचा OTP आहे"
      name: 'code',
      re: re(String.raw`(?<![\d.,])(\d{4,8})(?=\s+(?:is your|is the|आपका|आपकी|यह आपका|ये आपका|हा तुमचा|तुमचा|हा)\s+(?:OTP|otp|one[- ]time password|verification code|code|ओटीपी|कोड)(?![A-Za-z]))`),
      fn: (m, [d]) => digitsToWords(d, L),
    },
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
      re: re(String.raw`${PERIOD}(?<![\d:])([01]?\d|2[0-3]):([0-5]\d)(?:\s*([AaPp])(?:\.\s?[Mm]\.?|\s?[Mm])(?![A-Za-z]))?(?![\d:])(?:\s*(बजे|वाजता|वाजले)(?![${DEV}]))?(\s*पर्यंत)?`),
      // A trailing बजे / वाजता is dropped: the spoken time already ends in its own word.
      fn: (m, [pw, psp, h, min, ap, suffix, until]) => timeFn(pw, psp, h, min, ap, suffix, until),
    },
    {
      // "7 PM", "शाम 7 PM"
      name: 'time',
      re: re(String.raw`${PERIOD}(?<![\d:.,])(1[0-2]|0?[1-9])\s*([AaPp])(?:\.\s?[Mm]\.?|\s?[Mm])(?![A-Za-z])(?:\s*(बजे|वाजता)(?![${DEV}]))?(\s*पर्यंत)?`),
      fn: (m, [pw, psp, h, ap, suffix, until]) => timeFn(pw, psp, h, 0, ap, suffix, until),
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
