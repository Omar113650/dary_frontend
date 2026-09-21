import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLocale } from '../../utils/LocaleContext';
import { OwnerService } from '../../services/ownerService';

interface RoomConfigItem {
  roomType: 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'QUAD';
  pricePerBed: number;
  totalBeds: number;
  availableBeds: number;
  photo?: File | null;
  previewUrl?: string;
}

const COMMON_AMENITIES = [
  'واي فاي (WiFi)',
  'تكييف هواء (AC)',
  'غسالة ملابس',
  'مطبخ مجهز بالكامل',
  'ثلاجة',
  'سخان مياه',
  'مصعد (Elevator)',
  'أمن وحراسة 24/7',
  'مكتب للدراسة',
  'بلكونة / إطلالة',
  'موقف سيارات',
  'خدمة نظافة دورية',
];

export default function AddPropertyPage() {
  const { locale } = useLocale();
  const navigate = useNavigate();

  // Basic Details
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [propertyType, setPropertyType] = useState<'shared_apartment' | 'private_room' | 'shared_room' | 'studio' | 'entire_apartment'>('shared_apartment');
  const [propertyClass, setPropertyClass] = useState<'STANDARD' | 'LUXURY'>('STANDARD');
  const [targetTenantType, setTargetTenantType] = useState<'STUDENT' | 'GENERAL' | 'ANY'>('STUDENT');
  const [genderAllowed, setGenderAllowed] = useState<'male_only' | 'female_only'>('male_only');

  // Location
  const [governorate, setGovernorate] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [nearestUniversity, setNearestUniversity] = useState('');
  const [distanceToUniversity, setDistanceToUniversity] = useState<number | ''>('');

  // Features & Pricing
  const [startingPrice, setStartingPrice] = useState<number | ''>('');
  const [isFurnished, setIsFurnished] = useState(true);
  const [electricityIncluded, setElectricityIncluded] = useState(false);
  const [waterIncluded, setWaterIncluded] = useState(false);
  const [internetIncluded, setInternetIncluded] = useState(true);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(['واي فاي (WiFi)', 'مطبخ مجهز بالكامل']);

  // Rooms Configuration
  const [rooms, setRooms] = useState<RoomConfigItem[]>([
    {
      roomType: 'SINGLE',
      pricePerBed: 2500,
      totalBeds: 1,
      availableBeds: 1,
      photo: null,
      previewUrl: '',
    },
  ]);

  // Additional Photos
  const [kitchenPhotos, setKitchenPhotos] = useState<File[]>([]);
  const [bathroomPhotos, setBathroomPhotos] = useState<File[]>([]);
  const [livingRoomPhotos, setLivingRoomPhotos] = useState<File[]>([]);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Amenity Toggle
  const toggleAmenity = (amenity: string) => {
    if (selectedAmenities.includes(amenity)) {
      setSelectedAmenities(selectedAmenities.filter((a) => a !== amenity));
    } else {
      setSelectedAmenities([...selectedAmenities, amenity]);
    }
  };

  // Rooms Handlers
  const addRoom = () => {
    setRooms([
      ...rooms,
      {
        roomType: 'DOUBLE',
        pricePerBed: 1800,
        totalBeds: 2,
        availableBeds: 2,
        photo: null,
        previewUrl: '',
      },
    ]);
  };

  const removeRoom = (index: number) => {
    if (rooms.length <= 1) return;
    setRooms(rooms.filter((_, i) => i !== index));
  };

  const updateRoom = (index: number, field: keyof RoomConfigItem, value: any) => {
    const updated = [...rooms];
    updated[index] = { ...updated[index], [field]: value };
    setRooms(updated);
  };

  const handleRoomPhotoChange = (index: number, file: File | null) => {
    const updated = [...rooms];
    if (file) {
      updated[index].photo = file;
      updated[index].previewUrl = URL.createObjectURL(file);
    } else {
      updated[index].photo = null;
      updated[index].previewUrl = '';
    }
    setRooms(updated);
  };

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    // Validation
    if (!title.trim()) {
      setFormError(locale === 'ar' ? 'يرجى إدخال عنوان العقار (3 أحرف على الأقل)' : 'Please enter property title (min 3 chars)');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (title.trim().length < 3) {
      setFormError(locale === 'ar' ? 'عنوان العقار قصير جدًا (يجب أن يكون 3 أحرف على الأقل)' : 'Property title is too short (minimum 3 characters)');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (address.trim() && address.trim().length < 5) {
      setFormError(locale === 'ar' ? 'العنوان التفصيلي يجب أن يكون 5 أحرف على الأقل' : 'Detailed address must be at least 5 characters');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (rooms.length === 0) {
      setFormError(locale === 'ar' ? 'يرجى إضافة غرفة واحدة على الأقل' : 'Please add at least one room');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    for (let i = 0; i < rooms.length; i++) {
      const room = rooms[i];
      if (!room.photo) {
        setFormError(
          locale === 'ar'
            ? `يرجى رفع صورة للغرفة رقم (${i + 1})`
            : `Please upload a photo for Room #${i + 1}`
        );
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (!room.pricePerBed || room.pricePerBed <= 0) {
        setFormError(
          locale === 'ar'
            ? `يرجى تحديد سعر صحيح للسرير في الغرفة (${i + 1})`
            : `Please specify a valid price per bed in Room #${i + 1}`
        );
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (room.availableBeds > room.totalBeds) {
        setFormError(
          locale === 'ar'
            ? `عدد الأسرّة المتاحة لا يمكن أن يتجاوز الإجمالي في الغرفة (${i + 1})`
            : `Available beds cannot exceed total beds in Room #${i + 1}`
        );
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append('title', title.trim());
      if (description.trim()) formData.append('description', description.trim());
      formData.append('propertyType', propertyType);
      formData.append('propertyClass', propertyClass);
      formData.append('targetTenantType', targetTenantType);
      formData.append('genderAllowed', genderAllowed);

      if (governorate.trim()) formData.append('governorate', governorate.trim());
      if (city.trim()) formData.append('city', city.trim());
      if (district.trim()) formData.append('district', district.trim());
      if (address.trim()) formData.append('address', address.trim());
      if (nearestUniversity.trim()) formData.append('nearestUniversity', nearestUniversity.trim());
      if (distanceToUniversity !== '' && !isNaN(Number(distanceToUniversity))) {
        formData.append('distanceToUniversity', String(distanceToUniversity));
      }

      // Calculate startingPrice if not entered
      const finalStartingPrice =
        startingPrice !== '' && !isNaN(Number(startingPrice))
          ? Number(startingPrice)
          : Math.min(...rooms.map((r) => Number(r.pricePerBed) || 1000));

      formData.append('startingPrice', String(finalStartingPrice));
      formData.append('isFurnished', String(isFurnished));
      formData.append('electricityIncluded', String(electricityIncluded));
      formData.append('waterIncluded', String(waterIncluded));
      formData.append('internetIncluded', String(internetIncluded));

      // Append Amenities as JSON string
      formData.append('amenities', JSON.stringify(selectedAmenities));

      // Append Rooms Config as JSON string
      const roomsConfigData = rooms.map((r) => ({
        roomType: r.roomType,
        pricePerBed: Number(r.pricePerBed),
        totalBeds: Number(r.totalBeds),
        availableBeds: Number(r.availableBeds),
      }));
      formData.append('roomsConfig', JSON.stringify(roomsConfigData));

      // Append Room Photos in corresponding order
      rooms.forEach((r) => {
        if (r.photo) {
          formData.append('roomPhotos', r.photo);
        }
      });

      // Append Other Photos
      kitchenPhotos.forEach((file) => formData.append('kitchenPhotos', file));
      bathroomPhotos.forEach((file) => formData.append('bathroomPhotos', file));
      livingRoomPhotos.forEach((file) => formData.append('livingRoomPhotos', file));

      await OwnerService.createProperty(formData);
      setSuccessMessage(
        locale === 'ar'
          ? 'تم تسجيل العقار بنجاح وإرساله للمراجعة من قبل الإدارة!'
          : 'Property created successfully and submitted for admin review!'
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });

      setTimeout(() => {
        navigate('/owner-dashboard/properties');
      }, 2000);
    } catch (err: any) {
      console.error('[AddPropertyPage] Submission failed:', err);
      let errorText = err?.message;
      if (err?.data?.errors) {
        const errorList = Object.entries(err.data.errors).map(([field, msgs]) => {
          const m = Array.isArray(msgs) ? msgs.join(', ') : msgs;
          return `${field}: ${m}`;
        });
        if (errorList.length > 0) {
          errorText = errorList.join(' • ');
        }
      }
      setFormError(
        errorText ||
          (locale === 'ar'
            ? 'حدث خطأ أثناء حفظ العقار. يرجى التحقق من المدخلات والمحاولة مجدداً.'
            : 'Failed to create property. Please verify your inputs and try again.')
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--dary-muted)', marginBottom: '0.25rem' }}>
            <Link to="/owner-dashboard/properties" style={{ color: 'var(--dary-blue)', textDecoration: 'none' }}>
              {locale === 'ar' ? 'عقاراتي' : 'Properties'}
            </Link>
            <span>/</span>
            <span>{locale === 'ar' ? 'إضافة عقار جديد' : 'New Property'}</span>
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--dary-navy)', margin: 0 }}>
            {locale === 'ar' ? '🏢 تسجيل عقار سكن طلابي جديد' : '🏢 Register New Property'}
          </h1>
        </div>

        <Link
          to="/owner-dashboard/properties"
          style={{
            padding: '0.6rem 1.2rem',
            borderRadius: '10px',
            backgroundColor: '#F1F5F9',
            color: 'var(--dary-navy)',
            fontWeight: 600,
            fontSize: '0.9rem',
            textDecoration: 'none',
          }}
        >
          {locale === 'ar' ? 'إلغاء والعودة' : 'Cancel'}
        </Link>
      </div>

      {formError && (
        <div style={{ backgroundColor: '#FEE2E2', color: '#DC2626', padding: '1rem 1.25rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid #FECACA', fontWeight: 600, fontSize: '0.95rem' }}>
          ⚠️ {formError}
        </div>
      )}

      {successMessage && (
        <div style={{ backgroundColor: '#DCFCE7', color: '#16A34A', padding: '1rem 1.25rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid #BBF7D0', fontWeight: 700, fontSize: '1rem' }}>
          ✅ {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Section 1: Basic Info */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid var(--dary-border)', padding: '1.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--dary-navy)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>📝</span> {locale === 'ar' ? '1. البيانات الأساسية للعقار' : '1. Basic Information'}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--dary-navy)' }}>
                {locale === 'ar' ? 'عنوان العقار / الإعلان *' : 'Property Title *'}
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={locale === 'ar' ? 'مثال: سكن طلابي فاخر بجوار جامعة القاهرة' : 'e.g. Luxury Student Apartment near University'}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.95rem', outline: 'none' }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--dary-navy)' }}>
                {locale === 'ar' ? 'وصف العقار ومميزاته' : 'Description'}
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={locale === 'ar' ? 'صف هدوء المكان، الخدمات القريبة، شروط الإقامة...' : 'Describe facilities, environment, rules...'}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.95rem', outline: 'none', resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--dary-navy)' }}>
                {locale === 'ar' ? 'نوع العقار *' : 'Property Type *'}
              </label>
              <select
                value={propertyType}
                onChange={(e: any) => setPropertyType(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.95rem', outline: 'none', backgroundColor: '#FFFFFF' }}
              >
                <option value="shared_apartment">{locale === 'ar' ? 'شقة مشتركة (Shared Apartment)' : 'Shared Apartment'}</option>
                <option value="private_room">{locale === 'ar' ? 'غرفة خاصة (Private Room)' : 'Private Room'}</option>
                <option value="shared_room">{locale === 'ar' ? 'غرفة مشتركة (Shared Room)' : 'Shared Room'}</option>
                <option value="studio">{locale === 'ar' ? 'استوديو (Studio)' : 'Studio'}</option>
                <option value="entire_apartment">{locale === 'ar' ? 'شقة كاملة (Entire Apartment)' : 'Entire Apartment'}</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--dary-navy)' }}>
                {locale === 'ar' ? 'فئة العقار *' : 'Property Class *'}
              </label>
              <select
                value={propertyClass}
                onChange={(e: any) => setPropertyClass(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.95rem', outline: 'none', backgroundColor: '#FFFFFF' }}
              >
                <option value="STANDARD">{locale === 'ar' ? 'قياسي (Standard)' : 'Standard'}</option>
                <option value="LUXURY">{locale === 'ar' ? 'فاخر (Luxury)' : 'Luxury'}</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--dary-navy)' }}>
                {locale === 'ar' ? 'السكن مخصص لـ *' : 'Gender Allowed *'}
              </label>
              <select
                value={genderAllowed}
                onChange={(e: any) => setGenderAllowed(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.95rem', outline: 'none', backgroundColor: '#FFFFFF' }}
              >
                <option value="male_only">{locale === 'ar' ? 'شباب فقط (Male Only)' : 'Male Only'}</option>
                <option value="female_only">{locale === 'ar' ? 'بنات فقط (Female Only)' : 'Female Only'}</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--dary-navy)' }}>
                {locale === 'ar' ? 'الفئة المستهدفة' : 'Target Tenant Type'}
              </label>
              <select
                value={targetTenantType}
                onChange={(e: any) => setTargetTenantType(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.95rem', outline: 'none', backgroundColor: '#FFFFFF' }}
              >
                <option value="STUDENT">{locale === 'ar' ? 'طلاب جامعيين (Students)' : 'Students'}</option>
                <option value="GENERAL">{locale === 'ar' ? 'عام / خريجين (General)' : 'General'}</option>
                <option value="ANY">{locale === 'ar' ? 'الكل (Any)' : 'Any'}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Location & Proximity */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid var(--dary-border)', padding: '1.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--dary-navy)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>📍</span> {locale === 'ar' ? '2. الموقع والجامعة الأقرب' : '2. Location & University'}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--dary-navy)' }}>
                {locale === 'ar' ? 'المحافظة' : 'Governorate'}
              </label>
              <input
                type="text"
                value={governorate}
                onChange={(e) => setGovernorate(e.target.value)}
                placeholder={locale === 'ar' ? 'مثال: الجيزة' : 'e.g. Giza'}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.95rem', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--dary-navy)' }}>
                {locale === 'ar' ? 'المدينة' : 'City'}
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={locale === 'ar' ? 'مثال: الدقي' : 'e.g. Dokki'}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.95rem', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--dary-navy)' }}>
                {locale === 'ar' ? 'الحي / المنطقة' : 'District'}
              </label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder={locale === 'ar' ? 'مثال: شارع مصدق' : 'e.g. Mossadak St'}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.95rem', outline: 'none' }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--dary-navy)' }}>
                {locale === 'ar' ? 'العنوان التفصيلي' : 'Address'}
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={locale === 'ar' ? 'رقم العقار، الشارع، علامة مميزة' : 'Building No, Street, Landmark'}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.95rem', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--dary-navy)' }}>
                {locale === 'ar' ? 'أقرب جامعة' : 'Nearest University'}
              </label>
              <input
                type="text"
                value={nearestUniversity}
                onChange={(e) => setNearestUniversity(e.target.value)}
                placeholder={locale === 'ar' ? 'مثال: جامعة القاهرة' : 'e.g. Cairo University'}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.95rem', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--dary-navy)' }}>
                {locale === 'ar' ? 'المسافة للجامعة (كم)' : 'Distance to Univ (km)'}
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={distanceToUniversity}
                onChange={(e) => setDistanceToUniversity(e.target.value ? Number(e.target.value) : '')}
                placeholder="1.5"
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.95rem', outline: 'none' }}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Pricing, Bills & Amenities */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid var(--dary-border)', padding: '1.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--dary-navy)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>💰</span> {locale === 'ar' ? '3. الأسعار والمرافق المشمولة' : '3. Pricing & Amenities'}
          </h2>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--dary-navy)' }}>
              {locale === 'ar' ? 'السعر يبدأ من (ج.م / شهرياً)' : 'Starting Price (EGP / Month)'}
            </label>
            <input
              type="number"
              min="0"
              value={startingPrice}
              onChange={(e) => setStartingPrice(e.target.value ? Number(e.target.value) : '')}
              placeholder="1800"
              style={{ maxWidth: '300px', width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.95rem', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#F8FAFC', borderRadius: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
              <input type="checkbox" checked={isFurnished} onChange={(e) => setIsFurnished(e.target.checked)} />
              {locale === 'ar' ? 'مفروش بالكامل' : 'Fully Furnished'}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
              <input type="checkbox" checked={electricityIncluded} onChange={(e) => setElectricityIncluded(e.target.checked)} />
              {locale === 'ar' ? 'شامل الكهرباء' : 'Electricity Included'}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
              <input type="checkbox" checked={waterIncluded} onChange={(e) => setWaterIncluded(e.target.checked)} />
              {locale === 'ar' ? 'شامل المياه' : 'Water Included'}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
              <input type="checkbox" checked={internetIncluded} onChange={(e) => setInternetIncluded(e.target.checked)} />
              {locale === 'ar' ? 'شامل الإنترنت' : 'Internet Included'}
            </label>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--dary-navy)' }}>
              {locale === 'ar' ? 'المرافق والخدمات المتاحة:' : 'Available Amenities:'}
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
              {COMMON_AMENITIES.map((amenity) => {
                const isSelected = selectedAmenities.includes(amenity);
                return (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => toggleAmenity(amenity)}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: isSelected ? '1px solid var(--dary-blue)' : '1px solid #CBD5E1',
                      backgroundColor: isSelected ? 'var(--dary-blue)' : '#FFFFFF',
                      color: isSelected ? '#FFFFFF' : 'var(--dary-navy)',
                      transition: 'all 0.2s',
                    }}
                  >
                    {isSelected ? '✓ ' : '+ '} {amenity}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 4: Rooms Configuration & Room Photos (Per Bed Logic) */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid var(--dary-border)', padding: '1.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--dary-navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🛏️</span> {locale === 'ar' ? '4. تقسيم الغرف والأسعار بالسرير' : '4. Rooms Configuration'}
            </h2>

            <button
              type="button"
              onClick={addRoom}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                backgroundColor: 'var(--dary-blue)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              + {locale === 'ar' ? 'إضافة غرفة' : 'Add Room'}
            </button>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--dary-muted)', marginBottom: '1.25rem' }}>
            {locale === 'ar'
              ? '💡 في منصة داري، يتم تأجير الغرف على أساس السرير. يرجى تحديد نوع كل غرفة وسعر السرير شهرياً ورفع صورة لكل غرفة.'
              : 'Rooms in Dary are rented per bed. Please specify bed count, price per bed, and upload a photo for each room.'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {rooms.map((room, index) => (
              <div
                key={index}
                style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  backgroundColor: '#F8FAFC',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 800, color: 'var(--dary-navy)' }}>
                    {locale === 'ar' ? `غرفة رقم (${index + 1})` : `Room #${index + 1}`}
                  </span>
                  {rooms.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRoom(index)}
                      style={{ color: '#DC2626', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      ✕ {locale === 'ar' ? 'حذف الغرفة' : 'Delete'}
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'start' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                      {locale === 'ar' ? 'نوع الغرفة' : 'Room Type'}
                    </label>
                    <select
                      value={room.roomType}
                      onChange={(e: any) => updateRoom(index, 'roomType', e.target.value)}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', fontSize: '0.9rem' }}
                    >
                      <option value="SINGLE">{locale === 'ar' ? 'فردية (Single)' : 'Single'}</option>
                      <option value="DOUBLE">{locale === 'ar' ? 'ثنائية (Double)' : 'Double'}</option>
                      <option value="TRIPLE">{locale === 'ar' ? 'ثلاثية (Triple)' : 'Triple'}</option>
                      <option value="QUAD">{locale === 'ar' ? 'رباعية (Quad)' : 'Quad'}</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                      {locale === 'ar' ? 'سعر السرير شهرياً (ج.م) *' : 'Price / Bed (EGP) *'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={room.pricePerBed}
                      onChange={(e) => updateRoom(index, 'pricePerBed', Number(e.target.value))}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                      {locale === 'ar' ? 'إجمالي عدد الأسرّة *' : 'Total Beds *'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={room.totalBeds}
                      onChange={(e) => updateRoom(index, 'totalBeds', Number(e.target.value))}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                      {locale === 'ar' ? 'الأسرّة المتاحة حالياً *' : 'Available Beds *'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={room.totalBeds}
                      required
                      value={room.availableBeds}
                      onChange={(e) => updateRoom(index, 'availableBeds', Number(e.target.value))}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                      {locale === 'ar' ? 'صورة الغرفة (مطلوبة) *' : 'Room Photo (Required) *'}
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      <input
                        type="file"
                        accept="image/*"
                        required
                        onChange={(e) => handleRoomPhotoChange(index, e.target.files ? e.target.files[0] : null)}
                        style={{ fontSize: '0.85rem' }}
                      />
                      {room.previewUrl && (
                        <img
                          src={room.previewUrl}
                          alt={`Room ${index + 1}`}
                          style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #CBD5E1' }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 5: Other Photos (Kitchen, Bathroom, Living Room) */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid var(--dary-border)', padding: '1.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--dary-navy)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>📸</span> {locale === 'ar' ? '5. صور المرافق المشتركة' : '5. Shared Spaces Photos'}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
            <div style={{ border: '1px dashed #CBD5E1', borderRadius: '12px', padding: '1.25rem', backgroundColor: '#FAFAFA' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                🍳 {locale === 'ar' ? 'صور المطبخ' : 'Kitchen Photos'}
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setKitchenPhotos(e.target.files ? Array.from(e.target.files) : [])}
                style={{ fontSize: '0.85rem' }}
              />
              {kitchenPhotos.length > 0 && (
                <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#16A34A', fontWeight: 600 }}>
                  ✓ {kitchenPhotos.length} {locale === 'ar' ? 'صور محددة' : 'selected'}
                </p>
              )}
            </div>

            <div style={{ border: '1px dashed #CBD5E1', borderRadius: '12px', padding: '1.25rem', backgroundColor: '#FAFAFA' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                🚿 {locale === 'ar' ? 'صور الحمام' : 'Bathroom Photos'}
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setBathroomPhotos(e.target.files ? Array.from(e.target.files) : [])}
                style={{ fontSize: '0.85rem' }}
              />
              {bathroomPhotos.length > 0 && (
                <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#16A34A', fontWeight: 600 }}>
                  ✓ {bathroomPhotos.length} {locale === 'ar' ? 'صور محددة' : 'selected'}
                </p>
              )}
            </div>

            <div style={{ border: '1px dashed #CBD5E1', borderRadius: '12px', padding: '1.25rem', backgroundColor: '#FAFAFA' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                🛋️ {locale === 'ar' ? 'صور الصالة / المعيشة' : 'Living Room Photos'}
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setLivingRoomPhotos(e.target.files ? Array.from(e.target.files) : [])}
                style={{ fontSize: '0.85rem' }}
              />
              {livingRoomPhotos.length > 0 && (
                <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#16A34A', fontWeight: 600 }}>
                  ✓ {livingRoomPhotos.length} {locale === 'ar' ? 'صور محددة' : 'selected'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Link
            to="/owner-dashboard/properties"
            style={{
              padding: '0.8rem 1.5rem',
              borderRadius: '10px',
              backgroundColor: '#F1F5F9',
              color: 'var(--dary-navy)',
              fontWeight: 700,
              fontSize: '0.95rem',
              textDecoration: 'none',
            }}
          >
            {locale === 'ar' ? 'إلغاء' : 'Cancel'}
          </Link>

          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '0.85rem 2.25rem',
              borderRadius: '10px',
              backgroundColor: submitting ? '#94A3B8' : 'var(--dary-blue)',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '1rem',
              cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(47, 107, 255, 0.25)',
              transition: 'all 0.2s',
            }}
          >
            {submitting
              ? (locale === 'ar' ? 'جاري رفع الصور وحفظ العقار...' : 'Uploading & Saving...')
              : (locale === 'ar' ? 'حفظ وإرسال العقار للمراجعة 🚀' : 'Save & Submit Property 🚀')}
          </button>
        </div>
      </form>
    </div>
  );
}
