import ticketMagaza from '../services/ticketStore.js';
import { panelGonder } from '../services/ticketPanel.js';
import { logGonder, kanalAdiBul } from '../services/ticketLog.js';

const TEPKI = '🎫';
const KAPANIS_TEPKI = '🔒';

const VIEW_CHANNEL = 1 << 10;
const SEND_MESSAGES = 1 << 11;
const ADD_REACTIONS = 1 << 6;
const READ_MESSAGE_HISTORY = 1 << 16;

const UYE_IZINLERI = String(VIEW_CHANNEL | SEND_MESSAGES | ADD_REACTIONS | READ_MESSAGE_HISTORY);
const HERKESE_GIZLI = String(VIEW_CHANNEL);

export default class TicketOlaylari {
    constructor(client) {
        this.client = client;
        this.kapanisBekleyen = new Set();
    }

    dinle() {
        this.client.on('ready', () => {
            this.otomatikPanel().catch((hata) =>
                console.error('[TICKET] otomatik panel hatasi:', hata.message || hata)
            );
        });
        this.client.on('message_reaction_add', (data) => {
            this.tepkiEklendi(data).catch((hata) =>
                console.error('[TICKET] message_reaction_add hatasi:', hata.message || hata)
            );
        });
        this.client.on('message_delete', (data) => {
            this.mesajSilindi(data).catch((hata) =>
                console.error('[TICKET] message_delete hatasi:', hata.message || hata)
            );
        });
        this.client.on('message_delete_bulk', (data) => {
            this.mesajlarSilindi(data).catch((hata) =>
                console.error('[TICKET] message_delete_bulk hatasi:', hata.message || hata)
            );
        });
    }

    async otomatikPanel() {
        await this.oluleriTemizle();
        if (ticketMagaza.autoPanelGonderildiMi()) return;
        const kanalId = process.env.TICKET_PANEL_KANAL;
        if (!kanalId) {
            console.log('[TICKET] TICKET_PANEL_KANAL ayarlanmadigi icin otomatik panel gonderilmedi');
            return;
        }
        await panelGonder(this.client, kanalId, null, true);
        ticketMagaza.autoPanelIsaretle();
        const ad = await kanalAdiBul(this.client, kanalId);
        logGonder(this.client, 'Otomatik ticket paneli gonderildi', [
            { name: 'Kanal', value: '#' + ad, inline: true },
        ], 5793266);
    }

    async oluleriTemizle() {
        for (const panel of ticketMagaza.tumPaneller()) {
            if (!panel.otomatik) continue;
            const varMi = await this.mesajVarMi(panel.kanalId, panel.id);
            if (!varMi) ticketMagaza.panelSil(panel.id);
        }
        const kalanOtomatik = ticketMagaza.tumPaneller().some(function (panel) { return panel.otomatik; });
        if (!kalanOtomatik) ticketMagaza.autoPanelSifirla();
    }

    async mesajVarMi(kanalId, messageId) {
        try {
            await this.client.rest('GET', '/channels/' + kanalId + '/messages/' + messageId);
            return true;
        } catch (hata) {
            return false;
        }
    }

    async mesajSilindi(data) {
        if (!data || !data.id) return;
        const panel = ticketMagaza.panelBul(data.id);
        if (!panel) return;
        ticketMagaza.panelSil(data.id);
        if (!panel.otomatik) return;
        ticketMagaza.autoPanelSifirla();
        logGonder(this.client, 'Otomatik panel silindi, yeniden gonderiliyor', [
            { name: 'Kanal', value: '#' + panel.kanalId, inline: true },
        ], 16776960);
        await this.otomatikPanel();
    }

    async mesajlarSilindi(data) {
        if (!data || !data.ids) return;
        for (const id of data.ids) {
            await this.mesajSilindi({ id: id, channel_id: data.channel_id });
        }
    }

    async tepkiEklendi(data) {
        if (!data || !data.message_id || !data.emoji || !data.channel_id) return;
        if (data.emoji.id) return;
        if (data.member && data.member.user && data.member.user.bot) return;

        const botId = this.client.user ? this.client.user.id : null;
        if (botId && data.user_id === botId) return;

        if (data.emoji.name === KAPANIS_TEPKI) {
            await this.kapatTiklandi(data);
            return;
        }

        if (data.emoji.name !== TEPKI) return;

        const panel = ticketMagaza.panelBul(data.message_id);
        if (!panel || panel.kanalId !== data.channel_id) return;

        try {
            await this.acGiris(data, panel);
        } finally {
            await this.tepkiKaldir(data.channel_id, data.message_id, data.user_id, TEPKI);
        }
    }

    async acGiris(data, panel) {
        const botId = this.client.user ? this.client.user.id : null;
        const guildId = data.guild_id || panel.guildId;
        const userId = data.user_id;
        if (!guildId) return;

        const kullaniciAdi = await this.kullaniciAdiBul(data, userId);
        const anahtar = guildId + '|' + userId;
        const acikTicket = ticketMagaza.ticketBul(anahtar);

        if (acikTicket) {
            const halaVarMi = await this.kanalHalaVarMi(guildId, acikTicket.kanalId);
            if (halaVarMi) {
                await this.uyariGonder(userId, panel.kanalId, acikTicket);
                return;
            }
            ticketMagaza.ticketKapat(anahtar);
        }

        const kategoriId = process.env.TICKET_KATEGORI || null;
        let kanal;
        try {
            const govde = {
                type: 0,
                name: 'ticket-' + kullaniciAdi,
                topic: 'Destek ticketi - ' + kullaniciAdi,
                permission_overwrites: [
                    { id: guildId, type: 0, allow: '0', deny: HERKESE_GIZLI },
                    { id: userId, type: 1, allow: UYE_IZINLERI, deny: '0' },
                ].concat(
                    botId ? [{ id: botId, type: 1, allow: UYE_IZINLERI, deny: '0' }] : []
                ),
            };
            if (kategoriId) govde.parent_id = kategoriId;
            kanal = await this.client.rest('POST', '/guilds/' + guildId + '/channels', govde);
        } catch (hata) {
            await this.client.send(panel.kanalId, {
                content: '<@' + userId + '> ticket kanali olusturulamadi: ' + (hata.message || hata),
            });
            return;
        }

        const kanalAd = kanal.name || ('ticket-' + kullaniciAdi);
        ticketMagaza.ticketAc(anahtar, kanal.id, kanalAd);

        await this.client.send(kanal.id, {
            content: '<@' + userId + '> ticket kanaliniz hazir. Sorununuzu burada anlatin, ekibimiz yardimci olacak.',
        });

        await this.kapanisButonu(kanal.id, guildId, userId, kullaniciAdi, kanalAd);

        logGonder(this.client, 'Ticket acildi', [
            { name: 'Kullanici', value: kullaniciAdi + ' (' + userId + ')', inline: true },
            { name: 'Kanal', value: '#' + kanalAd, inline: true },
        ], 5763719);
    }

    beklemeSuresiMs() {
        const ham = process.env.TICKET_KAPANIS_SURE;
        const saniye = ham === undefined || ham === '' ? NaN : Number(ham);
        return (Number.isFinite(saniye) && saniye >= 0 ? saniye : 5) * 1000;
    }

    async uyariGonder(userId, panelKanalId, acikTicket) {
        const mesaj = '<@' + userId + '> zaten acik bir ticketiniz var: <#' + acikTicket.kanalId + '>';
        let gonderilen;
        try {
            gonderilen = await this.client.send(panelKanalId, { content: mesaj });
        } catch (hata) {
            console.error('[TICKET] uyari mesaji gonderilemedi:', hata.message || hata);
            return;
        }
        const beklemeMs = this.beklemeSuresiMs();
        if (beklemeMs <= 0) return;
        setTimeout(() => {
            this.client.rest(
                'DELETE',
                '/channels/' + gonderilen.channelId + '/messages/' + gonderilen.id
            ).catch(function () {});
        }, beklemeMs);
    }

    async tepkiKaldir(channelId, messageId, userId, emoji) {
        try {
            await this.client.rest(
                'DELETE',
                '/channels/' + channelId + '/messages/' + messageId + '/reactions/' + encodeURIComponent(emoji) + '/' + userId
            );
        } catch (hata) {
            console.error('[TICKET] tepki kaldirilamadi:', hata.message || hata);
        }
    }

    async kapanisButonu(kanalId, guildId, sahipId, sahipAd, kanalAd) {
        let mesaj;
        try {
            mesaj = await this.client.send(kanalId, {
                embeds: [{
                    title: 'Ticketi Kapat',
                    description:
                        'Bu ticketi kapatmak icin asagidaki ' + KAPANIS_TEPKI + ' tepkisine basin.\n' +
                        'Kapatildiginda kanal kalici olarak silinir.',
                    color: 15158332,
                    fields: [
                        { name: 'Dikkat', value: 'Isiniz bittiginde kapatmayi unutmayin.', inline: false },
                    ],
                    footer: { text: 'Ticket Sistemi' },
                    timestamp: new Date().toISOString(),
                }],
            });
            await this.client.rest(
                'PUT',
                '/channels/' + mesaj.channelId + '/messages/' + mesaj.id + '/reactions/' + encodeURIComponent(KAPANIS_TEPKI) + '/@me'
            );
        } catch (hata) {
            console.error('[TICKET] kapatma butonu eklenemedi:', hata.message || hata);
            return;
        }
        ticketMagaza.kapanisEkle(mesaj.id, mesaj.channelId, guildId, sahipId, sahipAd, kanalAd);
    }

    async kapatTiklandi(data) {
        const kapanis = ticketMagaza.kapanisBul(data.message_id);
        if (!kapanis || kapanis.kanalId !== data.channel_id) return;
        if (this.kapanisBekleyen.has(kapanis.kanalId)) return;
        this.kapanisBekleyen.add(kapanis.kanalId);

        const beklemeMs = this.beklemeSuresiMs();

        try {
            if (beklemeMs > 0) {
                await this.client.send(kapanis.kanalId, {
                    content: '<@' + kapanis.sahipId + '> ticketiniz ' + (beklemeMs / 1000) + ' saniye sonra kapatilacak...',
                });
                await new Promise(function (resolve) { setTimeout(resolve, beklemeMs); });
            }

            try {
                await this.client.rest('DELETE', '/channels/' + kapanis.kanalId);
            } catch (hata) {
                if (!hata || hata.status !== 404) {
                    console.error('[TICKET] kanal silinemedi:', hata.message || hata);
                    await this.tepkiKaldir(data.channel_id, data.message_id, data.user_id, KAPANIS_TEPKI);
                    return;
                }
            }
        } finally {
            this.kapanisBekleyen.delete(kapanis.kanalId);
        }

        ticketMagaza.kapanisSil(data.message_id);
        const anahtar = kapanis.guildId + '|' + kapanis.sahipId;
        const acikTicket = ticketMagaza.ticketBul(anahtar);
        if (acikTicket && acikTicket.kanalId === kapanis.kanalId) {
            ticketMagaza.ticketKapat(anahtar);
        }

        logGonder(this.client, 'Ticket kapatildi', [
            { name: 'Kullanici', value: kapanis.sahipAd + ' (' + kapanis.sahipId + ')', inline: true },
            { name: 'Kanal', value: '#' + (kapanis.kanalAd || kapanis.kanalId), inline: true },
        ], 15158332);
    }

    async kanalHalaVarMi(guildId, kanalId) {
        try {
            const kanallar = await this.client.rest('GET', '/guilds/' + guildId + '/channels');
            return kanallar.some(function (kanal) { return kanal.id === kanalId; });
        } catch (hata) {
            return false;
        }
    }

    async kullaniciAdiBul(data, userId) {
        if (data.member && data.member.user && data.member.user.username) {
            return data.member.user.username;
        }
        try {
            const kullanici = await this.client.rest('GET', '/users/' + userId);
            if (kullanici && kullanici.username) return kullanici.username;
        } catch (hata) {}
        return 'kullanici-' + String(userId).slice(-4);
    }
}
