/* Entrada por login (Supabase) + carga dos dados + ponte de armazenamento para o painel. */
(function () {
  'use strict';
  const cfg = window.RECANTO_CONFIG;
  const sb = window.supabase.createClient(cfg.url, cfg.chave, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const BUCKET = 'anexos';
  const TIPOS = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'application/pdf': 'pdf' };
  let appCarregado = false;

  function el(tag, attrs, filhos) {
    const e = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => { if (k === 'text') e.textContent = v; else e.setAttribute(k, v); });
    (filhos || []).forEach(f => e.append(f));
    return e;
  }

  function telaEntrada(aviso) {
    document.querySelector('.entrada')?.remove();
    document.getElementById('app').hidden = true;
    const msg = el('div', { class: 'msg', role: 'status', 'aria-live': 'polite', text: aviso || '' });
    const email = el('input', { type: 'email', id: 'lgEmail', autocomplete: 'username', required: '' });
    const senha = el('input', { type: 'password', id: 'lgSenha', autocomplete: 'current-password' });
    const entrar = el('button', { type: 'submit', text: 'Entrar' });
    const link = el('button', { type: 'button', class: 'sec', text: 'Receber link por e-mail' });
    const form = el('form', {}, [
      el('h1', { text: 'Recanto Agradável' }),
      el('label', { for: 'lgEmail', text: 'E-mail' }), email,
      el('label', { for: 'lgSenha', text: 'Senha' }), senha,
      entrar, link, msg
    ]);
    form.addEventListener('submit', async ev => {
      ev.preventDefault();
      entrar.disabled = true; msg.textContent = 'Entrando…';
      const { error } = await sb.auth.signInWithPassword({ email: email.value.trim().toLowerCase(), password: senha.value });
      entrar.disabled = false;
      if (error) { msg.textContent = 'E-mail ou senha incorretos.'; return; }
      iniciar();
    });
    link.addEventListener('click', async () => {
      const em = email.value.trim().toLowerCase();
      if (!em) { msg.textContent = 'Informe o e-mail.'; return; }
      link.disabled = true;
      await sb.auth.signInWithOtp({ email: em, options: { shouldCreateUser: false, emailRedirectTo: location.origin + location.pathname } });
      link.disabled = false;
      msg.textContent = 'Se este e-mail tiver acesso, o link foi enviado.';
    });
    document.body.append(el('div', { class: 'entrada' }, [form]));
    email.focus();
  }

  const nn = v => v == null ? null : Number(v);
  async function carregaDados() {
    const [m, a, f, c] = await Promise.all([
      sb.from('meses').select('ym,bruto,liquido').order('ym'),
      sb.from('anos').select('*').order('ano'),
      sb.from('reservas_airbnb').select('*').order('pagamento'),
      sb.from('config').select('chave,valor')
    ]);
    if (m.error || a.error || f.error || c.error) return null;
    if (!m.data.length || !a.data.length) return { vazio: true };
    const meses = {};
    m.data.forEach(r => { meses[r.ym] = [Number(r.bruto), Number(r.liquido)]; });
    const anos = {};
    a.data.forEach(r => {
      anos[r.ano] = {
        ini: r.ini, fim: r.fim, rotulo: r.rotulo, dias: r.dias, noites: r.noites == null ? null : Number(r.noites),
        mediaEstadia: nn(r.media_estadia), impostoHospede: nn(r.imposto_hospede), impostoRotulo: r.imposto_rotulo, outros: Number(r.outros),
        pdf: { bruto: Number(r.pdf_bruto), taxa: Number(r.pdf_taxa), liquido: Number(r.pdf_liquido) }
      };
    });
    const reservas = f.data.map(r => ({ codigo: r.codigo, tipo: r.tipo, status: r.status, hospede: r.hospede, data_reserva: r.data_reserva,
      entrada: r.entrada, saida: r.saida, noites: r.noites, bruto: Number(r.bruto), taxa: Number(r.taxa), limpeza: Number(r.limpeza),
      pet: Number(r.pet), liquido: Number(r.liquido), pagamento: r.pagamento, descricao: r.descricao }));
    const cfgDb = Object.fromEntries(c.data.map(r => [r.chave, r.valor]));
    return { meses, anos, reservas, atualizado: cfgDb.atualizado || '' };
  }

  // Ponte com o formato que o painel já usa para lançamentos (custos e reservas) e anexos.
  function cria(tabela, d) {
    const base = { descricao: d.descricao, valor: d.valor, anexo: d.anexo || null, anexo_tipo: d.anexoTipo || '', criado_em: d.criadoEm };
    return tabela === 'custos'
      ? Object.assign({ data: d.data, categoria: d.categoria }, base)
      : Object.assign({ entrada: d.entrada, saida: d.saida, canal: d.canal }, base);
  }
  function deLinha(r) {
    const { id, anexo_tipo, criado_em, criado_por, ...resto } = r;
    return { id, data: () => Object.assign({}, resto, { anexoTipo: anexo_tipo || '', criadoEm: criado_em }) };
  }
  function erro(e) {
    const c = e && (e.code || e.statusCode);
    if (c === '42501' || c === '403' || c === 403) return { code: 'not_granted' };
    return { code: 'falha' };
  }
  const dbPonte = {
    collection: nome => ({
      onSnapshot(ok, falha) {
        const ler = async () => {
          const { data, error } = await sb.from(nome).select('*');
          if (error) { falha && falha(erro(error)); return; }
          ok({ docs: data.map(deLinha) });
        };
        ler();
        sb.channel('rt-' + nome).on('postgres_changes', { event: '*', schema: 'public', table: nome }, ler).subscribe();
        return () => {};
      },
      async add(d) { const { error } = await sb.from(nome).insert(cria(nome, d)); if (error) throw erro(error); }
    }),
    doc: caminho => ({
      async delete() {
        const [tabela, id] = caminho.split('/');
        const { error } = await sb.from(tabela).delete().eq('id', id);
        if (error) throw erro(error);
        return { deleted: true };
      }
    })
  };
  const assetsPonte = {
    async upload(f) {
      const ext = TIPOS[f.type];
      if (!ext) throw { code: 'unsupported_type' };
      const id = crypto.randomUUID() + '.' + ext;
      const { error } = await sb.storage.from(BUCKET).upload(id, f, { contentType: f.type, upsert: false });
      if (error) throw erro(error);
      return { id, contentType: f.type };
    },
    async delete(id) { await sb.storage.from(BUCKET).remove([id]); return { deleted: true }; }
  };
  window.claude = { use: k => Promise.resolve(k === 'db' ? dbPonte : k === 'assets' ? assetsPonte : null) };
  window.urlAnexo = async id => {
    const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(id, 300);
    return error ? null : data.signedUrl;
  };

  function carregaApp() {
    return new Promise((ok, falha) => {
      const s = document.createElement('script');
      s.src = 'app.js'; s.onload = ok; s.onerror = falha;
      document.body.append(s);
    });
  }

  async function iniciar() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { telaEntrada(); return; }
    const dados = await carregaDados();
    if (!dados || dados.vazio) {
      await sb.auth.signOut();
      telaEntrada(dados && dados.vazio ? 'Ainda não há dados importados.' : 'Este e-mail não tem acesso.');
      return;
    }
    document.querySelector('.entrada')?.remove();
    document.getElementById('app').hidden = false;
    const sair = document.getElementById('btnSair');
    sair.hidden = false;
    sair.onclick = async () => { await sb.auth.signOut(); location.reload(); };
    if (!appCarregado) { window.DADOS = dados; appCarregado = true; await carregaApp(); }
  }

  document.getElementById('app').hidden = true;
  iniciar();
})();
