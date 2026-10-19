"use strict";
// Packs Nastya's answers into a short code for a link or a message, and back.
// The code travels in the URL fragment, which browsers never send to a server.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ShareCodec = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const toB64url = (bytes) => {
    let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000)
      s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  const fromB64url = (str) => {
    const s = atob(str.replace(/-/g, "+").replace(/_/g, "/"));
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  };
  async function pipe(bytes, stream) {
    const piped = new Blob([bytes]).stream().pipeThrough(stream);
    return new Uint8Array(await new Response(piped).arrayBuffer());
  }

  // Answer row: [id, value, why, day]. value is text, an option label,
  // a list of labels, a 1-5 number, or "a"/"b" for the blitz.
  async function encode(payload) {
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    if (typeof CompressionStream === "function") {
      try {
        return `z${toB64url(await pipe(bytes, new CompressionStream("deflate-raw")))}`;
      } catch {
        /* Fall through to plain encoding. */
      }
    }
    return `j${toB64url(bytes)}`;
  }

  async function decode(code) {
    const clean = String(code).trim();
    const kind = clean[0],
      body = clean.slice(1);
    let bytes = fromB64url(body);
    if (kind === "z") bytes = await pipe(bytes, new DecompressionStream("deflate-raw"));
    else if (kind !== "j") throw new Error("Unknown code");
    const data = JSON.parse(new TextDecoder().decode(bytes));
    if (!data || data.v !== 1 || !Array.isArray(data.a)) throw new Error("Bad payload");
    return data;
  }

  // Finds a code inside anything pasted: a full link, a message, or the code alone.
  function extract(text) {
    const s = String(text || "");
    const hash = s.match(/#([zj][A-Za-z0-9_-]{8,})/);
    if (hash) return hash[1];
    const bare = s.match(/\b([zj][A-Za-z0-9_-]{16,})\b/);
    return bare ? bare[1] : null;
  }

  return { encode, decode, extract };
});
