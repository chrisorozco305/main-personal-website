// Toggles .scrolled on the sticky header.
//
// The header is opaque at the top of the page so the hero backdrop video
// starts cleanly beneath it, and only turns translucent + blurred once
// content is actually scrolling underneath.

const header = document.querySelector(".site-header");

if (header) {
  const sync = () => {
    header.classList.toggle("scrolled", window.scrollY > 4);
  };

  sync(); // run once in case the page loads already scrolled (anchor / restore)
  window.addEventListener("scroll", sync, { passive: true });
}
