// Local macOS importer. The site build only needs the finished WebP files.
import { execFileSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const [source, collection, key, alt] = process.argv.slice(2);
if (process.argv.length !== 6 || !alt.trim()) {
  throw new Error(
    'Usage: npm run photo:add -- PHOTO.heic COLLECTION ORDERED-SLUG "English alt text"',
  );
}
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key) || !/\.heic$/i.test(source)) {
  throw new Error(
    "Use a .heic photograph and a lowercase, hyphenated key such as 05-morning-light.",
  );
}
const album = JSON.parse(
  await readFile(path.join(root, "content/album.json"), "utf8"),
);
if (!album.collections.some((group) => group.id === collection)) {
  throw new Error(
    `Unknown collection: ${collection}. Add it to content/album.json first.`,
  );
}
const directory = path.join(root, "content/photos", collection);
await mkdir(directory, { recursive: true });
const staging = await mkdtemp(path.join(directory, ".import-"));
try {
  const decoded = path.join(staging, "decoded.png");
  const scaled = path.join(staging, "srgb.png");
  execFileSync("heif-convert", [
    "--quiet",
    "--png-compression-level",
    "1",
    path.resolve(source),
    decoded,
  ]);
  execFileSync("sips", [
    "--matchTo",
    "/System/Library/ColorSync/Profiles/sRGB Profile.icc",
    "-Z",
    "1920",
    decoded,
    "--out",
    scaled,
  ]);
  const png = await readFile(scaled);
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  const previewWidth = Math.min(800, width);
  for (const [file, size, quality] of [
    ["large.webp", width, "84"],
    ["preview.webp", previewWidth, "81"],
  ]) {
    execFileSync("cwebp", [
      "-quiet",
      "-mt",
      "-metadata",
      "none",
      "-resize",
      String(size),
      "0",
      "-q",
      quality,
      scaled,
      "-o",
      path.join(staging, file),
    ]);
  }
  await unlink(decoded);
  await unlink(scaled);
  const metadata = {
    alt: alt.trim(),
    width,
    height,
    previewWidth,
  };
  await writeFile(
    path.join(staging, "photo.json"),
    JSON.stringify(metadata, null, 2) + "\n",
  );
  // A nonempty photo directory cannot be replaced by rename, including on concurrent imports.
  await rename(staging, path.join(directory, key));
  console.log(`Added ${collection}/${key} (${width} × ${height})`);
} finally {
  await rm(staging, { recursive: true, force: true });
}
