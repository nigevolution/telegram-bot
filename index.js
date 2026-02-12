const { Telegraf, Markup } = require("telegraf");
const express = require("express");

// ====== ENV ======
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; // Secret no Cloud Run
const PORT = process.env.PORT || 8080;

// Coloque o @ do seu suporte (SEM o @)
const SUPPORT_USERNAME = process.env.SUPPORT_USERNAME || "Suporte_ir_bot";

// Seu site
const SITE_URL = process.env.SITE_URL || "https://tbbassir.com.br";

// ID do supergrupo (o seu já está certo)
const SUPERGRUPO_ID = Number(process.env.SUPERGRUPO_ID || "-1003363944827");

// (Opcional, mas recomendado) URL do Cloud Run SEM a barra no final
// Ex: https://telegram-bot-179614473145.us-central1.run.app
const WEBHOOK_URL = process.env.WEBHOOK_URL || "";

// ====== VALIDATION ======
if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN não definido.");

const bot = new Telegraf(BOT_TOKEN);
const app = express();

// IMPORTANTE: precisa disso antes do webhook
app.use(express.json());

// Webhook endpoint (TEM que bater com o setWebhook)
app.use(bot.webhookCallback("/bot"));

// Health checks (Cloud Run gosta disso)
app.get("/", (req, res) => res.status(200).send("Bot online."));
app.get("/health", (req, res) => res.status(200).send("ok"));

// ====== KEYBOARD ======
function getInlineKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.url("🌐 Site Oficial", SITE_URL)],
    [Markup.button.url("🛠 Suporte", `https://t.me/${SUPPORT_USERNAME}`)],
  ]);
}

// ====== HANDLERS ======

// /menu -> funciona no grupo e no privado
bot.command("menu", async (ctx) => {
  const keyboard = getInlineKeyboard();

  // Supergrupo
  if (ctx.chat.id === SUPERGRUPO_ID) {
    return ctx.reply(
      "📘 Tutorial Oficial TB Bass IR:\n\n" +
        "1️⃣ Baixe o arquivo\n" +
        "2️⃣ Importe na pedaleira\n" +
        "3️⃣ Ajuste o ganho\n\n" +
        "Use os botões abaixo:",
      keyboard
    );
  }

  // Privado
  if (ctx.chat.type === "private") {
    return ctx.reply(
      "👋 Bem-vindo ao suporte TB Bass IR.\n\n" + "Use os botões abaixo:",
      keyboard
    );
  }

  // Outros grupos (se quiser ignorar, pode só dar return)
  return ctx.reply("Use /menu no privado para suporte.", keyboard);
});

// /start
bot.start(async (ctx) => {
  // Em grupo: o /start pode não ser “o fluxo ideal”, então já chamamos o /menu
  return ctx.telegram.sendMessage(ctx.chat.id, "✅ Menu carregado. Use /menu.", getInlineKeyboard());
});

// Texto: só responde no privado
bot.on("text", async (ctx) => {
  if (ctx.chat.type !== "private") return;

  const texto = (ctx.message.text || "").toLowerCase();

  if (texto.includes("preço") || texto.includes("valor")) {
    return ctx.reply(`💰 Valores e combos no site:\n${SITE_URL}`);
  }

  if (texto.includes("ir")) {
    return ctx.reply("🎸 Nossos IRs são capturados com fidelidade profissional.");
  }

  return ctx.reply("Me diga sua dúvida 🙂 (ou use /menu)");
});

// ====== START SERVER ======
app.listen(PORT, async () => {
  console.log(`Servidor rodando na porta ${PORT}`);

  // Se você setar WEBHOOK_URL no Cloud Run, ele configura sozinho o webhook.
  if (WEBHOOK_URL) {
    const full = `${WEBHOOK_URL}/bot`;
    try {
      await bot.telegram.setWebhook(full);
      console.log("Webhook setado em:", full);
    } catch (e) {
      console.error("Falha ao setar webhook:", e);
    }
  }
});
