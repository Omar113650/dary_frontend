import { useState, useEffect, useCallback } from 'react';
import { useLocale } from '../../utils/LocaleContext';
import { AdminService } from '../../services/adminService';
import type { AdminReportItem, AdminStatusCount } from '../../services/adminService';

export default function AdminReportsPage() {
  const { locale } = useLocale();

  const [reports, setReports] = useState<AdminReportItem[]>([]);
  const [reportsStatus, setReportsStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [priorityFilter, setPriorityFilter] = useState('');

  // Active Resolving Modal
  const [resolvingReport, setResolvingReport] = useState<AdminReportItem | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isSubmittingResolve, setIsSubmittingResolve] = useState(false);
  const [updatingPriorityId, setUpdatingPriorityId] = useState<string | null>(null);

  // 1. Fetch Reports Status
  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const data = await AdminService.getReportsStatus();
      setReportsStatus(data);
    } catch (err: any) {
      console.error('[AdminReportsPage] GET /dashboard/reports/status failed:', err);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  // 2. Fetch Reports List
  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await AdminService.getReports({ page, limit: 10 });
      const list = data?.reports || data?.items || data?.data || (Array.isArray(data) ? data : []);
      setReports(Array.isArray(list) ? list : []);

      const total = data?.total || data?.meta?.total || (Array.isArray(list) ? list.length : 0);
      const limit = data?.limit || 10;
      setTotalPages(Math.max(1, Math.ceil(total / limit)));
    } catch (err: any) {
      console.error('[AdminReportsPage] GET /dashboard/reports failed:', err);
      setError(
        err?.message ||
          (locale === 'ar'
            ? 'تعذر تحميل قائمة البلاغات من الخادم.'
            : 'Could not load reports from the server.')
      );
    } finally {
      setLoading(false);
    }
  }, [page, locale]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Handle Priority Change
  const handleUpdatePriority = async (reportId: string, priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | string) => {
    setUpdatingPriorityId(reportId);
    setActionMessage(null);
    try {
      const norm = priority.toLowerCase() === 'urgent' ? 'high' : priority.toLowerCase();
      await AdminService.updateReportPriority(reportId, norm);
      setActionMessage({
        type: 'success',
        text: locale === 'ar' ? `تم تغيير أولوية البلاغ إلى ${priority.toUpperCase()}.` : `Report priority updated to ${priority.toUpperCase()}.`,
      });
      fetchReports();
    } catch (err: any) {
      console.error('[AdminReportsPage] updateReportPriority failed:', err);
      setActionMessage({
        type: 'error',
        text: err?.message || (locale === 'ar' ? 'فشل تعديل الأولوية.' : 'Failed to update priority.'),
      });
    } finally {
      setUpdatingPriorityId(null);
    }
  };

  // Handle Resolve Submission
  const handleResolveSubmit = async () => {
    if (!resolvingReport) return;
    setIsSubmittingResolve(true);
    setActionMessage(null);
    try {
      const notes = resolutionNotes.trim() || (locale === 'ar' ? 'تمت المراجعة والتسوية بنجاح بواسطة الإدارة' : 'Resolved by administrator');
      await AdminService.resolveReport(resolvingReport.id, notes);
      setActionMessage({
        type: 'success',
        text: locale === 'ar' ? 'تم إغلاق البلاغ وحله بنجاح.' : 'Report resolved successfully.',
      });
      setResolvingReport(null);
      setResolutionNotes('');
      fetchReports();
      fetchStatus();
    } catch (err: any) {
      console.error('[AdminReportsPage] resolveReport failed:', err);
      setActionMessage({
        type: 'error',
        text: err?.message || (locale === 'ar' ? 'فشل تسوية البلاغ.' : 'Failed to resolve report.'),
      });
    } finally {
      setIsSubmittingResolve(false);
    }
  };

  const normalizeStatusList = (raw: any): AdminStatusCount[] => {
    if (!raw) return [];
    const unwrapped =
      (raw?.status && typeof raw.status === 'object' && !Array.isArray(raw.status))
        ? raw.status
        : (raw?.data && typeof raw.data === 'object' && !Array.isArray(raw.data))
        ? raw.data
        : raw;

    if (Array.isArray(unwrapped)) {
      return unwrapped
        .filter((item) => item && item.status && String(item.status).toLowerCase() !== 'total')
        .map((item) => ({
          status: String(item.status).toUpperCase(),
          count: typeof item.count === 'number' ? item.count : Number(item.count || 0),
        }));
    }

    if (typeof unwrapped === 'object') {
      return Object.entries(unwrapped)
        .filter(([key, val]) => {
          const lower = key.toLowerCase();
          return lower !== 'total' && lower !== 'totalproperties' && typeof val === 'number';
        })
        .map(([key, val]) => ({
          status: key.toUpperCase(),
          count: Number(val || 0),
        }));
    }
    return [];
  };

  const statusMetrics = normalizeStatusList(reportsStatus);

  const filteredReports = priorityFilter
    ? reports.filter((r) => r.priority === priorityFilter)
    : reports;

  return (
    <div className="dary-page-container">
      {/* Header */}
      <div className="dary-page-header">
        <div>
          <h1 className="dary-page-title" style={{ color: '#0B2A4A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>⚠️</span>
            <span>{locale === 'ar' ? 'البلاغات والشكاوى التنازعية' : 'Reports & Dispute Resolution'}</span>
          </h1>
          <p className="dary-page-subtitle">
            {locale === 'ar'
              ? 'معالجة الشكاوى المرفوعة حول العقارات، الحسابات، أو سوء التفاهم بين الأطراف وتحديد الأولويات.'
              : 'Triage and resolve complaints reported against properties, bookings, or user accounts.'}
          </p>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: '8px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: actionMessage.type === 'success' ? '#DCFCE7' : '#FEE2E2',
            color: actionMessage.type === 'success' ? '#15803D' : '#B91C1C',
            border: `1px solid ${actionMessage.type === 'success' ? '#86EFAC' : '#FCA5A5'}`,
          }}
        >
          <span>{actionMessage.text}</span>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="dary-metrics-grid" style={{ marginBottom: '1.5rem' }}>
        {statusMetrics.map((item, idx) => (
          <div key={idx} className="dary-metric-card">
            <div className="dary-metric-icon-wrap" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
              🛡️
            </div>
            <div>
              <h3 className="dary-metric-number">{loadingStatus ? '...' : item.count}</h3>
              <p className="dary-metric-label">{item.status}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Priority Filters */}
      <div className="dary-card" style={{ marginBottom: '1.5rem', padding: '0.75rem 1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, color: '#0B2A4A', fontSize: '0.9rem' }}>
            {locale === 'ar' ? 'تصفية الأولوية:' : 'Filter Priority:'}
          </span>
          {['', 'URGENT', 'HIGH', 'MEDIUM', 'LOW'].map((pr) => (
            <button
              key={pr}
              type="button"
              onClick={() => setPriorityFilter(pr)}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: priorityFilter === pr ? '#0B2A4A' : '#CBD5E1',
                backgroundColor: priorityFilter === pr ? '#0B2A4A' : '#FFFFFF',
                color: priorityFilter === pr ? '#FFFFFF' : '#475569',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {pr === '' ? (locale === 'ar' ? 'الكل' : 'All') : pr}
            </button>
          ))}
        </div>
      </div>

      {/* Reports Table */}
      <div className="dary-card">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                border: '3px solid #E2E8F0',
                borderTopColor: '#0B2A4A',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 1rem',
              }}
            />
            <p>{locale === 'ar' ? 'جاري تحميل البلاغات...' : 'Loading reports...'}</p>
          </div>
        ) : error ? (
          <div className="dary-error-alert" style={{ margin: '1rem' }}>
            <span>{error}</span>
            <button type="button" onClick={fetchReports} className="dary-retry-btn">
              {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : filteredReports.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748B' }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>🛡️</span>
            <p style={{ fontWeight: 600, color: '#0B2A4A' }}>
              {locale === 'ar' ? 'لا توجد بلاغات تطابق الفلاتر المحددة.' : 'No reports found.'}
            </p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="dary-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E2E8F0', textAlign: locale === 'ar' ? 'right' : 'left' }}>
                    <th style={{ padding: '0.85rem 1rem', color: '#0B2A4A' }}>#</th>
                    <th style={{ padding: '0.85rem 1rem', color: '#0B2A4A' }}>{locale === 'ar' ? 'النوع' : 'Target'}</th>
                    <th style={{ padding: '0.85rem 1rem', color: '#0B2A4A' }}>{locale === 'ar' ? 'تفاصيل البلاغ' : 'Details'}</th>
                    <th style={{ padding: '0.85rem 1rem', color: '#0B2A4A' }}>{locale === 'ar' ? 'الأولوية' : 'Priority'}</th>
                    <th style={{ padding: '0.85rem 1rem', color: '#0B2A4A' }}>{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th style={{ padding: '0.85rem 1rem', color: '#0B2A4A' }}>{locale === 'ar' ? 'المبلغ' : 'Reporter'}</th>
                    <th style={{ padding: '0.85rem 1rem', color: '#0B2A4A' }}>{locale === 'ar' ? 'الإجراء' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((r) => {
                    const isBusy = updatingPriorityId === r.id;
                    const isResolved = r.status === 'RESOLVED' || r.status === 'DISMISSED';

                    const title =
                      r.title ||
                      (r.reportedProperty?.title
                        ? `${locale === 'ar' ? 'عقار: ' : 'Property: '}${r.reportedProperty.title}`
                        : r.description
                        ? r.description.substring(0, 50) + (r.description.length > 50 ? '...' : '')
                        : `${locale === 'ar' ? 'بلاغ ' : 'Report '}${r.reportedType || ''}`);

                    const reporter =
                      r.reporter?.firstName
                        ? `${r.reporter.firstName} ${r.reporter.lastName || ''}`.trim()
                        : r.reporter?.email || r.reportedBy?.name || r.reportedBy?.email || '—';

                    const rawPriority = (r.priority || 'medium').toUpperCase();

                    return (
                      <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '0.85rem 1rem', color: '#64748B', fontSize: '0.85rem' }}>
                          {r.id ? r.id.substring(0, 8) : '—'}
                        </td>

                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span
                            style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              backgroundColor: '#EEF3FF',
                              color: '#2F6BFF',
                            }}
                          >
                            {r.reportedType ? r.reportedType.toUpperCase() : (r.targetType || 'PROPERTY')}
                          </span>
                        </td>

                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontWeight: 600, color: '#0B2A4A' }}>
                            {title}
                          </div>
                          {r.description && (
                            <div style={{ fontSize: '0.8rem', color: '#64748B', maxWidth: '360px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {r.description}
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '0.85rem 1rem' }}>
                          <select
                            disabled={isBusy || isResolved}
                            value={rawPriority}
                            onChange={(e) => handleUpdatePriority(r.id, e.target.value)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              backgroundColor:
                                rawPriority === 'URGENT' || rawPriority === 'HIGH'
                                  ? '#FEE2E2'
                                  : rawPriority === 'MEDIUM'
                                  ? '#FEF9C3'
                                  : '#F1F5F9',
                              color:
                                rawPriority === 'URGENT' || rawPriority === 'HIGH'
                                  ? '#DC2626'
                                  : rawPriority === 'MEDIUM'
                                  ? '#CA8A04'
                                  : '#475569',
                              border: '1px solid #CBD5E1',
                              cursor: isResolved ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <option value="LOW">LOW</option>
                            <option value="MEDIUM">MEDIUM</option>
                            <option value="HIGH">HIGH</option>
                            <option value="URGENT">URGENT</option>
                          </select>
                        </td>

                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span
                            style={{
                              padding: '0.25rem 0.65rem',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              backgroundColor: r.status === 'RESOLVED' ? '#DCFCE7' : '#FEF9C3',
                              color: r.status === 'RESOLVED' ? '#15803D' : '#A16207',
                            }}
                          >
                            {r.status || 'PENDING'}
                          </span>
                        </td>

                        <td style={{ padding: '0.85rem 1rem', color: '#475569', fontSize: '0.85rem' }}>
                          {reporter}
                        </td>

                        <td style={{ padding: '0.85rem 1rem' }}>
                          {!isResolved ? (
                            <button
                              type="button"
                              onClick={() => {
                                setResolvingReport(r);
                                setResolutionNotes('');
                              }}
                              style={{
                                padding: '0.35rem 0.85rem',
                                borderRadius: '6px',
                                backgroundColor: '#16A34A',
                                color: '#FFFFFF',
                                border: 'none',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              {locale === 'ar' ? 'حل البلاغ' : 'Resolve'}
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: '#16A34A', fontWeight: 600 }}>
                              ✓ {locale === 'ar' ? 'تم الحل' : 'Resolved'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1.25rem',
                  borderTop: '1px solid #E2E8F0',
                }}
              >
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    background: page <= 1 ? '#F1F5F9' : '#FFFFFF',
                    cursor: page <= 1 ? 'not-allowed' : 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  {locale === 'ar' ? 'السابق' : 'Previous'}
                </button>
                <span style={{ fontSize: '0.85rem', color: '#64748B' }}>
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    background: page >= totalPages ? '#F1F5F9' : '#FFFFFF',
                    cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  {locale === 'ar' ? 'التالي' : 'Next'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Resolution Modal */}
      {resolvingReport && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(11, 42, 74, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              padding: '2rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }}
          >
            <h3 style={{ color: '#0B2A4A', fontSize: '1.25rem', marginBottom: '0.75rem', fontWeight: 700 }}>
              {locale === 'ar' ? 'تسوية وإغلاق البلاغ' : 'Resolve Report'}
            </h3>
            <p style={{ color: '#64748B', fontSize: '0.88rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              {locale === 'ar'
                ? `أنت على وشك إغلاق البلاغ المتعلق بـ "${resolvingReport.title || resolvingReport.reason || resolvingReport.id}". يمكنك تدوين ملاحظات التسوية أدناه:`
                : `You are resolving the report "${resolvingReport.title || resolvingReport.reason || resolvingReport.id}". Enter resolution notes below:`}
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, color: '#0B2A4A', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                {locale === 'ar' ? 'ملاحظات وتفاصيل التسوية' : 'Resolution Notes'}
              </label>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder={locale === 'ar' ? 'اكتب تفاصيل الحل المتفق عليه والإجراء المتخذ...' : 'Enter agreed resolution notes and actions taken...'}
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.9rem',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                disabled={isSubmittingResolve}
                onClick={() => setResolvingReport(null)}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '8px',
                  backgroundColor: '#F1F5F9',
                  color: '#475569',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isSubmittingResolve}
                onClick={handleResolveSubmit}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '8px',
                  backgroundColor: '#16A34A',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: isSubmittingResolve ? 'not-allowed' : 'pointer',
                }}
              >
                {isSubmittingResolve
                  ? (locale === 'ar' ? 'جاري المعالجة...' : 'Processing...')
                  : (locale === 'ar' ? 'تأكيد التسوية' : 'Confirm Resolution')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
