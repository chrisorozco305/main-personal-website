// Click-to-copy for [data-copy] buttons (currently just the hero email line).
// A real mailto: link would force-open whatever mail client is registered on
// the visitor's machine, which most people don't want — copying the address
// and letting them paste it wherever they actually write email is friendlier.

document.querySelectorAll("[data-copy]").forEach((btn) => {
  const toast = btn.parentElement.querySelector(".copy-toast");
  let hideTimer = null;

  btn.addEventListener("click", async () => {
    const value = btn.dataset.copy;

    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard API can fail (denied permission, insecure context) — fall
      // back to the one thing guaranteed to work everywhere.
      window.location.href = `mailto:${value}`;
      return;
    }

    if (!toast) return;
    clearTimeout(hideTimer);
    toast.classList.add("visible");
    hideTimer = setTimeout(() => toast.classList.remove("visible"), 1500);
  });
});
