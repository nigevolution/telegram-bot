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
  res.status(200).send("BOT ONLINE ✅");
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

    // ===============================
    // COMANDO TUTORIAL
    // ===============================
    if (text === "/tutorial" || text === "tutorial") {

      const tutorialMessage = `
🎓 *CENTRAL DE TUTORIAIS TB-BASS IR (PC)*

📌 Instalação do M-Effects + Importar IR (PC)  
https://youtu.be/bKM6qGswkdw

📌 Instalação do Cube Suite (PC)  
https://youtu.be/o-BfRDqeFhs

📌 Como importar IR pela DAW REAPER  
https://youtube.com/shorts/M37weIAi-CI?si=pOU3GhKIWnv8_fp1

📌 Tutorial de instalação do app TANK-B (Celular)  
https://youtu.be/RkVB4FQm0Nw

Digite TUTORIAL sempre que precisar rever.
`;

      await tg("sendMessage", {
        chat_id: chatId,
        text: tutorialMessage,
        parse_mode: "Markdown"
      });

      return res.sendStatus(200);
    }

    // ===============================
    // COMANDO START (SÓ PRIVADO)
    // ===============================
    if (text === "/start" && chatType === "private") {
      await tg("sendMessage", {
        chat_id: chatId,
        text: "✅ Bot online!\nUse /tutorial para ver os tutoriais."
      });

      return res.sendStatus(200);
    }

    // ===============================
    // NÃO RESPONDER OUTROS TEXTOS
    // ===============================
    return res.sendStatus(200);

  } catch (err) {
    console.error(err);
    return res.sendStatus(200);
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log("Listening on port", port);
});
