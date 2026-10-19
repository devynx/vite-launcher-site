(function () {
  "use strict";

  var account = window.ViteAccount;
  var body = document.getElementById("settings-body");
  var badge = document.getElementById("settings-badge");
  var meta = document.getElementById("settings-meta");
  var links = document.getElementById("settings-links");
  var current = null;

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function status(message, kind) {
    var node = document.getElementById("settings-status");
    if (!node) return;
    node.textContent = message || "";
    node.className = "account-status" + (kind ? " is-" + kind : "");
  }

  function renderSignIn(message) {
    badge.textContent = "Signed out";
    body.replaceChildren();
    meta.replaceChildren();
    links.replaceChildren();
    if (message) body.appendChild(element("p", "account-status is-error", message));
    body.appendChild(element("p", "account-note", "Sign in to manage your public profile. New here? Create an account on the launcher page."));

    var form = element("form", "account-form");
    var username = field("Username", "text", "username", "player_name");
    var password = field("Password", "password", "current-password", "••••••••");
    form.appendChild(username.wrap);
    form.appendChild(password.wrap);
    var submit = element("button", "btn-account btn-account--lime", "Sign in");
    submit.type = "submit";
    form.appendChild(submit);
    var note = element("p", "account-status");
    note.id = "settings-status";
    form.appendChild(note);
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      submit.disabled = true;
      status("Signing in…");
      try {
        var payload = await account.api("login", {
          username: username.input.value,
          password: password.input.value
        }, false);
        account.setToken(payload.token);
        await load();
      } catch (error) {
        status(error.message, "error");
        submit.disabled = false;
      }
    });
    body.appendChild(form);

    var create = element("a", "btn-account", "Create an account");
    create.href = "index.html#accounts";
    var wrap = element("div", "account-actions");
    wrap.appendChild(create);
    links.appendChild(wrap);
  }

  function field(label, type, autocomplete, placeholder) {
    var wrap = element("label", "account-field");
    wrap.appendChild(element("span", null, label));
    var input = document.createElement("input");
    input.type = type === "password" ? "password" : "text";
    input.required = true;
    input.autocomplete = autocomplete;
    input.placeholder = placeholder;
    if (type === "password") input.minLength = 6;
    wrap.appendChild(input);
    return { wrap: wrap, input: input };
  }

  function metaRow(key, value) {
    var row = element("div", "account-meta__row");
    row.appendChild(element("span", "account-meta__k", key));
    row.appendChild(element("span", "account-meta__v", value));
    meta.appendChild(row);
  }

  function render(accountData, friends) {
    current = accountData;
    badge.textContent = "Signed in";
    body.replaceChildren();
    meta.replaceChildren();
    links.replaceChildren();

    var hero = element("div", "profile-hero");
    var avatar = element("div", "profile-avatar", account.initials(accountData.display_name));
    avatar.style.background = account.avatarColor(accountData.username);
    hero.appendChild(avatar);
    var identity = element("div");
    identity.appendChild(element("h2", "profile-name", accountData.display_name));
    identity.appendChild(element("p", "profile-handle", "@" + accountData.username));
    hero.appendChild(identity);
    body.appendChild(hero);

    var form = element("form", "account-form");
    form.style.marginTop = "22px";

    var display = field("Display name", "text", "nickname", "How friends see you");
    display.input.value = accountData.display_name || "";
    display.input.maxLength = 40;
    form.appendChild(display.wrap);

    var bioWrap = element("label", "account-field");
    bioWrap.appendChild(element("span", null, "Bio"));
    var bio = document.createElement("textarea");
    bio.maxLength = 160;
    bio.placeholder = "A short line about the games you play.";
    bio.value = accountData.bio || "";
    bioWrap.appendChild(bio);
    form.appendChild(bioWrap);

    var toggle = element("label", "account-toggle");
    var publicInput = document.createElement("input");
    publicInput.type = "checkbox";
    publicInput.checked = accountData.profile_public !== false;
    toggle.appendChild(publicInput);
    toggle.appendChild(element("span", null, "Show my profile at profile.html?u=" + accountData.username + ". Friend codes and email are never public."));
    form.appendChild(toggle);

    var save = element("button", "btn-account btn-account--lime", "Save changes");
    save.type = "submit";
    form.appendChild(save);
    var note = element("p", "account-status");
    note.id = "settings-status";
    form.appendChild(note);

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      save.disabled = true;
      status("Saving…");
      try {
        var payload = await account.api("account-settings-update", {
          display_name: display.input.value.trim(),
          bio: bio.value.trim(),
          profile_public: publicInput.checked
        }, true);
        current = payload.account;
        status("Profile saved.", "ok");
        save.disabled = false;
      } catch (error) {
        if (error.status === 401) {
          account.setToken(null);
          renderSignIn("Your session expired. Sign in again.");
          return;
        }
        status(error.message, "error");
        save.disabled = false;
      }
    });
    body.appendChild(form);

    metaRow("Username", "@" + accountData.username);
    metaRow("Friend code", accountData.friend_code || "—");
    metaRow("Friends", String((friends || []).length));
    metaRow("Joined", account.isoDate(accountData.created_at) || "Unknown");
    metaRow("Visibility", accountData.profile_public === false ? "Private" : "Public");

    var profile = element("a", "btn-account", "View public profile");
    profile.href = "profile.html?u=" + encodeURIComponent(accountData.username);
    links.appendChild(profile);

    var copy = element("button", "btn-account", "Copy friend code");
    copy.type = "button";
    copy.addEventListener("click", async function () {
      try {
        await navigator.clipboard.writeText(accountData.friend_code || "");
        copy.textContent = "Copied";
      } catch (_) {
        copy.textContent = "Copy failed";
      }
    });
    links.appendChild(copy);

    var signout = element("button", "btn-account", "Sign out");
    signout.type = "button";
    signout.addEventListener("click", function () {
      account.setToken(null);
      current = null;
      renderSignIn("Signed out.");
    });
    links.appendChild(signout);
  }

  async function load() {
    if (!account.token()) {
      renderSignIn(null);
      return;
    }
    badge.textContent = "Loading";
    try {
      var payload = await account.api("me", {}, true);
      render(payload.account, payload.friends || []);
    } catch (error) {
      if (error.status === 401) {
        account.setToken(null);
        renderSignIn("Your session expired. Sign in again.");
        return;
      }
      badge.textContent = "Offline";
      body.replaceChildren();
      body.appendChild(element("p", "account-status is-error", error.message));
    }
  }

  load();
})();
