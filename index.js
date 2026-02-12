const express = require("express");
const app = express();

app.use(express.json());

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error("Missing TELEGRAM_BOT_TOKEN env var");
  process.exit(1);
}

const API = `https://api.telegram.org/bot${TOKEN}`;

// MUITO IMPORTANTE: mude esse número quando fizer deploy
// pra você ter certeza que está rodando o código novo.
const BOT_VERSION = "v3-telegram-tutorial-links";

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

function normalizeText(t) {
  return (t || "").trim();
}

// aceita: "/tutorial", "/tutorial@Suporte_ir_bot", "tutorial", "Tutorial"
function isCmd(text, cmd) {
  const t = normalizeText(text).toLowerCase();

  // caso 1: texto exatamente "tutorial"
  if (t === cmd) return true;

  // caso 2: "/tutorial" ou "/tutorial@bot"
  if (t === `/${cmd}`) return true;
  if (t.startsWith(`/${cmd}@`)) return true;

  return false;
}

const TUTORIAL_TEXT = `🎓 CENTRAL DE TUTORIAIS TB-BASS IR (PC)

📌 Instalação do M-Effects + Importar IR (PC) TANK-B (e outras pedaleiras)
https://youtu.be/bKM6qGswkdw

📌 Instalação do Cube Suite (PC) (CUBEBABY baixo e guitarra)
https://youtu.be/o-BfRDqeFhs

📌 Como importar IR pela DAW REAPER
https://youtube.com/shorts/M37weIAi-CI?si=pOU3GhKIWnv8_fp1

📌 Tutorial de instalação do app pro celular TANK-B (e outras pedaleiras)
https://youtu.be/RkVB4FQm0Nw

Digite /tutorial quando precisar rever ✅`;

app.get("/", (_, res) => res.status(200).send("ok"));
app.get("/version", (_, res) => res.status(200).send(BOT_VERSION));

app.post("/webhook", async (req, res) => {
  try {
    const msg = req.body?.message;
    if (!msg?.text) return res.sendStatus(200);

    const chatId = msg.chat.id;
    const text = normalizeText(msg.text);

    console.log("BOT_VERSION:", BOT_VERSION, "chatId:", chatId, "text:", text);

    // /start (e /start@bot)
    if (isCmd(text, "start")) {
      await tg("sendMessage", {
        chat_id: chatId,
        text: `✅ Bot online!\n\nComandos:\n/start\n/tutorial\n/ping`,
      });
      return res.sendStatus(200);
    }

    // /tutorial (e /tutorial@bot) e também "tutorial"
    if (isCmd(text, "tutorial")) {
      await tg("sendMessage", {
        chat_id: chatId,
        text: TUTORIAL_TEXT,
        disable_web_page_preview: false,
      });
      return res.sendStatus(200);
    }

    // /ping
    if (isCmd(text, "ping")) {
      await tg("sendMessage", { chat_id: chatId, text: "pong 🟢" });
      return res.sendStatus(200);
    }

    // Se quiser: quando alguém digitar "suporte", responde no grupo:
    if (normalizeText(text).toLowerCase() === "suporte") {
      await tg("sendMessage", {
        chat_id: chatId,
        text: "Nos chame no suporte oficial (privado) ✅",
      });
      return res.sendStatus(200);
    }

    // NÃO responde nada pro resto (pra não ficar spamando)
    return res.sendStatus(200);
  } catch (e) {
    console.error("Webhook error:", e);
    return res.sendStatus(200);
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log("Listening on", port, "version:", BOT_VERSION));
