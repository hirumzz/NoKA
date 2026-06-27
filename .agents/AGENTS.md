# Project-Scoped Rules for NoKA Workspace

## Behavior and Security Guidelines
- **Strict Git Hygiene**: Never add, commit, track, or push SQL dump files, backup folders (e.g. `db-existing/`), security reports (e.g. `AUDIT_REPORT.md`), compiled binaries/executables (`*.exe`, `konga-backend.exe`), or credential configurations (`.env`, `.env.local`, service account JSONs).
- **Gitignore Maintenance**: Always ensure that these patterns are correctly excluded in the root `.gitignore`.
- **Pre-Commit Checks**: Always inspect `git status` and staging diffs before committing or suggesting code additions to prevent accidental data leaks or push protection blocks.
