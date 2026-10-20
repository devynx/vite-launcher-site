(function () {
  "use strict";

  var Vite = window.ViteAccount;
  var bars = document.getElementById("stats-bars");
  var recent = document.getElementById("stats-recent");
  var players = document.getElementById("stat-players");
  var hours = document.getElementById("stat-hours");
  var games = document.getElementById("stat-games");
  if (!Vite || !bars || !recent) return;

  function number(value) {
    var n = Number(value);
    if (!Number.isFinite(n) || n < 0) return 0;
    return n;
  }

  function fmtHours(seconds) {
    var value = number(seconds) / 3600;
    if (value >= 1000) return Math.round(value).toLocaleString();
    if (value >= 100) return value.toFixed(0);
    if (value >= 10) return value.toFixed(1);
    return value.toFixed(1).replace(/\.0$/, "");
  }

  function fmtInt(value) {
    return number(value).toLocaleString();
  }

  function sourceLabel(source) {
    return { steam: "Steam", epic: "Epic", gog: "GOG" }[source] || "Store";
  }

  function empty(message) {
    return '<div class="stats-empty"><strong>' + Vite.escapeHtml(message) + "</strong>" +
      "<span>Stats become public when a player turns on playtime sharing in Settings.</span></div>";
  }

  function render(data) {
    players.textContent = fmtInt(data.players);
    hours.textContent = fmtHours(data.total_seconds);
    games.textContent = fmtInt(data.total_games);

    var top = Array.isArray(data.top_games) ? data.top_games : [];
    if (!top.length) {
      bars.innerHTML = empty("No public playtime yet");
    } else {
      var max = top.reduce(function (value, game) {
        return Math.max(value, number(game.seconds));
      }, 1);
      bars.innerHTML = top.map(function (game) {
        var width = Math.max(2, Math.round((number(game.seconds) / max) * 100));
        var name = Vite.escapeHtml(game.name || "Unknown game");
        return '<div class="stats-bar" role="listitem">' +
          '<div class="stats-bar__name"><span>' + name + "</span></div>" +
          '<div class="stats-bar__track" aria-hidden="true"><span class="stats-bar__fill" style="width:' + width + '%"></span></div>' +
          '<div class="stats-bar__meta"><strong>' + fmtHours(game.seconds) + " h</strong>" +
          "<span>" + fmtInt(game.players) + " player" + (number(game.players) === 1 ? "" : "s") + "</span>" +
          '<span class="stats-bar__source">' + Vite.escapeHtml(sourceLabel(game.source)) + "</span></div>" +
          "</div>";
      }).join("");
    }

    var feed = Array.isArray(data.recent) ? data.recent : [];
    if (!feed.length) {
      recent.innerHTML = '<li class="account-empty" role="status">No recent public activity.</li>';
    } else {
      recent.innerHTML = feed.map(function (item) {
        var name = item.display_name || item.username || "Player";
        var initial = Vite.escapeHtml(Vite.initials(name));
        var color = Vite.escapeHtml(Vite.avatarColor(item.username || name));
        var label = item.game_name || "a game";
        return '<li class="stats-recent__item">' +
          '<span class="stats-recent__avatar" style="background:' + color + '">' + initial + "</span>" +
          '<div><div class="stats-recent__name"><a href="profile.html?u=' + encodeURIComponent(item.username || "") + '">' +
          Vite.escapeHtml(name) + "</a><span>@" + Vite.escapeHtml(item.username || "") + "</span></div>" +
          '<div class="stats-recent__game">' + Vite.escapeHtml(label) +
          " <em>· " + Vite.escapeHtml(sourceLabel(item.source)) + "</em></div></div></li>";
      }).join("");
    }
  }

  function failure(error) {
    players.textContent = "—";
    hours.textContent = "—";
    games.textContent = "—";
    bars.innerHTML = '<div class="stats-empty"><strong>Stats are taking a break</strong><span>' +
      Vite.escapeHtml(error && error.message ? error.message : "Could not load the public stats.") +
      "</span></div>";
    recent.innerHTML = '<li class="account-empty" role="status">Public activity is unavailable right now.</li>';
  }

  Vite.api("activity-stats", {}, false)
    .then(function (data) { render(data || {}); })
    .catch(failure);
})();
