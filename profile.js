(function () {
  "use strict";

  var account = window.ViteAccount;
  var body = document.getElementById("profile-body");
  var badge = document.getElementById("profile-badge");
  var title = document.getElementById("profile-title");
  var username = new URLSearchParams(location.search).get("u") || "";

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function showSearch(message) {
    badge.textContent = "Profile";
    title.textContent = "Find a player.";
    body.replaceChildren();
    if (message) {
      body.appendChild(element("p", "account-status is-error", message));
    }
    body.appendChild(element("p", "account-note", "Enter the exact username of a Vite player. Profiles are private by default unless the player makes them public."));
    var form = element("form", "account-form");
    var field = element("label", "account-field");
    field.appendChild(element("span", null, "Username"));
    var input = document.createElement("input");
    input.name = "username";
    input.maxLength = 32;
    input.required = true;
    input.placeholder = "player_name";
    input.autocomplete = "off";
    field.appendChild(input);
    form.appendChild(field);
    var button = element("button", "btn-account btn-account--lime", "View profile");
    button.type = "submit";
    form.appendChild(button);
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var value = input.value.trim().toLowerCase();
      if (value) location.href = "profile.html?u=" + encodeURIComponent(value);
    });
    body.appendChild(form);
  }

  function renderProfile(payload) {
    var profile = payload.account;
    var self = payload.is_self;
    badge.textContent = self ? "Your profile" : "Public profile";
    badge.classList.toggle("is-live", Boolean(profile.presence));
    title.textContent = (profile.display_name || profile.username) + ".";
    body.replaceChildren();

    var hero = element("div", "profile-hero");
    var avatar = element("div", "profile-avatar", account.initials(profile.display_name));
    avatar.style.background = account.avatarColor(profile.username);
    hero.appendChild(avatar);
    var identity = element("div");
    identity.appendChild(element("h2", "profile-name", profile.display_name || profile.username));
    identity.appendChild(element("p", "profile-handle", "@" + profile.username));
    if (profile.presence && profile.presence.game_name) {
      identity.appendChild(element("span", "profile-presence", "Playing " + profile.presence.game_name));
    }
    hero.appendChild(identity);
    body.appendChild(hero);

    var bio = element("p", "profile-bio" + (profile.bio ? "" : " is-empty"), profile.bio || "This player has not written a bio yet.");
    body.appendChild(bio);

    var games = Array.isArray(profile.games) ? profile.games : [];
    if (profile.activity_public && games.length) {
      var totalSeconds = games.reduce(function (sum, game) {
        return sum + Number(game.seconds || 0);
      }, 0);
      var topGame = games.slice().sort(function (a, b) {
        return Number(b.seconds || 0) - Number(a.seconds || 0);
      })[0];
      var stats = element("div", "profile-stats");
      [
        ["Hours shared", (totalSeconds / 3600).toFixed(1).replace(/\.0$/, "") + " h"],
        ["Games tracked", String(games.length)],
        ["Top game", topGame ? (topGame.name || "Unknown game") : "—"]
      ].forEach(function (row) {
        var cell = element("div", "profile-stat");
        cell.appendChild(element("span", "profile-stat__k", row[0]));
        cell.appendChild(element("strong", "profile-stat__v", row[1]));
        stats.appendChild(cell);
      });
      body.appendChild(stats);
    }

    var meta = element("div", "account-meta");
    var rows = [
      ["Friends", String(profile.friend_count || 0)],
      ["Joined", account.isoDate(profile.created_at) || "Unknown"],
      ["Presence", profile.presence && profile.presence.game_name ? "Playing " + profile.presence.game_name : "Not in a game"],
    ];
    rows.forEach(function (row) {
      var line = element("div", "account-meta__row");
      line.appendChild(element("span", "account-meta__k", row[0]));
      line.appendChild(element("span", "account-meta__v", row[1]));
      meta.appendChild(line);
    });
    body.appendChild(meta);

    if (profile.activity_public) {
      var panel = element("div", "profile-games");
      panel.appendChild(element("h3", "profile-games__title", "Games"));
      if (!games.length) {
        panel.appendChild(element("p", "account-note", "Playtime sharing is on, but no games have synced yet. Open Vite with a game once to publish hours."));
      } else {
        var list = element("ul", "profile-games__list");
        games.forEach(function (game) {
          var item = element("li", "profile-games__item");
          item.appendChild(element("span", "profile-games__name", game.name || "Unknown game"));
          var metaLine = element("span", "profile-games__meta",
            (game.source === "epic" ? "Epic" : game.source === "gog" ? "GOG" : "Steam") +
            " · " + (Number(game.seconds || 0) / 3600).toFixed(1).replace(/\.0$/, "") + " h");
          item.appendChild(metaLine);
          list.appendChild(item);
        });
        panel.appendChild(list);
      }
      body.appendChild(panel);
    } else {
      body.appendChild(element("p", "account-note profile-games__off",
        "This player has not shared playtime."));
    }

    var actions = element("div", "account-actions");
    if (self) {
      var settings = element("a", "btn-account btn-account--lime", "Edit profile");
      settings.href = "settings.html";
      actions.appendChild(settings);
    }
    var share = element("button", "btn-account", "Copy profile link");
    share.type = "button";
    share.addEventListener("click", async function () {
      try {
        await navigator.clipboard.writeText(location.href);
        share.textContent = "Link copied";
      } catch (_) {
        share.textContent = "Copy failed";
      }
    });
    actions.appendChild(share);
    var back = element("a", "btn-account", "Back to Vite");
    back.href = "index.html#accounts";
    actions.appendChild(back);
    body.appendChild(actions);
  }

  if (!username) {
    showSearch(null);
    return;
  }

  account.api("profile", { username: username }, Boolean(account.token()))
    .then(renderProfile)
    .catch(function (error) {
      var message = error.status === 404 ? "That profile is private or does not exist." : error.message;
      showSearch(message);
    });
})();
