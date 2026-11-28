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
    const marca = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    marca.setAttribute('viewBox', '0 0 30 30'); marca.setAttribute('aria-hidden', 'true'); marca.setAttribute('class', 'folha');
    marca.innerHTML = '<path d="M6 24C6 12 13 5 25 5c0 12-7 19-19 19z"/><path d="M6 24L18 12"/>';
    const form = el('form', {}, [
      marca,
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
    const [m, a, f, c, b] = await Promise.all([
      sb.from('meses').select('ym,bruto,liquido').order('ym'),
      sb.from('anos').select('*').order('ano'),
      sb.from('reservas_airbnb').select('*').order('pagamento'),
      sb.from('config').select('chave,valor'),
      sb.from('bloqueios').select('tipo,inicio,fim,codigo,atualizado_em').order('inicio')
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
    const reservas = f.data.map(r => ({ id: r.id, horaEntrada: r.hora_entrada || '', horaSaida: r.hora_saida || '', codigo: r.codigo, tipo: r.tipo, status: r.status, hospede: r.hospede, data_reserva: r.data_reserva,
      entrada: r.entrada, saida: r.saida, noites: r.noites, bruto: Number(r.bruto), taxa: Number(r.taxa), limpeza: Number(r.limpeza),
      pet: Number(r.pet), liquido: Number(r.liquido), pagamento: r.pagamento, descricao: r.descricao }));
    const cfgDb = Object.fromEntries(c.data.map(r => [r.chave, r.valor]));
    // calendário do Airbnb (iCal): bloqueios e reservas; se falhar, o painel abre sem eles
    const bloqueios = b.error ? [] : b.data.map(x => ({ tipo: x.tipo, inicio: x.inicio, fim: x.fim, codigo: x.codigo || '' }));
    const bloqueiosEm = !b.error && b.data.length ? b.data.reduce((mx, x) => x.atualizado_em > mx ? x.atualizado_em : mx, '') : '';
    return { meses, anos, reservas, bloqueios, bloqueiosEm, atualizado: cfgDb.atualizado || '' };
  }

  // Ponte com o formato que o painel já usa para lançamentos (custos e reservas) e anexos.
  // nomes do painel (camelCase) -> colunas do banco. Só entram os campos que existem em cada tabela.
  const COLUNAS = {
    custos: { data: 'data', categoria: 'categoria', descricao: 'descricao', valor: 'valor', anexo: 'anexo', anexoTipo: 'anexo_tipo',
      reservaRef: 'reserva_ref', criadoEm: 'criado_em', editadoEm: 'editado_em' },
    reservas: { entrada: 'entrada', saida: 'saida', canal: 'canal', descricao: 'descricao', valor: 'valor', anexo: 'anexo', anexoTipo: 'anexo_tipo',
      hospede: 'hospede', horaEntrada: 'hora_entrada', horaSaida: 'hora_saida', hospedes: 'hospedes', pets: 'pets', contato: 'contato',
      criadoEm: 'criado_em', editadoEm: 'editado_em' }
  };
  function paraLinha(tabela, d) {
    const m = COLUNAS[tabela], out = {};
    for (const k in d) if (m[k] && d[k] !== undefined) out[m[k]] = d[k];
    if ('anexo_tipo' in out && out.anexo_tipo == null) out.anexo_tipo = '';
    if ('contato' in out && out.contato == null) out.contato = '';
    if ('descricao' in out && out.descricao == null) out.descricao = '';
    return out;
  }
  const cria = paraLinha;
  function deLinha(r) {
    const { id, anexo_tipo, criado_em, criado_por, editado_em, hora_entrada, hora_saida, reserva_ref, ...resto } = r;
    return { id, data: () => Object.assign({}, resto, { anexoTipo: anexo_tipo || '', criadoEm: criado_em, editadoEm: editado_em,
      horaEntrada: hora_entrada || '', horaSaida: hora_saida || '', reservaRef: reserva_ref || null }) };
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
      async update(d) {
        const [tabela, id] = caminho.split('/');
        if (!COLUNAS[tabela]) throw { code: 'falha' };
        const { error } = await sb.from(tabela).update(paraLinha(tabela, d)).eq('id', id);
        if (error) throw erro(error);
      },
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
  // horário de check-in e check-out das reservas do Airbnb (o relatório não traz)
  window.recantoHorarioAirbnb = async (id, entrada, saida) => {
    const { error } = await sb.from('reservas_airbnb').update({ hora_entrada: entrada, hora_saida: saida }).eq('id', id);
    if (error) throw erro(error);
  };

  // Avisos no celular (Web Push). No iPhone só funciona com o site aberto pela Tela de Início.
  const PUSH_OK = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const deB64 = u => { const p = '='.repeat((4 - u.length % 4) % 4); const s = atob((u + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(s, ch => ch.charCodeAt(0)); };
  async function registro() { const r = await navigator.serviceWorker.register('sw.js', { scope: './' }); await navigator.serviceWorker.ready; return r; }
  window.recantoPush = {
    ios: /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
    instalado: matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
    async estado() {
      if (!PUSH_OK) return 'sem-suporte';
      if (Notification.permission === 'denied') return 'bloqueado';
      const r = await navigator.serviceWorker.getRegistration('./');
      const s = r && await r.pushManager.getSubscription();
      return s ? 'ativo' : 'inativo';
    },
    async ativar() {
      if (!PUSH_OK) throw { code: 'falha' };
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') throw { code: 'negado' };
      const reg = await registro();
      const { data, error } = await sb.functions.invoke('avisos', { body: { acao: 'chave' } });
      if (error || !data || !data.chave) throw { code: 'falha' };
      let s = await reg.pushManager.getSubscription();
      if (!s) s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: deB64(data.chave) });
      const j = s.toJSON();
      const { error: e2 } = await sb.from('inscricoes_push').upsert(
        { endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, aparelho: navigator.userAgent.slice(0, 120) }, { onConflict: 'endpoint' });
      if (e2) throw erro(e2);
    },
    async testar() {
      const { data, error } = await sb.functions.invoke('avisos', { body: { acao: 'testar' } });
      if (error) throw { code: 'falha' };
      return data;
    },
    async desativar() {
      const r = await navigator.serviceWorker.getRegistration('./');
      const s = r && await r.pushManager.getSubscription();
      if (s) { await sb.from('inscricoes_push').delete().eq('endpoint', s.endpoint); await s.unsubscribe(); }
    }
  };
  if (PUSH_OK) navigator.serviceWorker.register('sw.js', { scope: './' }).catch(() => {});

  // atualizar agora o calendário do Airbnb (o servidor também faz isso sozinho a cada 3 horas)
  window.recantoSincronizaCalendario = async () => {
    const { data, error } = await sb.functions.invoke('calendario', { body: { acao: 'sincronizar' } });
    if (error || !data || (data.airbnb && data.airbnb.erro)) throw { code: 'falha' };
    const r = await sb.from('bloqueios').select('tipo,inicio,fim,codigo,atualizado_em').order('inicio');
    if (r.error) throw erro(r.error);
    window.DADOS.bloqueios = r.data.map(x => ({ tipo: x.tipo, inicio: x.inicio, fim: x.fim, codigo: x.codigo || '' }));
    window.DADOS.bloqueiosEm = new Date().toISOString();
    return data.airbnb;
  };

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
    await carregaPrefs(session.user.id);
    if (!appCarregado) { window.DADOS = dados; appCarregado = true; await carregaApp(); }
  }

  // Preferências do login (tema e ordem do Início). Valem em todos os aparelhos da pessoa.
  // O localStorage do tema é só um atalho para abrir sem piscar; quem manda é a tabela.
  async function carregaPrefs(uid) {
    window.recantoSalvaPrefs = async parcial => {
      const linha = Object.assign({ user_id: uid }, window.recantoPrefs || {}, parcial, { atualizado_em: new Date().toISOString() });
      const { error } = await sb.from('preferencias').upsert(linha, { onConflict: 'user_id' });
      if (error) throw erro(error);
    };
    const local = window.recantoTemaLocal ? window.recantoTemaLocal() : 'sistema';
    try {
      const { data, error } = await sb.from('preferencias').select('tema,ordem_inicio').maybeSingle();
      if (error) throw error;
      window.recantoPrefs = { tema: data ? data.tema : local, ordem_inicio: data && Array.isArray(data.ordem_inicio) ? data.ordem_inicio : [] };
      if (data && window.recantoTema) window.recantoTema(data.tema);
    } catch (e) {
      window.recantoPrefs = { tema: local, ordem_inicio: [] };
    }
  }

  document.getElementById('app').hidden = true;
  iniciar();
})();
