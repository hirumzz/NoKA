# NoKA (Nocta Kong Admin)

NoKA is an elegant, redesigned, and improved administration GUI for [Kong Admin API](https://konghq.com).

> [!NOTE]
> This project is a customized fork of the original [Konga](https://github.com/pantsel/konga) project by **Panagis Tselentis (pantsel)**. It has been redesigned and enhanced with modern features for team collaboration and secure API gateway management.

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

## Quick Start (Docker)

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

## Installation (from source)

```bash
git clone https://github.com/hirumzz/NoKA.git
cd NoKA
npm install
```

## Configuration

Copy `.env_example` to `.env` and configure:

```env
PORT=1337
NODE_ENV=production
DB_ADAPTER=postgres
DB_URI=postgresql://user:pass@host:5432/dbname
TOKEN_SECRET=your-secret-key
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `1337` |
| `NODE_ENV` | Environment | `development` |
| `DB_ADAPTER` | Database adapter (`postgres`, `mysql`, `mongo`) | `localDiskDb` |
| `DB_URI` | Database connection URI | - |
| `TOKEN_SECRET` | JWT secret for auth tokens | `oursecret` |
| `NO_AUTH` | Disable authentication | `false` |
| `BASE_URL` | Base URL path for reverse proxy | - |
| `KONGA_LOG_LEVEL` | Log level | `debug` |

## Running NoKA

```bash
# Development
npm start

# Production
node --harmony app.js --prod
```

## Used Libraries
- [Sails.js](http://sailsjs.org/) — Backend framework
- [AngularJS](https://angularjs.org/) — Frontend framework
- [Bootstrap 3](https://getbootstrap.com/docs/3.4/) — CSS framework
- [Socket.IO](https://socket.io/) — Real-time communication
- [Chart.js](https://www.chartjs.org/) — Dashboard charts

## License

MIT

## Credits

- Original project: [Konga](https://github.com/pantsel/konga) by Panagis Tselentis
- Fork maintained by: [hirumzz](https://github.com/hirumzz)
