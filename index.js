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
  }

  return data;
}

app.get("/", (_, res) => {
  res.status(200).send("Bot online");
});

app.post("/webhook", async (req, res) => {
  try {
    const message = req.body.message;
    if (!message || !message.text) {
      return res.sendStatus(200);
    }

    const chatId = message.chat.id;
    const text = message.text.trim().toLowerCase();

    // =========================
    // COMANDO TUTORIAL
    // =========================
    if (text === "/tutorial" || text === "tutorial") {

      const tutorialMessage = `
🎓 CENTRAL DE TUTORIAIS TB-BASS IR (PC)

📌 Instalação do M-Effects + Importar IR (PC) TANK-B:
https://youtu.be/bKM6qGswkdw

📌 Instalação do Cube Suite (PC) CUBEBABY:
https://youtu.be/o-BfRDqeFhs

📌 Como importar IR pela DAW REAPER:
https://youtube.com/shorts/M37welAi-CI?si=pOU3GhKIWnv8_fp1

📌 Tutorial instalação app celular TANK-B:
https://youtu.be/RkVB4FQm0Nw

Digite TUTORIAL sempre que precisar rever.
`;

      await tg("sendMessage", {
        chat_id: chatId,
        text: tutorialMessage,
      });

      return res.sendStatus(200);
    }

    // =========================
    // COMANDO START
    // =========================
    if (text === "/start") {
      await tg("sendMessage", {
        chat_id: chatId,
        text: "✅ Bot online!\n\nUse /tutorial para acessar os tutoriais.",
      });

      return res.sendStatus(200);
    }

    return res.sendStatus(200);

  } catch (error) {
    console.error("Webhook error:", error);
    return res.sendStatus(200);
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log("Servidor rodando na porta", port);
});
