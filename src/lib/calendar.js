// "Add to calendar" links for the booking confirmation step.

const stamp = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

export function googleCalendarUrl({ title, start, end, details, location }) {
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: stamp(start) + '/' + stamp(end),
    details: details || '',
    location: location || '',
  });
  return 'https://calendar.google.com/calendar/render?' + q.toString();
}

const esc = (s) => String(s || '').replace(/([\\,;])/g, '\\$1').replace(/\n/g, '\\n');

export function icsText({ uid, title, start, end, details, location }) {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Digital Services Master//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    'UID:' + esc(uid),
    'DTSTAMP:' + stamp(new Date()),
    'DTSTART:' + stamp(start),
    'DTEND:' + stamp(end),
    'SUMMARY:' + esc(title),
    'DESCRIPTION:' + esc(details),
    'LOCATION:' + esc(location),
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export const icsDataUrl = (ev) => 'data:text/calendar;charset=utf-8,' + encodeURIComponent(icsText(ev));
