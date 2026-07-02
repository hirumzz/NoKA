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
- **Versioning Rule**: Whenever a feature, fix, or task is successfully completed, you MUST ask the user for validation first. Once the user confirms the feature works as expected, you MUST ask them what version number it should be bumped to. After receiving their approval and the target version number, you must bump the version in `frontend/package.json`, `frontend/src/components/Layout.tsx`, and anywhere else the version is defined.
