(function () {
  "use strict";

  var Vite = window.ViteAccount;
  var bars = document.getElementById("stats-bars");
  var insights = document.getElementById("stats-insights");
  var signedOut = document.getElementById("stats-signed-out");
  var dashboard = document.getElementById("stats-dashboard");
  var lede = document.getElementById("stats-lede");
  var hours = document.getElementById("stat-hours");
  var gamesCount = document.getElementById("stat-games");
  var topGame = document.getElementById("stat-top");
  var topShare = document.getElementById("stat-top-share");
  var lastGame = document.getElementById("stat-last");
  var lastHint = document.getElementById("stat-last-hint");
  var shareRing = document.getElementById("stats-share-ring");
  var shareValue = document.getElementById("stats-share-value");
  if (!Vite || !bars || !insights || !signedOut || !dashboard) return;

  function number(value) {
    var n = Number(value);
    if (!Number.isFinite(n) || n < 0) return 0;
    return n;
  }

  function fmtHours(seconds) {
    var value = number(seconds) / 3600;
    if (value >= 1000) return Math.round(value).toLocaleString();
    if (value >= 100) return value.toFixed(0);
    return value.toFixed(1).replace(/\.0$/, "");
  }

  function pct(part, total) {
    if (!total) return 0;
    return Math.round((part / total) * 100);
  }

  function sourceLabel(source) {
    return { steam: "Steam", epic: "Epic", gog: "GOG" }[source] || "Store";
  }

  function fmtDate(seconds) {
    if (!seconds) return "Unknown";
    return new Date(seconds * 1000).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }

  function showSignedOut() {
    signedOut.hidden = false;
    dashboard.hidden = true;
    lede.textContent = "Your own shared playtime, tied to your Vite account. Sign in to see your hours, top games, and patterns.";
  }

  function showDashboard(data) {
    signedOut.hidden = true;
    dashboard.hidden = false;

    var games = (Array.isArray(data.games) ? data.games : []).slice().sort(function (a, b) {
      return number(b.seconds) - number(a.seconds);
    });
    var total = number(data.total_seconds) || games.reduce(function (sum, game) {
      return sum + number(game.seconds);
    }, 0);
    var top = games[0] || null;
    var last = games.slice().sort(function (a, b) {
      return number(b.last_played_at) - number(a.last_played_at);
    })[0] || null;

    hours.textContent = fmtHours(total) + " h";
    gamesCount.textContent = String(games.length);
    topGame.textContent = top ? top.name : "—";
    lastGame.textContent = last ? last.name : "—";
    lastHint.textContent = last ? "played " + fmtDate(last.last_played_at) : "no shared activity yet";
    var topPercent = top ? pct(number(top.seconds), total) : 0;
    topShare.textContent = top ? topPercent + "% of tracked hours" : "your heaviest rotation";

    if (!games.length) {
      bars.innerHTML = '<div class="stats-empty"><strong>No shared playtime yet</strong><span>Open Vite with playtime sharing on and the launcher will sync your games here.</span></div>';
      insights.innerHTML = '<li class="account-empty" role="status">Insights appear after the first playtime sync.</li>';
      shareRing.style.setProperty("--share", "0deg");
      shareValue.textContent = "0%";
      return;
    }

    var max = games.reduce(function (value, game) {
      return Math.max(value, number(game.seconds));
    }, 1);
    bars.innerHTML = games.slice(0, 12).map(function (game) {
      var width = Math.max(2, Math.round((number(game.seconds) / max) * 100));
      var share = pct(number(game.seconds), total);
      var name = Vite.escapeHtml(game.name || "Unknown game");
      return '<div class="stats-bar" role="listitem">' +
        '<div class="stats-bar__name"><span>' + name + "</span></div>" +
        '<div class="stats-bar__track" aria-hidden="true"><span class="stats-bar__fill" style="width:' + width + '%"></span></div>' +
        '<div class="stats-bar__meta"><strong>' + fmtHours(game.seconds) + " h</strong>" +
        "<span>" + share + "% of yours</span>" +
        '<span class="stats-bar__source">' + Vite.escapeHtml(sourceLabel(game.source)) + "</span></div>" +
        "</div>";
    }).join("");

    shareRing.style.setProperty("--share", (topPercent * 3.6) + "deg");
    shareValue.textContent = topPercent + "%";

    var topThree = games.slice(0, 3).reduce(function (sum, game) {
      return sum + number(game.seconds);
    }, 0);
    var average = total / games.length;
    var storeTotals = {};
    games.forEach(function (game) {
      var key = sourceLabel(game.source);
      storeTotals[key] = (storeTotals[key] || 0) + number(game.seconds);
    });
    var topStore = Object.keys(storeTotals).sort(function (a, b) {
      return storeTotals[b] - storeTotals[a];
    })[0] || "Steam";
    var recentDays = last && last.last_played_at
      ? Math.max(0, Math.floor((Date.now() / 1000 - number(last.last_played_at)) / 86400))
      : null;

    var items = [
      ["01", top.name + " leads your library",
        "It accounts for " + topPercent + "% of your " + fmtHours(total) + " tracked hours."],
      ["02", "Your top three carry the week",
        "Your three biggest games make up " + pct(topThree, total) + "% of all tracked hours."],
      ["03", "You average " + fmtHours(average) + " h per game",
        "Across " + games.length + " game" + (games.length === 1 ? "" : "s") + " with shared playtime."],
      ["04", topStore + " is your home store",
        "It represents " + pct(storeTotals[topStore], total) + "% of the hours in this stats set."],
      ["05", "Most recent: " + last.name,
        recentDays === 0 ? "Synced today from the launcher." : (recentDays === 1 ? "Last shared activity was yesterday." : "Last shared activity was " + recentDays + " days ago.")]
    ];

    insights.innerHTML = items.map(function (item) {
      return '<li class="stats-insight">' +
        '<span class="stats-insight__num">' + item[0] + "</span>" +
        '<div><strong class="stats-insight__title">' + Vite.escapeHtml(item[1]) + "</strong>" +
        '<p class="stats-insight__copy">' + Vite.escapeHtml(item[2]) + "</p></div>" +
        "</li>";
    }).join("");
  }

  function failure(error) {
    if (error && error.status === 401) {
      Vite.setToken(null);
      showSignedOut();
      return;
    }
    showSignedOut();
    lede.textContent = error && error.message
      ? error.message
      : "Your stats are unavailable right now. Try again in a moment.";
  }

  if (!Vite.token()) {
    showSignedOut();
    return;
  }

  Vite.api("activity-self", {}, true)
    .then(function (data) { showDashboard(data || {}); })
    .catch(failure);
})();
