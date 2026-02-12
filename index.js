const express = require("express");
const app = express();
app.use(express.json());

// ====== ENV ======
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error("Missing TELEGRAM_BOT_TOKEN env var");
  process.exit(1);
}

const API = `https://api.telegram.org/bot${TOKEN}`;
const APP_VERSION = process.env.APP_VERSION || "dev";
const BOT_USERNAME = process.env.BOT_USERNAME || "Suporte_ir_bot";

// Supergrupo onde o /tutorial funciona
const SUPERGROUP_ID = Number(process.env.SUPERGROUP_ID || "-1003363944827");

// Site
const SITE_URL = process.env.SITE_URL || "https://tbbassir.com.br";

// ====== Telegram helper ======
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

// ====== Messages ======
const TUTORIAL_TEXT =
`📌 *CENTRAL DE TUTORIAIS TB-BASS IR (PC)*

Instalação do M-Effects + Importar IR (PC) TANK-B entre outras pedaleiras
https://youtu.be/bKM6qGswkdw

Instalação do Cube Suite (PC) apenas para as pedaleiras CUBEBABY tanto como pedaleira de baixo e guitarra
https://youtu.be/o-BfRDqeFhs

Como importar IR pela DAW REAPER
https://youtube.com/shorts/M37weIAi-CI?si=pOU3GhKIWnv8_fp1

Tutorial de instalação do app pra celular TANK-B entre outras pedaleiras
https://youtu.be/RkVB4FQm0Nw

Digite *TUTORIAL* sempre que precisar rever.`;

function mainReplyKeyboard() {
  // Esse é o teclado de baixo (reply keyboard)
  // NÃO abre URL direto; ele envia texto pro bot.
  return {
    keyboard: [
      [{ text: "📌 Tutorial" }, { text: "🌐 Site" }],
      [{ text: "💬 Suporte" }],
    ],
    resize_keyboard: true,
  };
}

function siteInlineKeyboard() {
  // Esse sim abre URL (inline keyboard)
  return {
    inline_keyboard: [[{ text: "🌐 Abrir site TB-BASS IR", url: SITE_URL }]],
  };
}

function normalizeText(s) {
  return (s || "").trim().toLowerCase();
}

function isPrivate(chat) {
  return chat?.type === "private";
}

function isMySupergroup(chat) {
  return (chat?.type === "supergroup" || chat?.type === "group") && Number(chat?.id) === SUPERGROUP_ID;
}

async function sendMenu(chatId, text = "Escolha uma opção:") {
  await tg("sendMessage", {
    chat_id: chatId,
    text,
    reply_markup: mainReplyKeyboard(),
  });
}

async function sendTutorialToSupergroup(chatId) {
  // manda como Markdown pra ficar bonito
  await tg("sendMessage", {
    chat_id: chatId,
    text: TUTORIAL_TEXT,
    parse_mode: "Markdown",
    disable_web_page_preview: false,
  });
}

async function sendPrivateSupportHint(chatId) {
  await sendMenu(chatId, "💬 Me diga sua dúvida aqui no privado.\nSe quiser ver os tutoriais: /tutorial");
}

// ====== Health endpoints (Cloud Run) ======
app.get("/", (_, res) => res.status(200).send("ok"));
app.get("/health", (_, res) => res.status(200).json({ ok: true }));
app.get("/version", (_, res) =>
  res.status(200).json({ app_version: APP_VERSION, bot_username: BOT_USERNAME, supergroup_id: SUPERGROUP_ID })
);

// ====== Webhook ======
app.post("/webhook", async (req, res) => {
  try {
    const msg = req.body?.message;
    if (!msg) return res.sendStatus(200);

    const chatId = msg.chat?.id;
    const chat = msg.chat;
    const textRaw = msg.text || msg.caption || "";
    const text = normalizeText(textRaw);

    // Só processa texto
    if (!chatId || !textRaw) return res.sendStatus(200);

    // ====== Comandos /start /menu /ping ======
    if (text === "/start") {
      if (isPrivate(chat)) {
        await tg("sendMessage", {
          chat_id: chatId,
          text: "✅ Bot online!\nComandos: /start /ping /menu /tutorial",
        });
        await sendMenu(chatId);
      } else {
        // no grupo: só confirma que tá vivo (sem floodar)
        await tg("sendMessage", {
          chat_id: chatId,
          text: "✅ Bot online no grupo! Use /tutorial (somente no supergrupo oficial).",
        });
      }
      return res.sendStatus(200);
    }

    if (text === "/ping") {
      await tg("sendMessage", { chat_id: chatId, text: "pong 🟢" });
      return res.sendStatus(200);
    }

    if (text === "/menu") {
      await sendMenu(chatId);
      return res.sendStatus(200);
    }

    // ====== Tutorial ======
    // Aceita: /tutorial ou "tutorial" ou botão "📌 Tutorial"
    const wantsTutorial =
      text === "/tutorial" || text === "tutorial" || text === "📌 tutorial" || text === "📌tutorial";

    if (wantsTutorial) {
      // Só libera no supergrupo específico
      if (isMySupergroup(chat)) {
        await sendTutorialToSupergroup(chatId);
      } else {
        // privado ou outro grupo: não manda os links completos
        await tg("sendMessage", {
          chat_id: chatId,
          text:
            "📌 Os tutoriais ficam *apenas* no supergrupo oficial.\n" +
            "Entre no grupo e use /tutorial lá.\n\n" +
            "Se precisar, clique no site:",
          parse_mode: "Markdown",
          reply_markup: siteInlineKeyboard(),
        });
      }
      return res.sendStatus(200);
    }

    // ====== Botão Site (reply keyboard) ======
    // Quando clicar "🌐 Site", o bot responde com inline button que abre o site.
    const wantsSite = text === "site" || text === "🌐 site" || text === "🌐site";
    if (wantsSite) {
      await tg("sendMessage", {
        chat_id: chatId,
        text: "🌐 Site oficial TB-BASS IR:",
        reply_markup: siteInlineKeyboard(),
      });
      return res.sendStatus(200);
    }

    // ====== Botão Suporte ======
    const wantsSupport = text === "suporte" || text === "💬 suporte" || text === "💬suporte";
    if (wantsSupport) {
      if (isPrivate(chat)) {
        await tg("sendMessage", {
          chat_id: chatId,
          text: "💬 Pode mandar sua dúvida aqui no privado. Vou te responder por aqui.",
        });
      } else {
        // no grupo: pede pra chamar no privado
        await tg("sendMessage", {
          chat_id: chatId,
          text: `💬 Para suporte, me chame no privado: @${BOT_USERNAME}`,
        });
      }
      return res.sendStatus(200);
    }

    // ====== Se for privado: mantém um comportamento útil ======
    if (isPrivate(chat)) {
      await tg("sendMessage", {
        chat_id: chatId,
        text:
          "✅ Mensagem recebida!\n" +
          "Me diga sua dúvida aqui no privado.\n\n" +
          "Menu: /menu",
        reply_markup: mainReplyKeyboard(),
      });
      return res.sendStatus(200);
    }

    // ====== Se for grupo (não responde tudo pra não floodar) ======
    // ignora por padrão
    return res.sendStatus(200);
  } catch (e) {
    console.error("webhook error:", e);
    return res.sendStatus(200);
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log("Listening on", port, "version:", APP_VERSION));
