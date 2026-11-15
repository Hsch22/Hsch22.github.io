# EvoPhys redirect deployment

Since 2026-11-11, the temporary `/evophys/` mirror redirects to the official
site at https://evophys.com. The personal homepage and `/magic/` remain on GitHub Pages.
The EvoPhys navigation entry now links directly to the official homepage.

| Old URL | Destination |
| --- | --- |
| `/evophys/` | `https://evophys.com/` |
| `/evophys/WorldSimProbe/` | `https://evophys.com/WorldSimProbe/` |
| `/evophys/mwm_v1.html` | `https://evophys.com/mwm_v1.html` |
| Other `/evophys/…` URLs | The same path beneath `https://evophys.com/` |

The static builder creates small redirect pages for all six HTML documents in the original
snapshot. `site/evophys-redirect.js` removes only the `/evophys` prefix,
keeps the query string and fragment, and uses `location.replace` so Back does
not loop through the transition page. The destination origin is fixed.

The existing custom 404 page includes the same script only in its head. This
allows other old links, including direct asset URLs, to navigate to the matching
production URL. Non-EvoPhys paths retain the personal site's existing 404 page.
The old root service worker is retired by `site/retire-sw.js`. The independent
`/magic/` service worker and its caches remain unchanged.

These are browser redirects. Known HTML routes return a small HTML page;
other retired paths initially return GitHub Pages' custom 404 and then navigate.
They are not server-side HTTP 301/308 redirects. Embedded media and API requests
do not execute HTML redirects and should use the official URLs directly.

## Build and verify

```sh
npm run build
npm run check
```

There is no post-build archive restore or media download. The Pages workflow
builds and deploys `dist/` from `master`. Verify the homepage and WorldSimProbe
redirects in a browser, including a query string and fragment; check a direct
HTML route and a route handled by the custom 404. Also check `/`, `/magic/`,
and an unrelated missing page to confirm the redirect remains scoped.

## Historical snapshot

`static-manifest.json`, `snapshot.json`, and the public Release
[evophys-transition-20261103](https://github.com/Hsch22/Hsch22.github.io/releases/tag/evophys-transition-20261103)
remain available as the verified static backup. The deployment no longer
fetches its 498,842,246-byte archive or copies its media. The archive and original
1080p/60fps videos are unchanged. The previous mirror implementation is retained
in Git commit `c55da0bbd3b5d9a9d9d4ec075e76ac016dc14caa`.

No DNS or primary-server changes are needed for these redirects. The independent
live-inference backend is managed separately from GitHub Pages.
