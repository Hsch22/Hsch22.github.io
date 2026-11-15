# Sicheng Hu

Personal research homepage at **https://hsch22.github.io/**.

An English-only personal desktop with a full-screen introduction, compact translucent widgets, publications, research interests, scholarships and grants, and selected work. Built with semantic HTML, CSS, and JavaScript. No package installation, framework, external font service, analytics, or runtime API is required.

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

| Location                            | Purpose                                                                                                                |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `content/profile.json`              | Profile links, publication metadata, BibTeX, and all seven honors                                                      |
| `site/index.html`                   | Homepage structure and personal introduction                                                                           |
| `site/styles.css`                   | Responsive desktop, dark/light themes, and reduced-motion rules                                                        |
| `site/app.js`                       | Session introduction, Beijing clock, theme switch, keyboard search, dialogs, selected-work tabs, and copy-email action |
| `assets/`                           | Locally served images, fonts, licenses, and favicon                                                                    |
| `docs/content-sources.md`           | Content and image provenance                                                                                           |
| `magic/`                            | Existing standalone calculator, preserved without modifications                                                        |
| `deployment/evophys/redirects.json` | Existing EvoPhys redirect routes                                                                                       |

The full-screen introduction appears on the first visit in a browser session and can be reopened through the About controls. The Enter button or Escape key reveals the desktop. The default theme is dark, with translucent compact widgets and serif Newsreader headings; the theme button switches the current page to light.

Publication rows link directly to papers, with separate buttons opening full metadata, figures, and BibTeX dialogs. The honors widget previews three awards; its dialog contains all seven. Selected-work covers use the official WorldSimProbe visualization and a real robot photograph from the CIFT paper. Selected-work tabs support Left/Right arrows, Home, and End. Search opens with Command/Control K, supports arrow-key navigation and Enter, and closes with Escape. Native modal dialogs contain keyboard focus and restore it when dismissed.

JavaScript is required for the introduction, dialogs, search, work-tab switching, clock, and theme controls. Without JavaScript, the desktop and its direct public links remain available, including both paper links, Scholar, GitHub, and the WorldSimProbe project. Dialog content and the second selected-work panel are not available through those inactive controls.

Only explicitly selected directories enter `dist/`. Development scripts, deployment records, and provenance notes are not published.

## Existing URLs and cache migration

- `/magic/` and its assets/service worker are copied byte-for-byte.
- The previous `/#magic` navigation shortcut still opens `/magic/`. The calculator keeps its original portrait-only display and saved settings.
- Known `/evophys/` pages and the custom 404 retain path/query/fragment-preserving browser redirects to **https://evophys.com/**. These are browser redirects, not HTTP 301/308 responses; embedded assets and API clients should use the official domain directly.
- `/about/` redirects to `/#about`, which opens the introduction dialog when JavaScript is enabled.
- `/sw.js` retires the old root-scoped blog service worker and clears only its known caches. It does not remove the calculator's `calcdm:` caches or worker.
- The inherited Hux articles, biography, photographs, advertisements, outdated build dependencies, and unrelated `huangxuan.me` CNAME were removed. They remain in Git history. The site does not publish someone else's posts under Sicheng's identity.

## Design and attribution

The full-screen introduction and personal-desktop composition are inspired by [hux.pro](https://hux.pro/), implemented independently for Sicheng's research and profile. This repository originally forked Hux Blog; its Apache 2.0 license is retained in `LICENSE`. Newsreader and Manrope are self-hosted under the SIL Open Font License, included as `assets/NEWSREADER-OFL.txt` and `assets/MANROPE-OFL.txt`. Research imagery and the profile image are credited in `docs/content-sources.md`.
