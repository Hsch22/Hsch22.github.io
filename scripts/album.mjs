import { copyFile, mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function buildAlbum(root, out, escape) {
  const settings = JSON.parse(
    await readFile(path.join(root, "content/album.json"), "utf8"),
  );
  const photos = new Map();
  const sections = [];
  const groupIds = new Set();

  function preview(photo) {
    return `<img src="${photo.url}/preview.webp" width="${photo.width}" height="${photo.height}" alt="${escape(photo.alt)}" loading="lazy" decoding="async">`;
  }

  for (const { id, title } of settings.collections) {
    if (
      !slug.test(id) ||
      groupIds.has(id) ||
      typeof title !== "string" ||
      !title.trim()
    ) {
      throw new Error(`Invalid album collection: ${id}`);
    }
    groupIds.add(id);
    const group = path.join(root, "content/photos", id);
    const entries = await readdir(group, { withFileTypes: true });
    const keys = entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => entry.name)
      .sort();
    if (!keys.length) throw new Error(`No photographs in ${id}`);
    const spreads = [];
    const figures = [];
    for (const key of keys) {
      if (!slug.test(key))
        throw new Error(`Invalid photograph directory: ${key}`);
      const source = path.join(group, key);
      const photo = JSON.parse(
        await readFile(path.join(source, "photo.json"), "utf8"),
      );
      if (typeof photo.alt !== "string" || !photo.alt.trim())
        throw new Error(`Missing image description in ${id}/${key}`);
      for (const field of ["width", "height", "previewWidth"]) {
        if (!Number.isInteger(photo[field]) || photo[field] < 1)
          throw new Error(`Invalid ${field} in ${id}/${key}`);
      }
      const destination = path.join(out, "photos", id, key);
      await mkdir(destination, { recursive: true });
      for (const file of ["large.webp", "preview.webp"]) {
        await copyFile(path.join(source, file), path.join(destination, file));
      }
      photo.url = `/photos/${id}/${key}`;
      photos.set(`${id}/${key}`, photo);
      const ratio = photo.width / photo.height;
      figures.push({ photo, ratio });
    }
    // Equal-height pairs preserve both photographs' native proportions. An unpaired image starts its own spread.
    for (let i = 0; i < figures.length; i += 2) {
      const pair = figures.slice(i, i + 2);
      const total = pair.reduce((sum, figure) => sum + figure.ratio, 0);
      const images = pair.map(({ photo, ratio }) => {
        const share = pair.length === 1 ? 1 : ratio / total;
        const sizes = `(max-width: 620px) 90vw, (max-width: 1200px) ${Math.ceil(share * 92)}vw, ${Math.ceil(share * 1080)}px`;
        const candidates =
          photo.previewWidth < photo.width
            ? ` srcset="${photo.url}/preview.webp ${photo.previewWidth}w, ${photo.url}/large.webp ${photo.width}w" sizes="${sizes}"`
            : "";
        return `<a class="photo-link${ratio < 1 ? " portrait-shot" : ""}" href="${photo.url}/large.webp" style="--ratio: ${ratio.toFixed(5)}">
  <img src="${photo.url}/preview.webp"${candidates} width="${photo.width}" height="${photo.height}" alt="${escape(photo.alt)}" loading="${i === 0 && !sections.length ? "eager" : "lazy"}" decoding="async">
</a>`;
      });
      spreads.push(`<div class="album-spread">${images.join("\n")}</div>`);
    }
    sections.push(
      `<section class="album-collection" id="${id}" aria-label="${escape(title)}">${spreads.join("\n")}</section>`,
    );
  }
  function featured(key) {
    if (!photos.has(key))
      throw new Error(`Unknown featured photograph: ${key}`);
    return photos.get(key);
  }
  if (
    settings.openingPair.length !== 2 ||
    new Set(settings.openingPair).size !== 2
  )
    throw new Error("Choose two different photographs for the opening spread.");
  return {
    PHOTO_COUNT: photos.size,
    INTRO_PHOTOS: settings.openingPair
      .map((key) => preview(featured(key)))
      .join("\n"),
    DESKTOP_PHOTO: preview(featured(settings.desktopPhoto)),
    ALBUM_SECTIONS: sections.join("\n"),
  };
}
