// GET  /api/loja                       → { aberto, fechaTxt / abreTxt, diaAbre, manual }
// POST /api/loja { modo } (x-senha)    → modo: "fechado" (fecha agora), "aberto" (abre agora) ou "auto"
const crypto = require("crypto");
const CAT = require("../../public/catalogo.js");
const { abrir } = require("../lib/db.js");
const { situacao } = require("../lib/loja.js");
const json = (code, body) => ({ statusCode: code, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(body) });

function autorizado(event) {
  const certa = process.env.PAINEL_SENHA || "";
  const h = event.headers || {};
  const enviada = String(h["x-senha"] || h["X-Senha"] || "");
  if (!certa) return false;
  return crypto.timingSafeEqual(crypto.createHash("sha256").update(certa).digest(), crypto.createHash("sha256").update(enviada).digest());
}

exports.handler = async (event) => {
  if (event.httpMethod === "GET") return json(200, await situacao(event));
  if (event.httpMethod !== "POST") return json(405, { erro: "Método não permitido" });
  if (!autorizado(event)) return json(401, { erro: "Senha incorreta." });
  let b; try { b = JSON.parse(event.body || "{}"); } catch { return json(400, { erro: "JSON inválido" }); }
  const db = abrir(event), agora = Date.now();
  if (b.modo === "auto") await db.set("_config/loja", { modo: "auto", ate: 0 });
  else if (b.modo === "fechado") {
    const h = CAT.statusHorario(agora);
    // fecha até o fim do turno de hoje (ou 6 horas, se estiver fora do horário)
    await db.set("_config/loja", { modo: "fechado", ate: agora + (h.aberto ? h.minRestantes : 360) * 60000 });
  } else if (b.modo === "aberto") await db.set("_config/loja", { modo: "aberto", ate: agora + 6 * 3600000 });
  else return json(400, { erro: "Modo inválido" });
  return json(200, CAT.statusLoja(await db.get("_config/loja"), agora));
};
