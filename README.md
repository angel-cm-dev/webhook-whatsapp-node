# webhook-whatsapp-node

Receptor de webhooks de **WhatsApp Cloud API** en Node.js sin dependencias: verificación del webhook, validación de firma HMAC y parseo de mensajes entrantes.

![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20.12-339933?logo=node.js&logoColor=white)
![Dependencias](https://img.shields.io/badge/dependencias-0-brightgreen)
![Licencia MIT](https://img.shields.io/badge/licencia-MIT-blue.svg)
[![CI](https://github.com/angel-cm-dev/webhook-whatsapp-node/actions/workflows/ci.yml/badge.svg)](https://github.com/angel-cm-dev/webhook-whatsapp-node/actions/workflows/ci.yml)

## Características

- **Verificación del webhook** (`GET`): responde `hub.challenge` solo si `hub.verify_token` coincide.
- **Validación de firma** `X-Hub-Signature-256` con HMAC-SHA256 sobre el cuerpo crudo y comparación en tiempo constante (`timingSafeEqual`).
- **Parseo normalizado** de mensajes: texto, imagen/audio/video/documento/sticker, ubicación, respuestas interactivas, botones y reacciones.
- **Estados de entrega** (`sent`, `delivered`, `read`, `failed`) con detalle de error.
- Respuesta `200` inmediata y procesamiento asíncrono mediante un callback `onEvent` (punto de integración para n8n, colas o bots de IA).
- Configuración por variables de entorno con `.env` (`process.loadEnvFile`), límite de tamaño de payload y endpoint `/health`.

## Requisitos

- Node.js 20.12 o superior (probado con Node 24).
- Una app en [Meta for Developers](https://developers.facebook.com/) con el producto WhatsApp habilitado.

## Instalación y uso

```bash
git clone https://github.com/angel-cm-dev/webhook-whatsapp-node.git
cd webhook-whatsapp-node
cp .env.example .env   # edita WHATSAPP_VERIFY_TOKEN y WHATSAPP_APP_SECRET
npm start
```

Para pruebas locales expón el puerto con un túnel (por ejemplo `cloudflared` o `ngrok`) y registra en Meta la URL `https://<tu-túnel>/webhook` con el mismo token de verificación.

| Variable                | Descripción                                        |
|-------------------------|----------------------------------------------------|
| `PORT`                  | Puerto HTTP (por defecto `3000`)                   |
| `WHATSAPP_VERIFY_TOKEN` | Token de verificación configurado en Meta          |
| `WHATSAPP_APP_SECRET`   | App Secret de la app de Meta (firma HMAC)          |
| `WEBHOOK_PATH`          | Ruta del webhook (por defecto `/webhook`)          |

## Ejemplo

Verificación:

```bash
curl "http://localhost:3000/webhook?hub.mode=subscribe&hub.verify_token=cambia-este-token&hub.challenge=1158201444"
# 1158201444
```

Mensaje entrante firmado (Meta lo envía automáticamente):

```bash
BODY='{"object":"whatsapp_business_account","entry":[{"changes":[{"field":"messages","value":{"metadata":{"phone_number_id":"106540352242922"},"contacts":[{"profile":{"name":"Cliente Demo"},"wa_id":"51987654321"}],"messages":[{"from":"51987654321","id":"wamid.1","timestamp":"1793546400","type":"text","text":{"body":"Hola"}}]}}]}]}'
SIG="sha256=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "tu-app-secret" | sed 's/^.* //')"
curl -X POST http://localhost:3000/webhook -H "Content-Type: application/json" -H "X-Hub-Signature-256: $SIG" -d "$BODY"
# {"received":true,"messages":1,"statuses":0}
```

Salida en consola:

```
[mensaje] Cliente Demo (text): Hola
```

Objeto normalizado que recibe `onEvent`:

```json
{
  "messages": [
    {
      "id": "wamid.1",
      "from": "51987654321",
      "name": "Cliente Demo",
      "phoneNumberId": "106540352242922",
      "timestamp": "2026-11-01T15:20:00.000Z",
      "type": "text",
      "text": "Hola"
    }
  ],
  "statuses": []
}
```

## Estructura del proyecto

```
webhook-whatsapp-node/
├── src/
│   ├── app.js         # Servidor HTTP: verificación GET y recepción POST
│   ├── signature.js   # HMAC-SHA256 y comparación segura
│   ├── parser.js      # Normalización de mensajes y estados
│   ├── config.js      # Carga y validación de variables de entorno
│   └── index.js       # Punto de entrada (manejador de ejemplo)
├── test/              # Pruebas node:test y payloads de ejemplo
├── .env.example
└── .github/workflows/ci.yml
```

## Pruebas

```bash
npm test
```

Cubre firma válida/inválida, handshake de verificación, parseo de distintos tipos de mensaje, estados y configuración.

## Roadmap

- [ ] Cliente para responder mensajes vía Graph API (`/messages`).
- [ ] Reenvío opcional a un webhook de n8n con reintentos.
- [ ] Deduplicación de eventos por `wamid` y Dockerfile.

## Licencia y autor

Distribuido bajo licencia [MIT](LICENSE).

Desarrollado por **Angel Castañeda Meza** — Ingeniero de Sistemas, Lima, Perú · [github.com/angel-cm-dev](https://github.com/angel-cm-dev)
