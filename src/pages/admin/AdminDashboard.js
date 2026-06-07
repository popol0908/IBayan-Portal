import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Megaphone, Home, ClipboardCheck, TrendingUp,
  FileDown, Activity, Calendar, BarChart3, PieChart,
  Clock, UserCheck, UserX, Trash2, Pencil, Plus,
  CheckCircle, XCircle, ShieldCheck, FileText, Table
} from '../../components/Icons';
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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

const getFilterBounds = (filter, customRange) => {
  const now = new Date();
  let from = new Date(now);
  from.setHours(0, 0, 0, 0);
  let to = new Date(now);
  to.setHours(23, 59, 59, 999);

  if (filter === 'custom' && customRange) {
    from = new Date(customRange.from + 'T00:00:00');
    to = new Date(customRange.to + 'T23:59:59');
  } else if (filter === 'thisWeek') {
    from.setDate(now.getDate() - now.getDay()); // Sunday
  } else if (filter === 'thisMonth') {
    from.setDate(1); // 1st of month
  } else if (filter === 'thisYear') {
    from.setMonth(0, 1); // Jan 1st
  } else if (filter === 'all') {
    from = new Date(0); // 1970
  }
  return { from, to };
};

const isWithinFilter = (dateStrOrTimestamp, filter, customRange) => {
  if (filter === 'all' || !dateStrOrTimestamp) return true;
  const date = dateStrOrTimestamp.toDate ? dateStrOrTimestamp.toDate() : new Date(dateStrOrTimestamp);
  if (isNaN(date.getTime())) return true;
  
  const { from, to } = getFilterBounds(filter, customRange);
  return date >= from && date <= to;
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
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  // Memoize the custom range object so it can be used stably in useMemo deps
  const customRange = (timeFilter === 'custom' && customDateFrom && customDateTo)
    ? { from: customDateFrom, to: customDateTo }
    : null;

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
    const isDaily = timeFilter === 'today' || timeFilter === 'thisWeek' || timeFilter === 'thisMonth' || (timeFilter === 'custom' && customRange);
    const now = new Date();

    const filteredUsers = allUsers.filter(u => {
      if (u.status !== 'verified' || !u.verifiedAt) return false;
      return isWithinFilter(u.verifiedAt, timeFilter, customRange);
    });

    if (isDaily) {
      const { from, to } = getFilterBounds(timeFilter, customRange);
      const diffTime = Math.abs(to - from);
      let daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (daysCount === 0) daysCount = 1;
      if (daysCount > 90) daysCount = 90; // cap for performance
      
      for (let i = 0; i < daysCount; i++) {
        const d = new Date(from);
        d.setDate(from.getDate() + i);
        if (d > new Date()) break; // don't show future dates on chart
        
        dataPoints.push({
          label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          year: d.getFullYear(),
          month: d.getMonth(),
          date: d.getDate(),
        });
      }
    } else {
      const monthsCount = timeFilter === 'thisYear' ? 12 : 6;
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
      if (dataPoints.length === 0) return false;
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
  }, [allUsers, timeFilter, customRange]);

  /* ── Chart Data: User Status Distribution ── */
  const statusDistData = useMemo(() => {
    const filtered = allUsers.filter(u => isWithinFilter(u.verifiedAt || u.createdAt, timeFilter, customRange));
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
  }, [allUsers, timeFilter, customRange]);

  /* ── Chart Data: Households by Purok ── */
  const householdByPurokData = useMemo(() => {
    const purokMap = {};
    const filtered = households.filter(h => isWithinFilter(h.createdAt, timeFilter, customRange));
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
  }, [households, timeFilter, customRange]);

  /* ── Chart Data: Events Overview ── */
  const eventsOverviewData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const filteredEvents = events.filter(e => isWithinFilter(e.createdAt || e.eventDate, timeFilter, customRange));
    const filteredRegs = registrations.filter(r => isWithinFilter(r.registrationDate, timeFilter, customRange));
    
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
  }, [events, registrations, timeFilter, customRange]);

  /* ── Chart Data: Announcements by Category ── */
  const announcementsCategoryData = useMemo(() => {
    const filtered = announcements.filter(a => isWithinFilter(a.createdAt || a.datePosted, timeFilter, customRange));
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
  }, [announcements, timeFilter, customRange]);

  /* ── Chart Data: Household Members by Age Group ── */
  const ageGroupData = useMemo(() => {
    const groups = { '0-17': 0, '18-30': 0, '31-45': 0, '46-60': 0, '60+': 0 };
    const filtered = households.filter(h => isWithinFilter(h.createdAt, timeFilter, customRange));
    filtered.forEach(h => {
      (h.members || []).forEach(m => {
        if (!m.dateOfBirth) return;
        const bd = m.dateOfBirth.toDate ? m.dateOfBirth.toDate() : new Date(m.dateOfBirth);
        const age = Math.floor((Date.now() - bd.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        if (age <= 17) groups['0-17']++;
        else if (age <= 30) groups['18-30']++;
        else if (age <= 45) groups['31-45']++;
        else if (age <= 60) groups['46-60']++;
        else groups['60+']++;
      });
    });
    return {
      labels: Object.keys(groups),
      datasets: [{
        label: 'Members',
        data: Object.values(groups),
        backgroundColor: ['#3B82F6', '#14B8A6', '#F59E0B', '#8B5CF6', '#EF4444'],
        borderRadius: 8, borderSkipped: false,
      }],
    };
  }, [households, timeFilter, customRange]);

  /* ── Chart Data: Civil Status ── */
  const civilStatusData = useMemo(() => {
    const map = {};
    const filtered = households.filter(h => isWithinFilter(h.createdAt, timeFilter, customRange));
    filtered.forEach(h => {
      (h.members || []).forEach(m => {
        const cs = m.civilStatus || 'Unknown';
        map[cs] = (map[cs] || 0) + 1;
      });
    });
    const labels = Object.keys(map);
    return {
      labels,
      datasets: [{
        data: Object.values(map),
        backgroundColor: ['#3B82F6', '#14B8A6', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899'],
        borderColor: '#fff', borderWidth: 3, hoverOffset: 6,
      }],
    };
  }, [households, timeFilter, customRange]);

  /* ── Chart Data: Citizenship ── */
  const citizenshipData = useMemo(() => {
    const map = {};
    const filtered = households.filter(h => isWithinFilter(h.createdAt, timeFilter, customRange));
    filtered.forEach(h => {
      (h.members || []).forEach(m => {
        const c = m.citizenship || 'Unknown';
        map[c] = (map[c] || 0) + 1;
      });
    });
    return {
      labels: Object.keys(map),
      datasets: [{
        data: Object.values(map),
        backgroundColor: ['#1D9E75', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444'],
        borderColor: '#fff', borderWidth: 3, hoverOffset: 6,
      }],
    };
  }, [households, timeFilter, customRange]);

  /* ── Chart Data: Top Occupations ── */
  const occupationData = useMemo(() => {
    const map = {};
    const filtered = households.filter(h => isWithinFilter(h.createdAt, timeFilter, customRange));
    filtered.forEach(h => {
      (h.members || []).forEach(m => {
        const occ = (m.occupation || '').trim();
        if (!occ || occ === '—' || occ.toLowerCase() === 'n/a') return;
        map[occ] = (map[occ] || 0) + 1;
      });
    });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10);
    return {
      labels: sorted.map(([k]) => k),
      datasets: [{
        label: 'Members',
        data: sorted.map(([, v]) => v),
        backgroundColor: 'rgba(29, 158, 117, 0.75)',
        borderRadius: 8, borderSkipped: false,
      }],
    };
  }, [households, timeFilter, customRange]);

  /* ── Chart Data: Gender Distribution ── */
  const genderData = useMemo(() => {
    const map = {};
    const filtered = households.filter(h => isWithinFilter(h.createdAt, timeFilter, customRange));
    filtered.forEach(h => {
      (h.members || []).forEach(m => {
        const g = m.gender || 'Unknown';
        map[g] = (map[g] || 0) + 1;
      });
    });
    return {
      labels: Object.keys(map),
      datasets: [{
        data: Object.values(map),
        backgroundColor: ['#3B82F6', '#EC4899', '#94A3B8'],
        borderColor: '#fff', borderWidth: 3, hoverOffset: 6,
      }],
    };
  }, [households, timeFilter, customRange]);

  /* ── Export PDF Report ── */
  const handleExportPDF = () => {
    const filteredUsers = allUsers.filter(u => isWithinFilter(u.verifiedAt || u.createdAt, timeFilter, customRange));
    const filteredEvents = events.filter(e => isWithinFilter(e.createdAt || e.eventDate, timeFilter, customRange));
    const filteredAnnouncements = announcements.filter(a => isWithinFilter(a.createdAt || a.datePosted, timeFilter, customRange));
    const filteredRegs = registrations.filter(r => isWithinFilter(r.registrationDate, timeFilter, customRange));
    const filteredHouseholds = households.filter(h => isWithinFilter(h.createdAt, timeFilter, customRange));
    const filteredLogs = activityLogs.filter(l => isWithinFilter(l.timestamp, timeFilter, customRange));

    const formatDate = (d) => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    let periodString;

    if (timeFilter === 'all') {
      const allDates = [
        ...allUsers.map(u => u.createdAt || u.verifiedAt),
        ...events.map(e => e.createdAt || e.eventDate),
        ...announcements.map(a => a.createdAt || a.datePosted),
        ...registrations.map(r => r.registrationDate),
        ...households.map(h => h.createdAt),
        ...activityLogs.map(l => l.timestamp)
      ].filter(Boolean).map(d => {
        if (d.toDate) return d.toDate();
        return new Date(d);
      }).filter(d => !isNaN(d.getTime()));
      
      const earliestDate = allDates.length > 0 ? new Date(Math.min(...allDates)) : new Date();
      periodString = `${formatDate(earliestDate)} – ${formatDate(new Date())}`;
    } else {
      const { from, to } = getFilterBounds(timeFilter, customRange);
      // For PDF, if the "to" date is in the future, we can cap it at "Today" for display, or show the actual bounds.
      // E.g., if "This Year", it shows Jan 1 - Dec 31, or Jan 1 - Today. The user prefers Jan 1 - Today.
      const displayTo = to > new Date() ? new Date() : to;
      periodString = `${formatDate(from)} – ${formatDate(displayTo)}`;
    }

    const generatePDF = (logoImg = null) => {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      
      // Header
      let startY = 55; // Increased from 45 to add space between header and first table
      if (logoImg) {
        doc.addImage(logoImg, 'PNG', 14, 15, 24, 24);
      }
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text('ADMIN DASHBOARD REPORT', 42, 24);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(`Period: ${periodString}`, 42, 30);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 42, 35);

      const tableStyles = {
        headStyles: { fillColor: [248, 250, 252], textColor: [15, 23, 42], fontSize: 11, fontStyle: 'bold', lineWidth: 0.1, lineColor: [203, 213, 225] },
        styles: { fontSize: 9.5, cellPadding: 4, textColor: [51, 65, 85], lineWidth: 0.1, lineColor: [203, 213, 225] }
      };

      const renderTable = (title, head, body) => {
        if (!body || body.length === 0) return;
        
        let currentY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 12 : startY;
        if (currentY > pageHeight - 30) {
          doc.addPage();
          currentY = 20;
        }
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(title, 14, currentY);
        
        autoTable(doc, {
          startY: currentY + 5,
          head: head,
          body: body,
          ...tableStyles
        });
      };

      // 1. Key Metrics
      renderTable('Key Metrics', [['Metric', 'Value']], [
        ['Total Verified Residents (All-Time)', stats.totalResidents.toString()],
        ['Total Households (All-Time)', stats.totalHouseholds.toString()],
        ['Pending Verification (Current)', stats.pendingVerification.toString()],
        ['Events in Period', filteredEvents.length.toString()],
        ['Announcements in Period', filteredAnnouncements.length.toString()],
        ['Event Registrations in Period', filteredRegs.length.toString()],
      ]);

      // 2. User Status
      renderTable('User Verification Status', [['Status', 'Count']], [
        ['Verified', filteredUsers.filter(u => u.status === 'verified').length.toString()],
        ['Pending', filteredUsers.filter(u => u.status === 'pending').length.toString()],
        ['Declined', filteredUsers.filter(u => u.status === 'declined').length.toString()],
      ]);

      // 3. Households by Purok
      const purokMap = {};
      filteredHouseholds.forEach(h => { const p = h.purok || 'Unknown'; purokMap[p] = (purokMap[p] || 0) + 1; });
      const purokRows = Object.entries(purokMap).sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => [k, v.toString()]);
      renderTable('Households by Purok', [['Purok', 'Household Count']], purokRows);

      // 4. Events Overview
      renderTable('Events Overview', [['Status', 'Count']], eventsOverviewData.labels.map((label, idx) => [label, eventsOverviewData.datasets[0].data[idx].toString()]));

      // 5. Announcements by Category
      renderTable('Announcements by Category', [['Category', 'Count']], announcementsCategoryData.labels.map((label, idx) => [label, announcementsCategoryData.datasets[0].data[idx].toString()]));

      // 6. Household Members by Age Group
      renderTable('Household Members by Age Group', [['Age Group', 'Count']], ageGroupData.labels.map((label, idx) => [label, ageGroupData.datasets[0].data[idx].toString()]));

      // 7. Civil Status
      renderTable('Civil Status Distribution', [['Civil Status', 'Count']], civilStatusData.labels.map((label, idx) => [label, civilStatusData.datasets[0].data[idx].toString()]));

      // 8. Citizenship
      renderTable('Citizenship Distribution', [['Citizenship', 'Count']], citizenshipData.labels.map((label, idx) => [label, citizenshipData.datasets[0].data[idx].toString()]));

      // 9. Gender
      renderTable('Gender Distribution', [['Gender', 'Count']], genderData.labels.map((label, idx) => [label, genderData.datasets[0].data[idx].toString()]));

      // 10. Top Occupations
      renderTable('Top Occupations', [['Occupation', 'Count']], occupationData.labels.map((label, idx) => [label, occupationData.datasets[0].data[idx].toString()]));

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text(
          'Barangay Mabayuan, Olongapo City, Zambales',
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      doc.save(`Dashboard_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    // Load logo image first, then generate PDF
    const img = new Image();
    img.src = '/logo.png';
    img.onload = () => {
      generatePDF(img);
    };
    img.onerror = () => {
      console.warn("Could not load logo for PDF. Generating without logo.");
      generatePDF(null);
    };
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
                <div className="dash-filter-group">
                  <select 
                    className="dash-time-filter"
                    value={timeFilter}
                    onChange={(e) => setTimeFilter(e.target.value)}
                  >
                    <option value="today">Today</option>
                    <option value="thisWeek">This Week</option>
                    <option value="thisMonth">This Month</option>
                    <option value="thisYear">This Year</option>
                    <option value="all">All Time</option>
                    <option value="custom">Custom Range</option>
                  </select>
                  {timeFilter === 'custom' && (
                    <div className="custom-date-range">
                      <div className="date-range-field">
                        <label className="date-range-label">From</label>
                        <input
                          type="date"
                          className="date-range-input"
                          value={customDateFrom}
                          onChange={(e) => setCustomDateFrom(e.target.value)}
                          max={customDateTo || undefined}
                        />
                      </div>
                      <span className="date-range-separator">–</span>
                      <div className="date-range-field">
                        <label className="date-range-label">To</label>
                        <input
                          type="date"
                          className="date-range-input"
                          value={customDateTo}
                          onChange={(e) => setCustomDateTo(e.target.value)}
                          min={customDateFrom || undefined}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <button className="export-btn" onClick={handleExportPDF} title="Export Dashboard Report to PDF" disabled={timeFilter === 'custom' && (!customDateFrom || !customDateTo)}>
                  <FileText size={16} strokeWidth={2} />
                  <span>Export PDF</span>
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

                {/* ══════ SECTION: Residents Analytics ══════ */}
            <div className="analytics-section section-residents">
              <div className="section-header">
                <div className="section-header-icon section-icon-blue"><Users size={20} strokeWidth={2} /></div>
                <div>
                  <h2 className="section-title">Residents Analytics</h2>
                  <p className="section-desc">Growth trends and verification status</p>
                </div>
              </div>
              <div className="section-charts">
                <div className="dash-card chart-card chart-card-wide" id="chart-resident-growth">
                  <div className="dash-card-header">
                    <h2 className="dash-card-title">
                      <TrendingUp size={18} strokeWidth={2} className="card-title-icon" />
                      Resident Growth
                    </h2>
                    <span className="chart-period-badge">
                      {timeFilter === 'all' ? 'All Time' : 
                       timeFilter === 'thisYear' ? 'This Year' : 
                       timeFilter === 'thisMonth' ? 'This Month' : 
                       timeFilter === 'thisWeek' ? 'This Week' : 
                       timeFilter === 'today' ? 'Today' : 
                       'Custom Range'}
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
            </div>

            {/* ══════ SECTION: Household Analytics ══════ */}
            <div className="analytics-section section-household">
              <div className="section-header">
                <div className="section-header-icon section-icon-teal"><Home size={20} strokeWidth={2} /></div>
                <div>
                  <h2 className="section-title">Household Analytics</h2>
                  <p className="section-desc">Demographic distribution of household members</p>
                </div>
              </div>
              <div className="section-charts">
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
                <div className="dash-card chart-card chart-card-half" id="chart-age-group">
                  <div className="dash-card-header">
                    <h2 className="dash-card-title">
                      <BarChart3 size={18} strokeWidth={2} className="card-title-icon" />
                      Members by Age Group
                    </h2>
                  </div>
                  <div className="chart-container chart-container-bar">
                    <Bar data={ageGroupData} options={barOpts} />
                  </div>
                </div>
              </div>
              <div className="section-charts">
                <div className="dash-card chart-card chart-card-half" id="chart-civil-status">
                  <div className="dash-card-header">
                    <h2 className="dash-card-title">
                      <PieChart size={18} strokeWidth={2} className="card-title-icon" />
                      Civil Status
                    </h2>
                  </div>
                  <div className="chart-container chart-container-doughnut">
                    <Doughnut data={civilStatusData} options={doughnutOpts} />
                  </div>
                </div>
                <div className="dash-card chart-card chart-card-half" id="chart-gender">
                  <div className="dash-card-header">
                    <h2 className="dash-card-title">
                      <PieChart size={18} strokeWidth={2} className="card-title-icon" />
                      Gender Distribution
                    </h2>
                  </div>
                  <div className="chart-container chart-container-doughnut">
                    <Doughnut data={genderData} options={doughnutOpts} />
                  </div>
                </div>
              </div>
              <div className="section-charts">
                <div className="dash-card chart-card chart-card-half" id="chart-citizenship">
                  <div className="dash-card-header">
                    <h2 className="dash-card-title">
                      <PieChart size={18} strokeWidth={2} className="card-title-icon" />
                      Citizenship
                    </h2>
                  </div>
                  <div className="chart-container chart-container-doughnut">
                    <Doughnut data={citizenshipData} options={doughnutOpts} />
                  </div>
                </div>
                <div className="dash-card chart-card chart-card-half" id="chart-occupation">
                  <div className="dash-card-header">
                    <h2 className="dash-card-title">
                      <BarChart3 size={18} strokeWidth={2} className="card-title-icon" />
                      Top Occupations
                    </h2>
                  </div>
                  <div className="chart-container chart-container-bar">
                    <Bar data={occupationData} options={{...barOpts, indexAxis: 'y'}} />
                  </div>
                </div>
              </div>
            </div>

            {/* ══════ SECTION: Announcements Analytics ══════ */}
            <div className="analytics-section section-announcements">
              <div className="section-header">
                <div className="section-header-icon section-icon-purple"><Megaphone size={20} strokeWidth={2} /></div>
                <div>
                  <h2 className="section-title">Announcements Analytics</h2>
                  <p className="section-desc">Distribution of announcements by category</p>
                </div>
              </div>
              <div className="section-charts">
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
            </div>

            {/* ══════ SECTION: Events Analytics ══════ */}
            <div className="analytics-section section-events">
              <div className="section-header">
                <div className="section-header-icon section-icon-amber"><Calendar size={20} strokeWidth={2} /></div>
                <div>
                  <h2 className="section-title">Events & Programs Analytics</h2>
                  <p className="section-desc">Event status and registration overview</p>
                </div>
              </div>
              <div className="section-charts">
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
