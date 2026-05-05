<p align="center">
  <img src="public/logo.png" alt="iBayan Portal" width="120" />
</p>

<h1 align="center">iBayan Portal</h1>

<p align="center">
  <strong>Barangay Mabayuan's Official Digital Governance Platform</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Vite-5.1-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Firebase-12.4-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase" />
  <img src="https://img.shields.io/badge/Gemini_AI-Integrated-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Gemini AI" />
</p>

<p align="center">
  <em>Empowering the community of Barangay Mabayuan, Olongapo City through digital innovation and efficient resident management.</em>
</p>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Firestore Security Rules](#firestore-security-rules)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Data Privacy](#data-privacy)

---

## Overview

**iBayan Portal** is a full-featured, responsive web application built to modernize how Barangay Mabayuan communicates with and serves its residents. The platform digitizes core barangay operations — from announcements and emergency alerts to household profiling and event management — all accessible from any device.

The system features a **dual-portal architecture**:

| Portal | Audience | Key Capabilities |
|--------|----------|-------------------|
| **Resident Portal** | Verified barangay residents | Dashboard, announcements, events, emergency hotlines, household profile, AI chat assistant |
| **Admin Portal** | Barangay officials & staff | Analytics dashboard, resident verification, content management, household profiling, admin account management |

---

## Features

### Resident Portal

- **Dashboard** — Personalized overview with recent announcements, quick-access cards, and community highlights.
- **Announcements** — Browse official barangay announcements with category filtering, pinned posts, images, and timestamps.
- **Events & Programs** — Discover upcoming community events, view details, and register online (RSVP).
- **Emergency Hotlines** — Access critical emergency contact numbers and safety resources.
- **Household Profile** — Register and manage household information digitally for accurate community records.
- **Profile Management** — View/update personal information and track account verification status.
- **AI Chat Assistant** — Get instant help navigating the portal powered by Google Gemini AI with a curated knowledge base.
- **Real-Time Notifications** — Receive in-app notifications for important updates via a notification bell.

### Admin Portal

- **Analytics Dashboard** — KPI metrics (total residents, pending verifications, active alerts) with interactive charts (Chart.js), time-range filters (7d / 14d / 1mo / 1yr / all-time), and PDF/CSV report exports.
- **Manage Announcements** — Full CRUD with category tagging (Environment, Health, Safety, Events, Services), image uploads, pinning, and archiving.
- **Resident Verification** — Review, approve, or decline resident registrations with document inspection.
- **Manage Events** — Create and manage barangay events and programs with RSVP tracking and print views.
- **Household Profiling** — Administer household records with sequential ID generation, search, and print/export capabilities.
- **Admin Accounts** — Add or remove admin accounts using a secondary Firebase Auth instance (no session interruption).
- **Activity & Audit Logs** — Immutable audit trail for all administrative actions.

### Platform-Wide

- **Responsive Design** — Mobile-first layout with touch-optimized controls (44×44px targets).
- **Email Verification** — Secure email-based account activation flow.
- **Password Recovery** — Self-service forgot/reset password workflow.
- **Route Protection** — Role-based access control with separate `ProtectedRoute` and `AdminProtectedRoute` guards.
- **Page Transitions** — Smooth loading states with animated transitions between routes.
- **Vercel Speed Insights** — Performance monitoring integration.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, React Router v6 |
| **Build Tool** | Vite 5 |
| **Styling** | Vanilla CSS (custom design system), Google Fonts (Inter) |
| **Backend / BaaS** | Firebase (Authentication, Cloud Firestore, Analytics) |
| **AI Assistant** | Google Gemini API (`@google/generative-ai`) |
| **Charts** | Chart.js + react-chartjs-2 |
| **PDF Generation** | jsPDF + jspdf-autotable |
| **Printing** | react-to-print |
| **Icons** | Lucide React |
| **Performance** | Vercel Speed Insights |
| **Hosting** | Vercel (with `_redirects` SPA support) |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- A [Firebase](https://console.firebase.google.com/) project with **Authentication** (Email/Password) and **Cloud Firestore** enabled
- A [Google AI Studio](https://aistudio.google.com/) API key for the Gemini chat assistant *(optional)*

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/popol0908/IBayan-Portal.git
   cd IBayan-Portal
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env` file in the project root (see [Environment Variables](#environment-variables)):

   ```env
   # Firebase Configuration
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

   # Google Generative AI (Gemini) — optional
   VITE_GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Deploy Firestore security rules**

   ```bash
   firebase deploy --only firestore:rules
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

   The app will open at **http://localhost:3000**.

### Build for Production

```bash
npm run build
npm run preview   # preview the production build locally
```

---

## Project Structure

```
barangay-system/
├── public/
│   ├── logo.png                 # Barangay Mabayuan seal
│   └── _redirects               # Vercel/Netlify SPA redirect rule
├── src/
│   ├── components/              # Reusable UI components
│   │   ├── AdminNavbar.js       # Admin sidebar navigation
│   │   ├── ChatAssistant.js     # AI-powered chat widget
│   │   ├── DateRangeFilter.js   # Time-range filter for analytics
│   │   ├── Icons.jsx            # Centralized Lucide icon re-exports
│   │   ├── KPISummary.js        # Dashboard KPI metric cards
│   │   ├── LegalModals.js       # Terms & Privacy policy modals
│   │   ├── Loading.js           # Full-screen loading overlay
│   │   ├── Navbar.js            # Resident sidebar navigation
│   │   ├── NotificationBell.js  # Real-time notification dropdown
│   │   ├── ProtectedRoute.js    # Auth guard for resident routes
│   │   ├── AdminProtectedRoute.js # Auth guard for admin routes
│   │   └── Toast.js             # Toast notification component
│   ├── contexts/                # React Context providers
│   │   ├── AuthContext.js       # Authentication state & user profile
│   │   ├── LoadingContext.js    # Global loading state
│   │   ├── SearchContext.js     # Search query state
│   │   └── ToastContext.js      # Toast notification state
│   ├── data/
│   │   └── knowledgeBase.json   # AI chat knowledge base (FAQ, guides)
│   ├── hooks/
│   │   └── useNotifications.js  # Real-time notification hook
│   ├── pages/                   # Route-level page components
│   │   ├── Dashboard.js         # Resident home dashboard
│   │   ├── Announcements.js     # Announcements listing
│   │   ├── Events.js            # Events & programs browser
│   │   ├── EmergencyHotlines.js # Emergency contacts page
│   │   ├── HouseholdProfile.js  # Resident household form
│   │   ├── Profile.js           # User profile management
│   │   ├── Landing.js           # Public landing page
│   │   ├── Login.js             # Resident login
│   │   ├── Signup.js            # Resident registration
│   │   ├── ForgotPassword.js    # Password recovery
│   │   ├── ResetPassword.js     # Password reset
│   │   ├── EmailVerification.js # Email verification handler
│   │   └── admin/               # Admin-only pages
│   │       ├── AdminDashboard.js    # Analytics & KPIs
│   │       ├── ManageAnnouncements.js
│   │       ├── ManageEvents.js
│   │       ├── ResidentVerification.js
│   │       ├── HouseholdProfiling.js
│   │       ├── ManageAdminAccounts.js
│   │       └── ChangePassword.js
│   ├── services/                # Business logic & API services
│   │   ├── activityLogService.js  # Admin activity logging
│   │   ├── archiveService.js      # Soft-delete archiving
│   │   ├── chatService.js         # Gemini AI chat integration
│   │   └── dataService.js         # Firestore CRUD & real-time subscriptions
│   ├── styles/
│   │   └── common.css           # Shared utility styles
│   ├── utils/
│   │   └── validation.js        # Form validation helpers
│   ├── firebase.js              # Firebase initialization & helpers
│   ├── App.js                   # Root component with routing
│   ├── App.css                  # Global application styles
│   ├── index.jsx                # Entry point
│   └── index.css                # CSS reset & base styles
├── firestore.rules              # Firestore security rules
├── vite.config.js               # Vite build configuration
├── package.json
└── .gitignore
```

---

## Environment Variables

Create a `.env` file in the project root with the following variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Yes | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Firebase Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | Firebase Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase Cloud Messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Yes | Firebase app ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | No | Firebase Analytics measurement ID |
| `VITE_GEMINI_API_KEY` | No | Google Gemini API key for AI chat assistant |

> **Important:** Never commit your `.env` file. It is already included in `.gitignore`.

---

## Firestore Security Rules

The application enforces comprehensive server-side security through Firestore rules:

- **Role-Based Access** — Separate permissions for residents, admins, and unauthenticated users.
- **Owner-Only Reads** — Users can only read their own profile, feedback, and notifications.
- **Admin Privileges** — Admins can read/write all collections and manage user accounts.
- **Immutable Audit Logs** — `activityLogs` and `auditLogs` collections are append-only (no updates or deletes).
- **Archived Records** — Soft-deleted records in `archived_*` collections are read-only and admin-restricted.
- **Vote Integrity** — Users can cast votes but cannot modify critical voting event fields (title, dates, type).

See [`firestore.rules`](firestore.rules) for the complete ruleset.

---

## Deployment

The project is configured for deployment on **Vercel**:

1. Connect your GitHub repository to [Vercel](https://vercel.com/).
2. Set the **Build Command** to `npm run build`.
3. Set the **Output Directory** to `dist`.
4. Add all [environment variables](#environment-variables) in the Vercel dashboard.
5. The `public/_redirects` file handles SPA client-side routing.

### Alternative: Netlify

The `_redirects` file also works with Netlify. Simply deploy with the same build settings.

---

## Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository.
2. **Create** a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Commit** your changes with clear messages:
   ```bash
   git commit -m "feat: add new feature description"
   ```
4. **Push** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
5. **Open a Pull Request** against the `main` branch.

### Commit Convention

| Prefix | Purpose |
|--------|---------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation changes |
| `style:` | Formatting, CSS changes (no logic change) |
| `refactor:` | Code restructuring (no feature/fix) |
| `perf:` | Performance improvement |
| `chore:` | Build, tooling, or dependency updates |

---

## Data Privacy

iBayan Portal is designed in compliance with the **Data Privacy Act of 2012 (RA 10173)**:

- All personal data is encrypted in transit (HTTPS) and at rest (Firebase infrastructure).
- Data is used exclusively for official barangay purposes.
- No personal information is sold or shared with third parties.
- Users can view and manage their own data through the Profile page.
- Terms of Service and Privacy Policy are accessible from the landing page.

---

<p align="center">
  <sub>Built for the community of <strong>Barangay Mabayuan, Olongapo City</strong></sub>
</p>
