import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useLocale } from '../../utils/LocaleContext';
import { propertyService } from '../../services/propertyService';

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

export default function EditPropertyPage() {
  const { id } = useParams<{ id: string }>();
  const { locale } = useLocale();
  const navigate = useNavigate();

  // Loading/error state for fetching existing property
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Basic Details
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [propertyType, setPropertyType] = useState<
    'shared_apartment' | 'private_room' | 'shared_room' | 'studio' | 'entire_apartment'
  >('shared_apartment');
  const [propertyClass, setPropertyClass] = useState<'STANDARD' | 'LUXURY'>('STANDARD');
  const [targetTenantType, setTargetTenantType] = useState<'STUDENT' | 'GENERAL' | 'ANY'>('STUDENT');
  const [genderAllowed, setGenderAllowed] = useState<'male_only' | 'female_only' | 'any'>('any');

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
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [rules, setRules] = useState('');
  const [deposit, setDeposit] = useState<number | ''>('');
  const [floor, setFloor] = useState<number | ''>('');
  const [area, setArea] = useState<number | ''>('');

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch existing property and pre-fill form
  const loadProperty = useCallback(async () => {
    if (!id) return;
    setFetchLoading(true);
    setFetchError(null);
    try {
      const prop = await propertyService.getPropertyById(id);
      if (!prop) {
        setFetchError(locale === 'ar' ? 'لم يتم العثور على العقار.' : 'Property not found.');
        return;
      }

      // Pre-fill all fields
      const rawTitle = typeof prop.title === 'object' ? (prop.title as any).ar || (prop.title as any).en || '' : String(prop.title || '');
      setTitle(rawTitle);
      setDescription(String(prop.description || ''));

      const pType = (prop as any).propertyType || '';
      const validTypes = ['shared_apartment', 'private_room', 'shared_room', 'studio', 'entire_apartment'];
      if (validTypes.includes(pType)) setPropertyType(pType as any);

      const pClass = (prop.propertyClass || 'STANDARD').toUpperCase();
      setPropertyClass(pClass === 'LUXURY' ? 'LUXURY' : 'STANDARD');

      const tType = (prop.targetTenantType || 'STUDENT').toUpperCase();
      setTargetTenantType(['STUDENT', 'GENERAL', 'ANY'].includes(tType) ? tType as any : 'STUDENT');

      const gender = (prop.genderAllowed || 'any').toLowerCase();
      setGenderAllowed(['male_only', 'female_only', 'any'].includes(gender) ? gender as any : 'any');

      setGovernorate(prop.governorate || '');
      setCity(prop.city || '');
      setDistrict(prop.district || '');
      setAddress(prop.address || '');
      setNearestUniversity(prop.nearestUniversity || '');
      setDistanceToUniversity(prop.distanceToUniversity !== undefined ? Number(prop.distanceToUniversity) : '');

      setStartingPrice(prop.price ? Number(prop.price) : '');
      setIsFurnished(prop.isFurnished !== false);
      setElectricityIncluded(Boolean(prop.electricityIncluded));
      setWaterIncluded(Boolean(prop.waterIncluded));
      setInternetIncluded(prop.internetIncluded !== false);
      setSelectedAmenities(Array.isArray(prop.amenities) ? prop.amenities.filter((a: any) => typeof a === 'string') : []);
      setRules(typeof (prop as any).rules === 'string' ? (prop as any).rules : '');
      setDeposit((prop as any).deposit !== undefined ? Number((prop as any).deposit) : '');
      setFloor((prop as any).floor !== undefined ? Number((prop as any).floor) : '');
      setArea((prop as any).area !== undefined ? Number((prop as any).area) : '');
    } catch (err: any) {
      setFetchError(err?.message || (locale === 'ar' ? 'فشل تحميل بيانات العقار.' : 'Failed to load property data.'));
    } finally {
      setFetchLoading(false);
    }
  }, [id, locale]);

  useEffect(() => {
    loadProperty();
  }, [loadProperty]);

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError(locale === 'ar' ? 'يرجى كتابة عنوان العقار.' : 'Please enter a property title.');
      return;
    }
    if (!governorate.trim() || !city.trim()) {
      setFormError(locale === 'ar' ? 'يرجى تحديد المحافظة والمدينة.' : 'Please enter governorate and city.');
      return;
    }
    if (!startingPrice || Number(startingPrice) < 100) {
      setFormError(locale === 'ar' ? 'يرجى إدخال سعر ابتداء لا يقل عن 100 ج.م.' : 'Please enter a starting price (min 100 EGP).');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        title: title.trim(),
        description: description.trim(),
        propertyType,
        propertyClass,
        targetTenantType,
        genderAllowed,
        governorate: governorate.trim(),
        city: city.trim(),
        district: district.trim(),
        address: address.trim(),
        nearestUniversity: nearestUniversity.trim(),
        startingPrice: Number(startingPrice),
        isFurnished,
        electricityIncluded,
        waterIncluded,
        internetIncluded,
        amenities: selectedAmenities,
      };

      if (distanceToUniversity !== '') payload.distanceToUniversity = Number(distanceToUniversity);
      if (rules.trim()) payload.rules = rules.trim();
      if (deposit !== '') payload.deposit = Number(deposit);
      if (floor !== '') payload.floor = Number(floor);
      if (area !== '') payload.area = Number(area);

      await propertyService.updateProperty(id!, payload);

      setSuccessMessage(
        locale === 'ar'
          ? '✓ تم تحديث بيانات العقار بنجاح. سيتم مراجعته من قِبل الإدارة قبل النشر مجدداً.'
          : '✓ Property updated successfully. It will be reviewed by the admin team before going live again.'
      );

      setTimeout(() => {
        navigate('/owner-dashboard/properties');
      }, 2500);
    } catch (err: any) {
      setFormError(
        err?.message ||
          (locale === 'ar'
            ? 'فشل تحديث العقار. يرجى مراجعة البيانات والمحاولة مجدداً.'
            : 'Failed to update property. Please review the data and try again.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading / Error States ──────────────────────────────────────────────────

  if (fetchLoading) {
    return (
      <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid #E2E8F0',
            borderTopColor: '#0B2A4A',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 1rem',
          }}
        />
        <p style={{ color: '#64748B', fontWeight: 600 }}>
          {locale === 'ar' ? 'جاري تحميل بيانات العقار...' : 'Loading property data...'}
        </p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <p style={{ color: '#DC2626', fontWeight: 700, marginBottom: '1rem' }}>{fetchError}</p>
        <Link
          to="/owner-dashboard/properties"
          style={{ color: '#2F6BFF', textDecoration: 'underline' }}
        >
          {locale === 'ar' ? 'العودة إلى عقاراتي' : 'Back to My Properties'}
        </Link>
      </div>
    );
  }

  // ── Input / Label style helpers ─────────────────────────────────────────────
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: 700,
    color: '#0B2A4A',
    marginBottom: '0.35rem',
  };
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.65rem 0.85rem',
    borderRadius: '10px',
    border: '1px solid #CBD5E1',
    fontSize: '0.9rem',
    backgroundColor: '#FFFFFF',
    outline: 'none',
    boxSizing: 'border-box',
  };
  const sectionCard: React.CSSProperties = {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    border: '1px solid #E2E8F0',
    padding: '1.75rem',
    marginBottom: '1.5rem',
    boxShadow: '0 2px 8px rgba(11,42,74,0.05)',
  };
  const sectionTitle: React.CSSProperties = {
    fontSize: '1.1rem',
    fontWeight: 800,
    color: '#0B2A4A',
    marginBottom: '1.25rem',
    paddingBottom: '0.75rem',
    borderBottom: '2px solid #EEF3FF',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  };

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Link
            to="/owner-dashboard/properties"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#64748B', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', marginBottom: '0.5rem' }}
          >
            ← {locale === 'ar' ? 'العودة إلى عقاراتي' : 'Back to My Properties'}
          </Link>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0B2A4A', margin: 0 }}>
            ✏️ {locale === 'ar' ? 'تعديل بيانات العقار' : 'Edit Property'}
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.875rem', marginTop: '0.35rem' }}>
            {locale === 'ar'
              ? 'بعد حفظ التعديلات، سيعود العقار إلى حالة "قيد المراجعة" ريثما تعتمده الإدارة.'
              : 'After saving changes, the property will return to "Pending Review" status until approved by the admin team.'}
          </p>
        </div>
      </div>

      {/* Success Banner */}
      {successMessage && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            backgroundColor: '#DCFCE7',
            border: '1px solid #86EFAC',
            color: '#15803D',
            fontWeight: 700,
            marginBottom: '1.5rem',
            fontSize: '0.95rem',
          }}
        >
          {successMessage}
        </div>
      )}

      {/* Error Banner */}
      {formError && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: '10px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#B91C1C',
            fontWeight: 600,
            marginBottom: '1.5rem',
            fontSize: '0.9rem',
          }}
        >
          ✕ {formError}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* ── Section 1: Basic Info ─────────────────────────────────────────── */}
        <div style={sectionCard}>
          <h2 style={sectionTitle}>
            <span>🏠</span>
            <span>{locale === 'ar' ? '1. المعلومات الأساسية' : '1. Basic Information'}</span>
          </h2>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>{locale === 'ar' ? 'عنوان العقار *' : 'Property Title *'}</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={locale === 'ar' ? 'مثال: سكن طلابي مفروش - المنصورة' : 'e.g., Furnished Student Housing - Mansoura'}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>{locale === 'ar' ? 'وصف العقار' : 'Description'}</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={locale === 'ar' ? 'اكتب وصفاً شاملاً للعقار يوضح الموقع والمميزات والمرافق المتاحة...' : 'Write a comprehensive description including location, features, and facilities...'}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>{locale === 'ar' ? 'نوع العقار *' : 'Property Type *'}</label>
              <select
                value={propertyType}
                onChange={(e: any) => setPropertyType(e.target.value)}
                style={inputStyle}
              >
                <option value="shared_apartment">{locale === 'ar' ? 'شقة مشتركة' : 'Shared Apartment'}</option>
                <option value="private_room">{locale === 'ar' ? 'غرفة خاصة' : 'Private Room'}</option>
                <option value="shared_room">{locale === 'ar' ? 'غرفة مشتركة' : 'Shared Room'}</option>
                <option value="studio">{locale === 'ar' ? 'استوديو' : 'Studio'}</option>
                <option value="entire_apartment">{locale === 'ar' ? 'شقة كاملة' : 'Entire Apartment'}</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>{locale === 'ar' ? 'درجة السكن *' : 'Property Class *'}</label>
              <select value={propertyClass} onChange={(e: any) => setPropertyClass(e.target.value)} style={inputStyle}>
                <option value="STANDARD">{locale === 'ar' ? 'عادي (STANDARD)' : 'Standard'}</option>
                <option value="LUXURY">{locale === 'ar' ? 'فاخر (LUXURY)' : 'Luxury'}</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>{locale === 'ar' ? 'الفئة المستهدفة *' : 'Target Tenant *'}</label>
              <select value={targetTenantType} onChange={(e: any) => setTargetTenantType(e.target.value)} style={inputStyle}>
                <option value="STUDENT">{locale === 'ar' ? 'طلاب فقط' : 'Students Only'}</option>
                <option value="GENERAL">{locale === 'ar' ? 'عام' : 'General'}</option>
                <option value="ANY">{locale === 'ar' ? 'الجميع' : 'Anyone'}</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>{locale === 'ar' ? 'الجنس المسموح *' : 'Gender Allowed *'}</label>
              <select value={genderAllowed} onChange={(e: any) => setGenderAllowed(e.target.value)} style={inputStyle}>
                <option value="male_only">{locale === 'ar' ? 'ذكور فقط' : 'Males Only'}</option>
                <option value="female_only">{locale === 'ar' ? 'إناث فقط' : 'Females Only'}</option>
                <option value="any">{locale === 'ar' ? 'الجميع' : 'Any Gender'}</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Section 2: Location ───────────────────────────────────────────── */}
        <div style={sectionCard}>
          <h2 style={sectionTitle}>
            <span>📍</span>
            <span>{locale === 'ar' ? '2. الموقع الجغرافي' : '2. Location'}</span>
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={labelStyle}>{locale === 'ar' ? 'المحافظة *' : 'Governorate *'}</label>
              <input
                type="text"
                required
                value={governorate}
                onChange={(e) => setGovernorate(e.target.value)}
                placeholder={locale === 'ar' ? 'مثال: الدقهلية' : 'e.g., Dakahlia'}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>{locale === 'ar' ? 'المدينة *' : 'City *'}</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={locale === 'ar' ? 'مثال: المنصورة' : 'e.g., Mansoura'}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>{locale === 'ar' ? 'الحي / المنطقة' : 'District / Area'}</label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder={locale === 'ar' ? 'مثال: الجامعة، ميت خميس' : 'e.g., University District'}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>{locale === 'ar' ? 'العنوان التفصيلي' : 'Full Address'}</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={locale === 'ar' ? 'الشارع والمبنى ورقم الشقة' : 'Street, building, apt number'}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>{locale === 'ar' ? 'أقرب جامعة' : 'Nearest University'}</label>
              <input
                type="text"
                value={nearestUniversity}
                onChange={(e) => setNearestUniversity(e.target.value)}
                placeholder={locale === 'ar' ? 'مثال: جامعة المنصورة' : 'e.g., Mansoura University'}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>{locale === 'ar' ? 'المسافة (كم)' : 'Distance to Univ. (km)'}</label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={distanceToUniversity}
                onChange={(e) => setDistanceToUniversity(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0.5"
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* ── Section 3: Pricing & Features ────────────────────────────────── */}
        <div style={sectionCard}>
          <h2 style={sectionTitle}>
            <span>💰</span>
            <span>{locale === 'ar' ? '3. التسعير والمزايا' : '3. Pricing & Features'}</span>
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={labelStyle}>{locale === 'ar' ? 'السعر الابتدائي (ج.م/شهر) *' : 'Starting Price (EGP/mo) *'}</label>
              <input
                type="number"
                required
                min={100}
                value={startingPrice}
                onChange={(e) => setStartingPrice(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="2500"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>{locale === 'ar' ? 'التأمين (ج.م)' : 'Security Deposit (EGP)'}</label>
              <input
                type="number"
                min={0}
                value={deposit}
                onChange={(e) => setDeposit(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>{locale === 'ar' ? 'رقم الطابق' : 'Floor Number'}</label>
              <input
                type="number"
                min={0}
                value={floor}
                onChange={(e) => setFloor(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="2"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>{locale === 'ar' ? 'المساحة (م²)' : 'Area (m²)'}</label>
              <input
                type="number"
                min={0}
                value={area}
                onChange={(e) => setArea(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="70"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Included Services */}
          <p style={{ fontWeight: 700, color: '#0B2A4A', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
            {locale === 'ar' ? 'الخدمات المشمولة في الإيجار:' : 'Services included in rent:'}
          </p>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            {[
              { key: 'isFurnished', label: locale === 'ar' ? '🛋️ مفروش' : '🛋️ Furnished', value: isFurnished, setter: setIsFurnished },
              { key: 'elec', label: locale === 'ar' ? '⚡ الكهرباء' : '⚡ Electricity', value: electricityIncluded, setter: setElectricityIncluded },
              { key: 'water', label: locale === 'ar' ? '💧 المياه' : '💧 Water', value: waterIncluded, setter: setWaterIncluded },
              { key: 'inet', label: locale === 'ar' ? '📶 الإنترنت' : '📶 Internet', value: internetIncluded, setter: setInternetIncluded },
            ].map((item) => (
              <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>
                <input
                  type="checkbox"
                  checked={item.value}
                  onChange={(e) => item.setter(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#0B2A4A' }}
                />
                {item.label}
              </label>
            ))}
          </div>
        </div>

        {/* ── Section 4: Amenities ──────────────────────────────────────────── */}
        <div style={sectionCard}>
          <h2 style={sectionTitle}>
            <span>✨</span>
            <span>{locale === 'ar' ? '4. المرافق والمميزات' : '4. Amenities & Features'}</span>
          </h2>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
            {COMMON_AMENITIES.map((amenity) => {
              const selected = selectedAmenities.includes(amenity);
              return (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => toggleAmenity(amenity)}
                  style={{
                    padding: '0.45rem 0.9rem',
                    borderRadius: '999px',
                    border: `1px solid ${selected ? '#0B2A4A' : '#CBD5E1'}`,
                    backgroundColor: selected ? '#0B2A4A' : '#F8FAFC',
                    color: selected ? '#FFFFFF' : '#475569',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {selected ? '✓ ' : ''}{amenity}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Section 5: House Rules ────────────────────────────────────────── */}
        <div style={sectionCard}>
          <h2 style={sectionTitle}>
            <span>📋</span>
            <span>{locale === 'ar' ? '5. قواعد وشروط السكن' : '5. House Rules'}</span>
          </h2>
          <textarea
            rows={3}
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            placeholder={
              locale === 'ar'
                ? 'مثال: ممنوع التدخين، الهدوء بعد منتصف الليل، ممنوع إحضار الحيوانات الأليفة...'
                : 'e.g., No smoking, quiet after midnight, no pets allowed...'
            }
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
          />
        </div>

        {/* ── Form Action Buttons ───────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.85rem',
            paddingTop: '0.5rem',
            paddingBottom: '2rem',
          }}
        >
          <Link
            to="/owner-dashboard/properties"
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              fontWeight: 700,
              fontSize: '0.95rem',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            {locale === 'ar' ? 'إلغاء' : 'Cancel'}
          </Link>

          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '0.75rem 2rem',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: submitting ? '#93C5FD' : '#0B2A4A',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: submitting ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'background-color 0.2s',
            }}
          >
            {submitting ? (
              <>
                <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                {locale === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
              </>
            ) : (
              <>
                <span>💾</span>
                <span>{locale === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
