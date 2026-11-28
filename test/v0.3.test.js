// Cases added after the Verba-TTS cross-test (28 Nov 2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, detectLang, numberToWords } from '../src/index.js';

const hi = (t, o = {}) => normalize(t, { lang: 'hi', ...o });
const mr = (t, o = {}) => normalize(t, { lang: 'mr', ...o });
const en = (t, o = {}) => normalize(t, { lang: 'en', ...o });
const eq = (a, b) => assert.equal(a, b.normalize('NFC'));

test('time-of-day word is not repeated before PM/AM or 24-hour times', () => {
  eq(mr('दुकान संध्याकाळी 7:00 PM पर्यंत उघडे आहे.'), 'दुकान संध्याकाळी सात वाजेपर्यंत उघडे आहे.');
  eq(mr('रात्री 10:30 PM'), 'रात्री दहा वाजून तीस मिनिटे');
  eq(mr('संध्याकाळी 19:00'), 'संध्याकाळी सात वाजता');
  eq(mr('सकाळी 7:00 AM'), 'सकाळी सात वाजता');
  eq(hi('शाम 7:00 PM तक'), 'शाम सात बजे तक');
  eq(hi('रात 10:30 PM को'), 'रात दस बजकर तीस मिनट को');
  eq(hi('शाम के 6:15 PM'), 'शाम के छह बजकर पंद्रह मिनट');
  eq(hi('सुबह 9:30 बजे'), 'सुबह नौ बजकर तीस मिनट');
});

test('PM/AM without minutes, and Marathi पर्यंत', () => {
  eq(hi('7 PM'), 'शाम सात बजे');
  eq(hi('शाम 7 PM'), 'शाम सात बजे');
  eq(mr('7:00 PM पर्यंत'), 'संध्याकाळी सात वाजेपर्यंत');
  eq(mr('10:30 पर्यंत'), 'दहा वाजून तीस मिनिटांपर्यंत');
  eq(en('at 7 PM.'), 'at seven P M.');
});

test('English mode: Indian numbers in English, no Hindi words', () => {
  eq(en('Your order of Rs. 1,25,000 will arrive on 25/11/2026 at 5:30 pm.'),
    'Your order of one lakh twenty five thousand rupees will arrive on twenty fifth November twenty twenty six at five thirty P M.');
  eq(en('₹2.5 lakh loan at 8.5% for 10-12 months'), 'two and a half lakh rupees loan at eight point five percent for ten to twelve months');
  eq(en('₹1.5 crore'), 'one and a half crore rupees');
  eq(en('₹3.5 lakh'), 'three and a half lakh rupees');
  eq(en('Pay ₹2,500.50 by 05/12/2026'), 'Pay two thousand five hundred rupees and fifty paise by fifth December twenty twenty six');
  eq(en('₹1'), 'one rupee');
  eq(en('In 1998, ISRO & NASA met at 10:05 am. Dr. Rao said OK.'),
    'In nineteen ninety eight, Isro and Nasa met at ten oh five A M. Doctor Rao said okay.');
  eq(en('2nd, 21st, 100th, 3rd'), 'second, twenty first, one hundredth, third');
  eq(en('GST 18%'), 'G S T eighteen percent');
  eq(en('+91 98765 43210'), 'plus nine one nine eight seven six five, four three two one zero');
  eq(en('10:00'), "ten o'clock");
  eq(numberToWords(12500000, 'en'), 'one crore twenty five lakh');
  eq(numberToWords(105, 'en'), 'one hundred and five');
  for (const s of [en('₹1,50,000 on 12/03/2026 at 10:30, PNR 4521367890, MH15AB1234, rahul@okicici')]) {
    assert.ok(!/[\u0900-\u097F]/.test(s), `Devanagari leaked: ${s}`);
  }
});

test('auto language detection', () => {
  eq(detectLang('Your order of Rs. 1,25,000'), 'en');
  eq(detectLang('तुमचे बिल भरा.'), 'mr');
  eq(detectLang('आपका बिल भरें।'), 'hi');
  eq(normalize('Your order of Rs. 1,25,000', { lang: 'auto' }), 'Your order of one lakh twenty five thousand rupees');
  eq(normalize('तुमचे ₹2,500 बिल भरा.', { lang: 'auto' }), 'तुमचे दोन हजार पाचशे रुपये बिल भरा.');
});

test('OTP and verification codes are read digit by digit in every language', () => {
  eq(hi('आपका OTP 482913 है'), 'आपका ओ टी पी चार आठ दो नौ एक तीन है');
  eq(mr('OTP 4821'), 'ओ टी पी चार आठ दोन एक');
  eq(mr('482913 हा तुमचा OTP आहे.'), 'चार आठ दोन नऊ एक तीन हा तुमचा ओ टी पी आहे.');
  eq(en('Your OTP is 4821. Do not share it.'), 'Your O T P is four eight two one. Do not share it.');
  eq(en('Your verification code is 739201'), 'Your verification code is seven three nine two zero one');
  eq(en('4821 is your OTP for login'), 'four eight two one is your O T P for login');
  eq(en('Your OTP for login is 4821'), 'Your O T P for login is four eight two one');
  eq(hi('सत्यापन कोड 5521'), 'सत्यापन कोड पाँच पाँच दो एक');
  eq(en('MPIN: 2468'), 'M P I N: two four six eight');
});

test('UPI IDs', () => {
  eq(hi('पैसे rahul@okicici पर भेजें।'), 'पैसे rahul ऐट ओके आई सी आई सी आई पर भेजें।');
  eq(mr('rahul@okhdfcbank'), 'rahul ॲट ओके एच डी एफ सी बँक');
  eq(hi('rk@ptyes'), 'आर के ऐट पी टी यस');
  eq(hi('पैसे 9876543210@paytm पर भेजें'), 'पैसे नौ आठ सात छह पाँच चार तीन दो एक शून्य ऐट पेटीएम पर भेजें');
  eq(en('UPI: rahul.sharma92@ybl'), 'U P I: rahul dot sharma nine two at Y B L');
  eq(en('shop@okaxis'), 'shop at okay axis');
  eq(en('rahul@oksbi'), 'rahul at okay S B I');
  // Emails and unknown suffixes are left alone (no UPI context).
  eq(en('mail me at rahul@gmail.com'), 'mail me at rahul@gmail.com');
  eq(en('ping me@home'), 'ping me@home');
  // An unknown suffix is read when the text mentions UPI.
  eq(en('UPI ID ravi@newbank'), 'U P I I D ravi at newbank');
});

test('train numbers are read digit by digit (Indian Railways style)', () => {
  eq(hi('ट्रेन नंबर 12951 प्लेटफॉर्म 4 पर आएगी।'), 'ट्रेन नंबर एक दो नौ पाँच एक प्लेटफॉर्म चार पर आएगी।');
  eq(hi('गाड़ी संख्या 12951 मुंबई सेंट्रल से'), 'गाड़ी संख्या एक दो नौ पाँच एक मुंबई सेंट्रल से');
  eq(mr('ट्रेन क्रमांक 11301'), 'ट्रेन क्रमांक एक एक तीन शून्य एक');
  eq(en('Train No. 12951 arrives at 7 PM.'), 'Train number one two nine five one arrives at seven P M.');
  // Not a train context: a plain 5-digit number stays a number.
  eq(hi('12951 लोग'), 'बारह हज़ार नौ सौ इक्यावन लोग');
});

test('vehicle registration numbers', () => {
  eq(hi('गाड़ी नंबर MH15AB1234 है।'), 'गाड़ी नंबर एम एच पंद्रह ए बी एक दो तीन चार है।');
  eq(en('MH 15 AB 1234 and MH-04-K-0042'), 'M H fifteen A B one two three four and M H zero four K zero zero four two');
  eq(mr('DL3CAB1234'), 'डी एल तीन सी ए बी एक दोन तीन चार');
  eq(hi('22 BH 4567 AA'), 'बाईस बी एच चार पाँच छह सात ए ए');
  eq(hi('MH15AB1234', { vehicleDigits: 'pairs' }), 'एम एच पंद्रह ए बी बारह चौंतीस');
  eq(en('MH15AB0042', { vehicleDigits: 'pairs' }), 'M H fifteen A B zero zero forty two');
});

test('letter + number codes', () => {
  eq(hi('मशीन पर error code E4 दिख रहा है।'), 'मशीन पर error code ई चार दिख रहा है।');
  eq(en('seat A12'), 'seat A twelve');
});
