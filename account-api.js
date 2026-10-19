/* Shared account client for the Vite profile and settings pages. */
(function () {
  "use strict";

  var SERVICE = "https://iljiovhwkrtfuvmhcfhn.supabase.co/functions/v1/vite-auth";
  var API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlsamlvdmh3a3J0ZnV2bWhjZmhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0MjYwNDQsImV4cCI6MjEwODAwMjA0NH0.G_mI-ZoyTnYRhKDln6xkgZc9SvYQi-Q6CyXVz9nJqco";
  var TOKEN_KEY = "vite.account.token";

  function token() {
    try { return localStorage.getItem(TOKEN_KEY); } catch (_) { return null; }
  }

  function setToken(value) {
    try {
      if (value) localStorage.setItem(TOKEN_KEY, value);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (_) { /* storage can be unavailable */ }
  }

  async function api(action, body, authenticated) {
    var headers = {
      "content-type": "application/json",
      apikey: API_KEY
    };
    var current = token();
    headers.authorization = "Bearer " + (authenticated && current ? current : API_KEY);
    var response = await fetch(SERVICE + "/" + action, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body || {})
    });
    var payload = null;
    try { payload = await response.json(); } catch (_) { /* keep null */ }
    if (!response.ok) {
      var message = payload && payload.message ? payload.message : "Account service returned " + response.status + ".";
      var error = new Error(message);
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function initials(value) {
    var parts = String(value || "?").trim().split(/\s+/).slice(0, 2);
    return parts.map(function (part) { return part.charAt(0).toUpperCase(); }).join("") || "?";
  }

  function isoDate(seconds) {
    if (!seconds) return "";
    var date = new Date(seconds * 1000);
    return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  }

  function avatarColor(seed) {
    var total = 0;
    String(seed || "vite").split("").forEach(function (ch) { total += ch.charCodeAt(0); });
    var palette = ["#c8ff2e", "#8bd6a4", "#c6a7ff", "#ffb27a", "#8ec8ff", "#ff91a8"];
    return palette[total % palette.length];
  }

  function presenceLabel(presence) {
    if (!presence || !presence.game_name) return null;
    return "Playing " + presence.game_name;
  }

  window.ViteAccount = {
    api: api,
    token: token,
    setToken: setToken,
    escapeHtml: escapeHtml,
    initials: initials,
    isoDate: isoDate,
    avatarColor: avatarColor,
    presenceLabel: presenceLabel
  };
})();
