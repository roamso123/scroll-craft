/* SS Auto Sound — restrained interaction layer. No dependencies. */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* sticky nav shade */
  var nav = document.querySelector('.nav');
  if (nav) {
    var shade = function () { nav.classList.toggle('is-stuck', window.scrollY > 12); };
    shade();
    window.addEventListener('scroll', shade, { passive: true });
  }

  /* mobile menu */
  var toggle = document.querySelector('.nav__toggle');
  var links = document.querySelector('.nav__links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? 'Close' : 'Menu';
    });
    links.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        links.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.textContent = 'Menu';
      }
    });
  }

  /* scroll reveal */
  var targets = document.querySelectorAll('.reveal');
  if (reduced || !('IntersectionObserver' in window)) {
    targets.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var delay = parseFloat(el.getAttribute('data-delay') || '0');
        setTimeout(function () { el.classList.add('is-in'); }, delay * 1000);
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* hero cone: slow drift on scroll, nothing more */
  var cone = document.querySelector('[data-drift]');
  if (cone && !reduced) {
    var ticking = false;
    var drift = function () {
      var y = window.scrollY;
      cone.style.transform = 'translate3d(0,' + (y * 0.06).toFixed(2) + 'px,0) scale(' + (1 + Math.min(y, 600) * 0.00012).toFixed(4) + ')';
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(drift);
    }, { passive: true });
  }

  /* today's hours + open state */
  function hours() {
    var list = document.querySelector('[data-hours]');
    var badge = document.querySelector('[data-openstate]');
    var now = new Date();
    var day = now.getDay(); /* 0 = Sunday */
    var open = day !== 0 && now.getHours() >= 9 && now.getHours() < 19;

    if (list) {
      var row = list.querySelector('[data-day="' + day + '"]');
      if (row) row.classList.add('is-today');
    }
    if (badge) {
      badge.textContent = open ? 'Open now until 7 PM' : 'Closed now — opens 9 AM';
      badge.classList.toggle('accent', open);
    }
  }
  hours();
})();
