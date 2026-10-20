/* Vite account portal: overview, messages, friends, profile, settings. */
(function () {
  "use strict";

  var A = window.ViteAccount;
  if (!A) return;
  var $ = function (id) { return document.getElementById(id); };
  var esc = A.escapeHtml;

  var state = {
    account: null,
    friends: [],
    conversations: [],
    activeFriendId: null,
    thread: [],
    threadFriend: null,
    panel: "overview",
    authMode: "login",
    loadingThread: false,
    threadSeq: 0,
    sending: false,
    timers: []
  };

  function avatar(account, className) {
    var span = document.createElement("span");
    span.className = className || "portal-avatar";
    span.style.background = A.avatarColor(account.username || account.display_name);
    span.textContent = A.initials(account.display_name || account.username);
    return span.outerHTML;
  }

  function presence(account) {
    var label = A.presenceLabel(account && account.presence);
    return label
      ? '<span class="portal-presence">' + esc(label) + "</span>"
      : '<span class="portal-presence portal-presence--offline">Friend</span>';
  }

  function showAuth(mode) {
    $("portal-loading").hidden = true;
    $("portal-app").hidden = true;
    $("portal-auth").hidden = false;
    setAuthMode(mode || state.authMode);
  }

  function showApp() {
    $("portal-loading").hidden = true;
    $("portal-auth").hidden = true;
    $("portal-app").hidden = false;
  }

  function setAuthMode(mode) {
    state.authMode = mode;
    var signup = mode === "signup";
    document.querySelectorAll("[data-auth-mode]").forEach(function (button) {
      button.setAttribute("aria-selected", String(button.dataset.authMode === mode));
    });
    $("portal-display-field").hidden = !signup;
    $("portal-auth-submit").textContent = signup ? "Create account" : "Sign in";
    $("portal-password").setAttribute("autocomplete", signup ? "new-password" : "current-password");
    $("portal-auth-error").hidden = true;
  }

  function authError(message) {
    var error = $("portal-auth-error");
    error.textContent = message;
    error.hidden = false;
  }

  async function submitAuth(event) {
    event.preventDefault();
    var button = $("portal-auth-submit");
    button.disabled = true;
    var username = $("portal-username").value.trim();
    var password = $("portal-password").value;
    var display = $("portal-display-name").value.trim();
    try {
      var result = state.authMode === "signup"
        ? await A.api("signup", { username: username, display_name: display, password: password })
        : await A.api("login", { username: username, password: password });
      A.setToken(result.token);
      await boot();
    } catch (error) {
      authError(error.message || "Could not sign in.");
    } finally {
      button.disabled = false;
    }
  }

  function startTimers() {
    stopTimers();
    state.timers.push(setInterval(function () {
      if (state.panel === "messages") loadConversations(false);
    }, 5000));
    state.timers.push(setInterval(function () {
      if (state.panel === "messages" && state.activeFriendId && !state.loadingThread) refreshThread(true);
    }, 3000));
    state.timers.push(setInterval(function () {
      if (state.panel === "messages") loadConversations(false);
    }, 20000));
  }

  function stopTimers() {
    state.timers.forEach(clearInterval);
    state.timers = [];
  }

  async function boot() {
    if (!A.token()) {
      showAuth("login");
      return;
    }
    try {
      var session = await A.api("me", {}, true);
      state.account = session.account;
      state.friends = session.friends || [];
      showApp();
      renderIdentity();
      renderOverview();
      renderFriends();
      renderProfile();
      renderSettings();
      startTimers();
      window.dispatchEvent(new CustomEvent("vite:account", { detail: session }));
      await loadConversations(false);
    } catch (error) {
      if (error.status === 401 || error.status === 404) {
        A.setToken(null);
        showAuth("login");
      } else {
        $("portal-loading").hidden = true;
        $("portal-auth").hidden = false;
        $("portal-app").hidden = true;
        setAuthMode("login");
        authError("The account service is unreachable. Try again in a moment.");
      }
    }
  }

  function switchPanel(panel) {
    state.panel = panel;
    document.querySelectorAll("[data-panel-view]").forEach(function (view) {
      view.hidden = view.dataset.panelView !== panel;
    });
    document.querySelectorAll("[data-panel]").forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.panel === panel);
    });
    if (panel === "messages") loadConversations(true);
    if (panel === "friends") renderFriends();
    if (panel === "settings") renderSettings();
    if (panel === "profile") renderProfile();
  }

  function renderIdentity() {
    var account = state.account;
    $("portal-identity").innerHTML =
      '<div class="portal-identity__top">' + avatar(account) +
        '<div><strong>' + esc(account.display_name) + "</strong>" +
        "<span>@" + esc(account.username) + "</span></div></div>" +
      '<div class="portal-identity__status">' + presence(account) + "</div>" +
      '<a class="portal-identity__profile" href="profile.html?u=' + encodeURIComponent(account.username) + '">View public profile ↗</a>';
    $("portal-friend-count").textContent = String(state.friends.length);
  }

  function renderOverview() {
    var account = state.account;
    var publicLabel = account.profile_public ? "Public profile" : "Private profile";
    $("portal-overview-state").textContent = publicLabel;
    $("portal-overview").innerHTML =
      '<article class="portal-overview__profile">' +
        '<div class="portal-overview__avatar">' + avatar(account, "portal-avatar portal-avatar--large") + "</div>" +
        '<div class="portal-overview__copy"><span class="account-eyebrow">Signed in</span>' +
          "<h2>" + esc(account.display_name) + "</h2>" +
          '<p class="portal-muted">@' + esc(account.username) + " · joined " + esc(A.isoDate(account.created_at)) + "</p>" +
          '<p class="portal-bio">' + (account.bio ? esc(account.bio) : "Add a short bio from Settings.") + "</p></div>" +
      "</article>" +
      '<div class="portal-overview__grid">' +
        '<button type="button" class="portal-card" data-open-panel="messages"><span class="portal-card__k">Messages</span><strong>' +
          (state.conversations.reduce(function (sum, row) { return sum + (row.unread_count || 0); }, 0) || "Chat") +
          "</strong><span>Talk to friends</span></button>" +
        '<button type="button" class="portal-card" data-open-panel="friends"><span class="portal-card__k">Friends</span><strong>' +
          state.friends.length + "</strong><span>Your circle</span></button>" +
        '<button type="button" class="portal-card" data-open-panel="profile"><span class="portal-card__k">Profile</span><strong>' +
          esc(publicLabel) + "</strong><span>" + (account.profile_public ? "Visible to anyone with the link" : "Friends only") + "</span></button>" +
        '<button type="button" class="portal-card" data-open-panel="settings"><span class="portal-card__k">Settings</span><strong>Account</strong><span>Name, bio, visibility</span></button>' +
      "</div>" +
      '<div class="portal-code"><span class="portal-card__k">Your friend code</span><code>' + esc(account.friend_code) + "</code>" +
        '<button type="button" class="portal-copy" data-copy="' + esc(account.friend_code) + '">Copy</button></div>';
  }

  function friendRow(friend) {
    return '<article class="portal-friend">' +
      '<div class="portal-friend__identity">' + avatar(friend, "portal-avatar portal-avatar--small") +
        '<div><strong>' + esc(friend.display_name) + "</strong><span>@" + esc(friend.username) + "</span>" + presence(friend) + "</div></div>" +
      '<div class="portal-friend__actions">' +
        '<button type="button" data-message-friend="' + esc(friend.id) + '">Message</button>' +
        '<a href="profile.html?u=' + encodeURIComponent(friend.username) + '">Profile</a>' +
        '<button type="button" class="portal-danger" data-remove-friend="' + esc(friend.id) + '">Remove</button>' +
      "</div></article>";
  }

  function renderFriends() {
    var list = state.friends.length
      ? state.friends.map(friendRow).join("")
      : '<div class="portal-empty"><strong>No friends yet.</strong><p>Share your friend code, then add theirs.</p></div>';
    $("portal-friends").innerHTML =
      '<div class="portal-friends__list">' + list + "</div>" +
      '<form class="portal-add" id="portal-add-form"><label class="portal-field"><span>Add a friend</span>' +
        '<input id="portal-add-code" maxlength="8" placeholder="8-character friend code" autocomplete="off"></label>' +
        '<button class="portal-primary" type="submit">Add friend</button>' +
        '<p class="portal-form-error" id="portal-add-error" role="alert" hidden></p></form>';
    $("portal-add-form").addEventListener("submit", addFriend);
  }

  async function addFriend(event) {
    event.preventDefault();
    var code = $("portal-add-code").value.trim().toUpperCase();
    var error = $("portal-add-error");
    if (!code) return;
    try {
      await A.api("friends-add", { code: code }, true);
      await refreshAccount();
      renderFriends();
      renderIdentity();
      renderOverview();
    } catch (err) {
      error.textContent = err.message || "Could not add that friend code.";
      error.hidden = false;
    }
  }

  async function removeFriend(id) {
    try {
      await A.api("friends-remove", { friend_id: id }, true);
      state.friends = state.friends.filter(function (friend) { return friend.id !== id; });
      if (state.activeFriendId === id) {
        state.activeFriendId = null;
        state.thread = [];
        state.threadFriend = null;
      }
      renderFriends();
      renderIdentity();
      renderOverview();
      loadConversations(false);
    } catch (error) {
      /* the list will reconcile on the next refresh */
    }
  }

  async function refreshAccount() {
    var session = await A.api("me", {}, true);
    state.account = session.account;
    state.friends = session.friends || [];
  }

  async function loadConversations(render) {
    try {
      var data = await A.api("conversations", {}, true);
      state.conversations = data.conversations || [];
      var unread = state.conversations.reduce(function (sum, row) { return sum + (row.unread_count || 0); }, 0);
      var badge = $("portal-unread");
      badge.textContent = String(unread);
      badge.hidden = unread === 0;
      if (render || state.panel === "messages") renderThreads();
      if (!state.activeFriendId && state.conversations.length) {
        openThread(state.conversations[0].account);
      }
    } catch (error) {
      if (error.status === 401) A.setToken(null);
    }
  }

  function renderThreads() {
    var rows = state.conversations.length
      ? state.conversations.map(function (row) {
          var active = row.account.id === state.activeFriendId;
          var last = row.last_message;
          return '<button type="button" class="portal-thread' + (active ? " is-active" : "") + '" data-thread="' + esc(row.account.id) + '">' +
            avatar(row.account, "portal-avatar portal-avatar--small") +
            '<span class="portal-thread__copy"><strong>' + esc(row.account.display_name) + "</strong>" +
              "<span>" + (last ? esc(last.body) : "Start the conversation") + "</span></span>" +
            '<span class="portal-thread__meta">' + (last ? esc(fmtTime(last.created_at)) : "") +
              (row.unread_count ? '<b class="portal-unread">' + row.unread_count + "</b>" : "") + "</span></button>";
        }).join("")
      : '<div class="portal-empty"><strong>No conversations yet.</strong><p>Add a friend to start chatting.</p></div>';
    $("portal-threads").innerHTML = rows;
    $("portal-message-meta").textContent = state.conversations.length + " friend" + (state.conversations.length === 1 ? "" : "s");
  }

  function fmtTime(seconds) {
    if (!seconds) return "";
    return new Date(seconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function fmtDay(seconds) {
    return new Date(seconds * 1000).toLocaleDateString([], { month: "short", day: "numeric" });
  }

  function renderChat() {
    var container = $("portal-chat");
    if (!state.activeFriendId) {
      container.innerHTML = '<div class="portal-empty"><strong>Pick a friend.</strong><p>Messages live here.</p></div>';
      return;
    }
    var friend = state.threadFriend || state.friends.find(function (row) { return row.id === state.activeFriendId; });
    if (!friend) {
      container.innerHTML = '<div class="portal-empty"><strong>Friend unavailable.</strong></div>';
      return;
    }
    var messages = state.thread.length
      ? state.thread.map(function (message, index) {
          var mine = message.sender_id === state.account.id;
          var previous = state.thread[index - 1];
          var showDay = !previous || fmtDay(previous.created_at) !== fmtDay(message.created_at);
          return (showDay ? '<div class="portal-chat__day">' + esc(fmtDay(message.created_at)) + "</div>" : "") +
            '<div class="portal-bubble' + (mine ? " is-mine" : "") + '"><p>' + esc(message.body) + "</p>" +
            '<span class="portal-bubble__time">' + esc(fmtTime(message.created_at)) + "</span></div>";
        }).join("")
      : '<div class="portal-empty portal-empty--chat"><strong>No messages yet.</strong><p>Say hello to ' + esc(friend.display_name) + ".</p></div>";
    container.innerHTML =
      '<header class="portal-chat__head">' + avatar(friend, "portal-avatar portal-avatar--small") +
        '<div><strong>' + esc(friend.display_name) + "</strong><span>@" + esc(friend.username) + "</span></div>" +
        '<a href="profile.html?u=' + encodeURIComponent(friend.username) + '">Profile ↗</a></header>' +
      '<div class="portal-chat__messages" id="portal-message-list">' + messages + "</div>" +
      '<form class="portal-compose" id="portal-compose">' +
        '<textarea id="portal-message-input" maxlength="2000" rows="1" placeholder="Message ' + esc(friend.display_name) + '"></textarea>' +
        '<button class="portal-primary" type="submit">Send</button></form>' +
      '<p class="portal-form-error" id="portal-send-error" role="alert" hidden></p>';
    $("portal-compose").addEventListener("submit", sendMessage);
    var list = $("portal-message-list");
    list.scrollTop = list.scrollHeight;
  }

  async function openThread(account) {
    state.activeFriendId = account.id;
    state.threadFriend = account;
    state.thread = [];
    renderThreads();
    renderChat();
    await refreshThread(false);
  }

  async function refreshThread(silent, force) {
    if (!state.activeFriendId) return;
    if (state.loadingThread && !force) return;
    var friendId = state.activeFriendId;
    var request = ++state.threadSeq;
    state.loadingThread = true;
    try {
      var data = await A.api("messages", { friend_id: friendId }, true);
      if (state.activeFriendId !== friendId || state.threadSeq !== request) return;
      state.thread = data.messages || [];
      if (data.friend) state.threadFriend = data.friend;
      if (state.panel === "messages") renderChat();
      loadConversations(false);
    } catch (error) {
      if (!silent && state.activeFriendId === friendId) {
        var container = $("portal-chat");
        if (container) container.innerHTML = '<div class="portal-empty"><strong>Could not load this conversation.</strong><p>' + esc(error.message) + "</p></div>";
      }
    } finally {
      if (state.threadSeq === request) state.loadingThread = false;
    }
  }

  async function sendMessage(event) {
    event.preventDefault();
    if (state.sending || !state.activeFriendId) return;
    var input = $("portal-message-input");
    var body = input.value.trim();
    if (!body) return;
    state.sending = true;
    input.disabled = true;
    try {
      await A.api("message-send", { friend_id: state.activeFriendId, body: body }, true);
      input.value = "";
      await refreshThread(false, true);
      await loadConversations(false);
    } catch (error) {
      var errorEl = $("portal-send-error");
      errorEl.textContent = error.message || "Could not send.";
      errorEl.hidden = false;
    } finally {
      state.sending = false;
      input.disabled = false;
      input.focus();
    }
  }

  function renderProfile() {
    var account = state.account;
    var url = "profile.html?u=" + encodeURIComponent(account.username);
    $("portal-profile-badge").textContent = account.profile_public ? "Public profile" : "Private profile";
    $("portal-profile").innerHTML =
      '<article class="portal-public-card">' +
        '<div class="portal-public-card__top">' + avatar(account, "portal-avatar portal-avatar--large") +
          '<div><span class="account-eyebrow">Public player profile</span><h2>' + esc(account.display_name) + "</h2>" +
          '<p>@' + esc(account.username) + "</p>" + presence(account) + "</div></div>" +
        '<p class="portal-bio">' + (account.bio ? esc(account.bio) : "No bio yet.") + "</p>" +
        '<div class="portal-profile__stats"><div><span>Friends</span><strong>' + state.friends.length + "</strong></div>" +
          "<div><span>Joined</span><strong>" + esc(A.isoDate(account.created_at)) + "</strong></div>" +
          "<div><span>Visibility</span><strong>" + (account.profile_public ? "Public" : "Private") + "</strong></div></div>" +
      "</article>" +
      '<div class="portal-profile__actions">' +
        '<a class="portal-primary" href="' + url + '">Open public profile</a>' +
        '<button type="button" class="portal-secondary" data-copy-link="' + esc(url) + '">Copy profile link</button>' +
        (account.profile_public ? "" : '<p class="portal-muted">Private profiles are only visible to you.</p>') +
      "</div>";
  }

  function renderSettings() {
    var account = state.account;
    $("portal-settings").innerHTML =
      '<article class="portal-settings__card"><header><h2>Profile settings</h2><span class="account-badge">Live</span></header>' +
        '<form id="portal-settings-form">' +
          '<label class="portal-field"><span>Display name</span><input id="portal-setting-name" maxlength="40" value="' + esc(account.display_name) + '"></label>' +
          '<label class="portal-field"><span>Bio</span><textarea id="portal-setting-bio" maxlength="160" rows="3" placeholder="A line about you">' + esc(account.bio || "") + "</textarea>" +
            '<small>Up to 160 characters. Shown on your public profile.</small></label>' +
          '<label class="portal-check"><input type="checkbox" id="portal-setting-public"' + (account.profile_public ? " checked" : "") + "> <span>Show my profile at " + esc("profile.html?u=" + account.username) + "</span></label>" +
          '<label class="portal-check"><input type="checkbox" id="portal-setting-activity"' + (account.activity_public ? " checked" : "") + "> <span>Share aggregate playtime on my profile and the public stats page</span></label>" +
          '<p class="portal-muted">Playtime sharing uploads game names, sources, and hours from the desktop app. Your library files and paths stay on your PC.</p>' +
          '<p class="portal-form-error" id="portal-settings-error" role="alert" hidden></p>' +
          '<p class="portal-form-ok" id="portal-settings-ok" role="status" hidden>Profile saved.</p>' +
          '<button class="portal-primary" type="submit">Save changes</button></form></article>' +
      '<article class="portal-settings__card portal-settings__details"><header><h2>Details</h2><span class="account-badge">Signed in</span></header>' +
        '<dl><div><dt>Username</dt><dd>@' + esc(account.username) + "</dd></div>" +
        "<div><dt>Friend code</dt><dd>" + esc(account.friend_code) + ' <button type="button" class="portal-copy" data-copy="' + esc(account.friend_code) + '">Copy</button></dd></div>' +
        "<div><dt>Friends</dt><dd>" + state.friends.length + "</dd></div>" +
        "<div><dt>Joined</dt><dd>" + esc(A.isoDate(account.created_at)) + "</dd></div></dl>" +
        '<button type="button" class="portal-secondary" id="portal-settings-signout">Sign out</button></article>';
    $("portal-settings-form").addEventListener("submit", saveSettings);
    $("portal-settings-signout").addEventListener("click", signOut);
  }

  async function saveSettings(event) {
    event.preventDefault();
    var error = $("portal-settings-error");
    var ok = $("portal-settings-ok");
    error.hidden = true;
    ok.hidden = true;
    try {
      var result = await A.api("account-settings-update", {
        display_name: $("portal-setting-name").value.trim(),
        bio: $("portal-setting-bio").value.trim(),
        profile_public: $("portal-setting-public").checked,
        activity_public: $("portal-setting-activity").checked
      }, true);
      if (result.account) state.account = result.account;
      else await refreshAccount();
      renderIdentity();
      renderOverview();
      renderProfile();
      renderSettings();
      var saved = $("portal-settings-ok");
      if (saved) saved.hidden = false;
    } catch (err) {
      error.textContent = err.message || "Could not save.";
      error.hidden = false;
    }
  }

  async function signOut() {
    try { await A.api("logout", {}, true); } catch (_) { /* clear locally anyway */ }
    A.setToken(null);
    window.location.href = "index.html";
  }

  function copyText(value, button) {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(value).then(function () {
      if (!button) return;
      var previous = button.textContent;
      button.textContent = "Copied";
      setTimeout(function () { button.textContent = previous; }, 1200);
    });
  }

  document.addEventListener("click", function (event) {
    var panelButton = event.target.closest("[data-open-panel]");
    if (panelButton) {
      switchPanel(panelButton.dataset.openPanel);
      return;
    }
    var threadButton = event.target.closest("[data-thread]");
    if (threadButton) {
      var row = state.conversations.find(function (item) { return item.account.id === threadButton.dataset.thread; });
      if (row) openThread(row.account);
      return;
    }
    var messageFriend = event.target.closest("[data-message-friend]");
    if (messageFriend) {
      var friend = state.friends.find(function (item) { return item.id === messageFriend.dataset.messageFriend; });
      if (friend) {
        switchPanel("messages");
        openThread(friend);
      }
      return;
    }
    var removeButton = event.target.closest("[data-remove-friend]");
    if (removeButton) {
      removeFriend(removeButton.dataset.removeFriend);
      return;
    }
    var copyButton = event.target.closest("[data-copy]");
    if (copyButton) {
      copyText(copyButton.dataset.copy, copyButton);
      return;
    }
    var copyLink = event.target.closest("[data-copy-link]");
    if (copyLink) {
      copyText(new URL(copyLink.dataset.copyLink, window.location.href).href, copyLink);
      return;
    }
    var panel = event.target.closest("[data-panel]");
    if (panel) switchPanel(panel.dataset.panel);
  });

  document.querySelectorAll("[data-auth-mode]").forEach(function (button) {
    button.addEventListener("click", function () { setAuthMode(button.dataset.authMode); });
  });
  $("portal-auth-form").addEventListener("submit", submitAuth);
  $("portal-signout").addEventListener("click", signOut);

  boot();
})();
