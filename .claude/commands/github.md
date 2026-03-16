---
description: Push, commit, or review code for any Aragón Ecosystem repo following security and project standards
---

You are working on the **Aragón Ecosystem** — a multi-repo monorepo at `C:\Users\gumaro_gonzalez\Desktop\ecosistema-aragon\`. Each subfolder (`tacos-aragon-api`, `tacos-aragon-app`, `tacos-aragon-bot`, `tacos-aragon-fiscal`, `tacos-aragon-llamadas`, `tacos-aragon-web`, `tacos-aragon-wp`) is an independent git repo. The root (`ecosistema-aragon`) is its own repo pushed to `Gumagonza1/ecosistema-aragon`.

The user's request is: $ARGUMENTS

---

## RULES — apply ALL of these before writing any git command or code change

### 1. SECURITY — NEVER do any of the following
- Hardcode credentials, API keys, tokens, passwords, or RFC/tax IDs anywhere in source code
- Add default values for secrets (e.g. `API_TOKEN: 'some-value'`) — always use `process.env.VAR` with no fallback, and exit if missing
- Hardcode absolute paths specific to this machine (e.g. `C:\Users\gumaro_gonzalez\Desktop\...`) — use environment variables like `DATOS_PATH`, `TAX_BOT_PATH`, `FISCAL_PATH`
- Commit `.env`, `certs/`, `keys/`, `ecosystem.config.js` (non-example), `*.pem`, `*.key`, `*.p12`, `*.jks`, `*.cer`, SAT e.firma files, `datos/llave ia.txt`, `datos/loyverse_token.txt`, or any file with a real token
- Expose tokens in remote URLs (they stay local in `.git/config` — confirm they are already there before pushing, never add them to committed files)
- Log secrets or API keys to console in production code
- Use `require()` inside route handlers or function bodies — always at the top of the module

### 2. COMMIT MESSAGES — NEVER include references to
- AI models: "Claude", "Gemini", "GPT", "Anthropic", "OpenAI", "LLM", "AI agent", "IA", "inteligencia artificial"
- Internal machine paths or usernames
- Tokens, keys, or any credential

Good commit message examples:
- `Initial commit: REST API + backend services`
- `Update README to bilingual (EN/ES)`
- `Fix timezone offset in Loyverse sales summary`
- `Add voice transcription endpoint`

### 3. GIT WORKFLOW
- Always run `git status` and `git log --oneline` before committing so you know exactly what is staged
- Use `git push --force-with-lease` (never `--force`) when rewriting history
- When amending the only commit in a repo, include all pending local changes in the amended commit so they are not lost
- Each subfolder has its own branch (`main` or `master` — check before pushing)
- The root `ecosistema-aragon` repo only tracks `README.md` and `.gitignore` — never include subfolder content

### 4. README CONVENTION
- All READMEs must be bilingual: **English first**, then Spanish, separated by `---`
- No README may mention specific AI model names (Claude, Gemini, GPT) — use neutral terms: "intelligent agent", "agente inteligente", "NLP processing"

### 5. CODE QUALITY
- `require()` / `import` statements always at the top of the file, never inside handlers
- Config values always from `process.env` — if a var is required, call `process.exit(1)` on startup if missing (like `API_TOKEN` in `config.js`)
- No unused variables prefixed with `_` for backwards-compat hacks — delete unused code entirely
- Express routes: always have a `try/catch`, always log errors with `[route/name]` prefix

### 6. GITHUB REPOS IN THIS PROJECT
| Subfolder | GitHub Repo |
|-----------|-------------|
| `ecosistema-aragon/` (root) | `Gumagonza1/ecosistema-aragon` |
| `tacos-aragon-api/` | `Gumagonza1/tacos-aragon-api` |
| `tacos-aragon-app/` | `Gumagonza1/tacos-aragon-app` |
| `tacos-aragon-bot/` | `Gumagonza1/tacos-aragon-bot` |
| `tacos-aragon-fiscal/` | `Gumagonza1/tacos-aragon-fiscal` |
| `tacos-aragon-llamadas/` | `Gumagonza1/tacos-aragon-llamadas` |
| `tacos-aragon-web/` | `Gumagonza1/tacos-aragon-web` |
| `tacos-aragon-wp/` | `Gumagonza1/tacos-aragon-wp` |

---

Now carry out the user's request following all the rules above. If the request is ambiguous about which repo to act on, ask before proceeding.
