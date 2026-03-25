# CLAUDE.md — telegram-dispatcher

Dispatcher que conecta la cola SQLite compartida con Telegram del admin.

## Propósito
Puente entre el ecosistema (orquestador, monitor, CFO) y la cuenta de Telegram del administrador. Reemplaza WhatsApp como canal de operaciones.

## Estructura
| Archivo | Contenido |
|---------|-----------|
| `index.js` | Archivo único: polling cada 2s, envío, callbacks, comandos |
| `ecosystem.config.example.js` | Config PM2 de ejemplo |

## Reglas de trabajo
- Polling cada 2 segundos a `mensajes_queue`
- Máximo 5 mensajes por ciclo de polling
- Truncar a 4096 chars (límite Telegram)
- Botones inline para propuestas (aprobar/rechazar)

---

## MCP Prompt Primitives

Servidor: `../mcp-prompts-server/` — ejecutar con `python server.py`

### Prompts asignados a este proyecto

| # | Prompt | Archivo | Descripción | Función que cubre |
|---|--------|---------|-------------|-------------------|
| 1 | `formatear_mensaje_telegram` | `prompts/telegram.py` | Formatea mensaje con detección de tipo y botones inline | `enviarItem()` en `index.js` |
| 2 | `procesar_respuesta_admin` | `prompts/telegram.py` | Parsea y rutea respuesta del admin al servicio correcto | `bot.on('callback_query')` + `bot.on('message')` |

### Detalle de cada prompt

#### 1. `formatear_mensaje_telegram`
- **Argumentos**: `mensaje`, `origen` (orchestrator/monitor/cfo/bot), `tipo` (texto/foto/audio/propuesta)
- **System prompt**: Detecta tipo de mensaje:
  - Propuesta orquestador: regex "Propuesta #N" → botones [Aprobar][Rechazar] con callback `orch_aprobar_N`
  - Propuesta monitor: regex "Buscar:"+"Reemplazar:" → botones [Aplicar][Saltar] con callback `mon_si_ID`
  - Media: envía como sendPhoto/sendAudio con caption
  - Texto normal: sin botones
- **Función**: `index.js:enviarItem()` — dispatcher principal
- **Límite**: 4096 chars, truncar con "... (truncado)"

#### 2. `procesar_respuesta_admin`
- **Argumentos**: `texto_respuesta`, `es_callback` (bool)
- **System prompt**: Routing de respuestas:
  - Callback `orch_aprobar_N` → destino 'orch', texto "aprobar N"
  - Callback `mon_si_ID` → destino item ID, texto "si"
  - Texto `!o aprobar N` → destino 'orch'
  - Texto `!m reporte|estado|propuestas` → destino 'cmd-{comando}'
  - Texto libre → destino 'conv-{timestamp}'
- **Funciones**: `bot.on('callback_query')` (botones inline), `bot.on('message')` (texto), slash commands (/reporte, /estado, /propuestas)
- **Comandos monitor válidos**: reporte, estado, propuestas, reiniciar
