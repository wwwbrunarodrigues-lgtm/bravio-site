// Monta e valida o pedido no servidor (preços e frete recalculados a partir do catalogo.js)
const CAT = require("../../public/catalogo.js");

function montarPedido(b) {
  const c = b.cliente || {};
  if (!Array.isArray(b.itens) || !b.itens.length) throw new Error("Sacola vazia.");
  for (const k of ["nome", "fone", "rua", "numero", "bairro"]) if (!String(c[k] || "").trim()) throw new Error("Dados de entrega incompletos.");
  const itens = b.itens.slice(0, 60).map(CAT.precificar);
  const subtotal = CAT.r2(itens.reduce((s, i) => s + i.total, 0));
  if (CAT.CONFIG.pedidoMinimo && subtotal < CAT.CONFIG.pedidoMinimo) throw new Error("Pedido abaixo do mínimo.");
  const lat = Number(b.entrega && b.entrega.lat), lng = Number(b.entrega && b.entrega.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error("Calcule o frete antes de pagar.");
  const frete = CAT.taxaPorKm(CAT.distanciaKm(lat, lng), subtotal);
  if (!frete.atende) throw new Error("Endereço fora da área de entrega.");
  const total = CAT.r2(subtotal + frete.taxa);
  const pedido = "BR" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
  const endereco = `${c.rua}, ${c.numero}${c.comp ? " - " + c.comp : ""} - ${c.bairro}`;
  return { c, itens, subtotal, frete, total, pedido, endereco };
}

module.exports = { montarPedido };
