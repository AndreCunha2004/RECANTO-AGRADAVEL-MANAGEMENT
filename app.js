/* ---------- utilitários ---------- */
const NOMES=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const NOMES_L=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const ANOS=Object.keys(DADOS.anos);
const TODOS=Object.keys(DADOS.meses).sort();
// Cores dos dados (significado fixo; ver DESIGN.md)
const COR={liquido:'#4f6b57',taxa:'#b9767f',anos:['#b5a17c','#4f6b57'],sobe:'#4f6b57',desce:'#b9767f',marca:'#8a7250',apagado:'#d9cdb6',
  grade:'#f1eadf',tinta:'#2b2926',tinta2:'#7a746b',calor:['#f3ecdf','#e0dcc4','#b3bfa4','#6f8a74','#3f5a47']};
const brl=v=>v==null||isNaN(v)?'sem dados':v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const pct=v=>v==null||isNaN(v)?'—':(v*100).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%';
const num=(v,d=0)=>v==null||isNaN(v)?'—':v.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
const compacto=v=>v==null?'—':v===0?'0':Math.abs(v)>=1000?num(v/1000,1)+' mil':num(v);
const r2=v=>Math.round(v*100)/100;
const rot=ym=>NOMES[+ym.slice(5)-1]+'/'+ym.slice(2,4);
const varia=(a,b)=>a?((b>=a?'+':'')+pct((b-a)/a)):'—';
const eixoR=v=>Math.abs(v)>=1000?'R$ '+num(v/1000)+' mil':'R$ '+num(v);
const ym2=(a,m)=>a+'-'+String(m).padStart(2,'0');
function el(tag,attrs={},filhos=[]){const e=document.createElement(tag);
  for(const k in attrs){ if(k==='class')e.className=attrs[k]; else if(k==='text')e.textContent=attrs[k]; else if(k==='html')e.innerHTML=attrs[k]; else e.setAttribute(k,attrs[k]); }
  (Array.isArray(filhos)?filhos:[filhos]).forEach(f=>{ if(f!=null) e.append(f); }); return e; }
function listaMeses(de,ate){const out=[];let [a,m]=de.split('-').map(Number);const [af,mf]=ate.split('-').map(Number);
  while(a<af||(a===af&&m<=mf)){out.push(ym2(a,m));m++;if(m>12){m=1;a++;}}return out;}
function soma(meses){let b=0,l=0;meses.forEach(ym=>{const d=DADOS.meses[ym];if(d){b+=d[0];l+=d[1];}});
  return {bruto:r2(b),liquido:r2(l),taxa:r2(b-l),aliq:b?(b-l)/b:null};}
function anoExato(de,ate){for(const a of ANOS){const A=DADOS.anos[a];if(A.ini===de&&A.fim===ate)return A;}return null;}
const valor=(ym,metr)=>{const d=DADOS.meses[ym];if(!d)return null;return metr==='bruto'?d[0]:metr==='liquido'?d[1]:r2(d[0]-d[1]);};
const aliq=ym=>{const d=DADOS.meses[ym];return d&&d[0]?(d[0]-d[1])/d[0]:null;};
const NOME_METRICA={bruto:'Receita bruta',liquido:'Receita líquida',taxa:'Taxa Airbnb',aliq:'Taxa efetiva'};

/* ---------- componentes ---------- */
function tabela(cab,linhas,total){
  const t=el('table');t.append(el('thead',{},el('tr',{},cab.map(c=>el('th',{text:c})))));
  const tb=el('tbody');linhas.forEach((l,i)=>{const tr=el('tr',{class:(total&&i===linhas.length-1)?'total':''});l.forEach(c=>tr.append(el('td',{text:c})));tb.append(tr);});
  t.append(tb);return el('div',{class:'rolagem'},t);}
function cartao(titulo,filhos,extra){return el('section',{class:'cartao'},[titulo||extra?el('div',{class:'cab'},[titulo?el('h2',{text:titulo}):el('span'),extra||null]):null].concat(filhos));}
function kpi(r,v,s){return el('div',{class:'kpi'},[el('span',{class:'r',text:r}),el('span',{class:'v',text:v}),s?el('span',{class:'s',text:s}):null]);}
function linha(nome,valorTxt,cor,extra){return el('div',{class:'linha'},[cor?el('i',{class:'pt',style:'background:'+cor}):null,el('span',{class:'n',text:nome}),extra?el('span',{class:'q',text:extra}):null,el('span',{text:valorTxt})]);}
function seg(opcoes,atual,aoMudar,rotulo){const g=el('div',{class:'seg',role:'group','aria-label':rotulo});
  opcoes.forEach(([v,t])=>{const b=el('button',{type:'button','aria-pressed':String(v===atual),text:t});b.addEventListener('click',()=>aoMudar(v));g.append(b);});return g;}
function acord(titulo,filhos){return el('details',{class:'acord'},[el('summary',{text:titulo}),el('div',{class:'corpo'},filhos)]);}
function legenda(itens){return el('div',{class:'legenda'},itens.map(([cor,t])=>el('span',{},[el('i',{class:'pt',style:'background:'+cor}),document.createTextNode(t)])));}
function copiarCsv(btn,area,csv){
  const rotulo=btn.textContent, falha=()=>{area.hidden=false;area.value=csv;area.select();btn.textContent='Selecione e copie o texto abaixo';};
  try{navigator.clipboard.writeText(csv).then(()=>{btn.textContent='Copiado';setTimeout(()=>btn.textContent=rotulo,1800);},falha);}catch(e){falha();}
}

/* dica flutuante para elementos fora dos gráficos */
const dicaEl=()=>document.getElementById('dica');
function comDica(alvo,titulo,texto){
  const mostra=e=>{const d=dicaEl();d.replaceChildren(el('b',{text:titulo}),document.createTextNode(texto));d.hidden=false;
    const r=alvo.getBoundingClientRect();let x=(e&&e.clientX!=null?e.clientX:r.left+r.width/2)+12,y=(e&&e.clientY!=null?e.clientY:r.top)-10;
    const w=d.offsetWidth,hh=d.offsetHeight;if(x+w>innerWidth-8)x=innerWidth-w-8;y=y-hh<8?y+24:y-hh;d.style.left=x+'px';d.style.top=y+'px';};
  const some=()=>{dicaEl().hidden=true;};
  alvo.addEventListener('mouseenter',mostra);alvo.addEventListener('mousemove',mostra);alvo.addEventListener('mouseleave',some);
  alvo.addEventListener('focus',()=>mostra());alvo.addEventListener('blur',some);
}

/* gráficos: se a biblioteca não carregar, os números continuam nas tabelas e listas */
let graficos=[], padroesOk=false;
function desenha(cv,config){
  if(!window.Chart){cv.parentElement.hidden=true;return;}
  if(!padroesOk){padroesOk=true;const D=Chart.defaults;
    D.color=COR.tinta2;D.font.family="'IBM Plex Sans',system-ui,sans-serif";D.font.size=12;
    D.plugins.legend.labels.usePointStyle=true;D.plugins.legend.labels.boxHeight=7;D.plugins.legend.position='bottom';
    const T=D.plugins.tooltip;T.backgroundColor='#faf7f1';T.titleColor=COR.tinta;T.bodyColor=COR.tinta;T.footerColor=COR.tinta2;
    T.borderColor='#e2d8c6';T.borderWidth=1;T.padding=10;T.cornerRadius=10;T.usePointStyle=true;T.boxPadding=4;
    T.titleFont={weight:'500'};T.footerFont={weight:'400'};
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)D.animation=false;}
  graficos.push(new Chart(cv,config));
}
const escalas=(fmt,emp)=>({x:{stacked:!!emp,grid:{display:false},border:{color:COR.grade}},y:{stacked:!!emp,beginAtZero:true,border:{display:false},grid:{color:COR.grade},ticks:{callback:fmt,maxTicksLimit:5}}});
function areaGrafico(rotulo){const cv=el('canvas',{role:'img','aria-label':rotulo});return {caixa:el('div',{class:'grafico'},cv),cv};}
function rosca(partes,centroValor,centroRotulo,fmt){
  const total=partes.reduce((s,p)=>s+p.valor,0);
  const cv=el('canvas',{role:'img','aria-label':partes.map(p=>p.nome+' '+fmt(p.valor)).join(', ')});
  const caixa=el('div',{class:'rosca-cv'},[cv,el('div',{class:'rosca-centro'},[el('b',{text:centroValor}),el('span',{text:centroRotulo})])]);
  const linhas=el('div',{class:'linhas'},partes.map(p=>linha(p.nome,fmt(p.valor),p.cor,total?pct(p.valor/total):'')));
  const raiz=el('div',{class:'rosca'},[caixa,linhas]);
  setTimeout(()=>{if(cv.isConnected)desenha(cv,{type:'doughnut',data:{labels:partes.map(p=>p.nome),datasets:[{data:partes.map(p=>p.valor),backgroundColor:partes.map(p=>p.cor),borderWidth:0,spacing:2,borderRadius:4}]},
    options:{cutout:'74%',maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.label+': '+fmt(c.parsed)+' ('+pct(c.parsed/total)+')'}}}}});},0);
  return raiz;
}

/* ---------- estado ---------- */
const SECOES=[
  {id:'visao',nome:'Visão geral',curto:'Geral',filtro:true,barra:true,ico:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'},
  {id:'mes',nome:'Mês a mês',curto:'Mês',barra:true,fim:true,ico:'<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>'},
  {id:'comparativo',nome:'Comparativo',curto:'Comparar',barra:true,ico:'<path d="M5 20V10M10 20V4M15 20v-8M20 20V7"/>'},
  {id:'sazonalidade',nome:'Sazonalidade',ico:'<rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>'},
  {id:'dinamica',nome:'Tabela dinâmica',fim:true,ico:'<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 10h18M10 10v10"/>'},
  {id:'taxas',nome:'Taxas Airbnb',filtro:true,ico:'<path d="M19 5L5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>'},
  {id:'ocupacao',nome:'Ocupação',ico:'<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'},
  {id:'reservas',nome:'Reservas',breve:true,fim:true,ico:'<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>'},
  {id:'resultado',nome:'Custos e lucro',curto:'Custos',filtro:true,barra:true,ico:'<path d="M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7zm0 0V6a2 2 0 0 1 2-2h10"/><path d="M16 13.5h.01"/>'},
  {id:'sobre',nome:'Sobre os dados',rodape:true,ico:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>'}
];
const icone=s=>el('span',{html:'<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">'+s+'</svg>',style:'display:inline-flex'});
let pagina='visao', de='2026-01', ate='2026-11', mesSel=TODOS[TODOS.length-1], metrica='bruto', pend=null, anoRank=ANOS[ANOS.length-1];
let pv={linhas:'mes',valor:'bruto',como:'valor',ord:null};

/* ---------- custos (guardados junto com o painel publicado) ---------- */
const CATEGORIAS=['Limpeza','Luz','Água','Internet','Piscina','Manutenção','IPTU','Reposição','Outros'];
const CANAIS=['Indicação','Contato direto','Booking','Outra plataforma'];
let custos=[], reservasFora=[], tipoLanc='custo', custoEstado='carregando', cap={db:null,assets:null}, pintaCustos=null;
const idOk=s=>typeof s==='string'&&/^[A-Za-z0-9_-]{6,64}(\.[a-z0-9]{2,5})?$/.test(s);
function normalizaCusto(id,d){
  if(!d||typeof d.data!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d.data))return null;
  const v=Number(d.valor);if(!(v>0)||!isFinite(v))return null;
  return {id,data:d.data,categoria:CATEGORIAS.includes(d.categoria)?d.categoria:'Outros',descricao:typeof d.descricao==='string'?d.descricao.slice(0,200):'',
    valor:r2(v),anexo:idOk(d.anexo)?d.anexo:null,anexoTipo:typeof d.anexoTipo==='string'?d.anexoTipo:''};
}
function normalizaReserva(id,d){
  const dt=/^\d{4}-\d{2}-\d{2}$/;
  if(!d||typeof d.entrada!=='string'||typeof d.saida!=='string'||!dt.test(d.entrada)||!dt.test(d.saida)||d.saida<=d.entrada)return null;
  const v=Number(d.valor);if(!(v>0)||!isFinite(v))return null;
  return {id,entrada:d.entrada,saida:d.saida,noites:Math.round((Date.parse(d.saida)-Date.parse(d.entrada))/864e5),canal:CANAIS.includes(d.canal)?d.canal:'Outra plataforma',
    descricao:typeof d.descricao==='string'?d.descricao.slice(0,200):'',valor:r2(v),anexo:idOk(d.anexo)?d.anexo:null,anexoTipo:typeof d.anexoTipo==='string'?d.anexoTipo:''};
}
// reserva por fora conta no mês da entrada
function reservasNoPeriodo(){return reservasFora.filter(c=>{const m=c.entrada.slice(0,7);return m>=de&&m<=ate;});}
function custosNoPeriodo(){return custos.filter(c=>{const m=c.data.slice(0,7);return m>=de&&m<=ate;});}
function repintaCustos(){ if(pagina==='resultado'&&pintaCustos)pintaCustos(); }
function iniciaCustos(){
  if(!(window.claude&&typeof window.claude.use==='function')){custoEstado='indisponivel';return;}
  const limite=setTimeout(()=>{if(custoEstado==='carregando'){custoEstado='indisponivel';repintaCustos();}},10000);
  const falha=()=>{clearTimeout(limite);custoEstado='indisponivel';repintaCustos();};
  try{
    window.claude.use('db').then(db=>{
      if(!db){falha();return;}
      cap.db=db;
      db.collection('custos').onSnapshot(snap=>{clearTimeout(limite);
        custos=snap.docs.map(d=>normalizaCusto(d.id,d.data())).filter(Boolean);custoEstado='pronto';
        if(pagina==='resultado'&&pintaCustos)pintaCustos();},falha);
      db.collection('reservas').onSnapshot(snap=>{reservasFora=snap.docs.map(d=>normalizaReserva(d.id,d.data())).filter(Boolean);repintaCustos();},()=>{});
    }).catch(falha);
    window.claude.use('assets').then(a=>{cap.assets=a||null;repintaCustos();}).catch(()=>{});
  }catch(e){falha();}
}
function textoErro(e){const c=e&&e.code;
  if(c==='invalid_argument'||c==='not_granted'||c==='revoked')return 'Esta conta não tem permissão para alterar os custos.';
  if(c==='quota_exceeded'||c==='quota_or_state')return 'O limite de armazenamento foi atingido. Exclua lançamentos ou anexos antigos.';
  if(c==='too_large')return 'O anexo passa de 20 MB. Escolha um arquivo menor.';
  if(c==='unsupported_type')return 'Tipo de arquivo não aceito. Use foto em JPG ou PNG, ou PDF.';
  return 'Não foi possível concluir agora. Tente de novo.';}
const dataBR=s=>s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4);
const temDado=m=>!!DADOS.meses[m]||custos.some(c=>c.data.slice(0,7)===m)||reservasFora.some(c=>c.entrada.slice(0,7)===m);

/* ---------- seções ---------- */
const PG={};
PG.visao=pg=>{
  const meses=listaMeses(de,ate).filter(m=>DADOS.meses[m]), t=soma(meses), A=anoExato(de,ate);
  const k=el('div',{class:'kpis'},[kpi('Receita bruta',brl(t.bruto)),kpi('Taxa Airbnb',brl(t.taxa),t.aliq==null?'':pct(t.aliq)+' da bruta'),kpi('Receita líquida',brl(t.liquido))]);
  if(A){k.append(kpi('Noites',num(A.noites),'reservadas'),kpi('Ocupação',pct(A.noites/A.dias),'dias corridos'),kpi('Diária média',brl((A.pdf.bruto-A.outros)/A.noites)));}
  pg.append(k);
  if(t.bruto>0) pg.append(cartao('Receita bruta do período',[rosca([{nome:'Receita líquida',valor:t.liquido,cor:COR.liquido},{nome:'Taxa Airbnb',valor:t.taxa,cor:COR.taxa}],brl(t.bruto),'bruta',brl)]));
  if(!meses.length){pg.append(el('p',{class:'suave',text:'Sem dados do Airbnb neste período.'}));return;}
  const g=areaGrafico('Receita líquida e taxa Airbnb por mês');
  pg.append(cartao('Receita por mês',[g.caixa]));
  desenha(g.cv,{type:'bar',data:{labels:meses.map(rot),datasets:[
    {label:'Receita líquida',data:meses.map(m=>DADOS.meses[m][1]),backgroundColor:COR.liquido,borderColor:'#fff',borderWidth:1,borderRadius:3,maxBarThickness:26},
    {label:'Taxa Airbnb',data:meses.map(m=>valor(m,'taxa')),backgroundColor:COR.taxa,borderColor:'#fff',borderWidth:1,borderRadius:3,maxBarThickness:26}]},
    options:{maintainAspectRatio:false,interaction:{mode:'index',intersect:false},scales:escalas(eixoR,true),
      onClick:(e,els)=>{if(els.length){mesSel=meses[els[0].index];ir('mes');}},
      plugins:{tooltip:{callbacks:{label:c=>c.dataset.label+': '+brl(c.parsed.y),footer:its=>'Receita bruta: '+brl(DADOS.meses[meses[its[0].dataIndex]][0])}}}}});
};
PG.mes=pg=>{
  const ano=mesSel.slice(0,4), mesesAno=listaMeses(ano+'-01',ano+'-12');
  const i=TODOS.indexOf(mesSel);
  const ant=el('button',{type:'button','aria-label':'Mês anterior',text:'‹'}), prox=el('button',{type:'button','aria-label':'Próximo mês',text:'›'});
  if(i<=0)ant.disabled=true; if(i>=TODOS.length-1)prox.disabled=true;
  ant.addEventListener('click',()=>{mesSel=TODOS[i-1];render();}); prox.addEventListener('click',()=>{mesSel=TODOS[i+1];render();});
  const anosSeg=seg(ANOS.map(a=>[a,a]),ano,a=>{const m=a+mesSel.slice(4);mesSel=DADOS.meses[m]?m:TODOS.filter(x=>x.startsWith(a)).pop();render();},'Ano');
  const chips=el('div',{class:'chips'},mesesAno.map(m=>{const b=el('button',{type:'button',class:'mes'+(m===mesSel?' ponta':''),text:NOMES[+m.slice(5)-1]});
    if(!DADOS.meses[m])b.disabled=true; b.addEventListener('click',()=>{mesSel=m;render();});return b;}));
  pg.append(cartao(null,[el('div',{class:'cab'},[anosSeg,el('div',{class:'passo'},[ant,prox])]),chips]));

  const d=DADOS.meses[mesSel], tx=r2(d[0]-d[1]), titulo=NOMES_L[+mesSel.slice(5)-1]+' de '+ano;
  const corpo=[];
  if(d[0]>0) corpo.push(rosca([{nome:'Receita líquida',valor:d[1],cor:COR.liquido},{nome:'Taxa Airbnb',valor:tx,cor:COR.taxa}],brl(d[0]),'bruta',brl));
  else corpo.push(el('p',{class:'suave',text:'Sem receita neste mês.'}));
  const totalAno=soma(mesesAno).bruto, outroAno=ANOS.find(a=>a!==ano), mesOutro=outroAno+mesSel.slice(4), dO=DADOS.meses[mesOutro];
  corpo.push(el('div',{class:'linhas'},[
    linha('Participação na receita bruta de '+ano,totalAno?pct(d[0]/totalAno):'—'),
    dO?linha('Receita bruta em '+rot(mesOutro),brl(dO[0]),null,dO[0]?varia(dO[0],d[0])+' em '+ano:''):null]));
  pg.append(cartao(titulo.charAt(0).toUpperCase()+titulo.slice(1),corpo));

  const g=areaGrafico('Receita bruta de cada mês de '+ano);
  pg.append(cartao('Receita bruta em '+ano,[g.caixa]));
  desenha(g.cv,{type:'bar',data:{labels:mesesAno.map(m=>NOMES[+m.slice(5)-1]),datasets:[{label:'Receita bruta',data:mesesAno.map(m=>valor(m,'bruto')),
    backgroundColor:mesesAno.map(m=>m===mesSel?COR.marca:COR.apagado),borderRadius:4,maxBarThickness:24}]},
    options:{maintainAspectRatio:false,interaction:{mode:'index',intersect:false},scales:escalas(eixoR),
      onClick:(e,els)=>{if(els.length&&DADOS.meses[mesesAno[els[0].index]]){mesSel=mesesAno[els[0].index];render();}},
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>brl(valor(mesesAno[c.dataIndex],'bruto'))}}}}});
};
PG.comparativo=pg=>{
  pg.append(seg([['bruto','Bruta'],['liquido','Líquida'],['taxa','Taxa']],metrica==='aliq'?'bruto':metrica,v=>{metrica=v;render();},'Métrica'));
  if(metrica==='aliq')metrica='bruto';
  const nome=NOME_METRICA[metrica];
  const series=ANOS.map(a=>NOMES.map((_,i)=>valor(ym2(a,i+1),metrica)));
  const g1=areaGrafico(nome+' por mês, '+ANOS.join(' e '));
  pg.append(cartao(nome+' por mês',[g1.caixa]));
  desenha(g1.cv,{type:'bar',data:{labels:NOMES,datasets:ANOS.map((a,i)=>({label:a,data:series[i],backgroundColor:COR.anos[i],borderRadius:3,maxBarThickness:14,categoryPercentage:.7,barPercentage:.86}))},
    options:{maintainAspectRatio:false,interaction:{mode:'index',intersect:false},scales:escalas(eixoR),plugins:{tooltip:{callbacks:{label:c=>c.dataset.label+': '+brl(series[c.datasetIndex][c.dataIndex])}}}}});

  // ponte: do total de um ano ao total do outro, no mesmo período
  const fim=+DADOS.anos[ANOS[1]].fim.slice(5), idx=Array.from({length:fim},(_,i)=>i);
  const a=idx.map(i=>series[0][i]||0), b=idx.map(i=>series[1][i]||0), ini=r2(a.reduce((s,v)=>s+v,0)), fimTot=r2(b.reduce((s,v)=>s+v,0));
  let cur=ini; const barras=[[0,ini]], deltas=[null], cores=[COR.anos[0]];
  idx.forEach(i=>{const dlt=r2(b[i]-a[i]);barras.push([cur,r2(cur+dlt)]);deltas.push(dlt);cores.push(dlt>=0?COR.sobe:COR.desce);cur=r2(cur+dlt);});
  barras.push([0,fimTot]);deltas.push(null);cores.push(COR.anos[1]);
  const rotulos=[ANOS[0]].concat(idx.map(i=>NOMES[i]),[ANOS[1]]);
  const g3=areaGrafico('Ponte de '+nome.toLowerCase()+' de '+ANOS[0]+' para '+ANOS[1]+', mês a mês');
  pg.append(cartao('De '+ANOS[0]+' para '+ANOS[1]+', mês a mês',[g3.caixa,legenda([[COR.sobe,'Aumento'],[COR.desce,'Queda']])]));
  desenha(g3.cv,{type:'bar',data:{labels:rotulos,datasets:[{label:nome,data:barras,backgroundColor:cores,borderRadius:3,borderSkipped:false,maxBarThickness:30}]},
    options:{maintainAspectRatio:false,scales:escalas(eixoR),plugins:{legend:{display:false},tooltip:{callbacks:{
      title:its=>{const k=its[0].dataIndex;return deltas[k]==null?'Total de janeiro a '+NOMES_L[fim-1]+' de '+rotulos[k]:NOMES_L[k-1];},
      label:c=>{const dlt=deltas[c.dataIndex];return dlt==null?brl(barras[c.dataIndex][1]):(dlt>=0?'+':'−')+brl(Math.abs(dlt)).replace('-','');},
      footer:its=>{const k=its[0].dataIndex;return deltas[k]==null?'':ANOS[0]+': '+brl(a[k-1])+'  ·  '+ANOS[1]+': '+brl(b[k-1]);}}}}}});

  const acum=series.map(s=>{let t=0;return s.map(v=>v==null?null:r2(t+=v));});
  const g2=areaGrafico(nome+' acumulada no ano');
  pg.append(cartao('Acumulado no ano',[g2.caixa]));
  desenha(g2.cv,{type:'line',data:{labels:NOMES,datasets:ANOS.map((an,i)=>({label:an,data:acum[i],borderColor:COR.anos[i],backgroundColor:COR.anos[i],borderWidth:2,pointRadius:3,pointHoverRadius:5,pointBorderColor:'#fff',pointBorderWidth:1.5,tension:.15}))},
    options:{maintainAspectRatio:false,interaction:{mode:'index',intersect:false},scales:escalas(eixoR),plugins:{tooltip:{callbacks:{label:c=>c.dataset.label+': '+brl(acum[c.datasetIndex][c.dataIndex])}}}}});

  const fimS=String(fim).padStart(2,'0'), sa=soma(listaMeses(ANOS[0]+'-01',ANOS[0]+'-'+fimS)), sb=soma(listaMeses(ANOS[1]+'-01',ANOS[1]+'-'+fimS));
  pg.append(cartao('Janeiro a '+NOMES_L[fim-1],[tabela(['',ANOS[0],ANOS[1],'Variação'],[
    ['Receita bruta',brl(sa.bruto),brl(sb.bruto),varia(sa.bruto,sb.bruto)],
    ['Taxa Airbnb',brl(sa.taxa),brl(sb.taxa),varia(sa.taxa,sb.taxa)],
    ['Taxa efetiva',pct(sa.aliq),pct(sb.aliq),'—'],
    ['Receita líquida',brl(sa.liquido),brl(sb.liquido),varia(sa.liquido,sb.liquido)]])]));
};
PG.sazonalidade=pg=>{
  if(metrica==='aliq')metrica='bruto';
  const nome=NOME_METRICA[metrica];
  pg.append(seg([['bruto','Bruta'],['liquido','Líquida'],['taxa','Taxa']],metrica,v=>{metrica=v;render();},'Métrica'));
  // mapa de calor: cinco faixas por quintil dos meses com valor
  const positivos=TODOS.map(m=>valor(m,metrica)).filter(v=>v>0).sort((x,y)=>x-y);
  const cortes=[.2,.4,.6,.8].map(q=>positivos[Math.min(positivos.length-1,Math.floor(q*positivos.length))]);
  const classe=v=>cortes.filter(c=>v>=c).length;
  const grade=el('div',{class:'calor',role:'table','aria-label':nome+' por mês e ano'});
  grade.append(el('span',{class:'cab-a'}));
  NOMES.forEach(n=>grade.append(el('span',{class:'cab-m',text:n})));
  ANOS.forEach(an=>{grade.append(el('span',{class:'cab-a',text:an}));
    NOMES.forEach((n,i)=>{const m=ym2(an,i+1), v=valor(m,metrica);
      const c=el('button',{type:'button',class:'cel'+(v==null?' nulo':v===0?' zero':''),text:compacto(v),'aria-label':NOMES_L[i]+' de '+an+': '+brl(v)});
      if(v==null)c.disabled=true;
      else{ if(v>0){const k=classe(v);c.style.background=COR.calor[k];if(k>=3)c.style.color='#fff';}
        comDica(c,rot(m),nome+': '+brl(v));c.addEventListener('click',()=>{dicaEl().hidden=true;mesSel=m;ir('mes');}); }
      grade.append(c);});});
  const escala=el('div',{class:'escala'},[document.createTextNode('menos')].concat(COR.calor.map(c=>el('i',{style:'background:'+c})),[document.createTextNode('mais')]));
  pg.append(cartao(nome+' por mês',[grade],escala));

  // ranking do ano escolhido
  const mesesAno=listaMeses(anoRank+'-01',anoRank+'-12').filter(m=>DADOS.meses[m]);
  const ord=mesesAno.map(m=>[m,valor(m,metrica)]).sort((x,y)=>y[1]-x[1]), total=ord.reduce((s,x)=>s+x[1],0), maximo=ord.length?ord[0][1]:0;
  const lista=el('div',{class:'rank'});let ac=0,cortou=false;
  ord.forEach(([m,v])=>{ac+=v;
    const b=el('button',{type:'button',class:'rk','aria-label':NOMES_L[+m.slice(5)-1]+': '+brl(v)},[el('span',{text:NOMES[+m.slice(5)-1]}),
      el('div',{class:'trilho'},el('i',{style:'width:'+(maximo?v/maximo*100:0)+'%'})),el('span',{text:brl(v)}),el('span',{class:'p',text:total?pct(v/total):'—'})]);
    comDica(b,rot(m),'Acumulado até aqui: '+(total?pct(ac/total):'—'));
    b.addEventListener('click',()=>{dicaEl().hidden=true;mesSel=m;ir('mes');});lista.append(b);
    if(!cortou&&total>0&&ac/total>=.8){cortou=true;lista.append(el('div',{class:'corte',text:'80% do ano até aqui'}));}});
  pg.append(cartao('Do maior para o menor',[lista],seg(ANOS.map(x=>[x,x]),anoRank,x=>{anoRank=x;render();},'Ano')));
};
PG.dinamica=pg=>{
  const GRUPOS={mes:NOMES.map((n,i)=>[n,[i+1]]),tri:[1,2,3,4].map(q=>[q+'º tri',[q*3-2,q*3-1,q*3]]),sem:[['1º sem',[1,2,3,4,5,6]],['2º sem',[7,8,9,10,11,12]]]};
  const cel=(ano,ms)=>{const com=ms.filter(m=>DADOS.meses[ym2(ano,m)]);if(!com.length)return null;const s=soma(com.map(m=>ym2(ano,m)));s.meses=com.join(',');return s;};
  const tot=ANOS.map(a=>cel(a,[1,2,3,4,5,6,7,8,9,10,11,12]));
  const ehTaxa=pv.valor==='aliq', emPct=pv.como==='pct'&&!ehTaxa;
  const val=(c,k)=>c==null?null:(emPct?(tot[k][pv.valor]?c[pv.valor]/tot[k][pv.valor]:null):c[pv.valor]);
  const fmt=v=>v==null?'—':(ehTaxa||emPct?pct(v):brl(v));
  const variacao=(x,y)=>{if(!x||!y||x.meses!==y.meses)return [null,'—'];
    if(ehTaxa){if(x.aliq==null||y.aliq==null)return [null,'—'];const d=(y.aliq-x.aliq)*100;return [d,(d>=0?'+':'−')+num(Math.abs(d),1)+' p.p.'];}
    const p=x[pv.valor],q=y[pv.valor];if(!p)return [null,'—'];return [(q-p)/p,varia(p,q)];};
  let linhas=GRUPOS[pv.linhas].map(([n,ms],i)=>{const cs=ANOS.map(a=>cel(a,ms)), vr=variacao(cs[0],cs[1]);return {i,n,v:cs.map((c,k)=>val(c,k)),vr};});
  if(pv.ord){const {col,dir}=pv.ord, pega=l=>col===2?l.vr[0]:l.v[col];
    linhas=linhas.slice().sort((x,y)=>{const p=pega(x),q=pega(y);if(p==null&&q==null)return 0;if(p==null)return 1;if(q==null)return -1;return dir==='desc'?q-p:p-q;});}
  const maximos=ANOS.map((_,k)=>Math.max(0,...linhas.map(l=>l.v[k]||0)));

  pg.append(el('div',{class:'controles'},[
    seg([['mes','Mês'],['tri','Trimestre'],['sem','Semestre']],pv.linhas,v=>{pv.linhas=v;render();},'Linhas'),
    seg([['bruto','Bruta'],['liquido','Líquida'],['taxa','Taxa'],['aliq','Taxa efetiva']],pv.valor,v=>{pv.valor=v;render();},'Valor'),
    seg([['valor','Valor'],['pct','% do ano']],emPct?'pct':'valor',v=>{pv.como=v;render();},'Exibição')]));

  const t=el('table',{class:'din'}), cabs=[{t:pv.linhas==='mes'?'Mês':pv.linhas==='tri'?'Trimestre':'Semestre',col:null}].concat(ANOS.map((a,k)=>({t:a,col:k})),[{t:'Variação',col:2}]);
  t.append(el('thead',{},el('tr',{},cabs.map(c=>{const ativo=pv.ord&&pv.ord.col===c.col&&c.col!=null;
    const b=el('button',{type:'button',text:c.t+(ativo?(pv.ord.dir==='desc'?' ↓':' ↑'):''),'aria-label':c.col==null?'Voltar à ordem original':'Ordenar por '+c.t});
    b.addEventListener('click',()=>{ if(c.col==null)pv.ord=null; else if(!ativo)pv.ord={col:c.col,dir:'desc'}; else if(pv.ord.dir==='desc')pv.ord={col:c.col,dir:'asc'}; else pv.ord=null; render(); });
    return el('th',{},b);}))));
  const tb=el('tbody');
  linhas.forEach(l=>{const tr=el('tr',{},[el('td',{text:l.n})]);
    l.v.forEach((v,k)=>{const td=el('td',{class:'b',text:fmt(v)});
      if(v>0&&maximos[k]>0){const w=Math.round(v/maximos[k]*100);td.style.backgroundImage='linear-gradient(to left,#f1eadf '+w+'%,transparent '+w+'%)';}
      tr.append(td);});
    tr.append(el('td',{text:l.vr[1]}));tb.append(tr);});
  const vt=variacao(tot[0],tot[1]);
  tb.append(el('tr',{class:'total'},[el('td',{text:'Total'})].concat(tot.map((c,k)=>el('td',{text:emPct?(c?pct(1):'—'):fmt(c?c[pv.valor]:null)})),[el('td',{text:vt[1]})])));
  t.append(tb);
  const area=el('textarea',{readonly:'',hidden:'','aria-label':'Tabela em CSV'}), btn=el('button',{type:'button',text:'Copiar tabela (CSV)'});
  btn.addEventListener('click',()=>copiarCsv(btn,area,[cabs.map(c=>c.t).join(';')].concat(linhas.map(l=>[l.n].concat(l.v.map(fmt),[l.vr[1]]).join(';'))).join('\n')));
  pg.append(cartao(NOME_METRICA[pv.valor]+(emPct?', participação no ano':''),[el('div',{class:'rolagem'},t),area],btn));
};
PG.taxas=pg=>{
  const meses=listaMeses(de,ate).filter(m=>DADOS.meses[m]);
  if(!meses.length){pg.append(el('p',{class:'suave',text:'Sem dados do Airbnb neste período.'}));return;}
  const serie=meses.map(m=>{const a=aliq(m);return a==null?null:+(a*100).toFixed(2);});
  const g=areaGrafico('Taxa efetiva do Airbnb por mês');
  pg.append(cartao('Taxa efetiva por mês',[g.caixa]));
  desenha(g.cv,{type:'line',data:{labels:meses.map(rot),datasets:[{label:'Taxa efetiva',data:serie,
    borderColor:COR.taxa,backgroundColor:COR.taxa,borderWidth:2,pointRadius:4,pointHoverRadius:6,pointBorderColor:'#fff',pointBorderWidth:2,spanGaps:true}]},
    options:{maintainAspectRatio:false,interaction:{mode:'index',intersect:false},scales:escalas(v=>num(v)+'%'),plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>{const v=serie[c.dataIndex];return v==null?'sem receita':num(v,1)+'%';}}}}}});

  const linhas=meses.map(m=>{const d=DADOS.meses[m],a=aliq(m);return [rot(m),brl(d[0]),brl(r2(d[0]-d[1])),a==null?'—':pct(a),brl(d[1])];});
  const t=soma(meses);linhas.push(['Total',brl(t.bruto),brl(t.taxa),t.aliq==null?'—':pct(t.aliq),brl(t.liquido)]);
  const area=el('textarea',{readonly:'',hidden:'','aria-label':'Tabela mensal em CSV'});
  const btn=el('button',{type:'button',text:'Copiar tabela (CSV)'});
  btn.addEventListener('click',()=>copiarCsv(btn,area,['mes;bruta;taxa;taxa_efetiva;liquida'].concat(meses.map(m=>{const d=DADOS.meses[m],a=aliq(m);
      return [m,d[0].toFixed(2),r2(d[0]-d[1]).toFixed(2),a==null?'':(a*100).toFixed(2),d[1].toFixed(2)].join(';').replace(/\./g,',');})).join('\n')));
  pg.append(cartao('Tabela mensal',[tabela(['Mês','Bruta','Taxa','Taxa efetiva','Líquida'],linhas,true),area],btn));

  const antes=soma(listaMeses('2026-01','2026-06')), depois=soma(listaMeses('2026-07','2026-11'));
  const pico=Math.max(...listaMeses('2026-07','2026-11').map(m=>aliq(m)||0));
  pg.append(acord('Mudança de taxa em 2026',[
    tabela(['Período','Bruta','Taxa','Taxa efetiva'],[['Jan a jun/26',brl(antes.bruto),brl(antes.taxa),pct(antes.aliq)],['Jul a 14/nov/26',brl(depois.bruto),brl(depois.taxa),pct(depois.aliq)]]),
    el('p',{class:'suave',text:'O Airbnb trocou a taxa dividida (no Brasil, 4% do anfitrião e de 14,1% a 16,5% cobrados à parte do hóspede) pela taxa única de 16%, toda descontada do anfitrião. Reservas confirmadas antes da troca mantêm a taxa antiga.'}),
    el('p',{class:'suave'},[el('a',{href:'https://www.airbnb.com.br/help/article/1857',rel:'noopener noreferrer',text:'Central de Ajuda do Airbnb: taxas de serviço'})])]));

  const saida=el('div',{class:'corpo',style:'padding:0'});
  const inp=el('input',{type:'number',id:'precoAntigo',min:'0',step:'10',value:'100',inputmode:'decimal'});
  const calc=()=>{const p=parseFloat(inp.value);saida.replaceChildren();if(!(p>0)){saida.append(el('p',{class:'suave',text:'Informe um preço maior que zero.'}));return;}
    const nominal=p*0.96/0.84, observado=p*(1-antes.aliq)/(1-pico);
    saida.append(tabela(['Cenário','Novo preço','Reajuste'],[['Taxas oficiais (4% → 16%)',brl(nominal),'+'+pct(nominal/p-1)],['Taxas observadas ('+pct(antes.aliq)+' → '+pct(pico)+')',brl(observado),'+'+pct(observado/p-1)]]));
    saida.append(el('p',{class:'suave',text:'Na taxa dividida, o hóspede pagava entre '+brl(p*1.141)+' e '+brl(p*1.165)+' por um preço de '+brl(p)+'. Novo preço = preço antigo × (1 − taxa antiga) ÷ (1 − taxa nova).'}));};
  inp.addEventListener('input',calc);calc();
  pg.append(acord('Preço de equilíbrio',[el('label',{for:'precoAntigo',class:'suave',style:'display:flex;flex-direction:column;gap:4px'},[document.createTextNode('Preço cobrado antes da mudança (R$)'),inp]),saida]));
  pg.append(acord('Impostos cobrados dos hóspedes',[tabela(['Período','Repassado pelo Airbnb'],ANOS.map(a=>[DADOS.anos[a].rotulo,brl(DADOS.anos[a].impostoHospede)])),
    el('p',{class:'suave',text:'Cobrado do hóspede e repassado pelo Airbnb às autoridades. Não passa pela conta do anfitrião.'})]));
};
PG.ocupacao=pg=>{
  const as=ANOS.map(a=>DADOS.anos[a]), acom=A=>A.pdf.bruto-A.outros;
  pg.append(el('div',{class:'duas'},as.map(A=>cartao(A.rotulo,[rosca([{nome:'Noites reservadas',valor:A.noites,cor:COR.marca},{nome:'Dias sem reserva',valor:A.dias-A.noites,cor:COR.apagado}],pct(A.noites/A.dias),'ocupação',v=>num(v))]))));
  pg.append(cartao('Indicadores',[tabela([''].concat(as.map(A=>A.rotulo)),[
    ['Noites reservadas'].concat(as.map(A=>num(A.noites))),
    ['Ocupação (dias corridos)'].concat(as.map(A=>pct(A.noites/A.dias))),
    ['Noites por estadia'].concat(as.map(A=>num(A.mediaEstadia,1))),
    ['Estadias (aprox.)'].concat(as.map(A=>num(A.noites/A.mediaEstadia))),
    ['Diária média'].concat(as.map(A=>brl(acom(A)/A.noites))),
    ['Receita por dia do período'].concat(as.map(A=>brl(acom(A)/A.dias)))])]));
  pg.append(el('p',{class:'suave',text:'A ocupação por mês aparece quando o calendário do Airbnb for importado.'}));
};
PG.reservas=pg=>{
  pg.append(cartao('Em breve',[el('p',{class:'suave',text:'Lista de estadias, valores por reserva e datas de pagamento, a partir do histórico de transações do Airbnb.'})]));
};
PG.resultado=pg=>{
  const cascata=el('div',{class:'cascata'}), porCat=el('div',{class:'rank'}), lista=el('div',{class:'lanc'}), situacao=el('p',{class:'suave'});
  const cCat=cartao('Custos por categoria',[porCat]), cLista=cartao('Lançamentos do período',[lista]);
  const hoje=new Date(), hojeISO=hoje.getFullYear()+'-'+String(hoje.getMonth()+1).padStart(2,'0')+'-'+String(hoje.getDate()).padStart(2,'0');
  const corpoForm=el('div',{class:'corpo',style:'padding:0'});
  const campo=(rotulo,ctrl,larga)=>el('label',{for:ctrl.id,class:larga?'larga':''},[document.createTextNode(rotulo),ctrl]);
  const leValor=inp=>{let b=inp.value.trim();b=b.includes(',')?b.replace(/\./g,'').replace(',','.'):b;return r2(parseFloat(b));};

  // formulário: custo ou reserva feita fora do Airbnb
  function pintaForm(){
    const ehCusto=tipoLanc==='custo';
    const fData=el('input',{type:'date',id:'cData',value:hojeISO}), fSaida=el('input',{type:'date',id:'cSaida'});
    const fCat=el('select',{id:'cCat'},(ehCusto?CATEGORIAS:CANAIS).map(c=>el('option',{value:c,text:c})));
    const fValor=el('input',{type:'text',id:'cValor',inputmode:'decimal',placeholder:'0,00',autocomplete:'off'});
    const fDesc=el('input',{type:'text',id:'cDesc',maxlength:'200',autocomplete:'off'});
    const fFoto=el('input',{type:'file',id:'cFoto',class:'oculto',accept:'image/png,image/jpeg,image/webp,application/pdf',tabindex:'-1'});
    const nomeArq=el('span',{class:'suave',text:'Nenhum arquivo'}), btnArq=el('button',{type:'button',text:'Escolher arquivo'});
    btnArq.addEventListener('click',()=>fFoto.click());
    fFoto.addEventListener('change',()=>{nomeArq.textContent=fFoto.files&&fFoto.files[0]?fFoto.files[0].name:'Nenhum arquivo';});
    const campoFoto=el('div',{class:'larga anexo',id:'campoFoto'},[el('span',{class:'rot-campo',text:'Foto ou comprovante (opcional)'}),el('div',{class:'arq'},[btnArq,nomeArq,fFoto])]);
    campoFoto.hidden=!cap.assets;
    const aviso=el('p',{class:'aviso',role:'status'}), salvar=el('button',{type:'submit',class:'principal',text:'Salvar lançamento'});
    const form=el('form',{class:'form',novalidate:''},[
      campo(ehCusto?'Data':'Entrada',fData), ehCusto?campo('Valor (R$)',fValor):campo('Saída',fSaida),
      ehCusto?null:campo('Valor recebido (R$)',fValor,true),
      campo(ehCusto?'Categoria':'Como veio a reserva',fCat,true),campo('Descrição (opcional)',fDesc,true),campoFoto,
      el('div',{class:'larga cab'},[aviso,salvar])]);
    form.addEventListener('submit',async e=>{e.preventDefault();if(!cap.db)return;
      const v=leValor(fValor), dt=/^\d{4}-\d{2}-\d{2}$/;
      if(!dt.test(fData.value)){aviso.textContent=ehCusto?'Informe a data.':'Informe a data de entrada.';return;}
      if(!ehCusto&&(!dt.test(fSaida.value)||fSaida.value<=fData.value)){aviso.textContent='A saída precisa ser depois da entrada.';return;}
      if(!(v>0)){aviso.textContent='Informe um valor maior que zero.';return;}
      salvar.disabled=true;salvar.textContent='Salvando…';aviso.textContent='';
      try{
        let anexo=null,anexoTipo='';const f=fFoto.files&&fFoto.files[0];
        if(f&&cap.assets){ if(!['image/png','image/jpeg','image/webp','application/pdf'].includes(f.type))throw {code:'unsupported_type'}; if(f.size>20*1024*1024)throw {code:'too_large'}; const r=await cap.assets.upload(f); anexo=r.id; anexoTipo=r.contentType||f.type||''; }
        const comum={descricao:fDesc.value.trim().slice(0,200),valor:v,anexo,anexoTipo,criadoEm:new Date().toISOString()};
        if(ehCusto) await cap.db.collection('custos').add(Object.assign({data:fData.value,categoria:fCat.value},comum));
        else await cap.db.collection('reservas').add(Object.assign({entrada:fData.value,saida:fSaida.value,canal:fCat.value},comum));
        fValor.value='';fDesc.value='';fFoto.value='';fSaida.value='';nomeArq.textContent='Nenhum arquivo';aviso.textContent='Lançamento salvo.';
      }catch(err){aviso.textContent=textoErro(err);}
      salvar.disabled=false;salvar.textContent='Salvar lançamento';});
    corpoForm.replaceChildren(seg([['custo','Custo'],['reserva','Reserva por fora']],tipoLanc,v=>{tipoLanc=v;pintaForm();},'Tipo de lançamento'),form);
  }
  pintaForm();
  const cForm=acord('Novo lançamento',[corpoForm]);
  pg.append(cartao('Do bruto ao lucro',[cascata]),situacao,cForm,cCat,cLista);

  pintaCustos=()=>{
    const t=soma(listaMeses(de,ate)), itensC=custosNoPeriodo(), itensR=reservasNoPeriodo();
    const totC=r2(itensC.reduce((s,c)=>s+c.valor,0)), totR=r2(itensR.reduce((s,c)=>s+c.valor,0));
    const base=Math.max(t.bruto,t.liquido+totR,totC,1);
    const faixa=(nome,v,cor,ini)=>el('div',{class:'casc'},[el('span',{text:nome}),el('div',{class:'trilho'},el('i',{style:'left:'+Math.max(0,ini)/base*100+'%;width:'+Math.max(0,v)/base*100+'%;background:'+cor})),el('span',{class:'val',text:brl(v)})]);
    const vazio=(nome,txt)=>el('div',{class:'casc'},[el('span',{text:nome}),el('div',{class:'trilho breve'}),el('span',{class:'val suave',text:txt})]);
    const pronto=custoEstado==='pronto', tem=pronto&&itensC.length>0, entra=r2(t.liquido+totR), lucro=r2(entra-totC);
    cascata.replaceChildren(...[faixa('Bruta',t.bruto,COR.apagado,0),faixa('Taxa Airbnb',t.taxa,COR.taxa,t.liquido),faixa('Líquida',t.liquido,COR.liquido,0),
      itensR.length?faixa('Por fora',totR,'#8fa694',t.liquido):null,
      tem?faixa('Custos',totC,COR.desce,Math.max(0,entra-totC)):vazio('Custos',pronto?'sem lançamentos':'—'),
      tem?faixa('Lucro',lucro,COR.anos[1],0):vazio('Lucro','—')].filter(Boolean));
    situacao.textContent=custoEstado==='carregando'?'Carregando os lançamentos…':custoEstado==='indisponivel'?'O registro de lançamentos não está disponível nesta visualização.':'';
    situacao.hidden=!situacao.textContent;
    cForm.hidden=!pronto;const cf=document.getElementById('campoFoto');if(cf)cf.hidden=!cap.assets;
    cCat.hidden=!tem;cLista.hidden=!pronto;
    const porC={};itensC.forEach(c=>{porC[c.categoria]=r2((porC[c.categoria]||0)+c.valor);});
    const ordC=Object.entries(porC).sort((x,y)=>y[1]-x[1]), maxC=ordC.length?ordC[0][1]:0;
    porCat.replaceChildren(...ordC.map(([n,v])=>el('div',{class:'cat'},[el('span',{text:n}),el('div',{class:'trilho'},el('i',{style:'width:'+(maxC?v/maxC*100:0)+'%'})),el('span',{text:brl(v)})])));
    // lista única, do mais recente para o mais antigo
    const itens=itensC.map(c=>({col:'custos',id:c.id,quando:c.data,titulo:c.categoria,sub:c.descricao,valor:brl(c.valor),anexo:c.anexo,anexoTipo:c.anexoTipo}))
      .concat(itensR.map(c=>({col:'reservas',id:c.id,quando:c.entrada,titulo:'Reserva por fora',sub:[c.canal,'até '+dataBR(c.saida),c.noites+(c.noites===1?' noite':' noites'),c.descricao].filter(Boolean).join(' · '),valor:'+ '+brl(c.valor),anexo:c.anexo,anexoTipo:c.anexoTipo})))
      .sort((x,y)=>y.quando.localeCompare(x.quando));
    if(!itens.length){lista.replaceChildren(el('p',{class:'suave',text:'Nenhum lançamento neste período.'}));return;}
    lista.replaceChildren(...itens.map(c=>{
      const acoes=el('div',{class:'acoes'});
      if(c.anexo){ if(/^image\//.test(c.anexoTipo)){const im=el('img',{class:'mini',alt:'Anexo de '+c.titulo+' em '+dataBR(c.quando),loading:'lazy',tabindex:'0',role:'button'});
          const alterna=()=>im.classList.toggle('grande');im.addEventListener('click',alterna);im.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();alterna();}});window.urlAnexo(c.anexo).then(u=>{if(u)im.src=u;});acoes.append(im);}
        else{const lk=el('a',{href:'#',rel:'noopener noreferrer',text:'Abrir anexo'});lk.addEventListener('click',async ev=>{ev.preventDefault();const u=await window.urlAnexo(c.anexo);if(u)window.open(u,'_blank','noopener,noreferrer');});acoes.append(lk);} }
      const excluir=el('button',{type:'button',text:'Excluir'});
      excluir.addEventListener('click',()=>{
        const sim=el('button',{type:'button',text:'Sim, excluir'}), nao=el('button',{type:'button',text:'Cancelar'});
        excluir.replaceWith(sim,nao);nao.addEventListener('click',()=>pintaCustos());
        sim.addEventListener('click',async()=>{sim.disabled=true;nao.disabled=true;
          try{await cap.db.doc(c.col+'/'+c.id).delete(); if(c.anexo&&cap.assets)cap.assets.delete(c.anexo).catch(()=>{});}
          catch(err){situacao.hidden=false;situacao.textContent=textoErro(err);pintaCustos();}});});
      acoes.append(excluir);
      return el('div',{class:'lc'},[el('span',{class:'quando',text:dataBR(c.quando)}),el('div',{class:'oque'},[el('b',{text:c.titulo}),c.sub?el('span',{text:c.sub}):null]),el('span',{class:'quanto',text:c.valor}),acoes]);}));
  };
  pintaCustos();
};
PG.sobre=pg=>{
  pg.append(el('p',{class:'suave',text:'Números dos relatórios de ganhos do Airbnb, de 01/01/2025 a 14/11/2026.'}));
  const conf=[];ANOS.forEach(a=>{const A=DADOS.anos[a],t=soma(listaMeses(A.ini,A.fim));
    [['bruto','bruta'],['taxa','taxa'],['liquido','líquida']].forEach(([k,n])=>conf.push([a+', '+n,brl(t[k]),brl(A.pdf[k]),brl(r2(t[k]-A.pdf[k]))]));});
  pg.append(acord('Conferência com o relatório do Airbnb',[tabela(['','Painel','Relatório','Diferença'],conf)]));
  pg.append(acord('Como cada número é calculado',[el('ul',{},[
    'Taxa Airbnb = receita bruta − receita líquida.','Taxa efetiva = taxa ÷ receita bruta.',
    'Ocupação = noites reservadas ÷ dias corridos do período, sem descontar datas bloqueadas.',
    'Diária média = (receita bruta − créditos e resoluções) ÷ noites reservadas.',
    'Estadias = noites reservadas ÷ noites por estadia.','Lucro = receita líquida do Airbnb + reservas por fora − custos lançados no período.',
    'Variação entre anos só aparece quando os dois anos cobrem os mesmos meses.',
    'O mês de cada valor é o informado pelo relatório do Airbnb.'].map(t=>el('li',{text:t})))]));
  pg.append(acord('Como o Airbnb cobra a taxa',[el('p',{class:'suave',text:'Na taxa única, o Airbnb desconta 16% do anfitrião no Brasil e o hóspede não paga taxa de serviço à parte. No modelo anterior, o anfitrião pagava 4% e o hóspede de 14,1% a 16,5%.'}),
    el('p',{class:'suave'},[el('a',{href:'https://www.airbnb.com.br/help/article/1857',rel:'noopener noreferrer',text:'Central de Ajuda do Airbnb: taxas de serviço'})])]));
  pg.append(acord('Onde ficam os lançamentos',[el('p',{class:'suave',text:'Os custos, as reservas por fora e os anexos ficam guardados junto com este painel. Só quem tem permissão de edição consegue lançar ou excluir.'})]));
};

/* ---------- período ---------- */
function rotuloPeriodo(){return de===ate?rot(de):rot(de)+' – '+rot(ate);}
function anosDoFiltro(){const s=new Set(ANOS);custos.forEach(c=>s.add(c.data.slice(0,4)));reservasFora.forEach(c=>s.add(c.entrada.slice(0,4)));return [...s].sort();}
function montaPop(){
  const pop=document.getElementById('popPeriodo');pop.replaceChildren();
  anosDoFiltro().forEach(a=>{pop.append(el('h3',{text:a}));
    pop.append(el('div',{class:'grade-meses'},listaMeses(a+'-01',a+'-12').map(m=>{
      const ponta=pend?m===pend:(m===de||m===ate), dentro=!pend&&m>de&&m<ate;
      const b=el('button',{type:'button',class:'mes'+(ponta?' ponta':dentro?' dentro':''),text:NOMES[+m.slice(5)-1],'aria-label':NOMES_L[+m.slice(5)-1]+' de '+a});
      if(!temDado(m))b.disabled=true;
      b.addEventListener('click',()=>{ if(!pend){pend=m;montaPop();} else {de=pend<m?pend:m;ate=pend<m?m:pend;pend=null;fechaPop();render();} });
      return b;})));});
  pop.append(el('p',{class:'dica-pop',text:pend?'Agora toque no mês final.':'Toque no mês inicial e depois no mês final.'}));
}
function abrePop(){pend=null;montaPop();document.getElementById('popPeriodo').hidden=false;document.getElementById('btnPeriodo').setAttribute('aria-expanded','true');}
function fechaPop(){pend=null;document.getElementById('popPeriodo').hidden=true;document.getElementById('btnPeriodo').setAttribute('aria-expanded','false');}

/* ---------- navegação ---------- */
const celular=()=>matchMedia('(max-width:860px)').matches;
function render(){
  const s=SECOES.find(x=>x.id===pagina)||SECOES[0];pagina=s.id;
  graficos.forEach(g=>g.destroy());graficos=[];pintaCustos=null;dicaEl().hidden=true;
  document.getElementById('titulo').textContent=s.nome;
  SECOES.forEach(x=>{[document.getElementById('nav-'+x.id),document.getElementById('tab-'+x.id)].forEach(b=>{if(!b)return;if(x.id===pagina)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});});
  document.getElementById('periodo').hidden=!s.filtro;
  const bp=document.getElementById('btnPeriodo');bp.replaceChildren(icone('<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>'),document.createTextNode(rotuloPeriodo()));
  document.querySelectorAll('.atalho').forEach(b=>{const k=b.dataset.atalho;const on=k==='tudo'?(de===TODOS[0]&&ate===TODOS[TODOS.length-1]):(de===DADOS.anos[k].ini&&ate===DADOS.anos[k].fim);b.setAttribute('aria-pressed',String(on));});
  const antiga=document.getElementById('pagina'), nova=el('div',{id:'pagina'});antiga.replaceWith(nova);
  try{PG[pagina](nova);}catch(e){nova.append(el('p',{class:'suave',text:'Não foi possível montar esta seção.'}));if(window.console)console.error(e);}
}
function ir(id){pagina=id;try{location.hash=id;}catch(e){}document.getElementById('app').classList.remove('aberta');fechaPop();render();window.scrollTo({top:0});}
(function iniciar(){
  const menu=document.getElementById('menu'), rodape=document.getElementById('rodape'), app=document.getElementById('app'), tabbar=document.getElementById('tabbar');
  SECOES.forEach(s=>{
    const b=el('button',{type:'button',class:'item',id:'nav-'+s.id,title:s.nome},[icone(s.ico),el('span',{class:'rot',text:s.nome}),s.breve?el('span',{class:'breve',text:'em breve'}):null]);
    b.addEventListener('click',()=>ir(s.id));
    (s.rodape?rodape:menu).append(b); if(s.fim)menu.append(el('div',{class:'sep'}));
    if(s.barra){const t=el('button',{type:'button',id:'tab-'+s.id},[icone(s.ico),el('span',{text:s.curto})]);t.addEventListener('click',()=>ir(s.id));tabbar.append(t);}});
  const mais=el('button',{type:'button','aria-label':'Abrir o menu completo'},[icone('<path d="M4 7h16M4 12h16M4 17h16"/>'),el('span',{text:'Menu'})]);
  mais.addEventListener('click',()=>app.classList.toggle('aberta'));tabbar.append(mais);
  try{if(localStorage.getItem('recanto-menu')==='recolhido')app.classList.add('recolhida');}catch(e){}
  document.getElementById('btnMenu').addEventListener('click',()=>{
    app.classList.toggle('recolhida');try{localStorage.setItem('recanto-menu',app.classList.contains('recolhida')?'recolhido':'aberto');}catch(e){}setTimeout(()=>graficos.forEach(g=>g.resize()),240);});
  document.getElementById('veu').addEventListener('click',()=>app.classList.remove('aberta'));
  document.getElementById('btnPeriodo').addEventListener('click',e=>{e.stopPropagation();document.getElementById('popPeriodo').hidden?abrePop():fechaPop();});
  document.getElementById('popPeriodo').addEventListener('click',e=>e.stopPropagation());
  document.addEventListener('click',fechaPop);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){fechaPop();app.classList.remove('aberta');}});
  document.querySelectorAll('.atalho').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.atalho;
    if(k==='tudo'){de=TODOS[0];ate=TODOS[TODOS.length-1];}else{de=DADOS.anos[k].ini;ate=DADOS.anos[k].fim;}fechaPop();render();}));
  window.addEventListener('hashchange',()=>{const h=(location.hash||'').slice(1);if(h&&h!==pagina&&PG[h]){pagina=h;render();}});
  window.addEventListener('scroll',()=>{dicaEl().hidden=true;},{passive:true});
  const h=(location.hash||'').slice(1);if(PG[h])pagina=h;
  render();
  iniciaCustos();
})();
