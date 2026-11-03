#!/usr/bin/env python3
"""Verify, package, or restore the complete deployed static website (Python 3.9+)."""

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path, PurePosixPath


REPO = Path(__file__).resolve().parent.parent


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def read_manifest(path):
    manifest = json.loads(path.read_text())
    if manifest.get("schema") != 1 or not manifest.get("files"):
        raise ValueError("Unsupported or empty static-file manifest")
    seen = set()
    for entry in manifest["files"]:
        name = entry["path"]
        parts = PurePosixPath(name)
        if (not name or parts.is_absolute() or ".." in parts.parts
                or str(parts) != name or "\\" in name or name in seen):
            raise ValueError("Unsafe or duplicate manifest path: " + name)
        if not isinstance(entry["size"], int) or entry["size"] < 0:
            raise ValueError("Invalid file size: " + name)
        digest = entry["sha256"]
        if len(digest) != 64 or any(c not in "0123456789abcdef" for c in digest):
            raise ValueError("Invalid SHA-256: " + name)
        seen.add(name)
    return manifest


def checked_path(root, name):
    path = root / name
    if root.is_symlink() or any(p.is_symlink() for p in [path, *path.parents]):
        raise ValueError("Symlinks are not supported: " + str(path))
    return path


def verify(root, manifest):
    errors = []
    for entry in manifest["files"]:
        path = checked_path(root, entry["path"])
        if not path.is_file():
            errors.append("Missing: " + entry["path"])
        elif path.stat().st_size != entry["size"] or sha256(path) != entry["sha256"]:
            errors.append("Content mismatch: " + entry["path"])
    if errors:
        raise ValueError("\n".join(errors))
    print("Verified %d files / %d bytes" % (
        len(manifest["files"]), sum(e["size"] for e in manifest["files"])))


def missing_files(root, manifest):
    missing = []
    for entry in manifest["files"]:
        path = checked_path(root, entry["path"])
        if not path.exists():
            missing.append(entry["path"])
        elif not path.is_file() or path.stat().st_size != entry["size"] or sha256(path) != entry["sha256"]:
            raise ValueError("Existing content differs; resolve before syncing: " + entry["path"])
    return missing


def sync_missing(root, manifest, source, dry_run):
    missing = missing_files(root, manifest)
    print("Existing verified: %d; missing: %d" % (len(manifest["files"]) - len(missing), len(missing)), flush=True)
    if not missing or dry_run:
        return
    if not source or source.startswith("-") or not source.endswith("/"):
        raise ValueError("--source must be an explicit source webroot ending in /")
    root.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile() as file_list:
        file_list.write(b"\0".join(name.encode("utf-8") for name in missing) + b"\0")
        file_list.flush()
        subprocess.run([
            "rsync", "-rt", "--ignore-existing", "--from0", "--files-from=" + file_list.name,
            "-e", "ssh -o BatchMode=yes -o ConnectTimeout=15", source, str(root) + "/",
        ], check=True)
    verify(root, manifest)


def pack(root, manifest, output):
    verify(root, manifest)
    # Exclusive creation keeps an earlier migration artifact recoverable.
    with output.open("xb") as raw:
        with tarfile.open(fileobj=raw, mode="w:gz", compresslevel=1) as archive:
            for entry in manifest["files"]:
                path = checked_path(root, entry["path"])
                info = archive.gettarinfo(str(path), arcname="webroot/" + entry["path"])
                info.uid = info.gid = 0
                info.uname = info.gname = ""
                info.mode = 0o644
                info.pax_headers = {}
                with path.open("rb") as source:
                    archive.addfile(info, source)
    print(json.dumps({"asset": output.name, "bytes": output.stat().st_size,
                      "sha256": sha256(output)}, indent=2))


def restore(archive_path, root, manifest, receipt):
    asset = receipt["archive"]
    if (archive_path.stat().st_size != asset["bytes"]
            or sha256(archive_path) != asset["sha256"]):
        raise ValueError("Archive does not match the pinned migration checksum")
    if root.exists():
        raise ValueError("Restore destination must not exist: " + str(root))
    checked_path(root.parent, root.name)
    expected = {"webroot/" + e["path"]: e for e in manifest["files"]}
    seen = set()
    root.mkdir(parents=True)
    # Never use extractall: accept only the regular files pinned in the manifest.
    with tarfile.open(archive_path, "r:gz") as archive:
        for member in archive:
            entry = expected.get(member.name)
            if (entry is None or member.name in seen or not member.isfile()
                    or member.size != entry["size"]):
                raise ValueError("Unexpected archive member: " + member.name)
            target = checked_path(root, entry["path"])
            target.parent.mkdir(parents=True, exist_ok=True)
            with archive.extractfile(member) as source, target.open("xb") as output:
                shutil.copyfileobj(source, output, 1024 * 1024)
            target.chmod(0o644)
            if sha256(target) != entry["sha256"]:
                raise ValueError("Restored content mismatch: " + member.name)
            seen.add(member.name)
    if seen != set(expected):
        raise ValueError("Archive is missing %d manifest files" % (len(expected) - len(seen)))
    print("Restored and verified %d files to %s" % (len(seen), root))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("verify", "pack", "restore", "sync-missing"))
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, default=REPO / "deployment/static-manifest.json")
    parser.add_argument("--archive", type=Path)
    parser.add_argument("--receipt", type=Path, default=REPO / "deployment/snapshot.json")
    parser.add_argument("--source", help="Source webroot for sync-missing, e.g. evophys:/var/www/evophys.com/")
    parser.add_argument("--dry-run", action="store_true", help="List missing-file count without downloading")
    args = parser.parse_args()
    manifest = read_manifest(args.manifest)
    if args.command == "verify":
        verify(args.root.absolute(), manifest)
    elif args.command == "sync-missing":
        sync_missing(args.root.absolute(), manifest, args.source, args.dry_run)
    elif args.archive is None:
        parser.error("--archive is required for pack and restore")
    elif args.command == "pack":
        pack(args.root.absolute(), manifest, args.archive)
    else:
        receipt = json.loads(args.receipt.read_text())
        if sha256(args.manifest) != receipt["manifest_sha256"]:
            raise ValueError("Manifest does not match the pinned migration receipt")
        restore(args.archive, args.root.absolute(), manifest, receipt)


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, KeyError, tarfile.TarError, subprocess.CalledProcessError) as error:
        print("ERROR: " + str(error), file=sys.stderr)
        sys.exit(1)
