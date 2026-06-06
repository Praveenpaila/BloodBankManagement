# BloodLink Screen-To-Screen Handoff

This file is a compact, Claude-ready explanation of the BloodLink app. It covers what each screen does, how users move screen-to-screen, and which backend APIs support the main flows.

## 1. App Summary

BloodLink is a blood donation and emergency blood request platform with three primary roles:

- Donor: checks eligibility, books appointments, responds to SOS requests, chats with requesters, views donation history, badges, and notifications.
- Hospital/requester: manages blood inventory, raises blood requests, views request status, chats with accepting donors, searches donors, and handles expiry alerts.
- Admin: monitors users, requests, inventory, analytics, broadcasts alerts, and system settings.

Frontend:

- React + Vite
- Main route file: `Frontend/src/App.jsx`
- Main dashboard screen file: `Frontend/src/pages/AppPages.jsx`
- Realtime socket context: `Frontend/src/context/SocketContext.jsx`
- API helper: `Frontend/src/api/axios`

Backend:

- Express + MongoDB
- Main server file: `Server/server.js`
- API base path: `/api`
- Realtime Socket.IO initialized in `Server/utils/realtime.js`

## 2. Public Screens

### `/`

Component: `RoleRedirect`

Behavior:

- If user is not logged in, shows public landing page.
- If user is logged in, redirects to the correct dashboard based on role.

Role redirects:

- Donor -> `/donor/dashboard`
- Hospital -> `/hospital/dashboard`
- Admin -> `/admin/dashboard`

### `/about`

Component: `AboutPage`

Purpose:

- Public informational page about the app.

### `/search`

Component: `PublicSearchPage`

Purpose:

- Public donor/hospital search style page.

### `/contact`

Component: `ContactPage`

Purpose:

- Public contact page.

### `/login`

Component: `LoginPage`

Purpose:

- User login.
- On success, auth context stores token/user and app redirects by role.

Backend:

- `POST /api/auth/login`

### `/register`

Component: `RegisterPage`

Purpose:

- User registration.
- Supports donor/hospital style signup with OTP flow.

Backend:

- `POST /api/auth/send-otp`
- `POST /api/auth/verify-otp`
- `POST /api/auth/signup`

### `/forgot-password`

Component: `ForgotPasswordPage`

Purpose:

- Placeholder/simple forgot password UI.

## 3. Shared Dashboard Layout

Dashboard screens use:

- `DashboardLayout`
- `Navbar`
- `Sidebar`

File:

- `Frontend/src/components/common/DashboardLayout.jsx`

Every protected dashboard screen has:

- Top navigation
- Role-based sidebar
- Main page title/subtitle
- Screen content

## 4. Donor Screens

### `/donor/dashboard`

Component: `DonorDashboard`

Purpose:

- Donor overview screen.
- Shows eligibility status, points, badges count, next eligible date, recent donations, and recent notifications.

Backend calls:

- `GET /api/eligibility/status`
- `GET /api/loyalty/my-stats`
- `GET /api/donations/my-history`
- `GET /api/notifications`

Main navigation from here:

- Eligibility check
- Book appointment
- Nearby requests map/list
- Emergency SOS

### `/donor/profile`

Component: `DonorProfile`

Purpose:

- Edit profile fields.
- Update donor live location.

Backend calls:

- `PUT /api/auth/me`
- `PUT /api/donors/location`

### `/donor/eligibility`

Component: `EligibilityPage`

Purpose:

- Multi-step eligibility check.
- Collects age, weight, illness, medication, travel, tattoo/piercing, hemoglobin, and gender.
- Shows current or previous eligibility result.

Backend calls:

- `GET /api/eligibility/status`
- `POST /api/eligibility/check`

### `/donor/appointments`

Component: `BookAppointment`

Purpose:

- Lets eligible donors book an appointment with a hospital.
- Shows date picker and time slot selection.

Backend calls:

- `GET /api/eligibility/status`
- `GET /api/hospitals/list`
- `GET /api/donations/my-history`
- `POST /api/appointments`

### `/donor/history`

Component: `DonationHistory`

Purpose:

- Shows donor donation history.
- Shows total donations, lives impacted, donation streak, and certificate preview.

Backend calls:

- `GET /api/donations/my-history`

### `/donor/badges`

Component: `BadgesPage`

Purpose:

- Shows loyalty points, earned badges, locked badges, and leaderboard/activity records.

Backend calls:

- `GET /api/loyalty/my-stats`
- `GET /api/loyalty/leaderboard`

### `/donor/notifications`

Component: `NotificationsPage`

Purpose:

- Shows donor notifications.
- Blood request notifications can be accepted or declined.
- If donor accepts a request, donor is routed to chat.
- If a request has an accepted chat, notification can show Open Chat.

Backend calls:

- `GET /api/notifications`
- `PUT /api/blood-requests/:id/respond`

Realtime:

- Refreshes on `blood-request:new`
- Refreshes on `blood-request:closed`
- Refreshes on `blood-request:response`

### `/donor/nearby-requests`

Component: `NearbyRequestsPage`

Purpose:

- Donor sees nearby open/responding blood requests.
- Donor can accept a request.
- Accepted donor is navigated to chat.

Backend calls:

- `PUT /api/donors/location`
- `GET /api/blood-requests/nearby`
- `PUT /api/blood-requests/:id/respond`

### `/donor/sos`

Component: `RaiseRequest`

Purpose:

- Donor can raise emergency SOS for blood.
- Requires live location.
- Chooses blood group, urgency, units, radius, and notes.
- Sends request to matching nearby donors.

Backend calls:

- `PUT /api/donors/location`
- `GET /api/donors/count`
- `POST /api/blood-requests`

### `/donor/chat/:requestId`

Component: `ChatPage`

Purpose:

- Donor chat with requester for accepted blood request.
- Shows blood group, request units, urgency, other user phone, and message thread.

Backend calls:

- `GET /api/chats/:requestId`
- `POST /api/chats/:requestId/messages`

Realtime:

- Joins request room using socket event `request:join`
- Receives messages on `chat:message`
- Receives unread notification on `chat:unread`

## 5. Hospital / Requester Screens

### `/hospital/dashboard`

Component: `HospitalDashboard`

Purpose:

- Hospital overview dashboard.
- Shows inventory, requests, donation stats, and quick actions.

Typical backend calls:

- Inventory endpoints
- Request endpoints
- Donation history endpoints

### `/hospital/inventory`

Component: `BloodInventory`

Purpose:

- Hospital manages blood stock.
- Can add, edit, and delete stock items.

Backend calls:

- `GET /api/inventory`
- `POST /api/inventory`
- `PUT /api/inventory/:id`
- `DELETE /api/inventory/:id`

### `/hospital/raise-request`

Component: `RaiseRequest`

Purpose:

- Hospital raises blood request/SOS.
- Requires live/request location.
- Selects blood group, urgency, units, radius, and notes.
- Notifies compatible nearby donors.

Backend calls:

- `GET /api/donors/count`
- `POST /api/blood-requests`

Realtime after request:

- Nearby donors receive `blood-request:new`

### `/hospital/requests`

Component: `RequestStatus`

Purpose:

- Hospital sees all requests it created.
- Shows blood group, units, urgency, status, notified count, date, and actions.
- If a donor has accepted, Chat button remains available even if request is no longer exactly `responding`.
- If request is responding, hospital can mark it fulfilled.

Backend calls:

- `GET /api/blood-requests`
- `PUT /api/blood-requests/:id/status`

Chat behavior:

- Chat opens at `/hospital/chat/:requestId`
- Chat exists after a donor accepts the request.

### `/hospital/donor-search`

Component: `DonorSearch`

Purpose:

- Search donors by blood group and city.

Backend calls:

- `GET /api/donors/search`

### `/hospital/expiry-alerts`

Component: `ExpiryAlerts`

Purpose:

- Shows blood inventory expiring soon.
- Can discard/remove expiring stock.

Backend calls:

- `GET /api/inventory/expiry-alerts`
- `DELETE /api/inventory/:id`

### `/hospital/profile`

Component: `HospitalProfile`

Purpose:

- Currently reuses `DonorProfile`.
- Lets hospital update profile-style fields.

Backend calls:

- `PUT /api/auth/me`

### `/hospital/notifications`

Component: `HospitalNotifications`

Purpose:

- Shows hospital notifications.
- Donor response notifications include Open Chat when request chat is available.

Backend calls:

- `GET /api/notifications`

### `/hospital/chat/:requestId`

Component: `ChatPage`

Purpose:

- Requester/hospital chats with accepted donor.
- Requester can mark donation completed from chat if request is not fulfilled.

Backend calls:

- `GET /api/chats/:requestId`
- `POST /api/chats/:requestId/messages`
- `PUT /api/blood-requests/:id/complete-donation`

## 6. Admin Screens

### `/admin/dashboard`

Component: `AdminDashboard`

Purpose:

- Global admin overview.
- Shows total users, donors, hospitals, blood units, today’s requests, fulfilled requests, pending hospital approvals, critical shortages, and charts.

Backend calls:

- `GET /api/admin/stats`
- `GET /api/admin/analytics`
- `GET /api/admin/inventory`
- `GET /api/admin/users?role=hospital&limit=5`

### `/admin/users`

Component: `UserManagement`

Purpose:

- View and filter users by role.
- Approve hospitals.
- Suspend or activate users.

Backend calls:

- `GET /api/admin/users`
- `PUT /api/admin/users/:id/approve`
- `PUT /api/admin/users/:id/suspend`
- `PUT /api/admin/users/:id/activate`

### `/admin/inventory`

Component: `InventoryOverview`

Purpose:

- System-wide inventory overview.
- Shows blood units by blood group.

Backend calls:

- `GET /api/admin/inventory`

### `/admin/requests`

Component: `RequestsLog`

Purpose:

- Admin request log.
- Views blood requests across system.

Backend calls:

- `GET /api/admin/requests`

### `/admin/analytics`

Component: `DonorAnalytics`

Purpose:

- Shows donation analytics, retention, top donors, and blood group distribution.

Backend calls:

- `GET /api/admin/analytics`

### `/admin/broadcast`

Component: `BroadcastAlerts`

Purpose:

- Send broadcast notification to users.
- Can target role and blood group.

Backend calls:

- `POST /api/admin/broadcast`

### `/admin/settings`

Component: `SystemSettings`

Purpose:

- Local app settings placeholder.
- Saves settings to browser `localStorage`.

### `/admin/reports`

Component: `Reports`

Purpose:

- Placeholder report generation/export screen.

## 7. Emergency Blood Request Flow

This is the most important user flow.

### Step 1: Requester creates blood request

Screen:

- Hospital: `/hospital/raise-request`
- Donor SOS: `/donor/sos`

Frontend:

- Component `RaiseRequest`
- Requires location
- User selects blood group, urgency, units, radius, and notes

Backend:

- `POST /api/blood-requests`
- Controller: `createRequest`
- Model: `BloodRequest`

Backend behavior:

- Validates blood group and units.
- Validates latitude/longitude.
- Finds nearby compatible eligible donors.
- Creates `BloodRequest`.
- Creates notifications for matched donors.
- Emits realtime `blood-request:new` to notified donors.

### Step 2: Donors receive alert

Screens:

- Donor notifications page
- Donor nearby requests page
- Realtime SOS modal/toast from `SocketContext`

Realtime:

- `blood-request:new`

Frontend behavior:

- Donor sees emergency alert.
- Donor can accept or decline.

### Step 3: Donor responds

Backend:

- `PUT /api/blood-requests/:id/respond`
- Controller: `respondToRequest`

If donor declines:

- Response is stored in `respondingDonors`.
- Requester receives donor response notification.

If donor accepts:

- Request status becomes `responding`.
- `acceptedDonor` is set.
- `ChatConversation` is created or reused.
- Initial chat message is inserted: “I can help with this blood request.”
- Other donors are notified that the request is covered.
- Accepted donor and requester receive `chat:ready`.

### Step 4: Chat opens

Screens:

- Donor: `/donor/chat/:requestId`
- Hospital/requester: `/hospital/chat/:requestId`

Backend:

- `GET /api/chats/:requestId`
- `POST /api/chats/:requestId/messages`

Access rule:

- Only the requester stored as `hospital` in `ChatConversation` and the accepted donor can access the chat.

Important note:

- The chat model field is named `hospital`, but it really represents the requester side of the conversation.

### Step 5: Requester completes donation

Screen:

- `/hospital/chat/:requestId`

Backend:

- `PUT /api/blood-requests/:id/complete-donation`

Behavior:

- Request status becomes `fulfilled`.
- Donor is deferred for 30 days.
- Donor receives eligibility deferred notification.
- Realtime `eligibility:deferred` is emitted.

## 8. Chat Availability Fix Context

Recent issue:

- The requester could lose access to opening chat after closing the toast or after request status changed.

Current expected behavior:

- Requester can open chat from the request status screen if an accepted donor exists.
- The Chat button is not limited only to `status === "responding"`.
- `chat:ready` realtime toast includes an Open Chat button.

Relevant files:

- `Frontend/src/pages/AppPages.jsx`
- `Frontend/src/context/SocketContext.jsx`
- `Server/controllers/bloodRequestController.js`
- `Server/controllers/chatController.js`

## 9. Backend API Map

### Auth

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/send-otp`
- `POST /api/auth/resend-otp`
- `POST /api/auth/verify-otp`
- `GET /api/auth/me`
- `PUT /api/auth/me`

### Eligibility

- `POST /api/eligibility`
- `POST /api/eligibility/check`
- `GET /api/eligibility/status`

### Loyalty

- `GET /api/loyalty/leaderboard`
- `GET /api/loyalty/my-stats`

### Donations

- `POST /api/donations`
- `GET /api/donations/my-history`
- Hospital donation history route also exists in `donationRoutes`.

### Admin

- `GET /api/admin/stats`
- `GET /api/admin/users`
- `PUT /api/admin/users/:id/approve`
- `PUT /api/admin/users/:id/suspend`
- `PUT /api/admin/users/:id/activate`
- `GET /api/admin/requests`
- `GET /api/admin/inventory`
- `GET /api/admin/analytics`
- `POST /api/admin/broadcast`

### Inventory

- `GET /api/inventory`
- `GET /api/inventory/expiry-alerts`
- `POST /api/inventory`
- `PUT /api/inventory/:id`
- `DELETE /api/inventory/:id`

### Blood Requests

- `GET /api/blood-requests`
- `GET /api/blood-requests/nearby`
- `POST /api/blood-requests`
- `PUT /api/blood-requests/:id/respond`
- `PUT /api/blood-requests/:id/complete-donation`
- `PUT /api/blood-requests/:id/status`

### Notifications

- `GET /api/notifications`
- `POST /api/notifications`
- `PUT /api/notifications/read-all`
- `PUT /api/notifications/:id/read`

### Donors

- `GET /api/donors/search`
- `GET /api/donors/count`
- `PUT /api/donors/location`

### Hospitals

- `GET /api/hospitals/list`

### Appointments

- `POST /api/appointments`

### Chats

- `GET /api/chats`
- `GET /api/chats/:requestId`
- `POST /api/chats/:requestId/messages`

## 10. Realtime Events

Socket setup:

- Frontend: `Frontend/src/context/SocketContext.jsx`
- Backend: `Server/utils/realtime.js`

Events:

- `blood-request:new`: sent to donors when a new nearby request is created.
- `blood-request:closed`: sent to non-accepted donors when another donor accepts.
- `blood-request:response`: sent to requester when donor accepts/declines.
- `chat:ready`: sent to accepted donor and requester when chat is created.
- `chat:message`: sent to request room when a message is posted.
- `chat:unread`: sent to the other chat participant.
- `eligibility:deferred`: sent to donor after completed donation.

## 11. Data Models Mentioned In Main Flow

### `BloodRequest`

Important fields:

- `requestedBy`
- `bloodGroup`
- `unitsNeeded`
- `urgency`
- `status`: `open`, `responding`, `fulfilled`, `cancelled`
- `location`
- `radiusKm`
- `notifiedDonors`
- `respondingDonors`
- `acceptedDonor`
- `fulfilledAt`

### `ChatConversation`

Important fields:

- `request`
- `hospital`: requester user id
- `donor`: accepted donor user id
- `messages`

### `Notification`

Important fields:

- `recipient`
- `type`
- `title`
- `message`
- `data`
- `isRead`

## 12. Useful Files For Claude To Inspect Next

Start with these:

- `Frontend/src/App.jsx`
- `Frontend/src/pages/AppPages.jsx`
- `Frontend/src/context/SocketContext.jsx`
- `Server/server.js`
- `Server/controllers/bloodRequestController.js`
- `Server/controllers/chatController.js`
- `Server/models/BloodRequest.js`
- `Server/models/ChatConversation.js`
- `Server/utils/realtime.js`

If focusing on styling:

- `Frontend/src/index.css`

If focusing on auth:

- `Frontend/src/context/authStore`
- `Server/controllers/auth.js`
- `Server/middlewares/auth.js`

## 13. Suggested Prompt To Send With This File

You can send Claude this:

“I am building a BloodLink MERN app. Use this handoff file to understand every screen, role, route, and backend flow. Please review the app screen-by-screen and help me identify missing UX states, confusing navigation, bugs in the emergency request/chat flow, and improvements to make the user journey clearer.”

Here's a comprehensive prompt you can paste directly into Codex:

---

**BloodLink – Full Codebase Fix & Polish**

I am building a MERN stack app called BloodLink (blood donation + emergency request platform). Below are all the issues found in a full review. Fix all of them in order of priority.

---

**1. Race condition on donor accept (CRITICAL)**
In `Server/controllers/bloodRequestController.js`, the `respondToRequest` function must use an atomic MongoDB `findOneAndUpdate` with conditions `{ _id: requestId, status: "open", acceptedDonor: null }` before setting `acceptedDonor`. If the update returns null (already taken), return a 409 response: `{ message: "This request has already been accepted by another donor." }`. Do not proceed to create a chat if the atomic update fails.

**2. Donor no-show / request reset**
In `Frontend/src/pages/AppPages.jsx` inside the `ChatPage` component (hospital side), add a "Donor didn't show up" button visible only when `request.status === "responding"` and the current user is the requester. On click, call `PUT /api/blood-requests/:id/status` with `{ status: "open" }` and clear `acceptedDonor` on the backend. On the backend in `bloodRequestController.js`, handle this reset: set `acceptedDonor = null`, `status = "open"`, and emit `blood-request:new` again to previously notified donors.

**3. Deferred eligibility shown immediately after donation completes**
In `Frontend/src/pages/AppPages.jsx` inside `DonorDashboard` and `EligibilityPage`, listen for the `eligibility:deferred` socket event from `SocketContext` and immediately refresh the eligibility status UI without requiring a page reload. Show a banner: "You are deferred for 30 days after your last donation."

**4. HospitalProfile — dedicated component**
Create a proper `HospitalProfile` component instead of reusing `DonorProfile`. It should include fields: hospital name, address, city, pincode, phone, and license number. Wire it to `PUT /api/auth/me` same as before but with the correct fields.

**5. ForgotPassword — real flow**
Implement the forgot password flow:

- `POST /api/auth/forgot-password` — accepts email, generates a reset token, emails it (use nodemailer or existing OTP infra).
- `POST /api/auth/reset-password` — accepts token + new password, validates and updates.
- Update `ForgotPasswordPage` on the frontend with a two-step UI: enter email → enter OTP/token → set new password.

**6. ChatConversation model — rename `hospital` field**
In `Server/models/ChatConversation.js`, rename the `hospital` field to `requester` everywhere — model definition, all controller references in `chatController.js`, and all frontend API consumers. This is important because donor SOS requests also create chats where the "requester" is a donor, not a hospital.

**7. Empty states**
Add empty state UI in the following screens inside `Frontend/src/pages/AppPages.jsx`:

- `NearbyRequestsPage`: show "No blood requests near you right now. You'll be notified when someone needs help." when the requests list is empty.
- `NotificationsPage`: show "You're all caught up. No new notifications." when notifications list is empty.
- `DonationHistory`: show "You haven't donated yet. Book your first appointment!" with a link to `/donor/appointments`.

**8. RaiseRequest — show donor count before submit**
In the `RaiseRequest` component, after the user selects blood group and radius, call `GET /api/donors/count` with those params and display: "X eligible donors found in this area" above the submit button. If count is 0, show a warning and suggest increasing the radius. If still 0 after max radius, suggest contacting hospitals directly.

**9. Donor SOS cancel path**
In the `RaiseRequest` component when used on `/donor/sos`, after successfully creating a request show a "Cancel Request" button that calls `PUT /api/blood-requests/:id/status` with `{ status: "cancelled" }`. Keep it visible until the request is accepted or fulfilled.

**10. Admin suspend — add reason field**
In `UserManagement` admin screen, when suspending a user show a modal asking for a reason (text input). Pass `{ reason }` in the `PUT /api/admin/users/:id/suspend` request body. Store it in the user model as `suspensionReason`. On the hospital dashboard, if the hospital user's account is suspended, show a banner: "Your account has been suspended. Reason: [reason]. Contact support."

**11. Hospital pending approval — show feedback after login**
In `RoleRedirect` or the hospital dashboard, if a hospital user's account status is `pending`, redirect them to a dedicated holding screen (not the full dashboard) showing: "Your account is pending admin approval. You'll receive a notification once approved."

**12. Public pages — minimal content**
Add minimal content to `/search` (PublicSearchPage) and `/contact` (ContactPage) so they don't appear empty. For `/search`, show a search bar for blood group + city that calls `GET /api/donors/search` publicly (no auth). For `/contact`, add a static contact form UI (no backend needed, just UI).

**13. Admin critical shortage — action button**
In `AdminDashboard`, the critical shortage section should have a "Broadcast Alert" button next to each shortage item that pre-fills the `BroadcastAlerts` screen with the relevant blood group and navigates to `/admin/broadcast`.

**14. BookAppointment — confirmation screen**
After a successful appointment booking, show a confirmation screen/modal with: hospital name, date, time slot, and a "Add to Calendar" button that generates a `.ics` file download.

---

**General rules for all fixes:**

- Do not rewrite working code. Make minimal in-place changes only.
- Do not change any existing API routes. Add new routes only where specified.
- Preserve all existing socket event names.
- All new UI must follow the existing component and styling patterns in the project.
- Test that the emergency request flow (raise → notify → accept → chat → complete) still works end to end after all changes.

---

Paste that into Codex and it'll have full context for every fix. Want me to break it into smaller individual prompts instead, in case you want to feed them one at a time?
