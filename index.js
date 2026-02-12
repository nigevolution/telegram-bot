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

// ========================
// TEXTO DO TUTORIAL
// ========================
const TUTORIAL_TEXT = `
🎓 *CENTRAL DE TUTORIAIS TB-BASS IR (PC)*

📌 Instalação do M-Effects + Importar IR (PC) TANK-B  
https://youtu.be/bKM6qGswkdw

📌 Instalação do Cube Suite (PC) – CUBEBABY  
https://youtu.be/o-BfRDqeFhs

📌 Como importar IR pela DAW REAPER  
https://youtube.com/shorts/M37weIAi-CI?si=pOU3GhKlWnv8_fp1

📌 Tutorial de instalação do app celular TANK-B  
https://youtu.be/RkVB4FQm0Nw

Digite /tutorial sempre que precisar rever.
`;

// ========================
// FUNÇÃO TELEGRAM
// ========================
async function tg(method, body) {
  const res = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!data.ok) {
    console.error("Telegram error:", data);
  }
  return data;
}

// ========================
// ROOT
// ========================
app.get("/", (_, res) => res.status(200).send("ok"));

// ========================
// WEBHOOK
// ========================
app.post("/webhook", async (req, res) => {
  try {
    const message = req.body?.message;
    if (!message || !message.text) {
      return res.sendStatus(200);
    }

    const chatId = message.chat.id;
    const text = message.text.trim().toLowerCase();

    // ===== /start =====
    if (text === "/start") {
      await tg("sendMessage", {
        chat_id: chatId,
        text: "✅ Bot online!\nComandos disponíveis:\n/start\n/ping\n/menu\n/tutorial"
      });
    }

    // ===== /ping =====
    else if (text === "/ping") {
      await tg("sendMessage", {
        chat_id: chatId,
        text: "pong 🟢"
      });
    }

    // ===== /menu =====
    else if (text === "/menu") {
      await tg("sendMessage", {
        chat_id: chatId,
        text: "Escolha uma opção:",
        reply_markup: {
          keyboard: [
            [{ text: "/tutorial" }],
            [{ text: "/ping" }]
          ],
          resize_keyboard: true
        }
      });
    }

    // ===== /tutorial =====
    else if (text === "/tutorial" || text === "tutorial") {
      await tg("sendMessage", {
        chat_id: chatId,
        text: TUTORIAL_TEXT,
        parse_mode: "Markdown"
      });
    }

    // NÃO responde mais "Recebi: ..."
    // Se não for comando, ele ignora

    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.sendStatus(200);
  }
});

// ========================
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log("Server running on port", port);
});
