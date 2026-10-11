import { panelGonder } from '../services/ticketPanel.js';
import { logGonder, kanalAdiBul } from '../services/ticketLog.js';

export default {
    name: 'ticket',
    aliases: ['tickets'],
    description: 'Ticket paneli olusturur.',

    async execute({ client, message, args, prefix }) {
        const altKomut = (args.shift() || '').toLowerCase();

        if (altKomut !== 'panel') {
            await message.reply('Kullanim: ' + prefix + 'ticket panel - Destek ticket paneli olusturur.');
            return;
        }

        if (!message.guildId) {
            await message.reply('Ticket paneli yalnizca sunucu kanallarinda olusturulabilir.');
            return;
        }

        try {
            await panelGonder(client, message.channelId, message.guildId);
        } catch (hata) {
            await message.reply('Tepki eklenemedi: ' + (hata.message || hata));
            return;
        }

        const ad = await kanalAdiBul(client, message.channelId);
        logGonder(client, 'Ticket paneli olusturuldu', [
            { name: 'Kanal', value: '#' + ad, inline: true },
        ], 5793266);
        await message.reply('Ticket paneli olusturuldu.');
    },
};
