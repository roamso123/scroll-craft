/* L&T Auto Repair - shared behaviour.
   Small, dependency free, and every effect degrades to a readable page. */

(function () {
  'use strict';

  /* ---- the real opening hours, in one place ----------------------------
     Index is the JS weekday (0 = Sunday). Minutes since midnight, local.
     Source: the shop's listed hours. Change them here and the header pill,
     the hours table highlight and the booking calendar all follow.        */
  var HOURS = {
    0: null,
    1: [480, 1020], 2: [480, 1020], 3: [480, 1020], 4: [480, 1020], 5: [480, 1020],
    6: [480, 720]
  };
  window.LT_HOURS = HOURS;

  var DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function clockLabel(mins) {
    var h = Math.floor(mins / 60), m = mins % 60;
    var suffix = h >= 12 ? 'pm' : 'am';
    var h12 = h % 12 === 0 ? 12 : h % 12;
    if (mins === 720) return 'noon';
    return h12 + (m ? ':' + String(m).padStart(2, '0') : '') + suffix;
  }

  function nextOpening(from) {
    for (var i = 1; i <= 7; i++) {
      var d = (from + i) % 7;
      if (HOURS[d]) return { day: DAY_NAMES[d], opens: HOURS[d][0] };
    }
    return null;
  }

  /* ---- open / closed pill ---- */
  function paintStatus() {
    var pill = document.querySelector('[data-status]');
    if (!pill) return;
    var text = pill.querySelector('[data-status-text]');
    var now = new Date();
    var mins = now.getHours() * 60 + now.getMinutes();
    var today = HOURS[now.getDay()];
    var isOpen = !!today && mins >= today[0] && mins < today[1];

    pill.setAttribute('data-open', isOpen ? 'true' : 'false');
    if (!text) return;

    if (isOpen) {
      text.textContent = 'Open now until ' + clockLabel(today[1]);
    } else if (today && mins < today[0]) {
      text.textContent = 'Opens today at ' + clockLabel(today[0]);
    } else {
      var next = nextOpening(now.getDay());
      text.textContent = next ? 'Opens ' + next.day + ' at ' + clockLabel(next.opens) : 'Closed';
    }
  }

  /* ---- highlight today in the hours table ---- */
  function paintHours() {
    var body = document.querySelector('[data-hours]');
    if (!body) return;
    var today = String(new Date().getDay());
    Array.prototype.forEach.call(body.querySelectorAll('tr'), function (row) {
      if (row.getAttribute('data-day') === today) row.setAttribute('data-today', 'true');
    });
  }

  /* ---- sticky header gets its hairline once you leave the top ---- */
  function wireBar() {
    var bar = document.querySelector('[data-bar]');
    if (!bar) return;
    var tick = function () { bar.setAttribute('data-stuck', window.scrollY > 12 ? 'true' : 'false'); };
    tick();
    window.addEventListener('scroll', tick, { passive: true });
  }

  /* ---- mobile drawer ---- */
  function wireBurger() {
    var burger = document.querySelector('[data-burger]');
    var drawer = document.querySelector('[data-drawer]');
    if (!burger || !drawer) return;

    function setOpen(open) {
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      drawer.setAttribute('data-open', open ? 'true' : 'false');
    }
    burger.addEventListener('click', function () {
      setOpen(burger.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        burger.focus();
      }
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 880) setOpen(false);
    });
  }

  /* ---- mark the current page in the nav ---- */
  function markCurrent() {
    var here = location.pathname.split('/').pop() || 'index.html';
    Array.prototype.forEach.call(document.querySelectorAll('.nav__link, .drawer a'), function (a) {
      var href = a.getAttribute('href');
      if (href === here) a.setAttribute('aria-current', 'page');
    });
  }

  /* ---- entrance, opacity only when motion is reduced ---- */
  function wireReveal() {
    var targets = document.querySelectorAll('[data-in]');
    if (!targets.length) return;
    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(targets, function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, i) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        setTimeout(function () { el.classList.add('is-in'); }, Math.min(i * 60, 240));
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
    Array.prototype.forEach.call(targets, function (el) { io.observe(el); });
  }


  /* ---- the hero disc leans toward the pointer ----
     A few pixels of travel is what makes it read as an object sitting in the
     scene rather than a graphic pasted on the background. Fine pointers only,
     and never when the visitor has asked for less motion. */
  function wireRotor() {
    var rotor = document.querySelector('[data-rotor]');
    var hero = document.querySelector('.hero');
    if (!rotor || !hero) return;
    if (!window.matchMedia) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var frame = null;
    hero.addEventListener('pointermove', function (e) {
      if (frame) return;
      frame = requestAnimationFrame(function () {
        frame = null;
        var x = (e.clientX / window.innerWidth) - 0.5;
        var y = (e.clientY / window.innerHeight) - 0.5;
        rotor.style.setProperty('--rx', (x * -30).toFixed(1) + 'px');
        rotor.style.setProperty('--ry', (y * -22).toFixed(1) + 'px');
      });
    });
    hero.addEventListener('pointerleave', function () {
      rotor.style.setProperty('--rx', '0px');
      rotor.style.setProperty('--ry', '0px');
    });
  }

  function stampYear() {
    var el = document.querySelector('[data-year]');
    if (el) el.textContent = String(new Date().getFullYear());
  }

  paintStatus();
  paintHours();
  wireBar();
  wireBurger();
  markCurrent();
  wireReveal();
  wireRotor();
  stampYear();
})();
