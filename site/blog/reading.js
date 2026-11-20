const editionLink = document.querySelector(".language-link");
const editionPath = editionLink.pathname;
function linkToSameSection() {
  editionLink.href = editionPath + location.hash;
}
linkToSameSection();
window.addEventListener("hashchange", linkToSameSection);
