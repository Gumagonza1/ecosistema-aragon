'use strict';
// ── TELEGRAM DISPATCHER — Ecosistema Aragón ────────────────────────────────────
// Lee mensajes_queue (DB compartida con bot-tacos y orquestador) y los reenvía
// al admin vía Telegram. Las propuestas y alertas llevan botones Aprobar/Rechazar.
// Las respuestas del admin se escriben de vuelta en mensajes_responses con el
// ID correcto para que cada sistema las procese independientemente.
//
// Routing de respuestas:
//   Orquestador  → id='orch'          (lee en approval/cola.js)
//   Monitor      → id=<item_id>       (lee en agente_monitor.js)
//   Comandos     → id='cmd-[comando]' (lee en agente_monitor.js → procesarComandoAdmin)
//   Texto libre  → id='conv-[ts]'     (lee en agente_monitor.js → procesarConversacionLibre)
// ──────────────────────────────────────────────────────────────────────────────

const TelegramBot = require('node-telegram-bot-api');
const Database    = require('better-sqlite3');
const fs          = require('fs');
require('dotenv').config();

// ── CONFIG ─────────────────────────────────────────────────────────────────────
const TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = String(process.env.TELEGRAM_ADMIN_CHAT_ID || '');
const DB_PATH = process.env.MENSAJES_DB_PATH;

if (!TOKEN || !CHAT_ID || !DB_PATH) {
  console.error('[telegram] Faltan variables: TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_CHAT_ID, MENSAJES_DB_PATH');
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });
const db  = new Database(DB_PATH, { timeout: 5000 });
db.pragma('journal_mode = WAL');

// ── ESTADO ─────────────────────────────────────────────────────────────────────
// tgMsgId → { id: string }  (para saber qué item de cola corresponde a cada msg)
const mapaMsg = new Map();

// ── FORMATO ───────────────────────────────────────────────────────────────────
function fmt(texto) {
  return String(texto || '').slice(0, 4096);
}

// ── DETECCIÓN DE PROPUESTAS ────────────────────────────────────────────────────
// Propuesta del orquestador: contiene "Propuesta #N" + "aprobar" + "rechazar"
function detectarOrch(texto) {
  const m = texto.match(/Propuesta #(\d+)/i);
  return (m && texto.includes('aprobar') && texto.includes('rechazar')) ? m[1] : null;
}

// Propuesta/alerta del monitor: contiene "Buscar:" o instrucciones !m si/no
function detectarMonitor(texto) {
  return (texto.includes('Buscar:') && texto.includes('Reemplazar')) ||
         texto.includes('!m si') ||
         texto.includes('Propuesta #') && texto.includes('!m si');
}

// ── ENVIAR ITEM A TELEGRAM ─────────────────────────────────────────────────────
async function enviarItem(item) {
  const { id, tipo, mensaje, file_path, caption } = item;

  if (tipo === 'grafica' || tipo === 'imagen') {
    const ruta = file_path || mensaje;
    if (ruta && fs.existsSync(ruta)) {
      const sent = await bot.sendPhoto(CHAT_ID, ruta, {
        caption: String(caption || '').slice(0, 1024),
      });
      mapaMsg.set(sent.message_id, { id });
    } else {
      await bot.sendMessage(CHAT_ID, `[Gráfica no disponible: ${ruta}]`);
    }
    return;
  }

  if (tipo === 'audio') {
    const ruta = file_path || mensaje;
    if (ruta && fs.existsSync(ruta)) {
      const sent = await bot.sendAudio(CHAT_ID, ruta, {
        caption: String(caption || '').slice(0, 1024),
      });
      mapaMsg.set(sent.message_id, { id });
    } else {
      await bot.sendMessage(CHAT_ID, `[Audio no disponible: ${ruta}]`);
    }
    return;
  }

  // Texto
  const texto  = fmt(mensaje);
  const orchId = detectarOrch(texto);
  const esMonP = !orchId && detectarMonitor(texto);

  const opts = { parse_mode: 'Markdown' };

  if (orchId) {
    opts.reply_markup = {
      inline_keyboard: [[
        { text: '✅ Aprobar', callback_data: `orch_aprobar_${orchId}` },
        { text: '❌ Rechazar', callback_data: `orch_rechazar_${orchId}` },
      ]],
    };
  } else if (esMonP) {
    // Embebemos el id del item en el callback para hacer el routing exacto
    const safeId = id.slice(0, 32); // Telegram max callback_data = 64 bytes
    opts.reply_markup = {
      inline_keyboard: [[
        { text: '✅ Aplicar', callback_data: `mon_si_${safeId}` },
        { text: '❌ Omitir',  callback_data: `mon_no_${safeId}` },
      ]],
    };
  }

  const sent = await bot.sendMessage(CHAT_ID, texto, opts);
  mapaMsg.set(sent.message_id, { id });
}

// ── HELPERS DB ────────────────────────────────────────────────────────────────
function marcarEnviado(id) {
  db.prepare('UPDATE mensajes_queue SET enviado = 1 WHERE id = ?').run(id);
}

function escribirResponse(id, texto) {
  db.prepare(
    'INSERT INTO mensajes_responses (id, texto, ts, procesado) VALUES (?, ?, ?, 0)'
  ).run(id, texto, Date.now());
}

// ── POLLING DE LA COLA ─────────────────────────────────────────────────────────
let enviando = false;

async function procesarCola() {
  if (enviando) return;
  enviando = true;
  try {
    const items = db.prepare(
      'SELECT * FROM mensajes_queue WHERE enviado = 0 ORDER BY ts ASC LIMIT 5'
    ).all();

    for (const item of items) {
      try {
        await enviarItem(item);
        marcarEnviado(item.id);
      } catch (err) {
        console.error(`[telegram] Error enviando [${item.id}]:`, err.message);
      }
    }
  } catch (err) {
    console.error('[telegram] Error leyendo cola:', err.message);
  } finally {
    enviando = false;
  }
}

// ── CALLBACKS (botones inline) ─────────────────────────────────────────────────
bot.on('callback_query', async (query) => {
  const { data, message } = query;
  try {
    if (data.startsWith('orch_aprobar_') || data.startsWith('orch_rechazar_')) {
      // data = 'orch_aprobar_5'  →  accion='aprobar'  id='5'
      const [, accion, ...resto] = data.split('_');
      const propId = resto.join('_');
      escribirResponse('orch', `${accion} ${propId}`);
      await bot.answerCallbackQuery(query.id, { text: `Propuesta ${propId} ${accion}da ✓` });

    } else if (data.startsWith('mon_si_') || data.startsWith('mon_no_')) {
      // data = 'mon_si_M3'  →  accion='si'  itemId='M3'
      const prefixLen = 'mon_si_'.length; // mismo largo que 'mon_no_'
      const accion    = data.slice(4, 6); // 'si' o 'no'
      const itemId    = data.slice(prefixLen);
      escribirResponse(itemId, accion);
      await bot.answerCallbackQuery(query.id, {
        text: accion === 'si' ? 'Cambio aplicado ✓' : 'Cambio omitido',
      });
    }

    // Quitar botones del mensaje para evitar doble-click
    await bot.editMessageReplyMarkup(
      { inline_keyboard: [] },
      { chat_id: message.chat.id, message_id: message.message_id }
    ).catch(() => {});
  } catch (err) {
    console.error('[telegram] Error en callback:', err.message);
    await bot.answerCallbackQuery(query.id, { text: 'Error' }).catch(() => {});
  }
});

// ── MENSAJES DE TEXTO DEL ADMIN ────────────────────────────────────────────────
const CMDS_MONITOR = new Set(['reporte', 'estado', 'propuestas', 'reiniciar']);

bot.on('message', (msg) => {
  if (String(msg.chat.id) !== CHAT_ID) return;
  if (!msg.text || msg.text.startsWith('/')) return;

  const texto = msg.text.trim();

  // !o aprobar N  /  !o rechazar N  → orquestador
  const matchO = texto.match(/^!o\s+(aprobar|rechazar)\s+(\S+)/i);
  if (matchO) {
    escribirResponse('orch', `${matchO[1].toLowerCase()} ${matchO[2]}`);
    return;
  }

  // !m [comando]  → monitor
  const matchM = texto.match(/^!m\s+(.+)/i);
  if (matchM) {
    const cmd = matchM[1].trim().toLowerCase();
    if (CMDS_MONITOR.has(cmd)) {
      // Comando especial: el monitor lo detecta por id='cmd-*'
      escribirResponse(`cmd-${cmd}`, cmd);
    } else {
      // Texto libre o si/no sin botones → lo entrega como conversación
      escribirResponse(`conv-${Date.now()}`, matchM[1].trim());
    }
    return;
  }

  // Texto libre sin prefijo → se trata como instrucción al monitor
  escribirResponse(`conv-${Date.now()}`, texto);
});

// ── COMANDOS /telegram ────────────────────────────────────────────────────────
bot.onText(/^\/reporte/,    () => escribirResponse('cmd-reporte',    'reporte'));
bot.onText(/^\/estado/,     () => escribirResponse('cmd-estado',     'estado'));
bot.onText(/^\/propuestas/, () => escribirResponse('cmd-propuestas', 'propuestas'));

bot.onText(/^\/start/, async () => {
  await bot.sendMessage(CHAT_ID,
    '*Aragón Ops Bot* activo ✓\n\n' +
    'Comandos rápidos:\n' +
    '/estado — estado del monitor\n' +
    '/reporte — análisis profundo\n' +
    '/propuestas — propuestas pendientes\n\n' +
    'Prefijos de texto:\n' +
    '`!m [instrucción]` — monitor\n' +
    '`!o aprobar N` / `!o rechazar N` — orquestador',
    { parse_mode: 'Markdown' }
  );
});

// ── INICIO ─────────────────────────────────────────────────────────────────────
setInterval(procesarCola, 2000);
procesarCola();
console.log(`[telegram] Dispatcher iniciado — CHAT_ID: ${CHAT_ID}`);
