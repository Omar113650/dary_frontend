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
  nearestUniversity?: string;
  distanceToUniversity?: number;
  isFurnished?: boolean;
  electricityIncluded?: boolean;
  waterIncluded?: boolean;
  internetIncluded?: boolean;
  status?: string;
  owner?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    whatsappPhone?: string;
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
