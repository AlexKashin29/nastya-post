"use strict";
// Pure game rules shared by the app (window.Engine) and node tests (require).
// No DOM, no storage: maps, pathfinding, ratings, daily maze and quests.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Engine = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const SIZE = 7;
  const CELLS = SIZE * SIZE;

  const tile = (level, pos) =>
    level.grid[Math.floor(pos / SIZE)]?.[pos % SIZE];
  const neighbors = (pos) =>
    [
      pos % SIZE > 0 ? pos - 1 : -1,
      pos % SIZE < SIZE - 1 ? pos + 1 : -1,
      pos >= SIZE ? pos - SIZE : -1,
      pos < CELLS - SIZE ? pos + SIZE : -1,
    ].filter((x) => x >= 0);
  const passable = (level, pos, phase) => {
    const t = tile(level, pos);
    return (
      t !== undefined &&
      t !== "#" &&
      (t !== "s" || phase === "sun") &&
      (t !== "m" || phase === "moon")
    );
  };
  const other = (phase) => (phase === "sun" ? "moon" : "sun");

  // Cells the player must visit before the exit counts. Cache is optional in
  // play, but included in par so that curiosity never costs a star.
  function requiredItems(level, withCache = true) {
    const items = level.stars.map((s) => s.at);
    if (Number.isInteger(level.key)) items.push(level.key);
    if (withCache && Number.isInteger(level.cache)) items.push(level.cache);
    return items;
  }

  // Minimum number of steps from the start to the exit with every item.
  // Light switches cost nothing, so this is a 0-1 BFS over pos x light x items.
  function par(level, withCache = true) {
    const items = requiredItems(level, withCache);
    const full = (1 << items.length) - 1;
    const bit = (pos) => {
      const i = items.indexOf(pos);
      return i < 0 ? 0 : 1 << i;
    };
    const startMask = bit(level.start);
    const id = (pos, phase, mask) =>
      (mask * CELLS + pos) * 2 + (phase === "sun" ? 1 : 0);
    const dist = new Map();
    const deque = [[level.start, "moon", startMask, 0]];
    dist.set(id(level.start, "moon", startMask), 0);
    while (deque.length) {
      const [pos, phase, mask, d] = deque.shift();
      if (dist.get(id(pos, phase, mask)) < d) continue;
      if (pos === level.exit && mask === full) return d;
      const flipped = id(pos, other(phase), mask);
      if (!dist.has(flipped) || dist.get(flipped) > d) {
        dist.set(flipped, d);
        deque.unshift([pos, other(phase), mask, d]);
      }
      for (const n of neighbors(pos)) {
        if (!passable(level, n, phase)) continue;
        const m = mask | bit(n),
          k = id(n, phase, m);
        if (!dist.has(k) || dist.get(k) > d + 1) {
          dist.set(k, d + 1);
          deque.push([n, phase, m, d + 1]);
        }
      }
    }
    return -1;
  }

  // Generous enough that a calm first try earns the second star.
  const stepLimit = (p) => p + Math.max(4, Math.round(p * 0.2));

  function rating({ moves, hints, parValue }) {
    return 1 + (moves <= stepLimit(parValue) ? 1 : 0) + (hints === 0 ? 1 : 0);
  }

  // First action on the shortest route to the nearest still-needed thing.
  // Returns a cell index, "phase", or null when nothing is reachable.
  function hintStep(level, prog) {
    const targets = level.stars
      .filter((s) => !prog.collected.includes(s.at))
      .map((s) => s.at);
    if (Number.isInteger(level.key) && !prog.key) targets.push(level.key);
    if (!targets.length) targets.push(level.exit);
    // Prefer a real step; suggest switching light only when it is shorter.
    let best = null,
      bestCost = Infinity;
    for (const n of neighbors(prog.pos)) {
      if (!passable(level, n, prog.phase)) continue;
      const cost = targets.includes(n)
        ? 1
        : 1 + movesTo(level, n, prog.phase, targets);
      if (cost < bestCost) {
        bestCost = cost;
        best = n;
      }
    }
    const viaLight = movesTo(level, prog.pos, other(prog.phase), targets);
    if (viaLight < bestCost) return "phase";
    return best;
  }

  // Fewest steps from (pos, phase) to any target; light switches are free.
  function movesTo(level, pos, phase, targets) {
    const key = (p, ph) => `${p}:${ph}`;
    const dist = new Map([[key(pos, phase), 0]]);
    const deque = [[pos, phase, 0]];
    while (deque.length) {
      const [p, ph, d] = deque.shift();
      if (dist.get(key(p, ph)) < d) continue;
      if (targets.includes(p)) return d;
      const f = key(p, other(ph));
      if (!dist.has(f) || dist.get(f) > d) {
        dist.set(f, d);
        deque.unshift([p, other(ph), d]);
      }
      for (const n of neighbors(p)) {
        if (!passable(level, n, ph)) continue;
        const k = key(n, ph);
        if (!dist.has(k) || dist.get(k) > d + 1) {
          dist.set(k, d + 1);
          deque.push([n, ph, d + 1]);
        }
      }
    }
    return Infinity;
  }

  // Deterministic randomness: the same date gives the same maze on every device.
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const shuffle = (list, rand) => {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const pick = (list, rand) => list[Math.floor(rand() * list.length)];

  function distances(level, from) {
    const dist = new Array(CELLS).fill(-1);
    dist[from] = 0;
    const queue = [from];
    for (let i = 0; i < queue.length; i++)
      for (const n of neighbors(queue[i]))
        if (tile(level, n) !== "#" && dist[n] < 0) {
          dist[n] = dist[queue[i]] + 1;
          queue.push(n);
        }
    return dist;
  }

  // Free path cells with a few dust motes. Stable per chapter id.
  function dustCells(level, count = 3) {
    const taken = new Set([
      level.start,
      level.exit,
      level.key,
      level.cache,
      ...level.stars.map((s) => s.at),
    ]);
    const free = [];
    for (let i = 0; i < CELLS; i++)
      if (tile(level, i) === "." && !taken.has(i)) free.push(i);
    return shuffle(free, rng(hash(`dust:${level.id}`)))
      .slice(0, count)
      .sort((a, b) => a - b);
  }

  // Daily maze: a perfect maze on the 4x4 room lattice of a 7x7 board,
  // two extra openings for loops, four light bridges and fog on some days.
  function generateDaily(dateKey) {
    const rand = rng(hash(`daily:${dateKey}`));
    const g = Array.from({ length: SIZE }, () => Array(SIZE).fill("#"));
    const rooms = [];
    for (let y = 0; y < SIZE; y += 2)
      for (let x = 0; x < SIZE; x += 2) rooms.push([x, y]);
    const visited = new Set();
    const stack = [pick(rooms, rand)];
    visited.add(stack[0].join());
    g[stack[0][1]][stack[0][0]] = ".";
    const dirs = [
      [2, 0],
      [-2, 0],
      [0, 2],
      [0, -2],
    ];
    while (stack.length) {
      const [x, y] = stack[stack.length - 1];
      const options = shuffle(dirs, rand)
        .map(([dx, dy]) => [x + dx, y + dy, dx, dy])
        .filter(
          ([nx, ny]) =>
            nx >= 0 &&
            ny >= 0 &&
            nx < SIZE &&
            ny < SIZE &&
            !visited.has(`${nx},${ny}`),
        );
      if (!options.length) {
        stack.pop();
        continue;
      }
      const [nx, ny, dx, dy] = options[0];
      g[y + dy / 2][x + dx / 2] = ".";
      g[ny][nx] = ".";
      visited.add(`${nx},${ny}`);
      stack.push([nx, ny]);
    }
    const walls = [];
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++)
        if (g[y][x] === "#" && (x % 2) + (y % 2) === 1) walls.push([x, y]);
    for (const [x, y] of shuffle(walls, rand).slice(0, 2)) g[y][x] = ".";
    const connectors = [];
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++)
        if (g[y][x] === "." && (x % 2) + (y % 2) === 1) connectors.push([x, y]);
    shuffle(connectors, rand)
      .slice(0, 4)
      .forEach(([x, y], i) => (g[y][x] = i % 2 ? "m" : "s"));
    const level = {
      id: `daily-${dateKey}`,
      grid: g.map((r) => r.join("")),
      key: null,
      cache: null,
      stars: [],
    };
    const roomCells = shuffle(
      rooms.map(([x, y]) => y * SIZE + x),
      rand,
    );
    level.start = roomCells[0];
    const fromStart = distances(level, level.start);
    level.exit = roomCells.reduce((a, b) =>
      fromStart[b] > fromStart[a] ? b : a,
    );
    const chosen = [level.start, level.exit];
    const dist = Object.fromEntries(
      roomCells.map((c) => [c, distances(level, c)]),
    );
    for (let k = 0; k < 3; k++) {
      let best = -1,
        bestScore = -1;
      for (const c of roomCells) {
        if (chosen.includes(c)) continue;
        const score = Math.min(...chosen.map((o) => dist[o][c]));
        if (score > bestScore) {
          bestScore = score;
          best = c;
        }
      }
      chosen.push(best);
      level.stars.push({ at: best });
    }
    const free = [];
    for (let i = 0; i < CELLS; i++)
      if (tile(level, i) === "." && !chosen.includes(i)) free.push(i);
    level.dust = shuffle(free, rand)
      .slice(0, 4)
      .sort((a, b) => a - b);
    level.fog = rand() < 0.4;
    return level;
  }

  // Cells visible in fog: Chebyshev radius 1 around the player.
  const around = (pos) => {
    const x = pos % SIZE,
      y = Math.floor(pos / SIZE),
      out = [];
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx,
          yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < SIZE && yy < SIZE)
          out.push(yy * SIZE + xx);
      }
    return out;
  };

  // Local calendar day, so the day changes at her midnight, not UTC.
  const dateKey = (d = new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const dayNumber = (key) => {
    const [y, m, d] = key.split("-").map(Number);
    return Math.round(Date.UTC(y, m - 1, d) / 86400000);
  };

  // Quests read day counters (metric -> number). Picked once per day and stored,
  // so unlocking something mid-day does not reshuffle the list.
  const QUESTS = [
    { id: "maze", metric: "maze", goal: 1, text: "Пройди лабиринт дня" },
    {
      id: "maze-clean",
      metric: "mazeClean",
      goal: 1,
      text: "Пройди лабиринт дня без подсказок Персика",
    },
    { id: "steps", metric: "steps", goal: 60, text: "Сделай 60 шагов" },
    { id: "dust", metric: "dust", goal: 6, text: "Подбери 6 пылинок" },
    { id: "note", metric: "note", goal: 1, text: "Прочитай записку дня" },
    { id: "pet", metric: "pet", goal: 5, text: "Погладь Персика 5 раз" },
    {
      id: "mini",
      metric: "mini",
      goal: 1,
      text: "Выиграй любую мини-игру",
      needs: "mini",
    },
    {
      id: "mini-two",
      metric: "mini",
      goal: 2,
      text: "Выиграй две мини-игры",
      needs: "mini",
    },
    {
      id: "perfect",
      metric: "perfect",
      goal: 1,
      text: "Пройди любую главу на три звезды",
      needs: "chapter",
    },
    {
      id: "replay",
      metric: "replay",
      goal: 1,
      text: "Перепройди любую главу",
      needs: "chapter",
    },
    { id: "album", metric: "album", goal: 1, text: "Загляни в альбом" },
    { id: "question", metric: "question", goal: 1, text: "Ответь на вопрос дня" },
    { id: "blitz", metric: "blitz", goal: 1, text: "Пройди блиц \"это или то\"" },
    { id: "spin", metric: "spin", goal: 1, text: "Покрути колесо Персика" },
    { id: "feed", metric: "feed", goal: 1, text: "Покорми Персика" },
    { id: "arcade", metric: "arcade", goal: 2, text: "Сыграй две партии в разделе \"Игры\"" },
    { id: "word", metric: "word", goal: 1, text: "Отгадай слово дня" },
    { id: "record", metric: "record", goal: 1, text: "Побей свой рекорд в любой игре" },
  ];

  // Five blitz pairs a day, rotating through the whole list before repeats.
  function pickBlitz(key, total, count = 5) {
    const day = dayNumber(key);
    const perCycle = Math.max(1, Math.floor(total / count));
    const cycle = Math.floor(day / perCycle),
      slot = ((day % perCycle) + perCycle) % perCycle;
    const order = shuffle([...Array(total).keys()], rng(hash(`blitz:${cycle}`)));
    return order.slice(slot * count, slot * count + count);
  }

  // Wheel: weighted pick, deterministic per day so a reload cannot reroll.
  function spinWheel(key, segments) {
    const total = segments.reduce((n, s) => n + s.weight, 0);
    let roll = rng(hash(`wheel:${key}`))() * total;
    for (let i = 0; i < segments.length; i++) {
      roll -= segments[i].weight;
      if (roll < 0) return i;
    }
    return segments.length - 1;
  }

  function pickQuests(key, ctx = {}) {
    const rand = rng(hash(`quests:${key}`));
    const ok = (q) =>
      !q.needs ||
      (q.needs === "mini" && ctx.minis > 0) ||
      (q.needs === "chapter" && ctx.chapters > 0);
    const maze = pick(
      QUESTS.filter((q) => q.metric.startsWith("maze")),
      rand,
    );
    const rest = shuffle(
      QUESTS.filter((q) => !q.metric.startsWith("maze") && ok(q)),
      rand,
    );
    const out = [maze];
    for (const q of rest) {
      if (out.length === 3) break;
      if (!out.some((o) => o.metric === q.metric)) out.push(q);
    }
    return out.map(({ id, metric, goal, text }) => ({
      id,
      metric,
      goal,
      text,
      claimed: false,
    }));
  }

  return {
    SIZE,
    CELLS,
    tile,
    neighbors,
    passable,
    other,
    requiredItems,
    par,
    stepLimit,
    rating,
    hintStep,
    movesTo,
    hash,
    rng,
    shuffle,
    dustCells,
    generateDaily,
    around,
    dateKey,
    dayNumber,
    QUESTS,
    pickQuests,
    pickBlitz,
    spinWheel,
  };
});
