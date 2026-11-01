import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.js';
import { parseWebhook } from '../src/parser.js';
import { sign, verifySignature } from '../src/signature.js';
import { statusPayload, textMessagePayload } from './fixtures.js';

const SECRET = 'secreto-de-prueba';

test('verifySignature acepta una firma correcta', () => {
  const body = Buffer.from('{"hola":"mundo"}');
  assert.equal(verifySignature(body, sign(body, SECRET), SECRET), true);
});

test('verifySignature rechaza firmas alteradas, ausentes o con otro secreto', () => {
  const body = Buffer.from('{"hola":"mundo"}');
  const good = sign(body, SECRET);
  assert.equal(verifySignature(Buffer.from('{"hola":"mundo!"}'), good, SECRET), false);
  assert.equal(verifySignature(body, sign(body, 'otro'), SECRET), false);
  assert.equal(verifySignature(body, undefined, SECRET), false);
  assert.equal(verifySignature(body, 'sha256=abc', SECRET), false);
  assert.equal(verifySignature(body, good.replace('sha256=', 'sha1='), SECRET), false);
});

test('parseWebhook normaliza mensajes de texto, imagen e interactivos', () => {
  const { messages, statuses } = parseWebhook(textMessagePayload);
  assert.equal(statuses.length, 0);
  assert.equal(messages.length, 3);

  assert.deepEqual(messages[0], {
    id: 'wamid.HBgLNTE5ODc2NTQzMjEVAgASGBQzQTg',
    from: '51987654321',
    name: 'Cliente Demo',
    phoneNumberId: '106540352242922',
    timestamp: new Date(1793546400 * 1000).toISOString(),
    type: 'text',
    text: 'Hola, quiero una cotización',
  });
  assert.equal(messages[1].mediaId, 'media-123');
  assert.equal(messages[1].caption, 'Foto del producto');
  assert.equal(messages[2].replyId, 'opt_si');
  assert.equal(messages[2].text, 'Sí, continuar');
});

test('parseWebhook extrae estados de entrega y errores', () => {
  const { messages, statuses } = parseWebhook(statusPayload);
  assert.equal(messages.length, 0);
  assert.deepEqual(
    statuses.map((s) => [s.status, s.error]),
    [
      ['delivered', undefined],
      ['failed', 'Message undeliverable'],
    ],
  );
});

test('parseWebhook ignora payloads desconocidos', () => {
  assert.deepEqual(parseWebhook({ object: 'page', entry: [] }), { messages: [], statuses: [] });
  assert.deepEqual(parseWebhook(null), { messages: [], statuses: [] });
});

test('loadConfig exige las variables obligatorias', () => {
  assert.throws(() => loadConfig({}), /WHATSAPP_VERIFY_TOKEN, WHATSAPP_APP_SECRET/);
  const cfg = loadConfig({ WHATSAPP_VERIFY_TOKEN: 't', WHATSAPP_APP_SECRET: 's', PORT: '8080' });
  assert.equal(cfg.port, 8080);
  assert.equal(cfg.webhookPath, '/webhook');
});
