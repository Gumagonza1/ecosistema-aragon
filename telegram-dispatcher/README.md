# Telegram Dispatcher — Aragón Ecosystem

Standalone process that bridges the shared SQLite message queue to the admin's Telegram account.
Replaces WhatsApp as the operations channel so notifications are independent of the customer-facing bot.

## How it works

```
Monitor agent   ──┐
Orchestrator    ──┼──► mensajes_queue (SQLite) ──► telegram-dispatcher ──► Telegram (admin)
CFO agent       ──┘
         ▲                                                    │
         └────────── inline button responses ────────────────┘
```

All three backend services write to a shared SQLite DB. The dispatcher polls every 2 seconds,
sends pending messages to the admin, and routes button responses back to the correct service.

## Message types supported

| Type | Telegram output |
|------|----------------|
| `texto` — plain notification | Text message |
| `texto` — orchestrator proposal | Text + ✅ Approve / ❌ Reject buttons |
| `texto` — monitor proposal (`Buscar:` / `!m si`) | Text + ✅ Apply / ❌ Skip buttons |
| `imagen` / `grafica` | Photo with caption |
| `audio` | Voice message |

## Slash commands

| Command | Action |
|---------|--------|
| `/start` | Show available commands |
| `/estado` | Monitor status (no AI call) |
| `/reporte` | Deep analysis |
| `/propuestas` | List pending code proposals |

## Text prefixes (alternative to buttons)

```
!m reporte       → deep monitor report
!m estado        → monitor status
!m propuestas    → list pending proposals
!m [text]        → free instruction to monitor
!o aprobar N     → approve orchestrator proposal N
!o rechazar N    → reject orchestrator proposal N
```

## Setup

```bash
cp .env.example .env
# fill in TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_CHAT_ID, MENSAJES_DB_PATH

cp ecosystem.config.example.js ecosystem.config.js
pm2 start ecosystem.config.js
pm2 save
```

## Environment variables

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather |
| `TELEGRAM_ADMIN_CHAT_ID` | Your personal chat ID (get it from @userinfobot) |
| `MENSAJES_DB_PATH` | Absolute path to the shared `mensajes.db` SQLite file |

---

# Telegram Dispatcher — Ecosistema Aragón

Proceso independiente que conecta la cola SQLite compartida con la cuenta de Telegram del administrador.
Reemplaza WhatsApp como canal de operaciones para que las notificaciones sean independientes del bot de clientes.

## Cómo funciona

```
Agente monitor  ──┐
Orquestador     ──┼──► mensajes_queue (SQLite) ──► telegram-dispatcher ──► Telegram (admin)
Agente CFO      ──┘
         ▲                                                    │
         └────────── respuestas de botones ──────────────────┘
```

Los tres servicios backend escriben en una SQLite compartida. El dispatcher hace polling cada 2 segundos,
envía los mensajes pendientes al admin y enruta las respuestas de botones al servicio correcto.

## Configuración

```bash
cp .env.example .env
# completar TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_CHAT_ID, MENSAJES_DB_PATH

cp ecosystem.config.example.js ecosystem.config.js
pm2 start ecosystem.config.js
pm2 save
```

> **Seguridad:** El archivo `.env` y `ecosystem.config.js` (con rutas locales) nunca se incluyen en el repositorio.
