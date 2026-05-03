import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Megaphone, Home, ClipboardCheck, TrendingUp,
  FileDown, Activity, Calendar, BarChart3, PieChart,
  Clock, UserCheck, UserX, Trash2, Pencil, Plus,
  CheckCircle, XCircle, ShieldCheck,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToRecentActivity } from '../../services/activityLogService';
import { subscribeToChanges } from '../../services/dataService';
import AdminNavbar from '../../components/AdminNavbar';
import PageLoader from '../../components/PageLoader';
import './AdminDashboard.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Tooltip, Legend, Filler,
);

const iconProps = { size: 28, strokeWidth: 1.8 };
const Icons = {
  people: <Users {...iconProps} />,
  megaphone: <Megaphone {...iconProps} />,
  home: <Home {...iconProps} />,
  clipboard: <ClipboardCheck {...iconProps} />,
};

/* ── Helpers ── */
const getRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getActivityIcon = (module) => {
  const s = { size: 16, strokeWidth: 2 };
  switch (module) {
    case 'announcements': return <Megaphone {...s} />;
    case 'events': return <Calendar {...s} />;
    case 'residents': return <Users {...s} />;
    case 'households': return <Home {...s} />;
    case 'adminAccounts': return <ShieldCheck {...s} />;
    default: return <Activity {...s} />;
  }
};

const getActionColor = (action) => {
  switch (action) {
    case 'created': return 'act-green';
    case 'updated': return 'act-blue';
    case 'deleted': return 'act-red';
    case 'approved': return 'act-teal';
    case 'declined': return 'act-amber';
    default: return 'act-gray';
  }
};

const getActionLabel = (action) => {
  switch (action) {
    case 'created': return 'Created';
    case 'updated': return 'Updated';
    case 'deleted': return 'Deleted';
    case 'approved': return 'Approved';
    case 'declined': return 'Declined';
    default: return action;
  }
};

const isWithinFilter = (dateStrOrTimestamp, filter) => {
  if (filter === 'all' || !dateStrOrTimestamp) return true;
  const date = dateStrOrTimestamp.toDate ? dateStrOrTimestamp.toDate() : new Date(dateStrOrTimestamp);
  if (isNaN(date.getTime())) return true;
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  if (diffTime < 0) return true; // Include future dates (like upcoming events)
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  
  if (filter === '7days') return diffDays <= 7;
  if (filter === '14days') return diffDays <= 14;
  if (filter === '1month') return diffDays <= 30;
  if (filter === '1year') return diffDays <= 365;
  return true;
};

/* ── Chart defaults ── */
const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        font: { family: "'DM Sans', sans-serif", size: 12, weight: 500 },
        color: '#64748B',
        usePointStyle: true,
        pointStyleWidth: 10,
        padding: 16,
      },
    },
    tooltip: {
      backgroundColor: '#0F172A',
      titleFont: { family: "'DM Sans', sans-serif", size: 13 },
      bodyFont: { family: "'DM Sans', sans-serif", size: 12 },
      padding: 10,
      cornerRadius: 8,
      boxPadding: 4,
    },
  },
};

/* ================================================
   MAIN COMPONENT
   ================================================ */
const AdminDashboard = () => {
  const { currentUser, userProfile } = useAuth();

  /* ── Core stats (existing) ── */
  const [stats, setStats] = useState({ totalResidents: 0, totalHouseholds: 0, pendingVerification: 0 });

  /* ── Analytics data ── */
  const [allUsers, setAllUsers] = useState([]);
  const [households, setHouseholds] = useState([]);
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('all');

  /* ── Print ref ── */
  const printRef = useRef();

  /* ── Data fetching ── */
  useEffect(() => {
    let loaded = 0;
    const total = 7;
    const check = () => { loaded++; if (loaded >= total) setIsLoading(false); };

    // 1) Verified → totalResidents
    const q1 = query(collection(db, 'users'), where('status', '==', 'verified'));
    const u1 = onSnapshot(q1, (s) => { setStats(p => ({ ...p, totalResidents: s.size })); check(); }, () => check());

    // 2) Households
    const u2 = onSnapshot(collection(db, 'households'), (s) => {
      const data = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setHouseholds(data);
      setStats(p => ({ ...p, totalHouseholds: s.size }));
      check();
    }, () => check());

    // 3) Pending → pendingVerification
    const q3 = query(collection(db, 'users'), where('status', '==', 'pending'));
    const u3 = onSnapshot(q3, (s) => { setStats(p => ({ ...p, pendingVerification: s.size })); check(); }, () => check());

    // 4) All users (for chart analytics)
    const u4 = onSnapshot(collection(db, 'users'), (s) => {
      setAllUsers(s.docs.map(d => ({ id: d.id, ...d.data() })));
      check();
    }, () => check());

    // 5) Events
    const u5 = subscribeToChanges('events', (data) => { setEvents(data); check(); });

    // 6) Event registrations
    const u6 = subscribeToChanges('eventRegistrations', (data) => { setRegistrations(data); check(); });

    // 7) Announcements
    const u7 = subscribeToChanges('announcements', (data) => { setAnnouncements(data); check(); });

    // Activity logs (separate, not blocking loader)
    const u8 = subscribeToRecentActivity((logs) => setActivityLogs(logs), 25);

    return () => { u1(); u2(); u3(); u4(); u5(); u6(); u7(); if (u8) u8(); };
  }, []);

  const userName = userProfile?.fullName || currentUser?.displayName || 'Admin';

  /* ── Chart Data: Resident Growth (Dynamic) ── */
  const residentGrowthData = useMemo(() => {
    let dataPoints = [];
    const isDaily = timeFilter === '7days' || timeFilter === '14days' || timeFilter === '1month';
    const now = new Date();

    const filteredUsers = allUsers.filter(u => {
      if (u.status !== 'verified' || !u.verifiedAt) return false;
      return isWithinFilter(u.verifiedAt, timeFilter);
    });

    if (isDaily) {
      const daysCount = timeFilter === '7days' ? 7 : timeFilter === '14days' ? 14 : 30;
      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        dataPoints.push({
          label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          year: d.getFullYear(),
          month: d.getMonth(),
          date: d.getDate(),
        });
      }
    } else {
      const monthsCount = timeFilter === '1year' ? 12 : 6;
      for (let i = monthsCount - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        dataPoints.push({
          label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          year: d.getFullYear(),
          month: d.getMonth(),
        });
      }
    }

    const counts = dataPoints.map((dp) => {
      return filteredUsers.filter(u => {
        const d = u.verifiedAt.toDate ? u.verifiedAt.toDate() : new Date(u.verifiedAt);
        if (isDaily) {
          return d.getFullYear() === dp.year && d.getMonth() === dp.month && d.getDate() === dp.date;
        } else {
          return d.getFullYear() === dp.year && d.getMonth() === dp.month;
        }
      }).length;
    });

    // Cumulative sum
    const cumulative = [];
    let total = allUsers.filter(u => {
      if (u.status !== 'verified' || !u.verifiedAt) return false;
      const d = u.verifiedAt.toDate ? u.verifiedAt.toDate() : new Date(u.verifiedAt);
      const firstPoint = dataPoints[0];
      if (isDaily) {
        return d < new Date(firstPoint.year, firstPoint.month, firstPoint.date);
      } else {
        return d < new Date(firstPoint.year, firstPoint.month, 1);
      }
    }).length;

    counts.forEach(c => { total += c; cumulative.push(total); });

    return {
      labels: dataPoints.map(dp => dp.label),
      datasets: [{
        label: 'Total Verified Residents',
        data: cumulative,
        borderColor: '#1D9E75',
        backgroundColor: 'rgba(29, 158, 117, 0.08)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#1D9E75',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      }],
    };
  }, [allUsers, timeFilter]);

  /* ── Chart Data: User Status Distribution ── */
  const statusDistData = useMemo(() => {
    const filtered = allUsers.filter(u => isWithinFilter(u.verifiedAt || u.createdAt, timeFilter));
    const verified = filtered.filter(u => u.status === 'verified').length;
    const pending = filtered.filter(u => u.status === 'pending').length;
    const declined = filtered.filter(u => u.status === 'declined').length;
    return {
      labels: ['Verified', 'Pending', 'Declined'],
      datasets: [{
        data: [verified, pending, declined],
        backgroundColor: ['#1D9E75', '#F59E0B', '#EF4444'],
        borderColor: ['#fff', '#fff', '#fff'],
        borderWidth: 3,
        hoverOffset: 6,
      }],
    };
  }, [allUsers, timeFilter]);

  /* ── Chart Data: Households by Purok ── */
  const householdByPurokData = useMemo(() => {
    const purokMap = {};
    const filtered = households.filter(h => isWithinFilter(h.createdAt, timeFilter));
    filtered.forEach(h => {
      const p = h.purok || 'Unknown';
      purokMap[p] = (purokMap[p] || 0) + 1;
    });
    const sorted = Object.entries(purokMap).sort((a, b) => a[0].localeCompare(b[0]));
    return {
      labels: sorted.map(([k]) => k),
      datasets: [{
        label: 'Households',
        data: sorted.map(([, v]) => v),
        backgroundColor: [
          'rgba(29, 158, 117, 0.75)', 'rgba(59, 130, 246, 0.75)', 'rgba(245, 158, 11, 0.75)',
          'rgba(139, 92, 246, 0.75)', 'rgba(236, 72, 153, 0.75)', 'rgba(20, 184, 166, 0.75)',
          'rgba(249, 115, 22, 0.75)',
        ],
        borderRadius: 8,
        borderSkipped: false,
      }],
    };
  }, [households, timeFilter]);

  /* ── Chart Data: Events Overview ── */
  const eventsOverviewData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const filteredEvents = events.filter(e => isWithinFilter(e.createdAt || e.eventDate, timeFilter));
    const filteredRegs = registrations.filter(r => isWithinFilter(r.registrationDate, timeFilter));
    
    const upcoming = filteredEvents.filter(e => new Date(e.eventDate) >= today).length;
    const past = filteredEvents.filter(e => new Date(e.eventDate) < today).length;
    const totalRegs = filteredRegs.length;
    return {
      labels: ['Upcoming', 'Past', 'Registrations'],
      datasets: [{
        label: 'Count',
        data: [upcoming, past, totalRegs],
        backgroundColor: ['rgba(20, 184, 166, 0.75)', 'rgba(148, 163, 184, 0.65)', 'rgba(59, 130, 246, 0.75)'],
        borderRadius: 8,
        borderSkipped: false,
      }],
    };
  }, [events, registrations, timeFilter]);

  /* ── Chart Data: Announcements by Category ── */
  const announcementsCategoryData = useMemo(() => {
    const filtered = announcements.filter(a => isWithinFilter(a.createdAt || a.datePosted, timeFilter));
    const catCounts = {
      Environment: 0,
      Health: 0,
      Safety: 0,
      Events: 0,
      Services: 0
    };
    
    filtered.forEach(a => {
      const cat = a.type || a.category; // fallback to category just in case
      if (catCounts[cat] !== undefined) {
        catCounts[cat]++;
      }
    });

    const labels = Object.keys(catCounts).filter(k => catCounts[k] > 0);
    const data = labels.map(k => catCounts[k]);
    const bgColors = labels.map(l => {
      switch(l) {
        case 'Environment': return '#16A34A';
        case 'Health': return '#2563EB';
        case 'Safety': return '#DC2626';
        case 'Events': return '#7C3AED';
        case 'Services': return '#EA580C';
        default: return '#64748B';
      }
    });

    return {
      labels,
      datasets: [{
        data,
        backgroundColor: bgColors,
        borderColor: '#fff',
        borderWidth: 3,
        hoverOffset: 6,
      }],
    };
  }, [announcements, timeFilter]);

  /* ── Export Report ── */
  const handleExportReport = () => {
    const filteredUsers = allUsers.filter(u => isWithinFilter(u.verifiedAt || u.createdAt, timeFilter));
    const filteredEvents = events.filter(e => isWithinFilter(e.createdAt || e.eventDate, timeFilter));
    const filteredAnnouncements = announcements.filter(a => isWithinFilter(a.createdAt || a.datePosted, timeFilter));
    const filteredRegs = registrations.filter(r => isWithinFilter(r.registrationDate, timeFilter));
    const filteredHouseholds = households.filter(h => isWithinFilter(h.createdAt, timeFilter));
    const filteredLogs = activityLogs.filter(l => isWithinFilter(l.timestamp, timeFilter));

    const filterLabel = {
      '7days': 'Past 7 Days',
      '14days': 'Past 14 Days',
      '1month': 'Past 1 Month',
      '1year': 'Past 1 Year',
      'all': 'All Time'
    }[timeFilter];

    const rows = [
      ['IBayan Barangay Dashboard Report'],
      [`Generated: ${new Date().toLocaleString()}`],
      [`Period: ${filterLabel}`],
      [''],
      ['=== KEY METRICS ==='],
      ['Metric', 'Value'],
      ['Total Verified Residents (All-Time)', stats.totalResidents],
      ['Total Households (All-Time)', stats.totalHouseholds],
      ['Pending Verification (Current)', stats.pendingVerification],
      ['Events in Period', filteredEvents.length],
      ['Announcements in Period', filteredAnnouncements.length],
      ['Event Registrations in Period', filteredRegs.length],
      [''],
      ['=== USER STATUS (Filtered) ==='],
      ['Status', 'Count'],
      ['Verified', filteredUsers.filter(u => u.status === 'verified').length],
      ['Pending', filteredUsers.filter(u => u.status === 'pending').length],
      ['Declined', filteredUsers.filter(u => u.status === 'declined').length],
      [''],
      ['=== HOUSEHOLDS BY PUROK (Filtered) ==='],
      ['Purok', 'Count'],
    ];

    const purokMap = {};
    filteredHouseholds.forEach(h => { const p = h.purok || 'Unknown'; purokMap[p] = (purokMap[p] || 0) + 1; });
    Object.entries(purokMap).sort((a, b) => a[0].localeCompare(b[0])).forEach(([k, v]) => {
      rows.push([k, v]);
    });

    rows.push(['']);
    rows.push(['=== RECENT ACTIVITY (Filtered) ===']);
    rows.push(['Time', 'Action', 'Module', 'Description', 'Admin']);
    filteredLogs.forEach(log => {
      const ts = log.timestamp ? (log.timestamp.toDate ? log.timestamp.toDate() : new Date(log.timestamp)).toLocaleString() : '';
      rows.push([ts, log.action, log.module, log.description, log.performedByName]);
    });

    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Dashboard_Report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  /* ── Chart Options ── */
  const lineOpts = {
    ...chartDefaults,
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: "'DM Sans'", size: 11 }, color: '#94A3B8' },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.04)' },
        ticks: { font: { family: "'DM Sans'", size: 11 }, color: '#94A3B8', stepSize: 1 },
      },
    },
  };

  const doughnutOpts = {
    ...chartDefaults,
    cutout: '68%',
    plugins: {
      ...chartDefaults.plugins,
      legend: { ...chartDefaults.plugins.legend, position: 'bottom' },
    },
  };

  const barOpts = {
    ...chartDefaults,
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: "'DM Sans'", size: 11 }, color: '#94A3B8' },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.04)' },
        ticks: { font: { family: "'DM Sans'", size: 11 }, color: '#94A3B8', stepSize: 1 },
      },
    },
    plugins: { ...chartDefaults.plugins, legend: { display: false } },
  };

  /* ================================================
     RENDER
     ================================================ */
  return (
    <PageLoader isLoading={isLoading} loadingMessage="Loading dashboard...">
      <div className="admin-dashboard">
        <AdminNavbar />

        <div className="admin-content">
          <div className="admin-container">

            {/* ── Content Header ── */}
            <div className="dash-content-header">
              <div className="dash-header-left">
                <h1 className="dash-title">Admin Dashboard</h1>
                <p className="dash-subtitle">Welcome back, {userName}. Here is what is happening in Barangay Mabayuan today.</p>
              </div>
              <div className="dash-header-right">
                <select 
                  className="dash-time-filter"
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                >
                  <option value="7days">Past 7 Days</option>
                  <option value="14days">Past 14 Days</option>
                  <option value="1month">Past 1 Month</option>
                  <option value="1year">Past 1 Year</option>
                  <option value="all">All Time</option>
                </select>
                <button className="export-report-btn" onClick={handleExportReport} id="export-report-btn">
                  <FileDown size={18} strokeWidth={2} />
                  <span>Export Report</span>
                </button>
              </div>
            </div>

            {/* ── KPI Cards Row ── */}
            <div className="kpi-cards-row">
              <div className="kpi-card kpi-blue">
                <div className="kpi-icon-wrap kpi-icon-blue">{Icons.people}</div>
                <div className="kpi-info">
                  <span className="kpi-label">Total Residents</span>
                  <span className="kpi-value">{stats.totalResidents.toLocaleString()}</span>
                  <span className="kpi-badge kpi-badge-green">Verified</span>
                </div>
              </div>

              <div className="kpi-card kpi-teal">
                <div className="kpi-icon-wrap kpi-icon-teal">{Icons.home}</div>
                <div className="kpi-info">
                  <span className="kpi-label">Total Households</span>
                  <span className="kpi-value">{stats.totalHouseholds.toLocaleString()}</span>
                  <span className="kpi-badge kpi-badge-green">Recorded</span>
                </div>
              </div>

              <div className="kpi-card kpi-amber">
                <div className="kpi-icon-wrap kpi-icon-amber">{Icons.clipboard}</div>
                <div className="kpi-info">
                  <span className="kpi-label">Pending Verification</span>
                  <span className="kpi-value">{stats.pendingVerification}</span>
                  {stats.pendingVerification > 0 ? (
                    <span className="kpi-badge kpi-badge-amber">Awaiting Review</span>
                  ) : (
                    <span className="kpi-badge kpi-badge-green">All Reviewed</span>
                  )}
                </div>
              </div>

              <div className="kpi-card kpi-purple">
                <div className="kpi-icon-wrap kpi-icon-purple"><Megaphone {...iconProps} /></div>
                <div className="kpi-info">
                  <span className="kpi-label">Announcements</span>
                  <span className="kpi-value">{announcements.length}</span>
                  <span className="kpi-badge kpi-badge-green">Published</span>
                </div>
              </div>
            </div>

            {/* ── Two Column Layout: Main + Sidebar ── */}
            <div className="dash-two-col">

              {/* ── LEFT: Analytics Charts ── */}
              <div className="dash-main-col">

                {/* Row 1: Line + Doughnut */}
                <div className="charts-row">
                  <div className="dash-card chart-card chart-card-wide" id="chart-resident-growth">
                    <div className="dash-card-header">
                      <h2 className="dash-card-title">
                        <TrendingUp size={18} strokeWidth={2} className="card-title-icon" />
                        Resident Growth
                      </h2>
                      <span className="chart-period-badge">
                        {timeFilter === 'all' ? 'All Time' : 
                         timeFilter === '1year' ? 'Past 1 Year' : 
                         timeFilter === '1month' ? 'Past 1 Month' : 
                         timeFilter === '14days' ? 'Past 14 Days' : 'Past 7 Days'}
                      </span>
                    </div>
                    <div className="chart-container chart-container-line">
                      <Line data={residentGrowthData} options={lineOpts} />
                    </div>
                  </div>

                  <div className="dash-card chart-card chart-card-narrow" id="chart-status-dist">
                    <div className="dash-card-header">
                      <h2 className="dash-card-title">
                        <PieChart size={18} strokeWidth={2} className="card-title-icon" />
                        User Status
                      </h2>
                    </div>
                    <div className="chart-container chart-container-doughnut">
                      <Doughnut data={statusDistData} options={doughnutOpts} />
                    </div>
                    <div className="doughnut-center-label">
                      <span className="doughnut-center-num">
                        {statusDistData.datasets[0].data.reduce((a, b) => a + b, 0)}
                      </span>
                      <span className="doughnut-center-text">Total</span>
                    </div>
                  </div>
                </div>

                {/* Row 2: Bar + Doughnut */}
                <div className="charts-row">
                  <div className="dash-card chart-card chart-card-half" id="chart-households-purok">
                    <div className="dash-card-header">
                      <h2 className="dash-card-title">
                        <BarChart3 size={18} strokeWidth={2} className="card-title-icon" />
                        Households by Purok
                      </h2>
                    </div>
                    <div className="chart-container chart-container-bar">
                      <Bar data={householdByPurokData} options={barOpts} />
                    </div>
                  </div>

                  <div className="dash-card chart-card chart-card-half" id="chart-announcements-cat">
                    <div className="dash-card-header">
                      <h2 className="dash-card-title">
                        <Megaphone size={18} strokeWidth={2} className="card-title-icon" />
                        Announcements by Category
                      </h2>
                    </div>
                    <div className="chart-container chart-container-doughnut">
                      <Doughnut data={announcementsCategoryData} options={doughnutOpts} />
                    </div>
                    <div className="doughnut-center-label">
                      <span className="doughnut-center-num">
                        {announcementsCategoryData.datasets[0].data.reduce((a, b) => a + b, 0)}
                      </span>
                      <span className="doughnut-center-text">Posts</span>
                    </div>
                  </div>
                </div>

                {/* Row 3: Events Overview */}
                <div className="charts-row">

                  <div className="dash-card chart-card chart-card-half" id="chart-events-overview">
                    <div className="dash-card-header">
                      <h2 className="dash-card-title">
                        <Calendar size={18} strokeWidth={2} className="card-title-icon" />
                        Events Overview
                      </h2>
                    </div>
                    <div className="chart-container chart-container-bar">
                      <Bar data={eventsOverviewData} options={barOpts} />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── RIGHT: Sidebar ── */}
              <div className="dash-sidebar-col">

                {/* Quick Actions */}
                <div className="dash-card sidebar-card" id="quick-actions-card">
                  <div className="dash-card-header">
                    <h2 className="dash-card-title">Quick Actions</h2>
                  </div>
                  <div className="sidebar-quick-actions">
                    <Link to="/admin/announcements" className="sidebar-qa-btn">
                      <div className="qa-icon-wrap qa-blue">{Icons.megaphone}</div>
                      <span className="qa-label">Announcements</span>
                    </Link>
                    <Link to="/admin/residents" className="sidebar-qa-btn">
                      <div className="qa-icon-wrap qa-teal">{Icons.people}</div>
                      <span className="qa-label">Manage Residents</span>
                    </Link>
                    <Link to="/admin/households" className="sidebar-qa-btn">
                      <div className="qa-icon-wrap qa-teal">{Icons.home}</div>
                      <span className="qa-label">Household Profiling</span>
                    </Link>
                    <Link to="/admin/accounts" className="sidebar-qa-btn">
                      <div className="qa-icon-wrap qa-amber">{Icons.clipboard}</div>
                      <span className="qa-label">Admin Accounts</span>
                    </Link>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="dash-card sidebar-card activity-card" id="recent-activity-card">
                  <div className="dash-card-header">
                    <h2 className="dash-card-title">
                      <Clock size={16} strokeWidth={2} className="card-title-icon" />
                      Recent Activity
                    </h2>
                  </div>
                  <div className="activity-feed">
                    {activityLogs.length === 0 ? (
                      <div className="activity-empty">
                        <Activity size={36} strokeWidth={1.5} />
                        <p>No recent activity yet</p>
                        <span>Actions across the system will appear here</span>
                      </div>
                    ) : (
                      activityLogs.map((log) => (
                        <div key={log.id} className="activity-item">
                          <div className={`activity-icon-dot ${getActionColor(log.action)}`}>
                            {getActivityIcon(log.module)}
                          </div>
                          <div className="activity-content">
                            <p className="activity-desc">{log.description}</p>
                            <div className="activity-meta">
                              <span className={`activity-action-badge ${getActionColor(log.action)}`}>
                                {getActionLabel(log.action)}
                              </span>
                              <span className="activity-time">{getRelativeTime(log.timestamp)}</span>
                            </div>
                            <span className="activity-admin">{log.performedByName}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </PageLoader>
  );
};

export default AdminDashboard;
