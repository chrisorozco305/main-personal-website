// Lazy, budget-capped video playback.
//
// The site we're modeling this structure on preloads every <video> and
// autoplays all of them on page load, so several decoders spin up at once
// even for media the visitor hasn't scrolled to yet. That's the lag.
//
// Here, each <video> starts with no source loaded. An IntersectionObserver
// attaches the real src only once the card enters the viewport, plays while
// visible, and pauses (releasing the decoder) once it scrolls away. A small
// concurrency cap keeps more than a couple of videos from ever decoding at
// the same time, and prefers-reduced-motion / Save-Data skip video entirely
// in favor of the poster frame.

// One full grid row is three cards wide, so a lower cap would leave the third
// card frozen on its poster beside two animating neighbours. Still far below
// the "preload and autoplay everything" behaviour this system exists to avoid.
const MAX_CONCURRENT = 3;
let active = 0;
const waiting = [];

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const saveData = navigator.connection?.saveData === true;
const skipVideo = reduced || saveData;

function releaseSlot() {
  active = Math.max(0, active - 1);
  const next = waiting.shift();
  if (next) next();
}

function requestSlot(run) {
  if (active < MAX_CONCURRENT) {
    active += 1;
    run();
  } else {
    waiting.push(() => {
      active += 1;
      run();
    });
  }
}

function loadSource(video) {
  if (video.dataset.loaded) return;
  const src = video.dataset.src;
  if (!src) return;
  video.src = src;
  video.dataset.loaded = "true";
}

function play(video) {
  if (skipVideo) return;
  loadSource(video);
  requestSlot(() => {
    video.play().catch(() => {
      // Autoplay can be rejected (e.g. low-power mode); the poster frame
      // stays visible, which is an acceptable fallback, not an error state.
      releaseSlot();
    });
  });
}

function pause(video) {
  if (video.dataset.loaded !== "true") return;
  video.pause();
  if (video.dataset.playing === "true") releaseSlot();
  video.dataset.playing = "false";
}

document.querySelectorAll("[data-media] video").forEach((video) => {
  video.addEventListener("playing", () => {
    video.dataset.playing = "true";
  });
  video.addEventListener("pause", () => {
    if (video.dataset.playing === "true") releaseSlot();
    video.dataset.playing = "false";
  });
});

if (skipVideo || !("IntersectionObserver" in window)) {
  // Static poster only — no network fetch, no decode.
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const video = entry.target.querySelector("video");
        if (!video) continue;
        if (entry.isIntersecting) play(video);
        else pause(video);
      }
    },
    { threshold: 0.25 }
  );

  document.querySelectorAll("[data-media]").forEach((el) => observer.observe(el));
}
