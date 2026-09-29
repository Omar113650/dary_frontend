import { useState, useEffect, useCallback } from 'react';
import { useLocale } from '../../utils/LocaleContext';
import { propertyService } from '../../services/propertyService';

interface PropertyImage {
  id: string;
  url: string;
  isPrimary?: boolean;
  category?: string;
  publicId?: string;
}

interface ImageManagerModalProps {
  propertyId: string;
  propertyTitle: string;
  onClose: () => void;
}

export default function ImageManagerModal({ propertyId, propertyTitle, onClose }: ImageManagerModalProps) {
  const { locale } = useLocale();

  const [images, setImages] = useState<PropertyImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadCategory, setUploadCategory] = useState<string>('general');
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingPrimaryId, setSettingPrimaryId] = useState<string | null>(null);

  // Fetch images
  const fetchImages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await propertyService.getPropertyImages(propertyId);
      // Normalize: each item may be {id, url, isPrimary, ...} or a plain string
      const normalized: PropertyImage[] = data.map((img: any, idx: number) => {
        if (typeof img === 'string') {
          return { id: `img-${idx}`, url: img, isPrimary: idx === 0 };
        }
        return {
          id: img.id || img._id || `img-${idx}`,
          url: img.url || img.imageUrl || img.path || '',
          isPrimary: Boolean(img.isPrimary || img.is_primary),
          category: img.category || 'general',
          publicId: img.publicId,
        };
      }).filter((img: PropertyImage) => img.url);
      setImages(normalized);
    } catch (err: any) {
      setError(err?.message || (locale === 'ar' ? 'فشل تحميل الصور.' : 'Failed to load images.'));
    } finally {
      setLoading(false);
    }
  }, [propertyId, locale]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // Upload new images
  const handleUpload = async () => {
    if (uploadFiles.length === 0) return;
    setUploading(true);
    setActionMessage(null);
    try {
      await propertyService.uploadPropertyImages(propertyId, uploadFiles, uploadCategory);
      setActionMessage({ type: 'success', text: locale === 'ar' ? `تم رفع ${uploadFiles.length} صورة بنجاح.` : `${uploadFiles.length} image(s) uploaded successfully.` });
      setUploadFiles([]);
      fetchImages();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err?.message || (locale === 'ar' ? 'فشل رفع الصور.' : 'Failed to upload images.') });
    } finally {
      setUploading(false);
    }
  };

  // Delete image
  const handleDelete = async (imageId: string) => {
    if (!window.confirm(locale === 'ar' ? 'هل أنت متأكد من رغبتك في حذف هذه الصورة؟' : 'Are you sure you want to delete this image?')) return;
    setDeletingId(imageId);
    setActionMessage(null);
    try {
      await propertyService.deletePropertyImage(imageId);
      setImages((prev) => prev.filter((img) => img.id !== imageId));
      setActionMessage({ type: 'success', text: locale === 'ar' ? 'تم حذف الصورة بنجاح.' : 'Image deleted successfully.' });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err?.message || (locale === 'ar' ? 'فشل حذف الصورة.' : 'Failed to delete image.') });
    } finally {
      setDeletingId(null);
    }
  };

  // Set primary image
  const handleSetPrimary = async (imageId: string) => {
    setSettingPrimaryId(imageId);
    setActionMessage(null);
    try {
      await propertyService.setPrimaryPropertyImage(imageId);
      setImages((prev) => prev.map((img) => ({ ...img, isPrimary: img.id === imageId })));
      setActionMessage({ type: 'success', text: locale === 'ar' ? 'تم تعيين الصورة الرئيسية بنجاح.' : 'Primary image set successfully.' });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err?.message || (locale === 'ar' ? 'فشل تعيين الصورة الرئيسية.' : 'Failed to set primary image.') });
    } finally {
      setSettingPrimaryId(null);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(11, 42, 74, 0.6)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '2rem 1rem',
        overflowY: 'auto',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '720px',
          boxShadow: '0 24px 48px rgba(11, 42, 74, 0.2)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.75rem',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0B2A4A' }}>
              🖼️ {locale === 'ar' ? 'إدارة صور العقار' : 'Manage Property Images'}
            </h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748B' }}>{propertyTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem', color: '#94A3B8', padding: '0.25rem' }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '1.5rem 1.75rem' }}>
          {/* Action Banner */}
          {actionMessage && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                marginBottom: '1.25rem',
                backgroundColor: actionMessage.type === 'success' ? '#DCFCE7' : '#FEE2E2',
                color: actionMessage.type === 'success' ? '#15803D' : '#B91C1C',
                border: `1px solid ${actionMessage.type === 'success' ? '#86EFAC' : '#FECACA'}`,
                fontWeight: 600,
                fontSize: '0.875rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>{actionMessage.text}</span>
              <button type="button" onClick={() => setActionMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>✕</button>
            </div>
          )}

          {/* Upload Section */}
          <div
            style={{
              backgroundColor: '#F0F9FF',
              border: '2px dashed #7DD3FC',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
            }}
          >
            <p style={{ fontWeight: 700, color: '#0B2A4A', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
              📤 {locale === 'ar' ? 'رفع صور جديدة' : 'Upload New Images'}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setUploadFiles(Array.from(e.target.files || []))}
                style={{ flex: 1, fontSize: '0.85rem', minWidth: '200px' }}
              />
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                style={{
                  padding: '0.55rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #7DD3FC',
                  backgroundColor: '#FFFFFF',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#0B2A4A',
                  outline: 'none',
                }}
              >
                <option value="general">{locale === 'ar' ? 'عام' : 'General'}</option>
                <option value="kitchen">{locale === 'ar' ? 'مطبخ' : 'Kitchen'}</option>
                <option value="bathroom">{locale === 'ar' ? 'حمام' : 'Bathroom'}</option>
                <option value="living_room">{locale === 'ar' ? 'غرفة معيشة' : 'Living Room'}</option>
                <option value="exterior">{locale === 'ar' ? 'خارجي' : 'Exterior'}</option>
              </select>
              <button
                type="button"
                disabled={uploading || uploadFiles.length === 0}
                onClick={handleUpload}
                style={{
                  padding: '0.55rem 1.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: uploading || uploadFiles.length === 0 ? '#CBD5E1' : '#0B2A4A',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: uploading || uploadFiles.length === 0 ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {uploading
                  ? (locale === 'ar' ? 'جاري الرفع...' : 'Uploading...')
                  : (locale === 'ar' ? `رفع (${uploadFiles.length}) صورة` : `Upload (${uploadFiles.length}) image(s)`)}
              </button>
            </div>
            {uploadFiles.length > 0 && (
              <p style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: '#0369A1' }}>
                {locale === 'ar' ? `تم اختيار ${uploadFiles.length} ملف/ملفات` : `${uploadFiles.length} file(s) selected`}: {uploadFiles.map(f => f.name).join(', ')}
              </p>
            )}
          </div>

          {/* Images Grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>
              <div style={{ width: '32px', height: '32px', border: '3px solid #E2E8F0', borderTopColor: '#0B2A4A', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 0.75rem' }} />
              <p style={{ margin: 0, fontSize: '0.875rem' }}>{locale === 'ar' ? 'جاري تحميل الصور...' : 'Loading images...'}</p>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ color: '#DC2626', fontWeight: 600, marginBottom: '0.75rem' }}>{error}</p>
              <button type="button" onClick={fetchImages} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#F8FAFC', cursor: 'pointer' }}>
                {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
              </button>
            </div>
          ) : images.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: '#94A3B8' }}>
              <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.75rem' }}>🖼️</span>
              <p style={{ fontWeight: 600, color: '#64748B' }}>
                {locale === 'ar' ? 'لا توجد صور مرفوعة لهذا العقار بعد.' : 'No images uploaded for this property yet.'}
              </p>
            </div>
          ) : (
            <>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.85rem' }}>
                {locale === 'ar' ? `${images.length} صورة مرفوعة` : `${images.length} image(s) uploaded`}
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                  gap: '1rem',
                }}
              >
                {images.map((img) => (
                  <div
                    key={img.id}
                    style={{
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: img.isPrimary ? '3px solid #2F6BFF' : '2px solid #E2E8F0',
                      position: 'relative',
                      backgroundColor: '#F8FAFC',
                    }}
                  >
                    {/* Primary Badge */}
                    {img.isPrimary && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '6px',
                          insetInlineStart: '6px',
                          zIndex: 1,
                          backgroundColor: '#2F6BFF',
                          color: '#FFFFFF',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '999px',
                        }}
                      >
                        ⭐ {locale === 'ar' ? 'رئيسية' : 'Primary'}
                      </div>
                    )}

                    {/* Image */}
                    <img
                      src={img.url}
                      alt={`Property image ${img.id}`}
                      style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block' }}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = 'https://via.placeholder.com/160x120?text=Image';
                      }}
                    />

                    {/* Actions */}
                    <div style={{ padding: '0.5rem', display: 'flex', gap: '0.35rem', flexDirection: 'column' }}>
                      {!img.isPrimary && (
                        <button
                          type="button"
                          disabled={settingPrimaryId === img.id}
                          onClick={() => handleSetPrimary(img.id)}
                          style={{
                            padding: '0.3rem 0.5rem',
                            borderRadius: '6px',
                            border: '1px solid #93C5FD',
                            backgroundColor: '#EFF6FF',
                            color: '#1D4ED8',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: settingPrimaryId === img.id ? 'not-allowed' : 'pointer',
                            textAlign: 'center',
                          }}
                        >
                          {settingPrimaryId === img.id ? '...' : (locale === 'ar' ? '⭐ تعيين كرئيسية' : '⭐ Set Primary')}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={deletingId === img.id}
                        onClick={() => handleDelete(img.id)}
                        style={{
                          padding: '0.3rem 0.5rem',
                          borderRadius: '6px',
                          border: '1px solid #FECACA',
                          backgroundColor: '#FFF1F2',
                          color: '#DC2626',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: deletingId === img.id ? 'not-allowed' : 'pointer',
                          textAlign: 'center',
                        }}
                      >
                        {deletingId === img.id ? '...' : (locale === 'ar' ? '🗑️ حذف' : '🗑️ Delete')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Close Button */}
          <div style={{ marginTop: '1.75rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.65rem 1.5rem',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              {locale === 'ar' ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
