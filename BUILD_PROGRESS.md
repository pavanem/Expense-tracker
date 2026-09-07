# Expense Tracker — Incremental Build Progress

This project is being generated module by module. Each module is complete and
compiles on its own given the modules before it.

## ✅ Module 1: Database & Domain Layer (this delivery)
- `backend/pom.xml` — Maven project, Spring Boot 3.3.4 / Java 21, all SRS dependencies
  (Web, Data JPA, Validation, Security, Lombok, MapStruct, OpenAPI, Flyway, commons-csv)
- `backend/src/main/resources/application.yml` (+ `-dev` / `-prod` profiles)
- Flyway migrations `V1`–`V4`: `category` table, `expense` table, seed categories
  (Food, Fuel, Groceries, EMI, Shopping, Medical, Travel, Entertainment, Bills,
  Investment, Others), sample seed expenses for local development
- Entities: `Category`, `Expense`, `CategoryStatus`, `PaymentMode`
- Repositories: `CategoryRepository`, `ExpenseRepository` (+ `JpaSpecificationExecutor`
  and aggregate queries for future dashboard/report use), `ExpenseSpecifications`
  for dynamic search/filter/sort
- DTOs: `CategoryRequest`, `CategoryResponse`, `ExpenseRequest`, `ExpenseResponse`
  with full bean validation matching the SRS validation rules

## ✅ Module 2: Mapper + Service + Controller Layer (this delivery)
- `ExpenseTrackerApplication` main class
- MapStruct mappers: `CategoryMapper`, `ExpenseMapper`
- Exceptions: `ResourceNotFoundException`, `DuplicateResourceException`,
  `CategoryInUseException`, `InvalidRequestException`, `ErrorResponse`,
  `GlobalExceptionHandler` (uniform error shape for every failure mode:
  404, 409, 400 validation, malformed JSON, type mismatch, 500 fallback)
- `CategoryService` — CRUD + activate/deactivate; delete is blocked with a
  clear 409 if expenses reference the category (FK is `ON DELETE RESTRICT`)
- `ExpenseService` — CRUD + combined search/filter/sort/pagination via a
  `Specification`-based `ExpenseSearchCriteria`
- `DashboardService` — today/month/year totals, recent expenses, top
  categories, 6-month trend
- `ReportService` — resolves specific date / range / month+year / year into
  a concrete window, computes totals, category/daily/monthly/yearly
  breakdowns, average daily spend, highest/lowest, transaction count
- `CsvExportService` — single day / range / monthly / yearly / category /
  entire-database export, with SRS-matching filenames
  (`expenses_2026_07.csv`, `expenses_2026.csv`, `expenses_2026_07_10_to_2026_07_20.csv`)
- Controllers: `CategoryController`, `ExpenseController` (incl. `/search`),
  `DashboardController`, `ReportController` (`/daily /monthly /yearly /range`),
  `ExportController` (`/api/reports/export`)
- `SecurityConfig` (auth disabled by default, structured for JWT/OAuth2 later,
  CORS from `app.cors.allowed-origins`), `OpenApiConfig`

## ✅ Module 3: Frontend (React + MUI) — complete
**3a — scaffold:** Vite project, ledger-themed MUI theme (Outfit/Inter/JetBrains
Mono), Axios client with error normalization, all 5 API service modules,
`NotificationContext`, `useDebounce`/`useCategories` hooks, responsive
`AppLayout`/`Sidebar`/`BottomNav`/`TopBar`, shared components (`Amount`,
`CategoryChip`, `SummaryCard`, `ConfirmDialog`, `PageHeader`), and the
`Category`/`Expense` list, form-dialog, and filter components.

**3b — pages:**
- `DashboardPage` — today/month/year totals, recent expenses, top categories
  (progress bars), 6-month trend chart, quick-add expense/category, CSV export
- `ExpensesPage` — full search (debounced, hits `/search`), filter (hits
  `/expenses` with query params), sort, pagination, add/edit/delete/view
- `CategoriesPage` — list with activate/deactivate switch, add/edit, delete
  (blocked by the backend 409 if in use)
- `ReportsPage` — day/month/year/range toggle + category/payment-mode/merchant
  filters, summary stats, trend chart, category breakdown, per-report and
  entire-database CSV export
- `SettingsPage` — instance info, categories shortcut, roadmap items from the SRS
- `NotFoundPage` — 404 fallback

## ✅ Module 4: Docker & Nginx — complete
- `backend/Dockerfile` — multi-stage (Maven build → `eclipse-temurin:21-jre-alpine`
  runtime), non-root user, `/actuator/health`-based `HEALTHCHECK`
- `frontend/Dockerfile` — multi-stage (`node:20-alpine` Vite build →
  `nginx:1.27-alpine` runtime serving the static bundle)
- `docker/nginx/nginx.conf` — serves the SPA with client-side routing
  fallback, reverse-proxies `/api/**` (and Swagger) to the backend so the
  browser only ever talks to one origin, gzip, cache headers for hashed assets
- `docker-compose.yml` — `postgres` (healthchecked, named volume),
  `backend` (waits on Postgres health, prod profile, JVM heap via env),
  `frontend` (Nginx, published on port 80); all on one bridge network
- `.env.example`, root `.gitignore` / `.dockerignore`
- Fixed prod log path (`/app/logs/...`) to match the `backend-logs` volume mount

## ✅ Module 5: Tests — complete
- `src/test/resources/application.yml` — H2 (PostgreSQL compatibility mode),
  Hibernate `create-drop`, Flyway disabled for fast, isolated unit/repo tests
- **Repository tests** (`@DataJpaTest`): `CategoryRepositoryTest`,
  `ExpenseRepositoryTest` — finder methods, uniqueness, `ExpenseSpecifications`
  composition (category/payment-mode/keyword/amount-range filters), aggregate
  queries (`sumAmountByDate`, `sumAmountBetween`, `sumAmountByCategoryBetween`,
  `findRecent`, `existsByCategoryId`)
- **Service unit tests** (Mockito, mocked repositories/mappers):
  `CategoryServiceTest`, `ExpenseServiceTest`, `DashboardServiceTest`,
  `ReportServiceTest` (date-window precedence rules + aggregation math),
  `CsvExportServiceTest` (SRS filename patterns + CSV content)
- **Controller tests** (`@WebMvcTest` + `MockBean` service):
  `CategoryControllerTest`, `ExpenseControllerTest` — 201/400/404/409 paths,
  validation error shape, sort-field whitelist rejection
- **End-to-end integration test** (`@SpringBootTest` + real `MockMvc`, no
  mocks): `ExpenseFlowIntegrationTest` — create category → create expense →
  shows up in dashboard and search → blocked category delete (409) → CSV export
- `ExpenseTrackerApplicationTests` — full context load smoke test

## ✅ Module 6: Docs & Wrap-up — complete
- Top-level `README.md` — architecture (with Mermaid diagram), tech stack,
  full project structure, Docker Compose + local-dev setup instructions,
  test-running instructions, configuration reference, API overview with
  the standard error shape, and roadmap
- `docs/` scaffolded (placeholder, per SRS project structure)

## Project status: all 6 modules complete
Backend, frontend, Docker/Nginx, tests, and docs are all delivered. See
`README.md` for how to run it.

---

## Module 7: Authentication (in progress)

**Design:** BCrypt-hashed passwords · short-lived JWT access token (15 min,
`Authorization` header) · long-lived refresh token (30 days, httpOnly/Secure/
SameSite cookie, hashed in DB, rotated on every use, reuse-detection on
theft) · registration locked to "only while zero users exist" since this is
a single-user self-hosted app reachable over Tailscale/LAN.

### ✅ Phase 1: DB schema & domain layer — this delivery
- `pom.xml` — added `jjwt-api`/`jjwt-impl`/`jjwt-jackson` 0.12.6
- `V5__create_users_table.sql` (`app_user`, avoiding the `user` reserved word),
  `V6__create_refresh_tokens_table.sql` (hashed tokens, rotation chain via
  `replaced_by_hash`, revocation via `revoked_at`)
- Entities: `User`, `UserRole`, `RefreshToken` (with `isActive()` helper)
- Repositories: `UserRepository`, `RefreshTokenRepository` (bulk revoke-all,
  expired-token cleanup)
- `PasswordConfig` — `BCryptPasswordEncoder` at strength 12
- `JwtProperties` — type-safe `app.jwt.*` config binding, with a loud
  placeholder secret that `JwtService` (Phase 2) will refuse to run on in
  production
- `application.yml` / `.env.example` / `docker-compose.yml` — `JWT_SECRET`,
  `JWT_ACCESS_EXPIRY_MINUTES`, `JWT_REFRESH_EXPIRY_DAYS` wired through
- Test profile updated with a fixed test-only JWT secret

### ✅ Phase 2: JwtService + AuthService + DTOs + exceptions — this delivery
- `TokenHasher` — SHA-256 hashing + secure random raw refresh token generation
- `JwtService` — signs/verifies the access token (HS256), fails fast at
  startup if `app.jwt.secret` is missing or under 256 bits
- `AuthService`:
  - `register` — only while zero users exist; first user granted `ADMIN`
  - `login` — identical error for "no such user" and "wrong password" (no
    enumeration signal), updates `lastLoginAt`
  - `refresh` — validates the stored hash, **rotates** the refresh token on
    every use, and if a *already-revoked* token is re-presented (a strong
    theft signal since legitimate clients never do this), revokes every
    active session for that user immediately
  - `logout` / `logoutAll` — single-device vs. everywhere
  - `changePassword` — verifies current password, revokes all existing
    sessions on success (forces re-login everywhere, standard practice)
- DTOs: `RegisterRequest`, `LoginRequest` (with optional `deviceLabel`),
  `AuthResponse` (access token only — refresh token deliberately never
  appears in JSON), `ChangePasswordRequest`
- Exceptions wired into `GlobalExceptionHandler`: `InvalidCredentialsException`
  (401), `RegistrationClosedException` (403), `InvalidRefreshTokenException`
  / `RefreshTokenReuseException` (401)

### ✅ Phase 3: JWT filter + SecurityConfig rewrite + AuthController — this delivery
- `JwtAuthenticationFilter` — validates the `Authorization: Bearer` header on
  every request, populates the `SecurityContext`; registered explicitly into
  the Security chain only (guarded against Spring Boot's double-registration
  gotcha for `@Component` filters)
- `AuthenticatedUser` — the `@AuthenticationPrincipal` type controllers get
- `RestAuthenticationEntryPoint` / `RestAccessDeniedHandler` — JSON 401/403
  in the same `ErrorResponse` shape as every other error, instead of Spring
  Security's default HTML/basic-auth challenge
- `JwtService` hardened further: refuses to start with `app.security.enabled=true`
  if `JWT_SECRET` is still the shipped placeholder (the length check alone
  wouldn't catch this, since the placeholder is long enough)
- `AuthController` — `/api/auth/register`, `/login`, `/refresh`, `/logout`,
  `/logout-all`, `/change-password`, `/me`. Refresh token travels as an
  httpOnly/SameSite=Lax cookie scoped to `/api/auth` (never in JSON, never
  readable by JS); `cookie-secure` is configurable (`JWT_COOKIE_SECURE`) since
  the default deployment is plain HTTP over LAN/Tailscale, not HTTPS
- `SecurityConfig` rewritten: with `app.security.enabled=true`, every
  `/api/**` endpoint requires a valid JWT except register/login/refresh;
  `false` (still the default) keeps everything open, matching current
  behavior — **intentionally not flipped to `true` yet**, since the frontend
  (Phase 4) doesn't send auth headers yet and would get locked out

### ✅ Phase 4: Frontend — login page, auth context, silent refresh — this delivery
- `tokenStore.js` — access token held in memory only (never localStorage),
  clears on tab close; the 30-day "stay logged in" behavior comes entirely
  from the httpOnly refresh cookie, silently re-exchanged on app load
- `apiClient.js` — attaches `Authorization: Bearer` automatically; on a 401
  it calls `/auth/refresh` once (de-duped across concurrent requests so a
  burst of simultaneous 401s doesn't race the single-use refresh-token
  rotation), retries the original request, and if the refresh itself fails,
  clears the session and signals `AuthContext` to log out
- `authService.js` / `AuthContext.jsx` — register/login/logout/logout-all/
  change-password, plus the on-mount `bootstrapSession()` silent refresh
- `ProtectedRoute` — every route except `/login` now requires auth; waits
  for the bootstrap attempt before redirecting, so a page reload with a
  still-valid cookie never flashes the login screen
- `LoginPage` — checks `/auth/registration-status` and shows a one-time
  registration form if no account exists yet, otherwise a login form
- Backend: added `GET /api/auth/registration-status` (public) so the
  frontend can make that decision
- `Sidebar` / `TopBar` — username + logout button
- `SettingsPage` — change password (revokes all sessions on success) and
  "log out everywhere"
- **Dashboard privacy toggle** — eye icon in the Dashboard header masks
  today/month/year totals, recent expenses, category breakdown, and swaps
  the trend chart for a "hidden" placeholder (bar heights would otherwise
  leak amounts visually even with numbers masked). Persisted in
  `localStorage` per browser, not synced to the server.

**⚠️ Important — two things before this is real security:**
1. **`SECURITY_ENABLED` is still `false` by default.** The frontend now
   *always* requires login client-side, but until you set
   `SECURITY_ENABLED=true` on the server, the raw API endpoints
   (`/api/expenses`, etc.) still accept unauthenticated requests directly
   (e.g. via `curl`) — the login screen alone is not enforcement.
2. Before flipping it: generate a real secret (`openssl rand -base64 64`)
   into `JWT_SECRET` in your server's `.env` — the app will refuse to start
   with `SECURITY_ENABLED=true` and the placeholder secret still in place.

### ⬜ Phase 5: Tests (next)

---

## Module 8: Public-internet hardening (in progress)

Goal: make it safe to expose this app directly on the public internet
(no Tailscale), for a home connection with **no domain and a dynamic IP**.

### ✅ Phase 1: DuckDNS + Let's Encrypt TLS — this delivery
- `docker-compose.yml`: added `duckdns` (dynamic DNS updater) and `certbot`
  (automatic twice-daily renewal loop) services; `frontend` now publishes
  fixed ports 80/443 (required by Let's Encrypt's HTTP-01 challenge and
  browser HTTPS conventions) and mounts the shared cert/webroot volumes
- `docker/nginx/default.conf.template` (replaces the old static
  `nginx.conf`) — port 80 now only serves the ACME challenge and 301s
  everything else to HTTPS; port 443 carries the actual app with a modern
  TLS config (TLS 1.2+/1.3 only, strong cipher list, session caching).
  Uses the official Nginx image's `envsubst` templating so `${DOMAIN}`
  resolves from the container environment at startup
- `scripts/init-letsencrypt.sh` — one-time bootstrap that breaks the
  chicken-and-egg problem (Nginx needs a cert to start; Certbot needs
  Nginx running to serve the challenge) via a throwaway self-signed cert,
  swapped for the real one once issued
- `.env.example` / `README.md` — full walkthrough: DuckDNS signup → router
  port forwarding → bootstrap script → normal `docker compose up`
- Frontend `Dockerfile` — healthcheck updated for HTTPS

**Not done yet, do not expose ports 80/443 publicly until later phases
land:** rate limiting, account lockout, security headers, `Secure` cookies,
CORS lockdown, `ufw`/`fail2ban`, and monitoring. This phase only proves TLS
works — it is not the finish line.

### ✅ Phase 2: Nginx hardening — this delivery
- `docker/nginx/security-headers.conf` — HSTS (6-month `max-age` to start),
  `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`,
  `Permissions-Policy`, a CSP scoped to what the app actually loads (self +
  the two Google Fonts hosts; `unsafe-inline` in `style-src` only because
  MUI/Emotion's CSS-in-JS requires it), `X-XSS-Protection: 0`
- `docker/nginx/proxy-common.conf` — the repeated proxy headers factored
  out so they're defined once, `include`d into every backend-facing location
- `default.conf.template`: `server_tokens off`; rate limiting — 5 req/min on
  `/api/auth/login` and `/api/auth/register` specifically (the
  credential-stuffing targets), 60 req/min on everything else under `/api/`;
  per-IP connection cap (30); `client_max_body_size 1m` (no uploads exist in
  this app); slow-loris-style timeout hardening
- Careful handling of an Nginx inheritance quirk: `add_header` doesn't
  inherit into a location that sets its own `add_header` — the static-assets
  location (which sets `Cache-Control`) explicitly re-includes
  `security-headers.conf` so it doesn't silently lose HSTS/CSP/etc.

### ⬜ Phase 3: App-level hardening — lockout, CORS, cookies, actuator/swagger (next)
### ⬜ Phase 4: OS/network hardening — ufw, SSH, fail2ban, auto-updates
### ⬜ Phase 5: Monitoring — failed-login alerting, renewal checks

---

## ✅ Module 9: Mobile App (React Native + Expo + Android) — complete

A native-feel Android and iOS-ready mobile client built with React Native 0.74, Expo SDK 51, and Expo Router for self-hosted deployments over Tailscale.

### Key Deliverables:
- **Backend Mobile Auth Integration**:
  - Added support for `X-Client-Type: mobile` header in `AuthController`.
  - Refresh tokens emitted in JSON payload for mobile clients (avoiding reliance on httpOnly cookies on native apps).
  - Added `MobileRefreshRequest` DTO for body-based refresh token exchange and rotation.
- **Mobile Client Architecture & Routing**:
  - Built with **Expo Router** using typed routes and file-based layout groups (`(auth)` and `(app)`).
  - Dark ledger aesthetic matching the web app, themed via React Native Paper.
  - Complete screen implementations: Dashboard, Expenses, Income, Reports (with native share sheet CSV export), Categories, Income Categories, Settings, and Admin User Management.
- **Security & Token Store**:
  - `tokenStore.ts`: leverages `expo-secure-store` backed by Android Keystore / iOS Keychain for persistent token storage.
  - `apiClient.ts`: Axios interceptor with silent token refresh on 401 and request replay.
- **Offline-First Storage & Outbox Synchronization**:
  - `offlineStorage.ts`: persistent caching using `@react-native-async-storage/async-storage` for dashboard metrics, expenses, income, and categories.
  - `syncService.ts`: FIFO outbox queue persisting offline creates, updates, and deletes with optimistic local UI state. Replays queued requests sequentially when connectivity is re-established.
  - `SyncStatusBanner.tsx`: real-time visual indicator displayed on all data screens showing offline mode, pending sync count, and syncing progress.
- **Startup Performance & Network Optimization**:
  - Non-blocking auth bootstrap: `AuthService.bootstrapSession()` restores saved user profile instantly (<2ms) so offline sessions never freeze on cold start.
  - Axios timeout reduced from 15,000ms to 3,500ms in `apiClient.ts` for rapid fallback to cached data when away from VPN/LAN.
  - Screen hooks render from cached state immediately upon mount before background network revalidation.
- **Native Android Configuration & Local LAN Support**:
  - Prebuilt native `mobile/android` project with Gradle wrapper.
  - `network_security_config.xml` configured with `<base-config cleartextTrafficPermitted="true">` to permit HTTP communication across both Tailscale CGNAT IPs (`100.x.y.z`) and home Wi-Fi local LAN subnets (e.g. `192.168.29.70`), bypassing Android domain parser CIDR limitations.
  - Smart URL parsing in `settings.tsx` to automatically normalize inputs (auto-prepending `http://` and appending `/api`).
- **EAS Build & Local Build Profiles**:
  - `eas.json`: preview and production APK build profiles.
  - Local offline Gradle build support via `./gradlew assembleDebug`.
- **Documentation**:
  - Comprehensive guide added in `docs/mobile-app.md` and updated `mobile/README.md`.

