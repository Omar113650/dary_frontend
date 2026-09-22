export interface PropertyRoomItem {
  id?: string;
  roomType: string;
  pricePerBed: number;
  totalBeds: number;
  availableBeds: number;
  photoUrl?: string;
  status?: string;
}

export interface Property {
  id: string;
  title: {
    ar: string;
    en: string;
  };
  location: {
    ar: string;
    en: string;
  };
  type: {
    ar: string;
    en: string;
  };
  price: number;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  image: string;
  description?: string;
  amenities?: string[];
  images?: Array<{ url: string; category?: string; isPrimary?: boolean } | string>;
  rooms_?: PropertyRoomItem[];
  governorate?: string;
  city?: string;
  district?: string;
  address?: string;
  nearestUniversity?: string;
  distanceToUniversity?: number;
  isFurnished?: boolean;
  electricityIncluded?: boolean;
  waterIncluded?: boolean;
  internetIncluded?: boolean;
  propertyClass?: 'STANDARD' | 'LUXURY' | string;
  targetTenantType?: 'STUDENT' | 'GENERAL' | 'ANY' | string;
  genderAllowed?: 'male_only' | 'female_only' | 'any' | string;
  deposit?: number;
  floor?: number | string;
  area?: number;
  rules?: string[] | string;
  status?: string;
  owner?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    whatsappPhone?: string;
    phone?: string;
    email?: string;
    name?: string;
  };
  [key: string]: any;
}

export interface PropertyResponse {
  properties: Property[];
  total: number;
  page: number;
  totalPages: number;
}

export interface SearchOption {
  value: string;
  label: {
    ar: string;
    en: string;
  };
}
