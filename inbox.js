"use strict";
// Delivery of Nastya's answers to Sasha without a server: each batch becomes
// an issue in Sasha's private GitHub repository. The token sits inside the
// encrypted vault, so only someone with the password can use it. Rows are the
// same [id, value, why, day] tuples the share link carries.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Inbox = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const MARK = "<!-- nastya-answers v1 -->";
  const API = "https://api.github.com";

  // Human part for Sasha's notification, machine part for his page.
  function format(rows, readable) {
    const lines = rows.map((r) => readable(r)).filter(Boolean);
    const first = String(lines[0] || "").split("\n")[0];
    const title =
      rows.length === 1 && first
        ? `Настя ответила: ${first.length > 70 ? `${first.slice(0, 67)}...` : first}`
        : `Ответы Насти: ${rows.length}`;
    const body = `${lines.join("\n\n")}\n\n${MARK}\n\`\`\`json\n${JSON.stringify(rows)}\n\`\`\`\n`;
    return { title, body };
  }

  function parse(body) {
    const text = String(body || "");
    if (!text.includes(MARK)) return null;
    const m = text.slice(text.indexOf(MARK)).match(/```json\s*([\s\S]*?)```/);
    if (!m) return null;
    try {
      const rows = JSON.parse(m[1]);
      return Array.isArray(rows) ? rows.filter((r) => Array.isArray(r) && r.length >= 2) : null;
    } catch {
      return null;
    }
  }

  const headers = (token) => ({
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  });

  // Resolves true when GitHub stored the issue. Never throws.
  async function send(config, issue, { keepalive = false } = {}) {
    if (!config || !config.token || !config.repo) return false;
    try {
      const r = await fetch(`${API}/repos/${config.repo}/issues`, {
        method: "POST",
        headers: { ...headers(config.token), "Content-Type": "application/json" },
        body: JSON.stringify(issue),
        keepalive,
      });
      return r.status === 201;
    } catch {
      return false;
    }
  }

  // Every row ever sent, oldest first, for Sasha's page.
  async function list(config, { max = 10 } = {}) {
    const rows = [];
    for (let page = 1; page <= max; page++) {
      const r = await fetch(`${API}/repos/${config.repo}/issues?state=all&per_page=100&sort=created&direction=asc&page=${page}`, {
        headers: headers(config.token),
        cache: "no-store",
      });
      if (!r.ok) throw new Error(`Inbox HTTP ${r.status}`);
      const issues = await r.json();
      for (const i of issues) {
        const got = !i.pull_request && parse(i.body);
        if (got) rows.push(...got);
      }
      if (issues.length < 100) break;
    }
    return rows;
  }

  return { MARK, format, parse, send, list };
});
