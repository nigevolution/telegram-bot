const express = require("express");
const app = express();

app.use(express.json());

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error("Missing TELEGRAM_BOT_TOKEN");
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
  }
  return data;
}

app.get("/", (_, res) => res.status(200).send("ok"));

app.post("/webhook", async (req, res) => {
  try {
    const message = req.body?.message;
    if (!message?.text) return res.sendStatus(200);

    const chatId = message.chat.id;
    const chatType = message.chat.type; // private, group, supergroup
    const text = message.text.trim().toLowerCase();

    // =========================
    // 📌 COMANDO TUTORIAL (GRUPO)
    // =========================
    if (
      text === "/tutorial" ||
      text === "tutorial"
    ) {
      const tutorialMessage = `🎓 CENTRAL DE TUTORIAIS TB-BASS IR (PC)

📌 Instalação do M-Effects + Importar IR (PC) TANK-B
https://youtu.be/bKM6qGswkdw

📌 Instalação do Cube Suite (PC)
https://youtu.be/o-BfRDqeFhs

📌 Como importar IR pela DAW REAPER
https://youtube.com/shorts/M37welAi-CI?si=pOU3GhKIWnv8_fp1

📌 Tutorial de instalação do app para celular TANK-B
https://youtu.be/RkVB4FQm0Nw`;

      await tg("sendMessage", {
        chat_id: chatId,
        text: tutorialMessage,
        disable_web_page_preview: false
      });

      return res.sendStatus(200);
    }

    // =========================
    // 📌 COMANDOS NO PRIVADO
    // =========================
    if (chatType === "private") {

      if (text === "/start") {
        await tg("sendMessage", {
          chat_id: chatId,
          text: `✅ Bot online!

Comandos disponíveis:
/start
/ping
/tutorial`
        });
      }

      else if (text === "/ping") {
        await tg("sendMessage", {
          chat_id: chatId,
          text: "pong 🟢"
        });
      }

      else if (text === "/tutorial") {
        const tutorialMessage = `🎓 CENTRAL DE TUTORIAIS TB-BASS IR (PC)

📌 Instalação do M-Effects + Importar IR (PC) TANK-B
https://youtu.be/bKM6qGswkdw

📌 Instalação do Cube Suite (PC)
https://youtu.be/o-BfRDqeFhs

📌 Como importar IR pela DAW REAPER
https://youtube.com/shorts/M37welAi-CI?si=pOU3GhKIWnv8_fp1

📌 Tutorial de instalação do app para celular TANK-B
https://youtu.be/RkVB4FQm0Nw`;

        await tg("sendMessage", {
          chat_id: chatId,
          text: tutorialMessage
        });
      }

      else {
        await tg("sendMessage", {
          chat_id: chatId,
          text: "Comando não reconhecido."
        });
      }
    }

    res.sendStatus(200);

  } catch (err) {
    console.error("Webhook error:", err);
    res.sendStatus(200);
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log("Server running on port", port);
});
