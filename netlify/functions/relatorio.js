// GET /api/relatorio?de=2026-10-01&ate=2026-10-31  (protegido pela senha do painel)
// Junta os pedidos do período e devolve os números para a aba "Relatórios" do painel.
const crypto = require("crypto");
const { abrir, hojeBR } = require("../lib/db.js");
const json = (code, body) => ({ statusCode: code, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(body) });
const r2 = v => Math.round(v * 100) / 100;

function autorizado(event) {
  const certa = process.env.PAINEL_SENHA || "", h = event.headers || {};
  const enviada = String(h["x-senha"] || h["X-Senha"] || "");
  if (!certa) return false;
  return crypto.timingSafeEqual(crypto.createHash("sha256").update(certa).digest(), crypto.createHash("sha256").update(enviada).digest());
}
function dias(de, ate) {
  const out = []; let d = new Date(de + "T12:00:00Z"); const fim = new Date(ate + "T12:00:00Z");
  while (d <= fim && out.length < 93) { out.push(d.toISOString().slice(0, 10)); d = new Date(d.getTime() + 86400000); }
  return out;
}
const soma = (obj, k, v = 1) => { obj[k] = (obj[k] || 0) + v; };
const top = (obj, n = 50) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);

exports.handler = async (event) => {
  if (!autorizado(event)) return json(401, { erro: "Senha incorreta." });
  const q = event.queryStringParameters || {}, ok = s => /^\d{4}-\d{2}-\d{2}$/.test(s || "");
  const ate = ok(q.ate) ? q.ate : hojeBR(), de = ok(q.de) ? q.de : ate;
  const lista = dias(de, ate);
  const db = abrir(event);

  const R = {
    de, ate, pedidos: 0, cancelados: 0, faturamento: 0, entregas: 0, taxaEntrega: 0,
    porDia: {}, porHora: Array(24).fill(0), produtos: {}, receitaProduto: {}, adicionais: {}, bebidas: {},
    bairros: {}, modo: {}, pagamento: {}, origem: {}, origemReceita: {}, funil: { visita: 0, sacola: 0, checkout: 0 }
  };
  lista.forEach(d => { R.porDia[d] = { pedidos: 0, faturamento: 0 }; });

  await Promise.all(lista.map(async dia => {
    const chaves = await db.list(dia + "/");
    const pedidosKeys = chaves.filter(k => !k.includes("/n/") && !k.includes("/ev/"));
    chaves.filter(k => k.includes("/ev/")).forEach(k => { const t = k.split("/")[2]; if (R.funil[t] !== undefined) R.funil[t]++; });
    const ps = (await Promise.all(pedidosKeys.map(k => db.get(k)))).filter(Boolean);
    ps.forEach(p => {
      if (p.st === "cancelado") { R.cancelados++; return; }
      R.pedidos++; R.faturamento += p.tot;
      R.porDia[dia].pedidos++; R.porDia[dia].faturamento += p.tot;
      R.porHora[new Date(p.t - 3 * 3600000).getUTCHours()]++;
      if (!p.ret) { R.entregas++; R.taxaEntrega += p.f || 0; }
      soma(R.modo, p.ret ? "Retirada" : "Entrega");
      soma(R.bairros, p.ret ? "Retirada no local" : (p.c.b || "?").trim());
      soma(R.pagamento, (p.pg.m === "online" ? "Online · " : "Na hora · ") + p.pg.d);
      const o = p.src || "Não identificado"; soma(R.origem, o); soma(R.origemReceita, o, p.tot);
      p.i.forEach(([qty, nome, , total, opts]) => {
        soma(R.produtos, nome, qty); soma(R.receitaProduto, nome, total);
        (opts || []).forEach(s => {
          const [g, v] = String(s).split(/:\s(.+)/);
          if (!v) return;
          if (/^Adicionais/i.test(g)) v.split(", ").forEach(a => soma(R.adicionais, a, qty));
          if (/Bebida/i.test(g)) v.split(", ").forEach(a => soma(R.bebidas, a, qty));
        });
      });
    });
  }));

  R.faturamento = r2(R.faturamento); R.taxaEntrega = r2(R.taxaEntrega);
  R.ticketMedio = R.pedidos ? r2(R.faturamento / R.pedidos) : 0;
  Object.values(R.porDia).forEach(d => d.faturamento = r2(d.faturamento));
  R.produtos = top(R.produtos).map(([n, q]) => [n, q, r2(R.receitaProduto[n] || 0)]); delete R.receitaProduto;
  R.adicionais = top(R.adicionais, 20); R.bebidas = top(R.bebidas, 10); R.bairros = top(R.bairros, 20);
  R.modo = top(R.modo); R.pagamento = top(R.pagamento);
  R.origem = top(R.origem).map(([n, q]) => [n, q, r2(R.origemReceita[n] || 0)]); delete R.origemReceita;
  return json(200, R);
};
