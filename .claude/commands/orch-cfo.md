---
description: Inspecciona la cola CFO — solicitudes pendientes, resueltas o con error
---

Consulta la tabla `solicitudes_cfo` de la DB compartida.

DB: Leer `MENSAJES_DB_PATH` del archivo `.env`:
`C:/Users/gumaro_gonzalez/Desktop/ecosistema-aragon/tacos-aragon-orchestrator/orchestrator/.env`

Argumentos en $ARGUMENTS:
- Sin argumento / `pendientes` → `WHERE estado = 'pendiente'`
- `error` → `WHERE estado = 'error'`
- `todas` → sin filtro, últimas 20
- `limpiar` → `DELETE FROM solicitudes_cfo WHERE estado IN ('resuelta','error') AND ts_fin < (unixepoch()-86400)*1000`

Query base:
```sql
SELECT id, tipo, estado,
  datetime(ts_inicio/1000,'unixepoch','localtime') AS inicio,
  substr(respuesta,1,80) AS resp_preview
FROM solicitudes_cfo
WHERE <filtro>
ORDER BY ts_inicio DESC LIMIT 20;
```

Ejecuta con `sqlite3 "DB_PATH" "QUERY"` y presenta en tabla.
Si hay pendientes, indica cuántas hay y hace cuánto tiempo llevan esperando.
