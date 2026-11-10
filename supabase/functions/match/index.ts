// Cintre — fonction « match » : correspondances web pour une pièce de garde-robe.
//
// Interroge en parallèle, côté serveur (les clés ne quittent jamais Supabase) :
//   - Google Shopping via la SERP API de Bright Data (gratuit : 5 000 requêtes par mois)
//   - eBay France via la Browse API officielle (gratuit : 5 000 appels par jour)
// Chaque fournisseur est facultatif : sans ses secrets, il est simplement ignoré.
//
// Secrets à créer dans Supabase (Edge Functions → Secrets) :
//   BRIGHTDATA_API_KEY, BRIGHTDATA_ZONE           → Google Shopping
//   EBAY_CLIENT_ID, EBAY_CLIENT_SECRET            → eBay
//   MATCH_DAILY_LIMIT (facultatif, 20 par défaut) → recherches par compte et par jour
// SUPABASE_URL, SUPABASE_ANON_KEY et SUPABASE_SERVICE_ROLE_KEY sont fournis automatiquement.
//
// Requête : POST { q: "hoodie zippé bleu marine walk in paris" }, avec la session de l'utilisateur.
// Réponse : { results: [...], providers: {...}, quota: {used, limit}, cached }

const env = (k: string, d = "") => Deno.env.get(k) ?? d;
const SUPABASE_URL = env("SUPABASE_URL");
const ANON = env("SUPABASE_ANON_KEY");
const SERVICE = env("SUPABASE_SERVICE_ROLE_KEY");
const BD_KEY = env("BRIGHTDATA_API_KEY"), BD_ZONE = env("BRIGHTDATA_ZONE");
const EBAY_ID = env("EBAY_CLIENT_ID"), EBAY_SECRET = env("EBAY_CLIENT_SECRET");
const LIMIT = Math.max(1, parseInt(env("MATCH_DAILY_LIMIT", "20")) || 20);
// Adresses des services (modifiables uniquement pour les tests locaux)
const BD_URL = env("BRIGHTDATA_URL", "https://api.brightdata.com/request");
const EBAY_API = env("EBAY_API", "https://api.ebay.com");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

type Result = {
  source: "google" | "ebay"; title: string; price: number | null; priceText: string; currency: string;
  shop: string; url: string; image: string; condition?: string;
};

function parsePrice(t: unknown): number | null {
  const s = String(t ?? "").replace(/\s| | /g, "");
  const m = s.match(/(\d+(?:[.,]\d{3})*(?:[.,]\d{1,2})?)/);
  if (!m) return null;
  let n = m[1];
  if (/,\d{1,2}$/.test(n)) n = n.replace(/\./g, "").replace(",", ".");
  else n = n.replace(/,/g, "");
  const v = parseFloat(n);
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : null;
}

/* ---------- Google Shopping (Bright Data SERP API) ---------- */
async function google(q: string): Promise<Result[]> {
  const url = `https://www.google.com/search?q=${encodeURIComponent(q)}&tbm=shop&hl=fr&gl=fr&brd_json=1`;
  const r = await fetch(BD_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${BD_KEY}` },
    body: JSON.stringify({ zone: BD_ZONE, url, format: "raw", country: "fr" }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Bright Data ${r.status}: ${text.slice(0, 160)}`);
  let data: Record<string, unknown>;
  try { data = JSON.parse(text); } catch { throw new Error("Bright Data : réponse non JSON (vérifie que la zone est de type SERP API)"); }
  const rows = ["shopping", "top_pla", "jackpot_pla", "bottom_pla"]
    .flatMap((k) => Array.isArray(data[k]) ? data[k] as Record<string, unknown>[] : [])
    .filter((x) => x && !x.view_all && x.link && x.title);
  const seen = new Set<string>();
  return rows.filter((x) => { const k = String(x.link); if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, 8).map((x) => ({
      source: "google", title: String(x.title).slice(0, 140), price: parsePrice(x.price), priceText: String(x.price ?? ""),
      currency: "EUR", shop: String(x.shop ?? "").slice(0, 60), url: String(x.link), image: String(x.image ?? ""),
    }));
}

/* ---------- eBay France (Browse API) ---------- */
let ebayToken = { value: "", exp: 0 };
async function ebayAuth(): Promise<string> {
  if (ebayToken.value && Date.now() < ebayToken.exp) return ebayToken.value;
  const r = await fetch(`${EBAY_API}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${btoa(`${EBAY_ID}:${EBAY_SECRET}`)}` },
    body: "grant_type=client_credentials&scope=" + encodeURIComponent("https://api.ebay.com/oauth/api_scope"),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.access_token) throw new Error(`eBay authentification ${r.status}: ${JSON.stringify(d).slice(0, 160)}`);
  ebayToken = { value: d.access_token, exp: Date.now() + (Number(d.expires_in) || 7200) * 1000 - 120_000 };
  return ebayToken.value;
}
async function ebay(q: string): Promise<Result[]> {
  const token = await ebayAuth();
  const u = new URL(`${EBAY_API}/buy/browse/v1/item_summary/search`);
  u.searchParams.set("q", q);
  u.searchParams.set("limit", "8");
  u.searchParams.set("filter", "buyingOptions:{FIXED_PRICE}");
  const r = await fetch(u, {
    headers: { Authorization: `Bearer ${token}`, "X-EBAY-C-MARKETPLACE-ID": "EBAY_FR", "Accept-Language": "fr-FR" },
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`eBay ${r.status}: ${JSON.stringify(d).slice(0, 160)}`);
  return (Array.isArray(d.itemSummaries) ? d.itemSummaries : []).slice(0, 8).map((x: Record<string, any>) => ({
    source: "ebay", title: String(x.title ?? "").slice(0, 140),
    price: x.price?.value != null ? parsePrice(x.price.value) : null,
    priceText: x.price ? `${x.price.value} ${x.price.currency}` : "", currency: String(x.price?.currency ?? "EUR"),
    shop: "eBay", url: String(x.itemWebUrl ?? ""), image: String(x.image?.imageUrl ?? x.thumbnailImages?.[0]?.imageUrl ?? ""),
    condition: x.condition ? String(x.condition) : undefined,
  })).filter((x: Result) => x.url && x.title);
}

/* ---------- Supabase : utilisateur, quota, cache ---------- */
async function currentUser(auth: string): Promise<string | null> {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: auth, apikey: ANON } });
  if (!r.ok) return null;
  const u = await r.json().catch(() => null);
  return u?.id ?? null;
}
async function rpc(fn: string, args: Record<string, unknown>) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`base ${fn} ${r.status}: ${(await r.text()).slice(0, 160)}`);
  return r.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const auth = req.headers.get("Authorization") ?? "";
  const uid = auth ? await currentUser(auth) : null;
  if (!uid) return json({ error: "auth", message: "Connecte-toi pour chercher des correspondances." }, 401);

  const body = await req.json().catch(() => ({}));
  const q = String(body?.q ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  if (q.length < 3) return json({ error: "query", message: "Précise un peu la pièce (type, couleur, marque)." }, 400);
  const useGoogle = !!(BD_KEY && BD_ZONE), useEbay = !!(EBAY_ID && EBAY_SECRET);
  if (!useGoogle && !useEbay) return json({ error: "config", message: "Aucun fournisseur configuré (secrets Bright Data ou eBay manquants)." }, 503);

  const key = `${useGoogle ? "g" : ""}${useEbay ? "e" : ""}:${q.toLowerCase()}`;
  try {
    const hit = await rpc("cintre_match_cached", { p_key: key });
    if (hit && Array.isArray(hit.results)) return json({ ...hit, cached: true, quota: null });
  } catch (_) { /* cache indisponible : on continue */ }

  let used: number;
  try { used = await rpc("cintre_match_take", { p_user: uid, p_limit: LIMIT }); }
  catch (e) { return json({ error: "setup", message: "Lance le script supabase/match.sql dans Supabase.", detail: String(e).slice(0, 200) }, 500); }
  if (used < 0) return json({ error: "quota", message: `Limite de ${LIMIT} recherches par jour atteinte. Réessaie demain.`, quota: { used: LIMIT, limit: LIMIT } }, 429);

  const providers: Record<string, { ok: boolean; count: number; error?: string }> = {};
  const run = (name: string, on: boolean, f: () => Promise<Result[]>): Promise<Result[]> => !on ? Promise.resolve([]) :
    f().then((r) => { providers[name] = { ok: true, count: r.length }; return r; })
      .catch((e) => { providers[name] = { ok: false, count: 0, error: String(e?.message ?? e).slice(0, 200) }; return []; });
  const [g, e] = await Promise.all([run("google", useGoogle, () => google(q)), run("ebay", useEbay, () => ebay(q))]);
  // Alterne les sources : Google d'abord (produits neufs), puis eBay (souvent seconde main)
  const results: Result[] = [];
  for (let i = 0; i < Math.max(g.length, e.length); i++) { if (g[i]) results.push(g[i]); if (e[i]) results.push(e[i]); }
  const out = { results: results.slice(0, 12), providers };
  if (results.length) { try { await rpc("cintre_match_store", { p_key: key, p_data: out }); } catch (_) { /* ignore */ } }
  return json({ ...out, cached: false, quota: { used, limit: LIMIT } });
});
