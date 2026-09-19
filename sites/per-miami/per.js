/* ============================================================== PER Miami
   Page-local behaviour. The engine is never edited: everything here reads
   act progress, geometry and pointer state and drives this page's own markup.

     1  the standing index marks where the reader is
     2  the key tag: the signature move
     3  the booking survey
   ======================================================================= */
(function () {
  "use strict";

  ScrollCraft.mount(document.body);

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  /* ------------------------------------------------------------- 1 · index
     Which object the reader is standing in front of. The index is the
     navigation in this grammar, so it has to say where they are. */
  var acts = [
    { id: "act-macan", el: document.getElementById("macan") },
    { id: "act-collection", el: document.getElementById("collection") },
    { id: "act-room", el: document.getElementById("room") },
    { id: "act-cullinan", el: document.getElementById("cullinan") }
  ];
  var links = {};
  Array.prototype.forEach.call(document.querySelectorAll("[data-index-for]"), function (a) {
    links[a.getAttribute("data-index-for")] = a;
  });

  function markIndex() {
    var mid = window.innerHeight * 0.45, current = null;
    acts.forEach(function (a) {
      if (!a.el) return;
      var r = a.el.getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) current = a.id;
    });
    for (var id in links) {
      if (current === id) links[id].setAttribute("aria-current", "true");
      else links[id].removeAttribute("aria-current");
    }
  }

  /* --------------------------------------------------------------- 2 · tag
     The signature move. A valet tag that stamps whichever car is in front of
     the reader, swings with the scroll, and hands itself to the form.

     It is aria-hidden: the <select> in the form carries the same value and is
     the real control, so the tag is a mirror, never the only route. */
  var tag = document.getElementById("tag");
  var tagName = tag.querySelector(".tag__name");
  var tagRate = tag.querySelector(".tag__rate");
  var tagKind = tag.querySelector(".tag__kind");
  var dock = document.getElementById("car-dock");
  var select = document.getElementById("car");

  var RATES = {};
  Array.prototype.forEach.call(select.options, function (o) { RATES[o.value] = +o.getAttribute("data-rate"); });

  var state = {
    car: "Porsche Macan",
    locked: false,          // an explicit choice outranks the scroll
    docked: false,
    moving: 0,
    swing: 0,
    tx: 0, ty: 0,
    base: null,
    lastY: window.pageYOffset,
    lockUntil: 0,
    hoverUntil: 0,
    busyUntil: 0
  };

  function measureTag() {
    // The tag is position: fixed with a fixed right/bottom, so its untransformed
    // box does not move with scroll. Measured once per layout, not per frame.
    var t = tag.style.transform;
    tag.style.transform = "none";
    state.base = tag.getBoundingClientRect();
    tag.style.transform = t;
  }

  function stamp(car, opts) {
    if (!RATES.hasOwnProperty(car)) return;
    if (state.locked && !(opts && opts.force)) return;
    if (opts && opts.lock) {
      // Taken before the equality check below: clicking a Reserve that hover
      // had already stamped would otherwise return early, leave the choice
      // unlocked, and let the smooth scroll past the peak restamp the tag
      // with the Cullinan on its way to the form.
      state.locked = true;
      state.lockUntil = Date.now() + 1800;   // covers the jump itself
    }
    if (car === state.car) return;
    state.car = car;
    var write = function () {
      tagName.textContent = car;
      tagRate.textContent = "$" + RATES[car].toLocaleString("en-US") + " / day";
    };
    if (reduced) { write(); return; }
    tag.classList.add("is-flip");
    window.setTimeout(function () {
      write();
      tag.classList.remove("is-flip");
    }, 150);
  }

  /* what is in front of the reader right now */
  function objectsIn(sel) {
    return Array.prototype.map.call(document.querySelectorAll(sel), function (el) {
      return { el: el, car: el.querySelector("[data-car]").getAttribute("data-car") };
    });
  }
  var railObjects = objectsIn(".rail > .object");
  var roomObjects = objectsIn(".room > .object");

  function nearest(list, axis) {
    // The rail travels on one axis, so distance on that axis is the whole
    // story. The mosaic is two columns, where a purely vertical measure picks
    // whichever object happens to sit level with the reader rather than the
    // one they are looking at, so the horizontal gap counts too, at a fifth of
    // the weight: enough to break the tie between a tall object on one side and
    // a short one level with it, not enough to outvote what is actually centred.
    var tx = window.innerWidth * 0.5, ty = window.innerHeight * 0.45;
    var best = null, bestD = Infinity;
    list.forEach(function (o) {
      var r = o.el.getBoundingClientRect();
      var d = axis === "x"
        ? Math.abs(r.left + r.width / 2 - tx)
        : Math.abs(r.top + r.height / 2 - ty) + Math.abs(r.left + r.width / 2 - tx) * 0.18;
      if (d < bestD) { bestD = d; best = o; }
    });
    return best;
  }

  function stampFromScroll() {
    // a pointer on an object owns the tag for a moment, so the scroll does not
    // immediately overwrite what the reader just pointed at
    if (Date.now() < state.hoverUntil) return;

    var mid = window.innerHeight * 0.45;
    var hero = document.getElementById("macan").getBoundingClientRect();
    var rail = document.getElementById("collection").getBoundingClientRect();
    var room = document.getElementById("room").getBoundingClientRect();
    var peakEl = document.getElementById("cullinan");
    var peak = peakEl.getBoundingClientRect();
    var pick;

    if (peak.top <= mid && peak.bottom > mid) {
      // Not the moment the stage arrives: a pinned stage is on screen for a
      // whole viewport before its progress leaves 0, so stamping on arrival
      // put the Cullinan on the tag while its frame was still empty, which
      // both spoiled the wipe and named a car nobody could see. Wait for the
      // wipe to actually start.
      var travel = Math.max(peakEl.offsetHeight - window.innerHeight, 1);
      var pp = (-peak.top) / travel;
      if (pp > 0.12) stamp("Rolls-Royce Cullinan");
      return;
    }
    // the mosaic travels vertically rather than laterally, and a phone has no
    // hover at all, so without this the tag went stale for a whole act there
    if (room.top <= mid && room.bottom > mid) {
      pick = nearest(roomObjects, "y");
      if (pick) stamp(pick.car);
      return;
    }
    if (rail.top <= mid && rail.bottom > mid) {
      pick = nearest(railObjects, "x");
      if (pick) stamp(pick.car);
      return;
    }
    if (hero.top <= mid && hero.bottom > mid) { stamp("Porsche Macan"); return; }
    // the plate leaves the last stamp standing on purpose
  }

  /* hovering or focusing a row in the index stamps it: the quiet act still
     answers to the reader being present */
  Array.prototype.forEach.call(document.querySelectorAll(".room [data-car]"), function (a) {
    var car = a.getAttribute("data-car");
    var zone = a.closest(".object") || a.parentNode;
    if (fine) zone.addEventListener("mouseenter", function () {
      stamp(car);
      state.hoverUntil = Date.now() + 1500;
      wake();
    });
    a.addEventListener("focus", function () { stamp(car); });
  });

  /* every Reserve is an explicit choice: it stamps, it fills the field, and
     it outranks the scroll until the reader goes back up to the collection */
  Array.prototype.forEach.call(document.querySelectorAll("a[data-car]"), function (a) {
    a.addEventListener("click", function () {
      var car = a.getAttribute("data-car");
      state.locked = false;
      stamp(car, { force: true, lock: true });
      select.value = car;
      updateEstimate();
    });
  });
  select.addEventListener("change", function () {
    state.locked = false;
    stamp(select.value, { force: true, lock: true });
    updateEstimate();
  });

  /* the handover: the tag stops being chrome and docks into the car field */
  var head = document.querySelector(".plate__head");
  var narrow = window.matchMedia("(max-width: 1040px)");

  function dockTarget() {
    var b = state.base;
    if (narrow.matches) {
      var p = head.getBoundingClientRect();
      return { x: p.right - b.right, y: p.top - b.top - 6 };
    }
    var d = dock.getBoundingClientRect();
    return { x: d.right - b.right - 6, y: d.top - b.top - b.height * 0.52 };
  }

  function setDocked(on) {
    if (on === state.docked) return;
    state.docked = on;
    tag.classList.toggle("is-docked", on);
    dock.classList.toggle("is-stamped", on);
    if (on) {
      select.value = state.car;
      updateEstimate();
      tagKind.textContent = "handing over";
    } else {
      tagKind.textContent = "holding";
    }
    if (!reduced) {
      tag.classList.add("is-moving");
      state.moving = Date.now() + 660;
    }
  }

  function frame() {
    var now = Date.now();

    /* the cord swings with scroll velocity, which is what makes the page feel
       driven rather than played back. Pointer-fine only, and never docked. */
    var y = window.pageYOffset;
    var dy = y - state.lastY;
    state.lastY = y;
    if (!reduced && fine && !state.docked) {
      state.swing += (clamp(-dy * 0.16, -9, 9) - state.swing) * 0.22;
      if (Math.abs(state.swing) < 0.01) state.swing = 0;
    } else {
      state.swing = 0;
    }

    var d = dock.getBoundingClientRect();
    setDocked(d.top < window.innerHeight * 0.72 && d.bottom > 0);

    var t = state.docked ? dockTarget() : { x: 0, y: 0 };
    if (now > state.moving) tag.classList.remove("is-moving");
    state.tx = t.x; state.ty = t.y;

    tag.style.setProperty("--per-swing", state.swing.toFixed(2) + "deg");
    tag.style.setProperty("--per-tx", Math.round(state.tx) + "px");
    tag.style.setProperty("--per-ty", Math.round(state.ty) + "px");

    if (!state.docked) stampFromScroll();
    markIndex();

    /* An explicit choice outranks the scroll until the reader has both left
       the plate behind and finished travelling to it. Releasing on any
       position rule alone released mid-jump, which is the same bug seen from
       the other side. */
    if (state.locked && now > state.lockUntil) {
      var closeTop = document.getElementById("reserve").getBoundingClientRect().top;
      if (closeTop > window.innerHeight * 1.2) state.locked = false;
    }

    if (now < state.busyUntil || state.swing !== 0 || now < state.moving || now < state.lockUntil) {
      window.requestAnimationFrame(frame);
    } else {
      state.running = false;
    }
  }

  function wake() {
    state.busyUntil = Date.now() + 420;
    if (!state.running) { state.running = true; window.requestAnimationFrame(frame); }
  }

  window.addEventListener("scroll", wake, { passive: true });
  window.addEventListener("resize", function () { measureTag(); wake(); });
  measureTag();
  tagName.textContent = state.car;
  tagRate.textContent = "$" + RATES[state.car].toLocaleString("en-US") + " / day";
  wake();

  /* A focusable control inside a pinned act holds one viewport position for
     the whole act, so the engine's centre-on-focus cannot open its cue: it can
     only scroll backwards out of the act, where progress is 0 and the cue is
     dark. Only the page knows which cue belongs to which control, so the peak's
     Reserve parks its own act at the progress where its cue is open. */
  /* A flow-section reveal fires on scroll, so tabbing to a link in a group
     that has not entered the viewport yet lands on something at opacity 0.
     Open the group the focus is in. */
  document.addEventListener("focusin", function (e) {
    var group = e.target.closest("[data-sc-in]");
    if (group && !group.classList.contains("sc-in")) {
      group.classList.add("sc-in");
      Array.prototype.forEach.call(group.children, function (k) { k.classList.add("sc-in"); });
    }
  });

  /* Same class of problem on the rail, one axis over: a card's Reserve can be
     focused while the card itself is parked off the left edge and dimmed by the
     settle, because neither position is something the engine knows how to open.
     Park the pan act at the progress that walks that card to the middle. */
  var railAct = document.getElementById("collection");
  var railEl = railAct.querySelector("[data-sc-pan]");
  Array.prototype.forEach.call(railAct.querySelectorAll("a, button"), function (el) {
    el.addEventListener("focus", function () {
      var item = el.closest(".rail > *");
      if (!item) return;
      var travel = railEl.scrollWidth - window.innerWidth;
      if (travel <= 0) return;
      var want = item.offsetLeft + item.offsetWidth / 2 - window.innerWidth / 2;
      var p = clamp(want / travel, 0, 1);
      var top = railAct.getBoundingClientRect().top + window.pageYOffset;
      var span = Math.max(railAct.offsetHeight - window.innerHeight, 1);
      window.scrollTo({ top: Math.round(top + span * p), behavior: "instant" });
    });
  });

  var peak = document.getElementById("cullinan");
  var peakCta = peak.querySelector(".button");
  peakCta.addEventListener("focus", function () {
    var rect = peak.getBoundingClientRect();
    var top = rect.top + window.pageYOffset;
    var travel = Math.max(peak.offsetHeight - window.innerHeight, 1);
    var open = 0.74;  // the cue opens by 0.60; 0.74 sits inside its plateau
    window.scrollTo({ top: Math.round(top + travel * open), behavior: "instant" });
  });

  /* ------------------------------------------------------------ 3 · survey */
  var form = document.getElementById("survey");
  var fill = form.querySelector(".survey__fill");
  var steps = Array.prototype.slice.call(form.querySelectorAll(".step"));
  var errorLine = document.getElementById("survey-error");
  var estimate = document.getElementById("estimate");
  var days = document.getElementById("days");

  function updateEstimate() {
    var n = parseInt(days.value, 10);
    var rate = RATES[select.value] || 0;
    if (!n || n < 1 || !rate) { estimate.textContent = ""; return; }
    var total = rate * n;
    estimate.innerHTML = "$" + rate.toLocaleString("en-US") + " × " + n + " " +
      (n === 1 ? "day" : "days") + " = <b>$" + total.toLocaleString("en-US") + "</b> before taxes and fees";
  }
  days.addEventListener("input", updateEstimate);
  updateEstimate();

  /* The dates are the answer, so they own the day count: a visitor who sets
     the first step to two days and then picks a four-day window should not be
     quoted for two. Dates drive days whenever both are valid, and the field
     stays editable for anyone who fills it in before opening a calendar. */
  var from = document.getElementById("from");
  var to = document.getElementById("to");

  function spanDays() {
    if (!from.value || !to.value) return null;
    var a = new Date(from.value + "T00:00"), b = new Date(to.value + "T00:00");
    if (isNaN(a) || isNaN(b)) return null;
    var d = Math.round((b - a) / 86400000);
    return d > 0 ? d : null;
  }

  function syncDays() {
    var d = spanDays();
    if (d === null) return;
    days.value = String(Math.min(d, 60));
    updateEstimate();
  }
  from.addEventListener("change", syncDays);
  to.addEventListener("change", syncDays);

  function show(n, focusFirst) {
    steps.forEach(function (s) {
      var on = +s.getAttribute("data-step") === n;
      s.hidden = !on;
      s.classList.toggle("is-current", on);
    });
    fill.style.setProperty("--per-step", n);
    if (focusFirst === false) return;
    var first = steps[n - 1].querySelector("input, select");
    if (first) first.focus({ preventScroll: true });
  }

  function validate(n) {
    var fields = steps[n - 1].querySelectorAll("input, select, textarea");
    var bad = null;
    if (n === 2 && from.value && to.value && spanDays() === null) {
      to.setAttribute("aria-invalid", "true");
      errorLine.hidden = false;
      errorLine.textContent = "The return date has to be after the pick-up date.";
      to.focus({ preventScroll: true });
      return false;
    }
    Array.prototype.forEach.call(fields, function (f) {
      var ok = f.checkValidity();
      f.setAttribute("aria-invalid", ok ? "false" : "true");
      if (!ok && !bad) bad = f;
    });
    if (bad) {
      errorLine.hidden = false;
      errorLine.textContent = bad.validationMessage || "Please check this answer.";
      bad.focus({ preventScroll: true });
      return false;
    }
    errorLine.hidden = true;
    return true;
  }

  form.addEventListener("click", function (e) {
    var next = e.target.closest("[data-next]");
    var back = e.target.closest("[data-back]");
    if (next && validate(+next.getAttribute("data-next") - 1)) show(+next.getAttribute("data-next"), true);
    if (back) { errorLine.hidden = true; show(+back.getAttribute("data-back"), true); }
  });

  var outcome = document.getElementById("outcome");
  var outcomeH = document.getElementById("outcome-h");
  var outcomeLine = document.getElementById("outcome-line");
  var outcomeSummary = document.getElementById("outcome-summary");
  var outcomeSms = document.getElementById("outcome-sms");
  var copyBtn = document.getElementById("outcome-copy");

  function readRequest() {
    var f = new FormData(form);
    var n = parseInt(f.get("days"), 10) || 1;
    var rate = RATES[f.get("car")] || 0;
    return {
      car: f.get("car"),
      days: n,
      rate: rate,
      estimate: rate * n,
      from: f.get("from"),
      to: f.get("to"),
      where: f.get("where"),
      name: f.get("name"),
      phone: f.get("phone"),
      email: f.get("email") || "",
      note: (f.get("note") || "").trim()
    };
  }

  function summarise(r) {
    return [
      "PER Miami · reservation request",
      "Car        " + r.car,
      "Dates      " + r.from + " to " + r.to + "  (" + r.days + " " + (r.days === 1 ? "day" : "days") + ")",
      "Rate       $" + r.rate.toLocaleString("en-US") + " per day · est. $" + r.estimate.toLocaleString("en-US"),
      "Delivery   " + r.where,
      "Name       " + r.name,
      "Phone      " + r.phone,
      r.email ? "Email      " + r.email : null,
      r.note ? "Note       " + r.note.replace(/\s*\n\s*/g, " ") : null
    ].filter(Boolean).join("\n");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validate(3)) return;

    var send = form.querySelector("[type=submit]");
    var request = readRequest();
    var text = summarise(request);
    send.disabled = true;
    send.textContent = "Sending";

    var ctl = new AbortController();
    var bail = window.setTimeout(function () { ctl.abort(); }, 6000);

    fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: ctl.signal
    }).then(function (res) {
      window.clearTimeout(bail);
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json().catch(function () { return {}; });
    }).then(function () {
      finish(true, request, text);
    }).catch(function () {
      window.clearTimeout(bail);
      finish(false, request, text);
    });
  });

  function finish(filed, request, text) {
    form.hidden = true;
    outcome.hidden = false;
    outcomeSummary.textContent = text;
    outcomeSms.href = "sms:+13054945165?&body=" + encodeURIComponent(text);

    if (filed) {
      outcomeH.textContent = "Request filed";
      outcomeLine.textContent = "We have your request for the " + request.car +
        ". Someone calls " + request.phone + " to confirm availability. The copy below is yours to keep.";
    } else {
      // Honest about what happened. The endpoint is a stub until it is hosted,
      // so the page says the request was not filed rather than implying it was.
      outcomeH.textContent = "Not filed yet";
      outcomeLine.textContent = "The booking endpoint did not answer, so nothing has been filed. " +
        "Your request is written out below: text it in or call and it is done in a minute.";
    }
    outcome.focus();
    outcome.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
  }

  copyBtn.addEventListener("click", function () {
    var done = function () { copyBtn.textContent = "Copied"; window.setTimeout(function () { copyBtn.textContent = "Copy"; }, 2000); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(outcomeSummary.textContent).then(done, function () {});
      return;
    }
    var sel = window.getSelection();
    var range = document.createRange();
    range.selectNodeContents(outcomeSummary);
    sel.removeAllRanges(); sel.addRange(range);
    try { document.execCommand("copy"); done(); } catch (err) { /* nothing to do */ }
  });

  show(1, false);
})();
