import { ProfileService } from './profileService';

export const DEFAULT_CAIRO_LAT = 30.0444;
export const DEFAULT_CAIRO_LNG = 31.2357;
export const DEFAULT_RADIUS_KM = 3;

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface ReverseGeocodeResult {
  displayName: string;
  address: string;
  street?: string;
  building?: string;
  district: string;
  city: string;
  governorate: string;
  country: string;
  nearestUniversity?: string;
  distanceToUniversityKm?: number;
}

export interface AddressSuggestion {
  id: string;
  title: string;
  subtitle: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
  governorate: string;
  city: string;
  district: string;
  nearestUniversity: string;
  distanceToUniversityKm: number;
}

export interface NearbyPlace {
  id: string;
  name: string;
  nameEn?: string;
  category: 'university' | 'transport' | 'pharmacy' | 'restaurant' | 'supermarket' | 'hospital' | 'cafe' | 'other';
  latitude: number;
  longitude: number;
  distanceKm?: number;
  address?: string;
}

export interface NearbyResponse {
  lat: number;
  lng: number;
  radius: number;
  places: NearbyPlace[];
  source: 'api' | 'geoapify' | 'osm_live' | 'fallback';
}

export interface KnownEgyptLocation {
  keywords: string[];
  lat: number;
  lng: number;
  labelAr: string;
  labelEn: string;
  districtAr?: string;
  cityAr?: string;
  governorateAr?: string;
  nearestUniversityAr?: string;
  nearestUniversityEn?: string;
  isGenericFallback?: boolean;
}

export interface EgyptUniversityEntry {
  nameAr: string;
  nameEn: string;
  keywords: string[];
  lat: number;
  lng: number;
  cityAr: string;
  governorateAr: string;
}

export interface RouteStep {
  instructionAr: string;
  instructionEn: string;
  streetName: string;
  distanceMeters: number;
  durationSeconds: number;
  icon: string;
}

export interface RouteDirectionsResult {
  coordinates: Array<[number, number]>; // [lat, lng] pairs for Leaflet polyline
  distanceKm: number;
  durationMinutes: number;
  walkingMinutes: number;
  drivingMinutes: number;
  steps: RouteStep[];
  mode: 'walking' | 'driving';
  googleMapsDirUrl: string;
}

/**
 * Verified coordinates of major Egyptian Universities for accurate Nearest University & Distance calculation.
 */
export const EGYPT_UNIVERSITIES: EgyptUniversityEntry[] = [
  {
    nameAr: 'جامعة طنطا',
    nameEn: 'Tanta University',
    keywords: ['جامعة طنطا', 'طنطا', 'tanta university', 'tanta', 'المجمع الطبي طنطا', 'سبرباي'],
    lat: 30.7902,
    lng: 30.9964,
    cityAr: 'طنطا',
    governorateAr: 'الغربية',
  },
  {
    nameAr: 'جامعة المنصورة',
    nameEn: 'Mansoura University',
    keywords: ['جامعة المنصورة', 'المنصورة', 'mansoura university', 'mansoura', 'توشكى', 'جيهان'],
    lat: 31.0419,
    lng: 31.3582,
    cityAr: 'المنصورة',
    governorateAr: 'الدقهلية',
  },
  {
    nameAr: 'جامعة القاهرة',
    nameEn: 'Cairo University',
    keywords: ['جامعة القاهرة', 'cairo university', 'بين السرايات', 'الدقي', 'الجيزة'],
    lat: 30.0276,
    lng: 31.2089,
    cityAr: 'الجيزة',
    governorateAr: 'الجيزة',
  },
  {
    nameAr: 'جامعة عين شمس',
    nameEn: 'Ain Shams University',
    keywords: ['جامعة عين شمس', 'عين شمس', 'ain shams', 'العباسية'],
    lat: 30.0764,
    lng: 31.2844,
    cityAr: 'القاهرة',
    governorateAr: 'القاهرة',
  },
  {
    nameAr: 'جامعة الإسكندرية',
    nameEn: 'Alexandria University',
    keywords: ['جامعة الإسكندرية', 'الإسكندرية', 'alexandria university', 'الشاطبي', 'سموحة'],
    lat: 31.2065,
    lng: 29.9102,
    cityAr: 'الإسكندرية',
    governorateAr: 'الإسكندرية',
  },
  {
    nameAr: 'جامعة الزقازيق',
    nameEn: 'Zagazig University',
    keywords: ['جامعة الزقازيق', 'الزقازيق', 'zagazig', 'القومية'],
    lat: 30.5877,
    lng: 31.5020,
    cityAr: 'الزقازيق',
    governorateAr: 'الشرقية',
  },
  {
    nameAr: 'جامعة الأزهر',
    nameEn: 'Al-Azhar University',
    keywords: ['جامعة الأزهر', 'الأزهر', 'al-azhar', 'مدينة نصر'],
    lat: 30.0586,
    lng: 31.3147,
    cityAr: 'مدينة نصر',
    governorateAr: 'القاهرة',
  },
  {
    nameAr: 'جامعة حلوان',
    nameEn: 'Helwan University',
    keywords: ['جامعة حلوان', 'حلوان', 'helwan'],
    lat: 29.8668,
    lng: 31.3153,
    cityAr: 'حلوان',
    governorateAr: 'القاهرة',
  },
  {
    nameAr: 'جامعة 6 أكتوبر',
    nameEn: 'October 6 University (O6U)',
    keywords: ['جامعة 6 أكتوبر', '6 أكتوبر', 'أكتوبر', 'الحصري', 'october', 'must', 'msa'],
    lat: 29.9728,
    lng: 30.9437,
    cityAr: '6 أكتوبر',
    governorateAr: 'الجيزة',
  },
  {
    nameAr: 'الجامعة الأمريكية بالقاهرة (AUC)',
    nameEn: 'American University in Cairo (AUC)',
    keywords: ['الجامعة الأمريكية', 'auc', 'التجمع الخامس', 'القاهرة الجديدة', 'الجامعة الألمانية', 'guc'],
    lat: 30.0194,
    lng: 31.5015,
    cityAr: 'القاهرة الجديدة',
    governorateAr: 'القاهرة',
  },
  {
    nameAr: 'جامعة أسيوط',
    nameEn: 'Assiut University',
    keywords: ['جامعة أسيوط', 'أسيوط', 'assiut', 'asyut'],
    lat: 27.1889,
    lng: 31.1686,
    cityAr: 'أسيوط',
    governorateAr: 'أسيوط',
  },
  {
    nameAr: 'جامعة بنها',
    nameEn: 'Banha University',
    keywords: ['جامعة بنها', 'بنها', 'banha', 'القليوبية'],
    lat: 30.4718,
    lng: 31.1859,
    cityAr: 'بنها',
    governorateAr: 'القليوبية',
  },
  {
    nameAr: 'جامعة المنوفية',
    nameEn: 'Menofia University',
    keywords: ['جامعة المنوفية', 'المنوفية', 'شبين الكوم', 'menofia'],
    lat: 30.5656,
    lng: 31.0131,
    cityAr: 'شبين الكوم',
    governorateAr: 'المنوفية',
  },
  {
    nameAr: 'جامعة كفر الشيخ',
    nameEn: 'Kafr El Sheikh University',
    keywords: ['جامعة كفر الشيخ', 'كفر الشيخ', 'kafr el sheikh'],
    lat: 31.0969,
    lng: 30.9491,
    cityAr: 'كفر الشيخ',
    governorateAr: 'كفر الشيخ',
  },
  {
    nameAr: 'جامعة دمياط',
    nameEn: 'Damietta University',
    keywords: ['جامعة دمياط', 'دمياط', 'دمياط الجديدة', 'damietta'],
    lat: 31.4265,
    lng: 31.6625,
    cityAr: 'دمياط الجديدة',
    governorateAr: 'دمياط',
  },
  {
    nameAr: 'جامعة قناة السويس',
    nameEn: 'Suez Canal University',
    keywords: ['جامعة قناة السويس', 'قناة السويس', 'الإسماعيلية', 'ismailia'],
    lat: 30.6211,
    lng: 32.2684,
    cityAr: 'الإسماعيلية',
    governorateAr: 'الإسماعيلية',
  },
  {
    nameAr: 'جامعة بورسعيد',
    nameEn: 'Port Said University',
    keywords: ['جامعة بورسعيد', 'بورسعيد', 'بورفؤاد', 'port said'],
    lat: 31.2462,
    lng: 32.3164,
    cityAr: 'بورسعيد',
    governorateAr: 'بورسعيد',
  },
  {
    nameAr: 'جامعة السويس',
    nameEn: 'Suez University',
    keywords: ['جامعة السويس', 'السويس', 'suez'],
    lat: 29.9969,
    lng: 32.5015,
    cityAr: 'السويس',
    governorateAr: 'السويس',
  },
  {
    nameAr: 'جامعة المنيا',
    nameEn: 'Minya University',
    keywords: ['جامعة المنيا', 'المنيا', 'minya'],
    lat: 28.1242,
    lng: 30.7358,
    cityAr: 'المنيا',
    governorateAr: 'المنيا',
  },
  {
    nameAr: 'جامعة بني سويف',
    nameEn: 'Beni Suef University',
    keywords: ['جامعة بني سويف', 'بني سويف', 'beni suef'],
    lat: 29.0744,
    lng: 31.1021,
    cityAr: 'بني سويف',
    governorateAr: 'بني سويف',
  },
  {
    nameAr: 'جامعة الفيوم',
    nameEn: 'Fayoum University',
    keywords: ['جامعة الفيوم', 'الفيوم', 'fayoum'],
    lat: 29.3197,
    lng: 30.8356,
    cityAr: 'الفيوم',
    governorateAr: 'الفيوم',
  },
  {
    nameAr: 'جامعة سوهاج',
    nameEn: 'Sohag University',
    keywords: ['جامعة سوهاج', 'سوهاج', 'sohag'],
    lat: 26.5632,
    lng: 31.7081,
    cityAr: 'سوهاج',
    governorateAr: 'سوهاج',
  },
  {
    nameAr: 'جامعة جنوب الوادي',
    nameEn: 'South Valley University',
    keywords: ['جامعة جنوب الوادي', 'جنوب الوادي', 'قنا', 'qena'],
    lat: 26.1912,
    lng: 32.7438,
    cityAr: 'قنا',
    governorateAr: 'قنا',
  },
  {
    nameAr: 'جامعة أسوان',
    nameEn: 'Aswan University',
    keywords: ['جامعة أسوان', 'أسوان', 'aswan'],
    lat: 24.0005,
    lng: 32.8602,
    cityAr: 'أسوان',
    governorateAr: 'أسوان',
  },
  {
    nameAr: 'جامعة دمنهور',
    nameEn: 'Damanhour University',
    keywords: ['جامعة دمنهور', 'دمنهور', 'البحيرة', 'damanhour'],
    lat: 31.0409,
    lng: 30.4535,
    cityAr: 'دمنهور',
    governorateAr: 'البحيرة',
  },
];

/**
 * Normalizes Arabic & English text for resilient matching across spelling variations:
 * - ه <-> ة (جامعه المنصوره === جامعة المنصورة)
 * - أ/إ/آ/ٱ -> ا
 * - ى/ئ -> ي and trailing ا/ي variations (توشكا === توشكى === توشكي)
 * - strips diacritics (tashkeel) and tatweel
 */
export function normalizeArabicForSearch(input?: string | null): string {
  if (!input) return '';
  return String(input)
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // remove tashkeel & tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىيئ]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/توشكا/g, 'توشكي')
    .replace(/طنطا/g, 'طنطي')
    .replace(/بنها/g, 'بنهي')
    .replace(/طلخا/g, 'طلخي')
    .replace(/شبرا/g, 'شبري')
    .replace(/[,،.;:/\\|_()-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes common informal Arabic spellings into standard Arabic for OpenStreetMap Nominatim & ArcGIS queries.
 */
export function normalizeQueryForNominatim(input?: string | null): string {
  if (!input) return '';
  return String(input)
    .trim()
    .replace(/(?:^|\s)ش(?:\.|\s)+/g, ' شارع ')
    .replace(/\bجامعه\b/g, 'جامعة')
    .replace(/\bكليه\b/g, 'كلية')
    .replace(/\bبوابه\b/g, 'بوابة')
    .replace(/\bمدينه\b/g, 'مدينة')
    .replace(/\bمحافظه\b/g, 'محافظة')
    .replace(/\bعماره\b/g, 'عمارة')
    .replace(/\bالمنصوره\b/g, 'المنصورة')
    .replace(/\bالدقهليه\b/g, 'الدقهلية')
    .replace(/\bتوشكا\b/g, 'توشكى')
    .replace(/\bالقاهره\b/g, 'القاهرة')
    .replace(/\bالجيزه\b/g, 'الجيزة')
    .replace(/\bالاسكندريه\b/g, 'الإسكندرية')
    .replace(/\bالاسكندرية\b/g, 'الإسكندرية')
    .replace(/\bالشرقيه\b/g, 'الشرقية')
    .replace(/\bالغربيه\b/g, 'الغربية')
    .replace(/\bالمنوفيه\b/g, 'المنوفية')
    .replace(/\bالقليوبيه\b/g, 'القليوبية')
    .replace(/\bالبحيره\b/g, 'البحيرة')
    .replace(/\bالاسماعيليه\b/g, 'الإسماعيلية')
    .replace(/\bالجديده\b/g, 'الجديدة')
    .replace(/\bالقديمه\b/g, 'القديمة')
    .replace(/\s+/g, ' ')
    .trim();
}

// Known coordinates for major Egyptian universities, districts, streets, and cities
// Ordered from most specific (streets/districts/gates/universities/cities) to general fallback governorates
const EGYPT_LOCATION_COORDS: KnownEgyptLocation[] = [
  // ── Tanta & Gharbia (Detailed Streets, Campuses & Districts) ──
  {
    keywords: ['سبرباي', 'مجمع الكليات طنطا', 'كلية الهندسة طنطا', 'كلية الصيدلة طنطا', 'sperbay', 'sibarbay'],
    lat: 30.8125,
    lng: 31.0068,
    labelAr: 'منطقة سبرباي، بجوار مجمع كليات جامعة طنطا، طنطا، محافظة الغربية',
    labelEn: 'Sperbay Campus Area, near Tanta University, Tanta, Gharbia',
    districtAr: 'سبرباي',
    cityAr: 'طنطا',
    governorateAr: 'الغربية',
    nearestUniversityAr: 'جامعة طنطا',
    nearestUniversityEn: 'Tanta University',
  },
  {
    keywords: ['المجمع الطبي طنطا', 'كلية الطب طنطا', 'مستشفى طنطا الجامعي', 'شارع البحر طنطا'],
    lat: 30.7902,
    lng: 30.9964,
    labelAr: 'شارع الجيش (البحر)، بجوار المجمع الطبي وجامعة طنطا، حي ثان طنطا، محافظة الغربية',
    labelEn: 'El Geish (El Bahr) St, near Tanta University Medical Campus, Tanta, Gharbia',
    districtAr: 'شارع البحر / المجمع الطبي',
    cityAr: 'طنطا',
    governorateAr: 'الغربية',
    nearestUniversityAr: 'جامعة طنطا',
    nearestUniversityEn: 'Tanta University',
  },
  {
    keywords: ['شارع سعيد', 'سعيد طنطا', 'شارع الحلو', 'الحلو طنطا', 'شارع النحاس', 'النحاس طنطا', 'شارع المعتصم', 'شارع بطرس', 'شارع الفاتح'],
    lat: 30.7948,
    lng: 31.0012,
    labelAr: 'شارع سعيد، متفرع من شارع البحر، حي ثان طنطا، طنطا، محافظة الغربية',
    labelEn: 'Saeed St, off El Bahr St, Tanta, Gharbia',
    districtAr: 'شارع سعيد',
    cityAr: 'طنطا',
    governorateAr: 'الغربية',
    nearestUniversityAr: 'جامعة طنطا',
    nearestUniversityEn: 'Tanta University',
  },
  {
    keywords: ['شارع الاستاد طنطا', 'استاد طنطا', 'كفر عصام', 'شارع الجلاء طنطا', 'الجلاء طنطا', 'قحافة', 'سيجر', 'العجيزي'],
    lat: 30.7995,
    lng: 30.9921,
    labelAr: 'شارع الاستاد، حي ثان طنطا، بجوار جامعة طنطا، طنطا، محافظة الغربية',
    labelEn: 'El Stadium St, Tanta, Gharbia',
    districtAr: 'حي ثان طنطا',
    cityAr: 'طنطا',
    governorateAr: 'الغربية',
    nearestUniversityAr: 'جامعة طنطا',
    nearestUniversityEn: 'Tanta University',
  },
  {
    keywords: ['جامعة طنطا', 'tanta university', 'tanta', 'طنطا', 'الغربية', 'ف طنطا', 'في طنطا', 'بطنطا'],
    lat: 30.7902,
    lng: 30.9985,
    labelAr: 'شارع الجيش (البحر)، بجوار جامعة طنطا، حي ثان طنطا، طنطا، محافظة الغربية',
    labelEn: 'El Geish (El Bahr) St, near Tanta University, Tanta, Gharbia',
    districtAr: 'شارع البحر / حي الجامعة',
    cityAr: 'طنطا',
    governorateAr: 'الغربية',
    nearestUniversityAr: 'جامعة طنطا',
    nearestUniversityEn: 'Tanta University',
  },

  // ── Mansoura & Dakahlia (Specific Gates, Streets, Districts & Universities) ──
  {
    keywords: ['توشكى', 'توشكا', 'بوابة توشكى', 'شارع توشكى', 'toshka'],
    lat: 31.0422,
    lng: 31.3568,
    labelAr: 'شارع توشكى، حي الجامعة، بجوار جامعة المنصورة، المنصورة، محافظة الدقهلية',
    labelEn: 'Toshka St, University District, near Mansoura University, Mansoura',
    districtAr: 'حي الجامعة - شارع توشكى',
    cityAr: 'المنصورة',
    governorateAr: 'الدقهلية',
    nearestUniversityAr: 'جامعة المنصورة',
    nearestUniversityEn: 'Mansoura University',
  },
  {
    keywords: ['جيهان', 'شارع جيهان', 'بوابة جيهان', 'jehan', 'gehan'],
    lat: 31.0396,
    lng: 31.3612,
    labelAr: 'شارع جيهان، حي الجامعة، بجوار جامعة المنصورة، المنصورة، محافظة الدقهلية',
    labelEn: 'Gehan St, University District, Mansoura, Dakahlia',
    districtAr: 'حي الجامعة - شارع جيهان',
    cityAr: 'المنصورة',
    governorateAr: 'الدقهلية',
    nearestUniversityAr: 'جامعة المنصورة',
    nearestUniversityEn: 'Mansoura University',
  },
  {
    keywords: ['جامعة المنصورة', 'mansoura university', 'حي الجامعة', 'القرية الأولمبية', 'بوابة البارون'],
    lat: 31.0419,
    lng: 31.3582,
    labelAr: 'حي الجامعة، بجوار جامعة المنصورة، المنصورة، محافظة الدقهلية',
    labelEn: 'University District, near Mansoura University, Mansoura, Dakahlia',
    districtAr: 'حي الجامعة',
    cityAr: 'المنصورة',
    governorateAr: 'الدقهلية',
    nearestUniversityAr: 'جامعة المنصورة',
    nearestUniversityEn: 'Mansoura University',
  },
  {
    keywords: ['المشاية', 'المشاية السفلية', 'المشاية العلوية', 'el mashaya'],
    lat: 31.0456,
    lng: 31.3689,
    labelAr: 'شارع المشاية السفلية، حي غرب المنصورة، المنصورة، محافظة الدقهلية',
    labelEn: 'El Mashaya St, Mansoura, Dakahlia',
    districtAr: 'شارع المشاية',
    cityAr: 'المنصورة',
    governorateAr: 'الدقهلية',
    nearestUniversityAr: 'جامعة المنصورة',
    nearestUniversityEn: 'Mansoura University',
  },
  {
    keywords: ['شارع الجلاء', 'بوابة الجلاء', 'الجلاء المنصورة', 'شارع الترعة'],
    lat: 31.0428,
    lng: 31.3712,
    labelAr: 'شارع الجلاء، حي غرب المنصورة، المنصورة، محافظة الدقهلية',
    labelEn: 'El Galaa St, Mansoura, Dakahlia',
    districtAr: 'شارع الجلاء',
    cityAr: 'المنصورة',
    governorateAr: 'الدقهلية',
    nearestUniversityAr: 'جامعة المنصورة',
    nearestUniversityEn: 'Mansoura University',
  },
  {
    keywords: ['توريل', 'توريل الجديدة', 'توريل القديمة', 'toreel', 'toriel'],
    lat: 31.0485,
    lng: 31.3912,
    labelAr: 'حي توريل، المنصورة، محافظة الدقهلية',
    labelEn: 'Toreel District, Mansoura, Dakahlia',
    districtAr: 'حي توريل',
    cityAr: 'المنصورة',
    governorateAr: 'الدقهلية',
    nearestUniversityAr: 'جامعة المنصورة',
    nearestUniversityEn: 'Mansoura University',
  },
  {
    keywords: ['طلخا', 'talkha'],
    lat: 31.0539,
    lng: 31.3772,
    labelAr: 'مدينة طلخا، المنصورة، محافظة الدقهلية',
    labelEn: 'Talkha, Mansoura, Dakahlia',
    districtAr: 'طلخا',
    cityAr: 'طلخا',
    governorateAr: 'الدقهلية',
    nearestUniversityAr: 'جامعة المنصورة',
    nearestUniversityEn: 'Mansoura University',
  },
  {
    keywords: ['ميت خميس', 'سندوب', 'جديلة', 'قولنجيل', 'الدراسات', 'قناة السويس المنصورة', 'شارع الجمهورية المنصورة'],
    lat: 31.0435,
    lng: 31.3845,
    labelAr: 'شارع الجمهورية، المنصورة، محافظة الدقهلية',
    labelEn: 'El Gomhouria St, Mansoura, Dakahlia',
    districtAr: 'شارع الجمهورية',
    cityAr: 'المنصورة',
    governorateAr: 'الدقهلية',
    nearestUniversityAr: 'جامعة المنصورة',
    nearestUniversityEn: 'Mansoura University',
  },
  {
    keywords: ['المنصورة', 'mansoura', 'الدقهلية', 'dakahlia', 'dakahliya'],
    lat: 31.0419,
    lng: 31.3650,
    labelAr: 'حي الجامعة، المنصورة، محافظة الدقهلية',
    labelEn: 'Mansoura, Dakahlia Governorate',
    districtAr: 'حي الجامعة',
    cityAr: 'المنصورة',
    governorateAr: 'الدقهلية',
    nearestUniversityAr: 'جامعة المنصورة',
    nearestUniversityEn: 'Mansoura University',
  },

  // ── Cairo & Giza Specific Universities & Districts ──
  {
    keywords: ['جامعة القاهرة', 'cairo university', 'بين السرايات', 'ميدان النهضة', 'شارع ثروت'],
    lat: 30.0276,
    lng: 31.2089,
    labelAr: 'شارع الجامعة، بين السرايات، بجوار جامعة القاهرة، الجيزة',
    labelEn: 'Near Cairo University, Bein El Sarayat, Giza',
    districtAr: 'بين السرايات',
    cityAr: 'الجيزة',
    governorateAr: 'الجيزة',
    nearestUniversityAr: 'جامعة القاهرة',
    nearestUniversityEn: 'Cairo University',
  },
  {
    keywords: ['الدقي', 'dokki', 'مصدق', 'شارع مصدق', 'محجوب', 'التحرير الدقي'],
    lat: 30.0385,
    lng: 31.2122,
    labelAr: 'شارع مصدق، حي الدقي، بجوار جامعة القاهرة، الجيزة',
    labelEn: 'Mossadak St, Dokki District, Giza',
    districtAr: 'حي الدقي',
    cityAr: 'الدقي',
    governorateAr: 'الجيزة',
    nearestUniversityAr: 'جامعة القاهرة',
    nearestUniversityEn: 'Cairo University',
  },
  {
    keywords: ['المهندسين', 'mohandessin', 'جامعة الدول', 'شهاب', 'لبنان'],
    lat: 30.0566,
    lng: 31.2003,
    labelAr: 'شارع جامعة الدول العربية، حي المهندسين، الجيزة',
    labelEn: 'Gameat El Dewal St, Mohandessin, Giza',
    districtAr: 'حي المهندسين',
    cityAr: 'المهندسين',
    governorateAr: 'الجيزة',
    nearestUniversityAr: 'جامعة القاهرة',
    nearestUniversityEn: 'Cairo University',
  },
  {
    keywords: ['الهرم', 'فيصل', 'haram', 'faisal', 'العريش', 'المريوطية', 'الطالبية', 'شارع فيصل', 'شارع الهرم'],
    lat: 30.0021,
    lng: 31.1765,
    labelAr: 'شارع الملك فيصل، حي الهرم، الجيزة',
    labelEn: 'King Faisal St, Haram, Giza',
    districtAr: 'فيصل / الهرم',
    cityAr: 'الجيزة',
    governorateAr: 'الجيزة',
    nearestUniversityAr: 'جامعة القاهرة',
    nearestUniversityEn: 'Cairo University',
  },
  {
    keywords: ['6 أكتوبر', 'أكتوبر', 'october', 'msa', 'must', 'جامعة 6 أكتوبر', 'الحصري', 'الحي المتميز', 'ميدان الحصري'],
    lat: 29.9728,
    lng: 30.9437,
    labelAr: 'محور الكفراوي، ميدان الحصري، بجوار جامعة 6 أكتوبر، مدينة 6 أكتوبر، الجيزة',
    labelEn: 'El Hosary Sq, near October 6 University, 6th of October City, Giza',
    districtAr: 'الحي السابع - ميدان الحصري',
    cityAr: '6 أكتوبر',
    governorateAr: 'الجيزة',
    nearestUniversityAr: 'جامعة 6 أكتوبر',
    nearestUniversityEn: 'October 6 University',
  },
  {
    keywords: ['الشيخ زايد', 'sheikh zayed', 'زايد', 'جامعة النيل'],
    lat: 30.0376,
    lng: 30.9726,
    labelAr: 'المحور المركزي، مدينة الشيخ زايد، الجيزة',
    labelEn: 'Sheikh Zayed City, Giza',
    districtAr: 'الشيخ زايد',
    cityAr: 'الشيخ زايد',
    governorateAr: 'الجيزة',
    nearestUniversityAr: 'جامعة 6 أكتوبر',
    nearestUniversityEn: 'October 6 University',
  },
  {
    keywords: ['جامعة عين شمس', 'ain shams', 'العباسية', 'abbasia', 'الخليفة المأمون'],
    lat: 30.0764,
    lng: 31.2844,
    labelAr: 'شارع الخليفة المأمون، العباسية، بجوار جامعة عين شمس، القاهرة',
    labelEn: 'El Khalifa El Maamoun St, Abbasia, near Ain Shams University, Cairo',
    districtAr: 'العباسية',
    cityAr: 'القاهرة',
    governorateAr: 'القاهرة',
    nearestUniversityAr: 'جامعة عين شمس',
    nearestUniversityEn: 'Ain Shams University',
  },
  {
    keywords: ['مصر الجديدة', 'heliopolis', 'روكسي', 'الكوربة', 'الميرغني', 'النزهة'],
    lat: 30.0909,
    lng: 31.3227,
    labelAr: 'شارع الميرغني، مصر الجديدة، القاهرة',
    labelEn: 'El Merghany St, Heliopolis, Cairo',
    districtAr: 'مصر الجديدة',
    cityAr: 'القاهرة',
    governorateAr: 'القاهرة',
    nearestUniversityAr: 'جامعة عين شمس',
    nearestUniversityEn: 'Ain Shams University',
  },
  {
    keywords: ['مدينة نصر', 'nasr city', 'جامعة الأزهر', 'الأزهر', 'al-azhar', 'عباس العقاد', 'مكرم عبيد', 'الحي العاشر', 'الحي السابع', 'الحي الثامن', 'مصطفى النحاس'],
    lat: 30.0561,
    lng: 31.3301,
    labelAr: 'شارع مصطفى النحاس، مدينة نصر، بجوار جامعة الأزهر، القاهرة',
    labelEn: 'Mostafa El Nahas St, Nasr City, Cairo',
    districtAr: 'مدينة نصر',
    cityAr: 'مدينة نصر',
    governorateAr: 'القاهرة',
    nearestUniversityAr: 'جامعة الأزهر',
    nearestUniversityEn: 'Al-Azhar University',
  },
  {
    keywords: ['التجمع', 'التجمع الخامس', 'القاهرة الجديدة', 'new cairo', 'auc', 'الجامعة الأمريكية', 'guc', 'الجامعة الألمانية', 'الرحاب', 'مدينتي', 'المستقبل', 'شارع التسعين'],
    lat: 30.0074,
    lng: 31.4913,
    labelAr: 'شارع التسعين، التجمع الخامس، القاهرة الجديدة، القاهرة',
    labelEn: '90th St, Fifth Settlement, New Cairo',
    districtAr: 'التجمع الخامس',
    cityAr: 'القاهرة الجديدة',
    governorateAr: 'القاهرة',
    nearestUniversityAr: 'الجامعة الأمريكية بالقاهرة (AUC)',
    nearestUniversityEn: 'American University in Cairo (AUC)',
  },
  {
    keywords: ['المعادي', 'maadi', 'زهراء المعادي', 'دجلة', 'حدائق المعادي', 'شارع 9 المعادي'],
    lat: 29.9602,
    lng: 31.2569,
    labelAr: 'شارع 9، حي المعادي، القاهرة',
    labelEn: 'Street 9, Maadi, Cairo',
    districtAr: 'المعادي',
    cityAr: 'المعادي',
    governorateAr: 'القاهرة',
    nearestUniversityAr: 'جامعة حلوان',
    nearestUniversityEn: 'Helwan University',
  },
  {
    keywords: ['حلوان', 'helwan', 'جامعة حلوان', 'عين حلوان'],
    lat: 29.8668,
    lng: 31.3153,
    labelAr: 'عين حلوان، بجوار جامعة حلوان، حلوان، القاهرة',
    labelEn: 'Ain Helwan, near Helwan University, Cairo',
    districtAr: 'عين حلوان',
    cityAr: 'حلوان',
    governorateAr: 'القاهرة',
    nearestUniversityAr: 'جامعة حلوان',
    nearestUniversityEn: 'Helwan University',
  },
  {
    keywords: ['الشروق', 'shorouk', 'بدر', 'badr', 'العاصمة الإدارية', 'الجامعة البريطانية', 'bue'],
    lat: 30.1189,
    lng: 31.6089,
    labelAr: 'حي الجامعة، بجوار الجامعة البريطانية، مدينة الشروق، القاهرة',
    labelEn: 'El Shorouk City, Cairo',
    districtAr: 'مدينة الشروق',
    cityAr: 'الشروق',
    governorateAr: 'القاهرة',
    nearestUniversityAr: 'الجامعة البريطانية في مصر (BUE)',
    nearestUniversityEn: 'British University in Egypt (BUE)',
  },

  // ── Alexandria & Delta & Upper Egypt ──
  {
    keywords: ['جامعة الإسكندرية', 'alexandria university', 'الشاطبي', 'سوتر', 'الأزاريطة', 'كامب شيزار', 'محطة الرمل'],
    lat: 31.2065,
    lng: 29.9102,
    labelAr: 'شارع بورسعيد، الشاطبي، بجوار مجمع كليات جامعة الإسكندرية، الإسكندرية',
    labelEn: 'Port Said St, Shatby, near Alexandria University, Alexandria',
    districtAr: 'الشاطبي',
    cityAr: 'الإسكندرية',
    governorateAr: 'الإسكندرية',
    nearestUniversityAr: 'جامعة الإسكندرية',
    nearestUniversityEn: 'Alexandria University',
  },
  {
    keywords: ['سموحة', 'smouha', 'سيدي جابر', 'كليوباترا', 'سبورتنج', 'رشدي', 'جليم'],
    lat: 31.2156,
    lng: 29.9420,
    labelAr: 'شارع فوزي معاذ، حي سموحة، سيدي جابر، الإسكندرية',
    labelEn: 'Fawzy Moaz St, Smouha, Sidi Gaber, Alexandria',
    districtAr: 'سموحة',
    cityAr: 'الإسكندرية',
    governorateAr: 'الإسكندرية',
    nearestUniversityAr: 'جامعة الإسكندرية',
    nearestUniversityEn: 'Alexandria University',
  },
  {
    keywords: ['الإسكندرية', 'alexandria', 'لوران', 'سان ستيفانو', 'المنتزه', 'ميامي', 'برج العرب'],
    lat: 31.2065,
    lng: 29.9187,
    labelAr: 'حي الشاطبي، بجوار جامعة الإسكندرية، الإسكندرية',
    labelEn: 'Shatby, Alexandria',
    districtAr: 'الشاطبي',
    cityAr: 'الإسكندرية',
    governorateAr: 'الإسكندرية',
    nearestUniversityAr: 'جامعة الإسكندرية',
    nearestUniversityEn: 'Alexandria University',
  },
  {
    keywords: ['جامعة الزقازيق', 'zagazig', 'الزقازيق', 'الشرقية', 'القومية', 'طلبة عويضة', 'حي الزهور الزقازيق'],
    lat: 30.5877,
    lng: 31.5020,
    labelAr: 'شارع الجامعة، منطقة القومية، بجوار جامعة الزقازيق، الزقازيق، محافظة الشرقية',
    labelEn: 'El Kawmia, near Zagazig University, Zagazig, Sharkia',
    districtAr: 'القومية / حي الجامعة',
    cityAr: 'الزقازيق',
    governorateAr: 'الشرقية',
    nearestUniversityAr: 'جامعة الزقازيق',
    nearestUniversityEn: 'Zagazig University',
  },
  {
    keywords: ['جامعة أسيوط', 'assiut', 'asyut', 'أسيوط', 'الوليدية', 'فريال', 'الجمهورية أسيوط'],
    lat: 27.1889,
    lng: 31.1686,
    labelAr: 'شارع الجامعة، بجوار جامعة أسيوط، حي غرب أسيوط، محافظة أسيوط',
    labelEn: 'Assiut University Area, Assiut',
    districtAr: 'حي الجامعة',
    cityAr: 'أسيوط',
    governorateAr: 'أسيوط',
    nearestUniversityAr: 'جامعة أسيوط',
    nearestUniversityEn: 'Assiut University',
  },
  {
    keywords: ['بنها', 'banha', 'جامعة بنها', 'القليوبية', 'شبرا الخيمة', 'فلل بنها', 'كفر الجزار'],
    lat: 30.4660,
    lng: 31.1848,
    labelAr: 'شارع فريد ندا، الفلل، بجوار جامعة بنها، بنها، محافظة القليوبية',
    labelEn: 'Farid Nada St, near Banha University, Banha, Qalyubia',
    districtAr: 'الفلل',
    cityAr: 'بنها',
    governorateAr: 'القليوبية',
    nearestUniversityAr: 'جامعة بنها',
    nearestUniversityEn: 'Banha University',
  },
  {
    keywords: ['المنوفية', 'شبين الكوم', 'جامعة المنوفية', 'menofia', 'مدينة السادات', 'شارع باريس شبين'],
    lat: 30.5656,
    lng: 31.0131,
    labelAr: 'شارع جمال عبد الناصر (الاستاد)، بجوار جامعة المنوفية، شبين الكوم، محافظة المنوفية',
    labelEn: 'Gamal Abdel Nasser St, near Menofia University, Shebin El Kom, Menofia',
    districtAr: 'حي الاستاد',
    cityAr: 'شبين الكوم',
    governorateAr: 'المنوفية',
    nearestUniversityAr: 'جامعة المنوفية',
    nearestUniversityEn: 'Menofia University',
  },
  {
    keywords: ['كفر الشيخ', 'جامعة كفر الشيخ', 'kafr el sheikh'],
    lat: 31.0969,
    lng: 30.9491,
    labelAr: 'شارع الجيش، بجوار جامعة كفر الشيخ، كفر الشيخ',
    labelEn: 'El Geish St, near Kafr El Sheikh University, Kafr El Sheikh',
    districtAr: 'حي الجامعة',
    cityAr: 'كفر الشيخ',
    governorateAr: 'كفر الشيخ',
    nearestUniversityAr: 'جامعة كفر الشيخ',
    nearestUniversityEn: 'Kafr El Sheikh University',
  },
  {
    keywords: ['دمياط', 'جامعة دمياط', 'damietta', 'دمياط الجديدة'],
    lat: 31.4265,
    lng: 31.6625,
    labelAr: 'الحي الأول، بجوار جامعة دمياط، دمياط الجديدة، محافظة دمياط',
    labelEn: 'New Damietta, near Damietta University, Damietta',
    districtAr: 'دمياط الجديدة',
    cityAr: 'دمياط الجديدة',
    governorateAr: 'دمياط',
    nearestUniversityAr: 'جامعة دمياط',
    nearestUniversityEn: 'Damietta University',
  },
  {
    keywords: ['الإسماعيلية', 'ismailia', 'جامعة قناة السويس', 'قناة السويس'],
    lat: 30.6211,
    lng: 32.2684,
    labelAr: 'الطريق الدائري، حي الشيخ زايد، بجوار جامعة قناة السويس، الإسماعيلية',
    labelEn: 'Sheikh Zayed District, near Suez Canal University, Ismailia',
    districtAr: 'حي الشيخ زايد',
    cityAr: 'الإسماعيلية',
    governorateAr: 'الإسماعيلية',
    nearestUniversityAr: 'جامعة قناة السويس',
    nearestUniversityEn: 'Suez Canal University',
  },
  {
    keywords: ['بورسعيد', 'جامعة بورسعيد', 'port said', 'بورفؤاد'],
    lat: 31.2462,
    lng: 32.3164,
    labelAr: 'مدينة بورفؤاد، بجوار جامعة بورسعيد، محافظة بورسعيد',
    labelEn: 'Port Fouad, near Port Said University, Port Said',
    districtAr: 'بورفؤاد',
    cityAr: 'بورسعيد',
    governorateAr: 'بورسعيد',
    nearestUniversityAr: 'جامعة بورسعيد',
    nearestUniversityEn: 'Port Said University',
  },
  {
    keywords: ['السويس', 'جامعة السويس', 'suez'],
    lat: 29.9969,
    lng: 32.5015,
    labelAr: 'حي السلام، بجوار جامعة السويس، محافظة السويس',
    labelEn: 'El Salam District, near Suez University, Suez',
    districtAr: 'حي السلام',
    cityAr: 'السويس',
    governorateAr: 'السويس',
    nearestUniversityAr: 'جامعة السويس',
    nearestUniversityEn: 'Suez University',
  },
  {
    keywords: ['المنيا', 'جامعة المنيا', 'minya'],
    lat: 28.1242,
    lng: 30.7358,
    labelAr: 'شارع طه حسين، حي الأخصاص، بجوار جامعة المنيا، المنيا',
    labelEn: 'Taha Hussein St, near Minya University, Minya',
    districtAr: 'حي الأخصاص',
    cityAr: 'المنيا',
    governorateAr: 'المنيا',
    nearestUniversityAr: 'جامعة المنيا',
    nearestUniversityEn: 'Minya University',
  },
  {
    keywords: ['بني سويف', 'جامعة بني سويف', 'beni suef'],
    lat: 29.0744,
    lng: 31.1021,
    labelAr: 'شارع عبد السلام عارف، بجوار جامعة بني سويف، بني سويف',
    labelEn: 'Abdel Salam Aref St, near Beni Suef University, Beni Suef',
    districtAr: 'وسط البلد',
    cityAr: 'بني سويف',
    governorateAr: 'بني سويف',
    nearestUniversityAr: 'جامعة بني سويف',
    nearestUniversityEn: 'Beni Suef University',
  },
  {
    keywords: ['الفيوم', 'جامعة الفيوم', 'fayoum'],
    lat: 29.3197,
    lng: 30.8356,
    labelAr: 'حي الجامعة، بجوار جامعة الفيوم، الفيوم',
    labelEn: 'University District, near Fayoum University, Fayoum',
    districtAr: 'حي الجامعة',
    cityAr: 'الفيوم',
    governorateAr: 'الفيوم',
    nearestUniversityAr: 'جامعة الفيوم',
    nearestUniversityEn: 'Fayoum University',
  },
  {
    keywords: ['سوهاج', 'جامعة سوهاج', 'sohag'],
    lat: 26.5632,
    lng: 31.7081,
    labelAr: 'مدينة ناصر، بجوار جامعة سوهاج، سوهاج',
    labelEn: 'Nasser City, near Sohag University, Sohag',
    districtAr: 'مدينة ناصر',
    cityAr: 'سوهاج',
    governorateAr: 'سوهاج',
    nearestUniversityAr: 'جامعة سوهاج',
    nearestUniversityEn: 'Sohag University',
  },
  {
    keywords: ['قنا', 'qena', 'جامعة جنوب الوادي', 'جنوب الوادي'],
    lat: 26.1912,
    lng: 32.7438,
    labelAr: 'مساكن عثمان، بجوار جامعة جنوب الوادي، قنا',
    labelEn: 'Near South Valley University, Qena',
    districtAr: 'حي الجامعة',
    cityAr: 'قنا',
    governorateAr: 'قنا',
    nearestUniversityAr: 'جامعة جنوب الوادي',
    nearestUniversityEn: 'South Valley University',
  },
  {
    keywords: ['الأقصر', 'luxor'],
    lat: 25.6872,
    lng: 32.6396,
    labelAr: 'شارع التليفزيون، وسط المدينة، الأقصر',
    labelEn: 'Television St, Luxor',
    districtAr: 'وسط المدينة',
    cityAr: 'الأقصر',
    governorateAr: 'الأقصر',
    nearestUniversityAr: 'جامعة جنوب الوادي',
    nearestUniversityEn: 'South Valley University',
  },
  {
    keywords: ['أسوان', 'جامعة أسوان', 'aswan'],
    lat: 24.0005,
    lng: 32.8602,
    labelAr: 'صحاري، بجوار جامعة أسوان، محافظة أسوان',
    labelEn: 'Sahary, near Aswan University, Aswan',
    districtAr: 'صحاري',
    cityAr: 'أسوان',
    governorateAr: 'أسوان',
    nearestUniversityAr: 'جامعة أسوان',
    nearestUniversityEn: 'Aswan University',
  },
  {
    keywords: ['دمنهور', 'جامعة دمنهور', 'البحيرة', 'damanhour'],
    lat: 31.0409,
    lng: 30.4535,
    labelAr: 'شارع عبد السلام الشاذلي، بجوار جامعة دمنهور، دمنهور، محافظة البحيرة',
    labelEn: 'Abdel Salam El Shazly St, near Damanhour University, Damanhour, Beheira',
    districtAr: 'شارع عبد السلام الشاذلي',
    cityAr: 'دمنهور',
    governorateAr: 'البحيرة',
    nearestUniversityAr: 'جامعة دمنهور',
    nearestUniversityEn: 'Damanhour University',
  },

  // ── Generic Fallback Governorates (checked ONLY if no specific city/district/university matched) ──
  {
    keywords: ['الجيزة', 'giza'],
    lat: 30.0276,
    lng: 31.2089,
    labelAr: 'شارع الجامعة، بجوار جامعة القاهرة، الجيزة',
    labelEn: 'University St, near Cairo University, Giza',
    districtAr: 'حي الجامعة',
    cityAr: 'الجيزة',
    governorateAr: 'الجيزة',
    nearestUniversityAr: 'جامعة القاهرة',
    nearestUniversityEn: 'Cairo University',
    isGenericFallback: true,
  },
  {
    keywords: ['القاهرة', 'cairo', 'وسط البلد', 'downtown', 'رمسيس', 'التحرير', 'جاردن سيتي', 'الزمالك', 'شبرا'],
    lat: DEFAULT_CAIRO_LAT,
    lng: DEFAULT_CAIRO_LNG,
    labelAr: 'وسط البلد، القاهرة',
    labelEn: 'Downtown, Cairo',
    districtAr: 'وسط البلد',
    cityAr: 'القاهرة',
    governorateAr: 'القاهرة',
    nearestUniversityAr: 'جامعة القاهرة',
    nearestUniversityEn: 'Cairo University',
    isGenericFallback: true,
  },
];

const geocodeCache = new Map<string, Coordinates>();
const reverseGeocodeCache = new Map<string, ReverseGeocodeResult>();
const nearbyCache = new Map<string, NearbyPlace[]>();

/**
 * Calculates distance in kilometers between two coordinates using the Haversine formula.
 */
export function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Finds the closest Egyptian university and exact distance in km to any (lat, lng) coordinate.
 */
export function findNearestEgyptUniversity(
  lat: number,
  lng: number,
  locale: 'ar' | 'en' = 'ar'
): {
  name: string;
  nameAr: string;
  nameEn: string;
  distanceKm: number;
  cityAr: string;
  governorateAr: string;
} {
  let closest = EGYPT_UNIVERSITIES[0];
  let minDistance = Infinity;

  for (const univ of EGYPT_UNIVERSITIES) {
    const dist = calculateDistanceKm(lat, lng, univ.lat, univ.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closest = univ;
    }
  }

  return {
    name: locale === 'ar' ? closest.nameAr : closest.nameEn,
    nameAr: closest.nameAr,
    nameEn: closest.nameEn,
    distanceKm: Number(Math.max(0.2, minDistance).toFixed(1)),
    cityAr: closest.cityAr,
    governorateAr: closest.governorateAr,
  };
}

/**
 * Normalizes a university name (e.g. "القاهره" -> "جامعة القاهرة") and cross-checks it
 * against the actual location coordinates so a property in Tanta doesn't say "جامعة القاهرة".
 */
export function normalizeUniversityName(
  rawUniv?: string | null,
  lat?: number | null,
  lng?: number | null,
  locale: 'ar' | 'en' = 'ar'
): { name: string; distanceKm?: number } {
  const hasCoords =
    lat !== undefined &&
    lat !== null &&
    lng !== undefined &&
    lng !== null &&
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lng));

  const nearestByCoords = hasCoords
    ? findNearestEgyptUniversity(Number(lat), Number(lng), locale)
    : null;

  if (!rawUniv || !rawUniv.trim()) {
    return nearestByCoords
      ? { name: nearestByCoords.name, distanceKm: nearestByCoords.distanceKm }
      : { name: '' };
  }

  const normInput = normalizeArabicForSearch(rawUniv);
  const matchedUniv = EGYPT_UNIVERSITIES.find((u) =>
    u.keywords.some((kw) => normInput.includes(normalizeArabicForSearch(kw)))
  );

  // If coordinates exist and the stated university is in a completely different governorate (> 25 km away),
  // use the real university at the property's actual coordinates!
  if (nearestByCoords && matchedUniv) {
    const distToStatedUniv = calculateDistanceKm(
      Number(lat),
      Number(lng),
      matchedUniv.lat,
      matchedUniv.lng
    );
    if (distToStatedUniv > 25) {
      return { name: nearestByCoords.name, distanceKm: nearestByCoords.distanceKm };
    }
    return {
      name: locale === 'ar' ? matchedUniv.nameAr : matchedUniv.nameEn,
      distanceKm: Number(Math.max(0.2, distToStatedUniv).toFixed(1)),
    };
  }

  if (matchedUniv) {
    return {
      name: locale === 'ar' ? matchedUniv.nameAr : matchedUniv.nameEn,
    };
  }

  if (nearestByCoords) {
    return { name: nearestByCoords.name, distanceKm: nearestByCoords.distanceKm };
  }

  const cleaned = normalizeQueryForNominatim(rawUniv);
  if (
    locale === 'ar' &&
    cleaned &&
    !/^(جامعة|كلية|معهد|أكاديمية|المجمع)/i.test(cleaned)
  ) {
    return { name: `جامعة ${cleaned}` };
  }

  return { name: cleaned };
}

/**
 * Extracts explicit coordinates if the user pasted a Google Maps URL or "lat, lng" string into the address/search box.
 */
export function extractCoordinatesFromText(input?: string | null): Coordinates | null {
  if (!input) return null;
  const text = String(input).trim();

  // 1. Google Maps @lat,lng or ?q=lat,lng or !3dlat!4dlng
  const gmapsAt = text.match(/@(-?\d{1,2}\.\d{3,}),\s*(-?\d{1,3}\.\d{3,})/);
  if (gmapsAt) {
    const lat = Number(gmapsAt[1]);
    const lng = Number(gmapsAt[2]);
    if (lat >= 21 && lat <= 32 && lng >= 24 && lng <= 37) {
      return { latitude: Number(lat.toFixed(6)), longitude: Number(lng.toFixed(6)) };
    }
  }

  const gmaps3d = text.match(/!3d(-?\d{1,2}\.\d{3,})!4d(-?\d{1,3}\.\d{3,})/);
  if (gmaps3d) {
    const lat = Number(gmaps3d[1]);
    const lng = Number(gmaps3d[2]);
    if (lat >= 21 && lat <= 32 && lng >= 24 && lng <= 37) {
      return { latitude: Number(lat.toFixed(6)), longitude: Number(lng.toFixed(6)) };
    }
  }

  // 2. Direct "30.7865, 31.0004" coordinate pair
  const rawPair = text.match(/(?:^|[=?&\s(])(2[2-9]\.\d{3,}|3[0-1]\.\d{3,})\s*[,،\s]\s*(2[5-9]\.\d{3,}|3[0-5]\.\d{3,})(?:$|[\s)&])/);
  if (rawPair) {
    return {
      latitude: Number(Number(rawPair[1]).toFixed(6)),
      longitude: Number(Number(rawPair[2]).toFixed(6)),
    };
  }

  return null;
}

/**
 * Cleans colloquial Egyptian detailed addresses (e.g. "عمارة 5 ش سعيد متفرع من شارع البحر بجوار كلية الطب ف طنطا")
 * into structured search tokens that geocoders (ArcGIS, Nominatim, Photon) can accurately match.
 */
export function cleanColloquialAddressForGeocode(raw?: string | null): {
  cleanedFull: string;
  streetOnly: string;
  landmarkOnly: string;
} {
  if (!raw) return { cleanedFull: '', streetOnly: '', landmarkOnly: '' };

  // Strip out previously stitched "بجوار القاهره، الجيزه" artifacts
  let text = normalizeQueryForNominatim(raw)
    .replace(/بجوار\s+القاهرة\s*[،,]?\s*الجيزة/g, '')
    .replace(/بجوار\s+القاهره\s*[،,]?\s*الجيزه/g, '')
    .replace(/\b(?:سكن\s+طلابي|سكن\s+طالبات|سكن\s+مغتربين|شقة\s+للإيجار|غرفة\s+للإيجار|فاخر|مميز)\b/g, ' ')
    .replace(/(?:^|\s)ف\s+(?=\S)/g, ' في ');

  // Extract landmark after بجوار / أمام / قرب / خلف
  let landmarkOnly = '';
  const landmarkMatch = text.match(/(?:بجوار|أمام|امام|خلف|قرب|بالقرب\s+من)\s+([^،,.-]+)/);
  if (landmarkMatch && landmarkMatch[1]) {
    landmarkOnly = landmarkMatch[1].trim();
  }

  // Extract street name
  let streetOnly = '';
  const streetMatch = text.match(/(?:شارع|ميدان|طريق|كورنيش|حي|منطقة|امتداد)\s+([^،,.-]+)/);
  if (streetMatch) {
    streetOnly = streetMatch[0]
      .replace(/\s+(?:بجوار|أمام|امام|خلف|قرب|متفرع\s+من|في|ف)\s+.*$/, '')
      .trim();
  }

  // Replace conversational connectors with commas so geocoders treat them as hierarchy levels
  const cleanedFull = text
    .replace(/\b(?:عمارة\s+رقم|عمارة|برج|منزل|عقار\s+رقم|عقار|الدور|شقة\s+رقم|شقة)\s*[0-9٠-٩]*\b/g, ' ')
    .replace(/\b(?:متفرع\s+من|تفرع\s+من|تفرع|ناصية|بجوار|أمام|امام|خلف|بالقرب\s+من|قرب|في)\b/g, '، ')
    .replace(/[،,]+/g, '، ')
    .replace(/\s+/g, ' ')
    .replace(/^[،,\s]+|[،,\s]+$/g, '')
    .trim();

  return { cleanedFull, streetOnly, landmarkOnly };
}

/**
 * Matches a property/location context against known Egyptian districts, universities, cities, and governorates.
 * Prioritizes specific cities/streets/universities across all fields (including title like "سكن طلابي ف طنطا")
 * BEFORE falling back to generic Cairo/Giza entries, resolving any field contradictions automatically.
 */
export function matchKnownEgyptLocation(item?: {
  city?: string;
  governorate?: string;
  district?: string;
  address?: string;
  nearestUniversity?: string;
  university?: string;
  location?: { ar?: string; en?: string } | string;
  title?: { ar?: string; en?: string } | string;
}): KnownEgyptLocation | null {
  if (!item) return null;

  const locStr =
    typeof item.location === 'object' && item.location !== null
      ? `${item.location.ar || ''} ${item.location.en || ''}`
      : String(item.location || '');
  const titleStr =
    typeof item.title === 'object' && item.title !== null
      ? `${item.title.ar || ''} ${item.title.en || ''}`
      : String(item.title || '');

  const normTitleAndAddr = normalizeArabicForSearch(`${titleStr} ${item.address || ''}`);
  const normDistrictAndCity = normalizeArabicForSearch(`${item.district || ''} ${item.city || ''} ${locStr}`);
  const normUnivAndGov = normalizeArabicForSearch(
    `${item.nearestUniversity || ''} ${item.university || ''} ${item.governorate || ''}`
  );

  const specificEntries = EGYPT_LOCATION_COORDS.filter((e) => !e.isGenericFallback);
  const genericEntries = EGYPT_LOCATION_COORDS.filter((e) => e.isGenericFallback);

  // Pass 1: Check specific cities/streets/universities in Title + Address, then District + City, then University + Governorate
  // This ensures that if the title says "سكن طلابي ف طنطا" while governorate/university had leftover "الجيزه / القاهره",
  // the specific match "طنطا" wins over generic "القاهرة / الجيزة"!
  for (const tierText of [normTitleAndAddr, normDistrictAndCity, normUnivAndGov]) {
    if (!tierText) continue;
    for (const entry of specificEntries) {
      if (entry.keywords.some((kw) => tierText.includes(normalizeArabicForSearch(kw)))) {
        return entry;
      }
    }
  }

  // Pass 2: Fallback to generic Cairo / Giza entries
  for (const tierText of [normDistrictAndCity, normTitleAndAddr, normUnivAndGov]) {
    if (!tierText) continue;
    for (const entry of genericEntries) {
      if (entry.keywords.some((kw) => tierText.includes(normalizeArabicForSearch(kw)))) {
        return entry;
      }
    }
  }

  return null;
}

/**
 * Validates whether explicit (lat, lng) coordinates actually belong to the property's stated city/governorate/university.
 * Always rejects default Cairo fallback seeds (30.0444, 31.2357 and hash offsets like 30.04392, 31.23542)
 * or coordinates in the wrong governorate (> 25 km away) so real geocoding can run.
 */
export function isCoordinateValidForContext(
  lat?: number | string | null,
  lng?: number | string | null,
  context?: {
    city?: string;
    governorate?: string;
    district?: string;
    address?: string;
    nearestUniversity?: string;
    university?: string;
    location?: { ar?: string; en?: string } | string;
    title?: { ar?: string; en?: string } | string;
  }
): boolean {
  const numLat = lat !== undefined && lat !== null && lat !== '' ? Number(lat) : NaN;
  const numLng = lng !== undefined && lng !== null && lng !== '' ? Number(lng) : NaN;

  if (
    !Number.isFinite(numLat) ||
    !Number.isFinite(numLng) ||
    numLat === 0 ||
    numLng === 0 ||
    Math.abs(numLat) > 90 ||
    Math.abs(numLng) > 180
  ) {
    return false;
  }

  // Reject default Cairo seed (30.0444, 31.2357) and its small hash offsets (e.g. 30.04392, 31.23542)
  // so that properties without real pinned coordinates trigger live address geocoding!
  const isDefaultCairoSeed =
    Math.abs(numLat - DEFAULT_CAIRO_LAT) < 0.0035 &&
    Math.abs(numLng - DEFAULT_CAIRO_LNG) < 0.0035;
  if (isDefaultCairoSeed) {
    return false;
  }

  if (!context) return true;

  const matchedKnown = matchKnownEgyptLocation(context);
  if (matchedKnown) {
    const distToExpected = calculateDistanceKm(numLat, numLng, matchedKnown.lat, matchedKnown.lng);
    // If stored coords are in a completely different city/governorate (> 25km away from the stated city/university), reject!
    if (distToExpected > 25) {
      return false;
    }
  }

  return true;
}

/**
 * Checks whether a raw address string looks like a genuine, specific street/building address
 * rather than random test characters (e.g. "تارا رات") or vague placeholders (e.g. "شارع 2", "شارع مصر").
 */
export function isMeaningfulStreetAddress(
  rawAddress?: string | null,
  context?: {
    city?: string;
    governorate?: string;
    district?: string;
    nearestUniversity?: string;
    title?: { ar?: string; en?: string } | string;
  }
): boolean {
  if (!rawAddress) return false;
  const trimmed = rawAddress.trim();
  if (trimmed.length < 6) return false;

  const norm = normalizeArabicForSearch(trimmed);

  // Reject known vague test/placeholder strings like "شارع 2", "شارع 1", "شارع مصر", "شارع 2، شارع مصر..."
  if (/^(?:شارع|ش)\s*(?:[0-9٠-٩]{1,2}|مصر|القاهره|الجيزه)(?:\s|$)/.test(norm)) {
    return false;
  }
  if (norm === 'شارع مصر' || norm.startsWith('شارع 2 ') || norm.includes('شارع 2 شارع مصر')) {
    return false;
  }

  // If context resolves to a specific city (e.g. Tanta) and rawAddress mentions a conflicting city (e.g. "بجوار القاهره، الجيزه"), reject!
  if (context) {
    const matched = matchKnownEgyptLocation(context);
    if (matched && matched.cityAr && matched.cityAr !== 'القاهرة' && matched.cityAr !== 'الجيزة') {
      if (norm.includes('بجوار القاهره') || norm.includes('الجيزه')) {
        return false;
      }
    }
  }

  // Matches any specific known Egyptian place keyword
  if (
    EGYPT_LOCATION_COORDS.some(
      (e) => !e.isGenericFallback && e.keywords.some((kw) => norm.includes(normalizeArabicForSearch(kw)))
    )
  ) {
    return true;
  }

  // Contains common Arabic/English street or landmark words AND at least 2 meaningful words after the indicator
  const addressIndicators = [
    'شارع',
    'ميدان',
    'حي ',
    'منطقه',
    'برج',
    'عماره',
    'بجوار',
    'امام',
    'خلف',
    'بوابه',
    'تقسيم',
    'مساكن',
    'امتداد',
    'كوبري',
    'طريق',
    'كورنيش',
    'جامعه',
    'كليه',
    'مستشفي',
    'مسجد',
    'محطه',
    'متفرع',
    'street',
    'road',
    'building',
    'square',
    'district',
  ];
  const words = norm.split(/\s+/).filter((w) => w.length >= 2);
  if (words.length >= 3 && addressIndicators.some((kw) => norm.includes(normalizeArabicForSearch(kw)))) {
    return true;
  }

  return false;
}

/**
 * Formats a clean, accurate, human-readable address:
 * - When a real reverse-geocoded street address (`reverseAddress`) is available from the Map/GPS,
 *   prioritizes the real map street address and enriches it cleanly without appending contradictory fields.
 * - Filters out placeholder strings like "شارع 2، شارع مصر، بجوار القاهره، الجيزه".
 */
export function formatCleanAddress(
  item?: {
    address?: string;
    district?: string;
    city?: string;
    governorate?: string;
    nearestUniversity?: string;
    university?: string;
    location?: { ar?: string; en?: string } | string;
    title?: { ar?: string; en?: string } | string;
  },
  reverseAddress?: string | null,
  locale: 'ar' | 'en' = 'ar'
): string {
  const sep = locale === 'ar' ? '، ' : ', ';
  const cleanRev = reverseAddress ? reverseAddress.trim() : '';

  if (!item) return cleanRev;

  const matched = matchKnownEgyptLocation(item);
  const validUserAddress = isMeaningfulStreetAddress(item.address, item)
    ? normalizeQueryForNominatim(item.address)
    : '';

  // 1. If we have a real reverse-geocoded address from the map/GPS:
  if (cleanRev) {
    const normRev = normalizeArabicForSearch(cleanRev);
    // If user also wrote a specific valid building/street detail that belongs to the same city and isn't already in cleanRev, prepend it
    if (
      validUserAddress &&
      !normRev.includes(normalizeArabicForSearch(validUserAddress)) &&
      !normalizeArabicForSearch(validUserAddress).includes(normRev)
    ) {
      // Check that validUserAddress doesn't contradict the reverse-geocoded city
      const revMatched = matchKnownEgyptLocation({ address: cleanRev });
      if (!revMatched || !matched || revMatched.cityAr === matched.cityAr) {
        return `${validUserAddress}${sep}${cleanRev}`;
      }
    }
    return cleanRev;
  }

  // 2. Synchronous fallback before reverse-geocoding completes:
  // If matched location (e.g. from title "سكن طلابي ف طنطا") contradicts raw item.governorate ("الجيزه"),
  // return the accurate matched label directly!
  const rawGovNorm = normalizeArabicForSearch(item.governorate);
  const rawUnivNorm = normalizeArabicForSearch(item.nearestUniversity || item.university);
  const hasContradiction =
    matched &&
    matched.governorateAr &&
    ((rawGovNorm && rawGovNorm !== normalizeArabicForSearch(matched.governorateAr)) ||
      (rawUnivNorm &&
        matched.nearestUniversityAr &&
        ! normalizeArabicForSearch(matched.nearestUniversityAr).includes(rawUnivNorm) &&
        !rawUnivNorm.includes(normalizeArabicForSearch(matched.cityAr || ''))));

  if (hasContradiction && matched) {
    return locale === 'ar' ? matched.labelAr : matched.labelEn;
  }

  const rawDistrict = item.district ? normalizeQueryForNominatim(item.district) : '';
  const isVagueDistrict =
    !rawDistrict ||
    normalizeArabicForSearch(rawDistrict) === 'شارع مصر' ||
    /^(?:شارع|ش)\s*[0-9٠-٩]{1,2}$/.test(normalizeArabicForSearch(rawDistrict));

  const cleanDistrict = !isVagueDistrict ? rawDistrict : matched?.districtAr || '';
  const cleanCity = item.city ? normalizeQueryForNominatim(item.city) : matched?.cityAr || '';
  const cleanGov = item.governorate ? normalizeQueryForNominatim(item.governorate) : matched?.governorateAr || '';
  const normUnivObj = normalizeUniversityName(
    item.nearestUniversity || item.university,
    matched?.lat,
    matched?.lng,
    locale
  );
  const cleanUniv = normUnivObj.name;

  const parts: string[] = [];

  if (validUserAddress) {
    parts.push(validUserAddress);
  }

  if (
    cleanDistrict &&
    !parts.some((p) => normalizeArabicForSearch(p).includes(normalizeArabicForSearch(cleanDistrict)))
  ) {
    parts.push(cleanDistrict);
  }

  if (
    cleanUniv &&
    !parts.some((p) => normalizeArabicForSearch(p).includes(normalizeArabicForSearch(cleanUniv)))
  ) {
    parts.push(locale === 'ar' ? `بجوار ${cleanUniv}` : `Near ${cleanUniv}`);
  }

  if (
    cleanCity &&
    !parts.some((p) => normalizeArabicForSearch(p).includes(normalizeArabicForSearch(cleanCity)))
  ) {
    parts.push(cleanCity);
  }

  if (
    cleanGov &&
    normalizeArabicForSearch(cleanGov) !== normalizeArabicForSearch(cleanCity) &&
    !parts.some((p) => normalizeArabicForSearch(p).includes(normalizeArabicForSearch(cleanGov)))
  ) {
    parts.push(locale === 'ar' ? `محافظة ${cleanGov.replace(/^محافظة\s+/, '')}` : cleanGov);
  }

  if (parts.length > 0) {
    return parts.join(sep);
  }

  if (matched) {
    return locale === 'ar' ? matched.labelAr : matched.labelEn;
  }

  return '';
}

/**
 * Synchronous initial coordinate resolution (used immediately while async geocoding resolves exact street/university).
 */
export function resolveCoordinates(item?: {
  latitude?: number | string | null;
  longitude?: number | string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  city?: string;
  governorate?: string;
  district?: string;
  address?: string;
  nearestUniversity?: string;
  university?: string;
  location?: { ar?: string; en?: string } | string;
  title?: { ar?: string; en?: string } | string;
  id?: string;
}): { latitude: number; longitude: number; isApproximate: boolean } {
  if (item) {
    // 0. Check if address itself contains embedded coordinates or a Google Maps URL
    const embedded = extractCoordinatesFromText(item.address);
    if (embedded) {
      return { latitude: embedded.latitude, longitude: embedded.longitude, isApproximate: false };
    }

    const rawLat = item.latitude ?? item.lat;
    const rawLng = item.longitude ?? item.lng;
    const parsedLat = rawLat !== undefined && rawLat !== null && rawLat !== '' ? Number(rawLat) : NaN;
    const parsedLng = rawLng !== undefined && rawLng !== null && rawLng !== '' ? Number(rawLng) : NaN;

    if (isCoordinateValidForContext(parsedLat, parsedLng, item)) {
      return { latitude: parsedLat, longitude: parsedLng, isApproximate: false };
    }

    // Check if we already geocoded this address in cache
    const queryKey = buildGeocodeKey(item);
    if (queryKey && geocodeCache.has(queryKey)) {
      const cached = geocodeCache.get(queryKey)!;
      if (isCoordinateValidForContext(cached.latitude, cached.longitude, item)) {
        return { latitude: cached.latitude, longitude: cached.longitude, isApproximate: false };
      }
    }

    const matched = matchKnownEgyptLocation(item);
    if (matched) {
      return {
        latitude: Number(matched.lat.toFixed(6)),
        longitude: Number(matched.lng.toFixed(6)),
        isApproximate: true,
      };
    }
  }

  return {
    latitude: DEFAULT_CAIRO_LAT,
    longitude: DEFAULT_CAIRO_LNG,
    isApproximate: true,
  };
}

function buildGeocodeKey(item?: {
  address?: string;
  district?: string;
  city?: string;
  governorate?: string;
  nearestUniversity?: string;
  university?: string;
  location?: { ar?: string; en?: string } | string;
  title?: { ar?: string; en?: string } | string;
}): string {
  if (!item) return '';
  const locStr =
    typeof item.location === 'object' && item.location !== null
      ? item.location.ar || item.location.en || ''
      : String(item.location || '');
  const titleStr =
    typeof item.title === 'object' && item.location !== null
      ? typeof item.title === 'object' && item.title !== null
        ? item.title.ar || item.title.en || ''
        : String(item.title || '')
      : typeof item.title === 'object' && item.title !== null
      ? item.title.ar || item.title.en || ''
      : String(item.title || '');
  return [
    item.address,
    item.district,
    item.nearestUniversity || item.university,
    item.city || locStr,
    item.governorate,
    titleStr,
  ]
    .map((s) => normalizeArabicForSearch(s))
    .filter(Boolean)
    .join('|');
}

function mapGeoapifyCategory(categories: string[] = []): NearbyPlace['category'] {
  const joined = categories.join(' ').toLowerCase();
  if (joined.includes('university') || joined.includes('college') || joined.includes('education')) return 'university';
  if (joined.includes('pharmacy')) return 'pharmacy';
  if (joined.includes('hospital') || joined.includes('healthcare') || joined.includes('clinic')) return 'hospital';
  if (joined.includes('supermarket') || joined.includes('convenience') || joined.includes('commercial')) return 'supermarket';
  if (joined.includes('public_transport') || joined.includes('subway') || joined.includes('bus') || joined.includes('station')) return 'transport';
  if (joined.includes('cafe')) return 'cafe';
  if (joined.includes('restaurant') || joined.includes('fast_food') || joined.includes('catering')) return 'restaurant';
  return 'other';
}

/**
 * Formats OSM administrative division names into natural Egyptian Arabic district names.
 */
function cleanOsmDistrictOrCityName(rawName?: string): string {
  if (!rawName) return '';
  return rawName
    .trim()
    .replace(/^(?:طنطا)\s*\(قسم\s*2\)$/i, 'حي ثان طنطا')
    .replace(/^(?:طنطا)\s*\(قسم\s*1\)$/i, 'حي أول طنطا')
    .replace(/^(?:المنصورة)\s*\(قسم\s*1\)$/i, 'حي غرب المنصورة')
    .replace(/^(?:المنصورة)\s*\(قسم\s*2\)$/i, 'حي شرق المنصورة')
    .replace(/\(قسم\s*1\)/g, 'حي أول')
    .replace(/\(قسم\s*2\)/g, 'حي ثان')
    .replace(/\(قسم\s*3\)/g, 'حي ثالث')
    .replace(/^مركز\s+/, '')
    .trim();
}

export class LocationService {
  /**
   * 1. Browser Geolocation API
   * Reads real GPS coordinates from the user's device.
   */
  static getBrowserLocation(options?: PositionOptions): Promise<Coordinates> {
    return new Promise((resolve, reject) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        reject(new Error('Geolocation API is not supported by this browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: Number(position.coords.latitude.toFixed(6)),
            longitude: Number(position.coords.longitude.toFixed(6)),
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 30000,
          ...options,
        }
      );
    });
  }

  /**
   * 2. User -> Frontend -> Browser Geolocation API -> latitude + longitude -> Backend -> Prisma Profile
   * Gets user's real GPS coordinates and saves them to the backend profile.
   */
  static async detectAndSyncProfileLocation(saveToBackend = true): Promise<Coordinates> {
    const coords = await this.getBrowserLocation();
    const { latitude, longitude } = coords;

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          'dary_user_coords',
          JSON.stringify({ latitude, longitude, updatedAt: Date.now() })
        );
      } catch {}
    }

    if (saveToBackend) {
      try {
        await ProfileService.updateLocation(latitude, longitude);
      } catch (err) {
        console.warn('[LocationService] Could not persist location to backend profile:', err);
      }
    }

    return coords;
  }

  /**
   * Reads cached user coordinates from localStorage if available.
   */
  static getCachedUserLocation(): Coordinates | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem('dary_user_coords');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (typeof parsed?.latitude === 'number' && typeof parsed?.longitude === 'number') {
        return { latitude: parsed.latitude, longitude: parsed.longitude };
      }
    } catch {}
    return null;
  }

  /**
   * 3. Forward Geocoding (Detailed Address / Street / Landmark / University / City -> Real Latitude & Longitude)
   * Understands colloquial Egyptian detailed addresses using:
   *  - Direct coordinate / Google Maps URL extraction
   *  - Smart Arabic address parser (extracting street, landmark, university, district, city)
   *  - ArcGIS World Geocoding Service (commercial-grade Egyptian street database)
   *  - OpenStreetMap Nominatim API
   *  - Photon (Komoot) Geocoder API
   *  - Verified Egyptian university & street anchors
   */
  static async geocodeAddress(item: {
    address?: string;
    district?: string;
    city?: string;
    governorate?: string;
    nearestUniversity?: string;
    university?: string;
    location?: { ar?: string; en?: string } | string;
    title?: { ar?: string; en?: string } | string;
  }): Promise<Coordinates | null> {
    if (!item) return null;

    // Step 0: Check if user pasted a Google Maps link or raw coordinates into address
    const directCoords = extractCoordinatesFromText(item.address);
    if (directCoords) {
      return directCoords;
    }

    const cacheKey = buildGeocodeKey(item);
    if (!cacheKey) return null;

    if (geocodeCache.has(cacheKey)) {
      const cached = geocodeCache.get(cacheKey)!;
      if (isCoordinateValidForContext(cached.latitude, cached.longitude, item)) {
        return cached;
      }
    }

    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(`dary_geo_v3_${cacheKey}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (
            parsed?.latitude &&
            parsed?.longitude &&
            isCoordinateValidForContext(parsed.latitude, parsed.longitude, item)
          ) {
            geocodeCache.set(cacheKey, parsed);
            return parsed;
          }
        }
      } catch {}
    }

    const matchedKnown = matchKnownEgyptLocation(item);

    const locStr =
      typeof item.location === 'object' && item.location !== null
        ? item.location.ar || item.location.en || ''
        : String(item.location || '');
    const titleStr =
      typeof item.title === 'object' && item.title !== null
        ? item.title.ar || item.title.en || ''
        : String(item.title || '');

    // Parse & clean the detailed address
    const parsedAddr = cleanColloquialAddressForGeocode(item.address);
    const parsedTitle = cleanColloquialAddressForGeocode(titleStr);

    const isAddressUseful = isMeaningfulStreetAddress(item.address, item);
    const cleanAddress = isAddressUseful ? parsedAddr.cleanedFull : '';
    const streetToken = isAddressUseful ? parsedAddr.streetOnly : parsedTitle.streetOnly;
    const landmarkToken = isAddressUseful ? parsedAddr.landmarkOnly : parsedTitle.landmarkOnly;

    const rawDistrict = normalizeQueryForNominatim(item.district);
    const isVagueDistrict =
      !rawDistrict ||
      normalizeArabicForSearch(rawDistrict) === 'شارع مصر' ||
      /^(?:شارع|ش)\s*[0-9٠-٩]{1,2}$/.test(normalizeArabicForSearch(rawDistrict));
    const cleanDistrict = !isVagueDistrict ? rawDistrict : matchedKnown?.districtAr || '';

    // Resolve true city & governorate (if matchedKnown from title is e.g. Tanta, don't use contradictory Giza/Cairo)
    const rawCity = normalizeQueryForNominatim(item.city || locStr);
    const rawGov = normalizeQueryForNominatim(item.governorate);
    const hasCityContradiction =
      matchedKnown &&
      matchedKnown.cityAr &&
      !matchedKnown.isGenericFallback &&
      ((rawGov &&
        normalizeArabicForSearch(rawGov) !== normalizeArabicForSearch(matchedKnown.governorateAr || '')) ||
        (rawCity &&
          !normalizeArabicForSearch(rawCity).includes(normalizeArabicForSearch(matchedKnown.cityAr))));

    const cleanCity = hasCityContradiction
      ? matchedKnown!.cityAr || ''
      : rawCity || matchedKnown?.cityAr || '';
    const cleanGov = hasCityContradiction
      ? matchedKnown!.governorateAr || ''
      : rawGov || matchedKnown?.governorateAr || '';
    const cleanUniv = hasCityContradiction
      ? matchedKnown!.nearestUniversityAr || ''
      : normalizeUniversityName(
          item.nearestUniversity || item.university,
          matchedKnown?.lat,
          matchedKnown?.lng,
          'ar'
        ).name;

    // Build progressive search queries from most specific street/landmark to district/university/city
    const candidateQueries = [
      cleanAddress ? [cleanAddress, cleanDistrict, cleanCity, cleanGov, 'مصر'].filter(Boolean).join('، ') : '',
      streetToken ? [streetToken, cleanDistrict, cleanCity, cleanGov, 'مصر'].filter(Boolean).join('، ') : '',
      landmarkToken ? [landmarkToken, cleanCity, cleanGov, 'مصر'].filter(Boolean).join('، ') : '',
      cleanDistrict && cleanUniv ? [cleanDistrict, cleanUniv, cleanCity, cleanGov, 'مصر'].filter(Boolean).join('، ') : '',
      cleanDistrict ? [cleanDistrict, cleanCity, cleanGov, 'مصر'].filter(Boolean).join('، ') : '',
      cleanUniv ? [cleanUniv, cleanCity, cleanGov, 'مصر'].filter(Boolean).join('، ') : '',
      [cleanCity, cleanGov, 'مصر'].filter(Boolean).join('، '),
    ].filter((q, idx, arr) => q.length > 4 && arr.indexOf(q) === idx);

    const saveGeocodeResult = (lat: number, lng: number): Coordinates => {
      const result: Coordinates = {
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lng.toFixed(6)),
      };
      geocodeCache.set(cacheKey, result);
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(`dary_geo_v3_${cacheKey}`, JSON.stringify(result));
        } catch {}
      }
      return result;
    };

    // Engine A: ArcGIS World Geocoding Service (understands detailed Egyptian streets, buildings & landmarks)
    for (const q of candidateQueries.slice(0, 4)) {
      try {
        const searchExtent = matchedKnown
          ? `&location=${matchedKnown.lng},${matchedKnown.lat}&distance=20000`
          : '';
        const arcUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?SingleLine=${encodeURIComponent(
          q
        )}&countryCode=EGY&f=json&outFields=Match_addr,Addr_type,StName,City,Region&langCode=ar&maxLocations=5${searchExtent}`;
        const resp = await fetch(arcUrl);
        if (resp.ok) {
          const data = await resp.json();
          const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
          for (const cand of candidates) {
            const score = Number(cand?.score || 0);
            const hitLat = Number(cand?.location?.y);
            const hitLng = Number(cand?.location?.x);
            if (score >= 78 && isCoordinateValidForContext(hitLat, hitLng, item)) {
              return saveGeocodeResult(hitLat, hitLng);
            }
          }
        }
      } catch {
        // continue to Nominatim
      }
    }

    // Engine B: OpenStreetMap Nominatim API
    for (const q of candidateQueries) {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=4&countrycodes=eg&accept-language=ar,en&q=${encodeURIComponent(
          q
        )}`;
        const resp = await fetch(url, {
          headers: { Accept: 'application/json' },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (Array.isArray(data) && data.length > 0) {
            for (const hit of data) {
              const hitLat = Number(hit.lat);
              const hitLng = Number(hit.lon);
              if (isCoordinateValidForContext(hitLat, hitLng, item)) {
                return saveGeocodeResult(hitLat, hitLng);
              }
            }
          }
        }
      } catch {
        // try next query
      }
    }

    // Fallback to verified Egyptian location anchor (e.g. Tanta University / Mansoura University / Toshka)
    if (matchedKnown) {
      return saveGeocodeResult(matchedKnown.lat, matchedKnown.lng);
    }

    return null;
  }

  /**
   * 3b. Live Address Autocomplete Suggestions across all Egyptian governorates, cities, villages, streets & universities.
   * Allows an owner who is NOT at the apartment to type any address/street/village/link and pick the exact spot.
   */
  static async searchAddressSuggestions(
    rawQuery: string,
    locale: 'ar' | 'en' = 'ar'
  ): Promise<AddressSuggestion[]> {
    const q = (rawQuery || '').trim();
    if (q.length < 2) return [];

    const results: AddressSuggestion[] = [];
    const seenCoords = new Set<string>();

    const addSuggestion = (item: {
      id: string;
      title: string;
      subtitle: string;
      fullAddress: string;
      lat: number;
      lng: number;
      governorate?: string;
      city?: string;
      district?: string;
    }) => {
      if (!Number.isFinite(item.lat) || !Number.isFinite(item.lng)) return;
      if (item.lat < 21.5 || item.lat > 32.0 || item.lng < 24.5 || item.lng > 37.0) return;
      const coordKey = `${item.lat.toFixed(3)}:${item.lng.toFixed(3)}`;
      if (seenCoords.has(coordKey)) return;
      seenCoords.add(coordKey);

      const nearest = findNearestEgyptUniversity(item.lat, item.lng, locale);
      results.push({
        id: item.id,
        title: item.title,
        subtitle: item.subtitle,
        fullAddress: item.fullAddress,
        latitude: Number(item.lat.toFixed(6)),
        longitude: Number(item.lng.toFixed(6)),
        governorate: (item.governorate || nearest.governorateAr || '').replace(/^محافظة\s+/, '').trim(),
        city: (item.city || nearest.cityAr || '').trim(),
        district: (item.district || '').trim(),
        nearestUniversity: nearest.name,
        distanceToUniversityKm: nearest.distanceKm,
      });
    };

    // 1. Direct coordinates or Google Maps URL
    const direct = extractCoordinatesFromText(q);
    if (direct) {
      const rev = await this.reverseGeocode(direct.latitude, direct.longitude, locale);
      addSuggestion({
        id: 'direct-coords',
        title: rev?.address || `${direct.latitude.toFixed(5)}, ${direct.longitude.toFixed(5)}`,
        subtitle: rev ? `${rev.city}، محافظة ${rev.governorate}` : 'إحداثيات مباشرة / رابط خريطة',
        fullAddress: rev?.address || `${direct.latitude.toFixed(5)}, ${direct.longitude.toFixed(5)}`,
        lat: direct.latitude,
        lng: direct.longitude,
        governorate: rev?.governorate,
        city: rev?.city,
        district: rev?.district,
      });
    }

    // 2. Instant local matches from verified Egyptian locations & universities
    const normQ = normalizeArabicForSearch(q);
    if (normQ.length >= 2) {
      for (let i = 0; i < EGYPT_LOCATION_COORDS.length; i++) {
        const loc = EGYPT_LOCATION_COORDS[i];
        if (loc.isGenericFallback) continue;
        const hay = normalizeArabicForSearch(
          `${loc.keywords.join(' ')} ${loc.labelAr} ${loc.labelEn} ${loc.districtAr || ''} ${loc.cityAr || ''} ${loc.governorateAr || ''}`
        );
        if (hay.includes(normQ)) {
          addSuggestion({
            id: `known-loc-${i}`,
            title: locale === 'ar' ? loc.labelAr : loc.labelEn,
            subtitle: `${loc.cityAr || ''}، محافظة ${loc.governorateAr || ''}`,
            fullAddress: locale === 'ar' ? loc.labelAr : loc.labelEn,
            lat: loc.lat,
            lng: loc.lng,
            governorate: loc.governorateAr,
            city: loc.cityAr,
            district: loc.districtAr || loc.labelAr.split('،')[0],
          });
          if (results.length >= 4) break;
        }
      }
    }

    // 3. Live query to OpenStreetMap Nominatim + ArcGIS in parallel
    const [nomRes, arcRes] = await Promise.allSettled([
      fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&countrycodes=eg&accept-language=${locale},ar,en&q=${encodeURIComponent(
          q
        )}`,
        { headers: { Accept: 'application/json' } }
      ).then((r) => (r.ok ? r.json() : [])),
      fetch(
        `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?SingleLine=${encodeURIComponent(
          q
        )}&countryCode=EGY&f=json&outFields=Match_addr,PlaceName,StName,Nbrhd,District,City,Subregion,Region&langCode=ar&maxLocations=5`
      ).then((r) => (r.ok ? r.json() : null)),
    ]);

    if (nomRes.status === 'fulfilled' && Array.isArray(nomRes.value)) {
      for (let i = 0; i < nomRes.value.length; i++) {
        const hit = nomRes.value[i];
        const lat = Number(hit.lat);
        const lng = Number(hit.lon);
        const addr = hit.address || {};
        const gov = cleanOsmDistrictOrCityName(addr.state || '').replace(/^محافظة\s+/, '').trim();
        const city = cleanOsmDistrictOrCityName(
          addr.city || addr.town || addr.village || addr.municipality || addr.county || addr.state_district || ''
        )
          .replace(/\s*\(قسم\s*\d+\)/g, '')
          .trim();
        const dist = cleanOsmDistrictOrCityName(
          addr.suburb || addr.neighbourhood || addr.quarter || addr.city_district || addr.hamlet || ''
        );
        const road = addr.road || addr.street || addr.pedestrian || '';
        const placeName = hit.name || road || dist || city || (hit.display_name || '').split('،')[0] || q;
        const fullParts = [placeName, road && road !== placeName ? road : '', dist, city, gov ? `محافظة ${gov}` : '']
          .filter(Boolean)
          .filter((v, idx, arr) => arr.indexOf(v) === idx);
        const fullAddr = fullParts.join('، ');

        addSuggestion({
          id: `nom-${hit.place_id || i}`,
          title: [placeName, dist && dist !== placeName ? dist : ''].filter(Boolean).join(' - '),
          subtitle: [city, gov ? `محافظة ${gov}` : ''].filter(Boolean).join('، '),
          fullAddress: fullAddr || hit.display_name || placeName,
          lat,
          lng,
          governorate: gov,
          city: city || gov,
          district: dist || road,
        });
      }
    }

    if (arcRes.status === 'fulfilled' && Array.isArray(arcRes.value?.candidates)) {
      for (let i = 0; i < arcRes.value.candidates.length; i++) {
        const cand = arcRes.value.candidates[i];
        if (Number(cand?.score || 0) < 75) continue;
        const lat = Number(cand?.location?.y);
        const lng = Number(cand?.location?.x);
        const attr = cand?.attributes || {};
        const gov = String(attr.Region || '').replace(/^محافظة\s+/, '').trim();
        const city = cleanOsmDistrictOrCityName(String(attr.City || attr.Subregion || ''));
        const dist = cleanOsmDistrictOrCityName(String(attr.Nbrhd || attr.District || attr.StName || ''));
        const matchAddr = String(cand.address || attr.Match_addr || '').trim();
        if (!matchAddr) continue;

        addSuggestion({
          id: `arc-${i}`,
          title: attr.PlaceName || attr.StName || matchAddr.split('،')[0] || matchAddr.split(',')[0],
          subtitle: [dist, city, gov ? `محافظة ${gov}` : ''].filter(Boolean).join('، '),
          fullAddress: matchAddr,
          lat,
          lng,
          governorate: gov,
          city: city || gov,
          district: dist,
        });
      }
    }

    return results.slice(0, 7);
  }

  /**
   * 3c. Resolves a freeform address query or partial form fields WITHOUT being blocked by stale coordinates or previous city/governorate.
   * Returns exact coordinates + full reverse-geocoded breakdown to auto-fill all 8 location inputs.
   */
  static async resolveFreeformAddress(
    input: {
      freeformQuery?: string;
      address?: string;
      district?: string;
      city?: string;
      governorate?: string;
      nearestUniversity?: string;
    },
    locale: 'ar' | 'en' = 'ar'
  ): Promise<{
    latitude: number;
    longitude: number;
    governorate: string;
    city: string;
    district: string;
    address: string;
    nearestUniversity: string;
    distanceToUniversityKm: number;
    reverseResult: ReverseGeocodeResult | null;
  } | null> {
    const primaryText = (input.freeformQuery || '').trim();
    const combinedFields = [input.address, input.district, input.city, input.governorate, input.nearestUniversity]
      .map((s) => (s || '').trim())
      .filter(Boolean)
      .join('، ');

    const queryToSearch = primaryText || combinedFields;
    if (!queryToSearch) return null;

    // 1. Check direct coordinates or Google Maps link
    const direct = extractCoordinatesFromText(queryToSearch);
    if (direct) {
      const rev = await this.reverseGeocode(direct.latitude, direct.longitude, locale);
      const nearest = findNearestEgyptUniversity(direct.latitude, direct.longitude, locale);
      return {
        latitude: direct.latitude,
        longitude: direct.longitude,
        governorate: rev?.governorate || nearest.governorateAr,
        city: rev?.city || nearest.cityAr,
        district: rev?.district || rev?.street || '',
        address: rev?.address || `${direct.latitude.toFixed(5)}, ${direct.longitude.toFixed(5)}`,
        nearestUniversity: rev?.nearestUniversity || nearest.name,
        distanceToUniversityKm: rev?.distanceToUniversityKm ?? nearest.distanceKm,
        reverseResult: rev,
      };
    }

    // 2. Search suggestions using our unbiased Egypt-wide search
    const suggestions = await this.searchAddressSuggestions(queryToSearch, locale);
    if (suggestions.length > 0) {
      const best = suggestions[0];
      const rev = await this.reverseGeocode(best.latitude, best.longitude, locale);
      return {
        latitude: best.latitude,
        longitude: best.longitude,
        governorate: rev?.governorate || best.governorate,
        city: rev?.city || best.city,
        district: rev?.district || best.district || rev?.street || '',
        address: rev?.address || best.fullAddress,
        nearestUniversity: rev?.nearestUniversity || best.nearestUniversity,
        distanceToUniversityKm: rev?.distanceToUniversityKm ?? best.distanceToUniversityKm,
        reverseResult: rev,
      };
    }

    // 3. Fallback to geocodeAddress without stale constraints
    const freshItem = primaryText
      ? { address: primaryText }
      : {
          address: input.address,
          district: input.district,
          city: input.city,
          governorate: input.governorate,
          nearestUniversity: input.nearestUniversity,
        };
    const geocoded = await this.geocodeAddress(freshItem);
    const coords = geocoded || resolveCoordinates(freshItem);
    const rev = await this.reverseGeocode(coords.latitude, coords.longitude, locale);
    const nearest = findNearestEgyptUniversity(coords.latitude, coords.longitude, locale);

    return {
      latitude: coords.latitude,
      longitude: coords.longitude,
      governorate: rev?.governorate || input.governorate || nearest.governorateAr,
      city: rev?.city || input.city || nearest.cityAr,
      district: rev?.district || input.district || rev?.street || '',
      address: rev?.address || input.address || primaryText,
      nearestUniversity: rev?.nearestUniversity || nearest.name,
      distanceToUniversityKm: rev?.distanceToUniversityKm ?? nearest.distanceKm,
      reverseResult: rev,
    };
  }

  /**
   * 4. Reverse Geocoding (Latitude & Longitude -> Real Street / Building / District / City / Governorate / Nearest University)
   * Combines OpenStreetMap Nominatim Reverse API (zoom=18) + ArcGIS Reverse Geocoding + Nearest University calculator
   * to produce a complete, Google-Maps-quality street address.
   */
  static async reverseGeocode(
    lat: number,
    lng: number,
    locale: 'ar' | 'en' = 'ar'
  ): Promise<ReverseGeocodeResult | null> {
    const cacheKey = `${lat.toFixed(5)}:${lng.toFixed(5)}:${locale}`;
    if (reverseGeocodeCache.has(cacheKey)) {
      return reverseGeocodeCache.get(cacheKey)!;
    }

    const nearestUniv = findNearestEgyptUniversity(lat, lng, locale);

    let amenityOrBuilding = '';
    let streetName = '';
    let houseNumber = '';
    let district = '';
    let city = '';
    let governorate = '';
    let country = locale === 'ar' ? 'مصر' : 'Egypt';
    let rawDisplayName = '';

    // 1. Query OpenStreetMap Nominatim Reverse API at building/street zoom=18
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=${locale}`;
      const resp = await fetch(url, {
        headers: { Accept: 'application/json' },
      });
      if (resp.ok) {
        const data = await resp.json();
        rawDisplayName = data?.display_name || '';
        const addr = data?.address || {};

        amenityOrBuilding =
          addr.amenity ||
          addr.university ||
          addr.college ||
          addr.building ||
          addr.shop ||
          addr.office ||
          addr.historic ||
          (data?.name && data?.name !== addr.road ? data.name : '') ||
          '';

        streetName =
          addr.road ||
          addr.pedestrian ||
          addr.residential ||
          addr.street ||
          addr.footway ||
          addr.path ||
          '';

        houseNumber = addr.house_number || '';

        const rawDist =
          addr.suburb ||
          addr.neighbourhood ||
          addr.quarter ||
          addr.city_district ||
          addr.borough ||
          addr.hamlet ||
          '';
        district = cleanOsmDistrictOrCityName(rawDist);

        const rawCity =
          addr.city ||
          addr.town ||
          addr.village ||
          addr.municipality ||
          addr.county ||
          addr.state_district ||
          '';
        city = cleanOsmDistrictOrCityName(rawCity)
          .replace(/\s*\(قسم\s*\d+\)/g, '')
          .trim();

        governorate = (addr.state || city || '').replace(/^محافظة\s+/, '').trim();
        country = addr.country || country;
      }
    } catch {
      // continue to ArcGIS Reverse Geocoder
    }

    // 2. If streetName or district is missing, enrich from ArcGIS Reverse Geocoding API (commercial Egyptian street map)
    if (!streetName || !city) {
      try {
        const arcRevUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?location=${lng},${lat}&f=json&langCode=${locale}&outSR=4326`;
        const arcResp = await fetch(arcRevUrl);
        if (arcResp.ok) {
          const arcData = await arcResp.json();
          const a = arcData?.address || {};
          if (!amenityOrBuilding && a.PlaceName && a.PlaceName !== a.Address) {
            amenityOrBuilding = String(a.PlaceName).trim();
          }
          if (!streetName && a.Address) {
            streetName = String(a.Address).trim();
          }
          if (!district && (a.Nbrhd || a.District)) {
            district = cleanOsmDistrictOrCityName(String(a.Nbrhd || a.District));
          }
          if (!city && a.City) {
            city = cleanOsmDistrictOrCityName(String(a.City));
          }
          if (!governorate && a.Region) {
            governorate = String(a.Region).replace(/^محافظة\s+/, '').trim();
          }
        }
      } catch {
        // ignore if offline
      }
    }

    // 3. Match nearest known Egyptian street/district anchor within 8 km to fill any remaining gaps
    let nearestAnchor: KnownEgyptLocation | null = null;
    let minAnchorDist = Infinity;
    for (const loc of EGYPT_LOCATION_COORDS) {
      if (loc.isGenericFallback) continue;
      const d = calculateDistanceKm(lat, lng, loc.lat, loc.lng);
      if (d < minAnchorDist) {
        minAnchorDist = d;
        nearestAnchor = loc;
      }
    }

    if (nearestAnchor && minAnchorDist <= 8) {
      if (!district && nearestAnchor.districtAr) {
        district = nearestAnchor.districtAr;
      }
      if (!city && nearestAnchor.cityAr) {
        city = nearestAnchor.cityAr;
      }
      if (!governorate && nearestAnchor.governorateAr) {
        governorate = nearestAnchor.governorateAr;
      }
    }

    if (!city && nearestUniv.distanceKm <= 15) {
      city = nearestUniv.cityAr;
    }
    if (!governorate && nearestUniv.distanceKm <= 15) {
      governorate = nearestUniv.governorateAr;
    }

    // Format full street-level address like Google Maps
    const fullStreet = houseNumber && streetName ? `${streetName} (${houseNumber})` : streetName;
    const univLandmark =
      nearestUniv.distanceKm <= 2.5
        ? locale === 'ar'
          ? `بجوار ${nearestUniv.nameAr}`
          : `Near ${nearestUniv.nameEn}`
        : '';
    const govFormatted =
      governorate && locale === 'ar' && !governorate.startsWith('محافظة')
        ? `محافظة ${governorate}`
        : governorate;

    const rawParts = [
      amenityOrBuilding,
      fullStreet,
      district,
      univLandmark,
      city,
      govFormatted,
    ].map((s) => (s || '').trim()).filter(Boolean);

    // Deduplicate parts where one already contains another
    const uniqueParts: string[] = [];
    for (const part of rawParts) {
      const normPart = normalizeArabicForSearch(part);
      if (!normPart) continue;
      const alreadyExists = uniqueParts.some((existing) => {
        const normExisting = normalizeArabicForSearch(existing);
        return normExisting === normPart || normExisting.includes(normPart);
      });
      if (!alreadyExists) {
        uniqueParts.push(part);
      }
    }

    const sep = locale === 'ar' ? '، ' : ', ';
    const streetAddress =
      uniqueParts.join(sep) ||
      (nearestAnchor && minAnchorDist <= 15
        ? locale === 'ar'
          ? nearestAnchor.labelAr
          : nearestAnchor.labelEn
        : rawDisplayName);

    if (streetAddress) {
      const res: ReverseGeocodeResult = {
        displayName: rawDisplayName || streetAddress,
        address: streetAddress,
        street: fullStreet || district,
        building: amenityOrBuilding || undefined,
        district: district || fullStreet || city,
        city: city || governorate,
        governorate: governorate || city,
        country,
        nearestUniversity: nearestUniv.name,
        distanceToUniversityKm: nearestUniv.distanceKm,
      };
      reverseGeocodeCache.set(cacheKey, res);
      return res;
    }

    return null;
  }

  /**
   * 5. Live Nearby Places around (lat, lng, radius)
   * Priority:
   *  A) Geoapify Places API (if VITE_GEOAPIFY_API_KEY is set)
   *  B) Live OpenStreetMap Overpass API (real POIs around the exact coordinates with real names & distances!)
   *  Note: Backend /nearby is not called directly to avoid 404 console errors.
   */
  static async getNearbyPlaces(
    lat: number = DEFAULT_CAIRO_LAT,
    lng: number = DEFAULT_CAIRO_LNG,
    radius: number = DEFAULT_RADIUS_KM
  ): Promise<NearbyResponse> {
    const safeLat = Number.isFinite(lat) ? lat : DEFAULT_CAIRO_LAT;
    const safeLng = Number.isFinite(lng) ? lng : DEFAULT_CAIRO_LNG;
    const safeRadius = Number.isFinite(radius) && radius > 0 ? radius : DEFAULT_RADIUS_KM;

    const cacheKey = `${safeLat.toFixed(4)}:${safeLng.toFixed(4)}:${safeRadius}`;
    if (nearbyCache.has(cacheKey)) {
      return {
        lat: safeLat,
        lng: safeLng,
        radius: safeRadius,
        places: nearbyCache.get(cacheKey)!,
        source: 'osm_live',
      };
    }

    // Step A: If VITE_GEOAPIFY_API_KEY is configured, query Geoapify Places API
    const geoapifyKey = import.meta.env.VITE_GEOAPIFY_API_KEY;
    if (geoapifyKey) {
      try {
        const radiusMeters = Math.round(safeRadius * 1000);
        const categories =
          'education.university,healthcare.pharmacy,healthcare.hospital,catering.restaurant,catering.cafe,commercial.supermarket,public_transport';
        const url = `https://api.geoapify.com/v2/places?categories=${categories}&filter=circle:${safeLng},${safeLat},${radiusMeters}&bias=proximity:${safeLng},${safeLat}&limit=20&apiKey=${geoapifyKey}`;
        const resp = await fetch(url);
        if (resp.ok) {
          const json = await resp.json();
          if (Array.isArray(json?.features) && json.features.length > 0) {
            const places: NearbyPlace[] = json.features.map((f: any, idx: number) => {
              const props = f.properties || {};
              const pLat = Number(props.lat ?? f.geometry?.coordinates?.[1] ?? safeLat);
              const pLng = Number(props.lon ?? f.geometry?.coordinates?.[0] ?? safeLng);
              return {
                id: String(props.place_id || `geo-${idx}`),
                name: props.name || props.address_line1 || 'خدمة قريبة',
                nameEn: props.name || props.address_line1,
                category: mapGeoapifyCategory(props.categories || []),
                latitude: pLat,
                longitude: pLng,
                distanceKm:
                  props.distance !== undefined
                    ? Number((Number(props.distance) / 1000).toFixed(2))
                    : calculateDistanceKm(safeLat, safeLng, pLat, pLng),
                address: props.address_line2 || props.street || '',
              };
            });
            nearbyCache.set(cacheKey, places);
            return {
              lat: safeLat,
              lng: safeLng,
              radius: safeRadius,
              places,
              source: 'geoapify',
            };
          }
        }
      } catch {
        // Continue to OpenStreetMap Overpass API
      }
    }

    // Step C: Query LIVE OpenStreetMap Overpass API for real POIs around (safeLat, safeLng)
    try {
      const radiusMeters = Math.min(Math.round(safeRadius * 1000), 5000);
      const overpassQuery = `
        [out:json][timeout:6];
        (
          node["amenity"~"university|college|pharmacy|hospital|clinic|restaurant|cafe|bus_station"](around:${radiusMeters},${safeLat},${safeLng});
          way["amenity"~"university|college|hospital"](around:${radiusMeters},${safeLat},${safeLng});
          node["shop"~"supermarket|convenience|bakery"](around:${radiusMeters},${safeLat},${safeLng});
          node["railway"~"station|subway_entrance"](around:${radiusMeters},${safeLat},${safeLng});
        );
        out center 35;
      `;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5500);
      const resp = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: `data=${encodeURIComponent(overpassQuery)}`,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const json = await resp.json();
        const elements = Array.isArray(json?.elements) ? json.elements : [];

        const livePlaces: NearbyPlace[] = [];
        const seenNames = new Set<string>();

        for (const el of elements) {
          const tags = el.tags || {};
          const nameAr = tags['name:ar'] || tags.name;
          const nameEn = tags['name:en'] || tags.name || nameAr;
          if (!nameAr && !nameEn) continue;

          const pLat = Number(el.lat ?? el.center?.lat);
          const pLng = Number(el.lon ?? el.center?.lon);
          if (!Number.isFinite(pLat) || !Number.isFinite(pLng)) continue;

          const dedupeKey = `${nameAr || nameEn}-${pLat.toFixed(3)}`;
          if (seenNames.has(dedupeKey)) continue;
          seenNames.add(dedupeKey);

          let category: NearbyPlace['category'] = 'other';
          const amenity = String(tags.amenity || '').toLowerCase();
          const shop = String(tags.shop || '').toLowerCase();
          const railway = String(tags.railway || '').toLowerCase();

          if (amenity === 'university' || amenity === 'college') category = 'university';
          else if (amenity === 'pharmacy') category = 'pharmacy';
          else if (amenity === 'hospital' || amenity === 'clinic') category = 'hospital';
          else if (amenity === 'cafe') category = 'cafe';
          else if (amenity === 'restaurant' || amenity === 'fast_food') category = 'restaurant';
          else if (amenity === 'bus_station' || railway) category = 'transport';
          else if (shop) category = 'supermarket';

          const addressParts = [tags['addr:street'], tags['addr:district'] || tags['addr:suburb'], tags['addr:city']]
            .filter(Boolean)
            .join('، ');

          livePlaces.push({
            id: String(el.id),
            name: nameAr || nameEn,
            nameEn: nameEn || nameAr,
            category,
            latitude: Number(pLat.toFixed(6)),
            longitude: Number(pLng.toFixed(6)),
            distanceKm: calculateDistanceKm(safeLat, safeLng, pLat, pLng),
            address: addressParts,
          });
        }

        if (livePlaces.length > 0) {
          livePlaces.sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));
          nearbyCache.set(cacheKey, livePlaces);
          return {
            lat: safeLat,
            lng: safeLng,
            radius: safeRadius,
            places: livePlaces,
            source: 'osm_live',
          };
        }
      }
    } catch {
      // Ignore if offline or timed out
    }

    // Step D: Instant verified fallback using real Egyptian universities & street anchors within range
    const fallbackPlaces: NearbyPlace[] = [];
    for (let i = 0; i < EGYPT_UNIVERSITIES.length; i++) {
      const u = EGYPT_UNIVERSITIES[i];
      const dist = calculateDistanceKm(safeLat, safeLng, u.lat, u.lng);
      if (dist <= Math.max(safeRadius * 2.5, 8)) {
        fallbackPlaces.push({
          id: `univ-anchor-${i}`,
          name: u.nameAr,
          nameEn: u.nameEn,
          category: 'university',
          latitude: u.lat,
          longitude: u.lng,
          distanceKm: dist,
          address: `${u.cityAr}، محافظة ${u.governorateAr}`,
        });
      }
    }
    for (let i = 0; i < EGYPT_LOCATION_COORDS.length; i++) {
      const loc = EGYPT_LOCATION_COORDS[i];
      if (loc.isGenericFallback) continue;
      const dist = calculateDistanceKm(safeLat, safeLng, loc.lat, loc.lng);
      if (dist <= safeRadius * 1.5 && dist > 0.05) {
        fallbackPlaces.push({
          id: `loc-anchor-${i}`,
          name: loc.districtAr || loc.labelAr.split('،')[0],
          nameEn: loc.labelEn.split(',')[0],
          category: loc.labelAr.includes('مستشفى')
            ? 'hospital'
            : loc.labelAr.includes('محطة') || loc.labelAr.includes('موقف')
            ? 'transport'
            : loc.labelAr.includes('جامعة') || loc.labelAr.includes('كلية') || loc.labelAr.includes('مجمع')
            ? 'university'
            : 'other',
          latitude: loc.lat,
          longitude: loc.lng,
          distanceKm: dist,
          address: loc.labelAr,
        });
      }
    }
    fallbackPlaces.sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));

    return {
      lat: safeLat,
      lng: safeLng,
      radius: safeRadius,
      places: fallbackPlaces.slice(0, 12),
      source: 'fallback',
    };
  }

  /**
   * Builds a direct Google Maps Directions URL from origin (optional) to destination
   */
  static buildGoogleMapsDirectionsUrl(
    toLat: number,
    toLng: number,
    fromLat?: number | null,
    fromLng?: number | null,
    mode: 'walking' | 'driving' = 'walking'
  ): string {
    const dest = `${toLat},${toLng}`;
    const travelMode = mode === 'walking' ? 'walking' : 'driving';
    if (
      fromLat !== undefined &&
      fromLat !== null &&
      fromLng !== undefined &&
      fromLng !== null &&
      Number.isFinite(fromLat) &&
      Number.isFinite(fromLng)
    ) {
      return `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLng}&destination=${dest}&travelmode=${travelMode}`;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=${travelMode}`;
  }

  /**
   * Calculates real street-by-street route geometry and turn-by-turn directions
   * between user's origin (fromLat, fromLng) and property destination (toLat, toLng)
   * using OSRM Routing API with an instant fallback if offline.
   */
  static async getRouteDirections(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
    mode: 'walking' | 'driving' = 'walking'
  ): Promise<RouteDirectionsResult> {
    const googleMapsDirUrl = LocationService.buildGoogleMapsDirectionsUrl(toLat, toLng, fromLat, fromLng, mode);
    const straightDistKm = calculateDistanceKm(fromLat, fromLng, toLat, toLng);

    const formatStepInstruction = (
      type: string,
      modifier: string,
      roadName: string
    ): { ar: string; en: string; icon: string } => {
      const cleanRoadAr = roadName ? ` في «${roadName}»` : ' في الطريق الحالي';
      const cleanRoadEn = roadName ? ` onto "${roadName}"` : ' on current road';

      if (type === 'depart') {
        return {
          ar: `ابدأ السير من موقعك الحالي${cleanRoadAr}`,
          en: `Start from your location${cleanRoadEn}`,
          icon: '🚀',
        };
      }
      if (type === 'arrive') {
        return {
          ar: 'وصلت إلى موقع السكن 🏠',
          en: 'You have arrived at the property 🏠',
          icon: '🏁',
        };
      }
      if (type === 'roundabout' || type === 'rotary') {
        return {
          ar: `ادخل الدوران / الميدان ثم اخرج${cleanRoadAr}`,
          en: `Enter the roundabout and exit${cleanRoadEn}`,
          icon: '🔄',
        };
      }

      if (modifier.includes('right')) {
        const isSlight = modifier.includes('slight');
        return {
          ar: `${isSlight ? 'انحرف قليلًا لليمين' : 'انعطف يمينًا'}${cleanRoadAr}`,
          en: `${isSlight ? 'Keep right' : 'Turn right'}${cleanRoadEn}`,
          icon: '↱',
        };
      }
      if (modifier.includes('left')) {
        const isSlight = modifier.includes('slight');
        return {
          ar: `${isSlight ? 'انحرف قليلًا لليسار' : 'انعطف يسارًا'}${cleanRoadAr}`,
          en: `${isSlight ? 'Keep left' : 'Turn left'}${cleanRoadEn}`,
          icon: '↰',
        };
      }
      if (modifier.includes('uturn')) {
        return {
          ar: `لف وارجع (U-Turn)${cleanRoadAr}`,
          en: `Make a U-turn${cleanRoadEn}`,
          icon: '↩️',
        };
      }

      return {
        ar: `استمر مباشرة للأمام${cleanRoadAr}`,
        en: `Continue straight${cleanRoadEn}`,
        icon: '⬆️',
      };
    };

    try {
      // OSRM public server supports 'foot' and 'driving'
      const osrmProfile = mode === 'walking' ? 'foot' : 'driving';
      const url = `https://router.project-osrm.org/route/v1/${osrmProfile}/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=true`;
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        const route = data?.routes?.[0];
        if (route && route.geometry?.coordinates?.length > 0) {
          // GeoJSON coordinates are [lng, lat] -> convert to [lat, lng] for Leaflet
          const coords: Array<[number, number]> = route.geometry.coordinates.map((pt: [number, number]) => [
            Number(pt[1]),
            Number(pt[0]),
          ]);

          const totalMeters = Number(route.distance) || straightDistKm * 1000;
          const distanceKm = Number((totalMeters / 1000).toFixed(2));

          // Realistic walking speed ~4.8 km/h (80 m/min), driving speed in Egyptian cities ~25-35 km/h
          const walkingMinutes = Math.max(1, Math.round(totalMeters / 80));
          const drivingMinutes = Math.max(
            1,
            mode === 'driving' && route.duration
              ? Math.round(Number(route.duration) / 60)
              : Math.round(totalMeters / 450)
          );
          const durationMinutes = mode === 'walking' ? walkingMinutes : drivingMinutes;

          const rawSteps = route.legs?.[0]?.steps || [];
          const steps: RouteStep[] = [];

          for (const st of rawSteps) {
            const type = String(st?.maneuver?.type || 'continue');
            const modifier = String(st?.maneuver?.modifier || 'straight');
            const name = String(st?.name || st?.ref || '').trim();
            const distMeters = Math.round(Number(st?.distance || 0));
            const durSecs = Math.round(Number(st?.duration || 0));

            if (distMeters < 8 && type !== 'depart' && type !== 'arrive') continue;

            const formatted = formatStepInstruction(type, modifier, name);
            steps.push({
              instructionAr: formatted.ar,
              instructionEn: formatted.en,
              streetName: name,
              distanceMeters: distMeters,
              durationSeconds: durSecs,
              icon: formatted.icon,
            });
          }

          if (steps.length === 0) {
            steps.push(
              {
                instructionAr: 'ابدأ التحرك من موقعك الحالي باتجاه السكن',
                instructionEn: 'Start from your current location towards the property',
                streetName: '',
                distanceMeters: Math.round(totalMeters),
                durationSeconds: durationMinutes * 60,
                icon: '🚀',
              },
              {
                instructionAr: 'وصلت إلى موقع السكن 🏠',
                instructionEn: 'You have arrived at the property 🏠',
                streetName: '',
                distanceMeters: 0,
                durationSeconds: 0,
                icon: '🏁',
              }
            );
          }

          return {
            coordinates: coords,
            distanceKm,
            durationMinutes,
            walkingMinutes,
            drivingMinutes,
            steps,
            mode,
            googleMapsDirUrl,
          };
        }
      }
    } catch {
      // Fallback below if offline
    }

    // Fallback route if OSRM is unreachable
    const estRoadKm = Number((straightDistKm * 1.22).toFixed(2));
    const walkingMinutes = Math.max(1, Math.round((estRoadKm * 1000) / 80));
    const drivingMinutes = Math.max(1, Math.round((estRoadKm * 1000) / 450));
    const durationMinutes = mode === 'walking' ? walkingMinutes : drivingMinutes;

    return {
      coordinates: [
        [fromLat, fromLng],
        [toLat, toLng],
      ],
      distanceKm: estRoadKm,
      durationMinutes,
      walkingMinutes,
      drivingMinutes,
      steps: [
        {
          instructionAr: 'ابدأ التحرك من موقعك الحالي باتجاه موقع السكن المحدد على الخريطة',
          instructionEn: 'Start from your current location towards the pinned property',
          streetName: '',
          distanceMeters: Math.round(estRoadKm * 1000),
          durationSeconds: durationMinutes * 60,
          icon: '🚀',
        },
        {
          instructionAr: 'وصلت إلى موقع السكن 🏠',
          instructionEn: 'You have arrived at the property 🏠',
          streetName: '',
          distanceMeters: 0,
          durationSeconds: 0,
          icon: '🏁',
        },
      ],
      mode,
      googleMapsDirUrl,
    };
  }
}

