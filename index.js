const express = require("express");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error("Missing TELEGRAM_BOT_TOKEN env var");
  process.exit(1);
}

const API = `https://api.telegram.org/bot${TOKEN}`;

async function tg(method, body) {
  const res = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!data.ok) {
    console.error("Telegram error:", data);
    throw new Error(JSON.stringify(data));
  }

  return data;
}

app.get("/", (_, res) => res.status(200).send("ok"));

app.post("/webhook", async (req, res) => {
  try {
    const msg = req.body?.message;
    if (!msg || !msg.text) return res.sendStatus(200);

    const chatId = msg.chat.id;
    const chatType = msg.chat.type; // private | group | supergroup
    const text = msg.text.trim().toLowerCase();

    // ====== COMANDO START ======
    if (text === "/start") {
      await tg("sendMessage", {
        chat_id: chatId,
        text: "✅ Bot online!\n\nComandos disponíveis:\n/start\n/ping\n/menu\n/tutorial",
      });
    }

    // ====== COMANDO PING ======
    else if (text === "/ping") {
      await tg("sendMessage", {
        chat_id: chatId,
        text: "pong 🟢",
      });
    }

    // ====== COMANDO MENU ======
    else if (text === "/menu") {
      await tg("sendMessage", {
        chat_id: chatId,
        text: "Escolha uma opção:",
        reply_markup: {
          keyboard: [
            [{ text: "📦 Produtos" }, { text: "💬 Suporte" }],
            [{ text: "🎓 Tutorial" }]
          ],
          resize_keyboard: true,
        },
      });
    }

    // ====== COMANDO TUTORIAL ======
    else if (text === "/tutorial" || text === "tutorial") {

      // Se for grupo → envia tutorial direto
      if (chatType === "group" || chatType === "supergroup") {
        await tg("sendMessage", {
          chat_id: chatId,
          text: `🎓 CENTRAL DE TUTORIAIS TB-BASS IR (PC)

📌 Instalação do M-Effects + Importar IR (PC) TANK-B
https://youtu.be/bKM6qGswkdw

📌 Instalação do Cube Suite (PC)
https://youtu.be/o-BfRDqeFhs

📌 Como importar IR pela DAW REAPER
https://youtube.com/shorts/M37welAi-CI?si=pOU3GhKIWnv8_fp1

📌 Tutorial de instalação do app para celular TANK-B
https://youtu.be/RkVB4FQm0Nw`
        });
      }

      // Se for privado → envia tutorial + menu
      else {
        await tg("sendMessage", {
          chat_id: chatId,
          text: `🎓 CENTRAL DE TUTORIAIS TB-BASS IR (PC)

📌 Instalação do M-Effects + Importar IR (PC) TANK-B
https://youtu.be/bKM6qGswkdw

📌 Instalação do Cube Suite (PC)
https://youtu.be/o-BfRDqeFhs

📌 Como importar IR pela DAW REAPER
https://youtube.com/shorts/M37welAi-CI?si=pOU3GhKIWnv8_fp1

📌 Tutorial de instalação do app para celular TANK-B
https://youtu.be/RkVB4FQm0Nw

Digite /menu para voltar.`,
        });
      }
    }

    // ====== BOTÕES DO MENU ======
    else if (text === "🎓 tutorial") {
      await tg("sendMessage", {
        chat_id: chatId,
        text: "Digite /tutorial para acessar a central de tutoriais.",
      });
    }

    else if (text === "📦 produtos") {
      await tg("sendMessage", {
        chat_id: chatId,
        text: "🌐 Site oficial:\nhttps://tbbassir.com.br",
      });
    }

    else if (text === "💬 suporte") {
      await tg("sendMessage", {
        chat_id: chatId,
        text: "Envie sua dúvida que nossa equipe irá responder.",
      });
    }

    // ====== IGNORA MENSAGENS NO GRUPO QUE NÃO SÃO COMANDO ======
    else {
      if (chatType === "private") {
        await tg("sendMessage", {
          chat_id: chatId,
          text: `Recebi: ${msg.text}`,
        });
      }
    }

    res.sendStatus(200);
  } catch (e) {
    console.error("Webhook error:", e);
    res.sendStatus(200);
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log("Listening on", port));
