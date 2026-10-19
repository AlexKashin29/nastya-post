"use strict";
// Sasha's side: collects answers Nastya sends from the game into one list,
// grouped by topic, and exports it as text or a file.
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const STORE = "sasha-answers-v1";
let data,
  book = { answers: {}, blitz: {}, games: {}, updated: null };

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const fmt = (day) => (day ? day.split("-").reverse().join(".") : "");
const plural = (n, one, few, many) => {
  const a = Math.abs(n) % 100,
    b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
};

function loadBook() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || "null");
    if (saved && typeof saved === "object")
      book = {
        answers: saved.answers || {},
        blitz: saved.blitz || {},
        games: saved.games || {},
        updated: saved.updated || null,
      };
  } catch {
    /* Start empty if storage is blocked or broken. */
  }
}
function saveBook() {
  try {
    localStorage.setItem(STORE, JSON.stringify(book));
    return true;
  } catch {
    flash("Браузер не дал сохранить. Скачай .json, чтобы ничего не потерять.");
    return false;
  }
}

let toastTimer;
function toast(text) {
  const t = $("#toast");
  t.textContent = text;
  t.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("visible"), 3000);
}
function flash(text) {
  const f = $("#flash");
  f.textContent = text;
  f.hidden = false;
}

// Newer answer to the same question replaces the older one.
function merge(payload) {
  let added = 0,
    changed = 0;
  for (const row of payload.a) {
    if (!Array.isArray(row)) continue;
    const [id, v, why, day] = row;
    if (data.questions.some((q) => q.id === id)) {
      const old = book.answers[id];
      if (old && old.day > day) continue;
      if (!old) added++;
      else if (JSON.stringify(old.v) !== JSON.stringify(v) || old.why !== why)
        changed++;
      book.answers[id] = { v, why: why || "", day };
    } else if (String(id).startsWith("g:") && (v === "up" || v === "down")) {
      const gid = id.slice(2);
      if (!book.games[gid]) added++;
      else if (book.games[gid].v !== v) changed++;
      book.games[gid] = { v, day };
    } else if (data.blitz.some((b) => b.id === id) && (v === "a" || v === "b")) {
      if (!book.blitz[id]) added++;
      else if (book.blitz[id].v !== v) changed++;
      book.blitz[id] = { v, day };
    }
  }
  book.updated = new Date().toISOString().slice(0, 10);
  saveBook();
  return { added, changed };
}

async function importCode(code) {
  const payload = await window.ShareCodec.decode(code);
  const { added, changed } = merge(payload);
  render();
  const parts = [];
  if (added) parts.push(`новых: ${added}`);
  if (changed) parts.push(`обновлено: ${changed}`);
  flash(
    parts.length
      ? `Ответы добавлены (${parts.join(", ")}).`
      : "Эти ответы уже есть в списке.",
  );
}

const answerText = (q, a) =>
  q.type === "scale"
    ? `${a.v} из 5 (${q.low} - ${q.high})`
    : Array.isArray(a.v)
      ? a.v.join(", ")
      : String(a.v);

function render() {
  const qs = data.questions,
    answered = qs.filter((q) => book.answers[q.id]);
  const blitz = data.blitz.filter((b) => book.blitz[b.id]);
  $("#summary").textContent = answered.length + blitz.length
    ? `Ответов на вопросы: ${answered.length} из ${qs.length}. Блиц: ${blitz.length} из ${data.blitz.length}.${book.updated ? ` Последнее пополнение ${fmt(book.updated)}.` : ""}`
    : window.Vault.inbox()
      ? "Пока пусто. Ответы Насти появятся здесь сами, как только она ответит."
      : "Пока пусто. Когда Настя ответит на вопрос дня и нажмёт \"Отправить Саше\", пришли себе её ссылку или вставь сообщение ниже.";
  $("#export").hidden = !(answered.length + blitz.length + Object.keys(book.games || {}).length);
  const cats = data.profile.categories;
  const sections = Object.entries(cats)
    .map(([k, label]) => {
      const list = qs.filter((q) => q.cat === k);
      const done = list.filter((q) => book.answers[q.id]);
      if (!done.length) return "";
      return `<section class="dossier-sec" id="cat-${k}"><h2>${esc(label)} <small>${done.length}/${list.length}</small></h2>${done
        .map((q) => {
          const a = book.answers[q.id];
          const body =
            q.type === "scale"
              ? `<div class="scale-read" aria-label="${a.v} из 5"><span>${esc(q.low)}</span><span class="dots">${[1, 2, 3, 4, 5].map((n) => `<i class="${n <= a.v ? "on" : ""}"></i>`).join("")}</span><span>${esc(q.high)}</span></div>`
              : Array.isArray(a.v)
                ? `<div class="tags">${a.v.map((x) => `<span>${esc(x)}</span>`).join("")}</div>`
                : `<p class="hand said">${esc(a.v)}</p>`;
          return `<article class="said-card paper"><span class="q">${esc(q.q)}</span>${body}${a.why ? `<p class="hand why">${esc(a.why)}</p>` : ""}<time>${fmt(a.day)}</time></article>`;
        })
        .join("")}</section>`;
    })
    .join("");
  const blitzHtml = blitz.length
    ? `<section class="dossier-sec" id="cat-blitz"><h2>Блиц: что выбирает <small>${blitz.length}</small></h2><div class="tags big">${blitz
        .map((b) => {
          const pick = book.blitz[b.id].v === "a" ? b.a : b.b,
            not = book.blitz[b.id].v === "a" ? b.b : b.a;
          return `<span title="а не ${esc(not)}">${esc(pick)} <em>а не ${esc(not)}</em></span>`;
        })
        .join("")}</div></section>`
    : "";
  const gameTitle = (id) =>
    data.arcade?.games.find((g) => g.id === id)?.title || data.games[id]?.title || id;
  const gameEntries = Object.entries(book.games || {});
  const gamesHtml = gameEntries.length
    ? `<section class="dossier-sec" id="cat-games"><h2>Игры: что ей нравится <small>${gameEntries.length}</small></h2><div class="tags big">${gameEntries
        .sort((a, b) => (a[1].v === b[1].v ? 0 : a[1].v === "up" ? -1 : 1))
        .map(([id, f]) => `<span class="${f.v}">${esc(gameTitle(id))} <em>${f.v === "up" ? "нравится" : "так себе"}</em></span>`)
        .join("")}</div></section>`
    : "";
  const open = qs.filter((q) => !book.answers[q.id]);
  const openHtml =
    answered.length && open.length
      ? `<details class="dossier-sec open-q"><summary>Ещё без ответа: ${open.length}</summary><ul>${open.map((q) => `<li><span>${esc(cats[q.cat])}</span>${esc(q.q)}</li>`).join("")}</ul></details>`
      : "";
  const nav =
    answered.length || blitz.length || Object.keys(book.games || {}).length
      ? `<nav class="dossier-nav" aria-label="Темы">${Object.entries(cats)
          .filter(([k]) => qs.some((q) => q.cat === k && book.answers[q.id]))
          .map(([k, label]) => `<a href="#cat-${k}">${esc(label)}</a>`)
          .join("")}${blitz.length ? '<a href="#cat-blitz">Блиц</a>' : ""}${Object.keys(book.games || {}).length ? '<a href="#cat-games">Игры</a>' : ""}</nav>`
      : "";
  $("#dossier").innerHTML = nav + sections + blitzHtml + gamesHtml + openHtml;
}

function markdown() {
  const lines = [
    "# Настя: ответы на вопросы",
    "",
    `Обновлено ${fmt(book.updated)}.`,
    "",
  ];
  for (const [k, label] of Object.entries(data.profile.categories)) {
    const done = data.questions.filter(
      (q) => q.cat === k && book.answers[q.id],
    );
    if (!done.length) continue;
    lines.push(`## ${label}`, "");
    for (const q of done) {
      const a = book.answers[q.id];
      lines.push(
        `- ${q.q}`,
        `  ${answerText(q, a)}${a.why ? `. Почему: ${a.why}` : ""} (${fmt(a.day)})`,
      );
    }
    lines.push("");
  }
  const blitz = data.blitz.filter((b) => book.blitz[b.id]);
  if (blitz.length) {
    lines.push("## Блиц: выбирает", "");
    for (const b of blitz) {
      const v = book.blitz[b.id].v;
      lines.push(`- ${v === "a" ? b.a : b.b} (а не ${v === "a" ? b.b : b.a})`);
    }
    lines.push("");
  }
  const games = Object.entries(book.games || {});
  if (games.length) {
    lines.push("## Игры", "");
    for (const [id, f] of games) {
      const t = data.arcade?.games.find((g) => g.id === id)?.title || data.games[id]?.title || id;
      lines.push(`- ${t}: ${f.v === "up" ? "нравится" : "так себе"}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Answers Nastya's game delivered to the private repository on its own.
async function pullInbox() {
  const config = window.Vault.inbox();
  if (!config) return;
  try {
    const rows = await window.Inbox.list(config);
    if (!rows.length) return;
    const { added, changed } = merge({ a: rows });
    render();
    if (added || changed)
      flash(`Новые ответы от Насти: ${added + changed}.`);
  } catch {
    flash("Не получилось забрать новые ответы. Проверь интернет и обнови страницу.");
  }
}

async function init() {
  try {
    data =
      (await window.Vault.load({
        title: "Ответы закрыты",
        note: "Введи тот же пароль, что у игры.",
      })) || (await (await fetch("./data.json")).json());
  } catch {
    $("#summary").textContent =
      "Не загрузились вопросы. Проверь интернет и обнови страницу.";
    return;
  }
  loadBook();
  render();
  await pullInbox();
  const code = window.ShareCodec.extract(location.hash);
  if (code) {
    try {
      await importCode(code);
    } catch {
      flash("Ссылка повреждена. Попроси Настю отправить ещё раз.");
    }
    history.replaceState(null, "", location.pathname);
  }
  $("#add").onclick = async () => {
    const err = $("#error");
    err.hidden = true;
    const code = window.ShareCodec.extract($("#paste").value);
    if (!code) {
      err.textContent =
        "Не нашёл ответов в тексте. Вставь сообщение от Насти целиком, вместе со ссылкой.";
      err.hidden = false;
      return;
    }
    try {
      await importCode(code);
      $("#paste").value = "";
    } catch {
      err.textContent =
        "Ссылка в тексте повреждена. Скопируй сообщение заново или попроси Настю отправить ещё раз.";
      err.hidden = false;
    }
  };
  $("#file").onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const json = JSON.parse(await f.text());
      if (json.answers && json.blitz) {
        const rows = [
          ...Object.entries(json.answers).map(([id, a]) => [id, a.v, a.why, a.day]),
          ...Object.entries(json.blitz).map(([id, a]) => [id, a.v, "", a.day]),
        ];
        merge({ v: 1, a: rows });
      } else merge(json);
      render();
      flash("Файл загружен.");
    } catch {
      $("#error").textContent = "Этот файл не похож на ответы Насти.";
      $("#error").hidden = false;
    }
    e.target.value = "";
  };
  $("#copy-md").onclick = async () => {
    const text = markdown();
    try {
      await navigator.clipboard.writeText(text);
      toast("Список скопирован");
    } catch {
      $("#paste").value = text;
      $("#paste").select();
      toast("Не получилось скопировать. Текст в поле выше, выдели и скопируй");
    }
  };
  $("#save-md").onclick = () =>
    download("nastya-answers.md", markdown(), "text/markdown");
  $("#save-json").onclick = () =>
    download("nastya-answers.json", JSON.stringify(book, null, 2), "application/json");
  let armed = false;
  $("#clear").onclick = () => {
    if (!armed) {
      armed = true;
      $("#clear").textContent = "Точно очистить? Нажми ещё раз";
      setTimeout(() => {
        armed = false;
        $("#clear").textContent = "Очистить всё";
      }, 4000);
      return;
    }
    book = { answers: {}, blitz: {}, games: {}, updated: null };
    saveBook();
    render();
    $("#clear").textContent = "Очистить всё";
    armed = false;
    toast("Список очищен");
  };
}
init();
