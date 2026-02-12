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
  const res = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!data.ok) {
    console.error("Telegram error:", data);
    throw new Error(JSON.stringify(data));
  }

  return data;
}

app.get("/", (_, res) => {
  res.status(200).send("ok");
});

app.post("/webhook", async (req, res) => {
  try {
    const msg = req.body?.message;
    if (!msg || !msg.text) {
      return res.sendStatus(200);
    }

    const chatId = msg.chat.id;
    const chatType = msg.chat.type; // private, group, supergroup
    const text = msg.text.trim().toLowerCase();

    // =========================
    // 🔹 GRUPO
    // =========================
    if (chatType === "group" || chatType === "supergroup") {

      if (text === "tutorial" || text === "/tutorial") {

        await tg("sendMessage", {
          chat_id: chatId,
          parse_mode: "HTML",
          text: `
🎓 <b>CENTRAL DE TUTORIAIS TB-BASS IR (PC)</b>

🎸 <b>Instalação do M-Effects + Importar IR (PC) TANK-B</b>
https://youtu.be/bKM6qGswkdw

🎛 <b>Instalação do Cube Suite (PC) - CUBEBABY</b>
https://youtu.be/o-BfRDqeFhs

🎧 <b>Como importar IR pela DAW REAPER</b>
https://youtube.com/shorts/M37weIAi-CI

📱 <b>Instalação do app celular TANK-B</b>
https://youtu.be/RkVB4FQm0Nw

💡 Digite <b>TUTORIAL</b> sempre que precisar rever.
          `
        });
      }

      return res.sendStatus(200);
    }

    // =========================
    // 🔹 PRIVADO
    // =========================
    if (chatType === "private") {

      if (text === "/start") {
        await tg("sendMessage", {
          chat_id: chatId,
          text: "✅ Bot online!\nComandos disponíveis:\n/start\n/ping\n/menu"
        });

      } else if (text === "/ping") {
        await tg("sendMessage", {
          chat_id: chatId,
          text: "pong 🟢"
        });

      } else if (text === "/menu") {
        await tg("sendMessage", {
          chat_id: chatId,
          text: "Escolha uma opção:",
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
          text: `Recebi: ${msg.text}`
        });
      }
    }

    res.sendStatus(200);

  } catch (error) {
    console.error("Webhook error:", error);
    res.sendStatus(200);
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log("Server running on port", port);
});
