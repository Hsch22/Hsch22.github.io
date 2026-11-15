# Sicheng Hu

Personal research homepage at **https://hsch22.github.io/**.

An English-only personal desktop with publications, research interests, scholarships and grants, and links to ongoing work. Built with semantic HTML, CSS, and a small JavaScript enhancement layer. No package installation, framework, external font service, analytics, or runtime API is required.

## Develop

Requires Node.js 22 or later.

```sh
npm start
```

Open the printed local URL (default: http://127.0.0.1:4173). Rebuild and reload after editing. Set `PORT` to use another local port.

```sh
npm run build
npm run check
```

`dist/` is the complete deployment artifact. GitHub Actions builds and checks pull requests, and publishes pushes to `master` through GitHub Pages.

## Edit content

| Location | Purpose |
| --- | --- |
| `content/profile.json` | Profile links, publication metadata, BibTeX, and all seven honors |
| `site/index.html` | Homepage structure and personal introduction |
| `site/styles.css` | Responsive desktop, dark/light themes, and reduced-motion rules |
| `site/app.js` | Beijing clock, theme switch, keyboard search, paper dialogs, and copy-email action |
| `assets/` | Locally served images, font, and favicon |
| `docs/content-sources.md` | Content and image provenance |
| `magic/` | Existing standalone calculator, preserved without modifications |
| `deployment/evophys/redirects.json` | Existing EvoPhys redirect routes |

Publications are pre-rendered; the homepage content and research links are usable without JavaScript. Search opens with Command/Control K, supports arrow-key navigation and Enter, and closes with Escape. Native dialogs provide focus containment and return focus to their triggering controls. The default is dark; the theme button switches the current page to light.

Only explicitly selected directories enter `dist/`. Development scripts, deployment records, and provenance notes are not published.

## Existing URLs and cache migration

- `/magic/` and its assets/service worker are copied byte-for-byte.
- The previous `/#magic` navigation shortcut still opens `/magic/`. The calculator keeps its original portrait-only display and saved settings.
- Known `/evophys/` pages and the custom 404 retain path/query/fragment-preserving browser redirects to **https://evophys.com/**. These are browser redirects, not HTTP 301/308 responses; embedded assets and API clients should use the official domain directly.
- `/about/` points to the new profile section.
- `/sw.js` retires the old root-scoped blog service worker and clears only its known caches. It does not remove the calculator's `calcdm:` caches or worker.
- The inherited Hux articles, biography, photographs, advertisements, outdated build dependencies, and unrelated `huangxuan.me` CNAME were removed. They remain in Git history. The site does not publish someone else's posts under Sicheng's identity.

## Design and attribution

The personal-desktop composition is inspired by [hux.pro](https://hux.pro/), implemented independently for Sicheng's research and profile. This repository originally forked Hux Blog; its Apache 2.0 license is retained in `LICENSE`. Manrope is self-hosted under the SIL Open Font License in `assets/MANROPE-OFL.txt`. Research imagery and the profile image are credited in `docs/content-sources.md`.
