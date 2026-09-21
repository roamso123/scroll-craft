/* L&T Auto Repair - booking survey.

   ============================================================
   SUBMISSION HOOK. Front end only right now: nothing leaves the
   browser. To go live, set LT_BOOKING_ENDPOINT to a URL that
   accepts a JSON POST (a Formspree form URL, a Netlify function,
   your own handler) and send() below will use it. Leave it null
   and the form still validates, reviews and confirms locally.
   ============================================================ */
var LT_BOOKING_ENDPOINT = null;

(function () {
  'use strict';

  var form = document.querySelector('[data-form]');
  if (!form) return;

  var steps = Array.prototype.slice.call(form.querySelectorAll('.step'));
  var map = document.querySelectorAll('[data-map] li');
  var bar = form.querySelector('[data-progress-bar]');
  var counter = form.querySelector('[data-step-now]');
  var backBtn = form.querySelector('[data-back]');
  var nextBtn = form.querySelector('[data-next]');
  var sendBtn = form.querySelector('[data-send]');
  var summary = form.querySelector('[data-summary]');
  var done = document.querySelector('[data-done]');

  var LAST = steps.length;          // step 6 is the review
  var current = 1;

  var HOURS = window.LT_HOURS || { 0: null, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 };

  /* ---------- validation ---------- */

  function err(name, show, message) {
    var el = form.querySelector('[data-err="' + name + '"]');
    if (!el) return;
    if (message) el.textContent = message;
    el.hidden = !show;
    var input = form.querySelector('[name="' + name + '"]');
    if (input && input.type !== 'checkbox') {
      input.setAttribute('aria-invalid', show ? 'true' : 'false');
    }
  }

  function digits(s) { return (s || '').replace(/\D/g, ''); }

  var RULES = {
    1: function () {
      var ok = form.querySelectorAll('input[name="service"]:checked').length > 0;
      err('service', !ok);
      return ok;
    },
    2: function () {
      var y = digits(form.year.value);
      var yearOk = y.length === 4 && +y >= 1900 && +y <= new Date().getFullYear() + 2;
      var makeOk = form.make.value.trim().length > 0;
      var modelOk = form.model.value.trim().length > 0;
      err('year', !yearOk);
      err('make', !makeOk);
      err('model', !modelOk);
      return yearOk && makeOk && modelOk;
    },
    3: function () {
      var ok = form.symptom.value.trim().length >= 8;
      err('symptom', !ok);
      return ok;
    },
    4: function () {
      var v = form.dropdate.value;
      if (!v) { err('dropdate', true, 'Pick a day we are open. We are closed Sundays.'); return false; }
      var parts = v.split('-');
      var d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
      var today = new Date(); today.setHours(0, 0, 0, 0);
      if (d < today) { err('dropdate', true, 'That day has passed. Pick a day from today onward.'); return false; }
      if (!HOURS[d.getDay()]) { err('dropdate', true, 'We are closed that day. Monday to Saturday only.'); return false; }
      err('dropdate', false);
      return true;
    },
    5: function () {
      var nameOk = form.name.value.trim().length > 1;
      var phoneOk = digits(form.phone.value).length >= 10;
      var email = form.email.value.trim();
      var emailOk = email === '' || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
      err('name', !nameOk);
      err('phone', !phoneOk);
      err('email', !emailOk);
      return nameOk && phoneOk && emailOk;
    },
    6: function () { return true; }
  };

  /* ---------- state ---------- */

  function checkedValues(name) {
    return Array.prototype.map.call(
      form.querySelectorAll('input[name="' + name + '"]:checked'),
      function (i) { return i.value; }
    );
  }

  function picked(name) {
    var el = form.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : '';
  }

  function prettyDate(v) {
    if (!v) return '';
    var p = v.split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }

  function collect() {
    return {
      services: checkedValues('service'),
      vehicle: {
        year: form.year.value.trim(),
        make: form.make.value.trim(),
        model: form.model.value.trim(),
        mileage: form.mileage.value.trim(),
        plate: form.plate.value.trim()
      },
      symptom: form.symptom.value.trim(),
      flags: checkedValues('flag'),
      dropoff: {
        date: form.dropdate.value,
        time: form.droptime.value,
        leave: picked('leave')
      },
      customer: {
        name: form.name.value.trim(),
        phone: form.phone.value.trim(),
        email: form.email.value.trim(),
        contact: picked('contact')
      }
    };
  }

  /* ---------- review ---------- */

  function buildSummary() {
    var d = collect();
    var car = [d.vehicle.year, d.vehicle.make, d.vehicle.model].filter(Boolean).join(' ');
    if (d.vehicle.mileage) car += ', ' + d.vehicle.mileage + ' miles';
    if (d.vehicle.plate) car += ', plate ' + d.vehicle.plate;

    var rows = [
      ['Needs', d.services.join(', '), 1],
      ['Vehicle', car, 2],
      ['Symptom', d.symptom, 3],
      ['Also', d.flags.length ? d.flags.join(', ') : 'Nothing else noted', 3],
      ['Drop off', prettyDate(d.dropoff.date) + ', ' + d.dropoff.time.toLowerCase(), 4],
      ['The car', d.dropoff.leave, 4],
      ['Name', d.customer.name, 5],
      ['Phone', d.customer.phone, 5],
      ['Email', d.customer.email || 'Not given', 5],
      ['Reach you by', d.customer.contact, 5]
    ];

    summary.textContent = '';
    rows.forEach(function (row) {
      var wrap = document.createElement('div');
      var dt = document.createElement('dt');
      dt.textContent = row[0];
      var dd = document.createElement('dd');
      dd.textContent = row[1];
      var edit = document.createElement('button');
      edit.type = 'button';
      edit.textContent = 'Edit';
      edit.setAttribute('aria-label', 'Edit ' + row[0].toLowerCase());
      edit.addEventListener('click', function () { go(row[2]); });
      wrap.appendChild(dt); wrap.appendChild(dd); wrap.appendChild(edit);
      summary.appendChild(wrap);
    });
  }

  /* ---------- movement ---------- */

  function go(n, silent) {
    current = Math.max(1, Math.min(LAST, n));

    steps.forEach(function (s) {
      var is = +s.getAttribute('data-step') === current;
      s.hidden = !is;
      if (is) {
        s.setAttribute('data-entering', '');
        setTimeout(function () { s.removeAttribute('data-entering'); }, 460);
      }
    });

    Array.prototype.forEach.call(map, function (li) {
      var n2 = +li.getAttribute('data-map-step');
      li.setAttribute('data-state', n2 < current ? 'done' : (n2 === current ? 'now' : 'todo'));
    });

    if (bar) bar.style.width = Math.round((current / LAST) * 100) + '%';
    if (counter) counter.textContent = String(Math.min(current, 5));
    form.querySelector('.book__count').hidden = current === LAST;

    backBtn.hidden = current === 1;
    nextBtn.hidden = current === LAST;
    sendBtn.hidden = current !== LAST;

    if (current === LAST) buildSummary();

    /* On the first paint nothing has been asked yet, so moving focus here
       would jump the visitor past the skip link and the whole header. */
    if (silent) return;

    var legend = steps[current - 1].querySelector('.step__legend');
    if (legend) {
      legend.setAttribute('tabindex', '-1');
      legend.focus({ preventScroll: true });
    }
    var top = form.getBoundingClientRect().top + window.scrollY - 96;
    if (window.scrollY > top) window.scrollTo({ top: top, behavior: 'smooth' });
  }

  nextBtn.addEventListener('click', function () {
    if (RULES[current] && !RULES[current]()) {
      var bad = steps[current - 1].querySelector('[aria-invalid="true"]') ||
                steps[current - 1].querySelector('.err:not([hidden])');
      if (bad && bad.focus) bad.focus();
      return;
    }
    go(current + 1);
  });

  backBtn.addEventListener('click', function () { go(current - 1); });

  /* clear an error as soon as the visitor fixes it */
  form.addEventListener('input', function (e) {
    var name = e.target.name;
    if (!name) return;
    var box = form.querySelector('[data-err="' + name + '"]');
    if (box && !box.hidden) { box.hidden = true; e.target.setAttribute('aria-invalid', 'false'); }
  });
  form.addEventListener('change', function (e) {
    if (e.target.name === 'service') err('service', false);
  });

  /* enter moves forward instead of submitting early */
  form.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && current !== LAST) {
      e.preventDefault();
      nextBtn.click();
    }
  });

  /* ---------- date field bounds ---------- */

  (function boundDate() {
    var input = form.dropdate;
    if (!input) return;
    var today = new Date();
    var max = new Date(); max.setDate(max.getDate() + 90);
    var iso = function (d) {
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    };
    input.min = iso(today);
    input.max = iso(max);

    /* default to the next day the shop is actually open */
    var d = new Date();
    for (var i = 0; i < 8; i++) {
      if (HOURS[d.getDay()]) break;
      d.setDate(d.getDate() + 1);
    }
    input.value = iso(d);
  })();

  /* ---------- reference code ---------- */

  function reference() {
    var n = Math.floor(1000 + Math.random() * 9000);
    var d = new Date();
    return 'LT-' + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' + n;
  }

  /* ---------- send ---------- */

  function send(payload) {
    if (!LT_BOOKING_ENDPOINT) {
      return Promise.resolve({ local: true });
    }
    return fetch(LT_BOOKING_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) {
      if (!r.ok) throw new Error('Request failed with status ' + r.status);
      return r.json().catch(function () { return {}; });
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    for (var s = 1; s <= 5; s++) {
      if (!RULES[s]()) { go(s); return; }
    }

    var payload = collect();
    payload.reference = reference();
    payload.submittedAt = new Date().toISOString();

    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending';

    send(payload).then(function () {
      form.hidden = true;
      done.hidden = false;
      done.querySelector('[data-ref]').textContent = payload.reference;
      done.querySelector('[data-payload]').textContent = JSON.stringify(payload, null, 2);
      done.focus();
      window.scrollTo({ top: done.getBoundingClientRect().top + window.scrollY - 110, behavior: 'smooth' });
    }).catch(function (error) {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send booking request';
      var note = form.querySelector('.book__note');
      note.textContent = 'That did not send. Please call (585) 235-7320 instead. (' + error.message + ')';
      note.style.color = '#F0A0B6';
    });
  });

  go(1, true);
})();
