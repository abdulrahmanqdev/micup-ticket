import ticketMagaza from './ticketStore.js';

const TEPKI = '🎫';

export function panelGovdesi() {
    return {
        embeds: [{
            title: 'Destek Ticket',
            description: 'Destek almak icin asagidaki ' + TEPKI + ' tepkisine basin. Size ozel bir ticket kanali acilir.',
            color: 5793266,
            fields: [
                { name: 'Nasil calisir?', value: 'Tepkiye basin -> kanal acilir -> sorununuzu yazarsiniz.', inline: false },
                { name: 'Kapatma', value: 'Ticket kanalindaki kapatma butonuna basin.', inline: false },
            ],
            footer: { text: 'Ticket Sistemi' },
            timestamp: new Date().toISOString(),
        }],
    };
}

export async function panelGonder(client, kanalId, guildId, otomatik) {
    const mesaj = await client.send(kanalId, panelGovdesi());
    try {
        await client.rest(
            'PUT',
            '/channels/' + mesaj.channelId + '/messages/' + mesaj.id + '/reactions/' + encodeURIComponent(TEPKI) + '/@me'
        );
    } catch (hata) {
        await client.rest('DELETE', '/channels/' + mesaj.channelId + '/messages/' + mesaj.id).catch(function () {});
        throw hata;
    }
    ticketMagaza.panelEkle(mesaj.id, mesaj.channelId, guildId || null, otomatik);
    return mesaj;
}
