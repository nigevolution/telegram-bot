const express = require("express");
const app = express();
app.use(express.json());

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error("Missing TELEGRAM_BOT_TOKEN env var");
  process.exit(1);
}
const API = `https://api.telegram.org/bot${TOKEN}`;

async function tg(method, body) {
  const res = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(JSON.stringify(data));
  return data;
}

app.get("/", (_, res) => res.status(200).send("ok"));

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
        await tg("sendMessage", { chat_id: chatId, text: "pong 🟢" });
      } else if (text === "/menu") {
        await tg("sendMessage", {
          chat_id: chatId,
          text: "Escolha:",
          reply_markup: {
            keyboard: [[{ text: "📦 Produtos" }, { text: "💬 Suporte" }]],
            resize_keyboard: true
          }
        });
      } else {
        await tg("sendMessage", { chat_id: chatId, text: `Recebi: ${text}` });
      }
    }
    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    res.sendStatus(200);
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log("Listening on", port));
