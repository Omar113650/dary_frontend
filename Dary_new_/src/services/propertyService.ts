import { ApiClient } from './apiClient';
import type { Property, PropertyResponse } from '../types/property';
export type { PropertyResponse };

export interface PropertyFilterParams {
  search?: string;
  city?: string;
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  propertyClass?: string;
  genderAllowed?: string;
  availableOnly?: boolean;
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
        const parsed = JSON.parse(stored);
        propertyMemoryCache.set(id, parsed);
        return parsed;
      }
    } catch {}
  }
  return null;
}

export function normalizeProperty(raw: any): Property {
  const id = String(raw.id || raw._id || raw.propertyId || '');

  const title =
    typeof raw.title === 'object' && raw.title !== null
      ? { ar: raw.title.ar || raw.title.en || '', en: raw.title.en || raw.title.ar || '' }
      : { ar: String(raw.title || ''), en: String(raw.title || '') };

  const governorate = raw.governorate || '';
  const city = raw.city || '';
  const district = raw.district || '';
  const address = raw.address || '';
  const nearestUniversity = raw.nearestUniversity || '';
  const distanceToUniversity =
    raw.distanceToUniversity !== undefined && raw.distanceToUniversity !== ''
      ? Number(raw.distanceToUniversity)
      : undefined;

  let locAr = '';
  let locEn = '';
  if (typeof raw.location === 'object' && raw.location !== null) {
    locAr = raw.location.ar || (typeof raw.location.city === 'object' ? raw.location.city.ar : raw.location.city) || '';
    locEn = raw.location.en || (typeof raw.location.city === 'object' ? raw.location.city.en : raw.location.city) || '';
  } else {
    const locParts = [city, district, governorate].filter((val, idx, arr) => Boolean(val) && arr.indexOf(val) === idx);
    locAr = locParts.join('، ') || String(raw.location || '');
    locEn = locParts.join(', ') || String(raw.location || '');
  }

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
    return {
      id: String(r.id || r._id || `room-${idx + 1}`),
      roomType: r.roomType || r.room_type || 'SINGLE',
      pricePerBed: Number(r.pricePerBed || r.price_per_bed || raw.price || 0),
      totalBeds,
      availableBeds: Math.max(0, availableBeds),
      photoUrl: r.photoUrl || r.photo_url || (Array.isArray(raw.roomPhotos) ? raw.roomPhotos[idx] : undefined),
      status,
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
    owner: raw.owner || null,
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

export const propertyService = {
  /**
   * 1. GET /properties
   * Advanced search, filtering and pagination
   */
  async getProperties(filters: PropertyFilterParams = {}): Promise<Property[]> {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.city) params.append('city', filters.city);
    if (filters.propertyType) params.append('propertyType', filters.propertyType);
    if (filters.minPrice) params.append('minPrice', String(filters.minPrice));
    if (filters.maxPrice) params.append('maxPrice', String(filters.maxPrice));
    if (filters.bedrooms) params.append('bedrooms', String(filters.bedrooms));
    if (filters.propertyClass) params.append('propertyClass', filters.propertyClass);
    if (filters.genderAllowed) params.append('genderAllowed', filters.genderAllowed);
    if (filters.availableOnly !== undefined) params.append('availableOnly', String(filters.availableOnly));
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));

    const queryString = params.toString();
    const endpoint = queryString ? `/properties?${queryString}` : '/properties';
    const response = await ApiClient.get<any>(endpoint);

    const rawList: any[] =
      (Array.isArray(response?.data?.data) ? response.data.data : null) ||
      (Array.isArray(response?.data?.properties) ? response.data.properties : null) ||
      (Array.isArray(response?.data?.items) ? response.data.items : null) ||
      (Array.isArray(response?.data) ? response.data : null) ||
      (Array.isArray(response?.properties) ? response.properties : null) ||
      (Array.isArray(response) ? response : []);

    return rawList.map(normalizeProperty);
  },

  /**
   * 1b. GET /properties with pagination metadata
   */
  async getPropertiesWithMeta(filters: PropertyFilterParams = {}): Promise<PropertyResponse> {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.city) params.append('city', filters.city);
    if (filters.propertyType) params.append('propertyType', filters.propertyType);
    if (filters.minPrice) params.append('minPrice', String(filters.minPrice));
    if (filters.maxPrice) params.append('maxPrice', String(filters.maxPrice));
    if (filters.bedrooms) params.append('bedrooms', String(filters.bedrooms));
    if (filters.propertyClass) params.append('propertyClass', filters.propertyClass);
    if (filters.genderAllowed) params.append('genderAllowed', filters.genderAllowed);
    if (filters.availableOnly !== undefined) params.append('availableOnly', String(filters.availableOnly));
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));

    const queryString = params.toString();
    const endpoint = queryString ? `/properties?${queryString}` : '/properties';
    const response = await ApiClient.get<any>(endpoint);

    const rawList: any[] =
      (Array.isArray(response?.data?.data) ? response.data.data : null) ||
      (Array.isArray(response?.data?.properties) ? response.data.properties : null) ||
      (Array.isArray(response?.data?.items) ? response.data.items : null) ||
      (Array.isArray(response?.data) ? response.data : null) ||
      (Array.isArray(response?.properties) ? response.properties : null) ||
      (Array.isArray(response) ? response : []);

    const meta = response?.data?.meta || response?.meta || {};

    return {
      properties: rawList.map(normalizeProperty),
      total: Number(meta.total || meta.totalCount || rawList.length),
      page: Number(meta.page || meta.currentPage || filters.page || 1),
      totalPages: Number(meta.totalPages || Math.ceil((meta.total || rawList.length) / (filters.limit || 12)) || 1),
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
    return rawList.map(normalizeProperty);
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
    return list.map(normalizeProperty);
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
   * Delete Property
   */
  async deleteProperty(id: string): Promise<any> {
    const res = await ApiClient.delete<any>(`/properties/${id}`);
    return res?.data || res;
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
  async uploadPropertyImages(propertyId: string, files: File[]): Promise<any> {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
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
    const res = await ApiClient.patch<any>(`/properties/${propertyId}/images/reorder`, { imageIds });
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
