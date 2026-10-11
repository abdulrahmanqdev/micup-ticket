function olcGatewayPing(client) {
  return new Promise((resolve) => {
    const ws = client && client.ws;

    if (!ws || typeof ws.ping !== 'function') {
      resolve(null);
      return;
    }

    const baslangic = Date.now();

    const pongDinleyici = () => {
      clearTimeout(zamanAsimi);
      ws.off('pong', pongDinleyici);
      resolve(Date.now() - baslangic);
    };

    const zamanAsimi = setTimeout(() => {
      ws.off('pong', pongDinleyici);
      resolve(null);
    }, 3000);

    try {
      ws.once('pong', pongDinleyici);
      ws.ping();
    } catch (hata) {
      clearTimeout(zamanAsimi);
      ws.off('pong', pongDinleyici);
      resolve(null);
    }
  });
}

async function olcApiPing(client) {
  const baslangic = Date.now();
  try {
    await client.rest('GET', '/users/@me');
    return Date.now() - baslangic;
  } catch (hata) {
    return null;
  }
}

function formatla(ms) {
  return ms !== null ? '`' + ms + ' ms`' : 'olculmedi';
}

export default {
  name: 'ping',
  aliases: [],
  description: 'Botun pingini (gecikmesini) olcer.',

  async execute({ client, message }) {
    const [gateway, api] = await Promise.all([
      olcGatewayPing(client),
      olcApiPing(client),
    ]);

    await message.reply(
      '**Pong!**\n' +
      'Gateway (WebSocket): ' + formatla(gateway) + '\n' +
      'API: ' + formatla(api)
    );
  },
};
