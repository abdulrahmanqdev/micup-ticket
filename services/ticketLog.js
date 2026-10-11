export async function kanalAdiBul(client, kanalId) {
    try {
        const kanal = await client.rest('GET', '/channels/' + kanalId);
        if (kanal && kanal.name) return kanal.name;
    } catch (hata) {}
    return String(kanalId);
}

export function logGonder(client, baslik, alanlar, renk) {
    const satir = (alanlar || []).map(function (alan) { return alan.name + ': ' + alan.value; }).join(' | ');
    console.log('[TICKET] ' + baslik + (satir ? ' | ' + satir : ''));

    const logKanal = process.env.TICKET_LOG_KANAL;
    if (!logKanal) return;

    const govde = {
        embeds: [{
            title: baslik,
            color: renk || 5793266,
            fields: alanlar || [],
            footer: { text: 'Ticket Sistemi' },
            timestamp: new Date().toISOString(),
        }],
    };

    client.send(logKanal, govde).catch(function (hata) {
        console.error('[TICKET] log kanalina gonderilemedi:', hata.message || hata);
    });
}
