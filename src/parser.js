/**
 * Extrae el contenido legible de un mensaje según su tipo.
 * @param {any} msg mensaje crudo de WhatsApp Cloud API
 */
function extractContent(msg) {
  switch (msg.type) {
    case 'text':
      return { text: msg.text?.body ?? '' };
    case 'image':
    case 'audio':
    case 'video':
    case 'document':
    case 'sticker': {
      const media = msg[msg.type] ?? {};
      return { mediaId: media.id, mimeType: media.mime_type, caption: media.caption, filename: media.filename };
    }
    case 'location':
      return {
        latitude: msg.location?.latitude,
        longitude: msg.location?.longitude,
        name: msg.location?.name,
        address: msg.location?.address,
      };
    case 'interactive': {
      const reply = msg.interactive?.button_reply ?? msg.interactive?.list_reply ?? {};
      return { replyId: reply.id, text: reply.title };
    }
    case 'button':
      return { text: msg.button?.text, payload: msg.button?.payload };
    case 'reaction':
      return { emoji: msg.reaction?.emoji, messageId: msg.reaction?.message_id };
    default:
      return {};
  }
}

/** Elimina claves con valor undefined para una salida más limpia. */
const compact = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

/**
 * Normaliza el payload de un webhook de WhatsApp Cloud API.
 * @param {any} payload cuerpo JSON recibido
 * @returns {{ messages: object[], statuses: object[] }}
 */
export function parseWebhook(payload) {
  const result = { messages: [], statuses: [] };
  if (payload?.object !== 'whatsapp_business_account' || !Array.isArray(payload.entry)) return result;

  for (const entry of payload.entry) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages') continue;
      const value = change.value ?? {};
      const phoneNumberId = value.metadata?.phone_number_id;
      const contacts = new Map((value.contacts ?? []).map((c) => [c.wa_id, c.profile?.name]));

      for (const msg of value.messages ?? []) {
        result.messages.push(
          compact({
            id: msg.id,
            from: msg.from,
            name: contacts.get(msg.from),
            phoneNumberId,
            timestamp: msg.timestamp ? new Date(Number(msg.timestamp) * 1000).toISOString() : undefined,
            type: msg.type,
            ...extractContent(msg),
          }),
        );
      }

      for (const st of value.statuses ?? []) {
        result.statuses.push(
          compact({
            id: st.id,
            recipient: st.recipient_id,
            status: st.status,
            phoneNumberId,
            timestamp: st.timestamp ? new Date(Number(st.timestamp) * 1000).toISOString() : undefined,
            error: st.errors?.[0]?.title,
          }),
        );
      }
    }
  }
  return result;
}
