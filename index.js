const express = require("express");

const app = express();
app.use(express.json());

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error("Missing TELEGRAM_BOT_TOKEN env var");
  process.exit(1);
}

const BOT_USERNAME = (process.env.BOT_USERNAME || "Suporte_ir_bot").replace("@", "");
const API = `https://api.telegram.org/bot${TOKEN}`;

const APP_VERSION =
  process.env.APP_VERSION ||
  process.env.K_REVISION ||
  process.env.COMMIT_SHA ||
  "dev";

const TUTORIAL_TEXT =
  "📌 CENTRAL DE TUTORIAIS TB-BASS IR (PC)\n\n" +
  "Instalação do M-Effects + Importar IR (PC) TANK-B entre outras pedaleiras\n" +
  "https://youtu.be/bKM6qGswkdw\n\n" +
  "Instalação do Cube Suite (PC) apenas para as pedaleiras CUBEBABY tanto como pedaleira de baixo e guitarra\n" +
  "https://youtu.be/o-BfRDqeFhs\n\n" +
  "Como importar IR pela DAW REAPER\n" +
  "https://youtube.com/shorts/M37weIAi-CI?si=pOU3GhKIWnv8_fp1\n\n" +
  "Tutorial de instalação do app pra celular TANK-B entre outras pedaleiras\n" +
  "https://youtu.be/RkVB4FQm0Nw\n\n" +
  "Digite TUTORIAL sempre que precisar rever.";

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

function normalizeText(text) {
  return (text || "").trim();
}

function extractCommand(text) {
  const t = normalizeText(text);
  if (!t) return { raw: "", cmd: "", args: "" };

  const parts = t.split(/\s+/);
  const first = parts[0];
  const args = parts.slice(1).join(" ");

  // Ex: "/tutorial@Suporte_ir_bot"
  if (first.startsWith("/")) {
    const base = first.split("@")[0].toLowerCase(); // "/tutorial"
    return { raw: t, cmd: base, args };
  }

  return { raw: t, cmd: t.toLowerCase(), args: "" };
}

function isGroupChat(chat) {
  const type = chat?.type;
  return type === "group" || type === "supergroup";
}

async function sendTutorial(chatId) {
  await tg("sendMessage", {
    chat_id: chatId,
    text: TUTORIAL_TEXT,
    disable_web_page_preview: false,
  });
}

async function tellCallPrivate(chatId, replyToMessageId) {
  const text =
    `✅ Para suporte, me chame no privado: @${BOT_USERNAME}\n` +
    `📌 No grupo eu envio apenas TUTORIAIS.\n` +
    `Digite: tutorial (ou /tutorial)`;

  await tg("sendMessage", {
    chat_id: chatId,
    text,
    reply_to_message_id: replyToMessageId,
  });
}

async function tryDMUser(userId, text) {
  // Só funciona se o usuário já tiver aberto o bot (já deu /start no privado)
  try {
    await tg("sendMessage", { chat_id: userId, text });
  } catch (_) {
    // ignora (Telegram bloqueia se o user nunca iniciou o bot)
  }
}

app.get("/", (_, res) => res.status(200).send("ok"));
app.get("/version", (_, res) => res.status(200).send(`ok - ${APP_VERSION}`));
app.get("/webhook", (_, res) => res.status(200).send("ok (use POST)"));

app.post("/webhook", async (req, res) => {
  try {
    const update = req.body || {};

    // Pode vir em message, edited_message, etc.
    const msg = update.message || update.edited_message || update.channel_post || update.edited_channel_post;
    if (!msg) return res.sendStatus(200);

    const chatId = msg.chat?.id;
    const chatType = msg.chat?.type;
    const userId = msg.from?.id;
    const messageId = msg.message_id;

    const text = msg.text ? normalizeText(msg.text) : "";
    if (!text) return res.sendStatus(200);

    const { cmd } = extractCommand(text);

    // Aceita: /tutorial, /tutorial@bot, "tutorial" (sem barra), "Tutorial" etc.
    const isTutorial =
      cmd === "/tutorial" ||
      cmd === "tutorial" ||
      cmd === "/tutoriais" ||
      cmd === "tutoriais" ||
      cmd === "/tutorial@".toLowerCase(); // redundante, só pra garantir

    // Também aceita exatamente "TUTORIAL" do jeito que você usa
    const isTutorialLoose = text.trim().toLowerCase() === "tutorial";

    const inGroup = isGroupChat(msg.chat);

    // ======================
    // GRUPO / SUPERGRUPO
    // ======================
    if (inGroup) {
      // Só publica tutorial no grupo
      if (isTutorial || isTutorialLoose) {
        await sendTutorial(chatId);
      } else {
        // Não “polui” o grupo com outras respostas (mas orienta)
        await tellCallPrivate(chatId, messageId);

        // tenta mandar DM (se o user já iniciou o bot no privado)
        if (userId) {
          await tryDMUser(
            userId,
            "✅ Vi sua mensagem no grupo.\n" +
              "Me diga aqui no privado qual é sua dúvida e eu te ajudo.\n\n" +
              "📌 Para ver os tutoriais: digite /tutorial"
          );
        }
      }

      return res.sendStatus(200);
    }

    // ======================
    // PRIVADO
    // ======================
    // Comandos no privado
    if (cmd === "/start") {
      await tg("sendMessage", {
        chat_id: chatId,
        text:
          "✅ Bot online!\n\n" +
          "Comandos:\n" +
          "/start\n" +
          "/ping\n" +
          "/menu\n" +
          "/tutorial",
      });
      return res.sendStatus(200);
    }

    if (cmd === "/ping") {
      await tg("sendMessage", { chat_id: chatId, text: "pong 🟢" });
      return res.sendStatus(200);
    }

    if (cmd === "/menu") {
      await tg("sendMessage", {
        chat_id: chatId,
        text: "Escolha uma opção:",
        reply_markup: {
          keyboard: [[{ text: "📌 Tutorial" }], [{ text: "💬 Suporte" }]],
          resize_keyboard: true,
        },
      });
      return res.sendStatus(200);
    }

    if (cmd === "/tutorial" || cmd === "tutorial" || isTutorialLoose) {
      await sendTutorial(chatId);
      return res.sendStatus(200);
    }

    // Botões do teclado (privado)
    if (text === "📌 Tutorial") {
      await sendTutorial(chatId);
      return res.sendStatus(200);
    }

    if (text === "💬 Suporte") {
      await tg("sendMessage", {
        chat_id: chatId,
        text:
          "💬 Suporte: me diga sua dúvida aqui no privado.\n\n" +
          "Se quiser ver os tutoriais: /tutorial",
      });
      return res.sendStatus(200);
    }

    // Fallback (privado): eco simples
    await tg("sendMessage", { chat_id: chatId, text: `Recebi: ${text}` });
    return res.sendStatus(200);
  } catch (e) {
    console.error("Webhook error:", e);
    return res.sendStatus(200);
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log("Listening on", port, "version:", APP_VERSION));
