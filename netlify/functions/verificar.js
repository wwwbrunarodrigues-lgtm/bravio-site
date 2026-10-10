// POST /api/verificar { token } — confere o selo da comanda e devolve o pedido original
const { verificar } = require("../lib/assinatura.js");
const json = (code, body) => ({ statusCode: code, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(body) });

exports.handler = async (event) => {
  let b; try { b = JSON.parse(event.body || "{}"); } catch { return json(400, { erro: "JSON inválido" }); }
  try { return json(200, verificar(b.token)); }
  catch (e) { return json(500, { erro: e.message }); }
};
