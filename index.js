const express = require("express");
const app = express();
app.use(express.json());

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error("Missing TELEGRAM_BOT_TOKEN env var");
  process.exit(1);
}

const API = `https://api.telegram.org/bot${TOKEN}`;

const BOT_USERNAME = (process.env.BOT_USERNAME || "Suporte_ir_bot")
  .replace("@", "")
  .trim();

const APP_VERSION = process.env.APP_VERSION || "dev";

// Supergrupo oficial (tutorial só aqui)
const SUPERGROUP_CHAT_ID = "-1003363944827";

// ✅ SEU SITE
const SITE_URL = "https://tbbassir.com.br";

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

const TUTORIAL_TEXT =
`📌 CENTRAL DE TUTORIAIS TB-BASS IR (PC)

✅ Instalação do M-Effects + Importar IR (PC) TANK-B (entre outras pedaleiras)
https://youtu.be/bKM6qGswkdw

✅ Instalação do Cube Suite (PC) — pedaleiras CUBEBABY (baixo e guitarra)
https://youtu.be/o-BfRDqeFhs

✅ Como importar IR pela DAW REAPER
https://youtube.com/shorts/M37welAi-CI?si=pOU3GhKIWnv8_fp1

✅ Tutorial de instalação do app pra celular TANK-B (entre outras pedaleiras)
https://youtu.be/RkVB4FQm0Nw

Digite: /tutorial (ou "tutorial") sempre que precisar rever.`;

function pickMessage(update) {
  return (
    update?.message ||
    update?.edited_message ||
    update?.channel_post ||
    update?.edited_channel_post ||
    null
  );
}

function normalize(text) {
  return (text || "").trim();
}

function normalizeCommand(text) {
  const t = normalize(text);
  if (!t) return "";

  if (t.startsWith("/")) {
    const first = t.split(/\s+/)[0];
    const cmd = first.split("@")[0];
    return cmd.toLowerCase();
  }

  return t.toLowerCase();
}

function isOfficialSupergroup(chat) {
  if (!chat) return false;
  if (chat.type !== "supergroup") return false;
  return String(chat.id) === String(SUPERGROUP_CHAT_ID);
}

async function sendMenu(chatId) {
  // ✅ Botão “🌐 Site” no lugar de Produtos
  await tg("sendMessage", {
    chat_id: chatId,
    text: "Escolha uma opção:",
    reply_markup: {
      keyboard: [[{ text: "🌐 Site" }, { text: "💬 Suporte" }]],
      resize_keyboard: true,
    },
  });
}

async function sendSite(chatId) {
  // ✅ Manda o link + botão que abre direto
  await tg("sendMessage", {
    chat_id: chatId,
    text: `🌐 Site oficial TB Bass IR:\n${SITE_URL}`,
    disable_web_page_preview: false,
    reply_markup: {
      inline_keyboard: [[{ text: "🔗 Abrir site", url: SITE_URL }]],
    },
  });
}

app.get("/", (_, res) => res.status(200).send("ok"));
app.get("/health", (_, res) =>
  res.status(200).json({ ok: true, version: APP_VERSION })
);

app.post("/webhook", async (req, res) => {
  try {
    const msg = pickMessage(req.body);
    if (!msg) return res.sendStatus(200);

    const chat = msg.chat;
    const chatId = chat?.id;
    const chatType = chat?.type;

    const textRaw = msg?.text || msg?.caption || "";
    const text = normalize(textRaw);
    const cmd = normalizeCommand(text);

    console.log(
      JSON.stringify({
        event: "update",
        chat_id: chatId,
        chat_type: chatType,
        from_id: msg?.from?.id,
        from_user: msg?.from?.username,
        text: text?.slice(0, 200),
      })
    );

    // /chatid (debug)
    if (cmd === "/chatid") {
      await tg("sendMessage", {
        chat_id: chatId,
        text: `📌 Chat ID: ${chatId}\nTipo: ${chatType}\nBot: @${BOT_USERNAME}\nVersão: ${APP_VERSION}`,
      });
      return res.sendStatus(200);
    }

    const wantsTutorial = cmd === "/tutorial" || cmd === "tutorial";
    const wantsSite = cmd === "/site" || cmd === "site" || text === "🌐 Site" || cmd === "🌐 site";
    const wantsSupport = cmd === "/suporte" || cmd === "suporte" || text === "💬 Suporte" || cmd === "💬 suporte";

    // ===== SUPERGRUPO ===== (tutorial só aqui)
    if (chatType === "supergroup") {
      if (isOfficialSupergroup(chat)) {
        if (wantsTutorial) {
          await tg("sendMessage", {
            chat_id: chatId,
            text: TUTORIAL_TEXT,
            disable_web_page_preview: false,
          });
        }
        // ignora o resto pra não poluir o supergrupo
        return res.sendStatus(200);
      }

      // se tentar /tutorial em outro supergrupo
      if (wantsTutorial) {
        await tg("sendMessage", {
          chat_id: chatId,
          text: "⚠️ O comando /tutorial funciona apenas no supergrupo oficial do SUPORTE IR.",
        });
      }
      return res.sendStatus(200);
    }

    // ===== PRIVADO =====
    if (chatType === "private") {
      if (cmd === "/start") {
        await tg("sendMessage", {
          chat_id: chatId,
          text:
            "✅ Bot online!\n\n" +
            "Comandos:\n" +
            "/start\n" +
            "/ping\n" +
            "/menu\n" +
            "/site\n\n" +
            "📌 Tutoriais: use /tutorial no supergrupo oficial.",
        });
        return res.sendStatus(200);
      }

      if (cmd === "/ping") {
        await tg("sendMessage", { chat_id: chatId, text: "pong 🟢" });
        return res.sendStatus(200);
      }

      if (cmd === "/menu") {
        await sendMenu(chatId);
        return res.sendStatus(200);
      }

      if (wantsSite) {
        await sendSite(chatId);
        return res.sendStatus(200);
      }

      if (wantsSupport) {
        await tg("sendMessage", {
          chat_id: chatId,
          text:
            "💬 Suporte: me diga sua dúvida aqui no privado.\n\n" +
            "Se precisar, envie print/vídeo e diga qual pedaleira está usando.",
        });
        return res.sendStatus(200);
      }

      if (wantsTutorial) {
        await tg("sendMessage", {
          chat_id: chatId,
          text:
            "📌 Os tutoriais ficam no supergrupo oficial.\n" +
            "Lá use /tutorial para ver a lista completa.",
        });
        return res.sendStatus(200);
      }

      await tg("sendMessage", {
        chat_id: chatId,
        text: `Recebi: ${text || "(sem texto)"}\n\nDigite /menu para ver as opções.`,
      });
      return res.sendStatus(200);
    }

    return res.sendStatus(200);
  } catch (e) {
    console.error("WEBHOOK_ERROR", e);
    return res.sendStatus(200);
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log("Listening on", port, "version", APP_VERSION));
