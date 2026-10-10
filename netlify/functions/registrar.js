// POST /api/registrar — grava o pedido no painel da loja (como no iFood).
// Preços, frete e pagamento são conferidos aqui; o cliente não consegue alterar o pedido.
const CAT = require("../../public/catalogo.js");
const { montarPedido } = require("../lib/pedido.js");
const { abrir, hojeBR } = require("../lib/db.js");

const json = (code, body) => ({ statusCode: code, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const FORMAS = ["Pix", "Cartão de crédito", "Cartão de débito", "Dinheiro"];
const corta = (v, n) => String(v || "").trim().slice(0, n);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { erro: "Use POST" });
  let b; try { b = JSON.parse(event.body || "{}"); } catch { return json(400, { erro: "JSON inválido" }); }
  let p; try { p = montarPedido(b); } catch (e) { return json(400, { erro: e.message }); }

  const pg = b.pagamento || {};
  let pagamento;
  if (pg.modo === "online") {
    const token = process.env.MP_ACCESS_TOKEN;
    const id = String(pg.id || "").replace(/\D/g, "");
    if (!token || !id) return json(400, { erro: "Pagamento não informado." });
    const r = await fetch("https://api.mercadopago.com/v1/payments/" + id, { headers: { Authorization: "Bearer " + token } });
    const mp = await r.json().catch(() => ({}));
    if (!r.ok || mp.status !== "approved") return json(400, { erro: "Pagamento não aprovado." });
    if (Math.abs(Number(mp.transaction_amount) - p.total) > 0.01) return json(400, { erro: "Valor pago não confere com o pedido." });
    p.pedido = mp.external_reference || ("MP" + mp.id);
    pagamento = { m: "online", d: mp.payment_type_id === "bank_transfer" ? "Pix" : mp.payment_type_id === "debit_card" ? "Cartão de débito" : "Cartão de crédito", id: mp.id };
  } else {
    const forma = FORMAS.includes(pg.forma) ? pg.forma : "Pix";
    pagamento = { m: "entrega", d: forma, troco: forma === "Dinheiro" && Number(pg.troco) > 0 ? CAT.r2(Number(pg.troco)) : 0 };
  }

  const db = abrir(event);
  const dia = hojeBR();
  const chave = `${dia}/${p.pedido}`;
  const existente = await db.get(chave);          // evita pedido duplicado (clique duplo / recarregar a página)
  if (existente) return json(200, { ok: true, pedido: existente.p, numero: existente.n });

  const c = p.c;
  const pedido = {
    p: p.pedido,
    n: p.pedido.slice(-5),                         // número curto que aparece na tela e na comanda
    t: Date.now(),
    st: "novo",
    i: p.itens.map(i => [i.qty, i.nome, i.unit, i.total, i.opts.map(o => `${o.g}: ${o.v.join(", ")}`), i.obs]),
    s: p.subtotal, f: p.frete.taxa, km: p.frete.km, tot: p.total,
    c: { n: corta(c.nome, 60), f: corta(c.fone, 20), e: corta(`${c.rua}, ${c.numero}${c.comp ? " - " + c.comp : ""}`, 140), b: corta(c.bairro, 60), r: corta(c.ref, 100), cep: corta(b.cep, 9) },
    o: corta(c.obs, 200),
    pg: pagamento,
    g: [Number(b.entrega.lat), Number(b.entrega.lng)]
  };
  await db.set(chave, pedido);
  return json(200, { ok: true, pedido: pedido.p, numero: pedido.n });
};
