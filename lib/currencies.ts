// ISO 4217 currency catalogue.
//
// One static list, used by:
//   - admin/settings to power the "pick a currency" dropdown,
//   - the geo helper to map an IP country → suggested currency,
//   - the checkout currency switcher to render the visitor-facing list.
//
// `decimals` follows ISO 4217 minor-unit conventions (JPY/KRW/VND = 0;
// most others = 2; Kuwaiti / Bahraini / Omani / Jordanian dinars = 3).
//
// `position` and `decimalSeparator` are sensible defaults per region —
// admins can override per-currency on the Currency Settings page.
//
// `countries` lists the ISO 3166-1 alpha-2 codes where the currency is the
// primary legal tender. Used by `byCountry` for geo-based suggestion.

export type CurrencyPosition = "left" | "right" | "left-space" | "right-space";
export type DecimalSeparator =
  | "1,234,567.89"
  | "1.234.567,89"
  | "1 234 567.89"
  | "1,23,456.70";

export interface CurrencyDef {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  position: CurrencyPosition;
  decimalSeparator: DecimalSeparator;
  countries: string[];
}

// Common formatting presets — keeps the literal strings out of every entry.
const COMMA_DOT: DecimalSeparator = "1,234,567.89"; // 1,234.56  — en-US, en-GB, etc.
const DOT_COMMA: DecimalSeparator = "1.234.567,89"; // 1.234,56  — most of EU, LatAm
const SPACE_DOT: DecimalSeparator = "1 234 567.89"; // 1 234.56  — FR, RU, NO, SE
const INDIAN: DecimalSeparator = "1,23,456.70";    // 1,23,456.70 — IN, NP, BD, PK

export const ALL_CURRENCIES: CurrencyDef[] = [
  // --- Major reserve / G10 ---
  { code: "USD", name: "US Dollar", symbol: "$", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["US", "EC", "SV", "ZW", "PA", "TL", "MH", "FM", "PW", "VG", "TC"] },
  { code: "EUR", name: "Euro", symbol: "€", decimals: 2, position: "left-space", decimalSeparator: DOT_COMMA, countries: ["DE", "FR", "IT", "ES", "NL", "BE", "AT", "PT", "IE", "FI", "GR", "LU", "SK", "SI", "EE", "LV", "LT", "MT", "CY", "HR", "AD", "MC", "SM", "VA", "ME", "XK"] },
  { code: "GBP", name: "British Pound", symbol: "£", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["GB", "IM", "JE", "GG"] },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", decimals: 0, position: "left", decimalSeparator: COMMA_DOT, countries: ["JP"] },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["CN"] },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", decimals: 2, position: "left-space", decimalSeparator: SPACE_DOT, countries: ["CH", "LI"] },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["AU", "KI", "NR", "TV"] },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["CA"] },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["NZ", "CK", "NU", "PN", "TK"] },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["HK"] },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["SG"] },

  // --- Asia-Pacific ---
  { code: "INR", name: "Indian Rupee", symbol: "₹", decimals: 2, position: "left", decimalSeparator: INDIAN, countries: ["IN", "BT"] },
  { code: "KRW", name: "South Korean Won", symbol: "₩", decimals: 0, position: "left", decimalSeparator: COMMA_DOT, countries: ["KR"] },
  { code: "TWD", name: "New Taiwan Dollar", symbol: "NT$", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["TW"] },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", decimals: 0, position: "left-space", decimalSeparator: DOT_COMMA, countries: ["ID"] },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["MY"] },
  { code: "THB", name: "Thai Baht", symbol: "฿", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["TH"] },
  { code: "VND", name: "Vietnamese Dong", symbol: "₫", decimals: 0, position: "right-space", decimalSeparator: DOT_COMMA, countries: ["VN"] },
  { code: "PHP", name: "Philippine Peso", symbol: "₱", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["PH"] },
  { code: "PKR", name: "Pakistani Rupee", symbol: "₨", decimals: 2, position: "left-space", decimalSeparator: INDIAN, countries: ["PK"] },
  { code: "BDT", name: "Bangladeshi Taka", symbol: "৳", decimals: 2, position: "left", decimalSeparator: INDIAN, countries: ["BD"] },
  { code: "LKR", name: "Sri Lankan Rupee", symbol: "Rs", decimals: 2, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["LK"] },
  { code: "NPR", name: "Nepalese Rupee", symbol: "₨", decimals: 2, position: "left-space", decimalSeparator: INDIAN, countries: ["NP"] },
  { code: "MMK", name: "Myanmar Kyat", symbol: "K", decimals: 2, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["MM"] },
  { code: "KHR", name: "Cambodian Riel", symbol: "៛", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["KH"] },
  { code: "LAK", name: "Lao Kip", symbol: "₭", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["LA"] },
  { code: "MNT", name: "Mongolian Tugrik", symbol: "₮", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["MN"] },
  { code: "AFN", name: "Afghan Afghani", symbol: "؋", decimals: 2, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["AF"] },
  { code: "BND", name: "Brunei Dollar", symbol: "B$", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["BN"] },
  { code: "FJD", name: "Fijian Dollar", symbol: "FJ$", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["FJ"] },
  { code: "PGK", name: "Papua New Guinean Kina", symbol: "K", decimals: 2, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["PG"] },

  // --- Europe (non-Euro) ---
  { code: "SEK", name: "Swedish Krona", symbol: "kr", decimals: 2, position: "right-space", decimalSeparator: SPACE_DOT, countries: ["SE"] },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr", decimals: 2, position: "right-space", decimalSeparator: SPACE_DOT, countries: ["NO", "SJ", "BV"] },
  { code: "DKK", name: "Danish Krone", symbol: "kr", decimals: 2, position: "right-space", decimalSeparator: DOT_COMMA, countries: ["DK", "FO", "GL"] },
  { code: "ISK", name: "Icelandic Krona", symbol: "kr", decimals: 0, position: "right-space", decimalSeparator: DOT_COMMA, countries: ["IS"] },
  { code: "PLN", name: "Polish Zloty", symbol: "zł", decimals: 2, position: "right-space", decimalSeparator: SPACE_DOT, countries: ["PL"] },
  { code: "CZK", name: "Czech Koruna", symbol: "Kč", decimals: 2, position: "right-space", decimalSeparator: SPACE_DOT, countries: ["CZ"] },
  { code: "HUF", name: "Hungarian Forint", symbol: "Ft", decimals: 0, position: "right-space", decimalSeparator: SPACE_DOT, countries: ["HU"] },
  { code: "RON", name: "Romanian Leu", symbol: "lei", decimals: 2, position: "right-space", decimalSeparator: DOT_COMMA, countries: ["RO"] },
  { code: "BGN", name: "Bulgarian Lev", symbol: "лв", decimals: 2, position: "right-space", decimalSeparator: SPACE_DOT, countries: ["BG"] },
  { code: "RSD", name: "Serbian Dinar", symbol: "дин", decimals: 2, position: "right-space", decimalSeparator: DOT_COMMA, countries: ["RS"] },
  { code: "MKD", name: "Macedonian Denar", symbol: "ден", decimals: 2, position: "right-space", decimalSeparator: DOT_COMMA, countries: ["MK"] },
  { code: "ALL", name: "Albanian Lek", symbol: "L", decimals: 2, position: "right-space", decimalSeparator: DOT_COMMA, countries: ["AL"] },
  { code: "BAM", name: "Bosnia & Herzegovina Convertible Mark", symbol: "KM", decimals: 2, position: "right-space", decimalSeparator: DOT_COMMA, countries: ["BA"] },
  { code: "MDL", name: "Moldovan Leu", symbol: "L", decimals: 2, position: "right-space", decimalSeparator: DOT_COMMA, countries: ["MD"] },
  { code: "UAH", name: "Ukrainian Hryvnia", symbol: "₴", decimals: 2, position: "right-space", decimalSeparator: SPACE_DOT, countries: ["UA"] },
  { code: "BYN", name: "Belarusian Ruble", symbol: "Br", decimals: 2, position: "right-space", decimalSeparator: SPACE_DOT, countries: ["BY"] },
  { code: "RUB", name: "Russian Ruble", symbol: "₽", decimals: 2, position: "right-space", decimalSeparator: SPACE_DOT, countries: ["RU"] },
  { code: "GEL", name: "Georgian Lari", symbol: "₾", decimals: 2, position: "left-space", decimalSeparator: SPACE_DOT, countries: ["GE"] },
  { code: "AMD", name: "Armenian Dram", symbol: "֏", decimals: 2, position: "right-space", decimalSeparator: COMMA_DOT, countries: ["AM"] },
  { code: "AZN", name: "Azerbaijani Manat", symbol: "₼", decimals: 2, position: "left-space", decimalSeparator: SPACE_DOT, countries: ["AZ"] },
  { code: "TRY", name: "Turkish Lira", symbol: "₺", decimals: 2, position: "left", decimalSeparator: DOT_COMMA, countries: ["TR"] },

  // --- Middle East / Gulf ---
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", decimals: 2, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["AE"] },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼", decimals: 2, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["SA"] },
  { code: "QAR", name: "Qatari Riyal", symbol: "﷼", decimals: 2, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["QA"] },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "د.ك", decimals: 3, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["KW"] },
  { code: "BHD", name: "Bahraini Dinar", symbol: ".د.ب", decimals: 3, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["BH"] },
  { code: "OMR", name: "Omani Rial", symbol: "﷼", decimals: 3, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["OM"] },
  { code: "JOD", name: "Jordanian Dinar", symbol: "د.ا", decimals: 3, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["JO"] },
  { code: "LBP", name: "Lebanese Pound", symbol: "ل.ل", decimals: 2, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["LB"] },
  { code: "IQD", name: "Iraqi Dinar", symbol: "ع.د", decimals: 3, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["IQ"] },
  { code: "IRR", name: "Iranian Rial", symbol: "﷼", decimals: 2, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["IR"] },
  { code: "ILS", name: "Israeli New Shekel", symbol: "₪", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["IL", "PS"] },
  { code: "YER", name: "Yemeni Rial", symbol: "﷼", decimals: 2, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["YE"] },
  { code: "SYP", name: "Syrian Pound", symbol: "£", decimals: 2, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["SY"] },

  // --- Africa ---
  { code: "EGP", name: "Egyptian Pound", symbol: "£", decimals: 2, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["EG"] },
  { code: "ZAR", name: "South African Rand", symbol: "R", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["ZA", "LS", "NA", "SZ"] },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["NG"] },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh", decimals: 2, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["KE"] },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "₵", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["GH"] },
  { code: "MAD", name: "Moroccan Dirham", symbol: "د.م.", decimals: 2, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["MA", "EH"] },
  { code: "TND", name: "Tunisian Dinar", symbol: "د.ت", decimals: 3, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["TN"] },
  { code: "DZD", name: "Algerian Dinar", symbol: "د.ج", decimals: 2, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["DZ"] },
  { code: "LYD", name: "Libyan Dinar", symbol: "ل.د", decimals: 3, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["LY"] },
  { code: "ETB", name: "Ethiopian Birr", symbol: "Br", decimals: 2, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["ET"] },
  { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh", decimals: 2, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["TZ"] },
  { code: "UGX", name: "Ugandan Shilling", symbol: "USh", decimals: 0, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["UG"] },
  { code: "RWF", name: "Rwandan Franc", symbol: "FRw", decimals: 0, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["RW"] },
  { code: "BIF", name: "Burundian Franc", symbol: "FBu", decimals: 0, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["BI"] },
  { code: "ZMW", name: "Zambian Kwacha", symbol: "ZK", decimals: 2, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["ZM"] },
  { code: "MZN", name: "Mozambican Metical", symbol: "MT", decimals: 2, position: "left-space", decimalSeparator: DOT_COMMA, countries: ["MZ"] },
  { code: "AOA", name: "Angolan Kwanza", symbol: "Kz", decimals: 2, position: "left-space", decimalSeparator: DOT_COMMA, countries: ["AO"] },
  { code: "BWP", name: "Botswana Pula", symbol: "P", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["BW"] },
  { code: "MUR", name: "Mauritian Rupee", symbol: "₨", decimals: 2, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["MU"] },
  { code: "MGA", name: "Malagasy Ariary", symbol: "Ar", decimals: 2, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["MG"] },
  { code: "XOF", name: "West African CFA Franc", symbol: "CFA", decimals: 0, position: "right-space", decimalSeparator: SPACE_DOT, countries: ["BJ", "BF", "CI", "GW", "ML", "NE", "SN", "TG"] },
  { code: "XAF", name: "Central African CFA Franc", symbol: "FCFA", decimals: 0, position: "right-space", decimalSeparator: SPACE_DOT, countries: ["CM", "CF", "TD", "CG", "GQ", "GA"] },
  { code: "CDF", name: "Congolese Franc", symbol: "FC", decimals: 2, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["CD"] },
  { code: "GMD", name: "Gambian Dalasi", symbol: "D", decimals: 2, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["GM"] },
  { code: "SLL", name: "Sierra Leonean Leone", symbol: "Le", decimals: 2, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["SL"] },
  { code: "LRD", name: "Liberian Dollar", symbol: "L$", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["LR"] },
  { code: "SCR", name: "Seychellois Rupee", symbol: "₨", decimals: 2, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["SC"] },
  { code: "SDG", name: "Sudanese Pound", symbol: "ج.س.", decimals: 2, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["SD"] },
  { code: "SSP", name: "South Sudanese Pound", symbol: "£", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["SS"] },
  { code: "SOS", name: "Somali Shilling", symbol: "Sh", decimals: 2, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["SO"] },
  { code: "DJF", name: "Djiboutian Franc", symbol: "Fdj", decimals: 0, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["DJ"] },
  { code: "ERN", name: "Eritrean Nakfa", symbol: "Nfk", decimals: 2, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["ER"] },
  { code: "MWK", name: "Malawian Kwacha", symbol: "MK", decimals: 2, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["MW"] },

  // --- Latin America ---
  { code: "MXN", name: "Mexican Peso", symbol: "Mex$", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["MX"] },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", decimals: 2, position: "left-space", decimalSeparator: DOT_COMMA, countries: ["BR"] },
  { code: "ARS", name: "Argentine Peso", symbol: "$", decimals: 2, position: "left", decimalSeparator: DOT_COMMA, countries: ["AR"] },
  { code: "CLP", name: "Chilean Peso", symbol: "CLP$", decimals: 0, position: "left", decimalSeparator: DOT_COMMA, countries: ["CL"] },
  { code: "COP", name: "Colombian Peso", symbol: "COL$", decimals: 2, position: "left", decimalSeparator: DOT_COMMA, countries: ["CO"] },
  { code: "PEN", name: "Peruvian Sol", symbol: "S/", decimals: 2, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["PE"] },
  { code: "UYU", name: "Uruguayan Peso", symbol: "$U", decimals: 2, position: "left-space", decimalSeparator: DOT_COMMA, countries: ["UY"] },
  { code: "BOB", name: "Bolivian Boliviano", symbol: "Bs", decimals: 2, position: "left-space", decimalSeparator: DOT_COMMA, countries: ["BO"] },
  { code: "PYG", name: "Paraguayan Guarani", symbol: "₲", decimals: 0, position: "left-space", decimalSeparator: DOT_COMMA, countries: ["PY"] },
  { code: "VES", name: "Venezuelan Bolivar", symbol: "Bs.S", decimals: 2, position: "left-space", decimalSeparator: DOT_COMMA, countries: ["VE"] },
  { code: "GTQ", name: "Guatemalan Quetzal", symbol: "Q", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["GT"] },
  { code: "HNL", name: "Honduran Lempira", symbol: "L", decimals: 2, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["HN"] },
  { code: "NIO", name: "Nicaraguan Cordoba", symbol: "C$", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["NI"] },
  { code: "CRC", name: "Costa Rican Colon", symbol: "₡", decimals: 2, position: "left", decimalSeparator: DOT_COMMA, countries: ["CR"] },
  { code: "DOP", name: "Dominican Peso", symbol: "RD$", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["DO"] },
  { code: "JMD", name: "Jamaican Dollar", symbol: "J$", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["JM"] },
  { code: "TTD", name: "Trinidad & Tobago Dollar", symbol: "TT$", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["TT"] },
  { code: "BBD", name: "Barbadian Dollar", symbol: "Bds$", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["BB"] },
  { code: "BSD", name: "Bahamian Dollar", symbol: "B$", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["BS"] },
  { code: "BZD", name: "Belize Dollar", symbol: "BZ$", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["BZ"] },
  { code: "HTG", name: "Haitian Gourde", symbol: "G", decimals: 2, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["HT"] },
  { code: "CUP", name: "Cuban Peso", symbol: "₱", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["CU"] },
  { code: "GYD", name: "Guyanese Dollar", symbol: "G$", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["GY"] },
  { code: "SRD", name: "Surinamese Dollar", symbol: "Sr$", decimals: 2, position: "left", decimalSeparator: DOT_COMMA, countries: ["SR"] },
  { code: "XCD", name: "East Caribbean Dollar", symbol: "EC$", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["AG", "DM", "GD", "KN", "LC", "VC", "AI", "MS"] },

  // --- Central Asia / CIS ---
  { code: "KZT", name: "Kazakhstani Tenge", symbol: "₸", decimals: 2, position: "right-space", decimalSeparator: SPACE_DOT, countries: ["KZ"] },
  { code: "UZS", name: "Uzbekistani Som", symbol: "сўм", decimals: 2, position: "right-space", decimalSeparator: SPACE_DOT, countries: ["UZ"] },
  { code: "KGS", name: "Kyrgyzstani Som", symbol: "сом", decimals: 2, position: "right-space", decimalSeparator: SPACE_DOT, countries: ["KG"] },
  { code: "TJS", name: "Tajikistani Somoni", symbol: "ЅМ", decimals: 2, position: "left-space", decimalSeparator: SPACE_DOT, countries: ["TJ"] },
  { code: "TMT", name: "Turkmenistani Manat", symbol: "T", decimals: 2, position: "left-space", decimalSeparator: SPACE_DOT, countries: ["TM"] },

  // --- Pacific / misc small ---
  { code: "WST", name: "Samoan Tala", symbol: "WS$", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["WS"] },
  { code: "TOP", name: "Tongan Paʻanga", symbol: "T$", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["TO"] },
  { code: "VUV", name: "Vanuatu Vatu", symbol: "VT", decimals: 0, position: "right-space", decimalSeparator: COMMA_DOT, countries: ["VU"] },
  { code: "SBD", name: "Solomon Islands Dollar", symbol: "SI$", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["SB"] },
  { code: "MVR", name: "Maldivian Rufiyaa", symbol: "Rf", decimals: 2, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["MV"] },
  { code: "BTN", name: "Bhutanese Ngultrum", symbol: "Nu.", decimals: 2, position: "left-space", decimalSeparator: INDIAN, countries: ["BT"] },
  { code: "KPW", name: "North Korean Won", symbol: "₩", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["KP"] },
  { code: "MOP", name: "Macanese Pataca", symbol: "MOP$", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["MO"] },
  { code: "ANG", name: "Netherlands Antillean Guilder", symbol: "ƒ", decimals: 2, position: "left", decimalSeparator: DOT_COMMA, countries: ["CW", "SX"] },
  { code: "AWG", name: "Aruban Florin", symbol: "ƒ", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["AW"] },
  { code: "BMD", name: "Bermudian Dollar", symbol: "BD$", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["BM"] },
  { code: "KYD", name: "Cayman Islands Dollar", symbol: "CI$", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["KY"] },
  { code: "FKP", name: "Falkland Islands Pound", symbol: "£", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["FK"] },
  { code: "GIP", name: "Gibraltar Pound", symbol: "£", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["GI"] },
  { code: "SHP", name: "Saint Helena Pound", symbol: "£", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["SH"] },
  { code: "STN", name: "São Tomé & Príncipe Dobra", symbol: "Db", decimals: 2, position: "left-space", decimalSeparator: DOT_COMMA, countries: ["ST"] },
  { code: "CVE", name: "Cape Verdean Escudo", symbol: "$", decimals: 2, position: "left", decimalSeparator: DOT_COMMA, countries: ["CV"] },
  { code: "KMF", name: "Comorian Franc", symbol: "CF", decimals: 0, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["KM"] },
  { code: "LSL", name: "Lesotho Loti", symbol: "L", decimals: 2, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["LS"] },
  { code: "SZL", name: "Eswatini Lilangeni", symbol: "L", decimals: 2, position: "left-space", decimalSeparator: COMMA_DOT, countries: ["SZ"] },
  { code: "NAD", name: "Namibian Dollar", symbol: "N$", decimals: 2, position: "left", decimalSeparator: COMMA_DOT, countries: ["NA"] },
  { code: "XPF", name: "CFP Franc", symbol: "₣", decimals: 0, position: "right-space", decimalSeparator: SPACE_DOT, countries: ["PF", "NC", "WF"] },
];

// Build lookup maps once. ALL_CURRENCIES is a literal array, so keys are
// stable across the process lifetime.
const _byCode: Record<string, CurrencyDef> = Object.create(null);
const _byCountry: Record<string, CurrencyDef> = Object.create(null);
for (const c of ALL_CURRENCIES) {
  _byCode[c.code] = c;
  for (const cc of c.countries) {
    // First-write-wins: if two currencies claim the same country (rare —
    // typically when one entry lists subnational territories) the earlier
    // entry in the list wins, which matches "primary tender" intent.
    if (!_byCountry[cc]) _byCountry[cc] = c;
  }
}

export function byCode(code: string | undefined | null): CurrencyDef | undefined {
  if (!code) return undefined;
  return _byCode[code.toUpperCase()];
}

export function byCountry(countryCode: string | undefined | null): CurrencyDef | undefined {
  if (!countryCode) return undefined;
  return _byCountry[countryCode.toUpperCase()];
}
