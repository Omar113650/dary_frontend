import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLocale } from '../utils/LocaleContext';
import { useAuth } from '../context/AuthContext';
import { propertyService, matchesPropertyFilters, type PropertyFilterParams } from '../services/propertyService';
import { fetchGlobalActiveBookings } from '../services/occupancyService';
import type { Property } from '../types/property';
import PropertyCard from '../components/PropertyCard/PropertyCard';
import AnimatedCounter from '../components/common/AnimatedCounter';
import InteractiveMap from '../components/common/InteractiveMap';
import {
  LocationService,
  resolveCoordinates,
  calculateDistanceKm,
  normalizeArabicForSearch,
  DEFAULT_CAIRO_LAT,
  DEFAULT_CAIRO_LNG,
} from '../services/locationService';
import type { Coordinates } from '../services/locationService';
import './PropertiesPage.css';

interface PriceRangeOption {
  value: string;
  label: { ar: string; en: string };
  min?: number;
  max?: number;
}

const priceRanges: PriceRangeOption[] = [
  { value: '', label: { ar: 'جميع الأسعار', en: 'All Prices' }, min: undefined, max: undefined },
  { value: 'under-1000', label: { ar: 'أقل من 1,000 ج.م', en: 'Under 1,000 EGP' }, min: undefined, max: 1000 },
  { value: '1000-2000', label: { ar: '1,000 - 2,000 ج.م', en: '1,000 - 2,000 EGP' }, min: 1000, max: 2000 },
  { value: '2000-3000', label: { ar: '2,000 - 3,000 ج.م', en: '2,000 - 3,000 EGP' }, min: 2000, max: 3000 },
  { value: '3000-5000', label: { ar: '3,000 - 5,000 ج.م', en: '3,000 - 5,000 EGP' }, min: 3000, max: 5000 },
  { value: 'over-5000', label: { ar: 'أكثر من 5,000 ج.م', en: 'Over 5,000 EGP' }, min: 5000, max: undefined },
  { value: 'custom', label: { ar: 'تحديد ميزانية مخصصة...', en: 'Custom Price Range...' }, min: undefined, max: undefined },
];

const baseCityOptions = [
  { value: '', label: { ar: 'جميع المحافظات والمدن', en: 'All Governorates & Cities' } },
  { value: 'cairo', label: { ar: 'القاهرة الكبرى (مدينة نصر / العباسية / المعادي)', en: 'Cairo (Nasr City / Maadi)' } },
  { value: 'new_cairo', label: { ar: 'القاهرة الجديدة / التجمع الخامس / الرحاب', en: 'New Cairo / Fifth Settlement' } },
  { value: 'giza', label: { ar: 'الجيزة (الدقي / المهندسين / فيصل / الهرم)', en: 'Giza (Dokki / Mohandessin)' } },
  { value: 'october', label: { ar: '6 أكتوبر والشيخ زايد', en: '6th of October & Sheikh Zayed' } },
  { value: 'mansoura', label: { ar: 'المنصورة / الدقهلية', en: 'Mansoura / Dakahlia' } },
  { value: 'tanta', label: { ar: 'طنطا / الغربية', en: 'Tanta / Gharbia' } },
  { value: 'alexandria', label: { ar: 'الإسكندرية', en: 'Alexandria' } },
  { value: 'zagazig', label: { ar: 'الزقازيق / الشرقية', en: 'Zagazig / Sharqia' } },
  { value: 'kafr_el_sheikh', label: { ar: 'كفر الشيخ', en: 'Kafr El Sheikh' } },
  { value: 'benha', label: { ar: 'بنها / القليوبية', en: 'Benha / Qalyubia' } },
  { value: 'menoufia', label: { ar: 'شبين الكوم / المنوفية', en: 'Menoufia / Shebin El Kom' } },
  { value: 'damietta', label: { ar: 'دمياط / دمياط الجديدة', en: 'Damietta' } },
  { value: 'ismailia', label: { ar: 'الإسماعيلية / قناة السويس', en: 'Ismailia' } },
  { value: 'assiut', label: { ar: 'أسيوط', en: 'Assiut' } },
  { value: 'fayoum', label: { ar: 'الفيوم / بني سويف', en: 'Fayoum / Beni Suef' } },
  { value: 'minya', label: { ar: 'المنيا', en: 'Minya' } },
  { value: 'sohag', label: { ar: 'سوهاج / قنا / أسوان', en: 'Sohag / Qena / Aswan' } },
];

const baseUniversityOptions = [
  { value: '', label: { ar: 'جميع الجامعات', en: 'All Universities' } },
  { value: 'جامعة القاهرة', label: { ar: 'جامعة القاهرة', en: 'Cairo University' } },
  { value: 'جامعة عين شمس', label: { ar: 'جامعة عين شمس', en: 'Ain Shams University' } },
  { value: 'جامعة المنصورة', label: { ar: 'جامعة المنصورة', en: 'Mansoura University' } },
  { value: 'جامعة طنطا', label: { ar: 'جامعة طنطا', en: 'Tanta University' } },
  { value: 'جامعة الإسكندرية', label: { ar: 'جامعة الإسكندرية', en: 'Alexandria University' } },
  { value: 'جامعة الزقازيق', label: { ar: 'جامعة الزقازيق', en: 'Zagazig University' } },
  { value: 'جامعة الأزهر', label: { ar: 'جامعة الأزهر', en: 'Al-Azhar University' } },
  { value: 'جامعة حلوان', label: { ar: 'جامعة حلوان', en: 'Helwan University' } },
  { value: 'جامعة كفر الشيخ', label: { ar: 'جامعة كفر الشيخ', en: 'Kafr El Sheikh University' } },
  { value: 'جامعة بنها', label: { ar: 'جامعة بنها', en: 'Benha University' } },
  { value: 'جامعة المنوفية', label: { ar: 'جامعة المنوفية', en: 'Menoufia University' } },
  { value: 'جامعة أسيوط', label: { ar: 'جامعة أسيوط', en: 'Assiut University' } },
  { value: 'جامعة 6 أكتوبر', label: { ar: 'جامعة 6 أكتوبر / MSA / MUST', en: '6th of October / MSA / MUST' } },
  { value: 'الجامعة الأمريكية', label: { ar: 'الجامعة الأمريكية / الألمانية (AUC / GUC)', en: 'AUC / GUC / FUE' } },
];

const typeOptions = [
  { value: '', label: { ar: 'جميع أنواع السكن', en: 'All Housing Types' } },
  { value: 'shared_apartment', label: { ar: 'شقة مشتركة (Shared Apartment)', en: 'Shared Apartment' } },
  { value: 'private_room', label: { ar: 'غرفة خاصة (Private Room)', en: 'Private Room' } },
  { value: 'shared_room', label: { ar: 'غرفة مشتركة (Shared Room)', en: 'Shared Room' } },
  { value: 'studio', label: { ar: 'استوديو مستقل (Studio)', en: 'Studio' } },
  { value: 'entire_apartment', label: { ar: 'شقة كاملة (Entire Apartment)', en: 'Entire Apartment' } },
];

const roomTypeOptions = [
  { value: '', label: { ar: 'جميع أنواع الغرف', en: 'All Room Types' } },
  { value: 'SINGLE', label: { ar: '🛏️ غرفة فردية (سرير واحد)', en: '🛏️ Single Room (1 Bed)' } },
  { value: 'DOUBLE', label: { ar: '🛏️ غرفة ثنائية (سريران)', en: '🛏️ Double Room (2 Beds)' } },
  { value: 'TRIPLE', label: { ar: '🛏️ غرفة ثلاثية (3 أسِرّة)', en: '🛏️ Triple Room (3 Beds)' } },
  { value: 'QUAD', label: { ar: '🛏️ غرفة رباعية (4 أسِرّة)', en: '🛏️ Quad Room (4 Beds)' } },
];

const genderOptions = [
  { value: '', label: { ar: 'مخصص لـ: الكل (شباب وبنات)', en: 'Gender: All (Male & Female)' } },
  { value: 'male_only', label: { ar: '👨‍🎓 سكن شباب فقط', en: '👨‍🎓 Male Students Only' } },
  { value: 'female_only', label: { ar: '👩‍🎓 سكن بنات فقط', en: '👩‍🎓 Female Students Only' } },
];

const classOptions = [
  { value: '', label: { ar: 'فئة السكن: جميع الفئات', en: 'Class: All Classes' } },
  { value: 'STANDARD', label: { ar: 'قياسي / اقتصادي (Standard)', en: 'Standard / Economy' } },
  { value: 'LUXURY', label: { ar: '⭐ فاخر / مميز (Luxury)', en: '⭐ Luxury / Premium' } },
];

const bedroomOptions = [
  { value: '', label: { ar: 'عدد الغرف: أي عدد', en: 'Rooms: Any Count' } },
  { value: '1', label: { ar: 'غرفة واحدة (1)', en: '1 Room' } },
  { value: '2', label: { ar: 'غرفتان (2)', en: '2 Rooms' } },
  { value: '3', label: { ar: '3 غرف', en: '3 Rooms' } },
  { value: '4', label: { ar: '4 غرف أو أكثر', en: '4+ Rooms' } },
];

const distanceOptions = [
  { value: '', label: { ar: 'المسافة للجامعة: أي مسافة', en: 'Distance to Univ: Any' } },
  { value: '1', label: { ar: '🚶 أقل من 1 كم (دقائق مشياً)', en: '🚶 Within 1 km (Walking)' } },
  { value: '2', label: { ar: 'أقل من 2 كم عن الجامعة', en: 'Within 2 km' } },
  { value: '5', label: { ar: 'أقل من 5 كم عن الجامعة', en: 'Within 5 km' } },
  { value: '10', label: { ar: 'أقل من 10 كم عن الجامعة', en: 'Within 10 km' } },
];

export default function PropertiesPage() {
  const { t, locale } = useLocale();
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Primary Filter States
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [university, setUniversity] = useState(searchParams.get('university') || '');
  const [propertyType, setPropertyType] = useState(searchParams.get('propertyType') || '');
  const [genderAllowed, setGenderAllowed] = useState(searchParams.get('genderAllowed') || '');
  const [priceRange, setPriceRange] = useState(searchParams.get('priceRange') || '');
  const [customMinPrice, setCustomMinPrice] = useState(searchParams.get('minPrice') || '');
  const [customMaxPrice, setCustomMaxPrice] = useState(searchParams.get('maxPrice') || '');

  // Secondary / Precision Filter States
  const [roomType, setRoomType] = useState(searchParams.get('roomType') || '');
  const [bedrooms, setBedrooms] = useState(searchParams.get('bedrooms') || searchParams.get('rooms') || '');
  const [propertyClass, setPropertyClass] = useState(searchParams.get('propertyClass') || '');
  const [maxDistance, setMaxDistance] = useState(searchParams.get('maxDistance') || '');
  const [availableOnly, setAvailableOnly] = useState(searchParams.get('availableOnly') === 'true');
  const [isFurnished, setIsFurnished] = useState(searchParams.get('isFurnished') === 'true');
  const [internetIncluded, setInternetIncluded] = useState(searchParams.get('internetIncluded') === 'true');
  const [billsIncluded, setBillsIncluded] = useState(searchParams.get('billsIncluded') === 'true');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'recommended');

  // Mobile Filter Drawer State
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Lock body scroll and handle ESC key when mobile drawer is open
  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setMobileDrawerOpen(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [mobileDrawerOpen]);

  // Data & Lifecycle States (allProperties holds the full normalized list from the backend)
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Proactively fetch global active bookings (admin only) so property cards reflect live vacancy schedules
  useEffect(() => {
    if (isAdmin) {
      fetchGlobalActiveBookings().catch(() => {});
    }
  }, [isAdmin]);

  // Debounce search input (250ms for snappy feedback)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Sync state to URL query params
  useEffect(() => {
    const params: Record<string, string> = {};
    if (debouncedSearch) params.search = debouncedSearch;
    if (city) params.city = city;
    if (university) params.university = university;
    if (propertyType) params.propertyType = propertyType;
    if (genderAllowed) params.genderAllowed = genderAllowed;
    if (priceRange) params.priceRange = priceRange;
    if (priceRange === 'custom' && customMinPrice) params.minPrice = customMinPrice;
    if (priceRange === 'custom' && customMaxPrice) params.maxPrice = customMaxPrice;
    if (roomType) params.roomType = roomType;
    if (bedrooms) params.rooms = bedrooms;
    if (propertyClass) params.propertyClass = propertyClass;
    if (maxDistance) params.maxDistance = maxDistance;
    if (availableOnly) params.availableOnly = 'true';
    if (isFurnished) params.isFurnished = 'true';
    if (internetIncluded) params.internetIncluded = 'true';
    if (billsIncluded) params.billsIncluded = 'true';
    if (sortBy && sortBy !== 'recommended') params.sort = sortBy;
    setSearchParams(params, { replace: true });
  }, [
    debouncedSearch,
    city,
    university,
    propertyType,
    genderAllowed,
    priceRange,
    customMinPrice,
    customMaxPrice,
    roomType,
    bedrooms,
    propertyClass,
    maxDistance,
    availableOnly,
    isFurnished,
    internetIncluded,
    billsIncluded,
    sortBy,
    setSearchParams,
  ]);

  // Reload counter for manual retries
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Fetch full public dataset from backend once (and on reloadTrigger) so filtering is instant and 100% accurate
  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(null);

    propertyService
      .getProperties({ limit: 100 })
      .then((data) => {
        if (!ignore) {
          setAllProperties(data);
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (!ignore) {
          console.error('Failed to load properties from API:', err);
          setError(t.properties_error_desc);
          setAllProperties([]);
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [reloadTrigger, t.properties_error_desc]);

  const loadProperties = useCallback(() => {
    setReloadTrigger((prev) => prev + 1);
  }, []);

  const handleRetry = loadProperties;

  // Expose loadProperties on window for dev/console/debugging convenience
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).loadProperties = loadProperties;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).loadProperties;
      }
    };
  }, [loadProperties]);

  // Dynamically enrich city options with any custom cities/governorates from the database + property counts
  const cityOptions = useMemo(() => {
    const withCounts = baseCityOptions.map((opt) => {
      if (!opt.value) return { ...opt, count: allProperties.length };
      const count = allProperties.filter((p) => matchesPropertyFilters(p, { city: opt.value })).length;
      return { ...opt, count };
    });

    // Discover any unique city/governorate in allProperties not covered by base options
    const dynamicCities = new Map<string, number>();
    for (const p of allProperties) {
      const c = (p.city || p.governorate || '').trim();
      if (!c) continue;
      const alreadyMatched = baseCityOptions.some(
        (opt) => opt.value && matchesPropertyFilters(p, { city: opt.value })
      );
      if (!alreadyMatched) {
        dynamicCities.set(c, (dynamicCities.get(c) || 0) + 1);
      }
    }

    const extraOptions = Array.from(dynamicCities.entries()).map(([cName, count]) => ({
      value: cName,
      label: { ar: cName, en: cName },
      count,
    }));

    return [...withCounts, ...extraOptions];
  }, [allProperties]);

  // Dynamically enrich university options with any university present in allProperties
  const universityOptions = useMemo(() => {
    const seen = new Set(baseUniversityOptions.map((u) => normalizeArabicForSearch(u.value)));
    const extra: Array<{ value: string; label: { ar: string; en: string } }> = [];

    for (const p of allProperties) {
      const u = (p.nearestUniversity || '').trim();
      if (!u) continue;
      const norm = normalizeArabicForSearch(u);
      if (norm && !seen.has(norm)) {
        seen.add(norm);
        extra.push({ value: u, label: { ar: u, en: u } });
      }
    }
    return [...baseUniversityOptions, ...extra];
  }, [allProperties]);

  // Build active filter object and filter allProperties instantaneously
  const activeFilterParams: PropertyFilterParams = useMemo(() => {
    const activePrice = priceRanges.find((p) => p.value === priceRange);
    const minP =
      priceRange === 'custom'
        ? customMinPrice !== '' && !Number.isNaN(Number(customMinPrice))
          ? Number(customMinPrice)
          : undefined
        : activePrice?.min;
    const maxP =
      priceRange === 'custom'
        ? customMaxPrice !== '' && !Number.isNaN(Number(customMaxPrice))
          ? Number(customMaxPrice)
          : undefined
        : activePrice?.max;

    return {
      search: debouncedSearch || undefined,
      city: city || undefined,
      university: university || undefined,
      propertyType: propertyType || undefined,
      roomType: roomType || undefined,
      genderAllowed: genderAllowed || undefined,
      propertyClass: propertyClass || undefined,
      minPrice: minP,
      maxPrice: maxP,
      rooms: bedrooms ? parseInt(bedrooms, 10) : undefined,
      maxDistanceToUniversity: maxDistance ? parseFloat(maxDistance) : undefined,
      availableOnly: availableOnly ? true : undefined,
      isFurnished: isFurnished ? true : undefined,
      internetIncluded: internetIncluded ? true : undefined,
      billsIncluded: billsIncluded ? true : undefined,
    };
  }, [
    debouncedSearch,
    city,
    university,
    propertyType,
    roomType,
    genderAllowed,
    propertyClass,
    priceRange,
    customMinPrice,
    customMaxPrice,
    bedrooms,
    maxDistance,
    availableOnly,
    isFurnished,
    internetIncluded,
    billsIncluded,
  ]);

  const properties = useMemo(() => {
    return allProperties.filter((prop) => matchesPropertyFilters(prop, activeFilterParams));
  }, [allProperties, activeFilterParams]);

  // Client-side Sorting & Map View State
  const [showMap, setShowMap] = useState(false);
  const [userCoords, setUserCoords] = useState<Coordinates | null>(() =>
    LocationService.getCachedUserLocation()
  );
  const [detectingNearMe, setDetectingNearMe] = useState(false);
  const [geocodeTick, setGeocodeTick] = useState(0);

  // Dynamically geocode any property from the backend that does not yet have explicit latitude/longitude
  useEffect(() => {
    let cancelled = false;
    const missing = allProperties.filter(
      (p) =>
        (p.latitude === undefined || p.latitude === null || Number.isNaN(Number(p.latitude))) &&
        Boolean(p.address || p.district || p.nearestUniversity || p.city || p.governorate)
    );
    if (missing.length === 0) return;

    (async () => {
      for (const prop of missing) {
        if (cancelled) break;
        const res = await LocationService.geocodeAddress({
          address: prop.address,
          district: prop.district,
          nearestUniversity: prop.nearestUniversity,
          city: prop.city,
          governorate: prop.governorate,
          location: prop.location,
        });
        if (!cancelled && res) {
          setGeocodeTick((t) => t + 1);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [allProperties]);

  const handleSortNearMe = async () => {
    setDetectingNearMe(true);
    try {
      const coords = await LocationService.detectAndSyncProfileLocation(true);
      setUserCoords(coords);
      setSortBy('nearest');
      setShowMap(true);
    } catch {
      setShowMap(true);
    } finally {
      setDetectingNearMe(false);
    }
  };

  const sortedProperties = useMemo(() => {
    const list = [...properties];
    if (sortBy === 'price_asc') {
      return list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    }
    if (sortBy === 'price_desc') {
      return list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    }
    if (sortBy === 'newest') {
      return list.sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    }
    if (sortBy === 'popular') {
      return list.sort(
        (a, b) => Number((b as any).viewsCount || 0) - Number((a as any).viewsCount || 0)
      );
    }
    if (sortBy === 'university_distance') {
      return list.sort(
        (a, b) =>
          Number(a.distanceToUniversity ?? 999) - Number(b.distanceToUniversity ?? 999)
      );
    }
    if (sortBy === 'nearest') {
      const refLat = userCoords?.latitude ?? DEFAULT_CAIRO_LAT;
      const refLng = userCoords?.longitude ?? DEFAULT_CAIRO_LNG;
      return list.sort((a, b) => {
        const cA = resolveCoordinates(a);
        const cB = resolveCoordinates(b);
        return (
          calculateDistanceKm(refLat, refLng, cA.latitude, cA.longitude) -
          calculateDistanceKm(refLat, refLng, cB.latitude, cB.longitude)
        );
      });
    }
    return list;
  }, [properties, sortBy, userCoords, geocodeTick]);

  // Check if any filter is active
  const activeFilterCount = [
    Boolean(searchTerm.trim()),
    Boolean(city),
    Boolean(university),
    Boolean(propertyType),
    Boolean(genderAllowed),
    Boolean(priceRange),
    Boolean(roomType),
    Boolean(bedrooms),
    Boolean(propertyClass),
    Boolean(maxDistance),
    availableOnly,
    isFurnished,
    internetIncluded,
    billsIncluded,
  ].filter(Boolean).length;

  const hasActiveFilters = activeFilterCount > 0;

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setCity('');
    setUniversity('');
    setPropertyType('');
    setGenderAllowed('');
    setPriceRange('');
    setCustomMinPrice('');
    setCustomMaxPrice('');
    setRoomType('');
    setBedrooms('');
    setPropertyClass('');
    setMaxDistance('');
    setAvailableOnly(false);
    setIsFurnished(false);
    setInternetIncluded(false);
    setBillsIncluded(false);
    setMobileDrawerOpen(false);
  };

  return (
    <main className="properties-page">
      <div className="container">
        {/* Page Header */}
        <header className="properties-header">
          <h1 className="properties-title">{t.page_properties_title}</h1>
          <p className="properties-subtitle">{t.properties_subtitle}</p>
        </header>

        {/* Main Filter Container */}
        <div
          style={{
            background: '#FFFFFF',
            padding: '1.15rem 1.25rem',
            borderRadius: '18px',
            border: '1px solid rgba(11, 42, 74, 0.08)',
            boxShadow: '0 6px 24px rgba(11, 42, 74, 0.04)',
            marginBottom: '1.5rem',
          }}
        >
          {/* Row 1: Primary Filters */}
          <div className="properties-filter-bar" style={{ marginBottom: 0, padding: 0, border: 'none', boxShadow: 'none' }}>
            {/* Keyword Search */}
            <div className="filter-input-wrap" style={{ flex: '1.8 1 250px' }}>
              <svg
                className="filter-icon"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="filter-input"
                placeholder={
                  locale === 'ar'
                    ? 'ابحث بالاسم، المدينة، الحي، الجامعة أو المرافق...'
                    : 'Search by title, city, district, university, or amenity...'
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label={t.properties_filter_search_placeholder}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="filter-clear-input"
                  onClick={() => setSearchTerm('')}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Location Dropdown (Governorate / City with live counts) */}
            <div className="filter-select-wrap" style={{ flex: '1.1 1 175px' }}>
              <select
                className="filter-select"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                aria-label={t.properties_filter_location}
              >
                {cityOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.value
                      ? `${opt.label[locale]}${opt.count > 0 ? ` (${opt.count})` : ''}`
                      : `📍 ${t.properties_filter_location}: ${opt.label[locale]}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Nearest University Dropdown */}
            <div className="filter-select-wrap" style={{ flex: '1.1 1 170px' }}>
              <select
                className="filter-select"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                aria-label={locale === 'ar' ? 'الجامعة الأقرب' : 'Nearest University'}
              >
                {universityOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.value
                      ? `🎓 ${opt.label[locale]}`
                      : locale === 'ar'
                      ? '🎓 الجامعة: جميع الجامعات'
                      : '🎓 University: All'}
                  </option>
                ))}
              </select>
            </div>

            {/* Property Type Dropdown */}
            <div className="filter-select-wrap" style={{ flex: '1 1 160px' }}>
              <select
                className="filter-select"
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                aria-label={t.properties_filter_type}
              >
                {typeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.value ? opt.label[locale] : `🏢 ${t.properties_filter_type}: ${opt.label[locale]}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Gender Allowed Dropdown */}
            <div className="filter-select-wrap" style={{ flex: '1 1 155px' }}>
              <select
                className="filter-select"
                value={genderAllowed}
                onChange={(e) => setGenderAllowed(e.target.value)}
                aria-label={locale === 'ar' ? 'السكن مخصص لـ' : 'Gender Allowed'}
              >
                {genderOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label[locale]}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range Dropdown */}
            <div className="filter-select-wrap" style={{ flex: '1 1 155px' }}>
              <select
                className="filter-select"
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                aria-label={t.properties_filter_price}
              >
                {priceRanges.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.value ? opt.label[locale] : `💰 ${t.properties_filter_price}: ${opt.label[locale]}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Mobile Filter Toggle Button */}
            <button
              type="button"
              className="mobile-filter-trigger"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label={t.properties_mobile_filters_btn}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="4" y1="21" x2="4" y2="14" />
                <line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" />
                <line x1="20" y1="12" x2="20" y2="3" />
                <line x1="1" y1="14" x2="7" y2="14" />
                <line x1="9" y1="8" x2="15" y2="8" />
                <line x1="17" y1="16" x2="23" y2="16" />
              </svg>
              <span>{t.properties_mobile_filters_btn}</span>
              {activeFilterCount > 0 && (
                <span className="mobile-filter-badge">{activeFilterCount}</span>
              )}
            </button>
          </div>

          {/* Custom Price Range Inputs (when "custom" is selected) */}
          {priceRange === 'custom' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                flexWrap: 'wrap',
                marginTop: '0.85rem',
                padding: '0.75rem 1rem',
                backgroundColor: '#F8FAFC',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
              }}
            >
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0B2A4A' }}>
                💰 {locale === 'ar' ? 'تحديد السعر الشهري (ج.م):' : 'Monthly Budget (EGP):'}
              </span>
              <input
                type="number"
                min={0}
                step={100}
                placeholder={locale === 'ar' ? 'الحد الأدنى (مثلاً 1200)' : 'Min price (e.g. 1200)'}
                value={customMinPrice}
                onChange={(e) => setCustomMinPrice(e.target.value)}
                style={{
                  height: '38px',
                  padding: '0 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.85rem',
                  width: '175px',
                }}
              />
              <span style={{ color: '#64748B', fontWeight: 600 }}>—</span>
              <input
                type="number"
                min={0}
                step={100}
                placeholder={locale === 'ar' ? 'الحد الأقصى (مثلاً 3500)' : 'Max price (e.g. 3500)'}
                value={customMaxPrice}
                onChange={(e) => setCustomMaxPrice(e.target.value)}
                style={{
                  height: '38px',
                  padding: '0 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.85rem',
                  width: '175px',
                }}
              />
            </div>
          )}

          {/* Row 2: Quick Filter Chips + Advanced Filters Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.6rem',
              marginTop: '0.9rem',
              paddingTop: '0.85rem',
              borderTop: '1px solid #F1F5F9',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {/* Quick Chip: Available Now */}
              <button
                type="button"
                onClick={() => setAvailableOnly((prev) => !prev)}
                style={{
                  padding: '0.38rem 0.8rem',
                  borderRadius: '999px',
                  border: availableOnly ? '1px solid #10B981' : '1px solid #E2E8F0',
                  backgroundColor: availableOnly ? '#ECFDF5' : '#F8FAFC',
                  color: availableOnly ? '#047857' : '#475569',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                🟢 {locale === 'ar' ? 'متاح للحجز الفوري فقط' : 'Available Now Only'}
              </button>

              {/* Quick Chip: Furnished */}
              <button
                type="button"
                onClick={() => setIsFurnished((prev) => !prev)}
                style={{
                  padding: '0.38rem 0.8rem',
                  borderRadius: '999px',
                  border: isFurnished ? '1px solid #2F6BFF' : '1px solid #E2E8F0',
                  backgroundColor: isFurnished ? '#EFF6FF' : '#F8FAFC',
                  color: isFurnished ? '#1D4ED8' : '#475569',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                🛋️ {locale === 'ar' ? 'مفروش بالكامل' : 'Fully Furnished'}
              </button>

              {/* Quick Chip: Internet Included */}
              <button
                type="button"
                onClick={() => setInternetIncluded((prev) => !prev)}
                style={{
                  padding: '0.38rem 0.8rem',
                  borderRadius: '999px',
                  border: internetIncluded ? '1px solid #2F6BFF' : '1px solid #E2E8F0',
                  backgroundColor: internetIncluded ? '#EFF6FF' : '#F8FAFC',
                  color: internetIncluded ? '#1D4ED8' : '#475569',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                📶 {locale === 'ar' ? 'شامل الإنترنت (Wi-Fi)' : 'Wi-Fi Included'}
              </button>

              {/* Quick Chip: Bills Included */}
              <button
                type="button"
                onClick={() => setBillsIncluded((prev) => !prev)}
                style={{
                  padding: '0.38rem 0.8rem',
                  borderRadius: '999px',
                  border: billsIncluded ? '1px solid #2F6BFF' : '1px solid #E2E8F0',
                  backgroundColor: billsIncluded ? '#EFF6FF' : '#F8FAFC',
                  color: billsIncluded ? '#1D4ED8' : '#475569',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                💡 {locale === 'ar' ? 'شامل الفواتير (كهرباء/مياه)' : 'Bills Included'}
              </button>

              {/* Toggle More Precision Filters */}
              <button
                type="button"
                onClick={() => setShowAdvancedFilters((prev) => !prev)}
                style={{
                  padding: '0.38rem 0.85rem',
                  borderRadius: '999px',
                  border:
                    showAdvancedFilters || roomType || bedrooms || propertyClass || maxDistance
                      ? '1px solid #0B2A4A'
                      : '1px solid #CBD5E1',
                  backgroundColor:
                    showAdvancedFilters || roomType || bedrooms || propertyClass || maxDistance
                      ? '#0B2A4A'
                      : '#FFFFFF',
                  color:
                    showAdvancedFilters || roomType || bedrooms || propertyClass || maxDistance
                      ? '#FFFFFF'
                      : '#0B2A4A',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ⚙️ {locale === 'ar' ? 'فلاتر متقدمة (الغرف / الفئة / المسافة)' : 'Advanced Filters'}{' '}
                {showAdvancedFilters ? '▲' : '▼'}
              </button>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                className="filter-reset-btn"
                onClick={handleResetFilters}
                style={{ height: '34px', fontSize: '0.8rem', paddingInline: '0.9rem' }}
              >
                ✕ {t.properties_reset_filters} ({activeFilterCount})
              </button>
            )}
          </div>

          {/* Collapsible Advanced Precision Row */}
          {(showAdvancedFilters || Boolean(roomType || bedrooms || propertyClass || maxDistance)) && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                gap: '0.75rem',
                marginTop: '0.85rem',
                paddingTop: '0.85rem',
                borderTop: '1px dashed #E2E8F0',
              }}
            >
              {/* Room Type (SINGLE / DOUBLE / TRIPLE / QUAD) */}
              <div className="filter-select-wrap">
                <select
                  className="filter-select"
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value)}
                  aria-label={locale === 'ar' ? 'نوع الغرفة' : 'Room Type'}
                >
                  {roomTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label[locale]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bedrooms / Rooms Count */}
              <div className="filter-select-wrap">
                <select
                  className="filter-select"
                  value={bedrooms}
                  onChange={(e) => setBedrooms(e.target.value)}
                  aria-label={t.properties_filter_bedrooms}
                >
                  {bedroomOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label[locale]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Property Class (STANDARD / LUXURY) */}
              <div className="filter-select-wrap">
                <select
                  className="filter-select"
                  value={propertyClass}
                  onChange={(e) => setPropertyClass(e.target.value)}
                  aria-label={locale === 'ar' ? 'فئة السكن' : 'Property Class'}
                >
                  {classOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label[locale]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Max Distance to University */}
              <div className="filter-select-wrap">
                <select
                  className="filter-select"
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(e.target.value)}
                  aria-label={locale === 'ar' ? 'المسافة للجامعة' : 'Distance to University'}
                >
                  {distanceOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label[locale]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Results Metadata & Sorting Row */}
        <div className="properties-meta-row" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div className="properties-count-wrap" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {!loading && !error && (
              <span className="properties-count">
                <strong>
                  <AnimatedCounter value={sortedProperties.length} duration={600} />
                </strong>{' '}
                {t.properties_results_count}
              </span>
            )}

            <button
              type="button"
              onClick={() => setShowMap((prev) => !prev)}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '10px',
                border: showMap ? '1px solid #2F6BFF' : '1px solid #CBD5E1',
                backgroundColor: showMap ? '#EFF6FF' : '#FFFFFF',
                color: showMap ? '#2F6BFF' : '#0B2A4A',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>🗺️</span>
              <span>
                {showMap
                  ? locale === 'ar'
                    ? 'إخفاء الخريطة'
                    : 'Hide Map'
                  : locale === 'ar'
                  ? 'عرض العقارات على الخريطة'
                  : 'Show on Map'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleSortNearMe}
              disabled={detectingNearMe}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '10px',
                border: sortBy === 'nearest' ? '1px solid #10B981' : '1px solid #CBD5E1',
                backgroundColor: sortBy === 'nearest' ? '#ECFDF5' : '#FFFFFF',
                color: sortBy === 'nearest' ? '#065F46' : '#0B2A4A',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: detectingNearMe ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>📍</span>
              <span>
                {detectingNearMe
                  ? locale === 'ar'
                    ? 'جاري تحديد موقعك...'
                    : 'Detecting GPS...'
                  : locale === 'ar'
                  ? 'الأقرب لموقعي (GPS)'
                  : 'Nearest to Me (GPS)'}
              </span>
            </button>
          </div>

          <div className="properties-sort-wrap">
            <label htmlFor="properties-sort-select" className="sort-label">
              {t.properties_sort_by}:
            </label>
            <select
              id="properties-sort-select"
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="recommended">{t.properties_sort_recommended}</option>
              <option value="newest">{locale === 'ar' ? 'الأحدث إضافة' : 'Newest First'}</option>
              <option value="popular">{locale === 'ar' ? 'الأكثر مشاهدة وطلباً' : 'Most Viewed'}</option>
              <option value="nearest">{locale === 'ar' ? 'الأقرب لموقعي الجغرافي' : 'Nearest to My Location'}</option>
              <option value="university_distance">{locale === 'ar' ? 'الأقرب للجامعة' : 'Closest to University'}</option>
              <option value="price_asc">{t.properties_sort_price_asc}</option>
              <option value="price_desc">{t.properties_sort_price_desc}</option>
            </select>
          </div>
        </div>

        {/* Collapsible Interactive Map showing all properties */}
        {showMap && (
          <div style={{ marginBottom: '2rem' }}>
            <InteractiveMap
              latitude={userCoords?.latitude ?? (sortedProperties[0] ? resolveCoordinates(sortedProperties[0]).latitude : DEFAULT_CAIRO_LAT)}
              longitude={userCoords?.longitude ?? (sortedProperties[0] ? resolveCoordinates(sortedProperties[0]).longitude : DEFAULT_CAIRO_LNG)}
              locationContext={
                !userCoords && city !== 'all' && city !== ''
                  ? { city }
                  : sortedProperties[0]
                  ? {
                      address: sortedProperties[0].address,
                      district: sortedProperties[0].district,
                      city: sortedProperties[0].city,
                      governorate: sortedProperties[0].governorate,
                      nearestUniversity: sortedProperties[0].nearestUniversity,
                    }
                  : undefined
              }
              title={locale === 'ar' ? '🗺️ خريطة السكن الطلابي والأماكن القريبة' : '🗺️ Student Housing Map & Nearby'}
              subtitle={
                userCoords
                  ? locale === 'ar'
                    ? 'مرتبة حسب الأقرب لموقعك الحالي'
                    : 'Sorted by proximity to your GPS location'
                  : city && city !== 'all'
                  ? city
                  : locale === 'ar'
                  ? 'مواقع العقارات المتاحة والأماكن القريبة'
                  : 'Available Property Locations & Nearby Places'
              }
              height="400px"
              showNearby={true}
              syncProfileOnDetect={true}
              locale={locale}
              onProfileSynced={(lat, lng) => {
                setUserCoords({ latitude: lat, longitude: lng });
                setSortBy('nearest');
              }}
              markers={sortedProperties.map((p) => {
                const c = resolveCoordinates(p);
                const tTitle =
                  typeof p.title === 'object' ? p.title[locale] || p.title.ar || p.title.en : String(p.title);
                const tLoc =
                  typeof p.location === 'object' ? p.location[locale] || p.location.ar || p.location.en : String(p.location);
                return {
                  id: p.id,
                  latitude: c.latitude,
                  longitude: c.longitude,
                  title: tTitle,
                  subtitle: tLoc,
                  priceText: `${Number(p.price || 0).toLocaleString()} ${p.currency}`,
                  href: `/properties/${p.id}`,
                };
              })}
            />
          </div>
        )}

        {/* State 1: Loading Skeleton Grid */}
        {loading && (
          <div className="properties-grid" aria-busy="true" aria-label="Loading properties">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="property-skeleton-card" aria-hidden="true">
                <div className="skeleton-media shimmer">
                  <div className="skeleton-badge shimmer" />
                </div>
                <div className="skeleton-body">
                  <div className="skeleton-location shimmer" />
                  <div className="skeleton-title shimmer" />
                  <div className="skeleton-specs">
                    <div className="skeleton-spec shimmer" />
                    <div className="skeleton-spec shimmer" />
                  </div>
                  <div className="skeleton-footer">
                    <div className="skeleton-price shimmer" />
                    <div className="skeleton-btn shimmer" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* State 2: Error State */}
        {!loading && error && (
          <div className="properties-error-state" role="alert">
            <div className="error-icon-wrap" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h3 className="error-title">{t.properties_error_title}</h3>
            <p className="error-desc">{error}</p>
            <button
              type="button"
              className="error-retry-btn"
              onClick={handleRetry}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 21h5v-5" />
              </svg>
              <span>{t.properties_error_retry}</span>
            </button>
          </div>
        )}

        {/* State 3: Empty State */}
        {!loading && !error && sortedProperties.length === 0 && (
          <div className="properties-empty-state">
            <div className="empty-icon-wrap" aria-hidden="true">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </div>
            <h3 className="empty-title">{t.properties_empty_title}</h3>
            <p className="empty-desc">{t.properties_empty_desc}</p>
            {hasActiveFilters && (
              <button
                type="button"
                className="empty-reset-btn"
                onClick={handleResetFilters}
              >
                {t.properties_reset_filters}
              </button>
            )}
          </div>
        )}

        {/* State 4: Real Properties Grid */}
        {!loading && !error && sortedProperties.length > 0 && (
          <div className="properties-grid">
            {sortedProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </div>

      {/* Mobile Filters Slide-Over Drawer */}
      {mobileDrawerOpen && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setMobileDrawerOpen(false)}
          aria-hidden="true"
        >
          <div
            className="mobile-drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={t.properties_mobile_filters_btn}
          >
            <div className="mobile-drawer-header">
              <h3 className="mobile-drawer-title">{t.properties_mobile_filters_btn}</h3>
              <button
                type="button"
                className="mobile-drawer-close"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label={t.properties_mobile_close}
              >
                ✕
              </button>
            </div>

            <div className="mobile-drawer-body">
              {/* Location */}
              <div className="mobile-drawer-group">
                <label className="mobile-drawer-label">{t.properties_filter_location}</label>
                <select
                  className="mobile-drawer-select"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                >
                  {cityOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label[locale]} {opt.value && opt.count > 0 ? `(${opt.count})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nearest University */}
              <div className="mobile-drawer-group">
                <label className="mobile-drawer-label">
                  {locale === 'ar' ? 'الجامعة الأقرب' : 'Nearest University'}
                </label>
                <select
                  className="mobile-drawer-select"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                >
                  {universityOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label[locale]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Property Type */}
              <div className="mobile-drawer-group">
                <label className="mobile-drawer-label">{t.properties_filter_type}</label>
                <select
                  className="mobile-drawer-select"
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                >
                  {typeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label[locale]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Gender Allowed */}
              <div className="mobile-drawer-group">
                <label className="mobile-drawer-label">
                  {locale === 'ar' ? 'مخصص لـ' : 'Gender Allowed'}
                </label>
                <select
                  className="mobile-drawer-select"
                  value={genderAllowed}
                  onChange={(e) => setGenderAllowed(e.target.value)}
                >
                  {genderOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label[locale]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Room Type */}
              <div className="mobile-drawer-group">
                <label className="mobile-drawer-label">
                  {locale === 'ar' ? 'نوع الغرفة' : 'Room Type'}
                </label>
                <select
                  className="mobile-drawer-select"
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value)}
                >
                  {roomTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label[locale]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div className="mobile-drawer-group">
                <label className="mobile-drawer-label">{t.properties_filter_price}</label>
                <select
                  className="mobile-drawer-select"
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value)}
                >
                  {priceRanges.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label[locale]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bedrooms */}
              <div className="mobile-drawer-group">
                <label className="mobile-drawer-label">{t.properties_filter_bedrooms}</label>
                <select
                  className="mobile-drawer-select"
                  value={bedrooms}
                  onChange={(e) => setBedrooms(e.target.value)}
                >
                  {bedroomOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label[locale]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Property Class */}
              <div className="mobile-drawer-group">
                <label className="mobile-drawer-label">
                  {locale === 'ar' ? 'فئة السكن' : 'Property Class'}
                </label>
                <select
                  className="mobile-drawer-select"
                  value={propertyClass}
                  onChange={(e) => setPropertyClass(e.target.value)}
                >
                  {classOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label[locale]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mobile-drawer-footer">
              <button
                type="button"
                className="mobile-drawer-reset-btn"
                onClick={handleResetFilters}
              >
                {t.properties_reset_filters}
              </button>
              <button
                type="button"
                className="mobile-drawer-apply-btn"
                onClick={() => setMobileDrawerOpen(false)}
              >
                {t.properties_apply_filters}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

