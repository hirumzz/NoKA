# Changelog

All notable changes to NoKA are documented here. Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.5] — 2026-06-29 (Security Hardening + Brand Polish)

### Security
- **CORS lockdown** — `Access-Control-Allow-Origin` now restricted to `ALLOWED_ORIGIN` env var instead of wildcard `*`
- **Login rate limiting** — 5 attempts per minute per IP; returns `429 Too Many Requests` when exceeded
- **JWT token in URL removed** — tokens are no longer accepted via `?token=` query parameter (prevented log leakage)
- **Open signup closed** — `POST /auth/signup` moved from public route to admin-authenticated route; only admins can create new users
- **Admin-gated user mutations** — `PATCH /api/users/:id` and `DELETE /api/users/:id` now require admin role (prevented self-promotion attack)
- **Path traversal guard** — Kong proxy rejects paths containing `..` sequences
- **Security response headers** — Added `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`, and `Content-Security-Policy` to all responses
- **`activationToken` hidden** — field removed from all API JSON serialization (`json:"-"`)
- **bcrypt cost raised** — from 10 to 12 (OWASP recommended minimum)
- **JWT TTL reduced** — from 24 hours to 8 hours
- **`gin.Default()` replaced** — switched to `gin.New()` + `gin.Recovery()` to avoid logging full request data including URLs with sensitive params
- **`tx.Commit()` error** — was previously silently swallowed; now properly returns HTTP 500 on failure
- **Security startup warning** — clearer `[SECURITY WARNING]` log message when `TOKEN_SECRET` or `ALLOWED_ORIGIN` env vars are missing

### Added
- **Browser favicon** — replaced Vite default icon with custom "N" + cyan dot brand mark (`favicon.svg`)
- **User avatar support** — `avatar` field exposed in auth context and rendered in header dropdown + users list table

### Fixed
- Browser tab title was showing generic `"frontend"` instead of `"NoKA - Kong Admin Console"`

---

## [1.0.4] — 2026-06-29 (Credential Visibility + Plugin Links)

### Added
- **Eye toggle icons** on all consumer credential forms (Basic Auth, JWT, OAuth2, HMAC) — reveal/hide sensitive fields
- **Masked credential lists** — stored secrets shown as `••••••••` with inline reveal toggle
- **JWT RS256 support** — RSA Public Key textarea shown when RS256 algorithm is selected
- **OAuth2 Redirect URIs** — required input field added to credential form
- **Clickable plugin scope targets** — Service, Route, and Consumer names in Plugins list are now router links navigating to detail pages

### Fixed
- Classic Konga brand palette restored (charcoal `#222d32` sidebar, cyan `#00c0ef` accents)
- Sidebar brand logo (`conga.svg`) added next to NOKA title

---

## [1.0.3] — 2026-06-28 (Consumer Credentials + Auth Types)

### Added
- **HMAC-Auth credentials** — full CRUD on Consumer HMAC credentials tab
- **JWT credentials** — create/list/revoke consumer JWT credentials with algorithm selection
- **OAuth2 credentials** — create/list/revoke consumer OAuth2 application credentials
- **Basic Auth credentials** — create/list/revoke consumer basic auth credentials
- **Key Auth credentials** — create/list/revoke consumer key-auth credentials
- **Connection auth types** — JWT (`HS256`/`RS256`), Basic Auth, API Key, and No-Auth options in connection configuration
- **Netdata URL** — per-connection Netdata dashboard URL field with direct link card on active node

---

## [1.0.2] — 2026-06-27 (Resource Detail Pages)

### Added
- **Service Details page** — full service configuration editor with associated routes and plugins tabs
- **Route Details page** — full route configuration editor with plugin tab
- **Consumer Details page** — credentials tabs (Basic Auth, JWT, OAuth2, Key Auth, HMAC)
- **Upstream Details page** — upstream configuration + targets management
- **Certificate Details page** — certificate viewer with SNI management
- **Comment threads** on Service, Route, and Consumer detail pages

---

## [1.0.1] — 2026-06-26 (Core CRUD + Auth)

### Added
- Initial Go backend: Gin router, GORM models, JWT auth middleware, RBAC middleware
- Initial React frontend: Vite, React Router, Axios, layout with sidebar navigation
- Login and first-admin register pages
- Dashboard overview (resource counts + recent audit logs)
- Services list + create/delete
- Routes list + create/delete
- Consumers list + create/delete
- Plugins list + create/toggle/delete
- Upstreams list + create/delete
- Certificates list + create/delete
- Vaults list + create/delete
- Keys and Key Sets management
- Users list + role management + delete
- Connections management (multi-node)
- Audit log viewer
- Notifications system (bell icon, auto-purge 3 days)
- Help page with built-in documentation

---

## [1.0.0] — 2026-06-10 (NoKA Initial Release — Legacy Stack)

### Added (Legacy Sails.js + AngularJS stack)
- **Developer Role** — can create/update but not delete or manage users
- **Comment System** — add/edit/delete comments on Services, Routes, and Consumers
- **Real-Time Notifications** — bell icon, database-polled, auto-cleanup, clickable
- **Help Page** — built-in documentation with tutorials and common mistakes guide
- **RBAC on plugin editing** — developers can toggle/edit; viewers/commenters cannot

### Fixed (Legacy)
- Blank login page — removed `$state` decorator causing infinite loop
- Plugin edit modal loop — removed `Date.now()` from `ng-include`
- Docker port conflict — PostgreSQL exposed port changed to 15432

---

## [0.14.9] — (Original Konga upstream)

- Security fix: prevented user self-escalation to admin
- XSS fix on alerts and notifications
- Fix: multiple admin users could be created on first registration
- Added missing route fields: `headers`, `snis`, `sources`, `destinations`, `path_handling`
- Added missing service field: `client_certificate`
- Added Basic Auth credentials support on Connections
- ACME plugin configuration
- Updated project dependencies
