import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
  i18n: {
    enabled: true,
    config: {
      defaultLocale: 'fr',
    },
  },
  upload: {
    config: {
      // 256 MiB by default — large enough for a 1080p MP4 showreel of ~60s.
      // Override via `UPLOAD_SIZE_LIMIT_BYTES` in env if a specific deploy needs a different cap.
      // Keep this aligned with `formidable.maxFileSize` in `config/middlewares.ts` — Strapi
      // enforces the body-parser limit BEFORE the upload plugin's `sizeLimit`, so the lower
      // of the two wins.
      sizeLimit: env.int('UPLOAD_SIZE_LIMIT_BYTES', 256 * 1024 * 1024),
      provider: '@strapi/provider-upload-aws-s3',
      providerOptions: {
        baseUrl: env('CF_PUBLIC_URL'),
        s3Options: {
          credentials: {
            accessKeyId: env('CF_ACCESS_KEY_ID'),
            secretAccessKey: env('CF_ACCESS_SECRET'),
          },
          endpoint: `https://${env('CF_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
          region: 'auto',
          params: {
            Bucket: env('CF_BUCKET_NAME'),
          },
          forcePathStyle: true,
        },
      },
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
    },
  },
});

export default config;
