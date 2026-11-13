import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { MapContainer, TileLayer, CircleMarker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Users, Map as MapIcon, Filter } from '../../components/Icons';
import IconBox from '../../components/IconBox';
import { db } from '../../firebase';
import AdminNavbar from '../../components/AdminNavbar';
import '../../styles/admin-common.css';
import './ResidentMap.css';

/** Approximate center of Barangay Mabayuan, Olongapo City (PhilAtlas) */
const MABAYUAN_CENTER = [14.8427, 120.2819];
const DEFAULT_ZOOM = 15;
/** Soft coverage ring so admins can see barangay extent vs empty areas */
const COVERAGE_RADIUS_M = 900;

const PUROK_COLORS = {
  'Purok 1': '#15803d',
  'Purok 2': '#2563eb',
  'Purok 3': '#c2410c',
  'Purok 4': '#7c3aed',
  'Purok 5': '#db2777',
  'Purok 6': '#0891b2',
  'Purok 7': '#ca8a04',
};

const STATUS_OPTIONS = [
  { value: 'verified', label: 'Verified' },
  { value: 'pending', label: 'Pending' },
  { value: 'declined', label: 'Declined' },
];

const getResidentCoords = (user) => {
  const lat = user.latitude ?? user.presentLatitude;
  const lng = user.longitude ?? user.presentLongitude;
  if (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  ) {
    return { lat, lng };
  }
  return null;
};

const getMarkerColor = (purok) => PUROK_COLORS[purok] || '#166534';

const ResidentMap = () => {
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('verified');
  const [purokFilter, setPurokFilter] = useState('all');

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const list = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((u) => u.role !== 'admin');
        setResidents(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error loading residents for map:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const pinnedResidents = useMemo(() => {
    return residents
      .map((r) => {
        const coords = getResidentCoords(r);
        if (!coords) return null;
        return { ...r, coords };
      })
      .filter(Boolean)
      .filter((r) => {
        if (r.status !== statusFilter) return false;
        if (purokFilter !== 'all' && r.purok !== purokFilter) return false;
        return true;
      });
  }, [residents, statusFilter, purokFilter]);

  const totalRegistered = residents.length;
  const withLocation = residents.filter((r) => getResidentCoords(r)).length;
  const withoutLocation = totalRegistered - withLocation;

  const purokCounts = useMemo(() => {
    const counts = {};
    for (let i = 1; i <= 7; i++) counts[`Purok ${i}`] = 0;
    pinnedResidents.forEach((r) => {
      if (r.purok && counts[r.purok] !== undefined) counts[r.purok] += 1;
    });
    return counts;
  }, [pinnedResidents]);

  return (
    <div className="admin-dashboard">
      <AdminNavbar />

      <div className="admin-content">
        <div className="admin-container">
          <div className="admin-page-header">
            <div>
              <h1 className="admin-page-title">Resident Map</h1>
              <p className="admin-page-subtitle">
                View pinned locations of registered residents across Barangay Mabayuan
              </p>
            </div>
          </div>

          <div className="rm-stats-row">
            <div className="rm-stat">
              <IconBox variant="green" size="sm">
                <Users size={18} strokeWidth={1.8} />
              </IconBox>
              <div>
                <span className="rm-stat-num">{totalRegistered}</span>
                <span className="rm-stat-label">Registered</span>
              </div>
            </div>
            <div className="rm-stat">
              <IconBox variant="green" size="sm">
                <MapPin size={18} strokeWidth={1.8} />
              </IconBox>
              <div>
                <span className="rm-stat-num">{withLocation}</span>
                <span className="rm-stat-label">With GPS pin</span>
              </div>
            </div>
            <div className="rm-stat">
              <IconBox variant="amber" size="sm">
                <MapIcon size={18} strokeWidth={1.8} />
              </IconBox>
              <div>
                <span className="rm-stat-num">{withoutLocation}</span>
                <span className="rm-stat-label">No location yet</span>
              </div>
            </div>
            <div className="rm-stat">
              <IconBox variant="green" size="sm">
                <Filter size={18} strokeWidth={1.8} />
              </IconBox>
              <div>
                <span className="rm-stat-num">{pinnedResidents.length}</span>
                <span className="rm-stat-label">Showing on map</span>
              </div>
            </div>
          </div>

          <div className="rm-toolbar">
            <div className="rm-filter-group">
              <label htmlFor="rm-status-filter">Status</label>
              <select
                id="rm-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="rm-filter-group">
              <label htmlFor="rm-purok-filter">Purok</label>
              <select
                id="rm-purok-filter"
                value={purokFilter}
                onChange={(e) => setPurokFilter(e.target.value)}
              >
                <option value="all">All puroks</option>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <option key={n} value={`Purok ${n}`}>
                    Purok {n}
                  </option>
                ))}
              </select>
            </div>
            <p className="rm-toolbar-hint">
              Pins show where residents registered their present address. Areas without pins have no
              registered residents with saved coordinates yet.
            </p>
          </div>

          <div className="rm-layout">
            <div className="rm-map-panel">
              {loading ? (
                <div className="rm-map-loading">Loading map data...</div>
              ) : (
                <MapContainer
                  center={MABAYUAN_CENTER}
                  zoom={DEFAULT_ZOOM}
                  scrollWheelZoom
                  className="rm-leaflet-map"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Circle
                    center={MABAYUAN_CENTER}
                    radius={COVERAGE_RADIUS_M}
                    pathOptions={{
                      color: '#166534',
                      weight: 1.5,
                      dashArray: '6 8',
                      fillColor: '#16a34a',
                      fillOpacity: 0.06,
                    }}
                  />
                  {pinnedResidents.map((r) => (
                    <CircleMarker
                      key={r.id}
                      center={[r.coords.lat, r.coords.lng]}
                      radius={8}
                      pathOptions={{
                        color: '#fff',
                        weight: 2,
                        fillColor: getMarkerColor(r.purok),
                        fillOpacity: 0.92,
                      }}
                    >
                      <Popup>
                        <div className="rm-popup">
                          <strong>{r.fullName || 'Resident'}</strong>
                          <span>{r.purok || 'Purok N/A'}</span>
                          <span className="rm-popup-status">{r.status || 'unknown'}</span>
                          <span className="rm-popup-address">
                            {r.presentAddress || r.permanentAddress || 'No address'}
                          </span>
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>
              )}
            </div>

            <aside className="rm-sidebar">
              <h3 className="rm-sidebar-title">Purok coverage</h3>
              <p className="rm-sidebar-desc">
                Pins currently shown per purok. Empty puroks have no mapped residents yet.
              </p>
              <ul className="rm-purok-list">
                {Object.entries(purokCounts).map(([purok, count]) => (
                  <li key={purok} className={count === 0 ? 'rm-purok-empty' : ''}>
                    <span
                      className="rm-purok-dot"
                      style={{ background: getMarkerColor(purok) }}
                    />
                    <span className="rm-purok-name">{purok}</span>
                    <span className="rm-purok-count">
                      {count === 0 ? 'None yet' : `${count} pin${count === 1 ? '' : 's'}`}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="rm-legend">
                <h4>Legend</h4>
                <p>
                  <span className="rm-legend-ring" /> Soft ring ≈ Mabayuan coverage area
                </p>
                <p>Colored dots = resident home pins from registration GPS</p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResidentMap;
