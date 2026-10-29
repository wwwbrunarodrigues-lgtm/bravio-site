// POST /api/evento { tipo, sid } — conta visitantes do cardápio (funil do próprio site, sem depender do Meta)
// Cada sessão conta 1 vez por dia em cada etapa: visita → sacola → checkout.
const { abrir, hojeBR } = require("../lib/db.js");
const json = (code, body) => ({ statusCode: code, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const TIPOS = ["visita", "sacola", "checkout"];

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { erro: "Use POST" });
  let b; try { b = JSON.parse(event.body || "{}"); } catch { return json(400, {}); }
  const tipo = String(b.tipo || ""), sid = String(b.sid || "").replace(/[^a-z0-9]/gi, "").slice(0, 24);
  if (!TIPOS.includes(tipo) || sid.length < 8) return json(400, {});
  try { await abrir(event).criar(`${hojeBR()}/ev/${tipo}/${sid}`, { t: Date.now(), o: String(b.origem || "").slice(0, 20) }); }
  catch (e) { console.error("evento:", e); }
  return json(200, { ok: true });
};
