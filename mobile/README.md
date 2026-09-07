# Expense Tracker — Mobile App

A React Native + Expo mobile app for the Expense Tracker, targeting **Android** (APK) and **iOS** (future).

Connects to your self-hosted Spring Boot backend via **Tailscale** — no public internet exposure needed.

---

## Prerequisites

- Node.js 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/): `npm install -g expo-cli eas-cli`
- [Expo Account](https://expo.dev) (free) — needed for EAS cloud builds
- Android Studio (for local Android emulator testing)
- Tailscale installed and running on your Android device

---

## Setup

```bash
cd mobile
npm install
```

---

## Development (local)

```bash
# Start the Expo dev server
npm start

# Run on Android emulator (requires Android Studio + AVD)
npm run android
```

When running the dev build, your device/emulator must have access to your Tailscale network.

---

## Building the APK (Android)

### One-time EAS setup
```bash
# Login to your Expo account
eas login

# Configure the project (follow prompts — say YES to Android, NO to iOS for now)
eas build:configure
```

### Build the APK

#### Option A: EAS Cloud Build (No Android Studio required)
```bash
npm run build:android:preview
```

This runs a **cloud build** on Expo's servers. After ~10 minutes, you'll get a download link for the `.apk` file.

#### Option B: Local Gradle Build (Offline / Local machine)
```bash
cd android
./gradlew assembleDebug
# Generated APK: android/app/build/outputs/apk/debug/app-debug.apk
```

**To install on your Android device:**
1. Download or copy the `.apk` to your phone (or install via `adb install <path-to-apk>`)
2. Open it — Android will ask you to "Allow installs from unknown sources" once
3. Tap Install → Done ✅

---

## Configuration

### Server Connection (Tailscale VPN & Local LAN)
The app defaults to `http://100.103.68.49/api` (your Tailscale IP), but also seamlessly connects to your home local Wi-Fi LAN IP (e.g. `192.168.29.70`).

To configure the server URL:
1. Open the app → **Settings tab** → **Server Connection**.
2. Type your server IP or domain:
   - You can type just the IP (e.g., `192.168.29.70`), an HTTP URL (`http://192.168.29.70`), or a full endpoint (`http://192.168.29.70/api`).
   - The app automatically normalizes the input to `http://<ip>/api`.
3. Tap **Save Connection URL**. The setting is persisted in local device storage.

> **Note on Android Cleartext Traffic**: Android blocks unencrypted HTTP traffic by default. The native project is configured in `network_security_config.xml` to permit cleartext traffic over local networks and Tailscale. **If you modify this native configuration, you must recompile the APK** (`./gradlew assembleDebug` or EAS build) for changes to take effect.

---

## Offline-First Mode & Sync

The mobile app includes a full offline-first engine so you can view, create, and manage expenses even without an active connection to Tailscale or home Wi-Fi:

1. **Local Caching (`AsyncStorage`)**:
   - All loaded categories, recent transactions, reports, and dashboard metrics are cached locally.
   - On app startup, cached records load instantaneously (<5ms) before attempting a background network refresh.
   - If the server is unreachable, the app cleanly falls back to cached data without hanging or crashing.
2. **Offline Mutations & Outbox Queue**:
   - Creating, editing, or deleting expenses, income, or categories while offline applies optimistically to local cache.
   - Pending changes are enqueued in an offline **outbox** persisted across app restarts.
3. **Automatic Synchronization**:
   - When the app detects that the backend is reachable (via Tailscale or home LAN), it automatically replays queued outbox items in order.
   - A visual **SyncStatusBanner** displays connection status (Offline, Pending Sync Items, or Syncing).

---

## Screens

| Screen | Description |
|---|---|
| **Login** | Username/password auth. Auto-detects first-run registration mode. |
| **Dashboard** | Balance, income, expenses summary + spending pie chart + recent transactions |
| **Expenses** | Full list with search, pagination, add/edit/delete, date picker, category + payment mode (offline-ready) |
| **Income** | Same as expenses with income-specific fields (offline-ready) |
| **Reports** | Monthly/yearly/range charts + CSV export via native share sheet |
| **Settings** | Server URL config, change password, categories nav, logout |
| **Categories** | Expense category management (add/edit/archive) |
| **Income Categories** | Income category management |
| **Admin / Users** | Admin-only: create/edit/disable/delete users, reset passwords |

---

## Auth Flow (Mobile)

Unlike the web app (which uses httpOnly cookies), the mobile app:
1. On **login** — receives `refreshToken` in the JSON response (backend detects `X-Client-Type: mobile` header)
2. Stores `refreshToken` securely in **Android Keystore / iOS Keychain** via `expo-secure-store`
3. On **app start** — reads stored user profile instantly for immediate offline access, then silently verifies token in the background with a 3.5s fail-fast timeout
4. On **401** — uses stored `refreshToken` to silently refresh, retries original request

This is fully backward compatible — the web app's cookie flow is unchanged.

---

## Project Structure

```
mobile/
├── android/                  Native Android project (Gradle, manifests, local cleartext network config)
├── app/
│   ├── _layout.tsx           Root layout (providers + splash)
│   ├── (auth)/
│   │   ├── _layout.tsx       Auth guard (redirect if logged in)
│   │   └── login.tsx         Login screen
│   └── (app)/
│       ├── _layout.tsx       Bottom tab navigator
│       ├── index.tsx         Dashboard (with instant cache & sync banner)
│       ├── expenses.tsx      Expenses (offline-first & sync banner)
│       ├── income.tsx        Income (offline-first & sync banner)
│       ├── reports.tsx       Reports
│       ├── settings.tsx      Settings (smart URL normalization)
│       ├── categories.tsx    Expense categories
│       ├── income-categories.tsx
│       └── admin/
│           └── users.tsx     Admin user management
├── assets/                   App launcher icons, adaptive icons, splash screens
├── components/               Reusable UI components (SyncStatusBanner, DropdownSelect, etc.)
├── constants/                Payment modes and styling constants
├── context/
│   ├── AuthContext.tsx
│   └── NotificationContext.tsx
├── services/
│   ├── apiClient.ts          Axios + mobile auth interceptor + 3.5s timeout
│   ├── tokenStore.ts         SecureStore token persistence
│   ├── authService.ts        Login/logout/instant non-blocking bootstrap
│   ├── expenseService.ts     Offline-cached expense service
│   ├── incomeService.ts      Offline-cached income service
│   ├── categoryService.ts    Offline-cached category service
│   ├── incomeCategoryService.ts
│   ├── dashboardService.ts   Offline-cached dashboard service
│   ├── reportService.ts      Includes CSV export via share sheet
│   ├── adminService.ts
│   └── offline/
│       ├── offlineStorage.ts AsyncStorage persistent cache engine
│       └── syncService.ts    Outbox FIFO queue & replay sync manager
├── app.json                  Expo config
├── eas.json                  EAS Build profiles
├── babel.config.js           Babel configuration
├── package.json
└── tsconfig.json
```
