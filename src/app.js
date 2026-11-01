import { createServer } from 'node:http';
import { parseWebhook } from './parser.js';
import { verifySignature } from './signature.js';

const MAX_BODY_BYTES = 1024 * 1024; // Meta envía payloads pequeños; 1 MB es margen suficiente

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Payload demasiado grande'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/**
 * Crea el servidor receptor del webhook.
 * @param {object} options
 * @param {string} options.verifyToken token de verificación configurado en Meta
 * @param {string} options.appSecret App Secret para validar la firma HMAC
 * @param {string} [options.webhookPath='/webhook']
 * @param {(event: {messages: object[], statuses: object[]}) => void|Promise<void>} [options.onEvent]
 * @param {{ error: Function }} [options.logger=console]
 */
export function createApp({ verifyToken, appSecret, webhookPath = '/webhook', onEvent = () => {}, logger = console }) {
  return createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');

    try {
      if (req.method === 'GET' && url.pathname === '/health') {
        return sendJson(res, 200, { status: 'ok' });
      }

      if (url.pathname !== webhookPath) {
        return sendJson(res, 404, { error: 'Ruta no encontrada' });
      }

      // Verificación del webhook (handshake inicial de Meta)
      if (req.method === 'GET') {
        const mode = url.searchParams.get('hub.mode');
        const token = url.searchParams.get('hub.verify_token');
        const challenge = url.searchParams.get('hub.challenge');

        if (mode === 'subscribe' && token === verifyToken && challenge) {
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          return res.end(challenge);
        }
        return sendJson(res, 403, { error: 'Verificación fallida' });
      }

      // Notificaciones de eventos
      if (req.method === 'POST') {
        const raw = await readRawBody(req);
        if (!verifySignature(raw, req.headers['x-hub-signature-256'], appSecret)) {
          return sendJson(res, 401, { error: 'Firma inválida' });
        }

        let payload;
        try {
          payload = JSON.parse(raw.toString('utf8'));
        } catch {
          return sendJson(res, 400, { error: 'JSON inválido' });
        }

        const event = parseWebhook(payload);
        // Meta espera un 200 rápido; el procesamiento no bloquea la respuesta.
        sendJson(res, 200, { received: true, messages: event.messages.length, statuses: event.statuses.length });
        Promise.resolve()
          .then(() => onEvent(event))
          .catch((err) => logger.error('Error procesando evento:', err));
        return;
      }

      return sendJson(res, 405, { error: 'Método no permitido' });
    } catch (err) {
      const status = err.status ?? 500;
      if (status === 500) logger.error(err);
      return sendJson(res, status, { error: status === 500 ? 'Error interno' : err.message });
    }
  });
}
