// Before/after demo for launch videos and the README.
import { normalize } from '../src/index.js';

const samples = [
  ['hi', 'नमस्ते! आपका ₹2,500 का EMI 05/12/2026 को due है।'],
  ['hi', 'आपकी ट्रेन का PNR 4521879630 है, गाड़ी 14:15 पर निकलेगी।'],
  ['hi', 'इस प्लॉट की कीमत ₹2.5 crore है, GST 18% अलग से।'],
  ['hi', 'Dr. Mehta से मिलने के लिए +91 98765 43210 पर कॉल करें।'],
  ['mr', 'तुमचे ₹1,250 चे वीज बिल 10/12/2026 पर्यंत भरा.'],
  ['mr', 'तुमचा OTP 482913 आहे. तो 10 मिनिटांत वापरा.'],
  ['mr', 'पैठणी साडी ₹1.5 lakh पासून, दुकान 7:00 PM पर्यंत उघडे.'],
];

for (const [lang, text] of samples) {
  console.log(`\n[${lang}] BEFORE: ${text}`);
  console.log(`[${lang}] AFTER : ${normalize(text, { lang })}`);
}
