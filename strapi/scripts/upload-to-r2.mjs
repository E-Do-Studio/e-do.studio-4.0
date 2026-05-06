import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs/promises';
import path from 'path';
import { lookup } from 'mime-types';

const {
  CF_ACCOUNT_ID,
  CF_ACCESS_KEY_ID,
  CF_ACCESS_SECRET,
  CF_BUCKET = 'website',
} = process.env;

if (!CF_ACCOUNT_ID || !CF_ACCESS_KEY_ID || !CF_ACCESS_SECRET) {
  console.error('Missing required env vars: CF_ACCOUNT_ID, CF_ACCESS_KEY_ID, CF_ACCESS_SECRET');
  console.error('Source the Strapi prod .env (or export them) before running this script.');
  process.exit(1);
}

const UPLOADS_DIR = path.resolve('../public/uploads');

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: CF_ACCESS_KEY_ID,
    secretAccessKey: CF_ACCESS_SECRET,
  },
  forcePathStyle: true,
});

const BATCH_SIZE = 10;

async function uploadFile(filePath, key) {
  const body = await fs.readFile(filePath);
  const contentType = lookup(filePath) || 'application/octet-stream';

  await s3.send(new PutObjectCommand({
    Bucket: CF_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
}

async function main() {
  const entries = await fs.readdir(UPLOADS_DIR);
  const files = entries.filter(f => !f.startsWith('.'));
  console.log(`Found ${files.length} files to upload to R2 bucket "${CF_BUCKET}"\n`);

  let uploaded = 0;
  let errors = 0;
  let totalSize = 0;

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);

    await Promise.all(batch.map(async (file) => {
      const filePath = path.join(UPLOADS_DIR, file);
      const key = `uploads/${file}`;
      try {
        const stat = await fs.stat(filePath);
        totalSize += stat.size;
        await uploadFile(filePath, key);
        uploaded++;
      } catch (err) {
        errors++;
        console.error(`  ERROR: ${file} — ${err.message}`);
      }
    }));

    if ((i + BATCH_SIZE) % 100 === 0 || i + BATCH_SIZE >= files.length) {
      const pct = Math.min(100, Math.round(((i + BATCH_SIZE) / files.length) * 100));
      console.log(`[${pct}%] ${uploaded}/${files.length} uploaded (${(totalSize / 1024 / 1024).toFixed(1)} MB)`);
    }
  }

  console.log(`\n========== UPLOAD COMPLETE ==========`);
  console.log(`Uploaded: ${uploaded}`);
  console.log(`Errors:   ${errors}`);
  console.log(`Total:    ${(totalSize / 1024 / 1024).toFixed(1)} MB`);
}

main().catch(console.error);
