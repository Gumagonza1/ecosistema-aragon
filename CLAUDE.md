# Aragón Ecosystem — Claude Code Rules

These rules apply to **all work** in this repository and its subfolders.

## Security (always enforced)

- **No hardcoded secrets.** All credentials (API keys, tokens, passwords, RFC) must come from `process.env`. No default values for secrets.
- **No hardcoded machine paths.** Never use `C:\Users\gumaro_gonzalez\Desktop\...` in source code. Use env vars: `DATOS_PATH`, `TAX_BOT_PATH`, `FISCAL_PATH`.
- **No committing sensitive files:** `.env`, `certs/`, `keys/`, `ecosystem.config.js` (real one), `*.pem`, `*.key`, `*.p12`, `*.jks`, `*.cer`, `datos/llave ia.txt`, `datos/loyverse_token.txt`, or any file containing a real token.
- **API_TOKEN and similar required vars must use `process.exit(1)` on startup if missing** — no weak defaults.
- **`require()` / `import` always at top of file**, never inside handlers or functions.

## Commit messages

Never mention:
- AI model names: Claude, Gemini, GPT, Anthropic, LLM, "AI agent", "IA", "inteligencia artificial"
- Machine-specific paths or usernames
- Credentials of any kind

## README convention

All READMEs must be **bilingual: English first, then Spanish**, separated by `---`.
Do not mention specific AI model names in READMEs — use neutral terms.

## Git workflow

- Use `git push --force-with-lease` when rewriting history (never bare `--force`)
- Check `git status` before every commit
- Root repo (`ecosistema-aragon`) only tracks `README.md`, `CLAUDE.md`, and `.gitignore`

## Repos in this project

| Folder | GitHub |
|--------|--------|
| root | `Gumagonza1/ecosistema-aragon` |
| `tacos-aragon-api` | `Gumagonza1/tacos-aragon-api` |
| `tacos-aragon-app` | `Gumagonza1/tacos-aragon-app` |
| `tacos-aragon-bot` | `Gumagonza1/tacos-aragon-bot` |
| `tacos-aragon-fiscal` | `Gumagonza1/tacos-aragon-fiscal` |
| `tacos-aragon-llamadas` | `Gumagonza1/tacos-aragon-llamadas` |
| `tacos-aragon-web` | `Gumagonza1/tacos-aragon-web` |
| `tacos-aragon-wp` | `Gumagonza1/tacos-aragon-wp` |
