import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';

const {
  CF_ACCOUNT_ID,
  CF_ACCESS_KEY_ID,
  CF_ACCESS_SECRET,
  CF_BUCKET = 'website',
  CORS_ALLOWED_ORIGINS,
} = process.env;

if (!CF_ACCOUNT_ID || !CF_ACCESS_KEY_ID || !CF_ACCESS_SECRET) {
  console.error('Missing required env vars: CF_ACCOUNT_ID, CF_ACCESS_KEY_ID, CF_ACCESS_SECRET');
  console.error('Source the Strapi prod .env (or export them) before running this script.');
  process.exit(1);
}

// Every origin from which a browser may load assets out of the R2 bucket.
//
// Critically, this MUST include the Strapi admin origin (https://cms.e-do.studio).
// The Media Library's crop / image-edit modal renders the asset through an
// <img crossOrigin="anonymous"> so it can later read pixel data out of a canvas
// (cropperjs in @strapi/plugin-upload). If the bucket does not echo the admin
// origin back via Access-Control-Allow-Origin, the browser blocks the load,
// the img's `onload` never fires, the Cropper instance is never constructed,
// and clicking "Crop" silently does nothing. See EDO-247.
const DEFAULT_ALLOWED_ORIGINS = [
  'https://e-do.studio',
  'https://www.e-do.studio',
  'https://cms.e-do.studio',
  'http://nkowss40400ww0swgw400cwg.195.35.25.154.sslip.io',
  'http://localhost:1337',
  'http://localhost:3000',
  'http://localhost:5173',
];

const allowedOrigins = CORS_ALLOWED_ORIGINS
  ? CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : DEFAULT_ALLOWED_ORIGINS;

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: CF_ACCESS_KEY_ID,
    secretAccessKey: CF_ACCESS_SECRET,
  },
  forcePathStyle: true,
});

await s3.send(new PutBucketCorsCommand({
  Bucket: CF_BUCKET,
  CORSConfiguration: {
    CORSRules: [
      {
        AllowedOrigins: allowedOrigins,
        AllowedMethods: ['GET', 'HEAD'],
        AllowedHeaders: ['*'],
        MaxAgeSeconds: 86400,
      },
    ],
  },
}));

console.log(`R2 CORS configured for bucket "${CF_BUCKET}"`);
console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
