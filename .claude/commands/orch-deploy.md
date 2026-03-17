---
description: Despliega cambios al orquestador — git pull, instala deps y recarga PM2
---

Despliega la versión más reciente del orquestador.

Directorio: `C:/Users/gumaro_gonzalez/Desktop/ecosistema-aragon/tacos-aragon-orchestrator`

**Pasos en orden:**

1. `git -C <dir> status` — verifica que no haya cambios sin commitear. Si los hay, muéstralos y pregunta si continuar.

2. `git -C <dir> pull origin master` — descarga cambios remotos.

3. Si `orchestrator/package.json` cambió en el pull:
   `npm --prefix <dir>/orchestrator ci --omit=dev`

4. `pm2 reload orquestador` — recarga sin downtime.

5. Espera 4 segundos y ejecuta `pm2 show orquestador` para confirmar estado `online`.

6. Muestra las últimas 5 líneas de `pm2 logs orquestador --lines 5 --nostream`.

Si $ARGUMENTS contiene `--force`, omite la verificación del paso 1.
