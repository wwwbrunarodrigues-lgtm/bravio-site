// /api/pedidos — usado pelo painel da loja (protegido pela senha PAINEL_SENHA)
// GET  ?dia=2026-10-10           → lista os pedidos do dia
// POST { dia, pedido, status }   → muda o status (novo, preparo, saiu, entregue, cancelado)
const crypto = require("crypto");
const { abrir, hojeBR } = require("../lib/db.js");
const json = (code, body) => ({ statusCode: code, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(body) });
const STATUS = ["novo", "preparo", "saiu", "entregue", "cancelado"];

function autorizado(event) {
  const certa = process.env.PAINEL_SENHA || "";
  const h = event.headers || {};
  const enviada = String(h["x-senha"] || h["X-Senha"] || "");
  if (!certa) return false;
  const a = crypto.createHash("sha256").update(certa).digest(), b = crypto.createHash("sha256").update(enviada).digest();
  return crypto.timingSafeEqual(a, b);
}

exports.handler = async (event) => {
  if (!process.env.PAINEL_SENHA) return json(500, { erro: "Configure a variável PAINEL_SENHA na Netlify." });
  if (!autorizado(event)) return json(401, { erro: "Senha incorreta." });
  const db = abrir(event);
  const q = event.queryStringParameters || {};
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(q.dia || "") ? q.dia : hojeBR();

  if (event.httpMethod === "GET") {
    const chaves = await db.list(dia + "/");
    const lista = (await Promise.all(chaves.map(k => db.get(k)))).filter(Boolean).sort((a, b) => b.t - a.t);
    return json(200, { dia, pedidos: lista });
  }
  if (event.httpMethod === "POST") {
    let b; try { b = JSON.parse(event.body || "{}"); } catch { return json(400, { erro: "JSON inválido" }); }
    if (!STATUS.includes(b.status)) return json(400, { erro: "Status inválido" });
    const d = /^\d{4}-\d{2}-\d{2}$/.test(b.dia || "") ? b.dia : dia;
    const k = `${d}/${String(b.pedido || "").replace(/[^A-Z0-9]/gi, "")}`;
    const p = await db.get(k);
    if (!p) return json(404, { erro: "Pedido não encontrado" });
    p.st = b.status; p.h = (p.h || []).concat([[b.status, Date.now()]]);
    await db.set(k, p);
    return json(200, { ok: true, pedido: p });
  }
  return json(405, { erro: "Método não permitido" });
};
