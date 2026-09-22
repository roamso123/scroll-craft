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


  /* ---- the hero disc ----
     One angle drives it. It spins up when the page opens, then keeps turning
     with the scroll, the way a wheel does when the car is moving and stops
     when it is not. The angle is smoothed toward its target so a flicked
     scroll wheel does not make it jump. On a fine pointer the disc also leans
     a few pixels toward the cursor, which is what makes it read as an object
     in the scene rather than a graphic pasted on the background. */
  function wireRotor() {
    var rotor = document.querySelector('[data-rotor]');
    var disc = document.querySelector('.rotor__disc');
    var hero = document.querySelector('.hero');
    if (!rotor || !disc || !hero || !window.matchMedia) return;

    var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still) return;   /* the CSS fade brings it in; nothing should spin */

    /* taking over from the fallback CSS spin */
    rotor.classList.add('rotor--driven');

    var DEG_PER_PX = 0.16;   /* a full turn roughly every two screens of scroll */
    var SPIN_IN = -150;      /* where the disc starts before it settles */
    var SPIN_MS = 1500;
    var began = 0;
    var angle = SPIN_IN;
    var frame = null;
    var visible = true;

    function easeOutQuint(t) { return 1 - Math.pow(1 - t, 5); }

    function target(now) {
      var entrance = SPIN_IN;
      if (began) {
        var t = Math.min((now - began) / SPIN_MS, 1);
        entrance = SPIN_IN * (1 - easeOutQuint(t));
      }
      return entrance + window.scrollY * DEG_PER_PX;
    }

    function tick(now) {
      frame = null;
      var want = target(now);
      angle += (want - angle) * 0.12;
      disc.style.transform = 'rotate(' + angle.toFixed(2) + 'deg)';

      var settling = Math.abs(want - angle) > 0.05;
      var arriving = !began || (now - began) < SPIN_MS;
      if (visible && (settling || arriving)) frame = requestAnimationFrame(tick);
    }

    function kick() {
      if (!frame && visible) frame = requestAnimationFrame(tick);
    }

    /* the loop only runs while something is actually moving, and never while
       the hero is off screen or the tab is in the background */
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) kick();
      }, { threshold: 0 }).observe(hero);
    }
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) kick();
    });
    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', kick);

    began = performance.now();
    kick();

    /* the pointer lean, fine pointers only */
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    var lean = null;
    hero.addEventListener('pointermove', function (e) {
      if (lean) return;
      lean = requestAnimationFrame(function () {
        lean = null;
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
