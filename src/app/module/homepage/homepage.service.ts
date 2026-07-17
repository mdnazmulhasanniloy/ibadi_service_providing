import httpStatus from 'http-status';
import prisma from '@app/shared/prisma.js';
import type { Days, Prisma } from '../../../../generated/prisma/index.js';
import AppError from '@app/error/AppError.js';
import pickQuery from '@app/utils/pickQuery.js';
import { paginationHelper } from '@app/helpers/pagination.helpers.js';
import moment from 'moment';
import { dayMap, type Slot } from './homepage.constants.js';

// const getAllHomepage = async (query: Record<string, any>) => {
//   const { filters, pagination } = await pickQuery(query);

//   const {
//     searchTerm,
//     categoryId,
//     experienceOptionId,
//     otherTaskIds,
//     minPrice,
//     maxPrice,
//     date,
//     startTime,
//     endTime,
//   } = filters;

//   /**
//    * ------------------------------------------------
//    * FIND BOOKED PROVIDERS
//    * ------------------------------------------------
//    */

//   let bookedProviderIds: string[] = [];

//   if (date && startTime && endTime) {
//     const requestedStart = new Date(`${date}T${startTime}:00`);

//     const requestedEnd = new Date(`${date}T${endTime}:00`);

//     const bookedDays = await prisma.bookingDays.findMany({
//       where: {
//         startTime: {
//           lt: requestedEnd,
//         },

//         endTime: {
//           gt: requestedStart,
//         },

//         status: {
//           in: ['pending', 'confirmed'],
//         },
//       },

//       include: {
//         booking: true,
//       },
//     });

//     bookedProviderIds = [
//       ...new Set(bookedDays.map(item => item.booking.providerId)),
//     ];
//   }

//   /**
//    * ------------------------------------------------
//    * DYNAMIC WHERE
//    * ------------------------------------------------
//    */

//   const where: Prisma.serviceProviderInfoWhereInput = {
//     user: {
//       role: 'service_provider',
//       status: 'active',
//       isDeleted: false,
//     },
//   };

//   /**
//    * ------------------------------------------------
//    * SEARCH TERM
//    * ------------------------------------------------
//    */

//   if (searchTerm) {
//     where.OR = [
//       {
//         user: {
//           name: {
//             contains: searchTerm,
//             mode: 'insensitive',
//           },
//         },
//       },

//       {
//         qualifiedCarer: {
//           contains: searchTerm,
//           mode: 'insensitive',
//         },
//       },
//     ];
//   }

//   /**
//    * ------------------------------------------------
//    * CATEGORY FILTER
//    * ------------------------------------------------
//    */

//   if (categoryId) {
//     where.specialistsIn = {
//       some: {
//         categoryId,
//       },
//     };
//   }

//   /**
//    * ------------------------------------------------
//    * EXPERIENCE FILTER
//    * ------------------------------------------------
//    */

//   if (experienceOptionId) {
//     where.experienceOptionId = experienceOptionId;
//   }

//   /**
//    * ------------------------------------------------
//    * OTHER TASK FILTER
//    * ------------------------------------------------
//    */

//   if (otherTaskIds) {
//     const taskIds = otherTaskIds.split(',');

//     where.othersRequiredTasks = {
//       some: {
//         othersTaskId: {
//           in: taskIds,
//         },
//       },
//     };
//   }

//   /**
//    * ------------------------------------------------
//    * PRICE FILTER
//    * ------------------------------------------------
//    */

//   if (minPrice || maxPrice) {
//     where.perHourPrice = {};

//     if (minPrice) {
//       where.perHourPrice.gte = Number(minPrice);
//     }

//     if (maxPrice) {
//       where.perHourPrice.lte = Number(maxPrice);
//     }
//   }

//   /**
//    * ------------------------------------------------
//    * EXCLUDE BOOKED PROVIDERS
//    * ------------------------------------------------
//    */

//   if (bookedProviderIds.length > 0) {
//     where.userId = {
//       notIn: bookedProviderIds,
//     };
//   }

//   /**
//    * ------------------------------------------------
//    * PAGINATION
//    * ------------------------------------------------
//    */

//   const { page, limit, skip, sort } =
//     paginationHelper.calculatePagination(pagination);

//   /**
//    * ------------------------------------------------
//    * SORTING
//    * ------------------------------------------------
//    */

//   const orderBy: Prisma.serviceProviderInfoOrderByWithRelationInput[] = sort
//     ? sort.split(',').map(field => {
//         const trimmed = field.trim();

//         if (trimmed.startsWith('-')) {
//           return {
//             [trimmed.slice(1)]: 'desc',
//           };
//         }

//         return {
//           [trimmed]: 'asc',
//         };
//       })
//     : [
//         {
//           createdAt: 'desc',
//         },
//       ];

//   try {
//     /**
//      * ------------------------------------------------
//      * FETCH DATA
//      * ------------------------------------------------
//      */

//     const data = await prisma.serviceProviderInfo.findMany({
//       where,

//       include: {
//         user: true,

//         experience: true,

//         specialistsIn: {
//           include: {
//             category: true,
//           },
//         },

//         othersRequiredTasks: {
//           include: {
//             othersTask: true,
//           },
//         },

//         images: true,
//       },

//       skip,
//       take: limit,
//       orderBy,
//     });

//     /**
//      * ------------------------------------------------
//      * TOTAL COUNT
//      * ------------------------------------------------
//      */

//     const total = await prisma.serviceProviderInfo.count({
//       where,
//     });

//     /**
//      * ------------------------------------------------
//      * RETURN
//      * ------------------------------------------------
//      */

//     return {
//       data,

//       meta: {
//         page,
//         limit,
//         total,
//       },
//     };
//   } catch (error: any) {
//     throw new AppError(
//       httpStatus.BAD_REQUEST,
//       error?.message || 'Failed to fetch homepage data',
//     );
//   }
// };

const getDayName = (date: Date): Days => {
  const days: Days[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()] as Days;
};

/**
 * Maps the "flexible" time slot strings from the UI (e.g. "9-6", "9-12",
 * "12-15", "15-18", "18-21", "21-00") to { startHour, endHour } pairs so we
 * can build a proper DateTime range for the query.
 *
 * "21-00" wraps past midnight → endHour = 24 for simplicity.
 */
const resolveFlexibleSlot = (
  slot: string,
): { startHour: number; endHour: number } | null => {
  const slotMap: Record<string, { startHour: number; endHour: number }> = {
    '9-6': { startHour: 9, endHour: 18 }, // morning wide
    '9-12': { startHour: 9, endHour: 12 },
    '12-15': { startHour: 12, endHour: 15 },
    '15-18': { startHour: 15, endHour: 18 },
    '18-21': { startHour: 18, endHour: 21 },
    '21-00': { startHour: 21, endHour: 24 },
  };
  return slotMap[slot] ?? null;
};

const getAllHomepage = async (query: Record<string, any>) => {
  const { filters, pagination } = await pickQuery(query);

  const {
    searchTerm,
    // booking type
    bookingType, // "one_time" | "weekly"
    // date / day scheduling
    date, // "YYYY-MM-DD"   (one_time)
    days, // "Mon,Wed,Fri"  (weekly)
    // start-time variants
    startTimeType, // "flexible" | "exact"
    flexibleSlot, // "9-12" etc.
    startTime, // "HH:mm"        (exact)
    endTime, // "HH:mm"        (exact)
    duration, // number of hours (slider)
    // provider filters
    categoryId,
    categoryIds,
    experienceOptionId,
    otherTaskIds,
    minPrice,
    maxPrice,
    qualifiedCarer,
    palliativeCare,
    drivingLicense,
    businessProfiles,
  } = filters;

  // ─────────────────────────────────────────
  // STEP 1 – resolve requested time window(s)
  // ─────────────────────────────────────────

  /**
   * Each entry represents one time-window the provider must be available for.
   * For one_time → single window on `date`.
   * For weekly   → one window per selected day (all in the same week or
   *                relative – we use a reference Monday for comparison).
   */
  type TimeWindow = { dayName: Days; start: Date; end: Date };
  const requestedWindows: TimeWindow[] = [];

  const durationHours = duration ? Number(duration) : 0;

  // helper: build a Date from a base date string + hour + minute
  const buildDateTime = (dateStr: string, hour: number, minute = 0): Date => {
    const d = new Date(dateStr);
    d.setHours(hour, minute, 0, 0);
    return d;
  };

  // helper: parse "HH:mm" → { hour, minute }
  const parseHHmm = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return { hour: h, minute: m ?? 0 };
  };

  // reference date for weekly (we use a fixed Monday so DB comparisons work)
  // Alternatively you can use the actual upcoming occurrence – here we keep it
  // simple and store schedule times in DB as hour-of-day on a fixed date.
  const WEEKLY_REF_DATE = '2000-01-03'; // a Monday

  const weeklyDayOffset: Record<Days, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };

  const getWeeklyDateStr = (day: Days): string => {
    const base = new Date(WEEKLY_REF_DATE);
    base.setDate(base.getDate() + weeklyDayOffset[day]);
    return base.toISOString().split('T')[0] as string;
  };

  const buildWindowsForDate = (dateStr: string): TimeWindow | null => {
    const dayName = getDayName(new Date(dateStr));

    if (startTimeType === 'flexible' && flexibleSlot) {
      const slot = resolveFlexibleSlot(flexibleSlot);
      if (!slot) return null;
      const start = buildDateTime(dateStr, slot.startHour);
      // end = slot end OR slot start + duration, whichever is smaller
      const slotEnd = buildDateTime(dateStr, slot.endHour);
      const durationEnd = durationHours
        ? buildDateTime(dateStr, slot.startHour + durationHours)
        : slotEnd;
      const end = durationEnd < slotEnd ? durationEnd : slotEnd;
      return { dayName, start, end };
    }

    if (startTimeType === 'exact' && startTime) {
      const { hour: sh, minute: sm } = parseHHmm(startTime);
      const start = buildDateTime(dateStr, Number(sh), sm);
      let end: Date;

      if (endTime) {
        const { hour: eh, minute: em } = parseHHmm(endTime);
        end = buildDateTime(dateStr, Number(eh), em);
      } else if (durationHours) {
        end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
      } else {
        // no end info – just use start (will skip time-slot filtering)
        return null;
      }
      return { dayName, start, end };
    }

    return null; // no start-time info provided
  };

  if (bookingType === 'one_time' && date) {
    const w = buildWindowsForDate(date);
    if (w) requestedWindows.push(w);
  } else if (bookingType === 'weekly' && days) {
    const selectedDays = (days as string)
      .split(',')
      .map(d => d.trim()) as Days[];

    for (const day of selectedDays) {
      const dateStr = getWeeklyDateStr(day);
      const w = buildWindowsForDate(dateStr);
      if (w) requestedWindows.push(w);
    }
  }

  // ─────────────────────────────────────────
  // STEP 2 – find available provider IDs
  // ─────────────────────────────────────────

  let availableProviderIds: string[] | null = null; // null = no time filter

  if (requestedWindows.length > 0) {
    // For each window:
    //  a) find booked provider IDs (overlapping confirmed/pending bookings)
    //  b) find providers whose work-schedule covers the window
    //  c) intersect

    // We need providers available in ALL requested windows (AND logic for weekly).
    let candidateIds: Set<string> | null = null;

    for (const window of requestedWindows) {
      // ── a) booked provider IDs for this window ──
      const bookedDays = await prisma.bookingDays.findMany({
        where: {
          startTime: { lt: window.end },
          endTime: { gt: window.start },
          status: { in: ['pending', 'confirmed'] },
        },
        include: { booking: { select: { providerId: true } } },
      });

      const bookedIds = new Set(bookedDays.map(bd => bd.booking.providerId));

      // ── b) providers whose schedule covers this window ──
      const matchedSchedules = await prisma.workSchedule.findMany({
        where: {
          day: window.dayName,
          status: true,
          startTime: { lte: window.start },
          endTime: { gte: window.end },
          userId: { notIn: [...bookedIds] },
        },
        select: { userId: true },
      });

      const windowAvailable = new Set(matchedSchedules.map(s => s.userId));

      // ── c) intersect with running candidate set ──
      if (candidateIds === null) {
        candidateIds = windowAvailable;
      } else {
        // keep only providers available in every window
        for (const id of candidateIds) {
          if (!windowAvailable.has(id)) candidateIds.delete(id);
        }
      }
    }

    availableProviderIds = candidateIds ? [...candidateIds] : [];
  }

  // ─────────────────────────────────────────
  // STEP 3 – build Prisma WHERE
  // ─────────────────────────────────────────

  const where: Prisma.serviceProviderInfoWhereInput = {
    user: {
      role: 'service_provider',
      status: 'active',
      isDeleted: false,
    },
  };

  // ── available provider IDs (time filter) ──
  if (availableProviderIds !== null) {
    where.userId = { in: availableProviderIds };
  }

  // ── search term ──
  if (searchTerm) {
    where.OR = [
      { user: { name: { contains: searchTerm, mode: 'insensitive' } } },
      { qualifiedCarer: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  // ── category / specialists-in (single OR multi-checkbox) ──
  const allCategoryIds: string[] = [];
  if (categoryId) allCategoryIds.push(categoryId as string);
  if (categoryIds) {
    (categoryIds as string)
      .split(',')
      .map(id => id.trim())
      .filter(Boolean)
      .forEach(id => allCategoryIds.push(id));
  }
  if (allCategoryIds.length > 0) {
    where.specialistsIn = {
      some: { categoryId: { in: allCategoryIds } },
    };
  }

  // ── experience option ──
  if (experienceOptionId) {
    where.experienceOptionId = experienceOptionId as string;
  }

  // ── other required tasks (multi-checkbox) ──
  if (otherTaskIds) {
    const taskIds = (otherTaskIds as string).split(',').map(id => id.trim());
    where.othersRequiredTasks = {
      some: { othersTaskId: { in: taskIds } },
    };
  }

  // ── price range ──
  if (minPrice || maxPrice) {
    where.perHourPrice = {};
    if (minPrice) where.perHourPrice.gte = Number(minPrice);
    if (maxPrice) where.perHourPrice.lte = Number(maxPrice);
  }

  // ── qualified carer toggle ──
  if (qualifiedCarer === 'true') {
    // qualifiedCarer is stored as a string in the schema
    where.qualifiedCarer = { not: null };
  }

  // ── palliative care toggle ──
  if (palliativeCare === 'true') {
    where.palliativeCare = { not: null };
  }

  // ── driving licence toggle ──
  if (drivingLicense === 'true') {
    where.drivingLicense = { not: null };
  }

  // ── business profiles toggle ──
  if (businessProfiles === 'true') {
    where.businessProfiles = { not: null };
  }

  // ─────────────────────────────────────────
  // STEP 4 – pagination & sorting
  // ─────────────────────────────────────────

  const { page, limit, skip, sort } =
    paginationHelper.calculatePagination(pagination);

  const orderBy: Prisma.serviceProviderInfoOrderByWithRelationInput[] = sort
    ? (sort as string).split(',').map(field => {
        const trimmed = field.trim();
        if (trimmed.startsWith('-')) {
          return {
            [trimmed.slice(1)]: 'desc',
          } as Prisma.serviceProviderInfoOrderByWithRelationInput;
        }
        return {
          [trimmed]: 'asc',
        } as Prisma.serviceProviderInfoOrderByWithRelationInput;
      })
    : [{ createdAt: 'desc' }];

  // ─────────────────────────────────────────
  // STEP 5 – fetch & return
  // ─────────────────────────────────────────

  try {
    const [data, total] = await Promise.all([
      prisma.serviceProviderInfo.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true,
              profile: true,
              location: true,
              totalReview: true,
              avgRating: true,
              _count: {
                select: {
                  providerBookings: {
                    where: {
                      isPaid: true,
                    },
                  },
                },
              },
            },
          },

          experience: true,
          specialistsIn: { include: { category: true } },
          othersRequiredTasks: { include: { othersTask: true } },
          images: true,
        },
        skip,
        take: limit,
        orderBy,
      }),
      prisma.serviceProviderInfo.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total },
    };
  } catch (error: any) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      error?.message || 'Failed to fetch homepage data',
    );
  }
};

const getAvailableSlots = async (payload: {
  providerId: string;
  date: Date;
  slotDuration: number;
}) => {
  const { providerId, date, slotDuration } = payload;

  // 👉 requested day (IMPORTANT)
  const baseDate = moment.utc(date).startOf('day');

  const day = dayMap[baseDate.day()];

  // 1. Get work schedules
  const schedules = await prisma.workSchedule.findMany({
    where: {
      userId: providerId,
      day,
      status: true,
    },
  });

  if (!schedules.length) return [];

  // 2. Get booked slots for that day
  const booked = await prisma.bookingDays.findMany({
    where: {
      booking: { providerId },
      startTime: {
        gte: baseDate.clone().startOf('day').toDate(),
        lte: baseDate.clone().endOf('day').toDate(),
      },
      status: { not: 'canceled' },
    },
  });

  const bookedSlots = booked.map(b => ({
    start: moment.utc(b.startTime),
    end: moment.utc(b.endTime),
  }));

  let availableSlots: Slot[] = [];

  // 3. Generate slots properly
  for (const s of schedules) {
    const startTime = moment.utc(s.startTime);
    const endTime = moment.utc(s.endTime);

    // 👉 merge schedule time with requested date (CRITICAL FIX)
    let cursor = baseDate
      .clone()
      .hour(startTime.hour())
      .minute(startTime.minute())
      .second(0);

    const end = baseDate
      .clone()
      .hour(endTime.hour())
      .minute(endTime.minute())
      .second(0);

    while (cursor.clone().add(slotDuration, 'minutes').isSameOrBefore(end)) {
      const slotStart = cursor.clone();
      const slotEnd = cursor.clone().add(slotDuration, 'minutes');

      const isOverlapping = bookedSlots.some(
        b => slotStart.isBefore(b.end) && slotEnd.isAfter(b.start),
      );

      if (!isOverlapping) {
        availableSlots.push({
          start: slotStart.toDate(),
          end: slotEnd.toDate(),
        });
      }

      cursor.add(slotDuration, 'minutes');
    }
  }

  return availableSlots;
};

export const homepageService = {
  getAllHomepage,
  getAvailableSlots,
};
