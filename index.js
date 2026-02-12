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
    if (!msg || !msg.text) return res.sendStatus(200);

    const chatId = msg.chat.id;
    const text = msg.text.trim().toLowerCase();

    if (text === "/tutorial" || text === "tutorial") {

      // TEXTO PRINCIPAL
      await tg("sendMessage", {
        chat_id: chatId,
        text:
`🎓 CENTRAL DE TUTORIAIS TB-BASS IR (PC)

Instalação do M-Effects + Importar IR (PC) TANK-B entre outras pedaleiras

Instalação do Cube Suite (PC) apenas para as pedaleiras CUBEBABY tanto como pedaleira de baixo e guitarra

Como importar IR pela DAW REAPER

Tutorial de instalação do app pra celular TANK-B entre outras pedaleiras

Digite TUTORIAL sempre que precisar rever.`
      });

      // ENVIA CADA LINK SEPARADO PARA GERAR PREVIEW

      await tg("sendMessage", {
        chat_id: chatId,
        text: "https://youtu.be/bKM6qGswkdw"
      });

      await tg("sendMessage", {
        chat_id: chatId,
        text: "https://youtu.be/o-BfRDqeFhs"
      });

      await tg("sendMessage", {
        chat_id: chatId,
        text: "https://youtube.com/shorts/M37weIAi-CI?si=pOU3GhKIWnv8_fp1"
      });

      await tg("sendMessage", {
        chat_id: chatId,
        text: "https://youtu.be/RkVB4FQm0Nw"
      });

      return res.sendStatus(200);
    }

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
