import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { CalendarDays, Check, ChevronLeft, ChevronRight, Phone, UserRound } from 'lucide-react';
import { bag } from './data/bags';
import {
  getBagReservations,
  getToday,
  getUnavailableReason,
  hasDateConflict,
  isReservedDate,
  reservationStore,
  toDateKey,
} from './services/reservationService';
import './styles.css';

function App() {
  const [reservations, setReservations] = useState([]);

  useEffect(() => {
    setReservations(reservationStore.getAll());
  }, []);

  function refreshReservations() {
    setReservations(reservationStore.getAll());
  }

  return (
    <main className="app-shell">
      <ReservationPage bag={bag} reservations={reservations} onReservationCreated={refreshReservations} />
    </main>
  );
}

function ReservationPage({ bag, reservations, onReservationCreated }) {
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(getToday()));
  const [selectedStart, setSelectedStart] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  const bagReservations = useMemo(() => getBagReservations(reservations, bag.id), [reservations, bag.id]);
  const selectedEnd = selectedStart ? addDays(selectedStart, 1) : null;

  function selectStartDate(date) {
    const reason = getUnavailableReason(date, bagReservations);

    if (reason) {
      setSelectedStart(null);
      setMessage(reason);
      return;
    }

    setSelectedStart(startOfDay(date));
    setMessage('');
  }

  function submitReservation(event) {
    event.preventDefault();

    if (!selectedStart || !selectedEnd) {
      setMessage('연속 2일 예약만 가능합니다.');
      return;
    }

    if (hasDateConflict(bagReservations, selectedStart, selectedEnd)) {
      setMessage('이미 예약된 날짜가 포함되어 있습니다.');
      return;
    }

    reservationStore.create({
      id: window.crypto.randomUUID(),
      bagId: bag.id,
      customerName: customerName.trim(),
      phone: phone.trim(),
      startDate: toDateKey(selectedStart),
      endDate: toDateKey(selectedEnd),
      createdAt: new Date().toISOString(),
    });

    setCustomerName('');
    setPhone('');
    setSelectedStart(null);
    setMessage('예약이 완료되었습니다.');
    onReservationCreated();
  }

  return (
    <section className="reservation-layout">
      <div className="app-title">
        <p className="eyebrow">선착순 2일 예약</p>
        <h1>{bag.name}</h1>
      </div>

      <form className="booking-panel" onSubmit={submitReservation}>
        <Calendar
          bagReservations={bagReservations}
          selectedStart={selectedStart}
          selectedEnd={selectedEnd}
          visibleMonth={visibleMonth}
          onChangeMonth={setVisibleMonth}
          onSelectDate={selectStartDate}
        />

        <div className="booking-summary">
          <div className="summary-row">
            <CalendarDays size={20} />
            <div>
              <span>시작일</span>
              <strong>{selectedStart ? format(selectedStart, 'M월 d일 EEEE', { locale: ko }) : '날짜를 선택하세요'}</strong>
            </div>
          </div>
          <div className="summary-row">
            <Check size={20} />
            <div>
              <span>자동 반납일</span>
              <strong>{selectedEnd ? format(selectedEnd, 'M월 d일 EEEE', { locale: ko }) : '시작일 다음 날'}</strong>
            </div>
          </div>
        </div>

        <label className="input-label">
          <span>이름</span>
          <div className="input-wrap">
            <UserRound size={19} />
            <input
              required
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="예약자 이름"
            />
          </div>
        </label>

        <label className="input-label">
          <span>연락처</span>
          <div className="input-wrap">
            <Phone size={19} />
            <input
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="010-0000-0000"
              inputMode="tel"
            />
          </div>
        </label>

        {message ? <p className={message.includes('완료') ? 'notice success' : 'notice'}>{message}</p> : null}

        <button className="primary-action" type="submit">
          예약하기
        </button>
      </form>
    </section>
  );
}

function Calendar({ bagReservations, selectedStart, selectedEnd, visibleMonth, onChangeMonth, onSelectDate }) {
  const today = getToday();
  const calendarStart = startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <section className="calendar-card" aria-label="예약 캘린더">
      <div className="calendar-header">
        <button type="button" aria-label="이전 달" onClick={() => onChangeMonth(subMonths(visibleMonth, 1))}>
          <ChevronLeft size={20} />
        </button>
        <h2>{format(visibleMonth, 'yyyy년 M월', { locale: ko })}</h2>
        <button type="button" aria-label="다음 달" onClick={() => onChangeMonth(addMonths(visibleMonth, 1))}>
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="calendar-weekdays">
        {weekdays.map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>

      <div className="calendar-grid">
        {days.map((day) => {
          const reason = getUnavailableReason(day, bagReservations);
          const reserved = isReservedDate(bagReservations, day);
          const selected =
            (selectedStart && isSameDay(day, selectedStart)) || (selectedEnd && isSameDay(day, selectedEnd));
          const outsideMonth = !isSameMonth(day, visibleMonth);
          const disabled = Boolean(reason) || outsideMonth;
          const classNames = [
            'date-cell',
            outsideMonth ? 'outside' : '',
            reserved ? 'reserved' : '',
            selected ? 'selected' : '',
            disabled ? 'disabled' : '',
            isAfter(day, today) || isSameDay(day, today) ? 'future' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              type="button"
              className={classNames}
              key={toDateKey(day)}
              disabled={disabled}
              onClick={() => onSelectDate(day)}
              title={reason || '예약 가능'}
            >
              <span>{format(day, 'd')}</span>
              {reserved ? <small>예약</small> : null}
              {!reserved && !disabled ? <small>가능</small> : null}
            </button>
          );
        })}
      </div>

      <div className="calendar-legend">
        <span><i className="legend-dot available-dot" />예약 가능</span>
        <span><i className="legend-dot selected-dot" />선택</span>
        <span><i className="legend-dot reserved-dot" />예약 불가</span>
      </div>
    </section>
  );
}

createRoot(document.getElementById('root')).render(<App />);
