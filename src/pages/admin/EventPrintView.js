import React from 'react';
import './EventPrintView.css';

const MIN_FILLER_ROWS = 5;

const formatDate = (date) => {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const formatDateTime = (date) => {
  if (!date) return '';
  let d = date;
  // Handle Firestore Timestamp
  if (d && typeof d === 'object' && d.toDate) {
    d = d.toDate();
  } else if (d && typeof d === 'object' && d.seconds) {
    d = new Date(d.seconds * 1000);
  } else {
    d = new Date(d);
  }
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Convert a 24-hour time string like "14:30" or "09:05" to 12-hour AM/PM
 * format like "2:30 PM" or "9:05 AM".
 */
const formatTimeAMPM = (timeStr) => {
  if (!timeStr) return '—';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1].padStart(2, '0');
  if (isNaN(hours)) return timeStr;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
};

const EventPrintView = React.forwardRef(({ event, registrations, userProfiles }, ref) => {
  if (!event) return null;

  const regs = registrations || [];
  const fields = event.registrationFields || [];
  const emptyRowsCount = Math.max(0, MIN_FILLER_ROWS - regs.length);
  const emptyRows = Array.from({ length: emptyRowsCount });

  // Fixed column count: No. + Full Name + Email + Date Registered + dynamic fields
  const fixedColCount = 4;
  const totalColCount = fixedColCount + fields.length;

  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const getFullName = (registration) => {
    const profile = userProfiles?.[registration.userId];
    if (profile?.fullName) return profile.fullName;
    const name = registration.userName;
    if (name && !name.includes('@')) return name;
    return name || 'No name provided';
  };

  return (
    <div className="event-print-area" ref={ref}>
      {/* ── Page Header ── */}
      <div className="event-print-page-header">
        <div className="event-print-header-left">
          <img src="/logo.png" alt="Barangay Mabayuan Seal" className="event-print-seal" />
        </div>

        <div className="event-print-header-center">
          <h1>
            EVENT REGISTRATIONS REPORT<br />
            {event.title}
          </h1>
        </div>
      </div>

      {/* ── Event Info Block ── */}
      <div className="event-print-info-block">
        <table className="event-print-info-table">
          <tbody>
            <tr>
              <td className="info-label">EVENT TITLE</td>
              <td className="info-value">{event.title || ''}</td>
            </tr>
            <tr>
              <td className="info-label">DATE</td>
              <td className="info-value">{formatDate(event.eventDate)}</td>
            </tr>
            <tr>
              <td className="info-label">TIME</td>
              <td className="info-value">{formatTimeAMPM(event.eventTime)}</td>
            </tr>
            <tr>
              <td className="info-label">LOCATION</td>
              <td className="info-value">{event.location || '—'}</td>
            </tr>
            <tr>
              <td className="info-label">TOTAL REGISTERED</td>
              <td className="info-value">{regs.length}</td>
            </tr>
            {/* Description as full-width row */}
            {event.description && (
              <tr>
                <td className="info-label info-full-label" colSpan="2">DESCRIPTION</td>
              </tr>
            )}
            {event.description && (
              <tr>
                <td className="info-value info-full-value" colSpan="2">{event.description}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Registrants Table ── */}
      <table className="event-print-registrants-table">
        <thead>
          <tr>
            <th className="row-num">NO.</th>
            <th>FULL NAME</th>
            <th>EMAIL</th>
            <th>DATE REGISTERED</th>
            {fields.map((field) => (
              <th key={field.id}>{field.label.toUpperCase()}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {regs.map((registration, index) => (
            <tr key={registration.id || index}>
              <td className="row-num">{index + 1}</td>
              <td>{getFullName(registration)}</td>
              <td>{registration.userEmail || ''}</td>
              <td>{formatDateTime(registration.createdAt)}</td>
              {fields.map((field) => (
                <td key={field.id}>
                  {registration.responses?.[field.id] != null
                    ? String(registration.responses[field.id])
                    : ''}
                </td>
              ))}
            </tr>
          ))}
          {/* Empty filler rows */}
          {emptyRows.map((_, index) => (
            <tr key={`empty-${index}`} className="empty-row">
              <td className="row-num">{regs.length + index + 1}</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              {fields.map((field) => (
                <td key={field.id}>&nbsp;</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Footer ── */}
      <div className="event-print-footer">
        Barangay Mabayuan, Olongapo City, Zambales
        <span className="event-print-generated-date">Generated: {generatedDate}</span>
      </div>
    </div>
  );
});

EventPrintView.displayName = 'EventPrintView';

export default EventPrintView;
