# SatsLearn Frontend Implementation Tasks

> **Instruction Notice:** As instructed, we will ignore the decorative UI/UX instructions and focus on the core functionality, React state, routing, and API integration.

## Tasks & Progress Tracking

- [/] **Task 1: Auth System & Global Navigation**
  - [/] Initialize dependencies (`axios`, `qrcode.react`, and any type defs needed).
  - [ ] Create API client in `/src/api/client.js` reading `VITE_API_URL` and attaching JWT.
  - [ ] Implement `AuthContext` for JWT storage in `localStorage`, user details, `login(token)`, and `logout()`.
  - [ ] Build functional `/login` and `/register` forms.
  - [ ] Create `Navbar` showing SatsLearn logo, navigation links, and balance from `GET /api/auth/me`.
  - [ ] Register routes in TanStack Router: `/`, `/login`, `/register`, `/learn/$videoId`, `/earn`, `/dashboard`, `/wallet`.
  - [ ] Verify functionality and make git commit.

- [ ] **Task 2: Course Browser & Video Player with Paywall**
  - [ ] Implement `CourseBrowser` at `/` to fetch `GET /api/videos` and render courses.
  - [ ] Implement `VideoPlayer` at `/learn/$videoId`.
  - [ ] Fetch video metadata and check purchase access via `GET /api/videos/$videoId/access`.
  - [ ] Build paywall overlay showing price and "Unlock" button.
  - [ ] Implement Lightning Invoice generation via `POST /api/videos/$videoId/purchase`.
  - [ ] Display invoice as text and QR code (using `qrcode.react`).
  - [ ] Implement polling for status (`GET /api/invoices/$r_hash/status` every 2 seconds).
  - [ ] Handle successful payment (unlock video player, refresh balance, success notification).
  - [ ] Verify functionality and make git commit.

- [ ] **Task 3: Attention-based Earn Page**
  - [ ] Implement `/earn` page fetching `GET /api/ads/next`.
  - [ ] Implement non-skippable HTML5 video element with progress bar based on `timeupdate`.
  - [ ] Disable "Claim" button until video `ended` event triggers.
  - [ ] Implement claim rewards via `POST /api/ads/$id/watched`.
  - [ ] Display reward text/indicator, update navbar balance.
  - [ ] Set up 3-second delay, then auto-fetch the next ad.
  - [ ] Track total earned in the current session.
  - [ ] Verify functionality and make git commit.

- [ ] **Task 4: Creator Dashboard & Wallet**
  - [ ] Implement `/dashboard` showing total balance, upload count, and total purchases.
  - [ ] Add new video upload form (title, description, price, isFree toggle, courseId, video file) calling `POST /api/videos`.
  - [ ] List creator's uploaded videos and purchase counts.
  - [ ] Implement `/wallet` showing balance in sats and USD ($0.00065/sat).
  - [ ] Implement withdrawal form submitting Lightning invoice to `POST /api/wallet/withdraw`.
  - [ ] Display withdrawal transaction status and history.
  - [ ] Verify functionality and make git commit.
