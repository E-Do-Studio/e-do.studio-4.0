import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
  i18n: {
    enabled: true,
    config: {
      defaultLocale: 'fr',
    },
  },
  'drag-drop-content-types': {
    enabled: true,
  },
  upload: {
    config: {
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
