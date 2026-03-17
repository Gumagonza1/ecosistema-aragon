---
description: Últimos eventos del orquestador con filtro opcional por servicio o nivel
---

Consulta la tabla `eventos` del orquestador.

DB: `C:/Users/gumaro_gonzalez/Desktop/ecosistema-aragon/tacos-aragon-orchestrator/orchestrator/data/orchestrator.db`

Argumentos aceptados en $ARGUMENTS:
- Sin argumento → últimos 20 eventos
- Nombre de servicio (ej. `TacosAragon`) → filtra por ese servicio, últimos 20
- `error` o `critical` → filtra por nivel, últimos 20
- Número (ej. `50`) → últimos N eventos

Construye la query SQLite correspondiente y ejecuta con `sqlite3 "DB_PATH" "QUERY"`.

Formato de salida:
```
FECHA/HORA        | SERVICIO      | TIPO         | NIVEL    | MENSAJE
```
Ordena por `ts DESC`. No muestres el campo `id`.
