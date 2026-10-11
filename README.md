# Micup.js Bot Altyapısı

Micup.js tabanlı Discord botu için temel altyapı: komut yükleme, mesaj yönetimi ve olay dinleme.

## 📁 Proje Yapısı

```
micup-bot/
├── bot.js           # Ana bot dosyası (komut yükler, mesajları yönlendirir)
├── package.json
├── .env.example     # Ortam değişkenleri örneği
├── services/
│   ├── ticketStore.js  # Ticket panel/açık/kapanış kayıtları (ticket-veri.json)
│   ├── ticketPanel.js  # Panel embed'i gönderme (ortak)
│   └── ticketLog.js    # Açılış/kapanış log gönderme
├── events/
│   └── ticket.js       # Ready'de otomatik panel + tepki -> aç/kapat olayı
└── commands/
    ├── ping.js      # Botun gecikmesini ölçer
    ├── ticket.js    # Ticket paneli oluşturur
    └── yardim.js    # Komut listesini gösterir
```

## 🔧 Kurulum

```bash
npm install
copy .env.example .env
npm start
```

`.env` dosyasında `MICUP_BOT_TOKEN` zorunludur, `PREFIX` isteğe bağlıdır (varsayılan `!`).

## 📜 Komutlar

- `!ping` — Botun gecikmesini (gateway + API) ölçer
- `!yardim` — Komut listesini gösterir
- `!ticket panel` — Tepkili destek ticket paneli oluşturur

## 🎫 Ticket Sistemi

1. **Otomatik panel:** Bot ready olduğunda `TICKET_PANEL_KANAL` kanalına embed + 🎫 tepkisi gönderir — sadece 1 kez (bayrak `ticket-veri.json`'da saklanır, restart'ta tekrar atmaz). `!ticket panel` ile elle de eklenebilir.
2. Kullanıcı 🎫'ya bastığında ona özel `ticket-{kullanıcı}` kanalı açılır (kanal `TICKET_KATEGORI` kategorisinin içinde açılır); kanal gizlidir (@everyone gizli, kullanıcı + bot görünür).
3. Kanalda bir **kapatma embed'i** + 🔒 tepkisi olur; tepkiye basınca "5 saniye sonra kapatılıyor" mesajı çıkar, süre sonunda kanal silinir (`TICKET_KAPANIS_SURE` ile süreyi değiştirebilirsin).
4. Aynı kullanıcının aynı anda tek açık ticketı olabilir; açık ticketı varsa kanala "zaten açık ticketınız var" uyarısı + kanal etiketi gelir, süre sonunda bu mesaj kendiliğinden silinir (`TICKET_KAPANIS_SURE`).
5. **Log:** Açılış/kapanış olayları embed olarak `TICKET_LOG_KANAL` kanalına ve konsola yazılır.

`.env` ayarları:

| Değişken | Açıklama |
|---|---|
| `TICKET_PANEL_KANAL` | Ready'de otomatik panelin gideceği kanal (boşsa otomatik panel yok) |
| `TICKET_LOG_KANAL` | Açılış/kapanış log kanalı (boşsa sadece konsol) |
| `TICKET_KATEGORI` | Ticket kanallarının açılacağı kategori (boşsa kategorisiz) |
| `TICKET_KAPANIS_SURE` | Kapatma geri sayımı saniye (boşsa 5) |

Botun sunucuda `MANAGE_CHANNELS` ve `MANAGE_ROLES` yetkileri olmalıdır; kanal oluşturma sırasında overwrite'lar için ayrıca `VIEW_CHANNEL`/`SEND_MESSAGES` izinleri gerekir. Kapatma için de `MANAGE_CHANNELS` gerekir.

## 🛠 Yeni Komut Ekleme

`commands/` klasörüne `.js` dosyası ekleyin; bot başlarken otomatik yüklenir:

```javascript
export default {
    name: 'yeni',
    aliases: ['y'],
    description: 'Yeni komut açıklaması',
    async execute({ client, message, args, prefix }) {
        await message.reply('Merhaba');
    },
};
```
