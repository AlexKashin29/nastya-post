"use strict";
// Персик: the cat who lives on top of the interface. He is drawn in SVG,
// walks along the bottom of the screen, jumps onto cards, falls asleep when
// nobody plays, purrs when tapped and runs to where help is needed.
(function (root) {
  const C = {
    fur: "#9b98a6",
    furDark: "#77748a",
    stripe: "#6c697d",
    belly: "#c3c0cc",
    ear: "#eba9b7",
    eye: "#c9d46a",
    pupil: "#1d2133",
    nose: "#e58fa6",
    line: "#2c2f45",
  };

  // Clothes drawn around a head centre (0,0) of radius 34, then scaled.
  const WEAR = {
    bow: `<path d="M20 -30 6 -40 6 -20Z M20 -30 34 -40 34 -20Z" fill="#f2a7c3" stroke="#8a3560" stroke-width="2" stroke-linejoin="round"/><circle cx="20" cy="-30" r="4.5" fill="#e3779f" stroke="#8a3560" stroke-width="2"/>`,
    scarf: `<path d="M-27 22Q0 36 27 22V31Q0 45 -27 31Z" fill="#d6546f"/><path d="M9 35l7 17h-10l-3-15z" fill="#b63a56"/><path d="M-18 29v6M-9 32v6M0 33v6M9 32v6M18 29v6" stroke="#f7c4cf" stroke-width="2"/>`,
    glasses: `<g fill="#ffffff2e" stroke="#1d1424" stroke-width="3"><circle cx="-12" cy="-2" r="9"/><circle cx="12" cy="-2" r="9"/></g><path d="M-3 -4q3 -3 6 0M-21 -4l-8-3M21 -4l8-3" stroke="#1d1424" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    crown: `<path d="M-18 -30-14 -48-6 -37 0 -52 6 -37 14 -48 18 -30Z" fill="#f1cf76" stroke="#8a6420" stroke-width="2" stroke-linejoin="round"/><circle cx="0" cy="-36" r="3" fill="#e3779f"/>`,
  };
  const wear = (item, cx, cy, r) =>
    item && WEAR[item]
      ? `<g class="pk-wear" transform="translate(${cx} ${cy}) scale(${r / 34})">${WEAR[item]}</g>`
      : "";

  // Front-facing head, used for the cat that follows Nastya on the map.
  function face(item) {
    return `<svg viewBox="0 0 100 100" class="pk-face" aria-hidden="true">
      <path d="M22 38 26 6 48 26Z M78 38 74 6 52 26Z" fill="${C.fur}"/>
      <path d="M27 31 29 13 42 25Z M73 31 71 13 58 25Z" fill="${C.ear}"/>
      <ellipse cx="50" cy="56" rx="36" ry="32" fill="${C.fur}"/>
      <path d="M42 28q8-4 16 0M44 34q6-3 12 0" stroke="${C.stripe}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <ellipse cx="50" cy="70" rx="24" ry="14" fill="${C.belly}"/>
      <g class="pk-eyes"><ellipse cx="38" cy="54" rx="6.5" ry="7.5" fill="${C.eye}"/><ellipse cx="38" cy="54" rx="2" ry="5.8" fill="${C.pupil}"/><ellipse cx="62" cy="54" rx="6.5" ry="7.5" fill="${C.eye}"/><ellipse cx="62" cy="54" rx="2" ry="5.8" fill="${C.pupil}"/></g>
      <path d="M46 64h8l-4 4.5z" fill="${C.nose}"/>
      <path d="M50 68.5q-3 4.5-6.5 1.5M50 68.5q3 4.5 6.5 1.5" stroke="${C.line}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <path d="M30 66 12 62M30 70 13 72M70 66 88 62M70 70 87 72" stroke="#f3f0f7" stroke-width="1.3" opacity=".8"/>
      ${wear(item, 50, 56, 34)}
    </svg>`;
  }

  // Side view facing right. Groups are animated from CSS by state classes.
  function body(item) {
    return `<svg viewBox="0 0 120 96" class="pk-svg" aria-hidden="true">
      <g class="pk-stand">
        <path class="pk-tail" d="M28 60C14 56 8 40 14 24" stroke="${C.furDark}" stroke-width="9" fill="none" stroke-linecap="round"/>
        <g class="pk-leg pk-leg-b1"><rect x="30" y="64" width="9" height="26" rx="4.5" fill="${C.furDark}"/></g>
        <g class="pk-leg pk-leg-f1"><rect x="72" y="64" width="9" height="26" rx="4.5" fill="${C.furDark}"/></g>
        <g class="pk-torso">
          <ellipse cx="56" cy="62" rx="32" ry="18" fill="${C.fur}"/>
          <ellipse cx="60" cy="70" rx="22" ry="8" fill="${C.belly}"/>
          <path d="M40 46q4 6 0 12M50 44q4 7 0 14M60 44q4 7 0 13" stroke="${C.stripe}" stroke-width="3" fill="none" stroke-linecap="round"/>
        </g>
        <g class="pk-leg pk-leg-b2"><rect x="39" y="66" width="9" height="25" rx="4.5" fill="${C.fur}"/></g>
        <g class="pk-leg pk-leg-f2"><rect x="81" y="66" width="9" height="25" rx="4.5" fill="${C.fur}"/></g>
        <g class="pk-head">
          <path d="M74 34 77 12 90 27Z M92 27 103 11 105 34Z" fill="${C.fur}"/>
          <path d="M77 30 79 17 86 27Z M95 27 101 17 102 31Z" fill="${C.ear}"/>
          <ellipse cx="89" cy="42" rx="19" ry="17" fill="${C.fur}"/>
          <path d="M84 29q5-2 10 0" stroke="${C.stripe}" stroke-width="2" fill="none" stroke-linecap="round"/>
          <ellipse cx="90" cy="50" rx="13" ry="7.5" fill="${C.belly}"/>
          <g class="pk-eyes"><ellipse cx="82.5" cy="40.5" rx="3.6" ry="4.2" fill="${C.eye}"/><ellipse cx="82.5" cy="40.5" rx="1.1" ry="3.2" fill="${C.pupil}"/><ellipse cx="95.5" cy="40.5" rx="3.6" ry="4.2" fill="${C.eye}"/><ellipse cx="95.5" cy="40.5" rx="1.1" ry="3.2" fill="${C.pupil}"/></g>
          <path d="M86.5 46h5l-2.5 3z" fill="${C.nose}"/>
          <path d="M89 49q-2 3-4 1M89 49q2 3 4 1" stroke="${C.line}" stroke-width=".9" fill="none" stroke-linecap="round"/>
          <path d="M80 48 68 45M80 51 68 53M98 48 110 45M98 51 110 53" stroke="#f3f0f7" stroke-width=".8" opacity=".75"/>
          ${wear(item, 89, 42, 18)}
        </g>
      </g>
      <g class="pk-sleep">
        <path d="M24 80C6 82 4 60 22 58" stroke="${C.furDark}" stroke-width="9" fill="none" stroke-linecap="round"/>
        <ellipse cx="56" cy="74" rx="36" ry="17" fill="${C.fur}"/>
        <path d="M40 60q4 6 0 12M52 58q4 7 0 14" stroke="${C.stripe}" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M76 64 80 48 89 60Z M92 60 101 47 103 66Z" fill="${C.fur}"/>
        <ellipse cx="88" cy="72" rx="16" ry="13" fill="${C.fur}"/>
        <ellipse cx="89" cy="78" rx="11" ry="6" fill="${C.belly}"/>
        <path d="M80 71q3 2 6 0M92 71q3 2 6 0" stroke="${C.line}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        <path d="M86.8 75.5h4l-2 2.4z" fill="${C.nose}"/>
        <path d="M20 88Q56 96 92 86" stroke="${C.furDark}" stroke-width="8" fill="none" stroke-linecap="round"/>
        ${wear(item, 88, 72, 15)}
      </g>
    </svg>`;
  }

  // Standalone image (for canvas games): standing pose only, with xmlns.
  function sprite(item) {
    const svg = body(item)
      .replace(/<g class="pk-sleep">[\s\S]*?<\/g>\s*<\/svg>/, "</svg>")
      .replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ');
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  const Persik = {
    face,
    sprite,
    el: null,
    x: 0,
    y: 0,
    facing: 1,
    state: "sit",
    perched: false,
    busy: false,
    item: null,
    lines: { tap: ["Мрр."], idle: [], hint: ["Сюда!"] },
    onPet: () => {},
    timers: [],
    lastInput: Date.now(),
    host: null,
  };

  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const size = () =>
    innerWidth < 760 ? { w: 70, h: 56 } : { w: 92, h: 74 };

  function homeSpot() {
    const { w, h } = size();
    const nav = document.querySelector(".mobile-nav");
    const navTop =
      nav && getComputedStyle(nav).display !== "none"
        ? nav.getBoundingClientRect().top
        : innerHeight;
    // Phones: bottom-left, away from the claim buttons on the right.
    const x = innerWidth < 760 ? 10 : innerWidth - w - 14;
    return { x, y: navTop - h - 6 };
  }

  function render() {
    const P = Persik;
    P.el.querySelector(".pk-body").innerHTML = body(P.item);
  }

  function place(x, y, ms = 0, easing = "cubic-bezier(.45,.05,.35,1)") {
    const P = Persik,
      { w, h } = size();
    P.x = Math.max(4, Math.min(innerWidth - w - 4, x));
    P.y = Math.max(4, Math.min(innerHeight - h - 4, y));
    P.el.style.transition = ms ? `transform ${ms}ms ${easing}` : "none";
    P.el.style.transform = `translate(${P.x}px, ${P.y}px)`;
    P.el.style.width = `${w}px`;
    P.el.style.height = `${h}px`;
    fitBubble();
  }

  function setState(s) {
    const P = Persik;
    P.state = s;
    P.el.classList.remove("walk", "run", "jump", "sleep", "happy", "sit");
    P.el.classList.add(s);
  }
  function face_(dir) {
    Persik.facing = dir;
    Persik.el.classList.toggle("left", dir < 0);
  }

  // Walk or run in a straight line; resolves when he arrives.
  function moveTo(x, y, { run = false } = {}) {
    const P = Persik;
    if (reduced()) {
      place(x, y);
      setState("sit");
      return Promise.resolve();
    }
    const dist = Math.hypot(x - P.x, y - P.y);
    if (dist < 4) return Promise.resolve();
    face_(x >= P.x ? 1 : -1);
    setState(run ? "run" : "walk");
    const ms = Math.min(2600, (dist / (run ? 520 : 150)) * 1000);
    place(x, y, ms, "linear");
    fitBubble();
    return new Promise((r) =>
      later(() => {
        setState("sit");
        r();
      }, ms),
    );
  }

  // A jump along an arc, done with the Web Animations API on transform only.
  function jumpTo(x, y) {
    const P = Persik,
      { w, h } = size();
    const tx = Math.max(4, Math.min(innerWidth - w - 4, x)),
      ty = Math.max(4, Math.min(innerHeight - h - 4, y));
    if (reduced() || !P.el.animate) {
      place(tx, ty);
      return Promise.resolve();
    }
    face_(tx >= P.x ? 1 : -1);
    setState("jump");
    const peak = Math.min(P.y, ty) - 70;
    const frames = [0, 0.25, 0.5, 0.75, 1].map((t) => {
      const px = P.x + (tx - P.x) * t;
      const py = (1 - t) * (1 - t) * P.y + 2 * (1 - t) * t * peak + t * t * ty;
      return { transform: `translate(${px}px, ${py}px)` };
    });
    P.el.style.transition = "none";
    const anim = P.el.animate(frames, { duration: 620, easing: "ease-in-out" });
    P.x = tx;
    P.y = ty;
    P.el.style.transform = `translate(${tx}px, ${ty}px)`;
    fitBubble();
    return anim.finished
      .catch(() => {})
      .then(() => {
        setState("sit");
      });
  }

  // Sit on top of an element (a card, a map cell, a puzzle piece).
  async function goToEl(target, { run = true, line } = {}) {
    const P = Persik;
    if (!P.el || !target?.getBoundingClientRect) return;
    const r = target.getBoundingClientRect(),
      { w, h } = size();
    if (r.bottom < 0 || r.top > innerHeight) return;
    P.busy = true;
    wake();
    const x = r.left + r.width / 2 - w / 2,
      y = r.top - h + Math.min(14, r.height * 0.3);
    const far = Math.abs(y - P.y) > 40;
    if (far) await jumpTo(x, y);
    else await moveTo(x, y, { run });
    P.perched = true;
    if (line) say(line);
    later(() => (P.busy = false), 600);
  }

  async function goHome() {
    const P = Persik,
      s = homeSpot();
    P.perched = false;
    if (Math.abs(s.y - P.y) > 40) await jumpTo(s.x, s.y);
    else await moveTo(s.x, s.y);
  }

  let bubbleTimer;
  function say(text, ms = 2600) {
    const P = Persik;
    if (!P.el || !text) return;
    const b = P.el.querySelector(".pk-bubble");
    b.textContent = text;
    b.hidden = false;
    fitBubble();
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => (b.hidden = true), ms);
  }

  // Keep the speech bubble inside the screen wherever he stands.
  function fitBubble() {
    const P = Persik,
      b = P.el?.querySelector(".pk-bubble");
    if (!b || b.hidden) return;
    const { w } = size();
    const bw = b.offsetWidth;
    let left = w / 2 - bw / 2;
    const min = 8 - P.x,
      max = innerWidth - 8 - P.x - bw;
    left = Math.max(min, Math.min(max, left));
    b.style.left = `${left}px`;
  }

  function later(fn, ms) {
    const t = setTimeout(fn, ms);
    Persik.timers.push(t);
    return t;
  }

  function wake() {
    Persik.lastInput = Date.now();
    if (Persik.state === "sleep") setState("sit");
  }

  // Idle life: wander, perch, groom, and fall asleep after a quiet minute.
  function tick() {
    const P = Persik;
    later(tick, 6000 + Math.random() * 9000);
    if (!P.el || P.busy || P.calm || document.hidden || reduced()) return;
    if (Date.now() - P.lastInput > 75000) {
      if (P.state !== "sleep") {
        if (P.perched) goHome().then(() => setState("sleep"));
        else setState("sleep");
      }
      return;
    }
    if (P.state === "sleep") return;
    const roll = Math.random();
    if (roll < 0.45) {
      const { w } = size(),
        s = homeSpot();
      P.perched = false;
      moveTo(16 + Math.random() * (innerWidth - w - 32), s.y);
    } else if (roll < 0.75) {
      const perches = [
        ...(P.host || document).querySelectorAll("[data-perch]"),
      ].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.top > 70 && r.top < innerHeight - 140 && r.width > 80;
      });
      if (perches.length)
        goToEl(perches[Math.floor(Math.random() * perches.length)], {
          run: false,
        });
    } else if (roll < 0.85 && P.lines.idle.length) {
      say(P.lines.idle[Math.floor(Math.random() * P.lines.idle.length)]);
    } else {
      P.el.classList.add("groom");
      later(() => P.el.classList.remove("groom"), 1800);
    }
  }

  function hearts() {
    if (reduced()) return;
    const P = Persik;
    for (let i = 0; i < 3; i++) {
      const e = document.createElement("span");
      e.className = "pk-heart";
      e.textContent = "♥";
      e.style.left = `${30 + i * 18}%`;
      e.style.animationDelay = `${i * 0.12}s`;
      P.el.append(e);
      setTimeout(() => e.remove(), 1500);
    }
  }

  function tap(e) {
    e.stopPropagation();
    const P = Persik;
    if (P.state === "sleep") {
      wake();
      say("Мяу? Я не спал.");
      return;
    }
    wake();
    hearts();
    say(P.lines.tap[Math.floor(Math.random() * P.lines.tap.length)]);
    if (!reduced() && P.el.animate)
      P.el
        .querySelector(".pk-body")
        .animate(
          [
            { transform: "translateY(0)" },
            { transform: "translateY(-22px) rotate(-6deg)" },
            { transform: "translateY(0)" },
          ],
          { duration: 420, easing: "ease-out" },
        );
    P.onPet(P.el);
  }

  Persik.init = function ({ lines, onPet, item }) {
    const P = Persik;
    if (P.el) return;
    P.lines = { ...P.lines, ...lines };
    P.onPet = onPet || P.onPet;
    P.item = item || null;
    P.el = document.createElement("div");
    P.el.className = "persik sit";
    P.el.innerHTML = `<button class="pk-body" aria-label="Персик. Погладить"></button><span class="pk-bubble" role="status" hidden></span>`;
    document.body.append(P.el);
    render();
    P.el.querySelector(".pk-body").addEventListener("click", tap);
    const s = homeSpot();
    place(s.x, s.y);
    ["pointerdown", "keydown"].forEach((t) =>
      addEventListener(t, wake, { passive: true }),
    );
    addEventListener(
      "scroll",
      () => {
        if (P.perched && !P.busy) goHome();
      },
      { passive: true },
    );
    let resizeT;
    addEventListener("resize", () => {
      clearTimeout(resizeT);
      resizeT = setTimeout(() => {
        const h = homeSpot();
        place(h.x, h.y);
        P.perched = false;
      }, 150);
    });
    later(tick, 4000);
  };
  Persik.setOutfit = (item) => {
    Persik.item = item || null;
    if (Persik.el) render();
  };
  // Show him inside an open <dialog> (top layer) or back on the page.
  Persik.attach = (host) => {
    const P = Persik;
    if (!P.el) return;
    P.host = host || null;
    (host || document.body).append(P.el);
  };
  // Sit on a spot for a moment, then walk back home so nothing stays covered.
  Persik.visit = async (target, line, ms = 2600) => {
    await goToEl(target, { line });
    clearTimeout(Persik.visitTimer);
    Persik.visitTimer = setTimeout(() => {
      if (Persik.perched) goHome();
    }, ms);
  };
  Persik.say = say;
  Persik.goToEl = goToEl;
  Persik.goHome = goHome;
  Persik.hearts = hearts;
  Persik.wake = wake;
  Persik.celebrate = () => {
    const P = Persik;
    if (!P.el) return;
    wake();
    hearts();
    if (!reduced() && P.el.animate) {
      setState("happy");
      later(() => setState("sit"), 1200);
    }
  };

  root.Persik = Persik;
})(typeof self !== "undefined" ? self : this);
