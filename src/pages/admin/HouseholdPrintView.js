import React from 'react';
import './HouseholdPrintView.css';

const MIN_ROWS = 20;

const formatDate = (date) => {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const formatDOB = (date) => {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

const HouseholdPrintView = React.forwardRef(({ household }, ref) => {
  if (!household) return null;

  const members = household.members || [];
  const emptyRowsCount = Math.max(0, MIN_ROWS - members.length);
  const emptyRows = Array.from({ length: emptyRowsCount });

  return (
    <div className="print-area" ref={ref}>
      {/* ── Page Header ── */}
      <div className="print-page-header">
        <div className="print-header-left">
          <img src="/logo.png" alt="Barangay Mabayuan Seal" className="print-seal" />
        </div>

        <div className="print-header-center">
          <p className="print-republic">Republic of the Philippines</p>
          <p className="print-city">CITY OF OLONGAPO</p>
          <h1>
            RECORD OF BARANGAY MABAYUAN INHABITANTS BY HOUSEHOLD
          </h1>
        </div>
      </div>

      {/* ── Info & Date Row ── */}
      <div className="print-info-row">
        {/* ── Household Info Block ── */}
        <div className="print-info-block">
          <table className="print-info-table">
            <tbody>
              <tr>
                <td className="info-label">A. REGION</td>
                <td className="info-value">{household.region || 'III'}</td>
                <td className="psg-value">{household.psgCode || ''}</td>
                <td className="psg-label">PSG</td>
              </tr>
              <tr>
                <td className="info-label">B. PROVINCE</td>
                <td className="info-value">{household.province || 'Zambales'}</td>
                <td className="psg-value"></td>
                <td className="psg-label">C</td>
              </tr>
              <tr>
                <td className="info-label">C. CITY</td>
                <td className="info-value">{household.city || 'Olongapo'}</td>
                <td className="psg-value"></td>
                <td className="psg-label">O</td>
              </tr>
              <tr>
                <td className="info-label">D. BARANGAY</td>
                <td className="info-value">{household.barangay || 'Mabayuan'}</td>
                <td className="psg-value"></td>
                <td className="psg-label">D</td>
              </tr>
              <tr>
                <td className="info-label" style={{ borderRight: 'none' }}>E. HOUSEHOLD NO.</td>
                <td className="info-value" style={{ borderLeft: 'none', textAlign: 'center' }}>{household.householdNo || ''}</td>
                <td className="psg-value"></td>
                <td className="psg-label">E</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="print-date-container">
          <span className="print-date-label">DATE ACCOMPLISH</span>
          <div className="print-date-box">
            {formatDate(household.dateAccomplished)}
          </div>
        </div>
      </div>



      {/* ── Members Table ── */}
      <table className="print-members-table">
        <thead>
          {/* Group headers */}
          <tr>
            <th className="header-group" colSpan="4">NAME</th>
            <th className="header-group" colSpan="3">ADDRESS</th>
            <th className="header-group" rowSpan="2">PLACE OF<br/>BIRTH</th>
            <th className="header-group" rowSpan="2">DATE OF<br/>BIRTH</th>
            <th className="header-group" rowSpan="2">GENDER</th>
            <th className="header-group" rowSpan="2">CIVIL<br/>STATUS</th>
            <th className="header-group" rowSpan="2">CITIZENSHIP</th>
            <th className="header-group" rowSpan="2">OCCUPATION</th>
            <th className="header-group" rowSpan="2">RELATIONSHIP<br/>TO THE HEAD</th>
          </tr>
          {/* Sub-headers */}
          <tr>
            <th>LAST</th>
            <th>FIRST</th>
            <th>MIDDLE</th>
            <th>EXT.</th>
            <th>NO.</th>
            <th>STREET</th>
            <th>PUROK</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member, index) => (
            <tr key={index}>
              <td>{member.lastName || ''}</td>
              <td>{member.firstName || ''}</td>
              <td>{member.middleName || ''}</td>
              <td>{member.extensionName || ''}</td>
              <td>{household.houseNo || ''}</td>
              <td>{member.street || household.street || ''}</td>
              <td>{member.purok || household.purok || ''}</td>
              <td>{member.placeOfBirth || ''}</td>
              <td>{formatDOB(member.dateOfBirth)}</td>
              <td>{member.gender || ''}</td>
              <td>{member.civilStatus || ''}</td>
              <td>{member.citizenship || ''}</td>
              <td>{member.occupation || ''}</td>
              <td>{member.relationshipToHead || ''}</td>
            </tr>
          ))}
          {/* Empty rows to fill the form */}
          {emptyRows.map((_, index) => (
            <tr key={`empty-${index}`} className="empty-row">
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Footer ── */}
      <div className="print-footer">
        Barangay Mabayuan, Olongapo City, Zambales
      </div>
    </div>
  );
});

HouseholdPrintView.displayName = 'HouseholdPrintView';

export default HouseholdPrintView;
