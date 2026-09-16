/* ============================================================================
   THE EFFORT LOOP — this build's signature move.

   One oscillator for the whole page, driven by scroll VELOCITY rather than
   scroll position. Scroll hard and the page works harder with you: the rate
   readout in the chrome climbs through its zones, every blob and ring breathes
   faster and wider, the accent warms. Stop, and it recovers back toward resting
   over several seconds, visibly, the way a person does. At the close the page
   hands back a summary of the session the visitor just did.

   It publishes three custom properties on <html> and nothing else styles
   itself:

     --sh-effort   0 … 1     how hard the page is working
     --sh-breath  -1 … 1     the shared breath oscillator
     --sh-rate     58 … 150  beats per minute, for the readout

   The engine is untouched; this is page JS reading page scroll.
   ========================================================================== */
(() => {
  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const REST = 58, MAX = 150;
  const el = {
    rate: document.getElementById("rate"),
    zone: document.getElementById("zone"),
    word: document.getElementById("breathword"),
    time: document.getElementById("s-time"),
    peak: document.getElementById("s-peak"),
    now:  document.getElementById("s-now"),
  };

  let effort = 0, phase = 0, peak = REST;
  let lastY = scrollY, lastT = performance.now(), lastPaint = 0;
  const started = performance.now();

  const zoneOf = (r) =>
    r < 72 ? "resting" : r < 96 ? "easy" : r < 118 ? "steady" : r < 136 ? "working" : "peak";

  const clock = (ms) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  /* Text is rewritten at ~8fps. The custom properties are written every frame;
     the DOM is not, because a digit changing sixty times a second is unreadable
     and costs a layout each time. */
  function paint(rate, now) {
    if (now - lastPaint < 120) return;
    lastPaint = now;
    const r = Math.round(rate);
    if (el.rate) el.rate.textContent = r;
    if (el.zone) el.zone.textContent = zoneOf(r);
    if (el.word) el.word.textContent = Math.sin(phase) >= 0 ? "inhale" : "exhale";
    if (el.time) el.time.textContent = clock(now - started);
    if (el.peak) el.peak.textContent = Math.round(peak);
    if (el.now)  el.now.textContent = r;
  }

  function frame(now) {
    const dt = Math.min(0.1, (now - lastT) / 1000) || 0.016;
    lastT = now;

    if (!reduced) {
      /* Velocity in viewport-heights per second: screen-size independent, so a
         phone and a monitor read the same effort from the same gesture. */
      const y = scrollY;
      const speed = Math.abs(y - lastY) / dt / innerHeight;
      lastY = y;

      const target = Math.min(1, speed / 1.9);
      /* Rises in about a third of a second, recovers over about six. Recovery
         being much slower than exertion is the whole character of it. */
      effort += (target - effort) * (target > effort ? 0.16 : 0.009);

      /* Breathing: twelve a minute at rest, up to about thirty under load. */
      phase += ((12 + effort * 18) / 60) * Math.PI * 2 * dt;
      root.style.setProperty("--sh-breath", Math.sin(phase).toFixed(4));
      root.style.setProperty("--sh-effort", effort.toFixed(4));
    }

    const rate = REST + effort * (MAX - REST);
    if (rate > peak) peak = rate;
    root.style.setProperty("--sh-rate", rate.toFixed(1));
    paint(rate, now);

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
