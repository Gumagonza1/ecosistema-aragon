# 🛠️ MCP Project Server — Ecosistema Aragón

Servidor MCP (Model Context Protocol) en Python que expone **26 herramientas** de gestión de código, procesos PM2 y git para un proyecto específico. Diseñado para ser usado por el PMO Agent del ecosistema: cada proyecto tiene su propia instancia del servidor, scoped a su directorio raíz.

---

## Uso

```bash
# Arranque básico (stdin/stdout)
python server.py \
  --root C:\Users\gumaro_gonzalez\Desktop\bot-tacos \
  --pm2 TacosAragon \
  --name tacos-bot

# Arranque con transporte SSE (para debugging con Inspector)
python server.py \
  --root C:\ruta\proyecto \
  --pm2 nombre-pm2 \
  --name nombre \
  --transport sse \
  --port 8081
```

### Parámetros

| Parámetro | Requerido | Descripción |
|---|---|---|
| `--root` | ✅ | Ruta absoluta al directorio raíz del proyecto |
| `--pm2` | ✅ | Nombre del proceso PM2 (ej: `TacosAragon`, `tacos-api`) |
| `--name` | ❌ | Nombre del agente para el changelog (ej: `tacos-bot`) |
| `--transport` | ❌ | `stdio` (default) o `sse` |
| `--port` | ❌ | Puerto para transporte SSE. Default: `8080` |

---

## Cómo se usa con el PMO Agent

El PMO Agent mantiene un archivo `mcp-projects.json` con la configuración de cada servidor. Cuando recibe una instrucción para un proyecto, crea una config temporal con **solo ese servidor** (MCP config dinámico) y la pasa a `claude -p`:

```json
{
  "mcpServers": {
    "project-tacos-bot": {
      "command": "python",
      "args": [
        "C:\\ecosistema-aragon\\mcp-project-server\\server.py",
        "--root", "C:\\Desktop\\bot-tacos",
        "--pm2", "TacosAragon",
        "--name", "tacos-bot"
      ]
    }
  }
}
```

```bash
claude -p \
  --mcp-config /tmp/pmo-mcp-project-tacos-bot.json \
  --session-id <uuid> \
  --permission-mode bypassPermissions \
  "Agrega validación de RFC en el flujo de pedidos"
```

Claude usa las herramientas MCP para explorar el proyecto, editar archivos, hacer commits y reiniciar el proceso. Al terminar, llama `log_change` para registrar el cambio en el historial del ecosistema.

---

## 26 Herramientas disponibles

### Lectura de código (4)

| Herramienta | Parámetros clave | Descripción |
|---|---|---|
| `read_file` | `path`, `offset`, `limit` | Lee un archivo con números de línea. Soporta paginación para archivos grandes. Max 500 KB, max 500 líneas por llamada. |
| `list_files` | `pattern`, `max_results` | Lista archivos con glob (`**/*.js`, `src/*.py`). Excluye `node_modules`, `.git`, `__pycache__`. |
| `search_code` | `pattern`, `glob`, `case_insensitive`, `max_results` | Búsqueda regex en el proyecto. Usa ripgrep si está disponible, fallback a grep. Devuelve `archivo:línea:contenido`. |
| `get_project_structure` | `max_depth` | Árbol de directorios del proyecto. Excluye carpetas internas irrelevantes. |

### Escritura de código (4)

| Herramienta | Parámetros clave | Descripción |
|---|---|---|
| `edit_file` ⭐ | `path`, `old_text`, `new_text`, `replace_all` | **Herramienta principal.** Reemplaza texto exacto. El `old_text` debe ser único. Siempre leer primero con `read_file`. |
| `write_file` | `path`, `content` | Crea o sobreescribe un archivo completo. Crea directorios intermedios automáticamente. |
| `delete_file` | `path` | Elimina un archivo. No elimina directorios. No se puede deshacer (salvo `git checkout`). |
| `create_directory` | `path` | Crea un directorio y sus padres. |

### Proceso PM2 (5)

| Herramienta | Parámetros | Descripción |
|---|---|---|
| `get_status` | — | Estado del proceso: status, CPU, memoria, uptime, restarts. |
| `view_logs` | `lines`, `err_only` | Últimas N líneas del log PM2 (stdout + stderr). |
| `restart_process` | — | Equivale a `pm2 restart <nombre>`. |
| `stop_process` | — | Detiene el proceso (`pm2 stop`). |
| `start_process` | — | Inicia el proceso si está detenido (`pm2 start`). |

### Git (6)

| Herramienta | Parámetros | Descripción |
|---|---|---|
| `git_status` | — | Archivos modificados, staged, untracked. |
| `git_diff` | `file`, `staged` | Cambios no-staged (default) o staged con `staged=true`. |
| `git_log` | `count`, `file` | Últimos N commits. Filtrable por archivo. |
| `git_pull` | — | `git pull`. Solo funciona sin cambios locales pendientes. |
| `git_add` | `files` | Agrega archivos al staging area. Usar `['.']` para todos. |
| `git_commit` | `message`, `files` | Crea un commit. Si no hay staged, agrega todos los modificados tracked. |

### Testing y validación (2)

| Herramienta | Parámetros | Descripción |
|---|---|---|
| `run_tests` | `file` | Detecta automáticamente: `node --test`, `pytest`, `npm test`. |
| `check_health` | `url` | Hace GET al endpoint indicado, devuelve status code + body. |

### Contexto del proyecto (3)

| Herramienta | Parámetros | Descripción |
|---|---|---|
| `read_claude_md` | — | Lee `CLAUDE.md` del proyecto — reglas, contexto técnico, convenciones. |
| `get_dependencies` | — | Lee `package.json` (Node) o `requirements.txt` (Python). |
| `run_command` | `command`, `timeout` | Ejecuta un comando shell arbitrario en el directorio del proyecto. Timeout: 60s. |

### Historial de cambios — Changelog (2)

| Herramienta | Parámetros | Descripción |
|---|---|---|
| `log_change` | `titulo`, `desc`, `archivos`, `tags`, `origen` | **Llamar siempre al terminar una tarea que modifique archivos.** Escribe en `C:/SesionBot/changelogs/<agente>.jsonl`. |
| `search_changes` | `query`, `tags`, `agente`, `limit` | Busca en el historial de cambios. PMO puede ver todos los agentes; otros solo los suyos. |

---

## Sistema de changelog en detalle

### `log_change` — Registrar un cambio

```python
# Llamada desde Claude:
log_change(
    titulo="Fix validación RFC en pedidos",
    desc="Agregada regex de RFC en src/pedidos.js línea 87. Corrige crash cuando cliente omite guión.",
    archivos=["src/pedidos.js"],
    tags=["bug", "tacos-bot"],
    origen="user"  # 'user' | 'autofix' | 'monitor'
)
```

Genera en `C:/SesionBot/changelogs/<nombre>.jsonl`:

```jsonl
{"ts":"2026-03-25T14:30:00-07:00","agente":"tacos-bot","origen":"user","titulo":"Fix validación RFC","desc":"...","archivos":["src/pedidos.js"],"tags":["bug","tacos-bot"]}
```

### `search_changes` — Buscar en el historial

```python
# Buscar por texto libre
search_changes(query="RFC pedidos")

# Buscar por tags
search_changes(tags=["timeout", "session"])

# Ver cambios de un agente específico (solo PMO puede hacerlo)
search_changes(agente="tacos-api", limit=10)
```

### Vocabulario de tags canónicos

| Tag | Cuándo usarlo |
|---|---|
| `bug` | Corrección de error existente |
| `feature` | Nueva funcionalidad |
| `config` | Cambio en configuración o variables de entorno |
| `prompt` | Modificación de system prompt de un agente |
| `db` | Cambio en esquema SQLite o queries |
| `api` | Cambio en endpoints o lógica de API REST |
| `timeout` | Ajuste de timeouts de procesos o requests |
| `session` | Gestión de sesiones Claude o WhatsApp |
| `xml` | Protocolo XML entre PMO y dispatcher |
| `changelog` | Cambio en la infraestructura del changelog mismo |
| `mcp` | Cambio en MCP server o config de herramientas |
| `relay` | Lógica de relay de mensajes entre agentes |
| `dispatcher` | Cambio en telegram-dispatcher |
| `telegram` | Cualquier integración Telegram |
| `monitor` | Agente monitor de calidad |
| `orquestador` | Watchdog central |
| `pmo` | Agente PMO |
| `tacos-bot` | Bot WhatsApp |
| `tacos-api` | API REST central |
| `cfo-agent` | Agente fiscal |

---

## Seguridad

### Archivos bloqueados (BLOCKED_PATTERNS)

El servidor nunca expone ni modifica estos archivos:

```python
BLOCKED_PATTERNS = [
    ".env", ".env.*",
    "*.pem", "*.key", "*.p12", "*.pfx",
    "credentials.json", "service-account*.json",
    "node_modules/**", ".git/objects/**", "__pycache__/**",
]
```

### Extensiones binarias (BINARY_EXTENSIONS)

No se leen ni editan archivos con estas extensiones:

```
Imágenes:   .png .jpg .jpeg .gif .bmp .ico .webp
Multimedia: .mp3 .mp4 .wav .avi .mov
Comprimidos:.zip .tar .gz .rar .7z
Ejecutables:.exe .dll .so .dylib
Documentos: .pdf .doc .docx .xls .xlsx
Bases datos:.sqlite .db .sqlite3
```

### Prevención de path traversal

Toda ruta se normaliza y se verifica que quede dentro de `PROJECT_ROOT`:

```python
full_path = (PROJECT_ROOT / relative_path).resolve()
full_path.relative_to(PROJECT_ROOT.resolve())  # lanza ValueError si escapa
```

### Límites de tamaño

| Límite | Valor |
|---|---|
| Tamaño máximo de archivo para lectura | 500 KB |
| Máximo de líneas por `read_file` | 500 líneas |
| Máximo de resultados en `list_files` | 500 |
| Máximo de coincidencias en `search_code` | 200 |

### Fix del pipe deadlock en Windows

`_run_cmd()` usa `subprocess.Popen` en lugar de `subprocess.run` para poder matar el árbol completo de procesos en caso de timeout:

```python
except subprocess.TimeoutExpired:
    if sys.platform == "win32":
        subprocess.run(
            f"taskkill /F /T /PID {proc.pid}",
            capture_output=True, shell=True, timeout=5
        )
    proc.kill()
```

El flag `/T` de `taskkill` mata todos los procesos hijos y nietos, liberando los pipes y evitando que el servidor MCP quede bloqueado.

---

## Instalación

### Requisitos

- Python 3.10+
- `pip install mcp>=1.0.0 pydantic>=2.0`
- ripgrep (`rg`) instalado en PATH (opcional, mejora rendimiento de `search_code`)

### Setup en un proyecto nuevo

**1.** Agregar el servidor al `mcp-projects.json` del PMO Agent:

```json
{
  "mcpServers": {
    "project-mi-proyecto": {
      "command": "python",
      "args": [
        "C:\\ecosistema-aragon\\mcp-project-server\\server.py",
        "--root", "C:\\ruta\\al\\proyecto",
        "--pm2", "nombre-en-pm2",
        "--name", "mi-proyecto"
      ]
    }
  }
}
```

**2.** Verificar que el servidor arranca correctamente:

```bash
python server.py \
  --root C:\ruta\al\proyecto \
  --pm2 nombre-en-pm2 \
  --name mi-proyecto \
  --transport sse \
  --port 8082
# Abrir http://localhost:8082 en MCP Inspector para probar las herramientas
```

**3.** Agregar el proyecto en `config.js` del PMO Agent y reiniciar.

---

## Estructura de archivos

```
mcp-project-server/
├── server.py           # Servidor MCP completo — 26 herramientas
└── requirements.txt    # mcp>=1.0.0, pydantic>=2.0
```

El servidor no tiene estado propio: `PROJECT_ROOT`, `PM2_NAME` y `PROJECT_NAME` se configuran al arrancar con los argumentos CLI. Cada instancia (un proceso Python por proyecto) opera completamente aislada.
