(function () {
  'use strict';

  const PARAMS = new URLSearchParams(location.search);
  const STATIC_MODE = PARAMS.has('static');
  const prefersReduced = STATIC_MODE || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  const loader = $('#loader');
  const loaderBar = $('#loaderBar');
  const loaderNum = $('#loaderNum');

  let progress = 0;
  let assetsReady = false;

  const setLoader = (p) => {
    progress = p;
    if (loaderBar) loaderBar.style.width = p + '%';
    if (loaderNum) loaderNum.textContent = Math.round(p);
  };

  window.addEventListener('load', () => { assetsReady = true; });

  const loaderTick = setInterval(() => {
    const ceiling = assetsReady ? 100 : 88;
    const step = (ceiling - progress) * 0.12 + 0.4;
    setLoader(clamp(progress + step, 0, ceiling));
    if (progress >= 99.5) {
      clearInterval(loaderTick);
      setLoader(100);
      finishLoading();
    }
  }, 60);

  setTimeout(() => { assetsReady = true; }, 5000);

  function finishLoading() {
    document.body.classList.add('is-ready');
    setTimeout(() => {
      loader && loader.classList.add('is-done');
      document.body.classList.remove('is-locked');
      heroIntro();
      if (STATIC_MODE) { isolateSectionOnly(); fallbackObservers(); revealAll(); }
      else { initScrollAnimations(); }
    }, 320);
  }

  document.body.classList.add('is-locked');

  function heroIntro() {
    const lines = $$('.hero__title .line__inner');
    if (!lines.length) return;

    if (hasGSAP && !prefersReduced) {
      gsap.to(lines, {
        y: 0,
        duration: 1.25,
        ease: 'expo.out',
        stagger: 0.09,
        delay: 0.06
      });
      gsap.to('[data-reveal]', {
        opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.07, delay: 0.35
      });
    } else {
      lines.forEach((l) => { l.style.transform = 'none'; });
      $$('[data-reveal]').forEach((el) => { el.style.opacity = 1; el.style.transform = 'none'; });
    }
  }

  let lenis = null;
  if (typeof window.Lenis !== 'undefined' && !prefersReduced) {
    lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true
    });
    const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  const navProgress = $('#navProgress');
  const onScrollProgress = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const p = max > 0 ? (window.scrollY / max) * 100 : 0;
    if (navProgress) navProgress.style.width = p + '%';
  };
  window.addEventListener('scroll', onScrollProgress, { passive: true });
  onScrollProgress();

  $$('[data-scroll-to]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const key = link.getAttribute('data-scroll-to');
      const target = key === '0' ? document.body : document.getElementById(key);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: -20, duration: 1.4 });
      else window.scrollTo({ top: target.offsetTop - 20, behavior: 'smooth' });
    });
  });
  const cursor = $('#cursor');
  const cursorText = $('#cursorText');
  if (cursor && window.matchMedia('(hover:hover)').matches) {
    let mx = -100, my = -100, cx = -100, cy = -100;
    window.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; });
    (function loop() {
      cx = lerp(cx, mx, 0.18);
      cy = lerp(cy, my, 0.18);
      cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    })();
    $$('a, button, .card').forEach((el) => {
      el.addEventListener('mouseenter', () => {
        const label = el.getAttribute('data-cursor');
        if (label && cursorText) cursorText.textContent = label;
        cursor.classList.add('is-big');
      });
      el.addEventListener('mouseleave', () => cursor.classList.remove('is-big'));
    });
  }

  const canvas = $('#heroCanvas');
  if (canvas && !prefersReduced) {
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dpr = 1;
    let t = 0;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    window.addEventListener('resize', resize);
    resize();

    const nodes = Array.from({ length: 22 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00035,
      vy: (Math.random() - 0.5) * 0.00035
    }));

    const draw = () => {
      t += 0.006;
      ctx.clearRect(0, 0, w, h);

      const step = Math.max(64, w / 14);
      ctx.lineWidth = 1;
      for (let x = -((t * 18) % step); x < w; x += step) {
        ctx.strokeStyle = 'rgba(236,231,222,.055)';
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      const stepY = Math.max(64, h / 9);
      for (let y = 0; y < h; y += stepY) {
        ctx.strokeStyle = 'rgba(236,231,222,.04)';
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > 1) n.vx *= -1;
        if (n.y < 0 || n.y > 1) n.vy *= -1;
      });

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = (a.x - b.x) * w;
          const dy = (a.y - b.y) * h;
          const dist = Math.hypot(dx, dy);
          if (dist < Math.min(w, h) * 0.28) {
            const alpha = (1 - dist / (Math.min(w, h) * 0.28)) * 0.16;
            ctx.strokeStyle = `rgba(216,98,44,${alpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x * w, a.y * h);
            ctx.lineTo(b.x * w, b.y * h);
            ctx.stroke();
          }
        }
      }

      nodes.forEach((n) => {
        ctx.fillStyle = 'rgba(236,231,222,.35)';
        ctx.beginPath();
        ctx.arc(n.x * w, n.y * h, 1.4, 0, Math.PI * 2);
        ctx.fill();
      });

      requestAnimationFrame(draw);
    };
    draw();
  }
  function initScrollAnimations() {
    if (!hasGSAP) {
      fallbackObservers();
      return;
    }
    gsap.registerPlugin(ScrollTrigger);

    if (lenis) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    }

    $$('[data-reveal]').forEach((el) => {
      gsap.fromTo(el,
        { opacity: 0, y: 26 },
        {
          opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true }
        }
      );
    });

    $$('.line__inner').forEach((el) => {
      if (el.closest('.hero__title')) return;
      gsap.fromTo(el, { y: '110%' }, {
        y: '0%', duration: 1.1, ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 92%', once: true }
      });
    });

    const approachNum = $('#approachNum');
    $$('.stmt').forEach((stmt) => {
      ScrollTrigger.create({
        trigger: stmt,
        start: 'top 55%',
        end: 'bottom 45%',
        onEnter: () => setStatement(stmt),
        onEnterBack: () => setStatement(stmt)
      });
    });
    function setStatement(stmt) {
      const n = stmt.getAttribute('data-stmt');
      if (approachNum) approachNum.textContent = '0' + n;
      $$('.stmt').forEach((s) => s.classList.toggle('is-active', s === stmt));
    }

    const track = $('#projectsTrack');
    const pin = $('#projectsPin');
    if (track && pin && window.innerWidth > 900) {
      const getDistance = () => track.scrollWidth - window.innerWidth + 40;
      gsap.to(track, {
        x: () => -getDistance(),
        ease: 'none',
        scrollTrigger: {
          trigger: pin,
          start: 'top top',
          end: () => '+=' + getDistance(),
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          anticipatePin: 1
        }
      });
    }

    const seq = $('.seq');
    const frames = $$('.seq__frame');
    const seqTitle = $('#seqTitle');
    const seqText = $('#seqText');
    const seqBar = $('#seqBar');
    const steps = $$('.seq__steps li');

    const seqData = [
      { title: 'Проект', text: 'До первой лопаты: геология участка, посадка дома, рабочие чертежи и смета на 1 800 позиций. Вы видите финальную сумму до подписания.' },
      { title: 'Фундамент', text: 'Разметка, котлован, армирование и заливка плиты. Бетон принимаем по паспорту завода, армирование проверяет независимый технадзор.' },
      { title: 'Коробка', text: 'Монолит по захваткам, перекрытия, лестница, кровля. Каждую неделю — фотоотчёт и план на следующую.' },
      { title: 'Отделка', text: 'Фасад, окна, инженерия, чистовая отделка. Сдача с паспортом объекта и гарантией 10 лет на конструктив.' }
    ];

    if (seq && frames.length) {
      ScrollTrigger.create({
        trigger: seq,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: (self) => {
          const p = self.progress;
          if (seqBar) seqBar.style.width = (p * 100) + '%';
          const idx = clamp(Math.floor(p * frames.length), 0, frames.length - 1);
          frames.forEach((f, i) => f.classList.toggle('is-on', i === idx));
          steps.forEach((s, i) => s.classList.toggle('is-on', i === idx));
          if (seqTitle && seqTitle.textContent !== seqData[idx].title) {
            seqTitle.textContent = seqData[idx].title;
            seqText.textContent = seqData[idx].text;
          }
        }
      });
    }

    $$('.counter').forEach((el) => {
      const to = parseInt(el.getAttribute('data-to'), 10) || 0;
      const obj = { v: 0 };
      ScrollTrigger.create({
        trigger: el,
        start: 'top 88%',
        once: true,
        onEnter: () => {
          gsap.to(obj, {
            v: to,
            duration: 1.6,
            ease: 'power2.out',
            onUpdate: () => { el.textContent = Math.round(obj.v).toLocaleString('ru-RU'); }
          });
        }
      });
    });

    $$('.card__media img').forEach((img) => {
      gsap.fromTo(img, { yPercent: -4 }, {
        yPercent: 4, ease: 'none',
        scrollTrigger: { trigger: img, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  }
  function isolateSectionOnly() {
    const only = PARAMS.get('only');
    if (!only) return;
    const map = {
      approach: '#approach', projects: '#projects', process: '#process',
      numbers: '.numbers', quote: '.quote', contact: '#contact'
    };
    const keep = document.querySelector(map[only] || ('#' + only));
    if (!keep) return;
    document.querySelectorAll('main > *').forEach((el) => {
      if (el === keep) return;
      if (el.contains(keep)) return;
      el.style.display = 'none';
    });
    const nav = document.querySelector('.nav');
    if (nav) nav.style.display = 'none';
    window.scrollTo(0, 0);
  }

  function revealAll() {
    $$('[data-reveal]').forEach((el) => { el.style.opacity = 1; el.style.transform = 'none'; });
    $$('.line__inner').forEach((el) => { el.style.transform = 'none'; });
  }

  function fallbackObservers() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('is-visible');
          en.target.style.opacity = 1;
          en.target.style.transform = 'none';
        }
      });
    }, { threshold: 0.16 });
    $$('[data-reveal], .stmt, .card, .numbers__item').forEach((el) => io.observe(el));

    $$('.line__inner').forEach((el) => { el.style.transform = 'none'; });

    $$('.counter').forEach((el) => {
      const to = parseInt(el.getAttribute('data-to'), 10) || 0;
      const io2 = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          let v = 0;
          const tick = setInterval(() => {
            v += Math.max(1, to / 40);
            if (v >= to) { v = to; clearInterval(tick); }
            el.textContent = Math.round(v).toLocaleString('ru-RU');
          }, 24);
          io2.disconnect();
        });
      }, { threshold: 0.4 });
      io2.observe(el);
    });

    const seq = $('.seq');
    const frames = $$('.seq__frame');
    const seqBar = $('#seqBar');
    const steps = $$('.seq__steps li');
    const seqTitle = $('#seqTitle');
    const seqText = $('#seqText');
    const data = [
      { title: 'Проект', text: 'Геология, посадка дома, рабочие чертежи и смета на 1 800 позиций.' },
      { title: 'Фундамент', text: 'Разметка, котлован, армирование и заливка плиты.' },
      { title: 'Коробка', text: 'Монолит по захваткам, перекрытия, лестница, кровля.' },
      { title: 'Отделка', text: 'Фасад, окна, инженерия, чистовая отделка и документы.' }
    ];
    if (seq && frames.length) {
      window.addEventListener('scroll', () => {
        const rect = seq.getBoundingClientRect();
        const total = seq.offsetHeight - window.innerHeight;
        const p = clamp(-rect.top / total, 0, 1);
        if (seqBar) seqBar.style.width = (p * 100) + '%';
        const idx = clamp(Math.floor(p * frames.length), 0, frames.length - 1);
        frames.forEach((f, i) => f.classList.toggle('is-on', i === idx));
        steps.forEach((s, i) => s.classList.toggle('is-on', i === idx));
        if (seqTitle) seqTitle.textContent = data[idx].title;
        if (seqText) seqText.textContent = data[idx].text;
      }, { passive: true });
    }
  }

  const form = $('#leadForm');
  const formDone = $('#formDone');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.querySelector('[name="name"]');
      const phone = form.querySelector('[name="phone"]');
      let ok = true;
      [name, phone].forEach((f) => {
        if (!f.value.trim()) { f.style.borderColor = 'var(--accent)'; ok = false; }
        else f.style.borderColor = '';
      });
      if (!ok) return;

      if (formDone) formDone.hidden = false;
      form.querySelectorAll('input').forEach((i) => { i.value = ''; });
    });
  }

})();
