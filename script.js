"use strict";

// Game for Nastya. Rules and maps live in engine.js, texts in data.json,
// the cat in persik.js, answer packing in share.js. This file is the app:
// state and saving, rewards, screens, daily rituals and mini-games.
const E = window.Engine;
const P = window.Persik;
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const KEY = "nastya-letter-adventure-v3";
const OLD_KEY = "nastya-letter-adventure-v2";
const TEST = new URLSearchParams(location.search).has("test");
const main = $("#main");
const modal = $("#modal");
const reducedMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;

let data,
  state,
  activeTab = "adventure",
  audio,
  toastTimer,
  hintCell = -1,
  suppressClickUntil = 0,
  mini = null,
  storageOk = true,
  albumTab = "sparks";

// ---------- Icons ----------
// One stroke weight, drawn for this game; no emoji anywhere in the UI.
const ICONS = {
  spark:
    '<path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z" fill="currentColor" stroke="none"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l2 2M14 9l2 2"/>',
  heart:
    '<path d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.2a4.2 4.2 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/>',
  portal: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/>',
  dust: '<path d="M7 4l1.2 2.8L11 8l-2.8 1.2L7 12 5.8 9.2 3 8l2.8-1.2zM16 10l1.6 3.4L21 15l-3.4 1.6L16 20l-1.6-3.4L11 15l3.4-1.6z" fill="currentColor" stroke="none"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
  moon: '<path d="M19.5 14.5A8 8 0 1 1 9.5 4.5a6.4 6.4 0 0 0 10 10z"/>',
  chest:
    '<path d="M4 10h16v9H4zM4 10a8 5 0 0 1 16 0M10 10v3h4v-3"/>',
  ticket:
    '<path d="M3.5 7h17v3a2 2 0 0 0 0 4v3h-17v-3a2 2 0 0 0 0-4z"/><path d="M14 7.5v9" stroke-dasharray="1.5 2"/>',
  ask: '<path d="M4.5 5h15v10.5H10l-5.5 4z"/><path d="M10 9a2 2 0 1 1 2.8 1.8c-.6.3-.8.7-.8 1.2M12 13.6v.1"/>',
  wheel:
    '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17M3.5 12h17M6 6l12 12M18 6 6 18"/>',
  bowl: '<path d="M3.5 12h17a8.5 6.5 0 0 1-17 0z"/><path d="M9 8.5c0-1.5 1.5-1.5 1.5-3M13.5 8.5c0-1.5 1.5-1.5 1.5-3"/>',
  paw: '<ellipse cx="12" cy="15.5" rx="4" ry="3.5"/><circle cx="6.5" cy="10.5" r="1.8"/><circle cx="10" cy="7" r="1.8"/><circle cx="14" cy="7" r="1.8"/><circle cx="17.5" cy="10.5" r="1.8"/>',
  letter: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>',
  map: '<path d="M4 6.5l5-2 6 2 5-2v13l-5 2-6-2-5 2z"/><path d="M9 4.5v13M15 6.5v13"/>',
  hanger:
    '<path d="M10 7.5a2 2 0 1 1 2.6 1.9c-.4.1-.6.5-.6.9v.7L3.5 16.5h17L12 11"/>',
  book: '<path d="M5 4.5h11a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3z"/><path d="M5 16.5a3 3 0 0 1 3-3h11"/>',
  play: '<path d="M8 5.5l11 6.5-11 6.5z" fill="currentColor"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  note: '<path d="M9 18V5.5l10-2v12.5"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6"/>',
  flame:
    '<path d="M12 3c3 4 6.5 6.2 6.5 11a6.5 6.5 0 0 1-13 0c0-3 1.8-5 3-7 .8 2 2 3.2 3 3.2 0-3-1-5.4.5-7.2z"/>',
  star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z"/>',
  send: '<path d="M4 12l16-7.5-5.5 16-3-6.5z"/><path d="M11.5 14 20 4.5"/>',
  today:
    '<rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M4 9.5h16M8.5 3.5v4M15.5 3.5v4"/><circle cx="12" cy="14.5" r="1.6" fill="currentColor"/>',
  game: '<path d="M7 8h10a4 4 0 0 1 4 4v1.5a3 3 0 0 1-5.5 1.7L14.5 14h-5L8.5 15.2A3 3 0 0 1 3 13.5V12a4 4 0 0 1 4-4z"/><path d="M8 11v3M6.5 12.5h3M15.5 11.5h.1M17.5 13h.1"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
  edit: '<path d="M4.5 19.5l1-4L15.8 5.2a2 2 0 0 1 2.9 2.9L8.5 18.5z"/>',
  trophy:
    '<path d="M8 4.5h8v5a4 4 0 0 1-8 0zM8 6.5H4.5a3 3 0 0 0 3.5 3M16 6.5h3.5a3 3 0 0 1-3.5 3M12 13.5v3M8.5 20h7M10 16.5h4v3.5h-4z"/>',
  thumb:
    '<path d="M7.5 10.5v9h-3v-9zM7.5 10.5l3.5-6.5c1.5 0 2.5 1 2.2 2.6l-.7 3.4h5.3a2 2 0 0 1 2 2.4l-1.3 5.6a2 2 0 0 1-2 1.5H7.5"/>',
};
const icon = (name, cls = "") =>
  `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ""}</svg>`;

// ---------- Catalogues ----------

const SHOP = [
  { id: "bow", slot: "cat", title: "Бант", price: 80 },
  { id: "scarf", slot: "cat", title: "Шарф", price: 120 },
  { id: "glasses", slot: "cat", title: "Очки как у Саши", price: 160 },
  { id: "crown", slot: "cat", title: "Корона", price: 300 },
  { id: "dawn", slot: "theme", title: "Рассвет", price: 150 },
  { id: "aurora", slot: "theme", title: "Северное сияние", price: 220 },
  { id: "sakura", slot: "theme", title: "Сакура", price: 220 },
  { id: "hearts", slot: "trail", title: "След из сердечек", price: 100 },
  { id: "sparkles", slot: "trail", title: "След из звёзд", price: 100 },
];
const SLOTS = {
  cat: { title: "На Персика", none: "Без всего" },
  theme: { title: "Цвет карты", none: "Ночной город" },
  trail: { title: "След за Настей", none: "Без следа" },
};
const EXTRA_NOTE_PRICE = 30;
const FRIEND_LEVELS = [0, 10, 30, 60, 100];
const EXTRA_QUESTIONS = 2;

const BADGES = [
  ["spark", "Первая искра", "Найти первую искру", (s) => foundSparks(s) >= 1],
  ["page", "Первая страница", "Пройти первую главу", (s) => s.completed >= 1],
  ["letter", "Письмо собрано", "Пройти все шесть глав", (s) => s.completed >= 6],
  ["perfect", "Три звезды", "Пройти главу на три звезды", (s) => Object.values(s.best).some((b) => b.stars === 3)],
  ["perfect-all", "Без помарок", "Все главы на три звезды", (s) => data.chapters.every((c) => s.best[c.id]?.stars === 3)],
  ["curious", "Любопытная", "Открыть все шесть тайников", (s) => s.found.secrets.length >= 6],
  ["games", "Игротека", "Выиграть все шесть мини-игр", (s) => s.minis.length >= 6],
  ["maze1", "Первый лабиринт", "Пройти лабиринт дня", (s) => s.stats.mazes >= 1],
  ["maze7", "Семь лабиринтов", "Пройти семь лабиринтов дня", (s) => s.stats.mazes >= 7],
  ["streak3", "Три дня подряд", "Заходить три дня подряд", (s) => s.streak.best >= 3],
  ["streak7", "Неделя подряд", "Заходить семь дней подряд", (s) => s.streak.best >= 7],
  ["streak14", "Две недели", "Заходить 14 дней подряд", (s) => s.streak.best >= 14],
  ["streak30", "Месяц вместе", "Заходить 30 дней подряд", (s) => s.streak.best >= 30],
  ["cat", "Кошачья радость", "Погладить Персика 30 раз", (s) => s.stats.pets >= 30],
  ["friend", "Лучшие друзья", "Подружиться с Персиком до 4 уровня", (s) => friendLevel(s) >= 4],
  ["style", "Модница", "Купить три вещи в шкафу", (s) => s.owned.length >= 3],
  ["notes", "Читательница", "Прочитать 10 записок", (s) => s.found.notes.length >= 10],
  ["chest", "Сундучок", "Открыть 5 сундуков дня", (s) => s.stats.chests >= 5],
  ["memory", "Отличная память", "Собрать пары за 9 ходов или меньше", (s) => s.stats.pairsBest !== null && s.stats.pairsBest <= 9],
  ["answers10", "Откровенная", "Ответить на 10 вопросов Саши", (s) => Object.keys(s.answers).length >= 10],
  ["answers30", "Саша знает больше", "Ответить на 30 вопросов Саши", (s) => Object.keys(s.answers).length >= 30],
  ["blitz", "Быстрая", "Пройти блиц семь раз", (s) => s.stats.blitz >= 7],
  ["coupon", "Купон в кармане", "Получить первый купон", (s) => s.coupons.length >= 1],
  ["word5", "Словесница", "Отгадать пять слов дня", (s) => s.arcade.wins >= 5],
  ["jumper", "По крышам", "Набрать 300 в прыжках по крышам", (s) => (s.arcade.best.jumper || 0) >= 300],
  ["universe", "Вселенная", "Собрать вселенную в звёздном слиянии", (s) => s.arcade.flags.includes("universe")],
  ["boxes", "Зоркая", "Найти Персика 10 раундов подряд", (s) => (s.arcade.best.boxes || 0) >= 10],
  ["match", "Сокровищница", "Набрать 2500 в сокровищах Персика", (s) => (s.arcade.best.match || 0) >= 2500],
  ["clouds", "Гроза облаков", "Набрать 1500 в облачном арканоиде", (s) => (s.arcade.best.breakout || 0) >= 1500],
].map(([id, title, text, test]) => ({ id, title, text, test }));

const STREAK_REWARDS = { 3: 30, 7: 70, 14: 120, 30: 300 };
const REWARD = {
  mote: 2,
  keyGame: 20,
  playGame: 5,
  chapter: 30,
  perStar: 10,
  maze: 25,
  mazeClean: 10,
  quest: 20,
  chest: 40,
  badge: 10,
  question: 15,
  blitz: 10,
};

// ---------- Helpers ----------

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const plural = (n, one, few, many) => {
  const a = Math.abs(n) % 100,
    b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
};
const today = () => E.dateKey(new Date());
const starsHtml = (n, cls = "") =>
  `<span class="stars ${cls}" aria-label="${n} из 3">${[1, 2, 3].map((k) => icon("star", k <= n ? "on" : "off")).join("")}</span>`;
const foundSparks = (s = state) =>
  Object.values(s.found.sparks).reduce((n, list) => n + list.length, 0);
const friendLevel = (s = state) =>
  FRIEND_LEVELS.filter((x) => s.persik.xp >= x).length;
const levelCache = new Map();
const qById = (id) => data.questions.find((q) => q.id === id);

// Streak shown today: alive if the last active day was yesterday, or the day
// before while the weekly forgiveness is unused.
function streakNow() {
  const s = state.streak;
  if (!s.last) return 0;
  const gap = E.dayNumber(today()) - E.dayNumber(s.last);
  const graceFree =
    !s.grace || E.dayNumber(today()) - E.dayNumber(s.grace) >= 7;
  return gap <= 1 || (gap === 2 && graceFree) ? s.count : 0;
}

// ---------- State ----------

const freshJourney = (level, replay = false) => ({
  pos: level.start,
  cat: level.start,
  collected: [],
  key: false,
  cache: false,
  phase: "moon",
  moves: 0,
  hints: 0,
  dust: [],
  seen: level.fog ? E.around(level.start) : [],
  replay,
  done: false,
});
const freshState = () => ({
  version: 3,
  started: false,
  chapter: 0,
  completed: 0,
  sound: false,
  souvenirs: [],
  journeys: {},
  best: {},
  found: { sparks: {}, secrets: [], notes: [] },
  dustTaken: {},
  session: { type: "chapter", index: 0 },
  pendingEnd: null,
  dust: 0,
  owned: [],
  equip: { cat: null, theme: null, trail: null },
  badges: [],
  minis: [],
  stats: {
    steps: 0,
    pets: 0,
    mazes: 0,
    chests: 0,
    minisWon: 0,
    hintsUsed: 0,
    pairsBest: null,
    blitz: 0,
  },
  streak: { count: 0, best: 0, last: null, grace: null, rewarded: [] },
  answers: {},
  skipped: [],
  blitzAnswers: {},
  coupons: [],
  persik: { xp: 0, fed: null, petsToday: 0, petsDay: null },
  questionsIntro: false,
  arcade: freshArcade(),
  day: null,
});
function freshArcade() {
  return {
    best: {},
    plays: {},
    day: null,
    dust: 0,
    word: null,
    wins: 0,
    feedback: {},
    flags: [],
  };
}

function chapterLevel(i) {
  const c = data.chapters[i];
  if (!levelCache.has(c.id))
    levelCache.set(c.id, { ...c, dust: E.dustCells(c), fog: false });
  return levelCache.get(c.id);
}
function dailyLevel(key = today()) {
  const id = `daily-${key}`;
  if (!levelCache.has(id)) {
    const level = E.generateDaily(key);
    const rand = E.rng(E.hash(`compliments:${key}`));
    const texts = E.shuffle(data.daily.compliments, rand);
    level.stars = level.stars.map((s, i) => ({ ...s, text: texts[i] }));
    level.title = level.fog ? "Туманный лабиринт" : "Лабиринт дня";
    levelCache.set(id, level);
  }
  return levelCache.get(id);
}
const currentLevel = () =>
  state.session.type === "daily"
    ? dailyLevel()
    : chapterLevel(state.session.index);
function journey(level = currentLevel()) {
  if (state.session.type === "daily" && level.id.startsWith("daily-"))
    return ensureDay().maze;
  return (state.journeys[level.id] ||= freshJourney(level));
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    if (!storageOk) {
      storageOk = true;
      $("#save-status").textContent = data.ui.saving;
    }
  } catch {
    storageOk = false;
    $("#save-status").textContent = data.ui.storageError;
  }
}

const int = (v, min, max, fallback) =>
  Number.isInteger(v) ? Math.max(min, Math.min(max, v)) : fallback;
const cellsOf = (list, ok) =>
  [...new Set(Array.isArray(list) ? list : [])].filter(
    (v) => Number.isInteger(v) && ok(v),
  );
const isDay = (v) => typeof v === "string" && /^\d{4}-\d\d-\d\d$/.test(v);

// Rebuild a saved journey defensively: a broken save must never break play.
function cleanJourney(level, p) {
  const j = freshJourney(level, p.replay === true);
  const onPath = (v) => v >= 0 && v < 49 && E.tile(level, v) !== "#";
  if (Number.isInteger(p.pos) && onPath(p.pos)) j.pos = p.pos;
  j.cat = Number.isInteger(p.cat) && onPath(p.cat) ? p.cat : j.pos;
  j.collected = cellsOf(p.collected, (v) =>
    level.stars.some((s) => s.at === v),
  );
  j.key = p.key === true;
  j.cache = p.cache === true;
  j.phase = p.phase === "sun" ? "sun" : "moon";
  j.moves = int(p.moves, 0, 1e6, 0);
  j.hints = int(p.hints, 0, 1e6, 0);
  j.dust = cellsOf(p.dust, (v) => (level.dust || []).includes(v));
  j.seen = level.fog ? cellsOf(p.seen, (v) => v >= 0 && v < 49) : [];
  if (level.fog) j.seen = [...new Set([...j.seen, ...E.around(j.pos)])];
  j.done = p.done === true;
  return j;
}

function load() {
  state = freshState();
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    saved = null;
  }
  try {
    if (saved?.version === 3) restore(saved);
    else migrate();
  } catch (error) {
    console.error(error);
    state = freshState();
  }
}

function cleanAnswer(a) {
  if (!a || typeof a !== "object") return null;
  const v = a.v;
  const ok =
    typeof v === "string" ||
    (Array.isArray(v) && v.every((x) => typeof x === "string")) ||
    Number.isInteger(v);
  if (!ok) return null;
  return {
    v,
    why: typeof a.why === "string" ? a.why.slice(0, 2000) : "",
    day: isDay(a.day) ? a.day : today(),
    sent: a.sent === true,
  };
}

function restore(s) {
  const ids = data.chapters.map((c) => c.id);
  state.started = s.started === true;
  state.completed = int(s.completed, 0, 6, 0);
  state.chapter = int(s.chapter, 0, Math.min(5, state.completed), 0);
  state.sound = s.sound === true;
  state.souvenirs = Array.isArray(s.souvenirs)
    ? s.souvenirs.filter((id) => ids.includes(id))
    : [];
  data.chapters.forEach((c, i) => {
    const level = chapterLevel(i);
    if (s.journeys?.[c.id] && typeof s.journeys[c.id] === "object")
      state.journeys[c.id] = cleanJourney(level, s.journeys[c.id]);
    const b = s.best?.[c.id];
    if (b && i < state.completed)
      state.best[c.id] = {
        stars: int(b.stars, 1, 3, 1),
        moves: int(b.moves, 0, 1e6, 0),
      };
    const sp = s.found?.sparks?.[c.id];
    if (sp)
      state.found.sparks[c.id] = cellsOf(sp, (v) =>
        c.stars.some((x) => x.at === v),
      );
    state.dustTaken[c.id] = cellsOf(s.dustTaken?.[c.id], (v) =>
      level.dust.includes(v),
    );
  });
  state.found.secrets = (s.found?.secrets || []).filter((id) =>
    ids.includes(id),
  );
  state.found.notes = cellsOf(
    s.found?.notes,
    (v) => v >= 0 && v < data.daily.notes.length,
  );
  const sess = s.session || {};
  if (sess.type === "daily") state.session = { type: "daily" };
  else
    state.session = {
      type: "chapter",
      index: int(sess.index, 0, Math.min(5, state.completed), state.chapter),
    };
  state.pendingEnd = cleanEnd(s.pendingEnd);
  state.dust = int(s.dust, 0, 1e7, 0);
  state.owned = (s.owned || []).filter((id) => SHOP.some((x) => x.id === id));
  for (const slot of Object.keys(SLOTS)) {
    const id = s.equip?.[slot];
    state.equip[slot] =
      id &&
      state.owned.includes(id) &&
      SHOP.find((x) => x.id === id).slot === slot
        ? id
        : null;
  }
  state.badges = (s.badges || []).filter((id) =>
    BADGES.some((b) => b.id === id),
  );
  state.minis = (s.minis || []).filter((id) =>
    data.chapters.some((c) => c.game === id),
  );
  for (const k of Object.keys(state.stats))
    if (k === "pairsBest")
      state.stats.pairsBest = Number.isInteger(s.stats?.pairsBest)
        ? s.stats.pairsBest
        : null;
    else state.stats[k] = int(s.stats?.[k], 0, 1e9, 0);
  const st = s.streak || {};
  state.streak = {
    count: int(st.count, 0, 1e5, 0),
    best: int(st.best, 0, 1e5, 0),
    last: isDay(st.last) ? st.last : null,
    grace: isDay(st.grace) ? st.grace : null,
    rewarded: (st.rewarded || []).filter((n) => STREAK_REWARDS[n]),
  };
  for (const [id, a] of Object.entries(s.answers || {})) {
    const clean = qById(id) && cleanAnswer(a);
    if (clean) state.answers[id] = clean;
  }
  state.skipped = (s.skipped || []).filter((id) => qById(id));
  for (const [id, a] of Object.entries(s.blitzAnswers || {})) {
    if (!data.blitz.some((b) => b.id === id)) continue;
    if (a && (a.v === "a" || a.v === "b"))
      state.blitzAnswers[id] = {
        v: a.v,
        day: isDay(a.day) ? a.day : today(),
        sent: a.sent === true,
      };
  }
  state.coupons = (Array.isArray(s.coupons) ? s.coupons : [])
    .filter((c) => c && typeof c.text === "string" && isDay(c.got))
    .map((c) => ({ text: c.text, got: c.got, used: isDay(c.used) ? c.used : null }));
  const pk = s.persik || {};
  state.persik = {
    xp: int(pk.xp, 0, 1e6, 0),
    fed: isDay(pk.fed) ? pk.fed : null,
    petsToday: int(pk.petsToday, 0, 1e6, 0),
    petsDay: isDay(pk.petsDay) ? pk.petsDay : null,
  };
  state.questionsIntro = s.questionsIntro === true;
  const ar = s.arcade || {};
  const gameIds = data.arcade.games.map((g) => g.id);
  for (const id of gameIds) {
    if (Number.isInteger(ar.best?.[id])) state.arcade.best[id] = Math.max(0, ar.best[id]);
    if (Number.isInteger(ar.plays?.[id])) state.arcade.plays[id] = Math.max(0, ar.plays[id]);
    const f = ar.feedback?.[id];
    if (f && (f.v === "up" || f.v === "down"))
      state.arcade.feedback[id] = { v: f.v, day: isDay(f.day) ? f.day : today(), sent: f.sent === true };
  }
  state.arcade.day = isDay(ar.day) ? ar.day : null;
  state.arcade.dust = int(ar.dust, 0, 1e6, 0);
  state.arcade.wins = int(ar.wins, 0, 1e6, 0);
  state.arcade.flags = (ar.flags || []).filter((f) => typeof f === "string");
  if (ar.word && isDay(ar.word.day) && Array.isArray(ar.word.guesses))
    state.arcade.word = {
      day: ar.word.day,
      guesses: ar.word.guesses.filter((g) => window.ArcadeLogic.isWord(g)).slice(0, 6),
      done: ar.word.done === true,
      won: ar.word.won === true,
    };
  if (s.day && s.day.key === today()) restoreDay(s.day);
}

function cleanEnd(e) {
  if (!e || typeof e !== "object" || !["chapter", "daily"].includes(e.type))
    return null;
  if (
    e.type === "chapter" &&
    !(Number.isInteger(e.index) && e.index >= 0 && e.index < 6)
  )
    return null;
  return {
    type: e.type,
    index: e.type === "chapter" ? e.index : undefined,
    first: e.first === true,
    stars: int(e.stars, 1, 3, 1),
    moves: int(e.moves, 0, 1e6, 0),
    limit: int(e.limit, 0, 1e6, 0),
    hints: int(e.hints, 0, 1e6, 0),
    reward: int(e.reward, 0, 1e6, 0),
    lines: Array.isArray(e.lines)
      ? e.lines.filter((l) => typeof l === "string")
      : [],
  };
}
const stripQuest = ({ id, metric, goal, text, claimed }) => ({
  id,
  metric,
  goal,
  text,
  claimed,
});

function restoreDay(d) {
  const level = dailyLevel(d.key);
  const quests = Array.isArray(d.quests)
    ? d.quests
        .map((q) => {
          const base = E.QUESTS.find((x) => x.id === q.id);
          return base && { ...base, claimed: q.claimed === true };
        })
        .filter(Boolean)
    : [];
  state.day = newDay(d.key);
  if (quests.length === 3) state.day.quests = quests.map(stripQuest);
  state.day.chest = d.chest === true;
  state.day.note = d.note === true;
  state.day.maze = cleanJourney(level, d.maze || {});
  for (const [k, v] of Object.entries(d.counters || {}))
    if (Number.isInteger(v) && v >= 0) state.day.counters[k] = v;
  if (qById(d.question)) state.day.question = d.question;
  state.day.asked = (d.asked || []).filter((id) => qById(id));
  state.day.extra = int(d.extra, 0, EXTRA_QUESTIONS, 0);
  state.day.blitzDone = d.blitzDone === true;
  state.day.blitzStep = int(d.blitzStep, 0, 5, 0);
  state.day.spin =
    d.spin && Number.isInteger(d.spin.index) && data.wheel[d.spin.index]
      ? { index: d.spin.index, outcome: String(d.spin.outcome || "") }
      : null;
  state.day.double = d.double === true;
}

// Version 2 saves continue where they were: same chapter, map position and finds.
function migrate() {
  let old = null;
  try {
    old = JSON.parse(localStorage.getItem(OLD_KEY) || "null");
  } catch {
    old = null;
  }
  if (old?.version === 2) {
    state.started = old.started === true;
    state.completed = int(old.completed, 0, 6, 0);
    state.chapter = int(old.chapter, 0, Math.min(5, state.completed), 0);
    state.sound = old.sound === true;
    state.souvenirs = Array.isArray(old.souvenirs)
      ? old.souvenirs.filter((id) => data.chapters.some((c) => c.id === id))
      : [];
    data.chapters.forEach((c, i) => {
      const p = old.journeys?.[c.id];
      if (p && typeof p === "object") {
        const j = cleanJourney(chapterLevel(i), p);
        state.journeys[c.id] = j;
        if (j.collected.length) state.found.sparks[c.id] = [...j.collected];
        if (j.cache) state.found.secrets.push(c.id);
      }
      if (i < state.completed) {
        state.best[c.id] = {
          stars: 1,
          moves: state.journeys[c.id]?.moves || 0,
        };
        state.minis.push(c.game);
      }
    });
    if (state.chapter < state.completed && state.completed < 6)
      state.chapter = state.completed;
    state.session = { type: "chapter", index: state.chapter };
    return;
  }
  for (const key of ["nastya-universe-v1", "nastya_universe_v1"]) {
    try {
      const v1 = JSON.parse(localStorage.getItem(key) || "null");
      const ids = v1?.completed || v1?.done;
      if (Array.isArray(ids))
        state.souvenirs.push(
          ...ids.filter((id) => data.chapters.some((c) => c.id === id)),
        );
    } catch {
      /* A damaged old save must not block play. */
    }
  }
  state.souvenirs = [...new Set(state.souvenirs)];
}

// ---------- Day, quests, streak, rewards ----------

const questContext = () => ({
  minis: state.minis.length,
  chapters: state.completed,
});
// Next question in the bank she has neither answered nor skipped today.
function nextQuestion(exclude = []) {
  const open = data.questions.filter(
    (q) => !state.answers[q.id] && !exclude.includes(q.id),
  );
  const fresh = open.filter((q) => !state.skipped.includes(q.id));
  return (fresh[0] || open[0] || null)?.id || null;
}
function newDay(key) {
  return {
    key,
    quests: E.pickQuests(key, questContext()),
    counters: {},
    chest: false,
    note: false,
    maze: freshJourney(dailyLevel(key)),
    question: nextQuestion(),
    asked: [],
    extra: 0,
    blitzDone: false,
    blitzStep: 0,
    spin: null,
    double: false,
  };
}
function ensureDay() {
  const key = today();
  if (!state.day || state.day.key !== key) {
    state.day = newDay(key);
    if (state.session.type === "daily") {
      state.session = { type: "chapter", index: state.chapter };
      if (state.pendingEnd?.type === "daily") state.pendingEnd = null;
    }
  }
  return state.day;
}
const questDone = (q) => (state.day.counters[q.metric] || 0) >= q.goal;
const questsReady = () =>
  ensureDay().quests.filter((q) => questDone(q) && !q.claimed).length;
const questsClaimed = () => ensureDay().quests.filter((q) => q.claimed).length;

function bump(metric, n = 1) {
  const day = ensureDay();
  const before = day.quests.filter(questDone).map((q) => q.id);
  day.counters[metric] = (day.counters[metric] || 0) + n;
  touchStreak();
  for (const q of day.quests)
    if (questDone(q) && !before.includes(q.id))
      notify(`Задание выполнено: ${q.text}. Награда в разделе "Сегодня"`);
  save();
  updateShell();
}

function touchStreak() {
  const key = today(),
    s = state.streak;
  if (s.last === key) return;
  const gap = s.last ? E.dayNumber(key) - E.dayNumber(s.last) : 0;
  const graceFree = !s.grace || E.dayNumber(key) - E.dayNumber(s.grace) >= 7;
  if (gap === 1) s.count++;
  else if (gap === 2 && graceFree) {
    s.count++;
    s.grace = key;
    setTimeout(
      () =>
        notify(
          "Вчера тебя не было, но Персик сохранил серию. Так можно раз в неделю",
        ),
      1200,
    );
  } else s.count = 1;
  s.last = key;
  s.best = Math.max(s.best, s.count);
  for (const [n, reward] of Object.entries(STREAK_REWARDS))
    if (s.count >= Number(n) && !s.rewarded.includes(Number(n))) {
      s.rewarded.push(Number(n));
      addDust(reward);
      setTimeout(
        () =>
          notify(
            `${n} ${plural(Number(n), "день", "дня", "дней")} подряд. +${reward} пыли`,
          ),
        2600,
      );
    }
  checkBadges();
}

function addDust(n) {
  state.dust += n;
  const chip = $("#dust-chip");
  if (chip && !reducedMotion()) {
    chip.classList.remove("pop");
    void chip.offsetWidth;
    chip.classList.add("pop");
  }
}

function checkBadges() {
  for (const b of BADGES) {
    if (state.badges.includes(b.id) || !b.test(state)) continue;
    state.badges.push(b.id);
    addDust(REWARD.badge);
    setTimeout(
      () => notify(`Новый значок: ${b.title}. +${REWARD.badge} пыли`),
      700,
    );
  }
}

function claimQuest(id) {
  const q = ensureDay().quests.find((x) => x.id === id);
  if (!q || q.claimed || !questDone(q)) return;
  q.claimed = true;
  addDust(REWARD.quest);
  sfx("coin");
  buzz(20);
  if (questsClaimed() === 3) notify("Все задания выполнены. Открой сундук");
  save();
  updateShell();
  renderToday();
}
function openChest() {
  const day = ensureDay();
  if (day.chest || questsClaimed() < 3) return;
  day.chest = true;
  state.stats.chests++;
  addDust(REWARD.chest);
  checkBadges();
  sfx("win");
  burst();
  P.celebrate();
  save();
  updateShell();
  renderToday();
  notify(`В сундуке ${REWARD.chest} пыли`);
}

const noteIndex = (key = today()) =>
  ((E.dayNumber(key) % data.daily.notes.length) + data.daily.notes.length) %
  data.daily.notes.length;
function readNote() {
  const day = ensureDay(),
    i = noteIndex();
  if (!day.note) {
    day.note = true;
    if (!state.found.notes.includes(i)) state.found.notes.push(i);
    checkBadges();
    bump("note");
  }
  showNote(data.daily.notes[i], "Записка на сегодня");
}
function giveExtraNote(free = false) {
  const next = data.daily.notes.findIndex(
    (_, i) => !state.found.notes.includes(i),
  );
  if (next < 0) {
    if (free) addDust(15);
    return notify(
      free
        ? "Все записки уже прочитаны, вместо записки +15 пыли"
        : "Ты прочитала все записки. Саша пишет новые",
    );
  }
  if (!free) {
    if (state.dust < EXTRA_NOTE_PRICE) return notify("Не хватает пыли");
    state.dust -= EXTRA_NOTE_PRICE;
  }
  state.found.notes.push(next);
  checkBadges();
  save();
  updateShell();
  showNote(data.daily.notes[next], "Записка вне очереди");
}
function showNote(text, title) {
  openModal(
    `<div class="note-card paper"><span class="eyebrow">${esc(title)}</span><p class="hand note-text">${esc(text)}</p><span class="hand note-sign">Саша</span></div>`,
  );
  sfx("open");
}

function petCat(from) {
  state.stats.pets++;
  const key = today(),
    pk = state.persik;
  if (pk.petsDay !== key) {
    pk.petsDay = key;
    pk.petsToday = 0;
  }
  pk.petsToday++;
  if (pk.petsToday <= 5) gainFriendship(1);
  sfx("purr");
  buzz(10);
  if (from && from !== P.el) heartFrom(from);
  checkBadges();
  bump("pet");
  if (activeTab === "today") refreshPersikTile();
}
function gainFriendship(n) {
  const before = friendLevel();
  state.persik.xp += n;
  const after = friendLevel();
  if (after > before)
    setTimeout(() => {
      notify(`Персик и ты: ${data.persik.levels[after - 1]}`);
      P.celebrate();
    }, 400);
  checkBadges();
}
function feedPersik() {
  const key = today();
  if (state.persik.fed === key) return;
  state.persik.fed = key;
  gainFriendship(3);
  sfx("coin", 0.8);
  P.say(data.persik.fed, 3200);
  P.celebrate();
  bump("feed");
  refreshPersikTile();
}

// ---------- Questions from Sasha ----------

function answerSummary(q, a) {
  if (!a) return "";
  if (q.type === "scale") return `${a.v} из 5`;
  if (Array.isArray(a.v)) return a.v.join(", ");
  return String(a.v);
}

function questionForm(q) {
  const field = {
    text: () =>
      `<label class="sr" for="qa-text">Ответ</label><textarea id="qa-text" class="paper-input hand" rows="4" maxlength="2000" placeholder="${esc(q.placeholder || "Пиши как есть")}"></textarea>`,
    choice: () =>
      `<div class="choice-row" role="radiogroup" aria-label="Варианты">${q.options.map((o, i) => `<button type="button" class="choice" role="radio" aria-checked="false" data-opt="${i}">${esc(o)}</button>`).join("")}${q.other ? '<button type="button" class="choice" role="radio" aria-checked="false" data-opt="other">Другое</button>' : ""}</div>`,
    multi: () =>
      `<div class="choice-row" aria-label="Можно выбрать несколько">${q.options.map((o, i) => `<button type="button" class="choice" aria-pressed="false" data-opt="${i}">${esc(o)}</button>`).join("")}${q.other ? '<button type="button" class="choice" aria-pressed="false" data-opt="other">Другое</button>' : ""}</div><small class="paper-hint">Можно выбрать несколько</small>`,
    scale: () =>
      `<div class="scale-row" role="radiogroup" aria-label="Шкала от 1 до 5">${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="scale-dot" role="radio" aria-checked="false" data-scale="${n}">${n}</button>`).join("")}</div><div class="scale-ends"><span>${esc(q.low)}</span><span>${esc(q.high)}</span></div>`,
  }[q.type]();
  const other =
    q.other && q.type !== "text"
      ? `<label class="sr" for="qa-other">Свой вариант</label><input id="qa-other" class="paper-input line" maxlength="200" placeholder="Свой вариант" hidden>`
      : "";
  const why =
    q.why && q.type !== "text"
      ? `<label class="paper-label" for="qa-why">Почему? Можно не писать</label><textarea id="qa-why" class="paper-input hand" rows="2" maxlength="1000"></textarea>`
      : "";
  return `${field}${other}${why}`;
}

function readForm(q) {
  if (q.type === "text") {
    const v = $("#qa-text").value.trim();
    return v ? { v, why: "" } : null;
  }
  const why = $("#qa-why")?.value.trim() || "";
  const other = $("#qa-other")?.value.trim() || "";
  if (q.type === "scale") {
    const b = $(".scale-dot[aria-checked='true']");
    return b ? { v: Number(b.dataset.scale), why } : null;
  }
  const picked = $$(".choice").filter(
    (b) => b.getAttribute(q.type === "multi" ? "aria-pressed" : "aria-checked") === "true",
  );
  const labels = picked.map((b) =>
    b.dataset.opt === "other" ? other : q.options[Number(b.dataset.opt)],
  ).filter(Boolean);
  if (!labels.length) return null;
  return { v: q.type === "multi" ? labels : labels[0], why };
}

function wireForm(q, onChange) {
  $$(".choice").forEach(
    (b) =>
      (b.onclick = () => {
        if (q.type === "multi") {
          b.setAttribute(
            "aria-pressed",
            String(b.getAttribute("aria-pressed") !== "true"),
          );
        } else {
          $$(".choice").forEach((x) => x.setAttribute("aria-checked", "false"));
          b.setAttribute("aria-checked", "true");
        }
        const otherOn = $$(".choice[data-opt='other']").some(
          (x) =>
            x.getAttribute("aria-pressed") === "true" ||
            x.getAttribute("aria-checked") === "true",
        );
        if ($("#qa-other")) {
          $("#qa-other").hidden = !otherOn;
          if (otherOn) $("#qa-other").focus();
        }
        sfx("step", 1.3);
        onChange();
      }),
  );
  $$(".scale-dot").forEach(
    (b) =>
      (b.onclick = () => {
        $$(".scale-dot").forEach((x) => x.setAttribute("aria-checked", "false"));
        b.setAttribute("aria-checked", "true");
        sfx("step", 1 + Number(b.dataset.scale) * 0.08);
        onChange();
      }),
  );
  $$("#qa-text, #qa-other, #qa-why").forEach((el) =>
    el.addEventListener("input", onChange),
  );
}

function submitAnswer(q, answer, { edit = false } = {}) {
  const day = ensureDay();
  const first = !state.answers[q.id];
  state.answers[q.id] = { ...answer, day: today(), sent: false };
  state.skipped = state.skipped.filter((id) => id !== q.id);
  if (!day.asked.includes(q.id)) day.asked.push(q.id);
  if (!edit && first && !day.counters.question) {
    addDust(REWARD.question);
    notify(`Ответ сохранён. +${REWARD.question} пыли`);
  } else notify("Ответ сохранён");
  sfx("spark");
  P.celebrate();
  checkBadges();
  bump("question");
  deliver();
}
function skipQuestion(id) {
  const day = ensureDay();
  if (!state.skipped.includes(id)) state.skipped.push(id);
  if (!day.asked.includes(id)) day.asked.push(id);
  day.question = nextQuestion(day.asked);
  save();
  renderToday();
}
function moreQuestion() {
  const day = ensureDay();
  if (day.extra >= EXTRA_QUESTIONS) return;
  const next = nextQuestion(day.asked);
  if (!next) return notify("Вопросы пока закончились. Саша придумает новые");
  day.extra++;
  day.question = next;
  save();
  renderToday();
  $("#question-card")?.scrollIntoView({ block: "nearest", behavior: reducedMotion() ? "auto" : "smooth" });
}

function questionCard() {
  const day = ensureDay();
  const intro = state.questionsIntro
    ? ""
    : `<div class="q-intro"><p class="hand">${esc(data.profile.intro)}</p><button class="link-ink" id="q-intro">Понятно, больше не показывать</button></div>`;
  const q = qById(day.question);
  if (!q)
    return `<section class="tile paper question-tile" id="question-card"><span class="eyebrow">${icon("ask")} Вопрос от Саши</span><h2 class="hand big">Ты ответила на все вопросы</h2><p class="paper-text">Саша прочитает и придумает новые.</p>${sendBlock()}</section>`;
  const cat = data.profile.forHer[q.cat] || data.profile.categories[q.cat];
  const a = state.answers[q.id];
  if (a)
    return `<section class="tile paper question-tile answered" id="question-card" data-perch><span class="eyebrow">${icon("ask")} Вопрос от Саши · ${esc(cat)}</span><h2 class="hand q-text">${esc(q.q)}</h2><blockquote class="answer">${esc(answerSummary(q, a))}${a.why ? `<small>${esc(a.why)}</small>` : ""}</blockquote>${sendBlock()}<div class="paper-actions">${day.extra < EXTRA_QUESTIONS && nextQuestion(day.asked) ? `<button class="btn ghost-ink" id="q-more">Ещё один вопрос</button>` : ""}<button class="link-ink" id="q-edit">${icon("edit")} Изменить ответ</button></div></section>`;
  return `<section class="tile paper question-tile" id="question-card" data-perch><span class="eyebrow">${icon("ask")} Вопрос от Саши · ${esc(cat)}</span>${intro}<h2 class="hand q-text">${esc(q.q)}</h2><form id="q-form" class="q-form">${questionForm(q)}<div class="paper-actions"><button type="submit" class="btn ink" id="q-submit" disabled>Ответить ${icon("arrow")}</button><button type="button" class="link-ink" id="q-skip">Пропустить</button></div></form><p class="paper-foot">${inboxConfig() ? "Ответ сразу уйдёт Саше. Любой вопрос можно пропустить." : "Ответ уйдёт Саше, только когда ты нажмёшь \"Отправить\"."}</p></section>`;
}

function unsentRows() {
  const rows = [];
  for (const [id, a] of Object.entries(state.answers))
    if (!a.sent) rows.push([id, a.v, a.why || "", a.day]);
  for (const [id, a] of Object.entries(state.blitzAnswers))
    if (!a.sent) rows.push([id, a.v, "", a.day]);
  for (const [id, f] of Object.entries(state.arcade.feedback))
    if (!f.sent) rows.push([`g:${id}`, f.v, "", f.day]);
  return rows;
}
function sendBlock() {
  return `<div class="send-status" data-send-status>${sendStatusHtml()}</div>`;
}
// What Nastya sees about delivery. With the sealed inbox answers go by
// themselves; without it (local copy) she sends a link as before.
function sendStatusHtml() {
  const n = unsentRows().length;
  if (!inboxConfig())
    return n
      ? `<button class="btn send" data-send>${icon("send")} Отправить Саше <span class="count">${n}</span></button>`
      : `<p class="paper-sent">${icon("check")} Всё отправлено Саше</p>`;
  if (!n) return `<p class="paper-sent">${icon("check")} Саша получил</p>`;
  if (outbox.busy) return `<p class="paper-sent sending">${icon("send")} Отправляю Саше…</p>`;
  if (outbox.failed)
    return `<p class="send-failed">Нет связи. Ответ сохранён и уйдёт Саше сам, когда появится интернет.</p><div class="send-actions"><button class="btn send" data-deliver>${icon("send")} Отправить ещё раз</button><button class="link-ink" data-send>Отправить ссылкой</button></div>`;
  return `<button class="btn send" data-deliver>${icon("send")} Отправить Саше <span class="count">${n}</span></button>`;
}

// ---------- Delivery to Sasha ----------

const inboxConfig = () => (window.Vault && window.Vault.inbox ? window.Vault.inbox() : null);
const outbox = { busy: false, failed: false };

function markRowsSent(rows) {
  for (const [id] of rows) {
    if (state.answers[id]) state.answers[id].sent = true;
    if (state.blitzAnswers[id]) state.blitzAnswers[id].sent = true;
    const f = String(id).startsWith("g:") && state.arcade.feedback[id.slice(2)];
    if (f) f.sent = true;
  }
  save();
}

function refreshDelivery() {
  $$("[data-send-status]").forEach((el) => (el.innerHTML = sendStatusHtml()));
  const note = $("#home-note-slot");
  if (note) {
    note.innerHTML = homeNote();
    wireHomeNote();
  }
  updateShell();
}

// Sends everything not yet with Sasha in one issue. Quiet on app start and
// when she leaves; out loud after she answers.
async function deliver({ keepalive = false, loud = true } = {}) {
  const config = inboxConfig();
  const rows = unsentRows();
  if (!config || !rows.length || outbox.busy) return rows.length ? "manual" : "none";
  outbox.busy = true;
  refreshDelivery();
  const ok = await window.Inbox.send(config, window.Inbox.format(rows, readable), { keepalive });
  outbox.busy = false;
  outbox.failed = !ok;
  if (ok) {
    markRowsSent(rows);
    if (loud || rows.some(([id]) => qById(id)))
      notify(rows.length === 1 ? "Саша получил ответ" : `Саша получил ответы: ${rows.length}`);
  }
  refreshDelivery();
  if (activeTab === "album" && !modal.open) renderAlbum();
  return ok ? "sent" : "failed";
}

// Top of the Path tab: today's question or answers still on the phone.
function homeNote() {
  if (!state.started) return "";
  const n = unsentRows().length;
  if (n && (outbox.failed || !inboxConfig()))
    return `<div class="home-note pending" id="home-note" data-perch><p>${icon("send")} <span>Ответы ещё не у Саши: <b>${n}</b></span></p><button class="btn small" ${inboxConfig() ? "data-deliver" : "data-send"}>Отправить Саше</button></div>`;
  const day = ensureDay();
  const q = qById(day.question);
  if (q && !state.answers[q.id])
    return `<button class="home-note ask" id="home-note" data-perch><span class="home-note-label">${icon("ask")} Саша спрашивает</span><span class="hand home-note-q">${esc(q.q)}</span><span class="btn small home-note-go" aria-hidden="true">Ответить ${icon("arrow")}</span></button>`;
  return "";
}
let homeNoteShown = "";
function wireHomeNote() {
  const note = $("#home-note");
  if (!note) return;
  if (note.classList.contains("ask"))
    note.onclick = () => {
      navigate("today");
      const card = $("#question-card");
      if (!card) return;
      card.scrollIntoView({ block: "start", behavior: reducedMotion() ? "auto" : "smooth" });
      setTimeout(() => {
        $("#qa-text, .scale-dot, .choice", card)?.focus?.({ preventScroll: true });
        if (!TEST) P.visit(card, "Вот вопрос");
      }, reducedMotion() ? 0 : 450);
    };
  // Persik points at it once per day and kind, then leaves it alone.
  const kind = `${today()}:${note.classList.contains("ask") ? "ask" : "send"}`;
  if (!TEST && homeNoteShown !== kind) {
    homeNoteShown = kind;
    setTimeout(() => note.isConnected && P.visit(note, note.classList.contains("ask") ? "Саша прислал вопрос" : "Это для Саши"), 900);
  }
}

function readable(row) {
  const [id, v, why] = row;
  const q = qById(id);
  if (q) {
    const ans = q.type === "scale" ? `${v} из 5` : Array.isArray(v) ? v.join(", ") : v;
    return `${q.q}\n${ans}${why ? ` (${why})` : ""}`;
  }
  const b = data.blitz.find((x) => x.id === id);
  if (b) return `${b.a} или ${b.b}: ${v === "a" ? b.a : b.b}`;
  const g = String(id).startsWith("g:") && arcadeGame(id.slice(2));
  return g ? `Игра "${g.title}": ${v === "up" ? "понравилась" : "не очень"}` : "";
}

// Packs unsent answers into a link for Sasha. Phone: share sheet straight to
// Telegram. Elsewhere: a window with the text to copy.
async function sendToSasha() {
  const rows = unsentRows();
  if (!rows.length) return notify("Новых ответов нет");
  const code = await window.ShareCodec.encode({
    v: 1,
    n: "Настя",
    t: Date.now(),
    a: rows,
  });
  const url = new URL("sasha.html", location.href);
  url.search = "";
  url.hash = code;
  const preview = rows
    .slice(0, 3)
    .map(readable)
    .filter(Boolean)
    .join("\n\n");
  const text = `Ответы для Саши: ${rows.length}\n\n${preview}${rows.length > 3 ? "\n\n..." : ""}\n\nВсё целиком по ссылке:`;
  const markSent = () => {
    markRowsSent(rows);
    outbox.failed = false;
    refreshDelivery();
    if (activeTab === "album") renderAlbum();
  };
  if (navigator.share && !TEST) {
    try {
      await navigator.share({ title: "Ответы для Саши", text, url: url.href });
      markSent();
      notify("Отправлено");
      return;
    } catch (e) {
      if (e?.name === "AbortError") return;
    }
  }
  const full = `${text}\n${url.href}`;
  openModal(
    `<span class="eyebrow">${icon("send")} Отправить Саше</span><h2 id="modal-title">Скопируй и пришли Саше</h2><p>Например, в Telegram. По ссылке ответы сохранятся у него.</p><label class="sr" for="share-text">Текст для Саши</label><textarea id="share-text" class="share-text" rows="7" readonly>${esc(full)}</textarea><div class="modal-actions"><button class="btn" id="share-copy">${icon("copy")} Скопировать</button></div>`,
  );
  $("#share-copy").onclick = async () => {
    try {
      await navigator.clipboard.writeText(full);
    } catch {
      $("#share-text").select();
      document.execCommand?.("copy");
    }
    markSent();
    notify("Скопировано. Осталось отправить Саше");
    modal.close();
  };
}

// ---------- Blitz ----------

function blitzCard() {
  const day = ensureDay();
  const ids = E.pickBlitz(day.key, data.blitz.length).map((i) => data.blitz[i]);
  if (day.blitzDone)
    return `<section class="tile blitz-tile done" id="blitz" data-perch><span class="eyebrow">${icon("spark")} Блиц · это или то</span><h2>Сегодня выбрано</h2><ul class="blitz-sum">${ids.map((b) => `<li><b>${esc(state.blitzAnswers[b.id]?.v === "b" ? b.b : b.a)}</b><span>вместо "${esc(state.blitzAnswers[b.id]?.v === "b" ? b.a : b.b)}"</span></li>`).join("")}</ul></section>`;
  const b = ids[day.blitzStep];
  return `<section class="tile blitz-tile" id="blitz" data-perch><span class="eyebrow">${icon("spark")} Блиц · это или то</span><div class="blitz-progress">${ids.map((_, i) => `<i class="${i < day.blitzStep ? "on" : i === day.blitzStep ? "now" : ""}"></i>`).join("")}</div><div class="blitz-pair"><button class="blitz-pick" data-pick="a">${esc(b.a)}</button><span class="blitz-or">или</span><button class="blitz-pick" data-pick="b">${esc(b.b)}</button></div><p class="tile-foot">Не думай долго. +${REWARD.blitz} пыли за пять ответов.</p></section>`;
}
function pickBlitz(v) {
  const day = ensureDay();
  const ids = E.pickBlitz(day.key, data.blitz.length).map((i) => data.blitz[i]);
  const b = ids[day.blitzStep];
  if (!b || day.blitzDone) return;
  state.blitzAnswers[b.id] = { v, day: day.key, sent: false };
  day.blitzStep++;
  sfx("step", v === "a" ? 1.1 : 1.3);
  buzz(8);
  if (day.blitzStep >= ids.length) {
    day.blitzDone = true;
    state.stats.blitz++;
    addDust(REWARD.blitz);
    notify(`Блиц пройден. +${REWARD.blitz} пыли`);
    checkBadges();
    bump("blitz");
  } else save();
  const el = $("#blitz");
  if (el) {
    el.outerHTML = blitzCard();
    wireBlitz();
    if (!reducedMotion()) $("#blitz .blitz-pair")?.classList.add("enter");
  }
}
const wireBlitz = () =>
  $$("[data-pick]").forEach((b) => (b.onclick = () => pickBlitz(b.dataset.pick)));

// ---------- Wheel ----------

function wheelSvg() {
  const segs = data.wheel,
    n = segs.length,
    r = 100;
  const tones = ["#2b367a", "#34408a"];
  const parts = segs
    .map((s, i) => {
      const a0 = (i / n) * Math.PI * 2 - Math.PI / 2,
        a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
      const x0 = 110 + r * Math.cos(a0),
        y0 = 110 + r * Math.sin(a0),
        x1 = 110 + r * Math.cos(a1),
        y1 = 110 + r * Math.sin(a1);
      const mid = (a0 + a1) / 2,
        tx = 110 + 64 * Math.cos(mid),
        ty = 110 + 64 * Math.sin(mid);
      const deg = (mid * 180) / Math.PI;
      const special = s.kind !== "dust";
      return `<path d="M110 110L${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}Z" fill="${special ? "#ffcf5a" : tones[i % 2]}" fill-opacity="${special ? 0.9 : 1}" stroke="#141a2e" stroke-width="2"/><text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" transform="rotate(${deg.toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)})" text-anchor="middle" dominant-baseline="middle" class="wheel-label ${special ? "dark" : ""}">${esc(s.label)}</text>`;
    })
    .join("");
  return `<svg viewBox="0 0 220 220" class="wheel-svg" role="img" aria-label="Колесо с наградами"><g class="wheel-rot">${parts}<circle cx="110" cy="110" r="16" fill="#141a2e" stroke="#ffcf5a" stroke-width="3"/></g><path d="M110 4l9 18h-18z" fill="#f6efe6" stroke="#141a2e" stroke-width="2"/></svg>`;
}
function wheelCard() {
  const day = ensureDay();
  const spun = day.spin;
  return `<section class="tile wheel-tile" id="wheel" data-perch><span class="eyebrow">${icon("wheel")} Колесо Персика</span><div class="wheel-wrap">${wheelSvg()}</div>${spun ? `<p class="wheel-result">${icon("check")} ${esc(spun.outcome)}</p><p class="tile-foot">Следующее вращение завтра.</p>` : `<button class="btn" id="spin">Крутить ${icon("arrow")}</button><p class="tile-foot">Один раз в день.</p>`}</section>`;
}
function spin() {
  const day = ensureDay();
  if (day.spin) return;
  let index = E.spinWheel(day.key, data.wheel);
  const seg = data.wheel[index];
  let outcome = "";
  // At most one coupon a week; otherwise the slice pays dust.
  const lastCoupon = state.coupons.length
    ? state.coupons[state.coupons.length - 1].got
    : null;
  const couponOk =
    !lastCoupon || E.dayNumber(day.key) - E.dayNumber(lastCoupon) >= 7;
  const apply = () => {
    if (seg.kind === "dust") {
      addDust(seg.value);
      outcome = `+${seg.value} пыли`;
    } else if (seg.kind === "note") {
      outcome = "Записка вне очереди";
      giveExtraNote(true);
    } else if (seg.kind === "double") {
      day.double = true;
      outcome = "Сегодня лабиринт дня даёт двойную пыль";
    } else if (seg.kind === "treat") {
      gainFriendship(5);
      outcome = "Персику вкусняшка: +5 к дружбе";
      P.celebrate();
    } else if (seg.kind === "coupon" && couponOk) {
      const used = state.coupons.map((c) => c.text);
      const text =
        data.coupons.find((c) => !used.includes(c)) ||
        data.coupons[state.coupons.length % data.coupons.length];
      state.coupons.push({ text, got: day.key, used: null });
      outcome = `Купон: ${text}`;
      setTimeout(
        () => notify("Купон лежит в альбоме. Предъяви Саше, когда захочешь"),
        900,
      );
    } else {
      addDust(20);
      outcome = "+20 пыли (купон уже был на этой неделе)";
    }
    day.spin = { index, outcome };
    checkBadges();
    bump("spin");
    const el = $("#wheel");
    if (el) {
      el.outerHTML = wheelCard();
      $("#wheel .wheel-rot").style.transform = `rotate(${finalAngle}deg)`;
    }
  };
  const n = data.wheel.length;
  const finalAngle = 360 * 5 - (index + 0.5) * (360 / n);
  const rot = $("#wheel .wheel-rot");
  $("#spin").disabled = true;
  sfx("open");
  if (rot && !reducedMotion()) {
    rot.style.transition = "transform 3.4s cubic-bezier(.12,.8,.18,1)";
    requestAnimationFrame(() => (rot.style.transform = `rotate(${finalAngle}deg)`));
    setTimeout(() => {
      sfx("win");
      apply();
    }, 3500);
  } else apply();
}

// ---------- Coupons ----------

async function useCoupon(i) {
  const c = state.coupons[i];
  if (!c || c.used) return;
  const text = `Настя использует купон: ${c.text}`;
  const done = () => {
    c.used = today();
    save();
    renderAlbum();
    notify("Купон использован. Саша в курсе");
  };
  if (navigator.share && !TEST) {
    try {
      await navigator.share({ title: "Купон", text });
      return done();
    } catch (e) {
      if (e?.name === "AbortError") return;
    }
  }
  openModal(
    `<span class="eyebrow">${icon("ticket")} Купон</span><h2 id="modal-title">${esc(c.text)}</h2><p>Покажи Саше этот экран или отправь ему сообщение.</p><label class="sr" for="share-text">Сообщение</label><textarea id="share-text" class="share-text" rows="2" readonly>${esc(text)}</textarea><div class="modal-actions"><button class="btn" id="coupon-done">Использовать</button></div>`,
  );
  $("#coupon-done").onclick = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* Showing the screen is enough. */
    }
    modal.close();
    done();
  };
}

// ---------- Feedback: toast, sound, vibration, particles ----------

function notify(text) {
  const t = $("#toast");
  t.textContent = text;
  t.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("visible"), 3200);
}
const NOTES = {
  step: [[660, 0.0, 0.012]],
  spark: [
    [660, 0, 0.04],
    [880, 0.09, 0.04],
    [1320, 0.18, 0.035],
  ],
  key: [
    [520, 0, 0.04],
    [780, 0.1, 0.04],
  ],
  coin: [
    [990, 0, 0.03],
    [1320, 0.07, 0.03],
  ],
  win: [
    [523, 0, 0.04],
    [659, 0.12, 0.04],
    [784, 0.24, 0.04],
    [1046, 0.36, 0.045],
  ],
  open: [
    [440, 0, 0.03],
    [660, 0.1, 0.03],
  ],
  no: [
    [220, 0, 0.035],
    [196, 0.1, 0.03],
  ],
  purr: [
    [90, 0, 0.05],
    [80, 0.15, 0.05],
    [90, 0.3, 0.04],
  ],
};
function sfx(name, pitch = 1) {
  if (!state?.sound) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume().catch(() => {});
    for (const [freq, delay, vol] of NOTES[name] || NOTES.step) {
      const o = audio.createOscillator(),
        g = audio.createGain(),
        t = audio.currentTime + delay;
      o.type = name === "purr" ? "sawtooth" : "sine";
      o.frequency.value = freq * pitch;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
      o.connect(g).connect(audio.destination);
      o.start(t);
      o.stop(t + 0.36);
    }
  } catch {
    /* Sound is optional. */
  }
}
const buzz = (ms) => {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* Vibration is optional. */
  }
};
function burst(count = 18) {
  if (reducedMotion()) return;
  for (let i = 0; i < count; i++) {
    const e = document.createElement("span");
    e.className = "particle";
    e.innerHTML = icon(i % 2 ? "heart" : "spark");
    e.style.left = `${15 + Math.random() * 70}%`;
    e.style.top = `${45 + Math.random() * 35}%`;
    e.style.animationDelay = `${Math.random() * 0.35}s`;
    (modal.open ? modal : document.body).append(e);
    setTimeout(() => e.remove(), 2700);
  }
}
function heartFrom(el) {
  if (reducedMotion() || !el?.getBoundingClientRect) return;
  const r = el.getBoundingClientRect();
  const e = document.createElement("span");
  e.className = "particle";
  e.innerHTML = icon("heart");
  e.style.left = `${r.left + r.width / 2}px`;
  e.style.top = `${r.top}px`;
  document.body.append(e);
  setTimeout(() => e.remove(), 2400);
}

// ---------- Modal ----------

function openModal(html, cls = "") {
  modal.className = cls;
  $("#modal-content").innerHTML = html;
  if (!modal.open) modal.showModal();
  P.attach(modal);
}

// ---------- Shell and navigation ----------

function updateShell() {
  if (!state) return;
  $$("[data-tab]").forEach((b) => {
    if (b.dataset.tab === activeTab) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  const day = ensureDay();
  $("#dust").textContent = state.dust;
  $("#streak").textContent = streakNow();
  $("#dust-chip").setAttribute("aria-label", `Звёздная пыль: ${state.dust}`);
  $("#streak-chip").setAttribute("aria-label", `Дней подряд: ${streakNow()}`);
  const pending =
    questsReady() +
    (day.note ? 0 : 1) +
    (!day.question || state.answers[day.question] ? 0 : 1) +
    (day.spin ? 0 : 1);
  $$(".tab-badge").forEach((d) => {
    d.hidden = !state.started || pending === 0;
    d.textContent = pending;
  });
  $("#sound").setAttribute("aria-pressed", String(state.sound));
  $("#sound").setAttribute(
    "aria-label",
    state.sound ? "Выключить звук" : "Включить звук",
  );
  document.documentElement.dataset.map = state.equip.theme || "night";
}

function navigate(tab, focus = true) {
  stopMini();
  stopArcade();
  if (modal.open) modal.close();
  activeTab = tab;
  hintCell = -1;
  ensureDay();
  updateShell();
  ({
    adventure: renderAdventure,
    today: renderToday,
    route: renderRoute,
    wardrobe: renderWardrobe,
    album: renderAlbum,
    games: renderGames,
    letter: renderLetter,
  })[tab]();
  if (focus) {
    main.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  if (P.el && P.perched) P.goHome();
}
const heading = (eyebrow, title, subtitle = "") =>
  `<header class="page-heading"><span class="eyebrow">${eyebrow}</span><h1>${title}</h1>${subtitle ? `<p>${esc(subtitle)}</p>` : ""}</header>`;

function startChapter(i, replay = false) {
  const level = chapterLevel(i);
  if (replay) state.journeys[level.id] = freshJourney(level, true);
  state.session = { type: "chapter", index: i };
  state.pendingEnd = null;
  save();
  navigate("adventure");
}
function startDaily() {
  ensureDay();
  state.session = { type: "daily" };
  state.pendingEnd = null;
  save();
  navigate("adventure");
}

// ---------- Adventure screen ----------

function renderAdventure() {
  if (!state.started) return renderWelcome();
  if (state.pendingEnd) return renderLevelEnd(state.pendingEnd);
  if (state.session.type === "daily" && ensureDay().maze.done)
    state.session = { type: "chapter", index: state.chapter };
  if (
    state.session.type === "chapter" &&
    state.completed >= 6 &&
    !state.journeys[data.chapters[state.session.index].id]?.replay &&
    state.session.index === state.chapter
  )
    return renderStoryDone();
  const level = currentLevel(),
    j = journey(level),
    daily = state.session.type === "daily",
    i = state.session.index;
  save();
  const limit = E.stepLimit(E.par(level));
  const eyebrow = daily
    ? `${today().split("-").reverse().join(".")} · новый каждый день`
    : `Глава ${i + 1} из 6${j.replay ? " · повтор" : ""}`;
  const intro = daily
    ? level.fog
      ? "Сегодня туман: видно только клетки рядом. Найди три искры и портал. Персик держится рядом."
      : "Новый лабиринт на сегодня. Найди три искры и выходи через портал. Пылинки по дороге тоже пригодятся."
    : j.replay
      ? "Повтор главы. Ключ уже у тебя, игра на нём не нужна. Попробуй уложиться в норму шагов и обойтись без подсказок."
      : level.intro;
  main.innerHTML = `<div id="home-note-slot">${homeNote()}</div><div class="game-head"><div><span class="eyebrow">${eyebrow}</span><h1>${esc(level.title)}</h1></div><div class="head-chips">${daily ? "" : `<button class="chip-btn" id="to-route">${icon("map")} Маршрут</button>`}<button class="chip-btn" id="to-letter">${icon("letter")} Письмо</button></div></div>
  <div class="game-layout">
    <section class="stage" aria-label="Карта" data-perch>
      <div class="hud">
        <span class="hud-item" id="hud-sparks"></span>
        ${daily ? "" : '<span class="hud-item" id="hud-key"></span>'}
        <span class="hud-item" id="hud-steps"></span>
        <span class="hud-item hud-goal" title="Норма шагов для второй звезды">норма ${limit}</span>
      </div>
      <div class="board-wrap"><div class="board" id="board" role="group" aria-label="Карта. Стрелки или WASD - шаг, пробел - сменить свет." tabindex="0"><div class="cells" id="cells"></div><div class="tokens" aria-hidden="true"><div class="token token-cat" id="tok-cat"></div><div class="token token-nastya" id="tok-nastya"><img src="${data.characters.nastya}" alt=""></div></div></div><button class="found-card hand" id="found" hidden></button></div>
      <div class="stage-bottom"><button id="hint" class="pill">${icon("paw")} Персик, куда идти?</button><button id="phase" class="pill phase"></button></div>
    </section>
    <aside class="side">
      <div class="letter-bubble paper"><img src="${data.characters.sasha}" alt="Саша"><p class="hand" id="dialogue-text" role="status" aria-live="polite">${esc(intro)}</p></div>
      <dl class="goals">
        <div><dt>${icon("spark")} Три искры</dt><dd id="spark-count"></dd></div>
        ${daily ? "" : `<div><dt>${icon("key")} Ключ</dt><dd id="key-count"></dd></div><div><dt>${icon("heart")} Тайник</dt><dd id="cache-count"></dd></div>`}
        <div><dt>${icon("dust")} Пылинки</dt><dd id="dust-count"></dd></div>
        <div><dt>${icon("star")} Если дойти сейчас</dt><dd id="rating-preview"></dd></div>
      </dl>
      <div class="controls"><div class="dpad" aria-label="Управление"><button data-dir="up" aria-label="Шаг вверх">${icon("arrow", "up")}</button><button data-dir="left" aria-label="Шаг влево">${icon("arrow", "left")}</button><button data-dir="down" aria-label="Шаг вниз">${icon("arrow", "down")}</button><button data-dir="right" aria-label="Шаг вправо">${icon("arrow")}</button></div><small>Нажми соседнюю клетку, проведи пальцем по карте или жми стрелки</small></div>
    </aside>
  </div>
  ${daily ? "" : `<ol class="chapter-rail">${data.chapters.map((x, k) => `<li class="${k === i ? "current" : k < state.completed ? "done" : ""}"><span>${k < state.completed ? starsHtml(state.best[x.id]?.stars || 1, "mini") : String(k + 1)}</span>${esc(x.theme)}</li>`).join("")}</ol>`}`;
  buildBoard(true);
  if ($("#to-route")) $("#to-route").onclick = () => navigate("route");
  $("#to-letter").onclick = () => navigate("letter");
  wireHomeNote();
  $("#phase").onclick = togglePhase;
  $("#hint").onclick = showHint;
  $$("[data-dir]").forEach((b) => (b.onclick = () => direction(b.dataset.dir)));
  const board = $("#board");
  let pointer;
  board.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse") pointer = { x: e.clientX, y: e.clientY };
  });
  board.addEventListener("pointercancel", () => (pointer = null));
  board.addEventListener("pointerup", (e) => {
    if (!pointer) return;
    const dx = e.clientX - pointer.x,
      dy = e.clientY - pointer.y;
    pointer = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    suppressClickUntil = Date.now() + 400;
    direction(
      Math.abs(dx) > Math.abs(dy)
        ? dx > 0
          ? "right"
          : "left"
        : dy > 0
          ? "down"
          : "up",
    );
  });
}

function cellInfo(level, j, i) {
  const kind = E.tile(level, i);
  const star = level.stars.find(
    (s) => s.at === i && !j.collected.includes(s.at),
  );
  const key = i === level.key && !j.key;
  const cache = i === level.cache && !j.cache;
  const exit = i === level.exit;
  const mote =
    (level.dust || []).includes(i) &&
    !j.dust.includes(i) &&
    !(
      state.session.type === "chapter" &&
      state.dustTaken[level.id]?.includes(i)
    );
  let sym = kind === "s" ? "sun" : kind === "m" ? "moon" : "",
    label = kind === "#" ? "Пусто" : "Дорожка",
    cls = "";
  if (kind === "s") label = "Солнечный мост";
  if (kind === "m") label = "Лунный мост";
  if (star) [sym, label, cls] = ["spark", "Искра", "spark"];
  else if (key) [sym, label, cls] = ["key", "Ключ", "key"];
  else if (cache) [sym, label, cls] = ["heart", "Тайник", "cache"];
  else if (exit) [sym, label, cls] = ["portal", "Портал", "portal"];
  else if (mote) [sym, label, cls] = ["dust", "Пылинка", "mote"];
  const ready =
    j.collected.length === 3 && (j.key || !Number.isInteger(level.key));
  if (exit && ready) cls += " open";
  return { kind, sym, label, cls };
}

function buildBoard(initial = false) {
  const cells = $("#cells");
  if (!cells) return;
  const level = currentLevel(),
    j = journey(level);
  const fogged = (i) => level.fog && !j.seen.includes(i);
  cells.innerHTML = Array.from({ length: 49 }, (_, i) => {
    const info = cellInfo(level, j, i);
    const blocked = !E.passable(level, i, j.phase);
    const adjacent = E.neighbors(j.pos).includes(i) && !blocked;
    const where = `строка ${Math.floor(i / 7) + 1}, столбец ${(i % 7) + 1}`;
    if (fogged(i))
      return `<button tabindex="-1" data-cell="${i}" class="cell fog${adjacent ? " adjacent" : ""}" aria-label="Туман, ${where}"></button>`;
    return `<button tabindex="-1" data-cell="${i}" class="cell ${info.kind === "#" ? "void" : "path"} ${info.kind === "s" ? "sun-bridge" : info.kind === "m" ? "moon-bridge" : ""} ${info.cls} ${blocked ? "blocked" : ""} ${adjacent ? "adjacent" : ""} ${hintCell === i ? "hinted" : ""}" aria-label="${j.pos === i ? "Настя здесь. " : ""}${info.label}, ${where}" ${info.kind === "#" ? "disabled" : ""}>${j.pos === i || !info.sym ? "" : icon(info.sym)}</button>`;
  }).join("");
  $$("[data-cell]", cells).forEach(
    (b) =>
      (b.onclick = () => {
        if (Date.now() < suppressClickUntil) return;
        move(Number(b.dataset.cell));
        $("#board")?.focus({ preventScroll: true });
      }),
  );
  $("#board").dataset.phase = j.phase;
  placeToken($("#tok-nastya"), j.pos, initial);
  const cat = $("#tok-cat");
  if (initial || cat.dataset.item !== String(state.equip.cat)) {
    cat.innerHTML = P.face(state.equip.cat);
    cat.dataset.item = String(state.equip.cat);
  }
  placeToken(cat, j.cat, initial);
  const par = E.par(level),
    limit = E.stepLimit(par);
  $("#hud-sparks").innerHTML = `${icon("spark")} ${j.collected.length}/3`;
  if ($("#hud-key")) {
    $("#hud-key").innerHTML = `${icon("key")} ${j.key ? "есть" : "нет"}`;
    $("#hud-key").classList.toggle("ok", j.key);
  }
  $("#hud-steps").textContent = `${j.moves} ${plural(j.moves, "шаг", "шага", "шагов")}`;
  $("#hud-steps").classList.toggle("over", j.moves > limit);
  $("#spark-count").textContent = `${j.collected.length} из 3`;
  if ($("#key-count"))
    $("#key-count").textContent = j.key ? "есть" : "выиграй на клетке с ключом";
  if ($("#cache-count"))
    $("#cache-count").textContent = j.cache ? "открыт" : "по желанию";
  const motes = (level.dust || []).filter(
    (c) =>
      j.dust.includes(c) ||
      (state.session.type === "chapter" &&
        state.dustTaken[level.id]?.includes(c)),
  ).length;
  $("#dust-count").textContent = `${motes} из ${(level.dust || []).length}`;
  const preview = E.rating({ moves: j.moves, hints: j.hints, parValue: par });
  $("#rating-preview").innerHTML = starsHtml(preview);
  $("#rating-preview").title =
    `Звезда за прохождение, звезда если уложиться в ${limit} шагов, звезда если без подсказок`;
  $("#phase").innerHTML =
    `${icon(j.phase === "sun" ? "sun" : "moon", "phase-icon")}<span>${j.phase === "sun" ? "Солнце" : "Луна"}</span>`;
  $("#phase").setAttribute(
    "aria-label",
    j.phase === "sun" ? "Включить лунный свет" : "Включить солнечный свет",
  );
}

function placeToken(el, pos, instant) {
  if (!el) return;
  if (instant) el.classList.add("no-anim");
  el.style.setProperty("--x", pos % 7);
  el.style.setProperty("--y", Math.floor(pos / 7));
  if (instant) {
    void el.offsetWidth;
    el.classList.remove("no-anim");
  }
}
function dropTrail(pos) {
  const kind = state.equip.trail;
  const layer = $(".tokens");
  if (!kind || !layer || reducedMotion()) return;
  const e = document.createElement("span");
  e.className = "trail";
  e.innerHTML = icon(kind === "hearts" ? "heart" : "spark");
  e.style.setProperty("--x", pos % 7);
  e.style.setProperty("--y", Math.floor(pos / 7));
  layer.prepend(e);
  setTimeout(() => e.remove(), 1400);
}

// Big card over the map for what she finds: on a phone the side panel is
// below the board, so the text has to appear where she is looking.
let foundTimer;
function reveal(label, text) {
  const card = $("#found");
  if (!card) return;
  card.innerHTML = `<small>${esc(label)}</small>${esc(text)}`;
  card.hidden = false;
  card.onclick = () => (card.hidden = true);
  clearTimeout(foundTimer);
  foundTimer = setTimeout(() => (card.hidden = true), 4200);
}
function say(text) {
  const t = $("#dialogue-text");
  if (t) t.textContent = text;
}
function direction(dir) {
  const pos = journey().pos;
  const target = { up: pos - 7, down: pos + 7, left: pos - 1, right: pos + 1 }[
    dir
  ];
  if (!E.neighbors(pos).includes(target)) {
    say(data.ui.wall);
    nudge();
    return;
  }
  move(target);
}
// A bump into the edge: small shake and sound, no penalty.
function nudge() {
  sfx("no");
  const t = $("#tok-nastya");
  if (!t || reducedMotion()) return;
  t.classList.remove("shake");
  void t.offsetWidth;
  t.classList.add("shake");
}
function playing() {
  return (
    activeTab === "adventure" &&
    state.started &&
    !state.pendingEnd &&
    $("#board") &&
    !modal.open
  );
}
function togglePhase() {
  if (!playing()) return;
  const j = journey();
  j.phase = E.other(j.phase);
  hintCell = -1;
  $("#phase")?.classList.remove("hinted");
  save();
  buildBoard();
  sfx("open", j.phase === "sun" ? 1.2 : 0.8);
  say(
    j.phase === "sun"
      ? "Солнце зажгло золотые мосты. Лунные пока спят."
      : "Луна зажгла серебряные мосты. Солнечные пока спят.",
  );
}

function move(target) {
  if (!playing()) return;
  const level = currentLevel(),
    j = journey(level),
    daily = state.session.type === "daily";
  if (target === j.pos) return;
  if (!E.neighbors(j.pos).includes(target)) {
    say(data.ui.far);
    return;
  }
  if (!E.passable(level, target, j.phase)) {
    const t = E.tile(level, target);
    say(t === "s" ? data.ui.sun : t === "m" ? data.ui.moon : data.ui.wall);
    nudge();
    return;
  }
  const from = j.pos;
  j.cat = from;
  j.pos = target;
  j.moves++;
  state.stats.steps++;
  hintCell = -1;
  if (level.fog) j.seen = [...new Set([...j.seen, ...E.around(target)])];
  dropTrail(from);
  sfx("step", 1 + (j.moves % 5) * 0.05);

  const star = level.stars.find((s) => s.at === target);
  if (star && !j.collected.includes(target)) {
    j.collected.push(target);
    say(star.text);
    reveal(`Искра ${j.collected.length} из 3`, star.text);
    sfx("spark");
    buzz(25);
    P.celebrate();
    if (!daily) {
      const list = (state.found.sparks[level.id] ||= []);
      if (!list.includes(target)) list.push(target);
    }
  }
  if ((level.dust || []).includes(target) && !j.dust.includes(target)) {
    const taken = daily ? [] : (state.dustTaken[level.id] ||= []);
    j.dust.push(target);
    if (!taken.includes(target)) {
      taken.push(target);
      addDust(REWARD.mote);
      sfx("coin");
      bump("dust");
    }
  }
  if (target === level.cache && !j.cache) {
    j.cache = true;
    say(level.secret);
    reveal("Тайник", level.secret);
    if (!state.found.secrets.includes(level.id))
      state.found.secrets.push(level.id);
    sfx("open");
    buzz(25);
  }
  checkBadges();
  bump("steps");

  if (target === level.key && !j.key) {
    if (j.replay || state.minis.includes(level.game)) {
      j.key = true;
      say(data.ui.keyAgain);
      sfx("key");
    } else {
      save();
      buildBoard();
      say(data.ui.keyGame);
      setTimeout(() => openMini(level.game, "key"), 260);
      return;
    }
  }

  const ready =
    j.collected.length === 3 && (j.key || !Number.isInteger(level.key));
  if (target === level.exit) {
    if (ready) {
      save();
      buildBoard();
      setTimeout(finishLevel, reducedMotion() ? 0 : 280);
      return;
    }
    say(daily ? data.ui.dailyPortal : data.ui.portal);
  }
  save();
  buildBoard();
}

function showHint() {
  if (!playing()) return;
  const level = currentLevel(),
    j = journey(level);
  const step = E.hintStep(level, j);
  j.hints++;
  state.stats.hintsUsed++;
  save();
  const line =
    data.persik.hint[Math.floor(Math.random() * data.persik.hint.length)];
  if (step === "phase") {
    say(
      j.phase === "sun"
        ? "Персик смотрит на небо: сейчас нужна луна. Переключи свет."
        : "Персик смотрит на небо: сейчас нужно солнце. Переключи свет.",
    );
    hintCell = -1;
    buildBoard();
    $("#phase").classList.add("hinted");
    $("#phase").focus();
    P.visit($("#phase"), "Свет!");
  } else if (Number.isInteger(step)) {
    hintCell = step;
    buildBoard();
    say(data.ui.hint);
    P.visit($(`[data-cell="${step}"]`), line);
  } else say(data.ui.portal);
}

function finishLevel() {
  const level = currentLevel(),
    j = journey(level),
    daily = state.session.type === "daily";
  j.done = true;
  const par = E.par(level);
  const stars = E.rating({ moves: j.moves, hints: j.hints, parValue: par });
  let reward = 0;
  const lines = [];
  if (daily) {
    const mult = ensureDay().double ? 2 : 1;
    reward += REWARD.maze * mult;
    lines.push(`Лабиринт пройден: +${REWARD.maze * mult}`);
    if (j.hints === 0) {
      reward += REWARD.mazeClean * mult;
      lines.push(`Без подсказок: +${REWARD.mazeClean * mult}`);
    }
    state.stats.mazes++;
    addDust(reward);
    state.pendingEnd = {
      type: "daily",
      stars,
      moves: j.moves,
      limit: E.stepLimit(par),
      hints: j.hints,
      reward,
      lines,
    };
    bump("maze");
    if (j.hints === 0) bump("mazeClean");
  } else {
    const i = state.session.index;
    const first = i >= state.completed;
    const prev = state.best[level.id]?.stars || 0;
    if (first) {
      reward += REWARD.chapter;
      lines.push(`Глава пройдена: +${REWARD.chapter}`);
      state.completed = i + 1;
      state.chapter = Math.min(5, state.completed);
    }
    if (stars > prev) {
      const extra = (stars - prev) * REWARD.perStar;
      reward += extra;
      lines.push(`Звёзды: +${extra}`);
    }
    state.best[level.id] = {
      stars: Math.max(prev, stars),
      moves: state.best[level.id]?.moves
        ? Math.min(state.best[level.id].moves, j.moves)
        : j.moves,
    };
    addDust(reward);
    state.pendingEnd = {
      type: "chapter",
      index: i,
      first,
      stars,
      moves: j.moves,
      limit: E.stepLimit(par),
      hints: j.hints,
      reward,
      lines,
    };
    if (stars === 3) bump("perfect");
    if (j.replay) bump("replay");
  }
  checkBadges();
  save();
  sfx("win");
  buzz([30, 60, 30]);
  burst();
  renderLevelEnd(state.pendingEnd);
  P.celebrate();
  main.focus({ preventScroll: true });
}

function renderLevelEnd(end) {
  updateShell();
  const criteria = `<ul class="criteria"><li class="ok">${icon("star")} Дошла до портала</li><li class="${end.moves <= end.limit ? "ok" : ""}">${icon("star")} ${end.moves} ${plural(end.moves, "шаг", "шага", "шагов")} при норме ${end.limit}</li><li class="${end.hints === 0 ? "ok" : ""}">${icon("star")} ${end.hints === 0 ? "Без подсказок Персика" : `Подсказок: ${end.hints}`}</li></ul>`;
  const rewards = end.lines.length
    ? `<div class="reward-lines">${end.lines.map((l) => `<span>${icon("dust")} ${esc(l)}</span>`).join("")}</div>`
    : `<p class="muted-line">Лучший результат не побит, пыль не начислена.</p>`;
  if (end.type === "daily") {
    main.innerHTML = `<section class="end"><span class="eyebrow">Лабиринт дня пройден</span>${starsHtml(end.stars, "big")}<h1>Завтра будет новый.</h1>${criteria}${rewards}<div class="end-actions"><button id="continue" class="btn">К заданиям дня ${icon("arrow")}</button><button id="to-story" class="btn ghost">Вернуться к письму</button></div></section>`;
    $("#continue").onclick = () => {
      state.pendingEnd = null;
      state.session = { type: "chapter", index: state.chapter };
      save();
      navigate("today");
    };
    $("#to-story").onclick = () => {
      state.pendingEnd = null;
      state.session = { type: "chapter", index: state.chapter };
      save();
      navigate("adventure");
    };
    return;
  }
  const c = data.chapters[end.index],
    last = end.first && end.index === 5;
  main.innerHTML = `<section class="end"><span class="eyebrow">Страница ${end.index + 1} из 6</span>${starsHtml(end.stars, "big")}<h1>${end.first ? (last ? "Все страницы у тебя." : "Ещё одна страница.") : "Глава пройдена ещё раз."}</h1>${end.first ? `<div class="paper end-letter"><p class="hand">${esc(c.ending)}</p></div><div class="achievement">${icon("spark")} ${esc(c.achievement)}</div>` : ""}${criteria}${rewards}<div class="end-actions"><button id="continue" class="btn">${last ? "Прочитать письмо" : end.first ? "Следующая глава" : "К маршруту"} ${icon("arrow")}</button>${end.stars < 3 ? '<button id="retry" class="btn ghost">Переиграть ради трёх звёзд</button>' : ""}</div></section>`;
  $("#continue").onclick = () => {
    state.pendingEnd = null;
    if (last) {
      state.session = { type: "chapter", index: 5 };
      save();
      navigate("letter");
    } else if (end.first) {
      state.session = { type: "chapter", index: state.chapter };
      save();
      navigate("adventure");
    } else {
      state.session = { type: "chapter", index: state.chapter };
      save();
      navigate("route");
    }
  };
  if ($("#retry")) $("#retry").onclick = () => startChapter(end.index, true);
}

function renderStoryDone() {
  const day = ensureDay();
  main.innerHTML = `<section class="end"><span class="eyebrow">Письмо собрано</span><h1>Все шесть глав пройдены.</h1><div class="paper end-letter"><p class="hand">Дальше игра идёт каждый день: лабиринт, вопрос от меня, блиц, колесо Персика и записка. Главы можно переигрывать ради трёх звёзд.</p></div><div class="end-actions"><button id="go-daily" class="btn">${day.maze.done ? "Задания дня" : "Лабиринт дня"} ${icon("arrow")}</button><button id="go-route" class="btn ghost">Переиграть главу</button></div><button id="go-letter" class="link">Перечитать письмо</button></section>`;
  $("#go-daily").onclick = () =>
    day.maze.done ? navigate("today") : startDaily();
  $("#go-route").onclick = () => navigate("route");
  $("#go-letter").onclick = () => navigate("letter");
}

function renderWelcome() {
  const [yy, mm, dd] = E.dateKey().split("-");
  const postmark = `<svg class="postmark" viewBox="0 0 160 160" aria-hidden="true"><defs><path id="pm-arc" d="M24 80a56 56 0 1 1 112 0"/><path id="pm-arc-b" d="M30 84a50 50 0 0 0 100 0"/></defs><circle cx="80" cy="80" r="74" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="80" cy="80" r="44" fill="none" stroke="currentColor" stroke-width="2"/><text><textPath href="#pm-arc" startOffset="50%" text-anchor="middle">НОЧНАЯ ПОЧТА</textPath></text><text><textPath href="#pm-arc-b" startOffset="50%" text-anchor="middle">ПЕРСИК</textPath></text><text x="80" y="76" text-anchor="middle" style="font-size:19px">${dd}.${mm}</text><text x="80" y="98" text-anchor="middle" style="font-size:13px">${yy}</text></svg>`;
  main.innerHTML = `<section class="welcome"><article class="envelope" data-perch><div class="env-addr"><p class="hand"><span>Кому</span>Насте</p><p class="hand"><span>От кого</span>Саши</p></div><div class="stamp-wrap"><figure class="stamp"><img src="${data.characters.couple}" alt="Настя, Саша и Персик"><figcaption><span class="stamp-from">Почта Персика</span> <b>6 глав</b></figcaption></figure>${postmark}</div><h1>Ты - моя вселенная</h1><div class="env-body"><p>Я написал тебе письмо и спрятал его в маленьком ночном городе. Шесть глав, шесть страниц. Персик знает дорогу и будет рядом.</p><button id="start" class="btn big">Начать ${icon("arrow")}</button><p class="hand env-note">Без таймеров и проигрышей. Каждый день что‑то новое.</p></div></article></section>`;
  $("#start").onclick = () => {
    state.started = true;
    state.session = { type: "chapter", index: state.chapter };
    save();
    sfx("win");
    navigate("adventure");
    P.say("Пойдём! Я покажу дорогу.", 3000);
    if (state.souvenirs.length) notify(data.ui.legacy);
  };
}

// ---------- Today ----------

function persikTile() {
  const lvl = friendLevel(),
    xp = state.persik.xp;
  const lo = FRIEND_LEVELS[lvl - 1],
    hi = FRIEND_LEVELS[lvl] ?? lo;
  const pct = hi > lo ? ((xp - lo) / (hi - lo)) * 100 : 100;
  const fed = state.persik.fed === today();
  return `<section class="tile persik-tile" id="persik-tile"><span class="eyebrow">${icon("paw")} Персик</span><div class="persik-row"><button id="pet-cat" class="big-cat" aria-label="Погладить Персика">${P.face(state.equip.cat)}</button><div><h2>${esc(data.persik.levels[lvl - 1])}</h2><div class="meter" aria-label="Дружба"><i style="width:${pct}%"></i></div><small>${hi > lo ? `До следующего уровня ${hi - xp}` : "Максимальная дружба"}</small></div></div><div class="persik-actions"><button class="btn ${fed ? "ghost" : ""}" id="feed" ${fed ? "disabled" : ""}>${icon("bowl")} ${fed ? "Персик сыт" : "Покормить"}</button><span class="tile-foot">Погладь его, он бегает по экрану.</span></div><figure class="real-cat"><img src="${data.characters.cat}" alt="Настоящий Персик" loading="lazy"><figcaption>Настоящий</figcaption></figure></section>`;
}
function refreshPersikTile() {
  const el = $("#persik-tile");
  if (!el) return;
  el.outerHTML = persikTile();
  wirePersikTile();
}
function wirePersikTile() {
  $("#pet-cat").onclick = (e) => {
    petCat(e.currentTarget);
    if (!reducedMotion()) {
      const b = $("#pet-cat");
      b?.classList.remove("purr");
      void b?.offsetWidth;
      b?.classList.add("purr");
    }
  };
  if ($("#feed")) $("#feed").onclick = feedPersik;
}

function renderToday() {
  const day = ensureDay();
  const maze = dailyLevel();
  const claimed = questsClaimed();
  const streak = streakNow();
  const milestones = Object.keys(STREAK_REWARDS).map(Number);
  const nextMilestone = milestones.find((n) => n > streak);
  const date = new Date().toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  main.innerHTML =
    heading(
      date.charAt(0).toUpperCase() + date.slice(1),
      "Сегодня",
      "Обновляется в полночь. За каждое задание пыль, за все три сундук.",
    ) +
    `<div class="today">
    ${questionCard()}
    <section class="tile paper note-tile ${day.note ? "read" : ""}" data-perch><span class="eyebrow">${icon("letter")} Записка от Саши</span>${day.note ? `<p class="hand note-preview">${esc(data.daily.notes[noteIndex()])}</p><button class="link-ink" id="read-note">Открыть ещё раз</button>` : `<p class="paper-text">Одна в день. Открой, когда будет минутка.</p><button class="btn ink" id="read-note">${icon("letter")} Открыть</button>`}</section>
    <section class="tile quests-tile" data-perch><span class="eyebrow">${icon("check")} Задания · ${claimed}/3</span><div class="quest-list">${day.quests
      .map((q) => {
        const n = Math.min(q.goal, day.counters[q.metric] || 0);
        const done = n >= q.goal;
        return `<div class="quest ${q.claimed ? "claimed" : done ? "done" : ""}"><div><b>${esc(q.text)}</b><span class="bar"><i style="width:${(n / q.goal) * 100}%"></i></span><small>${n} / ${q.goal}</small></div>${q.claimed ? `<span class="quest-state">${icon("check")}</span>` : done ? `<button class="claim" data-claim="${q.id}">+${REWARD.quest}</button>` : `<span class="quest-state">+${REWARD.quest}</span>`}</div>`;
      })
      .join(
        "",
      )}</div><button id="chest" class="chest ${day.chest ? "opened" : claimed === 3 ? "ready" : ""}" ${day.chest || claimed < 3 ? "disabled" : ""}>${icon(day.chest ? "check" : "chest")}${day.chest ? "Сундук открыт" : claimed === 3 ? `Открыть сундук: +${REWARD.chest}` : "Сундук откроется после трёх заданий"}</button></section>
    <section class="tile maze-tile" data-perch><span class="eyebrow">${icon("map")} ${maze.fog ? "Туманный лабиринт" : "Лабиринт дня"}</span><div class="maze-row"><div class="mini-map ${maze.fog ? "fog" : ""}" aria-hidden="true">${maze.grid.join("").split("").map((t) => `<i class="${t === "#" ? "" : "on"}"></i>`).join("")}</div><div><h2>${day.maze.done ? "Пройден" : day.maze.moves ? "Продолжить" : "Новый"}</h2><p class="tile-text">${maze.fog ? "Видно только клетки рядом." : "Три искры, пыль и портал."} +${REWARD.maze * (day.double ? 2 : 1)} пыли${day.double ? ", сегодня двойная" : ""}.</p></div></div><button id="play-maze" class="btn ${day.maze.done ? "ghost" : ""}" ${day.maze.done ? "disabled" : ""}>${day.maze.done ? "Завтра будет новый" : `${icon("play")} Играть`}</button></section>
    ${blitzCard()}
    ${wheelCard()}
    ${persikTile()}
    <section class="tile streak-tile"><span class="eyebrow">${icon("flame")} Серия</span><h2><span class="num">${streak}</span> ${plural(streak, "день", "дня", "дней")} подряд</h2><div class="streak-steps">${milestones.map((n) => `<span class="${state.streak.rewarded.includes(n) ? "lit" : ""}"><b>${n}</b><small>+${STREAK_REWARDS[n]}</small></span>`).join("")}</div><p class="tile-text">${nextMilestone ? `До награды за ${nextMilestone} ${plural(nextMilestone, "день", "дня", "дней")}: ${nextMilestone - streak}.` : "Все награды за серию собраны."} Серия растёт, если сделать за день хоть что-то. Один пропуск в неделю Персик прощает.</p></section>
    <section class="tile games-tile"><span class="eyebrow">${icon("game")} Мини-игры · +${REWARD.playGame} за победу</span><div class="games-list">${data.chapters
      .map((c, i) => {
        const open = state.minis.includes(c.game);
        return `<button class="game-chip" data-game="${c.game}" ${open ? "" : "disabled"}><b>${esc(data.games[c.game].title)}</b><small>${open ? "Играть" : `${icon("lock")} Глава ${i + 1}`}</small></button>`;
      })
      .join("")}</div></section>
  </div>`;
  wireToday();
}
function wireToday() {
  const day = ensureDay();
  $("#read-note").onclick = readNote;
  $("#play-maze").onclick = startDaily;
  $$("[data-claim]").forEach(
    (b) => (b.onclick = () => claimQuest(b.dataset.claim)),
  );
  $("#chest").onclick = openChest;
  $$("[data-game]").forEach(
    (b) => (b.onclick = () => openMini(b.dataset.game, "play")),
  );
  wireBlitz();
  if ($("#spin")) $("#spin").onclick = spin;
  const doneSpin = day.spin;
  if (doneSpin) {
    const n = data.wheel.length;
    const rot = $("#wheel .wheel-rot");
    if (rot)
      rot.style.transform = `rotate(${360 * 5 - (doneSpin.index + 0.5) * (360 / n)}deg)`;
  }
  wirePersikTile();
  if ($("#q-intro"))
    $("#q-intro").onclick = () => {
      state.questionsIntro = true;
      save();
      $(".q-intro")?.remove();
    };
  if ($("#q-more")) $("#q-more").onclick = moreQuestion;
  if ($("#q-edit"))
    $("#q-edit").onclick = () => {
      const q = qById(day.question);
      const old = state.answers[q.id];
      delete state.answers[q.id];
      renderToday();
      prefill(q, old);
      state.answers[q.id] = old;
      $("#q-form").dataset.edit = "1";
    };
  const q = qById(day.question);
  if ($("#q-form") && q) {
    const check = () => ($("#q-submit").disabled = !readForm(q));
    wireForm(q, check);
    $("#q-form").onsubmit = (e) => {
      e.preventDefault();
      const answer = readForm(q);
      if (!answer) return;
      submitAnswer(q, answer, { edit: $("#q-form").dataset.edit === "1" });
      renderToday();
    };
    $("#q-skip").onclick = () => skipQuestion(q.id);
  }
}
function prefill(q, a) {
  if (!a) return;
  if (q.type === "text") $("#qa-text").value = a.v;
  if (q.type === "scale")
    $(`.scale-dot[data-scale="${a.v}"]`)?.setAttribute("aria-checked", "true");
  if (q.type === "choice" || q.type === "multi") {
    const list = Array.isArray(a.v) ? a.v : [a.v];
    const attr = q.type === "multi" ? "aria-pressed" : "aria-checked";
    for (const label of list) {
      const i = q.options.indexOf(label);
      const btn = $(`.choice[data-opt="${i >= 0 ? i : "other"}"]`);
      btn?.setAttribute(attr, "true");
      if (i < 0 && $("#qa-other")) {
        $("#qa-other").hidden = false;
        $("#qa-other").value = label;
      }
    }
  }
  if ($("#qa-why")) $("#qa-why").value = a.why || "";
  $("#q-submit").disabled = false;
}

// ---------- Games (arcade) ----------

const arcadeGame = (id) => data.arcade.games.find((g) => g.id === id);
let arcade = null;

function arcadeDay() {
  const key = today();
  if (state.arcade.day !== key) {
    state.arcade.day = key;
    state.arcade.dust = 0;
  }
  return state.arcade;
}
// Game of the day pays double. Word of the day is daily anyway, so it is skipped.
function gameOfDay() {
  const list = data.arcade.games.filter((g) => g.id !== "word");
  return list[((E.dayNumber(today()) % list.length) + list.length) % list.length];
}
function dailyWord(key = today()) {
  const words = E.shuffle(data.arcade.words, E.rng(E.hash("words")));
  return words[((E.dayNumber(key) % words.length) + words.length) % words.length];
}
function wordToday() {
  const key = today();
  if (!state.arcade.word || state.arcade.word.day !== key)
    state.arcade.word = { day: key, guesses: [], done: false, won: false };
  return state.arcade.word;
}
function arcadeReward(id, score, extra) {
  if (id === "word") return extra?.practice || !extra?.won ? 0 : 15 + (7 - extra.tries) * 3;
  const g = arcadeGame(id);
  const base = id === "boxes" ? score * 2 : Math.floor(score / (g.per || 50));
  return Math.min(25, base);
}

// Small scenes for the game cards, drawn in the same palette.
const ART = {
  jumper: `<svg viewBox="0 0 160 100" aria-hidden="true"><rect width="160" height="100" fill="#262f6c"/><circle cx="128" cy="22" r="11" fill="#fffbe8"/><circle cx="133" cy="18" r="10" fill="#262f6c"/><path d="M0 70h40v30H0zM58 58h44v42H58zM120 74h40v26h-40z" fill="#2c3766"/><path d="M-2 66h44v6H-2zM56 54h48v6H56zM118 70h44v6h-44z" fill="#46548c"/><g fill="#ffcf5a"><rect x="10" y="80" width="6" height="8"/><rect x="70" y="68" width="6" height="8"/><rect x="86" y="80" width="6" height="8"/><rect x="132" y="84" width="6" height="8"/></g><path d="M79 30l2.4 5 5.6.8-4 3.9 1 5.5-5-2.6-5 2.6 1-5.5-4-3.9 5.6-.8z" fill="#ffd9a0"/></svg>`,
  merge: `<svg viewBox="0 0 160 100" aria-hidden="true"><rect width="160" height="100" fill="#262f6c"/><g font-family="Golos Text, sans-serif" font-size="9" font-weight="600" text-anchor="middle"><rect x="30" y="14" width="46" height="34" rx="8" fill="#34408a"/><text x="53" y="35" fill="#f6efe6">Искра</text><rect x="84" y="14" width="46" height="34" rx="8" fill="#4a58b0"/><text x="107" y="35" fill="#f6efe6">Звезда</text><rect x="30" y="54" width="46" height="34" rx="8" fill="#ffcf5a"/><text x="53" y="75" fill="#241a00">Луна</text><rect x="84" y="54" width="46" height="34" rx="8" fill="#ff8fb1"/><text x="107" y="75" fill="#2b0716">Планета</text></g></svg>`,
  match: `<svg viewBox="0 0 160 100" aria-hidden="true"><rect width="160" height="100" fill="#262f6c"/><g transform="translate(38 8)"><circle cx="14" cy="14" r="10" fill="#ff8fb1"/><path d="M42 24s-10-6-10-12.8A5.3 5.3 0 0 1 42 8a5.3 5.3 0 0 1 10 3.2C52 18 42 24 42 24z" fill="#f27a8a"/><path d="M70 4l3 6.4 7 1-5 5 1.2 7L70 20l-6.2 3.4L65 16.4l-5-5 7-1z" fill="#f2c27a"/><circle cx="14" cy="42" r="10" fill="#ff8fb1"/><path d="M42 52s-10-6-10-12.8A5.3 5.3 0 0 1 42 36a5.3 5.3 0 0 1 10 3.2C52 46 42 52 42 52z" fill="#f27a8a"/><path d="M60 42c3-5 9-6 13-2l5-3-1 5 1 5-5-3c-4 4-10 3-13-2z" fill="#8fc7f2"/><circle cx="14" cy="70" r="10" fill="#ff8fb1"/><path d="M50 78A9 9 0 1 1 40 64a7 7 0 0 0 10 14z" fill="#c6d0ff"/><path d="M70 60l3 6.4 7 1-5 5 1.2 7L70 76l-6.2 3.4L65 72.4l-5-5 7-1z" fill="#f2c27a"/></g></svg>`,
  word: `<svg viewBox="0 0 160 100" aria-hidden="true"><rect width="160" height="100" fill="#262f6c"/><g font-family="Dela Gothic One, sans-serif" font-size="15" font-weight="600" text-anchor="middle">${[["К", "#5f9d6f"], ["О", "#5f9d6f"], ["Ш", "#c99a3e"], ["К", "#3a4589"], ["А", "#5f9d6f"]].map(([l, c], i) => `<rect x="${14 + i * 27}" y="34" width="24" height="30" rx="5" fill="${c}"/><text x="${26 + i * 27}" y="55" fill="#fff">${l}</text>`).join("")}</g></svg>`,
  boxes: `<svg viewBox="0 0 160 100" aria-hidden="true"><rect width="160" height="100" fill="#262f6c"/>${[18, 62, 106].map((x, i) => `<g transform="translate(${x} ${i === 1 ? 40 : 46})"><path d="M2 14h32v26H2z" fill="#c98a4b"/><path d="M0 ${i === 1 ? 2 : 8}h36v8H0z" fill="#d99a58"/></g>`).join("")}<g transform="translate(66 18)"><path d="M3 12 5 1 12 8ZM25 12 23 1 16 8Z" fill="#9b98a6"/><ellipse cx="14" cy="16" rx="12" ry="10" fill="#9b98a6"/><ellipse cx="10" cy="15" rx="2" ry="2.5" fill="#c9d46a"/><ellipse cx="18" cy="15" rx="2" ry="2.5" fill="#c9d46a"/></g></svg>`,
  breakout: `<svg viewBox="0 0 160 100" aria-hidden="true"><rect width="160" height="100" fill="#34408a"/>${[0, 1, 2, 3].map((k) => `<g fill="#fff" opacity="${1 - k * 0.12}"><circle cx="${26 + k * 36}" cy="22" r="8"/><circle cx="${36 + k * 36}" cy="18" r="10"/><circle cx="${44 + k * 36}" cy="24" r="7"/></g>`).join("")}<path d="M60 86a20 6 0 0 1 40 0z" fill="#fffbe8"/><path d="M84 58l2 4.2 4.6.6-3.3 3.2.8 4.6-4.1-2.2-4.1 2.2.8-4.6-3.3-3.2 4.6-.6z" fill="#ffd9a0"/></svg>`,
};

function renderGames() {
  const ar = arcadeDay();
  const featured = gameOfDay();
  const w = wordToday();
  const cap = data.arcade.dailyCap;
  const card = (g, big = false) => {
    const best = ar.best[g.id];
    const fb = ar.feedback[g.id];
    const art = (ART[g.id] || "").replace("<svg ", '<svg preserveAspectRatio="xMidYMid slice" ');
    return `<article class="game-card ${big ? "featured" : ""}" data-perch><div class="game-art">${art}${g.id === "jumper" || g.id === "boxes" ? `<span class="art-cat">${P.face(state.equip.cat)}</span>` : ""}</div><div class="game-copy">${big ? `<span class="eyebrow">${icon("spark")} Игра дня · двойная пыль</span>` : ""}<h2>${esc(g.title)}</h2><p>${esc(g.blurb)}</p><div class="game-meta">${best ? `<span>${icon("trophy")} ${best}${g.unit ? ` ${g.unit}` : ""}</span>` : `<span>Ещё не играла</span>`}${ar.plays[g.id] ? `<span>партий ${ar.plays[g.id]}</span>` : ""}${fb ? `<span>${fb.v === "up" ? icon("heart") : icon("thumb")} ${fb.v === "up" ? "нравится" : "так себе"}</span>` : ""}</div><button class="btn ${big ? "big" : ""}" data-arcade="${g.id}">${icon("play")} Играть</button></div></article>`;
  };
  const wordGame = arcadeGame("word");
  const rest = data.arcade.games.filter((g) => g.id !== featured.id && g.id !== "word");
  const wordRows = [...Array(6).keys()]
    .map((r) => {
      const g = w.guesses[r];
      const marks = g ? window.ArcadeLogic.scoreWord(g, dailyWord()) : [];
      return `<div>${[0, 1, 2, 3, 4].map((i) => `<i class="${marks[i] || ""}"></i>`).join("")}</div>`;
    })
    .join("");
  main.innerHTML =
    heading(
      `${icon("game")} Короткие партии на 1-3 минуты`,
      "Игры",
      `Пыль за игры: ${Math.min(ar.dust, cap)} из ${cap} на сегодня. Игра дня даёт вдвое больше.`,
    ) +
    `<div class="arcade">
      ${card(featured, true)}
      <article class="game-card word-card" data-perch><div class="word-mini" aria-hidden="true">${wordRows}</div><div class="game-copy"><span class="eyebrow">${icon("today")} Слово дня</span><h2>${esc(wordGame.title)}</h2><p>${w.done ? (w.won ? `Отгадано за ${w.guesses.length}. Завтра новое слово.` : "Сегодня не вышло. Завтра новое слово.") : w.guesses.length ? `Попыток осталось: ${6 - w.guesses.length}.` : esc(wordGame.blurb)}</p><div class="game-meta"><span>${icon("trophy")} отгадано ${ar.wins}</span></div><button class="btn ${w.done ? "ghost" : ""}" data-arcade="word">${w.done ? "Тренировка" : `${icon("play")} Играть`}</button></div></article>
      <div class="arcade-grid">${rest.map((g) => card(g)).join("")}</div>
      <section class="chapter-games"><h2>Игры из глав письма</h2><div class="games-list">${data.chapters
        .map((c, i) => {
          const open = state.minis.includes(c.game);
          return `<button class="game-chip" data-game="${c.game}" ${open ? "" : "disabled"}><b>${esc(data.games[c.game].title)}</b><small>${open ? "Играть" : `${icon("lock")} Глава ${i + 1}`}</small></button>`;
        })
        .join("")}</div></section>
    </div>`;
  $$("[data-arcade]").forEach((b) => (b.onclick = () => openArcade(b.dataset.arcade)));
  $$("[data-game]").forEach((b) => (b.onclick = () => openMini(b.dataset.game, "play")));
}

function openArcade(id) {
  const g = arcadeGame(id);
  if (!g || !window.Arcade?.[id]) return;
  stopMini();
  stopArcade();
  openModal(
    `<div class="arcade-head"><span class="eyebrow">${id === gameOfDay().id ? `${icon("spark")} Игра дня · двойная пыль` : `${icon("game")} Игры`}</span><h2 id="modal-title">${esc(g.title)}</h2><p class="mini-rule">${esc(g.rule)}</p></div><div class="arcade-host" id="arcade-host"></div><p class="mini-status" id="arcade-status" aria-live="polite"></p><div class="arcade-over" id="arcade-over" hidden></div>`,
    "arcade-modal",
  );
  const host = $("#arcade-host");
  const ctx = {
    persik: P,
    outfit: state.equip.cat,
    texts: data.arcade,
    sfx,
    buzz,
    reduced: reducedMotion,
    status: (t) => {
      const el = $("#arcade-status");
      if (el) el.textContent = t;
    },
    flag: (name) => {
      if (!state.arcade.flags.includes(name)) {
        state.arcade.flags.push(name);
        checkBadges();
        save();
      }
    },
    wordState: () => {
      const w = wordToday();
      return { ...w, answer: dailyWord() };
    },
    saveWord: (patch) => {
      Object.assign(wordToday(), patch);
      save();
    },
    randomWord: () =>
      data.arcade.words[Math.floor(Math.random() * data.arcade.words.length)],
    end: (score, extra) => arcadeOver(id, score, extra),
  };
  arcade = { id, game: window.Arcade[id](host, ctx), ended: false };
  sfx("open");
}
function stopArcade() {
  if (!arcade) return;
  try {
    arcade.game?.cleanup?.();
  } catch {
    /* Cleanup must not block navigation. */
  }
  arcade = null;
}

function arcadeOver(id, score, extra = {}) {
  if (!arcade || arcade.ended) return;
  arcade.ended = true;
  const g = arcadeGame(id);
  const ar = arcadeDay();
  ar.plays[id] = (ar.plays[id] || 0) + 1;
  const scoreKey = id === "word" ? null : id;
  const prev = scoreKey ? ar.best[scoreKey] || 0 : 0;
  const record = scoreKey && score > prev;
  if (record) ar.best[scoreKey] = score;
  let reward = arcadeReward(id, score, extra);
  if (id === gameOfDay().id) reward *= 2;
  if (id !== "word") {
    const room = Math.max(0, data.arcade.dailyCap - ar.dust);
    reward = Math.min(reward, room);
    ar.dust += reward;
  }
  if (record && prev > 0) reward += 5;
  if (id === "word" && extra.won && !extra.practice) {
    ar.wins++;
    bump("word");
  }
  addDust(reward);
  bump("arcade");
  if (record && prev > 0) bump("record");
  checkBadges();
  save();
  updateShell();
  if (record && prev > 0) {
    P.celebrate();
    P.say(data.arcade.record[Math.floor(Math.random() * data.arcade.record.length)], 2000);
    burst(14);
    sfx("win");
  } else P.say(data.arcade.over[Math.floor(Math.random() * data.arcade.over.length)], 2000);
  const fb = ar.feedback[id];
  const shown =
    id === "word"
      ? extra.won
        ? `Отгадано за ${extra.tries}`
        : `Слово: ${extra.answer}`
      : `${score}${g.unit ? ` ${g.unit}` : ""}`;
  const over = $("#arcade-over");
  if (!over) return;
  over.hidden = false;
  over.innerHTML = `<div class="over-score"><span class="eyebrow">${record && prev > 0 ? `${icon("trophy")} Новый рекорд` : "ИТОГ"}</span><b>${esc(shown)}</b>${scoreKey ? `<small>рекорд ${ar.best[scoreKey] || 0}</small>` : ""}</div>${reward ? `<span class="reward-chip">${icon("dust")} +${reward} пыли</span>` : id !== "word" && ar.dust >= data.arcade.dailyCap ? '<span class="muted-line">Пыль за игры на сегодня уже собрана</span>' : ""}<div class="feedback" role="group" aria-label="Понравилась игра?"><span>Понравилась игра?</span><button class="pill ${fb?.v === "up" ? "on" : ""}" data-fb="up">${icon("heart")} Да</button><button class="pill ${fb?.v === "down" ? "on" : ""}" data-fb="down">${icon("thumb")} Так себе</button></div><div class="modal-actions">${id === "word" && !extra.practice ? "" : `<button class="btn ghost" id="arcade-again">Ещё раз</button>`}<button class="btn" id="arcade-done">Готово</button></div>`;
  $$("[data-fb]", over).forEach(
    (b) =>
      (b.onclick = () => {
        ar.feedback[id] = { v: b.dataset.fb, day: today(), sent: false };
        save();
        $$("[data-fb]", over).forEach((x) => x.classList.toggle("on", x === b));
        notify(b.dataset.fb === "up" ? "Саша узнает, что игра понравилась" : "Саша узнает, что игра так себе");
      }),
  );
  if ($("#arcade-again")) $("#arcade-again").onclick = () => openArcade(id);
  $("#arcade-done").onclick = () => modal.close();
  $("#arcade-done").focus({ preventScroll: true });
  over.scrollIntoView({ block: "nearest", behavior: reducedMotion() ? "auto" : "smooth" });
}

// ---------- Route ----------

function renderRoute() {
  main.innerHTML =
    heading(
      `${icon("map")} Шесть глав письма`,
      "Маршрут",
      "Главы открываются по порядку. Пройденные можно переиграть ради трёх звёзд и пыли.",
    ) +
    `<div class="route-map" data-perch><img src="${window.Vault.asset("./assets/world_art.webp")}" alt="Карта шести миров" loading="lazy"></div><ol class="route-list">${data.chapters
      .map((c, i) => {
        const done = i < state.completed,
          active = i === state.chapter && !done,
          best = state.best[c.id];
        return `<li class="route-stop ${done ? "complete" : active ? "active" : "locked"}"><span class="route-number">${done ? icon("check") : i + 1}</span><div><span class="eyebrow">${esc(c.theme)} · ${esc(data.games[c.game].title)}</span><h2>${esc(c.title)}</h2><p>${done ? esc(c.fragment) : active ? "Эта глава ждёт тебя." : "Откроется после предыдущей."}</p></div>${done ? `<div class="route-side">${starsHtml(best?.stars || 1)}<button class="btn ghost small" data-replay="${i}">${best?.stars === 3 ? "Ещё раз" : "За звёздами"}</button></div>` : active ? `<button class="btn small" data-go="${i}">${icon("play")} Играть</button>` : `<span class="route-state">${icon("lock")}</span>`}</li>`;
      })
      .join("")}</ol>`;
  $$("[data-replay]").forEach(
    (b) => (b.onclick = () => startChapter(Number(b.dataset.replay), true)),
  );
  $$("[data-go]").forEach(
    (b) => (b.onclick = () => startChapter(Number(b.dataset.go))),
  );
}

// ---------- Wardrobe ----------

function renderWardrobe() {
  const pic = (slot, id) =>
    slot === "cat"
      ? P.face(id)
      : slot === "trail"
        ? `<span class="trail-pic">${icon(id === "hearts" ? "heart" : id ? "spark" : "")}${icon(id === "hearts" ? "heart" : id ? "spark" : "")}</span>`
        : "";
  const groups = Object.entries(SLOTS)
    .map(([slot, meta]) => {
      const items = SHOP.filter((x) => x.slot === slot);
      const none = `<button class="shop-item ${!state.equip[slot] ? "equipped" : ""}" data-unequip="${slot}"><span class="shop-pic shop-${slot} pic-none">${pic(slot, null)}</span><b>${esc(meta.none)}</b><small>${!state.equip[slot] ? "Выбрано" : "Выбрать"}</small></button>`;
      return `<section class="shop-group"><h2>${esc(meta.title)}</h2><div class="shop-grid">${none}${items
        .map((it) => {
          const owned = state.owned.includes(it.id),
            on = state.equip[slot] === it.id;
          return `<button class="shop-item ${on ? "equipped" : owned ? "owned" : state.dust < it.price ? "poor" : ""}" data-item="${it.id}"><span class="shop-pic shop-${slot} pic-${it.id}">${pic(slot, it.id)}</span><b>${esc(it.title)}</b><small>${on ? "Выбрано" : owned ? "Надеть" : `${icon("dust")} ${it.price}`}</small></button>`;
        })
        .join("")}</div></section>`;
    })
    .join("");
  const unread = data.daily.notes.length - state.found.notes.length;
  main.innerHTML =
    heading(
      `${icon("hanger")} Пыль тратится здесь`,
      "Шкаф Персика",
      `У тебя ${state.dust} пыли. Её дают искры, задания, главы, вопросы и мини-игры.`,
    ) +
    `${groups}<section class="shop-group"><h2>Записки</h2><div class="shop-grid"><button class="shop-item ${state.dust < EXTRA_NOTE_PRICE || !unread ? "poor" : ""}" id="extra-note" ${unread ? "" : "disabled"}><span class="shop-pic shop-note">${icon("letter")}</span><b>Записка вне очереди</b><small>${unread ? `${icon("dust")} ${EXTRA_NOTE_PRICE} · осталось ${unread}` : "Все прочитаны"}</small></button></div></section>`;
  $$("[data-item]").forEach(
    (b) => (b.onclick = () => shopClick(b.dataset.item)),
  );
  $$("[data-unequip]").forEach(
    (b) =>
      (b.onclick = () => {
        state.equip[b.dataset.unequip] = null;
        save();
        updateShell();
        P.setOutfit(state.equip.cat);
        renderWardrobe();
      }),
  );
  $("#extra-note").onclick = () => {
    giveExtraNote(false);
  };
}
function shopClick(id) {
  const it = SHOP.find((x) => x.id === id);
  if (!it) return;
  if (!state.owned.includes(id)) {
    if (state.dust < it.price) {
      sfx("no");
      return notify(`Нужно ещё ${it.price - state.dust} пыли`);
    }
    state.dust -= it.price;
    state.owned.push(id);
    sfx("coin");
    buzz(20);
    notify(`Куплено: ${it.title}`);
    checkBadges();
  }
  state.equip[it.slot] = id;
  save();
  updateShell();
  P.setOutfit(state.equip.cat);
  if (it.slot === "cat") P.celebrate();
  renderWardrobe();
}

// ---------- Album ----------

function renderAlbum() {
  const total = data.chapters.length * 3;
  const answered =
    Object.keys(state.answers).length + Object.keys(state.blitzAnswers).length;
  const tabs = [
    ["sparks", `Искры ${foundSparks()}/${total}`],
    ["answers", `Ответы ${answered}`],
    ["notes", `Записки ${state.found.notes.length}`],
    ["coupons", `Купоны ${state.coupons.filter((c) => !c.used).length}`],
    ["badges", `Значки ${state.badges.length}/${BADGES.length}`],
  ];
  let body = "";
  if (albumTab === "sparks")
    body = `<div class="album-grid">${data.chapters
      .map((c, i) => {
        const found = state.found.sparks[c.id] || [];
        const open = found.length > 0 || i < state.completed;
        return `<article class="album-card ${open ? "" : "locked"}">${open ? `<img src="${c.photo}" alt="${esc(c.theme)}" loading="lazy">` : `<div class="album-placeholder">${icon("lock")}<span>Пока закрыто</span></div>`}<div class="album-copy"><span class="eyebrow">Глава ${i + 1} · ${esc(c.theme)}</span><h2>${open ? esc(c.achievement) : "Здесь появится страница"}</h2>${c.stars
          .filter((s) => found.includes(s.at))
          .map((s) => `<p>${icon("spark")} ${esc(s.text)}</p>`)
          .join(
            "",
          )}${state.found.secrets.includes(c.id) ? `<p class="secret-note">${icon("heart")} ${esc(c.secret)}</p>` : ""}${!open ? "<p>Найди первую искру в этой главе.</p>" : ""}</div></article>`;
      })
      .join(
        "",
      )}</div>${state.souvenirs.length ? `<section class="souvenirs"><h2>Из прошлой версии игры</h2>${state.souvenirs.map((id) => `<span class="achievement">${icon("spark")} ${esc(data.chapters.find((c) => c.id === id).achievement)}</span>`).join("")}</section>` : ""}`;
  if (albumTab === "answers") {
    const unsent = unsentRows().length;
    const byCat = {};
    for (const [id, a] of Object.entries(state.answers)) {
      const q = qById(id);
      (byCat[q.cat] ||= []).push(
        `<div class="answer-row ${a.sent ? "" : "new"}"><b>${esc(q.q)}</b><p class="hand">${esc(answerSummary(q, a))}${a.why ? ` <small>${esc(a.why)}</small>` : ""}</p><span>${a.sent ? "у Саши" : "ещё не у Саши"}</span></div>`,
      );
    }
    const blitzDone = Object.entries(state.blitzAnswers);
    body = answered
      ? `<div class="answers-head"><p>Ответы видите только ты и Саша.</p><div class="send-status" data-send-status>${sendStatusHtml()}</div></div>${Object.entries(
          data.profile.categories,
        )
          .filter(([k]) => byCat[k])
          .map(
            ([k, label]) =>
              `<section class="answer-group"><h2>${esc(label)}</h2>${byCat[k].join("")}</section>`,
          )
          .join("")}${blitzDone.length ? `<section class="answer-group"><h2>Блиц</h2><div class="blitz-cloud">${blitzDone
          .map(([id, a]) => {
            const b = data.blitz.find((x) => x.id === id);
            return `<span>${esc(a.v === "a" ? b.a : b.b)}</span>`;
          })
          .join("")}</div></section>` : ""}`
      : `<p class="empty">Ответы появятся здесь, когда ты ответишь на вопрос дня или пройдёшь блиц в разделе "Сегодня".</p>`;
  }
  if (albumTab === "notes")
    body = state.found.notes.length
      ? `<div class="notes-list">${[...state.found.notes]
          .sort((a, b) => a - b)
          .map(
            (i) =>
              `<blockquote class="paper hand">${esc(data.daily.notes[i])}</blockquote>`,
          )
          .join("")}</div>`
      : '<p class="empty">Записки появляются в разделе "Сегодня", по одной в день.</p>';
  if (albumTab === "coupons")
    body = state.coupons.length
      ? `<div class="coupon-list">${state.coupons
          .map(
            (c, i) =>
              `<div class="coupon ${c.used ? "used" : ""}"><span class="eyebrow">${icon("ticket")} Купон от Саши</span><p class="hand">${esc(c.text)}</p>${c.used ? `<small>Использован ${c.used.split("-").reverse().join(".")}</small>` : `<button class="btn ink small" data-coupon="${i}">Использовать</button>`}</div>`,
          )
          .join("")}</div>`
      : '<p class="empty">Купоны выпадают на колесе Персика, не чаще раза в неделю.</p>';
  if (albumTab === "badges")
    body = `<div class="badge-grid">${BADGES.map((b) => {
      const got = state.badges.includes(b.id);
      return `<div class="badge ${got ? "got" : ""}"><span class="badge-icon">${icon(got ? "spark" : "lock")}</span><b>${esc(b.title)}</b><small>${esc(b.text)}</small></div>`;
    }).join("")}</div>`;
  main.innerHTML =
    heading(`${icon("book")} Всё, что ты нашла`, "Альбом") +
    `<div class="tabs" role="tablist">${tabs.map(([id, label]) => `<button role="tab" aria-selected="${albumTab === id}" data-album="${id}">${label}</button>`).join("")}</div>` +
    body;
  $$("[data-album]").forEach(
    (b) =>
      (b.onclick = () => {
        albumTab = b.dataset.album;
        renderAlbum();
      }),
  );
  $$("[data-coupon]").forEach(
    (b) => (b.onclick = () => useCoupon(Number(b.dataset.coupon))),
  );
  if (state.started && !(ensureDay().counters.album >= 1)) bump("album");
}

// ---------- Letter ----------

function renderLetter() {
  if (state.completed < 6) {
    main.innerHTML =
      heading(
        `${icon("letter")} Саша пишет`,
        "Письмо",
        "Каждая глава добавляет в письмо одну строчку. Последняя пока закрыта.",
      ) +
      `<section class="letter paper"><p class="hand letter-to">Насте</p>${data.chapters.map((c, i) => (i < state.completed ? `<p class="hand">${esc(c.fragment)}</p>` : `<div class="unwritten"><span>Страница ${i + 1}</span><i></i></div>`)).join("")}<p class="hand letter-sign">Саша</p></section><button id="letter-back" class="btn">К следующей странице ${icon("arrow")}</button>`;
    $("#letter-back").onclick = () => {
      state.session = { type: "chapter", index: state.chapter };
      navigate("adventure");
    };
    return;
  }
  main.innerHTML = `<section class="finale"><span class="eyebrow">Шесть страниц</span><div class="final-art"><img class="together" src="${data.characters.final}" alt="Настя и Саша"></div><h1>${esc(data.finale.title)}</h1><section class="letter paper"><p class="hand letter-to">Насте</p><p class="hand">${esc(data.finale.text)}</p>${data.chapters.map((c) => `<p class="hand">${esc(c.fragment)}</p>`).join("")}<p class="hand letter-sign">${esc(data.finale.signature)}</p></section><ul class="galaxy">${data.finale.galaxy.map((t) => `<li>${icon("spark")} ${esc(t)}</li>`).join("")}</ul><figure class="final-cat"><img src="${data.characters.cat}" alt="Персик"><figcaption>Персик подтверждает: всё правда.</figcaption></figure><button id="final-today" class="btn">Что дальше ${icon("arrow")}</button></section>`;
  $("#final-today").onclick = () => navigate("today");
  burst();
  sfx("win");
}

// ---------- Settings ----------

function settings() {
  openModal(
    `<span class="eyebrow">${icon("gear")} Настройки</span><h2 id="modal-title">Как играть</h2><div class="settings-help"><p>Шагай на соседнюю клетку: нажатием, свайпом по карте, стрелками или WASD. Кнопка с солнцем и луной меняет свет: при солнце открыты золотые мосты, при луне серебряные.</p><p>В главе нужно собрать три искры и выиграть ключ, потом зайти в портал. Звёзды: одна за прохождение, вторая если уложиться в норму шагов, третья если без подсказок Персика.</p><p>Каждый день в разделе "Сегодня": вопрос от Саши, блиц, лабиринт, колесо, записка и три задания. Пыль тратится в шкафу Персика.</p><p>Персика можно гладить прямо на экране. Если долго ничего не делать, он засыпает.</p></div><p class="muted-line">Прогресс хранится в этом браузере на этом устройстве. Чтобы игра открывалась как приложение, в меню браузера выбери "На экран Домой".</p><button id="reset" class="danger">Начать всё заново</button>`,
  );
  $("#reset").onclick = () => {
    $("#modal-content").innerHTML =
      `<h2 id="modal-title">Начать заново?</h2><p>Сбросятся главы, звёзды, пыль, вещи Персика, серия и ответы на вопросы. Неотправленные ответы Саша не получит.</p><div class="modal-actions"><button id="cancel-reset" class="btn">Оставить как есть</button><button id="confirm-reset" class="danger">Сбросить</button></div>`;
    $("#cancel-reset").onclick = () => modal.close();
    $("#confirm-reset").onclick = () => {
      const sound = state.sound;
      state = freshState();
      state.sound = sound;
      levelCache.clear();
      ensureDay();
      save();
      modal.close();
      P.setOutfit(null);
      navigate("adventure");
      notify("Персик готов идти сначала");
    };
  };
}

// ---------- Mini-games ----------
// Each game gets a host element and returns { cleanup, help }. help() makes
// one move for her and returns the element Persik should jump to.

function openMini(id, mode) {
  const game = data.games[id];
  if (!game) return;
  stopMini();
  openModal(
    `<span class="eyebrow">${mode === "key" ? `${icon("key")} Ключ от портала` : `${icon("game")} Мини-игра`}</span><h2 id="modal-title">${esc(game.title)}</h2><p class="mini-rule">${esc(game.rule)}</p><div class="mini-host" id="mini-host"></div><div class="mini-foot"><p class="mini-status" id="mini-status" aria-live="polite"></p><button class="pill" id="mini-help">${icon("paw")} Персик, помоги</button></div><div class="mini-done" id="mini-done" hidden></div>`,
    "mini-modal",
  );
  const host = $("#mini-host");
  const ctx = {
    won: false,
    status: (t) => ($("#mini-status").textContent = t),
    win: () => {
      if (ctx.won) return;
      ctx.won = true;
      sfx("win");
      buzz([30, 50, 30]);
      burst(12);
      P.celebrate();
      miniWon(id, mode);
    },
  };
  const made = MINI[id](host, ctx, game) || {};
  mini = {
    id,
    mode,
    ctx,
    cleanup: made.cleanup || (() => {}),
    help: made.help || null,
  };
  $("#mini-help").onclick = () => {
    if (ctx.won || !mini?.help) return;
    const target = mini.help();
    P.visit(target || $("#mini-host"), data.persik.help[id]);
  };
  sfx("open");
}
function stopMini() {
  if (!mini) return;
  try {
    mini.cleanup();
  } catch {
    /* Cleanup must not block navigation. */
  }
  const wasKey = mini.mode === "key" && !mini.ctx.won;
  mini = null;
  if (wasKey && activeTab === "adventure") say(data.ui.keyLater);
}
function miniWon(id, mode) {
  const game = data.games[id];
  const first = !state.minis.includes(id);
  state.stats.minisWon++;
  const reward = mode === "key" ? REWARD.keyGame : REWARD.playGame;
  if (first) state.minis.push(id);
  addDust(reward);
  if (mode === "key") {
    const level = currentLevel();
    const j = journey(level);
    if (level.game === id) j.key = true;
  }
  checkBadges();
  bump("mini");
  save();
  $("#mini-help").hidden = true;
  const done = $("#mini-done");
  done.hidden = false;
  done.innerHTML = `<p class="hand mini-win">${esc(game.win)}</p><span class="reward-chip">${icon("dust")} +${reward} пыли</span><div class="modal-actions">${mode === "key" ? `<button id="mini-ok" class="btn">Забрать ключ ${icon("arrow")}</button>` : `<button id="mini-again" class="btn ghost">Ещё раз</button><button id="mini-ok" class="btn">Готово</button>`}</div>`;
  $("#mini-ok").onclick = () => modal.close();
  if ($("#mini-again")) $("#mini-again").onclick = () => openMini(id, "play");
  $("#mini-ok").focus();
}

const MINI = {
  constellation(host, ctx) {
    const pts = [
      [50, 86],
      [22, 60],
      [10, 34],
      [27, 13],
      [50, 27],
      [73, 13],
      [90, 34],
      [78, 60],
    ];
    host.innerHTML = `<div class="sky"><svg viewBox="0 0 100 100" preserveAspectRatio="none" class="sky-lines"></svg>${pts.map(([x, y], i) => `<button class="sky-star" data-star="${i}" style="left:${x}%;top:${y}%" aria-label="Звезда ${i + 1}">${icon("spark")}</button>`).join("")}</div><div class="mini-row"><span id="sky-round"></span><button class="link" id="sky-replay">Показать ещё раз</button></div>`;
    const lengths = [3, 4, 5];
    let round = 0,
      seq = [],
      input = 0,
      showing = false;
    const timers = [];
    const stars = $$(".sky-star", host);
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    const light = (i, cls = "lit", ms = 420) => {
      stars[i].classList.add(cls);
      later(() => stars[i].classList.remove(cls), ms);
    };
    const show = () => {
      showing = true;
      input = 0;
      ctx.status("Смотри на звёзды.");
      seq.forEach((s, k) =>
        later(
          () => {
            light(s);
            sfx("step", 1 + s * 0.12);
          },
          500 + k * 620,
        ),
      );
      later(
        () => {
          showing = false;
          ctx.status("Теперь твоя очередь.");
        },
        500 + seq.length * 620,
      );
    };
    const next = () => {
      if (round === lengths.length) {
        $(".sky-lines", host).innerHTML =
          `<polygon points="${pts.map((p) => p.join(",")).join(" ")}" class="heart-line"/>`;
        stars.forEach((s) => s.classList.add("done"));
        return ctx.win();
      }
      seq = E.shuffle([...pts.keys()], Math.random).slice(0, lengths[round]);
      $("#sky-round", host).textContent = `Раунд ${round + 1} из ${lengths.length}`;
      show();
    };
    stars.forEach(
      (b) =>
        (b.onclick = () => {
          if (showing || ctx.won) return;
          const i = Number(b.dataset.star);
          if (i === seq[input]) {
            light(i, "hit", 300);
            sfx("step", 1 + i * 0.12);
            input++;
            if (input === seq.length) {
              round++;
              ctx.status(round < lengths.length ? "Верно. Дальше длиннее." : "");
              later(next, 700);
            }
          } else {
            light(i, "miss", 400);
            sfx("no");
            ctx.status("Почти. Смотри ещё раз.");
            later(show, 700);
          }
        }),
    );
    $("#sky-replay", host).onclick = () => !showing && !ctx.won && show();
    later(next, 300);
    return {
      cleanup: () => timers.forEach(clearTimeout),
      // Persik lights the next star she has to press.
      help: () => {
        if (showing || !seq.length) return null;
        const target = stars[seq[input]];
        light(seq[input], "lit", 900);
        return target;
      },
    };
  },

  pairs(host, ctx, game) {
    const deck = E.shuffle(
      game.cards.flatMap((c, i) => [i, i]),
      Math.random,
    );
    host.innerHTML = `<div class="pairs">${deck.map((v, k) => `<button class="card" data-k="${k}" data-v="${v}" aria-label="Карточка ${k + 1}"><span class="card-back">${icon("spark")}</span><span class="card-front"><i>${esc(game.cards[v][1])}</i>${esc(game.cards[v][0])}</span></button>`).join("")}</div>`;
    let open = [],
      moves = 0,
      matched = 0,
      lock = false,
      timer,
      peeks = 1;
    ctx.status("Ходов: 0");
    const cards = $$(".card", host);
    cards.forEach(
      (b) =>
        (b.onclick = () => {
          if (lock || b.classList.contains("up") || ctx.won) return;
          b.classList.add("up");
          sfx("step", 1.3);
          open.push(b);
          if (open.length < 2) return;
          moves++;
          ctx.status(`Ходов: ${moves}`);
          const [a, c] = open;
          open = [];
          if (a.dataset.v === c.dataset.v) {
            a.classList.add("match");
            c.classList.add("match");
            matched++;
            sfx("spark");
            if (matched === game.cards.length) {
              const best = state.stats.pairsBest;
              state.stats.pairsBest =
                best === null ? moves : Math.min(best, moves);
              ctx.status(
                `Собрано за ${moves} ${plural(moves, "ход", "хода", "ходов")}.`,
              );
              ctx.win();
            }
          } else {
            lock = true;
            timer = setTimeout(() => {
              a.classList.remove("up");
              c.classList.remove("up");
              lock = false;
            }, 750);
          }
        }),
    );
    return {
      cleanup: () => clearTimeout(timer),
      // One peek per game: a hidden pair flips up for a second.
      help: () => {
        if (!peeks || lock) {
          ctx.status("Персик уже подсматривал. Дальше сама.");
          return null;
        }
        const hidden = cards.filter((c) => !c.classList.contains("up"));
        if (!hidden.length) return null;
        const v = hidden[0].dataset.v;
        const pair = hidden.filter((c) => c.dataset.v === v);
        peeks--;
        pair.forEach((c) => c.classList.add("peek"));
        setTimeout(() => pair.forEach((c) => c.classList.remove("peek")), 1100);
        return pair[0];
      },
    };
  },

  clouds(host, ctx, game) {
    host.innerHTML =
      '<div class="cloud-sky"></div><p class="hand joke" id="joke"></p>';
    const sky = $(".cloud-sky", host);
    const jokes = E.shuffle(game.jokes, Math.random);
    let popped = 0,
      spawned = 0,
      timer;
    const goal = 8;
    ctx.status(`Лопнуто 0 из ${goal}`);
    const pop = (c, gold) => {
      if (c.classList.contains("pop") || ctx.won) return;
      c.classList.add("pop");
      setTimeout(() => c.remove(), 300);
      popped++;
      sfx("spark", 0.8 + Math.random() * 0.4);
      buzz(12);
      $("#joke", host).textContent = jokes[(popped - 1) % jokes.length];
      if (gold) {
        addDust(3);
        notify("Золотое облако: +3 пыли");
      }
      ctx.status(`Лопнуто ${Math.min(popped, goal)} из ${goal}`);
      if (popped >= goal) ctx.win();
    };
    const spawn = () => {
      if (ctx.won) return;
      if ($$(".cloud:not(.pop)", sky).length < 5) {
        const c = document.createElement("button");
        const gold = spawned > 2 && Math.random() < 0.15;
        spawned++;
        c.className = `cloud${gold ? " gold" : ""}`;
        c.setAttribute("aria-label", gold ? "Золотое облако" : "Облако");
        c.innerHTML =
          '<svg viewBox="0 0 64 40" aria-hidden="true"><path d="M16 36a12 12 0 0 1-1-24A16 16 0 0 1 45 9a12 12 0 0 1 3 27z"/></svg>';
        c.style.top = `${6 + Math.random() * 68}%`;
        c.style.setProperty("--dur", `${7 + Math.random() * 5}s`);
        if (reducedMotion()) c.style.left = `${8 + Math.random() * 75}%`;
        c.onanimationend = () => c.remove();
        c.onclick = () => pop(c, gold);
        sky.append(c);
      }
      timer = setTimeout(spawn, reducedMotion() ? 1400 : 850);
    };
    spawn();
    return {
      cleanup: () => clearTimeout(timer),
      help: () => {
        const c = $$(".cloud:not(.pop)", sky)[0];
        if (!c) return null;
        setTimeout(() => pop(c, c.classList.contains("gold")), 500);
        return c;
      },
    };
  },

  catch(host, ctx) {
    host.innerHTML = `<div class="catch-field" tabindex="0" aria-label="Поле. Стрелки влево и вправо двигают Персика."><div class="catcher">${P.face(state.equip.cat)}</div></div>`;
    const field = $(".catch-field", host),
      catcher = $(".catcher", host);
    const goal = 10;
    let x = 0.5,
      score = 0,
      items = [],
      last = performance.now(),
      spawnIn = 400,
      raf,
      magnet = 0;
    const keys = {};
    ctx.status(`Поймано 0 из ${goal}`);
    const setX = (v) => {
      x = Math.max(0.08, Math.min(0.92, v));
      catcher.style.transform = `translateX(calc(${x * 100}cqw - 50%))`;
    };
    setX(0.5);
    const onPointer = (e) => {
      const r = field.getBoundingClientRect();
      setX((e.clientX - r.left) / r.width);
    };
    field.addEventListener("pointerdown", onPointer);
    field.addEventListener("pointermove", onPointer);
    const onKey = (e) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        keys[e.key] = e.type === "keydown";
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("keyup", onKey);
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (keys.ArrowLeft) setX(x - dt * 0.9);
      if (keys.ArrowRight) setX(x + dt * 0.9);
      spawnIn -= dt * 1000;
      if (spawnIn <= 0 && !ctx.won) {
        const snow = score > 1 && Math.random() < 0.28;
        const el = document.createElement("span");
        el.className = `drop${snow ? " snow" : ""}`;
        el.innerHTML = snow
          ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 2 3-2M9 20l3-2 3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
          : icon("heart");
        field.append(el);
        items.push({ el, x: 0.08 + Math.random() * 0.84, y: -0.05, snow });
        spawnIn = Math.max(420, 900 - score * 40);
      }
      const speed = reducedMotion() ? 0.22 : 0.3 + score * 0.02;
      magnet = Math.max(0, magnet - dt);
      for (const it of items) {
        it.y += dt * speed;
        if (magnet > 0 && !it.snow) it.x += (x - it.x) * Math.min(1, dt * 3);
        it.el.style.transform = `translate(calc(${it.x * 100}cqw - 50%), calc(${it.y * 100}cqh - 50%))`;
        if (
          it.y > 0.8 &&
          it.y < 0.95 &&
          Math.abs(it.x - x) < 0.11 &&
          !it.hit
        ) {
          it.hit = true;
          it.el.classList.add("caught");
          if (it.snow) {
            score = Math.max(0, score - 1);
            sfx("no");
            ctx.status(`Брр, снежинка. Поймано ${score} из ${goal}`);
          } else {
            score++;
            sfx("coin", 0.9 + score * 0.03);
            buzz(10);
            ctx.status(`Поймано ${score} из ${goal}`);
            if (score >= goal) ctx.win();
          }
        }
      }
      items = items.filter((it) => {
        if (it.hit || it.y > 1.05) {
          setTimeout(() => it.el.remove(), it.hit ? 250 : 0);
          return false;
        }
        return true;
      });
      if (!ctx.won) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    field.focus({ preventScroll: true });
    return {
      cleanup: () => {
        cancelAnimationFrame(raf);
        document.removeEventListener("keydown", onKey);
        document.removeEventListener("keyup", onKey);
      },
      // For four seconds hearts drift toward the catcher.
      help: () => {
        magnet = 4;
        ctx.status("Персик притягивает сердечки.");
        return catcher;
      },
    };
  },

  puzzle(host, ctx, game) {
    let order;
    do order = E.shuffle([...Array(9).keys()], Math.random);
    while (order.every((v, i) => v === i));
    let pick = null,
      moves = 0;
    const swap = (a, b) => {
      [order[a], order[b]] = [order[b], order[a]];
      moves++;
      sfx("step", 1.2);
      ctx.status(`Ходов: ${moves}`);
    };
    const draw = () => {
      host.innerHTML = `<div class="puzzle">${order.map((v, i) => `<button class="piece ${v === i ? "right" : ""} ${pick === i ? "picked" : ""}" data-i="${i}" aria-label="Кусочек ${v + 1} на месте ${i + 1}" style="background-image:url('${game.image}');background-position:${(v % 3) * 50}% ${Math.floor(v / 3) * 50}%"></button>`).join("")}</div>`;
      $$(".piece", host).forEach(
        (b) =>
          (b.onclick = () => {
            if (ctx.won) return;
            const i = Number(b.dataset.i);
            if (pick === null) pick = i;
            else if (pick === i) pick = null;
            else {
              swap(pick, i);
              pick = null;
            }
            draw();
            check();
          }),
      );
    };
    const check = () => {
      if (order.every((v, k) => v === k)) {
        host.querySelector(".puzzle").classList.add("solved");
        ctx.win();
      }
    };
    ctx.status("Ходов: 0");
    draw();
    return {
      help: () => {
        const i = order.findIndex((v, k) => v !== k);
        if (i < 0) return null;
        swap(i, order.indexOf(i));
        pick = null;
        draw();
        check();
        return $(`.piece[data-i="${i}"]`, host);
      },
    };
  },

  words(host, ctx, game) {
    let round = 0,
      next = 0,
      words = [];
    const play = () => {
      words = game.phrases[round].split(" ");
      let order;
      do order = E.shuffle([...words.keys()], Math.random);
      while (order.every((v, i) => v === i));
      next = 0;
      host.innerHTML = `<div class="phrase hand" aria-live="polite"></div><div class="word-bank">${order.map((k) => `<button class="word" data-k="${k}">${esc(words[k])}</button>`).join("")}</div>`;
      ctx.status(`Фраза ${round + 1} из ${game.phrases.length}`);
      $$(".word", host).forEach((b) => (b.onclick = () => tap(b)));
    };
    const tap = (b) => {
      if (ctx.won || b.disabled) return;
      const k = Number(b.dataset.k);
      if (words[k] === words[next]) {
        b.disabled = true;
        b.classList.add("used");
        $(".phrase", host).insertAdjacentHTML(
          "beforeend",
          `<span>${esc(words[next])}</span>`,
        );
        next++;
        sfx("step", 1 + next * 0.05);
        if (next === words.length) {
          round++;
          sfx("spark");
          if (round === game.phrases.length) ctx.win();
          else setTimeout(play, 900);
        }
      } else {
        sfx("no");
        b.classList.remove("shake");
        void b.offsetWidth;
        b.classList.add("shake");
      }
    };
    play();
    return {
      help: () => {
        const b = $$(".word:not(.used)", host).find(
          (x) => words[Number(x.dataset.k)] === words[next],
        );
        if (!b) return null;
        b.classList.add("glow");
        setTimeout(() => b.classList.remove("glow"), 1400);
        return b;
      },
    };
  },
};

// ---------- Start ----------

async function init() {
  try {
    if (!E || !P || !window.ShareCodec || !window.Arcade || !window.ArcadeLogic || !window.Vault || !window.Inbox)
      throw new Error("Scripts missing");
    // Published site: texts and photos are sealed in vault.json behind the password.
    data = await window.Vault.load();
    if (!data) {
      const response = await fetch("./data.json");
      if (!response.ok) throw new Error(`Content HTTP ${response.status}`);
      data = await response.json();
    }
    if (
      data.version !== 3 ||
      data.chapters.length !== 6 ||
      !Array.isArray(data.questions) ||
      data.chapters.some(
        (c) =>
          c.grid.length !== 7 ||
          c.grid.some((r) => r.length !== 7) ||
          !data.games[c.game],
      )
    )
      throw new Error("Invalid adventure data");
    load();
    ensureDay();
    save();
    P.calm = TEST;
    P.init({
      lines: data.persik,
      item: state.equip.cat,
      onPet: (el) => petCat(el),
    });
    navigate("adventure", false);
    $$("[data-tab]").forEach(
      (b) => (b.onclick = () => navigate(b.dataset.tab)),
    );
    $("#sound").onclick = () => {
      state.sound = !state.sound;
      save();
      updateShell();
      sfx("open");
      notify(state.sound ? "Звук включён" : "Звук выключен");
    };
    $("#settings").onclick = settings;
    document.addEventListener("keydown", (e) => {
      if (!playing() || e.altKey || e.ctrlKey || e.metaKey) return;
      const keys = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        w: "up",
        a: "left",
        s: "down",
        d: "right",
        ц: "up",
        ф: "left",
        ы: "down",
        в: "right",
      };
      const dir = keys[e.key] || keys[e.key.toLowerCase()];
      if (dir) {
        e.preventDefault();
        direction(dir);
      }
      if (
        e.code === "Space" &&
        (e.target === $("#board") ||
          e.target === main ||
          e.target === document.body)
      ) {
        e.preventDefault();
        togglePhase();
      }
    });
    // Delivery buttons live in cards that re-render: one listener for all.
    document.addEventListener("click", (e) => {
      if (e.target.closest("[data-deliver]")) deliver();
      else if (e.target.closest("[data-send]")) sendToSasha();
    });
    // Answers left on the phone (offline, or from before) go out on their own.
    deliver({ loud: false });
    addEventListener("online", () => deliver({ loud: false }));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden" && state) deliver({ keepalive: true, loud: false });
    });
    // The day can change while the app sits open overnight.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible" || !state) return;
      const before = state.day?.key;
      ensureDay();
      if (before !== state.day.key) {
        save();
        if (!modal.open) navigate(activeTab, false);
      }
    });
    if (TEST)
      window.__game = {
        winMini: () => mini?.ctx.win(),
        arcade: () => arcade?.game,
        endArcade: (score) => arcade && arcadeOver(arcade.id, score, {}),
        state: () => state,
        level: () => currentLevel(),
        outbox: () => ({ ...outbox }),
      };
    if ("serviceWorker" in navigator && location.protocol !== "file:")
      navigator.serviceWorker.register("./sw.js").catch(() => {});
  } catch (error) {
    main.innerHTML = `<section class="error-state"><h1>Игра не загрузилась</h1><p>Проверь интернет и попробуй ещё раз.</p><button class="btn" id="retry">Попробовать снова</button></section>`;
    $("#retry").onclick = () => location.reload();
    console.error(error);
  }
}

$("#close-modal").onclick = () => modal.close();
modal.addEventListener("close", () => {
  stopMini();
  stopArcade();
  if (activeTab === "games") renderGames();
  P.attach(null);
  if (P.perched) P.goHome();
  if (activeTab === "adventure" && $("#board") && state && !state.pendingEnd) {
    buildBoard();
    const j = journey();
    if (j.key && currentLevel().key === j.pos) say(data.ui.keyWon);
  }
  if (activeTab === "today") renderToday();
});
modal.addEventListener("click", (e) => {
  if (e.target !== modal) return;
  const r = modal.getBoundingClientRect();
  if (
    e.clientX < r.left ||
    e.clientX > r.right ||
    e.clientY < r.top ||
    e.clientY > r.bottom
  )
    modal.close();
});
init();
