#!/usr/bin/env python3
"""Restore the pinned EvoPhys snapshot and mount it under /evophys/."""

import argparse
import json
from pathlib import Path
import shutil
import subprocess
import sys
from urllib.request import Request, urlopen


REPO = Path(__file__).resolve().parent.parent
METADATA = REPO / "deployment/evophys"
PUBLIC_ORIGIN = "https://hsch22.github.io/evophys/"


def replace_once(text, old, new, label):
    if text.count(old) != 1:
        raise ValueError("Unexpected snapshot content: " + label)
    return text.replace(old, new, 1)


def prepare(archive, destination, download):
    snapshot = json.loads((METADATA / "snapshot.json").read_text())
    if snapshot["mount_path"] != "/evophys/":
        raise ValueError("Unsupported mount path")
    if download and not archive.exists():
        archive.parent.mkdir(parents=True, exist_ok=True)
        request = Request(snapshot["archive"]["download_url"],
                          headers={"User-Agent": "EvoPhys-Pages"})
        with urlopen(request, timeout=120) as response, archive.open("xb") as output:
            shutil.copyfileobj(response, output, 1024 * 1024)
    if not archive.is_file():
        raise ValueError("Archive missing; provide an existing copy or use --download")

    subprocess.run([
        sys.executable, str(REPO / "scripts/restore-static.py"), "restore",
        "--archive", str(archive), "--root", str(destination),
        "--manifest", str(METADATA / "static-manifest.json"),
        "--receipt", str(METADATA / "snapshot.json"),
    ], check=True)

    # The original bytes are verified above. Adapt only the temporary mirror.
    for name in ("index.html", "WorldSimProbe/index.html", "sitemap.xml", "robots.txt"):
        path = destination / name
        text = path.read_text()
        if "https://evophys.com/" not in text:
            raise ValueError("Expected origin missing from " + name)
        path.write_text(text.replace("https://evophys.com/", PUBLIC_ORIGIN))

    path = destination / "index.html"
    path.write_text(replace_once(
        path.read_text(), 'href="/" aria-label="EvoPhys AI home"',
        'href="./" aria-label="EvoPhys AI home"', "homepage brand link"))

    path = destination / "WorldSimProbe/index.html"
    text = path.read_text()
    replacements = [
        ('    <meta name="task3-endpoint" content="/task3-live" />\n', "", "live endpoint"),
        ('id="live-connect" type="button"', 'id="live-connect" type="button" disabled', "Connect button"),
        ('id="live-connect-label">Connect</span>', 'id="live-connect-label">Unavailable</span>', "Connect label"),
        ('id="live-status-text">Offline</strong>', 'id="live-status-text">Unavailable</strong>', "live status"),
        ('<option>Connect to load scenes</option>', '<option>Live demo unavailable</option>', "scene label"),
        ('<strong>Connect to begin</strong>', '<strong>Live demo temporarily unavailable</strong>', "simulator message"),
        ('id="live-model-readout">Ready</span>', 'id="live-model-readout">Unavailable</span>', "model readout"),
        ('id="live-model-phase">Model ready</span>', 'id="live-model-phase">Unavailable</span>', "model phase"),
        ('id="live-model-empty-title">Waiting for an action</strong>',
         'id="live-model-empty-title">Live demo temporarily unavailable</strong>', "model title"),
        ('id="live-model-empty-copy">The selected model will run with the same trace.</span>',
         'id="live-model-empty-copy">The recorded demonstrations remain available.</span>', "model explanation"),
    ]
    for old, new, label in replacements:
        text = replace_once(text, old, new, label)
    path.write_text(text)

    path = destination / "WorldSimProbe/script.js"
    path.write_text(replace_once(
        path.read_text(), "\ninitializeLiveDemo();\n",
        "\n// Live inference is explicitly unavailable on this temporary static mirror.\n",
        "live backend initialization"))

    print(json.dumps({
        "source_snapshot": snapshot["source_snapshot"],
        "files_restored": snapshot["file_count"],
        "destination": str(destination),
        "public_url": PUBLIC_ORIGIN,
        "original_media_preserved": True,
        "live_backend_connected": False,
    }, indent=2))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", type=Path, required=True)
    parser.add_argument("--destination", type=Path, required=True)
    parser.add_argument("--download", action="store_true",
                        help="Download the pinned asset only if no local archive exists")
    args = parser.parse_args()
    prepare(args.archive.resolve(), args.destination.resolve(), args.download)


if __name__ == "__main__":
    main()
