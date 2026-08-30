// Universal One-Click Copy Helper
function copySnippet(button, targetId) {
  let text = "";
  if (targetId) {
    const el = document.getElementById(targetId);
    if (el) {
      // For commands with comments like "# or:", get text or data-copy attribute
      text = el.getAttribute("data-copy") || el.innerText || el.textContent;
    }
  }

  if (!text) return;

  navigator.clipboard.writeText(text.trim()).then(() => {
    const originalHtml = button.innerHTML;
    button.classList.add("copied");
    button.innerHTML = "<span>COPIED!</span>";
    setTimeout(() => {
      button.classList.remove("copied");
      button.innerHTML = originalHtml;
    }, 1800);
  }).catch(err => {
    console.error("Clipboard copy failed:", err);
  });
}

// Copy Repository URL
function copyRepoUrl() {
  const btn = document.getElementById("copy-btn");
  copySnippet(btn, "repo-url-text");
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

// Mobile & Desktop Navigation Controller
document.addEventListener("DOMContentLoaded", () => {
  const sections = Array.from(document.querySelectorAll("section[id]"));
  const navLinks = Array.from(document.querySelectorAll(".sidebar-nav .nav-item[data-section]"));
  const mobileMenuBtn = document.getElementById("mobile-menu-btn");
  const sidebar = document.querySelector(".sidebar");

  let isClickScrolling = false;
  let clickTimeout = null;

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

  function updateActiveNav() {
    if (isClickScrolling || sections.length === 0) return;

    const scrollY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 800;
    const documentHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight
    );

    // 1. If at or near the bottom of the page (within 120px), activate the bottom-most section (FAQ)
    if (scrollY + viewportHeight >= documentHeight - 120) {
      const lastSection = sections[sections.length - 1];
      setActiveLink(lastSection.getAttribute("id"));
      return;
    }

    // 2. Scan sections from bottom to top
    const threshold = Math.min(260, viewportHeight * 0.45);
    let activeId = "";

    for (let i = sections.length - 1; i >= 0; i--) {
      const rect = sections[i].getBoundingClientRect();
      if (rect.top <= threshold && rect.bottom > 80) {
        activeId = sections[i].getAttribute("id");
        break;
      }
    }

    // 3. Fallback: find the section with the largest visible portion in viewport
    if (!activeId) {
      let maxVisible = -1;
      sections.forEach(section => {
        const rect = section.getBoundingClientRect();
        const visibleHeight = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));
        if (visibleHeight > maxVisible) {
          maxVisible = visibleHeight;
          activeId = section.getAttribute("id");
        }
      });
    }

    if (!activeId && sections.length > 0) {
      activeId = sections[0].getAttribute("id");
    }

    setActiveLink(activeId);
  }

  // Smooth, Zero-Horizontal-Shift Anchor Click Handler
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

      const isMobile = window.innerWidth <= 960;
      const mobileHeader = document.querySelector(".sidebar");
      const headerOffset = isMobile && mobileHeader ? 65 : 20;

      const elementPosition = targetEl.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      isClickScrolling = true;
      setActiveLink(targetId);

      window.scrollTo({
        top: Math.max(0, Math.round(offsetPosition)),
        left: 0,
        behavior: "smooth"
      });

      if (history.pushState) {
        history.pushState(null, "", "#" + targetId);
      }

      clearTimeout(clickTimeout);
      clickTimeout = setTimeout(() => {
        isClickScrolling = false;
        updateActiveNav();
      }, 750);
    });
  });

  // Attach scroll, resize, and touch listeners
  window.addEventListener("scroll", () => {
    // Lock horizontal scroll to 0 to prevent any side drifting
    if (window.scrollX !== 0) {
      window.scrollTo(0, window.scrollY);
    }
    updateActiveNav();
  }, { passive: true });

  window.addEventListener("resize", updateActiveNav, { passive: true });
  document.addEventListener("scroll", updateActiveNav, { passive: true });

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

  // Adaptive Favicon Controller (Light Mode: Black icon, Dark Mode: White icon)
  try {
    if (window.matchMedia) {
      const matcher = window.matchMedia("(prefers-color-scheme: dark)");
      const updateFavicon = (isDark) => {
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
      };
      updateFavicon(matcher.matches);
      if (typeof matcher.addEventListener === "function") {
        matcher.addEventListener("change", (e) => updateFavicon(e.matches));
      } else if (typeof matcher.addListener === "function") {
        matcher.addListener((e) => updateFavicon(e.matches));
      }
    }
  } catch (e) {
    console.debug("Favicon theme sync skipped:", e);
  }
});
