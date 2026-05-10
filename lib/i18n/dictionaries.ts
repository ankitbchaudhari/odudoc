// Patient-surface i18n dictionaries.
//
// Minimal-footprint approach — no full i18n framework, no SSR
// negotiation. We ship a Locale type + a typed dictionary lookup
// + a tiny client hook that reads the persisted locale from
// localStorage. Any patient surface that wants translation imports
// the dictionary, calls t("key"), done.
//
// Why minimal: shipping every Indian language now would freeze a
// design that's still moving. We start with five locales the
// patient base needs most (en, hi, ta, te, mr) and a sample of
// surface keys covering the homepage hero + booking flow. Extend by
// adding rows; missing keys fall back to English.

export type Locale = "en" | "hi" | "ta" | "te" | "mr";

export const LOCALES: Array<{ id: Locale; label: string; nativeLabel: string }> = [
  { id: "en", label: "English", nativeLabel: "English" },
  { id: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { id: "ta", label: "Tamil", nativeLabel: "தமிழ்" },
  { id: "te", label: "Telugu", nativeLabel: "తెలుగు" },
  { id: "mr", label: "Marathi", nativeLabel: "मराठी" },
];

export const DEFAULT_LOCALE: Locale = "en";

export type Dict = Record<string, string>;

const en: Dict = {
  "nav.find_doctors": "Find doctors",
  "nav.book_appointment": "Book appointment",
  "nav.my_records": "My records",
  "nav.sign_in": "Sign in",
  "hero.title": "Healthcare that actually works",
  "hero.subtitle": "Book verified doctors, order medicines, get lab tests at home. One app, your whole family.",
  "hero.cta_book": "Book a doctor",
  "hero.cta_pharmacy": "Order medicines",
  "homepage.search_placeholder": "Symptoms, doctor, or specialty",
  "homepage.search_button": "Search",
  "specialty.cardiology": "Cardiology",
  "specialty.dermatology": "Dermatology",
  "specialty.paediatrics": "Paediatrics",
  "specialty.gynaecology": "Gynaecology",
  "specialty.orthopaedics": "Orthopaedics",
  "specialty.ent": "ENT",
  "booking.start": "Book appointment",
  "booking.video_consult": "Video consult",
  "booking.in_clinic": "Visit clinic",
  "booking.confirm": "Confirm booking",
  "booking.fee": "Consultation fee",
  "booking.you_pay": "You pay",
  "wallet.title": "OduDoc Wallet",
  "wallet.balance": "Available balance",
  "wallet.add_money": "Add money",
  "wallet.bonus": "5% bonus",
  "labs.title": "Lab tests",
  "labs.book_now": "Book now",
  "labs.home_collection": "Home collection",
  "labs.in_lab": "Visit lab",
  "common.next": "Next",
  "common.back": "Back",
  "common.cancel": "Cancel",
  "common.continue": "Continue",
  "common.save": "Save",
  "common.confirm": "Confirm",
  "common.yes": "Yes",
  "common.no": "No",
  "common.loading": "Loading…",
  "common.try_again": "Try again",
};

// Translations are intentionally focused — homepage hero, navigation,
// booking flow, wallet, labs, common UI. Other surfaces fall back
// to English until translation lands.

const hi: Dict = {
  "nav.find_doctors": "डॉक्टर खोजें",
  "nav.book_appointment": "अपॉइंटमेंट बुक करें",
  "nav.my_records": "मेरा रिकॉर्ड",
  "nav.sign_in": "साइन इन करें",
  "hero.title": "स्वास्थ्य सेवा जो वाकई काम करती है",
  "hero.subtitle": "वेरिफाइड डॉक्टर बुक करें, दवाइयां ऑर्डर करें, घर पर लैब टेस्ट करवाएं। एक ऐप, आपका पूरा परिवार।",
  "hero.cta_book": "डॉक्टर बुक करें",
  "hero.cta_pharmacy": "दवाइयां ऑर्डर करें",
  "homepage.search_placeholder": "लक्षण, डॉक्टर, या विशेषज्ञता",
  "homepage.search_button": "खोजें",
  "specialty.cardiology": "हृदय रोग",
  "specialty.dermatology": "त्वचा रोग",
  "specialty.paediatrics": "बाल रोग",
  "specialty.gynaecology": "स्त्री रोग",
  "specialty.orthopaedics": "हड्डी रोग",
  "specialty.ent": "ईएनटी",
  "booking.start": "अपॉइंटमेंट बुक करें",
  "booking.video_consult": "वीडियो परामर्श",
  "booking.in_clinic": "क्लिनिक जाएं",
  "booking.confirm": "बुकिंग पुष्टि करें",
  "booking.fee": "परामर्श शुल्क",
  "booking.you_pay": "आप भुगतान करें",
  "wallet.title": "ओडुडॉक वॉलेट",
  "wallet.balance": "उपलब्ध बैलेंस",
  "wallet.add_money": "पैसे जोड़ें",
  "wallet.bonus": "5% बोनस",
  "labs.title": "लैब टेस्ट",
  "labs.book_now": "अभी बुक करें",
  "labs.home_collection": "घर पर सैंपल कलेक्शन",
  "labs.in_lab": "लैब में जाएं",
  "common.next": "आगे",
  "common.back": "पीछे",
  "common.cancel": "रद्द करें",
  "common.continue": "जारी रखें",
  "common.save": "सेव करें",
  "common.confirm": "पुष्टि करें",
  "common.yes": "हाँ",
  "common.no": "नहीं",
  "common.loading": "लोड हो रहा है…",
  "common.try_again": "पुनः प्रयास करें",
};

const ta: Dict = {
  "nav.find_doctors": "மருத்துவர்களைக் கண்டறியவும்",
  "nav.book_appointment": "சந்திப்பு பதிவு செய்யவும்",
  "nav.my_records": "என் பதிவுகள்",
  "nav.sign_in": "உள்நுழையவும்",
  "hero.title": "உண்மையாகவே வேலை செய்யும் சுகாதாரம்",
  "hero.subtitle": "சரிபார்க்கப்பட்ட மருத்துவர்களை பதிவு செய்யுங்கள், மருந்துகள் ஆர்டர் செய்யுங்கள், வீட்டில் ஆய்வக சோதனைகள் பெறுங்கள். ஒரே ஆப், உங்கள் முழு குடும்பத்திற்கும்.",
  "hero.cta_book": "மருத்துவரைப் பதிவு செய்யவும்",
  "hero.cta_pharmacy": "மருந்துகளை ஆர்டர் செய்யவும்",
  "homepage.search_placeholder": "அறிகுறி, மருத்துவர் அல்லது சிறப்பு",
  "homepage.search_button": "தேடு",
  "booking.video_consult": "வீடியோ ஆலோசனை",
  "booking.in_clinic": "மருத்துவமனைக்குச் செல்லவும்",
  "booking.confirm": "பதிவை உறுதிப்படுத்தவும்",
  "wallet.title": "OduDoc வாலட்",
  "wallet.balance": "கிடைக்கும் இருப்பு",
  "wallet.add_money": "பணம் சேர்க்கவும்",
  "labs.title": "ஆய்வக சோதனைகள்",
  "common.next": "அடுத்தது",
  "common.back": "பின்",
  "common.cancel": "ரத்து செய்",
  "common.continue": "தொடரவும்",
  "common.save": "சேமி",
  "common.confirm": "உறுதிப்படுத்து",
  "common.yes": "ஆம்",
  "common.no": "இல்லை",
  "common.loading": "ஏற்றுகிறது…",
};

const te: Dict = {
  "nav.find_doctors": "డాక్టర్లను కనుగొనండి",
  "nav.book_appointment": "అపాయింట్‌మెంట్ బుక్ చేయండి",
  "nav.my_records": "నా రికార్డులు",
  "nav.sign_in": "సైన్ ఇన్ చేయండి",
  "hero.title": "నిజంగా పని చేసే ఆరోగ్య సంరక్షణ",
  "hero.subtitle": "ధృవీకరించబడిన డాక్టర్లను బుక్ చేయండి, మందులు ఆర్డర్ చేయండి, ఇంటి వద్ద ల్యాబ్ టెస్ట్‌లు పొందండి. ఒకే యాప్, మీ మొత్తం కుటుంబం.",
  "hero.cta_book": "డాక్టర్‌ను బుక్ చేయండి",
  "hero.cta_pharmacy": "మందులు ఆర్డర్ చేయండి",
  "homepage.search_placeholder": "లక్షణాలు, డాక్టర్ లేదా స్పెషాలిటీ",
  "homepage.search_button": "శోధించు",
  "booking.video_consult": "వీడియో సంప్రదింపు",
  "booking.confirm": "బుకింగ్‌ను నిర్ధారించండి",
  "wallet.title": "OduDoc వాలెట్",
  "wallet.balance": "అందుబాటులో ఉన్న బ్యాలెన్స్",
  "wallet.add_money": "డబ్బు జోడించండి",
  "labs.title": "ల్యాబ్ టెస్ట్‌లు",
  "common.next": "తదుపరి",
  "common.back": "వెనుకకు",
  "common.cancel": "రద్దు చేయి",
  "common.continue": "కొనసాగించు",
  "common.save": "సేవ్ చేయి",
  "common.confirm": "నిర్ధారించు",
  "common.yes": "అవును",
  "common.no": "కాదు",
  "common.loading": "లోడ్ అవుతోంది…",
};

const mr: Dict = {
  "nav.find_doctors": "डॉक्टर शोधा",
  "nav.book_appointment": "अपॉइंटमेंट बुक करा",
  "nav.my_records": "माझे रेकॉर्ड्स",
  "nav.sign_in": "साइन इन करा",
  "hero.title": "खरंच काम करणारी आरोग्यसेवा",
  "hero.subtitle": "सत्यापित डॉक्टर बुक करा, औषधे ऑर्डर करा, घरी लॅब चाचण्या करा. एक अॅप, तुमचे संपूर्ण कुटुंब.",
  "hero.cta_book": "डॉक्टर बुक करा",
  "hero.cta_pharmacy": "औषधे ऑर्डर करा",
  "homepage.search_placeholder": "लक्षणे, डॉक्टर, किंवा विशेषता",
  "homepage.search_button": "शोधा",
  "booking.video_consult": "व्हिडिओ सल्ला",
  "booking.confirm": "बुकिंगची पुष्टी करा",
  "wallet.title": "OduDoc वॉलेट",
  "wallet.balance": "उपलब्ध शिल्लक",
  "wallet.add_money": "पैसे जोडा",
  "labs.title": "लॅब चाचण्या",
  "common.next": "पुढे",
  "common.back": "मागे",
  "common.cancel": "रद्द करा",
  "common.continue": "सुरू ठेवा",
  "common.save": "जतन करा",
  "common.confirm": "पुष्टी करा",
  "common.yes": "होय",
  "common.no": "नाही",
  "common.loading": "लोड होत आहे…",
};

const DICTIONARIES: Record<Locale, Dict> = { en, hi, ta, te, mr };

export function dict(locale: Locale): Dict {
  return DICTIONARIES[locale] || DICTIONARIES[DEFAULT_LOCALE];
}

export function translate(locale: Locale, key: string, fallback?: string): string {
  const d = DICTIONARIES[locale];
  if (d && d[key]) return d[key];
  // Fall back through English so partial dictionaries still produce
  // a string instead of a key.
  if (locale !== DEFAULT_LOCALE && DICTIONARIES[DEFAULT_LOCALE]?.[key]) {
    return DICTIONARIES[DEFAULT_LOCALE][key];
  }
  return fallback ?? key;
}
