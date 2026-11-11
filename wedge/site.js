/* ═══════════════════════════════════════════════════════════════════════════
   The Wedge · the signature move: "Tonight"
   ───────────────────────────────────────────────────────────────────────────
   The page resolves itself against the real calendar and the real clock and
   serves the menu that is actually on. The week strip is its control: picking
   a day recomposes act 5 rather than moving the reader.

   The engine is NOT touched. This reads the DOM and writes the DOM.

   HARD RULE (BRIEF.md §1): where the house has not named a thing, this file
   does not name it either. There is no table of "today's cheese" in here and
   there must never be one. The blanks are the brand.

   Clock: the room's clock, not the reader's. A visitor in Denver asking
   whether The Wedge is open means Syracuse time, so every comparison runs in
   America/New_York.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  /* The room's week, exactly as the house publishes it. Hours are load-bearing:
     a typo in here is a customer at a locked door. */
  var WEEK = {
    0: { service: 'brunch', open: 11, close: 16, happy: null },
    1: { service: null },
    2: { service: null },
    3: { service: 'dinner', open: 16, close: 22, happy: [16, 17] },
    4: { service: 'dinner', open: 16, close: 22, happy: [16, 17] },
    5: { service: 'dinner', open: 16, close: 22, happy: null },
    6: { service: 'dinner', open: 16, close: 22, happy: null }
  };

  /* The two real menus. Price `null` means the menu carries no price, and the
     page renders "ask" rather than inventing one. */
  var MENUS = {
    dinner: {
      label: 'Dinner',
      groups: [
        { head: 'Mains', items: [
          ['Truffle Caramelle', 24],
          ['Tagliatelle', null],
          ['Spaghetti', 25],
          ['Mustard Chicken', 28]
        ] }
      ],
      blanks: [
        ['Mac &amp; Cheese Of The Day', 'named at the table'],
        ['Dessert', 'you pick an adjective'],
        ['Surprise, Surprise &middot; 5', "they won't say"]
      ]
    },
    brunch: {
      label: 'Brunch',
      groups: [
        { head: 'Mains', items: [
          ['French Toast Bake', 21],
          ['Frittata', 20],
          ['Breakfast Burger', 25],
          ['Steak Chilaquiles', 30]
        ] },
        { head: 'A la carte', items: [
          ['Build a Grits Bowl', 6],
          ['Two Eggs', 4],
          ['Side of Bacon', 6],
          ['Toast', 2],
          ['Pastries', 5]
        ] }
      ],
      blanks: [
        ['Brunch Mac &middot; 26', "cheesemonger's choice"],
        ['Cheese Flight &middot; 12', 'three, chosen by The Curd Nerd']
      ]
    }
  };

  /* ── the room's clock ──────────────────────────────────────────────────── */

  function syracuseNow() {
    var now = new Date();
    try {
      var parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        weekday: 'short', hour: 'numeric', minute: 'numeric',
        day: 'numeric', month: 'long', hour12: false
      }).formatToParts(now);
      var get = function (t) {
        for (var i = 0; i < parts.length; i++) if (parts[i].type === t) return parts[i].value;
        return '';
      };
      var wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
      var h = parseInt(get('hour'), 10);
      return {
        day: wd < 0 ? now.getDay() : wd,
        hour: (h === 24 ? 0 : h) + parseInt(get('minute'), 10) / 60,
        date: get('day'),
        month: get('month')
      };
    } catch (e) {
      /* No Intl time zones: fall back to the reader's own clock rather than
         showing nothing. The day and the menu stay right; only "open right
         now" can drift for a reader outside Eastern. */
      return {
        day: now.getDay(),
        hour: now.getHours() + now.getMinutes() / 60,
        date: String(now.getDate()),
        month: now.toLocaleString('en-US', { month: 'long' })
      };
    }
  }

  function nextOpen(fromDay) {
    for (var i = 1; i <= 7; i++) {
      var d = (fromDay + i) % 7;
      if (WEEK[d].service) return { day: d, at: WEEK[d].open };
    }
    return null;
  }

  function clockLabel(h) {
    var hr = Math.floor(h);
    var suffix = hr >= 12 ? 'pm' : 'am';
    var display = hr % 12 === 0 ? 12 : hr % 12;
    var mins = Math.round((h - hr) * 60);
    return display + (mins ? ':' + (mins < 10 ? '0' : '') + mins : '') + suffix;
  }

  /* ── rendering ─────────────────────────────────────────────────────────── */

  function priceCell(p) {
    return p === null
      ? '<span class="dishes__p dishes__p--none" title="Ask your server">ask</span>'
      : '<span class="dishes__p">' + p + '</span>';
  }

  /* Each course is wrapped, so a service with two of them (brunch) can sit as
     two columns instead of one tall stack. Stacked, brunch overran the pinned
     stage and the heading was clipped behind the week strip. */
  function renderMenu(menu) {
    var html = '';
    for (var g = 0; g < menu.groups.length; g++) {
      var grp = menu.groups[g];
      html += '<div class="course">';
      if (menu.groups.length > 1) html += '<p class="dishes__head">' + grp.head + '</p>';
      html += '<ul class="dishes" role="list">';
      for (var i = 0; i < grp.items.length; i++) {
        html += '<li><span class="dishes__n">' + grp.items[i][0] + '</span>' + priceCell(grp.items[i][1]) + '</li>';
      }
      html += '</ul></div>';
    }
    return html;
  }

  function renderBlanks(blanks) {
    var html = '';
    for (var i = 0; i < blanks.length; i++) {
      html += '<li><span class="blanks__n">' + blanks[i][0] + '</span>' +
              '<span class="blanks__v">' + blanks[i][1] + '</span></li>';
    }
    return html;
  }

  /* ── compose ───────────────────────────────────────────────────────────── */

  var stage   = document.querySelector('.tonight');
  var elWhen  = document.getElementById('tn-when');
  var elHead  = document.getElementById('tn-head');
  var elStat  = document.getElementById('tn-status');
  var elMenu  = document.getElementById('tn-menu');
  var elBlank = document.getElementById('tn-blanks');
  var dayBtns = Array.prototype.slice.call(document.querySelectorAll('.day'));

  if (!stage || !elHead) return;

  var now = syracuseNow();
  var viewing = now.day;

  function compose(day) {
    var isToday = day === now.day;
    var spec = WEEK[day];
    var shut = !spec.service;

    stage.classList.toggle('is-shut', shut);

    /* eyebrow: the date only when we are actually talking about today */
    elWhen.textContent = isToday
      ? 'Today · ' + DAYS[day] + ' ' + now.date + ' ' + now.month
      : DAYS[day];

    if (shut) {
      var nx = nextOpen(day);
      elHead.textContent = 'Closed.';
      elStat.innerHTML = isToday
        ? 'The room is <span class="shut">shut today</span>. Next service is <b>' +
          DAYS[nx.day] + ', ' + clockLabel(nx.at) + '</b>.'
        : 'Nothing on ' + DAYS[day] + 's. The week starts again <b>' +
          DAYS[nx.day] + ', ' + clockLabel(nx.at) + '</b>.';
      /* The board empties, but the act must not just go blank: an empty half
         screen reads as a page that broke rather than a room that is shut.
         The empty state says so and points at the week strip, which is also
         the only place the nav's affordance is spelled out. */
      elMenu.innerHTML =
        '<p class="tonight__empty">Nothing comes out of that kitchen today. ' +
        'Pick any lit day above and the board fills in with what is actually served on it.</p>';
      elBlank.innerHTML = '';
      return;
    }

    var menu = MENUS[spec.service];
    elHead.textContent = spec.service === 'brunch'
      ? 'Brunch.'
      : (isToday ? 'Tonight.' : DAYS[day] + ' dinner.');

    var lines = [];

    if (isToday) {
      if (now.hour >= spec.open && now.hour < spec.close) {
        lines.push('<span class="open">Open right now</span>, until <b>' + clockLabel(spec.close) + '</b>.');
        if (spec.happy && now.hour >= spec.happy[0] && now.hour < spec.happy[1]) {
          lines.push('Happy hour is on until <b>' + clockLabel(spec.happy[1]) +
                     '</b>: small plates and drink specials.');
        }
      } else if (now.hour < spec.open) {
        var hrs = spec.open - now.hour;
        lines.push('Doors at <b>' + clockLabel(spec.open) + '</b>, ' +
                   (hrs < 1 ? 'in under an hour' : 'in about ' + Math.round(hrs) + ' hour' + (Math.round(hrs) === 1 ? '' : 's')) + '.');
      } else {
        var nx2 = nextOpen(day);
        lines.push('Done for the night. Next service <b>' + DAYS[nx2.day] + ', ' + clockLabel(nx2.at) + '</b>.');
      }
    } else {
      lines.push(menu.label + ', <b>' + clockLabel(spec.open) + ' until ' + clockLabel(spec.close) + '</b>.');
    }

    if (spec.happy && !(isToday && now.hour >= spec.happy[0] && now.hour < spec.happy[1])) {
      lines.push('Happy hour ' + clockLabel(spec.happy[0]) + ' to ' + clockLabel(spec.happy[1]) + '.');
    }

    elStat.innerHTML = lines.join(' ');
    elMenu.innerHTML = renderMenu(menu);
    elBlank.innerHTML = renderBlanks(menu.blanks);
  }

  function select(day) {
    viewing = day;
    dayBtns.forEach(function (b) {
      var d = parseInt(b.getAttribute('data-day'), 10);
      if (d === day) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });
    compose(day);
  }

  dayBtns.forEach(function (b) {
    if (b.disabled) return;
    b.addEventListener('click', function () {
      select(parseInt(b.getAttribute('data-day'), 10));
      /* The nav changes what the page is showing, not where the reader is, so
         it only scrolls them to the act when they are not already looking at
         it. Moving the page under someone who is reading it is rude. */
      var r = stage.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) {
        document.getElementById('tonight').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* Monday and Tuesday are struck in the markup and disabled, but if the
     reader arrives ON one of them the page must still open on the truth. */
  select(now.day);

  /* The room opens and shuts while the page is sitting there. Re-resolve on
     the minute, and whenever the tab comes back. */
  setInterval(function () {
    var fresh = syracuseNow();
    if (fresh.day !== now.day || Math.floor(fresh.hour * 60) !== Math.floor(now.hour * 60)) {
      now = fresh;
      compose(viewing);
    }
  }, 30000);

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) { now = syracuseNow(); compose(viewing); }
  });
})();
