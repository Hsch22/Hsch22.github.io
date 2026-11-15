const root = document.documentElement;
const themeButton = document.querySelector(".theme-toggle");

function applyTheme(theme) {
  if (!["light", "dark"].includes(theme))
    throw new Error(`Unsupported theme: ${theme}`);
  root.dataset.theme = theme;
  themeButton.setAttribute(
    "aria-label",
    `Switch to ${theme === "dark" ? "light" : "dark"} theme`,
  );
  document.querySelector('meta[name="theme-color"]').content =
    theme === "dark" ? "#171c1d" : "#f0f0e9";
}

themeButton.addEventListener("click", () => {
  applyTheme(root.dataset.theme === "dark" ? "light" : "dark");
});

const timeFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Shanghai",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const dateFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Shanghai",
  weekday: "short",
  month: "short",
  day: "numeric",
});
function updateClock() {
  const now = new Date();
  const clock = document.querySelector("#beijing-time");
  clock.textContent = timeFormat.format(now);
  clock.dateTime = now.toISOString();
  document.querySelector("#beijing-date").textContent = dateFormat.format(now);
  const localHour = now.getHours();
  document.querySelector("#greeting").textContent =
    localHour < 12
      ? "Good morning"
      : localHour < 18
        ? "Good afternoon"
        : "Good evening";
}
updateClock();
setInterval(updateClock, 30_000);

const searchDialog = document.querySelector("#search-dialog");
const searchInput = document.querySelector("#site-search");
const searchItems = [...document.querySelectorAll("#search-results li")];
function filterSearch() {
  const query = searchInput.value.trim().toLocaleLowerCase("en");
  for (const item of searchItems)
    item.hidden = !item.textContent.toLocaleLowerCase("en").includes(query);
  document.querySelector("#search-empty").hidden = searchItems.some(
    (item) => !item.hidden,
  );
}
function openSearch() {
  if (document.querySelector("dialog[open]")) return;
  searchInput.value = "";
  filterSearch();
  searchDialog.showModal();
  searchInput.focus();
}
document.querySelector("#open-search").addEventListener("click", openSearch);
searchInput.addEventListener("input", filterSearch);
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    if (searchDialog.open) searchDialog.close();
    else openSearch();
  }
});
searchDialog.addEventListener("keydown", (event) => {
  const links = searchItems
    .filter((item) => !item.hidden)
    .map((item) => item.querySelector("a"));
  if (
    event.key === "Enter" &&
    document.activeElement === searchInput &&
    links.length
  ) {
    event.preventDefault();
    links[0].click();
  }
  if (!["ArrowDown", "ArrowUp"].includes(event.key) || !links.length) return;
  event.preventDefault();
  const index = links.indexOf(document.activeElement);
  const next =
    event.key === "ArrowDown"
      ? (index + 1) % links.length
      : index < 0
        ? links.length - 1
        : (index - 1 + links.length) % links.length;
  links[next].focus();
});
document.querySelector("#search-results").addEventListener("click", (event) => {
  if (event.target.closest("a")) searchDialog.close();
});

for (const button of document.querySelectorAll("[data-paper]")) {
  button.addEventListener("click", () =>
    document.getElementById(`paper-${button.dataset.paper}`).showModal(),
  );
}
for (const dialog of document.querySelectorAll("dialog")) {
  dialog
    .querySelector(".dialog-close")
    .addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    const rect = dialog.getBoundingClientRect();
    if (
      event.target === dialog &&
      (event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom)
    )
      dialog.close();
  });
}

document
  .querySelector("#copy-email")
  .addEventListener("click", async (event) => {
    const button = event.currentTarget;
    const email = document.querySelector(".contact-actions a").textContent;
    try {
      await navigator.clipboard.writeText(email);
      document.querySelector("#copy-status").textContent =
        "Email address copied.";
      button.textContent = "✓";
      button.title = "Copied!";
      button.setAttribute("aria-label", "Email address copied");
    } catch {
      document.querySelector("#copy-status").textContent =
        `Copy was blocked. You can select the email address: ${email}`;
      button.textContent = "!";
      button.title = "Copy blocked — select the email text";
      button.setAttribute(
        "aria-label",
        "Copy blocked. Select the email address to copy it.",
      );
    }
  });

// The previous Jekyll homepage installed a root-scoped service worker. Retire
// only that exact worker; the separate /magic/ offline app keeps its worker.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then(async (registrations) => {
      for (const registration of registrations) {
        const worker =
          registration.active ||
          registration.waiting ||
          registration.installing;
        if (
          registration.scope === `${location.origin}/` &&
          worker &&
          new URL(worker.scriptURL).pathname === "/sw.js"
        ) {
          await registration.update();
        }
      }
    })
    .catch((error) =>
      console.error(
        "Could not update the retired homepage service worker:",
        error,
      ),
    );
}
