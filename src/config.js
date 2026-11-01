/**
 * Carga la configuración desde variables de entorno.
 * Si existe un archivo .env, se carga con process.loadEnvFile (Node >= 20.12).
 */
export function loadConfig(env = process.env, { envFile = '.env' } = {}) {
  if (env === process.env && envFile) {
    try {
      process.loadEnvFile(envFile);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }

  const config = {
    port: Number(env.PORT ?? 3000),
    verifyToken: env.WHATSAPP_VERIFY_TOKEN,
    appSecret: env.WHATSAPP_APP_SECRET,
    webhookPath: env.WEBHOOK_PATH ?? '/webhook',
  };

  const missing = [];
  if (!config.verifyToken) missing.push('WHATSAPP_VERIFY_TOKEN');
  if (!config.appSecret) missing.push('WHATSAPP_APP_SECRET');
  if (missing.length) {
    throw new Error(`Faltan variables de entorno: ${missing.join(', ')}`);
  }
  return config;
}
