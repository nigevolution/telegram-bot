"use strict";

const express = require("express");

const app = express();
app.use(express.json({ limit: "1mb" }));

// ====== CONFIG ======
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error("Missing TELEGRAM_BOT_TOKEN env var");
  process.exit(1);
}

const API = `https://api.telegram.org/bot${TOKEN}`;

const APP_VERSION = process.env.APP_VERSION || "dev";
const BOT_USERNAME = (process.env.BOT_USERNAME || "").replace("@", "").trim();

// Seu supergrupo (somente lá o /tutorial funciona)
const SUPERGROUP_ID = Number(process.env.SUPERGROUP_ID || "-1003363944827");

// Seu site
const SITE_URL = process.env.SITE_URL || "https://tbbassir.com.br";

// ====== TELEGRAM HELPERS ======
async function tg(method, body) {
  const res = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!data.ok) throw new Error(`${method} failed: ${JSON.stringify(data)}`);
  return data;
}

function normalizeText(text) {
  return (text || "").trim();
}

function isPrivateChat(msg) {
  return msg?.chat?.type === "private";
}

function isTargetSupergroup(msg) {
  return Number(msg?.chat?.id) === SUPERGROUP_ID && msg?.chat?.type === "supergroup";
}

// Remove "/comando@bot" => "/comando"
function stripBotUsername(cmd) {
  if (!cmd) return cmd;
  if (!BOT_USERNAME) return cmd;
  const suffix = `@${BOT_USERNAME}`.toLowerCase();
  const lower = cmd.toLowerCase();
  if (lower.endsWith(suffix)) return cmd.slice(0, -suffix.length);
  return cmd;
}

// ====== MENUS ======

// Reply keyboard (barra de baixo) — NÃO abre URL sozinho.
// Mas deixa o botão "🌐 Site" enviar mensagem pro bot, e o bot responde com link.
function replyMenu() {
  return {
    keyboard: [[{ text: "🌐 Site" }, { text: "💬 Suporte" }], [{ text: "📚 Tutorial" }]],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

// Inline keyboard (botões que abrem URL)
function inlineSiteButton() {
  return {
    inline_keyboard: [[{ text: "🌐 Abrir site TB-BASS IR", url: SITE_URL }]],
  };
}

// ====== CONTEÚDO DO TUTORIAL (a mesma mensagem que você mandou no print) ======
function tutorialMessage() {
  return (
    `📌 CENTRAL DE TUTORIAIS TB-BASS IR (PC)\n\n` +
    `Instalação do M-Effects + Importar IR (PC) TANK-B entre outras pedaleiras\n` +
    `https://youtu.be/bKM6qGswkdw\n\n` +
    `Instalação do Cube Suite (PC) apenas para as pedaleiras CUBEBABY tanto como pedaleira de baixo e guitarra\n` +
    `https://youtu.be/o-BfRDqeFhs\n\n` +
    `Como importar IR pela DAW REAPER\n` +
    `https://youtube.com/shorts/M37weIAi-CI?si=pOU3GhKIWnv8_fp1\n\n` +
    `Tutorial de instalação do app pra celular TANK-B entre outras pedaleiras\n` +
    `https://youtu.be/RkVB4FQmONw\n\n` +
    `Digite TUTORIAL sempre que precisar rever.`
  );
}

// ====== HTTP ROUTES ======
app.get("/", (_, res) => res.status(200).send("ok"));
app.get("/health", (_, res) => res.status(200).json({ ok: true, version: APP_VERSION }));
app.get("/version", (_, res) => res.status(200).send(APP_VERSION));

// Só pra teste via navegador (Telegram usa POST)
app.get("/webhook", (_, res) => res.status(200).send("webhook ok (use POST from Telegram)"));

app.post("/webhook", async (req, res) => {
  try {
    const msg = req.body?.message;
    if (!msg) return res.sendStatus(200);

    const chatId = msg.chat?.id;
    const textRaw = msg.text ? normalizeText(msg.text) : "";

    // Se não tem texto, ignora (stickers, fotos etc)
    if (!textRaw) return res.sendStatus(200);

    // Normaliza comandos
    let text = textRaw;
    if (text.startsWith("/")) text = stripBotUsername(text);

    const lower = text.toLowerCase();

    // ====== COMANDOS NO PRIVADO ======
    if (isPrivateChat(msg)) {
      if (lower === "/start") {
        await tg("sendMessage", {
          chat_id: chatId,
          text:
            `✅ Bot online!\n\n` +
            `Comandos:\n` +
            `/start\n` +
            `/menu\n` +
            `/ping\n\n` +
            `📌 Tutorial fica no supergrupo.`,
          reply_markup: replyMenu(),
        });
        return res.sendStatus(200);
      }

      if (lower === "/ping") {
        await tg("sendMessage", { chat_id: chatId, text: "pong 🟢" });
        return res.sendStatus(200);
      }

      if (lower === "/menu" || lower === "menu") {
        await tg("sendMessage", {
          chat_id: chatId,
          text: "Escolha uma opção:",
          reply_markup: replyMenu(),
        });
        return res.sendStatus(200);
      }

      // Botões do menu (reply keyboard)
      if (lower === "🌐 site" || lower === "site") {
        await tg("sendMessage", {
          chat_id: chatId,
          text: `🌐 Nosso site oficial:\n${SITE_URL}`,
          reply_markup: inlineSiteButton(),
          disable_web_page_preview: false,
        });
        return res.sendStatus(200);
      }

      if (lower === "💬 suporte" || lower === "suporte") {
        await tg("sendMessage", {
          chat_id: chatId,
          text: "Me diga sua dúvida aqui no privado que eu te ajudo. 🙂",
        });
        return res.sendStatus(200);
      }

      // Se a pessoa tentar tutorial no privado, NÃO manda o texto — só orienta.
      if (lower === "/tutorial" || lower === "tutorial" || lower === "📚 tutorial") {
        await tg("sendMessage", {
          chat_id: chatId,
          text:
            `📌 O comando TUTORIAL funciona apenas no supergrupo.\n` +
            `Abra o grupo e digite: /tutorial`,
        });
        return res.sendStatus(200);
      }

      // Resposta padrão no privado (você pode trocar depois)
      await tg("sendMessage", {
        chat_id: chatId,
        text: `Recebi: ${textRaw}\n\nDigite /menu para ver opções.`,
      });

      return res.sendStatus(200);
    }

    // ====== NO SUPERGRUPO (somente o ID certo) ======
    if (isTargetSupergroup(msg)) {
      if (lower === "/tutorial" || lower === "tutorial" || lower === "📚 tutorial") {
        await tg("sendMessage", {
          chat_id: chatId,
          text: tutorialMessage(),
          disable_web_page_preview: false,
        });
        return res.sendStatus(200);
      }

      if (lower === "/site" || lower === "site" || lower === "🌐 site") {
        await tg("sendMessage", {
          chat_id: chatId,
          text: `🌐 Site oficial TB-BASS IR:\n${SITE_URL}`,
          reply_markup: inlineSiteButton(),
        });
        return res.sendStatus(200);
      }

      // No grupo: não fica respondendo tudo pra não virar spam
      return res.sendStatus(200);
    }

    // ====== OUTROS GRUPOS (ignora) ======
    return res.sendStatus(200);
  } catch (e) {
    console.error("Webhook error:", e);
    return res.sendStatus(200); // sempre 200 pro Telegram não ficar re-tentando
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log("Listening on", port, "version:", APP_VERSION));
