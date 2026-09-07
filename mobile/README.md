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
```bash
npm run build:android:preview
```

This runs a **cloud build** on Expo's servers. After ~10 minutes, you'll get a download link for the `.apk` file.

**To install on your Android device:**
1. Download the `.apk` to your phone
2. Open it — Android will ask you to "Allow installs from unknown sources" once
3. Tap Install → Done ✅

---

## Configuration

### Server URL
The app defaults to `http://100.103.68.49/api` (your Tailscale IP).

To change it:
- Open the app → **Settings tab** → **Server Connection** → update the URL → Save

This is persisted on the device — you only need to set it once.

### Tailscale
Make sure Tailscale is running on your Android device and you're connected to your Tailnet before launching the app.

---

## Screens

| Screen | Description |
|---|---|
| **Login** | Username/password auth. Auto-detects first-run registration mode. |
| **Dashboard** | Balance, income, expenses summary + spending pie chart + recent transactions |
| **Expenses** | Full list with search, pagination, add/edit/delete, date picker, category + payment mode |
| **Income** | Same as expenses with income-specific fields |
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
3. On **app start** — reads stored `refreshToken`, exchanges for new `accessToken` silently
4. On **401** — uses stored `refreshToken` to silently refresh, retries original request

This is fully backward compatible — the web app's cookie flow is unchanged.

---

## Project Structure

```
mobile/
├── app/
│   ├── _layout.tsx           Root layout (providers + splash)
│   ├── (auth)/
│   │   ├── _layout.tsx       Auth guard (redirect if logged in)
│   │   └── login.tsx         Login screen
│   └── (app)/
│       ├── _layout.tsx       Bottom tab navigator
│       ├── index.tsx         Dashboard
│       ├── expenses.tsx      Expenses
│       ├── income.tsx        Income
│       ├── reports.tsx       Reports
│       ├── settings.tsx      Settings
│       ├── categories.tsx    Expense categories
│       ├── income-categories.tsx
│       └── admin/
│           └── users.tsx     Admin user management
├── services/
│   ├── apiClient.ts          Axios + mobile auth interceptor
│   ├── tokenStore.ts         SecureStore token persistence
│   ├── authService.ts        Login/logout/bootstrap
│   ├── expenseService.ts
│   ├── incomeService.ts
│   ├── categoryService.ts
│   ├── incomeCategoryService.ts
│   ├── dashboardService.ts
│   ├── reportService.ts      Includes CSV export via share sheet
│   └── adminService.ts
├── context/
│   ├── AuthContext.tsx
│   └── NotificationContext.tsx
├── app.json                  Expo config
├── eas.json                  EAS Build profiles
└── package.json
```
