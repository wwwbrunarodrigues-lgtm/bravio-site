// Banco de pedidos. No ar usa o Netlify Blobs (grátis, já vem com a Netlify).
// Em testes locais (variável BLOBS_LOCAL_DIR) grava em arquivos.
const fs = require("fs"), path = require("path");

function abrir(event) {
  if (process.env.BLOBS_LOCAL_DIR) {
    const dir = process.env.BLOBS_LOCAL_DIR;
    const f = k => path.join(dir, encodeURIComponent(k));
    fs.mkdirSync(dir, { recursive: true });
    return {
      async get(k) { try { return JSON.parse(fs.readFileSync(f(k), "utf8")); } catch (e) { return null; } },
      async set(k, v) { fs.writeFileSync(f(k), JSON.stringify(v)); },
      async list(prefix) { return fs.readdirSync(dir).map(decodeURIComponent).filter(k => k.startsWith(prefix)); },
      async criar(k, v) { try { fs.writeFileSync(f(k), JSON.stringify(v), { flag: "wx" }); return true; } catch (e) { return false; } }
    };
  }
  const { connectLambda, getStore } = require("@netlify/blobs");
  if (event) connectLambda(event);
  // Consistência "eventual": a Netlify replica em poucos segundos (o painel compensa isso).
  const store = getStore({ name: "pedidos" });
  return {
    async get(k) { return store.get(k, { type: "json" }); },
    async set(k, v) { await store.setJSON(k, v); },
    async list(prefix) { const r = await store.list({ prefix }); return r.blobs.map(b => b.key); },
    // grava só se a chave ainda não existir (garante números de comanda sem repetição)
    async criar(k, v) { const r = await store.setJSON(k, v, { onlyIfNew: true }); return !!(r && r.modified); }
  };
}

// data de hoje no fuso de Brasília: 2026-10-10
const hojeBR = (t = Date.now()) => new Date(t - 3 * 3600000).toISOString().slice(0, 10);

module.exports = { abrir, hojeBR };
