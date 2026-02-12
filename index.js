const express = require("express");
const app = express();

app.use(express.json({ limit: "2mb" }));

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error("Missing TELEGRAM_BOT_TOKEN env var");
  process.exit(1);
}

const API = `https://api.telegram.org/bot${TOKEN}`;
const APP_VERSION = process.env.APP_VERSION || "dev";
const BOT_USERNAME = process.env.BOT_USERNAME || ""; // opcional
const SUPERGROUP_ID = String(process.env.SUPERGROUP_ID || "-1003363944827"); // seu supergrupo
const SITE_URL = process.env.SITE_URL || "https://tbbassir.com.br";

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

function isSupergroupChat(chat) {
  if (!chat) return false;
  return String(chat.id) === SUPERGROUP_ID && (chat.type === "supergroup" || chat.type === "group");
}

function isPrivateChat(chat) {
  return chat?.type === "private";
}

const TUTORIAL_TEXT =
`📌 CENTRAL DE TUTORIAIS TB-BASS IR (PC)

Instalação do M-Effects + Importar IR (PC) TANK-B entre outras pedaleiras
https://youtu.be/bKM6qGswkdw

Instalação do Cube Suite (PC) apenas para as pedaleiras CUBEBABY tanto como pedaleira de baixo e guitarra
https://youtu.be/o-BfRDqeFhs

Como importar IR pela DAW REAPER
https://youtube.com/shorts/M37welAi-CI?si=pOU3GhKlWnv8_fp1

Tutorial de instalação do app pra celular TANK-B entre outras pedaleiras
https://youtu.be/RkVB4FQmONw

Digite /tutorial sempre que precisar rever.`;

function normalizeText(t) {
  return (t || "").trim();
}

// Rotas HTTP (pra você checar deploy)
app.get("/", (_, res) => res.status(200).send("ok"));
app.get("/health", (_, res) => res.status(200).json({ ok: true }));
app.get("/version", (_, res) => res.status(200).json({ version: APP_VERSION }));

app.post("/webhook", async (req, res) => {
  try {
    const update = req.body || {};
    const msg = update.message;

    if (!msg || !msg.chat) {
      return res.sendStatus(200);
    }

    const chatId = msg.chat.id;
    const chat = msg.chat;
    const text = normalizeText(msg.text);
    const textLower = text.toLowerCase();

    // ====== COMANDOS NO PRIVADO ======
    if (isPrivateChat(chat)) {
      // Comandos do privado
      if (text === "/start" || textLower === "start") {
        await tg("sendMessage", {
          chat_id: chatId,
          text:
            "✅ Bot online!\n\n" +
            "Comandos no privado:\n" +
            "• /menu\n" +
            "• /ping\n\n" +
            "📌 Para ver os tutoriais, use /tutorial no supergrupo.",
        });
        return res.sendStatus(200);
      }

      if (text === "/ping" || textLower === "ping") {
        await tg("sendMessage", { chat_id: chatId, text: "pong 🟢" });
        return res.sendStatus(200);
      }

      if (text === "/menu" || textLower === "menu") {
        // Teclado do privado: trocar "Produtos" por "Site"
        await tg("sendMessage", {
          chat_id: chatId,
          text: "Escolha uma opção:",
          reply_markup: {
            keyboard: [
              [{ text: "🌐 Site" }, { text: "💬 Suporte" }],
            ],
            resize_keyboard: true,
          },
        });
        return res.sendStatus(200);
      }

      // Botão SITE (teclado normal não abre URL sozinho; então enviamos o link)
      if (textLower === "🌐 site" || textLower === "site") {
        await tg("sendMessage", {
          chat_id: chatId,
          text: `🌐 Site oficial TB-BASS IR:\n${SITE_URL}`,
          disable_web_page_preview: false,
        });
        return res.sendStatus(200);
      }

      if (textLower === "💬 suporte" || textLower === "suporte") {
        await tg("sendMessage", {
          chat_id: chatId,
          text:
            "💬 Suporte:\n" +
            "Me descreva sua dúvida (pedaleira / IR / instalação / importação) que eu te respondo aqui no privado.",
        });
        return res.sendStatus(200);
      }

      // /tutorial no privado -> bloquear e mandar instrução
      if (text === "/tutorial" || textLower === "tutorial") {
        await tg("sendMessage", {
          chat_id: chatId,
          text:
            "📌 O comando /tutorial funciona apenas no supergrupo.\n\n" +
            `Abra o grupo e digite: /tutorial`,
        });
        return res.sendStatus(200);
      }

      // fallback privado
      await tg("sendMessage", { chat_id: chatId, text: `Recebi: ${text}` });
      return res.sendStatus(200);
    }

    // ====== COMANDOS EM GRUPO/SUPERGRUPO ======
    const inSupergroup = isSupergroupChat(chat);

    // No supergrupo: /tutorial envia os links no PRÓPRIO GRUPO
    if (inSupergroup && (text === "/tutorial" || textLower === "tutorial")) {
      await tg("sendMessage", {
        chat_id: chatId, // envia no grupo mesmo
        text: TUTORIAL_TEXT,
        disable_web_page_preview: false,
      });
      return res.sendStatus(200);
    }

    // Se alguém tentar /start em grupo: não precisa responder (evita spam), mas se quiser:
    if (inSupergroup && text === "/start") {
      await tg("sendMessage", {
        chat_id: chatId,
        text: "✅ Bot online no grupo.\nUse /tutorial para ver a lista de tutoriais.",
      });
      return res.sendStatus(200);
    }

    // Fora do supergrupo: ignora /tutorial pra não espalhar
    if (!inSupergroup && (text === "/tutorial" || textLower === "tutorial")) {
      // opcional: não responde nada
      return res.sendStatus(200);
    }

    // Não responder mensagens de outros grupos/canais (pra ficar bem controlado)
    return res.sendStatus(200);
  } catch (e) {
    console.error("Webhook error:", e);
    return res.sendStatus(200);
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log("Listening on", port));
