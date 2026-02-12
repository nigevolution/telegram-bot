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
const ADMIN_ID = 123456789; // 🔴 COLOQUE SEU ID AQUI

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
    if (!msg?.text) return res.sendStatus(200);

    const chatId = msg.chat.id;
    const chatType = msg.chat.type;
    const text = msg.text.trim();
    const userId = msg.from.id;

    // =============================
    // 🔹 SE FOR GRUPO
    // =============================
    if (chatType === "group" || chatType === "supergroup") {

      // Só você pode postar tutorial
      if (userId === ADMIN_ID && text.startsWith("/post ")) {
        const tutorial = text.replace("/post ", "");

        await tg("sendMessage", {
          chat_id: chatId,
          text: `📚 Novo Tutorial:\n\n${tutorial}`
        });
      }

      return res.sendStatus(200);
    }

    // =============================
    // 🔹 SE FOR PRIVADO
    // =============================
    if (chatType === "private") {

      if (text === "/start") {
        await tg("sendMessage", {
          chat_id: chatId,
          text: "✅ Bem-vindo ao SUPORTE IR\n\nComandos:\n/start\n/menu"
        });
      }

      else if (text === "/menu") {
        await tg("sendMessage", {
          chat_id: chatId,
          text: "Escolha uma opção:",
          reply_markup: {
            keyboard: [
              [{ text: "📦 Produtos" }],
              [{ text: "💬 Suporte" }]
            ],
            resize_keyboard: true
          }
        });
      }

      else if (text === "📦 Produtos") {
        await tg("sendMessage", {
          chat_id: chatId,
          text: "🎸 Aqui estão nossos produtos:\n\nTB Bass IR Premium\nTB Bass IR Studio Pack"
        });
      }

      else if (text === "💬 Suporte") {
        await tg("sendMessage", {
          chat_id: chatId,
          text: "Nossa equipe responderá em breve."
        });
      }
    }

    res.sendStatus(200);

  } catch (err) {
    console.error(err);
    res.sendStatus(200);
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log("Listening on", port));
