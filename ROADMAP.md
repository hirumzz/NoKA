# NoKA Roadmap

This file tracks planned improvements and future milestones for the `feature/revamp` branch.

---

## ✅ Completed (v1.0.x)

- [x] Full Go backend rewrite (Gin + GORM)
- [x] Full React/TypeScript frontend rewrite (Vite)
- [x] JWT authentication with per-IP login rate limiting
- [x] RBAC (Admin, Developer, Commenter, Viewer)
- [x] Multi-node connection management with auth types (No-Auth, API Key, Basic Auth, JWT)
- [x] Kong resource CRUD: Services, Routes, Consumers, Plugins, Upstreams, Certs, Vaults, Keys
- [x] All consumer credential types: Basic Auth, JWT, OAuth2, Key Auth, HMAC
- [x] Audit log recording for all write operations
- [x] Comment system on Services, Routes, Consumers
- [x] Notification system (bell icon, shared across users)
- [x] Dashboard with resource counts and recent activity
- [x] Security hardening: CORS lockdown, CSP headers, path traversal guard, bcrypt cost 12

---

## 🔵 Planned — v1.1.0 (Auth & Session Improvements)

- [ ] **JWT refresh token flow** — issue short-lived access tokens + long-lived refresh tokens; invalidate on logout
- [ ] **Token blacklist on logout** — in-memory or Redis-backed set so stolen tokens can be revoked immediately
- [ ] **HttpOnly cookie option** — move JWT from `localStorage` to `HttpOnly` cookie to prevent XSS token theft
- [ ] **Password change endpoint** — let users change their own password from the profile dropdown
- [ ] **Profile edit page** — let users update firstName, lastName, avatar URL
- [ ] **Email verification on signup** — send activation email when admin creates a new user

---

## 🔵 Planned — v1.2.0 (Monitoring & Observability)

- [ ] **Netdata panel embed** — iframe embed of Netdata dashboard directly inside NoKA if `netdata_url` is configured
- [ ] **Kong node health polling** — periodic background check of each connection's health status
- [ ] **Kong version detection** — auto-detect connected Kong version and adapt UI fields accordingly
- [ ] **Prometheus metrics endpoint** — expose `/metrics` for scraping NoKA's own health stats
- [ ] **Audit log search and filter** — filter by user, entity, date range, action type

---

## 🔵 Planned — v1.3.0 (Team Collaboration)

- [ ] **Markdown support in comments** — render comment content as Markdown
- [ ] **@mention notifications** — notify users mentioned in comments
- [ ] **Notification delivery channels** — Slack/webhook integration for audit events
- [ ] **Resource ownership tagging** — tag services/routes with owning team labels

---

## 🔵 Planned — v1.4.0 (Data Management)

- [ ] **Snapshot / Backup** — export all Kong resource configurations as a portable JSON snapshot
- [ ] **Snapshot restore** — import a snapshot to a target Kong node
- [ ] **Node-to-node migration** — copy selected resources between two Kong connections
- [ ] **Bulk operations** — select multiple resources for bulk enable/disable/delete

---

## 💡 Backlog / Considering

- [ ] **Dark/Light mode toggle** — allow user-level theme preference
- [ ] **Kubernetes / Helm chart** — official Helm chart for deploying NoKA on Kubernetes
- [ ] **Kong Konnect support** — connect to Kong Konnect cloud control plane
- [ ] **Plugin schema auto-generation** — dynamically render plugin config forms from Kong's `/schemas/plugins/:name`
- [ ] **LDAP / SSO** — support external identity providers via SAML or OIDC
- [ ] **Encrypted credential storage** — encrypt `kong_api_key`, `jwt_secret`, `password` at rest in the database
- [ ] **Audit log export** — export audit logs as CSV / JSON