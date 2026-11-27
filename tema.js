/* Tema: roda no <head>, antes do CSS desenhar, para o escuro não piscar branco.
   data-tema = escolha (claro | escuro | sistema); data-esquema = o que está valendo agora. */
(function(){
  var r=document.documentElement, mq=window.matchMedia?matchMedia('(prefers-color-scheme: dark)'):{matches:false};
  function aplica(){
    var t=r.getAttribute('data-tema')||'sistema', esc=t==='escuro'||(t==='sistema'&&mq.matches);
    r.setAttribute('data-esquema',esc?'escuro':'claro');
    var m=document.querySelector('meta[name="theme-color"]'); if(m)m.setAttribute('content',esc?'#1c1a17':'#faf7f1');
  }
  window.recantoTemaLocal=function(){try{var t=localStorage.getItem('recanto-tema');return t==='claro'||t==='escuro'?t:'sistema';}catch(e){return 'sistema';}};
  window.recantoTema=function(t){
    t=(t==='claro'||t==='escuro')?t:'sistema';
    var antes=r.getAttribute('data-esquema');
    r.setAttribute('data-tema',t); try{localStorage.setItem('recanto-tema',t);}catch(e){}
    aplica();
    if(r.getAttribute('data-esquema')!==antes)window.dispatchEvent(new Event('recanto-tema'));
  };
  r.setAttribute('data-tema',window.recantoTemaLocal()); aplica();
  function muda(){var antes=r.getAttribute('data-esquema');aplica();if(r.getAttribute('data-esquema')!==antes)window.dispatchEvent(new Event('recanto-tema'));}
  if(mq.addEventListener)mq.addEventListener('change',muda);else if(mq.addListener)mq.addListener(muda);
  document.addEventListener('DOMContentLoaded',aplica);
})();
