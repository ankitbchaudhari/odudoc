// ISO 639-1 language catalogue.
//
// Used by:
//   - admin/settings "Add from catalogue" picker for languages,
//   - the geo helper to map an IP country → suggested language,
//   - any future language switcher that needs full names + RTL flags.
//
// `countries` lists ISO 3166-1 alpha-2 codes where the language has
// official-language status. The geo helper picks the FIRST language whose
// `countries` includes the resolved country, so order entries below by
// relative dominance in each country (e.g. English before others for US, GB).

export interface LanguageDef {
  code: string;   // ISO 639-1
  name: string;   // English name
  native: string; // Native / endonym
  rtl: boolean;
  countries: string[];
}

export const ALL_LANGUAGES: LanguageDef[] = [
  // --- Top tier ---
  { code: "en", name: "English", native: "English", rtl: false, countries: ["US", "GB", "CA", "AU", "NZ", "IE", "ZA", "IN", "PK", "PH", "SG", "MY", "NG", "KE", "GH", "ZW", "UG", "TZ", "ZM", "MW", "BW", "RW", "LR", "SL", "GM", "JM", "BS", "BB", "TT", "BZ", "GY", "FJ", "PG", "SB", "VU", "WS", "TO", "MT", "CY", "HK", "BN"] },
  { code: "es", name: "Spanish", native: "Español", rtl: false, countries: ["ES", "MX", "AR", "CO", "PE", "VE", "CL", "EC", "GT", "CU", "BO", "DO", "HN", "PY", "SV", "NI", "CR", "PA", "UY", "PR", "GQ"] },
  { code: "fr", name: "French", native: "Français", rtl: false, countries: ["FR", "BE", "CH", "LU", "MC", "CA", "CD", "CG", "CI", "CM", "BF", "BJ", "TG", "ML", "NE", "SN", "GA", "GQ", "MG", "DJ", "KM", "VU", "RE", "SC", "GF", "GP", "MQ", "NC", "PF", "WF", "YT"] },
  { code: "de", name: "German", native: "Deutsch", rtl: false, countries: ["DE", "AT", "CH", "LI", "LU", "BE"] },
  { code: "it", name: "Italian", native: "Italiano", rtl: false, countries: ["IT", "CH", "SM", "VA"] },
  { code: "pt", name: "Portuguese", native: "Português", rtl: false, countries: ["PT", "BR", "AO", "MZ", "CV", "GW", "ST", "TL"] },
  { code: "ru", name: "Russian", native: "Русский", rtl: false, countries: ["RU", "BY", "KZ", "KG", "TJ"] },
  { code: "zh", name: "Chinese", native: "中文", rtl: false, countries: ["CN", "TW", "HK", "MO", "SG"] },
  { code: "ja", name: "Japanese", native: "日本語", rtl: false, countries: ["JP"] },
  { code: "ko", name: "Korean", native: "한국어", rtl: false, countries: ["KR", "KP"] },
  { code: "ar", name: "Arabic", native: "العربية", rtl: true, countries: ["SA", "EG", "AE", "QA", "KW", "BH", "OM", "JO", "IQ", "SY", "LB", "YE", "PS", "DZ", "MA", "TN", "LY", "SD", "MR", "SO", "DJ", "KM", "TD", "ER", "EH"] },
  { code: "hi", name: "Hindi", native: "हिन्दी", rtl: false, countries: ["IN"] },
  { code: "bn", name: "Bengali", native: "বাংলা", rtl: false, countries: ["BD"] },
  { code: "ur", name: "Urdu", native: "اردو", rtl: true, countries: ["PK"] },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ", rtl: false, countries: [] },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી", rtl: false, countries: [] },
  { code: "ta", name: "Tamil", native: "தமிழ்", rtl: false, countries: ["LK"] },
  { code: "te", name: "Telugu", native: "తెలుగు", rtl: false, countries: [] },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ", rtl: false, countries: [] },
  { code: "ml", name: "Malayalam", native: "മലയാളം", rtl: false, countries: [] },
  { code: "mr", name: "Marathi", native: "मराठी", rtl: false, countries: [] },
  { code: "ne", name: "Nepali", native: "नेपाली", rtl: false, countries: ["NP"] },
  { code: "si", name: "Sinhala", native: "සිංහල", rtl: false, countries: [] },
  { code: "th", name: "Thai", native: "ไทย", rtl: false, countries: ["TH"] },
  { code: "vi", name: "Vietnamese", native: "Tiếng Việt", rtl: false, countries: ["VN"] },
  { code: "id", name: "Indonesian", native: "Bahasa Indonesia", rtl: false, countries: ["ID"] },
  { code: "ms", name: "Malay", native: "Bahasa Melayu", rtl: false, countries: ["MY", "BN"] },
  { code: "tl", name: "Tagalog", native: "Tagalog", rtl: false, countries: ["PH"] },
  { code: "sw", name: "Swahili", native: "Kiswahili", rtl: false, countries: ["TZ", "KE", "UG", "RW"] },
  { code: "am", name: "Amharic", native: "አማርኛ", rtl: false, countries: ["ET"] },
  { code: "ha", name: "Hausa", native: "Hausa", rtl: false, countries: [] },
  { code: "yo", name: "Yoruba", native: "Yorùbá", rtl: false, countries: [] },
  { code: "ig", name: "Igbo", native: "Igbo", rtl: false, countries: [] },
  { code: "zu", name: "Zulu", native: "isiZulu", rtl: false, countries: [] },
  { code: "af", name: "Afrikaans", native: "Afrikaans", rtl: false, countries: [] },
  { code: "tr", name: "Turkish", native: "Türkçe", rtl: false, countries: ["TR", "CY"] },
  { code: "fa", name: "Persian", native: "فارسی", rtl: true, countries: ["IR", "AF"] },
  { code: "he", name: "Hebrew", native: "עברית", rtl: true, countries: ["IL"] },
  { code: "el", name: "Greek", native: "Ελληνικά", rtl: false, countries: ["GR", "CY"] },
  { code: "pl", name: "Polish", native: "Polski", rtl: false, countries: ["PL"] },
  { code: "cs", name: "Czech", native: "Čeština", rtl: false, countries: ["CZ"] },
  { code: "sk", name: "Slovak", native: "Slovenčina", rtl: false, countries: ["SK"] },
  { code: "hu", name: "Hungarian", native: "Magyar", rtl: false, countries: ["HU"] },
  { code: "ro", name: "Romanian", native: "Română", rtl: false, countries: ["RO", "MD"] },
  { code: "bg", name: "Bulgarian", native: "Български", rtl: false, countries: ["BG"] },
  { code: "sr", name: "Serbian", native: "Српски", rtl: false, countries: ["RS"] },
  { code: "hr", name: "Croatian", native: "Hrvatski", rtl: false, countries: ["HR"] },
  { code: "sl", name: "Slovenian", native: "Slovenščina", rtl: false, countries: ["SI"] },
  { code: "uk", name: "Ukrainian", native: "Українська", rtl: false, countries: ["UA"] },
  { code: "be", name: "Belarusian", native: "Беларуская", rtl: false, countries: [] },
  { code: "lt", name: "Lithuanian", native: "Lietuvių", rtl: false, countries: ["LT"] },
  { code: "lv", name: "Latvian", native: "Latviešu", rtl: false, countries: ["LV"] },
  { code: "et", name: "Estonian", native: "Eesti", rtl: false, countries: ["EE"] },
  { code: "fi", name: "Finnish", native: "Suomi", rtl: false, countries: ["FI"] },
  { code: "sv", name: "Swedish", native: "Svenska", rtl: false, countries: ["SE"] },
  { code: "no", name: "Norwegian", native: "Norsk", rtl: false, countries: ["NO"] },
  { code: "da", name: "Danish", native: "Dansk", rtl: false, countries: ["DK"] },
  { code: "is", name: "Icelandic", native: "Íslenska", rtl: false, countries: ["IS"] },
  { code: "nl", name: "Dutch", native: "Nederlands", rtl: false, countries: ["NL", "BE", "SR"] },
  { code: "ga", name: "Irish", native: "Gaeilge", rtl: false, countries: [] },
  { code: "cy", name: "Welsh", native: "Cymraeg", rtl: false, countries: [] },
  { code: "gd", name: "Scottish Gaelic", native: "Gàidhlig", rtl: false, countries: [] },
  { code: "ca", name: "Catalan", native: "Català", rtl: false, countries: ["AD"] },
  { code: "eu", name: "Basque", native: "Euskara", rtl: false, countries: [] },
  { code: "gl", name: "Galician", native: "Galego", rtl: false, countries: [] },
  { code: "mt", name: "Maltese", native: "Malti", rtl: false, countries: ["MT"] },
  { code: "sq", name: "Albanian", native: "Shqip", rtl: false, countries: ["AL", "XK"] },
  { code: "mk", name: "Macedonian", native: "Македонски", rtl: false, countries: ["MK"] },
  { code: "bs", name: "Bosnian", native: "Bosanski", rtl: false, countries: ["BA"] },
  { code: "hy", name: "Armenian", native: "Հայերեն", rtl: false, countries: ["AM"] },
  { code: "ka", name: "Georgian", native: "ქართული", rtl: false, countries: ["GE"] },
  { code: "az", name: "Azerbaijani", native: "Azərbaycanca", rtl: false, countries: ["AZ"] },
  { code: "kk", name: "Kazakh", native: "Қазақша", rtl: false, countries: ["KZ"] },
  { code: "ky", name: "Kyrgyz", native: "Кыргызча", rtl: false, countries: ["KG"] },
  { code: "uz", name: "Uzbek", native: "Oʻzbekcha", rtl: false, countries: ["UZ"] },
  { code: "tg", name: "Tajik", native: "Тоҷикӣ", rtl: false, countries: ["TJ"] },
  { code: "mn", name: "Mongolian", native: "Монгол", rtl: false, countries: ["MN"] },
  { code: "my", name: "Burmese", native: "မြန်မာ", rtl: false, countries: ["MM"] },
  { code: "km", name: "Khmer", native: "ខ្មែរ", rtl: false, countries: ["KH"] },
  { code: "lo", name: "Lao", native: "ລາວ", rtl: false, countries: ["LA"] },
  { code: "dz", name: "Dzongkha", native: "རྫོང་ཁ", rtl: false, countries: ["BT"] },
  { code: "ti", name: "Tigrinya", native: "ትግርኛ", rtl: false, countries: ["ER"] },
  { code: "om", name: "Oromo", native: "Afaan Oromoo", rtl: false, countries: [] },
  { code: "so", name: "Somali", native: "Soomaali", rtl: false, countries: ["SO"] },
  { code: "mg", name: "Malagasy", native: "Malagasy", rtl: false, countries: ["MG"] },
  { code: "sn", name: "Shona", native: "chiShona", rtl: false, countries: [] },
  { code: "rw", name: "Kinyarwanda", native: "Kinyarwanda", rtl: false, countries: ["RW"] },
  { code: "ny", name: "Chichewa", native: "Chichewa", rtl: false, countries: ["MW"] },
  { code: "qu", name: "Quechua", native: "Runa Simi", rtl: false, countries: [] },
  { code: "ay", name: "Aymara", native: "Aymar aru", rtl: false, countries: [] },
  { code: "jv", name: "Javanese", native: "Basa Jawa", rtl: false, countries: [] },
  { code: "su", name: "Sundanese", native: "Basa Sunda", rtl: false, countries: [] },
  { code: "gn", name: "Guarani", native: "Avañe'ẽ", rtl: false, countries: ["PY"] },
  { code: "lb", name: "Luxembourgish", native: "Lëtzebuergesch", rtl: false, countries: [] },
  { code: "fy", name: "Frisian", native: "Frysk", rtl: false, countries: [] },
  { code: "kl", name: "Greenlandic", native: "Kalaallisut", rtl: false, countries: ["GL"] },
  { code: "sm", name: "Samoan", native: "Gagana Samoa", rtl: false, countries: ["WS"] },
  { code: "mi", name: "Maori", native: "Māori", rtl: false, countries: [] },
  { code: "fj", name: "Fijian", native: "Vosa Vakaviti", rtl: false, countries: ["FJ"] },
];

const _byCode: Record<string, LanguageDef> = Object.create(null);
const _byCountry: Record<string, LanguageDef> = Object.create(null);
for (const l of ALL_LANGUAGES) {
  _byCode[l.code] = l;
  for (const cc of l.countries) {
    if (!_byCountry[cc]) _byCountry[cc] = l;
  }
}

export function byCode(code: string | undefined | null): LanguageDef | undefined {
  if (!code) return undefined;
  return _byCode[code.toLowerCase()];
}

export function byCountry(countryCode: string | undefined | null): LanguageDef | undefined {
  if (!countryCode) return undefined;
  return _byCountry[countryCode.toUpperCase()];
}
