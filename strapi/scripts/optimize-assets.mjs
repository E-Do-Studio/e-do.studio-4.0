import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

const UPLOADS_DIR = path.resolve('../public/uploads');
const MAX_WIDTH = 2400;
const MAX_HEIGHT = 2400;
const WEBP_QUALITY = 82;
const JPEG_QUALITY = 82;
const PNG_QUALITY = 82;

async function getFiles(dir) {
  const entries = await fs.readdir(dir);
  return entries.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
}

async function optimizeImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const stat = await fs.stat(filePath);
  const originalSize = stat.size;

  try {
    const buffer = await fs.readFile(filePath);
    const image = sharp(buffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      return { skipped: true, reason: 'no-metadata' };
    }

    let pipeline = sharp(buffer);

    // Resize if larger than max dimensions
    if (metadata.width > MAX_WIDTH || metadata.height > MAX_HEIGHT) {
      pipeline = pipeline.resize(MAX_WIDTH, MAX_HEIGHT, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Convert to proper WebP if file has .webp extension
    // Otherwise optimize in original format
    let outputBuffer;
    if (ext === '.webp') {
      outputBuffer = await pipeline.webp({ quality: WEBP_QUALITY, effort: 4 }).toBuffer();
    } else if (ext === '.png') {
      outputBuffer = await pipeline.png({ quality: PNG_QUALITY, compressionLevel: 8 }).toBuffer();
    } else {
      // jpg/jpeg
      outputBuffer = await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();
    }

    const newSize = outputBuffer.length;

    // Only write if we actually reduced size
    if (newSize < originalSize) {
      await fs.writeFile(filePath, outputBuffer);
      return {
        skipped: false,
        originalSize,
        newSize,
        saved: originalSize - newSize,
        resized: metadata.width > MAX_WIDTH || metadata.height > MAX_HEIGHT,
        originalDimensions: `${metadata.width}x${metadata.height}`,
      };
    }

    return { skipped: true, reason: 'no-gain', originalSize, newSize };
  } catch (err) {
    return { skipped: true, reason: 'error', error: err.message };
  }
}

async function main() {
  const files = await getFiles(UPLOADS_DIR);
  console.log(`Found ${files.length} images to optimize\n`);

  let totalSaved = 0;
  let optimized = 0;
  let skipped = 0;
  let errors = 0;
  let resized = 0;

  const BATCH_SIZE = 20;

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (file) => {
        const filePath = path.join(UPLOADS_DIR, file);
        const result = await optimizeImage(filePath);
        return { file, ...result };
      })
    );

    for (const r of results) {
      if (r.skipped) {
        skipped++;
        if (r.reason === 'error') {
          errors++;
        }
      } else {
        optimized++;
        totalSaved += r.saved;
        if (r.resized) resized++;
      }
    }

    // Progress every 200 files
    if ((i + BATCH_SIZE) % 200 === 0 || i + BATCH_SIZE >= files.length) {
      const pct = Math.min(100, Math.round(((i + BATCH_SIZE) / files.length) * 100));
      console.log(`[${pct}%] ${i + BATCH_SIZE}/${files.length} — saved ${(totalSaved / 1024 / 1024).toFixed(1)} MB so far`);
    }
  }

  console.log(`\n========== OPTIMIZATION COMPLETE ==========`);
  console.log(`Total images: ${files.length}`);
  console.log(`Optimized:    ${optimized}`);
  console.log(`Resized:      ${resized} (>${MAX_WIDTH}px → ${MAX_WIDTH}px max)`);
  console.log(`Skipped:      ${skipped} (already optimal or errors)`);
  console.log(`Errors:       ${errors}`);
  console.log(`Space saved:  ${(totalSaved / 1024 / 1024).toFixed(1)} MB`);

  const afterFiles = await getFiles(UPLOADS_DIR);
  let totalAfter = 0;
  for (const f of afterFiles) {
    const stat = await fs.stat(path.join(UPLOADS_DIR, f));
    totalAfter += stat.size;
  }
  console.log(`Total size:   ${(totalAfter / 1024 / 1024).toFixed(1)} MB (images only)`);
}

main().catch(console.error);
