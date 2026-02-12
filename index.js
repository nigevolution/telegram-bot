const express = require("express");

const app = express();
app.use(express.json());

// =============================
// ENV
// =============================
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TOKEN) {
  console.error("❌ Missing TELEGRAM_BOT_TOKEN env var");
  process.exit(1);
}

const API = `https://api.telegram.org/bot${TOKEN}`;

// =============================
// Telegram helper
// =============================
async function tg(method, body) {
  try {
    const response = await fetch(`${API}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!data.ok) {
      console.error("Telegram API error:", data);
      throw new Error(data.description);
    }

    return data;
  } catch (err) {
    console.error("tg() failed:", err.message);
    throw err;
  }
}

// =============================
// Health check
// =============================
app.get("/", (_, res) => {
  res.status(200).send("ok");
});

// =============================
// Webhook endpoint
// =============================
app.post("/webhook", async (req, res) => {
  try {
    const msg = req.body?.message;

    if (!msg) {
      return res.sendStatus(200);
    }

    const chatId = msg.chat?.id;
    const text = msg.text?.trim();

    if (!chatId || !text) {
      return res.sendStatus(200);
    }

    // =============================
    // Commands
    // =============================
    if (text === "/start") {
      await tg("sendMessage", {
        chat_id: chatId,
        text: "✅ Bot online!\nComandos disponíveis:\n/start\n/ping\n/menu",
      });

    } else if (text === "/ping") {
      await tg("sendMessage", {
        chat_id: chatId,
        text: "pong 🟢",
      });

    } else if (text === "/menu") {
      await tg("sendMessage", {
        chat_id: chatId,
        text: "Escolha uma opção:",
        reply_markup: {
          keyboard: [
            [{ text: "📦 Produtos" }, { text: "💬 Suporte" }]
          ],
          resize_keyboard: true,
        },
      });

    } else if (text === "📦 Produtos") {
      await tg("sendMessage", {
        chat_id: chatId,
        text: "Aqui estão nossos produtos disponíveis 🚀",
      });

    } else if (text === "💬 Suporte") {
      await tg("sendMessage", {
        chat_id: chatId,
        text: "Nos chame no suporte oficial.",
      });

    } else {
      await tg("sendMessage", {
        chat_id: chatId,
        text: `Recebi: ${text}`,
      });
    }

    res.sendStatus(200);

  } catch (err) {
    console.error("Webhook error:", err);
    res.sendStatus(200);
  }
});

// =============================
// Start server
// =============================
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
