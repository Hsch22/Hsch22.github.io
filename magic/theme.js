(() => {
  const key = "sicheng-appearance";
  const root = document.documentElement;
  const system = matchMedia("(prefers-color-scheme: dark)");
  let themedMedia = document.querySelectorAll('meta[name="theme-color"][data-theme]');
  let buttons = [];
  let storage;
  try {
    storage = window.localStorage;
  } catch (error) {
    if (error.name !== "SecurityError") throw error;
  }
  let preference = storage?.getItem(key);

  function paint() {
    const theme = preference === "light" || preference === "dark"
      ? preference
      : system.matches ? "dark" : "light";
    root.dataset.theme = theme;
    for (const item of themedMedia)
      item.media = item.dataset.theme === theme ? "all" : "not all";
    for (const button of buttons) {
      button.setAttribute("aria-pressed", String(theme === "dark"));
      button.hidden = false;
    }
  }

  // Set the scheme before the first stylesheet or body is parsed.
  paint();
  document.addEventListener("DOMContentLoaded", () => {
    buttons = document.querySelectorAll("[data-theme-toggle]");
    themedMedia = document.querySelectorAll('meta[name="theme-color"][data-theme], picture source[data-theme]');
    paint();
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest("[data-theme-toggle]")) return;
    preference = root.dataset.theme === "dark" ? "light" : "dark";
    paint();
    try {
      storage?.setItem(key, preference);
    } catch (error) {
      if (error.name !== "QuotaExceededError" && error.name !== "SecurityError") throw error;
    }
  });
  system.addEventListener("change", paint);
  window.addEventListener("storage", (event) => {
    if (event.storageArea === storage && (event.key === key || event.key === null)) {
      preference = storage.getItem(key);
      paint();
    }
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted && storage) {
      preference = storage.getItem(key);
      paint();
    }
  });
})();
