// POST /api/cartao — cobra o cartão digitado no próprio site (Card Payment Brick do Mercado Pago).
// O navegador manda só o "token" do cartão (os números nunca passam pelo nosso servidor).
// O valor cobrado é recalculado aqui a partir do catalogo.js.
const { montarPedido } = require("../lib/pedido.js");

const json = (code, body) => ({ statusCode: code, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

const MOTIVOS = {
  cc_rejected_insufficient_amount: "Saldo ou limite insuficiente.",
  cc_rejected_bad_filled_security_code: "Código de segurança (CVV) incorreto.",
  cc_rejected_bad_filled_date: "Data de validade incorreta.",
  cc_rejected_bad_filled_card_number: "Número do cartão incorreto.",
  cc_rejected_bad_filled_other: "Confira os dados do cartão.",
  cc_rejected_call_for_authorize: "O banco pediu autorização. Ligue para o seu banco ou use outro cartão.",
  cc_rejected_card_disabled: "Cartão bloqueado. Ligue para o seu banco ou use outro cartão.",
  cc_rejected_duplicated_payment: "Pagamento duplicado. Aguarde alguns minutos.",
  cc_rejected_high_risk: "Pagamento recusado por segurança. Tente o Pix ou outro cartão.",
  cc_rejected_max_attempts: "Muitas tentativas. Use outro cartão ou o Pix."
};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { erro: "Use POST" });
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return json(500, { erro: "Pagamento online ainda não configurado." });

  let b; try { b = JSON.parse(event.body || "{}"); } catch { return json(400, { erro: "JSON inválido" }); }
  let p; try { p = montarPedido(b); } catch (e) { return json(400, { erro: e.message }); }
  const f = b.cartao || {};
  if (!f.token || !f.payment_method_id || !f.payer || !f.payer.email) return json(400, { erro: "Dados do cartão incompletos." });

  const r = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json", "X-Idempotency-Key": p.pedido },
    body: JSON.stringify({
      transaction_amount: p.total,
      token: f.token,
      description: `Pedido ${p.pedido} - Bravio Food House`,
      installments: 1,
      payment_method_id: f.payment_method_id,
      issuer_id: f.issuer_id || undefined,
      payer: { email: f.payer.email, identification: f.payer.identification },
      external_reference: p.pedido,
      statement_descriptor: "BRAVIO",
      metadata: { pedido: p.pedido, cliente: p.c.nome, telefone: p.c.fone, endereco: p.endereco, total: p.total }
    })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.id) {
    console.error("Erro cartão Mercado Pago:", r.status, JSON.stringify(j).slice(0, 500));
    return json(502, { erro: "Não foi possível processar o cartão. Confira os dados ou use o Pix." });
  }
  return json(200, {
    ok: j.status === "approved" || j.status === "in_process" || j.status === "pending",
    status: j.status, id: j.id, pedido: p.pedido, total: p.total, metodo: j.payment_type_id,
    erro: j.status === "rejected" ? (MOTIVOS[j.status_detail] || "Cartão recusado. Tente outro cartão ou o Pix.") : undefined
  });
};
