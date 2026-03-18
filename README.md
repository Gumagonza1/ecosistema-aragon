# Aragón Ecosystem

Complete automation and digital operations platform for **Tacos Aragón**, a restaurant in Culiacán, Sinaloa, Mexico.

## Projects

| Project | Description | Technologies |
|---------|-------------|--------------|
| [tacos-aragon-bot](./tacos-aragon-bot/) | WhatsApp ordering bot with natural language understanding | Node.js · whatsapp-web.js · NLP · Loyverse |
| [tacos-aragon-llamadas](./tacos-aragon-llamadas/) | Automated phone ordering bot | Node.js · Twilio · Google STT/TTS |
| [tacos-aragon-api](./tacos-aragon-api/) | Central REST API + intelligent agent for the mobile app | Node.js · Express · Loyverse · Facturama |
| [tacos-aragon-app](./tacos-aragon-app/) | Internal mobile app for the restaurant team | React Native · Expo |
| [tacos-aragon-web](./tacos-aragon-web/) | Restaurant website + electronic invoicing | Python · Flask · CFDI 4.0 · Facturama |
| [tacos-aragon-wp](./tacos-aragon-wp/) | WordPress plugin for invoicing and web presence | PHP · WordPress · Facturama · Loyverse |
| [tacos-aragon-fiscal](./tacos-aragon-fiscal/) | Automated SAT CFDI bulk download and fiscal analysis | Python · cfdiclient · Excel |
| [tacos-aragon-orchestrator](./tacos-aragon-orchestrator/) | Operations orchestrator — health monitoring, autonomous recovery, approval queue | Node.js · PM2 · SQLite |
| [telegram-dispatcher](./telegram-dispatcher/) | Admin notification channel — routes ops messages to Telegram with inline approval buttons | Node.js · Telegram Bot API · SQLite |

---

## General Architecture

```
Customer
  │
  ├── WhatsApp ──────────► tacos-aragon-bot
  │                         (Natural language + Loyverse POS)
  │
  ├── Phone call ─────────► tacos-aragon-llamadas
  │                         (Twilio + STT/TTS + Loyverse)
  │
  ├── Website ────────────► tacos-aragon-wp  (WordPress)
  │                         tacos-aragon-web (Flask / invoicing)
  │
  ├── Mobile app ─────────► tacos-aragon-app
  │                         (via tacos-aragon-api)
  │
  └── Fiscal download ────► tacos-aragon-fiscal
                             (SAT · CFDI · Excel)

Admin (operations)
  │
  ├── Monitor agent ──────┐
  ├── Orchestrator ───────┼──► mensajes_queue (SQLite)
  └── CFO agent ──────────┘         │
                                     ▼
                             telegram-dispatcher ──► Telegram (admin)
                             (approve/reject via inline buttons)
```

## Common Integrations

- **Loyverse POS** — Automatic order registration at point of sale
- **NLP processing** — Natural language understanding for orders and voice transcription
- **Intelligent agent** — Tool-use agent for the mobile app and quality monitoring
- **Facturama PAC** — Electronic invoice stamping (CFDI 4.0)
- **SAT (Mexico)** — Bulk download of issued and received CFDIs
- **Telegram Bot API** — Admin operations channel (independent of customer-facing WhatsApp)

## Configuration

Each project has its own `ecosystem.config.example.js` or `.env.example` with the required variables.
See the `README.md` inside each folder for installation instructions.

> **Security:** No `.env` file, certificate, token, or personal data is included in this repository.

---

# Ecosistema Aragón

Sistema completo de automatización y operación digital para **Tacos Aragón**, restaurante ubicado en Culiacán, Sinaloa, México.

## Proyectos

| Proyecto | Descripción | Tecnologías |
|----------|-------------|-------------|
| [tacos-aragon-bot](./tacos-aragon-bot/) | Bot de WhatsApp para pedidos en lenguaje natural | Node.js · whatsapp-web.js · NLP · Loyverse |
| [tacos-aragon-llamadas](./tacos-aragon-llamadas/) | Bot de llamadas telefónicas para pedidos por voz | Node.js · Twilio · Google STT/TTS |
| [tacos-aragon-api](./tacos-aragon-api/) | API REST central + agente inteligente para la app móvil | Node.js · Express · Loyverse · Facturama |
| [tacos-aragon-app](./tacos-aragon-app/) | App móvil interna para el equipo del restaurante | React Native · Expo |
| [tacos-aragon-web](./tacos-aragon-web/) | Sitio web del restaurante + facturación electrónica | Python · Flask · CFDI 4.0 · Facturama |
| [tacos-aragon-wp](./tacos-aragon-wp/) | Plugin WordPress para facturación y presencia web | PHP · WordPress · Facturama · Loyverse |
| [tacos-aragon-fiscal](./tacos-aragon-fiscal/) | Descarga masiva de CFDIs del SAT y análisis fiscal | Python · cfdiclient · Excel |
| [tacos-aragon-orchestrator](./tacos-aragon-orchestrator/) | Orquestador de operaciones — monitoreo de salud, recuperación autónoma, cola de aprobaciones | Node.js · PM2 · SQLite |
| [telegram-dispatcher](./telegram-dispatcher/) | Canal de notificaciones al admin — enruta mensajes operativos a Telegram con botones de aprobación | Node.js · Telegram Bot API · SQLite |

---

## Arquitectura general

```
Cliente
  │
  ├── WhatsApp ──────────► tacos-aragon-bot
  │                         (Lenguaje natural + Loyverse POS)
  │
  ├── Llamada telefónica ► tacos-aragon-llamadas
  │                         (Twilio + STT/TTS + Loyverse)
  │
  ├── Sitio web ──────────► tacos-aragon-wp  (WordPress)
  │                         tacos-aragon-web (Flask / facturación)
  │
  ├── App móvil ──────────► tacos-aragon-app
  │                         (vía tacos-aragon-api)
  │
  └── Descarga fiscal ────► tacos-aragon-fiscal
                             (SAT · CFDI · Excel)

Admin (operaciones)
  │
  ├── Agente monitor ─────┐
  ├── Orquestador ────────┼──► mensajes_queue (SQLite)
  └── Agente CFO ─────────┘         │
                                     ▼
                             telegram-dispatcher ──► Telegram (admin)
                             (aprobar/rechazar con botones inline)
```

## Integraciones comunes

- **Loyverse POS** — Registro automático de órdenes en el punto de venta
- **Procesamiento NLP** — Comprensión de lenguaje natural para pedidos y transcripción de voz
- **Agente inteligente** — Agente con tool use para la app móvil y monitoreo de calidad
- **Facturama PAC** — Timbrado de facturas electrónicas CFDI 4.0
- **SAT (México)** — Descarga masiva de CFDIs recibidos y emitidos
- **Telegram Bot API** — Canal de operaciones del admin (independiente del WhatsApp de clientes)

## Configuración

Cada proyecto tiene su propio `ecosystem.config.example.js` o `.env.example` con las variables necesarias.
Consulta el `README.md` de cada carpeta para instrucciones de instalación.

> **Seguridad:** Ningún archivo `.env`, certificado, token ni dato personal está incluido en este repositorio.

---

*Restaurante Tacos Aragón · Culiacán, Sinaloa · Horario: Mar–Dom 6pm–11:30pm*
