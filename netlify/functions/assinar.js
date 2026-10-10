// POST /api/assinar — gera a comanda oficial (assinada) do pedido.
// Preços, frete e status do pagamento são conferidos aqui no servidor; o navegador não consegue falsificar.
const CAT = require("../../public/catalogo.js");
const { montarPedido } = require("../lib/pedido.js");
const { assinar } = require("../lib/assinatura.js");

const json = (code, body) => ({ statusCode: code, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const FORMAS = ["Pix", "Cartão de crédito", "Cartão de débito", "Dinheiro"];

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { erro: "Use POST" });
  let b; try { b = JSON.parse(event.body || "{}"); } catch { return json(400, { erro: "JSON inválido" }); }
  let p; try { p = montarPedido(b); } catch (e) { return json(400, { erro: e.message }); }

  const pg = b.pagamento || {};
  let pagamento;
  if (pg.modo === "online") {
    // Confere no Mercado Pago se o pagamento existe, está aprovado e bate com este pedido
    const token = process.env.MP_ACCESS_TOKEN;
    const id = String(pg.id || "").replace(/\D/g, "");
    if (!token || !id) return json(400, { erro: "Pagamento não informado." });
    const r = await fetch("https://api.mercadopago.com/v1/payments/" + id, { headers: { Authorization: "Bearer " + token } });
    const mp = await r.json().catch(() => ({}));
    if (!r.ok || mp.status !== "approved") return json(400, { erro: "Pagamento não aprovado." });
    if (Math.abs(Number(mp.transaction_amount) - p.total) > 0.01) return json(400, { erro: "Valor pago não confere com o pedido." });
    p.pedido = mp.external_reference || p.pedido;
    pagamento = { m: "online", d: mp.payment_type_id === "bank_transfer" ? "Pix" : mp.payment_type_id === "debit_card" ? "Cartão de débito" : "Cartão de crédito", id: mp.id };
  } else {
    const forma = FORMAS.includes(pg.forma) ? pg.forma : "Pix";
    const troco = forma === "Dinheiro" && Number(pg.troco) > 0 ? CAT.r2(Number(pg.troco)) : 0;
    pagamento = { m: "entrega", d: forma, troco };
  }

  const c = p.c;
  const corta = (v, n) => String(v || "").trim().slice(0, n);
  const comanda = {
    v: 1,
    p: p.pedido,
    t: Date.now(),
    i: p.itens.map(i => [i.qty, i.nome, i.unit, i.total, i.opts.map(o => `${o.g}: ${o.v.join(", ")}`), i.obs]),
    s: p.subtotal, f: p.frete.taxa, km: p.frete.km, tot: p.total,
    c: { n: corta(c.nome, 60), f: corta(c.fone, 20), e: corta(`${c.rua}, ${c.numero}${c.comp ? " - " + c.comp : ""}`, 140), b: corta(c.bairro, 60), r: corta(c.ref, 100), cep: corta(b.cep, 9) },
    o: corta(c.obs, 200),
    pg: pagamento,
    g: [CAT.r2(Number(b.entrega.lat) * 1e4) / 1e4, CAT.r2(Number(b.entrega.lng) * 1e4) / 1e4]
  };
  const { token, codigo } = assinar(comanda);
  const site = (process.env.SITE_URL || process.env.URL || "").replace(/\/$/, "");
  return json(200, { ok: true, pedido: comanda.p, codigo, link: `${site}/comanda.html#${token}` });
};
