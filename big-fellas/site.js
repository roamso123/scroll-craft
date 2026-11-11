/* ==========================================================================
   BIG FELLAS — page script.

   The engine is untouched. Everything here is this page's own.

   The signature move lives in setSize(): the page has a portion size, every
   price and count on it is the real price for that size, and two cuts only
   exist at the big one. The house throws the switch itself at the wing cut.
   ========================================================================== */
(function () {
  'use strict';

  var html   = document.documentElement;
  var mq     = document.getElementById('bf-mq');
  var shout  = document.getElementById('bf-shout');
  var rail   = document.getElementById('bf-rail');
  var wings  = document.getElementById('wings');
  var locked = Array.prototype.slice.call(document.querySelectorAll('.cut--locked'));
  var btns   = Array.prototype.slice.call(document.querySelectorAll('[data-bf-size]'));
  var swaps  = Array.prototype.slice.call(document.querySelectorAll('[data-l][data-b]'));
  var pics   = Array.prototype.slice.call(document.querySelectorAll('[data-l-src][data-b-src]'));

  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var sc = null;                 // the ScrollCraft instance
  var size = 'little';
  var unlocked = false;          // has the house thrown the switch yet
  var autoDone = false;
  var shoutTimer = 0;

  /* ---- the house talking back ------------------------------------------ */

  function say(line, ms) {
    if (!mq || !shout) return;
    shout.textContent = line;
    mq.classList.add('is-shout');
    clearTimeout(shoutTimer);
    shoutTimer = setTimeout(function () { mq.classList.remove('is-shout'); }, ms || 2600);
  }

  /* ---- the size ---------------------------------------------------------
     Writes every number on the page, then re-measures the document, because
     two sections come and go with it and the engine's act geometry is read
     from real rects.                                                        */

  function setSize(next, why) {
    if (next === size) return;
    var before = document.documentElement.scrollHeight;
    var y = scrollY;
    var shrinking = (next === 'little');

    // How much document sits above the reader and is about to disappear?
    var liftedAbove = 0;
    if (shrinking) {
      locked.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom + y <= y) liftedAbove += r.height;   // entirely above the fold
      });
    }

    size = next;
    html.dataset.size = size;

    swaps.forEach(function (el) {
      el.innerHTML = el.getAttribute(size === 'big' ? 'data-b' : 'data-l');
    });

    // The plate grows with the page: the wing frame is the small order at
    // little and the loaded table at big.
    pics.forEach(function (el) {
      var next = el.getAttribute(size === 'big' ? 'data-b-src' : 'data-l-src');
      el.src = next;
      // srcset outranks src, so swapping src alone changes nothing on any
      // screen that picked a candidate. Rewrite the set to match.
      if (el.srcset) {
        var stem = next.replace(/\.jpg$/, '');
        el.srcset = stem + '-m.jpg 1040w, ' + next + ' 1920w';
      }
    });

    btns.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.bfSize === size));
    });

    locked.forEach(function (el) {
      if (size === 'big') {
        el.hidden = false;
        el.classList.remove('cut--locked');
      } else {
        el.hidden = true;
        el.classList.add('cut--locked');
      }
    });

    // Keep the reader where they were when the page shortens under them.
    if (shrinking && liftedAbove > 0) scrollTo(0, Math.max(0, y - liftedAbove));

    if (sc) sc.layout();

    if (why) say(why);
    if (before !== document.documentElement.scrollHeight) { /* length changed, by design */ }
  }

  /* ---- the switch ------------------------------------------------------- */

  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      var want = b.dataset.bfSize;
      if (want === 'big' && !unlocked) { say('Da house decides.'); return; }
      if (want === size) return;
      setSize(want, want === 'little' ? 'You sure?' : 'Now we talking.');
    });
  });

  /* ---- the house throws it itself ---------------------------------------
     Fired from the wing cut's own position rather than from an act's
     progress, because this grammar has no pinned acts to hang it on and the
     choreography has to outlive the cut it starts in.                       */

  function watchFlip() {
    if (autoDone || !wings) return;
    var r = wings.getBoundingClientRect();
    var through = (innerHeight * 0.55 - r.top) / Math.max(1, r.height);
    if (through > 0.42) {
      autoDone = true;
      unlocked = true;
      btns.forEach(function (b) { if (b.dataset.bfSize === 'big') b.removeAttribute('aria-disabled'); });
      setSize('big', 'You get the big one.');
    }
  }

  /* ---- the lateral rail (act 9), unpinned --------------------------------
     A pan without a pinned stage: the strip is offset from its own section's
     progress through the viewport, so the cut still passes at full speed.    */

  function moveRail() {
    if (!rail || reduced) return;
    var sec = rail.closest('section');
    var r = sec.getBoundingClientRect();
    var p = (innerHeight - r.top) / (innerHeight + r.height);     // 0..1 across the pass
    p = Math.max(0, Math.min(1, p));
    var over = Math.max(0, rail.scrollWidth - innerWidth);
    rail.style.transform = 'translate3d(' + (-over * p).toFixed(1) + 'px,0,0)';
  }

  /* ---- the two loops -----------------------------------------------------
     Short autoplay loops rather than scrub acts: nothing on this page is
     held, so there is no pinned stage for a playhead to live on. Loaded on
     approach and paused off screen, which is also what an iPhone needs.      */

  function loop(id, src, srcM) {
    var v = document.getElementById(id);
    if (!v || reduced) return;
    var want = (innerWidth < 760 && srcM) ? srcM : src;
    var armed = false;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) {
          if (!armed) { armed = true; v.src = want; v.load(); }
          var p = v.play();
          if (p && p.catch) p.catch(function () {});
        } else if (armed) { v.pause(); }
      });
    }, { rootMargin: '25% 0px' });
    io.observe(v);
  }

  /* ---- go ---------------------------------------------------------------- */

  function frame() { watchFlip(); moveRail(); }

  addEventListener('scroll', frame, { passive: true });
  addEventListener('resize', function () { moveRail(); if (sc) sc.layout(); }, { passive: true });

  sc = ScrollCraft.mount(document.body);

  // One clip only. The second one, a lateral track along the mural, came back
  // from kling with three invented people walking through the shot wearing
  // jerseys that are not on that wall, so the wall cut is the photograph.
  loop('bf-door', 'assets/storefront.mp4', 'assets/storefront-m.mp4');

  frame();

  // Exposed for the verification walk in lab/, not for the page.
  window.BF = {
    size: function () { return size; },
    unlocked: function () { return unlocked; },
    set: function (s) { unlocked = true; autoDone = true; setSize(s); }
  };
})();
