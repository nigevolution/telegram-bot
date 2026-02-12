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
const SUPERGROUP_ID = String(process.env.SUPERGROUP_ID || "-1003363944827");
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

function normalizeText(t) {
  return (t || "").trim();
}

function isSupergroupChat(chat) {
  if (!chat) return false;
  return (
    String(chat.id) === SUPERGROUP_ID &&
    (chat.type === "supergroup" || chat.type === "group")
  );
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

function menuInlineKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "🌐 Site (abrir)", url: SITE_URL }],
      [{ text: "💬 Suporte", callback_data: "SUPORTE" }],
    ],
  };
}

function menuReplyKeyboard() {
  // Teclado “de baixo” (não abre URL direto).
  // Mantemos só pra facilitar: ao clicar em "🌐 Site", o bot manda um botão inline que abre.
  return {
    keyboard: [[{ text: "🌐 Site" }, { text: "💬 Suporte" }]],
    resize_keyboard: true,
  };
}

// Rotas HTTP (pra checar deploy)
app.get("/", (_, res) => res.status(200).send("ok"));
app.get("/health", (_, res) => res.status(200).json({ ok: true }));
app.get("/version", (_, res) => res.status(200).json({ version: APP_VERSION }));

app.post("/webhook", async (req, res) => {
  try {
    const update = req.body || {};

    // ===== CALLBACKS (botões inline) =====
    if (update.callback_query) {
      const cq = update.callback_query;
      const data = cq.data;
      const chatId = cq.message?.chat?.id;

      // sempre “ack” pra não ficar carregando no Telegram
      if (cq.id) {
        await tg("answerCallbackQuery", { callback_query_id: cq.id });
      }

      if (!chatId) return res.sendStatus(200);

      if (data === "SUPORTE") {
        await tg("sendMessage", {
          chat_id: chatId,
          text:
            "💬 Suporte:\n" +
            "Me descreva sua dúvida (pedaleira / IR / instalação / importação) que eu te respondo aqui no privado.",
        });
      }

      return res.sendStatus(200);
    }

    const msg = update.message;
    if (!msg || !msg.chat) return res.sendStatus(200);

    const chat = msg.chat;
    const chatId = chat.id;
    const text = normalizeText(msg.text);
    const textLower = text.toLowerCase();

    // ===== PRIVADO =====
    if (isPrivateChat(chat)) {
      if (text === "/start" || textLower === "start") {
        await tg("sendMessage", {
          chat_id: chatId,
          text:
            "✅ Bot online!\n\n" +
            "Comandos no privado:\n" +
            "• /menu\n" +
            "• /ping\n\n" +
            "📌 Para ver tutoriais, use /tutorial no supergrupo.",
          reply_markup: menuReplyKeyboard(),
        });
        return res.sendStatus(200);
      }

      if (text === "/ping" || textLower === "ping") {
        await tg("sendMessage", { chat_id: chatId, text: "pong 🟢" });
        return res.sendStatus(200);
      }

      // MENU: envia inline (abre o site direto) + mantém o teclado de baixo atualizado
      if (text === "/menu" || textLower === "menu") {
        await tg("sendMessage", {
          chat_id: chatId,
          text: "Escolha uma opção:",
          reply_markup: menuInlineKeyboard(),
        });

        // opcional: atualiza teclado de baixo também
        await tg("sendMessage", {
          chat_id: chatId,
          text: "✅ Menu fixado aqui embaixo também (Site/Suporte).",
          reply_markup: menuReplyKeyboard(),
        });

        return res.sendStatus(200);
      }

      // Clique no teclado “de baixo” -> manda botão inline que abre o site direto
      if (textLower === "🌐 site" || textLower === "site") {
        await tg("sendMessage", {
          chat_id: chatId,
          text: `🌐 Site oficial TB-BASS IR:`,
          reply_markup: {
            inline_keyboard: [[{ text: "Abrir site", url: SITE_URL }]],
          },
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

      // /tutorial no privado -> explica que é no supergrupo
      if (text === "/tutorial" || textLower === "tutorial") {
        await tg("sendMessage", {
          chat_id: chatId,
          text:
            "📌 O comando /tutorial funciona apenas no supergrupo.\n\n" +
            "Abra o grupo e digite: /tutorial",
        });
        return res.sendStatus(200);
      }

      // fallback privado
      await tg("sendMessage", { chat_id: chatId, text: `Recebi: ${text}` });
      return res.sendStatus(200);
    }

    // ===== GRUPO/SUPERGRUPO =====
    const inSupergroup = isSupergroupChat(chat);

    // /tutorial só no supergrupo
    if (inSupergroup && (text === "/tutorial" || textLower === "tutorial")) {
      await tg("sendMessage", {
        chat_id: chatId,
        text: TUTORIAL_TEXT,
        disable_web_page_preview: false,
      });
      return res.sendStatus(200);
    }

    // /start no supergrupo (opcional)
    if (inSupergroup && text === "/start") {
      await tg("sendMessage", {
        chat_id: chatId,
        text: "✅ Bot online no grupo.\nUse /tutorial para ver a lista de tutoriais.",
      });
      return res.sendStatus(200);
    }

    // Fora do seu supergrupo, ignora /tutorial (pra não espalhar)
    return res.sendStatus(200);
  } catch (e) {
    console.error("Webhook error:", e);
    return res.sendStatus(200);
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log("Listening on", port));
