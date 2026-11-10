import sharp from "sharp";

/** Re-encode and limit image dimensions; never store the original upload. */
export async function optimizeProductImage(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer, { limitInputPixels: 50_000_000 })
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85, effort: 4 })
    .toBuffer();
}
