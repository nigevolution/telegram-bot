const { Telegraf, Markup } = require('telegraf');
const express = require('express');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPERGRUPO_ID = Number(process.env.SUPERGRUPO_ID || -1003363944827); // pode trocar por env
const SITE_URL = process.env.SITE_URL || 'https://tbbassir.com.br';
const SUPORTE_URL = process.env.SUPORTE_URL || 'https://t.me/suporte_ir_bot'; // ajuste

// Cloud Run precisa subir o servidor SEM morrer
const app = express();
app.use(express.json());

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN não definido.');
  // NÃO derruba o processo (pra Cloud Run não falhar loopando)
} else {
  const bot = new Telegraf(BOT_TOKEN);

  // webhook route (Telegram vai postar updates aqui)
  app.post('/bot', (req, res) => {
    bot.handleUpdate(req.body);
    res.sendStatus(200);
  });

  // Healthcheck
  app.get('/', (req, res) => res.status(200).send('Bot online.'));

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.url('🌐 Site Oficial', SITE_URL)],
    [Markup.button.url('🛠 Suporte', SUPORTE_URL)],
  ]);

  // Comando seguro pro grupo: /menu
  bot.command('menu', async (ctx) => {
    if (ctx.chat.id === SUPERGRUPO_ID) {
      return ctx.reply(
        '📘 Tutorial Oficial TB Bass IR:\n\n' +
          '1️⃣ Baixe o arquivo\n' +
          '2️⃣ Importe na pedaleira\n' +
          '3️⃣ Ajuste o ganho\n\n' +
          'Use os botões abaixo:',
        keyboard
      );
    }

    return ctx.reply('👋 Escolha uma opção abaixo:', keyboard);
  });

  // Start no privado
  bot.start(async (ctx) => {
    if (ctx.chat.type === 'private') {
      return ctx.reply('👋 Bem-vindo ao suporte TB Bass IR.\n\nEscolha uma opção:', keyboard);
    }
    // Em grupo: manda instrução pra usar /menu
    return ctx.reply('No grupo, use o comando /menu para ver os botões.');
  });

  // Respostas automáticas só no privado
  bot.on('text', async (ctx) => {
    if (ctx.chat.type !== 'private') return;

    const texto = (ctx.message.text || '').toLowerCase();

    if (texto.includes('preço') || texto.includes('preco')) {
      return ctx.reply(`💰 Valores e produtos:\n${SITE_URL}`);
    }
    if (texto.includes('ir')) {
      return ctx.reply('🎸 Nossos IRs são capturados com fidelidade profissional.');
    }
  });

  console.log('✅ Bot configurado (webhook via /bot).');
}

// Cloud Run server (SEMPRE sobe)
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
