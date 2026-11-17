"use strict";

const header = document.querySelector(".site-header");
const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".primary-nav");

function syncHeader() {
  header.classList.toggle("is-scrolled", window.scrollY > 24);
}
syncHeader();
window.addEventListener("scroll", syncHeader, { passive: true });

function closeMenu() {
  if (!menuButton || !navigation) return;
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Open navigation");
  navigation.classList.remove("is-open");
}

menuButton?.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") !== "true";
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  navigation.classList.toggle("is-open", open);
});
navigation?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
window.addEventListener("resize", () => {
  if (window.innerWidth > 760) closeMenu();
}, { passive: true });

// Reveal content only as it approaches the viewport; reduced-motion users see it immediately.
const revealItems = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: "0px 0px -36px 0px" });
  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

// Keep the navigation state in sync with the visible sections.
const navLinks = [...document.querySelectorAll('.primary-nav a[href^="#"]')];
const navSections = navLinks.map((link) => document.querySelector(link.getAttribute("href"))).filter(Boolean);
if ("IntersectionObserver" in window) {
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((link) => {
        const current = link.getAttribute("href") === `#${entry.target.id}`;
        if (current) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    });
  }, { rootMargin: "-22% 0px -68% 0px", threshold: 0 });
  navSections.forEach((section) => sectionObserver.observe(section));
}

// Project filters; all project content remains in the document for assistive technology and printing.
const filterButtons = [...document.querySelectorAll(".filter-button")];
const projectCards = [...document.querySelectorAll(".project-card")];
filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;
    filterButtons.forEach((choice) => {
      const active = choice === button;
      choice.classList.toggle("is-active", active);
      choice.setAttribute("aria-pressed", String(active));
    });
    projectCards.forEach((card) => {
      card.hidden = filter !== "all" && card.dataset.category !== filter;
    });
  });
});

// Drag or use arrow keys to orbit the CSS-built architectural massing model.
const scene = document.querySelector("#architecture-scene");
const sceneWorld = scene?.querySelector(".scene-world");
let orbitX = 59;
let orbitY = -29;
let dragStart = null;
let pendingFrame = 0;

function setOrbit() {
  if (!sceneWorld) return;
  sceneWorld.style.setProperty("--rx", String(orbitX));
  sceneWorld.style.setProperty("--ry", String(orbitY));
}
function resetOrbit() {
  orbitX = 59;
  orbitY = -29;
  setOrbit();
}
scene?.addEventListener("pointerdown", (event) => {
  if (event.button !== undefined && event.button !== 0) return;
  dragStart = { x: event.clientX, y: event.clientY };
  scene.classList.add("is-dragging");
  scene.setPointerCapture?.(event.pointerId);
});
scene?.addEventListener("pointermove", (event) => {
  if (!dragStart || !sceneWorld) return;
  const dx = event.clientX - dragStart.x;
  const dy = event.clientY - dragStart.y;
  dragStart = { x: event.clientX, y: event.clientY };
  orbitY = Math.max(-68, Math.min(68, orbitY + dx * 0.42));
  orbitX = Math.max(36, Math.min(76, orbitX - dy * 0.3));
  if (!pendingFrame) {
    pendingFrame = window.requestAnimationFrame(() => {
      setOrbit();
      pendingFrame = 0;
    });
  }
});
function endOrbitDrag() {
  dragStart = null;
  scene?.classList.remove("is-dragging");
}
scene?.addEventListener("pointerup", endOrbitDrag);
scene?.addEventListener("pointercancel", endOrbitDrag);
scene?.addEventListener("lostpointercapture", endOrbitDrag);
scene?.addEventListener("keydown", (event) => {
  const step = event.shiftKey ? 12 : 6;
  if (event.key === "ArrowLeft") orbitY -= step;
  else if (event.key === "ArrowRight") orbitY += step;
  else if (event.key === "ArrowUp") orbitX = Math.max(36, orbitX - step);
  else if (event.key === "ArrowDown") orbitX = Math.min(76, orbitX + step);
  else if (event.key.toLowerCase() === "r") resetOrbit();
  else return;
  event.preventDefault();
  orbitY = Math.max(-68, Math.min(68, orbitY));
  setOrbit();
});
document.querySelector(".scene-reset")?.addEventListener("click", resetOrbit);

// Accessible image viewer; next/previous stays within the current project's image series.
const lightbox = document.querySelector("#lightbox");
const lightboxImage = document.querySelector("#lightbox-image");
const lightboxCaption = document.querySelector("#lightbox-caption");
const lightboxCount = document.querySelector("#lightbox-count");
const lightboxButtons = [...document.querySelectorAll("[data-gallery][data-index]")];
const closeLightboxButton = document.querySelector(".lightbox-close");
let activeGallery = [];
let activeGalleryIndex = 0;
let previousFocus = null;

function showGalleryImage(index) {
  if (!activeGallery.length) return;
  activeGalleryIndex = (index + activeGallery.length) % activeGallery.length;
  const trigger = activeGallery[activeGalleryIndex];
  const image = trigger.querySelector("img");
  lightboxImage.src = image.currentSrc || image.src;
  lightboxImage.alt = image.alt;
  lightboxCaption.textContent = image.alt;
  lightboxCount.textContent = `${String(activeGalleryIndex + 1).padStart(2, "0")} / ${String(activeGallery.length).padStart(2, "0")}`;
}
function openGallery(trigger) {
  const group = trigger.dataset.gallery;
  activeGallery = lightboxButtons
    .filter((button) => button.dataset.gallery === group)
    .sort((a, b) => Number(a.dataset.index) - Number(b.dataset.index));
  activeGalleryIndex = activeGallery.indexOf(trigger);
  previousFocus = trigger;
  showGalleryImage(activeGalleryIndex);
  if (typeof lightbox.showModal === "function") lightbox.showModal();
  else lightbox.setAttribute("open", "");
  closeLightboxButton?.focus();
}
function closeLightbox() {
  if (!lightbox) return;
  if (typeof lightbox.close === "function" && lightbox.open) lightbox.close();
  else lightbox.removeAttribute("open");
  previousFocus?.focus();
}
lightboxButtons.forEach((button) => button.addEventListener("click", () => openGallery(button)));
closeLightboxButton?.addEventListener("click", closeLightbox);
document.querySelector(".lightbox-prev")?.addEventListener("click", () => showGalleryImage(activeGalleryIndex - 1));
document.querySelector(".lightbox-next")?.addEventListener("click", () => showGalleryImage(activeGalleryIndex + 1));
lightbox?.addEventListener("click", (event) => {
  if (event.target === lightbox) closeLightbox();
});
lightbox?.addEventListener("close", () => previousFocus?.focus());
window.addEventListener("keydown", (event) => {
  if (!lightbox?.open) return;
  if (event.key === "ArrowRight") showGalleryImage(activeGalleryIndex + 1);
  if (event.key === "ArrowLeft") showGalleryImage(activeGalleryIndex - 1);
});

document.querySelector("#print-button")?.addEventListener("click", () => window.print());
