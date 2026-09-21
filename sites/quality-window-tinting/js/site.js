/* Quality Window Tinting - page behaviour.
   Everything degrades: without JS the nav links, phone links and form still work. */

(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- nav ---------- */

  var nav = document.querySelector("[data-nav]");
  if (nav) {
    var toggle = nav.querySelector("[data-nav-toggle]");
    if (toggle) {
      toggle.addEventListener("click", function () {
        var open = nav.getAttribute("data-open") === "true";
        nav.setAttribute("data-open", String(!open));
        toggle.setAttribute("aria-expanded", String(!open));
      });
      nav.querySelectorAll(".nav__link").forEach(function (link) {
        link.addEventListener("click", function () {
          nav.setAttribute("data-open", "false");
          toggle.setAttribute("aria-expanded", "false");
        });
      });
    }
    var onScroll = function () {
      nav.setAttribute("data-stuck", String(window.scrollY > 12));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- reveal on entry ---------- */

  var revealables = document.querySelectorAll(".reveal");
  if (revealables.length) {
    if (reduced || !("IntersectionObserver" in window)) {
      revealables.forEach(function (el) { el.classList.add("is-in"); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var delay = parseInt(entry.target.getAttribute("data-delay") || "0", 10);
          setTimeout(function () { entry.target.classList.add("is-in"); }, delay);
          io.unobserve(entry.target);
        });
      }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });
      revealables.forEach(function (el) { io.observe(el); });
    }
  }

  /* ---------- hero plane drift ---------- */

  var scene = document.querySelector("[data-hero-scene]");
  if (scene && !reduced) {
    var ticking = false;
    var drift = function () {
      var y = window.scrollY;
      scene.style.setProperty("--plane-y", (y * -0.085).toFixed(2) + "px");
      scene.style.setProperty("--streak-y", (y * 0.16).toFixed(2) + "px");
      ticking = false;
    };
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(drift);
    }, { passive: true });
    drift();
  }

  /* ---------- tint simulator ---------- */

  var sim = document.querySelector("[data-sim]");
  if (sim) {
    var view = sim.querySelector("[data-sim-view]");
    var readout = sim.querySelector("[data-sim-readout]");
    var shades = sim.querySelectorAll("[data-vlt]");
    var split = sim.querySelector("[data-sim-split]");

    var setVlt = function (vlt, label) {
      view.style.setProperty("--vlt", vlt);
      if (readout) readout.innerHTML = "<strong>" + vlt + "% VLT</strong> &middot; " + label;
      shades.forEach(function (b) {
        b.setAttribute("aria-pressed", String(b.getAttribute("data-vlt") === String(vlt)));
      });
    };

    shades.forEach(function (btn) {
      btn.addEventListener("click", function () {
        setVlt(btn.getAttribute("data-vlt"), btn.getAttribute("data-label") || "");
      });
    });

    if (split) {
      split.addEventListener("input", function () {
        view.style.setProperty("--split", split.value + "%");
      });
    }

    var active = sim.querySelector('[data-vlt][aria-pressed="true"]') || shades[0];
    if (active) setVlt(active.getAttribute("data-vlt"), active.getAttribute("data-label") || "");
  }

  /* ---------- booking survey ---------- */

  var form = document.querySelector("[data-survey]");
  if (!form) return;

  var steps = Array.prototype.slice.call(form.querySelectorAll("[data-step]"));
  var segs = Array.prototype.slice.call(form.querySelectorAll(".progress__seg"));
  var back = form.querySelector("[data-back]");
  var next = form.querySelector("[data-next]");
  var index = 0;

  var paint = function () {
    steps.forEach(function (step, i) {
      step.setAttribute("data-active", String(i === index));
    });
    segs.forEach(function (seg, i) {
      seg.setAttribute("data-done", String(i <= index));
    });
    back.hidden = index === 0;
    next.textContent = index === steps.length - 1 ? "Review request" : "Continue";
    var head = steps[index].querySelector("h2, h3");
    if (head) head.setAttribute("tabindex", "-1");
    if (head && index > 0) head.focus({ preventScroll: true });
    form.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  var valid = function () {
    var step = steps[index];
    var ok = true;

    /* A radio group is required when any member carries the attribute, and
       checking any member satisfies it. Report it on the fieldset, because the
       inputs themselves are visually hidden behind their labels. */
    step.querySelectorAll(".fieldset").forEach(function (set) {
      var radios = set.querySelectorAll('input[type="radio"]');
      if (!radios.length) return;
      var needed = Array.prototype.some.call(radios, function (r) { return r.required; });
      var chosen = Array.prototype.some.call(radios, function (r) { return r.checked; });
      setError(set, needed && !chosen ? "Pick one to continue." : "");
      if (needed && !chosen) ok = false;
    });

    step.querySelectorAll(".field").forEach(function (field) {
      var el = field.querySelector("input, select, textarea");
      if (!el || el.type === "radio") return;
      var bad = !el.checkValidity();
      setError(field, bad ? (el.validity.valueMissing ? "This one is needed." : "Check this and try again.") : "");
      if (bad && ok) el.focus({ preventScroll: false });
      if (bad) ok = false;
    });

    return ok;
  };

  function setError(host, message) {
    var note = host.querySelector(".field-error");
    if (!message) {
      if (note) note.remove();
      host.removeAttribute("data-invalid");
      return;
    }
    if (!note) {
      note = document.createElement("p");
      note.className = "field-error";
      host.appendChild(note);
    }
    note.textContent = message;
    host.setAttribute("data-invalid", "true");
  }

  var labelFor = function (name) {
    var checked = form.querySelector('input[name="' + name + '"]:checked');
    if (checked) {
      var span = checked.nextElementSibling;
      return span ? span.textContent.trim() : checked.value;
    }
    var field = form.elements[name];
    if (!field) return "";
    if (field.tagName === "SELECT") return field.options[field.selectedIndex].text;
    return (field.value || "").trim();
  };

  var summarise = function () {
    var rows = [
      ["Service", labelFor("service")],
      ["Vehicle or property", labelFor("subject")],
      ["Shade preference", labelFor("shade")],
      ["When", labelFor("timing")],
      ["Name", labelFor("name")],
      ["Phone", labelFor("phone")],
      ["Email", labelFor("email")],
      ["Notes", labelFor("notes")]
    ].filter(function (r) { return r[1]; });

    var dl = form.querySelector("[data-summary]");
    dl.innerHTML = rows.map(function (r) {
      return '<div class="summary__row"><dt>' + r[0] + "</dt><dd>" + escapeHtml(r[1]) + "</dd></div>";
    }).join("");

    var text = "Booking request, Quality Window Tinting\n\n" + rows.map(function (r) {
      return r[0] + ": " + r[1];
    }).join("\n");

    var sms = form.querySelector("[data-sms]");
    if (sms) sms.setAttribute("href", "sms:+19736876640?&body=" + encodeURIComponent(text));

    var mail = form.querySelector("[data-mail]");
    if (mail) {
      mail.setAttribute(
        "href",
        "mailto:?subject=" + encodeURIComponent("Booking request, Quality Window Tinting") +
        "&body=" + encodeURIComponent(text)
      );
    }

    var copy = form.querySelector("[data-copy]");
    if (copy) {
      copy.onclick = function () {
        var done = function () {
          var was = copy.textContent;
          copy.textContent = "Copied";
          setTimeout(function () { copy.textContent = was; }, 2200);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, done);
        } else {
          var ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand("copy"); } catch (e) {}
          document.body.removeChild(ta);
          done();
        }
      };
    }
  };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  next.addEventListener("click", function () {
    if (!valid()) return;
    if (index === steps.length - 1) {
      summarise();
      form.setAttribute("data-done", "true");
      form.querySelector("[data-review]").hidden = false;
      form.querySelector("[data-controls]").hidden = true;
      steps.forEach(function (s) { s.setAttribute("data-active", "false"); });
      segs.forEach(function (s) { s.setAttribute("data-done", "true"); });
      form.querySelector("[data-review] h2").setAttribute("tabindex", "-1");
      form.querySelector("[data-review] h2").focus({ preventScroll: true });
      form.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      return;
    }
    index += 1;
    paint();
  });

  back.addEventListener("click", function () {
    if (index === 0) return;
    index -= 1;
    paint();
  });

  var edit = form.querySelector("[data-edit]");
  if (edit) {
    edit.addEventListener("click", function () {
      form.removeAttribute("data-done");
      form.querySelector("[data-review]").hidden = true;
      form.querySelector("[data-controls]").hidden = false;
      index = steps.length - 1;
      paint();
    });
  }

  form.addEventListener("submit", function (e) { e.preventDefault(); });

  /* A service picked on another page arrives as ?service=... */
  var wanted = new URLSearchParams(window.location.search).get("service");
  if (wanted) {
    var pre = form.querySelector('input[name="service"][value="' + wanted.replace(/"/g, "") + '"]');
    if (pre) pre.checked = true;
  }

  paint();
})();
