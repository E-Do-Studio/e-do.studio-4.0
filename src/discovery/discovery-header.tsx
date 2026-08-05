import { PageHeader } from '../ui/page-header';
import { useT } from '../i18n/use-t';

export const DiscoveryHeader = () => {
  const t = useT();
  return <PageHeader title={t('common.discovery')} className="row-start-1" />;
};
