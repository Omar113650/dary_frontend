import { ApiClient } from './apiClient';
import type { Property, PropertyResponse } from '../types/property';
import {
  resolveCoordinates,
  isCoordinateValidForContext,
  isMeaningfulStreetAddress,
  formatCleanAddress,
  matchKnownEgyptLocation,
  normalizeUniversityName,
  normalizeArabicForSearch,
} from './locationService';
export type { PropertyResponse };

export interface PropertyFilterParams {
  search?: string;
  city?: string;
  university?: string;
  propertyType?: string;
  roomType?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  rooms?: number;
  propertyClass?: string;
  genderAllowed?: string;
  targetTenantType?: string;
  isFurnished?: boolean;
  internetIncluded?: boolean;
  billsIncluded?: boolean;
  availableOnly?: boolean;
  maxDistanceToUniversity?: number;
  amenities?: string[];
  sort?: string;
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// In-memory cache + sessionStorage backup for instant property retrieval
const propertyMemoryCache = new Map<string, Property>();

export function cacheProperty(prop: Property): void {
  if (!prop?.id) return;
  propertyMemoryCache.set(prop.id, prop);
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(`dary_prop_${prop.id}`, JSON.stringify(prop));
    } catch {}
  }
}

export function getCachedProperty(id: string): Property | null {
  if (!id) return null;
  if (propertyMemoryCache.has(id)) {
    return propertyMemoryCache.get(id)!;
  }
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem(`dary_prop_${id}`);
      if (stored) {
        const parsed = normalizeProperty(JSON.parse(stored));
        propertyMemoryCache.set(id, parsed);
        return parsed;
      }
    } catch {}
  }
  return null;
}

export function evictCachedProperty(id: string): void {
  if (!id) return;
  propertyMemoryCache.delete(id);
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(`dary_prop_${id}`);
    } catch {}
  }
}

const DELETED_PROPERTIES_KEY = 'dary_deleted_property_ids';

export function getDeletedPropertyIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DELETED_PROPERTIES_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

export function markPropertyDeletedLocally(id: string): void {
  if (!id || typeof window === 'undefined') return;
  try {
    const set = getDeletedPropertyIds();
    set.add(String(id));
    localStorage.setItem(DELETED_PROPERTIES_KEY, JSON.stringify(Array.from(set).slice(-300)));
  } catch {}
}

export function isPropertyDeletedOrArchived(raw: any): boolean {
  if (!raw) return true;
  const id = String(raw.id || raw._id || raw.propertyId || '');
  if (id && getDeletedPropertyIds().has(id)) return true;
  const st = String(raw.status || '').toUpperCase();
  if (st === 'ARCHIVED' || st === 'DELETED') return true;
  if (raw.isDeleted === true || raw.deleted === true || Boolean(raw.deletedAt || raw.deleted_at)) return true;
  return false;
}

export function normalizeProperty(raw: any): Property {
  const id = String(raw.id || raw._id || raw.propertyId || '');

  const title =
    typeof raw.title === 'object' && raw.title !== null
      ? { ar: raw.title.ar || raw.title.en || '', en: raw.title.en || raw.title.ar || '' }
      : { ar: String(raw.title || ''), en: String(raw.title || '') };

  const rawGovernorate = raw.governorate || '';
  const rawCity = raw.city || '';
  const rawDistrict = raw.district || '';
  const rawAddress = raw.address || '';
  const rawNearestUniv = raw.nearestUniversity || '';
  const rawDistToUniv =
    raw.distanceToUniversity !== undefined && raw.distanceToUniversity !== ''
      ? Number(raw.distanceToUniversity)
      : undefined;

  const initialLocationContext = {
    id,
    address: rawAddress,
    district: rawDistrict,
    city: rawCity,
    governorate: rawGovernorate,
    nearestUniversity: rawNearestUniv,
    title,
  };

  // Detect if title/address specifies a specific city (e.g. "سكن طلابي ف طنطا") that contradicts placeholder governorate/city ("الجيزه")
  const matchedLoc = matchKnownEgyptLocation(initialLocationContext);
  const hasGovContradiction =
    matchedLoc &&
    !matchedLoc.isGenericFallback &&
    matchedLoc.governorateAr &&
    rawGovernorate &&
    normalizeArabicForSearch(rawGovernorate) !== normalizeArabicForSearch(matchedLoc.governorateAr);

  const governorate = hasGovContradiction
    ? matchedLoc!.governorateAr || rawGovernorate
    : rawGovernorate || matchedLoc?.governorateAr || '';
  const city = hasGovContradiction
    ? matchedLoc!.cityAr || rawCity
    : rawCity || matchedLoc?.cityAr || '';
  const isVagueDistrict =
    !rawDistrict ||
    normalizeArabicForSearch(rawDistrict) === 'شارع مصر' ||
    /^(?:شارع|ش)\s*[0-9٠-٩]{1,2}$/.test(normalizeArabicForSearch(rawDistrict));
  const district = !isVagueDistrict && !hasGovContradiction
    ? rawDistrict
    : matchedLoc?.districtAr || '';

  let locAr = '';
  let locEn = '';
  if (typeof raw.location === 'object' && raw.location !== null && !hasGovContradiction && !isVagueDistrict) {
    locAr = raw.location.ar || (typeof raw.location.city === 'object' ? raw.location.city.ar : raw.location.city) || '';
    locEn = raw.location.en || (typeof raw.location.city === 'object' ? raw.location.city.en : raw.location.city) || '';
  } else {
    const locParts = [district, city, governorate].filter((val, idx, arr) => Boolean(val) && arr.indexOf(val) === idx);
    locAr = locParts.join('، ') || String(raw.location || '');
    locEn = locParts.join(', ') || String(raw.location || '');
  }

  const locationContext = {
    id,
    address: rawAddress,
    district,
    city,
    governorate,
    nearestUniversity: rawNearestUniv,
    location: { ar: locAr, en: locEn },
    title,
  };

  // Validate explicit coordinates against the property's actual city/governorate/university
  const rawLat =
    raw.latitude !== undefined && raw.latitude !== null && raw.latitude !== ''
      ? Number(raw.latitude)
      : raw.lat !== undefined && raw.lat !== null && raw.lat !== ''
      ? Number(raw.lat)
      : undefined;
  const rawLng =
    raw.longitude !== undefined && raw.longitude !== null && raw.longitude !== ''
      ? Number(raw.longitude)
      : raw.lng !== undefined && raw.lng !== null && raw.lng !== ''
      ? Number(raw.lng)
      : undefined;

  const hasValidExplicitCoords = isCoordinateValidForContext(rawLat, rawLng, locationContext);
  const resolvedCoords = resolveCoordinates({
    ...locationContext,
    latitude: hasValidExplicitCoords ? rawLat : undefined,
    longitude: hasValidExplicitCoords ? rawLng : undefined,
  });

  const latitude = hasValidExplicitCoords ? rawLat : resolvedCoords.latitude;
  const longitude = hasValidExplicitCoords ? rawLng : resolvedCoords.longitude;

  const normalizedUniv = normalizeUniversityName(rawNearestUniv, latitude, longitude, 'ar');
  const nearestUniversity = normalizedUniv.name || rawNearestUniv;
  const distanceToUniversity =
    hasGovContradiction && normalizedUniv.distanceKm !== undefined
      ? normalizedUniv.distanceKm
      : rawDistToUniv ?? normalizedUniv.distanceKm;

  // Clean up address if rawAddress is random placeholder text (e.g., "شارع 2", "شارع مصر", "تارا رات")
  const address = isMeaningfulStreetAddress(rawAddress, locationContext)
    ? rawAddress
    : formatCleanAddress(
        { ...locationContext, nearestUniversity },
        null,
        'ar'
      );

  const rawType = raw.propertyType || raw.type || '';
  const typeMap: Record<string, { ar: string; en: string }> = {
    apartment: { ar: 'شقة', en: 'Apartment' },
    shared_apartment: { ar: 'شقة مشتركة', en: 'Shared Apartment' },
    studio: { ar: 'استوديو', en: 'Studio' },
    room: { ar: 'غرفة', en: 'Room' },
    private_room: { ar: 'غرفة خاصة', en: 'Private Room' },
    shared_room: { ar: 'غرفة مشتركة', en: 'Shared Room' },
    entire_apartment: { ar: 'شقة كاملة', en: 'Entire Apartment' },
    dormitory: { ar: 'سكن طلابي', en: 'Dormitory' },
    villa: { ar: 'فيلا', en: 'Villa' },
  };
  const typeKey = String(rawType).toLowerCase();
  const type =
    typeof raw.type === 'object' && raw.type !== null
      ? { ar: raw.type.ar || '', en: raw.type.en || '' }
      : typeMap[typeKey] || { ar: String(rawType || 'سكن طلابي'), en: String(rawType || 'Student Housing') };

  const price = Number(raw.price || raw.startingPrice || raw.starting_price || 0);
  const currency = String(raw.currency || 'EGP');

  // Rooms parsing (handle integer room count vs relation array)
  let rooms_: any[] =
    raw.rooms_ ||
    raw.propertyRooms ||
    (Array.isArray(raw.rooms) ? raw.rooms : []) ||
    raw.roomsConfig ||
    [];
  if (typeof rooms_ === 'string') {
    try {
      rooms_ = JSON.parse(rooms_);
    } catch {
      rooms_ = [];
    }
  }
  if (!Array.isArray(rooms_)) rooms_ = [];

  const bedrooms = Number(
    raw.bedrooms ||
    (typeof raw.rooms === 'number' ? raw.rooms : 0) ||
    (rooms_.length > 0 ? rooms_.length : 1)
  );
  const bathrooms = Number(raw.bathrooms || 1);

  // Amenities parsing (safely convert objects to strings if needed)
  let amenities: string[] = [];
  if (Array.isArray(raw.amenities)) {
    amenities = raw.amenities.map((a: any) =>
      typeof a === 'object' && a !== null ? (a.name || a.title || a.label || JSON.stringify(a)) : String(a)
    );
  } else if (typeof raw.amenities === 'string') {
    try {
      const parsed = JSON.parse(raw.amenities);
      if (Array.isArray(parsed)) {
        amenities = parsed.map((a: any) =>
          typeof a === 'object' && a !== null ? (a.name || a.title || a.label || JSON.stringify(a)) : String(a)
        );
      } else {
        amenities = raw.amenities.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    } catch {
      amenities = raw.amenities.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
  }

  // Collect all images across all possible backend payload properties
  const collectedImages: Array<{ url: string; category?: string; isPrimary?: boolean }> = [];
  const seenUrls = new Set<string>();

  const addImageUrl = (urlOrObj: any, defaultCategory = 'general') => {
    if (!urlOrObj) return;
    const url = typeof urlOrObj === 'string' ? urlOrObj : (urlOrObj?.url || urlOrObj?.imageUrl || urlOrObj?.photoUrl || urlOrObj?.path);
    if (!url || typeof url !== 'string' || url.startsWith('file://')) return;
    if (seenUrls.has(url)) return;
    seenUrls.add(url);
    collectedImages.push({
      url,
      category: typeof urlOrObj === 'object' && urlOrObj.category ? urlOrObj.category : defaultCategory,
      isPrimary: typeof urlOrObj === 'object' ? Boolean(urlOrObj.isPrimary) : false,
    });
  };

  if (raw.image && typeof raw.image === 'string') {
    addImageUrl(raw.image, 'general');
  }
  if (Array.isArray(raw.images)) {
    raw.images.forEach((img: any) => addImageUrl(img, 'general'));
  }
  if (Array.isArray(raw.propertyImages)) {
    raw.propertyImages.forEach((img: any) => addImageUrl(img, 'general'));
  }
  if (Array.isArray(raw.photos)) {
    raw.photos.forEach((img: any) => addImageUrl(img, 'general'));
  }
  if (Array.isArray(raw.imageUrls)) {
    raw.imageUrls.forEach((img: any) => addImageUrl(img, 'general'));
  }
  if (Array.isArray(raw.roomPhotos)) {
    raw.roomPhotos.forEach((img: any) => addImageUrl(img, 'room'));
  }
  if (Array.isArray(raw.kitchenPhotos)) {
    raw.kitchenPhotos.forEach((img: any) => addImageUrl(img, 'kitchen'));
  }
  if (Array.isArray(raw.bathroomPhotos)) {
    raw.bathroomPhotos.forEach((img: any) => addImageUrl(img, 'bathroom'));
  }
  if (Array.isArray(raw.livingRoomPhotos)) {
    raw.livingRoomPhotos.forEach((img: any) => addImageUrl(img, 'livingRoom'));
  }
  rooms_.forEach((r: any) => {
    if (r?.photoUrl) addImageUrl(r.photoUrl, 'room');
  });

  // Assign primary image
  let image = '';
  if (raw.image && typeof raw.image === 'string' && !raw.image.startsWith('file://')) {
    image = raw.image;
  } else if (collectedImages.length > 0) {
    const primary = collectedImages.find((img) => img.isPrimary) || collectedImages[0];
    image = primary.url;
  }
  if (!image || image.startsWith('file://')) {
    image = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&q=80&w=600&h=400&fit=crop';
    if (collectedImages.length === 0) {
      collectedImages.push({ url: image, isPrimary: true, category: 'general' });
    }
  }

  // Normalize rooms items
  const normalizedRooms = rooms_.map((r: any, idx: number) => {
    const totalBeds = Number(r.totalBeds || r.total_beds || 1);
    const rawAvail =
      r.availableBeds !== undefined && r.availableBeds !== null
        ? r.availableBeds
        : r.available_beds !== undefined && r.available_beds !== null
        ? r.available_beds
        : r.remainingBeds !== undefined && r.remainingBeds !== null
        ? r.remainingBeds
        : undefined;
    const availableBeds = rawAvail !== undefined ? Number(rawAvail) : totalBeds;
    const status = availableBeds <= 0 ? 'FULL' : (r.status || 'AVAILABLE');
    const roomBookings =
      Array.isArray(r.bookings) && r.bookings.length > 0
        ? r.bookings
        : Array.isArray(r.rentals) && r.rentals.length > 0
        ? r.rentals
        : Array.isArray(raw.bookings)
        ? raw.bookings.filter((b: any) => String(b.roomId || b.room_id || '') === String(r.id || r._id || ''))
        : Array.isArray(raw.rentals)
        ? raw.rentals.filter((b: any) => String(b.roomId || b.room_id || '') === String(r.id || r._id || ''))
        : [];

    let occupiedUntil = r.occupiedUntil || r.occupied_until || r.endDate || r.end_date || undefined;
    if (!occupiedUntil && roomBookings.length > 0) {
      const activeBk = roomBookings.filter((b: any) => {
        const end = b.endDate || b.end_date;
        return end && new Date(end).getTime() > Date.now();
      });
      if (activeBk.length > 0) {
        const sorted = [...activeBk].sort(
          (a: any, b: any) => new Date(b.endDate || b.end_date).getTime() - new Date(a.endDate || a.end_date).getTime()
        );
        occupiedUntil = sorted[0].endDate || sorted[0].end_date;
      }
    }
    if (!occupiedUntil && (raw.occupiedUntil || raw.occupied_until || raw.endDate || raw.end_date || raw.availableTo || raw.available_to)) {
      occupiedUntil = raw.occupiedUntil || raw.occupied_until || raw.endDate || raw.end_date || raw.availableTo || raw.available_to;
    }

    const availableFrom = r.availableFrom || r.available_from || r.startDate || r.start_date || raw.availableFrom || raw.available_from || undefined;
    return {
      ...r,
      id: String(r.id || r._id || `room-${idx + 1}`),
      roomType: r.roomType || r.room_type || 'SINGLE',
      pricePerBed: Number(r.pricePerBed || r.price_per_bed || raw.price || 0),
      totalBeds,
      availableBeds: Math.max(0, availableBeds),
      photoUrl: r.photoUrl || r.photo_url || (Array.isArray(raw.roomPhotos) ? raw.roomPhotos[idx] : undefined),
      status,
      occupiedUntil,
      availableFrom,
      startDate: r.startDate || r.start_date || availableFrom,
      endDate: r.endDate || r.end_date || occupiedUntil,
      bookings: roomBookings,
    };
  });

  const isFurnished = raw.isFurnished !== undefined ? Boolean(raw.isFurnished) : true;
  const electricityIncluded = Boolean(raw.electricityIncluded);
  const waterIncluded = Boolean(raw.waterIncluded);
  const internetIncluded = raw.internetIncluded !== undefined ? Boolean(raw.internetIncluded) : true;
  const propertyClass = raw.propertyClass || 'STANDARD';
  const targetTenantType = raw.targetTenantType || 'STUDENT';
  const genderAllowed = raw.genderAllowed || 'any';
  const deposit = raw.deposit !== undefined ? Number(raw.deposit) : (raw.securityDeposit !== undefined ? Number(raw.securityDeposit) : undefined);
  const floor = raw.floor !== undefined ? raw.floor : (raw.floorNumber !== undefined ? raw.floorNumber : undefined);
  const area = raw.area !== undefined ? Number(raw.area) : (raw.squareMeters !== undefined ? Number(raw.squareMeters) : undefined);
  const rules = raw.rules || raw.houseRules || undefined;

  const normalized: Property = {
    ...raw,
    id,
    title,
    location: { ar: locAr || 'غير محدد', en: locEn || 'Unspecified' },
    type,
    price,
    currency,
    bedrooms,
    bathrooms,
    image,
    images: collectedImages,
    description: raw.description || '',
    amenities,
    rooms_: normalizedRooms,
    governorate,
    city,
    district,
    address,
    latitude,
    longitude,
    nearestUniversity,
    distanceToUniversity,
    isFurnished,
    electricityIncluded,
    waterIncluded,
    internetIncluded,
    propertyClass,
    targetTenantType,
    genderAllowed,
    deposit,
    floor,
    area,
    rules,
    bookings: Array.isArray(raw.bookings)
      ? raw.bookings
      : Array.isArray(raw.rentals)
      ? raw.rentals
      : Array.isArray(raw.propertyBookings)
      ? raw.propertyBookings
      : [],
    occupiedUntil: raw.occupiedUntil || raw.occupied_until || raw.endDate || raw.end_date || undefined,
    availableFrom: raw.availableFrom || raw.available_from || raw.startDate || raw.start_date || undefined,
    startDate: raw.startDate || raw.start_date || raw.availableFrom || undefined,
    endDate: raw.endDate || raw.end_date || raw.occupiedUntil || undefined,
    rejectionReason: raw.rejectionReason || raw.rejection_reason || undefined,
    ownerId: raw.ownerId || raw.userId || (typeof raw.owner === 'string' ? raw.owner : null) || (typeof raw.owner === 'object' ? raw.owner?.id : undefined),
    owner:
      typeof raw.owner === 'object' && raw.owner !== null
        ? raw.owner
        : typeof raw.user === 'object' && raw.user !== null
        ? raw.user
        : typeof raw.host === 'object' && raw.host !== null
        ? raw.host
        : typeof raw.landlord === 'object' && raw.landlord !== null
        ? raw.landlord
        : raw.ownerId || raw.userId
        ? { id: raw.ownerId || raw.userId }
        : null,
    rating: Number(raw.rating || raw.averageRating || 4.8),
    reviewCount: Number(raw.reviewCount || raw.reviewsCount || 0),
    featured: Boolean(raw.featured || raw.isFeatured),
    billsIncluded: Boolean(raw.billsIncluded || electricityIncluded || waterIncluded),
    verified: Boolean(raw.isVerified || raw.verified),
    createdAt: raw.createdAt || new Date().toISOString(),
  };

  cacheProperty(normalized);
  return normalized;
}

// Bilingual & regional synonym groups for accurate location filtering across Egypt
const LOCATION_SYNONYMS: Record<string, string[]> = {
  cairo: ['القاهرة', 'القاهره', 'cairo', 'مدينة نصر', 'مدينه نصر', 'nasr city', 'المعادي', 'maadi', 'العباسية', 'عباسيه', 'عين شمس', 'ain shams', 'مصر الجديدة', 'مصر الجديده', 'heliopolis', 'شبرا', 'وسط البلد', 'التجمع', 'القاهرة الجديدة', 'القاهره الجديده', 'new cairo', 'الرحاب', 'مدينتي', 'حلوان', 'helwan', 'المقطم', 'الزمالك', 'جاردن سيتي', 'المرج', 'الزيتون', 'حدائق القبة'],
  new_cairo: ['القاهرة الجديدة', 'القاهره الجديده', 'التجمع', 'التجمع الخامس', 'التجمع الاول', 'التجمع الثالث', 'new cairo', 'الرحاب', 'مدينتي', 'الجامعة الأمريكية', 'الجامعه الامريكيه', 'auc', 'الجامعة الألمانية', 'guc', 'جامعة المستقبل', 'fue'],
  nasr_city: ['مدينة نصر', 'مدينه نصر', 'nasr city', 'جامعة الأزهر', 'جامعه الازهر', 'الحي السابع', 'الحي العاشر', 'مكرم عبيد', 'عباس العقاد', 'مصطفى النحاس', 'رابعة'],
  giza: ['الجيزة', 'الجيزه', 'giza', 'الدقي', 'dokki', 'المهندسين', 'mohandessin', 'العجوزة', 'الهرم', 'فيصل', 'بين السرايات', 'جامعة القاهرة', 'جامعه القاهره', 'cairo university', 'إمبابة', 'امبابه', 'بولاق الدكرور', 'حدائق الأهرام'],
  october: ['6 أكتوبر', '6 اكتوبر', 'السادس من أكتوبر', 'السادس من اكتوبر', 'october', '6th of october', 'الشيخ زايد', 'sheikh zayed', 'جامعة 6 أكتوبر', 'msa', 'must', 'جامعة مصر للعلوم والتكنولوجيا', 'الحصري', 'الحي المتميز'],
  mansoura: ['المنصورة', 'المنصوره', 'mansoura', 'الدقهلية', 'الدقهليه', 'dakahlia', 'جامعة المنصورة', 'جامعه المنصوره', 'طلخا', 'حي الجامعة', 'حي الجامعه', 'المشاية', 'الجلاء', 'توريل', 'سندوب', 'ميت غمر', 'السنبلاوين', 'دكرنس', 'بلقاس', 'شربين', 'أجا', 'ديرب'],
  dakahlia: ['الدقهلية', 'الدقهليه', 'dakahlia', 'المنصورة', 'المنصوره', 'mansoura', 'طلخا', 'ميت غمر', 'السنبلاوين', 'دكرنس', 'بلقاس', 'شربين', 'منية النصر', 'كفر ديرب', 'ديرب بقطارس'],
  alexandria: ['الإسكندرية', 'الاسكندريه', 'الاسكندرية', 'إسكندرية', 'اسكندريه', 'alexandria', 'alex', 'جامعة الإسكندرية', 'جامعه الاسكندريه', 'سموحة', 'سموحه', 'الشاطبي', 'سبورتنج', 'سيدي جابر', 'سيدي بشر', 'ميامي', 'المنتزه', 'لوران', 'محطة الرمل', 'العجمي', 'برج العرب'],
  tanta: ['طنطا', 'tanta', 'الغربية', 'الغربيه', 'gharbia', 'جامعة طنطا', 'جامعه طنطا', 'سبرباي', 'مجمع الكليات', 'المحلة', 'المحله', 'المحلة الكبرى', 'كفر الزيات', 'زفتى', 'السنطة', 'قطور', 'بسيون', 'سمنود'],
  gharbia: ['الغربية', 'الغربيه', 'gharbia', 'طنطا', 'tanta', 'المحلة', 'المحله', 'كفر الزيات', 'زفتى', 'السنطة', 'قطور', 'بسيون', 'سمنود'],
  zagazig: ['الزقازيق', 'zagazig', 'الشرقية', 'الشرقيه', 'sharqia', 'جامعة الزقازيق', 'جامعه الزقازيق', 'القومية', 'حي الزهور', 'العاشر من رمضان', 'بلبيس', 'منيا القمح', 'فاقوس', 'ديرب نجم'],
  assiut: ['أسيوط', 'اسيوط', 'assiut', 'asyut', 'جامعة أسيوط', 'جامعه اسيوط', 'الوليدية', 'فريال', 'الجمهورية', 'أسيوط الجديدة'],
  kafr_el_sheikh: ['كفر الشيخ', 'كفرالشيخ', 'kafr el sheikh', 'جامعة كفر الشيخ', 'جامعه كفر الشيخ', 'دسوق', 'بيلا', 'الحامول', 'فوه', 'مطوبس'],
  benha: ['بنها', 'benha', 'banha', 'القليوبية', 'القليوبيه', 'qalyubia', 'جامعة بنها', 'جامعه بنها', 'شبرا الخيمة', 'العبور', 'قليوب', 'طوخ', 'القناطر'],
  menoufia: ['المنوفية', 'المنوفيه', 'menoufia', 'شبين الكوم', 'shebin el kom', 'جامعة المنوفية', 'جامعه المنوفيه', 'منوف', 'السادات', 'مدينة السادات', 'أشمون', 'قويسنا', 'الباجور', 'بركة السبع'],
  damietta: ['دمياط', 'damietta', 'دمياط الجديدة', 'دمياط الجديده', 'جامعة دمياط', 'جامعه دمياط', 'رأس البر', 'فارسكور', 'كفر سعد'],
  ismailia: ['الإسماعيلية', 'الاسماعيليه', 'الاسماعيلية', 'ismailia', 'جامعة قناة السويس', 'جامعه قناه السويس', 'الشيخ زايد بالإسماعيلية'],
  suez: ['السويس', 'suez', 'جامعة السويس', 'جامعه السويس', 'بورفؤاد', 'بورسعيد', 'port said', 'جامعة بورسعيد'],
  fayoum: ['الفيوم', 'fayoum', 'faiyum', 'جامعة الفيوم', 'جامعه الفيوم', 'بني سويف', 'beni suef', 'جامعة بني سويف'],
  minya: ['المنيا', 'minya', 'جامعة المنيا', 'جامعه المنيا', 'المنيا الجديدة'],
  sohag: ['سوهاج', 'sohag', 'جامعة سوهاج', 'جامعه سوهاج', 'قنا', 'qena', 'جامعة جنوب الوادي', 'الأقصر', 'الاقصر', 'luxor', 'أسوان', 'اسوان', 'aswan', 'جامعة أسوان'],
};

const SEARCH_SYNONYM_GROUPS: string[][] = [
  ['شباب', 'ذكور', 'ولاد', 'طلاب', 'اولاد', 'male', 'boys', 'men', 'male_only'],
  ['بنات', 'إناث', 'اناث', 'طالبات', 'فتيات', 'female', 'girls', 'women', 'female_only'],
  ['شقة مشتركة', 'شقه مشتركه', 'shared apartment', 'shared_apartment'],
  ['غرفة خاصة', 'غرفه خاصه', 'غرفة فردية', 'غرفه فرديه', 'private room', 'private_room', 'single'],
  ['غرفة مشتركة', 'غرفه مشتركه', 'غرفة ثنائية', 'غرفه ثنائيه', 'shared room', 'shared_room', 'double'],
  ['استوديو', 'ستوديو', 'studio'],
  ['شقة كاملة', 'شقه كامله', 'entire apartment', 'entire_apartment'],
  ['فاخر', 'لوكس', 'سوبر لوكس', 'مميز', 'luxury', 'vip'],
  ['قياسي', 'اقتصادي', 'عادي', 'standard'],
  ['واي فاي', 'انترنت', 'نت', 'wifi', 'wi-fi', 'internet'],
  ['تكييف', 'مكيف', 'ac', 'air conditioning'],
  ['مفروش', 'مفروشة', 'مفروشه', 'furnished'],
  ['جامعة', 'جامعه', 'كلية', 'كليه', 'university', 'college', 'campus'],
];

function buildNormalizedPropertySearchBlob(prop: Property): string {
  const titleAr = typeof prop.title === 'object' ? prop.title.ar : String(prop.title || '');
  const titleEn = typeof prop.title === 'object' ? prop.title.en : String(prop.title || '');
  const locAr = typeof prop.location === 'object' ? prop.location.ar : String(prop.location || '');
  const locEn = typeof prop.location === 'object' ? prop.location.en : String(prop.location || '');
  const typeAr = typeof prop.type === 'object' ? prop.type.ar : String(prop.type || '');
  const typeEn = typeof prop.type === 'object' ? prop.type.en : String(prop.type || '');
  const amenitiesStr = Array.isArray(prop.amenities) ? prop.amenities.join(' ') : '';
  const roomsStr = Array.isArray(prop.rooms_)
    ? prop.rooms_.map((r) => `${r.roomType || ''} ${r.pricePerBed || ''}`).join(' ')
    : '';
  const genderStr =
    String(prop.genderAllowed || '').toLowerCase().includes('female')
      ? 'بنات طالبات اناث female girls'
      : String(prop.genderAllowed || '').toLowerCase().includes('male')
      ? 'شباب طلاب ذكور ولاد male boys'
      : 'شباب وبنات';
  const classStr =
    String(prop.propertyClass || '').toUpperCase() === 'LUXURY'
      ? 'فاخر مميز لوكس luxury'
      : 'قياسي اقتصادي standard';

  const rawBlob = [
    titleAr,
    titleEn,
    prop.description || '',
    prop.governorate || '',
    prop.city || '',
    prop.district || '',
    prop.address || '',
    locAr,
    locEn,
    prop.nearestUniversity || '',
    typeAr,
    typeEn,
     (prop as any).propertyType || '',
    amenitiesStr,
    roomsStr,
    genderStr,
    classStr,
  ].join(' ');

  return normalizeArabicForSearch(rawBlob);
}

export function matchesPropertyFilters(prop: Property, filters: PropertyFilterParams = {}): boolean {
  if (!prop) return false;

  // 1. Location / City / Governorate filter
  if (filters.city && filters.city.trim() !== '' && filters.city !== 'all') {
    const rawCityFilter = filters.city.trim();
    const normFilter = normalizeArabicForSearch(rawCityFilter);
    const propLocBlob = normalizeArabicForSearch(
      [
        prop.city || '',
        prop.governorate || '',
        prop.district || '',
        prop.address || '',
        typeof prop.location === 'object' ? `${prop.location.ar} ${prop.location.en}` : String(prop.location || ''),
        prop.nearestUniversity || '',
        typeof prop.title === 'object' ? `${prop.title.ar} ${prop.title.en}` : String(prop.title || ''),
      ].join(' ')
    );

    const synonyms = LOCATION_SYNONYMS[rawCityFilter.toLowerCase()];
    if (synonyms && synonyms.length > 0) {
      const matched = synonyms.some((syn) => {
        const normSyn = normalizeArabicForSearch(syn);
        return normSyn.length > 0 && propLocBlob.includes(normSyn);
      });
      if (!matched) return false;
    } else {
      // Dynamic city/governorate value selected from dropdown or URL
      let matched = propLocBlob.includes(normFilter);
      if (!matched) {
        // Also check if any LOCATION_SYNONYMS group contains both the filter and the property location
        for (const group of Object.values(LOCATION_SYNONYMS)) {
          const normGroup = group.map(normalizeArabicForSearch);
          if (normGroup.some((g) => g === normFilter || (normFilter.length >= 3 && g.includes(normFilter)))) {
            if (normGroup.some((g) => g.length >= 3 && propLocBlob.includes(g))) {
              matched = true;
              break;
            }
          }
        }
      }
      if (!matched) return false;
    }
  }

  // 2. Nearest University filter
  if (filters.university && filters.university.trim() !== '') {
    const normUnivFilter = normalizeArabicForSearch(filters.university.trim());
    const propUnivBlob = normalizeArabicForSearch(
      [
        prop.nearestUniversity || '',
        prop.city || '',
        prop.governorate || '',
        prop.district || '',
        typeof prop.title === 'object' ? prop.title.ar : String(prop.title || ''),
      ].join(' ')
    );
    // Strip generic word "جامعه" to compare core university name accurately
    const coreFilter = normUnivFilter.replace(/^جامعه\s+/, '').trim();
    if (!propUnivBlob.includes(normUnivFilter) && (!coreFilter || !propUnivBlob.includes(coreFilter))) {
      return false;
    }
  }

  // 3. Property Type filter (shared_apartment, private_room, shared_room, studio, entire_apartment)
  if (filters.propertyType && filters.propertyType.trim() !== '') {
    const filterTypes = filters.propertyType
      .toLowerCase()
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const propRawType = String((prop as any).propertyType || '').toLowerCase();
    const typeEn = (typeof prop.type === 'object' ? prop.type.en : String(prop.type || '')).toLowerCase();
    const typeAr = normalizeArabicForSearch(typeof prop.type === 'object' ? prop.type.ar : String(prop.type || ''));

    const typeMatched = filterTypes.some((ft) => {
      if (propRawType === ft || propRawType.replace(/\s+/g, '_') === ft) return true;
      if (ft === 'shared_apartment' && (typeEn.includes('shared apartment') || typeAr.includes('شقه مشتركه'))) return true;
      if (ft === 'private_room' && (typeEn.includes('private room') || typeAr.includes('غرفه خاصه'))) return true;
      if (ft === 'shared_room' && (typeEn.includes('shared room') || typeAr.includes('غرفه مشتركه'))) return true;
      if (ft === 'studio' && (typeEn.includes('studio') || typeAr.includes('استوديو'))) return true;
      if (ft === 'entire_apartment' && (typeEn.includes('entire apartment') || typeAr.includes('شقه كامله'))) return true;
      return false;
    });
    if (!typeMatched) return false;
  }

  // 4. Room Type filter (SINGLE, DOUBLE, TRIPLE, QUAD)
  if (filters.roomType && filters.roomType.trim() !== '') {
    const wantedRoomTypes = filters.roomType
      .toUpperCase()
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const roomsList = Array.isArray(prop.rooms_) ? prop.rooms_ : [];
    if (roomsList.length > 0) {
      const hasMatchingRoom = roomsList.some((r) =>
        wantedRoomTypes.includes(String(r.roomType || '').toUpperCase())
      );
      if (!hasMatchingRoom) return false;
    } else {
      // Fallback if rooms_ array wasn't attached
      const propRawType = String((prop as any).propertyType || '').toLowerCase();
      if (wantedRoomTypes.includes('SINGLE') && propRawType !== 'private_room' && propRawType !== 'studio') {
        return false;
      }
      if (!wantedRoomTypes.includes('SINGLE') && (propRawType === 'private_room' || propRawType === 'studio')) {
        return false;
      }
    }
  }

  // 5. Gender Allowed filter (male_only, female_only)
  if (filters.genderAllowed && filters.genderAllowed.trim() !== '' && filters.genderAllowed !== 'any') {
    const wantedGender = filters.genderAllowed.toLowerCase().trim();
    const propGender = String(prop.genderAllowed || 'any').toLowerCase().trim();
    if (wantedGender.includes('female') || wantedGender === 'بنات') {
      if (!propGender.includes('female') && propGender !== 'any') return false;
      if (propGender === 'male' || propGender === 'male_only') return false;
    } else if (wantedGender.includes('male') || wantedGender === 'شباب') {
      if (propGender.includes('female')) return false;
    }
  }

  // 6. Property Class filter (STANDARD, LUXURY)
  if (filters.propertyClass && filters.propertyClass.trim() !== '') {
    const wantedClass = filters.propertyClass.toUpperCase().trim();
    const propClass = String(prop.propertyClass || 'STANDARD').toUpperCase().trim();
    if (wantedClass !== propClass) return false;
  }

  // 7. Target Tenant Type filter (STUDENT, GENERAL, ANY)
  if (filters.targetTenantType && filters.targetTenantType.trim() !== '' && filters.targetTenantType.toUpperCase() !== 'ANY') {
    const wantedTenant = filters.targetTenantType.toUpperCase().trim();
    const propTenant = String(prop.targetTenantType || 'STUDENT').toUpperCase().trim();
    if (propTenant !== 'ANY' && propTenant !== wantedTenant) return false;
  }

  // 8. Bedrooms / Rooms Count filter
  const targetRooms = filters.rooms ?? filters.bedrooms;
  if (targetRooms !== undefined && targetRooms !== null && !Number.isNaN(Number(targetRooms)) && Number(targetRooms) > 0) {
    const wantedCount = Number(targetRooms);
    const actualRoomsCount =
      Number(prop.bedrooms) ||
      Number((prop as any).rooms) ||
      (Array.isArray(prop.rooms_) && prop.rooms_.length > 0 ? prop.rooms_.length : 1);

    if (wantedCount >= 3 && filters.bedrooms !== undefined && filters.rooms === undefined) {
      // "3+ Rooms" option
      if (actualRoomsCount < 3) return false;
    } else if (wantedCount >= 4) {
      if (actualRoomsCount < 4) return false;
    } else {
      if (actualRoomsCount !== wantedCount) return false;
    }
  }

  // 9. Price Range filter (minPrice / maxPrice)
  const hasMinPrice = filters.minPrice !== undefined && filters.minPrice !== null && !Number.isNaN(Number(filters.minPrice));
  const hasMaxPrice = filters.maxPrice !== undefined && filters.maxPrice !== null && !Number.isNaN(Number(filters.maxPrice));
  if (hasMinPrice || hasMaxPrice) {
    const minP = hasMinPrice ? Number(filters.minPrice) : 0;
    const maxP = hasMaxPrice ? Number(filters.maxPrice) : Infinity;
    const basePrice = Number(prop.price || (prop as any).startingPrice || 0);
    const roomPrices = Array.isArray(prop.rooms_)
      ? prop.rooms_.map((r) => Number(r.pricePerBed || 0)).filter((p) => p > 0)
      : [];
    const allPrices = [basePrice, ...roomPrices].filter((p) => p > 0);

    if (allPrices.length === 0) {
      return false;
    }
    const matchesAnyPrice = allPrices.some((p) => p >= minP && p <= maxP);
    if (!matchesAnyPrice) return false;
  }

  // 10. Available Only (has vacant beds right now)
  if (filters.availableOnly === true) {
    if ((prop as any).isAvailable === false) return false;
    const roomsList = Array.isArray(prop.rooms_) ? prop.rooms_ : [];
    if (roomsList.length > 0) {
      const totalAvailableBeds = roomsList.reduce(
        (sum, r) => sum + (String(r.status || '').toUpperCase() === 'FULL' ? 0 : Math.max(0, Number(r.availableBeds ?? 1))),
        0
      );
      if (totalAvailableBeds <= 0) return false;
    }
  }

  // 11. Furnished / Internet / Bills Included
  if (filters.isFurnished === true && prop.isFurnished === false) {
    return false;
  }
  if (filters.internetIncluded === true && prop.internetIncluded === false) {
    return false;
  }
  if (filters.billsIncluded === true && !prop.electricityIncluded && !prop.waterIncluded && !(prop as any).billsIncluded) {
    return false;
  }

  // 12. Max Distance to University (km)
  if (
    filters.maxDistanceToUniversity !== undefined &&
    filters.maxDistanceToUniversity !== null &&
    !Number.isNaN(Number(filters.maxDistanceToUniversity)) &&
    Number(filters.maxDistanceToUniversity) > 0
  ) {
    const maxDist = Number(filters.maxDistanceToUniversity);
    const propDist = prop.distanceToUniversity !== undefined ? Number(prop.distanceToUniversity) : undefined;
    if (propDist === undefined || Number.isNaN(propDist) || propDist > maxDist) {
      return false;
    }
  }

  // 13. Amenities filter
  if (Array.isArray(filters.amenities) && filters.amenities.length > 0) {
    const propAmenitiesNorm = normalizeArabicForSearch((prop.amenities || []).join(' '));
    for (const wantedAmenity of filters.amenities) {
      const normWanted = normalizeArabicForSearch(wantedAmenity);
      if (normWanted && !propAmenitiesNorm.includes(normWanted)) {
        return false;
      }
    }
  }

  // 14. Smart Multi-Token Bilingual Search (search)
  if (filters.search && filters.search.trim() !== '') {
    const normSearch = normalizeArabicForSearch(filters.search.trim());
    const blob = buildNormalizedPropertySearchBlob(prop);

    if (!blob.includes(normSearch)) {
      // Split into tokens and drop generic stop words so phrases like "سكن شباب في طنطا" or "شقة قريبة من جامعة المنصورة" match accurately
      const stopWords = new Set(['في', 'ف', 'من', 'الي', 'إلى', 'علي', 'على', 'عن', 'مع', 'او', 'أو', 'سكن', 'طلابي', 'عقار', 'بجوار', 'قريب', 'عند', 'in', 'near', 'at', 'for', 'housing']);
      const rawTokens = normSearch.split(/\s+/).filter(Boolean);
      const tokens = rawTokens.filter((tok) => tok.length > 1 && !stopWords.has(tok));
      const effectiveTokens = tokens.length > 0 ? tokens : rawTokens;

      for (const token of effectiveTokens) {
        if (blob.includes(token)) continue;

        // Check location synonym groups
        let matchedSynonym = false;
        for (const group of Object.values(LOCATION_SYNONYMS)) {
          const normGroup = group.map(normalizeArabicForSearch);
          if (normGroup.some((g) => g === token || (token.length >= 3 && g.includes(token)))) {
            if (normGroup.some((g) => g.length >= 3 && blob.includes(g))) {
              matchedSynonym = true;
              break;
            }
          }
        }

        // Check general housing/feature synonym groups
        if (!matchedSynonym) {
          for (const synGroup of SEARCH_SYNONYM_GROUPS) {
            const normSynGroup = synGroup.map(normalizeArabicForSearch);
            if (normSynGroup.some((g) => g === token || (token.length >= 3 && g.includes(token)))) {
              if (normSynGroup.some((g) => blob.includes(g))) {
                matchedSynonym = true;
                break;
              }
            }
          }
        }

        if (!matchedSynonym) {
          return false;
        }
      }
    }
  }

  return true;
}

export const propertyService = {
  /**
   * 1. GET /properties
   * Advanced search, filtering and pagination (fetches full public set and applies Arabic/bilingual smart filtering)
   */
  async getProperties(filters: PropertyFilterParams = {}): Promise<Property[]> {
    const fetchLimit = filters.limit ? Math.max(filters.limit, 100) : 100;
    const response = await ApiClient.get<any>(`/properties?limit=${fetchLimit}`);

    const rawList: any[] =
      (Array.isArray(response?.data?.data) ? response.data.data : null) ||
      (Array.isArray(response?.data?.properties) ? response.data.properties : null) ||
      (Array.isArray(response?.data?.items) ? response.data.items : null) ||
      (Array.isArray(response?.data) ? response.data : null) ||
      (Array.isArray(response?.properties) ? response.properties : null) ||
      (Array.isArray(response) ? response : []);

    const normalizedList = rawList
      .filter((item) => !isPropertyDeletedOrArchived(item))
      .map(normalizeProperty);

    return normalizedList.filter((prop) => matchesPropertyFilters(prop, filters));
  },

  /**
   * 1b. GET /properties with pagination metadata
   */
  async getPropertiesWithMeta(filters: PropertyFilterParams = {}): Promise<PropertyResponse> {
    const allMatching = await this.getProperties({ ...filters, limit: 100 });
    const page = Math.max(1, Number(filters.page || 1));
    const limit = Math.max(1, Number(filters.limit || 12));
    const total = allMatching.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;

    return {
      properties: allMatching.slice(start, start + limit),
      total,
      page,
      totalPages,
    };
  },

  /**
   * 2. GET /properties (Featured Properties)
   */
  async getFeaturedProperties(limit = 6): Promise<Property[]> {
    const response = await ApiClient.get<any>(`/properties?limit=${limit}`);
    const rawList: any[] =
      (Array.isArray(response?.data?.data) ? response.data.data : null) ||
      (Array.isArray(response?.data?.properties) ? response.data.properties : null) ||
      (Array.isArray(response?.data?.items) ? response.data.items : null) ||
      (Array.isArray(response?.data) ? response.data : null) ||
      (Array.isArray(response?.properties) ? response.properties : null) ||
      (Array.isArray(response) ? response : []);
    return rawList.filter((item) => !isPropertyDeletedOrArchived(item)).map(normalizeProperty);
  },

  /**
   * 3. GET /properties/:id
   * Get Property By ID
   */
  async getPropertyById(id: string): Promise<Property | null> {
    try {
      const response = await ApiClient.get<any>(`/properties/${id}`);
      const raw =
        response?.data?.property ||
        response?.data?.data ||
        response?.data?.item ||
        response?.data ||
        response?.property ||
        response;
      if (!raw || (!raw.id && !raw._id && !raw.propertyId)) {
        console.warn('[getPropertyById] Received raw payload without ID:', raw);
        const cached = getCachedProperty(id);
        if (cached) return cached;
        return null;
      }
      return normalizeProperty(raw);
    } catch (err: any) {
      console.error(`[getPropertyById] Failed to fetch property id=${id}:`, err);
      const cached = getCachedProperty(id);
      if (cached) {
        console.log(`[getPropertyById] Returning cached property for id=${id}`);
        return cached;
      }
      throw err;
    }
  },

  /**
   * 4. GET /properties/my
   * Get My Properties (Owner)
   */
  async getMyProperties(): Promise<Property[]> {
    const res = await ApiClient.get<any>('/properties/my');
    const list =
      (Array.isArray(res?.data?.properties) ? res.data.properties : null) ||
      (Array.isArray(res?.data?.data) ? res.data.data : null) ||
      (Array.isArray(res?.data?.items) ? res.data.items : null) ||
      (Array.isArray(res?.data) ? res.data : null) ||
      (Array.isArray(res?.properties) ? res.properties : null) ||
      (Array.isArray(res) ? res : []);
    return list.filter((item: any) => !isPropertyDeletedOrArchived(item)).map(normalizeProperty);
  },

  /**
   * 5. PUT /properties/:id
   * Update Property
   */
  async updateProperty(id: string, payload: Record<string, any>): Promise<any> {
    const res = await ApiClient.put<any>(`/properties/${id}`, payload);
    return res?.data || res;
  },

  /**
   * 6. PATCH /properties/:id/availability
   * Toggle Availability
   */
  async toggleAvailability(id: string): Promise<any> {
    const res = await ApiClient.patch<any>(`/properties/${id}/availability`);
    return res?.data || res;
  },

  /**
   * 7. DELETE /properties/:id
   * Delete Property (retries after deleting child rooms if foreign-key constrained)
   */
  async deleteProperty(id: string, rooms?: any[]): Promise<any> {
    try {
      const res = await ApiClient.delete<any>(`/properties/${id}`);
      markPropertyDeletedLocally(id);
      evictCachedProperty(id);
      return res?.data || res;
    } catch (firstErr: any) {
      // If property has child rooms that block deletion due to foreign key constraints, remove rooms first and retry
      const cached = getCachedProperty(id);
      const roomList = Array.isArray(rooms) && rooms.length > 0
        ? rooms
        : Array.isArray(cached?.rooms_)
        ? cached!.rooms_!
        : [];

      if (roomList.length > 0) {
        try {
          await Promise.allSettled(
            roomList.map((r: any) => {
              const roomId = r?.id || r?._id;
              return roomId ? ApiClient.delete<any>(`/properties/rooms/${roomId}`) : Promise.resolve();
            })
          );
          const retryRes = await ApiClient.delete<any>(`/properties/${id}`);
          markPropertyDeletedLocally(id);
          evictCachedProperty(id);
          return retryRes?.data || retryRes;
        } catch {
          // Fall through to throw original or clear error
        }
      }
      throw firstErr;
    }
  },

  /**
   * 8. POST /properties/:propertyId/rooms
   * Add Room (multipart/form-data)
   */
  async addRoom(propertyId: string, payload: FormData | Record<string, any>): Promise<any> {
    const res = await ApiClient.post<any>(`/properties/${propertyId}/rooms`, payload);
    return res?.data || res;
  },

  /**
   * 9. PATCH /properties/rooms/:roomId
   * Update Room
   */
  async updateRoom(roomId: string, payload: Record<string, any>): Promise<any> {
    const res = await ApiClient.patch<any>(`/properties/rooms/${roomId}`, payload);
    return res?.data || res;
  },

  /**
   * 10. PATCH /properties/rooms/:roomId/photo
   * Update Room Photo (multipart/form-data)
   */
  async updateRoomPhoto(roomId: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('photo', file);
    const res = await ApiClient.patch<any>(`/properties/rooms/${roomId}/photo`, formData);
    return res?.data || res;
  },

  /**
   * 11. DELETE /properties/rooms/:roomId
   * Delete Room
   */
  async deleteRoom(roomId: string): Promise<any> {
    const res = await ApiClient.delete<any>(`/properties/rooms/${roomId}`);
    return res?.data || res;
  },

  /**
   * 12. POST /properties/:propertyId/images
   * Upload Property Images (multipart/form-data)
   */
  async uploadPropertyImages(propertyId: string, files: File[], category?: string): Promise<any> {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    if (category) {
      formData.append('category', category);
    }
    const res = await ApiClient.post<any>(`/properties/${propertyId}/images`, formData);
    return res?.data || res;
  },

  /**
   * 13. GET /properties/:propertyId/images
   * Get Property Images
   */
  async getPropertyImages(propertyId: string): Promise<any[]> {
    const res = await ApiClient.get<any>(`/properties/${propertyId}/images`);
    const list = res?.data?.images || res?.data || res?.images || res;
    return Array.isArray(list) ? list : [];
  },

  /**
   * 14. DELETE /properties/images/:imageId
   * Delete Property Image
   */
  async deletePropertyImage(imageId: string): Promise<any> {
    const res = await ApiClient.delete<any>(`/properties/images/${imageId}`);
    return res?.data || res;
  },

  /**
   * 15. PATCH /properties/images/:imageId/primary
   * Set Primary Property Image
   */
  async setPrimaryPropertyImage(imageId: string): Promise<any> {
    const res = await ApiClient.patch<any>(`/properties/images/${imageId}/primary`);
    return res?.data || res;
  },

  /**
   * 16. PATCH /properties/:propertyId/images/reorder
   * Reorder Property Images
   */
  async reorderPropertyImages(propertyId: string, imageIds: string[]): Promise<any> {
    // Send both 'order' (expected by backend reorderImagesSchema) and 'imageIds' for backwards compatibility
    const res = await ApiClient.patch<any>(`/properties/${propertyId}/images/reorder`, {
      order: imageIds,
      imageIds,
    });
    return res?.data || res;
  },

  /**
   * 17. PATCH /properties/:id/review
   * Review Property (Admin Approve/Reject)
   */
  async reviewProperty(id: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string): Promise<any> {
    const res = await ApiClient.patch<any>(`/properties/${id}/review`, { status, rejectionReason });
    return res?.data || res;
  },
};
