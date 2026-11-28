// Avisos do Recanto Agradável: calcula o que precisa de ação hoje e envia ao celular (Web Push).
// Chamadas:
//   { acao: "chave" }   membro logado  -> chave pública para inscrever o aparelho
//   { acao: "testar" }  membro logado  -> envia um aviso de teste aos aparelhos dele
//   { acao: "simular" } membro ou agendamento -> lista os avisos de hoje, sem enviar
//   { acao: "rodar" }   agendamento (pg_cron) -> envia os avisos de hoje, uma vez cada
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const URL_SB = Deno.env.get("SUPABASE_URL")!;
const CHAVE_SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(URL_SB, CHAVE_SR, { auth: { persistSession: false, autoRefreshToken: false } });
const SITE = "https://andrecunha2004.github.io/RECANTO-AGRADAVEL-MANAGEMENT/";
const ORIGENS = ["https://andrecunha2004.github.io", "http://localhost:8777"];
const CONTATO = "mailto:avisos@recanto-agradavel.invalid";

type Aviso = { chave: string; titulo: string; corpo: string; url: string };

function cors(req: Request): Record<string, string> {
  const o = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ORIGENS.includes(o) ? o : ORIGENS[0],
    "Access-Control-Allow-Headers": (req.headers.get("access-control-request-headers") || "authorization, x-client-info, apikey, content-type").replace(/[^a-zA-Z0-9,\- ]/g, "").slice(0, 300),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
const json = (req: Request, corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors(req), "Content-Type": "application/json" } });

function hojeSP(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}
function somaDias(d: string, n: number): string {
  const t = new Date(d + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10);
}
const diasEntre = (a: string, b: string) => Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 864e5);
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MESES_L = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const dm = (d: string) => +d.slice(8, 10) + " " + MESES[+d.slice(5, 7) - 1];
const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

async function segredos() {
  const { data, error } = await db.from("push_segredos").select("*").eq("id", 1).single();
  if (error) throw error;
  if (!data.vapid_publica || !data.vapid_privada) {
    // primeira execução: gera o par de chaves aqui, sem a chave privada sair do servidor
    const k = webpush.generateVAPIDKeys();
    const { error: e2 } = await db.from("push_segredos").update({ vapid_publica: k.publicKey, vapid_privada: k.privateKey }).eq("id", 1);
    if (e2) throw e2;
    data.vapid_publica = k.publicKey; data.vapid_privada = k.privateKey;
  }
  return data as { vapid_publica: string; vapid_privada: string; segredo_cron: string };
}

async function membro(req: Request) {
  const t = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!t || t.split(".").length !== 3) return null;
  const { data, error } = await db.auth.getUser(t);
  if (error || !data.user?.email) return null;
  const { data: p } = await db.from("usuarios_permitidos").select("email").eq("email", data.user.email.toLowerCase()).maybeSingle();
  return p ? data.user : null;
}
function iguais(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let x = 0; for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i); return x === 0;
}

async function avisosDe(hoje: string): Promise<Aviso[]> {
  const [ra, rf, cs, ms] = await Promise.all([
    db.from("reservas_airbnb").select("id,codigo,tipo,status,hospede,entrada,saida,noites,liquido,pagamento,hora_entrada,hora_saida"),
    db.from("reservas").select("id,hospede,entrada,saida,valor,hora_entrada,hora_saida"),
    db.from("custos").select("data,reserva_ref"),
    db.from("meses").select("ym,bruto,liquido"),
  ]);
  for (const r of [ra, rf, cs, ms]) if (r.error) throw r.error;
  const res = [
    ...ra.data!.filter((r) => r.tipo === "reserva" && r.entrada && r.saida).map((r) => ({
      ref: "airbnb:" + (r.codigo || r.id), hospede: r.hospede || "", entrada: r.entrada, saida: r.saida,
      noites: r.noites || diasEntre(r.entrada, r.saida), he: r.hora_entrada, hs: r.hora_saida })),
    ...rf.data!.map((r) => ({
      ref: "fora:" + r.id, hospede: r.hospede || "", entrada: r.entrada, saida: r.saida,
      noites: diasEntre(r.entrada, r.saida), he: r.hora_entrada, hs: r.hora_saida })),
  ];
  const out: Aviso[] = [];
  const quem = (r: { hospede: string }) => r.hospede || "Hóspede";
  for (const r of res) {
    const d = diasEntre(hoje, r.entrada);
    if (d === 0) out.push({ chave: "chega:" + r.ref, url: SITE + "#reservas", titulo: "Chegada hoje: " + quem(r),
      corpo: (r.he ? "Check-in às " + r.he + " · " : "") + r.noites + (r.noites === 1 ? " noite" : " noites") + " · sai " + dm(r.saida) });
    else if (d >= 1 && d <= 3) out.push({ chave: "prep:" + r.ref, url: SITE + "#reservas",
      titulo: quem(r) + (d === 1 ? " chega amanhã" : " chega em " + d + " dias"),
      corpo: "Deixe a casa pronta · " + dm(r.entrada) + (r.he ? " às " + r.he : "") + " a " + dm(r.saida) });
    if (r.saida === hoje) out.push({ chave: "sai:" + r.ref, url: SITE + "#resultado", titulo: "Saída hoje: " + quem(r),
      corpo: (r.hs ? "Check-out às " + r.hs + " · " : "") + "registre a limpeza e os custos desta estadia" });
    const desde = diasEntre(r.saida, hoje);
    if (desde >= 2 && desde <= 10) {
      const fim = somaDias(r.saida, 3);
      const temCusto = cs.data!.some((c) => c.reserva_ref === r.ref || (c.data >= r.entrada && c.data <= fim));
      if (!temCusto) out.push({ chave: "custo:" + r.ref, url: SITE + "#resultado", titulo: "Sem custos lançados: " + quem(r),
        corpo: "Estadia de " + dm(r.entrada) + " a " + dm(r.saida) + ". Registre os custos desta reserva." });
    }
  }
  for (const r of ra.data!) {
    if (r.status === "programada" && r.pagamento === hoje)
      out.push({ chave: "pag:" + (r.codigo || r.id), url: SITE + "#ganhos", titulo: "Repasse de " + brl(+r.liquido) + " hoje",
        corpo: "Pagamento do Airbnb" + (r.hospede ? " · reserva de " + r.hospede : "") });
  }
  if (hoje.slice(8, 10) === "01") {
    const ant = somaDias(hoje, -1).slice(0, 7), m = ms.data!.find((x) => x.ym === ant);
    if (m) out.push({ chave: "fecha:" + ant, url: SITE + "#ganhos",
      titulo: MESES_L[+ant.slice(5) - 1].replace(/^./, (c) => c.toUpperCase()) + " fechou com " + brl(+m.liquido) + " líquido",
      corpo: "Receita bruta de " + brl(+m.bruto) });
  }
  return out;
}

async function envia(s: Awaited<ReturnType<typeof segredos>>, sub: { id: string; endpoint: string; p256dh: string; auth: string }, a: Aviso) {
  const d = webpush.generateRequestDetails(
    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
    JSON.stringify({ title: a.titulo, body: a.corpo, url: a.url, tag: a.chave }),
    { TTL: 60 * 60 * 20, urgency: "normal", vapidDetails: { subject: CONTATO, publicKey: s.vapid_publica, privateKey: s.vapid_privada } },
  );
  const r = await fetch(d.endpoint, { method: d.method, headers: d.headers as Record<string, string>, body: d.body });
  await r.body?.cancel();
  if (r.status === 404 || r.status === 410) { await db.from("inscricoes_push").delete().eq("id", sub.id); return "removida"; }
  if (r.status >= 200 && r.status < 300) { await db.from("inscricoes_push").update({ ultimo_envio: new Date().toISOString() }).eq("id", sub.id); return "ok"; }
  return "falha " + r.status;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(req, { erro: "use POST" }, 405);
  let corpo: { acao?: string; data?: string } = {};
  try { corpo = await req.json(); } catch { /* corpo vazio */ }
  const acao = corpo.acao || "";
  try {
    const s = await segredos();
    const doCron = iguais(req.headers.get("x-cron-secret") || "", s.segredo_cron);
    const user = doCron ? null : await membro(req);
    if (!doCron && !user) return json(req, { erro: "sem acesso" }, 401);
    const hoje = corpo.data && /^\d{4}-\d{2}-\d{2}$/.test(corpo.data) ? corpo.data : hojeSP();

    if (acao === "chave") return json(req, { chave: s.vapid_publica });
    if (acao === "simular") return json(req, { hoje, avisos: await avisosDe(hoje) });
    if (acao === "testar") {
      if (!user) return json(req, { erro: "só pelo site" }, 400);
      const { data: subs } = await db.from("inscricoes_push").select("id,endpoint,p256dh,auth").eq("user_id", user.id);
      const r = [];
      for (const sub of subs || []) r.push(await envia(s, sub, { chave: "teste", url: SITE + "#inicio",
        titulo: "Avisos ligados", corpo: "Este aparelho vai receber chegadas, saídas, repasses e lembretes de custos." }));
      return json(req, { aparelhos: (subs || []).length, resultado: r });
    }
    if (acao === "rodar") {
      if (!doCron) return json(req, { erro: "só pelo agendamento" }, 403);
      if (corpo.data) return json(req, { erro: "o envio usa sempre a data de hoje" }, 400);
      const avisos = await avisosDe(hoje);
      const { data: subs } = await db.from("inscricoes_push").select("id,endpoint,p256dh,auth");
      if (!avisos.length || !subs?.length) return json(req, { hoje, avisos: avisos.length, aparelhos: subs?.length || 0, enviados: 0 });
      const { data: ja } = await db.from("avisos_enviados").select("chave,inscricao_id").in("chave", avisos.map((a) => a.chave));
      const feito = new Set((ja || []).map((x) => x.chave + "|" + x.inscricao_id));
      let enviados = 0; const falhas: string[] = [];
      for (const sub of subs) for (const a of avisos) {
        if (feito.has(a.chave + "|" + sub.id)) continue;
        const r = await envia(s, sub, a);
        if (r === "ok") { enviados++; await db.from("avisos_enviados").insert({ chave: a.chave, inscricao_id: sub.id }); }
        else { falhas.push(r); if (r === "removida") break; }
      }
      return json(req, { hoje, avisos: avisos.length, aparelhos: subs.length, enviados, falhas });
    }
    return json(req, { erro: "ação desconhecida" }, 400);
  } catch (e) {
    console.error(e);
    return json(req, { erro: "falha interna" }, 500);
  }
});
