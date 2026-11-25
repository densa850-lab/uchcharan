# uchcharan (उच्चारण)

**Make any TTS speak Indian text correctly.**

Voice agents, IVRs and audiobook tools break on Indian text: `₹2,500` comes out as "rupee two comma five hundred", `PNR 4521879630` is read as one giant number, `₹2.5 crore` loses the "ढाई". uchcharan is a small, vendor-neutral layer you put **in front of any TTS** (ElevenLabs, Sarvam, Google, Azure, Polly, open-source models) so the text is already in spoken form.

```
BEFORE: इस प्लॉट की कीमत ₹2.5 crore है, GST 18% अलग से।
AFTER : इस प्लॉट की कीमत ढाई करोड़ रुपये है, जी एस टी अठारह प्रतिशत अलग से।

BEFORE: तुमचा OTP 482913 आहे. तो 10 मिनिटांत वापरा.
AFTER : तुमचा ओ टी पी चार आठ दोन नऊ एक तीन आहे. तो दहा मिनिटांत वापरा.
```

Zero dependencies. Pure rules, so it adds well under a millisecond, not a model round-trip.

## Install

```bash
npm install uchcharan
```

## Use

```js
import { normalize } from 'uchcharan';

normalize('आपका ₹2,500 का EMI 05/12/2026 को due है।');
// → 'आपका दो हज़ार पाँच सौ रुपये का ई एम आई पाँच दिसंबर दो हज़ार छब्बीस को due है।'

normalize('₹1.5 lakh पासून, दुकान 7:00 PM पर्यंत', { lang: 'mr' });
// → 'दीड लाख रुपये पासून, दुकान संध्याकाळी सात वाजता पर्यंत'

// See exactly what changed (useful for debugging voice agents)
normalize('₹500 at 10:30', { explain: true });
// → { text: '...', changes: [{ rule: 'currency', from: '₹500', to: 'पाँच सौ रुपये' }, ...] }
```

CLI:

```bash
npx uchcharan --lang mr "₹2.5 कोटी 25 Nov 2026"
echo "PNR 4521879630" | npx uchcharan --explain
```

### Options

| option | default | meaning |
|---|---|---|
| `lang` | `'hi'` | `'hi'` Hindi or `'mr'` Marathi |
| `spellAcronyms` | `true` | `GST` → `जी एस टी`. Known word-acronyms (`ISRO` → `इसरो`) are always spoken as words |
| `digitRunMin` | `6` | digit strings this long (PNR, OTP, account, PIN) are read digit by digit |
| `explain` | `false` | return `{ text, changes }` instead of a string |

## What it handles (v0.1)

| Input | Hindi | Marathi |
|---|---|---|
| `₹2,500` / `Rs. 2,500.50` / `₹1,50,000/-` | दो हज़ार पाँच सौ रुपये (पचास पैसे) | दोन हजार पाचशे रुपये |
| `₹2.5 crore`, `₹1.5 lakh`, `₹3.5 लाख` | ढाई करोड़ / डेढ़ लाख / साढ़े तीन लाख रुपये | अडीच कोटी / दीड लाख |
| Indian & Western commas, decimals | लाख / करोड़ system | लाख / कोटी system |
| `25/11/2026`, `2026-11-25`, `25 Nov 2026` | पच्चीस नवंबर दो हज़ार छब्बीस | पंचवीस नोव्हेंबर दोन हजार सव्वीस |
| `सन् 1998 में` / `1998 मध्ये` | उन्नीस सौ अट्ठानवे | एकोणीसशे अठ्ठ्याण्णव |
| `10:30`, `5:00 pm`, `14:15` | दस बजकर तीस मिनट / शाम पाँच बजे | दहा वाजून तीस मिनिटे / संध्याकाळी पाच वाजता |
| `+91 98765 43210` | digit by digit, with a pause in the middle | same |
| PNR / OTP / PIN / account numbers | digit by digit | digit by digit |
| `18%`, `5 km`, `-5°C`, `2+2=4` | अठारह प्रतिशत, पाँच किलोमीटर, माइनस पाँच डिग्री सेल्सियस | अठरा टक्के, ... |
| `10-12`, `3rd`, `10वीं` | दस से बारह, तीसरा, दसवीं | दहा ते बारा, तिसरा |
| `Dr.`, `Smt.`, `No. 5`, `etc.` | डॉक्टर, श्रीमती, नंबर पाँच, वगैरह | डॉक्टर, श्रीमती, नंबर पाच, वगैरे |
| `GST`, `EMI`, `ISRO`, `AIIMS` | जी एस टी, ई एम आई, इसरो, एम्स | जी एस टी, ई एम आय, इस्रो, एम्स |
| Devanagari digits `२५` | पच्चीस | पंचवीस |

## Known limits

- It does not inflect for grammar. `7:00 PM पर्यंत` becomes `सात वाजता पर्यंत`, but a native speaker would say `सात वाजेपर्यंत`.
- A bare 10-digit number starting with 6–9 is treated as a phone number.
- A bare 6+ digit number with no commas (`100000`) is read digit by digit. Write `1,00,000` for amounts.
- Hinglish and Romanized Hindi ("aapka order") are not transliterated yet.

## Roadmap

- [x] Hosted HTTP API with a free tier: **https://uchcharan.dev**
- [ ] Gujarati, Tamil, Telugu, Bengali, Kannada
- [ ] Custom pronunciation dictionary for brand and place names (`Nashik`, `Paithani`)
- [ ] Plugins for ElevenLabs, Sarvam, Bolna and LiveKit pipelines
- [ ] SSML output (`<say-as>` and pauses)

Contributions are welcome, especially from native speakers checking number words.

## Hosted API (no setup)

Don't want to run it yourself? Use the hosted API at **https://uchcharan.dev**. Try it in the browser at https://huggingface.co/spaces/Densa850/uchcharan.

```bash
curl -X POST https://uchcharan.dev/v1/normalize \
  -H "content-type: application/json" -H "x-api-key: YOUR_KEY" \
  -d '{"text":"₹2.5 crore, PNR 4521879630","lang":"hi"}'
```

| Plan | Requests/day | Price |
|---|---|---|
| No key | 500 | free |
| Free key | 2,000 | free |
| Starter | 50,000 | ₹999/month |
| Pro | 500,000 + custom pronunciations | ₹4,999/month |

Get a free key or upgrade at **https://uchcharan.dev**. Need help adding it to your voice bot? Email support@tathyo.com.

## Support this project

If uchcharan saves you time, you can [sponsor its development on GitHub](https://github.com/sponsors/densa850-lab). Sponsorship pays for new languages and rules.

## License

MIT
