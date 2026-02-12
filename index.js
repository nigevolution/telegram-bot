"use strict";

const express = require("express");

const app = express();
// Telegram manda JSON
app.use(express.json({ type: "*/*" }));

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error("Missing TELEGRAM_BOT_TOKEN env var");
  process.exit(1);
}

const API = `https://api.telegram.org/bot${TOKEN}`;

let BOT_USERNAME = process.env.BOT_USERNAME || ""; // opcional; vamos tentar descobrir sozinho

async function tg(method, body) {
  const res = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => null);
  if (!data || !data.ok) {
    throw new Error(`Telegram API error on ${method}: ${JSON.stringify(data)}`);
  }
  return data.result;
}

async function initBot() {
  try {
    const me = await tg("getMe", {});
    if (me?.username) {
      BOT_USERNAME = me.username; // ex: "Suporte_ir_bot"
      console.log("BOT_USERNAME detected:", BOT_USERNAME);
    }
  } catch (e) {
    console.warn("Could not auto-detect BOT_USERNAME:", e?.message || e);
  }
}

function normalizeText(t) {
  return (t || "").trim();
}

function parseCommand(textRaw) {
  // Aceita:
  // "/start", "/start@MeuBot", "/tutorial", "/tutorial@MeuBot"
  // e também "tutorial" (sem /)
  const text = normalizeText(textRaw);
  if (!text) return { kind: "none" };

  const lower = text.toLowerCase();

  // comando com "/"
  if (text.startsWith("/")) {
    // pega só primeiro token
    const first = text.split(/\s+/)[0]; // "/tutorial@bot"
    // remove "/"
    let cmd = first.slice(1);

    // remove "@username" se vier
    if (cmd.includes("@")) {
      const [base, atUser] = cmd.split("@");
      cmd = base;
      // se quiser, valida se atUser bate com BOT_USERNAME (opcional)
      // (não travo se diferente, só ignoro)
    } else if (BOT_USERNAME) {
      // alguns clientes podem mandar "/cmd@Bot" em outro campo, mas aqui já tratamos
    }

    return { kind: "command", cmd: cmd.toLowerCase(), raw: text };
  }

  // “comando” sem slash (ex: "tutorial")
  if (lower === "tutorial") return { kind: "command", cmd: "tutorial", raw: text };
  if (lower === "menu") return { kind: "command", cmd: "menu", raw: text };
  if (lower === "ping") return { kind: "command", cmd: "ping", raw: text };
  if (lower === "start") return { kind: "command", cmd: "start", raw: text };

  return { kind: "text", text };
}

function isGroupChat(chat) {
  const t = chat?.type;
  return t === "group" || t === "supergroup";
}

function tutorialMessage() {
  // Mensagem igual seu print (texto + links)
  return [
    "🎓 *CENTRAL DE TUTORIAIS TB-BASS IR (PC)*",
    "",
    "Instalação do M-Effects + Importar IR (PC) TANK-B entre outras pedaleiras",
    "https://youtu.be/bKM6qGswkdw",
    "",
    "Instalação do Cube Suite (PC) apenas para as pedaleiras CUBEBABY tanto como pedaleira de baixo e guitarra",
    "https://youtu.be/o-BfRDqeFhs",
    "",
    "Como importar IR pela DAW REAPER",
    "https://youtube.com/shorts/M37welAi-CI?si=pOU3GhKIWnv8_fp1",
    "",
    "Tutorial de instalação do app pra celular TANK-B entre outras pedaleiras",
    "https://youtu.be/RkVB4FQmONw",
    "",
    "Digite /tutorial sempre que precisar rever.",
  ].join("\n");
}

async function sendStart(chatId) {
  await tg("sendMessage", {
    chat_id: chatId,
    text: "✅ Bot online!\nComandos: /start /ping /menu /tutorial",
  });
}

async function sendMenu(chatId) {
  await tg("sendMessage", {
    chat_id: chatId,
    text: "Escolha uma opção:",
    reply_markup: {
      keyboard: [[{ text: "📦 Produtos" }, { text: "💬 Suporte" }]],
      resize_keyboard: true,
    },
  });
}

async function sendTutorial(chatId) {
  await tg("sendMessage", {
    chat_id: chatId,
    text: tutorialMessage(),
    parse_mode: "Markdown",
    // NÃO desabilita preview pra aparecer igual seu print:
    // disable_web_page_preview: false,
  });
}

async function handlePrivateMessage(msg) {
  const chatId = msg.chat.id;
  const cmd = parseCommand(msg.text);

  if (cmd.kind === "command") {
    if (cmd.cmd === "start") return sendStart(chatId);
    if (cmd.cmd === "ping") return tg("sendMessage", { chat_id: chatId, text: "pong 🟢" });
    if (cmd.cmd === "menu") return sendMenu(chatId);
    if (cmd.cmd === "tutorial") return sendTutorial(chatId);
  }

  // botões do menu
  const t = normalizeText(msg.text);
  if (t === "📦 Produtos") {
    return tg("sendMessage", { chat_id: chatId, text: "📦 Produtos: em breve vou colocar o catálogo aqui." });
  }
  if (t === "💬 Suporte") {
    return tg("sendMessage", { chat_id: chatId, text: "💬 Suporte: me diga sua dúvida aqui no privado." });
  }

  // fallback
  return tg("sendMessage", { chat_id: chatId, text: `Recebi: ${t}` });
}

async function handleGroupMessage(msg) {
  const chatId = msg.chat.id;
  const cmd = parseCommand(msg.text);

  // No grupo, só respondemos comandos principais:
  if (cmd.kind === "command") {
    if (cmd.cmd === "start") return sendStart(chatId);
    if (cmd.cmd === "ping") return tg("sendMessage", { chat_id: chatId, text: "pong 🟢" });
    if (cmd.cmd === "menu") return sendMenu(chatId); // se você quiser menu no grupo também
    if (cmd.cmd === "tutorial") return sendTutorial(chatId);
  }

  // Se não for comando, a ideia é separar:
  // Grupo = tutoriais; privado = suporte.
  // Então no grupo só orienta a chamar no privado.
  return tg("sendMessage", {
    chat_id: chatId,
    text: "💬 Para suporte, fale comigo no privado (clique no meu perfil e envie /start).",
  });
}

app.get("/", (_, res) => res.status(200).send("ok"));

app.get("/version", (_, res) => {
  res.json({
    ok: true,
    service: "telegram-bot",
    version: process.env.VERSION || process.env.K_REVISION || "local",
    bot_username: BOT_USERNAME || null,
    now: new Date().toISOString(),
  });
});

app.post("/webhook", async (req, res) => {
  try {
    const update = req.body || {};

    // Mensagem normal
    const msg = update.message || update.edited_message;
    if (msg && msg.text) {
      if (isGroupChat(msg.chat)) {
        await handleGroupMessage(msg);
      } else {
        await handlePrivateMessage(msg);
      }
    }

    // Sempre 200 pro Telegram não ficar reenviando
    res.sendStatus(200);
  } catch (e) {
    console.error("WEBHOOK ERROR:", e?.message || e);
    res.sendStatus(200);
  }
});

const port = process.env.PORT || 8080;
app.listen(port, async () => {
  console.log("Listening on", port);
  await initBot();
});
