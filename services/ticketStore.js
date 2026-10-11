import fs from 'node:fs';
import { join } from 'node:path';

const DOSYA_YOLU = join(process.cwd(), 'ticket-veri.json');

class TicketMagazasi {
    constructor() {
        this.paneller = new Map();
        this.acikTicketlar = new Map();
        this.kapanisPanelleri = new Map();
        this.autoPanel = false;
        this.yukle();
    }

    yukle() {
        try {
            const ham = JSON.parse(fs.readFileSync(DOSYA_YOLU, 'utf8'));
            for (const panel of ham.paneller || []) {
                if (panel.otomatik === undefined && panel.guildId == null) {
                    panel.otomatik = true;
                }
                this.paneller.set(panel.id, panel);
            }
            for (const ticket of ham.acikTicketlar || []) {
                this.acikTicketlar.set(ticket.anahtar, ticket);
            }
            for (const kapanis of ham.kapanisPanelleri || []) {
                this.kapanisPanelleri.set(kapanis.id, kapanis);
            }
            this.autoPanel = ham.autoPanel === true;
        } catch (hata) {
            this.paneller = new Map();
            this.acikTicketlar = new Map();
            this.kapanisPanelleri = new Map();
            this.autoPanel = false;
        }
    }

    kaydet() {
        const veri = {
            paneller: Array.from(this.paneller.values()),
            acikTicketlar: Array.from(this.acikTicketlar.values()),
            kapanisPanelleri: Array.from(this.kapanisPanelleri.values()),
            autoPanel: this.autoPanel,
        };
        fs.writeFileSync(DOSYA_YOLU, JSON.stringify(veri, null, 2));
    }

    panelEkle(id, kanalId, guildId, otomatik) {
        this.paneller.set(id, { id: id, kanalId: kanalId, guildId: guildId, otomatik: !!otomatik });
        this.kaydet();
    }

    panelBul(id) {
        return this.paneller.get(id) || null;
    }

    panelSil(id) {
        this.paneller.delete(id);
        this.kaydet();
    }

    tumPaneller() {
        return Array.from(this.paneller.values());
    }

    autoPanelGonderildiMi() {
        return this.autoPanel;
    }

    autoPanelIsaretle() {
        this.autoPanel = true;
        this.kaydet();
    }

    autoPanelSifirla() {
        this.autoPanel = false;
        this.kaydet();
    }

    ticketAc(anahtar, kanalId, kanalAd) {
        this.acikTicketlar.set(anahtar, { anahtar: anahtar, kanalId: kanalId, kanalAd: kanalAd || null });
        this.kaydet();
    }

    ticketBul(anahtar) {
        return this.acikTicketlar.get(anahtar) || null;
    }

    ticketKapat(anahtar) {
        this.acikTicketlar.delete(anahtar);
        this.kaydet();
    }

    kapanisEkle(id, kanalId, guildId, sahipId, sahipAd, kanalAd) {
        this.kapanisPanelleri.set(id, {
            id: id,
            kanalId: kanalId,
            kanalAd: kanalAd,
            guildId: guildId,
            sahipId: sahipId,
            sahipAd: sahipAd,
        });
        this.kaydet();
    }

    kapanisBul(id) {
        return this.kapanisPanelleri.get(id) || null;
    }

    kapanisSil(id) {
        this.kapanisPanelleri.delete(id);
        this.kaydet();
    }
}

export default new TicketMagazasi();
