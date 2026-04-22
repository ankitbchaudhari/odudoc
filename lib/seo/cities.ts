// Registry of cities for location-based SEO landing pages.
//
// Each entry becomes /doctors-in/[slug]. Capturing searches like
// "online doctor in New York" / "gynecologist in Mumbai" is one of the
// biggest traffic sources for healthcare marketplaces.
//
// To add a city, append an entry here — sitemap and directory index update
// automatically.

export interface CityMeta {
  slug: string;
  /** Matches `Doctor.city` (case-insensitive) for filtering. */
  canonicalName: string;
  displayName: string;
  state?: string;
  country: string;
  titleTag: string;
  metaDescription: string;
  tagline: string;
  intro: string;
}

export const CITIES: CityMeta[] = [
  {
    slug: "new-york",
    canonicalName: "New York",
    displayName: "New York",
    state: "NY",
    country: "USA",
    titleTag: "Online Doctor Consultation in New York — Book a Video Visit",
    metaDescription:
      "Talk to top New York doctors online. Video consultations, home lab tests, and digital prescriptions — all on OduDoc.",
    tagline: "New York doctors, on your schedule.",
    intro:
      "Skip the subway and the waiting room. OduDoc connects New Yorkers with verified physicians across every major specialty for same-day video consultations, home lab collection, and digital prescriptions delivered to your preferred pharmacy.",
  },
  {
    slug: "los-angeles",
    canonicalName: "Los Angeles",
    displayName: "Los Angeles",
    state: "CA",
    country: "USA",
    titleTag: "Online Doctor Consultation in Los Angeles — Book a Video Visit",
    metaDescription:
      "Consult top Los Angeles doctors online. Video visits, home lab tests, and e-prescriptions on OduDoc.",
    tagline: "LA doctors. Same day. On video.",
    intro:
      "Beat LA traffic. OduDoc connects Angelenos with licensed doctors across every specialty for secure video consultations, with lab tests collected at home and prescriptions sent to the pharmacy of your choice.",
  },
  {
    slug: "chicago",
    canonicalName: "Chicago",
    displayName: "Chicago",
    state: "IL",
    country: "USA",
    titleTag: "Online Doctor Consultation in Chicago — OduDoc",
    metaDescription:
      "Book video consultations with verified Chicago doctors. Same-day appointments, home lab tests, and digital prescriptions.",
    tagline: "Chicago healthcare, without the wait.",
    intro:
      "OduDoc brings verified Chicago physicians into a single platform — book video visits in under a minute, get lab samples collected at home, and receive prescriptions digitally.",
  },
  {
    slug: "houston",
    canonicalName: "Houston",
    displayName: "Houston",
    state: "TX",
    country: "USA",
    titleTag: "Online Doctor Consultation in Houston — Book Now",
    metaDescription:
      "Consult with top Houston doctors online. Same-day appointments, video consultations, and home lab collection.",
    tagline: "Houston doctors. Faster than drive-time traffic.",
    intro:
      "OduDoc connects Houston patients with verified doctors for secure video consultations, home lab tests, and digital prescriptions.",
  },
  {
    slug: "boston",
    canonicalName: "Boston",
    displayName: "Boston",
    state: "MA",
    country: "USA",
    titleTag: "Online Doctor Consultation in Boston — OduDoc",
    metaDescription:
      "Connect with top Boston doctors online. Video consultations, lab tests, and digital prescriptions.",
    tagline: "Boston care, from your couch.",
    intro:
      "OduDoc makes quality Boston-area healthcare accessible from anywhere — video visits with verified specialists, lab samples at home, and prescriptions delivered digitally.",
  },
  {
    slug: "san-francisco",
    canonicalName: "San Francisco",
    displayName: "San Francisco",
    state: "CA",
    country: "USA",
    titleTag: "Online Doctor Consultation in San Francisco — OduDoc",
    metaDescription:
      "Book a verified San Francisco doctor for a video consultation. Same-day slots, home lab tests, e-prescriptions.",
    tagline: "Bay Area doctors, booked in 60 seconds.",
    intro:
      "OduDoc brings verified Bay Area physicians onto one platform — video visits, home lab collection, and digital prescriptions routed to your pharmacy.",
  },
  {
    slug: "dallas",
    canonicalName: "Dallas",
    displayName: "Dallas",
    state: "TX",
    country: "USA",
    titleTag: "Online Doctor Consultation in Dallas — OduDoc",
    metaDescription:
      "Consult top Dallas doctors online. Same-day video consultations, home lab tests, and digital prescriptions.",
    tagline: "Dallas healthcare, on your schedule.",
    intro:
      "OduDoc connects Dallas patients with verified physicians for secure video consultations, home lab collection, and prescriptions sent to your chosen pharmacy.",
  },
  {
    slug: "london",
    canonicalName: "London",
    displayName: "London",
    country: "UK",
    titleTag: "Online Doctor Consultation in London — OduDoc",
    metaDescription:
      "Consult verified London doctors over video. Private, same-day appointments and digital prescriptions.",
    tagline: "London GPs and specialists, on-demand.",
    intro:
      "OduDoc makes private London healthcare accessible anywhere — video visits with verified GPs and specialists, and digital prescriptions for your chosen pharmacy.",
  },
  {
    slug: "mumbai",
    canonicalName: "Mumbai",
    displayName: "Mumbai",
    country: "India",
    titleTag: "Online Doctor Consultation in Mumbai — OduDoc",
    metaDescription:
      "Book a verified Mumbai doctor online. Video consultations, lab tests, and e-prescriptions — all on OduDoc.",
    tagline: "Mumbai doctors, zero commute.",
    intro:
      "OduDoc connects Mumbaikars with verified doctors across every specialty for secure video consultations, with lab samples collected at home and prescriptions delivered digitally.",
  },
  {
    slug: "delhi",
    canonicalName: "Delhi",
    displayName: "Delhi",
    country: "India",
    titleTag: "Online Doctor Consultation in Delhi — OduDoc",
    metaDescription:
      "Consult top Delhi doctors online. Same-day video consultations, home lab tests, and digital prescriptions.",
    tagline: "Delhi healthcare, delivered online.",
    intro:
      "OduDoc makes Delhi-area healthcare accessible from anywhere — book video visits with verified doctors, order lab tests with home collection, and get prescriptions to your pharmacy.",
  },
  {
    slug: "bangalore",
    canonicalName: "Bangalore",
    displayName: "Bangalore",
    country: "India",
    titleTag: "Online Doctor Consultation in Bangalore — OduDoc",
    metaDescription:
      "Book a verified Bangalore doctor online. Video consultations and home lab tests on OduDoc.",
    tagline: "Bangalore doctors, booked in a minute.",
    intro:
      "OduDoc brings verified Bangalore physicians onto a single platform. Video visits across every specialty, home lab collection, and digital prescriptions.",
  },
  {
    slug: "dubai",
    canonicalName: "Dubai",
    displayName: "Dubai",
    country: "UAE",
    titleTag: "Online Doctor Consultation in Dubai — OduDoc",
    metaDescription:
      "Consult verified Dubai doctors online — video consultations, digital prescriptions, same-day appointments.",
    tagline: "Dubai healthcare, on your schedule.",
    intro:
      "OduDoc connects Dubai patients with verified physicians across every specialty for secure video consultations and digital prescriptions.",
  },
  {
    slug: "hyderabad",
    canonicalName: "Hyderabad",
    displayName: "Hyderabad",
    state: "Telangana",
    country: "India",
    titleTag: "Online Doctor Consultation in Hyderabad — OduDoc",
    metaDescription:
      "Consult verified Hyderabad doctors online. Video visits, home lab tests, and digital prescriptions on OduDoc.",
    tagline: "Hyderabad doctors, at your fingertips.",
    intro:
      "From Jubilee Hills to LB Nagar, OduDoc connects Hyderabad patients with verified physicians across every specialty. Book a same-day video consultation, get lab samples collected at home, and receive your prescription digitally.",
  },
  {
    slug: "chennai",
    canonicalName: "Chennai",
    displayName: "Chennai",
    state: "Tamil Nadu",
    country: "India",
    titleTag: "Online Doctor Consultation in Chennai — OduDoc",
    metaDescription:
      "Book verified Chennai doctors online for video consultations, home lab tests, and digital prescriptions — all on OduDoc.",
    tagline: "Chennai doctors, one tap away.",
    intro:
      "OduDoc connects Chennai residents with verified specialists across every discipline for secure video consultations. Home lab collection in the city and suburbs, plus digital prescriptions delivered straight to your pharmacy of choice.",
  },
  {
    slug: "pune",
    canonicalName: "Pune",
    displayName: "Pune",
    state: "Maharashtra",
    country: "India",
    titleTag: "Online Doctor Consultation in Pune — OduDoc",
    metaDescription:
      "Consult verified Pune doctors online. Same-day video visits, home lab tests, and digital prescriptions on OduDoc.",
    tagline: "Pune healthcare, without the commute.",
    intro:
      "OduDoc brings Pune's top physicians onto a single platform. Video consultations across every specialty, home lab test collection in Kothrud, Hinjewadi, Viman Nagar and beyond, and digital prescriptions you can fill at any pharmacy.",
  },
  {
    slug: "kolkata",
    canonicalName: "Kolkata",
    displayName: "Kolkata",
    state: "West Bengal",
    country: "India",
    titleTag: "Online Doctor Consultation in Kolkata — OduDoc",
    metaDescription:
      "Talk to verified Kolkata doctors online. Video consultations, home lab tests, and digital prescriptions on OduDoc.",
    tagline: "Kolkata doctors, accessible from home.",
    intro:
      "OduDoc connects Kolkata patients with verified specialists across every area of medicine. Same-day video consultations, home lab sample collection across Salt Lake, New Town and South Kolkata, plus e-prescriptions.",
  },
  {
    slug: "ahmedabad",
    canonicalName: "Ahmedabad",
    displayName: "Ahmedabad",
    state: "Gujarat",
    country: "India",
    titleTag: "Online Doctor Consultation in Ahmedabad — OduDoc",
    metaDescription:
      "Consult verified Ahmedabad doctors online — video visits, home lab tests, and digital prescriptions on OduDoc.",
    tagline: "Ahmedabad healthcare, on demand.",
    intro:
      "OduDoc connects Ahmedabad residents with verified physicians for secure video consultations across every specialty. Home lab collection across SG Highway, Bopal, and Maninagar, with digital prescriptions that any pharmacy can fill.",
  },
  {
    slug: "jaipur",
    canonicalName: "Jaipur",
    displayName: "Jaipur",
    state: "Rajasthan",
    country: "India",
    titleTag: "Online Doctor Consultation in Jaipur — OduDoc",
    metaDescription:
      "Book verified Jaipur doctors online. Video consultations, home lab tests, and digital prescriptions — all on OduDoc.",
    tagline: "Jaipur doctors, booked online.",
    intro:
      "OduDoc brings Jaipur's specialists onto a single platform. Video consultations across every area of medicine, home lab collection citywide, and digital prescriptions delivered to your pharmacy.",
  },
];

export function getCityBySlug(slug: string): CityMeta | null {
  return CITIES.find((c) => c.slug === slug) || null;
}
