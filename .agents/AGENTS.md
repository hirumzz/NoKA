# Project-Scoped Rules for NoKA Workspace

## Behavior and Security Guidelines
- **Strict Git Hygiene**: Never add, commit, track, or push SQL dump files, backup folders (e.g. `db-existing/`), security reports (e.g. `AUDIT_REPORT.md`), compiled binaries/executables (`*.exe`, `konga-backend.exe`), or credential configurations (`.env`, `.env.local`, service account JSONs).
- **Git Security Audit before Commit/Push**: Before committing or pushing ANY file (including `.md` documentation, and especially workspace configs like `.agents/`), explicitly evaluate if it is dangerous to track.
- **Exclude Workspace Configs**: Never track agent-specific metadata or logs. Keep `.agents/` workspace rules local unless explicitly asked to share.
- **Gitignore Maintenance**: Always ensure that these patterns are correctly excluded in the root `.gitignore`.
- **Pre-Commit Checks**: Always inspect `git status` and staging diffs before committing or suggesting code additions to prevent accidental data leaks or push protection blocks.

## Workflow Rules
- **Always Plan & Delegate First**: 
  1. Regardless of how simple or minor the request may seem, you MUST always create an `implementation_plan.md` first.
  2. When executing the plan, you MUST actively divide the work and spawn parallel subagents (e.g., frontend, backend, infrastructure agents) to work concurrently whenever possible.
  3. Do NOT write code or make system changes until the user explicitly approves the plan.
- **Docker-First Execution**: Do NOT run raw `go build` or `go run` commands. This project runs in Docker. Always use Docker and `docker-compose` commands to build, start, and verify the backend and frontend services.
- **Versioning Rule (SemVer)**: Whenever a feature, fix, or task is successfully completed and validated:
  - **Bug Fix / Patch / Optimization**: Bump the **Patch** digit (e.g. `2.0.1` -> `2.0.2`).
  - **New Feature / New Module / New API**: Bump the **Minor** digit (e.g. `2.0.2` -> `2.1.0`).
  - **Breaking Change / Major Redesign**: Bump the **Major** digit (e.g. `2.0.0` -> `3.0.0`).
  - Always update the version string in `frontend/package.json` and `frontend/src/components/Layout.tsx`.
- **Audit Logs & Notifications Mandatory Coverage**: Every mutating action (Create, Update, Delete, Activate, Settings Save) across ALL entities (Services, Routes, Plugins, Consumers, Upstreams, Certificates, Comments, Connections, and System Settings) MUST generate an **Audit Log** (`konga_audit_logs`) AND a **System Notification** (`konga_notifications`).
- **Dedicated Commit & Push Plan**: Every Git commit and push operation MUST have its own explicit `implementation_plan.md` presented to and approved by the user before running any `git commit` or `git push` commands. Never commit or push without an approved plan specifically covering the commit message, branch, and remote sync targets.
- **Dual Repo Syncing**: All changes committed and pushed to GitHub must be fetched and hard-resetted to the local Bitbucket repository (`C:\Users\User\Desktop\erajaya-bitbucket\devops\noka`) to ensure the user can push directly from their local Bitbucket folder.
