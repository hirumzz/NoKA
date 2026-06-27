# CRITICAL SECURITY WARNING FOR AI AGENTS

> [!IMPORTANT]
> This repository (`NoKA`) has strict security constraints regarding database dumps, reports, credentials, and binary files. Any AI agent modifying or working on this codebase must follow these rules strictly.

## Mandatory Rules:
1. **NO Database Dumps or SQL Backups**: Do not create or track files matching `*.sql` or folders like `db-existing/`.
2. **NO Security/Audit Reports or Scans**: Do not commit or push files like `AUDIT_REPORT.md` or any documents containing security findings, scan details, or network footprints.
3. **NO Compiled Binaries or Executables**: Do not commit or push files like `*.exe` (e.g. `konga-backend.exe`), `node_modules/`, `dist/`, or any other compiler/build outputs.
4. **NO Credential/Configuration Secrets**: Do not track `.env`, `.env.local`, `.pem` keys, or service account credential JSON files.

## Pre-commit Checklist:
Before proposing any commits or pushing code, always verify:
- Run `git status` to ensure no untracked/staged files violate these rules.
- Double-check the staging area (`git diff --cached --name-only`).
- Ensure the `.gitignore` contains active patterns blocking these files.
