cat > index.js <<'EOF'
const express = require('express');
const { Telegraf, Markup } = require('telegraf');

const PORT = process.env.PORT || 8080;

// ENV (recomendado setar no Cloud Run)
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPERGRUPO_ID = Number(process.env.SUPERGRUPO_ID || -1003363944827);
const SITE_URL = process.env.SITE_URL || 'https://tbbassir.com.br';
const SUPORTE_URL = process.env.SUPORTE_URL || 'https://t.me/suporte_ir_bot';

// Express sempre sobe (Cloud Run exige isso)
const app = express();
app.use(express.json());

// Healthcheck (Cloud Run / Load Balancer)
app.get('/', (req, res) => res.status(200).send('Bot online.'));

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN não definido. Container vai subir, mas bot não vai responder.');
} else {
  const bot = new Telegraf(BOT_TOKEN);

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.url('🌐 Site Oficial', SITE_URL)],
    [Markup.button.url('🛠 Suporte', SUPORTE_URL)]
  ]);

  // Webhook endpoint (Telegram vai postar updates aqui)
  app.post('/bot', (req, res) => {
    bot.handleUpdate(req.body);
    res.sendStatus(200);
  });

  // /start: no privado mostra botões; no grupo manda usar /menu
  bot.start(async (ctx) => {
    if (ctx.chat.type === 'private') {
      return ctx.reply('👋 Bem-vindo ao suporte TB Bass IR.\n\nEscolha uma opção:', keyboard);
    }
    return ctx.reply('No grupo, use o comando /menu para ver os botões.');
  });

  // /menu: comando seguro pro supergrupo (é aqui que aparecem os botões no grupo)
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

  // Respostas automáticas só no privado
  bot.on('text', async (ctx) => {
    if (ctx.chat.type !== 'private') return;

    const texto = String(ctx.message.text || '').toLowerCase();

    if (texto.includes('preço') || texto.includes('preco')) {
      return ctx.reply(`💰 Valores e produtos:\n${SITE_URL}`);
    }
    if (texto.includes('ir')) {
      return ctx.reply('🎸 Nossos IRs são capturados com fidelidade profissional.');
    }
  });

  console.log('✅ Bot configurado. Webhook ativo em /bot');
}

// Start server (SEMPRE)
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
EOF
