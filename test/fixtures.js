/** Payloads de ejemplo basados en el formato de WhatsApp Cloud API. */
export const textMessagePayload = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: '102290129340398',
      changes: [
        {
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '51999888777', phone_number_id: '106540352242922' },
            contacts: [{ profile: { name: 'Cliente Demo' }, wa_id: '51987654321' }],
            messages: [
              {
                from: '51987654321',
                id: 'wamid.HBgLNTE5ODc2NTQzMjEVAgASGBQzQTg',
                timestamp: '1793546400',
                type: 'text',
                text: { body: 'Hola, quiero una cotización' },
              },
              {
                from: '51987654321',
                id: 'wamid.IMG',
                timestamp: '1793546460',
                type: 'image',
                image: { id: 'media-123', mime_type: 'image/jpeg', caption: 'Foto del producto' },
              },
              {
                from: '51987654321',
                id: 'wamid.BTN',
                timestamp: '1793546470',
                type: 'interactive',
                interactive: { type: 'button_reply', button_reply: { id: 'opt_si', title: 'Sí, continuar' } },
              },
            ],
          },
        },
      ],
    },
  ],
};

export const statusPayload = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: '102290129340398',
      changes: [
        {
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '51999888777', phone_number_id: '106540352242922' },
            statuses: [
              { id: 'wamid.OUT1', status: 'delivered', timestamp: '1793546500', recipient_id: '51987654321' },
              {
                id: 'wamid.OUT2',
                status: 'failed',
                timestamp: '1793546501',
                recipient_id: '51911111111',
                errors: [{ code: 131026, title: 'Message undeliverable' }],
              },
            ],
          },
        },
      ],
    },
  ],
};
