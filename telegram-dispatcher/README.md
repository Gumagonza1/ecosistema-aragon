# 📨 Telegram Dispatcher — Ecosistema Aragón

Proceso PM2 que actúa como puente entre la cola SQLite compartida del ecosistema y la cuenta Telegram del administrador. Reemplaza WhatsApp como canal de operaciones, manteniendo las notificaciones de producción completamente separadas del bot de clientes.

---

## Rol en el ecosistema

```
                   ┌─────────────────────────────────────────────────┐
                   │               ORIGENES que escriben              │
                   │  en mensajes_queue (SQLite compartido)           │
                   │                                                   │
                   │  pmo-agent ──────────────────────────────────┐  │
                   │  monitor-bot ────────────────────────────┐   │  │
                   │  orquestador (relay vía pmo-agent) ──┐   │   │  │
                   │  cfo-agent   (relay vía pmo-agent) ──┘   │   │  │
                   └──────────────────────────────────────────┼───┼──┘
                                                              │   │
                                                              ▼   ▼
                                                    telegram-dispatcher
                                                     (poll cada 2s)
                                                              │
                        ┌─────────────────────────────────────┴──────────────────┐
                        │                                                          │
                        ▼                                                          ▼
               Chat privado admin                                        Grupo con topics
               (solo ORIGENES_PRIVADO)                                  (mirror de todos)
                        │
                        ├── Mensajes de texto (Markdown)
                        ├── Fotos / gráficas con caption
                        ├── Audios
                        ├── Botones inline (propuestas PMO / autocorrect / monitor)
                        └── Comandos: !pmo, !m, !o
                                  │
                        Admin responde
                                  │
                                  ▼
                        mensajes_responses (SQLite)
                                  │
                        ┌─────────┴──────────┐
                        ▼                    ▼
                   pmo-agent            monitor-bot
```

---

## ORIGENES_PRIVADO — Control de quién llega al chat privado

```javascript
const ORIGENES_PRIVADO = new Set(['pmo', 'monitor']);
```

Solo los mensajes de origen `pmo` y `monitor` se envían al **chat privado** del admin. El resto (orquestador, cfo, bot, etc.) **solo aparece en el mirror del grupo** (para debugging).

El PMO actúa como relay: re-etiqueta los mensajes de orquestador y CFO con el prefijo `⚙️ [Orquestador]` o `💰 [CFO]` y los encola como `origen='pmo'`, de modo que lleguen al privado del admin.

| Origen original | Llega a chat privado | Cómo llega |
|---|---|---|
| `pmo` | ✅ Directo | El PMO escribe como `pmo` |
| `monitor` | ✅ Directo | El monitor escribe como `monitor` |
| `orquestador` | ✅ Vía relay | PMO re-etiqueta → `⚙️ [Orquestador]` |
| `cfo` | ✅ Vía relay | PMO re-etiqueta → `💰 [CFO]` |
| `bot` | ❌ Solo grupo | Mirror al topic TacosAragon |

---

## Mirror al grupo con topics

Todos los orígenes se reflejan en un grupo Telegram organizado por topics (hilos). El dispatcher elige el topic según el origen y el contenido del mensaje:

| Topic ID | Nombre | Qué llega |
|---|---|---|
| 3 | General | Mensajes sin categoría, orquestador |
| 4 | TacosAragon | Mensajes sobre el bot WhatsApp |
| 5 | tacos-api | Mensajes sobre la API REST |
| 6 | cfo-agent | Mensajes del agente fiscal |
| 7 | telegram-dispatcher | Mensajes sobre el dispatcher mismo |
| 8 | MonitorBot | Alertas y reportes del monitor |
| 9 | portfolio | Cambios en el portafolio |

Los mensajes al grupo se envían sin formato Markdown (strippea `*`, `_`, `` ` ``, `[`) para evitar errores de parsing en el mirror.

---

## Tipos de mensajes y botones inline

### Texto simple
```
pmo-agent → "✅ tacos-api reiniciado correctamente (uptime: 2min)"
```

### Propuesta de orquestador (botones Aprobar/Rechazar)
El dispatcher detecta el patrón `Propuesta #N` con palabras `aprobar`/`rechazar`:

```javascript
function detectarOrch(texto) {
  const m = texto.match(/Propuesta #(\d+)/i);
  return (m && texto.includes('aprobar') && texto.includes('rechazar')) ? m[1] : null;
}
```

→ Agrega botones `✅ Aprobar` / `❌ Rechazar` al mensaje.

### Propuesta de autocorrect PMO (botones Aplicar/Ignorar)
Detectado por marcador especial `!!!AUTOCORRECT_BOTONES:<propId>!!!`:

```
!!!AUTOCORRECT_BOTONES:7d18b579!!!
```

→ Agrega botones `✅ Aplicar` / `🚫 Ignorar` y elimina el marcador del texto visible.

### Propuesta del monitor (botones Aplicar/Omitir)
Detectado si el texto contiene `Buscar:` + `Reemplazar` o `!m si`:

→ Agrega botones `✅ Aplicar` / `❌ Omitir` vinculados al `id` del mensaje en cola.

---

## Comando `!pmo` con acknowledgment inmediato

Cuando el admin escribe `!pmo <proyecto>: <instrucción>` en el chat privado:

```
Admin: !pmo tacos-api: agrega endpoint /health

→ Dispatcher escribe en mensajes_responses con origen='pmo'
→ Responde INMEDIATAMENTE: "⏳ PMO recibido para tacos-api — ejecutando..."
   (acknowledgment antes de que Claude empiece, para que el admin sepa que llegó)
→ pmo-agent procesa la instrucción en background
→ Resultado llega como nuevo mensaje cuando Claude termina
```

---

## Protocolo XML

Para instrucciones complejas, el dispatcher puede encapsular mensajes en XML:

```xml
<pmo_instruccion>
  <proyecto>tacos-api</proyecto>
  <prioridad>alta</prioridad>
  <instruccion>Agregar validación de RFC en el flujo de pedidos</instruccion>
  <contexto>El cliente reportó que no acepta RFCs con guión</contexto>
</pmo_instruccion>
```

El PMO extrae los campos y construye el prompt enriquecido para Claude.

---

## Reintentos automáticos

Si el envío a Telegram falla (rate limit, parse error), el dispatcher tiene lógica de reintentos:

```javascript
// Intento 1: con parse_mode: 'Markdown'
// Si Telegram rechaza por entidades mal formadas:
// Intento 2: sin parse_mode (texto plano)
// Si falla 3 veces:
// → Envío de emergencia sin formato ni botones
// → Marca como enviado para no bloquear la cola
```

---

## Comandos de texto

| Comando | Acción |
|---|---|
| `!pmo <proyecto>: <instrucción>` | Instrucción al PMO Agent |
| `!pmo sesion` | Ver estado de sesión Claude activa |
| `!pmo nueva sesion` | Resetear contexto de sesión |
| `/pmo_cancelar` | Cancelar ejecución PMO en curso |
| `!m reporte` | Reporte profundo del monitor |
| `!m estado` | Estado del monitor |
| `!m propuestas` | Listar propuestas pendientes |
| `!o aprobar N` | Aprobar propuesta del orquestador N |
| `!o rechazar N` | Rechazar propuesta del orquestador N |

---

## Consultas directas a APIs (sin Claude)

El dispatcher puede consultar directamente las APIs del ecosistema sin pasar por Claude:

```javascript
// GET http://localhost:3001/api/resumen/hoy → tacos-api
// GET http://localhost:3002/api/resumen → cfo-agent
```

Formatea la respuesta con totales, ticket promedio, top 5 productos, canales y métodos de pago. Esto permite al admin obtener el resumen del día de forma instantánea desde Telegram.

---

## Estructura de archivos

```
telegram-dispatcher/
├── index.js                    # Proceso único: bot, polling SQLite, callbacks
├── package.json                # node-telegram-bot-api, better-sqlite3, dotenv
├── ecosystem.config.js         # Config PM2
├── ecosystem.config.example.js # Plantilla sin valores reales
└── .env                        # (no incluido en git) tokens y rutas
```

---

## Variables de entorno

| Variable | Requerida | Descripción |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | ✅ | Token del bot (de @BotFather) |
| `TELEGRAM_ADMIN_CHAT_ID` | ✅ | Chat ID privado del admin (obtener con @userinfobot) |
| `MENSAJES_DB_PATH` | ✅ | Ruta absoluta al SQLite compartido |
| `TELEGRAM_GROUP_ID` | ❌ | ID del grupo para mirror por topics (opcional) |

---

## Tablas SQLite utilizadas

| Tabla | Lee | Escribe | Para qué |
|---|---|---|---|
| `mensajes_queue` | `enviado = 0` | — | Items pendientes de enviar |
| `mensajes_queue` | — | `enviado = 1` | Marcar como enviado |
| `mensajes_responses` | — | `id, texto, ts` | Respuestas de botones / comandos |

---

## Setup

```bash
# 1. Copiar configuración
cp .env.example .env
# Completar: TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_CHAT_ID, MENSAJES_DB_PATH

cp ecosystem.config.example.js ecosystem.config.js

# 2. Instalar dependencias
npm install

# 3. Iniciar con PM2
pm2 start ecosystem.config.js
pm2 save

# 4. Verificar
pm2 logs telegram-dispatcher --lines 20 --nostream
```

> **Seguridad:** El archivo `.env` y `ecosystem.config.js` nunca se incluyen en el repositorio.
