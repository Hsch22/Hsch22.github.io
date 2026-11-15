// Preserve the actual entry point used by the previous site's navigation.
function openMagicPage() {
  if (window.location.hash === "#magic") {
    window.location.replace("/magic/");
  }
}
window.addEventListener("hashchange", openMagicPage);
openMagicPage();
