/* Bravio Food House — cardápio, sacola e checkout */
(function () {
const { CONFIG, CATS, PRODUTOS, precificar, taxaPorKm, r2 } = window.CATALOGO;
const IMG = k => "img/" + k + ".jpg";

/* ---------- utilidades ---------- */
const $ = s => document.querySelector(s);
const brl = v => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
function toast(t) { const el = document.createElement("div"); el.className = "toast"; el.textContent = t; document.body.appendChild(el); setTimeout(() => el.remove(), 2000); }
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};
async function api(path, opts) {
  const r = await fetch("/api/" + path, opts);
  const j = await r.json().catch(() => ({}));
  if (!r.ok && !j.erro) j.erro = "Erro de conexão. Tente de novo.";
  return j;
}

/* ---------- Meta Pixel (opcional) ---------- */
function px(ev, data) { try { window.fbq && fbq("track", ev, data || {}); } catch (e) {} }
if (CONFIG.metaPixelId) {
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,"script","https://connect.facebook.net/en_US/fbevents.js");
  fbq("init", CONFIG.metaPixelId); fbq("track", "PageView");
}

/* ---------- estado ---------- */
// item: { key, id, qty, sel: [[...]], obs }
let cart = store.get("bravio_cart2", []).filter(i => { try { precificar(i); return true; } catch (e) { return false; } });
let cliente = Object.assign({ nome: "", fone: "", cep: "", rua: "", num: "", comp: "", bairro: "", ref: "", pagModo: CONFIG.pagamentoOnline ? "pix" : "entrega", pag: "Pix", troco: "", obs: "" }, store.get("bravio_cliente2", {}));
let frete = null;     // { km, taxa, atende, lat, lng, gratis }
let gps = null;       // { lat, lng } se o cliente usou a localização
let step = 1;
const linhas = () => cart.map(i => ({ ...precificar(i), key: i.key }));
const subtotal = () => r2(linhas().reduce((s, i) => s + i.total, 0));
const saveCli = () => store.set("bravio_cliente2", cliente);

/* ---------- cabeçalho ---------- */
$("#logo").src = IMG("logo"); $("#heroImg").src = IMG("hero");
$("#phoneTxt").textContent = CONFIG.telefone; $("#phoneFoot").textContent = CONFIG.telefone;

/* ---------- cardápio ---------- */
function match(p, q) { return !q || norm(p.nome + " " + p.desc).includes(q); }
function card(p) {
  return `<button class="item" type="button" data-p="${p.id}">
    <div class="ph"><img src="${IMG(p.img)}" alt="" loading="lazy">${p.n ? `<span class="num">${p.n}</span>` : ""}</div>
    <div class="item-body">
      <div class="item-name">${esc(p.nome)}${p.tag ? `<span class="tag">${esc(p.tag)}</span>` : ""}</div>
      <div class="item-desc">${esc(p.desc)}</div>
      <div class="item-price">${p.aPartir ? "<small>a partir de</small>" : ""}${brl(p.preco)}</div>
    </div></button>`;
}
function renderMenu() {
  const q = norm($("#search").value.trim());
  let html = "", count = 0; const vis = [];
  CATS.forEach(c => {
    const itens = PRODUTOS.filter(p => p.cat === c.id && match(p, q));
    if (!itens.length) return;
    count += itens.length; vis.push(c);
    let extra = "";
    if (c.id === "hamburguer" && !q) {
      const add = PRODUTOS[0].op[0].itens;
      extra = `<div class="extras"><div class="pricelist"><h3>Adicionais (em qualquer lanche)</h3>${add.map(i => `<div class="pl"><span>${esc(i.n)}</span><i></i><b>${brl(i.p)}</b></div>`).join("")}</div></div>`;
    }
    if (c.id === "porcao" && !q) {
      const bat = PRODUTOS.find(p => p.id === "p1"), an = PRODUTOS.find(p => p.id === "p2");
      extra = `<div class="extras"><div class="pricelist"><h3>Batata</h3>${bat.op[0].itens.map(i => `<div class="pl"><span>Batata ${i.n}</span><i></i><b>${brl(bat.preco + (i.p || 0))}</b></div>`).join("")}</div>
        <div class="pricelist"><h3>Anéis de cebola supercrocantes</h3>${an.op[0].itens.map(i => `<div class="pl"><span>${i.n}</span><i></i><b>${brl(an.preco + (i.p || 0))}</b></div>`).join("")}</div></div>`;
    }
    html += `<section class="menu-sec" id="sec-${c.id}"><h2 class="brush ${c.brush || ""}">${esc(c.nome)}</h2>${c.sub ? `<p class="sec-sub">${esc(c.sub)}</p>` : ""}
      <div class="${c.frame ? "frame" : ""}"><div class="grid">${itens.map(card).join("")}</div></div>${extra}</section>`;
  });
  $("#menu").innerHTML = html;
  $("#empty").hidden = count > 0;
  $("#cats").innerHTML = vis.map(c => `<button class="cat" type="button" data-c="${c.id}">${esc(c.nome)}</button>`).join("");
  spy();
}
$("#search").addEventListener("input", renderMenu);
$("#menu").addEventListener("click", e => { const b = e.target.closest("[data-p]"); if (b) openProduct(b.dataset.p); });
$("#cats").addEventListener("click", e => {
  const b = e.target.closest("[data-c]"); if (!b) return;
  document.getElementById("sec-" + b.dataset.c)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
});
function spy() {
  const secs = [...document.querySelectorAll(".menu-sec")]; let cur = secs[0]?.id;
  secs.forEach(s => { if (s.getBoundingClientRect().top < 170) cur = s.id; });
  document.querySelectorAll(".cat").forEach(b => {
    const on = "sec-" + b.dataset.c === cur; b.classList.toggle("on", on);
    if (on) { const r = b.parentElement; const x = b.offsetLeft - r.clientWidth / 2 + b.clientWidth / 2; if (Math.abs(r.scrollLeft - x) > 40) r.scrollLeft = x; }
  });
}
addEventListener("scroll", spy, { passive: true });

/* ---------- produto ---------- */
let current = null, pQty = 1;
function openProduct(id) {
  current = PRODUTOS.find(p => p.id === id); pQty = 1;
  $("#pImg").src = IMG(current.img); $("#pImg").alt = current.nome;
  $("#pTitle").textContent = current.nome; $("#pDesc").textContent = current.desc;
  $("#pBody").innerHTML = current.op.map((g, gi) => {
    const req = g.obrig ? `<small class="req">Obrigatório</small>` : `<small>${g.max ? `Opcional · até ${g.max}` : "Opcional"}</small>`;
    return `<fieldset data-g="${gi}"><legend>${esc(g.nome)} ${req}</legend>` + g.itens.map((it, ii) => `
      <label class="opt"><input type="${g.tipo === "um" ? "radio" : "checkbox"}" name="g${gi}" value="${ii}" id="o${gi}_${ii}" ${g.padrao === ii ? "checked" : ""}>
      <span>${esc(it.n)}</span><em>${it.p ? "+ " + brl(it.p) : ""}</em></label>`).join("") + `</fieldset>`;
  }).join("") + `<label class="fl" for="pObs">Alguma observação?</label><textarea class="in" id="pObs" maxlength="140" placeholder="Ex: carne bem passada, caprichar no molho"></textarea>`;
  updateProduct(); show("#prodOv"); $("#pBody").scrollTop = 0;
  px("ViewContent", { content_ids: [current.id], content_name: current.nome, value: current.preco, currency: "BRL" });
}
const selIdx = () => current.op.map((g, gi) => [...document.querySelectorAll(`[name="g${gi}"]:checked`)].map(i => +i.value));
function updateProduct() {
  current.op.forEach((g, gi) => {
    if (g.tipo === "varios" && g.max) {
      const boxes = [...document.querySelectorAll(`[name="g${gi}"]`)], n = boxes.filter(b => b.checked).length;
      boxes.forEach(b => { if (!b.checked) b.disabled = n >= g.max; });
    }
  });
  const extra = selIdx().reduce((s, idx, gi) => s + idx.reduce((a, i) => a + (current.op[gi].itens[i].p || 0), 0), 0);
  $("#pQty").textContent = pQty;
  $("#pTotal").textContent = brl((current.preco + extra) * pQty);
}
$("#pBody").addEventListener("change", e => { e.target.closest("fieldset")?.classList.remove("bad"); updateProduct(); });
$("#pMinus").onclick = () => { if (pQty > 1) { pQty--; updateProduct(); } };
$("#pPlus").onclick = () => { if (pQty < 20) { pQty++; updateProduct(); } };
$("#pAdd").onclick = () => {
  const sel = selIdx(); let firstBad = null;
  current.op.forEach((g, gi) => { if (g.obrig && !sel[gi].length) { const fs = document.querySelector(`fieldset[data-g="${gi}"]`); fs.classList.add("bad"); firstBad = firstBad || fs; } });
  if (firstBad) { firstBad.scrollIntoView({ block: "center", behavior: "smooth" }); toast("Escolha as opções obrigatórias"); return; }
  const obs = $("#pObs").value.trim();
  const key = current.id + "|" + JSON.stringify(sel) + "|" + obs;
  const ex = cart.find(c => c.key === key);
  if (ex) ex.qty += pQty; else cart.push({ key, id: current.id, qty: pQty, sel, obs });
  const unit = precificar({ id: current.id, qty: 1, sel }).unit;
  px("AddToCart", { content_ids: [current.id], content_name: current.nome, value: unit * pQty, currency: "BRL" });
  saveCart(); hide("#prodOv"); toast(`${pQty}× ${current.nome} na sacola`);
};

/* ---------- sacola ---------- */
function saveCart() { store.set("bravio_cart2", cart); renderBar(); if (frete && frete.atende) recalcFreteLocal(); }
function recalcFreteLocal() { const r = taxaPorKm(frete.km / 1, subtotal()); frete = { ...frete, taxa: r.taxa, gratis: r.gratis }; }
function renderBar() {
  const n = cart.reduce((s, i) => s + i.qty, 0);
  $("#cartbar").hidden = n === 0;
  $("#cartCount").textContent = n; $("#cartTotal").textContent = brl(subtotal());
}
const optText = i => i.opts.map(o => `${o.g}: ${o.v.join(", ")}`).concat(i.obs ? [`Obs: ${i.obs}`] : []);

const STEPS = ["Sacola", "Entrega", "Pagamento", "Revisão"];
function stepsBar() {
  return `<ol class="steps">${STEPS.map((s, i) => `<li class="${i + 1 === step ? "on" : i + 1 < step ? "done" : ""}"><span>${i + 1}</span>${s}</li>`).join("")}</ol>`;
}
function goto(n) { step = n; renderCheckout(); $("#cBody").scrollTop = 0; }

function renderCheckout() {
  $("#cSteps").innerHTML = cart.length ? stepsBar() : "";
  if (!cart.length) {
    $("#cBody").innerHTML = `<div class="empty">Sua sacola está vazia.</div>`;
    $("#cFoot").innerHTML = `<button class="primary" type="button" data-close><span>Ver cardápio</span><span>→</span></button>`;
    return;
  }
  ({ 1: stepSacola, 2: stepEntrega, 3: stepPagamento, 4: stepRevisao })[step]();
}

/* 1. sacola */
function stepSacola() {
  const L = linhas(), st = subtotal();
  const falta = CONFIG.pedidoMinimo && st < CONFIG.pedidoMinimo ? CONFIG.pedidoMinimo - st : 0;
  const gratisFalta = CONFIG.freteGratisAcima && st < CONFIG.freteGratisAcima ? CONFIG.freteGratisAcima - st : 0;
  $("#cBody").innerHTML = L.map((i, ix) => `
    <div class="ci"><img src="${IMG(i.img)}" alt=""><div class="ci-b"><div class="ci-n">${esc(i.nome)}</div>${optText(i).map(t => `<div class="ci-o">${esc(t)}</div>`).join("")}</div>
    <div class="ci-r"><span>${brl(i.total)}</span>
      <div class="stepper"><button type="button" data-dec="${ix}" aria-label="${i.qty > 1 ? "Diminuir" : "Remover"}">${i.qty > 1 ? "−" : "×"}</button><output>${i.qty}</output><button type="button" data-inc="${ix}" aria-label="Aumentar">+</button></div></div></div>`).join("") + `
    <button class="ghost" type="button" data-close style="margin-top:12px;width:100%">+ Adicionar mais itens</button>
    <div class="totals"><div class="t"><span>Subtotal</span><span>${brl(st)}</span></div>
    ${gratisFalta ? `<div class="muted"><span>Faltam ${brl(gratisFalta)} para frete grátis</span></div>` : ""}</div>
    ${falta ? `<div class="err">Pedido mínimo de ${brl(CONFIG.pedidoMinimo)}. Faltam ${brl(falta)}.</div>` : ""}`;
  $("#cFoot").innerHTML = `<button class="primary" type="button" id="toEntrega" ${falta ? "disabled" : ""}><span>Continuar para entrega</span><span>→</span></button>`;
  $("#toEntrega").onclick = () => goto(2);
}

/* 2. entrega */
function stepEntrega() {
  const c = cliente;
  $("#cBody").innerHTML = `
    <h4 class="h4">Seus dados</h4>
    <div class="row"><div><label class="fl" for="cNome">Nome</label><input class="in" id="cNome" data-k="nome" autocomplete="name" value="${esc(c.nome)}"></div>
    <div><label class="fl" for="cFone">Telefone / WhatsApp</label><input class="in" id="cFone" data-k="fone" inputmode="tel" autocomplete="tel" placeholder="(41) 99999-9999" value="${esc(c.fone)}"></div></div>

    <h4 class="h4">Endereço de entrega</h4>
    <div class="row"><div><label class="fl" for="cCep">CEP</label><input class="in" id="cCep" data-k="cep" inputmode="numeric" autocomplete="postal-code" placeholder="00000-000" maxlength="9" value="${esc(c.cep)}"></div>
    <div style="display:flex;align-items:flex-end"><button class="ghost" type="button" id="gpsBtn" style="width:100%">📍 Usar minha localização</button></div></div>
    <div class="row r3"><div><label class="fl" for="cRua">Rua</label><input class="in" id="cRua" data-k="rua" autocomplete="address-line1" value="${esc(c.rua)}"></div>
    <div><label class="fl" for="cNum">Número</label><input class="in" id="cNum" data-k="num" inputmode="numeric" value="${esc(c.num)}"></div></div>
    <div class="row"><div><label class="fl" for="cComp">Complemento</label><input class="in" id="cComp" data-k="comp" placeholder="Apto, bloco, casa" value="${esc(c.comp)}"></div>
    <div><label class="fl" for="cBairro">Bairro</label><input class="in" id="cBairro" data-k="bairro" value="${esc(c.bairro)}"></div></div>
    <label class="fl" for="cRef">Ponto de referência</label><input class="in" id="cRef" data-k="ref" value="${esc(c.ref)}">
    <div id="freteBox"></div>
    <div class="err" id="cErr" hidden></div>
    <p class="hint">Entregamos até ${CONFIG.frete[CONFIG.frete.length - 1].ateKm} km da loja. ${CONFIG.frete.map(f => `até ${f.ateKm} km: ${brl(f.taxa)}`).join(" · ")}${CONFIG.freteGratisAcima ? ` · Grátis acima de ${brl(CONFIG.freteGratisAcima)}` : ""}</p>`;
  $("#cFoot").innerHTML = `<button class="ghost" type="button" id="back">Voltar</button><button class="primary" type="button" id="calc"><span>Calcular frete</span><span>→</span></button>`;
  $("#back").onclick = () => goto(1);
  $("#calc").onclick = calcularFrete;
  $("#gpsBtn").onclick = usarGPS;
  renderFrete();
}
function renderFrete() {
  const box = $("#freteBox"); if (!box) return;
  if (!frete) { box.innerHTML = ""; return; }
  box.innerHTML = frete.atende
    ? `<div class="frete ok"><div><b>${frete.gratis ? "Frete grátis" : "Taxa de entrega " + brl(frete.taxa)}</b><span>${String(frete.km).replace(".", ",")} km da loja${gps ? " · pela sua localização" : ""}</span></div><span class="fi">✓</span></div>`
    : `<div class="frete bad"><div><b>Fora da área de entrega</b><span>${String(frete.km).replace(".", ",")} km da loja. Entregamos até ${frete.max} km. Fale com a gente no WhatsApp.</span></div></div>`;
  if (frete.atende) $("#cFoot").innerHTML = `<button class="ghost" type="button" id="back">Voltar</button><button class="primary" type="button" id="toPag"><span>Continuar para pagamento</span><span>→</span></button>`,
    $("#back").onclick = () => goto(1), $("#toPag").onclick = () => { if (validarDados().length) return mostrarErros(validarDados()); goto(3); px("AddPaymentInfo"); };
}
function validarDados() {
  const req = [["cNome", "nome", "seu nome"], ["cFone", "fone", "seu telefone"], ["cRua", "rua", "a rua"], ["cNum", "num", "o número"], ["cBairro", "bairro", "o bairro"]];
  const falta = [];
  req.forEach(([id, k, lbl]) => { if (!String(cliente[k] || "").trim()) { falta.push(lbl); document.getElementById(id)?.classList.add("bad"); } });
  if (cliente.fone && cliente.fone.replace(/\D/g, "").length < 10) { falta.push("um telefone com DDD"); $("#cFone")?.classList.add("bad"); }
  return falta.length ? ["Preencha " + falta.join(", ") + "."] : [];
}
function mostrarErros(errs) { const box = $("#cErr"); if (!box) return; box.hidden = !errs.length; box.textContent = errs.join(" "); if (errs.length) box.scrollIntoView({ block: "center", behavior: "smooth" }); }
async function calcularFrete() {
  const errs = validarDados(); if (errs.length) return mostrarErros(errs);
  mostrarErros([]);
  const btn = $("#calc"); btn.disabled = true; btn.firstElementChild.textContent = "Calculando…";
  const body = gps ? { ...gps, subtotal: subtotal() } : { cep: cliente.cep, rua: cliente.rua, numero: cliente.num, bairro: cliente.bairro, subtotal: subtotal() };
  let r = await api("frete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  // Servidor indisponível (arquivo aberto direto no computador ou hospedagem sem funções): calcula no próprio navegador
  if (!r || (!r.ok && !("atende" in r) && !/endereço/i.test(r.erro || ""))) r = await freteNoNavegador();
  btn.disabled = false; btn.firstElementChild.textContent = "Calcular frete";
  if (!r.ok) { frete = null; renderFrete(); return mostrarErros([r.erro || "Não foi possível calcular o frete."]); }
  frete = r; renderFrete();
}
async function freteNoNavegador() {
  try {
    let pos = gps;
    if (!pos) {
      const tentativas = [
        { street: `${cliente.num} ${cliente.rua}`.trim(), city: CONFIG.cidade, state: CONFIG.uf, country: "Brasil" },
        { q: [cliente.rua, cliente.bairro, CONFIG.cidade, CONFIG.uf, "Brasil"].filter(Boolean).join(", ") },
        { postalcode: String(cliente.cep).replace(/\D/g, ""), country: "Brasil" }
      ];
      for (const t of tentativas) {
        const u = "https://nominatim.openstreetmap.org/search?" + new URLSearchParams({ format: "json", limit: "1", countrycodes: "br", ...t });
        const j = await fetch(u, { headers: { "Accept-Language": "pt-BR" } }).then(x => x.json()).catch(() => []);
        if (j && j[0]) { pos = { lat: parseFloat(j[0].lat), lng: parseFloat(j[0].lon) }; break; }
      }
    }
    if (!pos) return { ok: false, erro: "Não encontramos esse endereço. Confira a rua e o número, ou toque em “Usar minha localização”." };
    const km = window.CATALOGO.distanciaKm(pos.lat, pos.lng);
    return { ok: true, lat: pos.lat, lng: pos.lng, ...taxaPorKm(km, subtotal()) };
  } catch (e) {
    return { ok: false, erro: "Não foi possível calcular o frete. Verifique sua internet e tente de novo." };
  }
}
function usarGPS() {
  if (!navigator.geolocation) return toast("Seu navegador não permite localização");
  const b = $("#gpsBtn"); b.textContent = "Localizando…"; b.disabled = true;
  navigator.geolocation.getCurrentPosition(p => {
    gps = { lat: p.coords.latitude, lng: p.coords.longitude };
    b.textContent = "📍 Localização ok"; b.disabled = false; toast("Localização encontrada. Complete o endereço e calcule o frete.");
    frete = null; renderFrete();
  }, () => { b.textContent = "📍 Usar minha localização"; b.disabled = false; toast("Não foi possível pegar sua localização"); }, { enableHighAccuracy: true, timeout: 10000 });
}
async function buscarCep(cep) {
  try {
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`); const j = await r.json();
    if (j.erro) return toast("CEP não encontrado");
    if (j.logradouro) { cliente.rua = j.logradouro; $("#cRua").value = j.logradouro; }
    if (j.bairro) { cliente.bairro = j.bairro; $("#cBairro").value = j.bairro; }
    saveCli(); $("#cNum").focus();
  } catch (e) {}
}

/* 3. pagamento */
function stepPagamento() {
  const c = cliente;
  const on = CONFIG.pagamentoOnline && onlineOk, off = CONFIG.pagamentoNaEntrega || !on;
  if (!on && c.pagModo !== "entrega") c.pagModo = "entrega";
  if (on && !["pix", "cartao", "entrega"].includes(c.pagModo)) c.pagModo = "pix";
  if (!off && c.pagModo === "entrega") c.pagModo = "pix";
  $("#cBody").innerHTML = `
    <h4 class="h4">Como você quer pagar?</h4>
    ${on ? `<label class="opt big"><input type="radio" name="pagModo" value="pix" ${c.pagModo === "pix" ? "checked" : ""}><span><b>Pix agora</b><small>O QR Code e o código copia e cola aparecem aqui mesmo. Não precisa de conta no Mercado Pago.</small></span></label>
    <div id="pixBox" ${c.pagModo === "pix" ? "" : "hidden"} style="margin:0 0 8px 12px"><label class="fl" for="cEmail">Seu e-mail (para o comprovante)</label><input class="in" id="cEmail" data-k="email" type="email" inputmode="email" autocomplete="email" placeholder="voce@email.com" value="${esc(c.email || "")}"></div>
    <label class="opt big"><input type="radio" name="pagModo" value="cartao" ${c.pagModo === "cartao" ? "checked" : ""}><span><b>Cartão de crédito ou débito</b><small>Você digita o cartão aqui mesmo, no site. Sem conta e sem sair da página.</small></span></label>` : ""}
    ${off ? `<label class="opt big"><input type="radio" name="pagModo" value="entrega" ${c.pagModo === "entrega" ? "checked" : ""}><span><b>Pagar na entrega</b><small>Pix, cartão ou dinheiro para o entregador</small></span></label>` : ""}
    <div id="offBox" ${c.pagModo === "entrega" ? "" : "hidden"}>
      <div class="pay">${["Pix", "Cartão de crédito", "Cartão de débito", "Dinheiro"].map((p, i) => `<label class="opt"><input type="radio" name="pag" id="pag${i}" value="${p}" ${c.pag === p ? "checked" : ""}><span>${p}</span></label>`).join("")}</div>
      <div id="trocoBox" ${c.pag === "Dinheiro" ? "" : "hidden"}><label class="fl" for="cTroco">Troco para quanto?</label><input class="in" id="cTroco" data-k="troco" inputmode="decimal" placeholder="Ex: 100 (deixe vazio se não precisar)" value="${esc(c.troco)}"></div>
    </div>
    <label class="fl" for="cObs">Observações do pedido</label><textarea class="in" id="cObs" data-k="obs" maxlength="200" placeholder="Ex: interfone quebrado, ligar ao chegar">${esc(c.obs)}</textarea>
    <div class="err" id="cErr" hidden></div>`;
  $("#cFoot").innerHTML = `<button class="ghost" type="button" id="back">Voltar</button><button class="primary" type="button" id="toRev"><span>Revisar pedido</span><span>→</span></button>`;
  $("#back").onclick = () => goto(2);
  $("#toRev").onclick = () => {
    const tr = parseFloat(String(c.troco).replace(",", "."));
    if (c.pagModo === "entrega" && c.pag === "Dinheiro" && c.troco && !(tr >= totalPedido())) { $("#cTroco").classList.add("bad"); return mostrarErros(["O valor do troco precisa ser maior que o total."]); }
    if (c.pagModo === "pix" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(c.email || "").trim())) { $("#cEmail").classList.add("bad"); return mostrarErros(["Informe seu e-mail para receber o comprovante do Pix."]); }
    goto(4);
  };
}
const totalPedido = () => r2(subtotal() + (frete?.taxa || 0));

/* 4. revisão */
function stepRevisao() {
  const c = cliente, L = linhas(), online = c.pagModo === "cartao", pix = c.pagModo === "pix";
  $("#cBody").innerHTML = `
    <div class="rev">${L.map(i => `<div class="rev-i"><span><b>${i.qty}× ${esc(i.nome)}</b>${optText(i).map(t => `<small>${esc(t)}</small>`).join("")}</span><span>${brl(i.total)}</span></div>`).join("")}</div>
    <div class="rev-b"><h5>Entrega</h5><p>${esc(c.nome)} · ${esc(c.fone)}<br>${esc(c.rua)}, ${esc(c.num)}${c.comp ? " · " + esc(c.comp) : ""}<br>${esc(c.bairro)}${c.ref ? " · " + esc(c.ref) : ""}</p><button class="link" type="button" data-go="2">Alterar</button></div>
    <div class="rev-b"><h5>Pagamento</h5><p>${pix ? "Pix agora, pelo site" : online ? "Cartão agora, pelo site" : "Na entrega · " + esc(c.pag) + (c.pag === "Dinheiro" ? (c.troco ? " · troco para " + brl(parseFloat(String(c.troco).replace(",", "."))) : " · sem troco") : "")}</p><button class="link" type="button" data-go="3">Alterar</button></div>
    <div class="totals">
      <div><span>Produtos</span><span>${brl(subtotal())}</span></div>
      <div><span>Entrega (${String(frete.km).replace(".", ",")} km)</span><span>${frete.gratis ? "Grátis" : brl(frete.taxa)}</span></div>
      <div class="t"><span>Total</span><span>${brl(totalPedido())}</span></div>
    </div>
    <div class="err" id="cErr" hidden></div>`;
  $("#cBody").querySelectorAll("[data-go]").forEach(b => b.onclick = () => goto(+b.dataset.go));
  if (pix) {
    $("#cFoot").innerHTML = `<button class="ghost" type="button" id="back">Voltar</button><button class="primary" type="button" id="payBtn"><span>Gerar Pix ${brl(totalPedido())}</span><span>→</span></button>`;
    $("#payBtn").onclick = pagarPix;
  } else if (online) {
    $("#cFoot").innerHTML = `<button class="ghost" type="button" id="back">Voltar</button><button class="primary" type="button" id="payBtn"><span>Pagar com cartão ${brl(totalPedido())}</span><span>→</span></button>`;
    $("#payBtn").onclick = telaCartao;
  } else {
    $("#cFoot").innerHTML = `<button class="ghost" type="button" id="back">Voltar</button><button class="primary" type="button" id="confirmBtn"><span>Confirmar pedido</span><span>${brl(totalPedido())}</span></button>`;
    $("#confirmBtn").onclick = confirmarEntrega;
  }
  $("#back").onclick = () => goto(3);
}

/* ---------- Cartão direto no site (Card Payment Brick do Mercado Pago) ---------- */
function carregarSdkMP() {
  if (window.MercadoPago) return Promise.resolve();
  return new Promise((ok, erro) => {
    const s = document.createElement("script"); s.src = "https://sdk.mercadopago.com/js/v2";
    s.onload = ok; s.onerror = () => erro(new Error("sdk")); document.head.appendChild(s);
  });
}
let cardBrick = null;
async function telaCartao() {
  const total = totalPedido();
  px("InitiateCheckout", { value: total, currency: "BRL", num_items: cart.length });
  $("#cSteps").innerHTML = "";
  $("#cBody").innerHTML = `<div class="cardw"><h4>Pagar com cartão</h4><p class="pix-v">${brl(total)}</p>
    <p class="hint" style="margin-top:0">Pagamento seguro processado pelo Mercado Pago. Os dados do cartão não ficam salvos no site.</p>
    <div id="cardBrick"><div class="pix-st"><span class="spin"></span><span>Carregando formulário…</span></div></div>
    <div class="err" id="cErr" hidden></div></div>`;
  $("#cFoot").innerHTML = `<button class="ghost" type="button" id="cardBack" style="width:100%">Escolher outra forma de pagamento</button>`;
  $("#cardBack").onclick = () => { try { cardBrick && cardBrick.unmount(); } catch (e) {} step = 3; renderCheckout(); };
  try { await carregarSdkMP(); }
  catch (e) { $("#cardBrick").innerHTML = ""; return mostrarErros(["Não foi possível carregar o pagamento com cartão. Verifique sua internet ou use o Pix."]); }
  try { cardBrick && cardBrick.unmount(); } catch (e) {}
  const mp = new window.MercadoPago(CONFIG.mpPublicKey, { locale: "pt-BR" });
  $("#cardBrick").innerHTML = "";
  cardBrick = await mp.bricks().create("cardPayment", "cardBrick", {
    initialization: { amount: total, payer: { email: cliente.email || "" } },
    customization: {
      visual: { style: { theme: "dark", customVariables: { baseColor: "#F2A81D" } }, texts: { formSubmit: "Pagar " + brl(total) } },
      paymentMethods: { maxInstallments: 1, minInstallments: 1 }
    },
    callbacks: {
      onReady: () => {},
      onError: (e) => { console.error(e); },
      onSubmit: (formData) => new Promise(async (resolve, reject) => {
        mostrarErros([]);
        const body = {
          itens: cart.map(i => ({ id: i.id, qty: i.qty, sel: i.sel, obs: i.obs })),
          cliente: { nome: cliente.nome, fone: cliente.fone, rua: cliente.rua, numero: cliente.num, comp: cliente.comp, bairro: cliente.bairro, ref: cliente.ref, obs: cliente.obs },
          entrega: { lat: frete.lat, lng: frete.lng },
          cartao: formData
        };
        const r = await api("cartao", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => ({ erro: "Sem conexão. Tente de novo." }));
        if (r.status === "approved") {
          resolve();
          px("Purchase", { value: r.total, currency: "BRL" });
          try { cardBrick.unmount(); } catch (e) {}
          finalizar({ pedido: r.pedido, id: r.id, metodo: r.metodo || "credit_card" });
        } else if (r.status === "in_process" || r.status === "pending") {
          resolve();
          try { cardBrick.unmount(); } catch (e) {}
          telaPix({ pix: false, pedido: r.pedido, id: r.id, total: r.total, expira: new Date(Date.now() + 30 * 60000).toISOString(), analise: true });
        } else {
          reject(); mostrarErros([r.erro || "Cartão recusado. Tente outro cartão ou o Pix."]);
        }
      })
    }
  });
}

/* ---------- Pix direto no site ---------- */
let pixTimer = null;
async function pagarPix() {
  const btn = $("#payBtn"); btn.disabled = true; btn.firstElementChild.textContent = "Gerando Pix…";
  px("InitiateCheckout", { value: totalPedido(), currency: "BRL", num_items: cart.length });
  const body = {
    itens: cart.map(i => ({ id: i.id, qty: i.qty, sel: i.sel, obs: i.obs })),
    cliente: { nome: cliente.nome, fone: cliente.fone, rua: cliente.rua, numero: cliente.num, comp: cliente.comp, bairro: cliente.bairro, ref: cliente.ref, obs: cliente.obs },
    entrega: { lat: frete.lat, lng: frete.lng },
    email: cliente.email
  };
  const r = await api("pix", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => ({ erro: "Sem conexão. Tente de novo." }));
  if (!r.ok) { btn.disabled = false; btn.firstElementChild.textContent = "Gerar Pix " + brl(totalPedido()); return mostrarErros([r.erro]); }
  const pend = { pix: true, pedido: r.pedido, id: r.id, qr: r.qr, qr64: r.qr64, expira: r.expira, total: r.total, cart, cliente, frete };
  store.set("bravio_pendente", pend);
  telaPix(pend);
}
function telaPix(p) {
  clearInterval(pixTimer);
  $("#cSteps").innerHTML = "";
  if (p.analise) {
    $("#cBody").innerHTML = `<div class="pixw"><h4>Pagamento em análise</h4><p class="pix-v">${brl(p.total)}</p>
      <p class="hint">O banco está analisando o pagamento com cartão. Isso costuma levar menos de 1 minuto.</p>
      <div class="pix-st" id="pixSt"><span class="spin"></span><span>Aguardando aprovação… <b id="pixTime"></b></span></div></div>`;
    $("#cFoot").innerHTML = `<button class="ghost" type="button" id="pixCancel" style="width:100%">Escolher outra forma de pagamento</button>`;
  } else {
  $("#cBody").innerHTML = `<div class="pixw">
    <h4>Pague com Pix</h4>
    <p class="pix-v">${brl(p.total)}</p>
    <p class="hint" style="margin-top:0">Abra o app do seu banco, escolha <b>Pix › Pagar com QR Code</b> ou <b>Pix Copia e Cola</b>.</p>
    ${p.qr64 ? `<img class="pix-qr" src="data:image/png;base64,${p.qr64}" alt="QR Code do Pix">` : ""}
    <label class="fl" for="pixCode" style="text-align:left">Pix Copia e Cola</label>
    <textarea class="in pix-code" id="pixCode" readonly rows="3">${esc(p.qr)}</textarea>
    <button class="primary" type="button" id="copyPix" style="width:100%;justify-content:center;margin-top:8px">Copiar código Pix</button>
    <div class="pix-st" id="pixSt"><span class="spin"></span><span>Aguardando pagamento… <b id="pixTime"></b></span></div>
    <p class="hint">Assim que o banco confirmar, esta tela muda sozinha. Não feche a página.</p>
  </div>`;
  $("#cFoot").innerHTML = `<button class="ghost" type="button" id="pixCancel" style="width:100%">Escolher outra forma de pagamento</button>`;
  }
  if ($("#copyPix")) $("#copyPix").onclick = async () => {
    try { await navigator.clipboard.writeText(p.qr); toast("Código Pix copiado"); }
    catch (e) { const t = $("#pixCode"); t.focus(); t.select(); toast("Código selecionado, copie com Ctrl+C"); }
  };
  $("#pixCancel").onclick = () => { clearInterval(pixTimer); store.del("bravio_pendente"); step = 3; renderCheckout(); };
  const fim = new Date(p.expira).getTime();
  let checando = false, n = 0;
  const tick = async () => {
    const rest = Math.max(0, fim - Date.now());
    const el = $("#pixTime"); if (el) el.textContent = `expira em ${String(Math.floor(rest / 60000)).padStart(2, "0")}:${String(Math.floor(rest / 1000) % 60).padStart(2, "0")}`;
    if (rest <= 0) {
      clearInterval(pixTimer); store.del("bravio_pendente");
      $("#pixSt").innerHTML = `<span>Este Pix expirou.</span>`;
      $("#cFoot").innerHTML = `<button class="primary" type="button" id="pixNovo"><span>Gerar novo Pix</span><span>↻</span></button>`;
      $("#pixNovo").onclick = () => { step = 4; renderCheckout(); };
      return;
    }
    if (checando || (n++ % 4)) return;   // consulta o status a cada ~4 s
    checando = true;
    const s = await api("status?payment_id=" + p.id).catch(() => ({}));
    checando = false;
    if (s.status === "approved" && s.pedido === p.pedido) {
      clearInterval(pixTimer);
      px("Purchase", { value: s.valor, currency: "BRL" });
      if ($("#cartOv").hidden) show("#cartOv");
      finalizar({ pedido: s.pedido, id: s.id, metodo: s.metodo || "bank_transfer" });
    } else if (s.status === "cancelled" || s.status === "rejected") {
      clearInterval(pixTimer); store.del("bravio_pendente");
      $("#pixSt").innerHTML = `<span>${p.analise ? "Pagamento recusado pelo banco. Tente outro cartão ou o Pix." : "Pix cancelado. Gere um novo ou escolha outra forma de pagamento."}</span>`;
    }
  };
  pixTimer = setInterval(tick, 1000); tick();
}

async function pagarOnline() {
  const btn = $("#payBtn"); btn.disabled = true; btn.firstElementChild.textContent = "Abrindo pagamento…";
  px("InitiateCheckout", { value: totalPedido(), currency: "BRL", num_items: cart.length });
  const body = {
    itens: cart.map(i => ({ id: i.id, qty: i.qty, sel: i.sel, obs: i.obs })),
    cliente: { nome: cliente.nome, fone: cliente.fone, rua: cliente.rua, numero: cliente.num, comp: cliente.comp, bairro: cliente.bairro, ref: cliente.ref, obs: cliente.obs },
    entrega: { lat: frete.lat, lng: frete.lng }
  };
  const r = await api("pagamento", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => ({ erro: "Sem conexão. Tente de novo." }));
  if (!r.ok) { btn.disabled = false; btn.firstElementChild.textContent = "Pagar " + brl(totalPedido()); return mostrarErros([r.erro]); }
  // guarda o pedido para montar a mensagem quando o cliente voltar do Mercado Pago
  store.set("bravio_pendente", { pedido: r.pedido, cart, cliente, frete, total: r.total });
  location.href = r.url;
}

/* ---------- mensagem do WhatsApp ---------- */
function mensagem(pago, reg) {
  const c = cliente, L = linhas(), st = subtotal();
  const M = [];
  const num = reg ? reg.numero : "";
  M.push(`*${reg ? "PEDIDO #" + num : "NOVO PEDIDO"} · ${CONFIG.nome.toUpperCase()}*`);
  if (reg) M.push("_Pedido registrado no sistema da loja._");
  M.push("");
  L.forEach(i => { M.push(`*${i.qty}x ${i.nome}* · ${brl(i.total)}`); optText(i).forEach(t => M.push(`   - ${t}`)); });
  M.push("");
  M.push(`Produtos: ${brl(st)}`);
  M.push(`Entrega (${String(frete.km).replace(".", ",")} km): ${frete.gratis ? "grátis" : brl(frete.taxa)}`);
  M.push(`*Total: ${brl(r2(st + frete.taxa))}*`);
  M.push("");
  if (pago) M.push(`*PAGO ONLINE* ✅ (${pago.metodo === "bank_transfer" ? "Pix" : pago.metodo === "debit_card" ? "cartão de débito" : "cartão de crédito"} · Mercado Pago nº ${pago.id})`);
  else {
    M.push(`*Pagamento na entrega:* ${c.pag}`);
    if (c.pag === "Dinheiro") M.push(c.troco ? `Troco para ${brl(parseFloat(String(c.troco).replace(",", ".")))}` : "Não precisa de troco");
  }
  M.push("");
  M.push(`*Cliente:* ${c.nome}`);
  M.push(`*Telefone:* ${c.fone}`);
  M.push(`*Endereço:* ${c.rua}, ${c.num}${c.comp ? ` · ${c.comp}` : ""}`);
  M.push(`*Bairro:* ${c.bairro}${c.cep ? ` · CEP ${c.cep}` : ""}`);
  if (c.ref) M.push(`*Referência:* ${c.ref}`);
  if (frete.lat) M.push(`*Mapa:* https://maps.google.com/?q=${frete.lat.toFixed(6)},${frete.lng.toFixed(6)}`);
  if (c.obs) { M.push(""); M.push(`*Obs:* ${c.obs}`); }
  return M.join("\n");
}
const waLink = msg => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;

/* ---------- registra o pedido no painel da loja ---------- */
let ultimoErro = "";
async function registrarPedido(pago) {
  const body = {
    itens: cart.map(i => ({ id: i.id, qty: i.qty, sel: i.sel, obs: i.obs })),
    cliente: { nome: cliente.nome, fone: cliente.fone, rua: cliente.rua, numero: cliente.num, comp: cliente.comp, bairro: cliente.bairro, ref: cliente.ref, obs: cliente.obs },
    cep: cliente.cep,
    entrega: { lat: frete.lat, lng: frete.lng },
    pagamento: pago ? { modo: "online", id: pago.id } : { modo: "entrega", forma: cliente.pag, troco: parseFloat(String(cliente.troco || "").replace(",", ".")) || 0 }
  };
  try {
    const r = await api("registrar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (r && r.ok) return r;
    ultimoErro = (r && r.erro) || "sem resposta do servidor";
    console.error("Pedido não registrado:", ultimoErro);
    return null;
  } catch (e) { ultimoErro = "sem conexão"; return null; }
}
async function finalizar(pago) {
  $("#cSteps").innerHTML = ""; $("#cFoot").innerHTML = "";
  $("#cBody").innerHTML = `<div class="sent"><div class="okbadge">Pagamento aprovado</div><h4>Enviando para a cozinha…</h4></div>`;
  const reg = await registrarPedido(pago);
  telaConfirmado(pago, reg);
}
async function confirmarEntrega() {
  const btn = $("#confirmBtn"); btn.disabled = true; btn.firstElementChild.textContent = "Enviando pedido…";
  px("Lead", { value: totalPedido(), currency: "BRL" });
  const reg = await registrarPedido(null);
  telaConfirmado(null, reg);
}
// Tela final. Com o pedido registrado, o WhatsApp vira só um aviso opcional.
function telaConfirmado(pago, reg) {
  if (!reg) return telaEnviado(mensagem(pago, null), !!pago, true);   // sem servidor: envia tudo pelo WhatsApp
  const msg = mensagem(pago, reg);
  $("#cSteps").innerHTML = "";
  $("#cBody").innerHTML = `<div class="sent">${pago ? `<div class="okbadge">Pagamento aprovado</div>` : ""}
    <h4>Pedido #${esc(reg.numero)} confirmado!</h4>
    <p>Seu pedido já chegou na nossa cozinha. ${pago ? "Está pago, é só aguardar a entrega." : `Pagamento na entrega: <b>${esc(cliente.pag)}</b>.`}</p>
    <p class="hint">Previsão e dúvidas pelo WhatsApp <b>${esc(CONFIG.telefone)}</b>.</p></div>`;
  $("#cFoot").innerHTML = `<a class="ghost" id="sendWa" href="${waLink(msg)}" target="_blank" rel="noopener" style="text-decoration:none;color:inherit">Falar no WhatsApp</a><button class="primary" type="button" id="novo"><span>Fazer novo pedido</span><span>→</span></button>`;
  cart = []; frete = null; step = 1; store.set("bravio_cart2", cart); renderBar(); store.del("bravio_pendente");
  $("#novo").onclick = () => hide("#cartOv");
}

function telaEnviado(msg, pago, enviar) {
  $("#cSteps").innerHTML = "";
  $("#cBody").innerHTML = `<div class="sent">${pago ? `<div class="okbadge">Pagamento aprovado</div>` : ""}<h4>${pago ? "Falta só um toque!" : "Pedido pronto!"}</h4>
    <p>${pago ? "Seu pagamento foi confirmado. <b>Envie o pedido no WhatsApp</b> para a cozinha começar." : "O WhatsApp abriu com o seu pedido. <b>Toque em enviar</b> por lá para confirmar."}</p>
    <p class="hint">Se o WhatsApp não abrir, copie o pedido e mande para <b>${esc(CONFIG.telefone)}</b>.</p>
    <pre class="msg" id="msgTxt">${esc(msg)}</pre></div>`;
  if (enviar && !pago) $("#cBody").querySelector("p").innerHTML = "Toque em <b>Enviar no WhatsApp</b> para confirmar o seu pedido.";
  if (enviar && ultimoErro) $("#cBody").querySelector(".hint").insertAdjacentHTML("afterend", `<p class="hint" style="opacity:.6">Detalhe técnico: ${esc(ultimoErro)}</p>`);
  $("#cFoot").innerHTML = (pago || enviar)
    ? `<button class="ghost" type="button" id="copyMsg">Copiar</button><a class="primary wa" id="sendWa" href="${waLink(msg)}" target="_blank" rel="noopener"><span>Enviar no WhatsApp</span><span>→</span></a>`
    : `<button class="ghost" type="button" id="copyMsg">Copiar pedido</button><button class="primary" type="button" id="novo"><span>Novo pedido</span><span>→</span></button>`;
  $("#copyMsg").onclick = async () => {
    try { await navigator.clipboard.writeText(msg); toast("Pedido copiado"); }
    catch (err) { const r = document.createRange(); r.selectNodeContents($("#msgTxt")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast("Texto selecionado, copie com Ctrl+C"); }
  };
  if ($("#novo")) $("#novo").onclick = () => { cart = []; frete = null; step = 1; saveCart(); hide("#cartOv"); };
  if (pago || enviar) $("#sendWa").onclick = () => { setTimeout(() => { cart = []; frete = null; step = 1; saveCart(); store.del("bravio_pendente"); }, 500); };
}

/* ---------- retorno do Mercado Pago ---------- */
async function retornoPagamento() {
  const q = new URLSearchParams(location.search);
  const pid = q.get("payment_id") || q.get("collection_id");
  const pend = store.get("bravio_pendente", null);
  if (!q.has("external_reference") && !pid) return;
  history.replaceState(null, "", location.pathname);
  if (!pend) return;
  cart = pend.cart; cliente = pend.cliente; frete = pend.frete; saveCart();
  show("#cartOv");
  if (!pid || pid === "null") { step = 4; renderCheckout(); return mostrarErros(["Pagamento não concluído. Tente de novo ou escolha pagar na entrega."]); }
  $("#cSteps").innerHTML = ""; $("#cFoot").innerHTML = "";
  $("#cBody").innerHTML = `<div class="sent"><h4>Confirmando pagamento…</h4></div>`;
  const s = await api("status?payment_id=" + encodeURIComponent(pid)).catch(() => ({}));
  if (s.status === "approved" && s.pedido === pend.pedido) {
    px("Purchase", { value: s.valor, currency: "BRL" });
    finalizar({ pedido: s.pedido, id: s.id, metodo: s.metodo });
  } else if (s.status === "pending" || s.status === "in_process") {
    $("#cBody").innerHTML = `<div class="sent"><h4>Aguardando pagamento</h4><p>Assim que o Pix ou cartão for confirmado, toque em verificar.</p></div>`;
    $("#cFoot").innerHTML = `<button class="primary" type="button" id="recheck"><span>Já paguei, verificar</span><span>↻</span></button>`;
    $("#recheck").onclick = () => { history.replaceState(null, "", "?payment_id=" + pid + "&external_reference=" + pend.pedido); retornoPagamento(); };
  } else {
    step = 4; renderCheckout();
    mostrarErros(["Pagamento recusado ou cancelado. Tente outro meio ou escolha pagar na entrega."]);
  }
}

/* ---------- eventos do checkout ---------- */
$("#cBody").addEventListener("click", e => {
  const d = e.target.closest("[data-dec]"), i = e.target.closest("[data-inc]");
  if (d) { const ix = +d.dataset.dec; cart[ix].qty--; if (cart[ix].qty <= 0) cart.splice(ix, 1); saveCart(); renderCheckout(); }
  if (i) { const ix = +i.dataset.inc; cart[ix].qty++; saveCart(); renderCheckout(); }
});
function onField(e) {
  const t = e.target, k = t.dataset.k;
  if (k) {
    let v = t.value;
    if (k === "cep") { v = v.replace(/\D/g, "").slice(0, 8); if (v.length > 5) v = v.slice(0, 5) + "-" + v.slice(5); if (t.value !== v) t.value = v; }
    const mudouEndereco = ["cep", "rua", "num", "bairro"].includes(k) && cliente[k] !== v;
    cliente[k] = v; t.classList.remove("bad");
    if (mudouEndereco && frete) { frete = null; gps = null; stepEntrega(); document.getElementById(t.id)?.focus(); }
    if (k === "cep" && e.type === "input" && v.length === 9) buscarCep(v.replace("-", ""));
  }
  if (t.name === "pag") { cliente.pag = t.value; $("#trocoBox").hidden = cliente.pag !== "Dinheiro"; }
  if (t.name === "pagModo") { cliente.pagModo = t.value; $("#offBox").hidden = t.value !== "entrega"; if ($("#pixBox")) $("#pixBox").hidden = t.value !== "pix"; }
  saveCli();
}
$("#cBody").addEventListener("input", onField);
$("#cBody").addEventListener("change", e => { if (e.target.type === "radio") onField(e); });

/* ---------- janelas ---------- */
let lastFocus = null;
function show(s) { lastFocus = document.activeElement; $(s).hidden = false; document.body.style.overflow = "hidden"; $(s).querySelector(".x")?.focus(); }
function hide(s) { $(s).hidden = true; if ($("#prodOv").hidden && $("#cartOv").hidden) document.body.style.overflow = ""; lastFocus?.focus?.(); }
document.querySelectorAll(".overlay").forEach(o => {
  o.addEventListener("click", e => { if (e.target === o || e.target.closest("[data-close]")) hide("#" + o.id); });
});
addEventListener("keydown", e => { if (e.key === "Escape") { if (!$("#prodOv").hidden) hide("#prodOv"); else if (!$("#cartOv").hidden) hide("#cartOv"); } });
$("#openCart").onclick = () => { step = 1; renderCheckout(); show("#cartOv"); };

// O pagamento online só aparece se o servidor (funções da Netlify + token do Mercado Pago) estiver ativo
let onlineOk = false;
if (CONFIG.pagamentoOnline && location.protocol.startsWith("http")) {
  fetch("/api/status").then(r => r.json()).then(j => { onlineOk = j && j.erro === "payment_id ausente"; }).catch(() => {});
}

renderMenu(); renderBar(); retornoPagamento();

// Se o cliente recarregou a página com um Pix em aberto, volta para a tela do QR Code
(function retomarPix() {
  const p = store.get("bravio_pendente", null);
  if (!p || !p.pix || new Date(p.expira).getTime() < Date.now() || location.search) return;
  cart = p.cart; cliente = p.cliente; frete = p.frete; saveCart();
  show("#cartOv"); telaPix(p);
})();
})();
