// Calendário do Recanto Agradável
//   GET  ?t=<token>                      -> exporta as reservas por fora em iCal, para o Airbnb bloquear as datas (sem nomes)
//   POST { acao: "sincronizar" }          -> lê o iCal do Airbnb e grava reservas e bloqueios (membro logado ou agendamento)
import { createClient } from "npm:@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const ORIGENS = ["https://andrecunha2004.github.io", "http://localhost:8777"];

function cors(req: Request): Record<string, string> {
  const o = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ORIGENS.includes(o) ? o : ORIGENS[0],
    "Access-Control-Allow-Headers": (req.headers.get("access-control-request-headers") || "authorization, x-client-info, apikey, content-type").replace(/[^a-zA-Z0-9,\- ]/g, "").slice(0, 300),
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
}
const json = (req: Request, corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors(req), "Content-Type": "application/json" } });
function iguais(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let x = 0; for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i); return x === 0;
}
async function segredos() {
  const { data, error } = await db.from("push_segredos").select("segredo_cron,token_ical").eq("id", 1).single();
  if (error) throw error;
  return data as { segredo_cron: string; token_ical: string };
}
async function membro(req: Request) {
  const t = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!t || t.split(".").length !== 3) return false;
  const { data, error } = await db.auth.getUser(t);
  if (error || !data.user?.email) return false;
  const { data: p } = await db.from("usuarios_permitidos").select("email").eq("email", data.user.email.toLowerCase()).maybeSingle();
  return !!p;
}

// ---------- leitura de iCal ----------
type Ev = Record<string, string>;
function eventos(txt: string): Ev[] {
  const linhas = txt.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
  const out: Ev[] = []; let ev: Ev | null = null;
  for (const l of linhas) {
    if (l === "BEGIN:VEVENT") ev = {};
    else if (l === "END:VEVENT") { if (ev) out.push(ev); ev = null; }
    else if (ev) { const i = l.indexOf(":"); if (i > 0) ev[l.slice(0, i).split(";")[0].toUpperCase()] = l.slice(i + 1); }
  }
  return out;
}
const dataIcal = (v?: string) => { const m = /^(\d{4})(\d{2})(\d{2})/.exec(v || ""); return m ? `${m[1]}-${m[2]}-${m[3]}` : null; };

async function sincroniza() {
  const { data: fontes, error } = await db.from("calendario_fontes").select("id,origem,url");
  if (error) throw error;
  const res: Record<string, unknown> = {};
  for (const f of fontes || []) {
    try {
      const r = await fetch(f.url, { headers: { "User-Agent": "RecantoAgradavel/1.0" }, signal: AbortSignal.timeout(15000) });
      const txt = await r.text();
      if (!r.ok || !txt.includes("BEGIN:VCALENDAR")) throw new Error("resposta " + r.status);
      const linhas = eventos(txt).map((e) => {
        const ini = dataIcal(e.DTSTART), fim = dataIcal(e.DTEND);
        if (!ini || !fim || fim <= ini) return null;
        const resumo = (e.SUMMARY || "").toLowerCase();
        const cod = /details\/([A-Z0-9]{6,14})/.exec(e.DESCRIPTION || "");
        return {
          uid: (f.origem + ":" + (e.UID || ini + fim)).slice(0, 300), origem: f.origem,
          tipo: /not available|indispon|bloque|blocked/.test(resumo) ? "bloqueio" : "reserva",
          inicio: ini, fim, codigo: cod ? cod[1] : null, atualizado_em: new Date().toISOString(),
        };
      }).filter((x): x is NonNullable<typeof x> => x !== null);
      const unicos = [...new Map(linhas.map((x) => [x.uid, x])).values()];
      // troca o retrato da origem inteira; se a leitura falhar, o retrato anterior fica
      const del = await db.from("bloqueios").delete().eq("origem", f.origem);
      if (del.error) throw del.error;
      if (unicos.length) { const ins = await db.from("bloqueios").insert(unicos); if (ins.error) throw ins.error; }
      await db.from("calendario_fontes").update({ ultima_sync: new Date().toISOString(), ultimo_status: "ok: " + unicos.length + " eventos" }).eq("id", f.id);
      res[f.origem] = { eventos: unicos.length, reservas: unicos.filter((x) => x.tipo === "reserva").length, bloqueios: unicos.filter((x) => x.tipo === "bloqueio").length };
    } catch (e) {
      await db.from("calendario_fontes").update({ ultimo_status: "falha: " + String(e).slice(0, 120) }).eq("id", f.id);
      res[f.origem] = { erro: String(e).slice(0, 120) };
    }
  }
  return res;
}

// ---------- exportação: reservas por fora, sem nomes ----------
async function exporta(): Promise<string> {
  const desde = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const { data, error } = await db.from("reservas").select("id,entrada,saida").gte("saida", desde).order("entrada");
  if (error) throw error;
  const agora = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const d = (s: string) => s.replace(/-/g, "");
  const ev = (data || []).map((r) => [
    "BEGIN:VEVENT", "UID:fora-" + r.id + "@recanto-agradavel", "DTSTAMP:" + agora,
    "DTSTART;VALUE=DATE:" + d(r.entrada), "DTEND;VALUE=DATE:" + d(r.saida), "SUMMARY:Reservado (fora do Airbnb)", "END:VEVENT",
  ].join("\r\n"));
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Recanto Agradavel//Calendario//PT", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", ...ev, "END:VCALENDAR", ""].join("\r\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  try {
    const s = await segredos();
    if (req.method === "GET") {
      const t = new URL(req.url).searchParams.get("t") || "";
      if (!iguais(t, s.token_ical)) return new Response("não encontrado", { status: 404 });
      return new Response(await exporta(), { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "no-store" } });
    }
    if (req.method !== "POST") return json(req, { erro: "método não aceito" }, 405);
    let corpo: { acao?: string } = {};
    try { corpo = await req.json(); } catch { /* vazio */ }
    const ok = iguais(req.headers.get("x-cron-secret") || "", s.segredo_cron) || await membro(req);
    if (!ok) return json(req, { erro: "sem acesso" }, 401);
    if (corpo.acao === "sincronizar") return json(req, await sincroniza());
    return json(req, { erro: "ação desconhecida" }, 400);
  } catch (e) {
    console.error(e);
    return json(req, { erro: "falha interna" }, 500);
  }
});
