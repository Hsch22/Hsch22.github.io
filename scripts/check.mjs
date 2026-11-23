import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = path.join(root, "dist");
const html = await readFile(path.join(dist, "index.html"), "utf8");
const album = await readFile(path.join(dist, "photos/index.html"), "utf8");
const blog = await readFile(path.join(dist, "blog/index.html"), "utf8");
const essay = await readFile(path.join(dist, "blog/a-small-share/index.html"), "utf8");
const errorPage = await readFile(path.join(dist, "404.html"), "utf8");
assert(
  !/Huang Xuan|huangxuan\.me|avatar-hux|huxpro@gmail/.test(html),
  "Inherited identity leaked into homepage",
);
assert.equal((html.match(/data-publication=/g) || []).length, 2);
assert.equal((html.match(/class="honor-name"/g) || []).length, 7);
const photoCount = [...album.matchAll(/class="photo-link\b/g)].length;
assert(photoCount > 0, "The camera roll must contain photographs");
assert.equal((album.match(/href="[^"]+\/large\.webp"/g) || []).length, photoCount);
assert(!album.includes("<figcaption"), "The camera roll should show only photographs");
let checked = 0;
for (const [name, page, lang] of [
  ["homepage", html, "en"], ["camera roll", album, "en"], ["404", errorPage, "en"],
  ["blog", blog, "en"], ["essay", essay, "en"],
]) {
  assert(!/\{\{[A-Z_]+\}\}/.test(page), `Unresolved template tokens in ${name}`);
  assert(page.includes(`<html lang="${lang}">`), `Incorrect page language in ${name}`);
  assert(page.includes('src="/theme.js"') && page.includes("data-theme-toggle"), `Missing appearance control in ${name}`);
  assert(!/[\u3400-\u9fff]/u.test(page), `Unexpected Chinese text in ${name}`);
  assert(!page.includes("/blog/zh/"), `Removed language route remains in ${name}`);
  const ids = [...page.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, new Set(ids).size, `Duplicate HTML ids in ${name}`);
  const urls = [...page.matchAll(/\b(href|src|srcset)="([^"]+)"/g)].flatMap(([, attribute, value]) =>
    attribute === "srcset" ? value.split(",").map((candidate) => candidate.trim().split(/\s+/)[0]) : [value]);
  for (const url of urls) {
    if (url.startsWith("#"))
      assert(ids.includes(url.slice(1)), `Missing anchor: ${url}`);
    else if (url.startsWith("/")) {
      const pathname = url.split(/[?#]/)[0];
      const file =
        path.join(dist, pathname) + (pathname.endsWith("/") ? "index.html" : "");
      assert((await stat(file)).isFile(), `Missing asset: ${url}`);
      checked++;
    } else assert(/^(https:|mailto:)/.test(url), `Unsupported URL: ${url}`);
  }
  assert(!page.includes("language-link"), `Removed edition switch remains in ${name}`);
}
const equations = (page) => [...page.matchAll(/<math\b[\s\S]*?<\/math\s*>/g)]
  .map(([math]) => math.replace(/aria-label="[^"]*"/g, "").replace(/\s+/g, ""));
assert.equal(equations(essay).length, 2);
assert.equal(essay.match(/data-issue="(\d+)"/)[1], "7");
assert(!(await readdir(path.join(dist, "blog"))).includes("zh"), "Removed Chinese blog remains in the build");
const redirectScript = await readFile(
  path.join(dist, "evophys-redirect.js"),
  "utf8",
);
const magicEntry = await readFile(path.join(dist, "magic-entry.js"), "utf8");
for (const hash of ["#magic", "#honors", "#research", "#magic-other", ""]) {
  let destination = null;
  let hashListener;
  const location = { hash, replace: (url) => { destination = url; } };
  vm.runInNewContext(magicEntry, {
    window: { location, addEventListener: (name, fn) => {
      assert.equal(name, "hashchange");
      hashListener = fn;
    } },
  });
  assert.equal(destination, hash === "#magic" ? "/magic/" : null);
  destination = null;
  location.hash = "#magic";
  hashListener();
  assert.equal(destination, "/magic/");
}
for (const [pathname, search, hash, expected] of [
  [
    "/evophys/WorldSimProbe/",
    "?mode=demo",
    "#results",
    "https://evophys.com/WorldSimProbe/?mode=demo#results",
  ],
  ["/evophys", "", "", "https://evophys.com/"],
  [
    "/evophys/unknown/path",
    "?a=1",
    "#demo",
    "https://evophys.com/unknown/path?a=1#demo",
  ],
  [
    "/evophys//outside.example/path",
    "",
    "",
    "https://evophys.com//outside.example/path",
  ],
  ["/magic/", "", "", null],
  ["/not-found", "", "", null],
  ["/evophys-other", "", "", null],
]) {
  let actual = null;
  vm.runInNewContext(redirectScript, {
    URL,
    window: {
      location: {
        pathname,
        search,
        hash,
        replace: (url) => {
          actual = url;
        },
      },
    },
  });
  assert.equal(actual, expected, `Redirect failed for ${pathname}`);
}
for (const entry of await readdir(path.join(root, "magic"))) {
  assert.deepEqual(
    await readFile(path.join(root, "magic", entry)),
    await readFile(path.join(dist, "magic", entry)),
    `Magic asset changed in build: ${entry}`,
  );
}
assert.deepEqual(await readFile(path.join(dist, "theme.js")), await readFile(path.join(dist, "magic/theme.js")));
// Exercise worker retirement with a Magic cache and an unrelated cache present.
const handlers = new Map();
const deleted = [];
const navigated = [];
let unregistered = false;
vm.runInNewContext(await readFile(path.join(dist, "sw.js"), "utf8"), {
  URL,
  self: {
    addEventListener: (type, fn) => handlers.set(type, fn),
    skipWaiting: async () => {},
    registration: {
      unregister: async () => {
        unregistered = true;
      },
    },
    clients: {
      matchAll: async () => [
        {
          url: "https://hsch22.github.io/",
          navigate: async (url) => navigated.push(url),
        },
        {
          url: "https://hsch22.github.io/magic/",
          navigate: async (url) => navigated.push(url),
        },
      ],
    },
  },
  caches: {
    keys: async () => [
      "main-precache-then-runtime",
      "runtime",
      "calcdm:https://hsch22.github.io/magic/:v13",
      "unrelated-cache",
    ],
    delete: async (name) => {
      deleted.push(name);
    },
  },
});
await new Promise((resolve, reject) =>
  handlers.get("activate")({
    waitUntil: (promise) => promise.then(resolve, reject),
  }),
);
assert(unregistered);
assert.deepEqual(deleted, ["main-precache-then-runtime", "runtime"]);
assert.deepEqual(navigated, ["https://hsch22.github.io/"]);
assert(
  !(await readdir(dist)).includes("CNAME"),
  "Old template domain must not be published",
);
console.log(
  `Checks passed: ${checked} local links, ${photoCount} photographs, the English blog and formulas, appearance controls, citations, 7 honors, redirects, Magic assets, and scoped service-worker retirement.`,
);
