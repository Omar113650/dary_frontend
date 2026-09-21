import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocale } from '../../utils/LocaleContext';
import { NotificationService } from '../../services/notificationService';
import type { NotificationItem } from '../../services/notificationService';

export default function NotificationsPage() {
  const { locale } = useLocale();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [isDeletingRead, setIsDeletingRead] = useState(false);
  const [filterTab, setFilterTab] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (actionMessage) {
      const timer = setTimeout(() => setActionMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [actionMessage]);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await NotificationService.getNotifications({ page: 1, limit: 50 });
      const items = Array.isArray(res) ? res : (res?.items || []);
      setNotifications(items);
    } catch (err: any) {
      console.error('[NotificationsPage] GET /notifications failed:', err);
      setError(
        err?.message ||
          (locale === 'ar'
            ? 'تعذر تحميل الإشعارات من الخادم.'
            : 'Could not load notifications from the server.')
      );
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  async function handleMarkAsRead(id: string) {
    try {
      await NotificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, read: true } : n))
      );
    } catch (err) {
      console.error('[NotificationsPage] Mark as read error:', err);
    }
  }

  async function handleMarkAllAsRead() {
    setIsMarkingAll(true);
    setActionMessage(null);
    try {
      await NotificationService.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, read: true }))
      );
      setActionMessage({
        type: 'success',
        text: locale === 'ar' ? 'تم تحديد جميع الإشعارات كمقروءة.' : 'All notifications marked as read.',
      });
    } catch (err: any) {
      console.error('[NotificationsPage] Mark all read error:', err);
      setActionMessage({
        type: 'error',
        text: err?.message || (locale === 'ar' ? 'فشل تحديث الإشعارات' : 'Failed to mark all as read'),
      });
    } finally {
      setIsMarkingAll(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await NotificationService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setActionMessage({
        type: 'success',
        text: locale === 'ar' ? 'تم حذف الإشعار.' : 'Notification deleted.',
      });
    } catch (err: any) {
      console.error('[NotificationsPage] Delete error:', err);
      setActionMessage({
        type: 'error',
        text: err?.message || (locale === 'ar' ? 'فشل حذف الإشعار' : 'Failed to delete notification'),
      });
    }
  }

  async function handleDeleteAllRead() {
    setIsDeletingRead(true);
    setActionMessage(null);
    try {
      await NotificationService.deleteAllRead();
      setNotifications((prev) => prev.filter((n) => !n.isRead && !n.read));
      setActionMessage({
        type: 'success',
        text: locale === 'ar' ? 'تم حذف الإشعارات المقروءة.' : 'Read notifications deleted.',
      });
    } catch (err: any) {
      console.error('[NotificationsPage] Delete all read error:', err);
      setActionMessage({
        type: 'error',
        text: err?.message || (locale === 'ar' ? 'فشل حذف الإشعارات' : 'Failed to delete read notifications'),
      });
    } finally {
      setIsDeletingRead(false);
    }
  }

  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead && !n.read).length, [notifications]);
  const readCount = useMemo(() => notifications.filter((n) => n.isRead || n.read).length, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (filterTab === 'UNREAD') {
      return notifications.filter((n) => !n.isRead && !n.read);
    }
    if (filterTab === 'READ') {
      return notifications.filter((n) => n.isRead || n.read);
    }
    return notifications;
  }, [notifications, filterTab]);

  function translateNotification(
    rawTitle?: string,
    rawBody?: string,
    loc: 'ar' | 'en' = 'ar'
  ): { title: string; message: string } {
    let title = rawTitle || (loc === 'ar' ? 'إشعار جديد' : 'New Notification');
    let message = rawBody || '';

    if (loc === 'ar') {
      const tMap: Record<string, string> = {
        'property approved': 'تمت الموافقة على العقار',
        'property submitted successfully': 'تم تسجيل العقار بنجاح',
        'new property awaiting approval': 'عقار جديد بانتظار الموافقة',
        'property rejected': 'تم رفض العقار',
        'property suspended': 'تم تعليق العقار',
        'new booking request': 'طلب حجز جديد',
        'booking request contacted': 'تم التواصل بشأن الحجز',
        'booking closed': 'تم إتمام وتأكيد الحجز',
        'booking cancelled': 'تم إلغاء الحجز',
        'booking assigned': 'تم تعيين مشرف للحجز',
        'tenant signed contract': 'قام الطالب بتوقيع العقد',
        'owner signed contract': 'قام المالك بتوقيع العقد',
        'contract activated': 'تم تفعيل العقد بنجاح',
        'contract cancelled': 'تم إلغاء العقد',
        'new support ticket': 'تذكرة دعم فني جديدة',
        'new report': 'بلاغ جديد',
        'report resolved': 'تمت معالجة البلاغ',
      };

      const lowerTitle = title.trim().toLowerCase();
      if (tMap[lowerTitle]) {
        title = tMap[lowerTitle];
      }

      // Translate common body messages
      if (message.includes('has been approved and is now available')) {
        const propNameMatch = message.match(/"([^"]+)"/);
        const propName = propNameMatch ? propNameMatch[1] : '';
        message = propName
          ? `تمت الموافقة على عقارك «${propName}» وأصبح الآن متاحاً للطلاب.`
          : 'تمت الموافقة على عقارك وأصبح الآن متاحاً للطلاب.';
      } else if (message.includes('has been submitted successfully and is waiting for admin approval')) {
        const propNameMatch = message.match(/"([^"]+)"/);
        const propName = propNameMatch ? propNameMatch[1] : '';
        message = propName
          ? `تم تسجيل عقارك «${propName}» بنجاح وهو الآن بانتظار مراجعة الإدارة.`
          : 'تم تسجيل عقارك بنجاح وهو الآن بانتظار مراجعة الإدارة.';
      } else if (message.includes('has been rejected')) {
        const propNameMatch = message.match(/"([^"]+)"/);
        const propName = propNameMatch ? propNameMatch[1] : '';
        message = propName ? `تم رفض عقارك «${propName}».` : 'تم رفض العقار.';
      } else if (message.includes('has been suspended')) {
        const propNameMatch = message.match(/"([^"]+)"/);
        const propName = propNameMatch ? propNameMatch[1] : '';
        message = propName ? `تم تعليق عقارك «${propName}».` : 'تم تعليق العقار.';
      } else if (message.startsWith('A new booking request has been submitted for ')) {
        const propName = message.replace('A new booking request has been submitted for ', '').trim();
        message = `تم تقديم طلب حجز جديد لسكن: ${propName}`;
      } else if (message.includes('Your booking request is now being handled')) {
        message = 'طلب الحجز الخاص بك قيد المتابعة والتواصل حالياً.';
      } else if (message.includes('Your booking request has been cancelled')) {
        message = 'تم إلغاء طلب الحجز الخاص بك.';
      } else if (message.includes('Your booking process has been completed')) {
        message = 'تم إتمام وتأكيد إجراءات الحجز بنجاح.';
      } else if (message.includes('has been resolved')) {
        message = 'تم حل البلاغ ومعالجة الشكوى بنجاح.';
      }
    }

    return { title, message };
  }

  function getEventIcon(event?: string) {
    const ev = (event || '').toLowerCase();
    if (ev.includes('booking')) return '📅';
    if (ev.includes('property')) return '🏠';
    if (ev.includes('contract')) return '📝';
    if (ev.includes('ticket') || ev.includes('support')) return '🎫';
    if (ev.includes('payment') || ev.includes('revenue')) return '💰';
    return '🔔';
  }

  return (
    <div>
      {actionMessage && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            backgroundColor: actionMessage.type === 'success' ? '#DEF7EC' : '#FDE8E8',
            color: actionMessage.type === 'success' ? '#03543F' : '#9B1C1C',
            border: `1px solid ${actionMessage.type === 'success' ? '#31C48D' : '#F98080'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 600,
            fontSize: '0.875rem',
          }}
        >
          <span>{actionMessage.type === 'success' ? '✓ ' : '✕ '}{actionMessage.text}</span>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700 }}
          >
            ×
          </button>
        </div>
      )}

      <div className="dary-section-card">
        <div
          className="dary-section-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.25rem',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--dary-navy)', margin: 0 }}>
              {locale === 'ar' ? '🔔 الإشعارات والتنبيهات' : '🔔 Notifications & Alerts'}
            </h2>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem', color: 'var(--dary-muted)' }}>
              {locale === 'ar'
                ? 'متابعة كافة المستجدات والتحديثات الخاصة بالحجوزات، العقارات، وحسابك.'
                : 'Real-time updates on bookings, properties, and account notices.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAll}
                style={{
                  padding: '0.5rem 0.95rem',
                  borderRadius: '8px',
                  backgroundColor: '#EFF6FF',
                  color: 'var(--dary-blue)',
                  border: '1px solid #BFDBFE',
                  fontSize: '0.825rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {isMarkingAll
                  ? locale === 'ar'
                    ? 'جاري التحديث...'
                    : 'Updating...'
                  : locale === 'ar'
                  ? '✓ تحديد الكل كمقروء'
                  : '✓ Mark All Read'}
              </button>
            )}

            {readCount > 0 && (
              <button
                type="button"
                onClick={handleDeleteAllRead}
                disabled={isDeletingRead}
                style={{
                  padding: '0.5rem 0.95rem',
                  borderRadius: '8px',
                  backgroundColor: '#FFF1F2',
                  color: '#E11D48',
                  border: '1px solid #FECDD3',
                  fontSize: '0.825rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {isDeletingRead
                  ? locale === 'ar'
                    ? 'جاري الحذف...'
                    : 'Deleting...'
                  : locale === 'ar'
                  ? '🗑️ مسح المقروءة'
                  : '🗑️ Clear Read'}
              </button>
            )}

            <button
              type="button"
              onClick={fetchNotifications}
              style={{
                padding: '0.5rem 0.85rem',
                borderRadius: '8px',
                backgroundColor: '#F8FAFC',
                color: '#475569',
                border: '1px solid #CBD5E1',
                fontSize: '0.825rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🔄 {locale === 'ar' ? 'تحديث' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem' }}>
          {[
            { id: 'ALL' as const, labelAr: 'الكل', labelEn: 'All', count: notifications.length },
            { id: 'UNREAD' as const, labelAr: 'غير مقروءة', labelEn: 'Unread', count: unreadCount },
            { id: 'READ' as const, labelAr: 'مقروءة', labelEn: 'Read', count: readCount },
          ].map((tab) => {
            const isActive = filterTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id)}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: isActive ? 'var(--dary-navy)' : '#CBD5E1',
                  backgroundColor: isActive ? 'var(--dary-navy)' : '#FFFFFF',
                  color: isActive ? '#FFFFFF' : '#475569',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <span>{locale === 'ar' ? tab.labelAr : tab.labelEn}</span>
                <span
                  style={{
                    padding: '0.1rem 0.45rem',
                    borderRadius: '9999px',
                    fontSize: '0.7rem',
                    backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : '#F1F5F9',
                    color: isActive ? '#FFFFFF' : '#475569',
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

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
              {locale === 'ar' ? 'جاري تحميل الإشعارات...' : 'Loading notifications...'}
            </p>
          </div>
        ) : error ? (
          <div className="dary-error-state">
            <p className="dary-error-title">{locale === 'ar' ? 'خطأ في جلب البيانات' : 'API Error'}</p>
            <p className="dary-error-desc">{error}</p>
            <button type="button" className="dary-retry-btn" onClick={fetchNotifications}>
              {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="dary-empty-state" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
            <div className="dary-empty-icon" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔔</div>
            <h4 className="dary-empty-title" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--dary-navy)', margin: '0 0 0.35rem' }}>
              {locale === 'ar' ? 'لا توجد إشعارات في هذا القسم' : 'No Notifications'}
            </h4>
            <p className="dary-empty-desc" style={{ fontSize: '0.85rem', color: 'var(--dary-muted)', margin: 0 }}>
              {locale === 'ar'
                ? 'أنت مطلع على كافة التحديثات! سنخبرك هنا فور وجود أي تحديثات تخص حجوزاتك أو حسابك.'
                : 'You are all caught up! Updates regarding bookings or your account will appear here.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredNotifications.map((item) => {
              const isUnread = !item.isRead && !item.read;
              const { title, message } = translateNotification(
                item.title,
                item.message || item.body || item.content,
                locale as 'ar' | 'en'
              );
              const icon = getEventIcon(item.event);
              const dateStr = item.createdAt
                ? new Date(item.createdAt).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')
                : '';

              return (
                <div
                  key={item.id}
                  onClick={() => isUnread && handleMarkAsRead(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    padding: '1.15rem 1.25rem',
                    borderRadius: '12px',
                    border: `1px solid ${isUnread ? '#BFDBFE' : 'var(--dary-border)'}`,
                    backgroundColor: isUnread ? '#F8FAFF' : '#FFFFFF',
                    cursor: isUnread ? 'pointer' : 'default',
                    transition: 'all 0.15s ease',
                    boxShadow: isUnread ? '0 2px 8px rgba(47, 107, 255, 0.06)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
                    <div
                      style={{
                        fontSize: '1.35rem',
                        lineHeight: 1,
                        marginTop: '0.15rem',
                        flexShrink: 0,
                      }}
                    >
                      {icon}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <h4
                          style={{
                            margin: 0,
                            fontSize: '0.95rem',
                            color: 'var(--dary-navy)',
                            fontWeight: isUnread ? 800 : 600,
                          }}
                        >
                          {title}
                        </h4>
                        {isUnread && (
                          <span
                            style={{
                              display: 'inline-block',
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: '#2F6BFF',
                            }}
                          />
                        )}
                      </div>

                      {message && (
                        <p style={{ margin: '0 0 0.4rem', fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                          {message}
                        </p>
                      )}

                      {dateStr && (
                        <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{dateStr}</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                    {isUnread && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(item.id);
                        }}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: '6px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid var(--dary-border)',
                          color: 'var(--dary-blue)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {locale === 'ar' ? 'تعليم كمقروء' : 'Mark as Read'}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      title={locale === 'ar' ? 'حذف الإشعار' : 'Delete notification'}
                      style={{
                        padding: '0.35rem 0.5rem',
                        borderRadius: '6px',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        color: '#94A3B8',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
