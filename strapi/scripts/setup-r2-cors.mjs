// Pass --best-effort (or set R2_CORS_BEST_EFFORT=1) to turn fatal errors into
// warnings. The Strapi `start` script uses this mode so that booting Strapi
// is never blocked by an R2 CORS hiccup (network blip, transient 5xx, or even
// a missing @aws-sdk/client-s3 package). The manual `npm run setup:r2-cors`
// invocation does NOT pass the flag, so an operator running the script by
// hand still sees a real exit code on failure.
const bestEffort =
  process.argv.includes('--best-effort') || process.env.R2_CORS_BEST_EFFORT === '1';

function fail(message) {
  if (bestEffort) {
    console.warn(`[setup-r2-cors] ${message} — skipping (best-effort mode)`);
    process.exit(0);
  }
  console.error(message);
  process.exit(1);
}

const {
  CF_ACCOUNT_ID,
  CF_ACCESS_KEY_ID,
  CF_ACCESS_SECRET,
  CF_BUCKET_NAME,
  CF_BUCKET,
  CORS_ALLOWED_ORIGINS,
} = process.env;

// CF_BUCKET_NAME is the canonical env var used by Strapi's upload provider
// (see config/plugins.ts). Fall back to CF_BUCKET (legacy) and finally to the
// hardcoded prod bucket name so the script keeps working with older .env files.
const bucket = CF_BUCKET_NAME || CF_BUCKET || 'website';

if (!CF_ACCOUNT_ID || !CF_ACCESS_KEY_ID || !CF_ACCESS_SECRET) {
  fail(
    'Missing required env vars: CF_ACCOUNT_ID, CF_ACCESS_KEY_ID, CF_ACCESS_SECRET. ' +
      'Source the Strapi prod .env (or export them) before running this script.',
  );
}

// Dynamic import so that a missing @aws-sdk/client-s3 (e.g. running the script
// before `npm ci`) falls under best-effort handling instead of crashing with a
// raw ERR_MODULE_NOT_FOUND. @strapi/provider-upload-aws-s3 brings the package
// in transitively, so it is always present in a built Strapi image.
let S3Client;
let PutBucketCorsCommand;
try {
  ({ S3Client, PutBucketCorsCommand } = await import('@aws-sdk/client-s3'));
} catch (err) {
  fail(`Cannot import @aws-sdk/client-s3: ${err?.message || err}`);
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

try {
  await s3.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
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
    }),
  );
  console.log(`R2 CORS configured for bucket "${bucket}"`);
  console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
} catch (err) {
  fail(`PutBucketCors failed for bucket "${bucket}": ${err?.message || err}`);
}
