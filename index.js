const express = require("express");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TOKEN) {
  console.error("Missing TELEGRAM_BOT_TOKEN env var");
  process.exit(1);
}

const API = `https://api.telegram.org/bot${TOKEN}`;

async function tg(method, body) {
  const response = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!data.ok) {
    console.error("Telegram error:", data);
    throw new Error("Telegram API error");
  }

  return data;
}

app.get("/", (_, res) => {
  res.status(200).send("ok");
});

app.post("/webhook", async (req, res) => {
  try {
    const msg = req.body?.message;

    if (msg?.text) {
      const chatId = msg.chat.id;
      const text = msg.text.trim();

      if (text === "/start") {
        await tg("sendMessage", {
          chat_id: chatId,
          text: "✅ Bot online!\nComandos: /start /ping /menu",
        });

      } else if (text === "/ping") {
        await tg("sendMessage", {
          chat_id: chatId,
          text: "pong 🟢",
        });

      } else if (text === "/menu") {
        await tg("sendMessage", {
          chat_id: chatId,
          text: "Escolha:",
          reply_markup: {
            keyboard: [
              [{ text: "📦 Produtos" }, { text: "💬 Suporte" }]
            ],
            resize_keyboard: true
          }
        });

      } else {
        await tg("sendMessage", {
          chat_id: chatId,
          text: `Recebi: ${text}`,
        });
      }
    }

    res.sendStatus(200);

  } catch (err) {
    console.error("Webhook error:", err);
    res.sendStatus(200); // nunca deixar Telegram receber erro
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log("Server running on port", port);
});
