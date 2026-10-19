/* Shared account chip for the marketing, profile, settings, and portal pages. */
(function () {
  "use strict";

  var slots = Array.prototype.slice.call(document.querySelectorAll("[data-account-nav]"));
  if (!slots.length) {
    var nav = document.querySelector(".nav__inner, .nav");
    if (nav) {
      var slot = document.createElement("div");
      slot.className = "account-nav";
      slot.setAttribute("data-account-nav", "");
      nav.appendChild(slot);
      slots = [slot];
    }
  }
  if (!slots.length || !window.ViteAccount) return;

  function initials(name) {
    return window.ViteAccount.initials(name);
  }

  function avatar(account, className) {
    var el = document.createElement("span");
    el.className = className || "account-chip__avatar";
    el.style.background = window.ViteAccount.avatarColor(account.username || account.display_name);
    el.textContent = initials(account.display_name || account.username);
    return el;
  }

  function signedOut() {
    slots.forEach(function (slot) {
      slot.innerHTML = "";
      var link = document.createElement("a");
      link.className = "account-chip account-chip--guest";
      link.href = "portal.html";
      link.textContent = "Sign in";
      slot.appendChild(link);
    });
  }

  function render(session) {
    slots.forEach(function (slot) {
      slot.innerHTML = "";
      var wrap = document.createElement("div");
      wrap.className = "account-chip-wrap";

      var button = document.createElement("button");
      button.type = "button";
      button.className = "account-chip";
      button.setAttribute("aria-haspopup", "menu");
      button.setAttribute("aria-expanded", "false");
      button.appendChild(avatar(session.account));
      var label = document.createElement("span");
      label.className = "account-chip__name";
      label.textContent = session.account.display_name;
      button.appendChild(label);
      var chevron = document.createElement("span");
      chevron.className = "account-chip__chevron";
      chevron.textContent = "▾";
      button.appendChild(chevron);

      var menu = document.createElement("div");
      menu.className = "account-menu";
      menu.setAttribute("role", "menu");
      menu.hidden = true;
      [
        ["portal.html", "Account portal"],
        ["profile.html?u=" + encodeURIComponent(session.account.username), "Public profile"],
        ["settings.html", "Account settings"]
      ].forEach(function (item) {
        var link = document.createElement("a");
        link.href = item[0];
        link.setAttribute("role", "menuitem");
        link.textContent = item[1];
        menu.appendChild(link);
      });
      var signOut = document.createElement("button");
      signOut.type = "button";
      signOut.className = "account-menu__signout";
      signOut.setAttribute("role", "menuitem");
      signOut.textContent = "Sign out";
      signOut.addEventListener("click", async function () {
        try {
          await window.ViteAccount.api("logout", {}, true);
        } catch (_) {
          /* clear locally even if the network call fails */
        }
        window.ViteAccount.setToken(null);
        window.location.href = "portal.html";
      });
      menu.appendChild(signOut);

      button.addEventListener("click", function (event) {
        event.stopPropagation();
        var open = menu.hidden;
        menu.hidden = !open;
        button.setAttribute("aria-expanded", String(open));
      });
      menu.addEventListener("click", function (event) {
        if (event.target.closest("a")) {
          menu.hidden = true;
          button.setAttribute("aria-expanded", "false");
        }
      });
      document.addEventListener("click", function (event) {
        if (!wrap.contains(event.target)) {
          menu.hidden = true;
          button.setAttribute("aria-expanded", "false");
        }
      });
      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
          menu.hidden = true;
          button.setAttribute("aria-expanded", "false");
        }
      });

      wrap.appendChild(button);
      wrap.appendChild(menu);
      slot.appendChild(wrap);
    });
  }

  async function boot() {
    if (!window.ViteAccount.token()) {
      signedOut();
      window.dispatchEvent(new CustomEvent("vite:account", { detail: null }));
      return;
    }
    try {
      var session = await window.ViteAccount.api("me", {}, true);
      render(session);
      window.ViteAccountSession = session;
      window.dispatchEvent(new CustomEvent("vite:account", { detail: session }));
    } catch (error) {
      if (error && (error.status === 401 || error.status === 404)) {
        window.ViteAccount.setToken(null);
      }
      signedOut();
      window.dispatchEvent(new CustomEvent("vite:account", { detail: null }));
    }
  }

  boot();

  window.addEventListener("vite:account", function (event) {
    if (event.detail) render(event.detail);
    else signedOut();
  });
})();
