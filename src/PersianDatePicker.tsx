
import { useState } from 'react';
import DateObject from 'react-date-object';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import './PersianDatePicker.css';

type Props = {
  value: string;
  onChange: (value: string) => void;
};

const weekdays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

const months = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر',
  'مرداد', 'شهریور', 'مهر', 'آبان',
  'آذر', 'دی', 'بهمن', 'اسفند',
];

function digits(value: number | string) {
  return String(value).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}

export default function PersianDatePicker({ value, onChange }: Props) {
  const selected = new DateObject({
    date: new Date(`${value}T12:00:00`),
    calendar: persian,
    locale: persian_fa,
  });

  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(
    new DateObject({
      date: new Date(`${value}T12:00:00`),
      calendar: persian,
      locale: persian_fa,
    }),
  );

  const firstDay = new DateObject({
    year: month.year,
    month: month.month.number,
    day: 1,
    calendar: persian,
    locale: persian_fa,
  });

  const offset = (firstDay.toDate().getDay() + 1) % 7;
  const daysInMonth = firstDay.month.length;

  const days = Array.from(
    { length: daysInMonth },
    (_, index) => index + 1,
  );

  function changeMonth(amount: number) {
    setMonth(previous =>
      new DateObject(previous).add(amount, 'month'),
    );
  }

  function chooseDay(day: number) {
    const chosen = new DateObject({
      year: month.year,
      month: month.month.number,
      day,
      calendar: persian,
      locale: persian_fa,
    });

    const date = chosen.toDate();
    const iso = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');

    onChange(iso);
    setOpen(false);
  }

  return (
    <div className="persian-picker">
      <button
        type="button"
        className="persian-picker-input"
        onClick={() => {
          setMonth(new DateObject({
            date: new Date(`${value}T12:00:00`),
            calendar: persian,
            locale: persian_fa,
          }));
          setOpen(!open);
        }}
      >
        <span>
          {digits(selected.day)} {months[selected.month.number - 1]} {digits(selected.year)}
        </span>
        <span className="persian-picker-icon">▦</span>
      </button>

      {open && (
        <div className="persian-calendar">
          <div className="persian-calendar-header">
            <button type="button" onClick={() => changeMonth(1)}>‹</button>
            <strong>
              {months[month.month.number - 1]} {digits(month.year)}
            </strong>
            <button type="button" onClick={() => changeMonth(-1)}>›</button>
          </div>

          <div className="persian-calendar-grid">
            {weekdays.map(day => (
              <div className="persian-weekday" key={day}>
                {day}
              </div>
            ))}

            {Array.from({ length: offset }, (_, index) => (
              <div key={`empty-${index}`} />
            ))}

            {days.map(day => (
              <button
                type="button"
                key={day}
                className={
                  selected.year === month.year &&
                  selected.month.number === month.month.number &&
                  selected.day === day
                    ? 'persian-day selected'
                    : 'persian-day'
                }
                onClick={() => chooseDay(day)}
              >
                {digits(day)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
