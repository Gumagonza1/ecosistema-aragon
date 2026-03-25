'use strict';
// ── TELEGRAM DISPATCHER — Ecosistema Aragón ────────────────────────────────────
// Restaurado a la versión que funcionaba + !pmo + mirror al grupo + reintentos
// ──────────────────────────────────────────────────────────────────────────────

const TelegramBot = require('node-telegram-bot-api');
const Database    = require('better-sqlite3');
const fs          = require('fs');
require('dotenv').config();

// ── CONFIG ─────────────────────────────────────────────────────────────────────
const TOKEN    = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID  = String(process.env.TELEGRAM_ADMIN_CHAT_ID || '');
const DB_PATH  = process.env.MENSAJES_DB_PATH;
const GROUP_ID = String(process.env.TELEGRAM_GROUP_ID || '');

if (!TOKEN || !CHAT_ID || !DB_PATH) {
  console.error('[telegram] Faltan variables: TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_CHAT_ID, MENSAJES_DB_PATH');
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });
bot.on('polling_error', (err) => {
  console.error('[telegram] Polling error (no crash):', err.code || err.message);
});

const db  = new Database(DB_PATH, { timeout: 5000 });
db.pragma('journal_mode = WAL');

// ── TOPICS (para mirror al grupo) ───────────────────────────────────────────
const TOPICS = {
  general: 3, TacosAragon: 4, 'tacos-api': 5,
  'cfo-agent': 6, 'telegram-dispatcher': 7, MonitorBot: 8, portfolio: 9,
};

// Solo mensajes de PMO llegan al chat privado del admin.
// El resto se muestra solo en el mirror del grupo (para debugging).
// El PMO hace relay de orquestador/monitor/cfo re-etiquetándolos como 'pmo'.
const ORIGENES_PRIVADO = new Set(['pmo', 'monitor']);

function topicParaOrigen(origen, mensaje) {
  if (origen === 'pmo') {
    const lower = (mensaje || '').toLowerCase();
    if (lower.includes('tacosaragon') || lower.includes('bot')) return TOPICS.TacosAragon;
    if (lower.includes('tacos-api') || lower.includes('api') || lower.includes('ventas')) return TOPICS['tacos-api'];
    if (lower.includes('cfo') || lower.includes('fiscal')) return TOPICS['cfo-agent'];
    if (lower.includes('telegram')) return TOPICS['telegram-dispatcher'];
    if (lower.includes('monitor')) return TOPICS.MonitorBot;
    if (lower.includes('portfolio')) return TOPICS.portfolio;
    return TOPICS.general;
  }
  if (origen === 'orquestador') return TOPICS.general;
  if (origen === 'monitor') return TOPICS.MonitorBot;
  if (origen === 'bot') return TOPICS.TacosAragon;
  return TOPICS.general;
}

// ── ESTADO ─────────────────────────────────────────────────────────────────────
const mapaMsg = new Map();
const reintentos = new Map();

// ── FORMATO ───────────────────────────────────────────────────────────────────
function fmt(texto) {
  return String(texto || '').slice(0, 4096);
}

// ── DETECCIÓN DE PROPUESTAS ────────────────────────────────────────────────────
function detectarOrch(texto) {
  const m = texto.match(/Propuesta #(\d+)/i);
  return (m && texto.includes('aprobar') && texto.includes('rechazar')) ? m[1] : null;
}

function detectarMonitor(texto) {
  return (texto.includes('Buscar:') && texto.includes('Reemplazar')) ||
         texto.includes('!m si') ||
         texto.includes('Propuesta #') && texto.includes('!m si');
}

// ── ENVIAR ITEM A TELEGRAM ─────────────────────────────────────────────────────
async function enviarItem(item) {
  const { id, tipo, mensaje, file_path, caption, origen } = item;
  const topicId = GROUP_ID ? topicParaOrigen(origen, mensaje) : null;

  if (tipo === 'grafica' || tipo === 'imagen') {
    const ruta = file_path || mensaje;
    const cap  = String(caption || '').slice(0, 1024);
    if (ruta && fs.existsSync(ruta)) {
      // Mirror al grupo siempre (todos los orígenes)
      if (GROUP_ID && topicId) {
        await bot.sendPhoto(GROUP_ID, ruta, { caption: cap, message_thread_id: topicId }).catch(() => {});
      }
      // Solo PMO llega al chat privado del admin
      if (!ORIGENES_PRIVADO.has(origen)) return;
      const sent = await bot.sendPhoto(CHAT_ID, ruta, { caption: cap });
      mapaMsg.set(sent.message_id, { id });
    } else {
      if (!ORIGENES_PRIVADO.has(origen)) return;
      await bot.sendMessage(CHAT_ID, `[Gráfica no disponible: ${ruta}]`);
    }
    return;
  }

  if (tipo === 'audio') {
    const ruta = file_path || mensaje;
    const cap  = String(caption || '').slice(0, 1024);
    if (ruta && fs.existsSync(ruta)) {
      // Mirror al grupo siempre (todos los orígenes)
      if (GROUP_ID && topicId) {
        await bot.sendAudio(GROUP_ID, ruta, { caption: cap, message_thread_id: topicId }).catch(() => {});
      }
      // Solo PMO llega al chat privado del admin
      if (!ORIGENES_PRIVADO.has(origen)) return;
      const sent = await bot.sendAudio(CHAT_ID, ruta, { caption: cap });
      mapaMsg.set(sent.message_id, { id });
    } else {
      if (!ORIGENES_PRIVADO.has(origen)) return;
      await bot.sendMessage(CHAT_ID, `[Audio no disponible: ${ruta}]`);
    }
    return;
  }

  // Texto
  let texto  = fmt(mensaje);
  const orchId = detectarOrch(texto);
  const esMonP = !orchId && detectarMonitor(texto);

  const opts = { parse_mode: 'Markdown' };

  // Detectar propuesta de autocorrect con botones
  const autoMatch = texto.match(/!!!AUTOCORRECT_BOTONES:(\S+)!!!/);

  if (autoMatch) {
    const propIdCorto = autoMatch[1];
    opts.reply_markup = {
      inline_keyboard: [[
        { text: '✅ Aplicar', callback_data: `auto_aplicar_${propIdCorto}` },
        { text: '🚫 Ignorar', callback_data: `auto_ignorar_${propIdCorto}` },
      ]],
    };
    // Quitar el marcador del texto visible
    texto = texto.replace(/\n?!!!AUTOCORRECT_BOTONES:\S+!!!/, '');
  } else if (orchId) {
    opts.reply_markup = {
      inline_keyboard: [[
        { text: '✅ Aprobar', callback_data: `orch_aprobar_${orchId}` },
        { text: '❌ Rechazar', callback_data: `orch_rechazar_${orchId}` },
      ]],
    };
  } else if (esMonP) {
    const safeId = id.slice(0, 32);
    opts.reply_markup = {
      inline_keyboard: [[
        { text: '✅ Aplicar', callback_data: `mon_si_${safeId}` },
        { text: '❌ Omitir',  callback_data: `mon_no_${safeId}` },
      ]],
    };
  }

  // Mirror al grupo siempre (todos los orígenes, sin botones ni Markdown)
  if (GROUP_ID && topicId) {
    await bot.sendMessage(GROUP_ID, texto.replace(/[*_`\[]/g, ''), { message_thread_id: topicId }).catch(() => {});
  }

  // Solo PMO llega al chat privado del admin
  if (!ORIGENES_PRIVADO.has(origen)) return;

  // Enviar al chat directo
  // Si Telegram rechaza el Markdown (entidades mal formadas), reintentar sin parse_mode
  let sent;
  try {
    sent = await bot.sendMessage(CHAT_ID, texto, opts);
  } catch (err) {
    if (err.message && err.message.includes('parse entities')) {
      const optsPlain = { ...opts };
      delete optsPlain.parse_mode;
      sent = await bot.sendMessage(CHAT_ID, texto, optsPlain);
    } else {
      throw err;
    }
  }
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
        reintentos.delete(item.id);
      } catch (err) {
        const count = (reintentos.get(item.id) || 0) + 1;
        reintentos.set(item.id, count);
        console.error(`[telegram] Error enviando [${item.id}] (${count}/3):`, err.message);
        if (count >= 3) {
          try {
            await bot.sendMessage(CHAT_ID, fmt(item.mensaje).replace(/[*_`\[]/g, ''), {});
          } catch {}
          marcarEnviado(item.id);
          reintentos.delete(item.id);
        }
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
      const [, accion, ...resto] = data.split('_');
      const propId = resto.join('_');
      escribirResponse('orch', `${accion} ${propId}`);
      await bot.answerCallbackQuery(query.id, { text: `Propuesta ${propId} ${accion}da ✓` });

    } else if (data.startsWith('auto_aplicar_') || data.startsWith('auto_ignorar_')) {
      // Autocorrect: auto_aplicar_7d18b579 o auto_ignorar_7d18b579
      const accion = data.startsWith('auto_aplicar_') ? 'aplicar' : 'ignorar';
      const propIdCorto = data.split('_').slice(2).join('_');
      escribirResponse(`pmo-${Date.now()}`, `${accion} ${propIdCorto}`);
      await bot.answerCallbackQuery(query.id, {
        text: accion === 'aplicar' ? '✅ Aplicando fix...' : '🚫 Ignorado',
      });

    } else if (data.startsWith('mon_si_') || data.startsWith('mon_no_')) {
      const prefixLen = 'mon_si_'.length;
      const accion    = data.slice(4, 6);
      const itemId    = data.slice(prefixLen);
      escribirResponse(itemId, accion);
      await bot.answerCallbackQuery(query.id, {
        text: accion === 'si' ? 'Cambio aplicado ✓' : 'Cambio omitido',
      });
    }

    await bot.editMessageReplyMarkup(
      { inline_keyboard: [] },
      { chat_id: message.chat.id, message_id: message.message_id }
    ).catch(() => {});
  } catch (err) {
    console.error('[telegram] Error en callback:', err.message);
    await bot.answerCallbackQuery(query.id, { text: 'Error' }).catch(() => {});
  }
});

// ── CONSULTAS DIRECTAS A APIs (sin Claude, sin MCP) ────────────────────────────
const http = require('http');

const API_TOKEN = '3892222633274f0283e5e35151d590feaa443ce1b83e23895b6625a8c1ea172c';
const CFO_TOKEN = '852892ce80f0ccf2d47289e8bf7d8806f56b9e6f377a0708ae01e2b2ac9c4d4b';

function apiCall(port, path, token) {
  return new Promise((resolve) => {
    const req = http.get({
      hostname: 'localhost', port, path,
      headers: { 'x-api-token': token },
      timeout: 15000,
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve({ raw: data }); }
      });
    });
    req.on('error', e => resolve({ error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ error: 'Timeout' }); });
  });
}

const $ = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

function fmtResumen(data, titulo) {
  if (data.error) return `❌ ${data.error}`;
  const r = data;
  const top = (r.topProductos || []).slice(0, 5).map((p, i) =>
    `  ${i + 1}. ${p.nombre}: ${p.cantidad}`
  ).join('\n');
  const canales = Object.entries(r.porCanal || {}).map(([k, v]) => `  ${k}: ${v}`).join('\n');
  const pagos = Object.entries(r.porPago || {}).map(([k, v]) => `  ${k}: ${$(v)}`).join('\n');
  return [
    `📊 ${titulo}`,
    `${r.periodo ? r.periodo.desde + ' → ' + r.periodo.hasta : ''}`,
    ``,
    `Total: ${$(r.total)} (${r.pedidos} pedidos)`,
    `Ticket promedio: ${$(r.ticketPromedio)}`,
    r.totalReembolso ? `Reembolsos: ${$(r.totalReembolso)} (${r.reembolsos || r.reembolsosCount || 0})` : '',
    ``,
    `Métodos de pago:`,
    pagos || '  (sin datos)',
    ``,
    `Canales:`,
    canales || '  (sin datos)',
    ``,
    `Top 5 productos:`,
    top || '  (sin datos)',
  ].filter(Boolean).join('\n');
}

function fmtDashboard(data, seccion) {
  if (data.error) return `❌ ${data.error}`;
  const s = data[seccion];
  if (!s) return `Sin datos para "${seccion}"`;
  const top = (s.topProductos || []).slice(0, 5).map((p, i) =>
    `  ${i + 1}. ${p.nombre}: ${p.cantidad}`
  ).join('\n');
  const label = seccion === 'hoy' ? 'Hoy' : seccion === 'semana' ? 'Esta semana' : 'Este mes';
  return [
    `📊 Ventas ${label}`,
    ``,
    `Total: ${$(s.total)} (${s.pedidos} pedidos)`,
    `Ticket promedio: ${$(s.ticketPromedio)}`,
    s.totalReembolso ? `Reembolsos: ${$(s.totalReembolso)}` : '',
    ``,
    `Top productos:`,
    top || '  (sin ventas)',
  ].filter(Boolean).join('\n');
}

// Slash commands nativos de datos
bot.onText(/^\/ventas_hoy/,    async () => {
  const d = await apiCall(3001, '/api/dashboard', API_TOKEN);
  await bot.sendMessage(CHAT_ID, fmtDashboard(d, 'hoy'));
});
bot.onText(/^\/ventas_ayer/,   async () => {
  const d = await apiCall(3001, '/api/ventas/resumen?periodo=ayer', API_TOKEN);
  await bot.sendMessage(CHAT_ID, fmtResumen(d, 'Ventas de ayer'));
});
bot.onText(/^\/ventas_semana/, async () => {
  const d = await apiCall(3001, '/api/dashboard', API_TOKEN);
  await bot.sendMessage(CHAT_ID, fmtDashboard(d, 'semana'));
});
bot.onText(/^\/ventas_mes/,    async () => {
  const d = await apiCall(3001, '/api/dashboard', API_TOKEN);
  await bot.sendMessage(CHAT_ID, fmtDashboard(d, 'mes'));
});
bot.onText(/^\/ventas_fecha\s+(\S+)/, async (msg, match) => {
  const fecha = match[1]; // YYYY-MM-DD o DD
  let desde, hasta;
  if (fecha.length <= 2) {
    const hoy = new Date(); const a = hoy.getFullYear(); const m = String(hoy.getMonth()+1).padStart(2,'0');
    desde = hasta = `${a}-${m}-${fecha.padStart(2,'0')}`;
  } else {
    desde = hasta = fecha;
  }
  const d = await apiCall(3001, `/api/ventas/resumen?desde=${desde}&hasta=${hasta}`, API_TOKEN);
  await bot.sendMessage(CHAT_ID, fmtResumen(d, `Ventas del ${desde}`));
});
bot.onText(/^\/ventas_rango\s+(\S+)\s+(\S+)/, async (msg, match) => {
  const d = await apiCall(3001, `/api/ventas/resumen?desde=${match[1]}&hasta=${match[2]}`, API_TOKEN);
  await bot.sendMessage(CHAT_ID, fmtResumen(d, `Ventas ${match[1]} → ${match[2]}`));
});
bot.onText(/^\/productos_hoy/, async () => {
  const d = await apiCall(3001, '/api/ventas/por-producto?periodo=hoy', API_TOKEN);
  const items = (Array.isArray(d) ? d : []).slice(0, 15).map((p, i) =>
    `${i + 1}. ${p.nombre}: ${p.cantidad} (${$(p.total)})`
  ).join('\n');
  await bot.sendMessage(CHAT_ID, `🌮 Productos vendidos hoy\n\n${items || '(sin ventas)'}`);
});
bot.onText(/^\/productos_semana/, async () => {
  const d = await apiCall(3001, '/api/ventas/por-producto?periodo=semana', API_TOKEN);
  const items = (Array.isArray(d) ? d : []).slice(0, 15).map((p, i) =>
    `${i + 1}. ${p.nombre}: ${p.cantidad} (${$(p.total)})`
  ).join('\n');
  await bot.sendMessage(CHAT_ID, `🌮 Productos de la semana\n\n${items || '(sin ventas)'}`);
});
bot.onText(/^\/pagos/, async () => {
  const d = await apiCall(3001, '/api/ventas/tipos-pago?periodo=semana', API_TOKEN);
  const items = Object.entries(d || {}).map(([k, v]) => `  ${k}: ${$(v)}`).join('\n');
  await bot.sendMessage(CHAT_ID, `💳 Tipos de pago (semana)\n\n${items || '(sin datos)'}`);
});
bot.onText(/^\/empleados/, async () => {
  const d = await apiCall(3001, '/api/ventas/empleados-ventas?periodo=semana', API_TOKEN);
  const items = (Array.isArray(d) ? d : []).map(e =>
    `  ${e.nombre || e.employee_id}: ${e.pedidos} pedidos, ${$(e.total)}`
  ).join('\n');
  await bot.sendMessage(CHAT_ID, `👥 Empleados (semana)\n\n${items || '(sin datos)'}`);
});
bot.onText(/^\/whatsapp/, async () => {
  const d = await apiCall(3001, '/api/whatsapp/stats', API_TOKEN);
  await bot.sendMessage(CHAT_ID, `📱 WhatsApp Stats\n\n${JSON.stringify(d, null, 2).slice(0, 3500)}`);
});
bot.onText(/^\/cfo_ingresos/, async () => {
  const d = await apiCall(3002, '/api/contabilidad/ingresos', CFO_TOKEN);
  const items = (Array.isArray(d) ? d : []).slice(-10).map(i =>
    `  ${i.fecha || ''} ${i.tipo || ''}: ${$(i.monto)}`
  ).join('\n');
  await bot.sendMessage(CHAT_ID, `💰 Últimos ingresos\n\n${items || '(sin datos)'}`);
});
bot.onText(/^\/cfo_gastos/, async () => {
  const d = await apiCall(3002, '/api/contabilidad/gastos', CFO_TOKEN);
  const items = (Array.isArray(d) ? d : []).slice(-10).map(g =>
    `  ${g.fecha || ''} ${g.tipo || ''}: ${$(g.monto)}`
  ).join('\n');
  await bot.sendMessage(CHAT_ID, `📉 Últimos gastos\n\n${items || '(sin datos)'}`);
});
bot.onText(/^\/cfo_inventario/, async () => {
  const d = await apiCall(3002, '/api/inventario', CFO_TOKEN);
  const items = (Array.isArray(d) ? d : []).slice(0, 15).map(i =>
    `  ${i.nombre}: ${i.cantidad} (min: ${i.minimo || '-'}) ${$(i.cantidad * (i.costo_unitario || 0))}`
  ).join('\n');
  await bot.sendMessage(CHAT_ID, `📦 Inventario\n\n${items || '(sin datos)'}`);
});

// Estado de resultados (calculado, sin IA)
bot.onText(/^\/estado_resultados/, async () => {
  const ingresos = await apiCall(3002, '/api/contabilidad/ingresos', CFO_TOKEN);
  const gastos   = await apiCall(3002, '/api/contabilidad/gastos', CFO_TOKEN);

  if (ingresos.error || gastos.error) {
    await bot.sendMessage(CHAT_ID, `❌ Error: ${ingresos.error || gastos.error}`);
    return;
  }

  const arrIng = Array.isArray(ingresos) ? ingresos : [];
  const arrGas = Array.isArray(gastos) ? gastos : [];

  const totalIng = arrIng.reduce((s, i) => s + (i.monto || 0), 0);
  const totalGas = arrGas.reduce((s, g) => s + (g.monto || 0), 0);
  const utilidad = totalIng - totalGas;
  const margen = totalIng > 0 ? ((utilidad / totalIng) * 100).toFixed(1) : '0';

  // Agrupar ingresos por tipo
  const ingPorTipo = {};
  arrIng.forEach(i => { ingPorTipo[i.tipo || 'otros'] = (ingPorTipo[i.tipo || 'otros'] || 0) + i.monto; });

  // Agrupar gastos por tipo
  const gasPorTipo = {};
  arrGas.forEach(g => { gasPorTipo[g.tipo || 'otros'] = (gasPorTipo[g.tipo || 'otros'] || 0) + g.monto; });

  const fmtIng = Object.entries(ingPorTipo).map(([k, v]) => `  ${k}: ${$(v)}`).join('\n');
  const fmtGas = Object.entries(gasPorTipo).map(([k, v]) => `  ${k}: ${$(v)}`).join('\n');

  await bot.sendMessage(CHAT_ID, [
    `📋 ESTADO DE RESULTADOS`,
    `Registros: ${arrIng.length} ingresos, ${arrGas.length} gastos`,
    ``,
    `INGRESOS: ${$(totalIng)}`,
    fmtIng,
    ``,
    `GASTOS: ${$(totalGas)}`,
    fmtGas,
    ``,
    `━━━━━━━━━━━━━━━━━━`,
    `UTILIDAD: ${$(utilidad)}`,
    `MARGEN: ${margen}%`,
  ].join('\n'));
});

// Análisis profundo (resumen ejecutivo de todo)
bot.onText(/^\/analisis_profundo/, async () => {
  await bot.sendMessage(CHAT_ID, '⏳ Generando análisis profundo...');

  const [dashboard, ingresos, gastos, inventario] = await Promise.all([
    apiCall(3001, '/api/dashboard', API_TOKEN),
    apiCall(3002, '/api/contabilidad/ingresos', CFO_TOKEN),
    apiCall(3002, '/api/contabilidad/gastos', CFO_TOKEN),
    apiCall(3002, '/api/inventario', CFO_TOKEN),
  ]);

  const arrIng = Array.isArray(ingresos) ? ingresos : [];
  const arrGas = Array.isArray(gastos) ? gastos : [];
  const arrInv = Array.isArray(inventario) ? inventario : [];

  const totalIng = arrIng.reduce((s, i) => s + (i.monto || 0), 0);
  const totalGas = arrGas.reduce((s, g) => s + (g.monto || 0), 0);
  const valorInv = arrInv.reduce((s, i) => s + ((i.cantidad || 0) * (i.costo_unitario || 0)), 0);
  const bajoMin = arrInv.filter(i => i.minimo > 0 && i.cantidad < i.minimo);

  const h = dashboard.hoy || {};
  const s = dashboard.semana || {};
  const m = dashboard.mes || {};

  const topMes = (m.topProductos || []).slice(0, 5).map((p, i) =>
    `  ${i + 1}. ${p.nombre}: ${p.cantidad}`
  ).join('\n');

  await bot.sendMessage(CHAT_ID, [
    `📊 ANÁLISIS PROFUNDO — Tacos Aragón`,
    ``,
    `━━ VENTAS ━━`,
    `Hoy: ${$(h.total)} (${h.pedidos || 0} pedidos)`,
    `Semana: ${$(s.total)} (${s.pedidos || 0} pedidos)`,
    `Mes: ${$(m.total)} (${m.pedidos || 0} pedidos)`,
    `Ticket promedio: ${$(m.ticketPromedio)}`,
    ``,
    `Top 5 del mes:`,
    topMes || '  (sin datos)',
    ``,
    `━━ CONTABILIDAD ━━`,
    `Ingresos registrados: ${$(totalIng)} (${arrIng.length})`,
    `Gastos registrados: ${$(totalGas)} (${arrGas.length})`,
    `Utilidad: ${$(totalIng - totalGas)}`,
    `Margen: ${totalIng > 0 ? ((totalIng - totalGas) / totalIng * 100).toFixed(1) : '0'}%`,
    ``,
    `━━ INVENTARIO ━━`,
    `Items: ${arrInv.length}`,
    `Valor total: ${$(valorInv)}`,
    bajoMin.length > 0
      ? `⚠️ Bajo mínimo (${bajoMin.length}):\n` + bajoMin.map(i => `  ${i.nombre}: ${i.cantidad} (min: ${i.minimo})`).join('\n')
      : `✅ Todo sobre mínimo`,
  ].join('\n'));
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

  // !auto aplicar/ignorar/revertir ID → respuesta a propuesta de autocorrect
  const matchAuto = texto.match(/^!auto\s+(aplicar|ignorar|revertir)\s+(\S+)/i);
  if (matchAuto) {
    escribirResponse(`pmo-${Date.now()}`, `${matchAuto[1].toLowerCase()} ${matchAuto[2]}`);
    return;
  }

  // !pmo [instrucción]  → agente PMO (Claude Code + MCP servers)
  const matchPMO = texto.match(/^!pmo\s+(.+)/i);
  if (matchPMO) {
    const instruccion = matchPMO[1].trim();
    const instrId = `pmo-${Date.now()}`;

    // Transformar a XML: detectar proyecto en "proyecto: texto" o "proyecto texto"
    const matchProyecto = instruccion.match(/^([\w-]+)\s*[:–-]\s*(.+)/i);
    const xmlPayload = matchProyecto
      ? `<pmo_task proyecto="${matchProyecto[1].trim()}"><instruccion>${matchProyecto[2].trim()}</instruccion></pmo_task>`
      : `<userquery>${instruccion}</userquery>`;

    escribirResponse(instrId, xmlPayload);

    // Ack inmediato: confirmar que llegó a la base de datos
    db.prepare(
      "INSERT INTO mensajes_queue (id, tipo, mensaje, file_path, caption, origen, enviado, ts) VALUES (?, 'texto', ?, NULL, NULL, 'pmo', 0, ?)"
    ).run(`ack-${Date.now()}`, `📥 PMO — instrucción recibida:\n"${instruccion.slice(0, 120)}"`, Date.now());
    return;
  }

  // !m [comando]  → monitor
  const matchM = texto.match(/^!m\s+(.+)/i);
  if (matchM) {
    const cmd = matchM[1].trim().toLowerCase();
    if (CMDS_MONITOR.has(cmd)) {
      escribirResponse(`cmd-${cmd}`, cmd);
    } else {
      escribirResponse(`conv-${Date.now()}`, matchM[1].trim());
    }
    return;
  }

  // Texto libre sin prefijo → monitor
  escribirResponse(`conv-${Date.now()}`, texto);
});

// ── COMANDOS /telegram ────────────────────────────────────────────────────────
bot.onText(/^\/reporte/,       () => escribirResponse('cmd-reporte',    'reporte'));
bot.onText(/^\/estado/,        () => escribirResponse('cmd-estado',     'estado'));
bot.onText(/^\/propuestas/,    () => escribirResponse('cmd-propuestas', 'propuestas'));
bot.onText(/^\/revertir\s+(\S+)/, (msg, match) => {
  escribirResponse(`pmo-${Date.now()}`, `revertir ${match[1]}`);
});
bot.onText(/^\/pmo_proyectos/, () => escribirResponse(`pmo-${Date.now()}`, 'proyectos'));
bot.onText(/^\/pmo_sesion/,    () => escribirResponse(`pmo-${Date.now()}`, 'sesion'));
bot.onText(/^\/pmo_estado/,    () => escribirResponse(`pmo-${Date.now()}`, 'estado'));
bot.onText(/^\/pmo_reset/,     () => escribirResponse(`pmo-${Date.now()}`, 'nueva sesion'));
bot.onText(/^\/pmo_cancelar/,  () => escribirResponse(`pmo-cancel-${Date.now()}`, 'cancelar'));

bot.onText(/^\/start/, async () => {
  await bot.sendMessage(CHAT_ID,
    '*Aragón Ops Bot* activo ✓\n\n' +
    '*PMO (edita código):*\n' +
    '`!pmo [proyecto]: [instrucción]`\n' +
    '/pmo\\_proyectos — ver proyectos\n' +
    '/pmo\\_sesion — ver sesión activa\n' +
    '/pmo\\_estado — ejecuciones recientes\n' +
    '/pmo\\_reset — nueva sesión\n\n' +
    '*Monitor:*\n' +
    '/estado — estado del monitor\n' +
    '/reporte — análisis profundo\n' +
    '/propuestas — propuestas pendientes\n\n' +
    '*Texto libre:*\n' +
    '`!m [instrucción]` — monitor\n' +
    '`!o aprobar N` / `!o rechazar N` — orquestador',
    { parse_mode: 'Markdown' }
  );
});

// ── REGISTRAR COMANDOS ──────────────────────────────────────────────────────────
bot.setMyCommands([
  { command: 'start',             description: 'Mostrar todos los comandos' },
  { command: 'ventas_hoy',        description: '📊 Ventas de hoy' },
  { command: 'ventas_ayer',       description: '📊 Ventas de ayer' },
  { command: 'ventas_semana',     description: '📊 Ventas de la semana' },
  { command: 'ventas_mes',        description: '📊 Ventas del mes' },
  { command: 'ventas_fecha',      description: '📊 Ventas de fecha (ej: /ventas_fecha 2026-03-20)' },
  { command: 'ventas_rango',      description: '📊 Ventas rango (ej: /ventas_rango 2026-03-01 2026-03-15)' },
  { command: 'productos_hoy',     description: '🌮 Productos vendidos hoy' },
  { command: 'productos_semana',  description: '🌮 Productos de la semana' },
  { command: 'pagos',             description: '💳 Tipos de pago' },
  { command: 'empleados',         description: '👥 Ventas por empleado' },
  { command: 'cfo_ingresos',      description: '💰 Últimos ingresos' },
  { command: 'cfo_gastos',        description: '📉 Últimos gastos' },
  { command: 'cfo_inventario',    description: '📦 Inventario' },
  { command: 'estado_resultados', description: '📋 Estado de resultados (ingresos vs gastos)' },
  { command: 'analisis_profundo', description: '📊 Análisis profundo (ventas+contabilidad+inventario)' },
  { command: 'whatsapp',          description: '📱 Stats del bot WhatsApp' },
  { command: 'pmo_proyectos',     description: '🔧 PMO — Proyectos' },
  { command: 'pmo_sesion',        description: '🔧 PMO — Sesión activa' },
  { command: 'estado',            description: '👁 Monitor — Estado' },
  { command: 'reporte',           description: '👁 Monitor — Reporte' },
  { command: 'propuestas',        description: '👁 Monitor — Propuestas' },
]).catch(err => console.error('[telegram] Error registrando comandos:', err.message));

// ── INICIO ─────────────────────────────────────────────────────────────────────
setInterval(procesarCola, 2000);
procesarCola();
console.log(`[telegram] Dispatcher iniciado — CHAT_ID: ${CHAT_ID} GROUP: ${GROUP_ID || '(sin grupo)'}`);
