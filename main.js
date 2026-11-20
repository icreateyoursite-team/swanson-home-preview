(() => {
  const d = document, root = d.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const desktop = matchMedia('(min-width: 1025px)');
  const hoverable = matchMedia('(hover: hover)');

  requestAnimationFrame(() => root.classList.add('is-loaded'));
  const yr = d.getElementById('yr'); if (yr) yr.textContent = new Date().getFullYear();

  /* Header turns solid on scroll */
  const hdr = d.getElementById('hdr');
  const burger = d.getElementById('burger');
  const nav = d.getElementById('nav');
  const solid = () => hdr.classList.toggle('is-solid', scrollY > 60 || nav.classList.contains('is-open'));
  addEventListener('scroll', solid, { passive: true }); solid();

  /* Mobile drawer */
  const setDrawer = open => {
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    d.body.style.overflow = open ? 'hidden' : '';
    solid();
  };
  burger.addEventListener('click', () => setDrawer(!nav.classList.contains('is-open')));
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setDrawer(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') { setDrawer(false); closeAll(); } });
  desktop.addEventListener('change', () => { setDrawer(false); closeAll(); });

  /* Menus: desktop opens on hover (mouse) or click; mobile only on tap, with its own class */
  const items = [...d.querySelectorAll('.has-mega, .has-drop')];
  const closeAll = except => items.forEach(li => { if (li !== except) { li.classList.remove('is-open', 'is-open-m'); li.querySelector('.nav__toggle').setAttribute('aria-expanded', 'false'); } });
  items.forEach(li => {
    const btn = li.querySelector('.nav__toggle');
    let t;
    li.addEventListener('mouseenter', () => { if (desktop.matches && hoverable.matches) { clearTimeout(t); closeAll(li); li.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); } });
    li.addEventListener('mouseleave', () => { if (desktop.matches && hoverable.matches) { t = setTimeout(() => { li.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); }, 160); } });
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const cls = desktop.matches ? 'is-open' : 'is-open-m';
      const open = !li.classList.contains(cls);
      closeAll(li); li.classList.remove('is-open', 'is-open-m');
      if (open) li.classList.add(cls);
      btn.setAttribute('aria-expanded', open);
    });
  });
  d.addEventListener('click', e => { if (desktop.matches && !e.target.closest('.has-mega, .has-drop')) closeAll(); });

  /* FAQ accordion */
  d.querySelectorAll('.acc__q').forEach(q => q.addEventListener('click', () => {
    const it = q.parentElement, open = !it.classList.contains('is-open');
    it.classList.toggle('is-open', open); q.setAttribute('aria-expanded', open);
  }));

  /* Reveal on scroll + count-up */
  const count = el => {
    const end = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0);
    if (reduce) return;
    const t0 = performance.now(), dur = 1400;
    const step = now => { const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = (end * e).toFixed(dec); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target; el.classList.add('is-in');
      if (el.classList.contains('stagger')) [...el.children].forEach((c, i) => c.style.transitionDelay = (i * 90) + 'ms');
      io.unobserve(el);
    }), { threshold: .14, rootMargin: '0px 0px -40px 0px' });
    d.querySelectorAll('.reveal, .stagger').forEach(el => io.observe(el));
    /* clear stagger delays after entry so hover feels instant */
    d.querySelectorAll('.stagger').forEach(el => el.addEventListener('transitionend', e => { if (e.target.parentElement === el) e.target.style.transitionDelay = ''; }));
    setTimeout(() => d.querySelectorAll('[data-count]').forEach(count), 500);
  } else {
    d.querySelectorAll('.reveal, .stagger').forEach(el => el.classList.add('is-in'));
  }

  /* Gentle parallax, wide screens only */
  const px = [...d.querySelectorAll('[data-parallax]')];
  const wide = matchMedia('(min-width: 1025px)');
  let ticking = false;
  const run = () => {
    ticking = false;
    if (!wide.matches || reduce) { px.forEach(el => el.style.transform = ''); return; }
    px.forEach(el => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
      el.style.transform = `translate3d(0, ${(p * -6).toFixed(2)}%, 0)`;
    });
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(run); } }, { passive: true });
  addEventListener('resize', run); run();

  /* Quote form: time trap + friendly errors, keeps typed values */
  const form = d.getElementById('quote-form');
  if (form) {
    const t0 = performance.now();
    const msg = form.querySelector('.form__msg');
    const btn = form.querySelector('button[type=submit]');
    const label = btn.innerHTML;
    const say = (text, ok) => { msg.textContent = text; msg.className = 'form__msg ' + (ok ? 'is-ok' : 'is-err'); };
    form.addEventListener('submit', async e => {
      e.preventDefault();
      form.elements.ts.value = Math.round(performance.now() - t0);
      let bad = null;
      form.querySelectorAll('[required]').forEach(f => { const w = f.closest('.fld'); const v = !f.value.trim(); w.classList.toggle('is-bad', v); if (v && !bad) bad = f; });
      const em = form.elements.email.value.trim();
      if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { form.elements.email.closest('.fld').classList.add('is-bad'); bad = bad || form.elements.email; }
      if (bad) { say('Please fill in the highlighted fields.'); bad.focus(); return; }
      btn.disabled = true; btn.textContent = 'Sending...';
      try {
        const res = await fetch(form.action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) { form.reset(); say('Thank you! We received your request and will be in touch soon. For anything urgent, call (970) 639-0797.', true); }
        else say(data.error || 'Something went wrong. Please call (970) 639-0797 or email info@swansoncontractors.com.');
      } catch { say('We could not send that just now. Please call (970) 639-0797 or email info@swansoncontractors.com.'); }
      btn.disabled = false; btn.innerHTML = label;
    });
  }
})();
