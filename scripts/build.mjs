import { readFile, writeFile, mkdir, rm, cp } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { buildAlbum } from "./album.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const out = path.join(root, "dist");
const profile = JSON.parse(
  await readFile(path.join(root, "content/profile.json"), "utf8"),
);
const redirects = JSON.parse(
  await readFile(path.join(root, "deployment/evophys/redirects.json"), "utf8"),
);
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

for (const key of [
  "name",
  "affiliation",
  "email",
  "scholar",
  "github",
  "updated",
]) {
  if (typeof profile[key] !== "string" || !profile[key])
    throw new Error(`Missing profile field: ${key}`);
}
if (
  !Array.isArray(profile.publications) ||
  !profile.publications.length ||
  !Array.isArray(profile.honors)
)
  throw new Error("Publications and honors must be arrays.");
const ids = new Set();
for (const publication of profile.publications) {
  if (!/^[a-z0-9-]+$/.test(publication.id) || ids.has(publication.id))
    throw new Error("Invalid or duplicate publication id.");
  ids.add(publication.id);
  for (const key of [
    "title",
    "authors",
    "summary",
    "paper",
    "image",
    "imageAlt",
    "bibtex",
    "name",
    "venue",
  ]) {
    if (typeof publication[key] !== "string" || !publication[key])
      throw new Error(`Missing publication field: ${publication.id}.${key}`);
  }
  if (
    !Number.isInteger(publication.year) ||
    new URL(publication.paper).protocol !== "https:"
  )
    throw new Error(`Invalid publication: ${publication.id}`);
  if (
    publication.project !== null &&
    new URL(publication.project).protocol !== "https:"
  )
    throw new Error("Project links must use HTTPS.");
}
for (const honor of profile.honors) {
  if (
    !honor.name ||
    !honor.institution ||
    (honor.year !== null && typeof honor.year !== "string")
  )
    throw new Error("Invalid honor entry.");
}

const authors = (text) =>
  escape(text).replaceAll("Sicheng Hu*", "<strong>Sicheng Hu*</strong>");
const paperLinks = (p) =>
  `<a href="${escape(p.paper)}">Paper ↗</a>${p.project ? `<a href="${escape(p.project)}">Project ↗</a>` : ""}`;
const publications = profile.publications
  .map(
    (p) => `<article class="publication" data-publication="${escape(p.id)}">
  <a class="publication-link" href="${escape(p.paper)}">${escape(p.name)}</a>
  <small class="publication-year">${p.year}</small>
  <button class="publication-details" type="button" data-paper="${escape(p.id)}" aria-haspopup="dialog" aria-controls="paper-${escape(p.id)}" aria-label="Details and citation for ${escape(p.name)}"><span aria-hidden="true">↗</span></button>
</article>`,
  )
  .join("\n");
const paperDialogs = profile.publications
  .map(
    (
      p,
    ) => `<dialog class="paper-dialog" id="paper-${escape(p.id)}" aria-labelledby="title-${escape(p.id)}">
  <div class="dialog-heading"><h2>${escape(p.name)}</h2><button class="dialog-close icon-button" type="button" aria-label="Close ${escape(p.name)} details">×</button></div>
  <div class="publication-meta"><span>${p.year}</span><span>· ${escape(p.venue)}</span><span>· * Equal contribution</span></div>
  <h3 id="title-${escape(p.id)}">${escape(p.title)}</h3>
  <p class="full-authors">${authors(p.authors)}</p>
  <p class="paper-summary">${escape(p.summary)}</p>
  <div class="publication-actions">${paperLinks(p)}<a href="/citations/${escape(p.id)}.bib" download>Download BibTeX ↓</a></div>
  <details><summary>View BibTeX</summary><pre>${escape(p.bibtex)}</pre></details>
  <img class="paper-figure" src="${escape(p.image)}" alt="${escape(p.imageAlt)}" loading="lazy">
</dialog>`,
  )
  .join("\n");
const honors = profile.honors
  .map(
    (h) =>
      `<li><div>${h.year ? `<div class="honor-meta"><span>${escape(h.year)}</span></div>` : ""}<h3 class="honor-name">${escape(h.name)}</h3><p class="honor-institution">${escape(h.institution)}</p></div></li>`,
  )
  .join("\n");
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
const album = await buildAlbum(root, out, escape);
const replacements = {
  ...album,
  NAME: escape(profile.name),
  AFFILIATION: escape(profile.affiliation),
  EMAIL: escape(profile.email),
  SCHOLAR: escape(profile.scholar),
  GITHUB: escape(profile.github),
  PUBLICATIONS: publications,
  HONORS: honors,
  HONORS_PREVIEW: profile.honors
    .slice(0, 3)
    .map(
      (h) =>
        `<li class="honor-preview"><span>${escape(h.name)}</span>${h.year ? `<small>${escape(h.year)}</small>` : ""}</li>`,
    )
    .join("\n"),
  PAPER_DIALOGS: paperDialogs,
  PERSON_JSON: JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    url: "https://hsch22.github.io/",
    image: "https://hsch22.github.io/assets/sicheng-hu.jpg",
    affiliation: { "@type": "Organization", name: profile.affiliation },
    sameAs: [profile.scholar, profile.github],
    knowsAbout: ["World models", "Embodied intelligence", "Robot learning"],
  }).replaceAll("<", "\\u003c"),
};
async function renderPage(source, destination) {
  const template = await readFile(path.join(root, "site", source), "utf8");
  const html = template.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => {
    if (!(key in replacements))
      throw new Error(`Unknown template token: ${key}`);
    return replacements[key];
  });
  await writeFile(path.join(out, destination), html);
}
await renderPage("index.html", "index.html");
await renderPage("photos.html", "photos/index.html");
await Promise.all(
  [
    "styles.css",
    "photos.css",
    "app.js",
    "photos.js",
    "evophys-redirect.js",
    "magic-entry.js",
  ].map((file) => cp(path.join(root, "site", file), path.join(out, file))),
);
await cp(path.join(root, "site/retire-sw.js"), path.join(out, "sw.js"));
await cp(path.join(root, "assets"), path.join(out, "assets"), {
  recursive: true,
});
await cp(path.join(root, "magic"), path.join(out, "magic"), {
  recursive: true,
});
await mkdir(path.join(out, "citations"));
await Promise.all(
  profile.publications.map((p) =>
    writeFile(path.join(out, "citations", `${p.id}.bib`), p.bibtex + "\n"),
  ),
);
if (
  redirects.origin !== "https://evophys.com" ||
  redirects.prefix !== "/evophys"
)
  throw new Error("Unexpected EvoPhys redirect configuration.");
for (const route of redirects.routes) {
  if (
    !route.source.startsWith("/evophys/") ||
    route.source.includes("..") ||
    route.target !== `https://evophys.com${route.source.slice(8)}`
  )
    throw new Error("Unsupported redirect route.");
  const relative =
    route.source.slice(1) + (route.source.endsWith("/") ? "index.html" : "");
  const destination = path.join(out, relative);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(
    destination,
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>EvoPhys has moved</title><link rel="canonical" href="${escape(route.target)}"><script src="/evophys-redirect.js"></script></head><body><p>EvoPhys has moved to <a href="${escape(route.target)}">${escape(route.target)}</a>.</p></body></html>`,
  );
}
await writeFile(
  path.join(out, "404.html"),
  `<!doctype html><html lang="en" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Page not found — Sicheng Hu</title><link rel="icon" href="/assets/favicon.svg?v=sun"><link rel="stylesheet" href="/styles.css"><script src="/evophys-redirect.js"></script></head><body class="error-page"><main><h1>Lost in space?</h1><p>This page doesn't exist. Let's get you back home.</p><a href="/">Back to Sicheng's space ↗</a></main></body></html>`,
);
await mkdir(path.join(out, "about"));
await writeFile(
  path.join(out, "about/index.html"),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/#about"><title>About Sicheng Hu</title><link rel="icon" href="/assets/favicon.svg?v=sun"><link rel="canonical" href="https://hsch22.github.io/#about"></head><body><a href="/#about">About Sicheng Hu</a></body></html>`,
);
await writeFile(path.join(out, ".nojekyll"), "");
await writeFile(
  path.join(out, "robots.txt"),
  "User-agent: *\nAllow: /\nSitemap: https://hsch22.github.io/sitemap.xml\n",
);
await writeFile(
  path.join(out, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://hsch22.github.io/</loc><lastmod>${escape(profile.updated)}</lastmod></url><url><loc>https://hsch22.github.io/photos/</loc></url></urlset>`,
);
console.log(
  `Built dist/: ${profile.publications.length} publications, ${profile.honors.length} honors, ${album.PHOTO_COUNT} photographs, ${redirects.routes.length} preserved EvoPhys redirects, and Magic.`,
);
