/* =====================================================================
   BRAVIO FOOD HOUSE — CONFIGURAÇÃO E CARDÁPIO
   Este arquivo é usado pelo site E pelo servidor (cálculo de preço e frete).
   Edite aqui preços, produtos, endereço da loja e tabela de frete.
   ===================================================================== */
(function (root) {
  const CONFIG = {
    nome: "Bravio Food House",
    whatsapp: "5541996967147",          // 55 + DDD + número
    telefone: "(41) 99696-7147",
    cidade: "Curitiba",
    uf: "PR",

    // Localização da loja. No Google Maps: clique com o botão direito no seu
    // endereço e clique nas coordenadas para copiar (ex: -25.4284, -49.2733).
    loja: { lat: -25.5660, lng: -49.3290 },   // Tatuquara (aproximado). Troque pelas coordenadas exatas da loja

    // Distância em linha reta x fator = estimativa da distância pelas ruas.
    fatorRota: 1.3,

    // Tabela de frete por distância (km). Valores de EXEMPLO — ajuste.
    frete: [
      { ateKm: 3, taxa: 5 },
      { ateKm: 6, taxa: 7 },
      { ateKm: 9, taxa: 9 },
      { ateKm: 12, taxa: 12 },
      { ateKm: 15, taxa: 15 }
    ],                                   // acima do último: "fora da área"
    // Retirada no local (o cliente busca o pedido na loja, sem taxa de entrega)
    retirada: true,
    enderecoRetirada: "Tatuquara, Curitiba",   // <-- coloque o endereço completo da loja
    tempoRetirada: "20 a 30 min",
    freteGratisAcima: 0,                 // 0 = desligado. Ex: 80 = grátis acima de R$ 80
    pedidoMinimo: 0,                     // 0 = sem pedido mínimo

    pagamentoOnline: true,               // Mercado Pago (Pix e cartão)
    pagamentoNaEntrega: true,            // Pix / cartão / dinheiro na entrega

    // Chave PÚBLICA do Mercado Pago (pode ficar aqui, não é segredo). Usada no formulário de cartão do site.
    mpPublicKey: "APP_USR-d5940ed5-1a61-4bab-91cc-9b8291e7abf6",

    metaPixelId: "2187216805558487"                      // opcional: ID do Pixel da Meta
  };

  const ADICIONAIS = { id: "add", nome: "Adicionais", tipo: "varios", max: 6, itens: [
    { n: "Doritos", p: 3 }, { n: "Picles", p: 2 }, { n: "Molho da casa", p: 3 }, { n: "Bacon", p: 5 },
    { n: "Blend hambúrguer 70g", p: 6 }, { n: "Blend hambúrguer 140g", p: 12 }] };
  const REMOVER = { id: "sem", nome: "Retirar ingredientes", tipo: "varios", itens: [
    { n: "Sem cebola" }, { n: "Sem tomate" }, { n: "Sem alface" }, { n: "Sem picles" }, { n: "Sem maionese" }, { n: "Sem molho" }] };
  const MOLHO = { id: "molho", nome: "Molho extra", tipo: "varios", itens: [{ n: "Molho da casa", p: 3 }] };
  const LANCHE = [ADICIONAIS, REMOVER];
  const BEBIDA_COMBO = { id: "bebida", nome: "Bebida do combo", tipo: "um", obrig: true, itens: [
    { n: "Coca-Cola 200 ml" }, { n: "Coca-Cola Zero 200 ml" }, { n: "Guaraná 200 ml" }, { n: "Sprite 200 ml" }] };
  const COMBO = [BEBIDA_COMBO, ADICIONAIS, REMOVER];

  const CATS = [
    { id: "combo", nome: "Combos", brush: "gold", sub: "Lanche + batatas fritas crocantes + refrigerante 200 ml (Coca-Cola, Coca Zero, Guaraná ou Sprite).", frame: true },
    { id: "hamburguer", nome: "Hambúrgueres", sub: "Pão brioche e carnes smash de 70g prensadas na chapa." },
    { id: "tradicional", nome: "Lanches Tradicionais", brush: "gold", sub: "Pão de hambúrguer, maionese, tomate, alface e hambúrguer de 90g." },
    { id: "porcao", nome: "Porções", sub: "" }
  ];

  const PRODUTOS = [
    { id: "c1", cat: "combo", n: 1, nome: "Combo X Salada", preco: 27.5, img: "c1", desc: "X Salada suculento com batatas fritas crocantes e refrigerante 200 ml à sua escolha.", op: COMBO },
    { id: "c2", cat: "combo", n: 2, nome: "Combo X Egg", preco: 28.9, img: "c2", desc: "X Egg suculento com batatas fritas crocantes e refrigerante 200 ml à sua escolha.", op: COMBO },
    { id: "c3", cat: "combo", n: 3, nome: "Combo X Bacon", preco: 29.9, img: "c3", desc: "X Bacon suculento com batatas fritas crocantes e refrigerante 200 ml à sua escolha.", op: COMBO },
    { id: "c4", cat: "combo", n: 4, nome: "Combo Smash Duplo", preco: 37.9, img: "c4", desc: "Smash burger duplo com fritas e refrigerante 200 ml à sua escolha.", op: COMBO },
    { id: "c5", cat: "combo", n: 5, nome: "Combo Alto Audacioso", preco: 37.9, img: "c5", desc: "Hambúrguer Alto Audacioso com fritas e refrigerante 200 ml à sua escolha.", op: COMBO },
    { id: "c6", cat: "combo", n: 6, nome: "Combo Tenebroso", preco: 48.9, img: "c6", tag: "4 smashs", desc: "Hambúrguer com 4 smashs, fritas e refrigerante 200 ml à sua escolha.", op: COMBO },

    { id: "h1", cat: "hamburguer", nome: "Smash Burguer Salad", preco: 24.0, img: "h1", desc: "Pão brioche, 2 carnes smash 70g (140g), queijo cheddar, alface, tomate, cebola roxa e molho especial da casa.", op: LANCHE },
    { id: "h2", cat: "hamburguer", nome: "Smash Burguer Duplo", preco: 27.9, img: "h2", desc: "Pão brioche, 2 carnes smash 70g (140g), bacon em tiras e molho especial da casa.", op: LANCHE },
    { id: "h3", cat: "hamburguer", nome: "Burguer Alto Audacioso", preco: 27.9, img: "h3", desc: "Carne bovina 140g, queijo cheddar, Doritos, picles, cebola roxa, molho especial e pão brioche.", op: LANCHE },
    { id: "h4", cat: "hamburguer", nome: "Smash Burguer Tenebroso", preco: 38.9, img: "h4", tag: "280g de carne", desc: "Pão brioche, bacon em tiras, cebola roxa, molho barbecue, 4 tiras de queijo cheddar e 4 carnes smash de 70g cada (280g).", op: LANCHE },

    { id: "h5", cat: "hamburguer", nome: "Burguer Alto Colossal", preco: 38.9, img: "h5", tag: "Novo", desc: "Pão brioche macio e levemente amanteigado, molho verde especial da casa, alface crocante, tomate fresco, cebola roxa fatiada, picles agridoce, hambúrguer artesanal de 120g, queijo cheddar e muçarela derretidos, bacon crocante e 2 anéis de cebola empanados e dourados.", op: LANCHE },

    { id: "t1", cat: "tradicional", nome: "X Salada do Rocha", preco: 17.5, img: "t1", desc: "Pão de hambúrguer, maionese, tomate, alface, hambúrguer 90g, presunto e queijo muçarela.", op: LANCHE },
    { id: "t2", cat: "tradicional", nome: "X Egg", preco: 18.9, img: "t2", desc: "Pão de hambúrguer, maionese, tomate, alface, hambúrguer 90g, ovo frito, presunto e queijo muçarela.", op: LANCHE },
    { id: "t3", cat: "tradicional", nome: "X Bacon do Rocha", preco: 19.9, img: "t3", desc: "Pão de hambúrguer, maionese, tomate, alface, hambúrguer 90g, bacon, presunto e queijo muçarela.", op: LANCHE },

    { id: "p1", cat: "porcao", nome: "Batata frita", preco: 7.9, img: "fries", aPartir: true, desc: "Batatas fritas crocantes. Escolha o tamanho: 100g, 150g, 200g ou 250g.", op: [
      { id: "tam", nome: "Tamanho", tipo: "um", obrig: true, padrao: 0, itens: [{ n: "100g" }, { n: "150g", p: 4 }, { n: "200g", p: 8 }, { n: "250g", p: 12 }] }, MOLHO] },
    { id: "p2", cat: "porcao", nome: "Anéis de cebola", preco: 14.9, img: "rings", aPartir: true, desc: "Anéis de cebola supercrocantes. 8 ou 16 unidades.", op: [
      { id: "qtd", nome: "Quantidade", tipo: "um", obrig: true, padrao: 0, itens: [{ n: "8 unidades" }, { n: "16 unidades", p: 14.9 }] }, MOLHO] }
  ];

  /* ---------- regras compartilhadas (site e servidor usam as mesmas) ---------- */
  const r2 = v => Math.round(v * 100) / 100;

  function distanciaKm(lat, lng) {
    const R = 6371, toRad = d => d * Math.PI / 180;
    const dLat = toRad(lat - CONFIG.loja.lat), dLng = toRad(lng - CONFIG.loja.lng);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(CONFIG.loja.lat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a)) * CONFIG.fatorRota;
  }
  function taxaPorKm(km, subtotal) {
    const faixa = CONFIG.frete.find(f => km <= f.ateKm);
    if (!faixa) return { atende: false, km: r2(km), taxa: null, max: CONFIG.frete[CONFIG.frete.length - 1].ateKm };
    const gratis = CONFIG.freteGratisAcima > 0 && subtotal >= CONFIG.freteGratisAcima;
    return { atende: true, km: r2(km), taxa: gratis ? 0 : faixa.taxa, gratis };
  }
  // item do carrinho: { id, qty, sel: [[indices do grupo 0], [indices do grupo 1], ...], obs }
  function precificar(item) {
    const p = PRODUTOS.find(x => x.id === item.id);
    if (!p) throw new Error("Produto inválido: " + item.id);
    const qty = Math.max(1, Math.min(50, parseInt(item.qty, 10) || 1));
    let extra = 0; const opts = [];
    p.op.forEach((g, gi) => {
      const idx = [...new Set((item.sel && item.sel[gi]) || [])].map(Number).filter(i => g.itens[i]);
      if (g.tipo === "um" && idx.length > 1) throw new Error("Opção inválida");
      if (g.max && idx.length > g.max) throw new Error("Opções demais em " + g.nome);
      if (g.obrig && !idx.length) throw new Error("Escolha " + g.nome);
      if (idx.length) {
        idx.forEach(i => extra += g.itens[i].p || 0);
        opts.push({ g: g.nome, v: idx.map(i => g.itens[i].n) });
      }
    });
    const unit = r2(p.preco + extra);
    return { id: p.id, nome: p.nome, img: p.img, qty, unit, total: r2(unit * qty), opts, obs: String(item.obs || "").slice(0, 140) };
  }

  const API = { CONFIG, CATS, PRODUTOS, distanciaKm, taxaPorKm, precificar, r2 };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.CATALOGO = API;
})(typeof window !== "undefined" ? window : globalThis);
