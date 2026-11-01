import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { sign } from '../src/signature.js';
import { textMessagePayload } from './fixtures.js';

const VERIFY_TOKEN = 'token-verificacion';
const APP_SECRET = 'app-secret-prueba';

describe('Servidor del webhook', () => {
  let server;
  let base;
  const events = [];

  before(async () => {
    server = createApp({
      verifyToken: VERIFY_TOKEN,
      appSecret: APP_SECRET,
      onEvent: (event) => events.push(event),
      logger: { error: () => {} },
    });
    await new Promise((resolve) => server.listen(0, resolve));
    base = `http://127.0.0.1:${server.address().port}`;
  });

  after(() => new Promise((resolve) => server.close(resolve)));

  const postSigned = (body, signature) =>
    fetch(`${base}/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': signature ?? sign(body, APP_SECRET) },
      body,
    });

  test('GET /webhook devuelve hub.challenge con token válido', async () => {
    const qs = new URLSearchParams({ 'hub.mode': 'subscribe', 'hub.verify_token': VERIFY_TOKEN, 'hub.challenge': '1158201444' });
    const res = await fetch(`${base}/webhook?${qs}`);
    assert.equal(res.status, 200);
    assert.equal(await res.text(), '1158201444');
  });

  test('GET /webhook responde 403 con token inválido', async () => {
    const qs = new URLSearchParams({ 'hub.mode': 'subscribe', 'hub.verify_token': 'malo', 'hub.challenge': '1' });
    assert.equal((await fetch(`${base}/webhook?${qs}`)).status, 403);
  });

  test('POST /webhook con firma válida procesa los mensajes', async () => {
    const body = JSON.stringify(textMessagePayload);
    const res = await postSigned(body);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { received: true, messages: 3, statuses: 0 });

    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(events.length, 1);
    assert.equal(events[0].messages[0].text, 'Hola, quiero una cotización');
  });

  test('POST /webhook con firma inválida responde 401 y no procesa', async () => {
    const before = events.length;
    const res = await postSigned(JSON.stringify(textMessagePayload), 'sha256=' + '0'.repeat(64));
    assert.equal(res.status, 401);
    assert.equal(events.length, before);
  });

  test('POST /webhook firmado pero con JSON inválido responde 400', async () => {
    assert.equal((await postSigned('{roto')).status, 400);
  });

  test('rutas desconocidas responden 404 y /health 200', async () => {
    assert.equal((await fetch(`${base}/otra`)).status, 404);
    assert.equal((await fetch(`${base}/health`)).status, 200);
  });
});
