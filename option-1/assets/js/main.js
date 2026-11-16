/* Nixz — front-end behaviour. Vanilla JS, no dependencies. */
(() => {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const N = window.NIXZ || { products: [], categories: [], site: {} };
  const SITE = N.site || {};
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const money = (n) => 'R' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const setHash = (hash) => {
    try {
      history.replaceState(null, '', hash || location.pathname + location.search);
    } catch (_) {
      /* file:// and sandboxed previews can refuse history changes */
    }
  };

  /* ------------------------------------------------------------------ Header */
  const header = $('[data-header]');
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ------------------------------------------------------------- Mobile menu */
  const burger = $('[data-burger]');
  const menu = $('[data-menu]');
  if (burger && menu && header) {
    const setMenu = (open) => {
      if (open) menu.style.setProperty('--menu-top', Math.max(0, Math.round(header.getBoundingClientRect().bottom)) + 'px');
      menu.classList.toggle('is-open', open);
      menu.setAttribute('aria-hidden', String(!open));
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.classList.toggle('is-locked', open);
    };
    burger.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
    menu.addEventListener('click', (e) => {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) {
        setMenu(false);
        burger.focus();
      }
    });
    window.matchMedia('(min-width: 901px)').addEventListener('change', (e) => e.matches && setMenu(false));
  }

  /* -------------------------------------------------------- Announcement bar */
  const announce = $('[data-announce]');
  if (announce && !reduceMotion) {
    const msgs = $$('.announce__msg', announce);
    if (msgs.length > 1) {
      let i = 0;
      let hovering = false;
      announce.addEventListener('mouseenter', () => (hovering = true));
      announce.addEventListener('mouseleave', () => (hovering = false));
      setInterval(() => {
        if (hovering || document.hidden) return;
        msgs[i].classList.remove('is-active');
        i = (i + 1) % msgs.length;
        msgs[i].classList.add('is-active');
      }, 5200);
    }
  }

  /* -------------------------------------------------------------------- Hero */
  const hero = $('[data-hero]');
  if (hero) {
    const slides = $$('.hero__slide', hero);
    const dots = $$('.hero__dot', hero);
    let index = 0;
    let timer = null;
    const show = (n) => {
      index = (n + slides.length) % slides.length;
      slides.forEach((s, i) => s.classList.toggle('is-active', i === index));
      dots.forEach((d, i) => {
        d.classList.toggle('is-active', i === index);
        if (i === index) d.setAttribute('aria-current', 'true');
        else d.removeAttribute('aria-current');
      });
    };
    const pauseBtn = $('[data-pause]', hero);
    let paused = false;
    const stop = () => {
      clearInterval(timer);
      timer = null;
    };
    const play = () => {
      if (reduceMotion || paused || slides.length < 2) return;
      stop();
      timer = setInterval(() => show(index + 1), 7000);
    };
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        paused = !paused;
        pauseBtn.setAttribute('aria-pressed', String(paused));
        pauseBtn.setAttribute('aria-label', paused ? 'Play slideshow' : 'Pause slideshow');
        if (paused) stop();
        else play();
      });
    }
    dots.forEach((d) =>
      d.addEventListener('click', () => {
        show(Number(d.dataset.dot));
        play();
      })
    );
    hero.addEventListener('mouseenter', stop);
    hero.addEventListener('mouseleave', play);
    hero.addEventListener('focusin', stop);
    hero.addEventListener('focusout', play);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : play()));
    play();
  }

  /* --------------------------------------------- Category index hover preview */
  const indexList = $('[data-index]');
  if (indexList) {
    const previews = $$('.index__preview img');
    const set = (n) => previews.forEach((im, i) => im.classList.toggle('is-active', i === n));
    $$('.index__item', indexList).forEach((a) => {
      const n = Number(a.dataset.i);
      a.addEventListener('mouseenter', () => set(n));
      a.addEventListener('focus', () => set(n));
    });
  }

  /* ----------------------------------------------------------- Scroll reveal */
  const revealTargets = $$('.reveal, [data-stagger]');
  $$('[data-stagger]').forEach((group) =>
    Array.from(group.children).forEach((child, i) => child.style.setProperty('--i', Math.min(i, 8)))
  );
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }),
      { rootMargin: '0px 0px -6% 0px', threshold: 0.06 }
    );
    revealTargets.forEach((t) => io.observe(t));
  } else {
    revealTargets.forEach((t) => t.classList.add('is-in'));
  }

  /* ---------------------------------------------------------------- Carousel */
  $$('[data-carousel]').forEach((root) => {
    const track = $('.carousel__track', root);
    const scope = root.closest('section') || document;
    const prev = $('[data-prev]', scope);
    const next = $('[data-next]', scope);
    if (!track || !prev || !next) return;
    const step = () => {
      const card = track.firstElementChild;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return card ? card.getBoundingClientRect().width + gap : track.clientWidth;
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

  /* ---------------------------------------------------------- Shop: filter/sort */
  const shop = $('[data-shop]');
  if (shop) {
    const grid = $('[data-grid]', shop);
    const tabs = $$('[data-filter]', shop);
    const sort = $('[data-sort]', shop);
    const title = $('[data-shop-title]');
    const count = $('[data-shop-count]');
    const empty = $('[data-empty]', shop);
    const items = $$('.card', grid).map((el) => ({
      el,
      cat: el.dataset.cat,
      price: Number(el.dataset.price),
      name: el.dataset.name,
      order: Number(el.dataset.order)
    }));
    const sorters = {
      featured: (a, b) => a.order - b.order,
      'price-asc': (a, b) => a.price - b.price || a.order - b.order,
      'price-desc': (a, b) => b.price - a.price || a.order - b.order,
      name: (a, b) => a.name.localeCompare(b.name)
    };
    let filter = 'all';

    const render = () => {
      const match = (i) => filter === 'all' || i.cat === filter;
      const list = items.filter(match).sort(sorters[sort.value]);
      items.forEach((i) => (i.el.hidden = !match(i)));
      list.forEach((i) => grid.appendChild(i.el));
      count.textContent = list.length;
      empty.hidden = list.length > 0;
      tabs.forEach((t) => {
        const on = t.dataset.filter === filter;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-pressed', String(on));
        if (on && title) title.textContent = t.dataset.label || 'Shop All';
      });
    };

    const fromUrl = new URLSearchParams(location.search).get('cat');
    if (fromUrl && tabs.some((t) => t.dataset.filter === fromUrl)) filter = fromUrl;

    tabs.forEach((t) =>
      t.addEventListener('click', () => {
        filter = t.dataset.filter;
        const params = new URLSearchParams(location.search);
        if (filter === 'all') params.delete('cat');
        else params.set('cat', filter);
        const qs = params.toString();
        setHash(location.pathname + (qs ? '?' + qs : ''));
        render();
      })
    );
    sort.addEventListener('change', render);
    render();
  }

  /* -------------------------------------------------------------- Quick view */
  const qv = $('#qv');
  if (qv && N.products.length) {
    const body = $('[data-qv-body]', qv);
    const catalogue = new Map(N.products.map((p) => [p.slug, p]));
    let current = null;
    let lastFocus = null;

    const render = (p) => {
      const thumbs =
        p.images.length > 1
          ? `<div class="qv__thumbs">${p.images
              .map(
                (src, i) =>
                  `<button class="qv__thumb${i === 0 ? ' is-active' : ''}" type="button" data-qv-thumb="${esc(src)}" aria-label="Show photo ${i + 1} of ${p.images.length}"><img src="${esc(src)}" alt=""></button>`
              )
              .join('')}</div>`
          : '';
      const whatsapp = SITE.whatsapp
        ? `<a class="btn btn--ghost" href="https://wa.me/${esc(SITE.whatsapp)}?text=${encodeURIComponent(`Hi Nixz, I'd like to order the ${p.name} (${money(p.price)}).`)}" rel="noopener">WhatsApp us</a>`
        : '';
      const sizeRows = (SITE.sizeGuide || [])
        .map((r) => `<tr><th scope="row">${r.size}</th><td>${r.bust}</td><td>${r.hip}</td></tr>`)
        .join('');
      const mail = `mailto:${esc(SITE.email)}?subject=${encodeURIComponent('Order: ' + p.name)}&body=${encodeURIComponent(`Hi Nixz,\n\nI'd like to order the ${p.name} (${money(p.price)}).\nSize: \n\nThank you!`)}`;

      return `<div class="qv__grid">
  <div class="qv__media">
    <div class="qv__main"><img src="${esc(p.images[0])}" alt="${esc(p.name)}" data-qv-main></div>
    ${thumbs}
  </div>
  <div class="qv__info">
    <p class="qv__cat">${esc(p.catLabel)}${p.therapist ? ' · Therapist Range' : ''}</p>
    <h2 class="qv__title" id="qv-title">${esc(p.name)}</h2>
    <p class="qv__price">${money(p.price)}</p>
    <ol class="qv__steps">
      <li>Tap <strong>Order via chat</strong>, or call us on ${esc(SITE.phone)}.</li>
      <li>Tell us the piece and your size — we’ll help with fit.</li>
      <li>Collect in store at La Lucia Mall. Items put on hold must be collected within 3–4 working days.</li>
    </ol>
    <div class="qv__actions">
      <a class="btn" href="contact.html#get-in-touch" data-chat>Order via chat</a>
      <a class="btn btn--ghost" href="tel:${esc(SITE.tel)}">Call ${esc(SITE.phone)}</a>
      ${whatsapp}
      <a class="link" href="${mail}" style="align-self:center">Or email your order</a>
    </div>
    <div class="qv__more">
      <details><summary>Size guide</summary><div>
        <table class="table"><thead><tr><th scope="col">Size</th><th scope="col">Bust cm</th><th scope="col">Hip cm</th></tr></thead><tbody>${sizeRows}</tbody></table>
        <p style="margin:1em 0 0">Size 44 is available on request. Hems are adjusted at no charge.</p>
      </div></details>
      <details><summary>Returns</summary><div>
        <p style="margin:0">Items can be returned within 14 days of purchase, in their original condition, with your till slip or invoice. <a class="link" href="return-policy.html">Full return policy</a></p>
      </div></details>
    </div>
  </div>
</div>`;
    };

    const open = (slug) => {
      const p = catalogue.get(slug);
      if (!p) return;
      current = slug;
      lastFocus = document.activeElement;
      body.innerHTML = render(p);
      qv.setAttribute('aria-labelledby', 'qv-title');
      if (!qv.open) qv.showModal();
      qv.scrollTop = 0;
      document.body.classList.add('is-locked');
      setHash('#' + slug);
    };

    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-qv]');
      if (!trigger || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      open(trigger.dataset.qv);
    });

    qv.addEventListener('click', (e) => {
      if (e.target === qv || e.target.closest('[data-qv-close]')) return qv.close();
      const thumb = e.target.closest('[data-qv-thumb]');
      if (thumb) {
        $('[data-qv-main]', qv).src = thumb.dataset.qvThumb;
        $$('.qv__thumb', qv).forEach((t) => t.classList.toggle('is-active', t === thumb));
      }
      if (e.target.closest('[data-chat]')) qv.close();
    });

    qv.addEventListener('close', () => {
      document.body.classList.remove('is-locked');
      if (current && location.hash === '#' + current) setHash('');
      current = null;
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    });

    const fromHash = () => {
      const slug = location.hash.slice(1);
      if (catalogue.has(slug)) open(slug);
    };
    window.addEventListener('hashchange', fromHash);
    fromHash();
  }

  /* ------------------------------------------------- Gallery: filter + lightbox */
  const gallery = $('[data-gallery]');
  const lb = $('#lb');
  if (gallery) {
    const shots = $$('.shot', gallery);
    const tabs = $$('[data-filter]', gallery);
    tabs.forEach((tab) =>
      tab.addEventListener('click', () => {
        const f = tab.dataset.filter;
        tabs.forEach((t) => {
          t.classList.toggle('is-active', t === tab);
          t.setAttribute('aria-pressed', String(t === tab));
        });
        shots.forEach((s) => (s.hidden = !(f === 'all' || s.dataset.group === f)));
      })
    );

    if (lb) {
      const img = $('[data-lb-img]', lb);
      const caption = $('[data-lb-cap]', lb);
      let at = 0;
      const visible = () => shots.filter((s) => !s.hidden);
      const show = (i) => {
        const list = visible();
        at = (i + list.length) % list.length;
        const shot = list[at];
        img.src = shot.href;
        img.alt = $('img', shot).alt;
        caption.textContent = shot.dataset.caption || '';
      };
      gallery.addEventListener('click', (e) => {
        const shot = e.target.closest('[data-lb]');
        if (!shot) return;
        e.preventDefault();
        show(visible().indexOf(shot));
        lb.showModal();
        document.body.classList.add('is-locked');
      });
      $('[data-lb-close]', lb).addEventListener('click', () => lb.close());
      $('[data-lb-prev]', lb).addEventListener('click', () => show(at - 1));
      $('[data-lb-next]', lb).addEventListener('click', () => show(at + 1));
      lb.addEventListener('click', (e) => e.target === lb && lb.close());
      lb.addEventListener('close', () => document.body.classList.remove('is-locked'));
      lb.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') show(at - 1);
        if (e.key === 'ArrowRight') show(at + 1);
      });
      let startX = 0;
      lb.addEventListener('touchstart', (e) => (startX = e.changedTouches[0].clientX), { passive: true });
      lb.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 50) show(at + (dx < 0 ? 1 : -1));
      });
    }
  }

  /* ------------------------------------------------------------ Contact form */
  const form = $('[data-contact-form]');
  if (form) {
    const status = $('[data-form-status]', form);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const data = Object.fromEntries(new FormData(form).entries());
      if (data.company) return; // honeypot
      status.classList.remove('is-error');

      if (SITE.formEndpoint) {
        status.textContent = 'Sending…';
        try {
          const res = await fetch(SITE.formEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(data)
          });
          if (!res.ok) throw new Error('Request failed');
          form.reset();
          status.textContent = 'Thank you — your message is on its way. We’ll be in touch soon.';
        } catch (_) {
          status.classList.add('is-error');
          status.textContent = `Sorry, that didn’t send. Please call ${SITE.phone} or email ${SITE.email}.`;
        }
        return;
      }

      // No form service configured: hand the enquiry to the visitor's email app.
      const lines = [`Name: ${data.name}`, `Email: ${data.email}`];
      if (data.phone) lines.push(`Phone: ${data.phone}`);
      lines.push('', data.message);
      window.location.href = `mailto:${SITE.email}?subject=${encodeURIComponent('Website enquiry from ' + data.name)}&body=${encodeURIComponent(lines.join('\n'))}`;
      status.textContent = `Opening your email app… if nothing happens, please email ${SITE.email}.`;
    });
  }

  /* -------------------------------------------------------------- Live chat */
  // Orders are placed through the Tidio chat (the orange bubble). It loads after the
  // page has settled; every [data-chat] link opens it and falls back to its href.
  let chatRequested = false;
  const loadChat = () => {
    if (!SITE.tidio || window.__tidioRequested) return;
    window.__tidioRequested = true;
    document.tidioChatCode = SITE.tidio;
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://code.tidio.co/${SITE.tidio}.js`;
    document.body.appendChild(s);
  };
  const openChat = () => {
    try {
      window.tidioChatApi.show();
      window.tidioChatApi.open();
    } catch (_) {
      /* chat not ready */
    }
  };
  if (SITE.tidio) {
    const idle = () => setTimeout(loadChat, 1200);
    if (document.readyState === 'complete') idle();
    else window.addEventListener('load', idle);
    ['pointerdown', 'keydown', 'scroll'].forEach((ev) => window.addEventListener(ev, loadChat, { once: true, passive: true }));
    document.addEventListener('tidioChat-ready', () => {
      if (chatRequested) openChat();
    });
  }
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-chat]');
    if (!link || !SITE.tidio) return;
    if (window.tidioChatApi) {
      e.preventDefault();
      openChat();
      return;
    }
    // Still loading: wait briefly for it, otherwise follow the link (contact page).
    e.preventDefault();
    chatRequested = true;
    loadChat();
    setTimeout(() => {
      if (!window.tidioChatApi) window.location.href = link.href;
    }, 3500);
  });

  /* ------------------------------------------------------------------- Misc */
  $$('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
})();
