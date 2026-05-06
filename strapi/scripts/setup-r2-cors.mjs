import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';

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
        AllowedOrigins: [
          'https://e-do.studio',
          'https://www.e-do.studio',
          'http://nkowss40400ww0swgw400cwg.195.35.25.154.sslip.io',
          'http://localhost:3000',
          'http://localhost:1337',
        ],
        AllowedMethods: ['GET', 'HEAD'],
        AllowedHeaders: ['*'],
        MaxAgeSeconds: 86400,
      },
    ],
  },
}));

console.log(`R2 CORS configured successfully for bucket "${CF_BUCKET}"`);
