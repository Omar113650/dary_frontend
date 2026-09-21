import { useState, useEffect, useCallback } from 'react';
import { useLocale } from '../../utils/LocaleContext';
import { TenantService } from '../../services/tenantService';
import type { SupportTicketItem, TicketMessageItem } from '../../services/supportTicketService';

export default function SupportTicketsPage() {
  const { locale } = useLocale();
  const [tickets, setTickets] = useState<SupportTicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New ticket modal
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [ticketCategory, setTicketCategory] = useState('General');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // View ticket thread modal (GET /support-ticket/:id/messages)
  const [activeTicket, setActiveTicket] = useState<SupportTicketItem | null>(null);
  const [messages, setMessages] = useState<TicketMessageItem[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await TenantService.getMyTickets();
      setTickets(data);
    } catch (err: any) {
      console.error('[SupportTicketsPage] GET failed:', err);
      setError(
        err?.message ||
          (locale === 'ar'
            ? 'تعذر تحميل تذاكر الدعم الفني من الخادم.'
            : 'Could not load support tickets from the server.')
      );
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Open ticket messages
  async function handleOpenThread(ticket: SupportTicketItem) {
    setActiveTicket(ticket);
    setLoadingMessages(true);
    setMessagesError(null);
    try {
      const msgList = await TenantService.getTicketMessages(ticket.id);
      setMessages(msgList);
    } catch (err: any) {
      console.error('[SupportTicketsPage] Messages fetch error:', err);
      setMessagesError(
        err?.message ||
          (locale === 'ar'
            ? 'تعذر تحميل محادثة التذكرة.'
            : 'Could not load ticket messages.')
      );
    } finally {
      setLoadingMessages(false);
    }
  }

  async function handleCreateTicket() {
    const cleanSubject = ticketSubject.trim();
    const cleanDesc = ticketDescription.trim();

    if (!cleanSubject) {
      setCreateError(
        locale === 'ar' ? 'يرجى كتابة عنوان التذكرة.' : 'Please enter a ticket subject.'
      );
      return;
    }

    if (cleanSubject.length < 3) {
      setCreateError(
        locale === 'ar'
          ? 'عنوان التذكرة قصير جدًا (يجب أن يكون 3 أحرف على الأقل).'
          : 'Ticket subject is too short (minimum 3 characters).'
      );
      return;
    }

    if (!cleanDesc) {
      setCreateError(
        locale === 'ar' ? 'يرجى كتابة تفاصيل المشكلة.' : 'Please enter problem description.'
      );
      return;
    }

    if (cleanDesc.length < 5) {
      setCreateError(
        locale === 'ar'
          ? 'تفاصيل المشكلة قصيرة جدًا (يجب أن تكون 5 أحرف على الأقل لتوضيح المشكلة).'
          : 'Description is too short (minimum 5 characters).'
      );
      return;
    }

    setIsCreating(true);
    setCreateError(null);
    try {
      await TenantService.createTicket({
        category: ticketCategory,
        subject: cleanSubject,
        description: cleanDesc,
      });
      await fetchTickets();
      setIsNewTicketOpen(false);
      setTicketSubject('');
      setTicketDescription('');
    } catch (err: any) {
      console.error('[SupportTicketsPage] Create ticket error:', err);
      let errMsg = err?.message;
      if (err?.data?.errors) {
        const errorList = Object.values(err.data.errors).flat();
        if (errorList.length > 0) {
          errMsg = errorList.join(' • ');
        }
      }
      setCreateError(
        errMsg ||
          (locale === 'ar'
            ? 'فشل إنشاء التذكرة. يرجى التأكد من البيانات والمحاولة مجددًا.'
            : 'Failed to create ticket. Please check input and try again.')
      );
    } finally {
      setIsCreating(false);
    }
  }

  function getStatusBadge(status: string) {
    const s = (status || '').toUpperCase();
    if (s === 'OPEN') {
      return (
        <span className="dary-badge dary-badge-open">
          {locale === 'ar' ? 'مفتوحة' : 'Open'}
        </span>
      );
    }
    if (s === 'INVESTIGATING' || s === 'IN_PROGRESS') {
      return (
        <span className="dary-badge dary-badge-pending">
          {locale === 'ar' ? 'قيد المتابعة' : 'In Progress'}
        </span>
      );
    }
    if (s === 'RESOLVED') {
      return (
        <span className="dary-badge dary-badge-resolved">
          {locale === 'ar' ? 'تم الحل' : 'Resolved'}
        </span>
      );
    }
    if (s === 'CLOSED' || s === 'ARCHIVED') {
      return (
        <span className="dary-badge dary-badge-cancelled">
          {locale === 'ar' ? 'مغلقة' : 'Closed'}
        </span>
      );
    }
    return <span className="dary-badge">{status}</span>;
  }

  return (
    <div>
      <div className="dary-section-card">
        <div className="dary-section-header">
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--dary-navy)', margin: 0 }}>
              {locale === 'ar' ? 'الدعم الفني والمساعدة' : 'Support & Help Desk'}
            </h2>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem', color: 'var(--dary-muted)' }}>
              {locale === 'ar'
                ? 'فريق داري هنا لمساعدتك في أي استفسار حول الحجوزات، الدفع، أو السكن.'
                : 'The DARY team is here to help with bookings, payments, or housing inquiries.'}
            </p>
          </div>

          <button
            type="button"
            className="dary-primary-btn"
            style={{ padding: '0.6rem 1.15rem' }}
            onClick={() => {
              setIsNewTicketOpen(true);
              setCreateError(null);
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>{locale === 'ar' ? 'فتح تذكرة جديدة' : 'New Ticket'}</span>
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--dary-muted)' }}>
            <div style={{ width: '36px', height: '36px', border: '3px solid #E2E8F0', borderTopColor: '#0B2A4A', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              {locale === 'ar' ? 'جاري تحميل التذاكر...' : 'Loading tickets...'}
            </p>
          </div>
        ) : error ? (
          <div className="dary-error-state">
            <p className="dary-error-title">{locale === 'ar' ? 'خطأ في جلب البيانات' : 'API Error'}</p>
            <p className="dary-error-desc">{error}</p>
            <button type="button" className="dary-retry-btn" onClick={fetchTickets}>
              {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : tickets.length === 0 ? (
          <div className="dary-empty-state">
            <div className="dary-empty-icon">🎧</div>
            <h4 className="dary-empty-title">{locale === 'ar' ? 'لا توجد تذاكر دعم سابقة' : 'No Support Tickets'}</h4>
            <p className="dary-empty-desc">
              {locale === 'ar'
                ? 'إذا واجهتك أي مشكلة في الحجز أو التواصل، يمكنك فتح تذكرة دعم وسيتولى فريقنا متابعتها على الفور.'
                : 'If you encounter any issues with bookings or accommodations, create a ticket and our team will assist you.'}
            </p>
            <button
              type="button"
              className="dary-primary-btn"
              onClick={() => setIsNewTicketOpen(true)}
            >
              {locale === 'ar' ? 'فتح تذكرة الآن' : 'Create a Ticket'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => handleOpenThread(ticket)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.25rem',
                  border: '1px solid var(--dary-border)',
                  borderRadius: '12px',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  transition: 'border-color 0.2s',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--dary-navy)', fontWeight: 700 }}>
                      {ticket.subject || (locale === 'ar' ? 'تذكرة بدون عنوان' : 'Untitled Ticket')}
                    </h3>
                    {getStatusBadge(ticket.status)}
                    {ticket.category && (
                      <span style={{ fontSize: '0.75rem', backgroundColor: '#F1F5F9', color: '#475569', padding: '0.2rem 0.55rem', borderRadius: '6px' }}>
                        {ticket.category}
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--dary-muted)' }}>
                    {ticket.description?.slice(0, 100) || ''}
                    {ticket.createdAt ? ` • ${new Date(ticket.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')}` : ''}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--dary-blue)', fontSize: '0.85rem', fontWeight: 600 }}>
                  <span>{locale === 'ar' ? 'عرض المحادثة' : 'View Thread'}</span>
                  <span>→</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Ticket Modal */}
      {isNewTicketOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(11, 42, 74, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 60,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 0.4rem', color: 'var(--dary-navy)', fontSize: '1.25rem', fontWeight: 700 }}>
              {locale === 'ar' ? 'فتح تذكرة دعم فني جديدة' : 'Open Support Ticket'}
            </h3>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: 'var(--dary-muted)' }}>
              {locale === 'ar'
                ? 'وضح تفاصيل استفسارك أو المشكلة التي تواجهها لمساعدتك بشكل أسرع.'
                : 'Describe your issue in detail so our support team can assist you effectively.'}
            </p>

            {createError && (
              <div
                style={{
                  padding: '0.65rem 0.9rem',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '8px',
                  color: '#991B1B',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                }}
              >
                {createError}
              </div>
            )}

            {/* Category */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--dary-navy)', marginBottom: '0.4rem' }}>
                {locale === 'ar' ? 'تصنيف المشكلة' : 'Category'}
              </label>
              <select
                value={ticketCategory}
                onChange={(e) => setTicketCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.7rem',
                  borderRadius: '8px',
                  border: '1px solid var(--dary-border)',
                  fontSize: '0.9rem',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <option value="General">{locale === 'ar' ? 'استفسار عام' : 'General'}</option>
                <option value="Booking">{locale === 'ar' ? 'مشكلة في الحجز' : 'Booking'}</option>
                <option value="Payment">{locale === 'ar' ? 'المدفوعات والمستحقات' : 'Payment'}</option>
                <option value="Technical">{locale === 'ar' ? 'مشكلة تقنية' : 'Technical'}</option>
              </select>
            </div>

            {/* Subject */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--dary-navy)' }}>
                  {locale === 'ar' ? 'عنوان الموضوع' : 'Subject'}
                </label>
                <span style={{ fontSize: '0.75rem', color: ticketSubject.trim().length < 3 ? '#DC2626' : 'var(--dary-muted)' }}>
                  {ticketSubject.trim().length} / 3 {locale === 'ar' ? 'أحرف كحد أدنى' : 'chars min'}
                </span>
              </div>
              <input
                type="text"
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                placeholder={locale === 'ar' ? 'اكتب عنوانًا موجزًا للمشكلة (مثال: تأخر تأكيد الحجز)' : 'Brief summary (min 3 chars)...'}
                style={{
                  width: '100%',
                  padding: '0.7rem',
                  borderRadius: '8px',
                  border: '1px solid var(--dary-border)',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            {/* Description */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--dary-navy)' }}>
                  {locale === 'ar' ? 'تفاصيل المشكلة' : 'Description'}
                </label>
                <span style={{ fontSize: '0.75rem', color: ticketDescription.trim().length < 5 ? '#DC2626' : '#16A34A', fontWeight: 600 }}>
                  {ticketDescription.trim().length} / 5 {locale === 'ar' ? 'أحرف كحد أدنى' : 'chars min'}
                </span>
              </div>
              <textarea
                rows={4}
                value={ticketDescription}
                onChange={(e) => setTicketDescription(e.target.value)}
                placeholder={locale === 'ar' ? 'اشرح تفاصيل ما حدث معك بالتفصيل...' : 'Provide full details...'}
                style={{
                  width: '100%',
                  padding: '0.7rem',
                  borderRadius: '8px',
                  border: '1px solid var(--dary-border)',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setIsNewTicketOpen(false)}
                disabled={isCreating}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  border: '1px solid var(--dary-border)',
                  backgroundColor: '#FFFFFF',
                  color: 'var(--dary-navy)',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleCreateTicket}
                disabled={isCreating}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  backgroundColor: 'var(--dary-blue)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                {isCreating
                  ? locale === 'ar'
                    ? 'جاري الإرسال...'
                    : 'Submitting...'
                  : locale === 'ar'
                  ? 'إرسال التذكرة'
                  : 'Submit Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Messages Modal (GET /support-ticket/:id/messages) */}
      {activeTicket && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(11, 42, 74, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 60,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', borderBottom: '1px solid var(--dary-border)', paddingBottom: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <h3 style={{ margin: 0, color: 'var(--dary-navy)', fontSize: '1.2rem', fontWeight: 700 }}>
                    {activeTicket.subject}
                  </h3>
                  {getStatusBadge(activeTicket.status)}
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--dary-muted)' }}>
                  {locale === 'ar' ? 'رقم التذكرة: ' : 'Ticket ID: '} {activeTicket.id}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveTicket(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--dary-muted)' }}
              >
                ✕
              </button>
            </div>

            {/* Original ticket description */}
            {activeTicket.description && (
              <div style={{ backgroundColor: '#F8FAFC', padding: '0.85rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--dary-text)' }}>
                <strong style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--dary-navy)', fontSize: '0.8rem' }}>
                  {locale === 'ar' ? 'وصف المشكلة الأصلي:' : 'Original Issue Description:'}
                </strong>
                {activeTicket.description}
              </div>
            )}

            {/* Messages Thread Container */}
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {loadingMessages ? (
                <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--dary-muted)', fontSize: '0.875rem' }}>
                  {locale === 'ar' ? 'جاري تحميل المحادثة...' : 'Loading messages...'}
                </div>
              ) : messagesError ? (
                <div style={{ padding: '1rem', backgroundColor: '#FEF2F2', color: '#991B1B', borderRadius: '8px', fontSize: '0.85rem' }}>
                  {messagesError}
                </div>
              ) : messages.length === 0 ? (
                <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--dary-muted)', fontSize: '0.875rem' }}>
                  {locale === 'ar' ? 'لا توجد ردود بعد على هذه التذكرة.' : 'No messages yet on this ticket.'}
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      backgroundColor: '#F1F5F9',
                      fontSize: '0.875rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.75rem', color: 'var(--dary-muted)' }}>
                      <strong>{m.senderName || m.senderRole || (locale === 'ar' ? 'الدعم' : 'Support')}</strong>
                      <span>{m.createdAt ? new Date(m.createdAt).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US') : ''}</span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--dary-text)', lineHeight: 1.5 }}>
                      {m.message || m.content}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Message reply box */}
            <div
              style={{
                borderTop: '1px solid var(--dary-border)',
                paddingTop: '0.75rem',
              }}
            >
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!activeTicket || !replyText.trim()) return;
                  setSendingReply(true);
                  setMessagesError(null);
                  try {
                    await TenantService.sendTicketMessage(activeTicket.id, replyText.trim());
                    setReplyText('');
                    const updated = await TenantService.getTicketMessages(activeTicket.id);
                    setMessages(updated);
                  } catch (err: any) {
                    setMessagesError(err?.message || (locale === 'ar' ? 'فشل إرسال الرد' : 'Failed to send reply'));
                  } finally {
                    setSendingReply(false);
                  }
                }}
                style={{ display: 'flex', gap: '0.5rem' }}
              >
                <input
                  type="text"
                  placeholder={locale === 'ar' ? 'اكتب ردك هنا...' : 'Type your reply here...'}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.65rem 0.9rem',
                    borderRadius: '8px',
                    border: '1px solid var(--dary-border)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={sendingReply || !replyText.trim()}
                  className="dary-primary-btn"
                  style={{ padding: '0.65rem 1.25rem', whiteSpace: 'nowrap' }}
                >
                  {sendingReply
                    ? (locale === 'ar' ? 'جاري الإرسال...' : 'Sending...')
                    : (locale === 'ar' ? 'إرسال' : 'Send')}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
