# NoKA — Nocta Kong Admin

> A modern, secure, full-featured administration GUI for [Kong API Gateway](https://konghq.com).

[![Go](https://img.shields.io/badge/Go-1.26-00ADD8?logo=go)](https://go.dev)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Kong](https://img.shields.io/badge/Kong-3.9.2-00B4D8?logo=kong)](https://konghq.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

> [!NOTE]
> This project is a modernized fork of [Konga](https://github.com/pantsel/konga) by **Panagis Tselentis (pantsel)**. The entire backend and frontend have been rewritten from scratch in Go + React/TypeScript on the `feature/revamp` branch.

---

## Overview

NoKA (Nocta Kong Admin) is a fully revamped Kong Admin API GUI that replaces the legacy Sails.js + AngularJS stack with a modern, type-safe, and significantly more secure architecture:

| Layer | Legacy (Konga) | NoKA (Revamp) |
|-------|---------------|---------------|
| **Backend** | Node.js / Sails.js | **Go 1.26 / Gin + GORM** |
| **Frontend** | AngularJS / Bootstrap 3 | **React 18 / TypeScript / Vite** |
| **Auth** | Session cookies | **JWT (HS256, 8h TTL)** |
| **Password hashing** | bcrypt cost 10 | **bcrypt cost 12 (OWASP)** |
| **Database** | PostgreSQL / MySQL / Mongo | **PostgreSQL (via pgx)** |
| **Proxy** | Direct browser → Kong | **Server-side authenticated proxy** |

---

## Quick Start (Docker — Recommended)

```bash
git clone https://github.com/hirumzz/NoKA.git
cd NoKA
docker compose up -d
```

Access NoKA at: **http://localhost:13337**

On first launch, you'll be prompted to create the initial admin account.

### Docker Services

| Service | Image | Ports | Description |
|---------|-------|-------|-------------|
| `kong-database` | `postgres:13-alpine` | `15432:5432` | Shared database for Kong and NoKA |
| `kong-migration` | `kong:3.9.2` | — | Runs Kong DB migrations on startup |
| `kong` | `kong:3.9.2` | `8000, 8001, 8443` | Kong API Gateway |
| `noka` | *(built locally)* | `13337:1337` | NoKA admin console |

> PostgreSQL uses port **15432** externally to avoid Windows port reservation conflicts.

---

## Configuration

Copy `.env_example` to `.env` and configure your environment:

```env
# Server
PORT=1337

# Database
DB_ADAPTER=postgres
DB_URI=postgresql://kong:kong@kong-database:5432/kong

# Security — SET THESE IN PRODUCTION
TOKEN_SECRET=your-strong-random-secret-min-32-chars
ALLOWED_ORIGIN=https://your-noka-domain.com
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `1337` | HTTP server port |
| `DB_URI` | Yes | — | PostgreSQL connection string |
| `TOKEN_SECRET` | **Yes (prod)** | *(random per-session)* | JWT signing secret. **Must be set in production.** |
| `ALLOWED_ORIGIN` | **Yes (prod)** | `http://localhost:13337` | Exact origin allowed for CORS. Restricts browser cross-origin requests. |

> [!CAUTION]
> If `TOKEN_SECRET` is not set, a random secret is generated per-restart — **all user sessions will be invalidated on every container restart**. Always set this in production.

---

## Architecture

```
┌──────────────────────────────────────┐
│           Browser (React SPA)        │
│  Vite + TypeScript + React Router    │
└─────────────────┬────────────────────┘
                  │ HTTP (JWT Bearer)
┌─────────────────▼────────────────────┐
│        NoKA Backend (Go / Gin)        │
│                                      │
│  ┌──────────┐  ┌──────────────────┐  │
│  │ Auth     │  │ Kong Proxy       │  │
│  │ /login   │  │ /kong/*          │  │
│  │ /register│  │ /api/kong/*      │  │
│  └──────────┘  └────────┬─────────┘  │
│                         │ HTTP       │
│  ┌──────────────────┐   │            │
│  │ GORM / PostgreSQL│   │            │
│  │ Users, Nodes,    │   │            │
│  │ Audit Logs, etc. │   │            │
│  └──────────────────┘   │            │
└─────────────────────────┼────────────┘
                          │
┌─────────────────────────▼────────────┐
│        Kong Admin API (:8001)         │
└──────────────────────────────────────┘
```

### Directory Structure

```
konga/
├── backend/               # Go backend
│   ├── db/                # DB init and connection
│   ├── handlers/          # HTTP request handlers
│   ├── middleware/        # Auth, RBAC, node resolution, rate limiting
│   ├── models/            # GORM data models
│   ├── repositories/      # DB query abstractions
│   ├── services/          # Business logic (auth, Kong proxy, audit)
│   └── utils/             # JWT and bcrypt helpers
├── frontend/              # React frontend (Vite)
│   └── src/
│       ├── components/    # Layout, shared UI
│       ├── context/       # Auth context (JWT state)
│       └── pages/         # All admin console views
├── Dockerfile             # Multi-stage build (Go + Node → Alpine)
├── docker-compose.yml     # Full stack: Kong + NoKA + PostgreSQL
└── README.md
```

---

## Features

### 🔐 Security
- **JWT authentication** (HS256, 8-hour expiry, signed with `TOKEN_SECRET`)
- **bcrypt password hashing** at cost factor 12 (OWASP recommended)
- **Per-IP login rate limiting** — 5 attempts per minute, then locked
- **CORS** restricted to `ALLOWED_ORIGIN` only (no wildcard)
- **HTTP Security Headers** — CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, X-XSS-Protection
- **Path traversal guard** on all Kong proxy requests
- **Sensitive fields** (`activationToken`, `password`) never serialized in API responses
- **Admin-gated user management** — only admins can promote/demote roles or delete users

### 👥 Role-Based Access Control (RBAC)

| Role | Kong: Read | Kong: Create/Update | Kong: Delete | Manage Users | Comments |
|------|-----------|---------------------|--------------|-------------|---------|
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Developer** | ✅ | ✅ | ❌ | ❌ | ✅ |
| **Commenter** | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Viewer** | ✅ | ❌ | ❌ | ❌ | ❌ |

### 🗂️ Kong Resource Management

Manage all Kong 3.x Admin API objects from one console:

- **Services** — Create, edit, delete upstream services with full configuration
- **Routes** — All path/method/host/SNI routing rules with protocol support
- **Consumers** — Full consumer management with all credential types:
  - Basic Auth (with password masking)
  - JWT (HS256 / RS256 + RSA public key)
  - OAuth2 (with redirect URIs)
  - Key Auth
  - HMAC Auth
- **Plugins** — Global and scoped plugin management (clickable scope targets)
- **Upstreams** — Upstream load balancing configuration + targets
- **Certificates** — TLS certificate and SNI management
- **Vaults** — Kong Vault secret backend configuration
- **Keys & Key Sets** — Cryptographic key management

### 🔗 Multi-Connection Support

Connect to multiple Kong nodes and switch between them:

- **Auth types**: No Auth, API Key, Basic Auth, JWT
- **Per-user active node** — each user's active connection is saved per-session
- **Netdata integration** — optionally link a Netdata dashboard URL per connection

### 📋 Audit Logs

Every write operation (POST, PATCH, DELETE) proxied through NoKA to Kong is recorded:
- Who performed the action (user + IP)
- What entity was affected
- When it occurred
- Which Kong node was targeted

### 💬 Comment System

Collaborative annotations on Services, Routes, and Consumers:
- Markdown-style plain text comments
- Edit your own comments (shows `(edited)` timestamp)
- Comment owners and admins can delete comments
- Comments are per-resource and per-type scoped

### 🔔 Notifications

Real-time bell icon notification feed:
- Shared across all users (database-polled, every 15s)
- Clickable — navigate directly to the affected resource
- Auto-purged after 3 days
- Badge counter resets when opened

### 📊 Dashboard

Overview of active Kong node:
- Total counts (Services, Routes, Consumers, Plugins, Upstreams, Certificates)
- Recent audit log feed
- Node status and connection info

---

## Development Setup

### Prerequisites
- Go 1.26+
- Node.js 20+
- PostgreSQL 13+
- Docker + Docker Compose (optional)

### Run Backend Locally

```bash
cd backend
cp ../.env_example ../.env   # Configure DB_URI and TOKEN_SECRET
go run main.go
```

Backend runs on `http://localhost:1337`.

### Run Frontend Locally

```bash
cd frontend
npm install
npm run dev
```

Frontend dev server runs on `http://localhost:5173` (proxied to backend at `1337`).

### Production Build (Docker)

```bash
docker compose up -d --build noka
```

The `Dockerfile` is a multi-stage build:
1. **`frontend-builder`** — Node 20 Alpine, runs `npm run build` (Vite)
2. **`backend-builder`** — Go Alpine, compiles Go binary
3. **`stage-2`** — Alpine final image, serves static frontend assets + runs Go binary

---

## API Reference

All API routes require `Authorization: Bearer <token>` header unless noted.

### Auth (Public)
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/login` | Login with username/email + password. Rate-limited 5/min per IP. |
| `POST` | `/register` | Create first admin account (only works when 0 users exist) |

### API (Authenticated)
| Method | Path | Auth Level | Description |
|--------|------|-----------|-------------|
| `GET` | `/api/me` | Any | Get current user |
| `GET` | `/api/users` | Any | List all users |
| `PATCH` | `/api/users/:id` | **Admin** | Update user role/status |
| `DELETE` | `/api/users/:id` | **Admin** | Delete a user |
| `POST` | `/api/auth/signup` | **Admin** | Create a new user account |
| `GET` | `/api/connections` | Any | List Kong connections |
| `POST` | `/api/connections` | Any | Create connection |
| `PUT` | `/api/connections/:id` | Any | Update connection |
| `DELETE` | `/api/connections/:id` | Any | Delete connection |
| `POST` | `/api/connections/:id/activate` | Any | Set active connection |
| `GET` | `/api/auditlogs` | Any | List audit log entries |
| `GET` | `/api/comments` | Any | Get comments for a resource |
| `POST` | `/api/comments` | Developer+ | Create comment |
| `PUT` | `/api/comments/:id` | Owner | Update own comment |
| `DELETE` | `/api/comments/:id` | Owner/Admin | Delete comment |

### Kong Proxy (Authenticated + RBAC)
| Pattern | Description |
|---------|-------------|
| `ANY /kong/*` | Proxied to Kong Admin API with auth headers |
| `ANY /api/kong/*` | Alias for above |

---

## Tech Stack

### Backend
| Package | Version | Purpose |
|---------|---------|---------|
| `github.com/gin-gonic/gin` | 1.12.0 | HTTP router and middleware |
| `gorm.io/gorm` | 1.31.2 | ORM for PostgreSQL |
| `gorm.io/driver/postgres` | 1.6.0 | PostgreSQL driver (pgx) |
| `github.com/golang-jwt/jwt/v5` | 5.3.1 | JWT signing and verification |
| `golang.org/x/crypto` | 0.53.0 | bcrypt password hashing |
| `github.com/joho/godotenv` | 1.5.1 | `.env` file loading |

### Frontend
| Package | Version | Purpose |
|---------|---------|---------|
| React | 18 | UI framework |
| TypeScript | 5 | Type safety |
| Vite | 8 | Build tool and dev server |
| React Router | 6 | Client-side routing |
| Axios | 1.x | HTTP client |
| Lucide React | latest | Icon set |
| Vanilla CSS | — | Styling (no Tailwind) |

---

## Compatibility

- **Kong**: 3.x (tested on 3.9.2)
- **Go**: 1.26+
- **Node.js**: 20+ (build only)
- **PostgreSQL**: 13+
- **Browsers**: All modern evergreen browsers

---

## License

MIT — see [LICENSE](./LICENSE)

## Credits

- Original project: [Konga](https://github.com/pantsel/konga) by [Panagis Tselentis](https://github.com/pantsel)
- Revamp maintained by: [hirumzz](https://github.com/hirumzz)
