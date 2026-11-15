import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = path.join(root, "dist");
const html = await readFile(path.join(dist, "index.html"), "utf8");
assert(!/\{\{[A-Z_]+\}\}/.test(html), "Unresolved template tokens");
assert(!/[\u3400-\u9fff]/u.test(html), "The homepage must be entirely English");
assert(
  !/Huang Xuan|huangxuan\.me|avatar-hux|huxpro@gmail/.test(html),
  "Inherited identity leaked into homepage",
);
assert.equal((html.match(/data-publication=/g) || []).length, 2);
assert.equal((html.match(/class="honor-name"/g) || []).length, 7);
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(ids.length, new Set(ids).size, "Duplicate HTML ids");
let checked = 0;
for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
  const url = match[1];
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
const redirectScript = await readFile(
  path.join(dist, "evophys-redirect.js"),
  "utf8",
);
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
  `Checks passed: ${checked} local links, English content, citations, 7 honors, redirects, Magic assets, and scoped service-worker retirement.`,
);
