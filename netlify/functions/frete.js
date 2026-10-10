// POST /api/frete  { lat, lng }  ou  { cep, rua, numero, bairro, subtotal }
const CAT = require("../../public/catalogo.js");
const { geocodificar } = require("../lib/geo.js");

const json = (code, body) => ({ statusCode: code, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { erro: "Use POST" });
  let b; try { b = JSON.parse(event.body || "{}"); } catch { return json(400, { erro: "JSON inválido" }); }

  let pos = null, fonte = "gps";
  const lat = Number(b.lat), lng = Number(b.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    pos = { lat, lng };
  } else {
    fonte = "endereco";
    pos = await geocodificar({ rua: b.rua, numero: b.numero, bairro: b.bairro, cep: b.cep, cidade: CAT.CONFIG.cidade, uf: CAT.CONFIG.uf });
  }
  if (!pos) return json(200, { ok: false, erro: "Não encontramos esse endereço. Confira a rua e o número, ou use sua localização." });

  const km = CAT.distanciaKm(pos.lat, pos.lng);
  const r = CAT.taxaPorKm(km, Number(b.subtotal) || 0);
  return json(200, { ok: true, fonte, lat: pos.lat, lng: pos.lng, ...r });
};
