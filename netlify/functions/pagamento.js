// POST /api/pagamento — cria o pagamento no Mercado Pago (Checkout Pro: Pix e cartão)
// Os preços e o frete são RECALCULADOS aqui no servidor; o valor enviado pelo navegador é ignorado.
const CAT = require("../../public/catalogo.js");

const json = (code, body) => ({ statusCode: code, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { erro: "Use POST" });
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return json(500, { erro: "Pagamento online ainda não configurado (falta MP_ACCESS_TOKEN)." });

  let b; try { b = JSON.parse(event.body || "{}"); } catch { return json(400, { erro: "JSON inválido" }); }
  const c = b.cliente || {};
  if (!Array.isArray(b.itens) || !b.itens.length) return json(400, { erro: "Sacola vazia." });
  for (const k of ["nome", "fone", "rua", "numero", "bairro"]) if (!String(c[k] || "").trim()) return json(400, { erro: "Dados de entrega incompletos." });

  let itens;
  try { itens = b.itens.slice(0, 60).map(CAT.precificar); } catch (e) { return json(400, { erro: e.message }); }
  const subtotal = CAT.r2(itens.reduce((s, i) => s + i.total, 0));
  if (CAT.CONFIG.pedidoMinimo && subtotal < CAT.CONFIG.pedidoMinimo) return json(400, { erro: "Pedido abaixo do mínimo." });

  const lat = Number(b.entrega && b.entrega.lat), lng = Number(b.entrega && b.entrega.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return json(400, { erro: "Calcule o frete antes de pagar." });
  const frete = CAT.taxaPorKm(CAT.distanciaKm(lat, lng), subtotal);
  if (!frete.atende) return json(400, { erro: "Endereço fora da área de entrega." });
  const total = CAT.r2(subtotal + frete.taxa);

  const pedido = "BR" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
  const site = (process.env.SITE_URL || process.env.URL || "").replace(/\/$/, "");
  const endereco = `${c.rua}, ${c.numero}${c.comp ? " - " + c.comp : ""} - ${c.bairro}`;

  const pref = {
    items: [
      ...itens.map(i => ({ id: i.id, title: i.nome, description: i.opts.map(o => o.v.join(", ")).join(" | ").slice(0, 250) || i.nome, quantity: i.qty, unit_price: i.unit, currency_id: "BRL" })),
      ...(frete.taxa > 0 ? [{ id: "frete", title: `Taxa de entrega (${frete.km} km)`, quantity: 1, unit_price: frete.taxa, currency_id: "BRL" }] : [])
    ],
    payer: { name: String(c.nome).slice(0, 80), phone: { number: String(c.fone).replace(/\D/g, "") } },
    external_reference: pedido,
    statement_descriptor: "BRAVIO",
    back_urls: { success: site + "/", pending: site + "/", failure: site + "/" },
    auto_return: "approved",
    payment_methods: { installments: 1 },
    metadata: { pedido, cliente: c.nome, telefone: c.fone, endereco, total }
  };

  const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json", "X-Idempotency-Key": pedido },
    body: JSON.stringify(pref)
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.init_point) return json(502, { erro: "Não foi possível abrir o pagamento agora. Tente de novo ou escolha pagar na entrega." });

  return json(200, { ok: true, pedido, url: j.init_point, subtotal, frete: frete.taxa, km: frete.km, total });
};
