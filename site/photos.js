const links = Array.from(document.querySelectorAll(".photo-link"));
const viewer = document.querySelector("#photo-viewer");
const stage = viewer.querySelector(".viewer-stage");
const position = viewer.querySelector("#viewer-position");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let current = 0;
let requestNumber = 0;

const arrivals = new IntersectionObserver((entries, observer) => {
  for (const { target, isIntersecting } of entries) {
    if (!isIntersecting) continue;
    target.classList.replace("awaiting-reveal", "arriving");
    observer.unobserve(target);
  }
});

async function showPhoto(index) {
  current = (index + links.length) % links.length;
  const request = ++requestNumber;
  const link = links[current];
  const image = new Image();
  image.alt = link.querySelector("img").alt;
  image.src = link.href;
  try {
    await image.decode();
  } catch {
    if (request === requestNumber && viewer.open) {
      stage.textContent = "This photograph could not be loaded.";
      position.textContent = stage.textContent;
    }
    return;
  }
  // A slow download must not replace a later selection or reopen a closed view.
  if (request !== requestNumber || !viewer.open) return;
  const previous = stage.lastElementChild;
  stage.replaceChildren(image);
  position.textContent = `Photograph ${current + 1} of ${links.length}`;
  if (reducedMotion.matches) return;
  if (previous) {
    previous.setAttribute("aria-hidden", "true");
    stage.prepend(previous);
    const outgoing = previous.animate(
      [{ opacity: getComputedStyle(previous).opacity }, { opacity: 0 }],
      { duration: 380, fill: "forwards" },
    );
    outgoing.onfinish = () => previous.remove();
  }
  image.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: 400,
    easing: "ease-out",
  });
}

links.forEach((link, index) => {
  link.classList.add("awaiting-reveal");
  arrivals.observe(link);
  link.setAttribute("aria-haspopup", "dialog");
  link.addEventListener("click", (event) => {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    )
      return;
    event.preventDefault();
    viewer.showModal();
    showPhoto(index);
  });
});
viewer
  .querySelector("#viewer-close")
  .addEventListener("click", () => viewer.close());
viewer
  .querySelector("#viewer-previous")
  .addEventListener("click", () => showPhoto(current - 1));
viewer
  .querySelector("#viewer-next")
  .addEventListener("click", () => showPhoto(current + 1));
viewer.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  showPhoto(current + (event.key === "ArrowLeft" ? -1 : 1));
});
viewer.addEventListener("close", () => {
  if (viewer.open) return;
  requestNumber++;
  stage.replaceChildren();
  position.textContent = "";
});
