# Aragón Ecosystem

Complete automation and digital operations platform for **Tacos Aragón**, a restaurant in Culiacán, Sinaloa, Mexico.

## Projects

| Project | Description | Technologies |
|---------|-------------|--------------|
| [tacos-aragon-bot](./tacos-aragon-bot/) | WhatsApp ordering bot with natural language understanding | Node.js · whatsapp-web.js · Gemini · Loyverse |
| [tacos-aragon-llamadas](./tacos-aragon-llamadas/) | Automated phone ordering bot | Node.js · Twilio · Google STT/TTS · Gemini |
| [tacos-aragon-api](./tacos-aragon-api/) | Central REST API + intelligent agent for the mobile app | Node.js · Express · Claude · Loyverse · Facturama |
| [tacos-aragon-app](./tacos-aragon-app/) | Internal mobile app for the restaurant team | React Native · Expo |
| [tacos-aragon-web](./tacos-aragon-web/) | Restaurant website + electronic invoicing | Python · Flask · CFDI 4.0 · Facturama |
| [tacos-aragon-wp](./tacos-aragon-wp/) | WordPress plugin for invoicing and web presence | PHP · WordPress · Facturama · Loyverse |
| [tacos-aragon-fiscal](./tacos-aragon-fiscal/) | Automated SAT CFDI bulk download and fiscal analysis | Python · cfdiclient · Gemini · Excel |

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
```

## Common Integrations

- **Loyverse POS** — Automatic order registration at point of sale
- **Google Gemini** — Natural language processing for orders and voice transcription
- **Anthropic Claude** — Intelligent agent with tool use for the mobile app
- **Facturama PAC** — Electronic invoice stamping (CFDI 4.0)
- **SAT (Mexico)** — Bulk download of issued and received CFDIs

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
| [tacos-aragon-bot](./tacos-aragon-bot/) | Bot de WhatsApp para pedidos en lenguaje natural | Node.js · whatsapp-web.js · Gemini · Loyverse |
| [tacos-aragon-llamadas](./tacos-aragon-llamadas/) | Bot de llamadas telefónicas para pedidos por voz | Node.js · Twilio · Google STT/TTS · Gemini |
| [tacos-aragon-api](./tacos-aragon-api/) | API REST central + agente inteligente para la app móvil | Node.js · Express · Claude · Loyverse · Facturama |
| [tacos-aragon-app](./tacos-aragon-app/) | App móvil interna para el equipo del restaurante | React Native · Expo |
| [tacos-aragon-web](./tacos-aragon-web/) | Sitio web del restaurante + facturación electrónica | Python · Flask · CFDI 4.0 · Facturama |
| [tacos-aragon-wp](./tacos-aragon-wp/) | Plugin WordPress para facturación y presencia web | PHP · WordPress · Facturama · Loyverse |
| [tacos-aragon-fiscal](./tacos-aragon-fiscal/) | Descarga masiva de CFDIs del SAT y análisis fiscal | Python · cfdiclient · Gemini · Excel |

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
```

## Integraciones comunes

- **Loyverse POS** — Registro automático de órdenes en el punto de venta
- **Google Gemini** — Procesamiento de lenguaje natural y transcripción de voz
- **Anthropic Claude** — Agente inteligente con tool use para la app móvil
- **Facturama PAC** — Timbrado de facturas electrónicas CFDI 4.0
- **SAT (México)** — Descarga masiva de CFDIs recibidos y emitidos

## Configuración

Cada proyecto tiene su propio `ecosystem.config.example.js` o `.env.example` con las variables necesarias.
Consulta el `README.md` de cada carpeta para instrucciones de instalación.

> **Seguridad:** Ningún archivo `.env`, certificado, token ni dato personal está incluido en este repositorio.

---

*Restaurante Tacos Aragón · Culiacán, Sinaloa · Horario: Mar–Dom 6pm–11:30pm*
