// Read dimensions before decoding so a compressed image cannot exhaust the
// limited cloud runtime. Only JPEG/PNG are accepted by the cloud decoder.
export function cloudImageDimensions(b: Uint8Array) {
  if (b.length > 10 * 1024 * 1024 || b.length < 24)
    throw new Error("Photo invalide ou trop volumineuse.");
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let width = 0,
    height = 0;
  if (
    [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => b[i] === v) &&
    String.fromCharCode(...b.slice(12, 16)) === "IHDR"
  ) {
    width = view.getUint32(16);
    height = view.getUint32(20);
  } else if (b[0] === 255 && b[1] === 216) {
    let offset = 2;
    while (offset + 9 < b.length) {
      if (b[offset++] !== 255) throw new Error("Photo JPEG invalide.");
      while (b[offset] === 255) offset++;
      const marker = b[offset++];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > b.length)
        throw new Error("Photo JPEG invalide.");
      if (
        [
          192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207,
        ].includes(marker)
      ) {
        height = view.getUint16(offset + 3);
        width = view.getUint16(offset + 5);
        break;
      }
      offset += length;
    }
  }
  if (!width || !height || width * height > 12_000_000)
    throw new Error(
      "Choisissez une photo JPEG ou PNG valide de moins de 12 millions de pixels.",
    );
  return { width, height };
}
