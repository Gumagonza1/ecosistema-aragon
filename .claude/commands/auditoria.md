# /auditoria — Auditoría de Seguridad del Ecosistema Aragón

Realiza una auditoría de seguridad completa sobre el proyecto o carpeta indicada, siguiendo las reglas del CLAUDE.md del ecosistema.

## Proceso de auditoría

### 1. Exploración inicial
- Lista todos los archivos del proyecto (estructura completa)
- Lee `package.json` / `requirements.txt` / `composer.json` para identificar dependencias y tipo de proyecto
- Lee el `CLAUDE.md` local si existe
- Identifica el tipo: Node.js backend, Python, React Native, PHP/WordPress, etc.

### 2. Lectura completa de archivos fuente
Lee **cada** archivo fuente relevante en su totalidad:
- Archivos de entrada: `index.js`, `main.py`, `app.py`, `server.js`
- Rutas/routes: `routes/*.js`, `src/*.py`
- Servicios/integraciones: `services/`, `includes/`
- Configuración: `config.js`, `.env.example`, `ecosystem.config.js`
- Plugins de build: `plugins/`
- Archivos frontend: `*.js` en `src/`, `assets/`

### 3. Checklist de vulnerabilidades a buscar

#### Reglas CLAUDE.md (siempre verificar)
- [ ] **Secretos hardcodeados**: API keys, tokens, contraseñas en código fuente (no en process.env)
- [ ] **Paths de máquina hardcodeados**: `C:\Users\gumaro_gonzalez\Desktop\...` — deben usar `DATOS_PATH`, `TAX_BOT_PATH`, `FISCAL_PATH`
- [ ] **process.exit(1) ausente**: vars requeridas como `API_TOKEN`, `LOYVERSE_TOKEN`, `ANTHROPIC_KEY` deben matar el proceso si faltan al inicio
- [ ] **require()/import dentro de handlers o funciones**: siempre deben ir al tope del archivo
- [ ] **Archivos sensibles rastreados por git**: `.env`, `ecosystem.config.js` real, `certs/`, `*.pem`, `*.key`, `datos/llave ia.txt`

#### Seguridad del servidor (Node.js/Python/PHP)
- [ ] CORS wildcard `origin: '*'` en producción
- [ ] Rate limiting ausente o demasiado permisivo (>100 req/15min)
- [ ] Helmet/CSP desactivado
- [ ] Autenticación: token en query string, sin comparación timing-safe
- [ ] Input validation: longitud, formato, tipo en todos los endpoints
- [ ] Errores internos (`err.message`, stack traces) devueltos al cliente
- [ ] Path traversal en operaciones de archivo con input del usuario
- [ ] Escrituras a archivos JSON sin límite de tamaño ni validación
- [ ] Uploads sin límite de tamaño ni validación de MIME type
- [ ] Validación de firmas de webhooks (Twilio, etc.)
- [ ] Variables de entorno requeridas sin validación al inicio

#### Seguridad frontend/móvil (React Native, JS)
- [ ] Tokens en `AsyncStorage` sin cifrar (usar `expo-secure-store`)
- [ ] Session IDs predecibles (usar entropía criptográfica)
- [ ] URLs hardcodeadas con IPs o usuarios de máquina
- [ ] Mensajes de error del servidor mostrados al usuario sin filtrar
- [ ] Validación de inputs solo en cliente pero no en servidor
- [ ] `dangerouslySetInnerHTML` o `innerHTML` con datos no sanitizados
- [ ] Sin función de logout que limpie credenciales almacenadas

#### WordPress
- [ ] Nonce validation en todos los AJAX endpoints
- [ ] `$wpdb->prepare()` en todas las queries
- [ ] `sanitize_text_field()` / `esc_html()` en outputs
- [ ] Capability checks (`current_user_can()`) antes de operaciones sensibles
- [ ] Contraseñas en campos `value=` de formularios de admin

### 4. Formato del reporte

Agrupa los hallazgos por severidad:

**CRÍTICO** — viola directamente reglas CLAUDE.md o permite acceso no autorizado:
- Secretos hardcodeados en código commiteado
- Sin process.exit(1) para vars requeridas
- Paths de máquina en código fuente
- require() dentro de handlers

**ALTO** — riesgo real de explotación:
- CORS wildcard, sin rate limiting en endpoints sensibles
- Input sin validar en operaciones de archivo/base de datos
- Errores internos expuestos al cliente
- Webhooks sin validación de firma

**MEDIO** — riesgo moderado o viola buenas prácticas:
- Sesiones sin expiración
- Logs con datos sensibles (PII, tokens parciales)
- Helmet/CSP desactivado
- Validación inconsistente cliente/servidor

**BAJO** — mejoras de hardening:
- Dependencias con `^` semver sin lock file
- Timezones hardcodeadas
- Código de debug en producción

Para cada hallazgo incluye:
```
| Archivo | Línea | Descripción | Severidad |
```

### 5. Acciones inmediatas recomendadas

Al final del reporte, lista en orden de prioridad:
1. Lo que debe hacerse **hoy** (críticos)
2. Lo que debe hacerse **esta semana** (altos)
3. Lo que puede esperar (medios/bajos)

---

## Notas de ejecución

- Usa el agente `Explore` con `thoroughness: "very thorough"` para proyectos grandes
- Si el proyecto tiene más de 20 archivos, lanza sub-agentes en paralelo por carpeta
- Siempre lee `ecosystem.config.js` y `.env.example` para entender qué vars se usan
- Verifica el `.gitignore` para confirmar que archivos sensibles están excluidos
- Después de la auditoría, pregunta si se deben corregir las vulnerabilidades encontradas

---

Ejecuta la auditoría sobre: $ARGUMENTS
Si no se especifica carpeta, audita el proyecto del directorio de trabajo actual.
