import { ApiClient } from './apiClient';
import { BookingService } from './bookingService';
import type { Property } from '../types/property';

// ── In-Memory & Session Storage Booking Cache ───────────────────────────────
const propertyBookingsCache = new Map<string, any[]>();
let hasFetchedGlobalBookings = false;

export function getCachedPropertyBookings(propertyId: string): any[] {
  if (!propertyId) return [];
  const inMem = propertyBookingsCache.get(String(propertyId));
  if (inMem && inMem.length > 0) return inMem;

  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem(`dary_prop_bookings_${propertyId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          propertyBookingsCache.set(String(propertyId), parsed);
          return parsed;
        }
      }
    } catch {}
  }
  return [];
}

export function cachePropertyBookings(propertyId: string, bookings: any[]): void {
  if (!propertyId || !Array.isArray(bookings)) return;
  propertyBookingsCache.set(String(propertyId), bookings);
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(`dary_prop_bookings_${propertyId}`, JSON.stringify(bookings));
    } catch {}
  }
}

/**
 * Proactively fetch all active bookings across the platform so that regular users
 * exploring properties in PropertiesPage and HomePage can see exact booking dates.
 */
export async function fetchGlobalActiveBookings(): Promise<void> {
  if (hasFetchedGlobalBookings) return;
  hasFetchedGlobalBookings = true;

  const candidateFetchers = [
    () => ApiClient.get<any>('/dashboard/bookings?limit=100'),
    () => BookingService.getAllBookings({ limit: 100 }),
    () => ApiClient.get<any>('/booking?limit=100'),
    () => ApiClient.get<any>('/bookings?limit=100'),
    () => ApiClient.get<any>('/dashboard/booking/calendar?limit=100'),
  ];

  for (const fetcher of candidateFetchers) {
    try {
      const res = await fetcher();
      const list: any[] =
        (Array.isArray(res?.data?.bookings) ? res.data.bookings : null) ||
        (Array.isArray(res?.data?.data) ? res.data.data : null) ||
        (Array.isArray(res?.data) ? res.data : null) ||
        (Array.isArray(res?.bookings) ? res.bookings : null) ||
        (Array.isArray(res?.items) ? res.items : null) ||
        (Array.isArray(res) ? res : []);

      if (list.length > 0) {
        // Group by propertyId
        const grouped = new Map<string, any[]>();
        for (const bk of list) {
          const pId = String(bk.propertyId || bk.property_id || bk.property?.id || '');
          if (pId) {
            const arr = grouped.get(pId) || [];
            arr.push(bk);
            grouped.set(pId, arr);
          }
        }

        grouped.forEach((bks, pId) => {
          cachePropertyBookings(pId, bks);
        });
        return;
      }
    } catch {
      // Continue to next candidate
    }
  }
}

// ── Date Formatting Utilities ───────────────────────────────────────────────

/**
 * Formats a date into a localized string (e.g. "٢٧/٩/٢٠٢٦" for Arabic or "27/9/2026" for English)
 */
export function formatOccupancyDate(dateStr?: string | Date, loc: 'ar' | 'en' = 'ar'): string {
  if (!dateStr) return '';
  try {
    const s = String(dateStr).trim();

    // Pattern: MM/YYYY or MM-YYYY (e.g. 06/2027)
    const mmYyyy = s.match(/^(\d{1,2})[-/.](\d{4})$/);
    if (mmYyyy) {
      const month = parseInt(mmYyyy[1], 10);
      const year = parseInt(mmYyyy[2], 10);
      if (month >= 1 && month <= 12) {
        const d = new Date(year, month - 1, 1);
        return d.toLocaleDateString(loc === 'ar' ? 'ar-EG' : 'en-US', {
          year: 'numeric',
          month: 'numeric',
        });
      }
    }

    // Pattern: YYYY/MM or YYYY-MM (e.g. 2027-06)
    const yyyyMm = s.match(/^(\d{4})[-/.](\d{1,2})$/);
    if (yyyyMm) {
      const year = parseInt(yyyyMm[1], 10);
      const month = parseInt(yyyyMm[2], 10);
      if (month >= 1 && month <= 12) {
        const d = new Date(year, month - 1, 1);
        return d.toLocaleDateString(loc === 'ar' ? 'ar-EG' : 'en-US', {
          year: 'numeric',
          month: 'numeric',
        });
      }
    }

    // Pattern: DD/MM/YYYY or DD-MM-YYYY
    const ddMmYyyy = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (ddMmYyyy) {
      const day = parseInt(ddMmYyyy[1], 10);
      const month = parseInt(ddMmYyyy[2], 10);
      const year = parseInt(ddMmYyyy[3], 10);
      const d = new Date(year, month - 1, day);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString(loc === 'ar' ? 'ar-EG' : 'en-US', {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
        });
      }
    }

    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString(loc === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
  } catch {
    return String(dateStr);
  }
}

/**
 * Extracts date ranges from descriptions (e.g. "فترة الإتاحة: من 08/2026 إلى 06/2027")
 */
export function extractDatesFromText(text?: string): { from?: string; until?: string } {
  if (!text || typeof text !== 'string') return {};
  let from: string | undefined;
  let until: string | undefined;

  const dateToken = String.raw`(?:\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{4}|\d{4}[-/.]\d{1,2}|\d{4})`;

  const rangeRegex = new RegExp(
    String.raw`(?:فترة\s*الإتاحة\s*[:]?\s*)?(?:من|from)\s*[:]?\s*(${dateToken})\s*(?:إلى|الى|حتى|لغاية|to|until)\s*[:]?\s*(${dateToken})`,
    'i'
  );
  const rangeMatch = text.match(rangeRegex);
  if (rangeMatch) {
    from = rangeMatch[1].trim();
    until = rangeMatch[2].trim();
  } else {
    const untilRegex = new RegExp(
      String.raw`(?:حتى|لغاية|ينتهي\s*في|إلى\s*غاية|until|to)\s*[:]?\s*(${dateToken})`,
      'i'
    );
    const untilMatch = text.match(untilRegex);
    if (untilMatch) {
      until = untilMatch[1].trim();
    }
    const fromRegex = new RegExp(
      String.raw`(?:بدءاً\s*من|بدءا\s*من|متاح\s*من|من|from)\s*[:]?\s*(${dateToken})`,
      'i'
    );
    const fromMatch = text.match(fromRegex);
    if (fromMatch && !from) {
      from = fromMatch[1].trim();
    }
  }

  if (!until) {
    const arabicMonthRegex = /(?:حتى|إلى|الى|نهاية)\s*(?:شهر\s*)?(يناير|فبراير|مارس|أبريل|ابريل|مايو|يونيو|يوليو|أغسطس|اغسطس|سبتمبر|أكتوبر|اكتوبر|نوفمبر|ديسمبر)\s*(\d{4})?/i;
    const mMatch = text.match(arabicMonthRegex);
    if (mMatch) {
      until = mMatch[0].trim();
    }
  }

  return { from, until };
}

// ── Room & Property Occupancy Interfaces ───────────────────────────────────

export interface RoomOccupancySchedule {
  isFullyBooked: boolean;
  isPartiallyBooked: boolean;
  isAvailable: boolean;
  availableBeds: number;
  totalBeds: number;
  startDate?: string;
  endDate?: string;
  startFormatted?: string;   // e.g. "٢٧/٩/٢٠٢٦"
  endFormatted?: string;     // e.g. "٢٧/١٢/٢٠٢٦"
  rangeDisplay?: string;     // e.g. "٢٧/٩/٢٠٢٦ ↓ ٢٧/١٢/٢٠٢٦"
  vacatingDate?: string;     // e.g. "٢٧/١٢/٢٠٢٦"
  badgeText: string;
  badgeType: 'occupied' | 'partial' | 'available' | 'upcoming';
  subNote?: string;
  vacancyTimingText: string;
  vacancyNotice: string;
}

export interface PropertyOccupancySummary {
  hasActiveBooking: boolean;
  isFullyBooked: boolean;
  isPartiallyBooked: boolean;
  isAvailable: boolean;
  totalBeds: number;
  availableBeds: number;
  startDate?: string;
  endDate?: string;
  startFormatted?: string;   // e.g. "٢٧/٩/٢٠٢٦"
  endFormatted?: string;     // e.g. "٢٧/١٢/٢٠٢٦"
  rangeDisplay?: string;     // e.g. "٢٧/٩/٢٠٢٦ ↓ ٢٧/١٢/٢٠٢٦"
  vacatingDate?: string;     // e.g. "٢٧/١٢/٢٠٢٦"
  badgeText: string;
  badgeType: 'occupied' | 'partial' | 'available' | 'upcoming';
  timingNotice: string;
}

/**
 * Calculates complete occupancy and vacancy schedule for a specific room.
 */
export function getRoomOccupancySchedule(
  room: any,
  loc: 'ar' | 'en' = 'ar',
  property?: any,
  customBookings?: any[]
): RoomOccupancySchedule {
  const availableBeds = Number(room?.availableBeds ?? 0);
  const totalBeds = Number(room?.totalBeds ?? 1);
  const isFull = availableBeds <= 0 || room?.status === 'FULL';
  const isPartial = availableBeds > 0 && availableBeds < totalBeds;

  let untilDate = room?.occupiedUntil || room?.occupied_until || room?.endDate || room?.end_date;
  let fromDate = room?.availableFrom || room?.available_from || room?.startDate || room?.start_date;

  // Pool candidate bookings
  const candidateBookings: any[] = [];
  if (Array.isArray(customBookings) && customBookings.length > 0) {
    candidateBookings.push(...customBookings);
  }
  if (property?.id) {
    candidateBookings.push(...getCachedPropertyBookings(property.id));
  }
  if (Array.isArray(room?.bookings)) {
    candidateBookings.push(...room.bookings);
  }
  if (Array.isArray(property?.bookings)) {
    candidateBookings.push(...property.bookings);
  }

  // Find active booking matching this room
  const activeBks = candidateBookings.filter((b: any) => {
    const matchRoom =
      !room?.id ||
      String(b.roomId || b.room_id || b.room?.id || '') === String(room.id);
    const st = String(b.status || '').toUpperCase();
    if (st === 'CANCELLED' || st === 'REJECTED') return false;
    const end = b.endDate || b.end_date || b.moveOutDate;
    return matchRoom && end && new Date(end).getTime() > Date.now();
  });

  if (activeBks.length > 0) {
    activeBks.sort(
      (a, b) =>
        new Date(a.endDate || a.end_date || a.moveOutDate).getTime() -
        new Date(b.endDate || b.end_date || b.moveOutDate).getTime()
    );
    const primaryBk = activeBks[0];
    untilDate = primaryBk.endDate || primaryBk.end_date || primaryBk.moveOutDate;
    if (!fromDate) {
      fromDate = primaryBk.startDate || primaryBk.start_date || primaryBk.moveInDate;
    }
  }

  // Fallback to property-level occupiedUntil / endDate
  if (!untilDate && property) {
    untilDate =
      property.occupiedUntil ||
      property.occupied_until ||
      property.endDate ||
      property.end_date ||
      property.availableTo ||
      property.available_to;
  }

  // Fallback: extract from description
  if (!untilDate && property?.description) {
    const desc = property.description as any;
    const descText =
      typeof desc === 'object' && desc !== null
        ? desc.ar || desc.en || ''
        : String(desc || '');
    const textDates = extractDatesFromText(descText);
    if (textDates.until) untilDate = textDates.until;
    if (!fromDate && textDates.from) fromDate = textDates.from;
  }

  const startFormatted = fromDate ? formatOccupancyDate(fromDate, loc) : undefined;
  const endFormatted = untilDate ? formatOccupancyDate(untilDate, loc) : undefined;
  const rangeDisplay =
    startFormatted && endFormatted
      ? `${startFormatted} ↓ ${endFormatted}`
      : endFormatted
      ? endFormatted
      : undefined;

  // Determine standard academic estimated period if no exact date is found
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const academicEndYear = currentMonth >= 9 ? currentYear + 1 : currentYear;
  const estimatedAcademicEnd =
    loc === 'ar'
      ? `يونيو ${academicEndYear} (نهاية العام الدراسي)`
      : `June ${academicEndYear} (End of Academic Year)`;

  if (isFull) {
    if (endFormatted) {
      return {
        isFullyBooked: true,
        isPartiallyBooked: false,
        isAvailable: false,
        availableBeds: 0,
        totalBeds,
        startDate: fromDate,
        endDate: untilDate,
        startFormatted,
        endFormatted,
        rangeDisplay,
        vacatingDate: endFormatted,
        badgeType: 'occupied',
        badgeText:
          loc === 'ar'
            ? `🔒 محجوزة حتى ${endFormatted}`
            : `🔒 Booked until ${endFormatted}`,
        subNote:
          loc === 'ar'
            ? `ستكون الغرفة متاحة للشغور والحجز بدءاً من ${endFormatted}`
            : `Room is expected to become available starting ${endFormatted}`,
        vacancyTimingText:
          loc === 'ar' ? `ستفضى في: ${endFormatted}` : `Available from: ${endFormatted}`,
        vacancyNotice:
          loc === 'ar'
            ? `هذه الغرفة محجوزة بالكامل في الوقت الحالي ${
                startFormatted ? `(فترة الحجز: ${startFormatted} ↓ ${endFormatted})` : ''
              }، وستفضى وتكون متاحة للحجز مرة أخرى في ${endFormatted}.`
            : `This room is fully booked at this time ${
                startFormatted ? `(Period: ${startFormatted} ↓ ${endFormatted})` : ''
              } and will be vacant and available for booking starting ${endFormatted}.`,
      };
    }

    return {
      isFullyBooked: true,
      isPartiallyBooked: false,
      isAvailable: false,
      availableBeds: 0,
      totalBeds,
      vacatingDate: estimatedAcademicEnd,
      badgeType: 'occupied',
      badgeText: loc === 'ar' ? '🔒 ممتلئة بالكامل حالياً' : '🔒 Currently Fully Booked',
      subNote:
        loc === 'ar'
          ? `متوقع الشغور مع ${estimatedAcademicEnd}`
          : `Expected vacancy by ${estimatedAcademicEnd}`,
      vacancyTimingText:
        loc === 'ar'
          ? `المتوقع أن تفضى في: ${estimatedAcademicEnd}`
          : `Estimated to be vacant by: ${estimatedAcademicEnd}`,
      vacancyNotice:
        loc === 'ar'
          ? `الغرفة محجوزة بالكامل حالياً، وعقود الطلاب تمتد عادة للعام الدراسي بالكامل (من المتوقع أن تفضى في ${estimatedAcademicEnd}). يمكنك التواصل مع المالك لمعرفة الموعد الدقيق للشغور أو مراجعة الغرف الأخرى.`
          : `This room is fully booked; student leases typically conclude at the end of the academic year (expected vacancy: ${estimatedAcademicEnd}). Contact the owner for exact dates.`,
    };
  }

  if (isPartial) {
    if (endFormatted) {
      return {
        isFullyBooked: false,
        isPartiallyBooked: true,
        isAvailable: true,
        availableBeds,
        totalBeds,
        startDate: fromDate,
        endDate: untilDate,
        startFormatted,
        endFormatted,
        rangeDisplay,
        vacatingDate: endFormatted,
        badgeType: 'partial',
        badgeText:
          loc === 'ar'
            ? `⚠️ متاح ${availableBeds} من ${totalBeds} أسرّة`
            : `⚠️ ${availableBeds} of ${totalBeds} beds available`,
        subNote:
          loc === 'ar'
            ? `السرير الآخر محجوز حتى ${endFormatted}`
            : `Other bed occupied until ${endFormatted}`,
        vacancyTimingText:
          loc === 'ar'
            ? `السرير الآخر سيفضى في: ${endFormatted}`
            : `Other bed vacating: ${endFormatted}`,
        vacancyNotice:
          loc === 'ar'
            ? `السرير الآخر محجوز حالياً ${
                startFormatted ? `(${startFormatted} ↓ ${endFormatted})` : ''
              } وسيفضى في ${endFormatted}، بينما السرير الحالي شاغر ومتاح للحجز الفوري الآن!`
            : `The other bed is occupied until ${endFormatted}, while this bed is vacant and ready for immediate booking now!`,
      };
    }

    return {
      isFullyBooked: false,
      isPartiallyBooked: true,
      isAvailable: true,
      availableBeds,
      totalBeds,
      vacatingDate: estimatedAcademicEnd,
      badgeType: 'partial',
      badgeText:
        loc === 'ar'
          ? `⚠️ متاح ${availableBeds} من ${totalBeds} أسرّة`
          : `⚠️ ${availableBeds} of ${totalBeds} beds available`,
      subNote:
        loc === 'ar'
          ? `السرير المحجوز سيفضى مع ${estimatedAcademicEnd}`
          : `Booked bed vacating by ${estimatedAcademicEnd}`,
      vacancyTimingText:
        loc === 'ar'
          ? `السرير الآخر متوقع أن يفضى في: ${estimatedAcademicEnd}`
          : `Other bed estimated to be vacant by: ${estimatedAcademicEnd}`,
      vacancyNotice:
        loc === 'ar'
          ? `يوجد سرير محجوز في هذه الغرفة (من المتوقع أن يفضى مع ${estimatedAcademicEnd})، بينما السرير المتبقي شاغر وجاهز للحجز الفوري الآن قبل اكتمال العدد.`
          : `One bed is occupied (estimated to vacate by ${estimatedAcademicEnd}); the remaining bed is vacant and available for immediate booking.`,
    };
  }

  // Room is fully available
  return {
    isFullyBooked: false,
    isPartiallyBooked: false,
    isAvailable: true,
    availableBeds,
    totalBeds,
    badgeType: 'available',
    badgeText: loc === 'ar' ? '✓ متاح للحجز الفوري' : '✓ Available for Booking',
    vacancyTimingText: loc === 'ar' ? 'شاغر ومتاح الآن' : 'Vacant and Available Now',
    vacancyNotice:
      loc === 'ar'
        ? `هذه الغرفة شاغرة بالكامل وجاهزة للحجز الفوري لكافة الأسرة (${availableBeds} أسرّة متاحة).`
        : `This room is fully available and ready for immediate booking (${availableBeds} beds available).`,
  };
}

/**
 * Calculates high-level occupancy summary for a property card (used on PropertiesPage & HomePage).
 */
export function getPropertyOccupancySummary(
  property: Property,
  customBookings?: any[],
  loc: 'ar' | 'en' = 'ar'
): PropertyOccupancySummary {
  const rooms = property?.rooms_ || [];
  let totalBeds = 0;
  let availableBeds = 0;

  for (const r of rooms) {
    const tb = Number(r.totalBeds ?? 1);
    const ab = Number(r.availableBeds ?? (r.status === 'FULL' ? 0 : tb));
    totalBeds += tb;
    availableBeds += Math.max(0, ab);
  }

  if (totalBeds === 0) totalBeds = Number(property.bedrooms || 1);

  const statusStr = String(property?.status || '').toUpperCase();
  const isPropertyStatusBooked =
    statusStr === 'RENTED' || statusStr === 'OCCUPIED' || statusStr === 'BOOKED';

  const isFullyBooked =
    isPropertyStatusBooked ||
    (rooms.length > 0
      ? rooms.every((r) => Number(r.availableBeds) <= 0 || r.status === 'FULL')
      : false);

  const isPartiallyBooked = !isFullyBooked && availableBeds > 0 && availableBeds < totalBeds;

  // Check all room schedules to aggregate earliest vacancy and active booking period
  let earliestUntil: number | undefined;
  let matchingStart: string | undefined;
  let matchingEnd: string | undefined;

  for (const r of rooms) {
    const s = getRoomOccupancySchedule(r, loc, property, customBookings);
    if (s.endDate) {
      const t = new Date(s.endDate).getTime();
      if (!isNaN(t) && t > Date.now()) {
        if (!earliestUntil || t < earliestUntil) {
          earliestUntil = t;
          matchingStart = s.startDate;
          matchingEnd = s.endDate;
        }
      }
    }
  }

  // Also check property-level bookings directly
  const candidateBookings: any[] = [];
  if (Array.isArray(customBookings)) candidateBookings.push(...customBookings);
  if (property.id) candidateBookings.push(...getCachedPropertyBookings(property.id));
  if (Array.isArray(property.bookings)) candidateBookings.push(...property.bookings);

  for (const b of candidateBookings) {
    const st = String(b.status || '').toUpperCase();
    if (st === 'CANCELLED' || st === 'REJECTED') continue;
    const end = b.endDate || b.end_date || b.moveOutDate;
    if (end) {
      const t = new Date(end).getTime();
      if (!isNaN(t) && t > Date.now()) {
        if (!earliestUntil || t < earliestUntil) {
          earliestUntil = t;
          matchingStart = b.startDate || b.start_date || b.moveInDate;
          matchingEnd = end;
        }
      }
    }
  }

  // Fallback: description extraction
  if (!matchingEnd && property.description) {
    const desc = property.description as any;
    const descText =
      typeof desc === 'object' && desc !== null
        ? desc.ar || desc.en || ''
        : String(desc || '');
    const textDates = extractDatesFromText(descText);
    if (textDates.until) {
      matchingEnd = textDates.until;
      matchingStart = textDates.from;
    }
  }

  const startFormatted = matchingStart ? formatOccupancyDate(matchingStart, loc) : undefined;
  const endFormatted = matchingEnd ? formatOccupancyDate(matchingEnd, loc) : undefined;
  const rangeDisplay =
    startFormatted && endFormatted
      ? `${startFormatted} ↓ ${endFormatted}`
      : endFormatted
      ? endFormatted
      : undefined;

  const hasActiveBooking = Boolean(matchingEnd || rangeDisplay);

  if (isFullyBooked) {
    return {
      hasActiveBooking: true,
      isFullyBooked: true,
      isPartiallyBooked: false,
      isAvailable: false,
      totalBeds,
      availableBeds: 0,
      startDate: matchingStart,
      endDate: matchingEnd,
      startFormatted,
      endFormatted,
      rangeDisplay,
      vacatingDate: endFormatted,
      badgeType: 'occupied',
      badgeText: endFormatted
        ? loc === 'ar'
          ? `🔒 محجوز حتى ${endFormatted}`
          : `🔒 Booked until ${endFormatted}`
        : loc === 'ar'
        ? '🔒 محجوز بالكامل'
        : '🔒 Fully Booked',
      timingNotice: endFormatted
        ? loc === 'ar'
          ? `فترة الحجز: ${rangeDisplay || endFormatted} (سيفضى في ${endFormatted})`
          : `Booked: ${rangeDisplay || endFormatted} (Vacating ${endFormatted})`
        : loc === 'ar'
        ? 'محجوز بالكامل حالياً'
        : 'Currently Fully Booked',
    };
  }

  if (isPartiallyBooked) {
    return {
      hasActiveBooking,
      isFullyBooked: false,
      isPartiallyBooked: true,
      isAvailable: true,
      totalBeds,
      availableBeds,
      startDate: matchingStart,
      endDate: matchingEnd,
      startFormatted,
      endFormatted,
      rangeDisplay,
      vacatingDate: endFormatted,
      badgeType: 'partial',
      badgeText:
        loc === 'ar'
          ? `⚠️ متاح ${availableBeds} من ${totalBeds} أسرّة`
          : `⚠️ ${availableBeds} of ${totalBeds} beds available`,
      timingNotice: endFormatted
        ? loc === 'ar'
          ? `السرير الآخر محجوز: ${rangeDisplay || endFormatted} (سيفضى في ${endFormatted})`
          : `Other bed booked: ${rangeDisplay || endFormatted} (Vacating ${endFormatted})`
        : loc === 'ar'
        ? `متاح ${availableBeds} من ${totalBeds} أسرّة`
        : `${availableBeds} of ${totalBeds} beds available`,
    };
  }

  return {
    hasActiveBooking,
    isFullyBooked: false,
    isPartiallyBooked: false,
    isAvailable: true,
    totalBeds,
    availableBeds,
    badgeType: 'available',
    badgeText: loc === 'ar' ? '✓ متاح للحجز الفوري' : '✓ Available Now',
    timingNotice: loc === 'ar' ? 'شاغر ومتاح للحجز الفوري الآن' : 'Vacant & Ready for Booking',
  };
}
