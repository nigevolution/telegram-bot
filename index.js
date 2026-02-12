// index.js (CommonJS)
const express = require("express");

const app = express();
app.use(express.json());

// ====== CONFIG ======
const TOKEN = process.env.TELEGRAM_BOT_TOKEN; // secret no Cloud Run
if (!TOKEN) {
  console.error("ERRO: TELEGRAM_BOT_TOKEN não está definido.");
}

const SUPERGROUP_ID = Number(process.env.SUPERGROUP_ID || "-1003363944827"); // seu supergrupo
const SITE_URL = process.env.SITE_URL || "https://tbbassir.com.br";
const APP_VERSION = process.env.APP_VERSION || "dev";

// Se quiser validar o secret token do webhook (opcional):
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";

// ====== TELEGRAM HELPERS ======
async function tg(method, payload) {
  const url = `https://api.telegram.org/bot${TOKEN}/${method}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) {
    console.error("Telegram API error:", method, res.status, data);
  }
  return data;
}

async function sendMessage(chat_id, text, extra = {}) {
  return tg("sendMessage", {
    chat_id,
    text,
    ...extra,
  });
}

// ====== KEYBOARDS ======
function privateReplyKeyboard() {
  // Observação importante:
  // - Botão de "web_app" abre URL em clientes que suportam (geralmente mobile).
  // - No desktop, pode aparecer apenas como botão normal (enviando o texto).
  return {
    keyboard: [
      [
        {
          text: "🌐 Site",
          web_app: { url: SITE_URL },
        },
        { text: "💬 Suporte" },
      ],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

// ====== TUTORIAL TEXT (o mesmo do seu print) ======
function tutorialText() {
  return (
`📌 CENTRAL DE TUTORIAIS TB-BASS IR (PC)

Instalação do M-Effects + Importar IR (PC) TANK-B entre outras pedaleiras
https://youtu.be/bKM6qGswkdw

Instalação do Cube Suite (PC) apenas para as pedaleiras CUBEBABY tanto como pedaleira de baixo e guitarra
https://youtu.be/o-BfRDqeFhs

Como importar IR pela DAW REAPER
https://youtube.com/shorts/M37weIAi-CI?si=pOU3GhKIWnv8_fp1

Tutorial de instalação do app pra celular TANK-B entre outras pedaleiras
https://youtu.be/RkVB4FQmONw

Digite TUTORIAL sempre que precisar rever.`
  );
}

// ====== ROUTES ======
app.get("/", (req, res) => {
  res.status(200).send("OK");
});

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true, status: "healthy", version: APP_VERSION });
});

app.get("/version", (req, res) => {
  res.status(200).json({ ok: true, version: APP_VERSION });
});

// Webhook (Telegram vai POSTAR aqui)
app.post("/webhook", async (req, res) => {
  try {
    // Validação opcional do secret do webhook
    if (WEBHOOK_SECRET) {
      const incoming = req.get("x-telegram-bot-api-secret-token") || "";
      if (incoming !== WEBHOOK_SECRET) {
        return res.status(401).send("Unauthorized");
      }
    }

    const update = req.body;

    // Responde rápido pro Telegram não reenviar
    res.status(200).send("OK");

    const msg = update.message;
    if (!msg) return;

    const chat = msg.chat;
    const chatId = chat.id;
    const chatType = chat.type; // "private", "group", "supergroup"
    const textRaw = (msg.text || "").trim();
    const text = textRaw.toLowerCase();

    // ========= REGRAS DO SEU BOT =========
    // 1) No SUPERGRUPO: só responder tutorial (comando ou palavra)
    // 2) No PRIVADO: responder start/menu e botões; tutorial NÃO manda links no privado

    const isSupergroupAllowed = chatId === SUPERGROUP_ID;
    const isPrivate = chatType === "private";

    // --- Comandos (com / e também quando usuário digita "tutorial") ---
    const isCmdStart = text.startsWith("/start");
    const isCmdMenu = text.startsWith("/menu");
    const isCmdTutorial = text.startsWith("/tutorial") || text === "tutorial";

    // ===== SUPERGRUPO =====
    if (!isPrivate) {
      // se não for o seu supergrupo, ignora tudo
      if (!isSupergroupAllowed) return;

      // no seu supergrupo, só tutorial
      if (isCmdTutorial) {
        await sendMessage(chatId, tutorialText(), {
          disable_web_page_preview: false,
        });
      }
      return;
    }

    // ===== PRIVADO =====
    // /start ou /menu => mostra teclado com Site/Suporte
    if (isCmdStart || isCmdMenu) {
      await sendMessage(
        chatId,
        `✅ Bot online!\n\n📌 Site: ${SITE_URL}\n💬 Suporte: me diga sua dúvida aqui no privado.\n\nSe quiser ver os tutoriais do grupo: /tutorial`,
        {
          reply_markup: privateReplyKeyboard(),
          disable_web_page_preview: true,
        }
      );
      return;
    }

    // /tutorial no privado => NÃO manda os links; orienta usar no grupo
    if (isCmdTutorial) {
      await sendMessage(
        chatId,
        `📌 Os tutoriais ficam apenas no supergrupo.\n\n👉 Vá no grupo e digite: /tutorial\n\nSite: ${SITE_URL}`,
        { disable_web_page_preview: true }
      );
      return;
    }

    // Botões do teclado no privado
    if (textRaw === "💬 Suporte" || text === "suporte") {
      await sendMessage(chatId, "💬 Me diga sua dúvida aqui no privado que eu te ajudo.");
      return;
    }

    if (textRaw === "🌐 Site" || text === "site") {
      await sendMessage(chatId, `🌐 Nosso site: ${SITE_URL}`, {
        disable_web_page_preview: false,
      });
      return;
    }

    // Resposta padrão no privado (você pode trocar aqui depois)
    await sendMessage(
      chatId,
      "Me diga sua dúvida aqui no privado.\n\n📌 Comandos:\n/start\n/menu\n/tutorial (tutoriais só no grupo)",
      { reply_markup: privateReplyKeyboard() }
    );
  } catch (err) {
    console.error("Webhook error:", err);
    // se der erro, ainda assim não pode travar o webhook
    try {
      res.status(200).send("OK");
    } catch (_) {}
  }
});

// ====== START SERVER ======
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} | version=${APP_VERSION}`);
});
