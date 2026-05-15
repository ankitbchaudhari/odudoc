// Static location lists for the clinic-registration form. v1 covers
// India in depth (states + ~90 cities sorted alphabetically) and a
// handful of other countries OduDoc serves or plans to serve. For
// countries other than India the state/city pickers fall back to
// free-text inputs so the form still works.

export const COUNTRIES: ReadonlyArray<{ code: string; name: string }> = [
  { code: "IN", name: "India" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "QA", name: "Qatar" },
  { code: "BH", name: "Bahrain" },
  { code: "KW", name: "Kuwait" },
  { code: "OM", name: "Oman" },
  { code: "SG", name: "Singapore" },
  { code: "MY", name: "Malaysia" },
  { code: "TH", name: "Thailand" },
  { code: "ID", name: "Indonesia" },
  { code: "PH", name: "Philippines" },
  { code: "VN", name: "Vietnam" },
  { code: "BD", name: "Bangladesh" },
  { code: "LK", name: "Sri Lanka" },
  { code: "NP", name: "Nepal" },
  { code: "PK", name: "Pakistan" },
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  { code: "NZ", name: "New Zealand" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "NL", name: "Netherlands" },
  { code: "CH", name: "Switzerland" },
  { code: "SE", name: "Sweden" },
  { code: "IE", name: "Ireland" },
  { code: "ZA", name: "South Africa" },
  { code: "EG", name: "Egypt" },
  { code: "KE", name: "Kenya" },
  { code: "NG", name: "Nigeria" },
];

/** Indian states (28) + Union Territories (8), alphabetised. */
export const INDIAN_STATES: ReadonlyArray<string> = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  // UTs
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

/** Top ~90 Indian cities by population / OPD demand. Patient-facing
 *  cities the doctor would plausibly run a clinic in. Alphabetised so
 *  the dropdown is scannable. */
export const INDIAN_CITIES: ReadonlyArray<string> = [
  "Agra", "Ahmedabad", "Ajmer", "Aligarh", "Allahabad", "Amravati", "Amritsar",
  "Asansol", "Aurangabad", "Bareilly", "Bengaluru", "Bhavnagar", "Bhilai",
  "Bhopal", "Bhubaneswar", "Bikaner", "Chandigarh", "Chennai", "Coimbatore",
  "Cuttack", "Dehradun", "Delhi", "Dhanbad", "Durgapur", "Faridabad", "Firozabad",
  "Ghaziabad", "Goa", "Gorakhpur", "Greater Noida", "Gulbarga", "Guntur",
  "Gurgaon", "Guwahati", "Gwalior", "Howrah", "Hubli-Dharwad", "Hyderabad",
  "Indore", "Jabalpur", "Jaipur", "Jalandhar", "Jammu", "Jamnagar", "Jamshedpur",
  "Jhansi", "Jodhpur", "Kakinada", "Kalyan-Dombivli", "Kannur", "Kanpur", "Kochi",
  "Kolhapur", "Kolkata", "Kollam", "Kota", "Kozhikode", "Kurnool", "Lucknow",
  "Ludhiana", "Madurai", "Mangalore", "Meerut", "Moradabad", "Mumbai", "Mysuru",
  "Nagpur", "Nanded", "Nashik", "Navi Mumbai", "Nellore", "Noida", "Patna",
  "Pondicherry", "Pune", "Raipur", "Rajahmundry", "Rajkot", "Ranchi", "Rourkela",
  "Saharanpur", "Salem", "Sangli-Miraj & Kupwad", "Shimla", "Siliguri", "Solapur",
  "Srinagar", "Surat", "Thane", "Thiruvananthapuram", "Thrissur", "Tiruchirappalli",
  "Tirunelveli", "Tirupati", "Udaipur", "Vadodara", "Varanasi", "Vasai-Virar City",
  "Vellore", "Vijayawada", "Visakhapatnam", "Warangal",
];

/** UAE emirates — for the v2 pod. Free-text fallback handles other
 *  countries until we have first-class lists per pod. */
export const UAE_EMIRATES: ReadonlyArray<string> = [
  "Abu Dhabi", "Ajman", "Dubai", "Fujairah", "Ras Al Khaimah", "Sharjah",
  "Umm Al Quwain",
];

/** Looks up the right state list for a country. Empty array means the
 *  caller should fall back to a free-text input. */
export function statesForCountry(country: string): ReadonlyArray<string> {
  if (country === "India") return INDIAN_STATES;
  if (country === "United Arab Emirates") return UAE_EMIRATES;
  return [];
}

/** City list — only India has one in v1; other countries get a free
 *  text input. */
export function citiesForCountry(country: string): ReadonlyArray<string> {
  if (country === "India") return INDIAN_CITIES;
  return [];
}
