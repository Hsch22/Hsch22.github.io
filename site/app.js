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
for (const button of document.querySelectorAll(".dialog-close")) {
  button.addEventListener("click", () => button.closest("dialog").close());
}
for (const dialog of document.querySelectorAll("dialog:not(.intro)")) {
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

const intro = document.querySelector("#about");
const introKey = "sicheng-intro-v2";
function openDetail(id) {
  const dialog = document.getElementById(id);
  if (!(dialog instanceof HTMLDialogElement))
    throw new Error(`Unknown dialog: ${id}`);
  document.querySelector("dialog[open]")?.close();
  dialog.showModal();
}
for (const button of document.querySelectorAll("[data-about]")) {
  button.addEventListener("click", () => openDetail("about"));
}
for (const button of document.querySelectorAll("[data-open]")) {
  button.addEventListener("click", () => openDetail(button.dataset.open));
}
document
  .querySelector("#enter-desktop")
  .addEventListener("click", () => intro.close());
intro.addEventListener("close", () => {
  sessionStorage.setItem(introKey, "seen");
  document.querySelector(".desktop-scene").classList.add("entering");
});
document
  .querySelector(".desktop-scene")
  .addEventListener("animationend", (event) => {
    if (event.animationName === "desktop-in")
      event.currentTarget.classList.remove("entering");
  });
const detailIds = new Set(["about", "honors", "contact"]);
document.addEventListener("click", (event) => {
  const link = event.target.closest('a[href^="#"]');
  if (link && detailIds.has(link.hash.slice(1))) {
    event.preventDefault();
    openDetail(link.hash.slice(1));
  }
});
window.addEventListener("hashchange", () => {
  if (detailIds.has(location.hash.slice(1))) openDetail(location.hash.slice(1));
});

const workTabs = [...document.querySelectorAll("[data-work]")];
function selectWork(tab) {
  for (const item of workTabs) {
    const selected = item === tab;
    item.setAttribute("aria-selected", String(selected));
    item.tabIndex = selected ? 0 : -1;
    document.getElementById(item.getAttribute("aria-controls")).hidden =
      !selected;
  }
  document.querySelector("#work-year").textContent =
    tab.dataset.work === "worldsimprobe" ? "2026" : "2025";
}
for (const tab of workTabs) {
  tab.addEventListener("click", () => selectWork(tab));
  tab.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const index = workTabs.indexOf(tab);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? workTabs.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + workTabs.length) %
            workTabs.length;
    selectWork(workTabs[next]);
    workTabs[next].focus();
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

// Open the introduction after all desktop controls have been initialized.
if (detailIds.has(location.hash.slice(1))) openDetail(location.hash.slice(1));
else if (!sessionStorage.getItem(introKey)) intro.showModal();
