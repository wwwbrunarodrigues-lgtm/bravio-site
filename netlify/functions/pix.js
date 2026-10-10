// POST /api/pix — gera um Pix (QR Code + copia e cola) direto no site, sem o cliente precisar de conta no Mercado Pago.
// Requer uma chave Pix cadastrada na conta do Mercado Pago do vendedor.
const { montarPedido } = require("../lib/pedido.js");

const json = (code, body) => ({ statusCode: code, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { erro: "Use POST" });
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return json(500, { erro: "Pagamento online ainda não configurado." });

  let b; try { b = JSON.parse(event.body || "{}"); } catch { return json(400, { erro: "JSON inválido" }); }
  let p; try { p = montarPedido(b); } catch (e) { return json(400, { erro: e.message }); }
  const email = String(b.email || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json(400, { erro: "Informe um e-mail válido para receber o comprovante do Pix." });

  const minutos = 30;
  const exp = new Date(Date.now() + minutos * 60000);
  const expBR = new Date(exp.getTime() - 3 * 3600000).toISOString().replace("Z", "-03:00");
  const nome = String(p.c.nome).trim().split(/\s+/);

  const r = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json", "X-Idempotency-Key": p.pedido },
    body: JSON.stringify({
      transaction_amount: p.total,
      description: `Pedido ${p.pedido} - Bravio Food House`,
      payment_method_id: "pix",
      external_reference: p.pedido,
      date_of_expiration: expBR,
      payer: { email, first_name: nome[0].slice(0, 40), last_name: nome.slice(1).join(" ").slice(0, 40) || undefined },
      metadata: { pedido: p.pedido, cliente: p.c.nome, telefone: p.c.fone, endereco: p.endereco, total: p.total }
    })
  });
  const j = await r.json().catch(() => ({}));
  const td = j.point_of_interaction && j.point_of_interaction.transaction_data;
  if (!r.ok || !td || !td.qr_code) {
    console.error("Erro Pix Mercado Pago:", r.status, JSON.stringify(j).slice(0, 500));
    const semChave = /key|chave|qr/i.test(JSON.stringify(j));
    return json(502, { erro: semChave
      ? "O Pix online ainda não está liberado na conta da loja. Escolha outra forma de pagamento."
      : "Não foi possível gerar o Pix agora. Tente de novo ou escolha outra forma de pagamento." });
  }
  return json(200, { ok: true, pedido: p.pedido, id: j.id, qr: td.qr_code, qr64: td.qr_code_base64, total: p.total, expira: exp.toISOString() });
};
