import { createHmac, timingSafeEqual } from 'node:crypto';

/** Calcula la firma que Meta envía en X-Hub-Signature-256. */
export function sign(rawBody, appSecret) {
  return 'sha256=' + createHmac('sha256', appSecret).update(rawBody).digest('hex');
}

/**
 * Verifica la cabecera X-Hub-Signature-256 contra el cuerpo crudo de la petición.
 * Usa comparación en tiempo constante para evitar ataques de temporización.
 * @param {Buffer|string} rawBody
 * @param {string|undefined} header
 * @param {string} appSecret
 */
export function verifySignature(rawBody, header, appSecret) {
  if (typeof header !== 'string' || !header.startsWith('sha256=')) return false;
  const expected = Buffer.from(sign(rawBody, appSecret));
  const received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
