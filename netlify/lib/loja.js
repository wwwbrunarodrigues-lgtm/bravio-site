// Situação da loja: horário fixo (catalogo.js) + botão "abrir/fechar agora" do painel
const CAT = require("../../public/catalogo.js");
const { abrir } = require("./db.js");

async function situacao(event) {
  let override = null;
  try { override = await abrir(event).get("_config/loja"); } catch (e) { console.error("loja:", e); }
  return CAT.statusLoja(override);
}

module.exports = { situacao };
