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
    [Markup.button.url('🌐 Site Oficial', 'https://tbbassir.com.br')],
    [Markup.button.url('🛠 Suporte', 'https://t.me/Suporte_ir_bot')]
  ]);

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

  if (ctx.chat.type === 'private') {
    return ctx.reply(
      '👋 Bem-vindo ao suporte TB Bass IR.\n\nEscolha uma opção:',
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
| WEBHOOK ROUTE (OBRIGATÓRIO PARA CLOUD RUN)
|--------------------------------------------------------------------------
*/

app.post('/bot', (req, res) => {
  bot.handleUpdate(req.body);
  res.sendStatus(200);
});

/*
|--------------------------------------------------------------------------
| HEALTH CHECK ROOT
|--------------------------------------------------------------------------
*/

app.get('/', (req, res) => {
  res.status(200).send('Bot online.');
});

/*
|--------------------------------------------------------------------------
| SERVER
|--------------------------------------------------------------------------
*/

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
