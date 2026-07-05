(function(){
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){var id=a.getAttribute('href');if(id==='#')return;var t=document.querySelector(id);if(!t)return;e.preventDefault();var y=t.getBoundingClientRect().top+window.pageYOffset-64;if(reduce){window.scrollTo(0,y);}else{window.scrollTo({top:y,behavior:'smooth'});}});
  });
  var stats=document.getElementById('mbstats');
  function fmt(v,p){var s=Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g,',');return p?s+'+':s;}
  if(stats){var ran=false;function run(){if(ran)return;ran=true;stats.querySelectorAll('.stat-n').forEach(function(el){var tg=parseInt(el.getAttribute('data-n'),10),p=el.hasAttribute('data-plus');if(reduce){el.textContent=fmt(tg,p);return;}var t0=null;function step(ts){if(!t0)t0=ts;var pr=Math.min((ts-t0)/1200,1),e=1-Math.pow(1-pr,3);el.textContent=fmt(tg*e,p);if(pr<1)requestAnimationFrame(step);}requestAnimationFrame(step);});}
    if('IntersectionObserver' in window){var so=new IntersectionObserver(function(en){en.forEach(function(x){if(x.isIntersecting){run();so.disconnect();}});},{threshold:.3});so.observe(stats);}else{run();}}
  var imgs=[].slice.call(document.querySelectorAll('.plate img.media-asset'));
  if(imgs.length){
    var lb=document.createElement('div');lb.className='lb';lb.setAttribute('role','dialog');lb.setAttribute('aria-modal','true');lb.setAttribute('aria-label','Image viewer');
    lb.innerHTML='<button class="lb-close" aria-label="Close viewer">Close ×</button><button class="lb-prev" aria-label="Previous image">←</button><img alt=""><button class="lb-next" aria-label="Next image">→</button><div class="lb-bar"><span class="lbcap"></span><span class="lbc"></span></div>';
    document.body.appendChild(lb);
    var im=lb.querySelector('img'),cap=lb.querySelector('.lbcap'),cnt=lb.querySelector('.lbc'),gi=0,lf=null;
    function cof(x){var f=x.closest('figure');var c=f&&f.querySelector('figcaption');return c?c.textContent:(x.alt||'');}
    function op(i){gi=i;im.src=imgs[gi].currentSrc||imgs[gi].src;im.alt=imgs[gi].alt||'';cap.textContent=cof(imgs[gi]);cnt.textContent=(gi+1)+' / '+imgs.length;lb.classList.add('open');lb.querySelector('.lb-close').focus();}
    function mv(d){op((gi+d+imgs.length)%imgs.length);}
    function cl(){lb.classList.remove('open');im.removeAttribute('src');if(lf&&lf.focus)lf.focus();}
    imgs.forEach(function(x,i){x.addEventListener('click',function(){lf=document.activeElement;op(i);});});
    lb.querySelector('.lb-prev').addEventListener('click',function(e){e.stopPropagation();mv(-1);});
    lb.querySelector('.lb-next').addEventListener('click',function(e){e.stopPropagation();mv(1);});
    lb.querySelector('.lb-close').addEventListener('click',function(e){e.stopPropagation();cl();});
    im.addEventListener('click',cl);
    lb.addEventListener('click',function(e){if(e.target===lb)cl();});
    document.addEventListener('keydown',function(e){if(!lb.classList.contains('open'))return;if(e.key==='Escape')cl();if(e.key==='ArrowRight')mv(1);if(e.key==='ArrowLeft')mv(-1);});
  }
  document.querySelectorAll('.plates-grid').forEach(function(g){
    if(g.querySelectorAll('.plate').length>1){
      var hint=document.createElement('p');hint.className='scroll-hint container';hint.textContent='Scroll / swipe →';
      g.parentNode.insertBefore(hint,g);
    }
    var down=false,sx=0,sl=0,moved=false;
    g.addEventListener('pointerdown',function(e){if(e.pointerType==='touch')return;down=true;moved=false;sx=e.clientX;sl=g.scrollLeft;g.classList.add('dragging');});
    window.addEventListener('pointerup',function(){if(down){down=false;g.classList.remove('dragging');}});
    g.addEventListener('pointermove',function(e){if(!down)return;var dx=e.clientX-sx;if(Math.abs(dx)>4)moved=true;g.scrollTo({left:sl-dx,behavior:'auto'});});
    g.addEventListener('click',function(e){if(moved){e.stopPropagation();e.preventDefault();moved=false;}},true);
  });
})();