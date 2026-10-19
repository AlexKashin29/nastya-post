"use strict";
// Rules of the arcade games without any drawing: 2048 moves, match-3
// matching and gravity, word scoring. Shared by the app and node tests.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ArcadeLogic = factory();
})(typeof self !== "undefined" ? self : this, function () {
  // ---------- 2048 ("Звёздное слияние") ----------
  // grid: 16 numbers, 0 = empty, otherwise a level 1..11 (2, 4 ... 2048).
  const N = 4;
  const lines = {
    left: [...Array(N).keys()].map((r) => [...Array(N).keys()].map((c) => r * N + c)),
    right: [...Array(N).keys()].map((r) => [...Array(N).keys()].map((c) => r * N + (N - 1 - c))),
    up: [...Array(N).keys()].map((c) => [...Array(N).keys()].map((r) => r * N + c)),
    down: [...Array(N).keys()].map((c) => [...Array(N).keys()].map((r) => (N - 1 - r) * N + c)),
  };

  // Slides toward the start of each line. Each tile merges at most once.
  function slide(grid, dir) {
    const out = [...grid];
    let moved = false,
      gained = 0;
    const merged = [];
    for (const line of lines[dir]) {
      const vals = line.map((i) => grid[i]).filter(Boolean);
      const res = [];
      for (let k = 0; k < vals.length; k++) {
        if (k + 1 < vals.length && vals[k] === vals[k + 1]) {
          res.push(vals[k] + 1);
          gained += 2 ** (vals[k] + 1);
          merged.push(line[res.length - 1]);
          k++;
        } else res.push(vals[k]);
      }
      line.forEach((idx, k) => {
        const v = res[k] || 0;
        if (out[idx] !== v) moved = true;
        out[idx] = v;
      });
    }
    return { grid: out, moved, gained, merged };
  }

  function addRandom(grid, rand) {
    const empty = grid.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
    if (!empty.length) return { grid, at: -1 };
    const at = empty[Math.floor(rand() * empty.length)];
    const out = [...grid];
    out[at] = rand() < 0.9 ? 1 : 2;
    return { grid: out, at };
  }

  const canMove = (grid) =>
    ["left", "right", "up", "down"].some((d) => slide(grid, d).moved);

  // ---------- Match-3 ("Сокровища Персика") ----------
  // board: array of w*h type ids (0..kinds-1), -1 = empty.
  function findMatches(board, w, h) {
    const hit = new Set();
    for (let r = 0; r < h; r++)
      for (let c = 0; c < w; ) {
        const t = board[r * w + c];
        let k = c + 1;
        while (k < w && t >= 0 && board[r * w + k] === t) k++;
        if (t >= 0 && k - c >= 3) for (let x = c; x < k; x++) hit.add(r * w + x);
        c = k;
      }
    for (let c = 0; c < w; c++)
      for (let r = 0; r < h; ) {
        const t = board[r * w + c];
        let k = r + 1;
        while (k < h && t >= 0 && board[k * w + c] === t) k++;
        if (t >= 0 && k - r >= 3) for (let y = r; y < k; y++) hit.add(y * w + c);
        r = k;
      }
    return [...hit].sort((a, b) => a - b);
  }

  // Drops tiles into empty cells below. Returns the new board and moves
  // as [from, to] pairs so the view can animate falling.
  function collapse(board, w, h) {
    const out = [...board];
    const moves = [];
    for (let c = 0; c < w; c++) {
      let write = h - 1;
      for (let r = h - 1; r >= 0; r--) {
        const i = r * w + c;
        if (out[i] >= 0) {
          const to = write * w + c;
          if (to !== i) {
            out[to] = out[i];
            out[i] = -1;
            moves.push([i, to]);
          }
          write--;
        }
      }
    }
    return { board: out, moves };
  }

  const adjacent = (a, b, w) =>
    (Math.abs(a - b) === 1 && Math.floor(a / w) === Math.floor(b / w)) ||
    Math.abs(a - b) === w;

  function swapMakesMatch(board, w, h, a, b) {
    if (!adjacent(a, b, w)) return false;
    const t = [...board];
    [t[a], t[b]] = [t[b], t[a]];
    return findMatches(t, w, h).length > 0;
  }

  function hasMoves(board, w, h) {
    for (let i = 0; i < w * h; i++) {
      if (i % w < w - 1 && swapMakesMatch(board, w, h, i, i + 1)) return true;
      if (i + w < w * h && swapMakesMatch(board, w, h, i, i + w)) return true;
    }
    return false;
  }

  // A full board with no ready matches and at least one possible move.
  function freshBoard(w, h, kinds, rand) {
    for (let tries = 0; tries < 200; tries++) {
      const b = [];
      for (let i = 0; i < w * h; i++) {
        let t;
        do t = Math.floor(rand() * kinds);
        while (
          (i % w >= 2 && b[i - 1] === t && b[i - 2] === t) ||
          (i >= 2 * w && b[i - w] === t && b[i - 2 * w] === t)
        );
        b.push(t);
      }
      if (hasMoves(b, w, h)) return b;
    }
    throw new Error("Could not build a playable board");
  }

  // ---------- Word of the day ----------
  const norm = (s) => String(s).toLowerCase().replace(/ё/g, "е").trim();

  // Per letter: "g" right place, "y" in the word elsewhere, "b" not there.
  // Repeated letters are counted like Wordle: each answer letter is used once.
  function scoreWord(guess, answer) {
    const g = [...norm(guess)],
      a = [...norm(answer)];
    const res = Array(g.length).fill("b");
    const left = {};
    a.forEach((ch, i) => {
      if (g[i] === ch) res[i] = "g";
      else left[ch] = (left[ch] || 0) + 1;
    });
    g.forEach((ch, i) => {
      if (res[i] === "g") return;
      if (left[ch]) {
        res[i] = "y";
        left[ch]--;
      }
    });
    return res;
  }

  const isWord = (s, len = 5) => new RegExp(`^[а-я]{${len}}$`).test(norm(s));

  return {
    slide,
    addRandom,
    canMove,
    findMatches,
    collapse,
    adjacent,
    swapMakesMatch,
    hasMoves,
    freshBoard,
    norm,
    scoreWord,
    isWord,
  };
});
