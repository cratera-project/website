// Cratera Website Client Script

// Universal One-Click Copy Helper
function copySnippet(button, targetId) {
  let text = "";
  if (targetId) {
    const el = document.getElementById(targetId);
    if (el) {
      text = el.getAttribute("data-copy") || el.innerText || el.textContent;
    }
  }

  if (!text) return;

  navigator.clipboard.writeText(text.trim()).then(() => {
    const originalHtml = button.innerHTML;
    button.classList.add("copied");
    button.innerHTML = "<span>Copied</span>";
    setTimeout(() => {
      button.classList.remove("copied");
      button.innerHTML = originalHtml;
    }, 1800);
  }).catch(err => {
    console.error("Clipboard copy failed:", err);
  });
}

// Filter 30 Languages Table
function filterLanguages() {
  const input = document.getElementById("lang-filter");
  if (!input) return;
  const filter = input.value.toLowerCase().trim();
  const table = document.getElementById("lang-table");
  if (!table) return;
  const tr = table.getElementsByTagName("tr");

  for (let i = 1; i < tr.length; i++) {
    const row = tr[i];
    const text = row.textContent || row.innerText;
    if (text.toLowerCase().indexOf(filter) > -1) {
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  }
}

// DOM Initialization & Navigation Controller
document.addEventListener("DOMContentLoaded", () => {
  const sections = Array.from(document.querySelectorAll("section[id]"));
  const navLinks = Array.from(document.querySelectorAll(".sidebar-nav .nav-item[data-section]"));
  const mobileMenuBtn = document.getElementById("mobile-menu-btn");
  const sidebar = document.querySelector(".sidebar");

  let isClickScrolling = false;
  let clickTimeout = null;

  // Set Active Navigation Item
  function setActiveLink(sectionId) {
    if (!sectionId) return;
    navLinks.forEach(link => {
      const match = link.getAttribute("data-section") === sectionId;
      if (match) {
        link.classList.add("is-active");
        link.setAttribute("aria-current", "true");
      } else {
        link.classList.remove("is-active");
        link.removeAttribute("aria-current");
      }
    });
  }

  // Update active nav based on scroll position
  function updateActiveNav() {
    if (isClickScrolling || sections.length === 0) return;

    const scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 800;
    const documentHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight
    );

    // 1. Top of page: always highlight Overview
    if (scrollY < 100) {
      setActiveLink("overview");
      return;
    }

    // 2. Near bottom of page (within 100px): activate FAQ (last section)
    if (scrollY + viewportHeight >= documentHeight - 100) {
      const lastSection = sections[sections.length - 1];
      setActiveLink(lastSection.getAttribute("id"));
      return;
    }

    // 3. Scan sections from top to bottom
    const threshold = 160;
    let currentId = sections[0].getAttribute("id");

    for (let i = 0; i < sections.length; i++) {
      const rect = sections[i].getBoundingClientRect();
      if (rect.top <= threshold) {
        currentId = sections[i].getAttribute("id");
      }
    }

    setActiveLink(currentId);
  }

  // Mobile Menu Toggle
  if (mobileMenuBtn && sidebar) {
    mobileMenuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = sidebar.classList.toggle("is-open");
      mobileMenuBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    // Close menu when clicking outside
    document.addEventListener("click", (e) => {
      if (sidebar.classList.contains("is-open") && !sidebar.contains(e.target)) {
        sidebar.classList.remove("is-open");
        mobileMenuBtn.setAttribute("aria-expanded", "false");
      }
    });

    // Close menu on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && sidebar.classList.contains("is-open")) {
        sidebar.classList.remove("is-open");
        mobileMenuBtn.setAttribute("aria-expanded", "false");
      }
    });
  }

  // Sidebar & Anchor Link Click Handler (Smooth Scroll & Instant Highlight)
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      if (!href || href === "#") return;
      const targetId = href.substring(1);
      const targetEl = document.getElementById(targetId);
      if (!targetEl) return;

      e.preventDefault();

      // Close mobile menu if open
      if (sidebar && sidebar.classList.contains("is-open")) {
        sidebar.classList.remove("is-open");
        if (mobileMenuBtn) {
          mobileMenuBtn.setAttribute("aria-expanded", "false");
        }
      }

      // Instantly highlight clicked nav item
      isClickScrolling = true;
      setActiveLink(targetId);

      // Scroll smoothly to target
      if (targetId === "overview") {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: "smooth"
        });
      } else {
        const isMobile = window.innerWidth <= 960;
        const headerOffset = isMobile ? 70 : 30;
        const elementPosition = targetEl.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: Math.max(0, Math.round(offsetPosition)),
          left: 0,
          behavior: "smooth"
        });
      }

      if (history.pushState) {
        history.pushState(null, "", "#" + targetId);
      }

      clearTimeout(clickTimeout);
      clickTimeout = setTimeout(() => {
        isClickScrolling = false;
        updateActiveNav();
      }, 700);
    });
  });

  // Attach passive scroll and resize listeners
  window.addEventListener("scroll", updateActiveNav, { passive: true });
  window.addEventListener("resize", updateActiveNav, { passive: true });

  // Initial active nav check
  updateActiveNav();

  // Sitelinks Search Query Parser (supports ?q=... or #languages?q=...)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    let q = urlParams.get("q");
    if (!q && window.location.hash.includes("?q=")) {
      const hashParams = new URLSearchParams(window.location.hash.split("?")[1]);
      q = hashParams.get("q");
    }
    if (q) {
      const langInput = document.getElementById("lang-filter");
      if (langInput) {
        langInput.value = q;
        filterLanguages();
      }
    }
  } catch (e) {
    console.debug("Query param parse skipped:", e);
  }

  // Theme toggle, system sync, and favicon/theme-color chrome
  const themeApi = window.__crateraTheme;
  const themeToggle = document.getElementById("theme-toggle");
  const themeLabels = { system: "System", light: "Light", dark: "Dark" };
  const themeOrder = { system: "light", light: "dark", dark: "system" };

  function currentThemeState() {
    if (themeApi) {
      const mode = themeApi.pref();
      const applied = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
      return { pref: mode, theme: applied };
    }
    const applied = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    return { pref: "system", theme: applied };
  }

  function updateThemeToggle(state) {
    if (!themeToggle) return;
    const pref = state.pref || "system";
    const next = themeOrder[pref] || "light";
    themeToggle.setAttribute(
      "aria-label",
      "Color theme: " + themeLabels[pref] + ". Click to switch to " + themeLabels[next] + "."
    );
    themeToggle.setAttribute("title", "Theme: " + themeLabels[pref]);
  }

  function updateFavicon(isDark) {
    const icons = document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]');
    icons.forEach((icon) => {
      if (icon.getAttribute("type") === "image/svg+xml") return;
      const href = icon.getAttribute("href");
      if (!href) return;
      if (isDark && href.includes("favicon-light")) {
        icon.setAttribute("href", href.replace("favicon-light", "favicon-dark"));
      } else if (!isDark && href.includes("favicon-dark")) {
        icon.setAttribute("href", href.replace("favicon-dark", "favicon-light"));
      }
    });
  }

  function syncThemeChrome(state) {
    const resolved = state || currentThemeState();
    updateThemeToggle(resolved);
    try {
      updateFavicon(resolved.theme === "dark");
    } catch (e) {
      console.debug("Favicon theme sync skipped:", e);
    }
  }

  syncThemeChrome();

  if (themeToggle && themeApi) {
    themeToggle.addEventListener("click", () => {
      syncThemeChrome(themeApi.cycle());
    });
  }

  try {
    if (window.matchMedia) {
      const matcher = window.matchMedia("(prefers-color-scheme: dark)");
      const onSystemChange = () => {
        if (!themeApi || themeApi.pref() !== "system") return;
        syncThemeChrome(themeApi.apply("system", false));
      };
      if (typeof matcher.addEventListener === "function") {
        matcher.addEventListener("change", onSystemChange);
      } else if (typeof matcher.addListener === "function") {
        matcher.addListener(onSystemChange);
      }
    }
  } catch (e) {
    console.debug("System theme sync skipped:", e);
  }
});
