import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from '../../utils/LocaleContext';
import { useAuth } from '../../context/AuthContext';
import { NotificationService, type NotificationItem } from '../../services/notificationService';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  useDeleteAllReadNotifications,
} from '../../hooks/useDashboardQueries';
import { useQueryClient } from '../../lib/queryClient';
import Pagination from '../../components/common/Pagination';

type StatusFilter = 'ALL' | 'UNREAD' | 'READ';
type CategoryFilter = 'ALL' | 'BOOKING' | 'PROPERTY' | 'SUPPORT' | 'CONTRACT' | 'SYSTEM';

export default function NotificationsPage() {
  const { locale } = useLocale();
  const { role } = useAuth();
  const queryClient = useQueryClient();

  // Live Auto-polling Notifications query (polls every 15s in background)
  const {
    data: rawNotifications,
    isLoading: loading,
    isFetching,
    error: queryErr,
    refetch: fetchNotifications,
  } = useNotifications(1, 50);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('ALL');
  const [filterCategory, setFilterCategory] = useState<CategoryFilter>('ALL');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [showConfirmDeleteRead, setShowConfirmDeleteRead] = useState(false);
  const [showConfirmDeleteAll, setShowConfirmDeleteAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Mutations
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();
  const deleteMutation = useDeleteNotification();
  const deleteAllReadMutation = useDeleteAllReadNotifications();

  const [markingId, setMarkingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (rawNotifications) {
      const list = Array.isArray(rawNotifications)
        ? rawNotifications
        : (rawNotifications as any)?.items || (rawNotifications as any)?.data || [];
      setNotifications(list);
    }
  }, [rawNotifications]);

  useEffect(() => {
    if (actionMessage) {
      const timer = setTimeout(() => setActionMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [actionMessage]);

  const error = queryErr
    ? (queryErr as any)?.message ||
      (locale === 'ar'
        ? 'تعذر تحميل الإشعارات من الخادم.'
        : 'Could not load notifications from the server.')
    : null;

  // Notification categorization
  function getCategory(event?: string): CategoryFilter {
    const ev = (event || '').toLowerCase();
    if (ev.includes('booking') || ev.includes('reservation')) return 'BOOKING';
    if (ev.includes('property') || ev.includes('room') || ev.includes('listing')) return 'PROPERTY';
    if (ev.includes('ticket') || ev.includes('support') || ev.includes('report') || ev.includes('complaint')) return 'SUPPORT';
    if (ev.includes('contract') || ev.includes('agreement') || ev.includes('sign')) return 'CONTRACT';
    return 'SYSTEM';
  }

  function getCategoryMeta(cat: CategoryFilter, loc: 'ar' | 'en') {
    switch (cat) {
      case 'BOOKING':
        return {
          label: loc === 'ar' ? 'حجز وإقامة' : 'Booking',
          icon: '📅',
          bg: '#EFF6FF',
          color: '#1D4ED8',
          border: '#BFDBFE',
        };
      case 'PROPERTY':
        return {
          label: loc === 'ar' ? 'سكن وعقار' : 'Property',
          icon: '🏢',
          bg: '#ECFDF5',
          color: '#047857',
          border: '#A7F3D0',
        };
      case 'SUPPORT':
        return {
          label: loc === 'ar' ? 'دعم وبلاغات' : 'Support',
          icon: '🎫',
          bg: '#F5F3FF',
          color: '#6D28D9',
          border: '#DDD6FE',
        };
      case 'CONTRACT':
        return {
          label: loc === 'ar' ? 'عقود واتفاقيات' : 'Contract',
          icon: '📝',
          bg: '#F0FDFA',
          color: '#0F766E',
          border: '#99F6E4',
        };
      default:
        return {
          label: loc === 'ar' ? 'تنبيه نظام' : 'System',
          icon: '🔔',
          bg: '#F8FAFC',
          color: '#475569',
          border: '#E2E8F0',
        };
    }
  }

  // Target navigation link based on user role and entity
  function getTargetLink(item: NotificationItem): { url: string; label: string } | null {
    const ev = (item.event || '').toLowerCase();
    const entityType = (item.relatedEntityType || '').toLowerCase();
    const loc = locale as 'ar' | 'en';

    // Bookings
    if (ev.includes('booking') || entityType.includes('booking')) {
      if (role === 'owner') {
        return { url: '/owner-dashboard/bookings', label: loc === 'ar' ? 'عرض طلبات الحجز ←' : 'View Bookings →' };
      }
      if (role === 'admin' || role === 'super_admin') {
        return { url: '/admin/bookings', label: loc === 'ar' ? 'متابعة الحجوزات ←' : 'Manage Bookings →' };
      }
      return { url: '/dashboard/rentals', label: loc === 'ar' ? 'عرض حجوزاتي ←' : 'My Bookings →' };
    }

    // Properties
    if (ev.includes('property') || entityType.includes('property')) {
      if (role === 'owner') {
        return { url: '/owner-dashboard/properties', label: loc === 'ar' ? 'عرض عقاراتي ←' : 'My Properties →' };
      }
      if (role === 'admin' || role === 'super_admin') {
        return { url: '/admin/properties', label: loc === 'ar' ? 'معاينة واعتماد العقارات ←' : 'Review Properties →' };
      }
      return { url: '/properties', label: loc === 'ar' ? 'تصفح السكنات ←' : 'Browse Properties →' };
    }

    // Support / Tickets
    if (ev.includes('ticket') || ev.includes('support') || entityType.includes('ticket')) {
      if (role === 'admin' || role === 'super_admin') {
        return { url: '/admin/tickets', label: loc === 'ar' ? 'متابعة التذاكر ←' : 'Support Tickets →' };
      }
      return { url: '/dashboard/support', label: loc === 'ar' ? 'مركز الدعم والمساعدة ←' : 'Support Center →' };
    }

    // Reports
    if (ev.includes('report') || entityType.includes('report')) {
      if (role === 'admin' || role === 'super_admin') {
        return { url: '/admin/reports', label: loc === 'ar' ? 'معاينة البلاغات ←' : 'View Reports →' };
      }
    }

    return null;
  }

  // Relative Time Formatter
  function formatRelativeTime(dateString?: string, loc: 'ar' | 'en' = 'ar'): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (loc === 'ar') {
        if (diffSecs < 45) return 'الآن';
        if (diffMins < 2) return 'منذ دقيقة';
        if (diffMins === 2) return 'منذ دقيقتين';
        if (diffMins < 11) return `منذ ${diffMins} دقائق`;
        if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
        if (diffHours < 2) return 'منذ ساعة';
        if (diffHours === 2) return 'منذ ساعتين';
        if (diffHours < 11) return `منذ ${diffHours} ساعات`;
        if (diffHours < 24) return `منذ ${diffHours} ساعة`;
        if (diffDays === 1) {
          const time = date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
          return `أمس في ${time}`;
        }
        if (diffDays < 7) return `منذ ${diffDays} أيام`;
        return date.toLocaleDateString('ar-EG', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      } else {
        if (diffSecs < 45) return 'Just now';
        if (diffMins < 2) return '1m ago';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 2) return '1h ago';
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }
    } catch {
      return dateString;
    }
  }

  // Translation mapping for backend events
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

  // Handlers
  function syncNotificationCaches(nextList: NotificationItem[]) {
    const nextUnread = nextList.filter((n) => !n.isRead && !n.read).length;
    queryClient.setQueryData(['notifications', 'unreadCount'], nextUnread);
    queryClient.setQueryData(['notifications', 1, 50, undefined, undefined], nextList);
  }

  async function handleMarkAsRead(id: string) {
    setMarkingId(id);
    setNotifications((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, isRead: true, read: true } : n));
      syncNotificationCaches(next);
      return next;
    });
    try {
      await markReadMutation.mutateAsync(id);
    } catch (err: any) {
      console.error('[NotificationsPage] Mark as read error:', err);
    } finally {
      setMarkingId(null);
    }
  }

  async function handleMarkAllAsRead() {
    setActionMessage(null);
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, isRead: true, read: true }));
      syncNotificationCaches(next);
      return next;
    });
    try {
      await markAllReadMutation.mutateAsync();
      setActionMessage({
        type: 'success',
        text: locale === 'ar' ? 'تم تحديد جميع الإشعارات كمقروءة بنجاح.' : 'All notifications marked as read.',
      });
    } catch (err: any) {
      console.error('[NotificationsPage] Mark all read error:', err);
      setActionMessage({
        type: 'error',
        text: err?.message || (locale === 'ar' ? 'فشل تحديث الإشعارات' : 'Failed to mark all as read'),
      });
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setNotifications((prev) => {
      const next = prev.filter((n) => n.id !== id);
      syncNotificationCaches(next);
      return next;
    });
    try {
      await deleteMutation.mutateAsync(id);
      setActionMessage({
        type: 'success',
        text: locale === 'ar' ? 'تم حذف الإشعار وتحديث العداد بنجاح.' : 'Notification deleted successfully.',
      });
    } catch (err: any) {
      console.error('[NotificationsPage] Delete error:', err);
      setActionMessage({
        type: 'error',
        text: err?.message || (locale === 'ar' ? 'فشل حذف الإشعار' : 'Failed to delete notification'),
      });
    } finally {
      setDeletingId(null);
    }
  }

  async function handleConfirmDeleteAllRead() {
    setShowConfirmDeleteRead(false);
    setActionMessage(null);
    const readIds = notifications.filter((n) => n.isRead || n.read).map((n) => n.id);
    setNotifications((prev) => {
      const next = prev.filter((n) => !n.isRead && !n.read);
      syncNotificationCaches(next);
      return next;
    });
    try {
      await deleteAllReadMutation.mutateAsync(readIds);
      setActionMessage({
        type: 'success',
        text: locale === 'ar' ? 'تم حذف جميع الإشعارات المقروءة.' : 'All read notifications have been deleted.',
      });
    } catch (err: any) {
      console.error('[NotificationsPage] Delete all read error:', err);
      setActionMessage({
        type: 'error',
        text: err?.message || (locale === 'ar' ? 'فشل حذف الإشعارات' : 'Failed to delete read notifications'),
      });
    }
  }

  async function handleConfirmDeleteAll() {
    setShowConfirmDeleteAll(false);
    setActionMessage(null);
    setDeletingAll(true);
    const allIds = notifications.map((n) => n.id);
    setNotifications([]);
    syncNotificationCaches([]);
    try {
      await NotificationService.deleteAllNotifications(allIds);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setActionMessage({
        type: 'success',
        text: locale === 'ar' ? 'تم حذف جميع الإشعارات وتصفير العداد بنجاح.' : 'All notifications deleted successfully.',
      });
    } catch (err: any) {
      console.error('[NotificationsPage] Delete all error:', err);
      setActionMessage({
        type: 'error',
        text: err?.message || (locale === 'ar' ? 'فشل حذف الإشعارات' : 'Failed to delete notifications'),
      });
    } finally {
      setDeletingAll(false);
    }
  }

  // Filter calculations
  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead && !n.read).length, [notifications]);
  const readCount = useMemo(() => notifications.filter((n) => n.isRead || n.read).length, [notifications]);

  // Keep global badge count in sync with current notifications state
  useEffect(() => {
    if (!loading && rawNotifications !== undefined) {
      queryClient.setQueryData(['notifications', 'unreadCount'], unreadCount);
    }
  }, [unreadCount, loading, rawNotifications, queryClient]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const isUnread = !n.isRead && !n.read;
      if (filterStatus === 'UNREAD' && !isUnread) return false;
      if (filterStatus === 'READ' && isUnread) return false;

      if (filterCategory !== 'ALL') {
        const cat = getCategory(n.event);
        if (cat !== filterCategory) return false;
      }

      return true;
    });
  }, [notifications, filterStatus, filterCategory]);

  const totalCount = filteredNotifications.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const paginatedNotifications = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredNotifications.slice(start, start + limit);
  }, [filteredNotifications, page, limit]);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Toast Alert Feedback */}
      {actionMessage && (
        <div
          style={{
            marginBottom: '1.25rem',
            padding: '0.85rem 1.25rem',
            borderRadius: '12px',
            backgroundColor: actionMessage.type === 'success' ? '#DEF7EC' : '#FDE8E8',
            color: actionMessage.type === 'success' ? '#03543F' : '#9B1C1C',
            border: `1px solid ${actionMessage.type === 'success' ? '#31C48D' : '#F98080'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 700,
            fontSize: '0.9rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            animation: 'fadeIn 0.2s ease-in-out',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>{actionMessage.type === 'success' ? '✓' : '✕'}</span>
            <span>{actionMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              fontWeight: 800,
              fontSize: '1.2rem',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Main Container Card */}
      <div className="dary-section-card" style={{ padding: '1.75rem' }}>
        {/* Top Header Section */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.5rem',
            paddingBottom: '1.25rem',
            borderBottom: '1px solid #E2E8F0',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--dary-navy)', margin: 0 }}>
                {locale === 'ar' ? '🔔 الإشعارات والتنبيهات' : '🔔 Notifications & Alerts'}
              </h2>
              {unreadCount > 0 && (
                <span
                  style={{
                    backgroundColor: '#EF4444',
                    color: '#FFFFFF',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    padding: '0.2rem 0.65rem',
                    borderRadius: '9999px',
                    boxShadow: '0 2px 6px rgba(239, 68, 68, 0.3)',
                    animation: 'dary-pulse-glow 2.5s infinite ease-in-out',
                  }}
                >
                  {unreadCount} {locale === 'ar' ? 'جديد' : 'new'}
                </span>
              )}
            </div>
            <p style={{ margin: '0.4rem 0 0', fontSize: '0.875rem', color: 'var(--dary-muted)' }}>
              {locale === 'ar'
                ? 'متابعة حية لكافة المستجدات والتنبيهات المتعلقة بالحجوزات، العقارات، وحسابك في داري.'
                : 'Real-time updates on bookings, properties, and your DARY account notices.'}
            </p>
          </div>

          {/* Action Buttons Toolbar */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={markAllReadMutation.isPending}
                style={{
                  padding: '0.55rem 1rem',
                  borderRadius: '10px',
                  backgroundColor: '#EFF6FF',
                  color: 'var(--dary-blue)',
                  border: '1px solid #BFDBFE',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.2s ease',
                }}
              >
                {markAllReadMutation.isPending ? '⏳' : '✓'}
                <span>{locale === 'ar' ? 'تحديد الكل كمقروء' : 'Mark All Read'}</span>
              </button>
            )}

            {readCount > 0 && (
              <button
                type="button"
                onClick={() => setShowConfirmDeleteRead(true)}
                disabled={deleteAllReadMutation.isPending}
                style={{
                  padding: '0.55rem 1rem',
                  borderRadius: '10px',
                  backgroundColor: '#FFF1F2',
                  color: '#E11D48',
                  border: '1px solid #FECDD3',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.2s ease',
                }}
              >
                <span>🗑️</span>
                <span>{locale === 'ar' ? 'مسح المقروءة' : 'Clear Read'}</span>
              </button>
            )}

            {notifications.length > 0 && (
              <button
                type="button"
                onClick={() => setShowConfirmDeleteAll(true)}
                disabled={deletingAll}
                style={{
                  padding: '0.55rem 1rem',
                  borderRadius: '10px',
                  backgroundColor: '#FEF2F2',
                  color: '#B91C1C',
                  border: '1px solid #FCA5A5',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.2s ease',
                }}
              >
                <span>{deletingAll ? '⏳' : '🗑️'}</span>
                <span>{locale === 'ar' ? 'حذف الكل' : 'Delete All'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => fetchNotifications()}
              disabled={isFetching}
              title={locale === 'ar' ? 'تحديث الإشعارات' : 'Refresh notifications'}
              style={{
                padding: '0.55rem 0.95rem',
                borderRadius: '10px',
                backgroundColor: '#F8FAFC',
                color: '#475569',
                border: '1px solid #CBD5E1',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  animation: isFetching ? 'spin 0.8s linear infinite' : 'none',
                }}
              >
                🔄
              </span>
              <span>{locale === 'ar' ? 'تحديث' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            marginBottom: '1.5rem',
          }}
        >
          {/* Main Status Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL' as const, labelAr: 'كافة الإشعارات', labelEn: 'All Notifications', count: notifications.length },
              { id: 'UNREAD' as const, labelAr: 'غير مقروءة', labelEn: 'Unread', count: unreadCount, highlight: unreadCount > 0 },
              { id: 'READ' as const, labelAr: 'المقروءة', labelEn: 'Read', count: readCount },
            ].map((tab) => {
              const isActive = filterStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setFilterStatus(tab.id);
                    setPage(1);
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid',
                    borderColor: isActive ? 'var(--dary-navy)' : tab.highlight ? '#FCA5A5' : '#E2E8F0',
                    backgroundColor: isActive ? 'var(--dary-navy)' : tab.highlight ? '#FEF2F2' : '#FFFFFF',
                    color: isActive ? '#FFFFFF' : tab.highlight ? '#B91C1C' : '#475569',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{locale === 'ar' ? tab.labelAr : tab.labelEn}</span>
                  <span
                    style={{
                      padding: '0.12rem 0.5rem',
                      borderRadius: '9999px',
                      fontSize: '0.725rem',
                      fontWeight: 800,
                      backgroundColor: isActive
                        ? 'rgba(255,255,255,0.25)'
                        : tab.highlight
                        ? '#EF4444'
                        : '#F1F5F9',
                      color: isActive ? '#FFFFFF' : tab.highlight ? '#FFFFFF' : '#475569',
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Category Chips Bar */}
          <div
            style={{
              display: 'flex',
              gap: '0.4rem',
              flexWrap: 'wrap',
              alignItems: 'center',
              padding: '0.5rem 0',
            }}
          >
            <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600, marginInlineEnd: '0.25rem' }}>
              {locale === 'ar' ? 'التصنيف:' : 'Category:'}
            </span>
            {[
              { id: 'ALL' as const, labelAr: 'الكل', labelEn: 'All' },
              { id: 'BOOKING' as const, labelAr: '📅 الحجوزات', labelEn: '📅 Bookings' },
              { id: 'PROPERTY' as const, labelAr: '🏢 العقارات', labelEn: '🏢 Properties' },
              { id: 'SUPPORT' as const, labelAr: '🎫 الدعم والشكاوى', labelEn: '🎫 Support' },
              { id: 'CONTRACT' as const, labelAr: '📝 العقود', labelEn: '📝 Contracts' },
            ].map((cat) => {
              const isSelected = filterCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setFilterCategory(cat.id);
                    setPage(1);
                  }}
                  style={{
                    padding: '0.3rem 0.75rem',
                    borderRadius: '20px',
                    border: `1px solid ${isSelected ? 'var(--dary-blue)' : '#E2E8F0'}`,
                    backgroundColor: isSelected ? '#EFF6FF' : '#F8FAFC',
                    color: isSelected ? 'var(--dary-blue)' : '#64748B',
                    fontSize: '0.775rem',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {locale === 'ar' ? cat.labelAr : cat.labelEn}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content State Handling */}
        {loading ? (
          <div style={{ padding: '3.5rem 0', textAlign: 'center', color: 'var(--dary-muted)' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                border: '3px solid #E2E8F0',
                borderTopColor: '#0B2A4A',
                borderRadius: '50%',
                margin: '0 auto 1.25rem',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>
              {locale === 'ar' ? 'جاري جلب وتحديث الإشعارات...' : 'Loading notifications...'}
            </p>
          </div>
        ) : error ? (
          <div className="dary-error-state" style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
            <p className="dary-error-title" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              {locale === 'ar' ? 'تعذر جلب الإشعارات' : 'Failed to load notifications'}
            </p>
            <p className="dary-error-desc" style={{ fontSize: '0.875rem', color: '#64748B', marginBottom: '1rem' }}>
              {error}
            </p>
            <button
              type="button"
              className="dary-retry-btn"
              onClick={() => fetchNotifications()}
              style={{
                padding: '0.55rem 1.25rem',
                borderRadius: '8px',
                backgroundColor: 'var(--dary-navy)',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div
            className="dary-empty-state"
            style={{
              padding: '4rem 1.5rem',
              textAlign: 'center',
              backgroundColor: '#F8FAFC',
              borderRadius: '16px',
              border: '1px dashed #CBD5E1',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>
              {filterStatus === 'UNREAD' ? '🎉' : '🔔'}
            </div>
            <h4
              style={{
                fontSize: '1.2rem',
                fontWeight: 800,
                color: 'var(--dary-navy)',
                margin: '0 0 0.4rem',
              }}
            >
              {filterStatus === 'UNREAD'
                ? locale === 'ar'
                  ? 'رائع! لا توجد إشعارات غير مقروءة'
                  : 'All caught up! No unread notifications'
                : locale === 'ar'
                ? 'لا توجد إشعارات في هذا القسم'
                : 'No Notifications found'}
            </h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--dary-muted)', maxWidth: '420px', margin: '0 auto' }}>
              {filterStatus === 'UNREAD'
                ? locale === 'ar'
                  ? 'لقد اطلعت على كافة التنبيهات والمستجدات. سنقوم بإشعارك فور وصول أي جديد.'
                  : 'You have read all updates. New alerts regarding bookings and properties will appear here.'
                : locale === 'ar'
                ? 'سنوافيك بأي مستجدات تخص حجوزاتك أو عقاراتك أو رسائل الدعم الفني فور حدوثها.'
                : 'Any updates regarding bookings, listings, or support tickets will show up here.'}
            </p>
          </div>
        ) : (
          <>
            {/* Notification Cards List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {paginatedNotifications.map((item) => {
                const isUnread = !item.isRead && !item.read;
                const { title, message } = translateNotification(
                  item.title,
                  item.message || item.body || item.content,
                  locale as 'ar' | 'en'
                );
                const cat = getCategory(item.event);
                const meta = getCategoryMeta(cat, locale as 'ar' | 'en');
                const timeStr = formatRelativeTime(item.createdAt, locale as 'ar' | 'en');
                const target = getTargetLink(item);

                const isDeleting = deletingId === item.id;
                const isMarking = markingId === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => isUnread && handleMarkAsRead(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '1.25rem',
                      padding: '1.25rem 1.4rem',
                      borderRadius: '14px',
                      border: isUnread ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
                      borderInlineStart: isUnread ? '4px solid #2563EB' : '1px solid #E2E8F0',
                      backgroundColor: isUnread ? '#F4F8FF' : '#FFFFFF',
                      cursor: isUnread ? 'pointer' : 'default',
                      transition: 'all 0.2s ease',
                      boxShadow: isUnread
                        ? '0 4px 14px rgba(37, 99, 235, 0.08)'
                        : '0 1px 3px rgba(0,0,0,0.02)',
                      opacity: isDeleting ? 0.4 : 1,
                    }}
                  >
                    {/* Left/Start side: Icon + Content */}
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                      {/* Category Badge Icon */}
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '12px',
                          backgroundColor: meta.bg,
                          color: meta.color,
                          border: `1px solid ${meta.border}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.35rem',
                          flexShrink: 0,
                          marginTop: '0.1rem',
                        }}
                      >
                        {meta.icon}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Title and Badges Row */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.55rem',
                            flexWrap: 'wrap',
                            marginBottom: '0.35rem',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '0.725rem',
                              fontWeight: 700,
                              padding: '0.15rem 0.55rem',
                              borderRadius: '6px',
                              backgroundColor: meta.bg,
                              color: meta.color,
                              border: `1px solid ${meta.border}`,
                            }}
                          >
                            {meta.label}
                          </span>

                          <h4
                            style={{
                              margin: 0,
                              fontSize: '1rem',
                              color: 'var(--dary-navy)',
                              fontWeight: isUnread ? 800 : 600,
                            }}
                          >
                            {title}
                          </h4>

                          {isUnread && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '9999px',
                                backgroundColor: '#EFF6FF',
                                color: '#1D4ED8',
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                border: '1px solid #BFDBFE',
                              }}
                            >
                              <span
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  backgroundColor: '#2563EB',
                                  boxShadow: '0 0 0 2px rgba(37,99,235,0.3)',
                                }}
                              />
                              {locale === 'ar' ? 'جديد' : 'NEW'}
                            </span>
                          )}
                        </div>

                        {/* Body Message */}
                        {message && (
                          <p
                            style={{
                              margin: '0 0 0.55rem',
                              fontSize: '0.875rem',
                              color: isUnread ? '#1E293B' : '#475569',
                              lineHeight: 1.55,
                              fontWeight: isUnread ? 500 : 400,
                            }}
                          >
                            {message}
                          </p>
                        )}

                        {/* Bottom Row: Timestamp + Contextual Link */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                          {timeStr && (
                            <span
                              style={{
                                fontSize: '0.775rem',
                                color: '#94A3B8',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                              }}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                              </svg>
                              <span>{timeStr}</span>
                            </span>
                          )}

                          {target && (
                            <Link
                              to={target.url}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                color: 'var(--dary-blue)',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                              }}
                            >
                              {target.label}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right/End side: Action Buttons */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        flexShrink: 0,
                        marginTop: '0.15rem',
                      }}
                    >
                      {isUnread && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(item.id);
                          }}
                          disabled={isMarking}
                          title={locale === 'ar' ? 'تعليم هذا الإشعار كمقروء' : 'Mark as Read'}
                          style={{
                            padding: '0.45rem 0.85rem',
                            borderRadius: '8px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #BFDBFE',
                            color: 'var(--dary-blue)',
                            fontSize: '0.775rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span>{isMarking ? '⏳' : '✓'}</span>
                          <span>{locale === 'ar' ? 'مقروء' : 'Mark Read'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                        disabled={isDeleting}
                        title={locale === 'ar' ? 'حذف الإشعار' : 'Delete notification'}
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '8px',
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          color: '#94A3B8',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#FEE2E2';
                          e.currentTarget.style.borderColor = '#FECDD3';
                          e.currentTarget.style.color = '#DC2626';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#F8FAFC';
                          e.currentTarget.style.borderColor = '#E2E8F0';
                          e.currentTarget.style.color = '#94A3B8';
                        }}
                      >
                        {isDeleting ? '⏳' : '🗑️'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalCount > limit && (
              <div style={{ marginTop: '1.75rem', borderTop: '1px solid #E2E8F0', paddingTop: '1.25rem' }}>
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  totalCount={totalCount}
                  limit={limit}
                  onPageChange={(p) => setPage(p)}
                  onLimitChange={(l) => {
                    setLimit(l);
                    setPage(1);
                  }}
                  itemNameAr="إشعار"
                  itemNameEn="notifications"
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirmation Modal for Delete All Read */}
      {showConfirmDeleteRead && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(3px)',
            padding: '1rem',
          }}
          onClick={() => setShowConfirmDeleteRead(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '1.75rem',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              animation: 'fadeIn 0.2s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', textAlign: 'center' }}>
              🗑️
            </div>
            <h3
              style={{
                fontSize: '1.2rem',
                fontWeight: 800,
                color: 'var(--dary-navy)',
                margin: '0 0 0.5rem',
                textAlign: 'center',
              }}
            >
              {locale === 'ar' ? 'حذف كافة الإشعارات المقروءة؟' : 'Delete all read notifications?'}
            </h3>
            <p
              style={{
                fontSize: '0.875rem',
                color: '#64748B',
                lineHeight: 1.5,
                margin: '0 0 1.5rem',
                textAlign: 'center',
              }}
            >
              {locale === 'ar'
                ? `سيتم حذف ${readCount} إشعار مقروء نهائياً من حسابك. لن يتم حذف الإشعارات غير المقروءة.`
                : `This will permanently remove ${readCount} read notifications. Unread notifications will not be affected.`}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowConfirmDeleteRead(false)}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '10px',
                  backgroundColor: '#F1F5F9',
                  color: '#475569',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAllRead}
                disabled={deleteAllReadMutation.isPending}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '10px',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
                }}
              >
                {deleteAllReadMutation.isPending
                  ? locale === 'ar'
                    ? 'جاري الحذف...'
                    : 'Deleting...'
                  : locale === 'ar'
                  ? 'نعم، حذف المقروءة'
                  : 'Yes, Delete Read'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Delete All Notifications */}
      {showConfirmDeleteAll && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(3px)',
            padding: '1rem',
          }}
          onClick={() => setShowConfirmDeleteAll(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '1.75rem',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              animation: 'fadeIn 0.2s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', textAlign: 'center' }}>
              🗑️
            </div>
            <h3
              style={{
                fontSize: '1.2rem',
                fontWeight: 800,
                color: 'var(--dary-navy)',
                margin: '0 0 0.5rem',
                textAlign: 'center',
              }}
            >
              {locale === 'ar' ? 'حذف جميع الإشعارات نهائياً؟' : 'Delete all notifications permanently?'}
            </h3>
            <p
              style={{
                fontSize: '0.875rem',
                color: '#64748B',
                lineHeight: 1.5,
                margin: '0 0 1.5rem',
                textAlign: 'center',
              }}
            >
              {locale === 'ar'
                ? `سيتم مسح كافة الإشعارات (${notifications.length} إشعار) وتصفير عدّاد الإشعارات فوراً.`
                : `This will permanently remove all ${notifications.length} notifications and reset your unread badge count to 0.`}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowConfirmDeleteAll(false)}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '10px',
                  backgroundColor: '#F1F5F9',
                  color: '#475569',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAll}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '10px',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
                }}
              >
                {locale === 'ar' ? 'نعم، حذف الكل' : 'Yes, Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

