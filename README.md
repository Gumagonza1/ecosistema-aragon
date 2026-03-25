# 🌮 Ecosistema Aragón

Plataforma de automatización y operación digital completa para **Tacos Aragón**, restaurante en Culiacán, Sinaloa, México. El ecosistema orquesta pedidos por WhatsApp, facturación electrónica SAT, análisis fiscal, monitoreo de calidad y gestión de código — todo coordinado desde Telegram.

---

## 📦 Proyectos del monorrepo

| Proyecto | Tecnología | Puerto | Proceso PM2 | Descripción |
|---|---|---|---|---|
| [tacos-aragon-bot](./tacos-aragon-bot/) | Node.js · whatsapp-web.js · Gemini AI | 3003 | `TacosAragon` | Bot WhatsApp de pedidos con IA, menú dinámico, Loyverse POS |
| [tacos-aragon-api](./tacos-aragon-api/) | Node.js · Express · SQLite | 3001 | `tacos-api` | API REST central: ventas, contabilidad, facturación, agente de negocio |
| [tacos-aragon-fiscal](./tacos-aragon-fiscal/) | Python · cfdiclient | — | `cfo-agent` | Descarga masiva CFDI SAT, análisis fiscal con Gemini, reportes Excel |
| [tacos-aragon-orchestrator](./tacos-aragon-orchestrator/) | Node.js · Docker · SQLite | — | `orquestador` | Watchdog central: monitoreo de salud, recuperación autónoma, cola de aprobaciones |
| [telegram-dispatcher](./telegram-dispatcher/) | Node.js · Telegram Bot API · SQLite | — | `telegram-dispatcher` | Canal de notificaciones admin: enruta mensajes, botones inline, comandos |
| [pmo-agent](./pmo-agent/) | Node.js · Claude Code CLI | — | `pmo-agent` | Agente PMO: ejecuta instrucciones de código y autocorrecciones vía Claude |
| [mcp-project-server](./mcp-project-server/) | Python · MCP SDK | stdio | — | 26 herramientas MCP para que Claude gestione código, PM2 y git por proyecto |
| [monitor-bot](../bot-tacos/) | Node.js · Claude Sonnet | — | `MonitorBot` | Agente monitor: analiza conversaciones WhatsApp, detecta errores, propone mejoras |
| [tacos-aragon-web](./tacos-aragon-web/) | Python · Flask · CFDI 4.0 | — | — | Sitio web del restaurante + facturación electrónica |
| [tacos-aragon-app](./tacos-aragon-app/) | React Native · Expo | — | — | App móvil interna para el equipo |
| [tacos-aragon-wp](./tacos-aragon-wp/) | PHP · WordPress | — | — | Plugin WordPress para facturación y presencia web |

---

## 🏗️ Arquitectura

```
╔══════════════════════════════════════════════════════════════════════╗
║                     FLUJO CLIENTE                                    ║
╚══════════════════════════════════════════════════════════════════════╝

  Cliente
    │
    ├── WhatsApp ──────────────► TacosAragon (bot-tacos)
    │                             ├── Gemini AI (NLP pedidos)
    │                             ├── Loyverse POS (registro ventas)
    │                             └── Puerto 3003
    │
    ├── App móvil ─────────────► tacos-api (port 3001, solo Tailscale)
    │                             ├── Ventas / contabilidad
    │                             ├── Facturación CFDI 4.0
    │                             └── Agente inteligente con tool-use
    │
    ├── Sitio web ─────────────► tacos-aragon-web (Flask)
    │                             └── tacos-aragon-wp (WordPress)
    │
    └── Descarga fiscal ────────► cfo-agent (Python)
                                   ├── FIEL + efirma SAT
                                   ├── Descarga masiva CFDIs
                                   └── Análisis Gemini + Excel


╔══════════════════════════════════════════════════════════════════════╗
║                     FLUJO ADMIN (operaciones)                        ║
╚══════════════════════════════════════════════════════════════════════╝

  Admin (Telegram privado)
    │
    ├── !pmo <proyecto>: <instrucción> ──────────────────────────────┐
    │                                                                  │
    └── /pmo_cancelar ────────────────┐                               │
                                      │                               │
                                      ▼                               ▼
                             telegram-dispatcher ◄──── pmo-agent
                             (cola SQLite: mensajes_queue)    │
                                      │                        │
                                      │                        ├── claude -p --mcp ...
                                      │                        │    (Claude Code CLI, plan Max)
                                      │                        │
                                      │                        ├── mcp-project-server
                                      │                        │    (26 tools: read/edit/git/pm2)
                                      │                        │
                                      │                        └── Changelogs JSONL
                                      │                             C:/SesionBot/changelogs/
                                      │
                             ┌────────┴──────────────────┐
                             │   Agentes que reportan     │
                             │   vía mensajes_queue       │
                             │                            │
                             ├── orquestador (watchdog)   │
                             ├── monitor-bot (calidad)    │
                             └── cfo-agent (fiscal)       │
                             └────────────────────────────┘
                                      │
                                      ▼
                             Telegram admin chat
                             (solo ORIGENES_PRIVADO: pmo, monitor)
                             + Mirror grupo con topics por proyecto
```

---

## ⚡ Setup rápido

### Requisitos del sistema

| Componente | Versión mínima |
|---|---|
| Node.js | 18.x LTS |
| Python | 3.10+ |
| PM2 | 5.x (`npm i -g pm2`) |
| Claude Code CLI | Latest (`npm i -g @anthropic-ai/claude-code`) |
| better-sqlite3 | 9.x (instalado por npm en cada proyecto) |
| mcp Python SDK | 1.0.0+ (`pip install mcp`) |

### Instalación

```bash
# 1. Clonar
git clone https://github.com/tu-org/ecosistema-aragon
cd ecosistema-aragon

# 2. Instalar dependencias de cada proyecto Node
cd pmo-agent && npm install && cd ..
cd telegram-dispatcher && npm install && cd ..

# 3. Instalar dependencias Python (MCP server)
cd mcp-project-server
pip install -r requirements.txt
cd ..

# 4. Configurar variables de entorno
cp telegram-dispatcher/.env.example telegram-dispatcher/.env
# Editar con TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_CHAT_ID, etc.

# 5. Arrancar procesos con PM2
pm2 start telegram-dispatcher/ecosystem.config.js
pm2 start pmo-agent/ecosystem.config.js

# 6. Verificar
pm2 list
```

---

## 🔐 Variables de entorno comunes

| Variable | Usado por | Descripción |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | telegram-dispatcher | Token del bot Telegram |
| `TELEGRAM_ADMIN_CHAT_ID` | telegram-dispatcher | Chat ID privado del admin |
| `TELEGRAM_GROUP_ID` | telegram-dispatcher | Grupo con topics para mirror |
| `MENSAJES_DB_PATH` | dispatcher, pmo-agent | Ruta absoluta al SQLite compartido |
| `LOYVERSE_API_KEY` | tacos-bot, tacos-api | API key de Loyverse POS |
| `GEMINI_API_KEY` | tacos-bot, monitor | API key de Google Gemini |

> **Seguridad:** Ningún `.env`, certificado, token ni dato personal está incluido en este repositorio.

---

## 📋 Sistema de Changelog

Todos los agentes del ecosistema registran sus cambios en archivos JSONL centralizados en `C:/SesionBot/changelogs/`.

### Estructura de un entry

```jsonl
{
  "ts": "2026-03-25T14:30:00-07:00",
  "agente": "pmo-agent",
  "origen": "user",
  "titulo": "Fix validación RFC en pedidos",
  "desc": "Agregada regex de RFC en src/pedidos.js línea 87. Corrige crash cuando cliente omite guión.",
  "archivos": ["src/pedidos.js"],
  "tags": ["bug", "tacos-bot", "api"]
}
```

### Tags canónicos

| Tag | Significado |
|---|---|
| `bug` / `feature` | Tipo de cambio |
| `config` / `prompt` | Configuración o prompt del agente |
| `db` / `api` | Capa de datos o API REST |
| `timeout` / `session` | Gestión de timeouts y sesiones Claude |
| `xml` | Protocolo XML PMO ↔ dispatcher |
| `changelog` / `mcp` | Infraestructura del ecosistema |
| `tacos-bot` / `tacos-api` / `cfo-agent` | Proyecto afectado |
| `relay` / `dispatcher` / `telegram` | Canal de mensajería |
| `monitor` / `orquestador` / `pmo` | Agente que realizó el cambio |

### Flujo PMO + changelog

El PMO inyecta los últimos **15 cambios** del historial en el system prompt de cada ejecución de Claude, dándole contexto de qué se modificó recientemente antes de atender una instrucción nueva.

---

## 🌐 Integraciones externas

| Servicio | Proyecto | Uso |
|---|---|---|
| **Loyverse POS** | tacos-bot, tacos-api | Registro automático de órdenes |
| **Google Gemini** | tacos-bot, monitor, cfo | NLP, análisis de conversaciones, reportes |
| **Telegram Bot API** | telegram-dispatcher | Canal admin de operaciones |
| **SAT México** | cfo-agent | Descarga masiva CFDI emitidos/recibidos |
| **Facturama PAC** | tacos-api, tacos-web | Timbrado CFDI 4.0 |
| **Tailscale VPN** | tacos-api | API REST expuesta solo en red privada |
| **Claude Code CLI** | pmo-agent | Ejecución de Claude con MCP y plan Max |

---

*Restaurante Tacos Aragón · Culiacán, Sinaloa · Mar–Dom 6pm–11:30pm*
