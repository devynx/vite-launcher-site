/* VITE — site behaviour: sticky nav state, mobile menu, scroll reveal, active nav link. */
(function () {
  "use strict";

  var nav = document.querySelector("[data-nav]");
  var toggle = document.querySelector("[data-nav-toggle]");
  var menu = document.getElementById("mobile-menu");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* Sticky nav gets a firmer background once the page scrolls. */
  function onScroll() {
    if (nav) nav.classList.toggle("is-scrolled", window.scrollY > 12);
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* Mobile menu. */
  function setMenu(open) {
    if (!nav || !toggle || !menu) return;
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    menu.hidden = !open;
  }

  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      setMenu(toggle.getAttribute("aria-expanded") !== "true");
    });

    menu.addEventListener("click", function (event) {
      if (event.target.closest("a")) setMenu(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !menu.hidden) {
        setMenu(false);
        toggle.focus();
      }
    });

    document.addEventListener("click", function (event) {
      if (menu.hidden) return;
      if (!nav.contains(event.target)) setMenu(false);
    });

    /* Drop the open menu if the viewport grows past the mobile breakpoint. */
    var desktop = window.matchMedia("(min-width: 920px)");
    var onDesktop = function (event) { if (event.matches) setMenu(false); };
    if (desktop.addEventListener) desktop.addEventListener("change", onDesktop);
    else desktop.addListener(onDesktop);
  }

  /* Scroll reveal. */
  var revealItems = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  var supportsObserver = "IntersectionObserver" in window;

  if (!supportsObserver || reduceMotion.matches) {
    revealItems.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    revealItems.forEach(function (el) { revealObserver.observe(el); });
  }

  /* Active section in the nav. */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll("[data-navlink]"));
  var sections = navLinks
    .map(function (link) { return document.querySelector(link.getAttribute("href")); })
    .filter(Boolean);

  if (supportsObserver && sections.length) {
    var sectionObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          navLinks.forEach(function (link) {
            link.classList.toggle("is-active", link.getAttribute("href") === "#" + entry.target.id);
          });
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach(function (section) { sectionObserver.observe(section); });
  }
})();

/* VITE — online accounts and friends. Talks only to the Vite account service. */
(function () {
  "use strict";

  var SERVICE = "https://iljiovhwkrtfuvmhcfhn.supabase.co/functions/v1/vite-auth";
  var API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlsamlvdmh3a3J0ZnV2bWhjZmhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0MjYwNDQsImV4cCI6MjEwODAwMjA0NH0.G_mI-ZoyTnYRhKDln6xkgZc9SvYQi-Q6CyXVz9nJqco";
  var TOKEN_KEY = "vite.account.token";
  var root = document.getElementById("account-root");
  if (!root) return;

  var signedOut = document.getElementById("account-signed-out");
  var signedIn = document.getElementById("account-signed-in");
  var badge = document.getElementById("account-badge");
  var form = document.getElementById("account-form");
  var username = document.getElementById("account-username");
  var displayField = document.getElementById("account-display-field");
  var display = document.getElementById("account-display");
  var password = document.getElementById("account-password");
  var submit = document.getElementById("account-submit");
  var status = document.getElementById("account-status");
  var statusIn = document.getElementById("account-status-in");
  var name = document.getElementById("account-name");
  var handle = document.getElementById("account-handle");
  var code = document.getElementById("account-code");
  var profileLink = document.getElementById("account-profile-link");
  var signout = document.getElementById("account-signout");
  var friendForm = document.getElementById("friend-add-form");
  var friendInput = document.getElementById("friend-code-input");
  var friendButton = document.getElementById("friend-add-button");
  var friendList = document.getElementById("friend-list");
  var friendCount = document.getElementById("friend-count");
  var tabs = Array.prototype.slice.call(root.querySelectorAll("[data-auth-mode]"));
  var mode = "login";
  var token = localStorage.getItem(TOKEN_KEY);

  function setBusy(busy) {
    if (submit) submit.disabled = busy;
    if (friendButton) friendButton.disabled = busy || !token;
    if (friendInput) friendInput.disabled = busy || !token;
  }

  function setStatus(node, message, kind) {
    if (!node) return;
    node.textContent = message || "";
    node.className = "account-status" + (kind ? " is-" + kind : "");
  }

  function setMode(next) {
    mode = next;
    tabs.forEach(function (tab) {
      var active = tab.getAttribute("data-auth-mode") === next;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    if (displayField) displayField.hidden = next !== "signup";
    if (display) display.required = next === "signup";
    if (submit) submit.textContent = next === "signup" ? "Create account" : "Sign in";
    if (password) password.autocomplete = next === "signup" ? "new-password" : "current-password";
    setStatus(status, "");
  }

  async function api(action, body) {
    var response = await fetch(SERVICE + "/" + action, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: API_KEY,
        authorization: "Bearer " + (token || API_KEY)
      },
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

  function renderFriend(friend) {
    var item = document.createElement("li");
    var avatar = document.createElement("span");
    avatar.className = "friends-list__av";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = (friend.display_name || friend.username || "?").charAt(0).toUpperCase();

    var body = document.createElement("span");
    body.className = "friends-list__body";
    var rowName = document.createElement("a");
    rowName.className = "friends-list__name";
    rowName.href = "profile.html?u=" + encodeURIComponent(friend.username);
    rowName.textContent = friend.display_name || friend.username;
    var rowHandle = document.createElement("span");
    rowHandle.className = "friends-list__code";
    rowHandle.textContent = "@" + friend.username;
    body.appendChild(rowName);
    body.appendChild(rowHandle);

    var actions = document.createElement("span");
    actions.className = "friends-list__actions";
    var tag = document.createElement("span");
    tag.className = "friends-list__tag";
    tag.textContent = "Friend";
    var remove = document.createElement("button");
    remove.type = "button";
    remove.className = "friends-list__remove";
    remove.textContent = "Remove";
    remove.addEventListener("click", function () {
      removeFriend(friend.id, remove);
    });
    actions.appendChild(tag);
    actions.appendChild(remove);

    item.appendChild(avatar);
    item.appendChild(body);
    item.appendChild(actions);
    return item;
  }

  function renderFriends(friends) {
    if (!friendList) return;
    friendList.textContent = "";
    if (!friends.length) {
      var empty = document.createElement("li");
      empty.className = "friends-empty";
      empty.textContent = "No friends yet. Share your code, then add theirs.";
      friendList.appendChild(empty);
    } else {
      friends.forEach(function (friend) { friendList.appendChild(renderFriend(friend)); });
    }
    if (friendCount) friendCount.textContent = friends.length + " " + (friends.length === 1 ? "friend" : "friends");
  }

  function showProfile(account, friends) {
    if (!account) return;
    if (signedOut) signedOut.hidden = true;
    if (signedIn) signedIn.hidden = false;
    if (badge) badge.textContent = "Signed in";
    if (name) name.textContent = account.display_name || account.username;
    if (handle) handle.textContent = "@" + account.username;
    if (code) code.textContent = account.friend_code;
    if (profileLink) profileLink.href = "profile.html?u=" + encodeURIComponent(account.username);
    renderFriends(friends || []);
    if (friendInput) friendInput.disabled = false;
    if (friendButton) friendButton.disabled = false;
  }

  function showSignedOut(clearToken) {
    if (clearToken !== false) {
      token = null;
      localStorage.removeItem(TOKEN_KEY);
    }
    if (signedOut) signedOut.hidden = false;
    if (signedIn) signedIn.hidden = true;
    if (badge) badge.textContent = "Signed out";
    if (name) name.textContent = "—";
    if (handle) handle.textContent = "Signed in";
    if (code) code.textContent = "—";
    if (friendCount) friendCount.textContent = "Sign in to add";
    if (friendList) {
      friendList.textContent = "";
      var empty = document.createElement("li");
      empty.className = "friends-empty";
      empty.textContent = "Sign in to manage friends.";
      friendList.appendChild(empty);
    }
    if (friendInput) { friendInput.value = ""; friendInput.disabled = true; }
    if (friendButton) friendButton.disabled = true;
  }

  async function loadProfile() {
    if (!token) { showSignedOut(); return; }
    try {
      var profile = await api("me", {});
      showProfile(profile.account, profile.friends);
    } catch (error) {
      if (error.status === 401) {
        showSignedOut();
        setStatus(status, "Session expired. Sign in again.", "error");
      } else {
        showSignedOut(false);
        setStatus(status, "Account service unavailable. Try again shortly.", "error");
      }
    }
  }

  async function removeFriend(id, button) {
    if (!token) return;
    if (button) button.disabled = true;
    try {
      var result = await api("friends-remove", { friend_id: id });
      renderFriends(result.friends || []);
      setStatus(statusIn, "Friend removed.", "ok");
    } catch (error) {
      if (button) button.disabled = false;
      setStatus(statusIn, error.message, "error");
    }
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      setMode(tab.getAttribute("data-auth-mode"));
    });
  });

  if (form) {
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (!username || !password) return;
      setBusy(true);
      setStatus(status, mode === "signup" ? "Creating your account…" : "Signing in…");
      try {
        var payload = mode === "signup"
          ? await api("signup", {
              username: username.value.trim(),
              display_name: (display && display.value.trim()) || username.value.trim(),
              password: password.value
            })
          : await api("login", { username: username.value.trim(), password: password.value });
        token = payload.token;
        localStorage.setItem(TOKEN_KEY, token);
        form.reset();
        showProfile(payload.account, payload.friends);
        setStatus(status, "");
      } catch (error) {
        setStatus(status, error.message, "error");
      } finally {
        setBusy(false);
      }
    });
  }

  if (friendForm) {
    friendForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (!token || !friendInput) return;
      var value = friendInput.value.trim().toUpperCase();
      if (!value) return;
      setBusy(true);
      setStatus(statusIn, "Adding friend…");
      try {
        var result = await api("friends-add", { code: value });
        friendInput.value = "";
        renderFriends(result.friends || []);
        setStatus(statusIn, (result.friend.display_name || result.friend.username) + " added.", "ok");
      } catch (error) {
        setStatus(statusIn, error.message, "error");
      } finally {
        setBusy(false);
      }
    });
  }

  if (signout) {
    signout.addEventListener("click", async function () {
      signout.disabled = true;
      try { if (token) await api("logout", {}); } catch (_) { /* clear locally regardless */ }
      showSignedOut();
      setStatus(status, "Signed out.", "ok");
      signout.disabled = false;
    });
  }

  setMode("login");
  showSignedOut(false);
  loadProfile();
})();
