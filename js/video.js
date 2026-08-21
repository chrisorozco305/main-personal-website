// Click-to-load YouTube embed. Nothing from YouTube — script, iframe, cookies
// — loads until the button is actually clicked, the same lazy-by-default
// principle as js/media.js applied to a third-party embed instead of an
// owned clip. Swapping the whole button out (rather than mutating its
// children) avoids nesting an <iframe> inside interactive content.

document.querySelectorAll("[data-youtube-id]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const id = btn.dataset.youtubeId;
    const wrap = document.createElement("div");
    wrap.className = "video-feature-media video-feature-media--playing";

    const iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`;
    iframe.title = btn.getAttribute("aria-label") || "YouTube video player";
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    iframe.loading = "lazy";

    wrap.appendChild(iframe);
    btn.replaceWith(wrap);
  });
});
