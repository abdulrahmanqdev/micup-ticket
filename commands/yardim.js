export default {
  name: 'yardim',
  aliases: ['help'],
  description: 'Komut listesini gosterir.',

  async execute({ message, prefix }) {
    await message.reply(
      `Komutlar:\n${prefix}ping - Botun calisip calismadigini kontrol eder.\n${prefix}yardim - Bu listeyi gosterir.\n${prefix}ticket panel - Destek ticket paneli olusturur.`,
    );
  },
};
