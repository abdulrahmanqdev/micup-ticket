import 'dotenv/config';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Client, Events } from 'micup.js';

import TicketOlaylari from './events/ticket.js';

const token = process.env.MICUP_BOT_TOKEN;
const prefix = process.env.PREFIX || '!';

if (!token) {
    console.error('HATA: MICUP_BOT_TOKEN ayarlanmamis. .env dosyasini kontrol et.');
    process.exit(1);
}

const client = new Client();
const commands = new Map();

const ticketOlaylari = new TicketOlaylari(client);

async function loadCommands() {
    var folder = join(process.cwd(), 'commands');
    var files = (await readdir(folder)).filter(function(file) { return file.endsWith('.js'); });

    for (var i = 0; i < files.length; i++) {
        var moduleUrl = pathToFileURL(join(folder, files[i])).href;
        var command = await (await import(moduleUrl)).default;

        if (!command?.name || typeof command.execute !== 'function') {
            console.warn('Komut yuklenemedi: ' + files[i] + ' (name ve execute gerekli)');
            continue;
        }

        commands.set(command.name, command);
        for (var j = 0; j < (command.aliases || []).length; j++) {
            commands.set(command.aliases[j], command);
        }
        console.log('Komut yuklendi: ' + command.name);
    }
}

await loadCommands();

ticketOlaylari.dinle();

client.on(Events.Ready, function(readyClient) {
    console.log('Bot giris yapti: ' + readyClient.user.username);
    console.log('Prefix: ' + prefix);
});

client.on(Events.MessageCreate, async function(message) {
    try {
        if (message.isBot) return;
        if (typeof message.content !== 'string') return;
        if (!message.content.startsWith(prefix)) return;

        var args = message.content.slice(prefix.length).trim().split(/\s+/);
        var name = (args.shift() || '').toLowerCase();
        if (!name) return;

        var command = commands.get(name);
        if (!command) return;

        await command.execute({ client: client, message: message, args: args, prefix: prefix });
    } catch (error) {
        console.error('Komut calistirilirken hata:', error);
        try {
            await message.reply('Komut calistirilirken bir hata olustu.');
        } catch (replyError) {
            console.error('Hata mesaji gonderilemedi:', replyError);
        }
    }
});

client.on('error', function(error) {
    console.error('Micup baglanti hatasi:', error);
});

try {
    await client.login(token);
} catch (error) {
    console.error('Micup girisi basarisiz:', error);
    process.exitCode = 1;
}
