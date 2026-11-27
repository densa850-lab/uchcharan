# Changelog

## 0.3.0 (28 Nov 2026)

Added
- English mode, `lang: 'en'`: Indian numbers in Indian English with no Hindi words mixed in ("one lakh twenty five thousand rupees", "two and a half lakh rupees", "twenty fifth November twenty twenty six", "five thirty P M").
- Auto language, `lang: 'auto'`: mostly-Latin text is read as English, text with Marathi words (आहे, आणि, ...) as Marathi, anything else as Hindi. The default stays `'hi'`. Exported as `detectLang()`.
- OTP and verification codes read digit by digit in Hindi, Marathi and English, including "Your OTP for login is 4821", "4821 is your OTP" and "हा तुमचा OTP".
- UPI IDs: `densa@okicici` → "densa ऐट ओके आई सी आई सी आई". Known suffix parts (ok, icici, sbi, hdfc, axis, bank, ybl, ibl, axl, apl, paytm, pt, yes, kotak and more) are spoken properly. Emails and unknown suffixes are left alone unless the text mentions UPI.
- Train numbers: a 5-digit number after ट्रेन / गाड़ी / train / express is read digit by digit, as Indian Railways announces it.
- Vehicle registrations: `MH15AB1234` → "एम एच पंद्रह ए बी एक दो तीन चार", plus the BH series. New option `vehicleDigits: 'pairs'` (CLI `--pairs`) reads the last digits in pairs ("बारह चौंतीस").
- Error and seat codes: `E4` → "ई चार", `A12` → "ए बारह".
- "7 PM" with no minutes is read as a time.

Fixed
- A time-of-day word already in the text is no longer repeated: "संध्याकाळी 7:00 PM" used to give "संध्याकाळी संध्याकाळी ...". Same for शाम, रात, सुबह, रात्री and 24-hour times.
- Marathi पर्यंत after a time joins it: "7:00 PM पर्यंत" → "सात वाजेपर्यंत".
- "5:30 pm." at the end of a sentence keeps its full stop.

Changed
- The Marathi README example now outputs "दुकान संध्याकाळी सात वाजेपर्यंत" (was "सात वाजता पर्यंत"). If you compared against the old output, update it.

## 0.2.3

- OTP digits after OTP / PIN / code; no double बजे / वाजता.
