"use strict";
// Arcade: six short games for the "Игры" tab. Each game draws into a host
// element and calls ctx.end(score) when the run is over. Rules that can be
// tested without a screen live in arcade-logic.js.
(function (root) {
  const L = root.ArcadeLogic;

  // Canvas scaled to the host width with a fixed logical size.
  function canvas(host, W, H) {
    const cv = document.createElement("canvas");
    cv.className = "arcade-canvas";
    cv.setAttribute("role", "img");
    host.append(cv);
    const g = cv.getContext("2d");
    const fit = () => {
      const dpr = Math.min(2, root.devicePixelRatio || 1);
      const cssW = Math.min(host.clientWidth || W, 520);
      cv.style.width = `${cssW}px`;
      cv.style.height = `${(cssW * H) / W}px`;
      cv.width = Math.round(cssW * dpr);
      cv.height = Math.round(((cssW * H) / W) * dpr);
      g.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
    };
    fit();
    root.addEventListener("resize", fit);
    const toLocal = (e) => {
      const r = cv.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
    };
    return { cv, g, W, H, toLocal, off: () => root.removeEventListener("resize", fit) };
  }

  // Animation loop that pauses when the tab is hidden.
  function loop(step) {
    let raf,
      last = performance.now(),
      alive = true;
    const tick = (now) => {
      if (!alive) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!document.hidden) step(dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }

  const COLORS = {
    ink: "#1b2352",
    night: "#222b62",
    dusk: "#2a3471",
    line: "#3a4589",
    lantern: "#ffcf5a",
    rose: "#ff8fb1",
    moon: "#c6d0ff",
    paper: "#f6efe6",
  };

  function star(g, x, y, r, color) {
    g.fillStyle = color;
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 - Math.PI / 2;
      const rr = i % 2 ? r * 0.38 : r;
      g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.closePath();
    g.fill();
  }

  function heartPath(g, x, y, s) {
    g.beginPath();
    g.moveTo(x, y + s * 0.35);
    g.bezierCurveTo(x - s, y - s * 0.4, x - s * 0.4, y - s, x, y - s * 0.4);
    g.bezierCurveTo(x + s * 0.4, y - s, x + s, y - s * 0.4, x, y + s * 0.35);
  }

  function skyline(g, W, H, offset, base, color, seed) {
    g.fillStyle = color;
    const step = 46;
    const start = -((offset % step) + step);
    for (let x = start, k = Math.floor(offset / step); x < W + step; x += step, k++) {
      const n = Math.abs(Math.sin((k + seed) * 12.9898) * 43758.5453) % 1;
      const hgt = 40 + n * 70;
      g.fillRect(x, base - hgt, step - 6, hgt + 200);
      if (n > 0.7) {
        g.beginPath();
        g.moveTo(x + (step - 6) / 2, base - hgt - 22);
        g.lineTo(x + step - 6, base - hgt);
        g.lineTo(x, base - hgt);
        g.fill();
      }
    }
  }

  // ---------- 1. Прыжки по крышам ----------
  function jumper(host, ctx) {
    const c = canvas(host, 360, 480);
    c.cv.setAttribute("aria-label", "Персик бежит по крышам. Нажми, чтобы прыгнуть.");
    const img = new Image();
    img.src = ctx.persik.sprite(ctx.outfit);
    const rand = Math.random;
    let roofs, stars, cat, dist, speed, collected, started, over, sparkles;
    const reset = () => {
      roofs = [{ x: 0, w: 520, y: 380, k: 0 }];
      stars = [];
      sparkles = [];
      cat = { y: 380, vy: 0, jumps: 2, onRoof: true };
      dist = 0;
      speed = 230;
      collected = 0;
      started = false;
      over = false;
      while (roofs[roofs.length - 1].x < 900) addRoof();
      ctx.status("Нажми, чтобы начать");
    };
    const addRoof = () => {
      const prev = roofs[roofs.length - 1];
      const gap = 56 + rand() * 60 + Math.min(70, (speed - 230) * 0.25);
      const w = 120 + rand() * 140;
      const y = Math.max(270, Math.min(420, prev.y + (rand() - 0.5) * 100));
      const roof = { x: prev.x + prev.w + gap, w, y, k: prev.k + 1 };
      roofs.push(roof);
      if (rand() < 0.75) {
        const n = 1 + Math.floor(rand() * 3);
        for (let i = 0; i < n; i++)
          stars.push({ x: roof.x + 30 + i * 34, y: roof.y - 60 - rand() * 60, got: false });
      }
    };
    const score = () => Math.floor(dist / 10) + collected * 25;
    const jump = () => {
      if (over) return;
      if (!started) {
        started = true;
        ctx.status("");
      }
      if (cat.jumps > 0) {
        cat.vy = cat.jumps === 2 ? -600 : -520;
        cat.jumps--;
        cat.onRoof = false;
        ctx.sfx("step", cat.jumps ? 1.4 : 1.7);
      }
    };
    const onDown = (e) => {
      e.preventDefault();
      jump();
    };
    const onKey = (e) => {
      if (e.code === "Space" || e.key === "ArrowUp" || e.key === "w") {
        e.preventDefault();
        jump();
      }
    };
    c.cv.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    reset();
    const CAT_X = 70;
    const stop = loop((dt) => {
      const { g, W, H } = c;
      if (started && !over) {
        speed = Math.min(520, speed + dt * 7);
        dist += speed * dt;
        cat.vy += 1750 * dt;
        const prevBottom = cat.y;
        cat.y += cat.vy * dt;
        cat.onRoof = false;
        for (const r of roofs) {
          const sx = r.x - dist;
          if (CAT_X + 34 > sx && CAT_X + 14 < sx + r.w && prevBottom <= r.y + 2 && cat.y >= r.y && cat.vy >= 0) {
            cat.y = r.y;
            cat.vy = 0;
            cat.jumps = 2;
            cat.onRoof = true;
          }
        }
        for (const s of stars) {
          if (s.got) continue;
          const sx = s.x - dist;
          if (Math.abs(sx - (CAT_X + 24)) < 26 && Math.abs(s.y - (cat.y - 24)) < 30) {
            s.got = true;
            collected++;
            ctx.sfx("coin", 1 + Math.min(collected, 12) * 0.03);
            ctx.buzz(8);
            sparkles.push({ x: sx, y: s.y, t: 0 });
          }
        }
        while (roofs[roofs.length - 1].x - dist < W + 200) addRoof();
        roofs = roofs.filter((r) => r.x + r.w - dist > -60);
        stars = stars.filter((s) => s.x - dist > -40);
        if (cat.y > H + 60) {
          over = true;
          ctx.sfx("no");
          ctx.end(score());
        }
      }
      // Sky, moon, two layers of skyline.
      const sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, COLORS.ink);
      sky.addColorStop(1, "#2a3471");
      g.fillStyle = sky;
      g.fillRect(0, 0, W, H);
      g.fillStyle = "#fffbe8";
      g.beginPath();
      g.arc(290, 70, 26, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = COLORS.ink;
      g.beginPath();
      g.arc(302, 62, 24, 0, Math.PI * 2);
      g.fill();
      for (let i = 0; i < 24; i++) {
        const x = (i * 97 - dist * 0.03) % W;
        g.fillStyle = "#ffffff55";
        g.fillRect((x + W) % W, (i * 53) % 200, 1.5, 1.5);
      }
      skyline(g, W, H, dist * 0.15, 330, "#202963", 3);
      skyline(g, W, H, dist * 0.35, 380, "#151c46", 9);
      // Roofs with lit windows.
      for (const r of roofs) {
        const sx = r.x - dist;
        g.fillStyle = "#232c66";
        g.fillRect(sx, r.y, r.w, H - r.y);
        g.fillStyle = "#3a4589";
        g.fillRect(sx - 4, r.y - 6, r.w + 8, 8);
        for (let wy = r.y + 22; wy < H; wy += 34)
          for (let wx = sx + 16; wx < sx + r.w - 16; wx += 30) {
            const lit = Math.sin(r.k * 7.1 + wx * 0.37 + wy * 1.3) > 0.1;
            g.fillStyle = lit ? "#ffcf5acc" : "#ffffff10";
            g.fillRect(wx, wy, 12, 16);
          }
      }
      for (const s of stars) if (!s.got) star(g, s.x - dist, s.y, 10, "#ffd9a0");
      for (const p of sparkles) {
        p.t += dt;
        g.globalAlpha = Math.max(0, 1 - p.t * 2);
        star(g, p.x, p.y - p.t * 60, 8 + p.t * 20, COLORS.paper);
        g.globalAlpha = 1;
      }
      sparkles = sparkles.filter((p) => p.t < 0.5);
      // Persik.
      const bob = cat.onRoof && started && !over ? Math.sin(dist * 0.08) * 2 : 0;
      g.save();
      g.translate(CAT_X + 30, cat.y - 22 + bob);
      if (!cat.onRoof) g.rotate(Math.max(-0.35, Math.min(0.35, cat.vy / 1600)));
      if (img.complete && img.naturalWidth) g.drawImage(img, -36, -28, 72, 58);
      else {
        g.fillStyle = "#9b98a6";
        g.fillRect(-20, -14, 40, 28);
      }
      g.restore();
      // Score.
      g.fillStyle = COLORS.paper;
      g.font = "400 18px Dela Gothic One, system-ui, sans-serif";
      g.textAlign = "right";
      g.fillText(String(score()), W - 16, 32);
      g.textAlign = "left";
      g.font = "500 13px Golos Text, system-ui, sans-serif";
      g.fillStyle = COLORS.lantern;
      g.fillText(`звёзд ${collected}`, 16, 30);
      if (!started) {
        g.fillStyle = "#1b2352aa";
        g.fillRect(0, H / 2 - 40, W, 80);
        g.fillStyle = COLORS.paper;
        g.textAlign = "center";
        g.font = "400 17px Dela Gothic One, system-ui, sans-serif";
        g.fillText("Нажми, чтобы прыгнуть", W / 2, H / 2 + 6);
        g.textAlign = "left";
      }
    });
    return {
      restart: reset,
      cleanup: () => {
        stop();
        c.off();
        document.removeEventListener("keydown", onKey);
      },
    };
  }

  // ---------- 2. Звёздное слияние (2048) ----------
  function merge(host, ctx) {
    const names = ctx.texts.merge;
    host.innerHTML = `<div class="merge-wrap"><div class="merge-score"><span>Счёт <b id="m-score">0</b></span><span>Лучшая ступень <b id="m-top">${names[0]}</b></span></div><div class="merge-board" id="m-board" tabindex="0" aria-label="Поле 4 на 4. Стрелки или свайп."></div></div>`;
    const board = host.querySelector("#m-board");
    let grid, score, over, top;
    const reset = () => {
      grid = Array(16).fill(0);
      score = 0;
      over = false;
      top = 1;
      grid = L.addRandom(grid, Math.random).grid;
      grid = L.addRandom(grid, Math.random).grid;
      draw([], -1);
      ctx.status("Проведи пальцем по полю или жми стрелки.");
    };
    const draw = (merged, born) => {
      board.innerHTML = grid
        .map((v, i) => {
          if (!v) return `<div class="m-cell"></div>`;
          const cls = `m-tile lv${Math.min(v, 11)}${merged.includes(i) ? " merged" : ""}${i === born ? " born" : ""}`;
          return `<div class="m-cell"><div class="${cls}"><b>${names[Math.min(v, 11) - 1]}</b><small>${2 ** v}</small></div></div>`;
        })
        .join("");
      host.querySelector("#m-score").textContent = score;
      host.querySelector("#m-top").textContent = names[Math.min(top, 11) - 1];
    };
    const go = (dir) => {
      if (over) return;
      const r = L.slide(grid, dir);
      if (!r.moved) {
        ctx.sfx("no");
        return;
      }
      grid = r.grid;
      score += r.gained;
      const add = L.addRandom(grid, Math.random);
      grid = add.grid;
      const newTop = Math.max(...grid);
      if (newTop > top) {
        top = newTop;
        if (top >= 5) ctx.persik.say(`${names[top - 1]}!`, 1600);
        if (top >= 11) ctx.flag("universe");
      }
      ctx.sfx(r.merged.length ? "spark" : "step", 1 + Math.min(r.merged.length, 4) * 0.08);
      if (r.merged.length) ctx.buzz(8);
      draw(ctx.reduced() ? [] : r.merged, ctx.reduced() ? -1 : add.at);
      if (!L.canMove(grid)) {
        over = true;
        ctx.end(score);
      }
    };
    let start = null;
    board.addEventListener("pointerdown", (e) => (start = { x: e.clientX, y: e.clientY }));
    board.addEventListener("pointerup", (e) => {
      if (!start) return;
      const dx = e.clientX - start.x,
        dy = e.clientY - start.y;
      start = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      go(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
    });
    const onKey = (e) => {
      const dir = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" }[e.key];
      if (dir) {
        e.preventDefault();
        go(dir);
      }
    };
    document.addEventListener("keydown", onKey);
    reset();
    board.focus({ preventScroll: true });
    return { restart: reset, cleanup: () => document.removeEventListener("keydown", onKey), move: go };
  }

  // ---------- 3. Сокровища Персика (три в ряд) ----------
  function match(host, ctx) {
    const W = 7,
      H = 7,
      KINDS = 5,
      MOVES = 25;
    const KIND = [
      { name: "Рыбка", color: "#8fc7f2", svg: '<path d="M3 12c3-5 9-6 13-2l5-3-1 5 1 5-5-3c-4 4-10 3-13-2z" fill="currentColor"/><circle cx="8" cy="11" r="1.3" fill="#1b2352"/>' },
      { name: "Клубок", color: "#ff8fb1", svg: '<circle cx="12" cy="12" r="8" fill="currentColor"/><path d="M6 8c4 1 9 6 10 11M5 13c5-1 9 2 11 6M10 4c3 3 8 4 10 9" stroke="#1b2352" stroke-opacity=".35" stroke-width="1.4" fill="none"/>' },
      { name: "Сердце", color: "#f27a8a", svg: '<path d="M12 20s-8-4.8-8-10.3A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 8 2.7C20 15.2 12 20 12 20z" fill="currentColor"/>' },
      { name: "Звезда", color: "#f2c27a", svg: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="currentColor"/>' },
      { name: "Луна", color: "#c6d0ff", svg: '<path d="M19 14.5A8 8 0 1 1 9.5 4.5a6.4 6.4 0 0 0 9.5 10z" fill="currentColor"/>' },
    ];
    host.innerHTML = `<div class="match-wrap"><div class="merge-score"><span>Счёт <b id="x-score">0</b></span><span>Ходов <b id="x-moves">${MOVES}</b></span></div><div class="match-board" id="x-board"></div></div>`;
    const el = host.querySelector("#x-board");
    let board, tiles, moves, score, busy, pick, nextId, over;
    const place = (t, i) => {
      t.i = i;
      t.el.style.setProperty("--c", i % W);
      t.el.style.setProperty("--r", Math.floor(i / W));
    };
    const make = (kind, i, fromRow) => {
      const b = document.createElement("button");
      b.className = "x-tile";
      b.style.color = KIND[kind].color;
      b.setAttribute("aria-label", KIND[kind].name);
      b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${KIND[kind].svg}</svg>`;
      const t = { id: nextId++, kind, el: b, i };
      if (fromRow !== undefined) {
        b.style.setProperty("--c", i % W);
        b.style.setProperty("--r", fromRow);
        b.classList.add("no-anim");
        el.append(b);
        void b.offsetWidth;
        b.classList.remove("no-anim");
        place(t, i);
      } else {
        el.append(b);
        place(t, i);
      }
      b.addEventListener("pointerdown", (e) => onDown(e, t));
      b.addEventListener("click", () => onTap(t));
      return t;
    };
    const wait = (ms) => new Promise((r) => setTimeout(r, ctx.reduced() ? 0 : ms));
    const sync = () => {
      host.querySelector("#x-score").textContent = score;
      host.querySelector("#x-moves").textContent = moves;
    };
    const reset = () => {
      el.innerHTML = "";
      nextId = 0;
      moves = MOVES;
      score = 0;
      busy = false;
      pick = null;
      over = false;
      board = L.freshBoard(W, H, KINDS, Math.random);
      tiles = board.map((k, i) => make(k, i));
      sync();
      ctx.status("Поменяй местами два соседних.");
    };
    const select = (t) => {
      tiles.forEach((x) => x?.el.classList.remove("picked"));
      pick = t;
      if (t) t.el.classList.add("picked");
    };
    const onTap = (t) => {
      if (busy || over || suppress) return;
      if (!pick) return select(t);
      if (pick === t) return select(null);
      if (L.adjacent(pick.i, t.i, W)) {
        const a = pick;
        select(null);
        trySwap(a, t);
      } else select(t);
    };
    let downAt = null,
      suppress = false;
    const onDown = (e, t) => {
      downAt = { x: e.clientX, y: e.clientY, t };
    };
    const onUp = (e) => {
      if (!downAt) return;
      const dx = e.clientX - downAt.x,
        dy = e.clientY - downAt.y,
        t = downAt.t;
      downAt = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 18 || busy || over) return;
      suppress = true;
      setTimeout(() => (suppress = false), 50);
      const c = t.i % W,
        r = Math.floor(t.i / W);
      let j = -1;
      if (Math.abs(dx) > Math.abs(dy)) j = dx > 0 && c < W - 1 ? t.i + 1 : dx < 0 && c > 0 ? t.i - 1 : -1;
      else j = dy > 0 && r < H - 1 ? t.i + W : dy < 0 && r > 0 ? t.i - W : -1;
      if (j >= 0) {
        select(null);
        trySwap(t, tiles[j]);
      }
    };
    document.addEventListener("pointerup", onUp);
    const trySwap = async (a, b) => {
      busy = true;
      const ia = a.i,
        ib = b.i;
      const ok = L.swapMakesMatch(board, W, H, ia, ib);
      swap(ia, ib);
      ctx.sfx("step", 1.2);
      await wait(180);
      if (!ok) {
        swap(ia, ib);
        ctx.sfx("no");
        await wait(180);
        busy = false;
        return;
      }
      moves--;
      sync();
      await resolve();
      busy = false;
      if (moves <= 0) {
        over = true;
        ctx.end(score);
      } else if (!L.hasMoves(board, W, H)) {
        ctx.persik.say("Перемешаю!", 1400);
        await wait(300);
        tiles.forEach((t) => t.el.remove());
        board = L.freshBoard(W, H, KINDS, Math.random);
        tiles = board.map((k, i) => make(k, i, Math.floor(i / W) - H));
      }
    };
    const swap = (ia, ib) => {
      [board[ia], board[ib]] = [board[ib], board[ia]];
      [tiles[ia], tiles[ib]] = [tiles[ib], tiles[ia]];
      place(tiles[ia], ia);
      place(tiles[ib], ib);
    };
    const resolve = async () => {
      let combo = 0;
      for (;;) {
        const hits = L.findMatches(board, W, H);
        if (!hits.length) break;
        combo++;
        score += hits.length * 10 * combo;
        sync();
        ctx.sfx("spark", 0.9 + combo * 0.1);
        ctx.buzz(10);
        if (combo >= 3) ctx.persik.say(`Комбо x${combo}!`, 1200);
        hits.forEach((i) => tiles[i].el.classList.add("pop"));
        await wait(200);
        hits.forEach((i) => {
          tiles[i].el.remove();
          tiles[i] = null;
          board[i] = -1;
        });
        const fall = L.collapse(board, W, H);
        board = fall.board;
        const moved = [...tiles];
        for (const [from] of fall.moves) moved[from] = null;
        for (const [from, to] of fall.moves) moved[to] = tiles[from];
        tiles = moved;
        tiles.forEach((t, i) => t && place(t, i));
        // Refill each column from above.
        for (let c = 0; c < W; c++) {
          const empty = [];
          for (let r = 0; r < H; r++) if (board[r * W + c] < 0) empty.push(r);
          empty.forEach((r) => {
            const i = r * W + c;
            const kind = Math.floor(Math.random() * KINDS);
            board[i] = kind;
            tiles[i] = make(kind, i, r - empty.length);
          });
        }
        await wait(260);
      }
    };
    reset();
    return {
      restart: reset,
      cleanup: () => document.removeEventListener("pointerup", onUp),
    };
  }

  // ---------- 4. Слово дня ----------
  function word(host, ctx) {
    const ROWS = 6,
      LEN = 5;
    const saved = ctx.wordState();
    const practice = saved.done;
    const answer = practice ? ctx.randomWord() : saved.answer;
    let guesses = practice ? [] : [...saved.guesses];
    let cur = "",
      over = false;
    const keys = ["йцукенгшщзхъ", "фывапролджэ", "<ячсмитьбю>"];
    host.innerHTML = `<div class="word-wrap">${practice ? '<p class="word-mode">Слово дня уже отгадано. Это тренировка, без пыли.</p>' : ""}<div class="w-grid" id="w-grid" aria-live="polite"></div><div class="w-keys" id="w-keys">${keys
      .map(
        (row) =>
          `<div class="w-row">${[...row]
            .map((k) =>
              k === "<"
                ? '<button class="w-key wide" data-k="enter">Ввод</button>'
                : k === ">"
                  ? '<button class="w-key wide" data-k="back" aria-label="Стереть">⌫</button>'
                  : `<button class="w-key" data-k="${k}">${k}</button>`,
            )
            .join("")}</div>`,
      )
      .join("")}</div></div>`;
    const grid = host.querySelector("#w-grid");
    const draw = (shakeRow = -1, reveal = -1) => {
      const rows = [];
      for (let r = 0; r < ROWS; r++) {
        const g = guesses[r];
        const text = g || (r === guesses.length ? cur : "");
        const marks = g ? L.scoreWord(g, answer) : [];
        rows.push(
          `<div class="w-line${r === shakeRow ? " shake" : ""}">${[...Array(LEN).keys()]
            .map((i) => `<span class="w-cell ${marks[i] || (text[i] ? "typed" : "")}${r === reveal ? " flip" : ""}" style="--i:${i}">${text[i] || ""}</span>`)
            .join("")}</div>`,
        );
      }
      grid.innerHTML = rows.join("");
      const best = {};
      const rank = { g: 3, y: 2, b: 1 };
      for (const g of guesses)
        L.scoreWord(g, answer).forEach((m, i) => {
          const ch = L.norm(g)[i];
          if (!best[ch] || rank[m] > rank[best[ch]]) best[ch] = m;
        });
      host.querySelectorAll(".w-key").forEach((b) => {
        const k = b.dataset.k;
        b.classList.remove("g", "y", "b");
        if (best[k]) b.classList.add(best[k]);
      });
    };
    const finish = (won) => {
      over = true;
      if (!practice) ctx.saveWord({ guesses, done: true, won });
      ctx.status(won ? `Отгадала за ${guesses.length}.` : `Это было слово "${answer}".`);
      ctx.end(won ? ROWS + 1 - guesses.length : 0, { won, practice, tries: guesses.length, answer });
    };
    const press = (k) => {
      if (over) return;
      if (k === "back") cur = cur.slice(0, -1);
      else if (k === "enter") {
        if (!L.isWord(cur, LEN)) {
          ctx.sfx("no");
          ctx.status("Нужно пять букв.");
          draw(guesses.length);
          return;
        }
        guesses.push(L.norm(cur));
        cur = "";
        if (!practice) ctx.saveWord({ guesses, done: false });
        const won = guesses[guesses.length - 1] === L.norm(answer);
        ctx.sfx(won ? "win" : "step");
        draw(-1, guesses.length - 1);
        if (won || guesses.length === ROWS) setTimeout(() => finish(won), ctx.reduced() ? 0 : 700);
        else ctx.status(`Осталось попыток: ${ROWS - guesses.length}.`);
        return;
      } else if (cur.length < LEN) cur += k;
      ctx.sfx("step", 1.3);
      draw();
    };
    host.querySelector("#w-keys").addEventListener("click", (e) => {
      const b = e.target.closest("[data-k]");
      if (b) press(b.dataset.k);
    });
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase().replace("ё", "е");
      if (k === "enter") press("enter");
      else if (k === "backspace") press("back");
      else if (/^[а-я]$/.test(k)) press(k);
      else return;
      e.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    draw();
    ctx.status(practice ? "Тренировка." : guesses.length ? `Осталось попыток: ${ROWS - guesses.length}.` : "Первое слово - любое из пяти букв.");
    if (!practice && guesses.length && (guesses.includes(L.norm(answer)) || guesses.length === ROWS))
      finish(guesses.includes(L.norm(answer)));
    return {
      cleanup: () => document.removeEventListener("keydown", onKey),
      type: (w) => {
        [...w].forEach(press);
        press("enter");
      },
      answer: () => answer,
    };
  }

  // ---------- 5. Где Персик? ----------
  function boxes(host, ctx) {
    host.innerHTML = `<div class="boxes-wrap"><div class="merge-score"><span>Раунд <b id="b-round">1</b></span></div><div class="box-row" id="b-row"></div><button class="btn" id="b-go">Спрятать Персика</button></div>`;
    const row = host.querySelector("#b-row");
    const go = host.querySelector("#b-go");
    const BOX =
      '<svg viewBox="0 0 100 84" aria-hidden="true"><path d="M8 30h84v48a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4z" fill="#c98a4b"/><path d="M8 30h84v10H8z" fill="#b5763a"/><path d="M42 30h16v52H42z" fill="#e8c27f" opacity=".55"/><g class="lid"><path d="M4 18h92v14H4z" fill="#d99a58"/><path d="M42 18h16v14H42z" fill="#f0d494" opacity=".6"/></g></svg>';
    let count, round, cat, order, busy, over;
    const timers = [];
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    const build = () => {
      row.innerHTML = "";
      row.style.setProperty("--n", count);
      order = [...Array(count).keys()];
      for (let i = 0; i < count; i++) {
        const b = document.createElement("button");
        b.className = "box";
        b.dataset.box = i;
        b.setAttribute("aria-label", `Коробка ${i + 1}`);
        b.innerHTML = `<span class="box-cat">${ctx.persik.face(ctx.outfit)}</span>${BOX}`;
        b.style.setProperty("--slot", i);
        b.onclick = () => choose(i);
        row.append(b);
      }
    };
    const slotOf = (box) => order.indexOf(box);
    const placeAll = (ms) =>
      [...row.children].forEach((b) => {
        b.style.transitionDuration = `${ms}ms`;
        b.style.setProperty("--slot", slotOf(Number(b.dataset.box)));
      });
    const reset = () => {
      count = 3;
      round = 1;
      over = false;
      busy = false;
      build();
      host.querySelector("#b-round").textContent = round;
      go.hidden = false;
      go.disabled = false;
      ctx.status("Нажми кнопку: Персик залезет в коробку.");
    };
    const play = () => {
      if (busy || over) return;
      busy = true;
      go.hidden = true;
      cat = Math.floor(Math.random() * count);
      const el = row.children[cat];
      el.classList.add("open", "has-cat");
      ctx.status("Запомни коробку.");
      later(() => {
        el.classList.remove("open");
        const swaps = 2 + round * 2;
        const speed = ctx.reduced() ? 600 : Math.max(170, 520 - round * 40);
        let k = 0;
        const step = () => {
          if (k++ >= swaps) {
            busy = false;
            ctx.status("Где Персик?");
            return;
          }
          const a = Math.floor(Math.random() * count);
          let b = Math.floor(Math.random() * (count - 1));
          if (b >= a) b++;
          [order[a], order[b]] = [order[b], order[a]];
          placeAll(speed);
          ctx.sfx("step", 0.9 + Math.random() * 0.3);
          later(step, speed + 40);
        };
        ctx.status("Следи!");
        later(step, 500);
      }, ctx.reduced() ? 900 : 1100);
    };
    const choose = (i) => {
      if (busy || over || go.hidden === false) return;
      busy = true;
      const picked = row.children[i];
      picked.classList.add("open");
      if (i === cat) {
        ctx.sfx("spark");
        ctx.buzz(15);
        ctx.persik.say("Нашла!", 1200);
        later(() => {
          [...row.children].forEach((b) => b.classList.remove("open", "has-cat"));
          round++;
          host.querySelector("#b-round").textContent = round;
          if (round === 5 || round === 9) {
            count++;
            build();
          }
          busy = false;
          go.hidden = false;
          ctx.status("Верно. Дальше быстрее.");
        }, 900);
      } else {
        ctx.sfx("no");
        row.children[cat].classList.add("open");
        over = true;
        later(() => ctx.end(round - 1), 900);
      }
    };
    go.onclick = play;
    reset();
    return { restart: reset, cleanup: () => timers.forEach(clearTimeout), cat: () => cat, play, choose };
  }

  // ---------- 6. Облачный арканоид ----------
  function breakout(host, ctx) {
    const c = canvas(host, 360, 480);
    c.cv.setAttribute("aria-label", "Арканоид. Веди луну пальцем или стрелками.");
    let paddle, ball, clouds, lives, score, level, launched, over, pops, keys;
    const COLS = 6,
      ROWS = 5;
    const layout = () => {
      clouds = [];
      for (let r = 0; r < ROWS; r++)
        for (let k = 0; k < COLS; k++) {
          if (level > 1 && (r + k + level) % 5 === 0) continue;
          clouds.push({ x: 14 + k * 56, y: 60 + r * 30, w: 50, h: 22, r, hp: level > 2 && r === 0 ? 2 : 1 });
        }
    };
    const serve = () => {
      launched = false;
      ball = { x: paddle.x, y: paddle.y - 14, vx: 0, vy: 0, r: 7 };
    };
    const reset = () => {
      paddle = { x: 180, y: 440, w: 76 };
      lives = 3;
      score = 0;
      level = 1;
      over = false;
      pops = [];
      keys = {};
      layout();
      serve();
      ctx.status("Нажми, чтобы запустить звезду.");
    };
    const launch = () => {
      if (launched || over) return;
      launched = true;
      const sp = 300 + level * 30;
      ball.vx = sp * 0.45 * (Math.random() < 0.5 ? -1 : 1);
      ball.vy = -sp;
      ctx.status("");
    };
    const onMove = (e) => {
      paddle.x = Math.max(paddle.w / 2, Math.min(c.W - paddle.w / 2, c.toLocal(e).x));
    };
    const onDown = (e) => {
      e.preventDefault();
      onMove(e);
      launch();
    };
    const onKey = (e) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        keys[e.key] = e.type === "keydown";
        e.preventDefault();
      }
      if (e.type === "keydown" && (e.code === "Space" || e.key === "ArrowUp")) {
        e.preventDefault();
        launch();
      }
    };
    c.cv.addEventListener("pointermove", onMove);
    c.cv.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    document.addEventListener("keyup", onKey);
    reset();
    const stop = loop((dt) => {
      const { g, W, H } = c;
      if (keys.ArrowLeft) paddle.x = Math.max(paddle.w / 2, paddle.x - 380 * dt);
      if (keys.ArrowRight) paddle.x = Math.min(W - paddle.w / 2, paddle.x + 380 * dt);
      if (!launched) {
        ball.x = paddle.x;
        ball.y = paddle.y - 14;
      } else if (!over) {
        const steps = 3;
        for (let s = 0; s < steps; s++) {
          ball.x += (ball.vx * dt) / steps;
          ball.y += (ball.vy * dt) / steps;
          if (ball.x < ball.r) {
            ball.x = ball.r;
            ball.vx = Math.abs(ball.vx);
          }
          if (ball.x > W - ball.r) {
            ball.x = W - ball.r;
            ball.vx = -Math.abs(ball.vx);
          }
          if (ball.y < ball.r + 40) {
            ball.y = ball.r + 40;
            ball.vy = Math.abs(ball.vy);
          }
          // Paddle: angle depends on where the star lands on the moon.
          if (ball.vy > 0 && ball.y + ball.r >= paddle.y - 6 && ball.y < paddle.y + 8 && Math.abs(ball.x - paddle.x) < paddle.w / 2 + ball.r) {
            const hit = (ball.x - paddle.x) / (paddle.w / 2);
            const sp = Math.hypot(ball.vx, ball.vy);
            const ang = hit * 1.05;
            ball.vx = sp * Math.sin(ang);
            ball.vy = -Math.abs(sp * Math.cos(ang));
            ball.y = paddle.y - 6 - ball.r;
            ctx.sfx("step", 1.5);
          }
          for (const cl of clouds) {
            if (cl.dead) continue;
            if (ball.x + ball.r > cl.x && ball.x - ball.r < cl.x + cl.w && ball.y + ball.r > cl.y && ball.y - ball.r < cl.y + cl.h) {
              const ox = Math.min(ball.x + ball.r - cl.x, cl.x + cl.w - (ball.x - ball.r));
              const oy = Math.min(ball.y + ball.r - cl.y, cl.y + cl.h - (ball.y - ball.r));
              if (ox < oy) ball.vx = -ball.vx;
              else ball.vy = -ball.vy;
              cl.hp--;
              if (cl.hp <= 0) {
                cl.dead = true;
                score += 10 * (ROWS - cl.r) * level;
                pops.push({ x: cl.x + cl.w / 2, y: cl.y + cl.h / 2, t: 0 });
                ctx.sfx("spark", 0.8 + Math.random() * 0.4);
                ctx.buzz(6);
              } else ctx.sfx("coin");
              break;
            }
          }
        }
        if (ball.y > H + 20) {
          lives--;
          ctx.sfx("no");
          if (lives <= 0) {
            over = true;
            ctx.end(score);
          } else {
            ctx.persik.say(`Ещё ${lives === 1 ? "одна попытка" : "две попытки"}`, 1400);
            serve();
          }
        }
        if (clouds.every((cl) => cl.dead)) {
          level++;
          score += 200;
          ctx.persik.say(`Уровень ${level}!`, 1400);
          ctx.sfx("win");
          layout();
          serve();
        }
      }
      // Draw.
      const sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#2f3f94");
      sky.addColorStop(1, "#1f2a66");
      g.fillStyle = sky;
      g.fillRect(0, 0, W, H);
      for (const cl of clouds) {
        if (cl.dead) continue;
        g.fillStyle = cl.hp > 1 ? "#ffd9a0" : ["#ffffff", "#f6f0ff", "#ecebff", "#e4e8ff", "#dde6ff"][cl.r];
        const { x, y, w, h } = cl;
        g.beginPath();
        g.arc(x + w * 0.3, y + h * 0.55, h * 0.45, 0, Math.PI * 2);
        g.arc(x + w * 0.55, y + h * 0.4, h * 0.55, 0, Math.PI * 2);
        g.arc(x + w * 0.78, y + h * 0.6, h * 0.4, 0, Math.PI * 2);
        g.fill();
        g.fillRect(x + w * 0.2, y + h * 0.5, w * 0.62, h * 0.48);
      }
      for (const p of pops) {
        p.t += dt;
        g.globalAlpha = Math.max(0, 1 - p.t * 1.6);
        g.fillStyle = COLORS.rose;
        heartPath(g, p.x, p.y - p.t * 50, 8 + p.t * 8);
        g.fill();
        g.globalAlpha = 1;
      }
      pops = pops.filter((p) => p.t < 0.7);
      // Moon paddle.
      g.fillStyle = "#fffbe8";
      g.beginPath();
      g.ellipse(paddle.x, paddle.y, paddle.w / 2, 10, 0, Math.PI, 0);
      g.fill();
      g.fillStyle = "#e4d9b8";
      g.fillRect(paddle.x - paddle.w / 2, paddle.y - 1, paddle.w, 4);
      star(g, ball.x, ball.y, ball.r + 3, "#ffd9a0");
      g.fillStyle = COLORS.paper;
      g.font = "400 16px Dela Gothic One, system-ui, sans-serif";
      g.textAlign = "left";
      g.fillText(String(score), 14, 28);
      g.textAlign = "right";
      g.font = "500 13px Golos Text, system-ui, sans-serif";
      g.fillText(`уровень ${level}`, W - 14, 26);
      for (let i = 0; i < lives; i++) {
        g.fillStyle = COLORS.rose;
        heartPath(g, W / 2 - 16 + i * 16, 24, 6);
        g.fill();
      }
      g.textAlign = "left";
    });
    return {
      restart: reset,
      cleanup: () => {
        stop();
        c.off();
        document.removeEventListener("keydown", onKey);
        document.removeEventListener("keyup", onKey);
      },
    };
  }

  root.Arcade = { jumper, merge, match, word, boxes, breakout };
})(typeof self !== "undefined" ? self : this);
