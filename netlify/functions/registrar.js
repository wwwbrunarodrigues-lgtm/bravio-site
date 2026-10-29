// POST /api/registrar — grava o pedido no painel da loja (como no iFood).
// Preços, frete e pagamento são conferidos aqui; o cliente não consegue alterar o pedido.
const CAT = require("../../public/catalogo.js");
const { montarPedido } = require("../lib/pedido.js");
const { abrir, hojeBR } = require("../lib/db.js");
const { situacao } = require("../lib/loja.js");

const json = (code, body) => ({ statusCode: code, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const FORMAS = ["Pix", "Cartão de crédito", "Cartão de débito", "Dinheiro"];
const corta = (v, n) => String(v || "").trim().slice(0, n);

exports.handler = async (event) => {
  // Diagnóstico: abra /api/registrar?teste=1 no navegador para testar o banco de pedidos
  if (event.httpMethod === "GET" && (event.queryStringParameters || {}).teste) {
    try {
      const db = abrir(event);
      await db.set("_teste/ping", { t: Date.now() });
      const v = await db.get("_teste/ping");
      return json(200, { ok: !!v, banco: v ? "funcionando" : "gravou mas não leu" });
    } catch (e) { return json(500, { ok: false, erro: String(e && e.message || e) }); }
  }
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
    // pedido para pagar na entrega/retirada só entra com a loja aberta (pedido já pago online sempre entra)
    try { const st = await situacao(event); if (!st.aberto) return json(409, { fechado: true, erro: "Estamos fechados agora" + (st.abreTxt ? `. Abrimos ${st.diaAbre} às ${st.abreTxt}.` : ".") }); } catch (e) {}
    const forma = FORMAS.includes(pg.forma) ? pg.forma : "Pix";
    pagamento = { m: "entrega", d: forma, troco: forma === "Dinheiro" && Number(pg.troco) > 0 ? CAT.r2(Number(pg.troco)) : 0 };
  }

  let db, existente;
  const dia = hojeBR();
  const chave = `${dia}/${p.pedido}`;
  try {
    db = abrir(event);
    existente = await db.get(chave);              // evita pedido duplicado (clique duplo / recarregar a página)
  } catch (e) {
    console.error("Banco de pedidos:", e);
    return json(500, { erro: "Banco de pedidos indisponível: " + String(e && e.message || e) });
  }
  if (existente) return json(200, { ok: true, pedido: existente.p, numero: existente.n });

  // Número da comanda do dia: 01, 02, 03... (recomeça todo dia)
  let numero = null;
  try {
    let n = (await db.list(`${dia}/n/`)).length + 1;
    for (let t = 0; t < 60 && !numero; t++, n++) {
      if (await db.criar(`${dia}/n/${String(n).padStart(4, "0")}`, { p: p.pedido })) numero = String(n).padStart(2, "0");
    }
  } catch (e) { console.error("Numeração:", e); }
  if (!numero) numero = p.pedido.slice(-5);

  const c = p.c;
  const pedido = {
    p: p.pedido,
    n: numero,                                     // número da comanda: 01, 02, 03...
    t: Date.now(),
    st: "novo",
    i: p.itens.map(i => [i.qty, i.nome, i.unit, i.total, i.opts.map(o => `${o.g}: ${o.v.join(", ")}`), i.obs]),
    s: p.subtotal, f: p.frete.taxa, km: p.frete.km, tot: p.total,
    ret: p.retirada || undefined,                  // true = cliente retira na loja
    c: p.retirada
      ? { n: corta(c.nome, 60), f: corta(c.fone, 20), e: "", b: "", r: "", cep: "" }
      : { n: corta(c.nome, 60), f: corta(c.fone, 20), e: corta(`${c.rua}, ${c.numero}${c.comp ? " - " + c.comp : ""}`, 140), b: corta(c.bairro, 60), r: corta(c.ref, 100), cep: corta(b.cep, 9) },
    o: corta(c.obs, 200),
    pg: pagamento,
    g: p.retirada ? null : [Number(b.entrega.lat), Number(b.entrega.lng)]
  };
  try { await db.set(chave, pedido); }
  catch (e) { console.error("Banco de pedidos:", e); return json(500, { erro: "Não foi possível gravar o pedido: " + String(e && e.message || e) }); }
  return json(200, { ok: true, pedido: pedido.p, numero: pedido.n });
};
