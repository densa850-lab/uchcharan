#!/usr/bin/env node
import { normalize } from '../src/index.js';

const args = process.argv.slice(2);
const opts = { lang: 'hi' };
const text = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--lang' || a === '-l') opts.lang = args[++i];
  else if (a === '--explain') opts.explain = true;
  else if (a === '--no-spell') opts.spellAcronyms = false;
  else if (a === '--pairs') opts.vehicleDigits = 'pairs';
  else if (a === '--help' || a === '-h') {
    console.log('Usage: uchcharan [--lang hi|mr|en|auto] [--pairs] [--explain] [--no-spell] "text"\n       echo "text" | uchcharan --lang mr');
    process.exit(0);
  } else text.push(a);
}

const run = (input) => {
  const r = normalize(input, opts);
  if (opts.explain) {
    console.log(r.text);
    for (const c of r.changes) console.error(`  [${c.rule}] ${c.from} → ${c.to}`);
  } else console.log(r);
};

if (text.length) run(text.join(' '));
else {
  let buf = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (d) => (buf += d));
  process.stdin.on('end', () => run(buf));
}
