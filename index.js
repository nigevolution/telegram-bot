const { Telegraf, Markup } = require("telegraf");
const express = require("express");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const PORT = process.env.PORT || 8080;

const SUPERGRUPO_ID = Number(process.env.SUPERGRUPO_ID || "-1003363944827");
const SITE_URL = process.env.SITE_URL || "https://tbbassir.com.br";
const SUPPORT_USERNAME = process.env.SUPPORT_USERNAME || "Suporte_ir_bot";
const WEBHOOK_URL = process.env.WEBHOOK_URL || ""; // ex: https://telegram-bot-xxx.run.app

if (!BOT_TOKEN) {
  console.error("FALTANDO TELEGRAM_BOT_TOKEN");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const app = express();

app.use(express.json());

// health
app.get("/", (_, res) => res.status(200).send("ok"));
app.get("/health", (_, res) => res.status(200).send("ok"));

// webhook endpoint
app.post("/bot", (req, res) => {
  bot.handleUpdate(req.body);
  res.sendStatus(200);
});

function keyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.url("🌐 Site Oficial", SITE_URL)],
    [Markup.button.url("🛠 Suporte", `https://t.me/${SUPPORT_USERNAME}`)],
  ]);
}

// comando /menu (no grupo e no privado)
bot.command("menu", async (ctx) => {
  if (ctx.chat.id === SUPERGRUPO_ID) {
    return ctx.reply(
      "📘 Tutorial Oficial TB Bass IR:\n\n1️⃣ Baixe o arquivo\n2️⃣ Importe na pedaleira\n3️⃣ Ajuste o ganho\n\nUse os botões abaixo:",
      keyboard()
    );
  }
  return ctx.reply("👋 Menu TB Bass IR:", keyboard());
});

bot.start(async (ctx) => {
  return ctx.reply("✅ Use /menu para ver os botões.", keyboard());
});

// texto só no privado
bot.on("text", async (ctx) => {
  if (ctx.chat.type !== "private") return;

  const t = (ctx.message.text || "").toLowerCase();
  if (t.includes("preço") || t.includes("valor")) return ctx.reply(`💰 Valores no site:\n${SITE_URL}`);
  if (t.includes("ir")) return ctx.reply("🎸 Nossos IRs são capturados com fidelidade profissional.");
  return ctx.reply("Me diga sua dúvida 🙂 (ou /menu)");
});

app.listen(PORT, async () => {
  console.log("Listening on", PORT);

  // opcional: setar webhook automaticamente se WEBHOOK_URL existir
  if (WEBHOOK_URL) {
    const url = `${WEBHOOK_URL}/bot`;
    try {
      await bot.telegram.setWebhook(url);
      console.log("Webhook set:", url);
    } catch (e) {
      console.error("Webhook set error:", e);
    }
  }
});
