# BloodLink Website Route and App Specification

This document describes the BloodLink website structure, each route, user role, main screen behavior, and backend API dependencies. At the end is a React Native app prompt for Maus to build the mobile app with the same core behavior and mobile-compatible specifications.

---

## 1. Website Overview

BloodLink is a role-based blood donation and emergency request platform with three main user roles:

- Donor: find nearby requests, check eligibility, book appointments, view donation history, earn badges, chat with hospitals/requesters, receive notifications.
- Hospital: manage inventory, raise requests, view request status, search donors, manage appointments, receive chat and notifications.
- Admin: monitor system metrics, manage users, view inventory and request logs, broadcast alerts, configure settings, view reports.

The website uses React Router for navigation and enforces protected routes based on the authenticated user role.

---

## 2. Public Routes

### `/`
- Component: `RoleRedirect`
- Behavior:
  - If not authenticated: show public landing page.
  - If authenticated: redirect by role.
  - Donor -> `/donor/dashboard`
  - Hospital -> `/hospital/dashboard`
  - Admin -> `/admin/dashboard`

### `/about`
- Component: `AboutPage`
- Purpose: public informational page about BloodLink.
- Key content: product summary, reliability, inventory, rewards, analytics.

### `/search`
- Component: `PublicSearchPage`
- Purpose: public donor search by blood group and city.
- API: `GET /api/donors/search?bloodGroup={}&city={}`
- Behavior: returns eligible donor results and displays count.

### `/contact`
- Component: `ContactPage`
- Purpose: public contact page with form and static contact info.
- Behavior: UI-only form that displays a toast success message.

### `/login`
- Component: `LoginPage`
- Purpose: authenticate existing users.
- API: `POST /api/auth/login`
- Behavior: redirects authenticated users to role dashboard.

### `/register`
- Component: `RegisterPage`
- Purpose: new user registration for donors and hospitals.
- APIs: `POST /api/auth/send-otp`, `POST /api/auth/verify-otp`, `POST /api/auth/signup`
- Behavior: OTP-based signup flow, chooses donor or hospital role.

### `/forgot-password`
- Component: `ForgotPasswordPage`
- Purpose: password reset flow.
- APIs: `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`
- Screen steps: send email -> enter reset code -> set new password.

---

## 3. Donor Routes

### `/donor/dashboard`
- Component: `DonorDashboard`
- Purpose: main donor overview.
- APIs:
  - `GET /api/eligibility/status`
  - `GET /api/loyalty/my-stats`
  - `GET /api/donations/my-history`
  - `GET /api/notifications`
- Features:
  - eligibility card
  - donation stats
  - points and badge summary
  - quick actions
  - recent notifications
  - deferred eligibility banner

### `/donor/profile`
- Component: `DonorProfile`
- Purpose: edit donor profile and update location.
- APIs:
  - `PUT /api/auth/me`
  - `PUT /api/donors/location`
- Features:
  - first/last name, phone, city, blood group
  - update current location with browser geolocation

### `/donor/eligibility`
- Component: `EligibilityPage`
- Purpose: multi-step eligibility check and previous result.
- API: `POST /api/eligibility/check`, `GET /api/eligibility/status`
- Features:
  - 4-step form: basics, health, exposure, vitals
  - shows previous eligibility status and deferral reason
  - socket refresh on eligibility changes

### `/donor/appointments`
- Component: `BookAppointment`
- Purpose: schedule blood donation appointments.
- APIs:
  - `GET /api/eligibility/status`
  - `GET /api/hospitals/list`
  - `GET /api/donations/my-history`
  - `POST /api/appointments`
- Features:
  - hospital selection
  - date picker
  - time slot selection
  - confirmation card with Add to Calendar `.ics`

### `/donor/history`
- Component: `DonationHistory`
- Purpose: view donation history and download certificates.
- API: `GET /api/donations/my-history`
- Features:
  - donation list table
  - certificate PDF generation
  - empty state guiding donor to book appointment

### `/donor/badges`
- Component: `BadgesPage`
- Purpose: view loyalty points and earned badges.
- APIs:
  - `GET /api/loyalty/my-stats`
  - `GET /api/loyalty/leaderboard`
- Features:
  - points balance
  - badge progress
  - leaderboard display

### `/donor/notifications`
- Component: `NotificationsPage`
- Purpose: donor notifications and blood request responses.
- API: `GET /api/notifications`, `PUT /api/notifications/read-all`, `PUT /api/notifications/:id/read`, `DELETE /api/notifications/:id`, `DELETE /api/notifications/all`, `PUT /api/blood-requests/:id/respond`
- Features:
  - mark all read
  - clear all
  - accept/decline blood requests
  - open chat from donor response notifications
  - empty state when no notifications

### `/donor/chats`
- Component: `ConversationsPage`
- Purpose: list active and closed chat conversations.
- API: `GET /api/chats`
- Features:
  - active chats first
  - chat open button
  - socket refresh on chat events

### `/donor/nearby-requests`
- Component: `NearbyRequestsPage`
- Purpose: show nearby open blood requests.
- APIs:
  - `PUT /api/donors/location`
  - `GET /api/blood-requests/nearby`
  - `PUT /api/blood-requests/:id/respond`
- Features:
  - location permission prompt
  - list of nearby requests
  - accept open requests
  - empty state when none found

### `/donor/blood-finder`
- Component: `BloodFinder`
- Purpose: search hospitals and donors by blood group.
- API: `GET /api/blood-finder`
- Features:
  - blood group filter
  - search results for hospitals and donors
  - call hospital phone and directions links

### `/donor/sos`
- Component: `RaiseRequest`
- Purpose: raise emergency SOS blood request.
- APIs:
  - `PUT /api/donors/location`
  - `GET /api/donors/count`
  - `POST /api/blood-requests`
  - `PUT /api/blood-requests/:id/status`
- Features:
  - select blood group, urgency, units, radius, notes
  - live eligible donor count
  - cancel SOS request before accepted
  - location-based request dispatch

### `/donor/chat/:requestId`
- Component: `ChatPage`
- Purpose: chat for accepted request.
- APIs:
  - `GET /api/chats/:requestId`
  - `POST /api/chats/:requestId/messages`
  - `PUT /api/blood-requests/:id/complete-donation`
  - `PUT /api/blood-requests/:id/status`
- Features:
  - realtime socket message stream
  - join request room via socket event
  - mark donation completed
  - donor no-show / reopen request

---

## 4. Hospital Routes

### `/hospital/dashboard`
- Component: `HospitalDashboard`
- Purpose: hospital overview and stock status.
- APIs:
  - `GET /api/inventory`
  - `GET /api/blood-requests`
  - `GET /api/inventory/expiry-alerts`
- Features:
  - inventory totals by blood group
  - open request count
  - expiry alert count
  - suspended user banner
  - pending approval redirect for unapproved hospitals

### `/hospital/pending`
- Component: `HospitalPendingApproval`
- Purpose: holding screen for hospitals awaiting admin approval.
- Behavior: simple banner messaging.

### `/hospital/inventory`
- Component: `BloodInventory`
- Purpose: manage hospital blood stock.
- APIs:
  - `GET /api/inventory`
  - `POST /api/inventory`
  - `DELETE /api/inventory/:id`
- Features:
  - add blood stock
  - delete stock
  - export CSV
  - low-stock styling

### `/hospital/raise-request`
- Component: `RaiseRequest`
- Purpose: hospital blood request creation.
- APIs:
  - `PUT /api/donors/location`
  - `GET /api/donors/count`
  - `POST /api/blood-requests`
- Features:
  - request blood or raise SOS alerts
  - shows number of eligible donors
  - location update

### `/hospital/requests`
- Component: `RequestStatus`
- Purpose: hospital request status dashboard.
- API: `GET /api/blood-requests`
- Features:
  - list of request cards
  - open chat if accepted donor exists
  - mark request fulfilled

### `/hospital/donor-search`
- Component: `DonorSearch`
- Purpose: search donors by blood group and city.
- API: `GET /api/donors/search`
- Features:
  - donor result cards
  - request donor action placeholder

### `/hospital/blood-finder`
- Component: `BloodFinder`
- Purpose: same blood-finder as donor with hospital/donor results.

### `/hospital/expiry-alerts`
- Component: `ExpiryAlerts`
- Purpose: manage stock that is expiring soon.
- APIs:
  - `GET /api/inventory/expiry-alerts`
  - `DELETE /api/inventory/:id`
- Features:
  - expiry countdown
  - discard expired stock

### `/hospital/appointments`
- Component: `HospitalAppointments`
- Purpose: view hospital appointments and mark completed donations.
- APIs:
  - `GET /api/appointments`
  - `PUT /api/appointments/:id/complete`
- Features:
  - appointment list
  - mark donation completed

### `/hospital/profile`
- Component: `HospitalProfile`
- Purpose: edit hospital account details.
- API: `PUT /api/auth/me`
- Features:
  - hospital name, phone, city, pincode, license number, address

### `/hospital/notifications`
- Component: `HospitalNotifications`
- Purpose: hospital notifications feed.
- Same notification API surface as donor notifications.

### `/hospital/chats`
- Component: `ConversationsPage`
- Purpose: shared chat list for hospital.

### `/hospital/chat/:requestId`
- Component: `ChatPage`
- Purpose: chat with donor for a specific request.

---

## 5. Admin Routes

### `/admin/dashboard`
- Component: `AdminDashboard`
- Purpose: admin overview of system activity.
- Likely APIs: admin stats, analytics, inventory, users.
- Features: charts, totals, critical shortages, quick admin actions.

### `/admin/users`
- Component: `UserManagement`
- Purpose: manage donors, hospitals, and admin users.
- API: `GET /api/admin/users`, `PUT /api/admin/users/:id/approve`, `PUT /api/admin/users/:id/suspend`, `PUT /api/admin/users/:id/activate`

### `/admin/inventory`
- Component: `InventoryOverview`
- Purpose: view system-wide inventory.
- API: `GET /api/admin/inventory`

### `/admin/requests`
- Component: `RequestsLog`
- Purpose: admin request log review.
- API: `GET /api/admin/requests`

### `/admin/analytics`
- Component: `DonorAnalytics`
- Purpose: donation and donor analytics.
- API: `GET /api/admin/analytics`

### `/admin/broadcast`
- Component: `BroadcastAlerts`
- Purpose: send broadcast alerts to users.
- API: `POST /api/admin/broadcast`

### `/admin/settings`
- Component: `SystemSettings`
- Purpose: admin settings UI.
- Behavior: likely local settings page.

### `/admin/reports`
- Component: `Reports`
- Purpose: reporting UI.

---

## 6. Shared Route and Auth Behavior

### Role-based redirect logic
- Unauthenticated users: `LandingPage`
- Authenticated donors: `/donor/dashboard`
- Authenticated hospitals:
  - if `user.isApproved === false`: `/hospital/pending`
  - otherwise: `/hospital/dashboard`
- Authenticated admins: `/admin/dashboard`

### Protected route behavior
- `ProtectedRoute` checks the current user role and blocks routes if the role does not match.
- If unauthorized, the user is redirected to login.

### Common UI patterns
- Dashboard layout with sidebar and top navbar
- Cards, stat cards, tables, and empty states
- Red accent color for key actions and urgency states
- Toast notifications for success/error feedback
- Google Maps links for directions where available

---

## 7. Backend API Map (Website)

### Auth
- `POST /api/auth/login`
- `POST /api/auth/signup`
- `POST /api/auth/send-otp`
- `POST /api/auth/verify-otp`
- `GET /api/auth/me`
- `PUT /api/auth/me`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

### Eligibility
- `GET /api/eligibility/status`
- `POST /api/eligibility/check`

### Loyalty
- `GET /api/loyalty/my-stats`
- `GET /api/loyalty/leaderboard`

### Donations
- `GET /api/donations/my-history`

### Appointments
- `GET /api/appointments`
- `POST /api/appointments`
- `PUT /api/appointments/:id/complete`

### Inventory
- `GET /api/inventory`
- `POST /api/inventory`
- `DELETE /api/inventory/:id`
- `GET /api/inventory/expiry-alerts`

### Blood Requests
- `GET /api/blood-requests`
- `GET /api/blood-requests/nearby`
- `POST /api/blood-requests`
- `PUT /api/blood-requests/:id/respond`
- `PUT /api/blood-requests/:id/status`
- `PUT /api/blood-requests/:id/complete-donation`

### Notifications
- `GET /api/notifications`
- `PUT /api/notifications/read-all`
- `PUT /api/notifications/:id/read`
- `DELETE /api/notifications/:id`
- `DELETE /api/notifications/all`

### Donors / Hospitals
- `GET /api/donors/search`
- `GET /api/donors/count`
- `PUT /api/donors/location`
- `GET /api/hospitals/list`

### Chat
- `GET /api/chats`
- `GET /api/chats/:requestId`
- `POST /api/chats/:requestId/messages`

### Blood Finder
- `GET /api/blood-finder`

---

## 8. Socket / Realtime Events

The website uses Socket.IO for realtime updates. Key event names in the app:

- `blood-request:new`
- `blood-request:closed`
- `blood-request:response`
- `chat:ready`
- `chat:message`
- `chat:unread`
- `eligibility:deferred`
- `donation:recorded`
- `blood-request:fulfilled`
- `blood-request:cancelled`

These events are used to refresh notifications, chat lists, eligibility status, and donation status in realtime.

---

## 9. Mobile App Requirements for BloodLink

Use this section as the specification for the new React Native app.

### Core requirements
- Build with Expo / React Native.
- Support Android devices and low-end phones.
- Use a red-themed UI palette matching the web app accent color `#C0392B`.
- Keep screens and navigation simple, with clear role-based access.
- Use the same backend API routes as the website.
- Use local storage or AsyncStorage for auth token and API base override.
- Use geolocation for donor location, nearby requests, and SOS requests.
- Use Socket.IO client to receive realtime updates for notifications and chat.
- Provide a server connection override screen so the app can connect to the backend without server changes.

### Screen and route mapping

Public screens:
- Home / landing
- About
- Search donors
- Contact
- Login
- Register
- Forgot password

Donor screens:
- Donor dashboard
- My profile
- Eligibility check
- Book appointment
- Donation history
- Badges & points
- Notifications
- Chats
- Nearby requests
- Blood finder
- Emergency SOS
- Request chat

Hospital screens:
- Hospital dashboard
- Pending approval
- Blood inventory
- Raise request
- Request status
- Donor search
- Find blood
- Expiry alerts
- Appointments
- Hospital profile
- Notifications
- Chats
- Request chat

Admin screens:
- Admin dashboard
- User management
- Inventory overview
- Requests log
- Analytics
- Broadcast alerts
- Settings
- Reports

### Functional behavior
- Donor login should redirect to `/donor/dashboard`.
- Hospital login should redirect to `/hospital/dashboard` or `/hospital/pending` if not approved.
- Admin login should redirect to `/admin/dashboard`.
- Protect routes by role and show a login screen if unauthenticated.
- Provide realtime notifications and chat updates via socket events.
- Allow donors to accept nearby requests and start chat.
- Allow hospitals to raise blood requests and manage request status.
- Allow admins to view system metrics and broadcast alerts.

### Important mobile compatibility notes
- Use minimal complex animations and avoid heavy web-only layout libraries.
- Use plain React Native components where possible: `View`, `Text`, `TextInput`, `Button`, `ScrollView`, `FlatList`.
- Use a single-column mobile-first layout.
- Use red accent buttons for primary actions, outlines for secondary actions, and muted gray backgrounds for cards.
- Keep text large and buttons easy to tap.
- Use device geolocation permission gracefully and show fallback messaging if location is unavailable.

---

## 10. Prompt to Create the React Native App

Use the prompt below to commission the mobile app.

> Build a React Native mobile app for BloodLink using Expo and React Native. The app must mirror the BloodLink website’s role-based donor, hospital, and admin workflows using the same backend API routes. The phone must support the exact mobile-capable behavior in this repository, including token-based auth, geolocation, realtime notifications/chat via Socket.IO, and a runtime server URL override.
>
> 
>
> Required screens and routes:
> - Public: landing, about, search donors, contact, login, register, forgot password.
> - Donor: dashboard, profile, eligibility, appointments, donation history, badges, notifications, chats, nearby requests, blood finder, emergency SOS, request chat.
> - Hospital: dashboard, pending approval, inventory, raise request, request status, donor search, blood finder, expiry alerts, appointments, profile, notifications, chats, request chat.
> - Admin: dashboard, user management, inventory overview, requests log, analytics, broadcast alerts, settings, reports.
>
> Required backend API endpoints:
> - Auth: `/api/auth/login`, `/api/auth/signup`, `/api/auth/send-otp`, `/api/auth/verify-otp`, `/api/auth/me`, `/api/auth/forgot-password`, `/api/auth/reset-password`
> - Eligibility: `/api/eligibility/status`, `/api/eligibility/check`
> - Loyalty: `/api/loyalty/my-stats`, `/api/loyalty/leaderboard`
> - Donations: `/api/donations/my-history`
> - Appointments: `/api/appointments`, `/api/appointments/:id/complete`
> - Inventory: `/api/inventory`, `/api/inventory/expiry-alerts`
> - Blood requests: `/api/blood-requests`, `/api/blood-requests/nearby`, `/api/blood-requests/:id/respond`, `/api/blood-requests/:id/status`, `/api/blood-requests/:id/complete-donation`
> - Notifications: `/api/notifications`, `/api/notifications/read-all`, `/api/notifications/:id/read`, `/api/notifications/all`
> - Donors / hospitals: `/api/donors/search`, `/api/donors/count`, `/api/donors/location`, `/api/hospitals/list`
> - Chat: `/api/chats`, `/api/chats/:requestId`, `/api/chats/:requestId/messages`
> - Blood finder: `/api/blood-finder`
>
> Essential app behavior:
> - Role-based protected navigation.
> - Realtime updates using Socket.IO events like `blood-request:new`, `blood-request:closed`, `blood-request:response`, `chat:ready`, `chat:message`, `eligibility:deferred`, `donation:recorded`, `blood-request:fulfilled`, and `blood-request:cancelled`.
> - Red accent theme and mobile-first UI.
> - Simple, robust layout for low-end Android phones.
> - Auth token persistence with secure storage.
> - Backend server URL override screen for runtime configuration.
> - Geolocation support for donors and hospital SOS/nearby flows.

---

## 11. File Reference

The website routes are defined in:
- `Frontend/src/App.jsx`
- `Frontend/src/pages/AppPages.jsx`

Public page content is defined in:
- `Frontend/src/pages/public/LandingPage.jsx`
- `Frontend/src/pages/public/AboutPage.jsx`
- `Frontend/src/pages/public/ContactPage.jsx`
- `Frontend/src/pages/public/PublicSearchPage.jsx`

Auth pages are defined in:
- `Frontend/src/pages/auth/LoginPage.jsx`
- `Frontend/src/pages/auth/RegisterPage.jsx`
- `Frontend/src/pages/AppPages.jsx` (`ForgotPasswordPage`)

Backend API helper is in:
- `Frontend/src/api/axios.js`

Socket context is in:
- `Frontend/src/context/SocketContext.jsx`

Protected route logic is in:
- `Frontend/src/components/common/ProtectedRoute.jsx`
