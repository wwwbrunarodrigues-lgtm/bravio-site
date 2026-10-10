// Geocodificação de endereço (OpenStreetMap / Nominatim) — gratuito, sem chave.
// Política de uso: no máximo 1 pedido por segundo e um User-Agent identificado.
const UA = "BravioFoodHouse-Cardapio/1.0 (pedidos via site)";

async function nominatim(params) {
  const url = "https://nominatim.openstreetmap.org/search?" +
    new URLSearchParams({ format: "json", limit: "1", countrycodes: "br", ...params });
  const r = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "pt-BR" } });
  if (!r.ok) return null;
  const j = await r.json();
  return j && j[0] ? { lat: parseFloat(j[0].lat), lng: parseFloat(j[0].lon) } : null;
}

// Tenta do mais preciso para o menos preciso.
async function geocodificar({ rua, numero, bairro, cep, cidade, uf }) {
  const tentativas = [];
  if (rua) tentativas.push({ street: `${numero || ""} ${rua}`.trim(), city: cidade, state: uf, country: "Brasil" });
  if (rua) tentativas.push({ q: [rua, bairro, cidade, uf, "Brasil"].filter(Boolean).join(", ") });
  if (cep) tentativas.push({ postalcode: String(cep).replace(/\D/g, ""), country: "Brasil" });
  if (bairro) tentativas.push({ q: [bairro, cidade, uf, "Brasil"].filter(Boolean).join(", ") });
  for (const t of tentativas) {
    const r = await nominatim(t);
    if (r) return r;
  }
  return null;
}

module.exports = { geocodificar };
