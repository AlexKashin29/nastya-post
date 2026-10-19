"use strict";
// Sealed content. On the published site the texts and photos live only in
// vault.json, encrypted with AES-256-GCM under a key derived from the
// password (PBKDF2-SHA256). The page asks for the password once per device,
// keeps the derived key in localStorage and never stores the password.
// Without vault.json (local development, tests) the plain data.json is used.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Vault = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const ITER = 600000;
  const KEY_STORE = "nastya-vault-key-v1";
  const subtle = () => globalThis.crypto.subtle;
  const enc = new TextEncoder();

  // Same password however it is typed: case, ё, extra spaces.
  const normalize = (pw) =>
    String(pw || "")
      .trim()
      .toLowerCase()
      .replace(/ё/g, "е")
      .replace(/\s+/g, " ");

  const toB64 = (bytes) => {
    if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
    let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000)
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  };
  const fromB64 = (b64) => {
    if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(b64, "base64"));
    const s = atob(b64);
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  };

  async function deriveRaw(password, salt, iter = ITER) {
    const base = await subtle().importKey("raw", enc.encode(normalize(password)), "PBKDF2", false, ["deriveBits"]);
    const bits = await subtle().deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: iter }, base, 256);
    return new Uint8Array(bits);
  }
  const aesKey = (raw) => subtle().importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);

  async function seal(bytes, password, iter = ITER) {
    const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const key = await aesKey(await deriveRaw(password, salt, iter));
    const ct = new Uint8Array(await subtle().encrypt({ name: "AES-GCM", iv }, key, bytes));
    return { v: 1, kdf: "PBKDF2-SHA256", iter, salt: toB64(salt), iv: toB64(iv), ct: toB64(ct) };
  }

  // Throws when the key is wrong: GCM checks integrity before returning.
  async function openWithRaw(box, raw) {
    const key = await aesKey(raw);
    const pt = await subtle().decrypt({ name: "AES-GCM", iv: fromB64(box.iv) }, key, fromB64(box.ct));
    return new Uint8Array(pt);
  }
  async function open(box, password) {
    const raw = await deriveRaw(password, fromB64(box.salt), box.iter);
    return { bytes: await openWithRaw(box, raw), raw };
  }

  // ---------- Browser side ----------
  const files = {};
  const asset = (path) => files[path] || path;

  // Swap every "./assets/..." string in the data for its decrypted blob URL.
  function relink(value) {
    if (typeof value === "string") return asset(value);
    if (Array.isArray(value)) return value.map(relink);
    if (value && typeof value === "object")
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, relink(v)]));
    return value;
  }

  let inboxConfig = null;
  function unpack(bytes) {
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    inboxConfig = payload.inbox && payload.inbox.token ? payload.inbox : null;
    for (const [path, f] of Object.entries(payload.files || {}))
      files[path] = URL.createObjectURL(new Blob([fromB64(f.b64)], { type: f.type }));
    return relink(payload.data);
  }

  const store = {
    get() {
      try {
        return JSON.parse(localStorage.getItem(KEY_STORE) || "null");
      } catch {
        return null;
      }
    },
    set(v) {
      try {
        localStorage.setItem(KEY_STORE, JSON.stringify(v));
      } catch {
        /* Private mode: she will be asked again next time. */
      }
    },
    clear() {
      try {
        localStorage.removeItem(KEY_STORE);
      } catch {
        /* nothing to clear */
      }
    },
  };

  function lockScreen(box, { title, note }) {
    return new Promise((resolve) => {
      const wrap = document.createElement("div");
      wrap.className = "lock";
      wrap.innerHTML = `<form class="lock-card" novalidate>
        <svg class="lock-seal" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="27" fill="#c93d6c"/><circle cx="32" cy="32" r="20" fill="none" stroke="#f6efe6" stroke-opacity=".45" stroke-width="2"/><path d="M32 43s-10-6-10-13a5.5 5.5 0 0 1 10-3 5.5 5.5 0 0 1 10 3c0 7-10 13-10 13z" fill="#f6efe6"/></svg>
        <h1>${title}</h1>
        <p>${note}</p>
        <label class="lock-label" for="lock-pw">Пароль</label>
        <input id="lock-pw" class="lock-input" type="password" autocomplete="current-password" autocapitalize="none" spellcheck="false" required>
        <p class="lock-error" role="alert" hidden></p>
        <button class="btn big" type="submit">Открыть</button>
      </form>`;
      document.body.append(wrap);
      const form = wrap.querySelector("form"),
        input = wrap.querySelector("input"),
        error = wrap.querySelector(".lock-error"),
        button = wrap.querySelector("button");
      setTimeout(() => input.focus(), 50);
      form.onsubmit = async (e) => {
        e.preventDefault();
        if (!input.value.trim()) {
          error.textContent = "Введи пароль.";
          error.hidden = false;
          return;
        }
        button.disabled = true;
        button.textContent = "Открываю…";
        error.hidden = true;
        try {
          const { bytes, raw } = await open(box, input.value);
          store.set({ salt: box.salt, key: toB64(raw) });
          wrap.remove();
          resolve(bytes);
        } catch {
          error.textContent = "Пароль не подходит. Проверь раскладку и попробуй ещё раз.";
          error.hidden = false;
          input.select();
        }
        button.disabled = false;
        button.textContent = "Открыть";
      };
    });
  }

  // Returns the decrypted data, or null when the site is not sealed.
  async function load(opts = {}) {
    const response = await fetch("./vault.json", { cache: "no-cache" });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Vault HTTP ${response.status}`);
    const box = await response.json();
    const saved = store.get();
    if (saved && saved.salt === box.salt) {
      try {
        return unpack(await openWithRaw(box, fromB64(saved.key)));
      } catch {
        store.clear();
      }
    }
    const bytes = await lockScreen(box, {
      title: opts.title || "Письмо запечатано",
      note: opts.note || "Его может открыть только Настя. Пароль знаете вы с Сашей.",
    });
    return unpack(bytes);
  }

  // Forget this device: the next visit asks for the password again.
  const forget = () => store.clear();

  // Where answers go: {repo, token} sealed in the vault, null when unsealed.
  const inbox = () => inboxConfig;

  return { ITER, normalize, seal, open, openWithRaw, toB64, fromB64, load, asset, forget, inbox };
});
