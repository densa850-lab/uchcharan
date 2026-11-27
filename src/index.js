import hi from './lang/hi.js';
import mr from './lang/mr.js';
import en from './lang/en.js';
import { buildRules } from './rules.js';
import { intToWords, numberStringToWords, yearToWords } from './numbers.js';

export const LANGUAGES = { hi, mr, en };

const DEFAULTS = { lang: 'hi', spellAcronyms: true, digitRunMin: 6, vehicleDigits: 'digits', explain: false };

const MARATHI_HINTS = /(?:^|[\s,.])(?:आहे|आहेत|आणि|मध्ये|तुमचा|तुमचे|तुमची|तुमच्या|नाही|करा|भरा|पर्यंत|आम्ही|होते|झाले|वाजता)(?=$|[\s,.?!।])/u;

/** Pick 'en' for mostly-Latin text, 'mr' when Marathi words appear, else 'hi'. */
export function detectLang(text) {
  const s = String(text ?? '');
  const latin = (s.match(/[A-Za-z]/g) || []).length;
  const dev = (s.match(/[\u0900-\u097F]/g) || []).length;
  if (latin > dev) return 'en';
  return MARATHI_HINTS.test(s.normalize('NFC')) ? 'mr' : 'hi';
}
const ruleCache = new Map();

function getLang(code) {
  const L = LANGUAGES[code];
  if (!L) throw new Error(`uchcharan: unsupported lang "${code}". Supported: ${Object.keys(LANGUAGES).join(', ')}`);
  return L;
}

/**
 * Normalize text so any TTS engine speaks it correctly in Hindi, Marathi or Indian English.
 * @param {string} text
 * @param {{lang?: 'hi'|'mr'|'en'|'auto', vehicleDigits?: 'digits'|'pairs', spellAcronyms?: boolean, digitRunMin?: number, explain?: boolean}} [options]
 * @returns {string | {text: string, changes: {rule: string, from: string, to: string}[]}}
 */
export function normalize(text, options = {}) {
  const opts = { ...DEFAULTS, ...options };
  if (opts.lang === 'auto') opts.lang = detectLang(text);
  const L = getLang(opts.lang);
  const key = `${opts.lang}|${opts.spellAcronyms}|${opts.digitRunMin}|${opts.vehicleDigits}`;
  if (!ruleCache.has(key)) ruleCache.set(key, buildRules(L, opts));

  // NFC + Devanagari digits (०-९) → ASCII so every rule sees one form.
  let out = String(text ?? '').normalize('NFC').replace(/[०-९]/g, (d) => String(d.charCodeAt(0) - 0x966));
  const changes = [];

  for (const rule of ruleCache.get(key)) {
    rule.re.lastIndex = 0;
    out = out.replace(rule.re, (...args) => {
      const match = args[0];
      const hasNamed = typeof args[args.length - 1] === 'object';
      const end = hasNamed ? -3 : -2;
      const offset = args[args.length + end];
      const input = args[args.length + end + 1];
      let res = rule.fn(match, args.slice(1, end), L, input);
      if (res === match) return match;
      // Keep words apart when a number was glued to Latin text ("COVID19").
      if (/[A-Za-z]/.test(input[offset - 1] ?? '')) res = ` ${res}`;
      if (/[A-Za-z0-9]/.test(input[offset + match.length] ?? '')) res = `${res} `;
      if (opts.explain) changes.push({ rule: rule.name, from: match, to: res.trim() });
      return res;
    });
  }

  out = out.replace(/[ \t]{2,}/g, ' ').replace(/ +([,.?!।])/g, '$1').trim();
  return opts.explain ? { text: out, changes } : out;
}

export const numberToWords = (n, lang = 'hi') => numberStringToWords(String(n), getLang(lang));
export const yearToSpoken = (y, lang = 'hi') => yearToWords(y, getLang(lang));
export { intToWords };
export default normalize;
