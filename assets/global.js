/* ==========================================================================
   AURORA THEME — global.js  (vanilla ES6, no dependencies)
   Cart AJAX · drawers · predictive search · quantity · sticky ATC · reveal
   Uses Shopify's Section Rendering API to refresh UI without full reloads.
   ========================================================================== */
(function () {
  'use strict';

  /* ----------------------------- Utilities ----------------------------- */
  const routes = window.theme && window.theme.routes ? window.theme.routes : {};
  const strings = (window.theme && window.theme.strings) || {};
  const moneyFormat = (window.theme && window.theme.moneyFormat) || '${{amount}}';

  function on(el, evt, sel, handler) {
    if (typeof sel === 'function') { el.addEventListener(evt, sel); return; }
    el.addEventListener(evt, function (e) {
      const target = e.target.closest(sel);
      if (target && el.contains(target)) handler.call(target, e, target);
    });
  }

  function formatMoney(cents) {
    const value = (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return moneyFormat.replace(/\{\{\s*amount\s*\}\}/, value);
  }

  function fetchJSON(url, options) {
    return fetch(url, Object.assign({ headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' } }, options))
      .then((r) => r.json());
  }

  function debounce(fn, wait) {
    let t;
    return function () { clearTimeout(t); const a = arguments, c = this; t = setTimeout(() => fn.apply(c, a), wait); };
  }

  /* --------------------------- Pub/Sub events --------------------------- */
  const PubSub = (function () {
    const subs = {};
    return {
      on(name, cb) { (subs[name] = subs[name] || []).push(cb); },
      emit(name, data) { (subs[name] || []).forEach((cb) => cb(data)); }
    };
  })();
  window.theme = window.theme || {};
  window.theme.events = PubSub;

  /* ----------------------------- Cart API ------------------------------ */
  const Cart = {
    sectionsToRender: ['cart-drawer', 'cart-icon-bubble'],

    add(items, formEl) {
      const body = { items: Array.isArray(items) ? items : [items], sections: this.sectionsToRender };
      return fetchJSON(routes.cart_add || '/cart/add.js', { method: 'POST', body: JSON.stringify(body) })
        .then((data) => {
          if (data.status) throw data;          // Shopify returns {status, message} on error
          this.renderSections(data.sections);
          PubSub.emit('cart:updated', data);
          openDrawer('cart-drawer');
          return data;
        });
    },

    change(line, quantity) {
      return fetchJSON(routes.cart_change || '/cart/change.js', {
        method: 'POST',
        body: JSON.stringify({ line: line, quantity: quantity, sections: this.sectionsToRender })
      }).then((data) => { this.renderSections(data.sections); PubSub.emit('cart:updated', data); return data; });
    },

    renderSections(sections) {
      if (!sections) return;
      Object.keys(sections).forEach((id) => {
        document.querySelectorAll('[data-cart-section="' + id + '"]').forEach((el) => {
          const html = new DOMParser().parseFromString(sections[id], 'text/html');
          const fresh = html.querySelector('[data-cart-section="' + id + '"]');
          if (fresh) el.innerHTML = fresh.innerHTML;
        });
      });
    }
  };
  window.theme.Cart = Cart;
  window.theme.formatMoney = formatMoney;

  /* ------------------------- Drawer / overlay --------------------------- */
  let overlay = document.querySelector('.overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'overlay';
    document.body.appendChild(overlay);
  }
  let lastFocused = null;

  function openDrawer(id) {
    const drawer = document.getElementById(id);
    if (!drawer) return;
    lastFocused = document.activeElement;
    drawer.classList.add('is-active');
    drawer.setAttribute('aria-hidden', 'false');
    overlay.classList.add('is-active');
    document.body.classList.add('scroll-lock');
    const focusable = drawer.querySelector('button, [href], input, select, textarea');
    if (focusable) focusable.focus();
  }
  function closeDrawers() {
    document.querySelectorAll('.drawer.is-active').forEach((d) => { d.classList.remove('is-active'); d.setAttribute('aria-hidden', 'true'); });
    overlay.classList.remove('is-active');
    document.body.classList.remove('scroll-lock');
    if (lastFocused) lastFocused.focus();
  }
  window.theme.openDrawer = openDrawer;
  window.theme.closeDrawers = closeDrawers;

  overlay.addEventListener('click', closeDrawers);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawers(); });
  on(document, 'click', '[data-drawer-open]', function (e) { e.preventDefault(); openDrawer(this.getAttribute('data-drawer-open')); });
  on(document, 'click', '[data-drawer-close]', function (e) { e.preventDefault(); closeDrawers(); });

  /* --------------------- Product form: AJAX add ------------------------ */
  on(document, 'submit', 'form[data-product-form]', function (e) {
    e.preventDefault();
    const form = this;
    const btn = form.querySelector('[type="submit"]');
    const data = {};
    new FormData(form).forEach((v, k) => { data[k] = v; });
    if (btn) { btn.setAttribute('aria-disabled', 'true'); btn.dataset.label = btn.textContent; btn.textContent = strings.adding || 'Adding…'; }
    Cart.add({ id: data.id, quantity: data.quantity || 1 })
      .then(() => { if (btn) btn.textContent = strings.added || 'Added ✓'; })
      .catch((err) => { if (btn) btn.textContent = (err && err.message) || strings.error || 'Sold out'; })
      .finally(() => {
        setTimeout(() => { if (btn) { btn.removeAttribute('aria-disabled'); btn.textContent = btn.dataset.label; } }, 1400);
      });
  });

  /* --------------------- Cart line item controls ----------------------- */
  on(document, 'click', '[data-cart-remove]', function (e) {
    e.preventDefault(); Cart.change(parseInt(this.getAttribute('data-cart-remove'), 10), 0);
  });
  on(document, 'change', '[data-cart-qty]', function () {
    Cart.change(parseInt(this.getAttribute('data-line'), 10), parseInt(this.value, 10) || 0);
  });

  /* ------------------------------ Wishlist ----------------------------- */
  /* Self-contained: product handles persisted in localStorage. The wishlist
     page (sections/main-wishlist.liquid) renders cards client-side. */
  const Wishlist = {
    KEY: 'aurora:wishlist',
    get() { try { return JSON.parse(localStorage.getItem(this.KEY) || '[]'); } catch (e) { return []; } },
    save(list) { try { localStorage.setItem(this.KEY, JSON.stringify(list)); } catch (e) {} },
    has(handle) { return this.get().indexOf(handle) !== -1; },
    toggle(handle) {
      const list = this.get();
      const i = list.indexOf(handle);
      if (i === -1) list.unshift(handle); else list.splice(i, 1);
      this.save(list);
      this.sync();
      PubSub.emit('wishlist:updated', list);
      return i === -1; // true when added
    },
    remove(handle) {
      this.save(this.get().filter((h) => h !== handle));
      this.sync();
      PubSub.emit('wishlist:updated', this.get());
    },
    sync() {
      const list = this.get();
      document.querySelectorAll('[data-wishlist-add]').forEach((btn) => {
        const on = list.indexOf(btn.getAttribute('data-wishlist-add')) !== -1;
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        btn.classList.toggle('is-active', on);
        const label = btn.querySelector('[data-wishlist-label]');
        if (label) label.textContent = on ? (strings.wishlistSaved || 'Saved') : (strings.wishlistAdd || 'Add to wishlist');
      });
      document.querySelectorAll('[data-wishlist-count]').forEach((el) => {
        el.textContent = list.length;
        el.classList.toggle('is-empty', list.length === 0);
      });
    }
  };
  window.theme.Wishlist = Wishlist;

  on(document, 'click', '[data-wishlist-add]', function (e) {
    e.preventDefault(); Wishlist.toggle(this.getAttribute('data-wishlist-add'));
  });
  on(document, 'click', '[data-wishlist-remove]', function (e) {
    e.preventDefault(); Wishlist.remove(this.getAttribute('data-wishlist-remove'));
  });
  Wishlist.sync();

  /* ---------------------- Quantity steppers ---------------------------- */
  on(document, 'click', '[data-qty-btn]', function () {
    const wrap = this.closest('[data-qty]');
    const input = wrap.querySelector('input');
    const step = this.getAttribute('data-qty-btn') === 'plus' ? 1 : -1;
    const min = parseInt(input.min, 10) || 0;
    input.value = Math.max(min, (parseInt(input.value, 10) || 0) + step);
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  /* ------------------------- Predictive search ------------------------- */
  class PredictiveSearch {
    constructor(root) {
      this.root = root;
      this.input = root.querySelector('input[type="search"]');
      this.results = root.querySelector('[data-search-results]');
      if (!this.input || !this.results) return;
      this.input.addEventListener('input', debounce(this.search.bind(this), 250));
      this.input.addEventListener('focus', () => { if (this.input.value.length > 1) this.search(); });
    }
    search() {
      const q = this.input.value.trim();
      if (q.length < 2) { this.results.innerHTML = ''; this.results.removeAttribute('data-open'); return; }
      const params = new URLSearchParams({
        q: q, 'resources[type]': 'product,collection,page,article',
        'resources[limit]': 6, 'section_id': 'predictive-search'
      });
      fetch((routes.predictive_search || '/search/suggest') + '?' + params)
        .then((r) => r.text())
        .then((html) => {
          const doc = new DOMParser().parseFromString(html, 'text/html');
          const inner = doc.querySelector('[data-predictive-inner]');
          this.results.innerHTML = inner ? inner.innerHTML : '';
          this.results.setAttribute('data-open', '');
        })
        .catch(() => {});
    }
  }
  document.querySelectorAll('[data-predictive-search]').forEach((el) => new PredictiveSearch(el));

  /* ------------------------- Sticky add-to-cart ------------------------ */
  const stickyBar = document.querySelector('[data-sticky-atc]');
  const mainForm = document.querySelector('[data-product-form]');
  if (stickyBar && mainForm && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => stickyBar.classList.toggle('is-visible', !entry.isIntersecting));
    }, { rootMargin: '0px 0px -120px 0px' });
    io.observe(mainForm);
  }

  /* --------------------------- Scroll reveal --------------------------- */
  function initReveal(scope) {
    const els = (scope || document).querySelectorAll('[data-reveal]:not(.is-visible)');
    if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('is-visible')); return; }
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); obs.unobserve(entry.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach((el) => io.observe(el));
  }
  initReveal();

  /* ------------------------ Sticky header state ------------------------ */
  const header = document.querySelector('[data-header]');
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* --------------- Theme editor: re-init on section load --------------- */
  document.addEventListener('shopify:section:load', (e) => {
    initReveal(e.target);
    e.target.querySelectorAll('[data-predictive-search]').forEach((el) => new PredictiveSearch(el));
    Wishlist.sync();
  });
})();
