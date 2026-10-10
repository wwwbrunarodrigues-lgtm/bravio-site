// GET /api/status?payment_id=123  — confirma no Mercado Pago se o pagamento foi aprovado
const json = (code, body) => ({ statusCode: code, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(body) });

exports.handler = async (event) => {
  const id = String((event.queryStringParameters || {}).payment_id || "").replace(/\D/g, "");
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return json(500, { erro: "MP_ACCESS_TOKEN não configurado" });
  if (!id) return json(400, { erro: "payment_id ausente" });
  const r = await fetch("https://api.mercadopago.com/v1/payments/" + id, { headers: { Authorization: "Bearer " + token } });
  if (!r.ok) return json(404, { erro: "Pagamento não encontrado" });
  const p = await r.json();
  return json(200, {
    status: p.status,                       // approved | pending | in_process | rejected | cancelled
    pedido: p.external_reference,
    valor: p.transaction_amount,
    metodo: p.payment_type_id,              // bank_transfer (Pix) | credit_card | debit_card
    id: p.id
  });
};
