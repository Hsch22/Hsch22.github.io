# EvoPhys transition deployment

Public URLs:

- https://hsch22.github.io/evophys/
- https://hsch22.github.io/evophys/WorldSimProbe/

This is the complete 1,072-file static snapshot from 2026-11-01, mounted after
Jekyll builds the personal blog. Its media files, including both original
1920×1080, 60 fps homepage videos, are copied byte for byte. The archive is a
public GitHub Release asset because the largest video exceeds Git's file limit.
`snapshot.json` pins the archive's size, SHA-256, and the manifest's SHA-256.
The restore step verifies every extracted file and rejects unexpected members.

Only the generated mirror is adapted: canonical/social/sitemap URLs and the home
link use `/evophys/`; the unavailable Task 3 inference controls are disabled and
clearly labelled. Recorded demos and the browser-based Task 1/2 interactions are
preserved. This static host does not run `/task3-live/` or proxy the GPU backend.
The blog's root service worker bypasses `/evophys/` so video Range requests reach
GitHub Pages unchanged. `/magic/` and its own service worker are preserved.

## Build or preview

Use Python 3.9 or newer. Reuse the existing archive whenever it is available:

```sh
bundle exec jekyll build
python3 scripts/prepare-evophys.py \
  --archive /absolute/path/evophys-static-20261101.tar.gz \
  --destination _site/evophys
python3 -m http.server 4000 --directory _site
```

The destination must not already exist. `--download` retrieves the pinned release
asset only when the archive path is absent; an existing file with the wrong size
or hash fails explicitly. CI uses a fresh runner temporary path. Do not place the
archive in the repository or lower video resolution to fit it into Git.

## Update or retire

To update the mirror, create and validate a new static snapshot from the EvoPhys
source repository, publish it under a new release tag, and update both manifest
and receipt together. Review the strict text adaptations in
`scripts/prepare-evophys.py` for the new snapshot, then push to `master` and wait
for both Pages jobs to succeed. Check the two public URLs, video playback and
HTTP Range responses, the personal homepage navigation, and `/magic/`.

To retire the transition, remove the workflow's restore step and EvoPhys nav link
in one commit. A fresh Jekyll build will no longer contain `_site/evophys`. Keep
the pinned release as a migration backup until the final site has been verified.
No domain or DNS changes are required for this temporary URL.
