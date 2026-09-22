import { useState, useEffect, useCallback } from 'react';
import { useLocale } from '../../utils/LocaleContext';
import { SupportTicketService } from '../../services/supportTicketService';
import type { SupportTicketItem, TicketMessageItem } from '../../services/supportTicketService';

export default function AdminSupportTicketsPage() {
  const { locale } = useLocale();

  const [tickets, setTickets] = useState<SupportTicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Active Thread Modal
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketItem | null>(null);
  const [messages, setMessages] = useState<TicketMessageItem[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  // Fetch all tickets
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await SupportTicketService.getAllTickets();
      const list = Array.isArray(data)
        ? data
        : data?.tickets || data?.items || data?.data || [];
      setTickets(Array.isArray(list) ? list : []);
    } catch (err: any) {
      console.error('[AdminSupportTicketsPage] fetchTickets failed:', err);
      setError(
        err?.message ||
          (locale === 'ar'
            ? 'تعذر تحميل تذاكر الدعم الفني من الخادم.'
            : 'Could not load support tickets from server.')
      );
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Open Chat Thread Modal
  const handleOpenThread = async (ticket: SupportTicketItem) => {
    setSelectedTicket(ticket);
    setLoadingMessages(true);
    setReplyText('');
    try {
      const msgList = await SupportTicketService.getTicketMessages(ticket.id);
      setMessages(msgList);
    } catch (err: any) {
      console.error('[AdminSupportTicketsPage] getTicketMessages failed:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Send Reply from Admin
  const handleSendReply = async (andResolve = false) => {
    if (!selectedTicket || !replyText.trim()) return;
    setSendingReply(true);
    try {
      await SupportTicketService.sendMessage(selectedTicket.id, replyText.trim());

      if (andResolve) {
        await SupportTicketService.updateTicketStatus(selectedTicket.id, 'RESOLVED');
        setSelectedTicket((prev) => (prev ? { ...prev, status: 'RESOLVED' } : null));
      }

      setReplyText('');
      // Reload thread messages
      const updatedMessages = await SupportTicketService.getTicketMessages(selectedTicket.id);
      setMessages(updatedMessages);

      // Refresh list in background
      fetchTickets();

      setActionMessage({
        type: 'success',
        text: locale === 'ar' ? 'تم إرسال الرد بنجاح.' : 'Reply sent successfully.',
      });
    } catch (err: any) {
      console.error('[AdminSupportTicketsPage] sendMessage failed:', err);
      setActionMessage({
        type: 'error',
        text: err?.message || (locale === 'ar' ? 'فشل إرسال الرد.' : 'Failed to send reply.'),
      });
    } finally {
      setSendingReply(false);
    }
  };

  // Change Ticket Status
  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    setUpdatingStatusId(ticketId);
    setActionMessage(null);
    try {
      await SupportTicketService.updateTicketStatus(ticketId, newStatus);
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
      );
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      setActionMessage({
        type: 'success',
        text:
          locale === 'ar'
            ? `تم تحديث حالة التذكرة إلى (${getStatusLabel(newStatus)}).`
            : `Ticket status updated to (${newStatus}).`,
      });
    } catch (err: any) {
      console.error('[AdminSupportTicketsPage] updateTicketStatus failed:', err);
      setActionMessage({
        type: 'error',
        text: err?.message || (locale === 'ar' ? 'فشل تحديث الحالة.' : 'Failed to update status.'),
      });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  function getStatusLabel(status: string) {
    const s = String(status || '').toUpperCase();
    if (s === 'OPEN') return locale === 'ar' ? 'مفتوحة' : 'Open';
    if (s === 'INVESTIGATING' || s === 'IN_PROGRESS') return locale === 'ar' ? 'قيد المتابعة' : 'In Progress';
    if (s === 'RESOLVED') return locale === 'ar' ? 'تم الحل' : 'Resolved';
    if (s === 'CLOSED' || s === 'ARCHIVED') return locale === 'ar' ? 'مغلقة' : 'Closed';
    return s;
  }

  function getStatusBadge(status: string) {
    const s = String(status || '').toUpperCase();
    if (s === 'OPEN') {
      return (
        <span
          style={{
            padding: '0.25rem 0.65rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            backgroundColor: '#EFF6FF',
            color: '#2563EB',
            border: '1px solid #BFDBFE',
          }}
        >
          ⏳ {getStatusLabel(s)}
        </span>
      );
    }
    if (s === 'INVESTIGATING' || s === 'IN_PROGRESS') {
      return (
        <span
          style={{
            padding: '0.25rem 0.65rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            backgroundColor: '#FEF3C7',
            color: '#D97706',
            border: '1px solid #FDE68A',
          }}
        >
          🔍 {getStatusLabel(s)}
        </span>
      );
    }
    if (s === 'RESOLVED') {
      return (
        <span
          style={{
            padding: '0.25rem 0.65rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            backgroundColor: '#DCFCE7',
            color: '#16A34A',
            border: '1px solid #BBF7D0',
          }}
        >
          ✓ {getStatusLabel(s)}
        </span>
      );
    }
    return (
      <span
        style={{
          padding: '0.25rem 0.65rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: 700,
          backgroundColor: '#F1F5F9',
          color: '#64748B',
          border: '1px solid #CBD5E1',
        }}
      >
        ✕ {getStatusLabel(s)}
      </span>
    );
  }

  // Counts
  const counts = {
    ALL: tickets.length,
    OPEN: tickets.filter((t) => String(t.status || '').toUpperCase() === 'OPEN').length,
    INVESTIGATING: tickets.filter(
      (t) =>
        String(t.status || '').toUpperCase() === 'INVESTIGATING' ||
        String(t.status || '').toUpperCase() === 'IN_PROGRESS'
    ).length,
    RESOLVED: tickets.filter((t) => String(t.status || '').toUpperCase() === 'RESOLVED').length,
    CLOSED: tickets.filter(
      (t) =>
        String(t.status || '').toUpperCase() === 'CLOSED' ||
        String(t.status || '').toUpperCase() === 'ARCHIVED'
    ).length,
  };

  // Available categories
  const categories = Array.from(new Set(tickets.map((t) => t.category).filter(Boolean)));

  // Filtered tickets
  const filteredTickets = tickets.filter((t) => {
    const s = String(t.status || '').toUpperCase();
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'OPEN' && s !== 'OPEN') return false;
      if (statusFilter === 'INVESTIGATING' && s !== 'INVESTIGATING' && s !== 'IN_PROGRESS') return false;
      if (statusFilter === 'RESOLVED' && s !== 'RESOLVED') return false;
      if (statusFilter === 'CLOSED' && s !== 'CLOSED' && s !== 'ARCHIVED') return false;
    }
    if (categoryFilter !== 'ALL' && t.category !== categoryFilter) {
      return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      const subject = String(t.subject || '').toLowerCase();
      const desc = String(t.description || '').toLowerCase();
      const cat = String(t.category || '').toLowerCase();
      const userName = String(t.user?.name || `${t.user?.firstName || ''} ${t.user?.lastName || ''}`).toLowerCase();
      const userEmail = String(t.user?.email || '').toLowerCase();
      const id = String(t.id || '').toLowerCase();
      return (
        subject.includes(q) ||
        desc.includes(q) ||
        cat.includes(q) ||
        userName.includes(q) ||
        userEmail.includes(q) ||
        id.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="dary-page-container">
      {/* Header */}
      <div className="dary-page-header">
        <div>
          <h1
            className="dary-page-title"
            style={{ color: '#0B2A4A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <span>🎫</span>
            <span>{locale === 'ar' ? 'تذاكر الدعم الفني والاستفسارات' : 'Support Tickets & Help Desk'}</span>
          </h1>
          <p className="dary-page-subtitle">
            {locale === 'ar'
              ? 'متابعة استفسارات ومشاكل الطلاب والملاك، الرد المباشر عليها، وتحديث حالاتها.'
              : 'Monitor student and owner support tickets, chat directly with users, and resolve requests.'}
          </p>
        </div>

        <button
          type="button"
          onClick={fetchTickets}
          className="dary-secondary-btn"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <span>🔄</span>
          <span>{locale === 'ar' ? 'تحديث التذاكر' : 'Refresh'}</span>
        </button>
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
            fontWeight: 600,
            fontSize: '0.9rem',
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

      {/* Status Metrics Cards */}
      <div className="dary-metrics-grid" style={{ marginBottom: '1.5rem' }}>
        <div
          className="dary-metric-card"
          onClick={() => setStatusFilter('ALL')}
          style={{ cursor: 'pointer', border: statusFilter === 'ALL' ? '2px solid #0B2A4A' : undefined }}
        >
          <div className="dary-metric-icon-wrap" style={{ backgroundColor: '#EEF3FF', color: '#2F6BFF' }}>
            📋
          </div>
          <div>
            <h3 className="dary-metric-number">{loading ? '...' : counts.ALL}</h3>
            <p className="dary-metric-label">{locale === 'ar' ? 'إجمالي التذاكر' : 'Total Tickets'}</p>
          </div>
        </div>

        <div
          className="dary-metric-card"
          onClick={() => setStatusFilter('OPEN')}
          style={{ cursor: 'pointer', border: statusFilter === 'OPEN' ? '2px solid #2563EB' : undefined }}
        >
          <div className="dary-metric-icon-wrap" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
            ⏳
          </div>
          <div>
            <h3 className="dary-metric-number">{loading ? '...' : counts.OPEN}</h3>
            <p className="dary-metric-label">{locale === 'ar' ? 'مفتوحة (جديدة)' : 'Open'}</p>
          </div>
        </div>

        <div
          className="dary-metric-card"
          onClick={() => setStatusFilter('INVESTIGATING')}
          style={{ cursor: 'pointer', border: statusFilter === 'INVESTIGATING' ? '2px solid #D97706' : undefined }}
        >
          <div className="dary-metric-icon-wrap" style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>
            🔍
          </div>
          <div>
            <h3 className="dary-metric-number">{loading ? '...' : counts.INVESTIGATING}</h3>
            <p className="dary-metric-label">{locale === 'ar' ? 'قيد المتابعة' : 'In Progress'}</p>
          </div>
        </div>

        <div
          className="dary-metric-card"
          onClick={() => setStatusFilter('RESOLVED')}
          style={{ cursor: 'pointer', border: statusFilter === 'RESOLVED' ? '2px solid #16A34A' : undefined }}
        >
          <div className="dary-metric-icon-wrap" style={{ backgroundColor: '#DCFCE7', color: '#16A34A' }}>
            ✓
          </div>
          <div>
            <h3 className="dary-metric-number">{loading ? '...' : counts.RESOLVED}</h3>
            <p className="dary-metric-label">{locale === 'ar' ? 'تم الحل' : 'Resolved'}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="dary-card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Status Tabs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            {[
              { key: 'ALL', label: locale === 'ar' ? 'الكل' : 'All' },
              { key: 'OPEN', label: locale === 'ar' ? 'مفتوحة' : 'Open' },
              { key: 'INVESTIGATING', label: locale === 'ar' ? 'قيد المتابعة' : 'In Progress' },
              { key: 'RESOLVED', label: locale === 'ar' ? 'تم الحل' : 'Resolved' },
              { key: 'CLOSED', label: locale === 'ar' ? 'مغلقة' : 'Closed' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: statusFilter === tab.key ? '#0B2A4A' : '#CBD5E1',
                  backgroundColor: statusFilter === tab.key ? '#0B2A4A' : '#FFFFFF',
                  color: statusFilter === tab.key ? '#FFFFFF' : '#475569',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Category Filter */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.85rem',
                  color: '#0B2A4A',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <option value="ALL">{locale === 'ar' ? 'كل الأقسام' : 'All Categories'}</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}

            <input
              type="text"
              placeholder={locale === 'ar' ? 'بحث بالموضوع، التفاصيل، أو البريد...' : 'Search subject, user, email...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '0.85rem',
                minWidth: '220px',
              }}
            />
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="dary-card">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
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
            <p>{locale === 'ar' ? 'جاري تحميل التذاكر...' : 'Loading tickets...'}</p>
          </div>
        ) : error ? (
          <div className="dary-error-alert" style={{ margin: '1rem' }}>
            <span>{error}</span>
            <button type="button" onClick={fetchTickets} className="dary-retry-btn">
              {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748B' }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>🎫</span>
            <p style={{ fontWeight: 600, color: '#0B2A4A' }}>
              {locale === 'ar' ? 'لا توجد تذاكر دعم تطابق معايير البحث.' : 'No support tickets found.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="dary-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0', textAlign: locale === 'ar' ? 'right' : 'left' }}>
                  <th style={{ padding: '0.85rem 1rem', color: '#0B2A4A' }}>#</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#0B2A4A' }}>{locale === 'ar' ? 'القسم' : 'Category'}</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#0B2A4A' }}>{locale === 'ar' ? 'الموضوع والتفاصيل' : 'Subject & Details'}</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#0B2A4A' }}>{locale === 'ar' ? 'المستخدم' : 'Submitter'}</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#0B2A4A' }}>{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#0B2A4A' }}>{locale === 'ar' ? 'التاريخ' : 'Date'}</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#0B2A4A' }}>{locale === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((t) => {
                  const submitterName =
                    t.user?.name ||
                    `${t.user?.firstName || ''} ${t.user?.lastName || ''}`.trim() ||
                    t.user?.email ||
                    t.userId ||
                    '—';
                  const isUpdating = updatingStatusId === t.id;

                  return (
                    <tr key={t.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontSize: '0.82rem', color: '#64748B' }}>
                        {t.id ? t.id.substring(0, 8) : '—'}
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: '#F1F5F9',
                            color: '#334155',
                          }}
                        >
                          {t.category || 'General'}
                        </span>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: '#0B2A4A', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
                          {t.subject}
                        </div>
                        {t.description && (
                          <div
                            style={{
                              fontSize: '0.8rem',
                              color: '#64748B',
                              maxWidth: '320px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {t.description}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: '#0B2A4A', fontSize: '0.85rem' }}>{submitterName}</div>
                        {t.user?.email && (
                          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{t.user.email}</div>
                        )}
                        {t.user?.phone && (
                          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{t.user.phone}</div>
                        )}
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>{getStatusBadge(t.status)}</td>

                      <td style={{ padding: '0.85rem 1rem', color: '#64748B', fontSize: '0.8rem' }}>
                        {t.createdAt ? new Date(t.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US') : '—'}
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenThread(t)}
                            style={{
                              padding: '0.35rem 0.75rem',
                              borderRadius: '6px',
                              backgroundColor: '#0B2A4A',
                              color: '#FFFFFF',
                              border: 'none',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>💬</span>
                            <span>{locale === 'ar' ? 'المحادثة والرد' : 'Chat & Reply'}</span>
                          </button>

                          <select
                            disabled={isUpdating}
                            value={String(t.status || 'OPEN').toUpperCase()}
                            onChange={(e) => handleStatusChange(t.id, e.target.value)}
                            style={{
                              padding: '0.3rem 0.5rem',
                              borderRadius: '6px',
                              border: '1px solid #CBD5E1',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              backgroundColor: '#FFFFFF',
                              color: '#0B2A4A',
                              cursor: isUpdating ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <option value="OPEN">{locale === 'ar' ? 'مفتوحة' : 'Open'}</option>
                            <option value="INVESTIGATING">{locale === 'ar' ? 'قيد المتابعة' : 'In Progress'}</option>
                            <option value="RESOLVED">{locale === 'ar' ? 'تم الحل' : 'Resolved'}</option>
                            <option value="CLOSED">{locale === 'ar' ? 'مغلقة' : 'Closed'}</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Live Thread & Reply Modal */}
      {selectedTicket && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '680px',
              width: '100%',
              boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#F8FAFC',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0B2A4A' }}>
                    {selectedTicket.subject}
                  </span>
                  {getStatusBadge(selectedTicket.status)}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                  <span>{locale === 'ar' ? 'القسم: ' : 'Category: '}</span>
                  <strong>{selectedTicket.category}</strong>
                  <span style={{ margin: '0 0.5rem' }}>•</span>
                  <span>{locale === 'ar' ? 'صاحب التذكرة: ' : 'User: '}</span>
                  <strong>
                    {selectedTicket.user?.name ||
                      `${selectedTicket.user?.firstName || ''} ${selectedTicket.user?.lastName || ''}`.trim() ||
                      selectedTicket.user?.email ||
                      selectedTicket.userId ||
                      '—'}
                  </strong>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                style={{
                  fontSize: '1.25rem',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  border: 'none',
                  background: 'none',
                  fontWeight: 700,
                }}
              >
                ✕
              </button>
            </div>

            {/* Original Problem Description */}
            {selectedTicket.description && (
              <div
                style={{
                  padding: '1rem 1.5rem',
                  backgroundColor: '#EFF6FF',
                  borderBottom: '1px solid #DBEAFE',
                  fontSize: '0.85rem',
                  color: '#1E3A8A',
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>
                  📝 {locale === 'ar' ? 'شرح المشكلة المقدم من الطالب:' : 'Original Student Description:'}
                </div>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{selectedTicket.description}</p>
              </div>
            )}

            {/* Messages Thread */}
            <div
              style={{
                flex: 1,
                padding: '1.25rem 1.5rem',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
                backgroundColor: '#FAFAFA',
              }}
            >
              {loadingMessages ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>
                  {locale === 'ar' ? 'جاري تحميل المحادثة...' : 'Loading messages...'}
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8', fontSize: '0.875rem' }}>
                  {locale === 'ar'
                    ? 'لم يتم إرسال رسائل إضافية بعد في هذه المحادثة. يمكنك كتابة أول رد أدناه.'
                    : 'No additional messages in this thread yet. Write the first reply below.'}
                </div>
              ) : (
                messages.map((m, idx) => {
                  const isAdminMsg =
                    m.senderRole === 'admin' ||
                    m.senderRole === 'super_admin' ||
                    m.sender?.role === 'admin' ||
                    m.sender?.role === 'super_admin';

                  return (
                    <div
                      key={m.id || idx}
                      style={{
                        alignSelf: isAdminMsg ? 'flex-end' : 'flex-start',
                        maxWidth: '80%',
                        backgroundColor: isAdminMsg ? '#0B2A4A' : '#FFFFFF',
                        color: isAdminMsg ? '#FFFFFF' : '#0B2A4A',
                        padding: '0.75rem 1rem',
                        borderRadius: '12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        border: isAdminMsg ? 'none' : '1px solid #E2E8F0',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: isAdminMsg ? '#93C5FD' : '#64748B',
                          marginBottom: '0.25rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '1rem',
                        }}
                      >
                        <span>{isAdminMsg ? (locale === 'ar' ? '🛡️ المشرف' : '🛡️ Admin') : m.senderName || (locale === 'ar' ? '👤 الطالب' : '👤 Student')}</span>
                        <span>{m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      </div>

                      <div style={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                        {m.message || m.content}
                      </div>

                      {/* Attachments */}
                      {Array.isArray(m.attachments) && m.attachments.length > 0 && (
                        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {m.attachments.map((att: any, aIdx: number) => (
                            <a
                              key={aIdx}
                              href={att.url || att}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                fontSize: '0.75rem',
                                color: isAdminMsg ? '#60A5FA' : '#2563EB',
                                textDecoration: 'underline',
                              }}
                            >
                              📎 {locale === 'ar' ? `مرفق ${aIdx + 1}` : `Attachment ${aIdx + 1}`}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Admin Reply Box */}
            <div
              style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
              }}
            >
              <textarea
                rows={3}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={
                  locale === 'ar'
                    ? 'اكتب رد المشرف هنا للتواصل مع الطالب...'
                    : 'Write admin response to communicate with the student...'
                }
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.875rem',
                  resize: 'none',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />

              <div
                style={{
                  marginTop: '0.75rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                {/* Status selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>
                    {locale === 'ar' ? 'الحالة الحالية:' : 'Status:'}
                  </span>
                  <select
                    value={String(selectedTicket.status || 'OPEN').toUpperCase()}
                    onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value)}
                    style={{
                      padding: '0.3rem 0.6rem',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                    }}
                  >
                    <option value="OPEN">{locale === 'ar' ? 'مفتوحة' : 'Open'}</option>
                    <option value="INVESTIGATING">{locale === 'ar' ? 'قيد المتابعة' : 'In Progress'}</option>
                    <option value="RESOLVED">{locale === 'ar' ? 'تم الحل' : 'Resolved'}</option>
                    <option value="CLOSED">{locale === 'ar' ? 'مغلقة' : 'Closed'}</option>
                  </select>
                </div>

                {/* Send Buttons */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    disabled={sendingReply || !replyText.trim()}
                    onClick={() => handleSendReply(false)}
                    style={{
                      padding: '0.5rem 1.15rem',
                      borderRadius: '8px',
                      backgroundColor: '#0B2A4A',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: sendingReply || !replyText.trim() ? 'not-allowed' : 'pointer',
                      opacity: sendingReply || !replyText.trim() ? 0.6 : 1,
                    }}
                  >
                    {sendingReply ? (locale === 'ar' ? 'جاري الإرسال...' : 'Sending...') : (locale === 'ar' ? 'إرسال الرد ✉️' : 'Send Reply ✉️')}
                  </button>

                  <button
                    type="button"
                    disabled={sendingReply || !replyText.trim()}
                    onClick={() => handleSendReply(true)}
                    style={{
                      padding: '0.5rem 1.15rem',
                      borderRadius: '8px',
                      backgroundColor: '#16A34A',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: sendingReply || !replyText.trim() ? 'not-allowed' : 'pointer',
                      opacity: sendingReply || !replyText.trim() ? 0.6 : 1,
                    }}
                  >
                    {locale === 'ar' ? 'إرسال وحل التذكرة ✓' : 'Reply & Resolve ✓'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
