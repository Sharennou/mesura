import { MAX_PHOTO_BYTES } from "../shared/config";
// Mobile decoding applies EXIF orientation. Re-encoding strips all metadata;
// the cloud function independently validates and re-encodes these bytes.
export async function prepareCloudPhotos(form: FormData) {
  const next = new FormData();
  for (const [key, value] of form) {
    if (typeof value === "string") {
      next.set(key, value);
      continue;
    }
    if (value.size > MAX_PHOTO_BYTES)
      throw new Error("Photo trop volumineuse. Maximum : 10 Mo.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(value.type))
      throw new Error(
        "Choisissez une photo JPEG, PNG ou WebP. Pour une photo HEIC, exportez-la en JPEG.",
      );
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(value, {
        imageOrientation: "from-image",
      });
    } catch {
      throw new Error(
        "Cette photo ne peut pas être lue. Choisissez une photo valide.",
      );
    }
    try {
      if (bitmap.width * bitmap.height > 40_000_000)
        throw new Error("La résolution de cette photo est trop grande.");
      const ratio = Math.min(1, 1600 / bitmap.width, 2200 / bitmap.height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
      canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) =>
            b
              ? resolve(b)
              : reject(new Error("La préparation de la photo a échoué.")),
          "image/jpeg",
          0.88,
        ),
      );
      next.set(key, blob, `${key}.jpg`);
    } finally {
      bitmap.close();
    }
  }
  return next;
}
