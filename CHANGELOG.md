# Change Log

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-06-10 (NoKA Release)

### Added
- **Developer Role** — New role that can create/update resources but cannot delete them or manage users.
- **Comment System** — Add, edit, and delete comments on Services, Routes, and Consumers.
  - Only comment author can edit their own comment.
  - Author and admins can delete comments.
  - Shows "(edited)" label with updated timestamp.
- **Real-Time Notifications** — Bell icon notifications for all users.
  - Notifications stored in database and shared across all users via polling.
  - Detailed messages showing who did what, on which resource, and what fields changed.
  - Clickable notifications that navigate directly to the affected resource.
  - Auto-cleanup of notifications older than 3 days.
  - Badge counter resets on bell click.
- **Help Page** — Built-in documentation with full tutorials for Services and Routes.
  - Common mistakes guide (e.g. must press Enter for path input).
  - Expandable/collapsible tutorial sections.
- **Role column in Users list** — Shows role label for each user.
- **Read-only form view** — Non-admin users see the same form layout with disabled fields instead of raw JSON table.
- **Plugin read-only mode** — Non-admin users can view plugin details but cannot modify them.
- **RBAC on plugin editing** — Developers can toggle/edit plugins, viewers/commenters cannot.

### Fixed
- **Blank login page** — Removed `$state` decorator with `reload: true` that caused infinite loop, and guarded permissions check for unauthenticated users.
- **Redirect to login** — Changed `$urlRouterProvider.otherwise` to `/login` to avoid error state redirect chain.
- **Plugin edit modal loop** — Removed `Date.now()` from `ng-include` that caused infinite template fetch requests.
- **Service/Route form crash** — Added guard for `$rootScope.Gateway.version` being null for non-admin users.
- **Docker port conflict** — Changed PostgreSQL exposed port to 15432 to avoid Windows port reservation issues.
- **Comment timestamp** — Shows last edit time (updatedAt) instead of creation time after editing.
- **Notification badge** — Tracks unread count properly, resets on click.
- **Socket event listener** — Fixed socket event name mismatch (`konga.event` vs room name).
- **EventService state params** — Fixed route/service navigation state names and param keys.

### Changed
- **Role-Based Access Control** — Expanded from 3 roles (Admin, Viewer, Commenter) to 4 roles (Admin, Developer, Viewer, Commenter).
- **Backend RBAC** — KongProxyController now enforces per-role restrictions (developer can't delete, viewer/commenter can't write).
- **User management** — Only admins can create, update (others), or delete users. Non-admins can only edit their own profile.
- **Docker Compose** — PostgreSQL port changed from 5432 to 15432 (external) to avoid Windows conflicts.

---

## [0.14.9] (Original Konga - upstream)
* Fix security issue that allowed a user to escalate to admin status.
* Fix XSS vulnerability on alerts and notifications.
* Fix issues #555, #562. Initial registration allows multiple admin users to be created.
* Implemented missing `headers`, `snis`, `sources`, `destinations` and `path_handling` fields on routes.
* Implemented missing `client_certificate` field on services.
* Added the ability to seed initial user and node data via configmaps and mounts.
* Added Basic Auth credentials support on Connections.
* Implemented ACME plugin configuration.
* Updated project dependencies.
