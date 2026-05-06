import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: 'auto',
  endpoint: 'https://40b1f3eb00963de1f0c69c748e35eed3.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: '00c62ee8708b37fd51460652897ad646',
    secretAccessKey: '87c44f90ebd5874859810145c62c7f62aec5a7a903d20689e0822aba8064ff46',
  },
  forcePathStyle: true,
});

await s3.send(new PutBucketCorsCommand({
  Bucket: 'website',
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

console.log('R2 CORS configured successfully');
