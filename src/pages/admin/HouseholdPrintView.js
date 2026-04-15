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
          <div className="print-header-left-text">
            <p>Republic of the Philippines</p>
            <p>CITY OF OLONGAPO</p>
          </div>
        </div>

        <div className="print-header-center">
          <h1>
            RECORD OF BARANGAY MABAYUAN<br />
            INHABITANTS BY HOUSEHOLD
          </h1>
        </div>

        <div className="print-date-box">
          <span>DATE ACCOMPLISHED: </span>
          <span className="print-date-value">
            {formatDate(household.dateAccomplished)}
          </span>
        </div>
      </div>

      {/* ── Household Info Block ── */}
      <div className="print-info-block">
        <table className="print-info-table">
          <tbody>
            <tr>
              <td className="info-label">A. REGION</td>
              <td className="info-value">{household.region || 'III'}</td>
              <td className="psg-label">PSG</td>
              <td className="psg-value" colSpan="2">{household.psgCode || ''}</td>
            </tr>
            <tr>
              <td className="info-label">B. PROVINCE</td>
              <td className="info-value">{household.province || 'Zambales'}</td>
              <td className="psg-label"></td>
              <td className="psg-value" colSpan="2"></td>
            </tr>
            <tr>
              <td className="info-label">C. CITY</td>
              <td className="info-value">{household.city || 'Olongapo'}</td>
              <td className="psg-label"></td>
              <td className="psg-value" colSpan="2"></td>
            </tr>
            <tr>
              <td className="info-label">D. BARANGAY</td>
              <td className="info-value">{household.barangay || 'Mabayuan'}</td>
              <td className="psg-label"></td>
              <td className="psg-value" colSpan="2"></td>
            </tr>
            <tr>
              <td className="info-label">E. HOUSEHOLD NO.</td>
              <td className="info-value" colSpan="4">{household.householdNo || ''}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Members Table ── */}
      <table className="print-members-table">
        <thead>
          {/* Group headers */}
          <tr>
            <th className="header-group row-num" rowSpan="2">NO.</th>
            <th className="header-group" colSpan="4">NAME</th>
            <th className="header-group" colSpan="2">ADDRESS</th>
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
            <th>EXT. NO.</th>
            <th>STREET</th>
            <th>PUROK</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member, index) => (
            <tr key={index}>
              <td className="row-num">{index + 1}</td>
              <td>{member.lastName || ''}</td>
              <td>{member.firstName || ''}</td>
              <td>{member.middleName || ''}</td>
              <td>{member.extensionName || ''}</td>
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
              <td className="row-num">{members.length + index + 1}</td>
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
