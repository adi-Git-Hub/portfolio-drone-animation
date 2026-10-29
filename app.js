// ============================================================================
// 1. Theme Manager
// ============================================================================
const root = document.documentElement;
const themeButtons = document.querySelectorAll("[data-theme-choice]");
const savedTheme = window.localStorage.getItem("portfolio-theme");

function setTheme(theme) {
  root.dataset.theme = theme;
  window.localStorage.setItem("portfolio-theme", theme);
  themeButtons.forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.themeChoice === theme));
  });
  window.dispatchEvent(new CustomEvent("portfolio:themechange", { detail: { theme } }));
}

if (["blue", "pink", "green", "purple", "red"].includes(savedTheme)) {
  setTheme(savedTheme);
} else {
  setTheme("blue");
}

themeButtons.forEach((btn) => {
  btn.addEventListener("click", () => setTheme(btn.dataset.themeChoice));
});

// ============================================================================
// 2. Fixed Header Dynamic Elevation on Scroll
// ============================================================================
const siteHeader = document.querySelector(".site-header");
let isHeaderScrolled = false;

function checkHeaderScroll() {
  const scrolled = window.scrollY > 20;
  if (scrolled !== isHeaderScrolled && siteHeader) {
    isHeaderScrolled = scrolled;
    siteHeader.classList.toggle("site-header--scrolled", scrolled);
  }
}

window.addEventListener("scroll", checkHeaderScroll, { passive: true });
checkHeaderScroll();

// ============================================================================
// 3. High-Performance Cursor Spotlight Pool & Card Shimmer
// ============================================================================
const cursorSpotlight = document.querySelector("#cursor-spotlight");

let targetPointerX = window.innerWidth / 2;
let targetPointerY = window.innerHeight / 2;
let spotlightX = targetPointerX;
let spotlightY = targetPointerY;

document.addEventListener("pointermove", (e) => {
  targetPointerX = e.clientX;
  targetPointerY = e.clientY;
}, { passive: true });

// Dedicated per-card shimmer without whole-page DOM query churn
document.querySelectorAll("[data-tilt], .stack-deck-card, .skill-token-card, .cert-credential-badge").forEach((card) => {
  card.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    const bounds = card.getBoundingClientRect();
    card.style.setProperty("--spot-x", `${e.clientX - bounds.left}px`);
    card.style.setProperty("--spot-y", `${e.clientY - bounds.top}px`);
  }, { passive: true });
});

function updateSpotlight() {
  if (cursorSpotlight) {
    spotlightX += (targetPointerX - spotlightX) * 0.22;
    spotlightY += (targetPointerY - spotlightY) * 0.22;
    cursorSpotlight.style.transform = `translate3d(${spotlightX.toFixed(1)}px, ${spotlightY.toFixed(1)}px, 0)`;
  }
  requestAnimationFrame(updateSpotlight);
}
requestAnimationFrame(updateSpotlight);

// ============================================================================
// 4. Apple-Restrained 3D Card Interactive Tilt Effect
// ============================================================================
const isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const tiltElements = document.querySelectorAll("[data-tilt]");

if (!isReducedMotion) {
  tiltElements.forEach((el) => {
    let tiltRafId = null;

    el.addEventListener("pointermove", (e) => {
      if (e.pointerType === "touch") return;

      if (tiltRafId) cancelAnimationFrame(tiltRafId);
      tiltRafId = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // Controlled, subtle rotation (-4deg to +4deg)
        const rotateX = ((y - centerY) / centerY) * -4.0;
        const rotateY = ((x - centerX) / centerX) * 4.0;

        el.style.transform = `perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-2px)`;
      });
    }, { passive: true });

    el.addEventListener("pointerleave", () => {
      if (tiltRafId) cancelAnimationFrame(tiltRafId);
      el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0px)";
    });
  });
}

// ============================================================================
// 5. Copy Email Button with Tactile Feedback
// ============================================================================
const btnCopyEmail = document.querySelector("#btn-copy-email");
if (btnCopyEmail) {
  btnCopyEmail.addEventListener("click", async () => {
    const email = btnCopyEmail.dataset.email;
    if (!email) return;

    try {
      await navigator.clipboard.writeText(email);
      const originalHtml = btnCopyEmail.innerHTML;
      btnCopyEmail.innerHTML = `<span>Email Copied!</span><span aria-hidden="true">✓</span>`;
      btnCopyEmail.style.borderColor = "var(--accent)";
      setTimeout(() => {
        btnCopyEmail.innerHTML = originalHtml;
        btnCopyEmail.style.borderColor = "";
      }, 2400);
    } catch {
      window.location.href = `mailto:${email}`;
    }
  });
}

// ============================================================================
// 6. Active Nav Indicator (Using IntersectionObserver for Zero Layout Thrash)
// ============================================================================
const sections = document.querySelectorAll("main > section");
const navLinks = document.querySelectorAll(".nav a");

if ("IntersectionObserver" in window && sections.length > 0) {
  const navObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const currentId = entry.target.getAttribute("id");
          navLinks.forEach((link) => {
            const href = link.getAttribute("href");
            link.classList.toggle("nav-link--active", href === `#${currentId}`);
          });
        }
      });
    },
    {
      rootMargin: "-20% 0px -65% 0px",
      threshold: [0, 0.2],
    }
  );

  sections.forEach((s) => navObserver.observe(s));
}

// ============================================================================
// 7. 3D Stacking Card Deck on Scroll (Fluid, Frame-Budgeted & Reversible)
// ============================================================================
const deckCards = Array.from(document.querySelectorAll(".stack-deck-card"));
const stackDeckContainer = document.querySelector("#stack-deck");
let isStackUpdating = false;

function updateDeckStacking() {
  if (!deckCards.length || !stackDeckContainer) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const isMobile = window.innerWidth <= 640;
  const stickyTop = isMobile ? 80 : 110;

  deckCards.forEach((card, idx) => {
    if (idx === deckCards.length - 1) {
      card.style.transform = "scale(1) translate3d(0, 0, 0)";
      card.style.filter = "brightness(1)";
      return;
    }

    const nextCard = deckCards[idx + 1];
    if (!nextCard) return;

    const nextRect = nextCard.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();

    const overlapStart = stickyTop + cardRect.height * 0.9;
    const overlapEnd = stickyTop;

    if (nextRect.top < overlapStart) {
      const progress = Math.min(Math.max((overlapStart - nextRect.top) / (overlapStart - overlapEnd), 0), 1);
      
      const scale = 1 - progress * 0.055;
      const translateY = -progress * 15;
      const translateZ = -progress * 45;
      const brightness = 1 - progress * 0.20;

      card.style.transform = `perspective(1000px) scale(${scale.toFixed(3)}) translate3d(0, ${translateY.toFixed(1)}px, ${translateZ.toFixed(1)}px)`;
      card.style.filter = `brightness(${brightness.toFixed(2)})`;
      card.classList.toggle("is-stacked", progress > 0.4);
    } else {
      card.style.transform = "perspective(1000px) scale(1) translate3d(0, 0, 0)";
      card.style.filter = "brightness(1)";
      card.classList.remove("is-stacked");
    }
  });
}

function requestDeckUpdate() {
  if (isStackUpdating) return;
  isStackUpdating = true;
  requestAnimationFrame(() => {
    updateDeckStacking();
    isStackUpdating = false;
  });
}

window.addEventListener("scroll", requestDeckUpdate, { passive: true });
window.addEventListener("resize", requestDeckUpdate, { passive: true });
requestDeckUpdate();

// ============================================================================
// 8. Apple-Style Cinematic Scroll Reveal System (Bidirectional & Natural)
// ============================================================================
function initScrollReveals() {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 1. Reveal Section Headings
  document.querySelectorAll(".section-heading").forEach((heading) => {
    heading.classList.add("reveal-item");
  });

  // 2. Reveal Research Hero Card
  const researchCard = document.querySelector(".research-hero-card");
  if (researchCard) {
    researchCard.classList.add("reveal-item", "reveal-scale");
  }

  // 3. Reveal Project Panels with Consistent Directional Movement
  document.querySelectorAll(".project-split-row").forEach((row) => {
    const card = row.querySelector(".project-card");
    if (card) {
      card.classList.add("reveal-item");
      if (row.classList.contains("project-split-row--card-left")) {
        card.classList.add("reveal-left");
      } else {
        card.classList.add("reveal-right");
      }
    }
  });

  // 4. Staggered Reveals for Certifications Standalone Grid
  document.querySelectorAll(".certifications-standalone-grid .cert-credential-badge").forEach((badge, idx) => {
    badge.classList.add("reveal-item");
    badge.style.setProperty("--stagger-idx", String(idx % 3));
  });

  // 5. Staggered Reveals for Timeline Items & Education Cards
  document.querySelectorAll(".timeline-item").forEach((item, idx) => {
    item.classList.add("reveal-item");
    item.style.setProperty("--stagger-idx", String(Math.min(idx, 4)));
  });
  document.querySelectorAll(".education-card").forEach((card, idx) => {
    card.classList.add("reveal-item");
    card.style.setProperty("--stagger-idx", String(Math.min(idx, 4)));
  });

  // 6. Reveal Contact Terminal
  const contactTerminal = document.querySelector(".contact-terminal");
  if (contactTerminal) {
    contactTerminal.classList.add("reveal-item", "reveal-scale");
  }

  // If user prefers reduced motion, show everything immediately without transform
  if (prefersReduced) {
    document.querySelectorAll(".reveal-item").forEach((el) => {
      el.classList.add("reveal-visible");
    });
    return;
  }

  // IntersectionObserver for fluid forward and backward transitions
  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-visible");
          } else {
            // Natural reversal: When scrolling up, elements exiting towards the bottom reset gently
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
            if (entry.boundingClientRect.top > viewportHeight - 40) {
              entry.target.classList.remove("reveal-visible");
            }
          }
        });
      },
      {
        threshold: [0, 0.12],
        rootMargin: "0px 0px -40px 0px",
      }
    );

    document.querySelectorAll(".reveal-item").forEach((el) => {
      revealObserver.observe(el);
    });
  } else {
    document.querySelectorAll(".reveal-item").forEach((el) => {
      el.classList.add("reveal-visible");
    });
  }
}

initScrollReveals();

// ============================================================================
// 9. Interactive Resume Viewer Modal
// ============================================================================
const resumeModal = document.querySelector("#resume-modal");
const openResumeButtons = document.querySelectorAll(
  "#btn-open-resume-header, #btn-open-resume-hero, #btn-open-resume-contact, #btn-open-resume-mobile, [data-open-resume]"
);
const closeResumeButtons = document.querySelectorAll("#btn-close-resume, #btn-close-resume-footer, .resume-modal-backdrop");

function openResume() {
  if (resumeModal) {
    resumeModal.classList.add("resume-modal--active");
    resumeModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
}

function closeResume() {
  if (resumeModal) {
    resumeModal.classList.remove("resume-modal--active");
    resumeModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
}

openResumeButtons.forEach((btn) => btn.addEventListener("click", () => {
  closeMobileMenu();
  openResume();
}));
closeResumeButtons.forEach((btn) => btn.addEventListener("click", closeResume));

// ============================================================================
// 10. Interactive Certificate Viewer Modal
// ============================================================================
const certModal = document.querySelector("#cert-modal");
const certModalTitle = document.querySelector("#cert-modal-title");
const certModalSpecs = document.querySelector("#cert-modal-specs");
const certModalImg = document.querySelector("#cert-modal-img");
const certModalDownload = document.querySelector("#cert-modal-download");
const certModalFooterDownload = document.querySelector("#cert-modal-footer-download");
const certModalViewTab = document.querySelector("#cert-modal-view-tab");
const certModalBadge = document.querySelector("#cert-modal-badge");
const certModalIssuer = document.querySelector("#cert-modal-issuer");
const closeCertButtons = document.querySelectorAll("#btn-close-cert, #btn-close-cert-footer, #cert-modal-backdrop");
const certCards = document.querySelectorAll(".cert-credential-badge");
const btnViewResearchCert = document.querySelector("#btn-view-research-cert");

function openCertificate(data) {
  if (!certModal) return;

  const title = data.title || "Specialized Credential";
  const issuer = data.issuer || "Verified Accredited Organization";
  const badge = data.badge || "Verified Credential";
  const code = data.code || "CERT-RECORD";
  const imgSrc = data.image || "./certificates/niki_skill_infosis.jpeg";

  if (certModalTitle) certModalTitle.textContent = title;
  if (certModalSpecs) certModalSpecs.textContent = `${code} • ${issuer} • Authenticated`;
  if (certModalBadge) certModalBadge.textContent = badge;
  if (certModalIssuer) certModalIssuer.textContent = `Issuer: ${issuer}`;

  if (certModalImg) {
    certModalImg.src = imgSrc;
    certModalImg.alt = `${title} Certificate`;
  }

  const cleanFilename = `${title.replace(/[^a-zA-Z0-9_-]/g, "_")}_Certificate.jpeg`;
  if (certModalDownload) {
    certModalDownload.href = imgSrc;
    certModalDownload.setAttribute("download", cleanFilename);
  }
  if (certModalFooterDownload) {
    certModalFooterDownload.href = imgSrc;
    certModalFooterDownload.setAttribute("download", cleanFilename);
  }
  if (certModalViewTab) {
    certModalViewTab.href = imgSrc;
  }

  certModal.classList.add("resume-modal--active");
  certModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeCertificate() {
  if (certModal) {
    certModal.classList.remove("resume-modal--active");
    certModal.setAttribute("aria-hidden", "true");
    const anyModalOpen =
      (resumeModal && resumeModal.classList.contains("resume-modal--active")) ||
      (certModal && certModal.classList.contains("resume-modal--active"));
    if (!anyModalOpen) {
      document.body.style.overflow = "";
    }
  }
}

certCards.forEach((card) => {
  const handler = () => {
    openCertificate({
      image: card.dataset.certImg,
      title: card.dataset.certTitle,
      issuer: card.dataset.certIssuer,
      badge: card.dataset.certBadge,
      code: card.dataset.certCode,
    });
  };

  card.addEventListener("click", handler);
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handler();
    }
  });
});

if (btnViewResearchCert) {
  btnViewResearchCert.addEventListener("click", () => {
    openCertificate({
      image: btnViewResearchCert.dataset.certImg,
      title: btnViewResearchCert.dataset.certTitle,
      issuer: btnViewResearchCert.dataset.certIssuer,
      badge: btnViewResearchCert.dataset.certBadge,
      code: btnViewResearchCert.dataset.certCode,
    });
  });
}

closeCertButtons.forEach((btn) => btn.addEventListener("click", closeCertificate));

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeResume();
    closeCertificate();
    closeMobileMenu();
  }
});

// ============================================================================
// 11. Mobile Navigation Drawer Manager
// ============================================================================
const mobileMenuBtn = document.querySelector("#mobile-menu-btn");
const mobileNavDrawer = document.querySelector("#mobile-nav-drawer");
const mobileNavClose = document.querySelector("#mobile-nav-close");
const mobileNavBackdrop = document.querySelector("#mobile-nav-backdrop");
const mobileNavLinks = document.querySelectorAll(".mobile-nav-link");

function openMobileMenu() {
  if (mobileNavDrawer && mobileMenuBtn) {
    mobileNavDrawer.classList.add("mobile-nav-drawer--active");
    mobileNavDrawer.setAttribute("aria-hidden", "false");
    mobileMenuBtn.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }
}

function closeMobileMenu() {
  if (mobileNavDrawer && mobileMenuBtn) {
    mobileNavDrawer.classList.remove("mobile-nav-drawer--active");
    mobileNavDrawer.setAttribute("aria-hidden", "true");
    mobileMenuBtn.setAttribute("aria-expanded", "false");
    const anyModalOpen =
      (resumeModal && resumeModal.classList.contains("resume-modal--active")) ||
      (certModal && certModal.classList.contains("resume-modal--active"));
    if (!anyModalOpen) {
      document.body.style.overflow = "";
    }
  }
}

if (mobileMenuBtn) {
  mobileMenuBtn.addEventListener("click", () => {
    if (mobileNavDrawer && mobileNavDrawer.classList.contains("mobile-nav-drawer--active")) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  });
}

if (mobileNavClose) mobileNavClose.addEventListener("click", closeMobileMenu);
if (mobileNavBackdrop) mobileNavBackdrop.addEventListener("click", closeMobileMenu);
mobileNavLinks.forEach((link) => {
  link.addEventListener("click", closeMobileMenu);
});
