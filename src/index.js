import { createApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();

const server = createApp({
  ...config,
  // Punto de integración: reenvía a n8n, una cola, un bot de IA, etc.
  onEvent: async ({ messages, statuses }) => {
    for (const m of messages) {
      console.log(`[mensaje] ${m.name ?? m.from} (${m.type}): ${m.text ?? m.caption ?? ''}`);
    }
    for (const s of statuses) {
      console.log(`[estado] ${s.id} -> ${s.status}`);
    }
  },
});

server.listen(config.port, () => {
  console.log(`Webhook de WhatsApp escuchando en http://localhost:${config.port}${config.webhookPath}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
