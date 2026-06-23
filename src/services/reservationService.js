import { addDays, format, isBefore, isSameMonth, isWithinInterval, parseISO, startOfDay } from 'date-fns';

const STORAGE_KEY = 'bag-rental-reservations-v1';
export const DATE_FORMAT = 'yyyy-MM-dd';

export function toDateKey(date) {
  return format(date, DATE_FORMAT);
}

export function getToday() {
  return startOfDay(new Date());
}

export function getBagReservations(reservations, bagId) {
  return reservations.filter((reservation) => reservation.bagId === bagId);
}

export function hasDateConflict(existingReservations, newStartDate, newEndDate) {
  return existingReservations.some((reservation) => {
    const startDate = parseISO(reservation.startDate);
    const endDate = parseISO(reservation.endDate);

    // 충돌 규칙: 새 시작일이 기존 종료일 이하이고, 새 종료일이 기존 시작일 이상이면 겹친다.
    return newStartDate <= endDate && newEndDate >= startDate;
  });
}

export function isReservedDate(reservations, date) {
  return reservations.some((reservation) =>
    isWithinInterval(date, {
      start: parseISO(reservation.startDate),
      end: parseISO(reservation.endDate),
    }),
  );
}

export function getUnavailableReason(date, bagReservations) {
  const today = getToday();
  const startDate = startOfDay(date);
  const endDate = addDays(startDate, 1);

  if (isBefore(startDate, today)) {
    return '오늘 이전 날짜는 선택할 수 없습니다.';
  }

  // 월간 캘린더에서 다음 날이 보장되지 않는 마지막 날짜는 시작일로 선택하지 않는다.
  if (!isSameMonth(startDate, endDate)) {
    return '연속 2일 예약만 가능합니다.';
  }

  if (hasDateConflict(bagReservations, startDate, endDate)) {
    return '이미 예약된 날짜가 포함되어 있습니다.';
  }

  return '';
}

export const reservationStore = {
  getAll() {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },
  saveAll(reservations) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reservations));
  },
  create(reservation) {
    const reservations = this.getAll();
    this.saveAll([...reservations, reservation]);
    return reservation;
  },
};
