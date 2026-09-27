import { useState, useEffect, useCallback } from 'react';
import { useLocale } from '../../utils/LocaleContext';
import { ReviewService } from '../../services/reviewService';
import type { ReviewItem } from '../../services/reviewService';
import { useQueryClient } from '../../lib/queryClient';
import Pagination from '../../components/common/Pagination';

export default function AdminReviewsPage() {
  const { locale } = useLocale();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'PENDING' | 'ALL'>('PENDING');
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);

  // Action state
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (actionMessage) {
      const timer = setTimeout(() => setActionMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [actionMessage]);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data: any;
      if (activeTab === 'PENDING') {
        data = await ReviewService.getPendingReviews({ page, limit });
      } else {
        data = await ReviewService.getAllReviews({ page, limit });
      }

      const list =
        (Array.isArray(data?.reviews) ? data.reviews : null) ||
        (Array.isArray(data?.data) ? data.data : null) ||
        (Array.isArray(data?.items) ? data.items : null) ||
        (Array.isArray(data) ? data : []);

      setReviews(list);
      const total = data?.total ?? data?.meta?.total ?? data?.totalCount ?? list.length;
      setTotalCount(total);
      const pages = data?.totalPages ?? data?.meta?.totalPages ?? Math.max(1, Math.ceil(total / limit));
      setTotalPages(pages);
      setHasNextPage(Boolean(data?.hasNextPage ?? data?.meta?.hasNextPage ?? page < pages));
      setHasPrevPage(Boolean(data?.hasPrevPage ?? data?.meta?.hasPrevPage ?? page > 1));
    } catch (err: any) {
      console.error('[AdminReviewsPage] Fetch error:', err);
      setError(
        err?.message ||
          (locale === 'ar'
            ? 'تعذر تحميل التقييمات من الخادم.'
            : 'Could not load reviews from the server.')
      );
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, limit, locale]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Handle Approve
  const handleApprove = async (id: string) => {
    setActionLoadingId(id);
    setActionMessage(null);
    try {
      await ReviewService.acceptReview(id);
      setActionMessage({
        type: 'success',
        text: locale === 'ar' ? 'تم اعتماد التقييم بنجاح ونشره للعامة.' : 'Review approved and published successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      await fetchReviews();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.message || (locale === 'ar' ? 'فشل اعتماد التقييم.' : 'Failed to approve review.'),
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Reject
  const handleReject = async (id: string) => {
    setActionLoadingId(id);
    setActionMessage(null);
    try {
      await ReviewService.rejectReview(id);
      setActionMessage({
        type: 'success',
        text: locale === 'ar' ? 'تم رفض التقييم وإخفاؤه بنجاح.' : 'Review rejected successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      await fetchReviews();
    } catch (err: any) {
      let errMsg = err?.message || (locale === 'ar' ? 'فشل رفض التقييم.' : 'Failed to reject review.');
      if (err?.message?.includes('alreadyModerated')) {
        errMsg =
          locale === 'ar'
            ? 'خطأ من الخادم (alreadyModerated): يرجى إزالة شرط if (review.status !== "PENDING") من دالة moderateReviewService في الباك إند للسماح بتعديل التقييم بعد اعتماده.'
            : 'Backend error (alreadyModerated): Please remove the check if (review.status !== "PENDING") in moderateReviewService.';
      }
      setActionMessage({
        type: 'error',
        text: errMsg,
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Revoke Approval (Return to Pending)
  const handleUnapprove = async (id: string) => {
    setActionLoadingId(id);
    setActionMessage(null);
    try {
      await ReviewService.unapproveReview(id);
      setActionMessage({
        type: 'success',
        text:
          locale === 'ar'
            ? 'تم إلغاء اعتماد التقييم بنجاح وإعادته لقائمة المراجعات المعلقة.'
            : 'Review approval revoked and returned to pending moderation.',
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      await fetchReviews();
    } catch (err: any) {
      let errMsg = err?.message || (locale === 'ar' ? 'فشل إلغاء اعتماد التقييم.' : 'Failed to revoke review approval.');
      if (err?.message?.includes('status must be') || err?.message?.includes('invalidModerationStatus')) {
        errMsg =
          locale === 'ar'
            ? 'الباك إند لا يقبل PENDING حالياً: يرجى إضافة "PENDING" إلى moderationStatusEnum في reviewValidation.js وفي moderateReviewService.'
            : 'Backend does not accept PENDING yet. Please add "PENDING" to moderationStatusEnum in reviewValidation.js.';
      } else if (err?.message?.includes('alreadyModerated')) {
        errMsg =
          locale === 'ar'
            ? 'خطأ من الخادم (alreadyModerated): يرجى إزالة شرط if (review.status !== "PENDING") من دالة moderateReviewService في الباك إند للسماح بإلغاء الاعتماد.'
            : 'Backend error (alreadyModerated): Please remove the check if (review.status !== "PENDING") in moderateReviewService.';
      }
      setActionMessage({
        type: 'error',
        text: errMsg,
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  function renderStars(rating: number) {
    return (
      <div style={{ display: 'inline-flex', gap: '2px', color: '#F59E0B' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} style={{ fontSize: '1rem' }}>
            {star <= rating ? '★' : '☆'}
          </span>
        ))}
      </div>
    );
  }

  function getStatusBadge(status?: string) {
    const s = (status || '').toUpperCase();
    if (s === 'APPROVED') {
      return (
        <span className="dary-badge dary-badge-closed" style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}>
          ✓ {locale === 'ar' ? 'معتمد' : 'Approved'}
        </span>
      );
    }
    if (s === 'PENDING') {
      return (
        <span className="dary-badge dary-badge-pending" style={{ backgroundColor: '#FEF9C3', color: '#A16207' }}>
          ⏳ {locale === 'ar' ? 'قيد المراجعة' : 'Pending'}
        </span>
      );
    }
    if (s === 'REJECTED') {
      return (
        <span className="dary-badge dary-badge-cancelled" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
          ✕ {locale === 'ar' ? 'مرفوض' : 'Rejected'}
        </span>
      );
    }
    return <span className="dary-badge">{status || '—'}</span>;
  }

  return (
    <div>
      {/* Header */}
      <div className="dary-welcome-card" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="dary-welcome-title">
            {locale === 'ar' ? 'إدارة التقييمات والمراجعات ⭐' : 'Reviews & Ratings Moderation ⭐'}
          </h1>
          <p className="dary-welcome-subtitle">
            {locale === 'ar'
              ? 'مراجعة واعتماد تقييمات الطلاب للعقارات والملاك لضمان جودة ومصداقية المحتوى على المنصة.'
              : 'Moderate and approve tenant reviews for properties and owners to ensure authenticity.'}
          </p>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            marginBottom: '1.25rem',
            backgroundColor: actionMessage.type === 'success' ? '#F0FDF4' : '#FEF2F2',
            border: `1px solid ${actionMessage.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
            color: actionMessage.type === 'success' ? '#166534' : '#991B1B',
            fontWeight: 700,
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>{actionMessage.type === 'success' ? '✓' : '⚠️'}</span>
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="dary-section-card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              setActiveTab('PENDING');
              setPage(1);
            }}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '8px',
              border: activeTab === 'PENDING' ? '1px solid var(--dary-blue)' : '1px solid var(--dary-border)',
              backgroundColor: activeTab === 'PENDING' ? 'var(--dary-blue)' : '#FFFFFF',
              color: activeTab === 'PENDING' ? '#FFFFFF' : 'var(--dary-navy)',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            ⏳ {locale === 'ar' ? 'المراجعات المعلقة بانتظار الاعتماد' : 'Pending Reviews'}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('ALL');
              setPage(1);
            }}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '8px',
              border: activeTab === 'ALL' ? '1px solid var(--dary-blue)' : '1px solid var(--dary-border)',
              backgroundColor: activeTab === 'ALL' ? 'var(--dary-blue)' : '#FFFFFF',
              color: activeTab === 'ALL' ? '#FFFFFF' : 'var(--dary-navy)',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            📋 {locale === 'ar' ? 'كافة المراجعات' : 'All Reviews'}
          </button>
        </div>
      </div>

      {/* Reviews Content */}
      <div className="dary-section-card">
        {loading ? (
          <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--dary-muted)' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                border: '3px solid #E2E8F0',
                borderTopColor: '#0B2A4A',
                borderRadius: '50%',
                margin: '0 auto 1rem',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              {locale === 'ar' ? 'جاري تحميل المراجعات...' : 'Loading reviews...'}
            </p>
          </div>
        ) : error ? (
          <div className="dary-error-state" style={{ maxWidth: '650px', margin: '2rem auto', padding: '2rem' }}>
            <p className="dary-error-title" style={{ fontSize: '1.15rem' }}>{locale === 'ar' ? 'خطأ في جلب التقييمات من الخادم' : 'Error Fetching Reviews'}</p>
            <p className="dary-error-desc" style={{ direction: 'ltr', fontFamily: 'monospace', backgroundColor: '#FEF2F2', padding: '0.6rem 1rem', borderRadius: '6px', border: '1px solid #FCA5A5' }}>
              {error}
            </p>
            {error.includes('Cannot set property query') && (
              <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', textAlign: locale === 'ar' ? 'right' : 'left', fontSize: '0.88rem', color: '#1E40AF', lineHeight: '1.6' }}>
                <strong>💡 {locale === 'ar' ? 'حل المشكلة في الباك إند (Backend):' : 'Fix in Backend:'}</strong>
                <p style={{ margin: '0.5rem 0' }}>
                  {locale === 'ar'
                    ? 'في ملف ValidateMiddleware.js استبدل req[source] = data بسطر Object.defineProperty للسماح بتعيين query في Express.'
                    : 'In ValidateMiddleware.js, replace req[source] = data with Object.defineProperty to allow setting query in Express.'}
                </p>
              </div>
            )}
            <button type="button" className="dary-retry-btn" style={{ marginTop: '1.25rem' }} onClick={fetchReviews}>
              {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : reviews.length === 0 ? (
          <div className="dary-empty-state">
            <div className="dary-empty-icon">⭐</div>
            <h4 className="dary-empty-title">
              {activeTab === 'PENDING'
                ? locale === 'ar'
                  ? 'لا توجد مراجعات معلقة حالياً'
                  : 'No Pending Reviews'
                : locale === 'ar'
                ? 'لا توجد مراجعات مسجلة في النظام'
                : 'No Reviews Recorded Yet'}
            </h4>
            <p className="dary-empty-desc">
              {activeTab === 'PENDING'
                ? locale === 'ar'
                  ? 'جميع مراجعات الطلاب تم فحصها واعتمادها بنجاح.'
                  : 'All student reviews have been moderated.'
                : locale === 'ar'
                ? 'ستظهر هنا التقييمات التي يكتبها الطلاب بعد إتمام حجوزاتهم.'
                : 'Reviews submitted by students after booking completion will appear here.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {reviews.map((rev) => {
              const tenantName =
                rev.tenant?.firstName
                  ? `${rev.tenant.firstName} ${rev.tenant.lastName || ''}`.trim()
                  : rev.tenant?.name || (locale === 'ar' ? 'طالب مستأجر' : 'Tenant');

              const propertyTitle = rev.property?.title || (locale === 'ar' ? 'سكن طلابي' : 'Student Housing');
              const ownerName =
                rev.owner?.firstName
                  ? `${rev.owner.firstName} ${rev.owner.lastName || ''}`.trim()
                  : rev.owner?.name || (locale === 'ar' ? 'مالك العقار' : 'Property Owner');

              const statusUpper = (rev.status || '').toUpperCase();
              const isPending = statusUpper === 'PENDING';
              const isApproved = statusUpper === 'APPROVED';
              const isRejected = statusUpper === 'REJECTED';

              return (
                <div
                  key={rev.id}
                  style={{
                    border: '1px solid var(--dary-border)',
                    borderRadius: '14px',
                    padding: '1.5rem',
                    backgroundColor: '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--dary-navy)', fontWeight: 700 }}>
                          🏢 {propertyTitle}
                        </h3>
                        {getStatusBadge(rev.status)}
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--dary-muted)' }}>
                        {locale === 'ar' ? `المستأجر: ${tenantName}` : `Tenant: ${tenantName}`}
                        {' • '}
                        {locale === 'ar' ? `المالك: ${ownerName}` : `Owner: ${ownerName}`}
                      </p>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--dary-muted)' }}>
                      {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US') : ''}
                    </div>
                  </div>

                  {/* Ratings breakdown */}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '1.5rem',
                      padding: '0.75rem 1rem',
                      backgroundColor: '#F8FAFC',
                      borderRadius: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--dary-navy)' }}>
                        {locale === 'ar' ? 'تقييم العقار:' : 'Property Rating:'}
                      </span>
                      {renderStars(rev.propertyRating)}
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F59E0B' }}>
                        ({rev.propertyRating}/5)
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--dary-navy)' }}>
                        {locale === 'ar' ? 'تقييم المالك:' : 'Owner Rating:'}
                      </span>
                      {renderStars(rev.ownerRating)}
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F59E0B' }}>
                        ({rev.ownerRating}/5)
                      </span>
                    </div>
                  </div>

                  {/* Comment */}
                  {rev.comment ? (
                    <div
                      style={{
                        padding: '0.85rem 1rem',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '10px',
                        fontSize: '0.9rem',
                        lineHeight: 1.6,
                        color: 'var(--dary-navy)',
                      }}
                    >
                      <strong style={{ color: 'var(--dary-muted)', display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                        {locale === 'ar' ? 'تعليق المستأجر:' : 'Tenant Comment:'}
                      </strong>
                      "{rev.comment}"
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--dary-muted)', fontStyle: 'italic' }}>
                      {locale === 'ar' ? 'بدون تعليق نصي.' : 'No written comment provided.'}
                    </p>
                  )}

                  {/* Moderation Actions */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.75rem',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid var(--dary-border)',
                    }}
                  >

                    {/* Actions for PENDING review */}
                    {isPending && (
                      <>
                        <button
                          type="button"
                          disabled={actionLoadingId === rev.id}
                          onClick={() => handleReject(rev.id)}
                          style={{
                            padding: '0.5rem 1.15rem',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: '#FEE2E2',
                            color: '#DC2626',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: actionLoadingId === rev.id ? 'not-allowed' : 'pointer',
                          }}
                        >
                          ✕ {locale === 'ar' ? 'رفض التقييم' : 'Reject'}
                        </button>

                        <button
                          type="button"
                          disabled={actionLoadingId === rev.id}
                          onClick={() => handleApprove(rev.id)}
                          style={{
                            padding: '0.5rem 1.25rem',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: '#16A34A',
                            color: '#FFFFFF',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: actionLoadingId === rev.id ? 'not-allowed' : 'pointer',
                            boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)',
                          }}
                        >
                          ✓ {locale === 'ar' ? 'اعتماد ونشر' : 'Approve & Publish'}
                        </button>
                      </>
                    )}

                    {/* Actions for APPROVED review (allows revoking/removing approval) */}
                    {isApproved && (
                      <>
                        <button
                          type="button"
                          disabled={actionLoadingId === rev.id}
                          onClick={() => handleReject(rev.id)}
                          style={{
                            padding: '0.5rem 1.15rem',
                            borderRadius: '8px',
                            border: '1px solid #FECACA',
                            backgroundColor: '#FEF2F2',
                            color: '#DC2626',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: actionLoadingId === rev.id ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                          }}
                          title={locale === 'ar' ? 'حجب هذا التقييم وإلغاء ظهوره للعامة' : 'Reject and hide review'}
                        >
                          ✕ {locale === 'ar' ? 'حجب / رفض التقييم' : 'Reject / Hide'}
                        </button>

                        <button
                          type="button"
                          disabled={actionLoadingId === rev.id}
                          onClick={() => handleUnapprove(rev.id)}
                          style={{
                            padding: '0.5rem 1.25rem',
                            borderRadius: '8px',
                            border: '1px solid #F59E0B',
                            backgroundColor: '#FFFBEB',
                            color: '#B45309',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: actionLoadingId === rev.id ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            boxShadow: '0 1px 3px rgba(245, 158, 11, 0.15)',
                          }}
                          title={locale === 'ar' ? 'إلغاء الاعتماد وإعادة التقييم إلى قائمة الانتظار' : 'Revoke approval and return to pending'}
                        >
                          ↩️ {locale === 'ar' ? 'إلغاء الاعتماد (إعادة للانتظار)' : 'Revoke Approval (Pending)'}
                        </button>
                      </>
                    )}

                    {/* Actions for REJECTED review */}
                    {isRejected && (
                      <>
                        <button
                          type="button"
                          disabled={actionLoadingId === rev.id}
                          onClick={() => handleUnapprove(rev.id)}
                          style={{
                            padding: '0.5rem 1.15rem',
                            borderRadius: '8px',
                            border: '1px solid #E2E8F0',
                            backgroundColor: '#F8FAFC',
                            color: '#475569',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: actionLoadingId === rev.id ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                          }}
                        >
                          ↩️ {locale === 'ar' ? 'إعادة للمراجعة المعلقة' : 'Return to Pending'}
                        </button>

                        <button
                          type="button"
                          disabled={actionLoadingId === rev.id}
                          onClick={() => handleApprove(rev.id)}
                          style={{
                            padding: '0.5rem 1.25rem',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: '#16A34A',
                            color: '#FFFFFF',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: actionLoadingId === rev.id ? 'not-allowed' : 'pointer',
                            boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)',
                          }}
                        >
                          ✓ {locale === 'ar' ? 'اعتماد ونشر' : 'Approve & Publish'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Reusable Modern Pagination */}
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalCount={totalCount}
              limit={limit}
              onPageChange={(newPage) => setPage(newPage)}
              onLimitChange={(newLimit) => {
                setLimit(newLimit);
                setPage(1);
              }}
              limitOptions={[10, 20, 50]}
              hasNextPage={hasNextPage}
              hasPrevPage={hasPrevPage}
              loading={loading}
              style={{ marginTop: '1.5rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
