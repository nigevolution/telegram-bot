"use strict";

const express = require("express");
const app = express();
app.use(express.json({ limit: "1mb" }));

// ===== CONFIG =====
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error("Missing TELEGRAM_BOT_TOKEN env var");
  process.exit(1);
}

const BOT_VERSION = process.env.BOT_VERSION || "v1";
const API = `https://api.telegram.org/bot${TOKEN}`;

// ===== FETCH (global fetch on Node 18+; fallback to node-fetch if needed) =====
async function getFetch() {
  if (typeof fetch === "function") return fetch;
  const mod = await import("node-fetch");
  return mod.default;
}

async function tg(method, body) {
  const _fetch = await getFetch();
  const res = await _fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!data || data.ok !== true) {
    throw new Error(
      `Telegram API error on ${method}: ${JSON.stringify(data)}`
    );
  }
  return data;
}

// ===== TUTORIAL MESSAGE (SEUS LINKS) =====
const TUTORIAL_TEXT =
  "🧰 *CENTRAL DE TUTORIAIS TB-BASS IR (PC)*\n\n" +
  "*Instalação do M-Effects + Importar IR (PC) TANK-B* (entre outras pedaleiras)\n" +
  "https://youtu.be/bKM6qGswkdw\n\n" +
  "*Instalação do Cube Suite (PC)* (apenas para pedaleiras CUBEBABY, baixo e guitarra)\n" +
  "https://youtu.be/o-BfRDqeFhs\n\n" +
  "*Como importar IR pela DAW REAPER*\n" +
  "https://youtube.com/shorts/M37welAi-CI?si=pOU3GhKIWnv8_fp1\n\n" +
  "*Tutorial de instalação do app pra celular TANK-B* (entre outras pedaleiras)\n" +
  "https://youtu.be/RkVB4FQmONw\n\n" +
  "✅ *Digite* /tutorial *sempre que precisar rever.*";

// ===== HELPERS =====
function normalizeText(text) {
  return String(text || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function isGroupChat(chat) {
  const t = chat?.type;
  return t === "group" || t === "supergroup";
}

async function sendText(chatId, text, extra = {}) {
  return tg("sendMessage", {
    chat_id: chatId,
    text,
    ...extra,
  });
}

async function sendTutorial(chatId) {
  return sendText(chatId, TUTORIAL_TEXT, {
    parse_mode: "Markdown",
    disable_web_page_preview: false,
  });
}

async function showMenu(chatId) {
  return sendText(chatId, "Escolha uma opção:", {
    reply_markup: {
      keyboard: [[{ text: "📚 Tutoriais" }, { text: "💬 Suporte" }]],
      resize_keyboard: true,
      one_time_keyboard: false,
    },
  });
}

// ===== ROUTES =====
app.get("/", (_, res) => res.status(200).send("ok"));

app.get("/version", (_, res) => res.status(200).send(BOT_VERSION));

/**
 * Telegram Webhook endpoint
 * Configure webhook to: https://SEU_CLOUD_RUN_URL/webhook
 */
app.post("/webhook", async (req, res) => {
  // Sempre responde 200 pro Telegram não ficar re-tentando sem parar
  res.sendStatus(200);

  try {
    const update = req.body || {};

    // Pega mensagem normal ou posts (canal) se existir
    const msg =
      update.message ||
      update.edited_message ||
      update.channel_post ||
      update.edited_channel_post;

    // Se for clique em botão (se você usar inline keyboard no futuro)
    const cb = update.callback_query;

    if (cb?.message?.chat?.id) {
      const chatId = cb.message.chat.id;
      const data = normalizeText(cb.data);

      if (data === "tutorial") await sendTutorial(chatId);
      if (data === "menu") await showMenu(chatId);

      // confirma o callback pro Telegram
      await tg("answerCallbackQuery", { callback_query_id: cb.id });
      return;
    }

    if (!msg?.chat?.id) return;

    const chatId = msg.chat.id;
    const chatType = msg.chat.type; // private | group | supergroup | channel
    const isGroup = isGroupChat(msg.chat);

    const rawText = msg.text || msg.caption || "";
    const text = normalizeText(rawText);

    // Comandos aceitos (com barra ou sem barra)
    const isStart = text === "/start" || text === "start";
    const isPing = text === "/ping" || text === "ping";
    const isMenu = text === "/menu" || text === "menu";
    const isTutorial = text === "/tutorial" || text === "tutorial";

    // ===== REGRAS NO GRUPO (pra não virar spam) =====
    if (isGroup) {
      // No grupo, só responde comandos específicos
      if (isStart) {
        await sendText(
          chatId,
          "✅ Bot online!\nComandos: /start /ping /menu /tutorial"
        );
        return;
      }

      if (isPing) {
        await sendText(chatId, "pong 🟢");
        return;
      }

      if (isMenu) {
        await showMenu(chatId);
        return;
      }

      if (isTutorial) {
        // IMPORTANTÍSSIMO: manda no MESMO chat do grupo (usa chatId do update)
        await sendTutorial(chatId);
        return;
      }

      // Se não for comando, ignora no grupo (sem “Recebi…”)
      return;
    }

    // ===== PRIVADO =====
    // Aqui ele pode conversar normalmente
    if (isStart) {
      await sendText(chatId, "✅ Bot online!\nComandos: /start /ping /menu /tutorial");
      return;
    }

    if (isPing) {
      await sendText(chatId, "pong 🟢");
      return;
    }

    if (isMenu) {
      await showMenu(chatId);
      return;
    }

    if (isTutorial) {
      await sendTutorial(chatId);
      return;
    }

    // Botões do teclado (mensagens normais)
    if (text === "📚 tutoriais") {
      await sendTutorial(chatId);
      return;
    }

    if (text === "💬 suporte") {
      await sendText(
        chatId,
        "✅ Nos chame no suporte oficial.\nExplique seu problema aqui e envie prints/ vídeos se precisar."
      );
      return;
    }

    // Fallback (privado): só confirma o que recebeu
    await sendText(chatId, `Recebi: ${rawText}`);
  } catch (e) {
    console.error("Webhook error:", e?.message || e);
  }
});

// ===== SERVER =====
const port = process.env.PORT || 8080;
app.listen(port, () => console.log("Listening on", port, "version", BOT_VERSION));
