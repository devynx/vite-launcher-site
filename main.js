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
