import type { Property, SearchOption } from '../types/property';

export const featuredProperties: Property[] = [
  {
    id: '1',
    title: {
      ar: 'شقة مفروشة في دبي مارينا',
      en: 'Furnished Apartment in Dubai Marina',
    },
    location: { ar: 'دبي', en: 'Dubai' },
    type: { ar: 'شقة', en: 'Apartment' },
    price: 3500,
    currency: 'AED',
    bedrooms: 2,
    bathrooms: 1,
    image:
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&q=80&w=600&h=400&fit=crop',
  },
  {
    id: '2',
    title: {
      ar: 'استوديو حديث في الشارقة',
      en: 'Modern Studio in Sharjah',
    },
    location: { ar: 'الشارقة', en: 'Sharjah' },
    type: { ar: 'استوديو', en: 'Studio' },
    price: 1800,
    currency: 'AED',
    bedrooms: 1,
    bathrooms: 1,
    image:
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&q=80&w=600&h=400&fit=crop',
  },
  {
    id: '3',
    title: {
      ar: 'شقة واسعة في أبوظبي',
      en: 'Spacious Apartment in Abu Dhabi',
    },
    location: { ar: 'أبوظبي', en: 'Abu Dhabi' },
    type: { ar: 'شقة', en: 'Apartment' },
    price: 4200,
    currency: 'AED',
    bedrooms: 3,
    bathrooms: 2,
    image:
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&q=80&w=600&h=400&fit=crop',
  },
  {
    id: '4',
    title: {
      ar: 'غرفة مشتركة في عجمان',
      en: 'Shared Room in Ajman',
    },
    location: { ar: 'عجمان', en: 'Ajman' },
    type: { ar: 'غرفة', en: 'Room' },
    price: 1200,
    currency: 'AED',
    bedrooms: 1,
    bathrooms: 1,
    image:
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&q=80&w=600&h=400&fit=crop',
  },
  {
    id: '5',
    title: {
      ar: 'شقة قريبة من الجامعة في دبي',
      en: 'Apartment Near University in Dubai',
    },
    location: { ar: 'دبي', en: 'Dubai' },
    type: { ar: 'شقة', en: 'Apartment' },
    price: 2800,
    currency: 'AED',
    bedrooms: 2,
    bathrooms: 1,
    image:
      'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&q=80&w=600&h=400&fit=crop',
  },
  {
    id: '6',
    title: {
      ar: 'استوديو مؤثث في الشارقة',
      en: 'Furnished Studio in Sharjah',
    },
    location: { ar: 'الشارقة', en: 'Sharjah' },
    type: { ar: 'استوديو', en: 'Studio' },
    price: 2100,
    currency: 'AED',
    bedrooms: 1,
    bathrooms: 1,
    image:
      'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&q=80&w=600&h=400&fit=crop',
  },
];

export const locationOptions: SearchOption[] = [
  { value: 'dubai', label: { ar: 'دبي', en: 'Dubai' } },
  { value: 'abu-dhabi', label: { ar: 'أبوظبي', en: 'Abu Dhabi' } },
  { value: 'sharjah', label: { ar: 'الشارقة', en: 'Sharjah' } },
  { value: 'ajman', label: { ar: 'عجمان', en: 'Ajman' } },
];

export const typeOptions: SearchOption[] = [
  { value: 'apartment', label: { ar: 'شقة', en: 'Apartment' } },
  { value: 'studio', label: { ar: 'استوديو', en: 'Studio' } },
  { value: 'room', label: { ar: 'غرفة', en: 'Room' } },
];

export const priceOptions: SearchOption[] = [
  { value: 'under-2000', label: { ar: 'أقل من 2,000 د.إ', en: 'Under 2,000 AED' } },
  { value: '2000-4000', label: { ar: '2,000 - 4,000 د.إ', en: '2,000 - 4,000 AED' } },
  { value: '4000-6000', label: { ar: '4,000 - 6,000 د.إ', en: '4,000 - 6,000 AED' } },
  { value: 'over-6000', label: { ar: 'أكثر من 6,000 د.إ', en: 'Over 6,000 AED' } },
];
