// Assinatura digital da comanda: o pedido vira um link com "selo" (HMAC).
// Se qualquer letra do pedido for alterada, o selo não confere e a comanda mostra "ALTERADO".
const crypto = require("crypto");
const zlib = require("zlib");

function segredo() {
  const base = process.env.COMANDA_SECRET || process.env.MP_ACCESS_TOKEN;
  if (!base) throw new Error("Sem segredo para assinar (configure MP_ACCESS_TOKEN ou COMANDA_SECRET).");
  return crypto.createHash("sha256").update("bravio-comanda:" + base).digest();
}
const b64u = buf => Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = s => Buffer.from(String(s).replace(/-/g, "+").replace(/_/g, "/"), "base64");

function assinar(obj) {
  const corpo = b64u(zlib.deflateRawSync(Buffer.from(JSON.stringify(obj)), { level: 9 }));
  const selo = b64u(crypto.createHmac("sha256", segredo()).update(corpo).digest().subarray(0, 12));
  return { token: corpo + "." + selo, codigo: selo.slice(0, 6).toUpperCase() };
}

function verificar(token) {
  const [corpo, selo] = String(token || "").split(".");
  if (!corpo || !selo) return { valido: false };
  const esperado = b64u(crypto.createHmac("sha256", segredo()).update(corpo).digest().subarray(0, 12));
  const a = Buffer.from(selo), b = Buffer.from(esperado);
  const valido = a.length === b.length && crypto.timingSafeEqual(a, b);
  let pedido = null;
  try { pedido = JSON.parse(zlib.inflateRawSync(unb64u(corpo)).toString("utf8")); } catch (e) {}
  return { valido: valido && !!pedido, pedido, codigo: esperado.slice(0, 6).toUpperCase() };
}

module.exports = { assinar, verificar };
