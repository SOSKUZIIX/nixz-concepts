/* Nixz — concept 2 behaviour. Vanilla JS. */
(() => {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const N = window.NIXZ || { products: [], site: {} };
  const SITE = N.site || {};
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const money = (n) => 'R' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  /* ------------------------------------------ Header: clear over the hero, white once scrolled */
  const hdr = $('[data-hdr]');
  const burger = $('[data-burger]');
  const menu = $('[data-menu]');
  const solidNow = () =>
    document.body.classList.contains('page-solid') || window.scrollY > 24 || Boolean(menu && menu.classList.contains('is-open'));
  const paintHeader = () => hdr && hdr.classList.toggle('is-solid', solidNow());
  paintHeader();
  window.addEventListener('scroll', paintHeader, { passive: true });

  const setMenu = (open) => {
    if (!menu || !burger || !hdr) return;
    if (open) menu.style.setProperty('--menu-top', Math.max(0, Math.round(hdr.getBoundingClientRect().bottom)) + 'px');
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('is-locked', open);
    paintHeader();
  };
  if (burger && menu) {
    burger.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
    menu.addEventListener('click', (e) => e.target.closest('a, button') && setMenu(false));
    document.addEventListener('keydown', (e) => e.key === 'Escape' && menu.classList.contains('is-open') && (setMenu(false), burger.focus()));
    window.matchMedia('(min-width: 901px)').addEventListener('change', (e) => e.matches && setMenu(false));
  }

  /* ------------------------------------------------------------------- Hero slideshow */
  const hero = $('[data-hero]');
  if (hero) {
    const slides = $$('.hero__slide', hero);
    const dots = $$('.hero__dot', hero);
    const pauseBtn = $('[data-pause]', hero);
    let index = 0;
    let timer = null;
    let paused = false;
    const show = (n) => {
      index = (n + slides.length) % slides.length;
      slides.forEach((s, i) => s.classList.toggle('is-active', i === index));
      dots.forEach((d, i) => {
        d.classList.toggle('is-active', i === index);
        if (i === index) d.setAttribute('aria-current', 'true');
        else d.removeAttribute('aria-current');
      });
    };
    const stop = () => (clearInterval(timer), (timer = null));
    const play = () => {
      if (reduce || paused || slides.length < 2) return;
      stop();
      timer = setInterval(() => show(index + 1), 6500);
    };
    dots.forEach((d) => d.addEventListener('click', () => (show(Number(d.dataset.dot)), play())));
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        paused = !paused;
        pauseBtn.setAttribute('aria-pressed', String(paused));
        pauseBtn.setAttribute('aria-label', paused ? 'Play slideshow' : 'Pause slideshow');
        paused ? stop() : play();
      });
    }
    hero.addEventListener('mouseenter', stop);
    hero.addEventListener('mouseleave', play);
    hero.addEventListener('focusin', stop);
    hero.addEventListener('focusout', play);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : play()));
    play();
  }

  /* ----------------------------------------------------------------------- Carousels */
  $$('.rail').forEach((root) => {
    const track = $('.rail__track', root);
    const prev = $('[data-prev]', root);
    const next = $('[data-next]', root);
    if (!track || !prev || !next) return;
    const step = () => {
      const first = track.firstElementChild;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return first ? (first.getBoundingClientRect().width + gap) * 2 : track.clientWidth * 0.8;
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

  /* --------------------------------------- Shop all: filter, and jump links from anywhere */
  const grid = $('[data-grid]');
  const tabs = $('[data-tabs]');
  if (grid && tabs) {
    const cards = $$('.pc', grid);
    const buttons = $$('[data-filter]', tabs);
    const apply = (filter) => {
      cards.forEach((c) => (c.hidden = !(filter === 'all' || c.dataset.cat === filter)));
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === filter)));
    };
    buttons.forEach((b) => b.addEventListener('click', () => apply(b.dataset.filter)));
    document.addEventListener('click', (e) => {
      const go = e.target.closest('[data-go]');
      if (go) apply(go.dataset.go);
    });
  }

  /* ------------------------------------------------------------- Dialogs: sheet and sizes */
  let lastFocus = null;
  $$('dialog').forEach((d) => {
    d.addEventListener('click', (e) => (e.target === d || e.target.closest('[data-sheet-close]')) && d.close());
    d.addEventListener('close', () => {
      document.body.classList.remove('is-locked');
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    });
  });

  const sizes = $('#sizes');
  document.addEventListener('click', (e) => {
    if (!sizes || !e.target.closest('[data-size-open]')) return;
    lastFocus = document.activeElement;
    if (menu && menu.classList.contains('is-open')) setMenu(false);
    sizes.showModal();
    document.body.classList.add('is-locked');
  });

  const sheet = $('#sheet');
  if (sheet && N.products.length) {
    const body = $('[data-sheet-body]', sheet);
    const catalogue = new Map(N.products.map((p) => [p.slug, p]));

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
  <p class="sheet__cat">${esc(p.catLabel)}${p.therapist ? ' · Therapist range' : ''}</p>
  <h2 class="sheet__title" id="sheet-title">${esc(p.name)}</h2>
  <p class="sheet__price">${money(p.price)}</p>
  <ol class="sheet__steps">
    <li>Call us on ${esc(SITE.phone)}, or email your order.</li>
    <li>Tell us the piece and your size. We’ll help with fit.</li>
    <li>Collect in store at La Lucia Mall. Items put on hold must be collected within 3–4 working days.</li>
  </ol>
  <div class="sheet__actions">
    <a class="btn" href="tel:${esc(SITE.tel)}">Call ${esc(SITE.phone)}</a>
    <a class="btn btn--ghost" href="${mail}">Email your order</a>
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

    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-open]');
      if (!trigger) return;
      const p = catalogue.get(trigger.dataset.open);
      if (!p) return;
      e.preventDefault();
      lastFocus = document.activeElement;
      body.innerHTML = render(p);
      sheet.setAttribute('aria-labelledby', 'sheet-title');
      if (!sheet.open) sheet.showModal();
      sheet.scrollTop = 0;
      document.body.classList.add('is-locked');
    });
    sheet.addEventListener('click', (e) => {
      const thumb = e.target.closest('[data-thumb]');
      if (!thumb) return;
      $('[data-main]', sheet).src = thumb.dataset.thumb;
      $$('.sheet__thumb', sheet).forEach((t) => t.classList.toggle('is-active', t === thumb));
    });
  }

  /* ------------------------------------------------------------------- Review slider */
  const quotes = $('[data-quotes]');
  if (quotes) {
    const items = $$('.q', quotes);
    let at = 0;
    const show = (n) => {
      at = (n + items.length) % items.length;
      items.forEach((q, i) => {
        q.classList.toggle('is-active', i === at);
        q.setAttribute('aria-hidden', String(i !== at));
      });
    };
    show(0);
    $('[data-qprev]', quotes).addEventListener('click', () => show(at - 1));
    $('[data-qnext]', quotes).addEventListener('click', () => show(at + 1));
  }

  /* ------------------------------------------------------------------ Scroll reveal */
  const targets = $$('.sec__head, .split__img, .split__text, .pc, .tile, .range__img, .range__text, .quotes__img, .quotes__panel, .visit__cols > div, .band__in');
  targets.forEach((el) => el.classList.add('rv'));
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }),
      { rootMargin: '0px 0px -4% 0px', threshold: 0.05 }
    );
    targets.forEach((t) => io.observe(t));
    setTimeout(() => targets.forEach((t) => t.classList.add('in')), 6000);
  } else {
    targets.forEach((t) => t.classList.add('in'));
  }

  $$('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
})();
