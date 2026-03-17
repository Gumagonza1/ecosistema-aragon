---
description: Reinicia un proceso PM2 a través del host-bridge del orquestador
---

Reinicia el proceso indicado en $ARGUMENTS via el host-bridge del orquestador.

**Proceso a reiniciar:** $ARGUMENTS
Si no se especificó proceso, pregunta cuál: TacosAragon, MonitorBot, tacos-api, cfo-agent, orquestador.

**Pasos:**

1. Lee el BRIDGE_TOKEN del archivo `.env` del orquestador:
   `C:/Users/gumaro_gonzalez/Desktop/ecosistema-aragon/tacos-aragon-orchestrator/orchestrator/.env`

2. Llama al bridge:
   ```
   curl -s -X POST http://localhost:9999/ejecutar \
     -H "Content-Type: application/json" \
     -H "x-bridge-token: TOKEN" \
     -d '{"accion":"pm2_restart","params":{"proceso":"PROCESO"}}'
   ```

3. Muestra la respuesta. Si el proceso es `orquestador`, usa `pm2_reload` en lugar de `pm2_restart`.

4. Espera 3 segundos y ejecuta `pm2 list` para confirmar que el proceso está `online`.

⚠️ Si el proceso es `TacosAragon` y la tabla `fallas` del orchestrator DB muestra `en_cooldown=1`, avisa antes de proceder.
