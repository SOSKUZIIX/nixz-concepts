/* Nixz — concept 2 behaviour. Vanilla JS. */
(() => {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const N = window.NIXZ || { products: [], site: {} };
  const SITE = N.site || {};
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const money = (n) => 'R' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  /* ------------------------------------------------------------------ Nav */
  const nav = $('[data-nav]');
  const onScroll = () => nav && nav.classList.toggle('is-scrolled', window.scrollY > 4);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const burger = $('[data-burger]');
  const menu = $('[data-menu]');
  if (burger && menu) {
    const set = (open) => {
      menu.classList.toggle('is-open', open);
      menu.setAttribute('aria-hidden', String(!open));
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.classList.toggle('is-locked', open);
    };
    burger.addEventListener('click', () => set(!menu.classList.contains('is-open')));
    menu.addEventListener('click', (e) => e.target.closest('a') && set(false));
    document.addEventListener('keydown', (e) => e.key === 'Escape' && menu.classList.contains('is-open') && (set(false), burger.focus()));
    window.matchMedia('(min-width: 861px)').addEventListener('change', (e) => e.matches && set(false));
  }

  /* ----------------------------------------- Hero image grows as you scroll */
  const media = $('[data-hero-media]');
  if (media && !reduce) {
    let ticking = false;
    const update = () => {
      ticking = false;
      const top = media.getBoundingClientRect().top;
      media.style.setProperty('--p', clamp(1 - top / (window.innerHeight * 0.62), 0, 1).toFixed(3));
    };
    window.addEventListener('scroll', () => !ticking && ((ticking = true), requestAnimationFrame(update)), { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ------------------------------------------- Statement lights up by word */
  const words = $('[data-words]');
  if (words) {
    const parts = words.textContent.trim().split(/\s+/);
    words.innerHTML = parts.map((w) => `<span>${esc(w)}</span>`).join(' ');
    const spans = $$('span', words);
    const light = () => {
      const r = words.getBoundingClientRect();
      const p = reduce ? 1 : clamp((window.innerHeight * 0.82 - r.top) / (r.height + window.innerHeight * 0.3), 0, 1);
      const upto = Math.ceil(p * spans.length * 1.1);
      spans.forEach((s, i) => s.classList.toggle('on', i < upto));
    };
    window.addEventListener('scroll', light, { passive: true });
    window.addEventListener('resize', light);
    light();
  }

  /* ------------------------------------------------------------ Scroll reveal */
  const targets = $$('.sec h2, .sec .sub, .hl, .tile, .pcard, .rev, .vcard, .story__img, .story__text, .range__grid > div, .look, .seg');
  targets.forEach((el, i) => {
    el.classList.add('rv');
    el.style.setProperty('--i', String(i % 4));
  });
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }),
      { rootMargin: '0px 0px -5% 0px', threshold: 0.05 }
    );
    targets.forEach((t) => io.observe(t));
    setTimeout(() => targets.forEach((t) => t.classList.add('in')), 6000);
  } else {
    targets.forEach((t) => t.classList.add('in'));
  }

  /* ------------------------------------------------------------------ Rails */
  $$('[data-rail]').forEach((root) => {
    const track = $('.rail__track', root);
    const prev = $('[data-prev]', root);
    const next = $('[data-next]', root);
    const step = () => {
      const first = track.firstElementChild;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return first ? first.getBoundingClientRect().width + gap : track.clientWidth * 0.8;
    };
    const update = () => {
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
    };
    prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
    next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
    track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') (e.preventDefault(), next.click());
      if (e.key === 'ArrowLeft') (e.preventDefault(), prev.click());
    });
    window.addEventListener('resize', update);
    update();
  });

  /* ------------------------------------------------------------------ Store */
  const grid = $('[data-grid]');
  const seg = $('[data-seg]');
  const label = $('[data-shop-label]');
  if (grid && seg) {
    const cards = $$('.pcard', grid);
    const buttons = $$('[data-filter]', seg);
    const apply = (filter) => {
      cards.forEach((c) => (c.hidden = !(filter === 'all' || c.dataset.cat === filter)));
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === filter)));
      const active = buttons.find((b) => b.dataset.filter === filter);
      if (label && active) label.textContent = filter === 'all' ? 'Shop All' : active.textContent;
    };
    buttons.forEach((b) => b.addEventListener('click', () => apply(b.dataset.filter)));
    // Category tiles and footer links jump to the store with that category selected.
    document.addEventListener('click', (e) => {
      const go = e.target.closest('[data-go]');
      if (!go) return;
      apply(go.dataset.go);
    });
  }

  /* ------------------------------------------------------------ Product sheet */
  const sheet = $('#sheet');
  if (sheet && N.products.length) {
    const body = $('[data-sheet-body]', sheet);
    const catalogue = new Map(N.products.map((p) => [p.slug, p]));
    let lastFocus = null;

    const render = (p) => {
      const thumbs =
        p.images.length > 1
          ? `<div class="sheet__thumbs">${p.images
              .map((src, i) => `<button class="sheet__thumb${i ? '' : ' is-active'}" type="button" data-thumb="${esc(src)}" aria-label="Photo ${i + 1} of ${p.images.length}"><img src="${esc(src)}" alt=""></button>`)
              .join('')}</div>`
          : '';
      const rows = (SITE.sizeGuide || []).map((r) => `<tr><th scope="row">${r.size}</th><td>${r.bust}</td><td>${r.hip}</td></tr>`).join('');
      const mail = `mailto:${esc(SITE.email)}?subject=${encodeURIComponent('Order: ' + p.name)}&body=${encodeURIComponent(`Hi Nixz,\n\nI'd like to order the ${p.name} (${money(p.price)}).\nSize: \n\nThank you!`)}`;
      return `<div class="sheet__media">
  <div class="sheet__main"><img src="${esc(p.images[0])}" alt="${esc(p.name)}" data-main></div>
  ${thumbs}
</div>
<div class="sheet__info">
  <p class="sheet__cat">${esc(p.catLabel)}${p.therapist ? ' · Therapist Range' : ''}</p>
  <h2 class="sheet__title" id="sheet-title">${esc(p.name)}</h2>
  <p class="sheet__price">${money(p.price)}</p>
  <ol class="sheet__steps">
    <li>Call us on ${esc(SITE.phone)}, or email your order.</li>
    <li>Tell us the piece and your size. We’ll help with fit.</li>
    <li>Collect in store at La Lucia Mall. Items put on hold must be collected within 3–4 working days.</li>
  </ol>
  <div class="sheet__actions">
    <a class="pill" href="tel:${esc(SITE.tel)}">Call ${esc(SITE.phone)}</a>
    <a class="pill pill--ghost" href="${mail}">Email your order</a>
  </div>
  <div class="sheet__more">
    <details><summary>Size guide</summary><div>
      <table class="table"><thead><tr><th scope="col">Size</th><th scope="col">Bust cm</th><th scope="col">Hip cm</th></tr></thead><tbody>${rows}</tbody></table>
      <p style="margin:1em 0 0">Size 44 is available on request. Hems are adjusted at no charge.</p>
    </div></details>
    <details><summary>Returns</summary><div><p style="margin:0">Items can be returned within 14 days of purchase, in their original condition, with your till slip or invoice.</p></div></details>
  </div>
</div>`;
    };

    const open = (slug) => {
      const p = catalogue.get(slug);
      if (!p) return;
      lastFocus = document.activeElement;
      body.innerHTML = render(p);
      sheet.setAttribute('aria-labelledby', 'sheet-title');
      if (!sheet.open) sheet.showModal();
      sheet.scrollTop = 0;
      document.body.classList.add('is-locked');
    };
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-open]');
      if (trigger) (e.preventDefault(), open(trigger.dataset.open));
    });
    sheet.addEventListener('click', (e) => {
      if (e.target === sheet || e.target.closest('[data-sheet-close]')) return sheet.close();
      const thumb = e.target.closest('[data-thumb]');
      if (thumb) {
        $('[data-main]', sheet).src = thumb.dataset.thumb;
        $$('.sheet__thumb', sheet).forEach((t) => t.classList.toggle('is-active', t === thumb));
      }
    });
    sheet.addEventListener('close', () => {
      document.body.classList.remove('is-locked');
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    });
  }

  $$('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
})();
