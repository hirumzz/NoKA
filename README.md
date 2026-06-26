# NoKA (Nocta Kong Admin)

NoKA is an elegant, redesigned, and improved administration GUI for [Kong Admin API](https://konghq.com).

> [!NOTE]
> This project is a customized fork of the original [Konga](https://github.com/pantsel/konga) project by **Panagis Tselentis (pantsel)**. It has been redesigned and enhanced with modern features for team collaboration and secure API gateway management.

---

## 🚀 Architectural Revamp (Go & React / TypeScript)

On this branch (`feature/revamp`), NoKA is undergoing a major architectural modernization to replace the legacy Sails.js and AngularJS stack:

- **Backend (`/backend`)**: Built with **Go**, using **Gin** (HTTP router) and **GORM** (PostgreSQL/SQLite ORM) for maximum speed, security, and type safety.
- **Frontend (`/frontend`)**: Built with **React**, **TypeScript**, **Vite** (bundler), and **TailwindCSS v4** (modern CSS framework) for a premium dark-mode dashboard experience.

### Modern Directory Structure
- `/backend` - Go server source files, database connectors, JWT auth middlewares, and proxy routers.
- `/frontend` - Vite configuration, React context providers, Layout wraps, and SPA views.
- `/` - Legacy Sails/AngularJS code (for backward compatibility / references).

### Quick Start (Revamped Version)

#### 1. Run Go Backend
Make sure you have Go installed (`go1.26+` recommended), then run:
```bash
cd backend
go run main.go
```
The backend server runs on port `1337` by default. It reads database configuration credentials from the `.env` file in the parent directory.

#### 2. Run React Frontend
Open another terminal and run:
```bash
cd frontend
npm install
npm run dev
```
Access the modern developer console at: http://localhost:3000

---

## Key Features

### Role-Based Access Control (RBAC)
Four user roles with granular permissions:
| Role | Create | Update | Delete | Manage Users | Comment |
|------|--------|--------|--------|-------------|---------|
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Developer** | ✅ | ✅ | ❌ | ❌ | ✅ |
| **Commenter** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Viewer** | ❌ | ❌ | ❌ | ❌ | ❌ (read only) |

### Comment System
- Comment on Services, Routes, and Consumers
- Edit your own comments, delete your own or (admins) any comment
- Shows "(edited)" indicator with updated timestamp
- Real-time reload when comments are modified

### Real-Time Notifications
- Bell icon notifications for all users
- Detailed messages: who did what, on which resource, what fields changed
- Clickable notifications — navigate directly to the affected resource
- Notifications shared across all users via database polling (every 15 seconds)
- Auto-cleanup: notifications older than 3 days are automatically purged
- Badge counter resets when bell is clicked

### Help & Documentation
- Built-in Help page with full tutorials for Services and Routes
- Common mistakes guide (e.g. "Press Enter to confirm path input")
- Expandable/collapsible tutorial sections

### UI Improvements
- Non-admin users see the same form layout as admin but with disabled fields (no raw JSON table)
- Plugin details viewable in read-only mode for non-admin users
- User list shows role column
- Clean notification dropdown with text wrapping

## Core Features (from Konga)
- Manage all Kong Admin API objects (Services, Routes, Consumers, Plugins, Upstreams, Certificates)
- Manage multiple Kong Nodes
- Backup, restore and migrate Kong Nodes using Snapshots
- Monitor Node and API states using health checks
- Email & Slack notifications
- Multiple users with authentication
- Database integration (PostgreSQL, MySQL, MongoDB)
- Kong 3.x compatibility (Vaults, Keys, Key Sets)

## Compatibility
- **Kong**: 1.x, 2.x, 3.x
- **Node.js**: 12.x (12.16 LTS recommended for Docker builds)
- **Databases**: PostgreSQL (recommended), MySQL, MongoDB

## Quick Start (Legacy Docker Version)

```bash
git clone https://github.com/hirumzz/NoKA.git
cd NoKA
docker compose up -d
```

Access at: http://localhost:13370

### Docker Compose Services
- **kong-database**: PostgreSQL 13 (port 15432 externally, 5432 internally)
- **kong**: Kong Gateway 3.9.2 (ports 8000, 8001, 8443)
- **noka**: NoKA admin UI (port 13370)

### Import Existing Data
```bash
cat db-existing/kong.sql | docker compose exec -T kong-database psql -U kong -d kong
cat db-existing/konga.sql | docker compose exec -T kong-database psql -U kong -d kong
docker compose restart noka
```

## Configuration (Legacy)

Copy `.env_example` to `.env` and configure:

```env
PORT=1337
NODE_ENV=production
DB_ADAPTER=postgres
DB_URI=postgresql://user:pass@host:5432/dbname
TOKEN_SECRET=your-secret-key
```

## Used Libraries
- **Go Backend**: Gin, GORM, Bcrypt, JWT-Go, GoDotEnv.
- **React Frontend**: Vite, React Router, TailwindCSS v4, Lucide Icons, Axios.
- **Legacy Stack**: Sails.js, AngularJS, Bootstrap 3, Socket.IO, Chart.js.

## License

MIT

## Credits

- Original project: [Konga](https://github.com/pantsel/konga) by Panagis Tselentis
- Fork maintained by: [hirumzz](https://github.com/hirumzz)
