// Fade sections in as they scroll into view.
// Same approach the site already used inline, moved into a module so every
// page (homepage, blog index, posts) shares one implementation.

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
const targets = document.querySelectorAll(".reveal");

if (reduced.matches || !("IntersectionObserver" in window)) {
  // No animation wanted (or no support) — show everything immediately.
  targets.forEach((el) => el.classList.add("in"));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("in");
        observer.unobserve(entry.target); // reveal is one-way; stop watching
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  targets.forEach((el) => observer.observe(el));
}
