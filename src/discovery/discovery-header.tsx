import { PageHeader } from '../ui/page-header';
import { usePageContext } from '../lib/page-context';
import { useT } from '../i18n/use-t';

export const DiscoveryHeader = () => {
  const t = useT();
  const { goto } = usePageContext();
  return (
    <PageHeader
      title={t('common.discovery')}
      className="row-start-1"
      subgrid={false}
      actions={[
        {
          id: 'book',
          label: t('common.book'),
          onClick: () => goto('book'),
          variant: 'primary',
          className: 'md:hidden',
        },
        {
          id: 'gallery',
          label: t('common.gallery'),
          onClick: () => goto('gallery'),
          className: 'hidden lg:flex',
        },
        {
          id: 'plateaux',
          label: t('common.stages'),
          onClick: () => goto('plateau-live'),
          className: 'hidden lg:flex',
        },
        {
          id: 'contact',
          label: t('common.contactUs'),
          onClick: () => goto('contact'),
          className: 'hidden lg:flex',
        },
      ]}
    />
  );
};
