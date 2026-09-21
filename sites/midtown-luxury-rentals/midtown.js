/* Midtown Luxury Rentals · page behaviour.
   The engine (scrollcraft.js) is untouched. Everything here is this site's own.

   Three things live in this file:
     1. The travelling build sheet, which is the signature move.
     2. The hero's independent planes and the rail's staggered settle.
     3. The booking survey.

   Figures are manufacturer specification for the model shown. Where a maker does
   not publish a figure, the sheet says so rather than guessing one. */

(function () {
  "use strict";

  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------------- fleet */

  var FLEET = [
    { id: "maybach-s580", name: "Mercedes-Maybach S 580", short: "Maybach S 580 4MATIC",
      hp: 496, sixty: 4.8, seats: 4, drive: "AWD" },
    { id: "m5",       name: "BMW M5 Competition",              short: "M5 Competition",
      hp: 617, sixty: 3.1, seats: 5, drive: "AWD" },
    { id: "m4c",      name: "BMW M4 Competition Convertible",  short: "M4 Competition Convertible xDrive",
      hp: 503, sixty: 3.6, seats: 4, drive: "AWD" },
    { id: "g63",      name: "Mercedes-AMG G 63",               short: "G 63",
      hp: 577, sixty: 4.5, seats: 5, drive: "AWD" },
    { id: "911",      name: "Porsche 911 Carrera S",           short: "911 Carrera S",
      hp: 443, sixty: 3.5, seats: 4, drive: "RWD" },
    { id: "escalade", name: "Cadillac Escalade ESV",           short: "Escalade ESV Premium Luxury",
      hp: 420, sixty: null, seats: 7, drive: "4WD" },
    { id: "c63",      name: "Mercedes-AMG C 63 S",             short: "C 63 S",
      hp: 503, sixty: 3.9, seats: 5, drive: "AWD" }
  ];
  /* The rear Maybach frame in the rail is the same car as the hero. */
  var ALIAS = { "maybach-rear": "maybach-s580" };
  var byId = {};
  FLEET.forEach(function (c) { byId[c.id] = c; });
  function car(id) { return byId[ALIAS[id] || id] || null; }

  /* --------------------------------------------- stills that have not landed */

  /* A missing still gets a labelled slot instead of a broken-image glyph, so the
     page reads as complete and a re-drop needs no markup change. */
  function markPending(img) {
    var host = img.closest("[data-slot]") || img.parentElement;
    if (host) host.classList.add("is-pending");
  }
  Array.prototype.forEach.call(document.images, function (img) {
    if (img.complete && img.naturalWidth === 0) markPending(img);
    else img.addEventListener("error", function () { markPending(img); });
  });

  /* ------------------------------------------------------- the index panel */

  var indexCars = document.getElementById("indexCars");
  if (indexCars) {
    FLEET.forEach(function (c, i) {
      var a = document.createElement("a");
      a.href = i === 0 ? "#top" : "#fleet";
      a.innerHTML =
        '<span class="n">' + String(i + 1).padStart(2, "0") + "</span>" +
        '<span class="t"></span>' +
        '<span class="m">' + c.hp + " hp</span>";
      a.querySelector(".t").textContent = c.name;
      indexCars.appendChild(a);
    });
  }

  var indexPanel = document.getElementById("indexPanel");
  var indexBtn = document.getElementById("indexBtn");
  if (indexPanel && indexBtn) {
    indexBtn.addEventListener("click", function () { indexPanel.showModal(); });
    indexPanel.addEventListener("click", function (e) {
      if (e.target.closest("[data-close-index]") || e.target.closest("a")) indexPanel.close();
      else if (e.target === indexPanel) indexPanel.close();
    });
  }

  /* --------------------------------------------------- the frame switcher */

  /* Each object holds two or three frames of the same car. Swapping the source
     also swaps the alt text, because a frame strip that leaves "three-quarter
     front view" on a rear shot is worse than no alt text at all. */
  Array.prototype.forEach.call(document.querySelectorAll(".frames"), function (group) {
    group.addEventListener("click", function (e) {
      var btn = e.target.closest(".frames__b");
      if (!btn) return;
      var img = group.parentElement.querySelector(".obj__frame img");
      if (!img) return;
      img.src = btn.getAttribute("data-src");
      img.alt = btn.getAttribute("data-alt");
      Array.prototype.forEach.call(group.querySelectorAll(".frames__b"), function (b) {
        b.setAttribute("aria-pressed", String(b === btn));
      });
    });
  });

  /* Warm the frames that are one click away, so the swap is instant. */
  addEventListener("load", function () {
    Array.prototype.forEach.call(document.querySelectorAll(".frames__b"), function (b) {
      var pre = new Image();
      pre.src = b.getAttribute("data-src");
    });
  });

  /* ------------------------------------------- naming the booking buttons */

  /* Every booking control reads "Book now", which is one label for one intent.
     Twelve of them in a row is unusable by ear, so each gets a hidden suffix
     naming the object it books. The visible label does not change. */
  function nameButton(btn, suffix) {
    if (!suffix || btn.querySelector(".vh")) return;
    var v = document.createElement("span");
    v.className = "vh";
    v.textContent = ", " + suffix;
    btn.appendChild(v);
  }
  Array.prototype.forEach.call(document.querySelectorAll(".obj [data-book]"), function (btn) {
    var h = btn.closest(".obj").querySelector("h3");
    nameButton(btn, h ? h.textContent.replace(/\s+/g, " ").trim() : "");
  });
  Array.prototype.forEach.call(document.querySelectorAll(".way [data-book]"), function (btn) {
    nameButton(btn, btn.getAttribute("data-service"));
  });
  var heroBtn = document.querySelector(".arrival__card [data-book]");
  if (heroBtn) nameButton(heroBtn, "Mercedes-Maybach S 580");

  /* ------------------------------------ hero planes and the rail's settle */

  var planes = Array.prototype.slice.call(document.querySelectorAll("[data-plane]"));
  var arrival = document.querySelector(".arrival");
  var railItems = Array.prototype.slice.call(
    document.querySelectorAll(".rail > *:not(:first-child)")
  );

  function paintPlanes() {
    if (reduced || !arrival || !planes.length) return;
    var r = arrival.getBoundingClientRect();
    var vh = innerHeight || 1;
    /* -0.5 at the top of its life, +0.5 at the bottom. */
    var t = (-r.top) / (r.height + vh) - 0.5 + (vh / (r.height + vh)) * 0.5;
    t = Math.max(-0.5, Math.min(0.5, t));
    for (var i = 0; i < planes.length; i++) {
      var rate = parseFloat(planes[i].getAttribute("data-plane")) || 0;
      planes[i].style.transform = "translate3d(0," + (rate * t * 220).toFixed(1) + "px,0)";
    }
  }

  function paintRail() {
    if (reduced || !railItems.length) return;
    var vw = innerWidth || 1;
    for (var i = 0; i < railItems.length; i++) {
      var left = railItems[i].getBoundingClientRect().left;
      var seat = (vw - left) / (vw * 0.55);
      railItems[i].style.setProperty("--seat", Math.max(0, Math.min(1, seat)).toFixed(3));
    }
  }

  /* ------------------------------------------- SIGNATURE MOVE: build sheet */

  var sheet = document.getElementById("sheet");
  var sheetName = document.getElementById("sheetName");
  var figHp = document.getElementById("figHp");
  var figSixty = document.getElementById("figSixty");
  var figSeats = document.getElementById("figSeats");
  var figDrive = document.getElementById("figDrive");
  var sheetBook = document.getElementById("sheetBook");
  var carNodes = Array.prototype.slice.call(document.querySelectorAll("[data-car]"));
  var currentId = "maybach-s580";

  function lerp(a, b, w) { return a * w + b * (1 - w); }

  function paintSheet() {
    if (!sheet || !carNodes.length) return;

    var cx = innerWidth / 2;
    var cy = innerHeight / 2;
    var best = null, second = null;

    for (var i = 0; i < carNodes.length; i++) {
      var r = carNodes[i].getBoundingClientRect();
      if (!r.width || !r.height) continue;
      /* Normalised 2D distance, so the same measure works for the hero and the
         cabins (which travel vertically) and for the rail (which travels
         horizontally). */
      var dx = (r.left + r.width / 2 - cx) / innerWidth;
      var dy = (r.top + r.height / 2 - cy) / innerHeight;
      var d = Math.sqrt(dx * dx + dy * dy * 1.35);
      var entry = { d: d, c: car(carNodes[i].getAttribute("data-car")) };
      if (!entry.c) continue;
      if (!best || d < best.d) { second = best; best = entry; }
      else if (!second || d < second.d) { second = entry; }
    }
    if (!best) return;

    var a = best.c;
    var b = second && second.c !== a ? second.c : a;
    /* Weight of the dominant object. The raw ratio never quite reaches 1, which
       would leave the sheet reading 500 hp for a 496 hp car while it sits still.
       Steepening it means the blend only engages when two objects are genuinely
       contesting the frame, and an object at rest in the centre reads exact. */
    var w = b === a ? 1 : (second.d / (best.d + second.d)) || 1;
    w = Math.max(0.5, Math.min(1, 0.5 + (w - 0.5) * 2.7));

    figHp.textContent = Math.round(lerp(a.hp, b.hp, w));
    figSeats.textContent = Math.round(lerp(a.seats, b.seats, w));
    figDrive.textContent = a.drive;

    if (a.sixty == null) {
      /* The maker does not publish this one. Say so instead of blending a
         neighbour's number into the gap. */
      figSixty.innerHTML = "n/p";
      figSixty.setAttribute("title", "Not published by the manufacturer");
    } else {
      var v = b.sixty == null ? a.sixty : lerp(a.sixty, b.sixty, w);
      figSixty.innerHTML = v.toFixed(1) + "<i>s</i>";
      figSixty.removeAttribute("title");
    }

    if (a.id !== currentId) {
      currentId = a.id;
      sheetName.textContent = a.name;
      sheetBook.setAttribute("data-book", a.id);
      sheetBook.setAttribute("aria-label", "Book now, " + a.name);
    }

    var max = document.documentElement.scrollHeight - innerHeight;
    sheet.style.setProperty("--sheet-progress",
      (max > 0 ? Math.min(1, scrollY / max) * 100 : 0).toFixed(2) + "%");
  }

  /* The sheet sizes to its own content, so the page's bottom reserve and the
     hero card's offset are measured from it rather than guessed. A guessed
     height clipped the second row of figures on a phone. */
  function measureSheet() {
    if (!sheet) return;
    document.documentElement.style.setProperty(
      "--mlr-sheet-h", Math.ceil(sheet.getBoundingClientRect().height) + "px");
  }
  if (window.ResizeObserver && sheet) new ResizeObserver(measureSheet).observe(sheet);
  addEventListener("resize", measureSheet);
  measureSheet();

  var queued = false;
  function frame() {
    queued = false;
    paintPlanes();
    paintRail();
    paintSheet();
  }
  function schedule() { if (!queued) { queued = true; requestAnimationFrame(frame); } }

  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
  schedule();

  /* ---------------------------------------------------- the booking survey */

  var dlg = document.getElementById("bookDialog");
  var form = document.getElementById("bookForm");
  if (!dlg || !form) return;

  var STEPS = [
    { el: document.getElementById("step1"), label: "Step 1 of 3 · The car and the service", next: "Continue" },
    { el: document.getElementById("step2"), label: "Step 2 of 3 · Dates, pickup and dropoff", next: "Continue" },
    { el: document.getElementById("step3"), label: "Step 3 of 3 · How we reach you", next: "Review" },
    { el: document.getElementById("step4"), label: "Review · Send it to the desk", next: null }
  ];
  var step = 0;
  var stepName = document.getElementById("stepName");
  var stepBars = document.querySelectorAll(".book__steps i");
  var nextBtn = document.getElementById("nextBtn");
  var backBtn = document.getElementById("backBtn");
  var errEl = document.getElementById("bookErr");
  var opener = null;

  /* Vehicle list, plus the two options that are not a car on the floor. */
  var sel = document.getElementById("fVehicle");
  FLEET.forEach(function (c) {
    var o = document.createElement("option");
    o.value = c.name;
    o.textContent = c.name;
    o.setAttribute("data-id", c.id);
    sel.appendChild(o);
  });
  ["Sprinter (group transport)", "Private jet", "Not decided, advise me"].forEach(function (t) {
    var o = document.createElement("option");
    o.value = t; o.textContent = t; sel.appendChild(o);
  });

  function setStep(n) {
    step = Math.max(0, Math.min(STEPS.length - 1, n));
    STEPS.forEach(function (s, i) { s.el.hidden = i !== step; });
    stepName.textContent = STEPS[step].label;
    for (var i = 0; i < stepBars.length; i++) stepBars[i].classList.toggle("on", i <= Math.min(step, 2));
    backBtn.hidden = step === 0;
    nextBtn.hidden = STEPS[step].next === null;
    if (STEPS[step].next) nextBtn.textContent = STEPS[step].next;
    errEl.hidden = true;
    var first = STEPS[step].el.querySelector("input, select, textarea, a");
    if (first) first.focus({ preventScroll: true });
  }

  function fail(msg, el) {
    errEl.textContent = msg;
    errEl.hidden = false;
    if (el) el.focus({ preventScroll: true });
    return false;
  }

  function val(name) {
    var f = form.elements[name];
    if (!f) return "";
    if (f instanceof RadioNodeList || (f.length && !f.tagName)) return f.value || "";
    return (f.value || "").trim();
  }

  function validate() {
    var d = STEPS[step].el;
    var required = d.querySelectorAll("[required]");
    for (var i = 0; i < required.length; i++) {
      var f = required[i];
      if (f.type === "radio") {
        if (!form.elements[f.name].value) return fail("Pick one of the " + f.name.replace(/([A-Z])/g, " $1").toLowerCase() + " options.", f);
        continue;
      }
      if (!f.value || !f.checkValidity()) {
        var lab = d.querySelector('label[for="' + f.id + '"]');
        return fail((lab ? lab.textContent : "This field") + ": " + (f.validationMessage || "required."), f);
      }
    }
    if (step === 1) {
      if (val("pickupWhere") === "Delivery" && !val("pickupAddress"))
        return fail("Give us the address to deliver to.", document.getElementById("fPickAddr"));
      if (val("dropoffWhere") === "Collection" && !val("dropoffAddress"))
        return fail("Give us the address to collect from.", document.getElementById("fDropAddr"));
      var from = new Date(val("pickupDate") + "T" + val("pickupTime"));
      var to = new Date(val("dropoffDate") + "T" + val("dropoffTime"));
      if (!(to > from)) return fail("Dropoff has to be after pickup.", document.getElementById("fDropDate"));
      if (val("service") === "Self-drive" && (to - from) < 24 * 3600 * 1000)
        return fail("Self-drive runs on a 24-hour minimum. Push the dropoff out, or switch to chauffeur.",
                    document.getElementById("fDropDate"));
    }
    return true;
  }

  /* Conditional address fields. */
  form.addEventListener("change", function (e) {
    if (e.target.name === "pickupWhere")
      document.getElementById("wrapPickAddr").hidden = e.target.value !== "Delivery";
    if (e.target.name === "dropoffWhere")
      document.getElementById("wrapDropAddr").hidden = e.target.value !== "Collection";
  });

  function when(dateName, timeName) {
    var d = val(dateName), t = val(timeName);
    if (!d) return "";
    var dt = new Date(d + "T" + (t || "00:00"));
    if (isNaN(dt)) return d + " " + t;
    return dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" }) +
           (t ? ", " + dt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "");
  }

  function summary() {
    var rows = [
      ["Vehicle", val("vehicle")],
      ["Service", val("service")],
      ["Occasion", val("occasion") || "Not specified"],
      ["Passengers", val("passengers")],
      ["Pickup", when("pickupDate", "pickupTime")],
      ["Pickup place", val("pickupWhere") === "Delivery" ? "Deliver to " + val("pickupAddress") : val("pickupWhere")],
      ["Dropoff", when("dropoffDate", "dropoffTime")],
      ["Dropoff place", val("dropoffWhere") === "Collection" ? "Collect from " + val("dropoffAddress") : val("dropoffWhere")],
      ["Name", val("name")],
      ["Phone", val("phone")],
      ["Email", val("email")]
    ];
    if (val("notes")) rows.push(["Notes", val("notes")]);
    return rows;
  }

  function renderReview() {
    var list = document.getElementById("reviewList");
    list.textContent = "";
    var lines = ["Booking request, Midtown Luxury Rentals"];
    summary().forEach(function (r) {
      var wrap = document.createElement("div");
      var dt = document.createElement("dt");
      var dd = document.createElement("dd");
      dt.textContent = r[0];
      dd.textContent = r[1];
      wrap.appendChild(dt); wrap.appendChild(dd);
      list.appendChild(wrap);
      lines.push(r[0] + ": " + r[1]);
    });
    var text = lines.join("\n");
    var sms = document.getElementById("sendSms");
    /* iOS wants ?&body=, everything else takes ?body=. */
    var sep = /iP(hone|ad|od)|Mac/.test(navigator.userAgent) ? "&body=" : "?body=";
    sms.href = "sms:+16313921450" + sep + encodeURIComponent(text);
    document.getElementById("copyReq").onclick = function () {
      var btn = this;
      var done = function () { btn.textContent = "Copied"; setTimeout(function () { btn.textContent = "Copy"; }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, done);
      else done();
    };
  }

  nextBtn.addEventListener("click", function () {
    if (!validate()) return;
    if (step === 2) renderReview();
    setStep(step + 1);
  });
  backBtn.addEventListener("click", function () { setStep(step - 1); });
  form.addEventListener("submit", function (e) { e.preventDefault(); });

  function openBook(id, service) {
    opener = document.activeElement;
    var c = car(id);
    if (c) sel.value = c.name;
    if (service) {
      var r = form.querySelector('input[name="service"][value="' + service + '"]');
      if (r) r.checked = true;
      if (service === "Sprinter") sel.value = "Sprinter (group transport)";
      if (service === "Private jet") sel.value = "Private jet";
    } else if (c && !form.elements.service.value) {
      form.querySelector('input[name="service"][value="Self-drive"]').checked = true;
    }
    /* Pickup cannot be in the past. */
    var today = new Date().toISOString().slice(0, 10);
    document.getElementById("fPickDate").min = today;
    document.getElementById("fDropDate").min = today;
    setStep(0);
    dlg.showModal();
  }

  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-book]");
    if (t) { e.preventDefault(); openBook(t.getAttribute("data-book"), t.getAttribute("data-service")); return; }
    if (e.target.closest("[data-close-book]")) dlg.close();
    else if (e.target === dlg) dlg.close();
  });

  dlg.addEventListener("close", function () { if (opener && opener.focus) opener.focus(); });
})();
