---
description: Estado de todos los servicios del orquestador — fallas, cooldowns y pm2
---

Muestra el estado del orquestador Aragón. Ejecuta estos pasos en orden:

1. `pm2 list` — estado de todos los procesos
2. Lee la tabla `fallas` del DB del orquestador:
   ```
   sqlite3 "C:/Users/gumaro_gonzalez/Desktop/ecosistema-aragon/tacos-aragon-orchestrator/orchestrator/data/orchestrator.db" \
     "SELECT servicio, contador, en_cooldown, datetime(ultima_falla,'unixepoch','localtime') AS ultima FROM fallas ORDER BY servicio;"
   ```
3. Lee los últimos 10 eventos:
   ```
   sqlite3 "..." "SELECT datetime(ts,'unixepoch','localtime'),servicio,tipo,nivel,mensaje FROM eventos ORDER BY ts DESC LIMIT 10;"
   ```

Presenta el resultado en una tabla compacta. Resalta en negrita cualquier servicio con `en_cooldown=1` o `nivel=critical/error`.
Si $ARGUMENTS contiene un nombre de servicio, filtra solo ese servicio.
