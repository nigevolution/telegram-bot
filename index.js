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

// Supergrupo oficial (fixo)
const SUPERGROUP_CHAT_ID = "-1003363944827";

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
  // aceita: "/tutorial", "/tutorial@SeuBot", "tutorial"
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

    // log básico (pra debug no Cloud Run)
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

    // /chatid em qualquer lugar (pra conferir)
    if (cmd === "/chatid") {
      await tg("sendMessage", {
        chat_id: chatId,
        text: `📌 Chat ID: ${chatId}\nTipo: ${chatType}\nBot: @${BOT_USERNAME}\nVersão: ${APP_VERSION}`,
      });
      return res.sendStatus(200);
    }

    const wantsTutorial =
      cmd === "/tutorial" || cmd === "tutorial" || cmd === "/tutorial";

    // ===== SUPERGRUPOS =====
    if (chatType === "supergroup") {
      // só funciona no supergrupo oficial
      if (isOfficialSupergroup(chat)) {
        if (wantsTutorial) {
          await tg("sendMessage", {
            chat_id: chatId,
            text: TUTORIAL_TEXT,
            disable_web_page_preview: false,
          });
        }
        // qualquer outra msg no supergrupo: ignora (não poluir)
        return res.sendStatus(200);
      }

      // se alguém tentar em outro supergrupo
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
            "/menu\n\n" +
            "📌 Tutoriais: use /tutorial no supergrupo oficial.",
        });
      } else if (cmd === "/ping") {
        await tg("sendMessage", { chat_id: chatId, text: "pong 🟢" });
      } else if (cmd === "/menu") {
        await tg("sendMessage", {
          chat_id: chatId,
          text: "Escolha:",
          reply_markup: {
            keyboard: [[{ text: "📦 Produtos" }, { text: "💬 Suporte" }]],
            resize_keyboard: true,
          },
        });
      } else if (wantsTutorial) {
        // no privado NÃO manda os links
        await tg("sendMessage", {
          chat_id: chatId,
          text: "📌 Os tutoriais ficam no supergrupo oficial. Lá use /tutorial para ver a lista completa.",
        });
      } else {
        // aqui você vai colocar suas respostas do privado depois
        await tg("sendMessage", {
          chat_id: chatId,
          text: `Recebi: ${text || "(sem texto)"}\n\n(Em breve: respostas do privado / suporte)`,
        });
      }
      return res.sendStatus(200);
    }

    // ===== OUTROS (grupo normal/canal) =====
    return res.sendStatus(200);
  } catch (e) {
    console.error("WEBHOOK_ERROR", e);
    return res.sendStatus(200);
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log("Listening on", port, "version", APP_VERSION));
