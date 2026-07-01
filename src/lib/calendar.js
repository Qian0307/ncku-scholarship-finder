// 把獎學金截止日做成行事曆事件（Google Calendar 連結 / .ics 檔）。

/** 'YYYY-MM-DD' → 'YYYYMMDD'；offsetDays 可加減天數 */
function toCalDate(deadline, offsetDays = 0) {
  const d = new Date(deadline);
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function eventTitle(s) {
  return `【截止】${s.title}`;
}

/** Google Calendar 「新增事件」連結（整日事件，當天截止） */
export function googleCalUrl(s) {
  if (!s.deadline) return null;
  const start = toCalDate(s.deadline);
  const end = toCalDate(s.deadline, 1); // 整日事件結束日為隔天（不含）
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: eventTitle(s),
    dates: `${start}/${end}`,
    details: `獎學金申請截止日。\n詳情：${s.source_url}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

const esc = (t) => String(t).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');

/** 單一 VEVENT（含截止前 3 天提醒） */
function buildVevent(s, stamp) {
  return [
    'BEGIN:VEVENT',
    `UID:${s.id}@ncku-scholarship`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${toCalDate(s.deadline)}`,
    `DTEND;VALUE=DATE:${toCalDate(s.deadline, 1)}`,
    `SUMMARY:${esc(eventTitle(s))}`,
    `DESCRIPTION:${esc(`獎學金申請截止日。\n詳情：${s.source_url}`)}`,
    'BEGIN:VALARM',
    'TRIGGER:-P3D',
    'ACTION:DISPLAY',
    'DESCRIPTION:獎學金申請截止前 3 天提醒',
    'END:VALARM',
    'END:VEVENT',
  ];
}

function wrapCalendar(lines) {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NCKU Scholarship Finder//ZH-TW//',
    'CALSCALE:GREGORIAN',
    ...lines,
    'END:VCALENDAR',
  ].join('\r\n');
}

/** 產生單筆 .ics 檔內容（含截止前 3 天提醒） */
export function buildIcs(s) {
  if (!s.deadline) return null;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  return wrapCalendar(buildVevent(s, stamp));
}

/** 產生多筆 .ics 檔內容；自動略過無截止日者。全無截止日時回傳 null */
export function buildIcsMulti(list) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const events = list.filter((s) => s.deadline).flatMap((s) => buildVevent(s, stamp));
  if (events.length === 0) return null;
  return wrapCalendar(events);
}
