const { Telegraf, Markup } = require('telegraf');
const express = require('express');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPERGRUPO_ID = -1003363944827;

if (!BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN não definido.');
}

const bot = new Telegraf(BOT_TOKEN);
const app = express();

app.use(express.json());

/*
|--------------------------------------------------------------------------
| START
|--------------------------------------------------------------------------
*/

bot.start(async (ctx) => {

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.url('🌐 Site Oficial', 'https://tbbassir.com.br')
    ],
    [
      Markup.button.url('🛠 Suporte', 'https://t.me/Suporte_ir_bot')
    ]
  ]);

  // SUPERGRUPO
  if (ctx.chat.id == SUPERGRUPO_ID) {
    return ctx.reply(
      '📘 Tutorial Oficial TB Bass IR:\n\n' +
      '1️⃣ Baixe o arquivo\n' +
      '2️⃣ Importe na pedaleira\n' +
      '3️⃣ Ajuste o ganho\n\n' +
      'Use os botões abaixo:',
      keyboard
    );
  }

  // PRIVADO
  if (ctx.chat.type === 'private') {
    return ctx.reply(
      '👋 Bem-vindo ao suporte TB Bass IR.\n\n' +
      'Escolha uma opção abaixo:',
      keyboard
    );
  }

});

/*
|--------------------------------------------------------------------------
| RESPOSTAS PRIVADAS
|--------------------------------------------------------------------------
*/

bot.on('text', async (ctx) => {

  if (ctx.chat.type !== 'private') return;

  const texto = ctx.message.text.toLowerCase();

  if (texto.includes('preço')) {
    return ctx.reply('💰 Valores disponíveis em:\nhttps://tbbassir.com.br');
  }

  if (texto.includes('ir')) {
    return ctx.reply('🎸 Nossos IRs são capturados com fidelidade profissional.');
  }

});

/*
|--------------------------------------------------------------------------
| WEBHOOK ROUTE
|--------------------------------------------------------------------------
*/

app.post('/bot', (req, res) => {
  bot.handleUpdate(req.body);
  res.sendStatus(200);
});

/*
|--------------------------------------------------------------------------
| CLOUD RUN SERVER
|--------------------------------------------------------------------------
*/

const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.send('Bot online.');
});

app.listen(PORT, async () => {
  console.log(`Servidor rodando na porta ${PORT}`);

  const WEBHOOK_URL = process.env.K_SERVICE
    ? `https://${process.env.K_SERVICE}-${process.env.GOOGLE_CLOUD_PROJECT}.uc.r.appspot.com/bot`
    : null;

  console.log('Servidor pronto.');
});
