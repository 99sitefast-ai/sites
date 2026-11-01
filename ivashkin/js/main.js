(function () {
  'use strict';
  var PARAMS = new URLSearchParams(location.search);
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  document.body.classList.add('is-locked');
  
  var loader = $('#loader'), loaderBar = $('#loaderBar'), loaderNum = $('#loaderNum');
  var loaderStage = $('#loaderStage'), loaderWord = $('#loaderWord');
  var stages = ['маршрут', 'расчёт', 'погрузка', 'доставка'];
  var assetsReady = false;
  var pct = 0;
  window.addEventListener('load', function () { assetsReady = true; });
  setTimeout(function () { assetsReady = true; }, 6000);
  if (hasGSAP && !REDUCED && loaderWord) {
    gsap.to($$('span', loaderWord), { y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.05, delay: 0.15 });
  }
  var tick = setInterval(function () {
    var ceiling = assetsReady ? 100 : 90;
    pct = clamp(pct + (ceiling - pct) * 0.1 + 0.5, 0, ceiling);
    if (loaderBar) loaderBar.style.width = pct + '%';
    if (loaderNum) loaderNum.textContent = Math.round(pct);
    if (loaderStage) loaderStage.textContent = stages[Math.min(3, Math.floor(pct / 26))];
    if (pct >= 99.4) {
      clearInterval(tick);
      if (loaderBar) loaderBar.style.width = '100%';
      if (loaderNum) loaderNum.textContent = '100';
      setTimeout(finish, 260);
    }
  }, 55);
  function finish() {
    document.body.classList.remove('is-locked');
    document.body.classList.add('is-ready');
    if (loader) loader.classList.add('is-done');
    intro();
  }
  
  var lenis = null;
  var velocity = 0;
  if (typeof window.Lenis !== 'undefined' && !REDUCED) {
    lenis = new Lenis({ duration: 1.2, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    lenis.on('scroll', function (e) { velocity = e.velocity || 0; });
    var raf = function (time) { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  var navProgress = $('#navProgress');
  function progress() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (navProgress) navProgress.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';
  }
  window.addEventListener('scroll', progress, { passive: true });
  progress();
  
  var wipe = $('#wipe'), wipeLabel = $('#wipeLabel');
  $$('[data-goto]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var id = link.getAttribute('data-goto');
      var target = id === 'top' ? document.body : document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      if (wipe && wipeLabel && !REDUCED) {
        wipeLabel.textContent = (link.textContent || '').trim().slice(0, 22).toUpperCase();
        wipe.classList.add('is-in');
        setTimeout(function () {
          var top = id === 'top' ? 0 : target.getBoundingClientRect().top + window.scrollY - 10;
          if (lenis) lenis.scrollTo(top, { immediate: true }); else window.scrollTo(0, top);
          if (hasGSAP) ScrollTrigger.refresh();
          wipe.classList.remove('is-in');
          wipe.classList.add('is-out');
          setTimeout(function () { wipe.classList.remove('is-out'); }, 700);
        }, 620);
      } else {
        if (lenis) lenis.scrollTo(target, { offset: -10 }); else target.scrollIntoView();
      }
    });
  });
  
  function splitChars(el) {
    var text = el.textContent;
    el.textContent = '';
    var frag = document.createDocumentFragment();
    text.split('').forEach(function (ch) {
      var s = document.createElement('span');
      s.className = 'ch';
      s.textContent = ch === ' ' ? '\u00A0' : ch;
      frag.appendChild(s);
    });
    el.appendChild(frag);
    return $$('.ch', el);
  }
  var titleChars = [];
  $$('.hero__title [data-split]').forEach(function (row) {
    titleChars = titleChars.concat(splitChars(row));
  });
  
  var canvas = $('#heroCanvas');
  var fallbackImg = $('#heroFallback');
  var VERT = 'attribute vec2 p;varying vec2 vUv;void main(){vUv=p*0.5+0.5;gl_Position=vec4(p,0.0,1.0);}';
  var FRAG = [
    'precision highp float;',
    'varying vec2 vUv;',
    'uniform sampler2D uTex;',
    'uniform vec2 uRes;',
    'uniform vec2 uImg;',
    'uniform float uTime;',
    'uniform vec2 uMouse;',
    'uniform float uVel;',
    'uniform float uReveal;',
    'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float noise(vec2 p){',
    '  vec2 i=floor(p);vec2 f=fract(p);vec2 u=f*f*(3.0-2.0*f);',
    '  return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),u.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),u.x),u.y);',
    '}',
    'float fbm(vec2 p){float v=0.0;float a=0.5;for(int i=0;i<4;i++){v+=a*noise(p);p*=2.03;a*=0.5;}return v;}',
    'vec2 cover(vec2 uv){',
    '  float rs=uRes.x/uRes.y; float ri=uImg.x/uImg.y;',
    '  vec2 s=vec2(1.0); if(rs>ri){s.y=ri/rs;} else {s.x=rs/ri;}',
    '  return (uv-0.5)/s+0.5;',
    '}',
    'void main(){',
    '  vec2 uv=cover(vUv);',
    '  float t=uTime*0.06;',
    '  float n=fbm(uv*3.2+vec2(t,t*0.7));',
    '  vec2 mouse=uMouse;',
    '  float d=length((vUv-mouse)*vec2(uRes.x/uRes.y,1.0));',
    '  float ripple=smoothstep(0.55,0.0,d)*0.055;',
    '  vec2 warp=vec2(fbm(uv*2.4+vec2(t*1.6,-t)),fbm(uv*2.4+vec2(-t,t*1.3)))-0.5;',
    '  uv+=warp*(0.022+n*0.02)+normalize(vUv-mouse+0.0001)*ripple;',
    '  float split=(0.0016+abs(uVel)*0.00022+n*0.0009);',
    '  vec3 col;',
    '  col.r=texture2D(uTex,uv+vec2(split,0.0)).r;',
    '  col.g=texture2D(uTex,uv).g;',
    '  col.b=texture2D(uTex,uv-vec2(split,0.0)).b;',
    '  float lum=dot(col,vec3(0.299,0.587,0.114));',
    '  col=mix(vec3(lum)*vec3(0.86,0.84,0.8),col,0.92);',
    '  float scan=sin((vUv.y+uTime*0.02)*uRes.y*0.6)*0.006;',
    '  col+=scan;',
    '  float vig=smoothstep(1.25,0.25,length((vUv-0.5)*vec2(1.25,1.0)));',
    '  col*=mix(vig*0.95,1.0,0.35);',
    '  col=mix(texture2D(uTex,uv).rgb*0.15,col,uReveal);',
    '  gl_FragColor=vec4(col,1.0);',
    '}'
  ].join('\n');
  function initWebGL() {
    if (!canvas || REDUCED) return false;
    var gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
    if (!gl) return false;
    function shader(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
      return s;
    }
    var vs = shader(gl.VERTEX_SHADER, VERT);
    var fs = shader(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return false;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    var U = {
      tex: gl.getUniformLocation(prog, 'uTex'),
      res: gl.getUniformLocation(prog, 'uRes'),
      img: gl.getUniformLocation(prog, 'uImg'),
      time: gl.getUniformLocation(prog, 'uTime'),
      mouse: gl.getUniformLocation(prog, 'uMouse'),
      vel: gl.getUniformLocation(prog, 'uVel'),
      reveal: gl.getUniformLocation(prog, 'uReveal')
    };
    var imgW = 1, imgH = 1, texReady = false, reveal = 0;
    var image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = function () {
      imgW = image.width; imgH = image.height;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
      texReady = true;
    };
    image.onerror = function () { if (fallbackImg) { fallbackImg.hidden = false; canvas.style.display = 'none'; } };
    image.src = 'https://media.base44.com/images/public/6ad37d78090d82fb591123ec/e596da4d8_generated_image.png';
    var resize = function () {
      var dpr = Math.min(window.devicePixelRatio || 1, 1.8);
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
        if (U.res) gl.uniform2f(U.res, canvas.width, canvas.height);
    };
    window.addEventListener('resize', resize);
    resize();
    var mx = 0.5, my = 0.5, tmx = 0.5, tmy = 0.5;
    window.addEventListener('mousemove', function (e) {
      tmx = e.clientX / window.innerWidth;
      tmy = 1 - e.clientY / window.innerHeight;
    });
    var t0 = performance.now();
    function frame(now) {
      var t = (now - t0) / 1000;
      mx += (tmx - mx) * 0.05;
      my += (tmy - my) * 0.05;
      reveal += (1 - reveal) * 0.02;
      gl.uniform1i(U.tex, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      if (U.img) gl.uniform2f(U.img, imgW, imgH);
      if (U.time) gl.uniform1f(U.time, t);
      if (U.mouse) gl.uniform2f(U.mouse, mx, my);
      if (U.vel) gl.uniform1f(U.vel, velocity);
      if (U.reveal) gl.uniform1f(U.reveal, reveal);
      if (texReady) gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return true;
  }
  var webglOK = initWebGL();
  if (!webglOK && fallbackImg) fallbackImg.hidden = false;
  
  function intro() {
    if (!hasGSAP || REDUCED) {
      $$('[data-fade]').forEach(function (el) { el.style.opacity = 1; el.style.transform = 'none'; });
      $$('.ch').forEach(function (c) { c.style.transform = 'none'; });
      return;
    }
    gsap.to(titleChars, { y: 0, duration: 1.3, ease: 'expo.out', stagger: 0.016, delay: 0.1 });
    gsap.to('[data-fade]', { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.08, delay: 0.5 });
    initScroll();
  }
  
  function splitWords(el) {
    var nodes = Array.prototype.slice.call(el.childNodes);
    el.innerHTML = '';
    var words = [];
    nodes.forEach(function (node) {
      if (node.nodeType === 3) {
        node.textContent.split(/(\s+)/).forEach(function (chunk) {
          if (!chunk.trim()) { el.appendChild(document.createTextNode(' ')); return; }
          var s = document.createElement('span');
          s.className = 'w';
          s.textContent = chunk;
          el.appendChild(s);
          words.push(s);
          el.appendChild(document.createTextNode(' '));
        });
      } else if (node.nodeType === 1) {
        var accent = node.classList.contains('accent');
        node.textContent.split(/\s+/).filter(Boolean).forEach(function (word) {
          var s = document.createElement('span');
          s.className = 'w' + (accent ? ' accent' : '');
          s.textContent = word;
          el.appendChild(s);
          words.push(s);
          el.appendChild(document.createTextNode(' '));
        });
      }
    });
    return words;
  }
  var manifesto = $('#manifestoText');
  var manifestoWords = manifesto ? splitWords(manifesto) : [];
  
  var srvPreview = $('#srvPreview'), srvPreviewImg = $('#srvPreviewImg');
  if (srvPreview && window.matchMedia('(hover:hover)').matches) {
    $$('.srv').forEach(function (row) {
      row.addEventListener('mouseenter', function () {
        var src = row.getAttribute('data-img');
        if (src && srvPreviewImg) srvPreviewImg.src = src;
        srvPreview.classList.add('is-on');
        setCursor('view', 'смотреть');
      });
      row.addEventListener('mouseleave', function () {
        srvPreview.classList.remove('is-on');
        setCursor('', '');
      });
    });
    window.addEventListener('mousemove', function (e) {
      srvPreview.style.left = e.clientX + 'px';
      srvPreview.style.top = e.clientY + 'px';
    });
  }
  
  var cursor = $('#cursor'), cursorLabel = $('#cursorLabel');
  var cmx = -100, cmy = -100, ccx = -100, ccy = -100;
  function setCursor(state, label) {
    if (!cursor) return;
    cursor.className = 'cursor' + (state ? ' is-' + state : '');
    if (cursorLabel) cursorLabel.textContent = label || '';
  }
  if (cursor && window.matchMedia('(hover:hover)').matches) {
    window.addEventListener('mousemove', function (e) { cmx = e.clientX; cmy = e.clientY; });
    (function loop() {
      ccx += (cmx - ccx) * 0.2;
      ccy += (cmy - ccy) * 0.2;
      cursor.style.transform = 'translate(' + ccx + 'px,' + ccy + 'px) translate(-50%,-50%)';
      requestAnimationFrame(loop);
    })();
    $$('a, button, .work, .srv').forEach(function (el) {
      el.addEventListener('mouseenter', function () {
        var kind = el.getAttribute('data-cursor') || 'link';
        setCursor(kind === 'view' ? 'view' : 'link', el.getAttribute('data-cursor-label') || '');
      });
      el.addEventListener('mouseleave', function () { setCursor('', ''); });
    });
  }
  
  if (hasGSAP && window.matchMedia('(hover:hover)').matches && !REDUCED) {
    $$('.btn').forEach(function (btn) {
      var xTo = gsap.quickTo(btn, 'x', { duration: 0.5, ease: 'power3.out' });
      var yTo = gsap.quickTo(btn, 'y', { duration: 0.5, ease: 'power3.out' });
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        xTo(((e.clientX - r.left) / r.width - 0.5) * 16);
        yTo(((e.clientY - r.top) / r.height - 0.5) * 12);
      });
      btn.addEventListener('mouseleave', function () { xTo(0); yTo(0); });
    });
  }
  
  var navPreview = $('#navPreview'), navPreviewImg = $('#navPreviewImg');
  if (navPreview && window.matchMedia('(hover:hover)').matches) {
    $$('.nav__links a').forEach(function (link) {
      link.addEventListener('mouseenter', function () {
        var src = link.getAttribute('data-preview');
        if (src && navPreviewImg) navPreviewImg.src = src;
        navPreview.classList.add('is-on');
      });
      link.addEventListener('mouseleave', function () { navPreview.classList.remove('is-on'); });
    });
    window.addEventListener('mousemove', function (e) {
      navPreview.style.left = e.clientX + 'px';
      navPreview.style.top = (e.clientY + 90) + 'px';
    });
  }
  var clock = $('#clock');
  function tickClock() {
    if (!clock) return;
    var d = new Date();
    var fmt = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Minsk', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    clock.textContent = fmt.format(d) + ' MSK';
  }
  tickClock(); setInterval(tickClock, 1000);
  
  function initScroll() {
    if (!hasGSAP) { plainFallbacks(); return; }
    gsap.registerPlugin(ScrollTrigger);
    if (lenis) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    }
    
    $$('[data-fade]').forEach(function (el) {
      gsap.fromTo(el, { opacity: 0, y: 24 }, {
        opacity: 1, y: 0, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true }
      });
    });
    
    if (manifestoWords.length) {
      ScrollTrigger.create({
        trigger: manifesto,
        start: 'top 72%',
        end: 'bottom 52%',
        scrub: true,
        onUpdate: function (self) {
          var n = Math.floor(self.progress * manifestoWords.length);
          manifestoWords.forEach(function (w, i) { w.classList.toggle('is-lit', i <= n); });
        }
      });
    }
    
    var heroInner = $('.hero__inner');
    if (heroInner) {
      gsap.to(heroInner, {
        yPercent: 12, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
      });
    }
    
    var track = $('#worksTrack'), pin = $('#worksPin'), bar = $('#worksBar'), num = $('#workNum');
    if (track && pin && window.innerWidth > 900) {
      var distance = function () { return track.scrollWidth - window.innerWidth + 40; };
      var cards = $$('.work', track);
      gsap.to(track, {
        x: function () { return -distance(); },
        ease: 'none',
        scrollTrigger: {
          trigger: pin, start: 'top top',
          end: function () { return '+=' + Math.round(distance() * 1.25); },
          pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: function (self) {
            if (bar) bar.style.width = (self.progress * 100) + '%';
            if (num) num.textContent = '0' + clamp(Math.floor(self.progress * cards.length) + 1, 1, cards.length);
          }
        }
      });
      cards.forEach(function (card, i) {
        gsap.fromTo(card, { yPercent: i % 2 === 0 ? 3 : -3 }, {
          yPercent: i % 2 === 0 ? -3 : 3, ease: 'none',
          scrollTrigger: { trigger: pin, start: 'top top', end: '+=' + distance(), scrub: true }
        });
        var img = $('img', card);
        if (img) {
          gsap.fromTo(img, { scale: 1.12 }, {
            scale: 1, ease: 'none',
            scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true, containerAnimation: undefined }
          });
        }
      });
    }
    
    $$('.counter').forEach(function (el) {
      var to = parseInt(el.getAttribute('data-to'), 10) || 0;
      ScrollTrigger.create({
        trigger: el, start: 'top 88%', once: true,
        onEnter: function () {
          var obj = { v: 0 };
          gsap.to(obj, {
            v: to, duration: 1.8, ease: 'power2.out',
            onUpdate: function () { el.textContent = Math.round(obj.v).toLocaleString('ru-RU'); }
          });
        }
      });
    });
    
    var process = $('.process');
    var frames = $$('.process__frame');
    var pTitle = $('#processTitle'), pText = $('#processText'), pNum = $('#processNum'),
        pBar = $('#processBar'), rail = $$('#processRail li');
    var DATA = [
      { t: 'Заявка', n: '01', x: 'Звонок или сообщение: откуда, куда, что везём, вес и габариты. Считаем стоимость сразу в разговоре.' },
      { t: 'Подача', n: '02', x: 'Машина выходит по Минску от часа. Согласуем окно, чтобы вам не пришлось ждать на объекте.' },
      { t: 'Погрузка', n: '03', x: 'Гидроборт, рохля, грузчики. Крепление ремнями, тент закрывается, температурный режим проверяем на месте.' },
      { t: 'Доставка', n: '04', x: 'Привозим по согласованному времени, выгружаем, отдаём ТТН и акты. Для юрлиц — ЭСЧФ в тот же день.' }
    ];
    if (process && frames.length) {
      ScrollTrigger.create({
        trigger: process, start: 'top top', end: 'bottom bottom', scrub: true,
        onUpdate: function (self) {
          var p = self.progress;
          if (pBar) pBar.style.width = (p * 100) + '%';
          var idx = clamp(Math.floor(p * frames.length), 0, frames.length - 1);
          frames.forEach(function (f, i) { f.classList.toggle('is-on', i === idx); });
          rail.forEach(function (r, i) { r.classList.toggle('is-on', i === idx); });
          if (pTitle && pTitle.textContent !== DATA[idx].t) {
            pTitle.textContent = DATA[idx].t;
            pText.textContent = DATA[idx].x;
            pNum.textContent = DATA[idx].n;
            if (!REDUCED) {
              gsap.fromTo(pTitle, { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, ease: 'expo.out' });
            }
          }
        }
      });
    }
    
    var quote = $('#quoteBlock');
    if (quote) {
      ScrollTrigger.create({ trigger: quote, start: 'top 80%', once: true, onEnter: function () { quote.classList.add('in'); } });
    }
    
    var contact = $('#contact');
    if (contact) {
      ScrollTrigger.create({ trigger: contact, start: 'top 72%', once: true, onEnter: function () { contact.classList.add('is-in'); } });
    }
    
    var mega = $('#megaText');
    if (mega) {
      gsap.fromTo(mega, { xPercent: 0 }, {
        xPercent: -22, ease: 'none',
        scrollTrigger: { trigger: mega, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    }
    
    var ticker = $('#ticker');
    if (ticker) {
      var base = gsap.to(ticker, { xPercent: -50, duration: 26, ease: 'none', repeat: -1 });
      ScrollTrigger.create({
        onUpdate: function (self) {
          var v = clamp(Math.abs(self.getVelocity()) / 900, 0, 5);
          gsap.to(base, { timeScale: 1 + v, duration: 0.4, overwrite: true });
        }
      });
    }
  }
  
  function plainFallbacks() {
    $$('[data-fade]').forEach(function (el) { el.style.opacity = 1; el.style.transform = 'none'; });
    $$('.ch').forEach(function (c) { c.style.transform = 'none'; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-lit', 'is-on', 'in');
          if (en.target.classList.contains('counter')) {
            var to = parseInt(en.target.getAttribute('data-to'), 10) || 0;
            en.target.textContent = to.toLocaleString('ru-RU');
          }
        }
      });
    }, { threshold: 0.2 });
    $$('.counter, .process__frame, .quote blockquote, #contact, .manifesto__text .w').forEach(function (el) { io.observe(el); });
  }
  
  var form = $('#leadForm'), formDone = $('#formDone');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      $$('input[required]', form).forEach(function (f) {
        if (!f.value.trim()) { f.style.borderColor = '#e07a3e'; ok = false; }
        else { f.style.borderColor = ''; }
      });
      if (!ok) return;
      if (formDone) formDone.hidden = false;
      $$('input', form).forEach(function (i) { i.value = ''; });
    });
  }
})();