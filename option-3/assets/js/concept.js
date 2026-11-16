/* Nixz — concept 3 behaviour. Vanilla JS. */
(() => {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const N = window.NIXZ || { products: [], categories: [], gallery: {}, site: {} };
  const SITE = N.site || {};
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const money = (n) => 'R' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  let lastFocus = null;

  /* ------------------------------------------------------ Header, menu, progress dot */
  const hdr = $('[data-hdr]');
  const burger = $('[data-burger]');
  const menu = $('[data-menu]');
  const prog = $('.progress');
  const onScroll = () => {
    if (hdr) hdr.classList.toggle('is-solid', window.scrollY > 10);
    if (prog) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      prog.style.setProperty('--y', (max > 0 ? (window.scrollY / max) * 86 : 0).toFixed(1) + 'px');
    }
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  const setMenu = (open) => {
    if (!menu || !burger) return;
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('is-locked', open);
  };
  if (burger && menu) {
    burger.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
    menu.addEventListener('click', (e) => e.target.closest('a') && setMenu(false));
    document.addEventListener('keydown', (e) => e.key === 'Escape' && menu.classList.contains('is-open') && (setMenu(false), burger.focus()));
  }

  /* ------------------------------------------------------------------ Soft cursor */
  const cursor = $('.cursor');
  if (cursor && window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduce) {
    let x = 0;
    let y = 0;
    let tx = 0;
    let ty = 0;
    let raf = 0;
    const loop = () => {
      x += (tx - x) * 0.24;
      y += (ty - y) * 0.24;
      cursor.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.3 ? requestAnimationFrame(loop) : 0;
    };
    window.addEventListener('pointermove', (e) => {
      tx = e.clientX;
      ty = e.clientY;
      cursor.classList.add('is-on');
      if (!raf) raf = requestAnimationFrame(loop);
    });
    document.addEventListener('pointerover', (e) => cursor.classList.toggle('is-big', Boolean(e.target.closest('a, button, summary, [data-open]'))));
    document.documentElement.addEventListener('mouseleave', () => cursor.classList.remove('is-on'));
  }

  /* ----------------------------------------------------- Shop: filter and jump links */
  const grid = $('[data-grid]');
  const pills = $('[data-pills]');
  if (grid && pills) {
    const cards = $$('.pc', grid);
    const buttons = $$('[data-filter]', pills);
    const apply = (filter) => {
      cards.forEach((c) => (c.hidden = !(filter === 'all' || c.dataset.cat === filter)));
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === filter)));
    };
    buttons.forEach((b) => b.addEventListener('click', () => apply(b.dataset.filter)));
    document.addEventListener('click', (e) => {
      const go = e.target.closest('[data-go]');
      if (go && buttons.some((b) => b.dataset.filter === go.dataset.go)) apply(go.dataset.go);
    });
  }

  /* ----------------------------------------------------------- Dialog housekeeping */
  $$('dialog').forEach((d) => {
    d.addEventListener('click', (e) => (e.target === d || e.target.closest('[data-close]')) && d.close());
    d.addEventListener('close', () => {
      document.body.classList.remove('is-locked');
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    });
  });

  /* ----------------------------------------------------------------- Product sheet */
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
    <a class="btn btn--line" href="${mail}">Email your order</a>
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
      lastFocus = trigger;
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

  /* ---------------------------------------------------------------- Find your fit */
  const quiz = $('[data-quiz]');
  if (quiz && N.products.length) {
    const intro = $('[data-quiz-intro]', quiz);
    const card = $('[data-quiz-card]', quiz);
    const result = $('[data-quiz-result]', quiz);
    const title = $('[data-q-title]', quiz);
    const hint = $('[data-q-hint]', quiz);
    const opts = $('[data-q-opts]', quiz);
    const stepEl = $('[data-step]', quiz);
    const back = $('[data-quiz-back]', quiz);
    const next = $('[data-quiz-next]', quiz);
    const state = { step: 1, cat: null, size: null };

    const CATS = [
      ...N.categories.map((c) => ({ id: c.id, label: c.label })),
      { id: 'therapist', label: 'Therapist Range' },
      { id: 'all', label: 'Show me everything' }
    ];
    const SIZES = [32, 34, 36, 38, 40, 42]
      .map((s) => ({ id: String(s), label: String(s) }))
      .concat([{ id: '44', label: '44, on request' }, { id: '?', label: 'Not sure' }]);

    const show = (which) => {
      intro.hidden = which !== 'intro';
      card.hidden = which !== 'card';
      result.hidden = which !== 'result';
    };

    const renderStep = () => {
      const isCat = state.step === 1;
      const current = isCat ? state.cat : state.size;
      stepEl.textContent = state.step;
      title.textContent = isCat ? 'What are you looking for?' : 'What’s your size?';
      hint.textContent = isCat ? 'Choose one.' : 'Sizes run from 32 to 42, and 44 is available on request.';
      opts.className = 'quiz__opts' + (isCat ? '' : ' quiz__opts--sizes');
      opts.innerHTML = (isCat ? CATS : SIZES)
        .map((o) => `<button class="opt" type="button" role="radio" aria-checked="${o.id === current}" data-id="${esc(o.id)}">${esc(o.label)}</button>`)
        .join('');
      back.hidden = isCat;
      next.textContent = isCat ? 'Next' : 'Show my matches';
      next.disabled = !current;
    };

    const matches = () => {
      if (state.cat === 'all') return N.categories.map((c) => N.products.find((p) => p.cat === c.id)).filter(Boolean);
      if (state.cat === 'therapist') return N.products.filter((p) => p.therapist);
      return N.products.filter((p) => p.cat === state.cat);
    };

    const renderResult = () => {
      const row = (SITE.sizeGuide || []).find((r) => String(r.size) === state.size);
      const chip = row
        ? `Size ${row.size}: bust ${row.bust} cm, hip ${row.hip} cm`
        : state.size === '44'
          ? 'Size 44 is available to order on request'
          : 'Not sure? Call us and we’ll help you choose';
      const all = matches();
      const list = all.slice(0, 4);
      const jump = state.cat === 'all' || state.cat === 'therapist' ? (state.cat === 'therapist' ? '#therapist' : '#shop') : '#shop';
      result.innerHTML = `<p class="quiz__step">Your matches</p>
<h3 tabindex="-1" data-result-title>Here’s what we’d show you</h3>
<span class="quiz__chip">${esc(chip)}</span>
<div class="quiz__matches">${list
        .map((p) => `<button class="mini" type="button" data-open="${esc(p.slug)}"><span class="mini__img"><img src="${esc(p.images[0])}" alt="${esc(p.name)}" loading="lazy"></span><b>${esc(p.name)}</b><span>${money(p.price)}</span></button>`)
        .join('')}</div>
<div class="quiz__actions">
  <a class="btn" href="tel:${esc(SITE.tel)}">Call to order</a>
  <a class="btn btn--line" href="${jump}"${state.cat && state.cat !== 'all' && state.cat !== 'therapist' ? ` data-go="${esc(state.cat)}"` : ''}>See all ${all.length} in the shop</a>
  <button class="btn btn--line" type="button" data-quiz-restart>Start again</button>
</div>`;
      show('result');
      $('[data-result-title]', result).focus({ preventScroll: true });
    };

    $('[data-quiz-start]', quiz).addEventListener('click', () => {
      state.step = 1;
      renderStep();
      show('card');
      title.focus({ preventScroll: true });
    });
    opts.addEventListener('click', (e) => {
      const opt = e.target.closest('.opt');
      if (!opt) return;
      if (state.step === 1) state.cat = opt.dataset.id;
      else state.size = opt.dataset.id;
      $$('.opt', opts).forEach((o) => o.setAttribute('aria-checked', String(o === opt)));
      next.disabled = false;
    });
    next.addEventListener('click', () => {
      if (state.step === 1) {
        state.step = 2;
        renderStep();
        title.focus({ preventScroll: true });
      } else {
        renderResult();
      }
    });
    back.addEventListener('click', () => {
      state.step = 1;
      renderStep();
      title.focus({ preventScroll: true });
    });
    result.addEventListener('click', (e) => {
      if (!e.target.closest('[data-quiz-restart]')) return;
      state.step = 1;
      state.cat = null;
      state.size = null;
      renderStep();
      show('card');
      title.focus({ preventScroll: true });
    });
    // The shop filter listens for [data-go] on the document, so category links in results work too.
  }

  /* --------------------------------------------------------------- Reviews switcher */
  const reviews = $('[data-reviews]');
  if (reviews) {
    const tabs = $$('.rtab', reviews);
    const panels = $$('.rq', reviews);
    const select = (i, focus) => {
      tabs.forEach((t, k) => {
        t.setAttribute('aria-selected', String(k === i));
        t.tabIndex = k === i ? 0 : -1;
      });
      panels.forEach((p, k) => p.classList.toggle('is-active', k === i));
      if (focus) tabs[i].focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(i));
      t.addEventListener('keydown', (e) => {
        const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
        if (!step) return;
        e.preventDefault();
        select((i + step + tabs.length) % tabs.length, true);
      });
    });
    select(0);
  }

  /* ----------------------------------------------------------------- Gallery viewer */
  const lb = $('#lb');
  if (lb && N.gallery) {
    const imgEl = $('[data-lb-img]', lb);
    const cap = $('[data-lb-cap]', lb);
    let list = [];
    let label = '';
    let at = 0;
    const showAt = (i) => {
      at = (i + list.length) % list.length;
      imgEl.src = list[at].src;
      imgEl.alt = list[at].alt;
      cap.textContent = `${label}: ${list[at].alt}`;
    };
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-gallery]');
      const g = trigger && N.gallery[trigger.dataset.gallery];
      if (!g) return;
      lastFocus = trigger;
      list = g.images;
      label = g.label;
      showAt(0);
      lb.showModal();
      document.body.classList.add('is-locked');
    });
    $('[data-lb-prev]', lb).addEventListener('click', () => showAt(at - 1));
    $('[data-lb-next]', lb).addEventListener('click', () => showAt(at + 1));
    lb.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') showAt(at - 1);
      if (e.key === 'ArrowRight') showAt(at + 1);
    });
    let startX = 0;
    lb.addEventListener('touchstart', (e) => (startX = e.changedTouches[0].clientX), { passive: true });
    lb.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) showAt(at + (dx < 0 ? 1 : -1));
    });
  }

  /* ------------------------------------------------------------------ Scroll reveal */
  const targets = $$('.hero__sub, .badge, .intro .big, .intro__side, .needs__list li, .block__head > div, .items li, .price, .shop__sub, .pills, .callout, .case, .rtabs, .rquotes, .stat, .faq details, .contact__big, .contact__cols > div');
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
